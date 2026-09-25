package loader

import (
	"context"
	"errors"
	"fmt"
	"io/fs"
	"os"
	"path/filepath"
	"runtime"
	"strings"

	"udeos/launcher/internal/download"
)

// InstallServer puts the loader's dedicated server into dir and returns the
// arguments that start it (they go after java and the JVM flags, run from
// dir). Fabric's launcher expects the vanilla server.jar next to it, which
// the caller downloads; Forge and NeoForge installers fetch their own.
// Calling it again for the same build only works out the arguments.
func (m *Manager) InstallServer(ctx context.Context, kind, mc, version, java, dir string) ([]string, error) {
	switch kind {
	case Fabric:
		var installers []fabricEntry
		if err := m.Client.GetJSON(ctx, FabricMetaURL+"/versions/installer", &installers); err != nil {
			return nil, fmt.Errorf("fabric installer list: %w", err)
		}
		inst := ""
		for _, i := range installers {
			if i.Stable {
				inst = i.Version
				break
			}
		}
		if inst == "" {
			return nil, errors.New("fabric meta lists no installer")
		}
		url := fmt.Sprintf("%s/versions/loader/%s/%s/%s/server/jar", FabricMetaURL, mc, version, inst)
		jar := filepath.Join(dir, "fabric-server-launch.jar")
		if err := m.Pool.Run(ctx, Phase, []download.Task{{URL: url, Path: jar}}); err != nil {
			return nil, fmt.Errorf("fabric server: %w", err)
		}
		return []string{"-jar", "fabric-server-launch.jar", "nogui"}, nil
	case Forge, NeoForge:
		marker := filepath.Join(dir, ".udeos-"+strings.ToLower(kind)+"-"+version)
		if !fileExists(marker) {
			task := forgeInstaller(version)
			if kind == NeoForge {
				task = neoForgeInstaller(version)
			}
			jar := filepath.Join(m.Dirs.Root, "cache", task.Path)
			if err := m.Pool.Run(ctx, Phase, []download.Task{{URL: task.URL, Path: jar}}); err != nil {
				return nil, fmt.Errorf("installer: %w", err)
			}
			if err := m.runForgeInstaller(ctx, jar, java, "--installServer", dir); err != nil {
				return nil, err
			}
			if err := os.WriteFile(marker, nil, 0o644); err != nil {
				return nil, err
			}
		}
		return forgeServerArgs(dir)
	case Quilt:
		return nil, errors.New("Quilt servers are not supported yet: make a Fabric server, Quilt mods mostly run on it")
	}
	return nil, ErrUnknown
}

// forgeServerArgs finds how the installed server starts: 1.17+ installers
// leave an argument file under libraries/ (unix_args.txt / win_args.txt),
// older ones a runnable forge-<version>.jar in the folder itself.
func forgeServerArgs(dir string) ([]string, error) {
	want := "unix_args.txt"
	if runtime.GOOS == "windows" {
		want = "win_args.txt"
	}
	found := ""
	_ = filepath.WalkDir(filepath.Join(dir, "libraries"), func(path string, d fs.DirEntry, err error) error {
		if err == nil && d.Name() == want {
			found = path
			return fs.SkipAll
		}
		return nil
	})
	if found != "" {
		rel, err := filepath.Rel(dir, found)
		if err != nil {
			return nil, err
		}
		return []string{"@" + filepath.ToSlash(rel), "nogui"}, nil
	}
	jars, _ := filepath.Glob(filepath.Join(dir, "*.jar"))
	for _, j := range jars {
		name := filepath.Base(j)
		if (strings.HasPrefix(name, "forge-") || strings.HasPrefix(name, "neoforge-")) && !strings.Contains(name, "installer") {
			return []string{"-jar", name, "nogui"}, nil
		}
	}
	return nil, errors.New("the server installer finished but left nothing to start")
}
