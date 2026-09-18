// Package cache is the one fetch-or-fallback used for every remote list the
// launcher shows offline (Mojang's manifest, loader tables, search pages).
package cache

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
)

// Fetch calls fetch and stores the result at path as JSON; when fetch fails
// the last stored copy is returned instead. An empty path disables the file.
func Fetch[T any](path, source string, fetch func() (T, error)) (T, error) {
	v, err := fetch()
	if err == nil {
		if path != "" {
			if raw, mErr := json.Marshal(v); mErr == nil {
				_ = os.MkdirAll(filepath.Dir(path), 0o755)
				_ = os.WriteFile(path, raw, 0o644)
			}
		}
		return v, nil
	}
	var cached T
	if path == "" {
		return cached, fmt.Errorf("cannot reach %s: %w", source, err)
	}
	raw, readErr := os.ReadFile(path)
	if readErr != nil {
		return cached, fmt.Errorf("cannot reach %s (%v) and no cached copy", source, err)
	}
	if err := json.Unmarshal(raw, &cached); err != nil {
		return cached, err
	}
	return cached, nil
}
