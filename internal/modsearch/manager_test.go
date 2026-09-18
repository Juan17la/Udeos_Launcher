package modsearch

import (
	"context"
	"errors"
	"testing"
	"time"

	"udeos/launcher/internal/paths"
)

// fakeProvider lets tests control success/failure without hitting the network.
type fakeProvider struct {
	page     Page
	versions []GameVersion
	err      error
	calls    int // Search + GameVersions requests that reached the provider
}

func (f *fakeProvider) Name() string { return "Fake" }
func (f *fakeProvider) Search(ctx context.Context, q Query) (Page, error) {
	f.calls++
	if f.err != nil {
		return Page{}, f.err
	}
	return f.page, nil
}
func (f *fakeProvider) GameVersions(ctx context.Context) ([]GameVersion, error) {
	f.calls++
	if f.err != nil {
		return nil, f.err
	}
	return f.versions, nil
}
func (f *fakeProvider) Versions(context.Context, string, string, string) ([]Version, error) {
	return nil, errors.New("not implemented")
}
func (f *fakeProvider) VersionByID(context.Context, string) (Version, error) {
	return Version{}, errors.New("not implemented")
}
func (f *fakeProvider) VersionsByHashes(context.Context, []string) (map[string]Version, error) {
	return map[string]Version{}, nil
}
func (f *fakeProvider) Projects(context.Context, []string) ([]ProjectInfo, error) {
	return nil, errors.New("not implemented")
}
func (f *fakeProvider) ProjectDetail(context.Context, string) (ProjectDetail, error) {
	return ProjectDetail{}, errors.New("not implemented")
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
	m.pages = nil // forget the memory copy so the disk cache is what answers
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
	m.versions = nil // forget the memory copy so the disk cache is what answers
	got, err := m.GameVersions(context.Background())
	if err != nil || len(got) != 1 || got[0].Version != "1.20.1" {
		t.Fatalf("got %+v, %v", got, err)
	}
}

func TestSearchServesFreshPagesFromMemory(t *testing.T) {
	dirs := paths.FromRoot(t.TempDir())
	fake := &fakeProvider{page: Page{Results: []Result{{ID: "abc"}}, Total: 1}}
	m := &Manager{Dirs: dirs, Provider: fake}
	q := Query{Type: TypeMod, Offset: 30}

	for i := 0; i < 3; i++ {
		if _, err := m.Search(context.Background(), q); err != nil {
			t.Fatal(err)
		}
	}
	if fake.calls != 1 {
		t.Errorf("provider called %d times for the same page, want 1", fake.calls)
	}
	// A different page is a different key.
	if _, err := m.Search(context.Background(), Query{Type: TypeMod, Offset: 60}); err != nil {
		t.Fatal(err)
	}
	if fake.calls != 2 {
		t.Errorf("provider called %d times after a second page, want 2", fake.calls)
	}
}

func TestSearchRefetchesExpiredMemoryEntry(t *testing.T) {
	dirs := paths.FromRoot(t.TempDir())
	fake := &fakeProvider{page: Page{Results: []Result{{ID: "abc"}}}}
	m := &Manager{Dirs: dirs, Provider: fake}
	q := Query{Type: TypeMod}

	if _, err := m.Search(context.Background(), q); err != nil {
		t.Fatal(err)
	}
	e := m.pages[cacheKey(q)]
	e.at = time.Now().Add(-memTTL - time.Second)
	m.pages[cacheKey(q)] = e
	if _, err := m.Search(context.Background(), q); err != nil {
		t.Fatal(err)
	}
	if fake.calls != 2 {
		t.Errorf("provider called %d times, want a refetch after expiry (2)", fake.calls)
	}
}

func TestSearchMemoryIsBounded(t *testing.T) {
	dirs := paths.FromRoot(t.TempDir())
	fake := &fakeProvider{page: Page{}}
	m := &Manager{Dirs: dirs, Provider: fake}
	for i := 0; i <= memCap; i++ {
		if _, err := m.Search(context.Background(), Query{Type: TypeMod, Offset: i}); err != nil {
			t.Fatal(err)
		}
	}
	if len(m.pages) != memCap {
		t.Errorf("memory holds %d pages, want it capped at %d", len(m.pages), memCap)
	}
	if _, ok := m.pages[cacheKey(Query{Type: TypeMod, Offset: 0})]; ok {
		t.Error("oldest page should have been evicted")
	}
}

func TestGameVersionsFetchedOncePerProcess(t *testing.T) {
	dirs := paths.FromRoot(t.TempDir())
	fake := &fakeProvider{versions: []GameVersion{{Version: "1.20.1", Type: "release"}}}
	m := &Manager{Dirs: dirs, Provider: fake}
	for i := 0; i < 3; i++ {
		if _, err := m.GameVersions(context.Background()); err != nil {
			t.Fatal(err)
		}
	}
	if fake.calls != 1 {
		t.Errorf("provider called %d times, want 1", fake.calls)
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
	m.pages = nil // short text stays in memory while typing; only the disk copy is skipped
	if _, err := m.Search(context.Background(), q); err == nil {
		t.Error("expected no disk cache for a 2-char query, got a hit")
	}
}

func TestCacheKeyDistinguishesSortOrder(t *testing.T) {
	base := Query{Type: TypeMod, Text: "sodium"}
	byDownloads := base
	byDownloads.Index = "downloads"
	if cacheKey(base) == cacheKey(byDownloads) {
		t.Errorf("sorted and unsorted pages share a cache key: %s", cacheKey(base))
	}
	if cacheKey(base) != cacheKey(Query{Type: TypeMod, Text: "sodium", Index: ""}) {
		t.Errorf("key must be stable for the same query")
	}
}
