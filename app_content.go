package main

import (
	"net/http"
	"os"
	"path/filepath"
	"strings"

	wailsrt "github.com/wailsapp/wails/v2/pkg/runtime"

	"udeos/launcher/internal/content"
)

// EventFilesDropped carries the paths of files dropped onto the window.
const EventFilesDropped = "files:dropped"

func (a *App) gameDir(id string) (string, error) {
	if _, err := a.launcher.Instances.Get(id); err != nil {
		return "", err
	}
	return a.launcher.Dirs.GameDir(id), nil
}

// ListWorlds returns the instance's saved worlds.
func (a *App) ListWorlds(id string) ([]content.World, error) {
	dir, err := a.gameDir(id)
	if err != nil {
		return nil, err
	}
	return content.ListWorlds(dir)
}

// ExportWorld asks where to save and writes the world as a zip. Returns the
// chosen path, or "" when the player cancelled.
func (a *App) ExportWorld(id, folder string) (string, error) {
	dir, err := a.gameDir(id)
	if err != nil {
		return "", err
	}
	dst, err := wailsrt.SaveFileDialog(a.ctx, wailsrt.SaveDialogOptions{
		Title:           "Save world",
		DefaultFilename: filepath.Base(folder) + ".zip",
		Filters:         []wailsrt.FileFilter{{DisplayName: "Zip archive (*.zip)", Pattern: "*.zip"}},
	})
	if err != nil || dst == "" {
		return "", err
	}
	if !strings.HasSuffix(strings.ToLower(dst), ".zip") {
		dst += ".zip"
	}
	return dst, content.ExportWorld(dir, folder, dst)
}

// ListScreenshots returns the PNG files in screenshots/. The UI shows them via /media/.
func (a *App) ListScreenshots(id string) ([]content.FileEntry, error) {
	dir, err := a.gameDir(id)
	if err != nil {
		return nil, err
	}
	return content.ListFiles(dir, "screenshots", ".png")
}

// ExportScreenshot copies a screenshot to a location the player picks.
func (a *App) ExportScreenshot(id, name string) (string, error) {
	dir, err := a.gameDir(id)
	if err != nil {
		return "", err
	}
	dst, err := wailsrt.SaveFileDialog(a.ctx, wailsrt.SaveDialogOptions{
		Title:           "Save screenshot",
		DefaultFilename: filepath.Base(name),
		Filters:         []wailsrt.FileFilter{{DisplayName: "PNG image (*.png)", Pattern: "*.png"}},
	})
	if err != nil || dst == "" {
		return "", err
	}
	return dst, content.CopyOut(dir, "screenshots", name, dst)
}

// ListResourcePacks lists resourcepacks/ (zip files and folders).
func (a *App) ListResourcePacks(id string) ([]content.FileEntry, error) {
	dir, err := a.gameDir(id)
	if err != nil {
		return nil, err
	}
	return content.ListFiles(dir, "resourcepacks", ".zip")
}

// ListMods lists mods/ (read-only until mod loaders are supported).
func (a *App) ListMods(id string) ([]content.FileEntry, error) {
	dir, err := a.gameDir(id)
	if err != nil {
		return nil, err
	}
	return content.ListFiles(dir, "mods", ".jar")
}

// ListShaders lists shaderpacks/.
func (a *App) ListShaders(id string) ([]content.FileEntry, error) {
	dir, err := a.gameDir(id)
	if err != nil {
		return nil, err
	}
	return content.ListFiles(dir, "shaderpacks", ".zip")
}

// AddResourcePack copies a local .zip/folder into the instance after checking it is a pack.
func (a *App) AddResourcePack(id, path string) (content.FileEntry, error) {
	dir, err := a.gameDir(id)
	if err != nil {
		return content.FileEntry{}, err
	}
	return content.AddResourcePack(dir, path)
}

// PickResourcePack opens a file chooser and adds the selected pack. Returns
// the entry, or an empty name when cancelled.
func (a *App) PickResourcePack(id string) (content.FileEntry, error) {
	path, err := wailsrt.OpenFileDialog(a.ctx, wailsrt.OpenDialogOptions{
		Title:   "Choose a resource pack",
		Filters: []wailsrt.FileFilter{{DisplayName: "Resource pack (*.zip)", Pattern: "*.zip"}},
	})
	if err != nil || path == "" {
		return content.FileEntry{}, err
	}
	return a.AddResourcePack(id, path)
}

// RemoveResourcePack deletes a pack from the instance.
func (a *App) RemoveResourcePack(id, name string) error {
	dir, err := a.gameDir(id)
	if err != nil {
		return err
	}
	return content.Remove(dir, "resourcepacks", name)
}

// OpenInstanceFolder shows the game directory in the system file manager.
func (a *App) OpenInstanceFolder(id string) error {
	dir, err := a.gameDir(id)
	if err != nil {
		return err
	}
	wailsrt.BrowserOpenURL(a.ctx, "file://"+filepath.ToSlash(dir))
	return nil
}

// mediaHandler serves /media/<instance>/screenshots/<file> from disk so the
// UI can show screenshot thumbnails without embedding them as base64.
func (a *App) mediaHandler(w http.ResponseWriter, r *http.Request) {
	parts := strings.Split(strings.TrimPrefix(r.URL.Path, "/media/"), "/")
	if a.launcher == nil || len(parts) != 3 || parts[1] != "screenshots" {
		http.NotFound(w, r)
		return
	}
	dir, err := a.gameDir(filepath.Base(parts[0]))
	if err != nil {
		http.NotFound(w, r)
		return
	}
	path := filepath.Join(dir, "screenshots", filepath.Base(parts[2]))
	if st, err := os.Stat(path); err != nil || st.IsDir() || !strings.HasSuffix(strings.ToLower(path), ".png") {
		http.NotFound(w, r)
		return
	}
	w.Header().Set("Cache-Control", "no-cache")
	http.ServeFile(w, r, path)
}

// onFileDrop forwards dropped files to the UI, which decides what to do with
// them depending on the open tab.
func (a *App) onFileDrop(_, _ int, paths []string) {
	if len(paths) == 0 {
		return
	}
	wailsrt.EventsEmit(a.ctx, EventFilesDropped, paths)
}
