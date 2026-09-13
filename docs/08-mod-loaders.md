# 8. Mod loaders: Fabric and Forge

## What the player sees

On the create form the player picks **Vanilla**, **Forge** or **Fabric**,
then a Minecraft version. Nothing else: no loader version to choose, no
installer to download, no "run the installer once" step. The version list is
filtered to what the chosen loader actually supports, and a note under the
selector says which loader build will be installed (the newest stable
Fabric loader, or Forge's *recommended* build for that version, falling back
to *latest*). The instance card shows it as a tag: `Forge 47.4.10`,
`Fabric 0.16.9`.

The first **Play** downloads the game as usual, then the loader, then starts
the modded game. Modded instances get a **Mods** tab where `.jar` files can
be dropped or browsed, listed and removed, and a **Shaders** tab with the
same controls for shader packs.

## How a loader becomes "just another version"

Both loaders are expressed the same way the official launcher expresses them:
a small **version JSON that `inheritsFrom` a vanilla version**. It names a
different `mainClass`, adds a few libraries and a few arguments, and leaves
assets, the client jar, Java and everything else to the parent.

`internal/loader` writes that JSON to `versions/<profile id>/<profile id>.json`
with an id the launcher chooses itself (`fabric-loader-<loader>-<mc>`,
`forge-<mc>-<build>`), so it knows where to look without having to read the
loader's metadata again. `install.LoadVersion` then resolves the chain:
child JSON → parent JSON → `mojang.Merge`, which produces one flat version
with the child's main class and arguments, the child's libraries first on
the classpath (replacing same-named parent ones) and the parent's assets,
downloads and Java requirement. From there the install and launch code does
not know or care that the version is modded.

Two details make Forge work with that layout. The launched version keeps the
**vanilla client jar** (`versions/1.20.1/1.20.1.jar`, no copy is made) and
`${version_name}` expands to the vanilla id, because Forge's
`-DignoreList=...,${version_name}.jar` must match that jar's file name to
keep it out of the module layer. And the natives folder is the vanilla one
for the same reason.

## Fabric

Fabric's meta service does all the work:

1. `GET meta.fabricmc.net/v2/versions/loader` → the loader builds; the first
   stable one is used for every game version.
2. `GET /v2/versions/game` → every game version Fabric supports (1.14 and
   every snapshot since). This is the support table the create form filters
   with.
3. On install, `GET /v2/versions/loader/<mc>/<loader>/profile/json` → the
   version JSON, saved as is. Its libraries carry a maven base URL and a
   SHA-1, so the regular installer downloads and verifies them like any
   other library.

## Forge

Forge has no equivalent service, so the launcher uses what its website and
maven publish:

1. `promotions_slim.json` → the *recommended* / *latest* build per game
   version; `maven-metadata.json` → every build's full artifact version
   (old builds carry a branch suffix, `1.7.10-10.13.4.1614-1.7.10`). Versions
   before 1.5.2 had no installer and are left out.
2. On install, the installer jar is downloaded from
   `maven.minecraftforge.net/net/minecraftforge/forge/<build>/forge-<build>-installer.jar`
   into `cache/forge/` and opened as a zip. Its `install_profile.json` tells
   which of two eras it belongs to.

**Legacy installers (1.5.2 – 1.12.2 build 2847)** carry the whole version
JSON in `versionInfo` and the *universal* jar inside the installer. The
launcher extracts that jar to its maven location under `libraries/`, rewrites
the dead `files.minecraftforge.net` URLs to the current maven and saves the
JSON. Every other library is a normal maven download.

**Modern installers (1.12.2 build 2851 onward, all 1.13+)** ship
*processors*: Java programs that patch the vanilla client jar with a binary
diff shipped inside the installer, producing e.g.
`forge-1.20.1-47.4.10-client.jar`. Re-implementing them is a project in
itself, so the launcher runs the installer headless:

    java -jar forge-<build>-installer.jar --installClient <data dir>

The data directory already has the `versions/<mc>/<mc>.jar` and `libraries/`
layout the installer expects; the launcher only adds the empty
`launcher_profiles.json` the installer insists on. The Java used is the
Mojang runtime of that Minecraft version (the installer for 1.20.1 wants
Java 17, the one for 1.12.2 wants Java 8 — exactly the runtimes those
versions declare). The installer's console output is streamed line by line to
the progress overlay, since patching takes 30 seconds to a few minutes. When
it exits successfully the launcher checks the patched jar named by the
`PATCHED` data entry really exists, deletes the `versions/<forge id>/` copy
the installer wrote and saves the JSON under its own id.

## Mods and shader packs

`content.AddMod` refuses anything that is not a `.jar` and looks inside for
the loader's own marker: `fabric.mod.json` (or `quilt.mod.json`) for Fabric,
`META-INF/mods.toml`, `META-INF/neoforge.mods.toml` or `mcmod.info` for
Forge. A Fabric mod dropped on a Forge instance is therefore refused with a
clear message instead of crashing the game at startup; jars built for both
loaders pass either check. `content.AddShaderPack` accepts a `.zip` or
folder that contains a `shaders/` directory (at the root or inside one
top-level folder). Shaders still need a shader mod (Iris on Fabric, Oculus on
Forge) in the mods folder to actually load.

## Trying it from the terminal

    go run ./cmd/udeoscli loaders Forge          # game version → build
    go run ./cmd/udeoscli create "Modded" 1.20.1 Forge
    go run ./cmd/udeoscli install <instance id>  # game + Java + loader
    go run ./cmd/udeoscli play <instance id>

The launcher log at `instances/<id>/.minecraft/logs/udeos-launcher.log`
starts with the full java command, useful when a loader refuses to start.
