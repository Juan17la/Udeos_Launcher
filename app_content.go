package main

import (
	"errors"
	"net/http"
	"os"
	"path/filepath"
	"strings"

	wailsrt "github.com/wailsapp/wails/v2/pkg/runtime"

	"udeos/launcher/internal/content"
	"udeos/launcher/internal/modinstall"
	"udeos/launcher/internal/sysopen"
)

// EventFilesDropped carries the paths of files dropped onto the window.
const EventFilesDropped = "files:dropped"

func (a *App) gameDir(id string) (string, error) {
	if _, err := a.launcher.Instances.Get(id); err != nil {
		return "", err
	}
	return a.launcher.Dirs.GameDir(id), nil
}

// list, pick, remove and saveAs are the bodies every content kind shares;
// the exported methods below exist because Wails binds one JS function per
// exported method.
func (a *App) list(id, sub, ext string) ([]content.FileEntry, error) {
	dir, err := a.gameDir(id)
	if err != nil {
		return nil, err
	}
	return content.ListFiles(dir, sub, ext)
}

// pick opens a file chooser; "" means the player cancelled.
func (a *App) pick(title, pattern, label string) (string, error) {
	return wailsrt.OpenFileDialog(a.ctx, wailsrt.OpenDialogOptions{
		Title:   title,
		Filters: []wailsrt.FileFilter{{DisplayName: label + " (" + pattern + ")", Pattern: pattern}},
	})
}

// saveAs asks where to save; "" means the player cancelled.
func (a *App) saveAs(title, name, pattern, label string) (string, error) {
	return wailsrt.SaveFileDialog(a.ctx, wailsrt.SaveDialogOptions{
		Title:           title,
		DefaultFilename: filepath.Base(name),
		Filters:         []wailsrt.FileFilter{{DisplayName: label + " (" + pattern + ")", Pattern: pattern}},
	})
}

// remove deletes a file from a game sub-folder and drops it from content.json.
func (a *App) remove(id, sub, name string) error {
	dir, err := a.gameDir(id)
	if err != nil {
		return err
	}
	if err := content.Remove(dir, sub, name); err != nil {
		return err
	}
	return modinstall.Forget(a.launcher.Dirs.ContentFile(id), sub, name)
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
	dst, err := a.saveAs("Save world", folder+".zip", "*.zip", "Zip archive")
	if err != nil || dst == "" {
		return "", err
	}
	if !strings.HasSuffix(strings.ToLower(dst), ".zip") {
		dst += ".zip"
	}
	return dst, content.ExportWorld(dir, folder, dst)
}

// AddWorld imports a world folder or .zip into saves/.
func (a *App) AddWorld(id, path string) (content.World, error) {
	dir, err := a.gameDir(id)
	if err != nil {
		return content.World{}, err
	}
	return content.AddWorld(dir, path)
}

// PickWorld opens a file chooser for a world .zip and imports it. Returns an
// empty folder name when cancelled. Folders can be dragged onto the window.
func (a *App) PickWorld(id string) (content.World, error) {
	path, err := a.pick("Choose a world", "*.zip", "World archive")
	if err != nil || path == "" {
		return content.World{}, err
	}
	return a.AddWorld(id, path)
}

// RemoveWorld deletes a world from the instance.
func (a *App) RemoveWorld(id, folder string) error {
	dir, err := a.gameDir(id)
	if err != nil {
		return err
	}
	return content.RemoveWorld(dir, folder)
}

// ListScreenshots returns the PNG files in screenshots/. The UI shows them via /media/.
func (a *App) ListScreenshots(id string) ([]content.FileEntry, error) {
	return a.list(id, "screenshots", ".png")
}

// ExportScreenshot copies a screenshot to a location the player picks.
func (a *App) ExportScreenshot(id, name string) (string, error) {
	dir, err := a.gameDir(id)
	if err != nil {
		return "", err
	}
	dst, err := a.saveAs("Save screenshot", name, "*.png", "PNG image")
	if err != nil || dst == "" {
		return "", err
	}
	return dst, content.CopyOut(dir, "screenshots", name, dst)
}

// ListResourcePacks lists resourcepacks/ (zip files and folders).
func (a *App) ListResourcePacks(id string) ([]content.FileEntry, error) {
	return a.list(id, "resourcepacks", ".zip")
}

// ListMods lists the .jar files in mods/.
func (a *App) ListMods(id string) ([]content.FileEntry, error) { return a.list(id, "mods", ".jar") }

// ListShaders lists shaderpacks/.
func (a *App) ListShaders(id string) ([]content.FileEntry, error) {
	return a.list(id, "shaderpacks", ".zip")
}

// AddMod copies a .jar into mods/ after checking it is a mod for the
// instance's loader.
func (a *App) AddMod(id, path string) (content.FileEntry, error) {
	inst, err := a.launcher.Instances.Get(id)
	if err != nil {
		return content.FileEntry{}, err
	}
	return content.AddMod(a.launcher.Dirs.GameDir(id), path, inst.Loader)
}

// AddShader copies a shader pack (.zip or folder) into shaderpacks/.
func (a *App) AddShader(id, path string) (content.FileEntry, error) {
	dir, err := a.gameDir(id)
	if err != nil {
		return content.FileEntry{}, err
	}
	return content.AddShaderPack(dir, path)
}

// AddResourcePack copies a local .zip/folder into the instance after checking it is a pack.
func (a *App) AddResourcePack(id, path string) (content.FileEntry, error) {
	dir, err := a.gameDir(id)
	if err != nil {
		return content.FileEntry{}, err
	}
	return content.AddResourcePack(dir, path)
}

// PickMod, PickShader and PickResourcePack open a file chooser and add the
// selected file. They return an empty name when cancelled.
func (a *App) PickMod(id string) (content.FileEntry, error) {
	return a.pickAndAdd(id, "Choose a mod", "*.jar", "Mod", a.AddMod)
}

func (a *App) PickShader(id string) (content.FileEntry, error) {
	return a.pickAndAdd(id, "Choose a shader pack", "*.zip", "Shader pack", a.AddShader)
}

func (a *App) PickResourcePack(id string) (content.FileEntry, error) {
	return a.pickAndAdd(id, "Choose a resource pack", "*.zip", "Resource pack", a.AddResourcePack)
}

func (a *App) pickAndAdd(id, title, pattern, label string, add func(id, path string) (content.FileEntry, error)) (content.FileEntry, error) {
	path, err := a.pick(title, pattern, label)
	if err != nil || path == "" {
		return content.FileEntry{}, err
	}
	return add(id, path)
}

// RemoveMod, RemoveShader and RemoveResourcePack delete a file from the instance.
func (a *App) RemoveMod(id, name string) error    { return a.remove(id, "mods", name) }
func (a *App) RemoveShader(id, name string) error { return a.remove(id, "shaderpacks", name) }
func (a *App) RemoveResourcePack(id, name string) error {
	return a.remove(id, "resourcepacks", name)
}

// openableSubdirs are the game sub-folders the UI may ask to open.
var openableSubdirs = map[string]bool{"": true, "saves": true, "screenshots": true, "resourcepacks": true, "mods": true, "shaderpacks": true, "logs": true}

// OpenInstanceFolder shows the game directory (or one of its sub-folders,
// e.g. "screenshots" or "logs") in the system file manager.
func (a *App) OpenInstanceFolder(id, sub string) error {
	dir, err := a.gameDir(id)
	if err != nil {
		return err
	}
	if !openableSubdirs[sub] {
		return errors.New("unknown folder " + sub)
	}
	dir = filepath.Join(dir, sub)
	if err := os.MkdirAll(dir, 0o755); err != nil {
		return err
	}
	return sysopen.Dir(dir)
}

// mediaHandler serves /media/<instance>/screenshots/<file> (screenshot
// thumbnails) and /media/<instance>/icon (the icon of an instance made from
// a modpack) from disk, so the UI shows them without embedding base64.
func (a *App) mediaHandler(w http.ResponseWriter, r *http.Request) {
	parts := strings.Split(strings.TrimPrefix(r.URL.Path, "/media/"), "/")
	if a.launcher == nil || len(parts) < 2 {
		http.NotFound(w, r)
		return
	}
	dir, err := a.gameDir(filepath.Base(parts[0]))
	if err != nil {
		http.NotFound(w, r)
		return
	}
	var path string
	switch {
	case len(parts) == 2 && parts[1] == "icon":
		path = filepath.Join(a.launcher.Dirs.InstanceDir(filepath.Base(parts[0])), "icon")
	case len(parts) == 3 && parts[1] == "screenshots" && strings.HasSuffix(strings.ToLower(parts[2]), ".png"):
		path = filepath.Join(dir, "screenshots", filepath.Base(parts[2]))
	default:
		http.NotFound(w, r)
		return
	}
	if st, err := os.Stat(path); err != nil || st.IsDir() {
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
