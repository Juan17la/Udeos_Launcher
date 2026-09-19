# 2. Running and building

## What you need once

- **Go** 1.23 or newer.
- **Node.js** 20 or newer (for the frontend build).
- The **Wails CLI**, installed with `go install github.com/wailsapp/wails/v2/cmd/wails@latest`.
  It lands in Go's bin directory (`~/go/bin`), which must be on your PATH.
- Platform web-view development files:
  - **Linux (Debian/Ubuntu)**: `libgtk-3-dev` and `libwebkit2gtk-4.1-dev`
    (or `libwebkit2gtk-4.0-dev` on older releases). Fedora: `gtk3-devel webkit2gtk4.1-devel`.
  - **Windows**: nothing extra; WebView2 is part of Windows 10/11.
  - **macOS**: Xcode command line tools.

Run `wails doctor` afterwards: it prints a table with every dependency and
tells you exactly which package is missing.

## The webkit 4.1 tag on Linux

Newer distributions (Debian 13, Ubuntu 24.04, Fedora 39+) ship WebKitGTK
**4.1** instead of 4.0. Wails defaults to 4.0, so on those systems every
`wails dev` and `wails build` command needs the extra option
`-tags webkit2_41`. Forgetting it produces a "package webkit2gtk-4.0 not found"
error from pkg-config. Windows and macOS ignore the tag.

## Development mode

From the repository root, `wails dev` (plus the tag on Linux) does the
following automatically:

1. Generates the JavaScript bindings for every exported Go method.
2. Installs the frontend dependencies with npm if needed.
3. Starts Vite so the frontend hot-reloads on every save.
4. Compiles and opens the desktop window, and rebuilds the Go side when a
   `.go` file changes.

The window shows the real backend, so what you see is what the player gets.

## UI-only work in a browser

When you only touch screens or styles you do not need the desktop build at
all. Inside `frontend`, `npm run dev` serves the page at a local URL; because
Wails is not present, the frontend switches to its built-in mock backend with
two sample instances, a fake download and a fake game session. Adding
`?screen=dashboard`, `?screen=create` or `?screen=instance:i1` to the URL
opens a screen directly; adding `shot` to the query keeps the page's load
event pending for a moment, which is what the headless-browser screenshots
in this repository rely on.

## Testing the backend without the window

The Go packages have unit tests (`go test ./internal/...`) covering the rule
evaluation, the offline-UUID derivation, argument building for both modern
and legacy versions, and the level.dat reader.

For an end-to-end check, the command line tool in `cmd/udeoscli` runs the
exact same install and launch code as the window. Point the `UDEOS_HOME`
environment variable at a scratch folder so the test does not touch your real
data, then: list versions, save a profile, create an instance, install a
version and play it. The game window opens and the launcher log is written
next to the instance.

## Producing the desktop binary

`wails build` (with the Linux tag when needed) runs the same pipeline as dev
mode but produces an optimised, single executable in `build/bin/`. The
frontend is embedded inside it; nothing else needs to ship alongside.

- **Windows**: add `-nsis` to also generate an installer (requires the NSIS
  tool on the build machine).
- **macOS**: the result is an `.app` bundle. `-platform darwin/universal`
  makes one bundle for Intel and Apple Silicon.
- **Linux**: the result is a plain executable. `build/linux/nfpm.yaml` describes
  how [nfpm](https://nfpm.goreleaser.com) wraps it into a `.deb` or `.rpm`
  (binary, desktop entry, icon, and the GTK/WebKitGTK 4.1 dependency):
  `VERSION=1.0.0 nfpm package -f build/linux/nfpm.yaml -p deb` from the
  repository root.

Cross-compiling is only supported from macOS/Linux towards Windows; each
platform is otherwise built on itself (or in CI on a runner of that OS).

## Releases

Installers are built by GitHub Actions, not by hand. The pipeline is
`.github/workflows/release.yml` and a companion `ci.yml` runs the Go tests and
the frontend type-check on every push and pull request.

To publish a version:

1. Set `productVersion` in `wails.json` to the plain number (`1.0.0`). It must
   stay numeric: the Windows installer script feeds it to NSIS as
   `X.Y.Z.0`, which rejects `-alpha` suffixes. The frontend `package.json`
   carries the full string (`0.10.0-beta`), which is what the login screen
   shows.
2. Write the release notes for players in `docs/releases/<version>.md`
   (plain language, no technical terms); the release job puts them above the
   download table. Move the changelog's *Unreleased* section under the version.
3. Commit, then tag the commit with a `v` prefix and push the tag:
   `git tag -a v0.10.0-beta -m "Udeos Launcher 0.10 Beta"` followed by
   `git push origin v0.10.0-beta`.

The tag starts three build jobs, one per OS, and a fourth that creates the
GitHub Release with everything attached plus a `SHA256SUMS.txt`. A tag
containing a hyphen (`-alpha`, `-beta`, `-rc1`) is marked as a pre-release.

| Job | Runner | Produces |
|-----|--------|----------|
| Linux | `ubuntu-latest` inside an `ubuntu:22.04` container, so the binary links against an old glibc and runs on Ubuntu 22.04+, Debian 12+ and Fedora | `.deb`, `.rpm` (nfpm) and a portable `.tar.gz` |
| Windows | `windows-latest` with NSIS installed through Chocolatey | `...-windows-amd64-installer.exe` (`wails build -nsis`) and a portable `.zip` of the bare executable |
| macOS | `macos-latest` | a universal (Intel + Apple Silicon) `.app` inside a `.dmg`, ad-hoc signed but not notarized |

Running the workflow by hand from the Actions tab (*Run workflow*) builds the
same files with version `dev` and keeps them as workflow artifacts without
creating a release; do that first when changing the pipeline.

## First run as a player

The launcher creates its data folder on first start (see
[Data on disk](05-data-on-disk.md)), shows the language step, then asks for a
nickname and consent. From the dashboard, "New Instance" fetches the version
list from Mojang; picking a version and pressing Play downloads what is
missing and starts the game. Nothing needs to be configured by hand.
