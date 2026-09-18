package loader

import (
	"context"
	"path/filepath"
	"regexp"
	"sort"
	"strconv"

	"udeos/launcher/internal/download"
)

// NeoForge's maven and the version listing its API exposes for it.
const (
	NeoForgeMavenURL    = "https://maven.neoforged.net/releases/"
	NeoForgeVersionsURL = "https://maven.neoforged.net/api/maven/versions/releases/net/neoforged/neoforge"
)

// neoForgeStable matches release builds: "21.1.172". Betas carry a "-beta"
// suffix and the 1.20.1 era lived under net/neoforged/forge with Forge's
// numbering; neither is offered.
var neoForgeStable = regexp.MustCompile(`^(\d+)\.(\d+)\.(\d+)$`)

// neoForgeOptions picks the newest stable build per Minecraft version. The
// build number carries the game version: 21.1.172 is Minecraft 1.21.1, 21.0.x
// is 1.21 (Mojang drops the trailing .0).
func (m *Manager) neoForgeOptions(ctx context.Context) ([]Option, error) {
	var raw struct {
		Versions []string `json:"versions"`
	}
	if err := m.Client.GetJSON(ctx, NeoForgeVersionsURL, &raw); err != nil {
		return nil, err
	}
	latest := map[string]string{} // minecraft → build; the listing is oldest first
	for _, v := range raw.Versions {
		if mc := neoForgeMinecraft(v); mc != "" {
			latest[mc] = v
		}
	}
	opts := make([]Option, 0, len(latest))
	for mc, v := range latest {
		opts = append(opts, Option{Minecraft: mc, Version: v, Label: v})
	}
	sort.Slice(opts, func(i, j int) bool { return opts[i].Minecraft < opts[j].Minecraft })
	return opts, nil
}

// neoForgeMinecraft maps a stable build to its Minecraft version, "" for
// betas and other shapes.
func neoForgeMinecraft(build string) string {
	parts := neoForgeStable.FindStringSubmatch(build)
	if parts == nil {
		return ""
	}
	if minor, _ := strconv.Atoi(parts[2]); minor == 0 {
		return "1." + parts[1]
	}
	return "1." + parts[1] + "." + parts[2]
}

// neoForgeInstaller is the installer jar for a NeoForge build.
func neoForgeInstaller(version string) download.Task {
	name := "neoforge-" + version + "-installer.jar"
	return download.Task{URL: NeoForgeMavenURL + "net/neoforged/neoforge/" + version + "/" + name, Path: filepath.Join("neoforge", name)}
}
