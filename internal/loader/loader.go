// Package loader installs Fabric and Forge on top of a vanilla version so an
// instance can be "1.20.1 + Forge" the same way it is "1.20.1": the player
// picks the loader, the launcher picks a loader build, downloads and installs
// it, and writes a version profile that the install and launch packages
// treat like any other version (it inheritsFrom the vanilla one).
package loader

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"os"
	"path/filepath"
	"strings"

	"udeos/launcher/internal/download"
	"udeos/launcher/internal/mojang"
	"udeos/launcher/internal/paths"
)

// Loader names as stored on an instance.
const (
	Vanilla = "Vanilla"
	Fabric  = "Fabric"
	Forge   = "Forge"
)

// Phase reported through Progress while a loader is being installed.
const Phase = "loader"

// ErrUnknown is returned for loader names other than the constants above.
var ErrUnknown = errors.New("unknown mod loader")

// Option is one Minecraft version a loader supports and the loader build the
// launcher will install for it (latest stable for Fabric, recommended or
// latest for Forge).
type Option struct {
	Minecraft string `json:"minecraft"`
	Version   string `json:"version"` // full loader version used to install ("0.16.9", "1.20.1-47.4.10")
	Label     string `json:"label"`   // short form shown in the UI ("0.16.9", "47.4.10")
}

// Manager fetches loader metadata and installs loader profiles.
type Manager struct {
	Dirs   paths.Dirs
	Client *mojang.Client
	Pool   *download.Pool
	Report func(download.Progress)
}

// New wires a manager whose progress goes to report.
func New(dirs paths.Dirs, report func(download.Progress)) *Manager {
	return &Manager{Dirs: dirs, Client: mojang.NewClient(), Pool: download.NewPool(report), Report: report}
}

func (m *Manager) progress(current string) {
	if m.Report != nil {
		m.Report(download.Progress{Phase: Phase, Current: current})
	}
}

// Valid reports whether name is a loader the launcher knows.
func Valid(name string) bool {
	return name == Vanilla || name == Fabric || name == Forge
}

// ProfileID names the version profile written for a loader build, e.g.
// fabric-loader-0.16.9-1.21.1 or forge-1.20.1-47.4.10.
func ProfileID(kind, mc, version string) (string, error) {
	switch kind {
	case Fabric:
		return "fabric-loader-" + version + "-" + mc, nil
	case Forge:
		return "forge-" + version, nil
	}
	return "", ErrUnknown
}

// Label is the short loader version shown next to the Minecraft version.
func Label(kind, mc, version string) string {
	if kind == Forge {
		// Forge versions embed the game version: 1.20.1-47.4.10, 1.7.10-10.13.4.1614-1.7.10.
		return strings.TrimSuffix(strings.TrimPrefix(version, mc+"-"), "-"+mc)
	}
	return version
}

// Options lists the Minecraft versions the loader supports. The result is
// cached at cache/loaders/<kind>.json so the create form works offline.
func (m *Manager) Options(ctx context.Context, kind string) ([]Option, error) {
	var opts []Option
	var err error
	switch kind {
	case Fabric:
		opts, err = m.fabricOptions(ctx)
	case Forge:
		opts, err = m.forgeOptions(ctx)
	default:
		return nil, ErrUnknown
	}
	cache := filepath.Join(m.Dirs.Root, "cache", "loaders", strings.ToLower(kind)+".json")
	if err == nil {
		if raw, mErr := json.Marshal(opts); mErr == nil {
			_ = os.MkdirAll(filepath.Dir(cache), 0o755)
			_ = os.WriteFile(cache, raw, 0o644)
		}
		return opts, nil
	}
	raw, readErr := os.ReadFile(cache)
	if readErr != nil {
		return nil, fmt.Errorf("cannot reach the %s servers (%v) and no cached list", kind, err)
	}
	if err := json.Unmarshal(raw, &opts); err != nil {
		return nil, err
	}
	return opts, nil
}

// IsInstalled reports whether a readable loader profile has been written.
func (m *Manager) IsInstalled(kind, mc, version string) bool {
	id, err := ProfileID(kind, mc, version)
	if err != nil {
		return false
	}
	return m.profileOK(id)
}

// profileOK is true when versions/<id>/<id>.json exists and parses; a broken
// file (interrupted write, older launcher build) is simply installed again.
func (m *Manager) profileOK(id string) bool {
	raw, err := os.ReadFile(m.Dirs.VersionJSON(id))
	if err != nil {
		return false
	}
	var v mojang.Version
	return json.Unmarshal(raw, &v) == nil && v.ID == id && v.MainClass != ""
}

// Install makes sure the loader profile exists and returns its version id.
// The vanilla version must be installed first; java is the runtime for it
// (Forge's installer runs on it). Calling it again is a no-op.
func (m *Manager) Install(ctx context.Context, kind, mc, version, java string) (string, error) {
	id, err := ProfileID(kind, mc, version)
	if err != nil {
		return "", err
	}
	if m.profileOK(id) {
		return id, nil
	}
	m.progress("")
	switch kind {
	case Fabric:
		err = m.installFabric(ctx, id, mc, version)
	case Forge:
		err = m.installForge(ctx, id, mc, version, java)
	}
	if err != nil {
		return "", fmt.Errorf("%s: %w", kind, err)
	}
	return id, nil
}

// writeProfile saves the loader's version json under our own id.
func (m *Manager) writeProfile(id string, v *mojang.Version) error {
	v.ID = id
	raw, err := json.MarshalIndent(v, "", "  ")
	if err != nil {
		return err
	}
	path := m.Dirs.VersionJSON(id)
	if err := os.MkdirAll(filepath.Dir(path), 0o755); err != nil {
		return err
	}
	return os.WriteFile(path, raw, 0o644)
}
