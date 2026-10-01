package modinstall

import (
	"context"
	"slices"
	"strings"
	"time"

	"udeos/launcher/internal/instance"
	"udeos/launcher/internal/loader"
	"udeos/launcher/internal/modsearch"
)

// maxVersions bounds the list a project page shows; older releases are rarely wanted.
const maxVersions = 60

// VersionChoice is one release of a project that runs on an instance, for the
// version picker. Only releases for the instance's Minecraft version and
// loader are listed, so picking any of them is a valid install.
type VersionChoice struct {
	ID            string    `json:"id"`
	Number        string    `json:"number"`
	Name          string    `json:"name"`
	Type          string    `json:"type"` // release | beta | alpha
	DatePublished time.Time `json:"datePublished"`
	GameVersions  []string  `json:"gameVersions"`
	Loaders       []string  `json:"loaders"`
	// Installed: this exact release is in the instance now.
	Installed bool `json:"installed"`
	// ConflictWith names the installed mod this release does not work with ("" = none).
	ConflictWith string `json:"conflictWith,omitempty"`
}

// ldrFor is the loader tag mods are searched with ("" for every other type: packs and shaders have none).
func ldrFor(inst instance.Instance, projectType modsearch.ProjectType) string {
	if projectType == modsearch.TypeDatapack {
		return "datapack"
	}
	if projectType != modsearch.TypeMod || inst.Loader == "" || inst.Loader == loader.Vanilla {
		return ""
	}
	return strings.ToLower(inst.Loader)
}

// Versions lists the releases of projectID that run on inst, newest first as
// the provider orders them, each marked when it is installed or conflicts with
// something installed. Nothing is installed or changed.
func (m *Manager) Versions(ctx context.Context, inst instance.Instance, projectID string, projectType modsearch.ProjectType) ([]VersionChoice, error) {
	ldr := ldrFor(inst, projectType)
	installed, err := m.installedEntries(inst)
	if err != nil {
		return nil, err
	}
	versions, err := m.Provider.Versions(ctx, projectID, inst.Version, ldr)
	if err != nil {
		return nil, err
	}
	out := []VersionChoice{}
	for _, v := range versions {
		// The provider's filters are loose for some types: filter here too.
		if !contains(v.GameVersions, inst.Version) || !modsearch.LoaderMatches(v.Loaders, ldr) {
			continue
		}
		c := VersionChoice{ID: v.ID, Number: v.VersionNumber, Name: v.Name, Type: v.Type, DatePublished: v.DatePublished, GameVersions: v.GameVersions, Loaders: v.Loaders}
		for _, e := range installed {
			if e.ProjectID == v.ProjectID && e.VersionID == v.ID {
				c.Installed = true
			}
		}
		c.ConflictWith = conflictWith(v, installed)
		out = append(out, c)
		if len(out) == maxVersions {
			break
		}
	}
	return out, nil
}

// conflictWith returns the title of the installed mod that version v does not
// work with, either because v declares it incompatible (the whole project, or
// just the release that is installed) or because that mod declared v's
// project or release incompatible when it was added. "" when nothing clashes.
// The project v belongs to is ignored: installing another release replaces it.
func conflictWith(v modsearch.Version, installed []Entry) string {
	for _, e := range installed {
		if e.ProjectID == v.ProjectID {
			continue
		}
		for _, d := range v.Dependencies {
			if d.Type == modsearch.DepIncompatible && d.ProjectID == e.ProjectID && (d.VersionID == "" || d.VersionID == e.VersionID) {
				return e.Title
			}
		}
		if slices.Contains(e.Incompatible, v.ProjectID) || slices.Contains(e.IncompatibleVersions, v.ID) {
			return e.Title
		}
	}
	return ""
}

// Alternatives is what to offer when adding a project fails because it does
// not work with something installed.
type Alternatives struct {
	// Versions: other releases of the same project that do fit the instance
	// and clash with nothing installed, newest first.
	Versions []VersionChoice `json:"versions"`
	// Similar: other projects of the same kind, in the same first category,
	// that can be added to the instance right now. Only looked for when no
	// other release of the project fits.
	Similar []modsearch.Result `json:"similar"`
}

// similarCandidates is how many search results are tried (each costs a Plan),
// similarWanted how many working ones are kept.
const (
	similarCandidates = 8
	similarWanted     = 3
	versionsWanted    = 8
)

// notCategory are tags that are not a topic: loaders and format markers.
var notCategory = map[string]bool{"fabric": true, "forge": true, "quilt": true, "neoforge": true, "datapack": true, "minecraft": true}

// Alternatives looks for ways around a conflict: first other releases of the
// project, and when none fits, similar projects whose Plan succeeds.
// ponytail: releases are not checked for their own required dependencies
// (choosing one runs a full Plan anyway); similar projects are, because
// offering one that then fails would be worse than offering fewer.
func (m *Manager) Alternatives(ctx context.Context, inst instance.Instance, projectID string, projectType modsearch.ProjectType) (Alternatives, error) {
	out := Alternatives{Versions: []VersionChoice{}, Similar: []modsearch.Result{}}
	all, err := m.Versions(ctx, inst, projectID, projectType)
	if err != nil {
		return out, err
	}
	for _, v := range all {
		if !v.Installed && v.ConflictWith == "" {
			if out.Versions = append(out.Versions, v); len(out.Versions) == versionsWanted {
				break
			}
		}
	}
	if len(out.Versions) > 0 {
		return out, nil
	}

	detail, err := m.Provider.ProjectDetail(ctx, projectID)
	if err != nil {
		return out, nil // the versions answer stands; no detail, no similar ones
	}
	q := modsearch.Query{Type: projectType, GameVersion: inst.Version, Loader: ldrFor(inst, projectType), Index: "downloads", Limit: similarCandidates + 4}
	for _, c := range detail.Categories {
		if !notCategory[strings.ToLower(c)] {
			q.Categories = []string{c}
			break
		}
	}
	page, err := m.Provider.Search(ctx, q)
	if err != nil {
		return out, nil
	}
	have, _ := m.InstalledProjects(inst)
	tried := 0
	for _, r := range page.Results {
		if r.ID == detail.ID || slices.Contains(have, r.ID) {
			continue
		}
		if tried++; tried > similarCandidates {
			break
		}
		if plan, err := m.Plan(ctx, inst, r.ID, projectType); err == nil && !plan.AlreadyInstalled && len(plan.Items) > 0 {
			if out.Similar = append(out.Similar, r); len(out.Similar) == similarWanted {
				break
			}
		}
	}
	return out, nil
}
