package main

import (
	"udeos/launcher/internal/modinstall"
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
// the files. A modpack pours its files into the instance instead (its build
// for the instance's version and loader; existing files are kept). Progress
// arrives through the "content:progress" event.
func (a *App) AddContent(instanceID, projectID, projectType string) ([]modinstall.Entry, error) {
	inst, err := a.launcher.Instances.Get(instanceID)
	if err != nil {
		return nil, err
	}
	if projectType == string(modsearch.TypeModpack) {
		return a.launcher.Modpacks.AddTo(a.ctx, inst, projectID)
	}
	return a.launcher.Content.Add(a.ctx, inst, projectID, modsearch.ProjectType(projectType))
}

// CreateInstanceFromModpack makes a new instance out of a modpack: its build
// for gameVersion/loader ("" = newest), the loader the pack declares, every
// file it lists and its overrides. name defaults to the pack's name.
func (a *App) CreateInstanceFromModpack(projectID, name, icon, gameVersion, ldr string) (InstanceView, error) {
	inst, _, err := a.launcher.Modpacks.Create(a.ctx, projectID, name, icon, gameVersion, ldr)
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
