// Package content reads and exports what lives inside an instance's game
// directory: worlds (saves/), screenshots/ and resourcepacks/.
package content

import (
	"archive/zip"
	"errors"
	"io"
	"io/fs"
	"os"
	"path/filepath"
	"sort"
	"strings"
	"time"
)

// World is one folder under saves/.
type World struct {
	Folder     string    `json:"folder"`
	Name       string    `json:"name"` // LevelName from level.dat, else the folder name
	LastPlayed time.Time `json:"lastPlayed"`
	SizeBytes  int64     `json:"sizeBytes"`
}

// FileEntry is a screenshot, a resource pack, a mod or a shader pack.
type FileEntry struct {
	Name      string    `json:"name"`
	SizeBytes int64     `json:"sizeBytes"`
	ModTime   time.Time `json:"modTime"`
	IsDir     bool      `json:"isDir"`
}

// ListWorlds returns the worlds, most recently played first.
func ListWorlds(gameDir string) ([]World, error) {
	dir := filepath.Join(gameDir, "saves")
	entries, err := os.ReadDir(dir)
	if err != nil {
		if errors.Is(err, fs.ErrNotExist) {
			return []World{}, nil
		}
		return nil, err
	}
	worlds := []World{}
	for _, e := range entries {
		if !e.IsDir() {
			continue
		}
		wdir := filepath.Join(dir, e.Name())
		st, err := os.Stat(filepath.Join(wdir, "level.dat"))
		if err != nil {
			continue
		}
		w := World{Folder: e.Name(), Name: e.Name(), LastPlayed: st.ModTime(), SizeBytes: dirSize(wdir)}
		if root, err := readLevelDat(filepath.Join(wdir, "level.dat")); err == nil {
			if data, ok := root["Data"].(map[string]any); ok {
				if name, ok := data["LevelName"].(string); ok && name != "" {
					w.Name = name
				}
				if ms, ok := data["LastPlayed"].(int64); ok && ms > 0 {
					w.LastPlayed = time.UnixMilli(ms)
				}
			}
		}
		worlds = append(worlds, w)
	}
	sort.Slice(worlds, func(i, j int) bool { return worlds[i].LastPlayed.After(worlds[j].LastPlayed) })
	return worlds, nil
}

// ExportWorld zips saves/<folder> into dst.
func ExportWorld(gameDir, folder, dst string) error {
	src := filepath.Join(gameDir, "saves", filepath.Base(folder))
	if _, err := os.Stat(filepath.Join(src, "level.dat")); err != nil {
		return errors.New("world not found")
	}
	return zipDir(src, dst, filepath.Base(folder))
}

// ListFiles lists entries of a game sub-folder, newest first. When exts is
// given only files with those extensions (or folders) are returned.
func ListFiles(gameDir, sub string, exts ...string) ([]FileEntry, error) {
	entries, err := os.ReadDir(filepath.Join(gameDir, sub))
	if err != nil {
		if errors.Is(err, fs.ErrNotExist) {
			return []FileEntry{}, nil
		}
		return nil, err
	}
	out := []FileEntry{}
	for _, e := range entries {
		if strings.HasPrefix(e.Name(), ".") {
			continue
		}
		if !e.IsDir() && len(exts) > 0 && !hasExt(e.Name(), exts) {
			continue
		}
		info, err := e.Info()
		if err != nil {
			continue
		}
		fe := FileEntry{Name: e.Name(), ModTime: info.ModTime(), IsDir: e.IsDir(), SizeBytes: info.Size()}
		if e.IsDir() {
			fe.SizeBytes = dirSize(filepath.Join(gameDir, sub, e.Name()))
		}
		out = append(out, fe)
	}
	sort.Slice(out, func(i, j int) bool { return out[i].ModTime.After(out[j].ModTime) })
	return out, nil
}

// CopyOut copies <gameDir>/<sub>/<name> to dst (used for screenshots).
func CopyOut(gameDir, sub, name, dst string) error {
	return copyFile(filepath.Join(gameDir, sub, filepath.Base(name)), dst)
}

// AddResourcePack validates and copies a .zip (or folder) into resourcepacks/.
func AddResourcePack(gameDir, src string) (FileEntry, error) {
	st, err := os.Stat(src)
	if err != nil {
		return FileEntry{}, err
	}
	name := filepath.Base(src)
	dst := filepath.Join(gameDir, "resourcepacks", name)
	if st.IsDir() {
		if _, err := os.Stat(filepath.Join(src, "pack.mcmeta")); err != nil {
			return FileEntry{}, errors.New("that folder is not a resource pack (no pack.mcmeta)")
		}
		if err := copyDir(src, dst); err != nil {
			return FileEntry{}, err
		}
	} else {
		if !strings.EqualFold(filepath.Ext(name), ".zip") {
			return FileEntry{}, errors.New("resource packs must be .zip files")
		}
		if !zipHas(src, "pack.mcmeta") {
			return FileEntry{}, errors.New("that zip is not a resource pack (no pack.mcmeta inside)")
		}
		if err := copyFile(src, dst); err != nil {
			return FileEntry{}, err
		}
	}
	info, _ := os.Stat(dst)
	return FileEntry{Name: name, SizeBytes: info.Size(), ModTime: info.ModTime(), IsDir: info.IsDir()}, nil
}

// Remove deletes <gameDir>/<sub>/<name>.
func Remove(gameDir, sub, name string) error {
	return os.RemoveAll(filepath.Join(gameDir, sub, filepath.Base(name)))
}

func hasExt(name string, exts []string) bool {
	for _, e := range exts {
		if strings.HasSuffix(strings.ToLower(name), e) {
			return true
		}
	}
	return false
}

func zipHas(path, entry string) bool {
	r, err := zip.OpenReader(path)
	if err != nil {
		return false
	}
	defer r.Close()
	for _, f := range r.File {
		if f.Name == entry {
			return true
		}
	}
	return false
}

func dirSize(dir string) int64 {
	var n int64
	_ = filepath.WalkDir(dir, func(_ string, d fs.DirEntry, err error) error {
		if err == nil && !d.IsDir() {
			if info, err := d.Info(); err == nil {
				n += info.Size()
			}
		}
		return nil
	})
	return n
}

func zipDir(src, dst, prefix string) error {
	out, err := os.Create(dst)
	if err != nil {
		return err
	}
	zw := zip.NewWriter(out)
	err = filepath.WalkDir(src, func(path string, d fs.DirEntry, err error) error {
		if err != nil {
			return err
		}
		rel, _ := filepath.Rel(src, path)
		if rel == "." {
			return nil
		}
		name := filepath.ToSlash(filepath.Join(prefix, rel))
		if d.IsDir() {
			_, err := zw.Create(name + "/")
			return err
		}
		info, err := d.Info()
		if err != nil {
			return err
		}
		hdr, err := zip.FileInfoHeader(info)
		if err != nil {
			return err
		}
		hdr.Name = name
		hdr.Method = zip.Deflate
		w, err := zw.CreateHeader(hdr)
		if err != nil {
			return err
		}
		f, err := os.Open(path)
		if err != nil {
			return err
		}
		defer f.Close()
		_, err = io.Copy(w, f)
		return err
	})
	if cerr := zw.Close(); err == nil {
		err = cerr
	}
	if cerr := out.Close(); err == nil {
		err = cerr
	}
	if err != nil {
		os.Remove(dst)
	}
	return err
}

func copyFile(src, dst string) error {
	in, err := os.Open(src)
	if err != nil {
		return err
	}
	defer in.Close()
	if err := os.MkdirAll(filepath.Dir(dst), 0o755); err != nil {
		return err
	}
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

func copyDir(src, dst string) error {
	return filepath.WalkDir(src, func(path string, d fs.DirEntry, err error) error {
		if err != nil {
			return err
		}
		rel, _ := filepath.Rel(src, path)
		target := filepath.Join(dst, rel)
		if d.IsDir() {
			return os.MkdirAll(target, 0o755)
		}
		return copyFile(path, target)
	})
}
