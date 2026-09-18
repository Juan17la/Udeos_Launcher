package modinstall

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
	"time"

	"udeos/launcher/internal/instance"
	"udeos/launcher/internal/modsearch"
	"udeos/launcher/internal/paths"
)

// fakeProvider answers from fixed tables, keyed by project id.
type fakeProvider struct {
	projects map[string]modsearch.ProjectInfo
	versions map[string][]modsearch.Version // by project id
	byID     map[string]modsearch.Version
	err      error
}

func (f *fakeProvider) Name() string { return "Fake" }
func (f *fakeProvider) Search(context.Context, modsearch.Query) (modsearch.Page, error) {
	return modsearch.Page{}, nil
}
func (f *fakeProvider) GameVersions(context.Context) ([]modsearch.GameVersion, error) {
	return nil, nil
}
func (f *fakeProvider) Versions(_ context.Context, projectID, mc, ldr string) ([]modsearch.Version, error) {
	if f.err != nil {
		return nil, f.err
	}
	var out []modsearch.Version
	for _, v := range f.versions[projectID] {
		if (mc == "" || contains(v.GameVersions, mc)) && modsearch.LoaderMatches(v.Loaders, ldr) {
			out = append(out, v)
		}
	}
	return out, nil
}
func (f *fakeProvider) VersionByID(_ context.Context, id string) (modsearch.Version, error) {
	v, ok := f.byID[id]
	if !ok {
		return modsearch.Version{}, errors.New("no such version")
	}
	return v, nil
}
func (f *fakeProvider) Projects(_ context.Context, ids []string) ([]modsearch.ProjectInfo, error) {
	if f.err != nil {
		return nil, f.err
	}
	var out []modsearch.ProjectInfo
	for _, id := range ids {
		if p, ok := f.projects[id]; ok {
			out = append(out, p)
		}
	}
	return out, nil
}
func (f *fakeProvider) ProjectDetail(context.Context, string) (modsearch.ProjectDetail, error) {
	return modsearch.ProjectDetail{}, errors.New("not implemented")
}

func ver(id, project, mc, ldr string, deps ...modsearch.Dependency) modsearch.Version {
	return modsearch.Version{
		ID: id, ProjectID: project, VersionNumber: "1.0+" + mc, GameVersions: []string{mc}, Loaders: []string{ldr}, Type: "release",
		DatePublished: time.Now(), Files: []modsearch.File{{Filename: project + ".jar", URL: "http://x/" + project + ".jar", Primary: true}},
		Dependencies: deps,
	}
}

func fabricInstance(t *testing.T, dirs paths.Dirs) instance.Instance {
	t.Helper()
	store, err := instance.Open(dirs)
	if err != nil {
		t.Fatal(err)
	}
	inst, err := store.Create("Test", "1.20.1", "Fabric", "0.16.9", "grass")
	if err != nil {
		t.Fatal(err)
	}
	return inst
}

func newFake() *fakeProvider {
	f := &fakeProvider{
		projects: map[string]modsearch.ProjectInfo{
			"sodium": {ID: "sodium", Slug: "sodium", Title: "Sodium", ProjectType: modsearch.TypeMod},
			"iris":   {ID: "iris", Slug: "iris", Title: "Iris", ProjectType: modsearch.TypeMod},
			"fapi":   {ID: "fapi", Slug: "fabric-api", Title: "Fabric API", ProjectType: modsearch.TypeMod},
			"optif":  {ID: "optif", Slug: "optifine", Title: "OptiFine", ProjectType: modsearch.TypeMod},
			"modm":   {ID: "modm", Slug: "modmenu", Title: "Mod Menu", ProjectType: modsearch.TypeMod},
		},
		versions: map[string][]modsearch.Version{
			"sodium": {ver("sodium-1", "sodium", "1.20.1", "fabric", modsearch.Dependency{ProjectID: "optif", Type: modsearch.DepIncompatible}, modsearch.Dependency{ProjectID: "modm", Type: modsearch.DepOptional})},
			"iris":   {ver("iris-1", "iris", "1.20.1", "fabric", modsearch.Dependency{ProjectID: "sodium", Type: modsearch.DepRequired}, modsearch.Dependency{ProjectID: "fapi", Type: modsearch.DepRequired})},
			"fapi":   {ver("fapi-1", "fapi", "1.20.1", "fabric"), ver("fapi-2", "fapi", "1.21.1", "fabric")},
			"optif":  {ver("optif-1", "optif", "1.20.1", "forge")},
			"modm":   {ver("modm-1", "modm", "1.20.1", "fabric")},
		},
		byID: map[string]modsearch.Version{},
	}
	for _, vs := range f.versions {
		for _, v := range vs {
			f.byID[v.ID] = v
		}
	}
	return f
}

func TestPlanPullsRequiredDependencies(t *testing.T) {
	dirs := paths.FromRoot(t.TempDir())
	inst := fabricInstance(t, dirs)
	m := &Manager{Dirs: dirs, Provider: newFake()}
	plan, err := m.Plan(context.Background(), inst, "iris", modsearch.TypeMod)
	if err != nil {
		t.Fatal(err)
	}
	if len(plan.Items) != 3 || plan.Items[0].Version.ProjectID != "iris" {
		t.Fatalf("items: %+v", plan.Items)
	}
	got := map[string]string{}
	for _, it := range plan.Items[1:] {
		got[it.Title] = it.Reason
	}
	if got["Sodium"] != "Iris" || got["Fabric API"] != "Iris" {
		t.Errorf("reasons: %v", got)
	}
	// Fabric API's 1.21.1 build must not have been picked.
	for _, it := range plan.Items {
		if it.Version.ProjectID == "fapi" && it.Version.ID != "fapi-1" {
			t.Errorf("picked %s for Fabric API", it.Version.ID)
		}
	}
	if len(plan.Warnings) != 1 || !strings.Contains(plan.Warnings[0], "Mod Menu") {
		t.Errorf("warnings: %v", plan.Warnings)
	}
}

func TestPlanSkipsInstalledDependencyAndReportsAlreadyInstalled(t *testing.T) {
	dirs := paths.FromRoot(t.TempDir())
	inst := fabricInstance(t, dirs)
	m := &Manager{Dirs: dirs, Provider: newFake()}
	gameDir := dirs.GameDir(inst.ID)
	if err := os.WriteFile(filepath.Join(gameDir, "mods", "fapi.jar"), []byte("x"), 0o644); err != nil {
		t.Fatal(err)
	}
	if err := Append(dirs.ContentFile(inst.ID), []Entry{{ProjectID: "fapi", Title: "Fabric API", Type: "mod", File: "fapi.jar"}}); err != nil {
		t.Fatal(err)
	}
	plan, err := m.Plan(context.Background(), inst, "iris", modsearch.TypeMod)
	if err != nil {
		t.Fatal(err)
	}
	for _, it := range plan.Items {
		if it.Version.ProjectID == "fapi" {
			t.Error("Fabric API is installed and must not be planned again")
		}
	}
	plan, err = m.Plan(context.Background(), inst, "fapi", modsearch.TypeMod)
	if err != nil || !plan.AlreadyInstalled {
		t.Errorf("plan %+v err %v", plan, err)
	}
	// A manifest entry whose file was deleted by hand no longer counts.
	os.Remove(filepath.Join(gameDir, "mods", "fapi.jar"))
	plan, _ = m.Plan(context.Background(), inst, "fapi", modsearch.TypeMod)
	if plan.AlreadyInstalled {
		t.Error("deleted file still reported as installed")
	}
}

func TestPlanRefusesIncompatibleBothWays(t *testing.T) {
	dirs := paths.FromRoot(t.TempDir())
	inst := fabricInstance(t, dirs)
	fake := newFake()
	fake.versions["optif"] = []modsearch.Version{ver("optif-1", "optif", "1.20.1", "fabric")}
	m := &Manager{Dirs: dirs, Provider: fake}
	gameDir := dirs.GameDir(inst.ID)
	os.WriteFile(filepath.Join(gameDir, "mods", "optif.jar"), []byte("x"), 0o644)
	Append(dirs.ContentFile(inst.ID), []Entry{{ProjectID: "optif", Title: "OptiFine", Type: "mod", File: "optif.jar"}})
	_, err := m.Plan(context.Background(), inst, "sodium", modsearch.TypeMod)
	if err == nil || !strings.Contains(err.Error(), "incompatible with OptiFine") {
		t.Errorf("got %v", err)
	}
	// The other direction: Sodium installed (declaring OptiFine incompatible), OptiFine being added.
	os.Remove(filepath.Join(gameDir, "mods", "optif.jar"))
	os.WriteFile(filepath.Join(gameDir, "mods", "sodium.jar"), []byte("x"), 0o644)
	Append(dirs.ContentFile(inst.ID), []Entry{{ProjectID: "sodium", Title: "Sodium", Type: "mod", File: "sodium.jar", Incompatible: []string{"optif"}}})
	_, err = m.Plan(context.Background(), inst, "optif", modsearch.TypeMod)
	if err == nil || !strings.Contains(err.Error(), "incompatible with Sodium") {
		t.Errorf("got %v", err)
	}
}

func TestPlanValidatesVersionAndLoader(t *testing.T) {
	dirs := paths.FromRoot(t.TempDir())
	inst := fabricInstance(t, dirs)
	m := &Manager{Dirs: dirs, Provider: newFake()}
	_, err := m.Plan(context.Background(), inst, "optif", modsearch.TypeMod) // Forge-only
	if err == nil || !strings.Contains(err.Error(), "no build for Minecraft 1.20.1 with Fabric (its 1.20.1 builds are for forge)") {
		t.Errorf("got %v", err)
	}
	inst.Version = "1.19.2"
	_, err = m.Plan(context.Background(), inst, "sodium", modsearch.TypeMod)
	if err == nil || !strings.Contains(err.Error(), "1.19.2") {
		t.Errorf("got %v", err)
	}
	inst.Loader = "Vanilla"
	_, err = m.Plan(context.Background(), inst, "sodium", modsearch.TypeMod)
	if err == nil || !strings.Contains(err.Error(), "no mod loader") {
		t.Errorf("got %v", err)
	}
	_, err = m.Plan(context.Background(), inst, "sodium", modsearch.TypeModpack)
	if err == nil {
		t.Error("modpacks cannot be added to an instance")
	}
}

func TestPlanDependencyPinnedToWrongVersionFallsBack(t *testing.T) {
	dirs := paths.FromRoot(t.TempDir())
	inst := fabricInstance(t, dirs)
	fake := newFake()
	fake.versions["iris"] = []modsearch.Version{ver("iris-1", "iris", "1.20.1", "fabric", modsearch.Dependency{VersionID: "fapi-2", Type: modsearch.DepRequired})}
	m := &Manager{Dirs: dirs, Provider: fake}
	plan, err := m.Plan(context.Background(), inst, "iris", modsearch.TypeMod)
	if err != nil {
		t.Fatal(err)
	}
	if len(plan.Items) != 2 || plan.Items[1].Version.ID != "fapi-1" {
		t.Errorf("items: %+v", plan.Items)
	}
}

func fabricJar(t *testing.T) []byte {
	t.Helper()
	var buf bytes.Buffer
	zw := zip.NewWriter(&buf)
	w, _ := zw.Create("fabric.mod.json")
	w.Write([]byte(`{"id":"sodium"}`))
	zw.Close()
	return buf.Bytes()
}

func TestApplyDownloadsValidatesAndRecords(t *testing.T) {
	dirs := paths.FromRoot(t.TempDir())
	inst := fabricInstance(t, dirs)
	jar := fabricJar(t)
	sum := sha1.Sum(jar)
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if strings.HasSuffix(r.URL.Path, "/plain.jar") {
			w.Write([]byte("not a mod"))
			return
		}
		w.Write(jar)
	}))
	defer srv.Close()
	fake := newFake()
	good := ver("sodium-1", "sodium", "1.20.1", "fabric")
	good.Files = []modsearch.File{{Filename: "sodium.jar", URL: srv.URL + "/sodium.jar", SHA1: hex.EncodeToString(sum[:]), Size: int64(len(jar)), Primary: true}}
	fake.versions["sodium"] = []modsearch.Version{good}
	m := New(dirs, fake, nil)

	entries, err := m.Add(context.Background(), inst, "sodium", modsearch.TypeMod)
	if err != nil {
		t.Fatal(err)
	}
	if len(entries) != 1 || entries[0].File != "sodium.jar" || entries[0].VersionID != "sodium-1" {
		t.Fatalf("entries: %+v", entries)
	}
	if _, err := os.Stat(filepath.Join(dirs.GameDir(inst.ID), "mods", "sodium.jar")); err != nil {
		t.Error("mod not copied into mods/")
	}
	got, _ := m.InstalledProjects(inst)
	if len(got) != 1 || got[0] != "sodium" {
		t.Errorf("installed: %v", got)
	}
	// Second add is a no-op.
	entries, err = m.Add(context.Background(), inst, "sodium", modsearch.TypeMod)
	if err != nil || len(entries) != 0 {
		t.Errorf("re-add: %v %v", entries, err)
	}
	// Removing the file forgets it.
	if err := Forget(dirs.ContentFile(inst.ID), "mods", "sodium.jar"); err != nil {
		t.Fatal(err)
	}
	if left, _ := Load(dirs.ContentFile(inst.ID)); len(left) != 0 {
		t.Errorf("manifest after forget: %v", left)
	}

	// A download that is not really a mod for this loader is refused by the validator.
	bad := ver("modm-1", "modm", "1.20.1", "fabric")
	bad.Files = []modsearch.File{{Filename: "plain.jar", URL: srv.URL + "/plain.jar", Primary: true}}
	fake.versions["modm"] = []modsearch.Version{bad}
	_, err = m.Add(context.Background(), inst, "modm", modsearch.TypeMod)
	if err == nil || !strings.Contains(err.Error(), "not a Fabric mod") {
		t.Errorf("got %v", err)
	}
}
