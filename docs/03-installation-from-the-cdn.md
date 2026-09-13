# 3. Installing Minecraft from the CDN

Mojang publishes everything a launcher needs on public, unauthenticated
servers. No account, token or login is involved in any of the steps below;
that is what lets the launcher work with just a nickname.

## The three servers

- **piston-meta.mojang.com** — small JSON files describing versions, assets
  and Java runtimes.
- **libraries.minecraft.net** — Java libraries (LWJGL, Netty, Gson…) laid out
  like a Maven repository.
- **resources.download.minecraft.net** — "assets": sounds, language files,
  fonts, icons… addressed by the SHA-1 hash of their content.

## Step 1 — the version manifest

One file, the *version manifest*, lists every version ever released with its
type (release, snapshot, old beta/alpha), its date and the URL of its own
JSON file. The launcher fetches it when the "Create instance" form opens and
keeps a copy on disk so the list still appears when offline.

## Step 2 — the version JSON

Each version has a JSON document that is the recipe for running it. It
contains:

- the **client jar** to download (URL, size, hash);
- the list of **libraries**, each with its download and, optionally, *rules*
  saying on which OS it applies (macOS-only Objective-C bridge, Windows-only
  LWJGL natives, and so on);
- the **asset index** reference (which set of sounds/textures this version
  uses);
- the **main class** to start;
- the **arguments** for the JVM and for the game, with placeholders such as
  `${auth_player_name}` and `${game_directory}` — old versions (≤ 1.12) use a
  single string, newer ones use structured lists with rules;
- the **Java version** the game expects (Java 8 for old versions, 17 or 21 for
  recent ones).

The launcher stores this file next to the client jar and reads it again at
every launch.

## Step 3 — libraries and natives

The launcher walks the library list, keeps only entries whose rules allow the
current OS/architecture, and queues each jar for download into the shared
`libraries` folder, preserving the Maven path so the same file is reused by
every version that needs it.

Some of those jars carry **native code** (`.so`, `.dll`, `.dylib`) for the
graphics, audio and input layers. Two conventions exist:

- Old versions list a `natives` block mapping each OS to a *classifier*; the
  launcher picks the classifier for its OS and downloads that variant.
- Versions from 1.19 on ship natives as ordinary libraries named
  `…:natives-linux`, `…:natives-windows` and so on, guarded by rules.

Either way, the shared-library files inside those jars are unpacked into the
version's `natives` folder (and its `natives/java` sub-folder, which 26.x
names as `java.library.path`), and that folder is handed to Java at launch.
The modern jars additionally stay on the classpath — see
[04 — launching the game](04-launching-the-game.md).

## Step 4 — assets

The asset index is a JSON map from a virtual path (for example
`minecraft/sounds/ambient/cave/cave1.ogg`) to a hash and a size. The game
does not need the paths: it reads assets by hash from an `objects` folder
where each file is stored under the first two characters of its hash, then
the full hash. So the launcher downloads every object into that layout,
skipping hashes it already has — most assets are shared across versions,
which is why a second version installs much faster than the first.

Very old versions (before 1.7.3) expect real file names instead of hashes.
For those, the launcher additionally copies the objects into a `virtual`
folder with their original paths.

## Step 5 — the client jar

The game itself is one jar, downloaded last into the version's folder. Its
hash is checked like every other file.

## Step 6 — the Java runtime

Mojang also publishes a manifest of Java runtimes per platform (Linux,
Windows, macOS on Intel and Apple Silicon). The launcher reads the *component*
the version asks for (`jre-legacy` for Java 8, `java-runtime-gamma`/`delta`
for newer ones), fetches that component's file list and downloads it into a
`runtimes` folder: regular files, executables (marked as such), directories
and symbolic links. A marker file records that the runtime is complete so it
is never re-downloaded. If Mojang has no build for the platform, the launcher
falls back to the `java` found on the PATH.

## How downloads stay fast and safe

All files go through the same download pool:

- eight files download in parallel;
- every file is written to a temporary name and renamed only after its SHA-1
  matches the one Mojang published, so a half-written or corrupted file can
  never be mistaken for a good one;
- a file whose hash already matches is skipped, which makes "Play" on an
  already-installed version instant and lets an interrupted install resume
  from where it stopped;
- failed transfers retry three times before the install is reported as
  failed;
- after each file the pool reports progress (phase, files done, bytes) which
  the window turns into the progress dialog.

The phases the player sees are, in order: reading version info, libraries,
sounds and textures, the game itself, unpacking natives, Java runtime, then
launching.
