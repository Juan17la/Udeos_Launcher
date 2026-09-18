package modpack

import (
	"archive/zip"
	"bytes"
	"context"
	"crypto/sha1"
	"encoding/hex"
	"errors"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"strings"
	"testing"

	"udeos/launcher/internal/instance"
	"udeos/launcher/internal/modinstall"
	"udeos/launcher/internal/modsearch"
	"udeos/launcher/internal/paths"
)

// fake serves one modpack whose only file is a jar, plus the hash lookup for it.
type fake struct {
	packURL, iconURL, jarSHA string
}

func (f *fake) Name() string { return "Fake" }
func (f *fake) Search(context.Context, modsearch.Query) (modsearch.Page, error) {
	return modsearch.Page{}, nil
}
func (f *fake) GameVersions(context.Context) ([]modsearch.GameVersion, error) { return nil, nil }
func (f *fake) Versions(_ context.Context, id, mc, ldr string) ([]modsearch.Version, error) {
	if id != "pack" || (mc != "" && mc != "1.20.1") || (ldr != "" && ldr != "fabric") {
		return nil, nil
	}
	return []modsearch.Version{{ID: "pack-1", ProjectID: "pack", Type: "release", GameVersions: []string{"1.20.1"}, Loaders: []string{"fabric"},
		Files: []modsearch.File{{URL: f.packURL, Filename: "pack.mrpack", Primary: true}}}}, nil
}
func (f *fake) VersionByID(context.Context, string) (modsearch.Version, error) {
	return modsearch.Version{}, errors.New("no")
}
func (f *fake) VersionsByHashes(_ context.Context, sha1s []string) (map[string]modsearch.Version, error) {
	out := map[string]modsearch.Version{}
	for _, h := range sha1s {
		if h == f.jarSHA {
			out[h] = modsearch.Version{ID: "sodium-1", ProjectID: "sodium", VersionNumber: "0.5"}
		}
	}
	return out, nil
}
func (f *fake) Projects(_ context.Context, ids []string) ([]modsearch.ProjectInfo, error) {
	if len(ids) == 1 && ids[0] == "pack" {
		return []modsearch.ProjectInfo{{ID: "pack", Title: "Fast Pack", IconURL: f.iconURL}}, nil
	}
	return []modsearch.ProjectInfo{{ID: "sodium", Title: "Sodium", IconURL: "http://x/sodium.png"}}, nil
}
func (f *fake) ProjectDetail(context.Context, string) (modsearch.ProjectDetail, error) {
	return modsearch.ProjectDetail{}, errors.New("no")
}

func TestCreateAndAddTo(t *testing.T) {
	jar := []byte("jar bytes")
	sum := sha1.Sum(jar)
	jarSHA := hex.EncodeToString(sum[:])
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		switch r.URL.Path {
		case "/sodium.jar":
			w.Write(jar)
		case "/icon.png":
			w.Write([]byte("png bytes"))
		case "/pack.mrpack":
			var buf bytes.Buffer
			zw := zip.NewWriter(&buf)
			idx, _ := zw.Create("modrinth.index.json")
			idx.Write([]byte(`{"formatVersion":1,"name":"Fast Pack","versionId":"1","dependencies":{"minecraft":"1.20.1","fabric-loader":"0.16.9"},
				"files":[{"path":"mods/sodium.jar","hashes":{"sha1":"` + jarSHA + `"},"env":{"client":"required"},"downloads":["http://` + r.Host + `/sodium.jar"],"fileSize":9},
				         {"path":"mods/server-only.jar","hashes":{"sha1":"00"},"env":{"client":"unsupported"},"downloads":["http://nowhere/x.jar"]}]}`))
			cfg, _ := zw.Create("overrides/config/sodium.txt")
			cfg.Write([]byte("from pack"))
			zw.Close()
			w.Write(buf.Bytes())
		default:
			http.NotFound(w, r)
		}
	}))
	defer srv.Close()

	dirs := paths.FromRoot(t.TempDir())
	store, _ := instance.Open(dirs)
	m := New(dirs, &fake{packURL: srv.URL + "/pack.mrpack", iconURL: srv.URL + "/icon.png", jarSHA: jarSHA}, store, nil)

	inst, entries, err := m.Create(context.Background(), "pack", "", "grass", "", "")
	if err != nil {
		t.Fatal(err)
	}
	if inst.Name != "Fast Pack" || inst.Version != "1.20.1" || inst.Loader != "Fabric" || inst.LoaderVersion != "0.16.9" || inst.Icon != IconKey {
		t.Errorf("instance: %+v", inst)
	}
	if got, _ := os.ReadFile(filepath.Join(dirs.InstanceDir(inst.ID), "icon")); string(got) != "png bytes" {
		t.Error("pack icon not saved into the instance")
	}
	game := dirs.GameDir(inst.ID)
	if got, _ := os.ReadFile(filepath.Join(game, "mods", "sodium.jar")); !bytes.Equal(got, jar) {
		t.Error("sodium.jar not installed")
	}
	if _, err := os.Stat(filepath.Join(game, "mods", "server-only.jar")); err == nil {
		t.Error("server-only file must be skipped")
	}
	if got, _ := os.ReadFile(filepath.Join(game, "config", "sodium.txt")); string(got) != "from pack" {
		t.Error("override not unpacked")
	}
	if len(entries) != 1 || entries[0].ProjectID != "sodium" || entries[0].Title != "Sodium" || entries[0].IconURL == "" {
		t.Errorf("entries: %+v", entries)
	}
	if have, _ := modinstall.Load(dirs.ContentFile(inst.ID)); len(have) != 1 {
		t.Errorf("content.json: %+v", have)
	}

	// Pouring the pack into an existing instance keeps the player's own config.
	other, _ := store.Create("Mine", "1.20.1", "Fabric", "0.16.9", "grass")
	os.MkdirAll(filepath.Join(dirs.GameDir(other.ID), "config"), 0o755)
	os.WriteFile(filepath.Join(dirs.GameDir(other.ID), "config", "sodium.txt"), []byte("mine"), 0o644)
	if _, err := m.AddTo(context.Background(), other, "pack"); err != nil {
		t.Fatal(err)
	}
	if got, _ := os.ReadFile(filepath.Join(dirs.GameDir(other.ID), "config", "sodium.txt")); string(got) != "mine" {
		t.Error("existing file was overwritten")
	}
	if _, err := os.Stat(filepath.Join(dirs.GameDir(other.ID), "mods", "sodium.jar")); err != nil {
		t.Error("mod not added to existing instance")
	}

	// Wrong loader: refused, and no instance left behind.
	vanilla, _ := store.Create("Plain", "1.20.1", "Vanilla", "", "grass")
	if _, err := m.AddTo(context.Background(), vanilla, "pack"); err == nil || !strings.Contains(err.Error(), "no mod loader") {
		t.Errorf("vanilla: %v", err)
	}
	before := len(store.List())
	if _, _, err := m.Create(context.Background(), "pack", "", "grass", "1.21.1", ""); err == nil || len(store.List()) != before {
		t.Errorf("1.21.1: err=%v instances=%d", err, len(store.List()))
	}
}
