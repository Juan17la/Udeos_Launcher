# 7. Git workflow

The repository is managed by the project owner; the assistant never runs git.
Instead, every feature ships with a shell script in the top-level `git/`
folder that performs the git operations for that feature. Scripts are
numbered and meant to be run in order after reviewing them.

Each script follows the same shape:

1. Create a branch named after the feature (`chore/…` for tooling and
   scaffolding, `feature/…` for player-facing functionality, `docs/…` for
   documentation).
2. Stage only the files that belong to that feature.
3. Commit with a message whose first line summarises the change and whose
   body lists what was added.
4. Switch back to `main` and merge the branch with a merge commit, so the
   history shows one bump per feature.

The first script also initialises the repository and commits the
requirements, diagrams and mockups on `main` before any code.

Because features were developed back to back, a few files are naturally
touched by more than one of them (the app state, the routing shell, the Go
struct that holds the bindings). Those files are staged by the first script
that introduces them and are not re-split afterwards; each script's header
comment says which shared files it includes.

Generated folders are ignored: the frontend `dist` and `node_modules`, the
`wailsjs` bindings that Wails regenerates on every build, and `build/bin`.
