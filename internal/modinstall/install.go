package modinstall

import (
	"context"
	"errors"
	"fmt"

	"udeos/launcher/internal/content"
	"udeos/launcher/internal/download"
	"udeos/launcher/internal/instance"
	"udeos/launcher/internal/modsearch"
)

// Apply downloads every file in the plan (SHA-1 verified, kept in
// cache/content/ so another instance reuses it) and copies each one into the
// instance through the same validators the drag-and-drop path uses. Entries
// for the files that made it in are recorded even when a later one fails.
func (m *Manager) Apply(ctx context.Context, inst instance.Instance, plan Plan) ([]Entry, error) {
	if plan.AlreadyInstalled || len(plan.Items) == 0 {
		return []Entry{}, nil
	}
	if m.Report != nil {
		m.Report(download.Progress{Phase: Phase})
	}
	tasks := make([]download.Task, 0, len(plan.Items))
	files := make([]modsearch.File, 0, len(plan.Items))
	for _, it := range plan.Items {
		f, ok := it.Version.PrimaryFile()
		if !ok {
			return nil, fmt.Errorf("%s %s has no downloadable file", it.Title, it.Version.VersionNumber)
		}
		key := f.SHA1
		if key == "" {
			key = it.Version.ID
		}
		files = append(files, f)
		tasks = append(tasks, download.Task{URL: f.URL, Path: m.Dirs.ContentCacheFile(key, f.Filename), SHA1: f.SHA1, Size: f.Size})
	}
	if err := m.Pool.Run(ctx, Phase, tasks); err != nil {
		return nil, err
	}

	gameDir := m.Dirs.GameDir(inst.ID)
	entries := []Entry{}
	var failed error
	for i, it := range plan.Items {
		var err error
		switch it.Type {
		case "mod":
			_, err = content.AddMod(gameDir, tasks[i].Path, inst.Loader)
		case "resourcepack":
			_, err = content.AddResourcePack(gameDir, tasks[i].Path)
		case "shader":
			_, err = content.AddShaderPack(gameDir, tasks[i].Path)
		case "datapack":
			_, err = content.AddDatapack(gameDir, dirOf("datapack", plan.World), tasks[i].Path)
		default:
			err = errors.New("unknown content type " + it.Type)
		}
		if err != nil {
			failed = fmt.Errorf("%s: %w", it.Title, err)
			break
		}
		var incompatible, pinned []string
		for _, d := range it.Version.Dependencies {
			if d.Type == modsearch.DepIncompatible && d.ProjectID != "" {
				if d.VersionID != "" {
					pinned = append(pinned, d.VersionID)
				} else {
					incompatible = append(incompatible, d.ProjectID)
				}
			}
		}
		world := ""
		if it.Type == "datapack" {
			world = plan.World
		}
		entries = append(entries, Entry{
			World: world, ProjectID: it.Version.ProjectID, VersionID: it.Version.ID, Title: it.Title, VersionNumber: it.Version.VersionNumber,
			Type: it.Type, File: files[i].Filename, SHA1: files[i].SHA1, Incompatible: incompatible, IncompatibleVersions: pinned, RequiredBy: it.RequiredBy,
			Description: it.Info.Description, IconURL: it.Info.IconURL,
		})
	}
	if len(entries) > 0 {
		if err := Append(m.Dirs.ContentFile(inst.ID), entries); err != nil && failed == nil {
			failed = err
		}
	}
	// A chosen version takes the old one's place, once the new one is safely in.
	if plan.Replace != "" && failed == nil && len(files) > 0 && plan.Replace != files[0].Filename {
		_ = content.Remove(gameDir, dirOf(plan.Type, plan.World), plan.Replace)
	}
	return entries, failed
}

// AddDatapack plans and applies a datapack into one world ("" version = the best one).
func (m *Manager) AddDatapack(ctx context.Context, inst instance.Instance, projectID, versionID, world string) ([]Entry, error) {
	plan, err := m.PlanDatapack(ctx, inst, projectID, versionID, world)
	if err != nil {
		return nil, err
	}
	return m.Apply(ctx, inst, plan)
}

// Add plans and applies in one go, for callers that already showed the plan.
func (m *Manager) Add(ctx context.Context, inst instance.Instance, projectID string, projectType modsearch.ProjectType) ([]Entry, error) {
	return m.AddVersion(ctx, inst, projectID, projectType, "")
}

// AddVersion is Add for one release the player chose ("" = the best one).
func (m *Manager) AddVersion(ctx context.Context, inst instance.Instance, projectID string, projectType modsearch.ProjectType, versionID string) ([]Entry, error) {
	plan, err := m.PlanVersion(ctx, inst, projectID, projectType, versionID)
	if err != nil {
		return nil, err
	}
	return m.Apply(ctx, inst, plan)
}
