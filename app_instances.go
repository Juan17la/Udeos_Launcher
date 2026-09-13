package main

import (
	"udeos/launcher/internal/instance"
)

// InstanceView is an instance plus what is inside it, for the dashboard cards.
type InstanceView struct {
	instance.Instance
	Counts    instance.Counts `json:"counts"`
	Installed bool            `json:"installed"`
	Running   bool            `json:"running"`
}

func (a *App) view(inst instance.Instance) InstanceView {
	return InstanceView{
		Instance:  inst,
		Counts:    instance.CountContent(a.launcher.Dirs.GameDir(inst.ID)),
		Installed: a.launcher.Installer.IsInstalled(inst.Version),
		Running:   a.launcher.IsRunning(inst.ID),
	}
}

// ListInstances returns every instance, most recently played first.
func (a *App) ListInstances() []InstanceView {
	items := a.launcher.Instances.List()
	out := make([]InstanceView, 0, len(items))
	for _, it := range items {
		out = append(out, a.view(it))
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

// CreateInstance makes a new Vanilla instance folder.
func (a *App) CreateInstance(name, version, icon string) (InstanceView, error) {
	inst, err := a.launcher.Instances.Create(name, version, icon)
	if err != nil {
		return InstanceView{}, err
	}
	return a.view(inst), nil
}

// DeleteInstance removes the instance and all its files.
func (a *App) DeleteInstance(id string) error {
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
