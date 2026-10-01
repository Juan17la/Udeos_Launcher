# 15. UX audit (2026-09-30): the average player, fewest clicks, no scrolling

Method: every screen, tab, dialog and notification was opened in the real UI (mock backend, 1180×760, the launcher's default window) and screenshotted, and every screen's source was read. The judge is an **average player with little technical knowledge who wants to play or host in the fewest clicks**. Numbers below are measured, not guessed: "fold" is the bottom of the 760 px window.

Severity: **S1** blocks or confuses the main goal · **S2** costs clicks/scrolling or hides something needed · **S3** polish.

## 0. Rules this audit applies everywhere

1. **Create = 2 clicks.** Everything has a good default; the player only types what only they know (a name, and even that is pre-filled).
2. **Above the fold.** A task screen fits in the window. Long lists scroll *inside* their box; the page does not.
3. **One primary action per screen**, visible without scrolling, next to the thing it acts on.
4. **Technical words live behind "Advanced".** Loader, relay, router, JVM arguments, Java path, port, `nip.io` never appear in the default view.
5. **Notifications never cover content.** They live in a fixed spot that reserves its own space (the nav), can be hidden, and keep history.
6. **Errors say what happened and what to do in one line.** The raw reason is one click away ("Show details"), never the default.
7. **Pick from a closed list, don't show the whole list.** Big option sets (icons, versions) open on demand.

## 1. Findings by screen

### Shell: nav, back button, page headers
| # | Sev | Finding | Fix |
|---|-----|---------|-----|
| N1 | S2 | Every page spends 160–280 px before its content: nav (72) + Back strip (32) + big title (≈50) + a subtitle sentence (≈50). On Addons the first card starts at y=460; on Create the first field at y=320. | One header row: `‹ Back  Title` + the page's primary action on the right. Subtitles deleted (they restate the title). |
| N2 | S1 | The nav's green **New Instance** is on every page, including Servers (which has its own **New Server**) and Skins/Addons (where neither fits). Two green "new" buttons on Servers; the wrong one is the loudest. | The nav action is contextual: Instances/Addons → New instance · Servers → New server · Skins → New skin. Pages drop their duplicate button. |
| N3 | S2 | "Back to Instances" on a server page (only when opened directly, but the label is derived, not checked). | Back label always names the real previous page; tested from every entry. |
| N4 | S2 | No place for background work: downloads and first starts only exist as floating toasts. | Activity button in the nav (see Notifications). |

### Notifications (toasts)
| # | Sev | Finding | Fix |
|---|-----|---------|-----|
| T1 | S1 | Fixed **bottom-right** stack, 320 px wide, z-9100. Seen in the screenshots: it sits on the third column's **Add / Details** buttons in Addons, and on the lower half of the server Settings form. Several jobs stack upward and cover more. | Move out of the content area (below). |
| T2 | S1 | Only *success* clears itself (5 s). Progress and errors have no hide; errors stay until × and there can be many. There is no way to hide the whole stack. | Nav **Activity** button: a ring/badge while work runs, a popover list (progress, cancel, history) that is closed by default. |
| T3 | S2 | Errors in toasts show the full technical reason (up to a paragraph). | See Errors. |
| T4 | S2 | A server's "Setting up … first start" toast repeats what the server page can say itself, and covers it. | Becomes a banner *inside* the server page/card (no floating element). |
| T5 | S3 | The minimized launch modal becomes one more toast. | Becomes an Activity item (with the same % and Cancel). |

New behaviour: progress and history live in the **Activity** popover; a finished or failed job also flashes a one-line **status strip** docked directly under the nav (it pushes nothing, covers only the empty header band, auto-hides after 4 s, errors stay until the popover is opened). Esc / outside click hides the popover.

### Login
| # | Sev | Finding | Fix |
|---|-----|---------|-----|
| L1 | S2 | Two steps (language, then nickname + consent): 4 clicks + typing before anything. | One step: language preselected from the system, nickname, one consent checkbox, one button. |
| L2 | S3 | The privacy text opens a dialog from two links that open the same thing. | One link. |

### Dashboard (Instances)
| # | Sev | Finding | Fix |
|---|-----|---------|-----|
| D1 | S1 | Creating is only reachable from the nav; an empty dashboard is a sentence and a button. | First tile of the grid is **+ New instance** (always there); the empty state is the tile alone, bigger. |
| D2 | S2 | The right "Last played" panel repeats the first card: same Play, plus "Open instance" (= Manage). It eats 330 px, so cards are 2 per row. | Removed. Cards are the list; the last played one is first. 3 per row. |
| D3 | S3 | Card footer shows "0 packs 0 worlds" for new instances. | Show only non-zero counts. |

### Create instance / server (`CreateInstance.tsx`)
Measured: instance form is **1242 px tall** (482 px below the fold); server form 1318 px. Clicks to a vanilla latest instance: name, version dropdown (+1 click to open, +1 to pick), Create = **≥5 actions**, plus scrolling to reach Create.
| # | Sev | Finding | Fix |
|---|-----|---------|-----|
| C1 | S1 | Version has no default ("Choose a version"), so the form cannot be submitted as it stands. | Latest release preselected. |
| C2 | S1 | The icon picker is an always-open grid of 35 cells (≈330 px), the tallest thing on the page. It is also in Edit. | Icon = one button showing the chosen icon; opens a popover grid, closes on select. Default icon preselected; never required. |
| C3 | S1 | Name is required and empty. | Pre-filled with a free name ("My World", "My World 2"); selected on focus so typing replaces it. |
| C4 | S1 | Five loader names (Vanilla/Forge/NeoForge/Fabric/Quilt) with no guidance. An average player cannot choose. | Two choices up front: **Vanilla** / **With mods** (+ **Modpack**, **Friend's file**). "With mods" preselects Fabric with "Recommended"; the other loaders sit in a small "Other loader" select. |
| C5 | S2 | "Show snapshots and old versions" is a full toggle row. | A small "older versions" link that adds them to the select. |
| C6 | S2 | Server: the EULA checkbox and the "opens to the internet" note are two more blocks; Create stays disabled until the EULA is ticked, with no hint why. | One line under the button: "By creating it you accept the Minecraft EULA" and the button is enabled. |
| C7 | S2 | No way to create from a modpack or from a friend's file here; both exist only buried in Addons. | They are the 3rd/4th choice of the same control (phases: join file + modpack server). |
| C8 | S2 | After Create the player lands on the instance page and must press Play. (A "play after" checkbox exists but is one more control.) | "Create & play" is the primary button; "Create" is secondary. |

Target: name (pre-filled) → **Create & play** = 2 clicks, nothing below the fold.

### Servers list and server page
| # | Sev | Finding | Fix |
|---|-----|---------|-----|
| V1 | S1 | (Fixed in script 62) new server not listed; cannot stop while starting; address tiny. | — |
| V2 | S1 | The server page opens on the **Console** (a wall of log text) for people who never opened a console. | Default tab: Players when stopped, Console only while starting/running. |
| V3 | S1 | Internet tab: two panels, "Relay/Router", "Address name … nip.io", "Your own relay" (host, secret). Pure jargon; 1380 px tall. | Default view: status + address + **Open / Close**. Everything else in a collapsed **Advanced** disclosure. |
| V4 | S1 | Settings tab: server form **and** a second "Launch settings" form (Java executable, extra JVM arguments) stacked: 1800 px, two Save buttons. | One Save. Launch settings move into **Advanced** (collapsed). Memory gets presets (Small 2 GB · Medium 4 GB · Large 8 GB) plus the slider. |
| V5 | S2 | The side panel stats (Players/Port/Memory/Run time) duplicate other places and leave a dead gap above Start. | Keep Players + Run time; Port/Memory are in Settings. |
| V6 | S2 | The Mods tab on a server is the instance file list with its drop zone, view toggle and folder link. | Same slimmed Files tab as instances (below). |
| V7 | S3 | Server card: "Stopped" line and the address row repeat the page header. | Kept: they are the glanceable part. |

### Instance page and content tabs
| # | Sev | Finding | Fix |
|---|-----|---------|-----|
| I1 | S1 | Mods tab: before the first mod you pass a 44 px **Search in Addons + Ask AI** bar, a 72 px **drop zone**, then a **view toggle + Open folder** row: ≈210 px of controls. | One toolbar: **+ Add mods** (→ Addons locked to this instance) · **Ask AI** · **Browse file** · view toggle · folder. Dropping a file anywhere on the tab works (overlay while dragging, like Skins). The static drop zone goes. |
| I2 | S2 | Cards vs compact view toggle is a setting nobody asked for. | Kept but as a small icon toggle in the toolbar. |
| I3 | S2 | Settings tab repeats launch settings with Java path and JVM arguments in the default view. | Memory presets on top; Java + arguments under **Advanced**. |
| I4 | S2 | Side panel text "Not downloaded yet — Play will download it first." wraps to 3 lines. | A single tag: "Downloads on first play". |
| I5 | S3 | Delete sits under Edit/Folder with only a size difference. | Moves into Edit's dialog footer ("Delete instance…"). |

### Addons (search)
Measured: first result row starts at y≈460; with the AI panel open, results start at y≈730 (below the fold).
| # | Sev | Finding | Fix |
|---|-----|---------|-----|
| A1 | S1 | **Filters are missing where they belong.** Modrinth categories (Optimization, Adventure, Magic …) exist in the backend (`Query.Categories`) but are only settable through the AI; there is no category filter in the UI. Loader is correctly hidden for packs/shaders, but nothing replaces it. | A **Categories** chip row for the selected type (top 8 + "More"), multi-select, shown whenever the type has categories; datapack type hides loader (phase datapacks). |
| A2 | S1 | With an instance locked, version and loader are **disabled dropdowns** that look broken. | Replace them with one fixed chip "For Modded Fun · 1.20.1 · Forge" (changes nothing, says why results are few). |
| A3 | S2 | The header says "Adding to Modded Fun" *and* the Back button says "Back to Modded Fun" *and* the title is "Addons". | One header: `‹ Modded Fun · Addons`. |
| A4 | S2 | The AI panel pushes results below the fold. | AI opens as a right-hand drawer or a one-line box that expands only after the first answer. |
| A5 | S2 | Result cards: 2 big equal buttons (Add, Details). "Details" duplicates a click on the whole card. | Card click = Details; one **Add** button. More cards per screen. |
| A6 | S2 | Pager: "Previous 1 2 3 … Next + go to" is 7 controls. | Keeps Previous/Next and the page number; "go to" removed. |

### Project details page
| # | Sev | Finding | Fix |
|---|-----|---------|-----|
| P1 | S1 | **There is no Add/Install button in the header**; it is in a left panel called "Install into" that only appears after loading and only lists compatible instances. A mod that fits nothing shows no explanation beyond a line of text. | Hero has a primary **Install** button: one compatible instance → installs; several → popover list; none → a clear "No instance fits. Create one for 1.20.1 Forge" action. |
| P2 | S1 | The mod's **options are not shown**: no version list, no required/optional dependencies, no changelog, categories only as tags. The player cannot pick a version or see what else gets installed. | Tabs: **About · Versions · Dependencies**. Versions = list with game version, loader, release/beta and an **Install this** button (phase D version picker). Dependencies = required (installed with it) vs optional. |
| P3 | S2 | "Client: required, Server: unsupported" is raw text. | Plain chips: "Works in game", "Works on servers". |
| P4 | S2 | Gallery comes before the description. | Description first, gallery after. |

### Dialogs, loading, errors
| # | Sev | Finding | Fix |
|---|-----|---------|-----|
| E1 | S1 | Errors show **the raw backend text** (HTTP urls, file paths, Go error chains) in the default view: `StatusMessage` renders `detail` always. Used in ≈25 places. | New `ErrorMessage`: friendly headline + one-line "what to do" from a message table (no internet → "Check your connection and try again"; incompatible mod → "These two mods don't work together"), raw text under **Show details**. |
| E2 | S2 | The Add picker dialog ("Add Sodium to…") appears even when exactly one instance fits. | One fit → install immediately and say where (toast/strip); several → list. |
| E3 | S2 | The launch error dialog shows the raw launch message only. | Same ErrorMessage, plus **Open logs**. |
| E4 | S3 | Generic "Got it" buttons. | Verbs that match: "Try again", "Open logs", "Close". |

### Skins
Fits the window (good). S3: the editor header (Cancel / Save) is far from the canvas; nothing blocking. No change in this round.

## 2. What is *not* working (bugs found while auditing)
- Servers: new server missing, Stop while starting (fixed in script 62).
- Mods search mixes in datapacks (Modrinth lists them as `project_type: mod`); fixed in the datapack phase.
- Incompatibility checks ignore version-pinned conflicts; no alternatives; no way to choose a version (phase D).
- Category filter exists in the backend but has no UI (A1).

## 3. Delivery order (one script each, the player-visible gain first)
Status: 1 done (script 63) · 2 done (script 64, with the friendly-error layer of step 3 pulled forward) · 3 done (friendly errors in 64; login in one step in script 70) · 4 done (script 65) · 5 done (script 71: slim toolbar + drop-anywhere Files tab, memory presets, one Save on the server Settings tab with Java under Advanced, Internet Advanced, default Players tab, Delete inside Edit) · 6 done (server from modpack: script 72; datapacks: script 73; join file: script 66; version picker + alternatives: script 65).

1. **Shell + notifications**: contextual nav action, one-row page headers, Activity button + status strip, first-start banner. (N1–N4, T1–T5)
2. **Create in 2 clicks**: one-screen form for instance and server, popover icon picker, defaults, Create & play, "+ New" tiles, dashboard without the side panel. (C1–C8, D1–D3)
3. **Friendly errors**. (E1–E4, L1–L2)
4. **Addons + details page**: categories, locked chip, Install in hero, tabs. (A1–A6, P1–P4)
5. **Instance and server pages**: slim Files tab, Advanced sections, presets, default tab. (V2–V6, I1–I5)
6. Backend features already approved: server from modpack, join file, version picker + alternatives, datapacks.
