package content

import (
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
