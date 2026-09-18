package main

import (
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"testing"

	"udeos/launcher/internal/core"
	"udeos/launcher/internal/paths"
)

func TestMediaHandlerServesIconAndScreenshots(t *testing.T) {
	dirs := paths.FromRoot(t.TempDir())
	l, err := core.New(dirs, "test", nil, nil, nil)
	if err != nil {
		t.Fatal(err)
	}
	inst, _ := l.Instances.Create("A", "1.20.1", "Vanilla", "", "grass")
	os.WriteFile(filepath.Join(dirs.InstanceDir(inst.ID), "icon"), []byte("\x89PNG"), 0o644)
	os.WriteFile(filepath.Join(dirs.GameDir(inst.ID), "screenshots", "s.png"), []byte("\x89PNG"), 0o644)
	a := &App{launcher: l}
	for path, want := range map[string]int{
		"/media/" + inst.ID + "/icon":                200,
		"/media/" + inst.ID + "/screenshots/s.png":   200,
		"/media/" + inst.ID + "/screenshots/../icon": 404,
		"/media/nope/icon":                           404,
		"/media/" + inst.ID + "/mods/x.jar":          404,
	} {
		rec := httptest.NewRecorder()
		a.mediaHandler(rec, httptest.NewRequest(http.MethodGet, path, nil))
		if rec.Code != want {
			t.Errorf("%s: got %d want %d", path, rec.Code, want)
		}
	}
}
