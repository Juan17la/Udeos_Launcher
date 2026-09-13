// Package install turns a version id into a playable set of files on disk:
// version json, libraries, natives, assets, client jar and log config. Every
// file comes from Mojang's public CDN and is verified by SHA-1.
package install

import (
	"archive/zip"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"os"
	"path/filepath"
	"strings"

	"udeos/launcher/internal/download"
	"udeos/launcher/internal/mojang"
	"udeos/launcher/internal/paths"
	"udeos/launcher/internal/rules"
)

// Phases reported through Progress, in order.
const (
	PhaseVersion   = "version"
	PhaseLibraries = "libraries"
	PhaseAssets    = "assets"
	PhaseClient    = "client"
	PhaseNatives   = "natives"
	PhaseJava      = "java"
	PhaseDone      = "done"
)

// Installer downloads versions into the shared data directories.
type Installer struct {
	Dirs   paths.Dirs
	Client *mojang.Client
	Pool   *download.Pool
	Env    rules.Env
	Report func(download.Progress)
}

// New wires an installer whose progress goes to report.
func New(dirs paths.Dirs, report func(download.Progress)) *Installer {
	return &Installer{Dirs: dirs, Client: mojang.NewClient(), Pool: download.NewPool(report), Env: rules.Current(), Report: report}
}

func (i *Installer) phase(name string) {
	if i.Report != nil {
		i.Report(download.Progress{Phase: name})
	}
}

// LoadVersion returns the version JSON ready to use: cached on disk or fetched
// from the manifest, and, for mod loader profiles, merged with the vanilla
// version they inherit from.
func (i *Installer) LoadVersion(ctx context.Context, id string) (*mojang.Version, error) {
	v, err := i.loadOne(ctx, id)
	if err != nil {
		return nil, err
	}
	for depth := 0; v.InheritsFrom != ""; depth++ {
		if depth > 4 {
			return nil, fmt.Errorf("version %q: inheritsFrom chain too deep", id)
		}
		parent, err := i.loadOne(ctx, v.InheritsFrom)
		if err != nil {
			return nil, fmt.Errorf("parent of %s: %w", v.ID, err)
		}
		v = mojang.Merge(parent, v)
	}
	return v, nil
}

// loadOne reads versions/<id>/<id>.json, fetching it from Mojang's manifest
// when it is not on disk yet. Loader profiles are only ever on disk (the
// loader package writes them).
func (i *Installer) loadOne(ctx context.Context, id string) (*mojang.Version, error) {
	path := i.Dirs.VersionJSON(id)
	if raw, err := os.ReadFile(path); err == nil {
		var v mojang.Version
		if err := json.Unmarshal(raw, &v); err == nil && v.ID != "" {
			return &v, nil
		}
	}
	manifest, err := i.Manifest(ctx)
	if err != nil {
		return nil, err
	}
	for _, mv := range manifest.Versions {
		if mv.ID != id {
			continue
		}
		v, raw, err := i.Client.FetchVersion(ctx, mv.URL)
		if err != nil {
			return nil, err
		}
		if err := os.MkdirAll(filepath.Dir(path), 0o755); err != nil {
			return nil, err
		}
		if err := os.WriteFile(path, raw, 0o644); err != nil {
			return nil, err
		}
		return v, nil
	}
	return nil, fmt.Errorf("version %q not found in Mojang's manifest", id)
}

// Manifest fetches the version list, caching it at versions/manifest.json so
// the launcher still lists versions when offline.
func (i *Installer) Manifest(ctx context.Context) (*mojang.Manifest, error) {
	cache := filepath.Join(i.Dirs.Versions, "manifest.json")
	m, err := i.Client.FetchManifest(ctx)
	if err == nil {
		if raw, mErr := json.Marshal(m); mErr == nil {
			_ = os.MkdirAll(i.Dirs.Versions, 0o755)
			_ = os.WriteFile(cache, raw, 0o644)
		}
		return m, nil
	}
	raw, readErr := os.ReadFile(cache)
	if readErr != nil {
		return nil, fmt.Errorf("cannot reach Mojang (%v) and no cached version list", err)
	}
	var cached mojang.Manifest
	if err := json.Unmarshal(raw, &cached); err != nil {
		return nil, err
	}
	return &cached, nil
}

// IsInstalled is a fast check used by the UI: version json and client jar
// present (for a loader profile, the jar of the version it inherits from).
// Individual files are re-verified during Install.
func (i *Installer) IsInstalled(id string) bool {
	raw, err := os.ReadFile(i.Dirs.VersionJSON(id))
	if err != nil {
		return false
	}
	var v mojang.Version
	if err := json.Unmarshal(raw, &v); err != nil || v.ID == "" {
		return false
	}
	base := v.BaseID()
	if v.InheritsFrom != "" && v.Jar == "" {
		base = v.InheritsFrom
	}
	_, jarErr := os.Stat(i.Dirs.ClientJar(base))
	return jarErr == nil
}

// Install downloads everything the version needs. It is safe to call again:
// files that already exist with the right hash are skipped.
func (i *Installer) Install(ctx context.Context, id string) (*mojang.Version, error) {
	i.phase(PhaseVersion)
	v, err := i.LoadVersion(ctx, id)
	if err != nil {
		return nil, err
	}

	libTasks, natives := i.libraryTasks(v)
	if err := i.Pool.Run(ctx, PhaseLibraries, libTasks); err != nil {
		return nil, fmt.Errorf("libraries: %w", err)
	}

	if err := i.installAssets(ctx, v); err != nil {
		return nil, fmt.Errorf("assets: %w", err)
	}

	clientTasks := []download.Task{}
	if c, ok := v.Downloads["client"]; ok {
		clientTasks = append(clientTasks, download.Task{URL: c.URL, Path: i.Dirs.ClientJar(v.BaseID()), SHA1: c.SHA1, Size: c.Size})
	} else {
		return nil, errors.New("version has no client download")
	}
	if err := i.Pool.Run(ctx, PhaseClient, clientTasks); err != nil {
		return nil, fmt.Errorf("client: %w", err)
	}

	i.phase(PhaseNatives)
	if err := i.extractNatives(v, natives); err != nil {
		return nil, fmt.Errorf("natives: %w", err)
	}
	return v, nil
}

// nativeJar is a downloaded jar that must be unpacked into the natives folder.
type nativeJar struct {
	Path    string
	Exclude []string
}

// libraryTasks lists every library jar allowed on this OS, and which of them
// carry native code that must be extracted.
func (i *Installer) libraryTasks(v *mojang.Version) ([]download.Task, []nativeJar) {
	var tasks []download.Task
	var natives []nativeJar
	seen := map[string]bool{}
	add := func(t download.Task) {
		if !seen[t.Path] {
			seen[t.Path] = true
			tasks = append(tasks, t)
		}
	}
	for _, lib := range v.Libraries {
		if !rules.Allowed(lib.Rules, i.Env) {
			continue
		}
		// Main artifact (modern natives jars are also plain artifacts).
		if lib.Downloads != nil && lib.Downloads.Artifact != nil && lib.Downloads.Artifact.URL != "" {
			a := lib.Downloads.Artifact
			path := filepath.Join(i.Dirs.Libraries, filepath.FromSlash(a.Path))
			add(download.Task{URL: a.URL, Path: path, SHA1: a.SHA1, Size: a.Size})
			if lib.IsNativeOnly() {
				natives = append(natives, nativeJar{Path: path})
			}
		} else if lib.Downloads == nil && lib.Natives == nil {
			// No download block (mod loaders): derive the maven path.
			base := lib.URL
			if base == "" {
				base = mojang.LibrariesURL
			}
			rel := mojang.MavenPath(lib.Name)
			add(download.Task{URL: strings.TrimSuffix(base, "/") + "/" + rel, Path: filepath.Join(i.Dirs.Libraries, filepath.FromSlash(rel)), SHA1: lib.SHA1, Size: lib.Size})
		}
		// Old-style natives: a classifier chosen by OS.
		if lib.Natives != nil && lib.Downloads != nil {
			key, ok := lib.Natives[i.Env.NativeKey()]
			if !ok {
				continue
			}
			bits := "64"
			if i.Env.Arch == "x86" {
				bits = "32"
			}
			key = strings.ReplaceAll(key, "${arch}", bits)
			if a, ok := lib.Downloads.Classifiers[key]; ok {
				path := filepath.Join(i.Dirs.Libraries, filepath.FromSlash(a.Path))
				add(download.Task{URL: a.URL, Path: path, SHA1: a.SHA1, Size: a.Size})
				var exclude []string
				if lib.Extract != nil {
					exclude = lib.Extract.Exclude
				}
				natives = append(natives, nativeJar{Path: path, Exclude: exclude})
			}
		}
	}
	return tasks, natives
}

// installAssets fetches the asset index and every object it lists.
func (i *Installer) installAssets(ctx context.Context, v *mojang.Version) error {
	if v.AssetIndex.URL == "" {
		return nil
	}
	indexPath := filepath.Join(i.Dirs.Assets, "indexes", v.AssetIndex.ID+".json")
	if err := i.Pool.Run(ctx, PhaseAssets, []download.Task{{URL: v.AssetIndex.URL, Path: indexPath, SHA1: v.AssetIndex.SHA1, Size: v.AssetIndex.Size}}); err != nil {
		return err
	}
	raw, err := os.ReadFile(indexPath)
	if err != nil {
		return err
	}
	var index mojang.AssetIndex
	if err := json.Unmarshal(raw, &index); err != nil {
		return err
	}
	tasks := make([]download.Task, 0, len(index.Objects))
	seen := map[string]bool{}
	for _, obj := range index.Objects {
		if seen[obj.Hash] {
			continue
		}
		seen[obj.Hash] = true
		tasks = append(tasks, download.Task{URL: obj.URL(), Path: i.objectPath(obj.Hash), SHA1: obj.Hash, Size: obj.Size})
	}
	if err := i.Pool.Run(ctx, PhaseAssets, tasks); err != nil {
		return err
	}
	// Very old versions read assets by file name instead of by hash.
	if index.Virtual || index.MapToResources {
		return i.materializeLegacy(v, index)
	}
	return nil
}

func (i *Installer) objectPath(hash string) string {
	return filepath.Join(i.Dirs.Assets, "objects", hash[:2], hash)
}

// LegacyAssetsDir is the folder passed as ${game_assets} to pre-1.7.3 versions.
func (i *Installer) LegacyAssetsDir(v *mojang.Version) string {
	return filepath.Join(i.Dirs.Assets, "virtual", v.AssetIndex.ID)
}

func (i *Installer) materializeLegacy(v *mojang.Version, index mojang.AssetIndex) error {
	root := i.LegacyAssetsDir(v)
	for name, obj := range index.Objects {
		dst := filepath.Join(root, filepath.FromSlash(name))
		if download.Valid(dst, obj.Hash, obj.Size) {
			continue
		}
		if err := copyFile(i.objectPath(obj.Hash), dst); err != nil {
			return err
		}
	}
	return nil
}

// NativeSubdirs are the folders modern version JSONs reference below
// ${natives_directory}: java.library.path, jna.tmpdir, LWJGL's extract path and
// netty's workdir. They must exist before the JVM starts.
var NativeSubdirs = []string{"java", "jna", "lwjgl", "netty"}

// extractNatives unpacks every native jar into versions/<id>/natives (what
// versions <= 1.18 pass as java.library.path) and into natives/java (what 26.x
// passes). Since 1.19 the natives jars are also on the classpath, so the game
// can load them even if this folder were empty.
func (i *Installer) extractNatives(v *mojang.Version, jars []nativeJar) error {
	dir := i.Dirs.NativesDir(v.BaseID())
	for _, sub := range NativeSubdirs {
		if err := os.MkdirAll(filepath.Join(dir, sub), 0o755); err != nil {
			return err
		}
	}
	for _, j := range jars {
		for _, dst := range []string{dir, filepath.Join(dir, "java")} {
			if err := unzipNatives(j.Path, dst, j.Exclude); err != nil {
				return fmt.Errorf("%s: %w", filepath.Base(j.Path), err)
			}
		}
	}
	return nil
}

func unzipNatives(jar, dir string, exclude []string) error {
	r, err := zip.OpenReader(jar)
	if err != nil {
		return err
	}
	defer r.Close()
	for _, f := range r.File {
		if f.FileInfo().IsDir() || strings.HasPrefix(f.Name, "META-INF/") || excluded(f.Name, exclude) {
			continue
		}
		// Only keep shared libraries; put them flat in the natives folder.
		name := f.Name
		switch {
		case strings.HasSuffix(name, ".so"), strings.HasSuffix(name, ".dll"), strings.HasSuffix(name, ".dylib"), strings.HasSuffix(name, ".jnilib"):
		default:
			continue
		}
		dst := filepath.Join(dir, filepath.Base(name))
		if err := writeZipEntry(f, dst); err != nil {
			return err
		}
	}
	return nil
}

func excluded(name string, exclude []string) bool {
	for _, e := range exclude {
		if strings.HasPrefix(name, e) {
			return true
		}
	}
	return false
}

func writeZipEntry(f *zip.File, dst string) error {
	rc, err := f.Open()
	if err != nil {
		return err
	}
	defer rc.Close()
	out, err := os.OpenFile(dst, os.O_CREATE|os.O_WRONLY|os.O_TRUNC, 0o755)
	if err != nil {
		return err
	}
	_, err = io.Copy(out, rc)
	if cerr := out.Close(); err == nil {
		err = cerr
	}
	return err
}

func copyFile(src, dst string) error {
	if err := os.MkdirAll(filepath.Dir(dst), 0o755); err != nil {
		return err
	}
	in, err := os.Open(src)
	if err != nil {
		return err
	}
	defer in.Close()
	out, err := os.Create(dst)
	if err != nil {
		return err
	}
	_, err = io.Copy(out, in)
	if cerr := out.Close(); err == nil {
		err = cerr
	}
	return err
}
