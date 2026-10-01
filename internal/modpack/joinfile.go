package modpack

import (
	"archive/zip"
	"context"
	"crypto/sha1"
	"crypto/sha512"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/url"
	"os"
	"path"
	"path/filepath"
	"sort"
	"strings"

	"udeos/launcher/internal/content"
	"udeos/launcher/internal/download"
	"udeos/launcher/internal/instance"
	"udeos/launcher/internal/loader"
	"udeos/launcher/internal/modinstall"
	"udeos/launcher/internal/server"
)

// A join file (".udeos") is what a friend needs to play on a modded server
// without hunting for anything: the Minecraft version, the loader and its
// build, and every mod, resource pack and shader the server has, as references
// (download address + hash, a few KB in all), plus the server's address. It is
// a zip in the layout of a Modrinth modpack (modrinth.index.json, overrides/),
// so importing it is the same code as importing a modpack, with one extra
// file, udeos.json. Files that are not on Modrinth cannot be referenced; they
// are put in overrides/ so the file is still complete (and then it is bigger).

// JoinExt is the file extension of a join file.
const JoinExt = ".udeos"

// JoinInfo is udeos.json: what a join file says beyond the modpack index.
type JoinInfo struct {
	// Name of the server, for the instance and its entry in the multiplayer list.
	Name string `json:"name"`
	// Address friends type to join ("" = the server had none yet).
	Address string `json:"address"`
	// ResourcePack is the server's own resource pack, when it sets one.
	ResourcePack *JoinPack `json:"resourcePack,omitempty"`
}

// JoinPack is a resource pack by address and hash.
type JoinPack struct {
	URL  string `json:"url"`
	SHA1 string `json:"sha1,omitempty"`
}

// JoinSummary tells the player what went into an exported file.
type JoinSummary struct {
	References int   `json:"references"` // files listed by address (mods, packs, shaders)
	Embedded   int   `json:"embedded"`   // files that had to be put inside: not on Modrinth
	SizeBytes  int64 `json:"sizeBytes"`
	HasAddress bool  `json:"hasAddress"`
}

// outIndex is modrinth.index.json as written (the reader's struct only keeps what the launcher reads).
type outIndex struct {
	FormatVersion int               `json:"formatVersion"`
	Game          string            `json:"game"`
	VersionID     string            `json:"versionId"`
	Name          string            `json:"name"`
	Files         []outFile         `json:"files"`
	Dependencies  map[string]string `json:"dependencies"`
}

type outFile struct {
	Path      string            `json:"path"`
	Hashes    map[string]string `json:"hashes"`
	Env       map[string]string `json:"env"`
	Downloads []string          `json:"downloads"`
	FileSize  int64             `json:"fileSize"`
}

// joinFolders are the server folders a player also needs a copy of, with the
// extension of the files listed. Only files are referenced (a folder pack has
// no hash).
var joinFolders = []struct{ sub, ext string }{{"mods", ".jar"}, {"resourcepacks", ".zip"}, {"shaderpacks", ".zip"}}

// dependencyKey is the modpack-index key for a loader's build, and the build
// as that key wants it (Forge's installs embed the game version: 1.20.1-47.4.10).
func dependencyKey(inst instance.Instance) (key, build string, err error) {
	switch inst.Loader {
	case loader.Fabric:
		return "fabric-loader", inst.LoaderVersion, nil
	case loader.Forge:
		return "forge", strings.TrimPrefix(inst.LoaderVersion, inst.Version+"-"), nil
	case loader.NeoForge:
		return "neoforge", inst.LoaderVersion, nil
	case loader.Quilt:
		return "quilt-loader", inst.LoaderVersion, nil
	}
	return "", "", errors.New("a Vanilla server needs nothing installed: friends can join with plain Minecraft " + inst.Version)
}

// ExportJoin writes the server's join file to w. address is what friends
// type ("" when the server has none yet). Mods the Modrinth data says only
// run on servers are left out: the player does not need them.
func (m *Manager) ExportJoin(ctx context.Context, inst instance.Instance, address string, w io.Writer) (JoinSummary, error) {
	key, build, err := dependencyKey(inst)
	if err != nil {
		return JoinSummary{}, err
	}
	gameDir := m.Dirs.GameDir(inst.ID)

	type local struct {
		sub, name, sha1, sha512 string
		size                    int64
	}
	var files []local
	for _, f := range joinFolders {
		list, err := content.ListFiles(gameDir, f.sub, f.ext)
		if err != nil {
			return JoinSummary{}, err
		}
		for _, e := range list {
			if e.IsDir {
				continue // a folder pack cannot be referenced by hash
			}
			s1, s512, err := hashes(filepath.Join(gameDir, f.sub, e.Name))
			if err != nil {
				return JoinSummary{}, err
			}
			files = append(files, local{f.sub, e.Name, s1, s512, e.SizeBytes})
		}
	}
	sort.Slice(files, func(i, j int) bool { return files[i].sub+files[i].name < files[j].sub+files[j].name })

	// One lookup names every file Modrinth knows, one more says which are server-only.
	sums := make([]string, len(files))
	for i, f := range files {
		sums[i] = f.sha1
	}
	known, err := m.Provider.VersionsByHashes(ctx, sums)
	if err != nil {
		return JoinSummary{}, fmt.Errorf("cannot reach %s: %w", m.Provider.Name(), err)
	}
	var projects []string
	for _, v := range known {
		projects = append(projects, v.ProjectID)
	}
	serverOnly := map[string]bool{}
	if infos, err := m.Provider.Projects(ctx, projects); err == nil {
		for _, p := range infos {
			serverOnly[p.ID] = p.ClientSide == "unsupported"
		}
	}

	idx := outIndex{FormatVersion: 1, Game: "minecraft", VersionID: "1", Name: inst.Name, Files: []outFile{}, Dependencies: map[string]string{"minecraft": inst.Version, key: build}}
	var embed []local
	for _, f := range files {
		v, ok := known[f.sha1]
		if !ok {
			embed = append(embed, f)
			continue
		}
		if serverOnly[v.ProjectID] {
			continue
		}
		// The release's own file entry carries the address and the size.
		var url string
		size := f.size
		for _, vf := range v.Files {
			if strings.EqualFold(vf.SHA1, f.sha1) {
				url, size = vf.URL, vf.Size
			}
		}
		if url == "" {
			embed = append(embed, f)
			continue
		}
		idx.Files = append(idx.Files, outFile{
			Path: f.sub + "/" + f.name, Hashes: map[string]string{"sha1": f.sha1, "sha512": f.sha512},
			Env: map[string]string{"client": "required", "server": "required"}, Downloads: []string{url}, FileSize: size,
		})
	}

	info := JoinInfo{Name: inst.Name, Address: address}
	if props, err := server.ReadProperties(gameDir); err == nil && props["resource-pack"] != "" {
		info.ResourcePack = &JoinPack{URL: props["resource-pack"], SHA1: props["resource-pack-sha1"]}
	}

	cw := &countWriter{w: w}
	zw := zip.NewWriter(cw)
	put := func(name string, v any) error {
		f, err := zw.Create(name)
		if err != nil {
			return err
		}
		return json.NewEncoder(f).Encode(v)
	}
	if err := put("modrinth.index.json", idx); err != nil {
		return JoinSummary{}, err
	}
	if err := put("udeos.json", info); err != nil {
		return JoinSummary{}, err
	}
	for _, f := range embed {
		dst, err := zw.Create("overrides/" + f.sub + "/" + f.name)
		if err != nil {
			return JoinSummary{}, err
		}
		src, err := os.Open(filepath.Join(gameDir, f.sub, f.name))
		if err != nil {
			return JoinSummary{}, err
		}
		_, err = io.Copy(dst, src)
		src.Close()
		if err != nil {
			return JoinSummary{}, err
		}
	}
	if err := zw.Close(); err != nil {
		return JoinSummary{}, err
	}
	return JoinSummary{References: len(idx.Files), Embedded: len(embed), SizeBytes: cw.n, HasAddress: address != ""}, nil
}

type countWriter struct {
	w io.Writer
	n int64
}

func (c *countWriter) Write(p []byte) (int, error) {
	n, err := c.w.Write(p)
	c.n += int64(n)
	return n, err
}

func hashes(path string) (s1, s512 string, err error) {
	f, err := os.Open(path)
	if err != nil {
		return "", "", err
	}
	defer f.Close()
	h1, h5 := sha1.New(), sha512.New()
	if _, err := io.Copy(io.MultiWriter(h1, h5), f); err != nil {
		return "", "", err
	}
	return hex.EncodeToString(h1.Sum(nil)), hex.EncodeToString(h5.Sum(nil)), nil
}

// ReadJoin reads udeos.json from a join file; a plain modpack has none.
func ReadJoin(file string) (JoinInfo, error) {
	var info JoinInfo
	r, err := zip.OpenReader(file)
	if err != nil {
		return info, errors.New("that is not a join file")
	}
	defer r.Close()
	f, err := r.Open("udeos.json")
	if err != nil {
		return info, errors.New("that is not a join file: it has no server in it")
	}
	defer f.Close()
	if err := json.NewDecoder(f).Decode(&info); err != nil {
		return info, errors.New("that join file is damaged")
	}
	return info, nil
}

// CreateFromJoin makes the instance a join file describes: the Minecraft
// version and loader it names, every mod, pack and shader it lists (downloaded
// and checked like a modpack's), the server already in the multiplayer list
// and the server's resource pack in resourcepacks/. name "" = the server's
// name. A file that fails to install leaves no half instance behind.
func (m *Manager) CreateFromJoin(ctx context.Context, file, name, icon string) (instance.Instance, JoinInfo, error) {
	info, err := ReadJoin(file)
	if err != nil {
		return instance.Instance{}, info, err
	}
	idx, err := readIndex(file)
	if err != nil {
		return instance.Instance{}, info, fmt.Errorf("read join file: %w", err)
	}
	if name == "" {
		name = info.Name
	}
	if name == "" {
		name = idx.Name
	}
	kind, version := loaderOf(idx.Dependencies)
	inst, err := m.Instances.Create(name, idx.Dependencies["minecraft"], kind, version, icon)
	if err != nil {
		return instance.Instance{}, info, err
	}
	gameDir := m.Dirs.GameDir(inst.ID)
	_, err = m.apply(ctx, inst, false, "", file, idx)
	if err == nil && info.Address != "" {
		err = content.WriteServersDat(gameDir, info.Name, info.Address)
	}
	if err != nil {
		_ = m.Instances.Delete(inst.ID)
		return instance.Instance{}, info, err
	}
	m.fetchServerPack(ctx, gameDir, info.ResourcePack)
	return inst, info, nil
}

// fetchServerPack puts the server's resource pack in resourcepacks/. The
// server offers it again on joining, so a failure here is never a reason to
// fail the import.
func (m *Manager) fetchServerPack(ctx context.Context, gameDir string, p *JoinPack) {
	if p == nil || p.URL == "" {
		return
	}
	u, err := url.Parse(p.URL)
	if err != nil || (u.Scheme != "http" && u.Scheme != "https") {
		return
	}
	name := path.Base(u.Path)
	if !strings.HasSuffix(strings.ToLower(name), ".zip") {
		name = "server-pack.zip"
	}
	dst := filepath.Join(gameDir, "resourcepacks", name)
	_ = os.MkdirAll(filepath.Dir(dst), 0o755)
	_ = m.Pool.Run(ctx, modinstall.Phase, []download.Task{{URL: p.URL, Path: dst, SHA1: p.SHA1}})
}
