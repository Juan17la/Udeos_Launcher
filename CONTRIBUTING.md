# Contributing to Udeos Launcher

Thanks for wanting to help. Bug reports, ideas, translations and pull requests
are all welcome.

## Reporting a bug

Open an [issue](https://github.com/Juan17la/Udeos_Launcher/issues) with:

- your system (Windows, macOS or which Linux) and the launcher version (shown
  on the welcome screen and in the update dialog);
- what you did, what you expected and what happened;
- for game problems, the file `logs/udeos-launcher.log` from the instance's
  `.minecraft` folder.

Security problems should not go in a public issue: see [SECURITY.md](SECURITY.md).

## Setting up

You need Go 1.23 or newer, Node.js 20 or newer and the Wails CLI:

```sh
go install github.com/wailsapp/wails/v2/cmd/wails@latest
wails dev                      # Windows and macOS
wails dev -tags webkit2_41     # Linux with WebKitGTK 4.1 (Debian 13, Ubuntu 24.04+, Fedora)
```

On Linux you also need `libgtk-3-dev` and `libwebkit2gtk-4.1-dev`.
[Building and running](docs/development/building.md) covers every platform,
UI-only work in a browser and the command line tool.

## Before opening a pull request

```sh
go build ./... && go test ./...
cd frontend && npx tsc --noEmit && npm run build
```

Both must pass; CI runs the same checks.

## How the code is organised

Read [Architecture overview](docs/architecture/overview.md) first. In short:

- One job per Go package under `internal/`. Bindings for the UI live in the
  `app_*.go` files, one file per feature.
- The UI never touches the network or the disk; it calls bindings.
- A shared component exists only when more than one screen uses it. Something
  used by one page stays in that page.
- Styling follows the [Design system](docs/architecture/design-system.md).
- Every visible string goes in both `frontend/src/i18n/en.ts` and `es.ts`.
  The Spanish file is type-checked against the English one.
- Keep it light. New dependencies need a good reason.

## Commits and branches

One branch per change, named `feature/...`, `fix/...`, `chore/...` or
`docs/...`, merged into `main` with a merge commit. Commit messages follow
`type(scope): summary`, for example `fix(servers): stop a server that is still
starting`. See [Git workflow](docs/development/git-workflow.md).

Player-facing changes get a line in the Unreleased section of
[CHANGELOG.md](CHANGELOG.md), written for players, not developers.

## Translations

The launcher speaks English and Spanish. To add a language, copy
`frontend/src/i18n/en.ts`, translate the values (not the keys), register it in
`frontend/src/i18n/index.ts` (`Language`, `LANGUAGES`, `DICTS`) and let
`normalize` in `internal/profile/profile.go` accept its code.

## License of contributions

Udeos Launcher is licensed under the
[PolyForm Noncommercial License 1.0.0](LICENSE). By submitting a contribution
you agree that it is licensed under the same terms, and that the project author
may also use and license your contribution under other terms, including
commercial ones. If you do not agree, please do not submit the contribution.
