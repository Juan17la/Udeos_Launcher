# Changelog

All notable changes to Udeos Launcher are documented here. Format loosely
follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

## [Unreleased]

### Added

- **Profiles keep their own instances** — each launcher profile (a player
  name) sees only its instances. Account menu → Switch profile opens a modal
  listing every profile with its instance count: click to switch, add a new
  one (starts empty), or remove one (its instances move to the profile that
  stays active; nothing is deleted). Instances made before this update go to
  the profile that is active the first time the launcher opens.
- **Whole cards are clickable** — instance cards open the instance, Addons
  cards and installed-mod cards open the project's Details page.
- **Back puts you where you were** — returning from Details restores the
  Addons search, filters, page and scroll; an instance reopens on the tab
  you left; every other page remembers its scroll.
- **Page numbers on Addons** — first/last/nearby pages, a "go to page" box and
  a "1–30 of N" count.
- **Game loading screen** — Play opens a modal with the instance's block
  hopping, a striped progress bar, the version and the percentage; Hide
  shrinks it to a notification.

### Changed

- **Gentle page transitions** — a new page fades in while rising 6px
  (0.2 s); instance tabs cross-fade (0.15 s). With reduced motion turned on
  in the system, only the fade remains.
- **One tag style on every card** — Minecraft version(s) in green behind a
  grass block ("1.20.1–1.21.1" on Addons), loaders in gold with proper names
  (NeoForge, not "neoforge") and at most two plus "+N", downloads as a gray
  tag with a short number (42M; the exact count on hover).
- **Instance page side panel** — narrower, so the tabs get the room; name
  and tags on top, a 2×2 grid of mods/packs/worlds/play time, then Play,
  Edit + Folder side by side, and Delete last. Scrolls inside itself on
  short windows instead of hiding its buttons.
- Download notifications show only the project (or instance) name and a
  percentage.
- Addons page heading reads "Addons" like the nav; the search box has a clear
  button; form fields use the launcher's font.

### Fixed

- Profiles modal: the rows' shadow was cut off into a flat border that did
  not match the row; the keyboard focus ring now surrounds the whole row.
- A white flash on a quick hover in and out of the instance cards
  and buttons (both now keep their own compositing layer).
- Progress bars no longer crawl behind the percentage.

## [0.10.0-beta] — 2026-09-18

First public release. Installers for Windows, macOS and Linux are on the
[Releases page](https://github.com/Juan17la/Udeos_Launcher/releases); notes
for players in [docs/releases/0.10.0-beta.md](docs/releases/0.10.0-beta.md).

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
  An instance made from a modpack wears the pack's icon.
- **Profiles**: keep several nicknames and switch between them from the
  account menu (add, remove; the active one cannot be removed).
- **Edit name and icon** on the instance page.
- Instance icons and background decorations are now real Minecraft
  block/item textures (`frontend/src/assets/icons/`), a curated set of ~120.
- Art slots (`frontend/src/assets/`) for the logo and background
  decorations, falling back to the pixel icons until real assets land.

### Changed

- **Themes**: Pastel Overworld (light, now the default: birch cream canvas,
  mint primary, sky-blue secondary) and Pastel End (dark: obsidian canvas,
  ender-lavender primary, magenta glow behind the floating items).
- **Logo**: an ender pearl with a mace across it, the same in both themes.
- Projects without an icon show the stone block instead of an empty square.
- The active profile can be removed too (the next saved one takes over).

- Settings hints are shorter, larger and set apart from their inputs; *Use
  default* is a proper button.
- The Worlds tab no longer offers *Search in Addons* (Modrinth has no worlds).

### Fixed

- Mods, resource packs and shaders added before the launcher recorded icons
  now get their Modrinth icon and description (filled in once, then saved).
- Screenshot thumbnails were blank under `wails dev`.
- A long instance name no longer pushes the instance page's tabs off screen.

- Side panels (instance page, dashboard's Last played) no longer grow with
  the list next to them.
- The checked checkbox and the selected icon no longer fade into a gradient.

### Known limitations

- Builds are not code-signed: Windows SmartScreen and macOS Gatekeeper will
  warn on first launch (see the Download section in [README.md](README.md)
  for how to proceed).
- No skin page yet.
