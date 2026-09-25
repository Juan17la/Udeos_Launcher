package main

import (
	"errors"

	"udeos/launcher/internal/instance"
	"udeos/launcher/internal/loader"
)

// InstanceView is an instance plus what is inside it, for the dashboard cards.
type InstanceView struct {
	instance.Instance
	LoaderLabel string          `json:"loaderLabel"` // "Vanilla", "Fabric 0.16.9", "Forge 47.4.10", "NeoForge 21.1.172"
	Counts      instance.Counts `json:"counts"`
	Installed   bool            `json:"installed"`
	Running     bool            `json:"running"`
}

func (a *App) view(inst instance.Instance) InstanceView {
	label := inst.Loader
	if inst.Loader != loader.Vanilla && inst.LoaderVersion != "" {
		label += " " + loader.Label(inst.Loader, inst.Version, inst.LoaderVersion)
	}
	return InstanceView{
		Instance:    inst,
		LoaderLabel: label,
		Counts:      instance.CountContent(a.launcher.Dirs.GameDir(inst.ID)),
		Installed:   a.launcher.IsInstalled(inst),
		Running:     a.launcher.IsRunning(inst.ID),
	}
}

// ListInstances returns the active profile's instances, most recently played
// first. Unclaimed ones (older than profiles, or just created by
// CreateInstance / a modpack) are handed to the active profile first.
func (a *App) ListInstances() []InstanceView {
	out := []InstanceView{}
	p, err := a.launcher.Profile()
	if err != nil {
		return out
	}
	if err := a.launcher.Instances.Adopt(p.Nickname); err != nil {
		return out
	}
	for _, it := range a.launcher.Instances.List() {
		if it.Owner == p.Nickname && !it.Server {
			out = append(out, a.view(it))
		}
	}
	return out
}

// InstanceCounts is how many instances each profile has, for the profile switcher.
func (a *App) InstanceCounts() map[string]int {
	out := map[string]int{}
	for _, it := range a.launcher.Instances.List() {
		if !it.Server {
			out[it.Owner]++
		}
	}
	return out
}

// GetInstance returns one instance.
func (a *App) GetInstance(id string) (InstanceView, error) {
	inst, err := a.launcher.Instances.Get(id)
	if err != nil {
		return InstanceView{}, err
	}
	return a.view(inst), nil
}

// CreateInstance makes a new instance folder. loader is Vanilla, Fabric, Forge
// or NeoForge; loaderVersion is the build from ListLoaderVersions (empty for Vanilla).
// Nothing is downloaded until the first Play.
func (a *App) CreateInstance(name, version, ldr, loaderVersion, icon string) (InstanceView, error) {
	if !loader.Valid(ldr) {
		return InstanceView{}, errors.New("unknown mod loader " + ldr)
	}
	inst, err := a.launcher.Instances.Create(name, version, ldr, loaderVersion, icon)
	if err != nil {
		return InstanceView{}, err
	}
	return a.view(inst), nil
}

// SetInstanceLaunch stores the instance's JVM settings: heap size (0 = the
// profile default), Java executable ("" = managed runtime) and extra flags.
func (a *App) SetInstanceLaunch(id string, l instance.Launch) (InstanceView, error) {
	if err := a.launcher.Instances.SetLaunch(id, l); err != nil {
		return InstanceView{}, err
	}
	return a.GetInstance(id)
}

// SetInstanceInfo renames the instance and picks its icon (a pixel icon key,
// "modpack" to keep a pack's own icon, or "" to leave it as is).
func (a *App) SetInstanceInfo(id, name, icon string) (InstanceView, error) {
	if err := a.launcher.Instances.SetInfo(id, name, icon); err != nil {
		return InstanceView{}, err
	}
	return a.GetInstance(id)
}

// PickJava opens a file dialog for a Java executable; "" when cancelled.
func (a *App) PickJava() (string, error) {
	return a.pick("Choose a Java executable", "*", "Java")
}

// DeleteInstance removes the instance (or server) and all its files.
func (a *App) DeleteInstance(id string) error {
	// A running server saves and stops first, so its files are not in use.
	if err := a.launcher.StopServerWait(id); err != nil {
		return err
	}
	return a.launcher.Instances.Delete(id)
}

// VersionOption is one selectable Minecraft version.
type VersionOption struct {
	ID          string `json:"id"`
	Type        string `json:"type"`
	ReleaseTime string `json:"releaseTime"`
}

// VersionList is what the create form shows.
type VersionList struct {
	LatestRelease  string          `json:"latestRelease"`
	LatestSnapshot string          `json:"latestSnapshot"`
	Versions       []VersionOption `json:"versions"`
}

// ListLoaderVersions returns, for Fabric, Quilt, Forge or NeoForge, every Minecraft version
// the loader supports and the loader build that will be installed for it.
// The create form uses it to filter the version list once a loader is picked.
func (a *App) ListLoaderVersions(ldr string) ([]loader.Option, error) {
	return a.launcher.Loaders.Options(a.ctx, ldr)
}

// ListVersions fetches Mojang's manifest (cached for offline use).
func (a *App) ListVersions() (VersionList, error) {
	m, err := a.launcher.Installer.Manifest(a.ctx)
	if err != nil {
		return VersionList{}, err
	}
	out := VersionList{LatestRelease: m.Latest.Release, LatestSnapshot: m.Latest.Snapshot}
	for _, v := range m.Versions {
		out.Versions = append(out.Versions, VersionOption{ID: v.ID, Type: v.Type, ReleaseTime: v.ReleaseTime})
	}
	return out, nil
}
