package modinstall

import (
	"archive/zip"
	"bytes"
	"context"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"strings"
	"testing"
	"time"

	"udeos/launcher/internal/modsearch"
	"udeos/launcher/internal/paths"
)

// A datapack goes into one chosen world, counts as installed only there, and
// the same pack can go into another world.
func TestDatapackPerWorld(t *testing.T) {
	var buf bytes.Buffer
	zw := zip.NewWriter(&buf)
	f, _ := zw.Create("pack.mcmeta")
	f.Write([]byte(`{"pack":{"pack_format":15,"description":"x"}}`))
	zw.Close()
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) { w.Write(buf.Bytes()) }))
	defer srv.Close()

	fake := newFake()
	fake.projects["terra"] = modsearch.ProjectInfo{ID: "terra", Title: "Terralith", ProjectType: modsearch.TypeMod}
	fake.versions["terra"] = []modsearch.Version{
		// The pack publishes a mod build too; only the "datapack" one may be picked.
		ver("terra-fabric", "terra", "1.20.1", "fabric"),
		{ID: "terra-dp", ProjectID: "terra", VersionNumber: "2.0", GameVersions: []string{"1.20.1"}, Loaders: []string{"datapack"}, Type: "release", DatePublished: time.Now(),
			Files: []modsearch.File{{Filename: "terra.zip", URL: srv.URL + "/terra.zip", Primary: true}}},
	}
	dirs := paths.FromRoot(t.TempDir())
	inst := fabricInstance(t, dirs)
	m := New(dirs, fake, nil)
	ctx := context.Background()

	if _, err := m.PlanDatapack(ctx, inst, "terra", "", ""); err == nil || !strings.Contains(err.Error(), "pick a world") {
		t.Fatalf("no world: %v", err)
	}
	entries, err := m.AddDatapack(ctx, inst, "terra", "", "saves/My World")
	if err != nil || len(entries) != 1 {
		t.Fatalf("add: %v %+v", err, entries)
	}
	game := dirs.GameDir(inst.ID)
	if _, err := os.Stat(filepath.Join(game, "saves", "My World", "datapacks", "terra.zip")); err != nil {
		t.Fatal("datapack not in the world's datapacks folder")
	}
	if entries[0].Type != "datapack" || entries[0].World != "saves/My World" || entries[0].VersionID != "terra-dp" {
		t.Errorf("entry: %+v", entries[0])
	}
	if plan, _ := m.PlanDatapack(ctx, inst, "terra", "", "saves/My World"); !plan.AlreadyInstalled {
		t.Error("installed in its own world")
	}
	if plan, err := m.PlanDatapack(ctx, inst, "terra", "", "saves/Other"); err != nil || plan.AlreadyInstalled {
		t.Errorf("another world is a fresh install: %+v %v", plan, err)
	}
	if _, err := m.AddDatapack(ctx, inst, "terra", "", "saves/Other"); err != nil {
		t.Fatal(err)
	}
	have, _ := Load(dirs.ContentFile(inst.ID))
	if len(have) != 2 {
		t.Fatalf("one entry per world: %+v", have)
	}
	// Removing it from one world forgets only that entry.
	if err := Forget(dirs.ContentFile(inst.ID), "saves/My World/datapacks", "terra.zip"); err != nil {
		t.Fatal(err)
	}
	if have, _ = Load(dirs.ContentFile(inst.ID)); len(have) != 1 || have[0].World != "saves/Other" {
		t.Errorf("after forget: %+v", have)
	}
}
