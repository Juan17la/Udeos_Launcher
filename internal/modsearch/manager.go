package modsearch

import (
	"context"
	"crypto/sha1"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"

	"udeos/launcher/internal/paths"
)

// Manager fetches search results and caches them so the search page keeps
// showing something offline, the same way loader.Manager.Options does for
// loader lists.
type Manager struct {
	Dirs     paths.Dirs
	Provider Provider
}

// New wires a manager against the default provider (Modrinth).
func New(dirs paths.Dirs) *Manager {
	return &Manager{Dirs: dirs, Provider: NewModrinth()}
}

// Search returns one page of results, caching it on success and falling
// back to the last cached page for the same query when the provider cannot
// be reached.
func (m *Manager) Search(ctx context.Context, q Query) (Page, error) {
	if q.Limit <= 0 {
		q.Limit = 20
	}
	cache := m.Dirs.SearchCacheFile(cacheKey(q))
	page, err := m.Provider.Search(ctx, q)
	if err == nil {
		// Keystroke-by-keystroke free text would write a cache file per
		// character; only persist once the query looks intentional.
		if q.Text == "" || len(q.Text) >= 3 {
			writeCache(cache, page)
		}
		return page, nil
	}
	var cached Page
	if readErr := readCache(cache, &cached); readErr != nil {
		return Page{}, fmt.Errorf("cannot reach %s (%v) and no cached results", m.Provider.Name(), err)
	}
	return cached, nil
}

// GameVersions returns the version list for the search filter, cached the
// same way.
func (m *Manager) GameVersions(ctx context.Context) ([]GameVersion, error) {
	cache := m.Dirs.SearchVersionsCacheFile()
	versions, err := m.Provider.GameVersions(ctx)
	if err == nil {
		writeCache(cache, versions)
		return versions, nil
	}
	var cached []GameVersion
	if readErr := readCache(cache, &cached); readErr != nil {
		return nil, fmt.Errorf("cannot reach %s (%v) and no cached version list", m.Provider.Name(), err)
	}
	return cached, nil
}

// cacheKey names one cache file per distinct (type, version, loader, offset,
// text) combination.
func cacheKey(q Query) string {
	gv, ldr := q.GameVersion, q.Loader
	if gv == "" {
		gv = "any"
	}
	if ldr == "" {
		ldr = "any"
	}
	sum := sha1.Sum([]byte(q.Text))
	return fmt.Sprintf("%s_%s_%s_%d_%s", q.Type, gv, ldr, q.Offset, hex.EncodeToString(sum[:])[:8])
}

func writeCache(path string, v any) {
	raw, err := json.Marshal(v)
	if err != nil {
		return
	}
	_ = os.MkdirAll(filepath.Dir(path), 0o755)
	_ = os.WriteFile(path, raw, 0o644)
}

func readCache(path string, v any) error {
	raw, err := os.ReadFile(path)
	if err != nil {
		return err
	}
	return json.Unmarshal(raw, v)
}
