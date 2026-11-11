# Feature catalogue

Every feature of Udeos Launcher, grouped by area. Each feature carries an ID
(`F-xx`) that the [functional requirements](functional-requirements.md) and
[use cases](use-cases.md) refer back to. Player-facing how-tos are in the
[user guide](../user-guide/getting-started.md).

## Summary

| ID | Area | Feature |
|----|------|---------|
| F-01 | Account | Offline nickname login and first-run setup |
| F-02 | Account | Multiple local profiles |
| F-03 | Account | Language and theme per profile |
| F-04 | Instances | Instance library (dashboard) |
| F-05 | Instances | Create an instance |
| F-06 | Instances | Play, launch progress and game supervision |
| F-07 | Instances | Instance page and content tabs |
| F-08 | Instances | Worlds and screenshots |
| F-09 | Instances | Launch settings (memory, Java, JVM arguments) |
| F-10 | Game install | Automatic game, asset and Java download |
| F-11 | Game install | Automatic mod loader install |
| F-12 | Addons | Modrinth search and filters |
| F-13 | Addons | One-click install with compatibility, dependency and conflict checks |
| F-14 | Addons | Project details and version picker |
| F-15 | Addons | Modpacks (new instance or merge) |
| F-16 | Addons | Datapacks per world |
| F-17 | Addons | Hand-added files with validation |
| F-18 | AI | Ask AI advisor |
| F-19 | Servers | Create and run dedicated servers |
| F-20 | Servers | Internet access (relay or UPnP) |
| F-21 | Servers | Players, whitelist, operators, bans, join policy |
| F-22 | Servers | Console, backups, settings |
| F-23 | Servers | Join file for friends (`.udeos`) |
| F-24 | Skins | Skin library |
| F-25 | Skins | 3D skin editor |
| F-26 | Skins | Skins in game through a local skin server |
| F-27 | Shell | Sidebar, collapsible rail and Back navigation |
| F-28 | Shell | Activity tray and notices |
| F-29 | Shell | Self-update |
| F-30 | Shell | Safe close with running servers |
| F-31 | Shell | Privacy and terms |
| F-32 | Tooling | Command line tool (`udeoscli`) |

## Account and profiles

### F-01 Offline nickname login and first-run setup

The first screen asks for three things, one step at a time: a nickname (3 to
16 letters, digits or underscores, the same rule Minecraft uses), a language
and a theme. The first time, the player also accepts the privacy terms. There
is no password and no online account. The nickname becomes the in-game name
and a stable UUID is derived from it.

### F-02 Multiple local profiles

The account menu at the foot of the sidebar opens Switch profile. A player can
add a profile (which runs the same setup), switch to another one or remove
one. Each profile owns its instances, servers, skins, language and theme.
Removing a profile never deletes data: its instances and skins move to the
profile that remains.

### F-03 Language and theme per profile

English or Spanish, and Dark (the reference), Light or Custom. Custom takes a
light or dark base plus one accent colour and derives the rest with contrast
checked. Changes apply live.

## Instances

### F-04 Instance library (dashboard)

The Instances page lists every instance as a card (icon, name, version tag,
loader tag, last played) with a quiet Play button, or as a compact list (the
choice is remembered). The instance played last stands apart in a feature
panel with play time, counts of worlds, packs and screenshots, and a large
Play. A "New Instance" tile closes the grid. With no instances, an empty
state invites the player to create the first one.

### F-05 Create an instance

Name and icon (a Minecraft block or item), then Vanilla, With mods (choose
Fabric, Quilt, Forge or NeoForge) or From a modpack, then the Minecraft
version (newest release preselected, older versions and snapshots behind a
toggle; with a loader chosen only supported versions are listed). Create &
play installs and starts the game at once; Just create it only saves the
instance. Import file creates an instance from a friend's `.udeos` join file.

### F-06 Play, launch progress and game supervision

Play turns into the launch strip in place: the current phase, one percentage,
a bar and Cancel. Slow but expected phases (first install, loader patching)
turn the bar gold and say so. Once the game runs, Play becomes a green
"Playing" chip with play time and Close game (confirmed). When the game exits
with an error, a dialog says so and opens the logs folder. Play time and
last played are recorded.

### F-07 Instance page and content tabs

A fixed side panel (icon, name, tags, install state, stats, Play, Edit,
Folder) and tabs. Vanilla instances show Resource packs, Datapacks, Worlds,
Screenshots and Settings; modded instances add Mods and Shaders. File tabs
share one pattern: Add resources (Addons locked to this instance), Ask AI,
Browse files or drag and drop, Cards or Compact view, open folder, and Remove
with a five-second Undo. Long mod lists start as rows with a filter box. Edit
renames the instance and changes its icon. Delete lives at the bottom of
Settings and asks first.

### F-08 Worlds and screenshots

Worlds can be imported from a folder or a `.zip` (name clashes get a number),
saved to the device as a `.zip`, opened in the file manager and deleted with
confirmation. Screenshots open full size in a preview dialog and can be saved.

### F-09 Launch settings

Memory slider up to the machine's RAM (default 2 GB, red when too low or when
less than 2 GB would remain for the system), optional Java executable (file
picker; empty means the managed runtime) and extra JVM arguments added after
the launcher's own.

## Game installation

### F-10 Automatic game, asset and Java download

The launcher reads Mojang's version manifest, downloads the client, libraries,
natives and assets, and the exact Java runtime the version declares. Every
file is checked against its published hash. Files are stored once and shared
by every instance, so a second instance of the same version starts without
downloading.

### F-11 Automatic mod loader install

Fabric and Quilt are installed from their meta APIs; Forge and NeoForge run
their official installer headless. The launcher picks a sensible build (newest
stable Fabric or Quilt, Forge's recommended build, newest stable NeoForge) and
names it on the create form. The player never runs an installer.

## Addons

### F-12 Modrinth search and filters

Tabs for Mods, Datapacks, Resource packs, Shaders and Modpacks; a search box;
one Filters button that folds in Minecraft version, loader, sort (relevance,
downloads, newest, updated) and topic chips. Results are cards with icon,
author, downloads, description, version range and loader tags, and Add.
Pagination keeps the page position when returning from Details.

### F-13 One-click install with checks

From the sidebar, Add asks which instance and lists only compatible ones.
From an instance, Addons is locked to that instance (version and loader
fixed, already-installed results read Added) and Add installs at once. Before
writing anything the launcher checks the build exists for that version and
loader (and says which loader it does support when not), that it is not
already installed, adds required dependencies, and refuses conflicts with a
See options dialog that offers alternatives. Downloads are verified and
cached; installs run in a background queue reported in Activity.

### F-14 Project details and version picker

The full Modrinth page inside the launcher: gallery, description (sanitised
Markdown), links (opened in the system browser), categories, supported
versions and loaders, and the player's compatible instances each with Add. A
Versions tab installs a specific release and replaces a different installed
one; releases that clash are listed apart.

### F-15 Modpacks

Add on a modpack offers New instance (version, loader, mods, configs and icon
from the pack) or merge into an existing modded instance without overwriting
the player's own files. A modpack can also become a server, installing only
its server-side parts.

### F-16 Datapacks per world

A datapack belongs to a world: Add asks for the instance, then the world. On
a server it goes straight to the server's world.

### F-17 Hand-added files with validation

Files dropped or browsed in are checked before they are accepted: a Forge mod
is refused on a Fabric instance, a random zip is refused as a resource pack.
Hand-added files show "Added by hand".

## AI

### F-18 Ask AI advisor

A chat page reachable from Addons and from any instance's file tab. The player
describes a goal ("my game lags on a weak PC"). The advisor plans Modrinth
searches, picks only from real results, groups picks by need with a reason
for each, offers follow-up buttons and See all in Addons per group, and asks a
question when the request is too vague. From an instance it respects the
version and loader and leaves out what is installed. Works out of the box
through a built-in Groq key; the player can switch to their own key for Groq,
Claude, OpenAI, Gemini or Grok and pick a model (marked free plan or paid).
The key is stored locally and never shown again.

## Servers

### F-19 Create and run dedicated servers

New Server: Vanilla, With mods (Fabric, Forge, NeoForge) or From a modpack,
version, name and icon; creating accepts Mojang's EULA. Start downloads the
server on first run; status moves Stopped, Starting, Ready, Stopping. Starting
a third server at once asks first. Running servers use the feature tone on
their cards.

### F-20 Internet access

Servers are reachable from the internet while running, by default through a
public relay (works behind carrier NAT), or through the router (UPnP). A
custom relay can be set. The address is stable across restarts and copied
with one click. A local network address and `localhost` are shown too.

### F-21 Players and join policy

Tabs for Online, Whitelist, Admins (operators) and Banned. Who can join:
Udeos players (default, skins visible), Anyone (any launcher, no skins) or
Microsoft accounts only.

### F-22 Console, backups and settings

Live console with command input. Backups as `.zip` files (consistent even
while running), restore on a stopped server with an automatic backup first.
Settings for name, game mode, difficulty, hardcore, PvP, flight, command
blocks, seed, max players, view distance, port, memory and Java; changing
them on a running server asks to stop it.

### F-23 Join file for friends

On a modded server, Save file for friends writes a `.udeos` file. A friend
imports it on New Instance and gets the same version, loader and mods with the
server already in the multiplayer list.

## Skins

### F-24 Skin library

The Skins page shows the worn skin on a turnable 3D model and a library of
cards. A `.png` can be dropped anywhere or browsed; the model (Classic or Slim)
is guessed; old 64 by 32 skins are converted. Click to wear, hover to Edit or
Delete. Steve is always present. The worn skin's face becomes the profile
avatar.

### F-25 3D skin editor

Paint directly on the model: pencil, eraser, fill and picker (B, E, G, I),
undo and redo, second layer toggle, part visibility, Minecraft dye palette,
skin tones and recent colours, zoom toward the pointer with a pixel grid.
Unsaved work is kept as a draft.

### F-26 Skins in game

A local Yggdrasil-compatible skin server and authlib-injector make the worn
skin visible in singleplayer on every version and on the player's own servers
set to Udeos players.

## Shell

### F-27 Sidebar and navigation

A left sidebar with the brand, a contextual primary button (New Instance, New
Server, New skin), Instances, Servers, Skins and Addons, then Collapse
sidebar, Activity and the profile. Below 1000 px, or when collapsed (remembered),
it folds to an icon rail. Pages with a parent show "Back to ..." that
restores the previous page, its tab, filters and scroll position.

### F-28 Activity tray and notices

Always in the sidebar. While work runs it shows a ring, a count and a thin
bar; its popover lists each job with progress and Cancel, open games with
Close game and running servers. Finished or failed jobs flash a short notice
(errors stay until read). Lists that are loading show skeleton rows.

### F-29 Self-update

At start the launcher checks GitHub Releases once. If a newer version exists
it offers Update (downloads the right package for the system and installs it)
or Later.

### F-30 Safe close with running servers

Closing the window while servers run asks first, then stops each server and
waits for it to save its world.

### F-31 Privacy and terms

A dialog, reachable from setup and the account menu, explains what stays local
and every service the launcher connects to.

### F-32 Command line tool

`cmd/udeoscli` exposes the same core (versions, loaders, create, list, install, add, modpack, play)
for scripting and testing. See the [architecture overview](../architecture/overview.md).
