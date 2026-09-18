package loader

import (
	"context"
	"errors"
	"fmt"
	"strings"
)

// Fabric's and Quilt's metadata services; Quilt forked Fabric's, so the same
// three endpoints answer for both.
const (
	FabricMetaURL = "https://meta.fabricmc.net/v2"
	QuiltMetaURL  = "https://meta.quiltmc.org/v3"
)

// metaURL is the service behind a Fabric-family loader.
func metaURL(kind string) string {
	if kind == Quilt {
		return QuiltMetaURL
	}
	return FabricMetaURL
}

// fabricEntry is one row of Fabric meta's loader and game version lists.
type fabricEntry struct {
	Version string `json:"version"`
	Stable  bool   `json:"stable"`
}

// fabricOptions pairs every game version the loader knows with its newest
// stable build: the loader is game-version independent, only the
// intermediary mappings (fetched at install time) differ. Quilt's meta lists
// loaders without a stable flag; the first non-beta one is taken.
func (m *Manager) fabricOptions(ctx context.Context, kind string) ([]Option, error) {
	var loaders []fabricEntry
	if err := m.Client.GetJSON(ctx, metaURL(kind)+"/versions/loader", &loaders); err != nil {
		return nil, err
	}
	latest := ""
	for _, l := range loaders {
		if l.Stable || (kind == Quilt && !strings.Contains(l.Version, "-")) {
			latest = l.Version
			break
		}
	}
	if latest == "" && len(loaders) > 0 {
		latest = loaders[0].Version
	}
	if latest == "" {
		return nil, errors.New(strings.ToLower(kind) + " meta lists no loader versions")
	}
	var games []fabricEntry
	if err := m.Client.GetJSON(ctx, metaURL(kind)+"/versions/game", &games); err != nil {
		return nil, err
	}
	opts := make([]Option, 0, len(games))
	for _, g := range games {
		opts = append(opts, Option{Minecraft: g.Version, Version: latest, Label: latest})
	}
	return opts, nil
}

// installFabric fetches the launcher profile the meta service generates for
// the pair and stores it. Its libraries carry maven URLs and SHA-1s, so the
// regular installer downloads them like any other version.
func (m *Manager) installFabric(ctx context.Context, kind, id, mc, version string) error {
	url := fmt.Sprintf("%s/versions/loader/%s/%s/profile/json", metaURL(kind), mc, version)
	v, _, err := m.Client.FetchVersion(ctx, url)
	if err != nil {
		return fmt.Errorf("%s profile for %s: %w", strings.ToLower(kind), mc, err)
	}
	if v.InheritsFrom == "" {
		v.InheritsFrom = mc
	}
	m.progress(strings.ToLower(kind) + "-loader " + version)
	return m.writeProfile(id, v)
}
