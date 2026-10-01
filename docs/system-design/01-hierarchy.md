# 1. Hierarchy

Two hierarchies matter: the **domain** one (what the player owns) and the
**code** one (which layer may call which).

## Domain hierarchy — what contains what

```
Launcher
└── Profile (a nickname; the active one is "who is playing")
    ├── Skins (library; one equipped per profile)
    ├── Preferences (language, theme)
    └── Instances (each owned by exactly one profile)
        ├── Game instance  (Server = false)      ← Instances page
        │   ├── Minecraft version   (e.g. 1.20.1)
        │   ├── Loader (+ loader build)  Vanilla | Fabric | Quilt | Forge | NeoForge
        │   ├── Launch settings (memory, Java path, extra JVM args)
        │   └── Content  (.minecraft/)
        │       ├── Mods           mods/          ← needs a loader
        │       ├── Resource packs resourcepacks/
        │       ├── Shaders        shaderpacks/   ← needs a loader
        │       ├── Worlds         saves/
        │       └── Screenshots    screenshots/
        └── Server instance (Server = true)      ← Servers page
            ├── same version / loader / launch settings
            ├── server.properties, player lists (whitelist / ops / banned)
            ├── Backups, Console, Internet access (relay or router)
            └── Mods (only when the loader is not Vanilla)
```

Rules that follow from this tree:

1. **A profile owns instances; an instance has one owner.** Switching profile
   changes which instances you see. Removing a profile never deletes anything:
   its instances move to the profile that takes over.
2. **A server is an instance with `Server = true`.** Same store, same owner,
   same launch settings, same `mods/` folder — only the page and the process
   differ. Game-instance lists skip servers; server lists add live state
   (running, players, address).
3. **Content belongs to exactly one instance.** Nothing is shared between
   instances except the download cache (files are identical, so they are stored
   once).
4. **Vanilla has no Mods or Shaders.** A Vanilla instance only takes resource
   packs; a server only takes mods.

### Shared vs private data

| Shared by all instances (re-downloadable) | Private to one instance (yours) |
|---|---|
| `versions/`, `libraries/`, `assets/`, `runtimes/` | `instances.json` entry |
| `cache/` (search pages, loader lists, downloaded addon files) | `instances/<id>/.minecraft/` (worlds, options, logs) |
| | `instances/<id>/content.json` (what was installed from Modrinth) |

Full layout: [Data on disk](../05-data-on-disk.md).

## Content hierarchy — what an addon is made of (Modrinth side)

```
Project            "Sodium" — the thing shown as a card (id, title, author, icon)
└── Version        one release: which Minecraft versions + loaders it runs on
    ├── File       the .jar / .zip / .mrpack to download (SHA-1 verified)
    └── Dependency required | optional | incompatible | embedded → another Project
```

Browsing shows **Projects**. Adding to an instance picks one **Version** that
matches the instance's Minecraft version and loader, downloads its **File**, and
walks its **required Dependencies**.

## Code hierarchy — which layer calls which

```
frontend/src/screens/*          ← what the player sees (pages)
        │ uses
        ▼
components/  hooks/  state/     ← shared pieces, app state, navigation
        │ calls
        ▼
api/bridge.ts                   ← the ONLY door to Go (typed; mock in browser)
        │ Wails bindings + events
        ▼
app*.go (package main)          ← bindings: thin, one file per feature
        │ calls
        ▼
internal/core                   ← orchestrator (install → Java → loader → launch)
        │ uses
        ▼
internal/{install, jre, loader, launch, instance, profile, content,
          modsearch, modinstall, modpack, ai, server, skin, tunnel, …}
        │ read/write                │ HTTP
        ▼                           ▼
   data folder                Mojang / Modrinth / AI provider
```

Direction is strictly downward: `internal/*` packages never import the UI, and
screens never call the network. Details of each layer:
[Architecture](../01-architecture.md).

### Frontend folders, by responsibility

| Folder | Role | Rule |
|---|---|---|
| `screens/` | One file (or folder) per page | Pages own their layout and local pieces |
| `components/` | Reused in more than one page (Nav, dialogs, tags, Play button) | Only extract on second use |
| `ui/` | Look-and-feel primitives (Button, Field, Dialog, …) | Flat folder, no logic |
| `hooks/`, `state/` | Behaviour shared across screens; app state (profile, instances, navigation) | Screens read state, don't own it |
| `utils/` | Pure functions, no React | Testable in isolation |
| `api/` | Bridge + types + browser mock | Single boundary to Go |
| `i18n/` | English and Spanish strings | No hard-coded UI text |
