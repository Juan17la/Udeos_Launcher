# Udeos Launcher

A Minecraft launcher for Windows, Linux and macOS that needs **no Microsoft account**:
pick a nickname, create an instance for the version you want — vanilla, **Forge** or
**Fabric**, no installer to run — and play. Everything runs locally; the launcher only
talks to Mojang's public CDN and the loaders' own servers to download game files.

Built with [Wails v2](https://wails.io) (Go backend) and React + TypeScript.

## Documentation

`docs/` explains the architecture, how to run and build on each OS, how the
CDN install and the offline launch work, and where data lives. Start with
[docs/README.md](docs/README.md).

## Development

Requirements: Go ≥ 1.23, Node ≥ 20, the Wails CLI
(`go install github.com/wailsapp/wails/v2/cmd/wails@latest`) and, on Linux,
`libgtk-3-dev` + `libwebkit2gtk-4.1-dev`.

```sh
cd launcher
wails dev   -tags webkit2_41   # live reload
wails build -tags webkit2_41   # binary in build/bin/
```

`-tags webkit2_41` is only needed on Linux distributions that ship webkit2gtk 4.1
(Debian 13, Ubuntu 24.04+, Fedora). Omit it on Windows and macOS.
