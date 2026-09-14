# 7. Git workflow

The history is organised as **one branch per feature**, merged into `main`
with a merge commit, so `git log --graph` shows one bump per feature and the
individual commits underneath it.

Branch names say what kind of change they carry:

- `feature/…` — player-facing functionality (`feature/mod-loaders`,
  `feature/content-search`).
- `fix/…` — a bug fix that stands on its own (`fix/launch-natives`).
- `chore/…` — tooling, scaffolding, restructuring.
- `docs/…` — documentation only.

Each feature follows the same shape:

1. Branch from `main`.
2. Stage only the files that belong to that feature.
3. Commit with a message whose first line summarises the change and whose
   body lists what was added and why.
4. Switch back to `main` and merge with `--no-ff`, so the merge commit is
   kept even when the branch could fast-forward.

Because features were developed back to back, a few files are naturally
touched by more than one of them (the app state, the routing shell, the Go
struct that holds the bindings). Those files are committed by the first
feature that introduces them and are not re-split afterwards.

Generated folders are ignored and never committed: the frontend `dist` and
`node_modules`, the `wailsjs` bindings that Wails regenerates on every build,
and `build/bin`. See `.gitignore` at the repository root.
