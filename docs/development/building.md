# Building and running

## What you need once

- **Go** 1.23 or newer.
- **Node.js** 20 or newer (for the frontend build).
- The Wails CLI, installed with `go install github.com/wailsapp/wails/v2/cmd/wails@latest`.
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
sample instances, servers, skins and search results, a fake download and a
fake game session. Adding `?screen=<name>` to the URL opens a screen directly:
`login`, `create`, `search`, `ai`, `skins`, `skinEditor`, `servers`,
`instance:i1` or `server:s1`. The mock keeps its profile in `localStorage`
(`mock:profile`), so a finished welcome flow survives a reload. The
screenshots in `docs/assets/screenshots/` were taken this way at 1280×800.

## Testing the backend without the window

The Go packages have unit tests next to the code they cover: rule
evaluation, offline UUIDs, argument building for modern and legacy versions,
NBT and level.dat, the install planner, modpacks and join files, the relay
protocol, UPnP parsing, skins and the AI advisor (with a fake model and a fake
Modrinth). Run every check before opening a pull request:

```sh
go build ./... && go test ./...                    # backend
cd frontend && npx tsc --noEmit && npm run build   # frontend
```

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

