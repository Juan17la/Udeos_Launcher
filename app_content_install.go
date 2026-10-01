package main

import (
	"errors"
	"strings"

	"udeos/launcher/internal/modinstall"
	"udeos/launcher/internal/modpack"
	"udeos/launcher/internal/modsearch"
)

// PlanContent says what adding a search result to an instance would do:
// which version fits the instance's Minecraft version and loader, which
// required dependencies come with it, or why it cannot be added (no build
// for that version, wrong loader, incompatible with an installed mod).
func (a *App) PlanContent(instanceID, projectID, projectType string) (modinstall.Plan, error) {
	inst, err := a.launcher.Instances.Get(instanceID)
	if err != nil {
		return modinstall.Plan{}, err
	}
	return a.launcher.Content.Plan(a.ctx, inst, projectID, modsearch.ProjectType(projectType))
}

// AddContent plans again (cheap, and the plan must not be stale) and installs
// the files. versionID is the release the player picked ("" = the best one
// for the instance); another release of a project already there replaces it.
// A modpack pours its files into the instance instead (its build for the
// instance's version and loader; existing files are kept). A datapack goes into
// world (the saves/ folder name; a server has just one). Progress arrives
// through the "content:progress" event.
func (a *App) AddContent(instanceID, projectID, projectType, versionID, world string) ([]modinstall.Entry, error) {
	inst, err := a.launcher.Instances.Get(instanceID)
	if err != nil {
		return nil, err
	}
	ctx, done := a.job("content")
	defer done()
	if projectType == string(modsearch.TypeModpack) {
		return a.launcher.Modpacks.AddTo(ctx, inst, projectID)
	}
	if projectType == string(modsearch.TypeDatapack) {
		rel, err := a.worldRel(inst, world)
		if err != nil {
			return nil, err
		}
		return a.launcher.Content.AddDatapack(ctx, inst, projectID, versionID, rel)
	}
	return a.launcher.Content.AddVersion(ctx, inst, projectID, modsearch.ProjectType(projectType), versionID)
}

// CreateInstanceFromModpack makes a new instance out of a modpack: its build
// for gameVersion/loader ("" = newest), the loader the pack declares, every
// file it lists and its overrides. name defaults to the pack's name.
func (a *App) CreateInstanceFromModpack(projectID, name, icon, gameVersion, ldr string) (InstanceView, error) {
	ctx, done := a.job("content")
	defer done()
	inst, _, err := a.launcher.Modpacks.Create(ctx, projectID, name, icon, gameVersion, ldr)
	if err != nil {
		return InstanceView{}, err
	}
	return a.view(inst), nil
}

// ListInstalledProjects returns the provider project ids already in the
// instance, so the search page can mark them as added.
func (a *App) ListInstalledProjects(instanceID string) ([]string, error) {
	inst, err := a.launcher.Instances.Get(instanceID)
	if err != nil {
		return nil, err
	}
	return a.launcher.Content.InstalledProjects(inst)
}

// ListContent returns what the launcher installed from Modrinth into the
// instance (title, version, icon, description per file), so the content tabs
// can show a card instead of a bare file name. Files added by hand are not
// listed; the tabs fall back to the file name for those.
func (a *App) ListContent(instanceID string) ([]modinstall.Entry, error) {
	inst, err := a.launcher.Instances.Get(instanceID)
	if err != nil {
		return nil, err
	}
	return a.launcher.Content.Installed(a.ctx, inst)
}

// GetProjectDetail fetches the whole project (full description, and the
// Minecraft versions/loaders aggregated across every version) for the
// Details page and the Add-to-instance picker's compatibility check.
func (a *App) GetProjectDetail(projectID string) (modsearch.ProjectDetail, error) {
	return a.launcher.Search.ProjectDetail(a.ctx, projectID)
}

// ListProjectVersions lists the releases of a project that run on the
// instance (its Minecraft version and loader), newest first, each marked when
// it is installed or does not work with something installed.
func (a *App) ListProjectVersions(instanceID, projectID, projectType string) ([]modinstall.VersionChoice, error) {
	inst, err := a.launcher.Instances.Get(instanceID)
	if err != nil {
		return nil, err
	}
	return a.launcher.Content.Versions(a.ctx, inst, projectID, modsearch.ProjectType(projectType))
}

// GetAlternatives is what to offer when adding a project failed because it
// does not work with something installed: other releases of it that fit, and
// when there are none, similar projects that can be added right now.
func (a *App) GetAlternatives(instanceID, projectID, projectType string) (modinstall.Alternatives, error) {
	inst, err := a.launcher.Instances.Get(instanceID)
	if err != nil {
		return modinstall.Alternatives{}, err
	}
	return a.launcher.Content.Alternatives(a.ctx, inst, projectID, modsearch.ProjectType(projectType))
}

// PickJoinFile opens a file chooser for a join file; "" when cancelled.
func (a *App) PickJoinFile() (string, error) {
	return a.pick("Choose a join file", "*"+modpack.JoinExt, "Join file")
}

// ReadJoinFile says which server a join file is for (its name and address),
// without installing anything.
func (a *App) ReadJoinFile(path string) (modpack.JoinInfo, error) {
	if !strings.HasSuffix(strings.ToLower(path), modpack.JoinExt) {
		return modpack.JoinInfo{}, errors.New("that is not a join file: it should end in " + modpack.JoinExt)
	}
	return modpack.ReadJoin(path)
}

// CreateInstanceFromFile makes the instance a join file describes: the same
// Minecraft version and loader, every mod, pack and shader it lists, the
// server in the multiplayer list. name "" = the server's name. Progress
// arrives through "content:progress".
func (a *App) CreateInstanceFromFile(path, name, icon string) (InstanceView, error) {
	if _, err := a.ReadJoinFile(path); err != nil {
		return InstanceView{}, err
	}
	ctx, done := a.job("content")
	defer done()
	inst, _, err := a.launcher.Modpacks.CreateFromJoin(ctx, path, name, icon)
	if err != nil {
		return InstanceView{}, err
	}
	return a.view(inst), nil
}
