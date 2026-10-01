package content

import (
	"bufio"
	"bytes"
	"os"
	"path/filepath"
	"testing"
)

func TestWriteServersDatRoundTrip(t *testing.T) {
	dir := t.TempDir()
	if err := WriteServersDat(dir, "Friends SMP", "friends.example.net:25570"); err != nil {
		t.Fatal(err)
	}
	raw, err := os.ReadFile(filepath.Join(dir, "servers.dat"))
	if err != nil {
		t.Fatal(err)
	}
	r := bufio.NewReader(bytes.NewReader(raw))
	if typ, _ := r.ReadByte(); typ != tagCompound {
		t.Fatal("root is not a compound")
	}
	if _, err := readString(r); err != nil {
		t.Fatal(err)
	}
	v, err := readPayload(r, tagCompound)
	if err != nil {
		t.Fatal(err)
	}
	list, _ := v.(map[string]any)["servers"].([]any)
	if len(list) != 1 {
		t.Fatalf("servers: %v", v)
	}
	s := list[0].(map[string]any)
	if s["name"] != "Friends SMP" || s["ip"] != "friends.example.net:25570" {
		t.Errorf("server: %v", s)
	}
	// The player's own list is never overwritten.
	if err := WriteServersDat(dir, "Other", "other:1"); err != nil {
		t.Fatal(err)
	}
	again, _ := os.ReadFile(filepath.Join(dir, "servers.dat"))
	if !bytes.Equal(raw, again) {
		t.Error("an existing servers.dat was overwritten")
	}
}
