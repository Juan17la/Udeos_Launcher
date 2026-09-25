package server

import (
	"net"
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

func TestAddressNames(t *testing.T) {
	for in, want := range map[string]string{
		"Friends SMP":    "udeoslauncher.friends-smp",
		"  Ñandú  2b2t!": "udeoslauncher.and-2b2t",
		"1234":           "udeoslauncher.server", // all digits is not a usable label
		"":               "udeoslauncher.server",
	} {
		if got := DefaultAddressName(in); got != want {
			t.Errorf("DefaultAddressName(%q) = %q, want %q", in, got, want)
		}
	}
	for name, ok := range map[string]bool{"udeoslauncher.friends-smp": true, "juan": true, "a1.b2": true,
		"Juan": false, "-x": false, "x-": false, "a..b": false, "12.34": false, "ok.34": false, "has space": false} {
		if ValidAddressName(name) != ok {
			t.Errorf("ValidAddressName(%q) != %v", name, ok)
		}
	}
	ip := net.ParseIP("159.223.171.199")
	if got := PublicAddress("udeoslauncher.friends-smp", ip, 41234); got != "udeoslauncher.friends-smp.159-223-171-199.nip.io:41234" {
		t.Errorf("relay address = %q", got)
	}
	if got := PublicAddress("juan", ip, 25565); got != "juan.159-223-171-199.nip.io" {
		t.Errorf("default port address = %q", got)
	}
	if got := PublicAddress("juan", net.ParseIP("2001:db8::1"), 25565); got != "[2001:db8::1]:25565" {
		t.Errorf("ipv6 address = %q", got)
	}
}
