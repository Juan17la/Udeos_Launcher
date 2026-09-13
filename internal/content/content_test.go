package content

import (
	"archive/zip"
	"compress/gzip"
	"os"
	"path/filepath"
	"testing"
)

func TestWorldsFromRealSave(t *testing.T) {
	// Uses a world created by the game during manual testing when available.
	home := os.Getenv("UDEOS_HOME")
	if home == "" {
		t.Skip("UDEOS_HOME not set")
	}
	matches, _ := filepath.Glob(filepath.Join(home, "instances", "*", ".minecraft", "saves", "*", "level.dat"))
	if len(matches) == 0 {
		t.Skip("no saves to read")
	}
	worlds, err := ListWorlds(filepath.Dir(filepath.Dir(filepath.Dir(matches[0]))))
	if err != nil || len(worlds) == 0 {
		t.Fatalf("ListWorlds: %v %v", worlds, err)
	}
	t.Logf("%+v", worlds[0])
}

func TestListFilesMissingDir(t *testing.T) {
	out, err := ListFiles(t.TempDir(), "screenshots", ".png")
	if err != nil || len(out) != 0 {
		t.Fatalf("expected empty list, got %v %v", out, err)
	}
}

// writeLevelDat builds a tiny gzipped NBT file: {Data:{LevelName:"Hello World", LastPlayed:1700000000000}}.
func writeLevelDat(t *testing.T, path string) {
	t.Helper()
	var b []byte
	str := func(s string) []byte { return append([]byte{byte(len(s) >> 8), byte(len(s))}, s...) }
	b = append(b, tagCompound)
	b = append(b, str("")...)
	b = append(b, tagCompound)
	b = append(b, str("Data")...)
	b = append(b, tagString)
	b = append(b, str("LevelName")...)
	b = append(b, str("Hello World")...)
	b = append(b, tagLong)
	b = append(b, str("LastPlayed")...)
	b = append(b, 0x00, 0x00, 0x01, 0x8b, 0xcf, 0xe5, 0x68, 0x00) // 1700000000000
	b = append(b, tagEnd, tagEnd)
	if err := os.MkdirAll(filepath.Dir(path), 0o755); err != nil {
		t.Fatal(err)
	}
	f, err := os.Create(path)
	if err != nil {
		t.Fatal(err)
	}
	gz := gzip.NewWriter(f)
	gz.Write(b)
	gz.Close()
	f.Close()
}

func TestListWorldsParsesLevelDat(t *testing.T) {
	game := t.TempDir()
	writeLevelDat(t, filepath.Join(game, "saves", "myworld", "level.dat"))
	worlds, err := ListWorlds(game)
	if err != nil || len(worlds) != 1 {
		t.Fatalf("ListWorlds = %v, %v", worlds, err)
	}
	if worlds[0].Name != "Hello World" || worlds[0].Folder != "myworld" || worlds[0].LastPlayed.UnixMilli() != 1700000000000 {
		t.Fatalf("unexpected world %+v", worlds[0])
	}
	dst := filepath.Join(t.TempDir(), "out.zip")
	if err := ExportWorld(game, "myworld", dst); err != nil {
		t.Fatal(err)
	}
	if st, err := os.Stat(dst); err != nil || st.Size() == 0 {
		t.Fatal("zip not written")
	}
}

func TestAddWorldFromFolder(t *testing.T) {
	game, src := t.TempDir(), filepath.Join(t.TempDir(), "My World")
	writeLevelDat(t, filepath.Join(src, "level.dat"))
	os.WriteFile(filepath.Join(src, "region.mca"), []byte("x"), 0o644)
	w, err := AddWorld(game, src)
	if err != nil || w.Folder != "My World" || w.Name != "Hello World" {
		t.Fatalf("AddWorld: %+v %v", w, err)
	}
	// Same name again gets a suffix instead of overwriting.
	w2, err := AddWorld(game, src)
	if err != nil || w2.Folder != "My World (2)" {
		t.Fatalf("second import: %+v %v", w2, err)
	}
	if _, err := AddWorld(game, t.TempDir()); err != ErrNotWorld {
		t.Fatalf("folder without level.dat: %v", err)
	}
	if err := RemoveWorld(game, "My World (2)"); err != nil {
		t.Fatal(err)
	}
	worlds, _ := ListWorlds(game)
	if len(worlds) != 1 {
		t.Fatalf("want 1 world after remove, got %d", len(worlds))
	}
}

func TestAddWorldFromZip(t *testing.T) {
	game := t.TempDir()
	src := filepath.Join(t.TempDir(), "Skyline")
	writeLevelDat(t, filepath.Join(src, "level.dat"))
	os.MkdirAll(filepath.Join(src, "region"), 0o755)
	os.WriteFile(filepath.Join(src, "region", "r.0.0.mca"), []byte("x"), 0o644)

	nested := filepath.Join(t.TempDir(), "backup.zip") // Skyline/level.dat inside
	if err := zipDir(src, nested, "Skyline"); err != nil {
		t.Fatal(err)
	}
	w, err := AddWorld(game, nested)
	if err != nil || w.Folder != "Skyline" {
		t.Fatalf("nested zip: %+v %v", w, err)
	}
	if _, err := os.Stat(filepath.Join(game, "saves", "Skyline", "region", "r.0.0.mca")); err != nil {
		t.Fatal("region file missing after import")
	}

	flat := filepath.Join(t.TempDir(), "Flat World.zip") // level.dat at the root
	if err := zipDir(src, flat, ""); err != nil {
		t.Fatal(err)
	}
	w, err = AddWorld(game, flat)
	if err != nil || w.Folder != "Flat World" {
		t.Fatalf("flat zip: %+v %v", w, err)
	}

	bad := filepath.Join(t.TempDir(), "bad.zip")
	f, _ := os.Create(bad)
	zw := zip.NewWriter(f)
	e, _ := zw.Create("level.dat")
	e.Write([]byte("x"))
	e, _ = zw.Create("../escape.txt")
	e.Write([]byte("x"))
	zw.Close()
	f.Close()
	if _, err := AddWorld(game, bad); err == nil {
		t.Fatal("zip-slip entry must be rejected")
	}
	if _, err := os.Stat(filepath.Join(game, "escape.txt")); err == nil {
		t.Fatal("zip-slip file was written")
	}

	notWorld := filepath.Join(t.TempDir(), "pack.zip")
	f, _ = os.Create(notWorld)
	zw = zip.NewWriter(f)
	e, _ = zw.Create("pack.mcmeta")
	e.Write([]byte("{}"))
	zw.Close()
	f.Close()
	if _, err := AddWorld(game, notWorld); err != ErrNotWorld {
		t.Fatalf("zip without level.dat: %v", err)
	}
}
