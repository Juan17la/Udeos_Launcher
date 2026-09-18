package modsearch

import (
	"context"
	"encoding/json"
	"fmt"
	"net/url"
	"sort"
	"strings"
	"time"

	"udeos/launcher/internal/mojang"
)

// ModrinthBaseURL is Modrinth's public API.
const ModrinthBaseURL = "https://api.modrinth.com/v2"

// knownLoaders are the categories Modrinth mixes in with feature tags that
// this launcher actually knows how to run.
var knownLoaders = map[string]bool{"fabric": true, "forge": true, "quilt": true, "neoforge": true}

// Modrinth is the default content provider.
type Modrinth struct {
	Client *mojang.Client
}

// NewModrinth wires a Modrinth client. Its 15s timeout is shorter than the
// download client's: a browse query that takes longer should fail over to
// the cache instead of freezing the page.
func NewModrinth() *Modrinth {
	c := mojang.NewClient()
	c.HTTP.Timeout = 15 * time.Second
	return &Modrinth{Client: c}
}

func (m *Modrinth) Name() string { return "Modrinth" }

// maxDescriptionLen caps the description sent to the frontend and written to
// the cache file: the UI clamps it to two lines with CSS, so anything past a
// couple of lines' worth of text is wasted bytes on the wire and on disk.
const maxDescriptionLen = 160

type modrinthHit struct {
	ProjectID   string   `json:"project_id"`
	Slug        string   `json:"slug"`
	Title       string   `json:"title"`
	Author      string   `json:"author"`
	Description string   `json:"description"`
	IconURL     string   `json:"icon_url"`
	Downloads   int64    `json:"downloads"`
	ProjectType string   `json:"project_type"`
	Categories  []string `json:"categories"`
}

type modrinthSearchResponse struct {
	Hits      []modrinthHit `json:"hits"`
	Offset    int           `json:"offset"`
	TotalHits int           `json:"total_hits"`
}

// Search asks Modrinth for one page of results matching q.
func (m *Modrinth) Search(ctx context.Context, q Query) (Page, error) {
	limit := q.Limit
	if limit <= 0 {
		limit = 20
	}
	if limit > 50 {
		limit = 50
	}
	u := searchURL(q, limit)
	var raw modrinthSearchResponse
	if err := m.Client.GetJSON(ctx, u, &raw); err != nil {
		return Page{}, err
	}
	page := Page{Total: raw.TotalHits, Offset: raw.Offset, Results: make([]Result, 0, len(raw.Hits))}
	for _, h := range raw.Hits {
		page.Results = append(page.Results, Result{
			ID:          h.ProjectID,
			Slug:        h.Slug,
			Title:       h.Title,
			Author:      h.Author,
			Description: truncateDescription(h.Description, maxDescriptionLen),
			IconURL:     h.IconURL,
			Downloads:   h.Downloads,
			ProjectType: ProjectType(h.ProjectType),
			Loaders:     loadersFrom(h.Categories),
		})
	}
	return page, nil
}

// searchURL builds the /search request. Modrinth's index parameter picks the
// sort order (relevance | downloads | follows | newest | updated); it is left
// out for the default, relevance, so a plain browse hits the same URL as before.
func searchURL(q Query, limit int) string {
	u := fmt.Sprintf("%s/search?query=%s&facets=%s&offset=%d&limit=%d",
		ModrinthBaseURL, url.QueryEscape(q.Text), url.QueryEscape(buildFacets(q)), q.Offset, limit)
	if q.Index != "" {
		u += "&index=" + url.QueryEscape(q.Index)
	}
	return u
}

// buildFacets turns a Query into Modrinth's facets syntax: a JSON array of
// OR-groups, ANDed together (each inner array is an OR, the outer array is an AND).
func buildFacets(q Query) string {
	groups := [][]string{{"project_type:" + string(q.Type)}}
	if q.GameVersion != "" {
		groups = append(groups, []string{"versions:" + q.GameVersion})
	}
	if q.Loader != "" {
		var group []string
		for _, l := range LoaderNames(q.Loader) {
			group = append(group, "categories:"+l)
		}
		groups = append(groups, group)
	}
	raw, _ := json.Marshal(groups)
	return string(raw)
}

// truncateDescription cuts s to at most max runes, breaking on the last
// space so words aren't split, and marks the cut with an ellipsis.
func truncateDescription(s string, max int) string {
	runes := []rune(s)
	if len(runes) <= max {
		return s
	}
	cut := string(runes[:max])
	if i := strings.LastIndexByte(cut, ' '); i > 0 {
		cut = cut[:i]
	}
	return strings.TrimRight(cut, " ") + "…"
}

// loadersFrom picks the loader names out of Modrinth's category list, which
// mixes loaders with unrelated feature tags (adventure, utility, ...).
func loadersFrom(categories []string) []string {
	out := []string{}
	for _, c := range categories {
		if knownLoaders[strings.ToLower(c)] {
			out = append(out, c)
		}
	}
	return out
}

type modrinthGameVersion struct {
	Version string `json:"version"`
	Type    string `json:"version_type"`
	Major   bool   `json:"major"`
}

// GameVersions lists the Minecraft versions Modrinth has content for.
func (m *Modrinth) GameVersions(ctx context.Context) ([]GameVersion, error) {
	var raw []modrinthGameVersion
	if err := m.Client.GetJSON(ctx, ModrinthBaseURL+"/tag/game_version", &raw); err != nil {
		return nil, err
	}
	out := make([]GameVersion, 0, len(raw))
	for _, v := range raw {
		out = append(out, GameVersion{Version: v.Version, Type: normalizeVersionType(v.Type)})
	}
	return out, nil
}

// normalizeVersionType maps Modrinth's version_type onto the vocabulary the
// launcher already uses for Mojang's manifest (release/snapshot/old_beta/old_alpha).
func normalizeVersionType(t string) string {
	switch t {
	case "release", "snapshot":
		return t
	case "beta":
		return "old_beta"
	case "alpha":
		return "old_alpha"
	default:
		return t
	}
}

// Raw shapes of Modrinth's version and project objects; only what the launcher reads.
type modrinthVersion struct {
	ID            string    `json:"id"`
	ProjectID     string    `json:"project_id"`
	Name          string    `json:"name"`
	VersionNumber string    `json:"version_number"`
	GameVersions  []string  `json:"game_versions"`
	Loaders       []string  `json:"loaders"`
	VersionType   string    `json:"version_type"`
	DatePublished time.Time `json:"date_published"`
	Files         []struct {
		Hashes   map[string]string `json:"hashes"`
		URL      string            `json:"url"`
		Filename string            `json:"filename"`
		Primary  bool              `json:"primary"`
		Size     int64             `json:"size"`
	} `json:"files"`
	Dependencies []struct {
		VersionID      string `json:"version_id"`
		ProjectID      string `json:"project_id"`
		DependencyType string `json:"dependency_type"`
	} `json:"dependencies"`
}

type modrinthProject struct {
	ID          string `json:"id"`
	Slug        string `json:"slug"`
	Title       string `json:"title"`
	ProjectType string `json:"project_type"`
	Description string `json:"description"`
	IconURL     string `json:"icon_url"`
}

func (raw modrinthVersion) toVersion() Version {
	v := Version{
		ID: raw.ID, ProjectID: raw.ProjectID, Name: raw.Name, VersionNumber: raw.VersionNumber,
		GameVersions: raw.GameVersions, Loaders: raw.Loaders, Type: raw.VersionType, DatePublished: raw.DatePublished,
		Files: make([]File, 0, len(raw.Files)), Dependencies: make([]Dependency, 0, len(raw.Dependencies)),
	}
	for _, f := range raw.Files {
		v.Files = append(v.Files, File{URL: f.URL, Filename: f.Filename, SHA1: f.Hashes["sha1"], SHA512: f.Hashes["sha512"], Size: f.Size, Primary: f.Primary})
	}
	for _, d := range raw.Dependencies {
		v.Dependencies = append(v.Dependencies, Dependency{ProjectID: d.ProjectID, VersionID: d.VersionID, Type: d.DependencyType})
	}
	return v
}

// versionsURL builds GET /project/{id}/version with Modrinth's JSON-array
// filters, e.g. ?game_versions=["1.20.1"]&loaders=["fabric"].
func versionsURL(projectID, gameVersion, loader string) string {
	u := fmt.Sprintf("%s/project/%s/version", ModrinthBaseURL, url.PathEscape(projectID))
	params := url.Values{}
	if gameVersion != "" {
		params.Set("game_versions", jsonList(gameVersion))
	}
	if loader != "" {
		params.Set("loaders", jsonList(LoaderNames(loader)...))
	}
	if len(params) > 0 {
		u += "?" + params.Encode()
	}
	return u
}

// jsonList is the JSON array Modrinth expects for list parameters.
func jsonList(items ...string) string {
	raw, _ := json.Marshal(items)
	return string(raw)
}

// Versions lists the project's versions for the game version / loader pair.
func (m *Modrinth) Versions(ctx context.Context, projectID, gameVersion, loader string) ([]Version, error) {
	var raw []modrinthVersion
	if err := m.Client.GetJSON(ctx, versionsURL(projectID, gameVersion, loader), &raw); err != nil {
		return nil, err
	}
	out := make([]Version, 0, len(raw))
	for _, r := range raw {
		out = append(out, r.toVersion())
	}
	return out, nil
}

// VersionByID fetches one version.
func (m *Modrinth) VersionByID(ctx context.Context, id string) (Version, error) {
	var raw modrinthVersion
	if err := m.Client.GetJSON(ctx, ModrinthBaseURL+"/version/"+url.PathEscape(id), &raw); err != nil {
		return Version{}, err
	}
	return raw.toVersion(), nil
}

// VersionsByHashes resolves files to versions (POST /version_files).
func (m *Modrinth) VersionsByHashes(ctx context.Context, sha1s []string) (map[string]Version, error) {
	out := map[string]Version{}
	if len(sha1s) == 0 {
		return out, nil
	}
	var raw map[string]modrinthVersion
	body := map[string]any{"hashes": sha1s, "algorithm": "sha1"}
	if err := m.Client.PostJSON(ctx, ModrinthBaseURL+"/version_files", body, &raw); err != nil {
		return nil, err
	}
	for h, v := range raw {
		out[h] = v.toVersion()
	}
	return out, nil
}

// Projects fetches several projects in one request (GET /projects?ids=[...]).
func (m *Modrinth) Projects(ctx context.Context, ids []string) ([]ProjectInfo, error) {
	if len(ids) == 0 {
		return []ProjectInfo{}, nil
	}
	u := ModrinthBaseURL + "/projects?ids=" + url.QueryEscape(jsonList(ids...))
	var raw []modrinthProject
	if err := m.Client.GetJSON(ctx, u, &raw); err != nil {
		return nil, err
	}
	out := make([]ProjectInfo, 0, len(raw))
	for _, p := range raw {
		out = append(out, ProjectInfo{ID: p.ID, Slug: p.Slug, Title: p.Title, ProjectType: ProjectType(p.ProjectType), Description: truncateDescription(p.Description, maxDescriptionLen), IconURL: p.IconURL})
	}
	return out, nil
}

type modrinthProjectDetail struct {
	ID           string   `json:"id"`
	Slug         string   `json:"slug"`
	Title        string   `json:"title"`
	Description  string   `json:"description"`
	Body         string   `json:"body"`
	IconURL      string   `json:"icon_url"`
	Downloads    int64    `json:"downloads"`
	ProjectType  string   `json:"project_type"`
	GameVersions []string `json:"game_versions"`
	Loaders      []string `json:"loaders"`
	Categories   []string `json:"categories"`
	ClientSide   string   `json:"client_side"`
	ServerSide   string   `json:"server_side"`
	License      struct {
		ID   string `json:"id"`
		Name string `json:"name"`
	} `json:"license"`
	SourceURL string `json:"source_url"`
	IssuesURL string `json:"issues_url"`
	WikiURL   string `json:"wiki_url"`
	Gallery   []struct {
		URL         string `json:"url"`
		Title       string `json:"title"`
		Description string `json:"description"`
		Ordering    int    `json:"ordering"`
	} `json:"gallery"`
}

func (raw modrinthProjectDetail) toProjectDetail() ProjectDetail {
	d := ProjectDetail{
		ID: raw.ID, Slug: raw.Slug, Title: raw.Title, Description: raw.Description, Body: raw.Body, IconURL: raw.IconURL,
		Downloads: raw.Downloads, ProjectType: ProjectType(raw.ProjectType), GameVersions: raw.GameVersions, Loaders: raw.Loaders,
		Categories: raw.Categories, ClientSide: raw.ClientSide, ServerSide: raw.ServerSide,
		License: raw.License.Name, SourceURL: raw.SourceURL, IssuesURL: raw.IssuesURL, WikiURL: raw.WikiURL, Gallery: []Image{},
	}
	if d.License == "" {
		d.License = raw.License.ID
	}
	sort.SliceStable(raw.Gallery, func(i, j int) bool { return raw.Gallery[i].Ordering < raw.Gallery[j].Ordering })
	for _, g := range raw.Gallery {
		d.Gallery = append(d.Gallery, Image{URL: g.URL, Title: g.Title, Description: g.Description})
	}
	return d
}

// ProjectDetail fetches the whole project (GET /project/{id}): its full
// description and the game versions/loaders aggregated across every version.
func (m *Modrinth) ProjectDetail(ctx context.Context, id string) (ProjectDetail, error) {
	var raw modrinthProjectDetail
	if err := m.Client.GetJSON(ctx, ModrinthBaseURL+"/project/"+url.PathEscape(id), &raw); err != nil {
		return ProjectDetail{}, err
	}
	return raw.toProjectDetail(), nil
}
