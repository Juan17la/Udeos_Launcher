// Package rules evaluates the allow/disallow rules Mojang attaches to
// libraries and launch arguments so only the entries for this OS are used.
package rules

import (
	"runtime"

	"udeos/launcher/internal/mojang"
)

// Env is what rules are matched against.
type Env struct {
	OS       string // windows | linux | osx
	Arch     string // x86 | x86_64 | arm64
	Features map[string]bool
}

// Current describes the machine the launcher runs on. No optional launcher
// feature (demo mode, custom resolution, quick play) is enabled.
func Current() Env {
	e := Env{Features: map[string]bool{}}
	switch runtime.GOOS {
	case "windows":
		e.OS = "windows"
	case "darwin":
		e.OS = "osx"
	default:
		e.OS = "linux"
	}
	switch runtime.GOARCH {
	case "amd64":
		e.Arch = "x86_64"
	case "386":
		e.Arch = "x86"
	case "arm64":
		e.Arch = "arm64"
	default:
		e.Arch = runtime.GOARCH
	}
	return e
}

// NativeKey is the key used in the old-style "natives" map (windows/linux/osx).
func (e Env) NativeKey() string { return e.OS }

// Allowed applies the rules in order. With no rules everything is allowed;
// with rules, the default is "disallow" and each matching rule overrides it.
func Allowed(rules []mojang.Rule, env Env) bool {
	if len(rules) == 0 {
		return true
	}
	allowed := false
	for _, r := range rules {
		if !matches(r, env) {
			continue
		}
		allowed = r.Action == "allow"
	}
	return allowed
}

func matches(r mojang.Rule, env Env) bool {
	if r.OS != nil {
		if r.OS.Name != "" && r.OS.Name != env.OS {
			return false
		}
		if r.OS.Arch != "" && r.OS.Arch != env.Arch {
			return false
		}
		// OS version regexes (e.g. "^10\\.") only gate cosmetic JVM flags; we
		// cannot evaluate them portably, so they are treated as not matching.
		if r.OS.Version != "" {
			return false
		}
	}
	for name, want := range r.Features {
		if env.Features[name] != want {
			return false
		}
	}
	return true
}
