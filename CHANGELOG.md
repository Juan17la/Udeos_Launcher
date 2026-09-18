# Changelog

All notable changes to Udeos Launcher are documented here. Format loosely
follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

## [Unreleased]

### Added

- **NeoForge** instances, installed like Forge on first Play. Most 1.21+ mods
  (Create, JEI, …) only publish NeoForge builds, which a Forge instance could
  not install; the refusal now also names the loaders the mod does ship for
  that version.
- **Launch settings** per instance (Settings tab): memory, Java executable,
  extra JVM arguments.
- **Cards / Compact** views on the Mods, Resource Packs and Shaders tabs;
  cards show the Modrinth icon, version and description of what was added
  from Addons.
- **Back to …** above every page title (except the dashboard), returning to
  the exact screen the player came from.
- **Quilt** instances; Quilt runs Fabric mods, so its search and installs
  take both.
- **Project details** in two columns: versions, loaders and the instances
  that can take the project (each with its own Add) on the left; the
  project page — categories, client/server side, license, links, gallery
  and the full description — on the right.
- **Memory slider** in the instance settings, capped at the machine's RAM
  and red in the danger zone (below 1 GB, or leaving less than 2 GB).
- The top bar stays in view while a page scrolls.
- **Modpacks**: a modpack's Add offers a new instance built from it (its
  loader and version come from the pack; configs and mods included, more
  mods can be added on top) or pours its mods into a compatible instance
  you already have. From an instance's page, the Modpacks tab shows only
  packs for its version and loader.
- Art slots (`frontend/src/assets/`) for the logo and background
  decorations, falling back to the pixel icons until real assets land.

### Changed

- Settings hints are shorter, larger and set apart from their inputs; *Use
  default* is a proper button.
- The Worlds tab no longer offers *Search in Addons* (Modrinth has no worlds).

### Fixed

- Mods, resource packs and shaders added before the launcher recorded icons
  now get their Modrinth icon and description (filled in once, then saved).
- Screenshot thumbnails were blank under `wails dev`.

- Side panels (instance page, dashboard's Last played) no longer grow with
  the list next to them.
- The checked checkbox and the selected icon no longer fade into a gradient.

## [1.0.0-alpha] — 2026-09-17

First public release. Installers for Windows, macOS and Linux are on the
[Releases page](https://github.com/Juan17la/minecraft_launcher/releases).

### Added

- **No Microsoft account needed** — pick a nickname and play offline against
  Mojang's public CDN.
- **Instances** with their own Worlds, Screenshots and Resource Packs tabs;
  vanilla installs come straight from Mojang's version manifest.
- **Mod loaders** — Fabric and Forge instances, installed automatically on
  first Play (no separate installer to run), with writable Mods and Shaders
  tabs.
- **Content search** (Modrinth) — browse mods, resource packs, shaders and
  modpacks, filtered by game version and loader, with results cached for
  offline use.
- **Add to instance** — install a search result directly into a compatible
  instance, with dependency resolution and incompatibility checks before
  anything downloads; a full project details page with every published
  version.
- **Automatic Java runtime** — the matching Mojang JRE is downloaded on first
  play; nothing to install by hand.
- Installers for Windows (NSIS + portable `.zip`), macOS (universal `.dmg`,
  Intel and Apple Silicon) and Linux (`.deb`, `.rpm`, portable `.tar.gz`),
  built and published automatically by GitHub Actions.

### Known limitations

- Builds are not code-signed: Windows SmartScreen and macOS Gatekeeper will
  warn on first launch (see the Download section in [README.md](README.md)
  for how to proceed).
- No skin page yet.
