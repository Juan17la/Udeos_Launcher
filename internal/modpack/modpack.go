// Package modpack turns a Modrinth modpack (.mrpack: a zip holding
// modrinth.index.json, a list of files to download by hash, plus overrides/
// copied as is) into a new instance, or pours its files into an existing
// compatible one. Files are downloaded through the same SHA-1 verified cache
// as single mods and recorded in content.json so the Mods tab shows them
// with their Modrinth title and icon and "already added" checks see them.
package modpack

import (
	"archive/zip"
	"context"
	"crypto/sha1"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"os"
	"path"
	"path/filepath"
	"slices"
	"strings"

	"udeos/launcher/internal/download"
	"udeos/launcher/internal/instance"
	"udeos/launcher/internal/loader"
	"udeos/launcher/internal/modinstall"
	"udeos/launcher/internal/modsearch"
	"udeos/launcher/internal/paths"
)

// Manager installs modpacks.
type Manager struct {
	Dirs      paths.Dirs
	Provider  modsearch.Provider
	Pool      *download.Pool
	Instances *instance.Store
}

// New wires a manager whose download progress goes to report (the same
// content:progress stream single mods use).
func New(dirs paths.Dirs, provider modsearch.Provider, store *instance.Store, report func(download.Progress)) *Manager {
	return &Manager{Dirs: dirs, Provider: provider, Pool: download.NewPool(report), Instances: store}
}

// index is modrinth.index.json, the part of it the launcher reads.
type index struct {
	Name  string `json:"name"`
	Files []struct {
		Path   string            `json:"path"`
		Hashes map[string]string `json:"hashes"`
		Env    struct {
			Client string `json:"client"`
		} `json:"env"`
		Downloads []string `json:"downloads"`
		FileSize  int64    `json:"fileSize"`
	} `json:"files"`
	Dependencies map[string]string `json:"dependencies"` // minecraft, fabric-loader | quilt-loader | forge | neoforge
}

// IconKey is the Instance.Icon value meaning "the pack's own icon, at
// instances/<id>/icon" (served to the UI as /media/<id>/icon).
const IconKey = "modpack"

// Create makes an instance from the modpack's build for Minecraft mc and
// loader ldr (either "" = the newest published) and fills it. The loader and
// its version come from the pack; nothing game-side downloads until Play.
// The pack's icon becomes the instance's (icon is the fallback pixel icon
// when it has none). A pack that fails to install leaves no half instance behind.
func (m *Manager) Create(ctx context.Context, projectID, name, icon, mc, ldr string) (instance.Instance, []modinstall.Entry, error) {
	pack, idx, err := m.fetch(ctx, projectID, mc, ldr)
	if err != nil {
		return instance.Instance{}, nil, err
	}
	if name == "" {
		name = idx.Name
	}
	packIcon := m.fetchIcon(ctx, projectID)
	if packIcon != "" {
		icon = IconKey
	}
	kind, version := loaderOf(idx.Dependencies)
	inst, err := m.Instances.Create(name, idx.Dependencies["minecraft"], kind, version, icon)
	if err != nil {
		return instance.Instance{}, nil, err
	}
	entries, err := m.apply(ctx, inst, projectID, pack, idx)
	if err == nil && packIcon != "" {
		err = copyNew(packIcon, filepath.Join(m.Dirs.InstanceDir(inst.ID), "icon"))
	}
	if err != nil {
		_ = m.Instances.Delete(inst.ID)
		return instance.Instance{}, nil, err
	}
	return inst, entries, nil
}

// fetchIcon downloads the project's icon into the content cache and returns
// its path; "" when the pack has no icon or it cannot be fetched (the
// instance then keeps a pixel icon — never a reason to fail the install).
func (m *Manager) fetchIcon(ctx context.Context, projectID string) string {
	infos, err := m.Provider.Projects(ctx, []string{projectID})
	if err != nil || len(infos) == 0 || infos[0].IconURL == "" {
		return ""
	}
	sum := sha1.Sum([]byte(infos[0].IconURL))
	path := m.Dirs.ContentCacheFile(hex.EncodeToString(sum[:]), "icon")
	if err := m.Pool.Run(ctx, modinstall.Phase, []download.Task{{URL: infos[0].IconURL, Path: path}}); err != nil {
		return ""
	}
	return path
}

// AddTo installs the modpack's build for the instance's Minecraft version
// and loader into it. Files the instance already has are left untouched, so
// the player's configs and mods survive.
func (m *Manager) AddTo(ctx context.Context, inst instance.Instance, projectID string) ([]modinstall.Entry, error) {
	if inst.Loader == "" || inst.Loader == loader.Vanilla {
		return nil, errors.New("this instance has no mod loader: create a Fabric, Quilt, Forge or NeoForge instance to use modpacks")
	}
	pack, idx, err := m.fetch(ctx, projectID, inst.Version, strings.ToLower(inst.Loader))
	if err != nil {
		return nil, err
	}
	return m.apply(ctx, inst, projectID, pack, idx)
}

// fetch picks the pack build for mc/ldr, downloads the .mrpack into the
// content cache and reads its index.
func (m *Manager) fetch(ctx context.Context, projectID, mc, ldr string) (string, *index, error) {
	versions, err := m.Provider.Versions(ctx, projectID, mc, ldr)
	if err != nil {
		return "", nil, fmt.Errorf("cannot reach %s: %w", m.Provider.Name(), err)
	}
	// Modrinth's loader filter is loose for modpacks (asked for forge, it
	// also returns the pack's quilt and neoforge builds), so filter here too.
	versions = slices.DeleteFunc(versions, func(v modsearch.Version) bool {
		return !modsearch.LoaderMatches(v.Loaders, ldr) || (mc != "" && !slices.ContainsFunc(v.GameVersions, func(g string) bool { return strings.EqualFold(g, mc) }))
	})
	v, ok := modsearch.PickVersion(versions)
	if !ok {
		want := "Minecraft " + mc
		if mc == "" {
			want = "any Minecraft version"
		}
		if ldr != "" {
			want += " with " + ldr
		}
		return "", nil, fmt.Errorf("this modpack has no build for %s", want)
	}
	f, ok := v.PrimaryFile()
	if !ok {
		return "", nil, errors.New("this modpack version has no downloadable file")
	}
	pack := m.Dirs.ContentCacheFile(f.SHA1, f.Filename)
	if err := m.Pool.Run(ctx, modinstall.Phase, []download.Task{{URL: f.URL, Path: pack, SHA1: f.SHA1, Size: f.Size}}); err != nil {
		return "", nil, err
	}
	idx, err := readIndex(pack)
	if err != nil {
		return "", nil, fmt.Errorf("read modpack: %w", err)
	}
	return pack, idx, nil
}

// loaderOf maps the index's dependency keys onto the launcher's loader names
// and the version string the loader package installs from.
func loaderOf(deps map[string]string) (kind, version string) {
	if v := deps["fabric-loader"]; v != "" {
		return loader.Fabric, v
	}
	if v := deps["quilt-loader"]; v != "" {
		return loader.Quilt, v
	}
	if v := deps["forge"]; v != "" {
		return loader.Forge, deps["minecraft"] + "-" + v // Forge builds embed the game version: 1.20.1-47.4.10
	}
	if v := deps["neoforge"]; v != "" {
		return loader.NeoForge, v
	}
	return loader.Vanilla, ""
}

// typeOf is the content type of an index file by the folder it lands in; ""
// for anything not tracked in content.json (configs, scripts, …).
func typeOf(p string) string {
	switch strings.SplitN(p, "/", 2)[0] {
	case "mods":
		return "mod"
	case "resourcepacks":
		return "resourcepack"
	case "shaderpacks":
		return "shader"
	}
	return ""
}

// apply downloads the pack's client files into the cache, copies them into
// the game directory, unpacks overrides/ and client-overrides/, then looks
// the files up by hash to record them in content.json. Existing files are
// never overwritten.
func (m *Manager) apply(ctx context.Context, inst instance.Instance, projectID, pack string, idx *index) ([]modinstall.Entry, error) {
	gameDir := m.Dirs.GameDir(inst.ID)
	var tasks []download.Task
	var files []int // index into idx.Files, parallel to tasks
	for i, f := range idx.Files {
		if f.Env.Client == "unsupported" || len(f.Downloads) == 0 {
			continue
		}
		if !safeRel(f.Path) {
			return nil, fmt.Errorf("unsafe path in modpack: %s", f.Path)
		}
		key := f.Hashes["sha1"]
		if key == "" {
			key = f.Hashes["sha512"]
		}
		tasks = append(tasks, download.Task{URL: f.Downloads[0], Path: m.Dirs.ContentCacheFile(key, path.Base(f.Path)), SHA1: f.Hashes["sha1"], Size: f.FileSize})
		files = append(files, i)
	}
	if err := m.Pool.Run(ctx, modinstall.Phase, tasks); err != nil {
		return nil, err
	}
	for i, t := range tasks {
		if err := copyNew(t.Path, filepath.Join(gameDir, filepath.FromSlash(idx.Files[files[i]].Path))); err != nil {
			return nil, err
		}
	}
	if err := unpackOverrides(pack, gameDir); err != nil {
		return nil, err
	}

	// Which mods/packs those files are: one hash lookup, one names lookup.
	var sha1s []string
	for _, i := range files {
		if typeOf(idx.Files[i].Path) != "" && idx.Files[i].Hashes["sha1"] != "" {
			sha1s = append(sha1s, idx.Files[i].Hashes["sha1"])
		}
	}
	versions, err := m.Provider.VersionsByHashes(ctx, sha1s)
	if err != nil {
		return []modinstall.Entry{}, nil // files are in place; the tabs fall back to file names
	}
	var ids []string
	for _, v := range versions {
		ids = append(ids, v.ProjectID)
	}
	infos, _ := m.Provider.Projects(ctx, ids)
	names := map[string]modsearch.ProjectInfo{}
	for _, p := range infos {
		names[p.ID] = p
	}
	entries := []modinstall.Entry{}
	for _, i := range files {
		f := idx.Files[i]
		v, ok := versions[f.Hashes["sha1"]]
		if !ok || typeOf(f.Path) == "" {
			continue
		}
		n := names[v.ProjectID]
		entries = append(entries, modinstall.Entry{
			ProjectID: v.ProjectID, VersionID: v.ID, Title: n.Title, VersionNumber: v.VersionNumber, Type: typeOf(f.Path),
			File: path.Base(f.Path), SHA1: f.Hashes["sha1"], RequiredBy: projectID, Description: n.Description, IconURL: n.IconURL,
		})
	}
	if len(entries) == 0 {
		return entries, nil
	}
	return entries, modinstall.Append(m.Dirs.ContentFile(inst.ID), entries)
}

func readIndex(pack string) (*index, error) {
	r, err := zip.OpenReader(pack)
	if err != nil {
		return nil, err
	}
	defer r.Close()
	f, err := r.Open("modrinth.index.json")
	if err != nil {
		return nil, errors.New("not a Modrinth modpack (no modrinth.index.json inside)")
	}
	defer f.Close()
	var idx index
	if err := json.NewDecoder(f).Decode(&idx); err != nil {
		return nil, err
	}
	if idx.Dependencies["minecraft"] == "" {
		return nil, errors.New("modpack does not say which Minecraft version it is for")
	}
	return &idx, nil
}

// unpackOverrides writes overrides/ then client-overrides/ into gameDir,
// skipping files that already exist.
func unpackOverrides(pack, gameDir string) error {
	r, err := zip.OpenReader(pack)
	if err != nil {
		return err
	}
	defer r.Close()
	for _, prefix := range []string{"overrides/", "client-overrides/"} {
		for _, f := range r.File {
			rel := strings.TrimPrefix(f.Name, prefix)
			if rel == f.Name || rel == "" || f.FileInfo().IsDir() {
				continue
			}
			if !safeRel(rel) {
				return fmt.Errorf("unsafe path in modpack: %s", f.Name)
			}
			rc, err := f.Open()
			if err != nil {
				return err
			}
			err = writeNew(rc, filepath.Join(gameDir, filepath.FromSlash(rel)))
			rc.Close()
			if err != nil {
				return err
			}
		}
	}
	return nil
}

// safeRel accepts forward-slash paths that stay inside the game directory.
func safeRel(p string) bool {
	if p == "" || strings.HasPrefix(p, "/") || strings.Contains(p, "\\") || strings.Contains(p, ":") {
		return false
	}
	for _, part := range strings.Split(p, "/") {
		if part == ".." {
			return false
		}
	}
	return true
}

func copyNew(src, dst string) error {
	in, err := os.Open(src)
	if err != nil {
		return err
	}
	defer in.Close()
	return writeNew(in, dst)
}

// writeNew creates dst from r; an existing dst is kept and reported as nil.
func writeNew(r io.Reader, dst string) error {
	if err := os.MkdirAll(filepath.Dir(dst), 0o755); err != nil {
		return err
	}
	out, err := os.OpenFile(dst, os.O_WRONLY|os.O_CREATE|os.O_EXCL, 0o644)
	if errors.Is(err, os.ErrExist) {
		return nil
	}
	if err != nil {
		return err
	}
	if _, err := io.Copy(out, r); err != nil {
		out.Close()
		os.Remove(dst)
		return err
	}
	return out.Close()
}
