package loader

import (
	"context"
	"errors"
	"fmt"
)

// FabricMetaURL is Fabric's public metadata service.
const FabricMetaURL = "https://meta.fabricmc.net/v2"

// fabricEntry is one row of Fabric meta's loader and game version lists.
type fabricEntry struct {
	Version string `json:"version"`
	Stable  bool   `json:"stable"`
}

// fabricOptions pairs every game version Fabric knows with the newest stable
// loader: the loader is game-version independent, only the intermediary
// mappings (fetched at install time) differ.
func (m *Manager) fabricOptions(ctx context.Context) ([]Option, error) {
	var loaders []fabricEntry
	if err := m.Client.GetJSON(ctx, FabricMetaURL+"/versions/loader", &loaders); err != nil {
		return nil, err
	}
	latest := ""
	for _, l := range loaders {
		if l.Stable {
			latest = l.Version
			break
		}
	}
	if latest == "" && len(loaders) > 0 {
		latest = loaders[0].Version
	}
	if latest == "" {
		return nil, errors.New("fabric meta lists no loader versions")
	}
	var games []fabricEntry
	if err := m.Client.GetJSON(ctx, FabricMetaURL+"/versions/game", &games); err != nil {
		return nil, err
	}
	opts := make([]Option, 0, len(games))
	for _, g := range games {
		opts = append(opts, Option{Minecraft: g.Version, Version: latest, Label: latest})
	}
	return opts, nil
}

// installFabric fetches the launcher profile Fabric meta generates for the
// pair and stores it. Its libraries carry maven URLs and SHA-1s, so the
// regular installer downloads them like any other version.
func (m *Manager) installFabric(ctx context.Context, id, mc, version string) error {
	url := fmt.Sprintf("%s/versions/loader/%s/%s/profile/json", FabricMetaURL, mc, version)
	v, _, err := m.Client.FetchVersion(ctx, url)
	if err != nil {
		return fmt.Errorf("fabric profile for %s: %w", mc, err)
	}
	if v.InheritsFrom == "" {
		v.InheritsFrom = mc
	}
	m.progress("fabric-loader " + version)
	return m.writeProfile(id, v)
}
