package main

import (
	"errors"
	"os"
	"slices"

	"udeos/launcher/internal/profile"
)

// ProfileState is the profile plus whether one exists yet (first run → login screen).
type ProfileState struct {
	Exists  bool            `json:"exists"`
	Profile profile.Profile `json:"profile"`
}

// GetProfile returns the local player, or Exists=false before the first login.
func (a *App) GetProfile() (ProfileState, error) {
	p, err := a.launcher.Profile()
	if errors.Is(err, os.ErrNotExist) {
		p.Language, p.Theme, p.MaxMemoryMB = "en", "light", profile.DefaultMaxMemoryMB
		return ProfileState{Exists: false, Profile: p}, nil
	}
	if err != nil {
		return ProfileState{}, err
	}
	return ProfileState{Exists: true, Profile: p}, nil
}

// SaveProfile stores nickname, preferences and consent. The UUID is derived.
// Instances of a profile that was removed move to the active one.
func (a *App) SaveProfile(p profile.Profile) (profile.Profile, error) {
	if !p.Agreed {
		return p, errors.New("you must accept the Privacy Policy and Terms of Use")
	}
	old, _ := a.launcher.Profile() // none yet on first login
	saved, err := a.launcher.SaveProfile(p)
	if err != nil {
		return saved, err
	}
	var removed []string
	for _, n := range old.Nicknames {
		if !slices.Contains(saved.Nicknames, n) {
			removed = append(removed, n)
		}
	}
	if len(removed) > 0 {
		err = a.launcher.Instances.Adopt(saved.Nickname, removed...)
	}
	return saved, err
}
