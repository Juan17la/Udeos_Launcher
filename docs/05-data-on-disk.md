# 5. Data on disk

## Where

The launcher keeps everything in one folder chosen per operating system:

- Linux: `~/.config/UdeosLauncher`
- Windows: `%AppData%\UdeosLauncher`
- macOS: `~/Library/Application Support/UdeosLauncher`

Setting the `UDEOS_HOME` environment variable moves the whole folder
elsewhere, which is how tests run against a throw-away directory and how a
"portable" install on a USB stick could work.

## Shared between instances

- `versions/<id>/` — the version JSON, the client jar and the unpacked
  natives of each installed version, plus `manifest.json`, the cached
  version list. Loader profiles (`fabric-loader-0.16.9-1.21.1/`, `quilt-loader-0.29.1-1.21.1/`,
  `forge-1.20.1-47.4.10/`, `neoforge-1.21.1-21.1.172/`) only hold a JSON:
  they reuse the vanilla jar.
- `libraries/` — every library jar, in Maven layout. Two versions that need
  the same Netty release share one file.
- `assets/indexes/` and `assets/objects/` — asset indexes and the
  hash-addressed asset files (the largest folder: ~800 MB for a recent
  version, mostly sounds). `assets/virtual/` only appears for very old
  versions.
- `runtimes/<component>/<platform>/` — the Java runtimes downloaded from
  Mojang, one per component actually used.
- `cache/loaders/` — the Fabric, Forge and NeoForge support tables, so the
  create form can still offer them offline; `cache/forge/` and
  `cache/neoforge/` — downloaded installers.
- `cache/search/` — cached search pages; `cache/content/<sha1>/<file>` — every
  mod, pack or shader downloaded from Modrinth, kept so a second instance
  adding the same file does not download it again.
- `launcher_profiles.json` — an empty stub the Forge/NeoForge installer requires.
- `libraries/moe/yushi/authlib-injector/` — the Java agent that lets games and
  servers use the launcher's skins (downloaded on first Play).

Deleting any of these only costs a re-download; nothing the player made lives
there.

## Private to each instance

- `instances.json` — the list of instances: id, name, version, loader and
  loader build, icon, creation date, last played, total play time and the
  `launch` settings (memory, Java path, extra JVM arguments; empty = defaults).
- `instances/<id>/.minecraft/` — the game directory. The game itself creates
  `saves/` (worlds), `screenshots/`, `options.txt`, `logs/`; the launcher
  pre-creates `resourcepacks/`, `mods/` and `shaderpacks/` so the instance
  page always has folders to show.
- `instances/<id>/.minecraft/logs/udeos-launcher.log` — output of the last
  game session as seen by the launcher (the game's own `latest.log` and any
  `crash-reports/` sit right beside it).
- `instances/<id>/content.json` — what the launcher installed from Modrinth
  into this instance (project, version, file name, SHA-1, what it was
  required by, what it is incompatible with). Files added by hand are not in
  it; see [Adding content](10-adding-content.md).

Deleting an instance from the launcher removes this folder entirely, which is
why the button asks for confirmation.

## The player

`profile.json` holds the active nickname, its derived UUID, every saved
nickname (`nicknames`, the active one first — the account menu switches
between them, adds and removes; preferences are shared), language, theme,
the consent flag, the maximum memory for the game and an optional custom
Java path. It is the only place personal data exists, and it never leaves
the machine.

`skins/` holds the skin library: `library.json` (each skin's id, name and
model, and which skin each nickname wears) and one `<id>.png` per skin. See
[Skins](13-skins.md).

## Reading worlds and screenshots

The instance page does not keep its own database; it reads the game folder
each time it opens:

- A **world** is any folder under `saves/` that contains a `level.dat`. That
  file is a small gzip-compressed *NBT* document (Minecraft's binary tag
  format); the launcher reads it just far enough to get the world's display
  name and the "last played" timestamp, and measures the folder size.
  "Save to Device" zips the folder to a location the player chooses.
  Worlds can also be **imported**: a folder with a `level.dat`, or a zip
  with `level.dat` at its root or inside one top-level folder (the shape the
  game's backups and "Save to Device" produce). The archive is unpacked into
  `saves/<name>` — `<name> (2)` if that folder already exists — and entries
  that would escape the folder (`../`) are refused. Deleting a world removes
  the folder.
- **Screenshots** are the PNG files in `screenshots/`. Thumbnails (and the
  icon of an instance made from a modpack, `instances/<id>/icon`) are served
  to the window through an internal URL (`/media/…`) that the Go side
  answers as an asset-server middleware (before the frontend is consulted —
  as a not-found fallback it never ran under `wails dev`, where Vite answers
  unknown paths with `index.html`) and maps to
  the file, so images are not copied or encoded. Clicking a thumbnail shows
  it full size; "Save to Device" copies the file.
- **Open folder** buttons (side card, Worlds and Screenshots tabs, and the
  crash dialog) hand the folder to the OS file manager — `xdg-open` on
  Linux, `open` on macOS, `explorer` on Windows.
- **Resource packs** are zip files or folders in `resourcepacks/`. When one
  is dropped or picked, the launcher checks that it contains a `pack.mcmeta`
  before copying it in, so a random zip cannot end up in the list.
