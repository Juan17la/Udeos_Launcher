package modsearch

import (
	"context"
	"crypto/sha1"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"sync"
	"time"

	"udeos/launcher/internal/paths"
)

// memTTL is how long a search page is served from memory before Modrinth is
// asked again. Paging back and forth, or re-running a recent query, costs no
// request within this window.
const memTTL = 10 * time.Minute

// memCap bounds the in-memory page cache; the oldest entry is evicted past it.
const memCap = 64

// Manager fetches search results and caches them so the search page keeps
// showing something offline, the same way loader.Manager.Options does for
// loader lists. Two layers: memory (fresh, TTL-bound, consulted first) and
// disk (the offline fallback, only read when the provider cannot be reached).
type Manager struct {
	Dirs     paths.Dirs
	Provider Provider

	mu       sync.Mutex
	pages    map[string]memEntry
	versions []GameVersion // fetched once per process; the list changes rarely
}

type memEntry struct {
	page Page
	at   time.Time
}

// New wires a manager against the default provider (Modrinth).
func New(dirs paths.Dirs) *Manager {
	return &Manager{Dirs: dirs, Provider: NewModrinth()}
}

// Search returns one page of results: from memory when a fresh copy exists,
// otherwise from the provider (caching it in memory and on disk), falling
// back to the last cached page for the same query when the provider cannot
// be reached.
func (m *Manager) Search(ctx context.Context, q Query) (Page, error) {
	if q.Limit <= 0 {
		q.Limit = 20
	}
	key := cacheKey(q)
	if page, ok := m.fromMemory(key); ok {
		return page, nil
	}
	cache := m.Dirs.SearchCacheFile(key)
	page, err := m.Provider.Search(ctx, q)
	if err == nil {
		m.remember(key, page)
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
	m.remember(key, cached) // retries while offline stay off the network too
	return cached, nil
}

// GameVersions returns the version list for the search filter. It is fetched
// once per process and kept in memory; the disk copy is the offline fallback.
func (m *Manager) GameVersions(ctx context.Context) ([]GameVersion, error) {
	m.mu.Lock()
	have := m.versions
	m.mu.Unlock()
	if have != nil {
		return have, nil
	}
	cache := m.Dirs.SearchVersionsCacheFile()
	versions, err := m.Provider.GameVersions(ctx)
	if err == nil {
		writeCache(cache, versions)
	} else if readErr := readCache(cache, &versions); readErr != nil {
		return nil, fmt.Errorf("cannot reach %s (%v) and no cached version list", m.Provider.Name(), err)
	}
	m.mu.Lock()
	m.versions = versions
	m.mu.Unlock()
	return versions, nil
}

func (m *Manager) fromMemory(key string) (Page, bool) {
	m.mu.Lock()
	defer m.mu.Unlock()
	e, ok := m.pages[key]
	if !ok {
		return Page{}, false
	}
	if time.Since(e.at) > memTTL {
		delete(m.pages, key)
		return Page{}, false
	}
	return e.page, true
}

func (m *Manager) remember(key string, page Page) {
	m.mu.Lock()
	defer m.mu.Unlock()
	if m.pages == nil {
		m.pages = map[string]memEntry{}
	}
	if len(m.pages) >= memCap {
		oldest, oldestAt := "", time.Time{}
		for k, e := range m.pages {
			if oldest == "" || e.at.Before(oldestAt) {
				oldest, oldestAt = k, e.at
			}
		}
		delete(m.pages, oldest)
	}
	m.pages[key] = memEntry{page: page, at: time.Now()}
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
