# 2. Glossary

Every term the system uses, grouped by topic. **UI name** is what the player
reads; **code name** is what appears in the source.

## Core objects

| Term | Meaning |
|---|---|
| **Launcher** | The Udeos desktop app as a whole (Wails window + Go backend). |
| **Profile** | A local player identity: a nickname plus its offline UUID, language, theme and skins. There is **no account and no login server**; "logging in" only picks a nickname. Many profiles can exist; one is *active*. |
| **Nickname** | The player name of a profile. Also the profile's key (`Instance.Owner` stores it). |
| **Instance** | One self-contained Minecraft installation the launcher can start: a name, a Minecraft version, a loader, an icon, launch settings, and its own private game folder (worlds, mods, options). Two instances never share worlds or mods. |
| **Game instance** | An instance you *play* (`Server = false`). Listed on the **Instances** page (code: `dashboard`). |
| **Server** | An instance you *host* (`Server = true`): its `.minecraft` is the server folder. Listed on the **Servers** page. Same store as instances. |
| **Owner** | The profile that owns an instance. Each profile only sees its own. |
| **Dashboard** | Code name of the **Instances** page (grid of instance cards + "last played" panel). |
| **Skin** | A player texture (PNG, *classic* or *slim* model) in the skin library. One skin is *equipped* per profile. |

## Minecraft concepts

| Term | Meaning |
|---|---|
| **Minecraft version** | The game release an instance runs (`1.20.1`, `26.3`, …). Also called *game version*. |
| **Release / snapshot** | Stable version vs. in-development build (`24w14a`). Search filters and result tags show **releases only**. |
| **Vanilla** | Plain Minecraft with no loader. Takes resource packs only. |
| **Loader** (mod loader) | Software that lets a game load mods: **Fabric**, **Quilt**, **Forge**, **NeoForge**. Installed automatically on first Play. |
| **Loader version / build** | The exact loader release (`0.16.9`, `1.20.1-47.4.10`). Stored as `loaderVersion`. |
| **Quilt ⊇ Fabric** | A Quilt instance runs Quilt *and* Fabric mods, so it matches both everywhere loaders are compared. |
| **JRE** | The Java runtime the game needs; downloaded from Mojang per version, never asked from the player. |
| **Assets / libraries / natives** | Game files fetched from Mojang's CDN: sounds & textures / Java jars / OS-specific binaries. Shared by all instances. |
| **CDN** | Mojang's public download servers the launcher fetches game files from. |
| **World** | A save folder (`saves/<name>/`) recognised by its `level.dat`. |
| **`.minecraft`** | The game directory *inside* an instance (`instances/<id>/.minecraft/`). |
| **Offline mode / UUID** | Play without a Microsoft account; the UUID is derived from the nickname. |
| **Authlib-injector / Yggdrasil** | The Java agent + tiny local skin server that make skins show without an account. |

## Addons (content)

| Term | Meaning |
|---|---|
| **Addon** | UI word for *any downloadable content from Modrinth*: a mod, resource pack, shader or modpack. The nav entry **Addons** opens the search page (code: `search`). "Content" in code/docs means the same. |
| **Mod** | Code that changes the game. Needs a loader. Goes to `mods/`. |
| **Resource pack** | Textures/sounds/language. Works on Vanilla too. Goes to `resourcepacks/`. |
| **Shader** (shader pack) | Lighting/visual effects. Goes to `shaderpacks/`. Needs a loader in this launcher. |
| **Modpack** | A bundle (`.mrpack`) of many mods + settings. Can become a **new instance** (with the loader the pack declares) or be poured into a compatible existing one, never overwriting. |
| **Project** | Modrinth's word for one addon *page* (id, slug, title, author, icon). A search result is a Project. |
| **Project version** | One release of a project with the Minecraft versions and loaders it supports. |
| **File** | The downloadable artifact of a version, verified by SHA-1. |
| **Dependency** | A link from a version to another project: `required` (auto-installed), `optional` (only mentioned), `incompatible` (blocks install), `embedded` (already inside). |
| **Plan** | The result of *planning* an install: which version + which required dependencies will be downloaded, or a plain error (no build, incompatible with X). |
| **Compatible instance** | An instance whose Minecraft version *and* (for mods/modpacks) loader match the addon. The Add picker lists only these. |
| **Locked (instance mode)** | When Addons is opened from an instance's page, version and loader are fixed to that instance (shown disabled) and **Add** installs immediately. |
| **Added** | Card state meaning the project is already in the instance (per `content.json`) or just finished installing. |
| **`content.json`** | Per-instance record of what the launcher installed (project, version, file, SHA-1, *required by*, incompatibilities, icon, description). Files added by hand are not in it. |
| **Modrinth** | The public addon marketplace and the only content provider (`api.modrinth.com/v2`). |
| **Provider** | Go interface (`modsearch.Provider`) that a marketplace implements; lets another one be added without touching the UI. |

## Search & AI

| Term | Meaning |
|---|---|
| **Query** | Provider-agnostic search input: type, text, version, loader, sort, categories, offset, limit. |
| **Facet** | Modrinth's filter syntax: a JSON array of OR-groups ANDed together. The launcher builds it from a Query. |
| **Category** | A Modrinth tag such as `optimization`, `technology`, `magic`. Belongs to one project type. Shown as removable tags; loaders are *not* categories here. |
| **Sort (`index`)** | Result order: `relevance` (default), `downloads`, `newest`, `updated`. There is no ascending order. |
| **Page / offset** | Results are fetched 30 at a time; a new page *replaces* the grid. |
| **Cache** | Saved copies of remote answers (memory + `cache/search/*.json`) so the page is fast and works offline. |
| **Index / indexation** | Modrinth keeps the search index server-side. The launcher builds **no local search index**; its only local "index" is `content.json` (what an instance has). See [Search](04-search.md). |
| **Ask AI** | Chat panel on Addons that turns a sentence into a Modrinth search and recommends up to 3 results. |
| **Intent** | The structured search the AI read from a message: type, query, categories, version, loader, sort. |
| **Allowed lists** | The only values an Intent may hold (page's types, Modrinth's categories, known versions, four loaders, four sorts). Anything else is dropped. |
| **Pick** | Step 2 of Ask AI: the model chooses ≤3 of the top 8 results and gives a one-line **reason**. |
| **Provider (AI)** | Groq (built in), Claude, OpenAI, Gemini or Grok. Different from a content provider. |
| **Built-in key** | A Groq key scrambled into release binaries, never stored in the repo. |
| **Free plan / paid** | Marker on each AI model: usable with a free provider key, or needing credit. |

## App mechanics

| Term | Meaning |
|---|---|
| **Wails** | Framework that packs a Go backend and a web UI into one desktop executable. |
| **Binding** | A Go method exposed to JavaScript as a promise-returning function (`api.SearchContent(...)`). |
| **Event** | A Go → UI push message: `install:progress`, `content:progress`, `game:state`, `server:state`, `server:log`, `app:close`. |
| **Bridge** | `frontend/src/api/bridge.ts`, the single typed door to bindings/events; falls back to an in-memory **mock** in a plain browser. |
| **Screen** | One page the UI can show; a value of the `Screen` type in `state/index.tsx`. |
| **Navigation history** | The stack of previous screens (max 20) that **Back** pops. |
| **Tab** | A sub-page inside an instance or server page (Mods, Worlds, Settings, …). |
| **Toast / Notification** | Bottom-right message for progress, success or errors (content installs, launch progress). |
| **Play / Launch** | Build the Java command line and start the game; shows a loading modal that can be hidden. |
| **Content queue** | Serial queue of Add jobs so progress toasts stay readable (`useContentQueue`). |
| **Tokens** | Design variables (colors, radius, shadows) in `theme/tokens.css`; two themes: *Pastel Overworld* (light) and *Pastel End* (dark). |
| **i18n** | English and Spanish dictionaries; every visible string comes from one. |
| **Relay / Router (server)** | Two ways friends reach a hosted server from the internet: a public relay tunnel (default) or a UPnP router port-forward. |
