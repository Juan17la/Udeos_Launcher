package modsearch

import (
	"context"
	"fmt"
	"net/url"
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

// NewModrinth wires a Modrinth client with sensible timeouts.
func NewModrinth() *Modrinth {
	return &Modrinth{Client: mojang.NewClient()}
}

// requestTimeout bounds one search/version-list request. The shared client's
// 60s timeout is sized for file downloads; a browse query that takes longer
// than this should fail over to the cache instead of freezing the page.
const requestTimeout = 15 * time.Second

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
	facets := buildFacets(q)
	u := fmt.Sprintf("%s/search?query=%s&facets=%s&offset=%d&limit=%d",
		ModrinthBaseURL, url.QueryEscape(q.Text), url.QueryEscape(facets), q.Offset, limit)
	ctx, cancel := context.WithTimeout(ctx, requestTimeout)
	defer cancel()
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

// buildFacets turns a Query into Modrinth's facets syntax: a JSON array of
// OR-groups, ANDed together (each inner array is an OR, the outer array is an AND).
func buildFacets(q Query) string {
	groups := [][]string{{fmt.Sprintf(`"project_type:%s"`, q.Type)}}
	if q.GameVersion != "" {
		groups = append(groups, []string{fmt.Sprintf(`"versions:%s"`, q.GameVersion)})
	}
	if q.Loader != "" {
		groups = append(groups, []string{fmt.Sprintf(`"categories:%s"`, strings.ToLower(q.Loader))})
	}
	parts := make([]string, len(groups))
	for i, g := range groups {
		parts[i] = "[" + strings.Join(g, ",") + "]"
	}
	return "[" + strings.Join(parts, ",") + "]"
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
	ctx, cancel := context.WithTimeout(ctx, requestTimeout)
	defer cancel()
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
