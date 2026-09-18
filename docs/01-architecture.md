# 1. Architecture

## One window, two programs

The launcher is a **Wails v2** desktop application. Wails packages two things
into a single executable:

1. A **Go backend** — the part that touches the machine: it talks to Mojang's
   servers, writes files, unpacks archives, starts Java and watches the game
   process.
2. A **web frontend** (React + TypeScript) rendered by the operating system's
   own web view (WebKitGTK on Linux, WebView2 on Windows, WKWebView on macOS).
   This is why the binary is small and uses far less memory than an Electron
   app: no browser is bundled.

The frontend never reaches the network or the filesystem itself. Every action
that needs the machine goes through a **binding**: an exported Go method that
Wails exposes to JavaScript as a function returning a promise. In the other
direction, Go pushes **events** (download progress, "game exited") that the
frontend subscribes to. That is the entire contract between the two halves.

## Layers in the Go code

The backend is split into small packages under `internal/`, each with one job.
Reading them in this order follows the flow of a "Play" click:

- **paths** — decides where the data directory is on each OS and names every
  sub-folder. Nothing else hard-codes a path.
- **profile** — the local player: nickname, derived offline UUID, language,
  theme, consent. There is no account and nothing is sent anywhere.
- **instance** — the list of instances (name, version, icon) and the private
  game folder each one owns.
- **mojang** — Go structures that mirror the JSON files Mojang publishes, and
  a tiny HTTP client to fetch them.
- **rules** — evaluates the "only on Windows", "only on macOS", "only if demo"
  conditions Mojang attaches to libraries and arguments.
- **download** — a worker pool that fetches many files in parallel, verifies
  each one by SHA-1 and skips anything already on disk.
- **install** — turns a version id into a complete set of files: version JSON,
  libraries, natives, assets, client jar.
- **jre** — downloads the Java runtime Mojang provides for that version.
- **loader** — installs Fabric or Forge on top of a vanilla version and
  writes the version profile that makes it look like any other version.
- **launch** — builds the exact java command line (classpath, JVM flags, game
  arguments with the player's nickname and UUID substituted in).
- **content** — reads what lives inside an instance: worlds, screenshots,
  resource packs; exports them and validates packs that are added.
- **core** — the orchestrator that chains install → java → loader → launch and tracks
  running game processes. Both the desktop bindings and the small command
  line tool use it, so the desktop UI has no logic of its own.

At the top level, `app.go` wires everything at startup and the `app_*.go`
files hold the bindings, one file per feature (profile, instances, play,
content). `main.go` only configures the window.

## Layers in the frontend

- **api/** — the typed bridge to the Go bindings and events. When the page is
  opened in a normal browser (during UI work) an in-memory mock takes the
  place of the backend so screens can be developed without a desktop build.
- **state/** — the app context (profile, instance list, current screen) plus
  two hooks it composes: `useLaunchController` (the Play/launch state and the
  game events) and `useContentQueue` (the serial install queue behind the
  Addons toasts). Screens read from the context and call a handful of actions.
- **screens/** — Login, Dashboard, Create Instance, Search, Project Detail and
  `instance/` (the instance page and its tabs).
- **components/** — the navigation bar, the account menu, dialogs, the
  notification stack.
- **ui/** — the reusable building blocks (Button, Field, Tag, Panel, ListRow,
  Dialog, Toast, …), the pixel-art icon renderer and the SVG icons.
- **hooks/** — `useFileList` (what every instance tab does) and `useAddAction`
  (the shared Add-to-instance flow).
- **utils/** — plain logic with no React in it: validation rules, formatting,
  error headlines, compatibility, the content-kind table, search rules.
- **theme/** — the design tokens.
- **i18n/** — English and Spanish strings.

## Why there is also a command-line tool

`cmd/udeoscli` is a few dozen lines that call the same `core` package from a
terminal (list versions, create an instance, install, play). It exists so the
download-and-launch pipeline can be tested on a machine without the desktop
toolchain, and so a failing launch can be reproduced without the UI.
