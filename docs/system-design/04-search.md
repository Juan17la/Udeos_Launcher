# 4. Search

The launcher searches addons (mods, resource packs, shaders, modpacks). It
does this in three layers, each usable without the next:

1. **API search**: a query goes to Modrinth's public API.
2. **Filters**: type, Minecraft version, loader, categories, sort, page.
3. **AI assistant** (optional): turns a sentence into those filters and
   recommends a few results.

There is also a fourth, much smaller thing that looks like search but is not:
listing what an instance already has (see [Local lookups](#local-lookups-not-search)).

> Indexation, honestly: the launcher does not build or maintain a
> search index of its own. Modrinth indexes the catalog on its servers; the
> launcher only *queries* that index and *caches* the answers. There are no
> embeddings, no vector store, no full-text engine in this repo.

## End-to-end flow

```mermaid
sequenceDiagram
  participant P as Player
  participant S as Search screen (React)
  participant B as bridge → App.SearchContent (Go)
  participant M as modsearch.Manager
  participant R as Modrinth API
  P->>S: types text / changes a filter
  S->>S: debounce 350 ms, build key(type,text,version,loader,sort,categories)
  S->>B: SearchContent(type,text,version,loader,sort,categories,offset,30)
  B->>B: sanitise sort; keep only real categories
  B->>M: Search(Query)
  alt fresh in memory (<10 min)
    M-->>S: page (no request)
  else
    M->>R: GET /search?query&facets&index&offset&limit
    R-->>M: hits
    M->>M: save to memory + cache/search/<key>.json
    M-->>S: page
  end
  Note over M,R: If Modrinth is unreachable → last disk copy for the same key
```

## 1. The API

### Provider abstraction

`modsearch.Provider` (`internal/modsearch/provider.go`) is the only thing the
rest of the app knows about a marketplace. Modrinth is the sole implementation
(`modrinth.go`, base URL `https://api.modrinth.com/v2`, 15 s timeout: a browse
that takes longer should fall back to cache, not freeze the page).

| Method | Modrinth endpoint | Used for |
|---|---|---|
| `Search(Query)` | `GET /search` | The results grid, and the AI's search |
| `GameVersions()` | `GET /tag/game_version` | Version dropdown (releases only, ~100 of ~900 entries) |
| `Categories()` | `GET /tag/category` | Category vocabulary for the AI (loaders removed) |
| `ProjectDetail(id)` | `GET /project/{id}` | Details page (full description, gallery, links) |
| `Versions(id, mc, loader)` | `GET /project/{id}/version` | Add: choose the build that fits the instance |
| `VersionByID(id)` | `GET /version/{id}` | Dependencies pinned to a version |
| `VersionsByHashes(sha1s)` | `POST /version_files` | Modpacks: map files → projects |
| `Projects(ids)` | `GET /projects?ids=[…]` | Names/icons for dependencies and content list |

Only the first four serve *browsing*. The rest run once, at Add time, never
per card, so scrolling a page of 30 results costs one request.

### Wails bindings (what the UI can call)

| Binding | File | Purpose |
|---|---|---|
| `SearchContent(type, text, version, loader, sortBy, categories, offset, limit)` | `app_search.go` | One page of results → `{results, total, offset}` |
| `ListSearchGameVersions()` | `app_search.go` | Version dropdown |
| `AskAI(message, types, prev, lockVersion, lockLoader)` | `app_ai.go` | Chat answer (see §3) |
| `AIStatus / SetAI / ResetAI` | `app_ai.go` | AI provider settings |
| `ListInstalledProjects(instanceId)` | `app_content*.go` | Ids already in an instance ("Added") |

### What a result carries

`Result` = `id, slug, title, author, description (≤160 chars), iconUrl,
downloads, projectType, loaders[], gameVersions[]`. Loaders are picked out of
Modrinth's mixed category list (`fabric|forge|quilt|neoforge`); game versions
keep releases only (snapshots like `24w14a` are dropped). The full project
is fetched later, on the Details page.

## 2. Filters

A `Query` is provider-agnostic; the Modrinth adapter turns it into facets.

| Filter | UI control | Becomes (facet / param) | Rules |
|---|---|---|---|
| **Type** | Tabs: Mods · Resource Packs · Shaders · Modpacks | `project_type:<type>` (always present) | Instance mode narrows it: Vanilla → resource packs; server → mods |
| **Text** | Search box (debounced 350 ms) | `query=` | Under 3 characters is not saved to disk |
| **Minecraft version** | Dropdown | `versions:<v>` | Locked to the instance in instance mode |
| **Loader** | Dropdown (Mods & Modpacks only) | `categories:<loader>` (Quilt → `quilt` or `fabric`) | Never narrows resource packs/shaders; locked in instance mode |
| **Categories** | Removable tags (set by AI "See all") | one `categories:<name>` group each | All must match; unknown names dropped in Go; cleared when the type changes |
| **Sort** | Dropdown | `index=` `downloads` \| `newest` \| `updated` (omitted = relevance) | No ascending order exists in Modrinth |
| **Page** | Pager (Previous / numbers / Next / jump-to) | `offset`, `limit=30` | New page *replaces* the grid |

### How facets combine

Modrinth's `facets` is a JSON array of OR-groups that are ANDed. The launcher
emits one group per filter, so every filter narrows the result:

```json
[["project_type:mod"], ["versions:1.20.1"], ["categories:fabric"], ["categories:optimization"]]
```

For Quilt the loader group becomes `["categories:quilt","categories:fabric"]`
(an OR inside one group) because Quilt runs Fabric mods.

### Client-side behaviour

- **Race safety:** every request bumps a sequence number; only the latest may
  update the page, so a slow old query can't overwrite a newer one.
- **First load** shows skeleton cards; paging dims the old grid under a
  loader.
- **Fixed DOM size:** one page (30 cards) is mounted at a time.
- **Version list** is fetched once per app run and shared by every mount
  (`loadSearchVersions`).
- **Loader vs. modpacks:** Modrinth's loader filter on a modpack's *version
  list* is loose (it can return other loaders' builds), so the launcher
  filters those versions again itself when adding.

## Caching (the closest thing to "indexation")

Two layers in `modsearch.Manager`, plus a reusable idiom:

| Layer | Where | Lifetime | Role |
|---|---|---|---|
| Memory | Go map, ≤64 pages, oldest evicted | 10 min | Paging back/forth and re-running a query cost no request |
| Disk | `cache/search/<type>_<version>_<loader>_<sort>_<offset>_<hash8>.json` | until overwritten | Offline fallback: read only when Modrinth can't be reached |
| Lists | `cache/search/game_versions.json`, `categories.json` | once per process in memory + disk | Version dropdown, AI vocabulary |

`internal/cache.Fetch(path, source, fetch)` is the single idiom: *try the
network → on success write the file → on failure read the last file → if
neither, error "cannot reach Modrinth"*. The cache key is a deterministic name
from `(type, version, loader, sort, offset, sha1(text[+categories]))`, so the
same query always maps to the same file.

## Local lookups (not search)

These read the launcher's own files; there is no query language.

| What | Source | Used by |
|---|---|---|
| "Is this project already in the instance?" | `instances/<id>/content.json` → `ListInstalledProjects` | Added state on cards |
| Instance's mods/packs with icons & descriptions | `content.json` + folder listing → `ListContent` | Instance tabs (cards view) |
| Which instances can take an addon? | `utils/compat.ts` (version in project's versions; loader in project's loaders; Vanilla refuses mods) | Add picker and Details side panel |
| Worlds / screenshots / files | Directory reads on tab open | Instance tabs |

`content.json` is effectively a small local index of installed addons keyed
by project id and SHA-1, used for "already added", dependency checks
(`requiredBy`) and incompatibility checks.

## 3. AI support

The AI is a planner and a writer, never a source of content. It answers in two
model calls with Modrinth in between:

```mermaid
flowchart LR
  A["Player message<br/>'my game lags on a weak PC'"] --> B["Plan<br/>model returns up to 3 goals:<br/>label, filters, known project names"]
  B --> C["validate()<br/>drop anything not on the allowed lists"]
  C --> D["Modrinth searches in parallel<br/>(cached SearchContent) + name lookups"]
  D --> E["Compose<br/>model writes a summary and reasons<br/>for up to 8 real results per goal"]
  E --> F["ids checked against the results<br/>max 3 per group, 6 in all"]
  F --> G["Answer: summary, grouped picks<br/>(Add, Details), follow-ups"]
```

- The plan's filter values (type, categories, sort) can only come from lists
  the launcher gives the model, and `validate()` checks them again because the
  answer is untrusted input.
- The Minecraft version and loader never come from the model: an instance's
  values win, otherwise they are read from exact tokens in the player's words.
- Every pick is an id from a real Modrinth result. Names, icons and versions
  come from Modrinth; only the explanations are model text, shown as plain
  text.
- When composing fails (rate limit, unreadable answer) the player still gets
  the top results of each goal with Modrinth's own descriptions.
- Requests leave from Go, so the web view never sees a key. A player's own key
  is stored in `ai.json` (mode `0600`) and never returned to the UI.

The full flow, the providers and models, the built-in key and its rate limits
are in [AI advisor](../internals/ai-advisor.md).

## Design decisions worth remembering

- **No local index** keeps the launcher light (a local model was tried and
  dropped for size/RAM); Modrinth's index does the work.
- **Provider interface** exists so CurseForge (needs an API key) could be added
  without UI changes. Modrinth has no world/map project type, so a "Worlds"
  section in Addons is blocked on a provider.
- **Compatibility checks happen at Add time**, not per card, to keep browsing
  to a single request.
- **AI output is always re-validated**: the model narrows *what to search*, it
  never decides *what exists*.
