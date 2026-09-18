// Package instance manages the list of Minecraft instances (a name, a version,
// an icon and a private game directory each).
package instance

import (
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"errors"
	"os"
	"path/filepath"
	"regexp"
	"slices"
	"sort"
	"strings"
	"sync"
	"time"

	"udeos/launcher/internal/paths"
)

// Instance is what the dashboard shows and what the launcher starts.
type Instance struct {
	ID            string     `json:"id"`
	Name          string     `json:"name"`
	Version       string     `json:"version"`                 // Minecraft version, e.g. "1.20.1"
	Loader        string     `json:"loader"`                  // "Vanilla" | "Fabric" | "Forge" | "NeoForge"
	LoaderVersion string     `json:"loaderVersion,omitempty"` // loader build, e.g. "0.16.9" or "1.20.1-47.4.10"
	Icon          string     `json:"icon"`                    // pixel icon key, e.g. "grass"
	CreatedAt     time.Time  `json:"createdAt"`
	LastPlayed    *time.Time `json:"lastPlayed,omitempty"`
	PlayTimeSec   int64      `json:"playTimeSec"`
	Launch        Launch     `json:"launch"`
}

// Launch is the instance's own JVM settings; a zero value means "use the
// profile's default" (memory) or "nothing extra" (java, arguments).
type Launch struct {
	MaxMemoryMB int    `json:"maxMemoryMB,omitempty"`
	JavaPath    string `json:"javaPath,omitempty"` // "" = the profile's Java, else the managed runtime
	JvmArgs     string `json:"jvmArgs,omitempty"`  // extra flags, space separated
}

// Store persists instances.json and owns the instance directories.
type Store struct {
	dirs  paths.Dirs
	mu    sync.Mutex
	items []Instance
}

// ErrNotFound is returned for unknown ids.
var ErrNotFound = errors.New("instance not found")

// GameSubdirs are created inside every .minecraft so the tabs always have a folder to read.
var GameSubdirs = []string{"saves", "screenshots", "resourcepacks", "mods", "shaderpacks"}

// Open loads instances.json (an empty list when it does not exist).
func Open(dirs paths.Dirs) (*Store, error) {
	s := &Store{dirs: dirs}
	raw, err := os.ReadFile(dirs.InstancesFile())
	if err != nil {
		if errors.Is(err, os.ErrNotExist) {
			return s, nil
		}
		return nil, err
	}
	if err := json.Unmarshal(raw, &s.items); err != nil {
		return nil, err
	}
	return s, nil
}

// List returns instances, most recently played first, then newest first.
func (s *Store) List() []Instance {
	s.mu.Lock()
	defer s.mu.Unlock()
	out := append([]Instance(nil), s.items...)
	sort.SliceStable(out, func(i, j int) bool {
		a, b := out[i], out[j]
		if (a.LastPlayed == nil) != (b.LastPlayed == nil) {
			return a.LastPlayed != nil
		}
		if a.LastPlayed != nil && !a.LastPlayed.Equal(*b.LastPlayed) {
			return a.LastPlayed.After(*b.LastPlayed)
		}
		return a.CreatedAt.After(b.CreatedAt)
	})
	return out
}

// Get finds one instance.
func (s *Store) Get(id string) (Instance, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	for _, it := range s.items {
		if it.ID == id {
			return it, nil
		}
	}
	return Instance{}, ErrNotFound
}

var slugRe = regexp.MustCompile(`[^a-z0-9]+`)

// Create validates the input, creates the folders and saves the list. loader
// is "Vanilla" (loaderVersion empty) or "Fabric"/"Forge"/"NeoForge" with the build to install.
func (s *Store) Create(name, version, loader, loaderVersion, icon string) (Instance, error) {
	name = strings.TrimSpace(name)
	if name == "" || version == "" {
		return Instance{}, errors.New("name and version are required")
	}
	if loader == "" {
		loader = "Vanilla"
	}
	if loader == "Vanilla" {
		loaderVersion = ""
	} else if loaderVersion == "" {
		return Instance{}, errors.New("a " + loader + " version is required")
	}
	if icon == "" {
		icon = "grass"
	}
	inst := Instance{ID: newID(name), Name: name, Version: version, Loader: loader, LoaderVersion: loaderVersion, Icon: icon, CreatedAt: time.Now()}
	for _, sub := range GameSubdirs {
		if err := os.MkdirAll(filepath.Join(s.dirs.GameDir(inst.ID), sub), 0o755); err != nil {
			return Instance{}, err
		}
	}
	s.mu.Lock()
	s.items = append(s.items, inst)
	err := s.saveLocked()
	s.mu.Unlock()
	return inst, err
}

// Delete removes the instance and its whole directory (worlds included).
func (s *Store) Delete(id string) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	idx := slices.IndexFunc(s.items, func(it Instance) bool { return it.ID == id })
	if idx < 0 {
		return ErrNotFound
	}
	if err := os.RemoveAll(s.dirs.InstanceDir(id)); err != nil {
		return err
	}
	s.items = slices.Delete(s.items, idx, idx+1)
	return s.saveLocked()
}

// SetLaunch stores the instance's JVM settings.
func (s *Store) SetLaunch(id string, l Launch) error {
	if l.MaxMemoryMB != 0 && l.MaxMemoryMB < 512 {
		return errors.New("memory must be at least 512 MB")
	}
	s.mu.Lock()
	defer s.mu.Unlock()
	for i := range s.items {
		if s.items[i].ID == id {
			s.items[i].Launch = l
			return s.saveLocked()
		}
	}
	return ErrNotFound
}

// Touch records a play session.
func (s *Store) Touch(id string, played time.Duration) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	for i := range s.items {
		if s.items[i].ID == id {
			now := time.Now()
			s.items[i].LastPlayed = &now
			s.items[i].PlayTimeSec += int64(played.Seconds())
			return s.saveLocked()
		}
	}
	return ErrNotFound
}

func (s *Store) saveLocked() error {
	raw, err := json.MarshalIndent(s.items, "", "  ")
	if err != nil {
		return err
	}
	return os.WriteFile(s.dirs.InstancesFile(), raw, 0o644)
}

func newID(name string) string {
	slug := strings.Trim(slugRe.ReplaceAllString(strings.ToLower(name), "-"), "-")
	if len(slug) > 24 {
		slug = slug[:24]
	}
	if slug == "" {
		slug = "instance"
	}
	b := make([]byte, 3)
	_, _ = rand.Read(b)
	return slug + "-" + hex.EncodeToString(b)
}

// Counts summarises what an instance contains, read straight from disk.
type Counts struct {
	Mods          int `json:"mods"`
	ResourcePacks int `json:"resourcePacks"`
	Worlds        int `json:"worlds"`
	Screenshots   int `json:"screenshots"`
}

// CountContent scans the game directory.
func CountContent(gameDir string) Counts {
	var c Counts
	c.Mods = countFiles(filepath.Join(gameDir, "mods"), ".jar")
	c.ResourcePacks = countEntries(filepath.Join(gameDir, "resourcepacks"))
	c.Screenshots = countFiles(filepath.Join(gameDir, "screenshots"), ".png")
	if entries, err := os.ReadDir(filepath.Join(gameDir, "saves")); err == nil {
		for _, e := range entries {
			if e.IsDir() {
				if _, err := os.Stat(filepath.Join(gameDir, "saves", e.Name(), "level.dat")); err == nil {
					c.Worlds++
				}
			}
		}
	}
	return c
}

func countFiles(dir, ext string) int {
	n := 0
	if entries, err := os.ReadDir(dir); err == nil {
		for _, e := range entries {
			if !e.IsDir() && strings.HasSuffix(strings.ToLower(e.Name()), ext) {
				n++
			}
		}
	}
	return n
}

func countEntries(dir string) int {
	n := 0
	if entries, err := os.ReadDir(dir); err == nil {
		for _, e := range entries {
			if !strings.HasPrefix(e.Name(), ".") {
				n++
			}
		}
	}
	return n
}
