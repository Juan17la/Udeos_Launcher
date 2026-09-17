# 9. Content search

## What the player sees

The **Search** page browses Modrinth's catalog: **Mods**, **Resource
Packs**, **Shaders** and **Modpacks**, one tab per type. A free-text box
narrows results, a version dropdown filters to one Minecraft version, and
(for mods and modpacks) a loader dropdown filters to Fabric, Forge, Quilt or
NeoForge. Each result shows its icon, title, author, a short description,
its loaders and its download count.

Browsing is only half of it: every mod, resource pack and shader card has
**Add to…** buttons, and an instance can be picked at the top of the page so
the results are filtered to what fits it. How a result is checked against
the instance and installed is the subject of
[Adding content to an instance](10-adding-content.md).

## Provider and caching

`internal/modsearch` defines a small `Provider` interface (`Search`,
`GameVersions`, plus `Versions`, `VersionByID` and `Projects` used when a
result is added) so a marketplace other than Modrinth could be added later
without touching the frontend or the Wails bindings. `Modrinth` is the only
implementation today, hitting `api.modrinth.com/v2`:

- `GET /search?facets=...` — `facets` is Modrinth's AND-of-OR-groups syntax;
  the launcher always ANDs a `project_type` group with an optional
  `versions` group and an optional `categories` group (loaders are mixed
  into Modrinth's category list, so a known-loader set filters them back
  out for the `Loaders` field on each result).
- `GET /tag/game_version` — the list behind the version filter.

`modsearch.Manager` wraps the provider with the same fetch-then-cache idiom
`internal/loader` uses for loader lists: on success, write the page to
`cache/search/<type>_<version>_<loader>_<offset>_<hash>.json`; on failure,
read that same file back instead of failing outright. A free-text query
under 3 characters is not cached, so typing does not create a cache file per
keystroke. The version list is cached the same way, at
`cache/search/game_versions.json`.

## Bindings

- `SearchContent(projectType, text, gameVersion, loader, offset, limit)` →
  `modsearch.Page` (`results`, `total`, `offset`).
- `ListSearchGameVersions()` → `modsearch.GameVersion[]`, for the version
  dropdown.

Both live in `app_search.go` and go through `Launcher.Search`, the same
`core.Launcher` that owns `Installer`, `JRE` and `Loaders`.
