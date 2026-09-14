package modsearch

import (
	"context"
	"errors"
	"testing"

	"udeos/launcher/internal/paths"
)

// fakeProvider lets tests control success/failure without hitting the network.
type fakeProvider struct {
	page     Page
	versions []GameVersion
	err      error
}

func (f *fakeProvider) Name() string { return "Fake" }
func (f *fakeProvider) Search(ctx context.Context, q Query) (Page, error) {
	if f.err != nil {
		return Page{}, f.err
	}
	return f.page, nil
}
func (f *fakeProvider) GameVersions(ctx context.Context) ([]GameVersion, error) {
	if f.err != nil {
		return nil, f.err
	}
	return f.versions, nil
}

func TestSearchCachesOnSuccessAndFallsBackOnError(t *testing.T) {
	dirs := paths.FromRoot(t.TempDir())
	fake := &fakeProvider{page: Page{Results: []Result{{ID: "abc", Title: "Sodium"}}, Total: 1}}
	m := &Manager{Dirs: dirs, Provider: fake}
	q := Query{Type: TypeMod, GameVersion: "1.20.1"}

	page, err := m.Search(context.Background(), q)
	if err != nil || len(page.Results) != 1 || page.Results[0].Title != "Sodium" {
		t.Fatalf("got %+v, %v", page, err)
	}

	fake.err = errors.New("network down")
	page, err = m.Search(context.Background(), q)
	if err != nil {
		t.Fatalf("expected cache fallback, got error: %v", err)
	}
	if len(page.Results) != 1 || page.Results[0].Title != "Sodium" {
		t.Errorf("fallback page mismatch: %+v", page)
	}
}

func TestSearchFailsWithoutNetworkOrCache(t *testing.T) {
	dirs := paths.FromRoot(t.TempDir())
	fake := &fakeProvider{err: errors.New("network down")}
	m := &Manager{Dirs: dirs, Provider: fake}

	if _, err := m.Search(context.Background(), Query{Type: TypeMod}); err == nil {
		t.Fatal("expected error when there is no cache")
	}
}

func TestGameVersionsCachesOnSuccessAndFallsBackOnError(t *testing.T) {
	dirs := paths.FromRoot(t.TempDir())
	fake := &fakeProvider{versions: []GameVersion{{Version: "1.20.1", Type: "release"}}}
	m := &Manager{Dirs: dirs, Provider: fake}

	if _, err := m.GameVersions(context.Background()); err != nil {
		t.Fatal(err)
	}

	fake.err = errors.New("network down")
	got, err := m.GameVersions(context.Background())
	if err != nil || len(got) != 1 || got[0].Version != "1.20.1" {
		t.Fatalf("got %+v, %v", got, err)
	}
}

func TestShortFreeTextIsNotCached(t *testing.T) {
	dirs := paths.FromRoot(t.TempDir())
	fake := &fakeProvider{page: Page{Results: []Result{{ID: "abc"}}}}
	m := &Manager{Dirs: dirs, Provider: fake}
	q := Query{Type: TypeMod, Text: "so"}

	if _, err := m.Search(context.Background(), q); err != nil {
		t.Fatal(err)
	}
	fake.err = errors.New("network down")
	if _, err := m.Search(context.Background(), q); err == nil {
		t.Error("expected no cache for a 2-char query, got a hit")
	}
}
