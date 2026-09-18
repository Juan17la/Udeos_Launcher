package modinstall

import (
	"context"
	"errors"
	"fmt"
	"maps"
	"os"
	"path/filepath"
	"slices"
	"strings"

	"udeos/launcher/internal/download"
	"udeos/launcher/internal/instance"
	"udeos/launcher/internal/loader"
	"udeos/launcher/internal/modsearch"
	"udeos/launcher/internal/paths"
)

// Phase reported through Progress while content files are downloaded.
const Phase = "content"

// maxDepth bounds the dependency walk; real chains are two or three deep.
const maxDepth = 8

// Manager plans and applies additions to instances.
type Manager struct {
	Dirs     paths.Dirs
	Provider modsearch.Provider
	Pool     *download.Pool
	Report   func(download.Progress)
}

// New wires a manager whose download progress goes to report.
func New(dirs paths.Dirs, provider modsearch.Provider, report func(download.Progress)) *Manager {
	return &Manager{Dirs: dirs, Provider: provider, Pool: download.NewPool(report), Report: report}
}

// PlanItem is one version that will be downloaded.
type PlanItem struct {
	Version    modsearch.Version `json:"version"`
	Title      string            `json:"title"`
	Type       string            `json:"type"`       // mod | resourcepack | shader
	Reason     string            `json:"reason"`     // "" when the player asked for it, else the title it is required by
	RequiredBy string            `json:"requiredBy"` // project id behind Reason
}

// Plan is what adding a project to an instance would do, shown before it happens.
type Plan struct {
	Instance         string     `json:"instance"`
	ProjectID        string     `json:"projectId"`
	Title            string     `json:"title"`
	Type             string     `json:"type"`
	Items            []PlanItem `json:"items"`
	AlreadyInstalled bool       `json:"alreadyInstalled"`
	Warnings         []string   `json:"warnings"`
}

// Plan works out which version of projectID fits inst, pulls in its required
// dependencies and checks nothing installed is declared incompatible. Every
// rule that fails comes back as a plain error the UI can show as is.
func (m *Manager) Plan(ctx context.Context, inst instance.Instance, projectID string, projectType modsearch.ProjectType) (Plan, error) {
	kind := string(projectType)
	if typeSubdir(kind) == "" {
		return Plan{}, fmt.Errorf("cannot add a %s to an instance", kind)
	}
	ldr := ""
	if kind == "mod" {
		if inst.Loader == "" || inst.Loader == loader.Vanilla {
			return Plan{}, errors.New("this instance has no mod loader: create a Fabric or Forge instance to use mods")
		}
		ldr = strings.ToLower(inst.Loader)
	}
	installed, err := m.installedEntries(inst)
	if err != nil {
		return Plan{}, err
	}
	installedBy := map[string]Entry{}
	for _, e := range installed {
		if e.ProjectID != "" {
			installedBy[e.ProjectID] = e
		}
	}

	root, err := m.projectInfo(ctx, projectID)
	if err != nil {
		return Plan{}, err
	}
	plan := Plan{Instance: inst.ID, ProjectID: root.ID, Title: root.Title, Type: kind, Items: []PlanItem{}, Warnings: []string{}}
	if _, ok := installedBy[root.ID]; ok {
		plan.AlreadyInstalled = true
		return plan, nil
	}
	rootVersion, ok, err := m.matchingVersion(ctx, root.ID, inst.Version, ldr)
	if err != nil {
		return Plan{}, err
	}
	if !ok {
		return Plan{}, fmt.Errorf("%s has no build for Minecraft %s%s", root.Title, inst.Version, loaderSuffix(inst))
	}
	plan.Items = append(plan.Items, PlanItem{Version: rootVersion, Title: root.Title, Type: kind})

	// Walk required dependencies breadth-first; mods are the only type that has them.
	type pending struct {
		dep   modsearch.Dependency
		by    string // project id that needs it
		depth int
	}
	var queue []pending
	var optional []string
	incompatible := map[string][]string{} // project id → project ids it declares incompatible
	enqueue := func(v modsearch.Version, depth int) {
		for _, d := range v.Dependencies {
			switch d.Type {
			case modsearch.DepRequired:
				queue = append(queue, pending{dep: d, by: v.ProjectID, depth: depth})
			case modsearch.DepOptional:
				if d.ProjectID != "" {
					optional = append(optional, d.ProjectID)
				}
			case modsearch.DepIncompatible:
				if d.ProjectID != "" {
					incompatible[v.ProjectID] = append(incompatible[v.ProjectID], d.ProjectID)
				}
			}
		}
	}
	enqueue(rootVersion, 1)
	planned := map[string]bool{root.ID: true}
	for len(queue) > 0 {
		p := queue[0]
		queue = queue[1:]
		if p.depth > maxDepth {
			return Plan{}, fmt.Errorf("%s: dependency chain too deep", root.Title)
		}
		v, ok, err := m.dependencyVersion(ctx, p.dep, inst.Version, ldr)
		if err != nil {
			return Plan{}, err
		}
		if !ok {
			return Plan{}, fmt.Errorf("%s needs %s, which has no build for Minecraft %s%s", root.Title, m.titleOf(ctx, p.dep.ProjectID), inst.Version, loaderSuffix(inst))
		}
		if planned[v.ProjectID] {
			continue
		}
		if _, have := installedBy[v.ProjectID]; have {
			continue
		}
		planned[v.ProjectID] = true
		plan.Items = append(plan.Items, PlanItem{Version: v, RequiredBy: p.by})
		enqueue(v, p.depth+1)
	}

	// One request names every project involved: planned items, their required-by
	// and whatever they declare incompatible or optional.
	ids := map[string]bool{}
	for _, it := range plan.Items {
		ids[it.Version.ProjectID] = true
		ids[it.RequiredBy] = true
		for _, x := range incompatible[it.Version.ProjectID] {
			ids[x] = true
		}
	}
	for _, o := range optional {
		ids[o] = true
	}
	delete(ids, "")
	names, err := m.projectNames(ctx, slices.Collect(maps.Keys(ids)))
	if err != nil {
		return Plan{}, err
	}
	nameOf := func(id string) string {
		if n, ok := names[id]; ok && n.Title != "" {
			return n.Title
		}
		if e, ok := installedBy[id]; ok && e.Title != "" {
			return e.Title
		}
		return id
	}
	for i := range plan.Items {
		it := &plan.Items[i]
		if it.Title == "" {
			it.Title = nameOf(it.Version.ProjectID)
		}
		if it.Type == "" {
			it.Type = "mod"
			if n, ok := names[it.Version.ProjectID]; ok && typeSubdir(string(n.ProjectType)) != "" {
				it.Type = string(n.ProjectType)
			}
		}
		if it.RequiredBy != "" {
			it.Reason = nameOf(it.RequiredBy)
		}
	}

	// Incompatibilities, both ways: what the new versions refuse, and what the
	// installed ones refused when they were added.
	for _, it := range plan.Items {
		for _, x := range incompatible[it.Version.ProjectID] {
			if _, have := installedBy[x]; have {
				return Plan{}, fmt.Errorf("%s is incompatible with %s, which is installed in this instance", it.Title, nameOf(x))
			}
			if planned[x] {
				return Plan{}, fmt.Errorf("%s is incompatible with %s, which it would be installed with", it.Title, nameOf(x))
			}
		}
	}
	for _, e := range installed {
		for _, x := range e.Incompatible {
			if planned[x] {
				return Plan{}, fmt.Errorf("%s is incompatible with %s, which is installed in this instance", nameOf(x), e.Title)
			}
		}
	}
	seen := map[string]bool{}
	for _, o := range optional {
		if seen[o] || planned[o] {
			continue
		}
		if _, have := installedBy[o]; have {
			continue
		}
		seen[o] = true
		plan.Warnings = append(plan.Warnings, fmt.Sprintf("%s works with %s (optional, not installed)", root.Title, nameOf(o)))
	}
	return plan, nil
}

// matchingVersion picks the version of a project to install for the instance.
func (m *Manager) matchingVersion(ctx context.Context, projectID, mc, ldr string) (modsearch.Version, bool, error) {
	versions, err := m.Provider.Versions(ctx, projectID, mc, ldr)
	if err != nil {
		return modsearch.Version{}, false, fmt.Errorf("cannot reach %s: %w", m.Provider.Name(), err)
	}
	v, ok := modsearch.PickVersion(versions)
	return v, ok, nil
}

// dependencyVersion resolves one dependency: the pinned version when it fits
// the instance, otherwise the best matching version of the project.
func (m *Manager) dependencyVersion(ctx context.Context, d modsearch.Dependency, mc, ldr string) (modsearch.Version, bool, error) {
	projectID := d.ProjectID
	if d.VersionID != "" {
		v, err := m.Provider.VersionByID(ctx, d.VersionID)
		if err != nil {
			return modsearch.Version{}, false, fmt.Errorf("cannot reach %s: %w", m.Provider.Name(), err)
		}
		if contains(v.GameVersions, mc) && (ldr == "" || contains(v.Loaders, ldr)) {
			return v, true, nil
		}
		projectID = v.ProjectID
	}
	if projectID == "" {
		return modsearch.Version{}, false, nil
	}
	return m.matchingVersion(ctx, projectID, mc, ldr)
}

func (m *Manager) projectInfo(ctx context.Context, id string) (modsearch.ProjectInfo, error) {
	names, err := m.projectNames(ctx, []string{id})
	if err != nil {
		return modsearch.ProjectInfo{}, err
	}
	for _, n := range names {
		return n, nil
	}
	return modsearch.ProjectInfo{}, fmt.Errorf("project %s not found on %s", id, m.Provider.Name())
}

func (m *Manager) projectNames(ctx context.Context, ids []string) (map[string]modsearch.ProjectInfo, error) {
	out := map[string]modsearch.ProjectInfo{}
	if len(ids) == 0 {
		return out, nil
	}
	infos, err := m.Provider.Projects(ctx, ids)
	if err != nil {
		return nil, fmt.Errorf("cannot reach %s: %w", m.Provider.Name(), err)
	}
	for _, p := range infos {
		out[p.ID] = p
		// The player may have typed a slug; index both so lookups by either work.
		if p.Slug != "" {
			out[p.Slug] = p
		}
	}
	return out, nil
}

func (m *Manager) titleOf(ctx context.Context, id string) string {
	if id == "" {
		return "a dependency"
	}
	if names, err := m.projectNames(ctx, []string{id}); err == nil {
		if n, ok := names[id]; ok {
			return n.Title
		}
	}
	return id
}

// installedEntries is the manifest minus files the player has since deleted by hand.
func (m *Manager) installedEntries(inst instance.Instance) ([]Entry, error) {
	entries, err := Load(m.Dirs.ContentFile(inst.ID))
	if err != nil {
		return nil, err
	}
	gameDir := m.Dirs.GameDir(inst.ID)
	kept := entries[:0]
	for _, e := range entries {
		if _, err := os.Stat(filepath.Join(gameDir, typeSubdir(e.Type), e.File)); err == nil {
			kept = append(kept, e)
		}
	}
	return kept, nil
}

// InstalledProjects lists the provider project ids present in the instance.
func (m *Manager) InstalledProjects(inst instance.Instance) ([]string, error) {
	entries, err := m.installedEntries(inst)
	if err != nil {
		return nil, err
	}
	out := make([]string, 0, len(entries))
	for _, e := range entries {
		if e.ProjectID != "" {
			out = append(out, e.ProjectID)
		}
	}
	return out, nil
}

func loaderSuffix(inst instance.Instance) string {
	if inst.Loader == "" || inst.Loader == loader.Vanilla {
		return ""
	}
	return " with " + inst.Loader
}

func contains(list []string, s string) bool {
	return slices.ContainsFunc(list, func(x string) bool { return strings.EqualFold(x, s) })
}
