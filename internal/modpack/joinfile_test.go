package modpack

import (
	"archive/zip"
	"bytes"
	"context"
	"crypto/sha1"
	"encoding/hex"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"strings"
	"testing"

	"udeos/launcher/internal/instance"
	"udeos/launcher/internal/modsearch"
	"udeos/launcher/internal/paths"
	"udeos/launcher/internal/server"
)

// joinProvider knows the files of one server by hash.
type joinProvider struct {
	*fake
	byHash     map[string]modsearch.Version
	serverOnly map[string]bool
}

func (j joinProvider) VersionsByHashes(_ context.Context, sha1s []string) (map[string]modsearch.Version, error) {
	out := map[string]modsearch.Version{}
	for _, h := range sha1s {
		if v, ok := j.byHash[h]; ok {
			out[h] = v
		}
	}
	return out, nil
}
func (j joinProvider) Projects(_ context.Context, ids []string) ([]modsearch.ProjectInfo, error) {
	var out []modsearch.ProjectInfo
	for _, id := range ids {
		side := "required"
		if j.serverOnly[id] {
			side = "unsupported"
		}
		out = append(out, modsearch.ProjectInfo{ID: id, Title: strings.ToUpper(id[:1]) + id[1:], ClientSide: side})
	}
	return out, nil
}

func sha(b []byte) string { s := sha1.Sum(b); return hex.EncodeToString(s[:]) }

func TestJoinFileRoundTrip(t *testing.T) {
	sodium, lithium, custom, pack := []byte("sodium jar"), []byte("server only jar"), []byte("a jar nobody published"), []byte("pack zip")
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		switch r.URL.Path {
		case "/sodium.jar":
			w.Write(sodium)
		case "/pack.zip":
			w.Write(pack)
		default:
			http.NotFound(w, r)
		}
	}))
	defer srv.Close()

	dirs := paths.FromRoot(t.TempDir())
	store, _ := instance.Open(dirs)
	prov := joinProvider{fake: &fake{}, serverOnly: map[string]bool{"lithium": true}, byHash: map[string]modsearch.Version{
		sha(sodium):  {ID: "sodium-1", ProjectID: "sodium", VersionNumber: "0.5", Files: []modsearch.File{{URL: srv.URL + "/sodium.jar", SHA1: sha(sodium), Size: int64(len(sodium))}}},
		sha(lithium): {ID: "lithium-1", ProjectID: "lithium", VersionNumber: "1.0", Files: []modsearch.File{{URL: srv.URL + "/lithium.jar", SHA1: sha(lithium)}}},
	}}
	m := New(dirs, prov, store, nil)

	host, err := store.Create("Friends SMP", "1.20.1", "Fabric", "0.16.9", "grass")
	if err != nil {
		t.Fatal(err)
	}
	hostDir := dirs.GameDir(host.ID)
	for name, b := range map[string][]byte{"sodium.jar": sodium, "lithium.jar": lithium, "custom.jar": custom} {
		os.WriteFile(filepath.Join(hostDir, "mods", name), b, 0o644)
	}
	server.WriteProperties(hostDir, map[string]string{"resource-pack": srv.URL + "/pack.zip", "resource-pack-sha1": sha(pack)})

	var buf bytes.Buffer
	sum, err := m.ExportJoin(context.Background(), host, "friends.example.net:25570", &buf)
	if err != nil {
		t.Fatal(err)
	}
	if sum.References != 1 || sum.Embedded != 1 || !sum.HasAddress || sum.SizeBytes != int64(buf.Len()) {
		t.Errorf("summary: %+v", sum)
	}
	// The file references Sodium, leaves the server-only mod out and carries the unpublished jar.
	zr, _ := zip.NewReader(bytes.NewReader(buf.Bytes()), int64(buf.Len()))
	var names []string
	for _, f := range zr.File {
		names = append(names, f.Name)
	}
	joined := strings.Join(names, ",")
	if !strings.Contains(joined, "modrinth.index.json") || !strings.Contains(joined, "udeos.json") || !strings.Contains(joined, "overrides/mods/custom.jar") || strings.Contains(joined, "lithium") || strings.Contains(joined, "overrides/mods/sodium.jar") {
		t.Errorf("file contents: %v", names)
	}

	// A friend imports it: a new instance with everything in place.
	file := filepath.Join(t.TempDir(), "friends"+JoinExt)
	os.WriteFile(file, buf.Bytes(), 0o644)
	info, err := ReadJoin(file)
	if err != nil || info.Address != "friends.example.net:25570" || info.ResourcePack == nil {
		t.Fatalf("ReadJoin: %+v %v", info, err)
	}
	inst, _, err := m.CreateFromJoin(context.Background(), file, "", "grass")
	if err != nil {
		t.Fatal(err)
	}
	if inst.Name != "Friends SMP" || inst.Version != "1.20.1" || inst.Loader != "Fabric" || inst.LoaderVersion != "0.16.9" {
		t.Errorf("instance: %+v", inst)
	}
	game := dirs.GameDir(inst.ID)
	if got, _ := os.ReadFile(filepath.Join(game, "mods", "sodium.jar")); !bytes.Equal(got, sodium) {
		t.Error("sodium.jar not downloaded")
	}
	if got, _ := os.ReadFile(filepath.Join(game, "mods", "custom.jar")); !bytes.Equal(got, custom) {
		t.Error("the embedded jar is missing")
	}
	if _, err := os.Stat(filepath.Join(game, "mods", "lithium.jar")); err == nil {
		t.Error("a server-only mod was installed")
	}
	if _, err := os.Stat(filepath.Join(game, "servers.dat")); err != nil {
		t.Error("the server is not in the multiplayer list")
	}
	if got, _ := os.ReadFile(filepath.Join(game, "resourcepacks", "pack.zip")); !bytes.Equal(got, pack) {
		t.Error("the server's resource pack was not fetched")
	}

	// A plain modpack, or a Vanilla server, is not a join file.
	if _, err := ReadJoin(filepath.Join(t.TempDir(), "missing.udeos")); err == nil {
		t.Error("a missing file was accepted")
	}
	vanilla, _ := store.Create("Plain", "1.20.1", "Vanilla", "", "grass")
	if _, err := m.ExportJoin(context.Background(), vanilla, "", &bytes.Buffer{}); err == nil {
		t.Error("a Vanilla server produced a join file")
	}
}
