package main

import (
	"errors"
	"os"
	"path/filepath"

	"udeos/launcher/internal/content"
	"udeos/launcher/internal/instance"
	"udeos/launcher/internal/modinstall"
	"udeos/launcher/internal/server"
)

// worldRel is the folder a datapack goes into, relative to the game folder and
// slash-separated (modinstall.Entry.World): a server has one world, its level-name
// (it need not exist yet, the server makes it on its first start); a game
// instance needs one of its saved worlds, picked by its folder name.
func (a *App) worldRel(inst instance.Instance, folder string) (string, error) {
	dir := a.launcher.Dirs.GameDir(inst.ID)
	if inst.Server {
		props, _ := server.ReadProperties(dir)
		name := props["level-name"]
		if name == "" {
			name = "world"
		}
		folder = name
	} else if folder == "" {
		return "", errors.New("pick a world first")
	}
	if folder != filepath.Base(folder) || folder == "." || folder == ".." {
		return "", errors.New("that is not a world")
	}
	if inst.Server {
		return folder, nil
	}
	if _, err := os.Stat(filepath.Join(dir, "saves", folder)); err != nil {
		return "", errors.New("that world does not exist")
	}
	return "saves/" + folder, nil
}

// datapackDir resolves the instance, its game folder and the world's datapacks/ folder.
func (a *App) datapackDir(id, world string) (gameDir, sub string, err error) {
	inst, err := a.launcher.Instances.Get(id)
	if err != nil {
		return "", "", err
	}
	rel, err := a.worldRel(inst, world)
	if err != nil {
		return "", "", err
	}
	return a.launcher.Dirs.GameDir(id), rel + "/datapacks", nil
}

// ListDatapacks lists the datapacks (zips and folders) in a world. world is the
// saves/ folder name; a server ignores it (it has one world).
func (a *App) ListDatapacks(id, world string) ([]content.FileEntry, error) {
	dir, sub, err := a.datapackDir(id, world)
	if err != nil {
		return nil, err
	}
	return content.ListFiles(dir, sub, ".zip")
}

// AddDatapack copies a datapack (.zip or folder with pack.mcmeta) into a world.
func (a *App) AddDatapack(id, world, path string) (content.FileEntry, error) {
	dir, sub, err := a.datapackDir(id, world)
	if err != nil {
		return content.FileEntry{}, err
	}
	return content.AddDatapack(dir, sub, path)
}

// PickDatapack opens a file chooser and adds the datapack; "" name when cancelled.
func (a *App) PickDatapack(id, world string) (content.FileEntry, error) {
	path, err := a.pick("Choose a datapack", "*.zip", "Datapack")
	if err != nil || path == "" {
		return content.FileEntry{}, err
	}
	return a.AddDatapack(id, world, path)
}

// RemoveDatapack deletes a datapack from a world and forgets it in content.json.
func (a *App) RemoveDatapack(id, world, name string) error {
	dir, sub, err := a.datapackDir(id, world)
	if err != nil {
		return err
	}
	if err := content.Remove(dir, sub, name); err != nil {
		return err
	}
	return modinstall.Forget(a.launcher.Dirs.ContentFile(id), sub, name)
}
