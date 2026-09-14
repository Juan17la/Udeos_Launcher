package main

import (
	"strings"

	"udeos/launcher/internal/modsearch"
)

// SearchContent browses one content type (mod, resourcepack, shader,
// modpack) from Modrinth, optionally filtered by Minecraft version and mod
// loader. Results are cached so the search page keeps working offline.
func (a *App) SearchContent(projectType, text, gameVersion, ldr string, offset, limit int) (modsearch.Page, error) {
	q := modsearch.Query{
		Type:        modsearch.ProjectType(projectType),
		Text:        text,
		GameVersion: gameVersion,
		Loader:      strings.ToLower(ldr),
		Offset:      offset,
		Limit:       limit,
	}
	return a.launcher.Search.Search(a.ctx, q)
}

// ListSearchGameVersions returns the Minecraft release versions Modrinth has
// content for, to populate the search page's version filter. Modrinth lists
// every snapshot too (~900 entries); the filter has no snapshot toggle, so
// only releases (~100) cross the bridge and become <option>s.
func (a *App) ListSearchGameVersions() ([]modsearch.GameVersion, error) {
	all, err := a.launcher.Search.GameVersions(a.ctx)
	if err != nil {
		return nil, err
	}
	out := make([]modsearch.GameVersion, 0, len(all)/8)
	for _, v := range all {
		if v.Type == "release" {
			out = append(out, v)
		}
	}
	return out, nil
}
