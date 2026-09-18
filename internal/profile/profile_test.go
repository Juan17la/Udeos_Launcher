package profile

import (
	"path/filepath"
	"strings"
	"testing"
)

func TestOfflineUUID(t *testing.T) {
	// Known value used by every offline-mode launcher and vanilla servers.
	got := OfflineUUID("Notch")
	want := "b50ad385-829d-3141-a216-7e7d7539ba7f"
	if got != want {
		t.Fatalf("OfflineUUID(Notch) = %s, want %s", got, want)
	}
}

func TestValidNickname(t *testing.T) {
	for name, ok := range map[string]bool{"Steve": true, "a_b_9": true, "ab": false, "has space": false, "toolongnickname123": false} {
		if ValidNickname(name) != ok {
			t.Errorf("ValidNickname(%q) = %v, want %v", name, !ok, ok)
		}
	}
}

func TestNicknamesKeepActiveFirstAndDedupe(t *testing.T) {
	path := filepath.Join(t.TempDir(), "profile.json")
	p, err := Save(path, Profile{Nickname: "Steve", Nicknames: []string{"Alex", "Steve", "bad name", "Alex", "Herobrine"}, Agreed: true})
	if err != nil {
		t.Fatal(err)
	}
	if got := strings.Join(p.Nicknames, ","); got != "Steve,Alex,Herobrine" {
		t.Errorf("nicknames: %s", got)
	}
	// Switching: the new active name leads, the old one stays available.
	p, _ = Save(path, Profile{Nickname: "Alex", Nicknames: p.Nicknames, Agreed: true})
	if got := strings.Join(p.Nicknames, ","); got != "Alex,Steve,Herobrine" || p.UUID != OfflineUUID("Alex") {
		t.Errorf("after switch: %s %s", got, p.UUID)
	}
}
