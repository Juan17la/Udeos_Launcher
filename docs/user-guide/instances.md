# Instances

An instance is one copy of Minecraft with its own game folder. Worlds, mods,
resource packs, shaders, options and screenshots all stay inside it, so two
instances never interfere with each other. Game files that are the same for
everyone (the game itself, its sounds, Java) are downloaded once and shared.

## Creating an instance

Press New Instance from anywhere in the launcher. You choose:

| Field | Notes |
|-------|-------|
| Name and icon | The icon is a Minecraft block or item. You can change both later with Edit. |
| Mod loader | Vanilla, Fabric, Quilt, Forge or NeoForge. The version list only shows versions the loader supports. |
| Version | The newest release is preselected. Snapshots and old versions are behind a checkbox. |

The launcher always installs a sensible loader build for you: the newest stable
Fabric or Quilt, Forge's recommended build, or the newest stable NeoForge.
There is nothing else to pick.

Two other ways to create an instance:

- From a modpack: on the Addons page, open the Modpacks tab and press Add, then
  New instance. The pack's Minecraft version, loader, mods and settings are set
  up for you.
- From a friend's file: press Import file on the New Instance screen and choose
  the `.udeos` file a friend saved from their server. You get the same version,
  loader and mods, with the server already in your multiplayer list.

## Playing

Press Play on an instance card or on the instance page. The first time, the
launcher downloads whatever is missing. Later launches only check the files
and start.

When the game closes because of an error, a dialog tells you so and offers to
open the logs folder. Share the log file when asking someone for help.

## The instance page

Click an instance card (or Manage) to open its page. The side panel shows its
version, loader, play time and last played date, with Play, Edit, Folder and
Delete below. Delete asks before removing anything.

The tabs depend on the kind of instance:

| Tab | Vanilla | Modded | What it does |
|-----|:-------:|:------:|--------------|
| Mods | | yes | Mods added from Addons or dropped in as `.jar` files. |
| Datapacks | yes | yes | Datapacks for one world at a time (pick the world at the top). |
| Resources | yes | yes | Resource packs. |
| Shaders | | yes | Shader packs. They also need a shader mod such as Iris (Fabric, Quilt) or Oculus (Forge). |
| Worlds | yes | yes | Your saves: import, export, open the folder, delete. |
| Screenshots | yes | yes | Your screenshots. Click one to see it full size or save it. |
| Settings | yes | yes | Memory, Java and extra launch options for this instance. |

Every file tab has the same controls:

- Add from Modrinth opens Addons locked to this instance: only things that
  work on its version and loader are shown, and Add installs at once.
- Ask AI opens the AI helper for this instance.
- Browse files, or drag a file onto the tab, to add something you downloaded
  yourself. The launcher checks it first: a Forge mod is refused on a Fabric
  instance, a random zip is refused as a resource pack, and so on.
- Cards and Compact switch between a view with icons and descriptions and a
  plain list.
- The folder button opens the matching folder on your computer.

## Worlds

- Import accepts a world folder or a `.zip` of one, such as a backup or a world
  you downloaded. If a world with that name exists, the new one gets a number.
- Save to Device packs a world into a `.zip` you can keep or share.
- Delete asks for confirmation, because a deleted world cannot be recovered.

## Settings

| Setting | Default | Notes |
|---------|---------|-------|
| Memory | 2 GB | A slider up to the memory your computer has. It turns red below 1 GB, and when less than 2 GB would be left for the rest of the computer. |
| Java | Automatic | Leave empty to use the runtime the launcher downloaded. Pick a `java` file to use your own. |
| Extra JVM arguments | Empty | For advanced players. They are added after the launcher's own, so they win. |

## Where the files are

The Folder button opens the instance's game folder. All launcher data lives in
one place:

| System | Folder |
|--------|--------|
| Windows | `%AppData%\UdeosLauncher` |
| macOS | `~/Library/Application Support/UdeosLauncher` |
| Linux | `~/.config/UdeosLauncher` |

[Data on disk](../architecture/data-on-disk.md) explains what each folder holds.
