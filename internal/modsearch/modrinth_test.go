package modsearch

import (
	"strings"
	"testing"
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
