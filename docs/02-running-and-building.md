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
- **Linux**: the result is a plain executable. Packaging it as an AppImage or
  a Flatpak is a later feature.

Cross-compiling is only supported from macOS/Linux towards Windows; each
platform is otherwise built on itself (or in CI on a runner of that OS).

## First run as a player

The launcher creates its data folder on first start (see
[Data on disk](05-data-on-disk.md)), shows the language step, then asks for a
nickname and consent. From the dashboard, "New Instance" fetches the version
list from Mojang; picking a version and pressing Play downloads what is
missing and starts the game. Nothing needs to be configured by hand.
