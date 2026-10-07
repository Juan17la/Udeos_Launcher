# Addons

The Addons page brings Modrinth's catalog into the launcher. Modrinth is a free,
open platform where creators publish mods, packs and modpacks.

![Addons page](../assets/screenshots/search.png)

## Finding things

The tabs at the top pick the kind of addon:

| Tab | What it is | Needs |
|-----|------------|-------|
| Mods | New blocks, items, mechanics, performance fixes, maps, menus. | A modded instance (Fabric, Quilt, Forge or NeoForge). |
| Datapacks | Changes to recipes, loot, structures and rules that live inside one world. | Any instance, vanilla included. |
| Resource Packs | New textures, sounds and fonts. | Any instance. |
| Shaders | Lighting, shadows and water effects. | A shader mod (Iris or Oculus) in a modded instance. |
| Modpacks | A full set of mods and settings that work together. | Nothing. It can become a new instance. |

Narrow the results with the search box, the Minecraft version, the loader (for
mods and modpacks) and the topic chips (optimization, magic, decoration and so
on; you can turn on several). The sort menu orders by relevance, downloads,
newest or recently updated.

Each card shows the icon, author, download count, the versions and loaders it
supports, and two buttons: Add and Details.

## Adding to an instance

There are two ways to reach Addons, and Add behaves a little differently in
each:

- From the navigation bar: you browse freely. Add asks which instance, and only
  lists the instances the addon can run on. One click installs it.
- From an instance's tab (Add from Modrinth): the page is locked to that
  instance. Version and loader are fixed, only compatible results are shown,
  and Add installs at once. Things the instance already has read Added.

Installs run in the background. A notification in the bottom right corner shows
the progress and the result, and the Activity button keeps a list of
everything that ran.

Before installing, the launcher checks:

1. That the addon has a build for the instance's Minecraft version and loader.
   If not, it tells you which loader it does support, for example "its 1.21.1
   builds are for NeoForge".
2. Whether it is already installed.
3. Its required dependencies, which are added too. Adding Iris also adds
   Sodium, for example.
4. Whether it conflicts with anything already in the instance. If it does,
   nothing is installed and See options suggests another version of the same
   mod, or similar mods, that work with what you have.

Downloaded files are verified and kept in a shared cache, so adding the same
mod to a second instance costs no download.

## Details page

Details opens the project's full Modrinth page inside the launcher: the
description, gallery, links, every Minecraft version and loader it supports,
and the list of your instances that can take it, each with its own Add.

The Versions tab lists every release of the addon that runs on your instance.
Pick an older or newer one to install it instead of the default; if a different
release is already installed it is replaced. Releases that clash with your mods
are listed apart.

## Modpacks

Add on a modpack offers:

- New instance: creates an instance with the pack's Minecraft version and
  loader, downloads every mod and copies its settings. The pack's icon becomes
  the instance icon.
- An existing modded instance: pours the pack's mods into it. Files you
  already have, such as your own configs, are never overwritten.

An instance made from a modpack is a normal instance, so you can add more mods
on top. A modpack can also become a server: see [Servers](servers.md).

## Datapacks

A datapack belongs to a world, not to the whole instance. When you add one, the
launcher asks which instance and then which world. On a server it goes straight
into the server's world. The same datapack can be in several worlds.

## Ask AI

Not sure what to search for? Ask AI turns a plain sentence into a short list of
real Modrinth addons. See [Ask AI](ai-advisor.md).
