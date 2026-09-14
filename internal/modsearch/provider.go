// Package modsearch browses content (mods, resource packs, shader packs and
// modpacks) from a marketplace. It is read-only: it does not install
// anything or check compatibility with an instance, only lists what exists.
// Modrinth is the only provider today; Provider is kept narrow so another
// marketplace (e.g. CurseForge) can be added later without touching the
// frontend or the Wails-bound methods in app_search.go.
package modsearch

import "context"

// ProjectType is the kind of content a query asks for.
type ProjectType string

const (
	TypeMod          ProjectType = "mod"
	TypeResourcePack ProjectType = "resourcepack"
	TypeShader       ProjectType = "shader"
	TypeModpack      ProjectType = "modpack"
)

// Query is provider-agnostic search input.
type Query struct {
	Type        ProjectType
	GameVersion string // "" = any
	Loader      string // "fabric" | "forge" | "quilt" | "neoforge"; "" = any
	Text        string // free-text query; "" = browse, most relevant/downloaded first
	Offset      int
	Limit       int
}

// Result is one project shown in the search grid. It carries only what the
// browsing UI displays; the full project (description, gallery, version and
// file list) is fetched separately, once, when the player actually adds it.
type Result struct {
	ID          string      `json:"id"`
	Slug        string      `json:"slug"`
	Title       string      `json:"title"`
	Author      string      `json:"author"`
	Description string      `json:"description"`
	IconURL     string      `json:"iconUrl"`
	Downloads   int64       `json:"downloads"`
	ProjectType ProjectType `json:"projectType"`
	Loaders     []string    `json:"loaders"`
}

// Page is one page of results.
type Page struct {
	Results []Result `json:"results"`
	Total   int      `json:"total"`
	Offset  int      `json:"offset"`
}

// GameVersion is one entry from the provider's Minecraft version list, used
// to populate the search page's version filter. Type mirrors the vocabulary
// Mojang's own manifest uses ("release", "snapshot", "old_beta", "old_alpha").
type GameVersion struct {
	Version string `json:"version"`
	Type    string `json:"type"`
}

// Provider is implemented once per marketplace. It stays narrow on purpose:
// when an "add to instance" flow exists, it should gain its own method (e.g.
// Details(ctx, id) for the full project + version/file list) fetched once at
// click time, rather than Search growing to carry that for every result.
type Provider interface {
	Name() string
	Search(ctx context.Context, q Query) (Page, error)
	GameVersions(ctx context.Context) ([]GameVersion, error)
}
