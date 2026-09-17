# 9. Content search

## What the player sees

The **Addons** page browses Modrinth's catalog: **Mods**, **Resource
Packs**, **Shaders** and **Modpacks**, one tab per type. A free-text box
narrows results, a version dropdown filters to one Minecraft version, a
loader dropdown (Fabric, Forge, Quilt or NeoForge) is shown for mods and
modpacks only — and only applies to them: a loader picked on the Mods tab
never narrows resource packs or shaders — and a sort dropdown orders by
**Relevance** (the default), **Most downloaded**, **Newest** or **Recently
updated**. Modrinth has no ascending order, so there is no "least
downloaded". Each result shows its icon, title, author, a short
description, its loaders and its download count. Next/Previous replace the
grid with the new page and scroll back to the top.

Browsing is only half of it: every mod, resource pack and shader card has an
**Add** button. Reached from the nav, Add asks which instance in one click;
reached from an instance's **Add from Modrinth** button, the whole page is
locked to that instance (its version and, for mods, its loader, shown as
disabled dropdowns; no Modpacks tab; a Vanilla instance only gets Resource
Packs) and Add installs straight away, with cards already in the instance
reading **Added**. How a result is checked against the instance and
installed is the subject of [Adding content to an instance](10-adding-content.md).

## Provider and caching

`internal/modsearch` defines a small `Provider` interface (`Search`,
`GameVersions`, plus `Versions`, `VersionByID` and `Projects` used when a
result is added) so a marketplace other than Modrinth could be added later
without touching the frontend or the Wails bindings. `Modrinth` is the only
implementation today, hitting `api.modrinth.com/v2`:

- `GET /search?facets=...&index=...` — `facets` is Modrinth's AND-of-OR-groups
  syntax; the launcher always ANDs a `project_type` group with an optional
  `versions` group and an optional `categories` group (loaders are mixed
  into Modrinth's category list, so a known-loader set filters them back
  out for the `Loaders` field on each result). `index` is the sort order
  (`downloads`, `newest`, `updated`); it is left out for relevance.
- `GET /tag/game_version` — the list behind the version filter.

`modsearch.Manager` wraps the provider with the same fetch-then-cache idiom
`internal/loader` uses for loader lists: on success, write the page to
`cache/search/<type>_<version>_<loader>_<sort>_<offset>_<hash>.json`; on failure,
read that same file back instead of failing outright. A free-text query
under 3 characters is not cached, so typing does not create a cache file per
keystroke. The version list is cached the same way, at
`cache/search/game_versions.json`.

## Bindings

- `SearchContent(projectType, text, gameVersion, loader, sortBy, offset, limit)`
  → `modsearch.Page` (`results`, `total`, `offset`). `sortBy` is `relevance`
  (or anything unknown), `downloads`, `newest` or `updated`.
- `ListSearchGameVersions()` → `modsearch.GameVersion[]`, for the version
  dropdown.

Both live in `app_search.go` and go through `Launcher.Search`, the same
`core.Launcher` that owns `Installer`, `JRE` and `Loaders`.
