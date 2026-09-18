package loader

import (
	"archive/zip"
	"encoding/json"
	"os"
	"path/filepath"
	"testing"

	"udeos/launcher/internal/mojang"
	"udeos/launcher/internal/paths"
)

func TestProfileIDAndLabel(t *testing.T) {
	if id, _ := ProfileID(Fabric, "1.21.1", "0.16.9"); id != "fabric-loader-0.16.9-1.21.1" {
		t.Error(id)
	}
	if id, _ := ProfileID(Forge, "1.20.1", "1.20.1-47.4.10"); id != "forge-1.20.1-47.4.10" {
		t.Error(id)
	}
	if id, _ := ProfileID(NeoForge, "1.21.1", "21.1.172"); id != "neoforge-1.21.1-21.1.172" {
		t.Error(id)
	}
	if _, err := ProfileID("OptiFine", "1.20.1", "x"); err == nil {
		t.Error("expected error for unknown loader")
	}
	for full, want := range map[string]string{"1.20.1-47.4.10": "47.4.10", "1.7.10-10.13.4.1614-1.7.10": "10.13.4.1614"} {
		mc := full[:len("1.20.1")]
		if full[:6] == "1.7.10" {
			mc = "1.7.10"
		}
		if got := Label(Forge, mc, full); got != want {
			t.Errorf("Label(%s) = %s, want %s", full, got, want)
		}
	}
	if Label(Fabric, "1.21.1", "0.16.9") != "0.16.9" {
		t.Error("fabric label")
	}
}

func TestNeoForgeMinecraft(t *testing.T) {
	for build, want := range map[string]string{"21.1.172": "1.21.1", "21.0.167": "1.21", "20.4.251": "1.20.4", "21.11.45": "1.21.11", "21.1.180-beta": "", "0.25w14craftmine.3-beta": "", "26.3.0.6-beta": ""} {
		if got := neoForgeMinecraft(build); got != want {
			t.Errorf("neoForgeMinecraft(%s) = %q, want %q", build, got, want)
		}
	}
}

func TestForgeHasInstaller(t *testing.T) {
	for mc, want := range map[string]bool{"1.1": false, "1.4.7": false, "1.5": false, "1.5.2": true, "1.7.10": true, "1.12.2": true, "1.20.1": true, "26.2": true, "1.20.1-rc1": true, "foo": false} {
		if got := forgeHasInstaller(mc); got != want {
			t.Errorf("forgeHasInstaller(%s) = %v", mc, got)
		}
	}
}

func TestForgeOutputs(t *testing.T) {
	profile := &installProfile{Data: map[string]struct {
		Client string `json:"client"`
	}{"PATCHED": {Client: "[net.minecraftforge:forge:1.20.1-47.4.10:client]"}, "BINPATCH": {Client: "/data/client.lzma"}}}
	v := &mojang.Version{Libraries: []mojang.Library{
		{Name: "a:b:1", Downloads: &mojang.LibraryDownloads{Artifact: &mojang.Artifact{Path: "a/b/1/b-1.jar", URL: ""}}},
		{Name: "c:d:1", Downloads: &mojang.LibraryDownloads{Artifact: &mojang.Artifact{Path: "c/d/1/d-1.jar", URL: "https://x"}}},
	}}
	got := forgeOutputs(profile, v)
	want := []string{"net/minecraftforge/forge/1.20.1-47.4.10/forge-1.20.1-47.4.10-client.jar", "a/b/1/b-1.jar"}
	if len(got) != 2 || got[0] != want[0] || got[1] != want[1] {
		t.Errorf("got %v, want %v", got, want)
	}
}

// A legacy installer is just a jar with install_profile.json and the universal jar inside.
func TestInstallLegacyForge(t *testing.T) {
	root := t.TempDir()
	dirs := paths.FromRoot(root)
	jar := filepath.Join(root, "installer.jar")
	f, err := os.Create(jar)
	if err != nil {
		t.Fatal(err)
	}
	zw := zip.NewWriter(f)
	w, _ := zw.Create("install_profile.json")
	w.Write([]byte(`{"install":{"path":"net.minecraftforge:forge:1.7.10-10.13.4.1614-1.7.10","filePath":"forge-universal.jar","minecraft":"1.7.10"},
		"versionInfo":{"id":"1.7.10-Forge10.13.4.1614-1.7.10","inheritsFrom":"1.7.10","jar":"1.7.10","mainClass":"net.minecraft.launchwrapper.Launch",
		"minecraftArguments":"--tweakClass cpw.mods.fml.common.launcher.FMLTweaker",
		"libraries":[{"name":"net.minecraftforge:forge:1.7.10-10.13.4.1614-1.7.10","url":"http://files.minecraftforge.net/maven/"},{"name":"net.minecraft:launchwrapper:1.12","serverreq":true}]}}`))
	w, _ = zw.Create("forge-universal.jar")
	w.Write([]byte("universal"))
	zw.Close()
	f.Close()

	m := New(dirs, nil)
	profile, err := readJSONEntry[installProfile](jar, "install_profile.json")
	if err != nil {
		t.Fatal(err)
	}
	if err := m.installLegacyForge("forge-1.7.10-10.13.4.1614-1.7.10", "1.7.10", jar, profile); err != nil {
		t.Fatal(err)
	}
	universal := filepath.Join(dirs.Libraries, "net", "minecraftforge", "forge", "1.7.10-10.13.4.1614-1.7.10", "forge-1.7.10-10.13.4.1614-1.7.10.jar")
	if raw, err := os.ReadFile(universal); err != nil || string(raw) != "universal" {
		t.Errorf("universal jar not extracted: %v", err)
	}
	raw, err := os.ReadFile(dirs.VersionJSON("forge-1.7.10-10.13.4.1614-1.7.10"))
	if err != nil {
		t.Fatal(err)
	}
	var v mojang.Version
	if err := json.Unmarshal(raw, &v); err != nil {
		t.Fatal(err)
	}
	if v.ID != "forge-1.7.10-10.13.4.1614-1.7.10" || v.InheritsFrom != "1.7.10" || v.Jar != "1.7.10" || v.MainClass != "net.minecraft.launchwrapper.Launch" {
		t.Errorf("%+v", v)
	}
	if v.Libraries[0].URL != ForgeMavenURL {
		t.Errorf("dead maven host not rewritten: %s", v.Libraries[0].URL)
	}
	if !m.IsInstalled(Forge, "1.7.10", "1.7.10-10.13.4.1614-1.7.10") {
		t.Error("IsInstalled should be true after writing the profile")
	}
}
