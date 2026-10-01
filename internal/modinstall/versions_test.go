package modinstall

import (
	"context"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"strings"
	"testing"

	"udeos/launcher/internal/modsearch"
	"udeos/launcher/internal/paths"
)

// install records an installed mod: its file on disk and its manifest entry.
func install(t *testing.T, dirs paths.Dirs, instID string, e Entry) {
	t.Helper()
	if err := os.WriteFile(filepath.Join(dirs.GameDir(instID), "mods", e.File), []byte("x"), 0o644); err != nil {
		t.Fatal(err)
	}
	e.Type = "mod"
	if err := Append(dirs.ContentFile(instID), []Entry{e}); err != nil {
		t.Fatal(err)
	}
}

// index refreshes the by-id table after a test swapped a project's versions.
func index(f *fakeProvider) {
	for _, vs := range f.versions {
		for _, v := range vs {
			f.byID[v.ID] = v
		}
	}
}

// A dependency that names a version is incompatible with that release only.
func TestPinnedIncompatibilityOnlyHitsThatVersion(t *testing.T) {
	dirs := paths.FromRoot(t.TempDir())
	inst := fabricInstance(t, dirs)
	fake := newFake()
	fake.versions["optif"] = []modsearch.Version{ver("optif-1", "optif", "1.20.1", "fabric"), ver("optif-2", "optif", "1.20.1", "fabric")}
	fake.versions["sodium"] = []modsearch.Version{ver("sodium-1", "sodium", "1.20.1", "fabric", modsearch.Dependency{ProjectID: "optif", VersionID: "optif-2", Type: modsearch.DepIncompatible})}
	index(fake)
	m := &Manager{Dirs: dirs, Provider: fake}

	install(t, dirs, inst.ID, Entry{ProjectID: "optif", VersionID: "optif-1", Title: "OptiFine", File: "optif.jar"})
	if _, err := m.Plan(context.Background(), inst, "sodium", modsearch.TypeMod); err != nil {
		t.Fatalf("release optif-1 is not the pinned one, yet: %v", err)
	}
	install(t, dirs, inst.ID, Entry{ProjectID: "optif", VersionID: "optif-2", Title: "OptiFine", File: "optif.jar"})
	_, err := m.Plan(context.Background(), inst, "sodium", modsearch.TypeMod)
	if err == nil || !strings.Contains(err.Error(), "incompatible with OptiFine") {
		t.Errorf("pinned release installed: got %v", err)
	}
}

// The other direction: what an installed mod pinned as incompatible is refused too.
func TestInstalledPinnedIncompatibilityRefusesThatRelease(t *testing.T) {
	dirs := paths.FromRoot(t.TempDir())
	inst := fabricInstance(t, dirs)
	fake := newFake()
	fake.versions["optif"] = []modsearch.Version{ver("optif-1", "optif", "1.20.1", "fabric"), ver("optif-2", "optif", "1.20.1", "fabric")}
	index(fake)
	m := &Manager{Dirs: dirs, Provider: fake}
	install(t, dirs, inst.ID, Entry{ProjectID: "sodium", VersionID: "sodium-1", Title: "Sodium", File: "sodium.jar", IncompatibleVersions: []string{"optif-1", "optif-2"}})
	_, err := m.PlanVersion(context.Background(), inst, "optif", modsearch.TypeMod, "optif-2")
	if err == nil || !strings.Contains(err.Error(), "incompatible with Sodium") {
		t.Errorf("got %v", err)
	}
}

func TestPlanVersionReplacesTheInstalledOne(t *testing.T) {
	dirs := paths.FromRoot(t.TempDir())
	inst := fabricInstance(t, dirs)
	fake := newFake()
	fake.versions["sodium"] = []modsearch.Version{ver("sodium-2", "sodium", "1.20.1", "fabric"), ver("sodium-1", "sodium", "1.20.1", "fabric")}
	fake.byID["sodium-1"], fake.byID["sodium-2"] = fake.versions["sodium"][1], fake.versions["sodium"][0]
	fake.byID["iris-1"] = fake.versions["iris"][0]
	m := &Manager{Dirs: dirs, Provider: fake}
	install(t, dirs, inst.ID, Entry{ProjectID: "sodium", VersionID: "sodium-1", Title: "Sodium", File: "sodium-old.jar"})

	plan, err := m.PlanVersion(context.Background(), inst, "sodium", modsearch.TypeMod, "sodium-2")
	if err != nil {
		t.Fatal(err)
	}
	if plan.AlreadyInstalled || plan.Replace != "sodium-old.jar" || len(plan.Items) != 1 || plan.Items[0].Version.ID != "sodium-2" {
		t.Errorf("plan: %+v", plan)
	}
	// Asking for the release that is already there changes nothing.
	plan, err = m.PlanVersion(context.Background(), inst, "sodium", modsearch.TypeMod, "sodium-1")
	if err != nil || !plan.AlreadyInstalled {
		t.Errorf("same release: %+v %v", plan, err)
	}
	// A release of another project, or one that does not run here, is refused.
	if _, err := m.PlanVersion(context.Background(), inst, "sodium", modsearch.TypeMod, "iris-1"); err == nil {
		t.Error("a version of another project was accepted")
	}
	other := ver("sodium-3", "sodium", "1.21.1", "fabric")
	fake.byID["sodium-3"] = other
	if _, err := m.PlanVersion(context.Background(), inst, "sodium", modsearch.TypeMod, "sodium-3"); err == nil || !strings.Contains(err.Error(), "no build for Minecraft 1.20.1") {
		t.Errorf("wrong game version: %v", err)
	}
}

func TestVersionsMarkInstalledAndConflicts(t *testing.T) {
	dirs := paths.FromRoot(t.TempDir())
	inst := fabricInstance(t, dirs)
	fake := newFake()
	fake.versions["sodium"] = []modsearch.Version{
		ver("sodium-3", "sodium", "1.20.1", "fabric", modsearch.Dependency{ProjectID: "optif", Type: modsearch.DepIncompatible}),
		ver("sodium-2", "sodium", "1.20.1", "fabric"),
		ver("sodium-0", "sodium", "1.19.2", "fabric"), // other game version: not listed
		ver("sodium-f", "sodium", "1.20.1", "forge"),  // other loader: not listed
	}
	m := &Manager{Dirs: dirs, Provider: fake}
	install(t, dirs, inst.ID, Entry{ProjectID: "optif", VersionID: "optif-1", Title: "OptiFine", File: "optif.jar"})

	got, err := m.Versions(context.Background(), inst, "sodium", modsearch.TypeMod)
	if err != nil {
		t.Fatal(err)
	}
	if len(got) != 2 || got[0].ID != "sodium-3" || got[0].ConflictWith != "OptiFine" || got[1].ID != "sodium-2" || got[1].ConflictWith != "" {
		t.Errorf("versions: %+v", got)
	}
}

func TestAlternativesOffersOtherReleasesFirst(t *testing.T) {
	dirs := paths.FromRoot(t.TempDir())
	inst := fabricInstance(t, dirs)
	fake := newFake()
	fake.versions["sodium"] = []modsearch.Version{
		ver("sodium-3", "sodium", "1.20.1", "fabric", modsearch.Dependency{ProjectID: "optif", Type: modsearch.DepIncompatible}),
		ver("sodium-2", "sodium", "1.20.1", "fabric"),
	}
	m := &Manager{Dirs: dirs, Provider: fake}
	install(t, dirs, inst.ID, Entry{ProjectID: "optif", VersionID: "optif-1", Title: "OptiFine", File: "optif.jar"})

	alt, err := m.Alternatives(context.Background(), inst, "sodium", modsearch.TypeMod)
	if err != nil {
		t.Fatal(err)
	}
	if len(alt.Versions) != 1 || alt.Versions[0].ID != "sodium-2" || len(alt.Similar) != 0 {
		t.Errorf("alternatives: %+v", alt)
	}
}

// similarProvider adds a category search on top of the fake tables.
type similarProvider struct{ *fakeProvider }

func (similarProvider) ProjectDetail(context.Context, string) (modsearch.ProjectDetail, error) {
	return modsearch.ProjectDetail{ID: "sodium", Categories: []string{"fabric", "optimization"}}, nil
}
func (similarProvider) Search(_ context.Context, q modsearch.Query) (modsearch.Page, error) {
	if len(q.Categories) != 1 || q.Categories[0] != "optimization" {
		return modsearch.Page{}, nil // the loader tag is not a topic
	}
	return modsearch.Page{Results: []modsearch.Result{{ID: "sodium", Title: "Sodium"}, {ID: "iris", Title: "Iris"}, {ID: "modm", Title: "Mod Menu"}}}, nil
}

func TestAlternativesFallBackToSimilarProjectsThatFit(t *testing.T) {
	dirs := paths.FromRoot(t.TempDir())
	inst := fabricInstance(t, dirs)
	fake := newFake()
	// Every release of Sodium clashes with the installed OptiFine.
	fake.versions["sodium"] = []modsearch.Version{ver("sodium-3", "sodium", "1.20.1", "fabric", modsearch.Dependency{ProjectID: "optif", Type: modsearch.DepIncompatible})}
	// Iris needs Sodium (which would clash): it must not be offered. Mod Menu has no such problem.
	iris := fake.versions["iris"][0]
	iris.Dependencies = []modsearch.Dependency{{ProjectID: "optif", Type: modsearch.DepIncompatible}}
	fake.versions["iris"] = []modsearch.Version{iris}
	m := &Manager{Dirs: dirs, Provider: similarProvider{fake}}
	install(t, dirs, inst.ID, Entry{ProjectID: "optif", VersionID: "optif-1", Title: "OptiFine", File: "optif.jar"})

	alt, err := m.Alternatives(context.Background(), inst, "sodium", modsearch.TypeMod)
	if err != nil {
		t.Fatal(err)
	}
	if len(alt.Versions) != 0 || len(alt.Similar) != 1 || alt.Similar[0].ID != "modm" {
		t.Errorf("alternatives: versions=%+v similar=%+v", alt.Versions, alt.Similar)
	}
}

// Picking another release installs it and takes the old file out.
func TestAddVersionReplacesTheOldFile(t *testing.T) {
	dirs := paths.FromRoot(t.TempDir())
	inst := fabricInstance(t, dirs)
	jar := fabricJar(t)
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) { w.Write(jar) }))
	defer srv.Close()
	fake := newFake()
	v1 := ver("sodium-1", "sodium", "1.20.1", "fabric")
	v1.Files = []modsearch.File{{Filename: "sodium-1.jar", URL: srv.URL + "/sodium-1.jar", Primary: true}}
	v2 := ver("sodium-2", "sodium", "1.20.1", "fabric")
	v2.Files = []modsearch.File{{Filename: "sodium-2.jar", URL: srv.URL + "/sodium-2.jar", Primary: true}}
	fake.versions["sodium"] = []modsearch.Version{v2, v1}
	index(fake)
	m := New(dirs, fake, nil)
	ctx := context.Background()

	if _, err := m.AddVersion(ctx, inst, "sodium", modsearch.TypeMod, "sodium-1"); err != nil {
		t.Fatal(err)
	}
	if _, err := m.AddVersion(ctx, inst, "sodium", modsearch.TypeMod, "sodium-2"); err != nil {
		t.Fatal(err)
	}
	mods := filepath.Join(dirs.GameDir(inst.ID), "mods")
	if _, err := os.Stat(filepath.Join(mods, "sodium-2.jar")); err != nil {
		t.Error("the chosen release is not in mods/")
	}
	if _, err := os.Stat(filepath.Join(mods, "sodium-1.jar")); err == nil {
		t.Error("the old release is still in mods/")
	}
	entries, _ := Load(dirs.ContentFile(inst.ID))
	if len(entries) != 1 || entries[0].VersionID != "sodium-2" {
		t.Errorf("manifest: %+v", entries)
	}
}
