# 10. Adding content to an instance

## What the player sees

The rule for this page is **two clicks at most to install**. Every mod,
resource pack and shader card carries two big buttons, **Add** and
**Details**; modpack cards only get **Details** (a modpack becomes an
instance, which is separate work — see the note at the end of this page).

There are two ways onto the page, and Add behaves differently on each:

- **From the nav (Addons).** Browsing is unrestricted. **Add** opens a
  picker listing only the instances the project can go into — worked out
  from the project's aggregate published versions (`GetProjectDetail`, see
  below), so nothing is fetched per card while scrolling the grid, only
  once when Add is actually clicked. Clicking an instance installs
  immediately and closes the picker: no plan review, no confirmation. If no
  instance fits, the picker says which loader/versions would. If the player
  has no instances at all, a small error dialog says so and offers **Create
  instance**.
- **From an instance's Add from Modrinth button** (on its Mods, Resource
  Packs and Shaders tabs). The page is locked to that instance: the version
  and (for mods) loader dropdowns are disabled and set to its values, the
  Modpacks tab is gone (a Vanilla instance only gets Resource Packs), a
  header names the instance with a **Back to …** link, and **Add** installs
  straight away with no dialog at all. Projects already in the instance
  (`ListInstalledProjects`) show a disabled **Added** button; one being
  installed shows **Adding…**. **Details** and its Back button keep the lock.

Either way the install itself is reported by a **toast** in the bottom-right
corner, not a modal: the percentage while downloading, a short *Added …*
note that clears itself after a few seconds, or — when the backend refuses
(no build for that version/loader, incompatible with an installed mod) —
the reason in red, staying until dismissed. Installs are queued
(`useContentQueue` in `frontend/src/state/useContentQueue.ts`) and run one at a time because
`content:progress` carries no job id; a queued toast reads *Waiting…*. The
queue lives above every screen, so navigating away does not lose it.

**Details** opens a full page for the project: its description, every
Minecraft version and loader it has ever published a build for, and the
per-instance compatibility list, with its own **Add** button that follows
the same rules.

The aggregate compatibility hint (every version the project has ever
published, not the one specific version that will actually be picked) can
occasionally be optimistic: a project could support 1.20.1 on Fabric and
1.20.1 on Forge without one version covering both. `AddContent` plans first
and remains the one precise, authoritative check — which is why a rejection
can still surface as a toast after a one-click add.

## The checks

`internal/modinstall.Manager.Plan` runs, in this order:

1. **Type** — modpacks cannot be added to an instance (they become one, see
   the next page); mods need a Fabric, Quilt, Forge or NeoForge instance.
2. **Version and loader** — Modrinth is asked for the project's versions
   filtered by the instance's Minecraft version and, for mods, its loader
   (`GET /project/{id}/version?game_versions=[..]&loaders=[..]`). An empty
   answer is refused with *"X has no build for Minecraft 1.20.1 with Fabric"*
   — and, when the project does publish for that Minecraft version on other
   loaders, *"(its 1.20.1 builds are for forge)"*, one extra request made
   only on failure. This is the usual story for 1.21+ Forge instances: the
   mod's build is NeoForge's.
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
project pulled it in, the project ids it is incompatible with, and the
project's icon URL and one-line description (from the same `GET /projects`
call that names the plan) for the instance tabs' card view. The
Remove buttons on the instance tabs drop the entry along with the file, and
an entry whose file disappeared by hand is ignored.

Progress goes out on the `content:progress` event (phase `content`) rather
than `install:progress`, so the Play overlay and the install toasts never
show each other's numbers.

## Bindings

- `PlanContent(instanceId, projectId, projectType)` → `modinstall.Plan`
  (`items`, `alreadyInstalled`, `warnings`) or an error with the reason.
  The UI no longer shows a plan step; the binding stays for the CLI and for
  a future "what would this pull in" view.
- `AddContent(instanceId, projectId, projectType)` → the `Entry` list that
  was installed; plans again first so a stale plan cannot be applied.
- `ListInstalledProjects(instanceId)` → project ids installed in an instance;
  the instance-locked Addons page marks those cards **Added**.
- `ListContent(instanceId)` → the `content.json` entries whose file still
  exists; the Mods/Resource Packs/Shaders tabs match them to files by name
  to draw the card view.
- `GetProjectDetail(projectId)` → `modsearch.ProjectDetail`: the whole
  project page from Modrinth's `GET /project/{id}` — the one-liner and the
  full `body`, `game_versions`/`loaders` aggregated across every version
  (one call — no need to fetch every version to answer "what does this run
  on"), categories, client/server side, license, source/issues/wiki links
  and the gallery in its order. Used by the Details page and by the Add
  picker's `frontend/src/utils/compat.ts` to keep only the instances that
  can take the project.

All five live in `app_content_install.go` and go through
`Launcher.Content`, a `modinstall.Manager` that shares the search provider.

## Trying it from the terminal

    go run ./cmd/udeoscli create "Fab" 1.20.1 Fabric
    go run ./cmd/udeoscli add <instance id> iris            # pulls Sodium in
    go run ./cmd/udeoscli add <instance id> faithful-32x resourcepack
