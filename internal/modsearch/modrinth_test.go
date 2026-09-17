package modsearch

import (
	"strings"
	"testing"
	"time"
)

func TestBuildFacets(t *testing.T) {
	got := buildFacets(Query{Type: TypeMod})
	if got != `[["project_type:mod"]]` {
		t.Errorf("got %s", got)
	}
	got = buildFacets(Query{Type: TypeMod, GameVersion: "1.20.1", Loader: "Fabric"})
	want := `[["project_type:mod"],["versions:1.20.1"],["categories:fabric"]]`
	if got != want {
		t.Errorf("got %s, want %s", got, want)
	}
}

func TestLoadersFrom(t *testing.T) {
	got := loadersFrom([]string{"fabric", "adventure", "forge", "utility"})
	if len(got) != 2 || got[0] != "fabric" || got[1] != "forge" {
		t.Errorf("got %v", got)
	}
	if got := loadersFrom([]string{"decoration"}); len(got) != 0 {
		t.Errorf("got %v, want none", got)
	}
}

func TestTruncateDescription(t *testing.T) {
	if got := truncateDescription("short", 160); got != "short" {
		t.Errorf("got %q", got)
	}
	long := "This is a fairly long mod description that goes on and on about rendering engines and performance and keeps rambling well past what any card actually shows on screen to the player browsing the search results page"
	got := truncateDescription(long, 80)
	if len([]rune(got)) > 81 { // 80 + the ellipsis rune
		t.Errorf("got %q (%d runes), want <= 81", got, len([]rune(got)))
	}
	if !strings.HasSuffix(got, "…") {
		t.Errorf("got %q, want it to end with an ellipsis", got)
	}
	if strings.HasSuffix(strings.TrimSuffix(got, "…"), " ") {
		t.Errorf("got %q, trailing space before the ellipsis", got)
	}
}

func TestNormalizeVersionType(t *testing.T) {
	for in, want := range map[string]string{"release": "release", "snapshot": "snapshot", "beta": "old_beta", "alpha": "old_alpha"} {
		if got := normalizeVersionType(in); got != want {
			t.Errorf("normalizeVersionType(%s) = %s, want %s", in, got, want)
		}
	}
}

func TestVersionsURL(t *testing.T) {
	got := versionsURL("AANobbMI", "", "")
	if got != ModrinthBaseURL+"/project/AANobbMI/version" {
		t.Errorf("got %s", got)
	}
	got = versionsURL("AANobbMI", "1.20.1", "Fabric")
	if !strings.Contains(got, "game_versions=%5B%221.20.1%22%5D") || !strings.Contains(got, "loaders=%5B%22fabric%22%5D") {
		t.Errorf("got %s", got)
	}
}

func TestPickVersionPrefersReleasesThenNewest(t *testing.T) {
	old := time.Date(2024, 1, 1, 0, 0, 0, 0, time.UTC)
	newer := old.AddDate(0, 6, 0)
	got, ok := PickVersion([]Version{
		{ID: "beta-new", Type: "beta", DatePublished: newer.AddDate(1, 0, 0)},
		{ID: "rel-old", Type: "release", DatePublished: old},
		{ID: "rel-new", Type: "release", DatePublished: newer},
	})
	if !ok || got.ID != "rel-new" {
		t.Errorf("got %q, want rel-new", got.ID)
	}
	if _, ok := PickVersion(nil); ok {
		t.Error("empty list should not pick")
	}
}

func TestPrimaryFile(t *testing.T) {
	v := Version{Files: []File{{Filename: "sources.jar"}, {Filename: "mod.jar", Primary: true}}}
	if f, ok := v.PrimaryFile(); !ok || f.Filename != "mod.jar" {
		t.Errorf("got %+v", f)
	}
	if _, ok := (Version{}).PrimaryFile(); ok {
		t.Error("no files should not pick")
	}
}

func TestProjectDetailAggregatesAcrossVersions(t *testing.T) {
	raw := modrinthProjectDetail{
		ID: "AANobbMI", Slug: "sodium", Title: "Sodium",
		Description: "A high-performance rendering engine replacement.",
		IconURL:     "https://cdn/sodium.png", Downloads: 42_000_000, ProjectType: "mod",
		GameVersions: []string{"1.20.1", "1.20.4", "1.21.1"}, Loaders: []string{"fabric", "neoforge", "quilt"},
	}
	got := raw.toProjectDetail()
	if got.Title != "Sodium" || got.ProjectType != TypeMod || len(got.GameVersions) != 3 || len(got.Loaders) != 3 {
		t.Errorf("got %+v", got)
	}
}
