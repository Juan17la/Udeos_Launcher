# Functional requirements

What the system must do. Each requirement has an ID (`FR-xx.y`), a priority
and the feature it implements (see the [feature catalogue](features.md)). All
requirements listed here are implemented in the current release unless the
status says otherwise.

Priority follows MoSCoW: Must (the product does not work without it), Should
(important, a workaround exists), Could (nice to have).

## FR-01 Profiles and setup

| ID | Requirement | Priority | Feature |
|----|-------------|----------|---------|
| FR-01.1 | The system shall show a setup screen on first run and when a profile is added, asking for a nickname, a language and a theme, one step at a time. | Must | F-01 |
| FR-01.2 | The system shall accept a nickname only if it has 3 to 16 characters made of letters, digits or underscores, and is not already used by another local profile. | Must | F-01 |
| FR-01.3 | The system shall require acceptance of the privacy terms the first time a profile is created and let the player read them before accepting. | Must | F-01, F-31 |
| FR-01.4 | The system shall derive a stable offline UUID from the nickname and use it for every launch. | Must | F-01 |
| FR-01.5 | The system shall let the player add, switch and remove profiles from the account menu. | Must | F-02 |
| FR-01.6 | When a profile is removed, the system shall move its instances and skins to the remaining profile and delete no game data. | Must | F-02 |
| FR-01.7 | The system shall store language and theme per profile and apply them on start and on profile switch. | Must | F-03 |
| FR-01.8 | The system shall offer a Custom theme from a base (light or dark) and one accent, deriving all other colours with readable contrast. | Should | F-03 |
| FR-01.9 | The system shall never open the setup screen again for an existing profile, and Back shall never return to it. | Must | F-01, F-27 |

## FR-02 Instance management

| ID | Requirement | Priority | Feature |
|----|-------------|----------|---------|
| FR-02.1 | The system shall list the active profile's instances with icon, name, Minecraft version, loader and last played time, as cards or as a list (choice remembered). | Must | F-04 |
| FR-02.2 | The system shall highlight the instance played last with its statistics and a primary Play action. | Should | F-04 |
| FR-02.3 | The system shall show an empty state with a call to create the first instance when the profile has none. | Must | F-04 |
| FR-02.4 | The system shall create an instance from a name, an icon, a loader (Vanilla, Fabric, Quilt, Forge, NeoForge) and a Minecraft version. | Must | F-05 |
| FR-02.5 | The version list shall default to the newest release, hide snapshots and old versions behind a toggle, and with a loader selected list only versions that loader supports. | Must | F-05 |
| FR-02.6 | The system shall name the loader build it will install before the player confirms. | Should | F-05, F-11 |
| FR-02.7 | The system shall offer Create & play (install and launch at once) and Just create it (save only). | Must | F-05 |
| FR-02.8 | The system shall create an instance from a `.udeos` join file, reproducing version, loader and mods and adding the server to the multiplayer list. | Should | F-05, F-23 |
| FR-02.9 | The system shall give each instance its own game folder so worlds, mods, packs, options and screenshots never leak between instances. | Must | F-07 |
| FR-02.10 | The system shall let the player rename an instance and change its icon. | Should | F-07 |
| FR-02.11 | The system shall delete an instance only after explicit confirmation, and stop it first if it is running. | Must | F-07 |
| FR-02.12 | The system shall open the instance folder in the system file manager. | Should | F-07 |

## FR-03 Installation and launch

| ID | Requirement | Priority | Feature |
|----|-------------|----------|---------|
| FR-03.1 | The system shall download the client, libraries, natives and assets of the chosen version from Mojang's CDN. | Must | F-10 |
| FR-03.2 | The system shall download the Java runtime the version declares, without requiring Java on the machine. | Must | F-10 |
| FR-03.3 | The system shall verify each downloaded file against its published hash and retry or fail on a mismatch. | Must | F-10 |
| FR-03.4 | The system shall store shared files once and reuse them across instances. | Must | F-10 |
| FR-03.5 | The system shall install Fabric, Quilt, Forge and NeoForge without the player running an installer. | Must | F-11 |
| FR-03.6 | The system shall build the Java command line for offline mode with the profile's nickname and UUID and start the game. | Must | F-06 |
| FR-03.7 | During a launch the system shall show, in place of Play, the phase, one percentage, a progress bar and Cancel. | Must | F-06 |
| FR-03.8 | The system shall let the player cancel an install in progress without leaving corrupt files in use. | Must | F-06 |
| FR-03.9 | While the game runs, the system shall show a Playing state with elapsed time and a confirmed Close game action. | Should | F-06 |
| FR-03.10 | When the game exits with an error, the system shall show a dialog and offer to open the logs folder. | Must | F-06 |
| FR-03.11 | The system shall record play time and the last played date per instance. | Should | F-04, F-06 |
| FR-03.12 | The system shall write a launcher log per instance whose first line is the full Java command. | Should | F-06 |

## FR-04 Instance content

| ID | Requirement | Priority | Feature |
|----|-------------|----------|---------|
| FR-04.1 | The instance page shall show Resource packs, Datapacks, Worlds, Screenshots and Settings for every instance, and Mods and Shaders for modded instances. | Must | F-07 |
| FR-04.2 | Each file tab shall list its items with Modrinth metadata when known, or the file name and "Added by hand" otherwise. | Must | F-07 |
| FR-04.3 | Each file tab shall accept files by drag and drop and by a file picker. | Must | F-17 |
| FR-04.4 | The system shall validate a hand-added file for its kind and loader and refuse it with a reason if it does not fit. | Must | F-17 |
| FR-04.5 | Removing a mod, resource pack or shader shall hide it at once and offer Undo for 5 seconds before deleting. | Should | F-07 |
| FR-04.6 | The system shall import a world from a folder or `.zip`, renaming on a name clash, and export a world to `.zip`. | Must | F-08 |
| FR-04.7 | Deleting a world shall require confirmation. | Must | F-08 |
| FR-04.8 | The system shall show screenshots full size and let the player save them. | Should | F-08 |
| FR-04.9 | The system shall let the player set memory (up to installed RAM, default 2 GB), a Java executable and extra JVM arguments per instance, and warn when memory is unsafe. | Must | F-09 |

## FR-05 Addons

| ID | Requirement | Priority | Feature |
|----|-------------|----------|---------|
| FR-05.1 | The system shall search Modrinth by text and project type (mod, datapack, resource pack, shader, modpack). | Must | F-12 |
| FR-05.2 | The system shall filter by Minecraft version, loader and categories, and sort by relevance, downloads, newest or updated. | Must | F-12 |
| FR-05.3 | Opened from the sidebar, Add shall list only the instances the addon can run on and install with one more click. | Must | F-13 |
| FR-05.4 | Opened from an instance, Addons shall be locked to its version and loader, show installed results as Added, and Add shall install at once. | Must | F-13 |
| FR-05.5 | Before installing, the system shall check the build exists for the target version and loader and, when it does not, name the loader that is supported. | Must | F-13 |
| FR-05.6 | The system shall install required dependencies together with the addon. | Must | F-13 |
| FR-05.7 | The system shall refuse an install that conflicts with installed content and offer alternatives (another version or similar projects). | Must | F-13 |
| FR-05.8 | When the player has no compatible instance, the system shall explain why and offer to create one. | Should | F-13 |
| FR-05.9 | Installs shall run in a serial background queue with progress and results reported in Activity. | Must | F-13, F-28 |
| FR-05.10 | The system shall show a project's full page with sanitised description, gallery, links, supported versions and loaders, and the player's compatible instances. | Must | F-14 |
| FR-05.11 | The system shall let the player install a specific release and replace a different installed release of the same project. | Should | F-14 |
| FR-05.12 | The system shall create a new instance from a modpack, or merge a modpack's mods into an existing modded instance without overwriting the player's files. | Must | F-15 |
| FR-05.13 | Adding a datapack shall ask for the target world, or use the server's world on a server. | Must | F-16 |
| FR-05.14 | Returning from Details shall restore the search text, filters, page and results. | Should | F-12, F-27 |

## FR-06 AI advisor

| ID | Requirement | Priority | Feature |
|----|-------------|----------|---------|
| FR-06.1 | The system shall accept a free-text request and answer with addons grouped by need, each with a reason. | Must | F-18 |
| FR-06.2 | Every suggested addon shall come from real Modrinth results; names, icons and versions shall come from Modrinth, not from the model. | Must | F-18 |
| FR-06.3 | When opened from an instance, suggestions shall respect its version and loader and exclude installed addons. | Must | F-18 |
| FR-06.4 | The system shall ask a clarifying question when the request is too vague. | Should | F-18 |
| FR-06.5 | The system shall keep the conversation so follow-ups refine the previous answer, and offer follow-up suggestions. | Should | F-18 |
| FR-06.6 | Add and Details on a suggestion shall behave exactly as on the Addons page. | Must | F-18 |
| FR-06.7 | The system shall work with a built-in key and let the player configure their own key and model for Groq, Claude, OpenAI, Gemini or Grok. | Should | F-18 |
| FR-06.8 | A stored key shall never be shown again in the interface; returning to the built-in provider shall forget it. | Must | F-18 |
| FR-06.9 | The system shall report a rate limit or provider error in plain language. | Must | F-18 |

## FR-07 Servers

| ID | Requirement | Priority | Feature |
|----|-------------|----------|---------|
| FR-07.1 | The system shall create a server (Vanilla, Fabric, Forge, NeoForge or from a modpack) with a version, name and icon, after acceptance of Mojang's EULA. | Must | F-19 |
| FR-07.2 | The system shall download and install the server on first start and report Stopped, Starting, Ready and Stopping. | Must | F-19 |
| FR-07.3 | The system shall ask for confirmation before starting a third concurrent server. | Should | F-19 |
| FR-07.4 | Stop shall save the world and shut the server down cleanly. | Must | F-19 |
| FR-07.5 | The system shall expose a running server to the internet through a relay by default, or through UPnP, and allow a custom relay. | Must | F-20 |
| FR-07.6 | The system shall show a stable internet address, a local network address and `localhost`, with one-click copy. | Must | F-20 |
| FR-07.7 | The system shall manage online players, whitelist, operators and bans. | Must | F-21 |
| FR-07.8 | The system shall offer three join policies: Udeos players, Anyone, Microsoft accounts. | Must | F-21 |
| FR-07.9 | The system shall stream the server console live and send typed commands. | Must | F-22 |
| FR-07.10 | The system shall back up the world to `.zip`, consistently even while running, and restore on a stopped server after an automatic backup. | Must | F-22 |
| FR-07.11 | The system shall edit server properties and memory, and ask to stop a running server before applying them. | Must | F-22 |
| FR-07.12 | The system shall write a `.udeos` join file for a modded server. | Should | F-23 |

## FR-08 Skins

| ID | Requirement | Priority | Feature |
|----|-------------|----------|---------|
| FR-08.1 | The system shall keep a skin library per profile with a default skin that cannot be removed. | Must | F-24 |
| FR-08.2 | The system shall import `.png` skins by drop or picker, guess Classic or Slim, and convert 64 by 32 skins to 64 by 64. | Must | F-24 |
| FR-08.3 | The system shall show the worn skin on a 3D model the player can rotate, and use its face as the profile avatar. | Should | F-24 |
| FR-08.4 | The system shall let the player wear, edit and delete (with confirmation) a skin. | Must | F-24 |
| FR-08.5 | The editor shall paint on the 3D model with pencil, eraser, fill and picker, undo and redo, second layer, part visibility and zoom. | Must | F-25 |
| FR-08.6 | The editor shall keep unsaved work as a draft and offer it next time. | Should | F-25 |
| FR-08.7 | The system shall serve the worn skin to the game in singleplayer and on the player's servers set to Udeos players. | Must | F-26 |

## FR-09 Shell and system

| ID | Requirement | Priority | Feature |
|----|-------------|----------|---------|
| FR-09.1 | The system shall provide persistent navigation to Instances, Servers, Skins and Addons, plus a contextual primary action. | Must | F-27 |
| FR-09.2 | The sidebar shall fold to an icon rail below 1000 px wide or on request, and remember the choice. | Should | F-27 |
| FR-09.3 | Every non-root page shall offer Back to the previous page, restoring its tab and scroll position; Back from an empty history shall go to Instances. | Must | F-27 |
| FR-09.4 | The system shall list running jobs, open games and running servers in an always-present Activity tray, with Cancel and Close game. | Must | F-28 |
| FR-09.5 | The system shall announce finished jobs briefly and keep failure notices until read. | Should | F-28 |
| FR-09.6 | The system shall check for a newer release once at start and, on consent, download and install it. | Should | F-29 |
| FR-09.7 | Closing the window while servers run shall ask for confirmation, then stop every server and wait for its save. | Must | F-30 |
| FR-09.8 | The system shall show the privacy terms on demand, listing every external service. | Must | F-31 |
| FR-09.9 | Backend failures shall reach the player as a short headline plus the detailed message. | Must | all |
