// Package jre downloads the Java runtime Mojang ships for each Minecraft
// version, so players never have to install Java themselves.
package jre

import (
	"context"
	"errors"
	"os"
	"os/exec"
	"path/filepath"
	"runtime"

	"udeos/launcher/internal/download"
	"udeos/launcher/internal/mojang"
	"udeos/launcher/internal/paths"
)

// AllURL lists every runtime component for every platform.
const AllURL = "https://piston-meta.mojang.com/v1/products/java-runtime/2ec0cc96c44e5a76b9c8b7c39df7210883d12871/all.json"

// DefaultComponent is used for versions that do not declare a javaVersion (<= 1.16).
const DefaultComponent = "jre-legacy"

// ErrUnavailable means Mojang publishes no runtime for this platform/component.
var ErrUnavailable = errors.New("no managed Java runtime for this platform")

type allManifest map[string]map[string][]struct {
	Manifest mojang.Artifact `json:"manifest"`
	Version  struct {
		Name string `json:"name"`
	} `json:"version"`
}

type filesManifest struct {
	Files map[string]struct {
		Type       string `json:"type"` // file | directory | link
		Executable bool   `json:"executable"`
		Target     string `json:"target"`
		Downloads  struct {
			Raw mojang.Artifact `json:"raw"`
		} `json:"downloads"`
	} `json:"files"`
}

// Manager installs runtimes under <root>/runtimes/<component>/<platform>.
type Manager struct {
	Dirs   paths.Dirs
	Client *mojang.Client
	Pool   *download.Pool
}

// New returns a manager reporting download progress to report.
func New(dirs paths.Dirs, report func(download.Progress)) *Manager {
	return &Manager{Dirs: dirs, Client: mojang.NewClient(), Pool: download.NewPool(report)}
}

// PlatformKey is Mojang's name for the current OS/architecture.
func PlatformKey() string {
	switch runtime.GOOS {
	case "windows":
		switch runtime.GOARCH {
		case "386":
			return "windows-x86"
		case "arm64":
			return "windows-arm64"
		}
		return "windows-x64"
	case "darwin":
		if runtime.GOARCH == "arm64" {
			return "mac-os-arm64"
		}
		return "mac-os"
	default:
		if runtime.GOARCH == "386" {
			return "linux-i386"
		}
		return "linux"
	}
}

// Dir is the install folder for a component on this platform.
func (m *Manager) Dir(component string) string {
	return filepath.Join(m.Dirs.Runtimes, component, PlatformKey())
}

// JavaBinary is the executable inside an installed runtime folder.
func JavaBinary(dir string) string {
	switch runtime.GOOS {
	case "windows":
		return filepath.Join(dir, "bin", "javaw.exe")
	case "darwin":
		return filepath.Join(dir, "jre.bundle", "Contents", "Home", "bin", "java")
	default:
		return filepath.Join(dir, "bin", "java")
	}
}

// Ensure returns the path to a java executable for the component, downloading
// the runtime on first use. When Mojang has no build for this platform it
// falls back to whatever "java" is on the PATH.
func (m *Manager) Ensure(ctx context.Context, component string) (string, error) {
	if component == "" {
		component = DefaultComponent
	}
	dir := m.Dir(component)
	bin := JavaBinary(dir)
	if _, err := os.Stat(filepath.Join(dir, ".complete")); err == nil {
		if _, err := os.Stat(bin); err == nil {
			return bin, nil
		}
	}

	var all allManifest
	if err := m.Client.GetJSON(ctx, AllURL, &all); err != nil {
		return m.fallback(err)
	}
	entries := all[PlatformKey()][component]
	if len(entries) == 0 {
		return m.fallback(ErrUnavailable)
	}
	var files filesManifest
	if err := m.Client.GetJSON(ctx, entries[0].Manifest.URL, &files); err != nil {
		return "", err
	}

	var tasks []download.Task
	type link struct{ path, target string }
	var links []link
	for rel, f := range files.Files {
		dst := filepath.Join(dir, filepath.FromSlash(rel))
		switch f.Type {
		case "directory":
			if err := os.MkdirAll(dst, 0o755); err != nil {
				return "", err
			}
		case "file":
			r := f.Downloads.Raw
			tasks = append(tasks, download.Task{URL: r.URL, Path: dst, SHA1: r.SHA1, Size: r.Size, Executable: f.Executable})
		case "link":
			links = append(links, link{dst, f.Target})
		}
	}
	if err := m.Pool.Run(ctx, "java", tasks); err != nil {
		return "", err
	}
	for _, l := range links {
		_ = os.Remove(l.path)
		if err := os.Symlink(l.target, l.path); err != nil && runtime.GOOS != "windows" {
			return "", err
		}
	}
	if err := os.WriteFile(filepath.Join(dir, ".complete"), []byte(entries[0].Version.Name), 0o644); err != nil {
		return "", err
	}
	return bin, nil
}

func (m *Manager) fallback(cause error) (string, error) {
	if p, err := exec.LookPath("java"); err == nil {
		return p, nil
	}
	return "", cause
}
