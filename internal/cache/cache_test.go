package cache

import (
	"errors"
	"path/filepath"
	"testing"
)

func TestFetchStoresThenFallsBack(t *testing.T) {
	path := filepath.Join(t.TempDir(), "list.json")
	got, err := Fetch(path, "x", func() ([]string, error) { return []string{"a"}, nil })
	if err != nil || len(got) != 1 {
		t.Fatalf("first fetch: %v %v", got, err)
	}
	got, err = Fetch(path, "x", func() ([]string, error) { return nil, errors.New("down") })
	if err != nil || len(got) != 1 || got[0] != "a" {
		t.Fatalf("fallback: %v %v", got, err)
	}
	if _, err := Fetch("", "x", func() ([]string, error) { return nil, errors.New("down") }); err == nil {
		t.Fatal("no path and no network must fail")
	}
}
