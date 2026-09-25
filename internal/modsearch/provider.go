// Package modsearch browses content (mods, resource packs, shader packs and
// modpacks) from a marketplace. It is read-only: it lists what exists and
// describes a project's downloadable versions; installing into an instance
// and checking compatibility live in internal/modinstall. Modrinth is the
// only provider today; Provider is kept narrow so another marketplace (e.g.
// CurseForge) can be added later without touching the frontend or the
// Wails-bound methods in app_search.go.
package modsearch

import (
	"context"
	"slices"
	"sort"
	"strings"
	"time"
)

// ProjectType is the kind of content a query asks for.
type ProjectType string

const (
	TypeMod          ProjectType = "mod"
	TypeResourcePack ProjectType = "resourcepack"
	TypeShader       ProjectType = "shader"
	TypeModpack      ProjectType = "modpack"
)

// LoaderNames are the provider loader tags an instance's loader accepts: Quilt
// loads Fabric mods, so a Quilt instance searches and installs both.
func LoaderNames(ldr string) []string {
	ldr = strings.ToLower(ldr)
	if ldr == "quilt" {
		return []string{"quilt", "fabric"}
	}
	return []string{ldr}
}

// LoaderMatches reports whether a version published for `loaders` runs on an
// instance whose loader is ldr ("" = anything).
func LoaderMatches(loaders []string, ldr string) bool {
	if ldr == "" {
		return true
	}
	for _, want := range LoaderNames(ldr) {
		if slices.ContainsFunc(loaders, func(l string) bool { return strings.EqualFold(l, want) }) {
			return true
		}
	}
	return false
}

// Query is provider-agnostic search input.
type Query struct {
	Type        ProjectType
	GameVersion string // "" = any
	Loader      string // "fabric" | "forge" | "quilt" | "neoforge"; "" = any
	Text        string // free-text query; "" = browse, most relevant/downloaded first
	Index       string // sort order: "" = relevance, else "downloads" | "newest" | "updated"
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
	// GameVersions: the Minecraft releases it has builds for, oldest first (no snapshots).
	GameVersions []string `json:"gameVersions"`
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

// Version is one downloadable release of a project: which Minecraft versions
// and loaders it runs on, its files and what it depends on. Fetched only when
// the player adds the project to an instance, never while browsing.
type Version struct {
	ID            string       `json:"id"`
	ProjectID     string       `json:"projectId"`
	Name          string       `json:"name"`
	VersionNumber string       `json:"versionNumber"`
	GameVersions  []string     `json:"gameVersions"`
	Loaders       []string     `json:"loaders"`
	Type          string       `json:"type"` // release | beta | alpha
	DatePublished time.Time    `json:"datePublished"`
	Files         []File       `json:"files"`
	Dependencies  []Dependency `json:"dependencies"`
}

// File is one downloadable artifact of a Version.
type File struct {
	URL      string `json:"url"`
	Filename string `json:"filename"`
	SHA1     string `json:"sha1"`
	SHA512   string `json:"sha512"`
	Size     int64  `json:"size"`
	Primary  bool   `json:"primary"`
}

// Dependency types as Modrinth names them.
const (
	DepRequired     = "required"
	DepOptional     = "optional"
	DepIncompatible = "incompatible"
	DepEmbedded     = "embedded"
)

// Dependency links a Version to another project (or a specific version of it).
// Either ProjectID or VersionID may be empty, never both.
type Dependency struct {
	ProjectID string `json:"projectId"`
	VersionID string `json:"versionId"`
	Type      string `json:"type"`
}

// ProjectInfo is the little a plan needs to name a dependency, plus the icon
// and one-line description the instance's content list shows afterwards.
type ProjectInfo struct {
	ID          string      `json:"id"`
	Slug        string      `json:"slug"`
	Title       string      `json:"title"`
	ProjectType ProjectType `json:"projectType"`
	Description string      `json:"description"`
	IconURL     string      `json:"iconUrl"`
}

// ProjectDetail is the whole-project view for the Details page: Modrinth
// aggregates game_versions and loaders across every version of the project
// in this one call, which is exactly "what versions/loaders does this run
// on" without fetching every version. Description is the full text, not the
// two-line cut Search results carry.
type ProjectDetail struct {
	ID           string      `json:"id"`
	Slug         string      `json:"slug"`
	Title        string      `json:"title"`
	Description  string      `json:"description"` // the one-liner
	Body         string      `json:"body"`        // the full page: Markdown, often with HTML mixed in
	IconURL      string      `json:"iconUrl"`
	Downloads    int64       `json:"downloads"`
	ProjectType  ProjectType `json:"projectType"`
	GameVersions []string    `json:"gameVersions"`
	Loaders      []string    `json:"loaders"`
	Categories   []string    `json:"categories"`
	ClientSide   string      `json:"clientSide"` // required | optional | unsupported | unknown
	ServerSide   string      `json:"serverSide"`
	License      string      `json:"license"`
	SourceURL    string      `json:"sourceUrl"`
	IssuesURL    string      `json:"issuesUrl"`
	WikiURL      string      `json:"wikiUrl"`
	Gallery      []Image     `json:"gallery"`
}

// Image is one gallery picture with its caption.
type Image struct {
	URL         string `json:"url"`
	Title       string `json:"title"`
	Description string `json:"description"`
}

// PrimaryFile is the file to install: the one flagged primary, else the first.
func (v Version) PrimaryFile() (File, bool) {
	for _, f := range v.Files {
		if f.Primary {
			return f, true
		}
	}
	if len(v.Files) > 0 {
		return v.Files[0], true
	}
	return File{}, false
}

// PickVersion chooses which of a project's matching versions to install:
// releases before betas before alphas, newest first within each. It returns
// false for an empty list.
func PickVersion(versions []Version) (Version, bool) {
	if len(versions) == 0 {
		return Version{}, false
	}
	rank := func(t string) int {
		switch t {
		case "release":
			return 0
		case "beta":
			return 1
		default:
			return 2
		}
	}
	sorted := append([]Version(nil), versions...)
	sort.SliceStable(sorted, func(i, j int) bool {
		if a, b := rank(sorted[i].Type), rank(sorted[j].Type); a != b {
			return a < b
		}
		return sorted[i].DatePublished.After(sorted[j].DatePublished)
	})
	return sorted[0], true
}

// Provider is implemented once per marketplace. Search and GameVersions serve
// the browsing page; the rest is fetched once, at click time, when a project
// is added to an instance.
type Provider interface {
	Name() string
	Search(ctx context.Context, q Query) (Page, error)
	GameVersions(ctx context.Context) ([]GameVersion, error)
	// Versions lists the project's versions that run on gameVersion ("" = any)
	// and loader ("" = any), newest first as the provider orders them.
	Versions(ctx context.Context, projectID, gameVersion, loader string) ([]Version, error)
	// VersionByID fetches one version (used for dependencies pinned to a version).
	VersionByID(ctx context.Context, id string) (Version, error)
	// VersionsByHashes finds the versions behind files by SHA-1 (modpack
	// indexes list files by hash, not by project); unknown hashes are left out.
	VersionsByHashes(ctx context.Context, sha1s []string) (map[string]Version, error)
	// Projects names several projects at once (titles for the plan dialog).
	Projects(ctx context.Context, ids []string) ([]ProjectInfo, error)
	// ProjectDetail is the full project view for the Details page.
	ProjectDetail(ctx context.Context, id string) (ProjectDetail, error)
}
