package profile

import "testing"

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
