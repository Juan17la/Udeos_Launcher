# 10. Adding content to an instance

## What the player sees

Browsing stays a plain, unrestricted search: the version and loader filters
narrow the catalog like any search box, they never lock to one instance.
Every mod, resource pack and shader card carries two big buttons, **Add**
and **Details**; modpack cards only get **Details** (a modpack becomes an
instance, which is separate work — see the note at the end of this page).

**Add** opens a picker listing every instance, compatible ones first, each
tagged *Compatible* or with a short reason (*Vanilla — no mods*, *needs
Fabric/Forge*, *no build for 1.20.1*) — worked out from the project's
aggregate published versions (`GetProjectDetail`, see below), so nothing is
fetched per card while scrolling the grid, only once when Add is actually
clicked. Incompatible instances stay visible but cannot be selected. Picking
one shows the **plan**: the version that will be downloaded, any dependency
that comes with it (marked *required by …*), and notes about optional
companions that are not installed — or, if it turns out it cannot go in
after all, why. **Add** then downloads the files with a progress bar.

**Details** opens a full page for the project: its description, every
Minecraft version and loader it has ever published a build for, and the same
per-instance compatibility list, with its own **Add** button. The Mods,
Resource Packs and Shaders tabs of an instance also have a **Browse
Modrinth** button that opens Search with that instance's version/loader as a
starting point (not a lock) and that instance preselected in the picker.

The instance list shown to the picker is exact — a Vanilla instance is
always refused for mods — but the *aggregate* compatibility hint (every
version the project has ever published, not the one specific version that
will actually be picked) can occasionally be optimistic: a project could
support 1.20.1 on Fabric and 1.20.1 on Forge without one version covering
both. `PlanContent` is what actually happens when Add is pressed, and it
remains the one precise, authoritative check.

## The checks

`internal/modinstall.Manager.Plan` runs, in this order:

1. **Type** — modpacks cannot be added to an instance (they become one, see
   the next page); mods need a Fabric or Forge instance.
2. **Version and loader** — Modrinth is asked for the project's versions
   filtered by the instance's Minecraft version and, for mods, its loader
   (`GET /project/{id}/version?game_versions=[..]&loaders=[..]`). An empty
   answer is refused with *"X has no build for Minecraft 1.20.1 with Fabric"*.
   Among the matches, releases win over betas and alphas, then the newest.
3. **Already there** — a project recorded in the instance's `content.json`
   whose file still exists is reported as already installed, not added twice.
4. **Dependencies** — Modrinth versions declare `required`, `optional`,
   `incompatible` and `embedded` dependencies. Required ones are resolved the
   same way (a dependency pinned to a specific version is used when that
   version fits the instance, otherwise the best matching version of that
   project), recursively, skipping anything already installed or already in
   the plan. Optional ones only produce a note. Embedded ones are ignored.
5. **Incompatibilities, both ways** — if anything in the plan declares an
   installed project incompatible, or an installed entry declared something
   in the plan incompatible when it was added, the whole add is refused
   naming the two projects.
6. **The file itself** — after download, the file goes through the same
   validators the drag-and-drop path uses (`content.AddMod` looks for the
   loader's marker inside the jar, `AddResourcePack` for `pack.mcmeta`,
   `AddShaderPack` for a `shaders/` folder). A mismatch is refused there too.

## Downloading and remembering

`Manager.Apply` hands the plan's files to the same `download.Pool` that
installs the game: each file lands in `cache/content/<sha1>/<name>`, is
verified by SHA-1, and is skipped next time (another instance adding the
same mod costs nothing). It is then copied into `mods/`, `resourcepacks/` or
`shaderpacks/`, and an entry is appended to `instances/<id>/content.json`:
project id, version id, title, version number, file name, SHA-1, which
project pulled it in, and the project ids it is incompatible with. The
Remove buttons on the instance tabs drop the entry along with the file, and
an entry whose file disappeared by hand is ignored.

Progress goes out on the `content:progress` event (phase `content`) rather
than `install:progress`, so the Play overlay and the add dialog never show
each other's numbers.

## Bindings

- `PlanContent(instanceId, projectId, projectType)` → `modinstall.Plan`
  (`items`, `alreadyInstalled`, `warnings`) or an error with the reason.
- `AddContent(instanceId, projectId, projectType)` → the `Entry` list that
  was installed; plans again first so a stale plan cannot be applied.
- `ListInstalledProjects(instanceId)` → project ids installed in an instance.
- `GetProjectDetail(projectId)` → `modsearch.ProjectDetail`: the project's
  full description and its `game_versions`/`loaders` aggregated across every
  version, straight from Modrinth's `GET /project/{id}` (one call — no need
  to fetch every version to answer "what does this run on"). Used by the
  Details page and by the Add picker's `frontend/src/lib/compat.ts` to sort
  and label instances.

All four live in `app_content_install.go` and go through
`Launcher.Content`, a `modinstall.Manager` that shares the search provider.

## Trying it from the terminal

    go run ./cmd/udeoscli create "Fab" 1.20.1 Fabric
    go run ./cmd/udeoscli add <instance id> iris            # pulls Sodium in
    go run ./cmd/udeoscli add <instance id> faithful-32x resourcepack
