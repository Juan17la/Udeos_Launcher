package rules

import (
	"testing"

	"udeos/launcher/internal/mojang"
)

func TestAllowed(t *testing.T) {
	linux := Env{OS: "linux", Arch: "x86_64"}
	osx := Env{OS: "osx", Arch: "x86_64"}

	onlyOSX := []mojang.Rule{{Action: "allow", OS: &mojang.OSRule{Name: "osx"}}}
	if Allowed(onlyOSX, linux) || !Allowed(onlyOSX, osx) {
		t.Error("allow-osx rule evaluated wrongly")
	}

	notOSX := []mojang.Rule{{Action: "allow"}, {Action: "disallow", OS: &mojang.OSRule{Name: "osx"}}}
	if !Allowed(notOSX, linux) || Allowed(notOSX, osx) {
		t.Error("allow-all-but-osx rule evaluated wrongly")
	}

	demo := []mojang.Rule{{Action: "allow", Features: map[string]bool{"is_demo_user": true}}}
	if Allowed(demo, linux) {
		t.Error("feature rule should not match when feature is off")
	}
	if len(Current().OS) == 0 {
		t.Error("Current() must resolve an OS")
	}
}
