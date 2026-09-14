package modsearch

import "testing"

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

func TestNormalizeVersionType(t *testing.T) {
	for in, want := range map[string]string{"release": "release", "snapshot": "snapshot", "beta": "old_beta", "alpha": "old_alpha"} {
		if got := normalizeVersionType(in); got != want {
			t.Errorf("normalizeVersionType(%s) = %s, want %s", in, got, want)
		}
	}
}
