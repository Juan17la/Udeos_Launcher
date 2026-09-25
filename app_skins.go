package main

import (
	_ "embed"
	"encoding/base64"
	"errors"
	"os"
	"path/filepath"
	"strings"

	"udeos/launcher/internal/skin"
)

// defaultSkin is the default skin (Steve) from the frontend's assets: the
// Skins page shows it, and the game gets the same picture.
//
//go:embed frontend/src/assets/default_skin.png
var defaultSkin []byte

// SkinView is a library skin with its picture (base64 PNG, 64×64).
type SkinView struct {
	skin.Skin
	PNG string `json:"png"`
}

// SkinLibrary is every saved skin, newest first, and the skin each launcher
// profile wears (nickname → skin id; a missing nickname wears the default, Steve).
type SkinLibrary struct {
	Skins    []SkinView        `json:"skins"`
	Equipped map[string]string `json:"equipped"`
}

// ListSkins returns the skin library.
func (a *App) ListSkins() SkinLibrary {
	skins, equipped := a.launcher.Skins.List()
	out := SkinLibrary{Skins: []SkinView{}, Equipped: equipped}
	for _, s := range skins {
		if pic, err := a.launcher.Skins.PNG(s.ID); err == nil {
			out.Skins = append(out.Skins, SkinView{s, base64.StdEncoding.EncodeToString(pic)})
		}
	}
	return out
}

// SaveSkin adds a skin (id "") or changes one: its name, its model
// (classic | slim) and its picture, a 64×64 PNG in base64.
func (a *App) SaveSkin(id, name, model, pngBase64 string) (SkinView, error) {
	raw, err := base64.StdEncoding.DecodeString(pngBase64)
	if err != nil {
		return SkinView{}, errors.New("a skin must be a 64×64 or 64×32 PNG image")
	}
	s, err := a.launcher.Skins.Save(id, name, model, raw)
	if err != nil {
		return SkinView{}, err
	}
	pic, err := a.launcher.Skins.PNG(s.ID)
	return SkinView{s, base64.StdEncoding.EncodeToString(pic)}, err
}

// DeleteSkin removes a skin; profiles that wore it get the default back.
func (a *App) DeleteSkin(id string) error { return a.launcher.Skins.Delete(id) }

// EquipSkin makes the active profile wear the skin in every one of its
// instances from the next Play ("" = the default skin, Steve).
func (a *App) EquipSkin(id string) error {
	p, err := a.launcher.Profile()
	if err != nil {
		return err
	}
	return a.launcher.Skins.Equip(p.Nickname, id)
}

// SkinFile is a skin file read from disk, checked and converted to 64×64,
// for the "Add skin" dialog; nothing is saved yet.
type SkinFile struct {
	Name  string `json:"name"`  // the file name without .png
	Model string `json:"model"` // the arm width its pixels suggest
	PNG   string `json:"png"`
}

// ReadSkinFile checks a dropped skin file.
func (a *App) ReadSkinFile(path string) (SkinFile, error) {
	if st, err := os.Stat(path); err != nil || st.Size() > 1<<20 {
		return SkinFile{}, errors.New("a skin must be a 64×64 or 64×32 PNG image")
	}
	raw, err := os.ReadFile(path)
	if err != nil {
		return SkinFile{}, err
	}
	pic, model, err := skin.Normalize(raw)
	if err != nil {
		return SkinFile{}, err
	}
	name := []rune(strings.TrimSpace(strings.TrimSuffix(filepath.Base(path), filepath.Ext(path))))
	if len(name) > skin.MaxName {
		name = name[:skin.MaxName]
	}
	return SkinFile{Name: string(name), Model: model, PNG: base64.StdEncoding.EncodeToString(pic)}, nil
}

// PickSkinFile opens a file chooser for a skin; an empty PNG means cancelled.
func (a *App) PickSkinFile() (SkinFile, error) {
	path, err := a.pick("Choose a skin", "*.png", "Skins")
	if err != nil || path == "" {
		return SkinFile{}, err
	}
	return a.ReadSkinFile(path)
}
