package instance

import (
	"testing"

	"udeos/launcher/internal/paths"
)

func TestAdoptClaimsUnownedAndRemovedProfiles(t *testing.T) {
	dirs := paths.FromRoot(t.TempDir())
	if err := dirs.EnsureAll(); err != nil {
		t.Fatal(err)
	}
	s, err := Open(dirs)
	if err != nil {
		t.Fatal(err)
	}
	a, _ := s.Create("A", "1.21.1", "", "", "")
	if err := s.Adopt("Steve"); err != nil {
		t.Fatal(err)
	}
	b, _ := s.Create("B", "1.21.1", "", "", "")
	if err := s.Adopt("Alex"); err != nil { // B is unclaimed, A stays Steve's
		t.Fatal(err)
	}
	owner := func(id string) string { it, _ := s.Get(id); return it.Owner }
	if owner(a.ID) != "Steve" || owner(b.ID) != "Alex" {
		t.Fatalf("owners = %q, %q", owner(a.ID), owner(b.ID))
	}
	if err := s.Adopt("Alex", "Steve"); err != nil { // Steve removed
		t.Fatal(err)
	}
	if owner(a.ID) != "Alex" {
		t.Fatalf("A not moved to Alex: %q", owner(a.ID))
	}
	// Reopening reads the owners back from instances.json.
	if s2, _ := Open(dirs); len(s2.items) != 2 || s2.items[0].Owner != "Alex" {
		t.Fatalf("not persisted: %+v", s2.items)
	}
}
