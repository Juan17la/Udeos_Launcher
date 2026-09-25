package server

import (
	"os"
	"path/filepath"
	"testing"
)

func TestPropertiesRoundTripKeepsOtherLines(t *testing.T) {
	dir := t.TempDir()
	orig := "#Minecraft server properties\nmotd=A Minecraft Server\npvp=true\nlevel-name=world\n"
	if err := os.WriteFile(filepath.Join(dir, PropertiesFile), []byte(orig), 0o644); err != nil {
		t.Fatal(err)
	}
	if err := WriteProperties(dir, map[string]string{"motd": "Cañón de Juan \\o/", "max-players": "8"}); err != nil {
		t.Fatal(err)
	}
	raw, _ := os.ReadFile(filepath.Join(dir, PropertiesFile))
	want := "#Minecraft server properties\nmotd=Ca\\u00f1\\u00f3n de Juan \\\\o/\npvp=true\nlevel-name=world\nmax-players=8\n"
	if string(raw) != want {
		t.Fatalf("file:\n%s\nwant:\n%s", raw, want)
	}
	p, err := ReadProperties(dir)
	if err != nil {
		t.Fatal(err)
	}
	if p["motd"] != "Cañón de Juan \\o/" || p["pvp"] != "true" || p["max-players"] != "8" {
		t.Fatalf("read back %v", p)
	}
}

func TestPlayerLists(t *testing.T) {
	dir := t.TempDir()
	must := func(err error) {
		t.Helper()
		if err != nil {
			t.Fatal(err)
		}
	}
	must(SetPlayer(dir, "ops", "Steve", "u1", true))
	must(SetPlayer(dir, "ops", "steve", "u1", true)) // same name, other case: no duplicate
	must(SetPlayer(dir, "ops", "Alex", "u2", true))
	names, err := Names(dir, "ops")
	must(err)
	if len(names) != 2 || names[0] != "Steve" || names[1] != "Alex" {
		t.Fatalf("ops = %v", names)
	}
	must(SetPlayer(dir, "ops", "STEVE", "", false))
	names, _ = Names(dir, "ops")
	if len(names) != 1 || names[0] != "Alex" {
		t.Fatalf("after remove ops = %v", names)
	}
	if c, _ := Command("banned", "Alex", false); c != "pardon Alex" {
		t.Fatalf("command = %q", c)
	}
	if _, err := Names(dir, "nope"); err == nil {
		t.Fatal("unknown list accepted")
	}
}
