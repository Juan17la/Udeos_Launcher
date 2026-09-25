# Changelog

All notable changes to Udeos Launcher are documented here. Format loosely
follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

## [1.0.0-beta] — 2026-09-25

The second beta. Everything from 0.10.0-beta, plus skins, servers,
profiles with their own instances and many fixes. Grouped by area below.

### Instances

- **Game loading window**: Play opens a window with the instance's block
  hopping, a striped progress bar, the version and the percentage. **Hide**
  shrinks it to a notification; **Cancel** stops the download quietly.
- **Instance page**: a side panel with name, tags, a 2×2 grid (mods, packs,
  worlds, play time), then Play, Edit + Folder and Delete. In small windows
  the details scroll inside the panel and the buttons stay visible.
- Whole instance cards are clickable. An instance reopens on the tab you
  left, and every page remembers its scroll when you come back.
- The **Back to …** button stays under the top bar while a page scrolls,
  and pages no longer scroll just because of it.

### Profiles

- **Each profile has its own instances** (and servers). Account menu →
  Switch profile lists every profile with its instance count: switch, add a
  new one (starts empty) or remove one. Its instances move to the profile
  that stays, so nothing is deleted. Instances from before this version go
  to the profile that is active the first time the launcher opens.
- A profile's avatar is the face of the skin it wears.

### Servers

- **New Servers page**: host a Minecraft world on this computer (Vanilla,
  Fabric, Forge or NeoForge; accept the EULA when creating). Each server has
  a name, a block icon for the multiplayer list, Start/Stop, a live console
  with one-click commands, and a Players tab (kick, admin, ban; whitelist,
  admins and bans lists). It also has world backups (made while running,
  restored after an automatic backup of the current world), mods from
  Addons and plain-language settings.
- **Play with friends anywhere**: servers are open to the internet by
  default through a free relay (bore.pub), so it works even without UPnP or
  behind a shared connection (CGNAT). Each server gets a named address such
  as `udeoslauncher.friends-smp.<ip>.nip.io:41234`. It is shown even while
  the server is stopped and stays the same across restarts. The Router mode
  (UPnP, less lag) and your own bore relay are options too. Same-Wi-Fi
  friends get a local address.
- **Who can join**: "Udeos players" (the default for new servers; skins
  show, other launchers cannot join), "Anyone" (any launcher, no skins) or
  "Microsoft accounts".
- **Safety checks**: a warning before a third server starts at once. Closing
  the launcher with servers running asks first, then saves and stops them.
  A running server can be deleted (it is saved and stopped first). Changing
  settings of a running server warns that it will stop. Ports another
  server uses and out-of-range values are refused. "Stopping…" shows while
  a server saves.
- **Servers always find a port**: a server left running from before is
  saved and stopped. If another program has the port, the server moves to
  the next free one and remembers it. A server whose console stops
  answering is killed when you press Stop.

### Skins

- **New Skins page** that fits the window: the skin you wear on a big 3D
  model you can turn, and a library of every skin you saved. Click a card
  to wear it; edit and delete are on hover.
- **Add downloaded skins**: drop a `.png` on the page (or browse). The
  launcher guesses Classic (4-pixel arms) or Slim (3-pixel arms), shows a
  preview while you choose, and upgrades old 64×32 skins.
- **Skin editor**: paint on the flat skin or right on the 3D model. It has
  pencil, eraser, fill, color picker (right-click too), undo/redo, recent
  colors and the second layer (hats, jackets, sleeves). Unsaved work is kept
  if you leave the page.
- The skin is used in **every instance of the profile** from the next Play,
  in singleplayer and on the servers you host. Until you pick one, you wear
  Steve. Public servers may show a default skin.

### Addons

- **Page numbers**: first/last/nearby pages, a "go to page" box and a
  "1–30 of N" count. The search box has a clear button.
- Addons cards and installed-mod cards open the project's Details page.
  Back from Details restores the search, filters, page and scroll.
- **One tag style everywhere**:
  - Minecraft versions in green ("1.20.1–1.21.1").
  - Loaders in gold with their proper names, at most two plus "+N".
  - Downloads in gray with a short number (42M; the exact count on hover).
- Download notifications show just the name and a percentage. **Cancel** on
  a download stops it (a waiting one just leaves the queue). A modpack
  cancelled mid-way leaves no half-made instance.

### Themes and languages

- **Two themes**: Pastel Overworld (light, the default) and Pastel End
  (dark), switched from the account menu.
- **Two languages**: English and Spanish, switched from the account menu.
- Gentle page transitions (a short fade and rise; only the fade with reduced
  motion), and one font everywhere.

### Device requirements

- **Windows** 10 or 11 (64-bit). **macOS** 10.13 or newer (Intel or Apple
  Silicon). **Linux** x86_64 with GTK 3 and WebKitGTK 4.1 (Debian/Ubuntu
  22.04 or newer, Fedora).
- **Memory**: 4 GB of RAM at least (the game gets 2 GB by default). 8 GB or
  more is recommended for modpacks or hosting a server while playing.
- **Disk**: about 1 GB for the first Minecraft version, plus your worlds and
  mods.
- **Internet** for the first Play of each version (the game and the right
  Java are downloaded then), for Addons and for friends reaching your
  servers. No Java install and no Microsoft account needed.

### Fixed

- Profiles modal: row shadows and the keyboard focus ring.
- A white flash on quick hover over instance cards and buttons.
- Progress bars no longer lag behind the percentage.
- Relayed players were disconnected about 10 seconds after joining.

### Known limitations

- Servers that require a Microsoft account will not let Udeos players in.
- The installers are not code-signed yet (Windows and macOS warn once).

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
