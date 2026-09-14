# Udeos Launcher

A Minecraft launcher for Windows, Linux and macOS that needs **no Microsoft account**:
pick a nickname, create an instance for the version you want — vanilla, **Forge** or
**Fabric**, no installer to run — and play. Everything runs locally; the launcher only
talks to Mojang's public CDN, the loaders' own servers and Modrinth to download game
files and browse content.

Built with [Wails v2](https://wails.io) (Go backend) and React + TypeScript.

## Documentation

`docs/` explains the architecture, how to run and build on each OS, how the
CDN install and the offline launch work, and where data lives. Start with
[docs/README.md](docs/README.md).

## Project layout

```
.
├── main.go            window configuration and Wails bootstrap
├── app.go             App struct: wiring done at startup
├── app_*.go           Go methods exposed to the frontend, one file per feature
├── cmd/udeoscli/      command line tool that drives the same core package
├── internal/          backend packages, one job each (see docs/01-architecture.md)
├── frontend/          React + TypeScript UI (Vite)
│   └── src/
│       ├── api/       typed bridge to the Go bindings (+ browser mock)
│       ├── screens/   Login, Dashboard, Create Instance, Instance, Search
│       ├── components/, ui/, theme/, i18n/
│       └── state.tsx  app-wide React context
├── build/             app icon and packaging assets used by `wails build`
├── docs/              project documentation
├── wails.json         Wails project configuration
└── go.mod, go.sum     Go module (`udeos/launcher`)
```

## Development

Requirements: Go ≥ 1.23, Node ≥ 20, the Wails CLI
(`go install github.com/wailsapp/wails/v2/cmd/wails@latest`) and, on Linux,
`libgtk-3-dev` + `libwebkit2gtk-4.1-dev`.

From the repository root:

```sh
wails dev   -tags webkit2_41   # live reload
wails build -tags webkit2_41   # binary in build/bin/
```

`-tags webkit2_41` is only needed on Linux distributions that ship webkit2gtk 4.1
(Debian 13, Ubuntu 24.04+, Fedora). Omit it on Windows and macOS.

Checks:

```sh
go build ./... && go test ./...                    # backend
cd frontend && npx tsc --noEmit && npm run build   # frontend
```

## License

[MIT](LICENSE) © 2026 Juan Diego López Arias
