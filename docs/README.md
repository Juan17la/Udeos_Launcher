# Udeos Launcher documentation

Udeos is a Minecraft: Java Edition launcher that needs no Microsoft account. It
is a [Wails](https://wails.io) desktop app: a Go backend that downloads,
installs and runs the game, and a React interface on top.

These pages are grouped by who they are for. Players only need the user guide.
Everything else explains how the launcher works inside.

## User guide

For players. No technical knowledge needed.

| Page | What it covers |
|------|----------------|
| [Getting started](user-guide/getting-started.md) | Install, first start, your first instance, profiles, updates, privacy |
| [Instances](user-guide/instances.md) | Creating, playing, the instance tabs, worlds, memory and Java settings |
| [Addons](user-guide/addons.md) | Browsing Modrinth, adding mods, versions, conflicts, modpacks, datapacks |
| [Ask AI](user-guide/ai-advisor.md) | Getting addon suggestions in plain words, providers and your own key |
| [Servers](user-guide/servers.md) | Hosting a world, letting friends join, who can join, the join file, backups |
| [Skins](user-guide/skins.md) | The skin library, the editor, where skins show |
| [Troubleshooting](user-guide/troubleshooting.md) | Common problems and where the logs are |

## Architecture

How the application is put together.

| Page | What it covers |
|------|----------------|
| [Overview](architecture/overview.md) | The two halves, bindings and events, every backend package, the frontend folders, the CLI |
| [Data on disk](architecture/data-on-disk.md) | Where files live, what is shared between instances and what is private |
| [Frontend](architecture/frontend.md) | Screens, state, navigation, i18n, accessibility |
| [Design system](architecture/design-system.md) | The visual rules, tokens and building blocks the UI follows |

## How it works

One page per subsystem, for contributors and the curious.

| Page | What it covers |
|------|----------------|
| [Networking](internals/networking.md) | Every host the launcher talks to, the two HTTP clients, offline caching, self-update |
| [Installing from the CDN](internals/cdn-installation.md) | Mojang's version manifest, libraries, natives, assets, Java runtimes, download verification |
| [Launching the game](internals/launching.md) | Building the Java command line, offline mode, the process and its logs |
| [Mod loaders](internals/mod-loaders.md) | How Fabric, Quilt, Forge and NeoForge are installed with no installer for the player to run |
| [Modrinth client](internals/modrinth-client.md) | The connection to Modrinth's API, endpoints, search facets, memory and disk caching |
| [Content installation](internals/content-installation.md) | Planning an install: versions, dependencies, conflicts, modpacks, datapacks, `content.json` |
| [Servers](internals/servers.md) | The server process, ports, backups, the bore relay, UPnP, the join file |
| [Skins](internals/skins.md) | The skin renderer and editor, the local Yggdrasil server, authlib-injector, server login |
| [AI advisor](internals/ai-advisor.md) | How Ask AI plans searches, checks every answer against Modrinth, and keeps keys safe |

## Development

| Page | What it covers |
|------|----------------|
| [Building and running](development/building.md) | Requirements, `wails dev`, UI work in a browser, tests, building for each OS |
| [Releasing](development/releasing.md) | Version numbers, the release pipeline, the built-in AI key |
| [Git workflow](development/git-workflow.md) | Branch names and how features are merged |
| [Contributing](../CONTRIBUTING.md) | How to report bugs and send changes |
| [Security](../SECURITY.md) | How to report a vulnerability |

## Design notes

[System design](system-design/README.md) describes the launcher as a system:
what contains what, a glossary of every term, the navigation map, how search
works end to end, and the UX audit. It also holds static HTML mockups of every
screen in [`system-design/mocks/`](system-design/mocks/index.html).

## Release notes

Player-facing notes for each version are in [`releases/`](releases/). The
full list of changes is in the [changelog](../CHANGELOG.md).

## Glossary in one minute

| Term | Meaning |
|------|---------|
| Instance | One copy of the game with its own folder, version and loader |
| Server | An instance that runs Minecraft's dedicated server instead of the game |
| Profile | A nickname on this computer, with its own instances, skins and settings |
| Loader | Fabric, Quilt, Forge or NeoForge: what lets the game load mods |
| Addon | Anything from Modrinth: a mod, datapack, resource pack, shader or modpack |
| Offline mode | Playing with a nickname and a UUID derived from it, without an account |

The full list is in the [glossary](system-design/02-glossary.md).
