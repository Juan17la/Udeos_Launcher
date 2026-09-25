# 4. Launching the game

## What "offline" means here

The official launcher signs the player in with Microsoft, receives a token and
passes the token, the username and the account UUID to the game. Udeos passes
the **nickname** the player typed and a **UUID derived from that nickname**,
and a placeholder where the token would go. The game does not verify any of it
locally: single player, LAN worlds and servers that run in offline mode work
normally. Online-mode servers (which ask Mojang to confirm the token) will
refuse the connection — that is the one thing an account buys.

The UUID is the same one vanilla servers compute for offline players (a
version-3 UUID of the text "OfflinePlayer:" followed by the name), so a
player keeps their inventory and position on an offline server no matter
which launcher they use.

Every game also gets `-javaagent:<authlib-injector>=http://127.0.0.1:25585`
first among the JVM flags: it points the game at the launcher's own skin
server, which is how the profile's skin shows and how Udeos servers let
Udeos players in (see [Skins](13-skins.md)). Without it (no download yet)
the game starts as before.

## Building the command line

When Play is pressed for an installed version, the launcher assembles one
java command:

1. **Java executable** — the instance's own Java if its Settings tab names
   one, else the profile's, else the managed runtime for the version's
   component.
2. **Memory** — a maximum heap (the instance's setting, else the profile's
   2 GB default) and a handful of garbage-collector flags that keep frame
   times smooth; these are the flags the official launcher uses. The
   instance's *extra JVM arguments* come right after, so a flag set there
   overrides a default. These three live in `Instance.Launch`
   (`instances.json`) and are edited on the instance page's **Settings**
   tab (`SetInstanceLaunch`). Memory is a slider from 512 MB to the
   machine's RAM (`GetAppInfo().totalMemoryMB`, read by `internal/sysinfo`:
   `/proc/meminfo`, `sysctl hw.memsize`, `GlobalMemoryStatusEx`); it turns
   red below 1 GB and when less than 2 GB would be left for the system.
3. **JVM arguments** from the version JSON, filtered by the rules: on macOS
   this adds the flag that makes the window open on the main thread, on
   Windows some OS-version hints. Placeholders are replaced: the natives
   folder, the launcher name and version, and the **classpath**.
4. **Classpath** — every allowed library jar plus the client jar, joined
   with the platform's separator. The modern `…:natives-<os>` jars are kept
   on the classpath on purpose: from 1.19 on LWJGL, JNA and netty pull their
   shared libraries out of those jars themselves (into the `natives/lwjgl`,
   `natives/jna` and `natives/netty` folders named in the JVM arguments).
   Leaving them out is what produces `Failed to locate library: liblwjgl.so`
   right after start. Only the old classifier-style natives (≤ 1.18) stay off
   the classpath; those are unpacked into `natives/` instead.
5. **Main class** from the version JSON.
6. **Game arguments** with the placeholders substituted: nickname, UUID,
   version id and type, the instance's game directory, the assets folder and
   index name. Arguments guarded by features the launcher does not enable
   (demo mode, custom resolution, quick play) are left out.

Versions before 1.13 have no structured argument lists; for those the
launcher supplies the classic flags (library path, classpath) itself and
splits the single `minecraftArguments` string.

## Running and watching the process

The game is started with the instance's `.minecraft` folder as its working
directory, so saves, screenshots, options and packs land inside the
instance and never mix with another one. On Windows the process is started
without a console window.

Everything the game prints is written to `logs/udeos-launcher.log` inside the
instance's `.minecraft` folder — next to the game's own `logs/latest.log` and
`crash-reports/` — with the command line (minus the very long classpath) at
the top. The launcher records when the game started, and when the process ends it
updates the instance's *last played* time and total play time.

Two events keep the window in sync: one when the process is running (the
progress dialog closes, Play buttons switch to "Running…") and one when it
exits. A non-zero exit code opens a dialog that points to the log file so the
player can share it when asking for help.
