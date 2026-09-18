// Package modinstall adds content from the search provider (Modrinth) to an
// instance: it works out which version fits the instance, which dependencies
// come along, refuses known incompatibilities, downloads the files and hands
// them to the same validators the drag-and-drop path uses. What it installed
// is remembered in instances/<id>/content.json so "already added" and
// incompatibility checks have something to look at.
package modinstall

import (
	"encoding/json"
	"errors"
	"os"
	"path/filepath"
	"slices"
	"sync"
)

// Entry is one file the launcher installed from the provider.
type Entry struct {
	ProjectID     string   `json:"projectId"`
	VersionID     string   `json:"versionId"`
	Title         string   `json:"title"`
	VersionNumber string   `json:"versionNumber"`
	Type          string   `json:"type"` // mod | resourcepack | shader
	File          string   `json:"file"` // file name inside mods/, resourcepacks/ or shaderpacks/
	SHA1          string   `json:"sha1"`
	Incompatible  []string `json:"incompatible,omitempty"` // project ids this version declares incompatible
	RequiredBy    string   `json:"requiredBy,omitempty"`   // project id it was pulled in for; "" = the player asked for it
	Description   string   `json:"description,omitempty"`  // the provider's one-liner, for the content list's card view
	IconURL       string   `json:"iconUrl,omitempty"`
}

// manifestMu serialises writes to content.json files; adds are rare and short.
var manifestMu sync.Mutex

// Load reads a manifest; a missing file is an empty list.
func Load(path string) ([]Entry, error) {
	raw, err := os.ReadFile(path)
	if err != nil {
		if errors.Is(err, os.ErrNotExist) {
			return []Entry{}, nil
		}
		return nil, err
	}
	var entries []Entry
	if err := json.Unmarshal(raw, &entries); err != nil {
		return nil, err
	}
	if entries == nil {
		entries = []Entry{}
	}
	return entries, nil
}

func save(path string, entries []Entry) error {
	raw, err := json.MarshalIndent(entries, "", "  ")
	if err != nil {
		return err
	}
	if err := os.MkdirAll(filepath.Dir(path), 0o755); err != nil {
		return err
	}
	return os.WriteFile(path, raw, 0o644)
}

// Append records entries in the manifest, replacing any older entry for the
// same project.
func Append(path string, entries []Entry) error {
	manifestMu.Lock()
	defer manifestMu.Unlock()
	have, err := Load(path)
	if err != nil {
		return err
	}
	for _, e := range entries {
		have = slices.DeleteFunc(have, func(h Entry) bool { return h.ProjectID != "" && h.ProjectID == e.ProjectID })
		have = append(have, e)
	}
	return save(path, have)
}

// Forget drops the entry for a file the player removed from the instance.
// Unknown files (added by hand) are a no-op.
func Forget(path, sub, fileName string) error {
	manifestMu.Lock()
	defer manifestMu.Unlock()
	have, err := Load(path)
	if err != nil {
		return err
	}
	kept := slices.DeleteFunc(have, func(h Entry) bool { return h.File == fileName && typeSubdir(h.Type) == sub })
	if len(kept) == len(have) {
		return nil
	}
	return save(path, kept)
}

// typeSubdir maps a content type onto the game sub-folder it lives in.
func typeSubdir(t string) string {
	switch t {
	case "mod":
		return "mods"
	case "resourcepack":
		return "resourcepacks"
	case "shader":
		return "shaderpacks"
	}
	return ""
}
