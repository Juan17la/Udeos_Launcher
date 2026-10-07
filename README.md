<div align="center">

<img src="build/appicon.png" alt="Udeos Launcher logo" width="112" />

# Udeos Launcher

### Minecraft, your way. No account required.

A free desktop launcher for Windows, Linux and macOS. Pick a nickname, choose a
version, press Play. Mods, modpacks, skins, servers for your friends and an AI
helper are all built in.

[![Latest release](https://img.shields.io/github/v/release/Juan17la/Udeos_Launcher?include_prereleases&label=download&color=3C8527)](https://github.com/Juan17la/Udeos_Launcher/releases)
[![Platforms](https://img.shields.io/badge/Windows%20%7C%20Linux%20%7C%20macOS-555?label=runs%20on)](#download)
[![License](https://img.shields.io/badge/license-PolyForm%20Noncommercial-FFAA00)](LICENSE)

[Download](#download) · [Features](#what-you-can-do) · [User guide](docs/user-guide/getting-started.md) · [Documentation](docs/README.md) · [Changelog](CHANGELOG.md)

<br />

<img src="docs/assets/screenshots/dashboard-dark.png" alt="The Udeos Launcher dashboard with four instances" width="860" />

</div>

<br />

## What is Udeos?

Udeos is a Minecraft: Java Edition launcher built for players who just want to
play. There is no sign-in screen and nothing to configure: you type a nickname,
create an instance for any version of the game and the launcher downloads
everything it needs, Java included.

Each instance is its own little world. It keeps its own worlds, mods, resource
packs and settings, so a heavily modded pack never touches your vanilla
survival save. When you want more, the launcher finds it for you: thousands of
mods, shaders and modpacks from Modrinth are one click away.

<br />

## What you can do

<table>
<tr>
<td width="50%" valign="top">

<img src="frontend/src/assets/icons/grass_block_side.png" width="28" align="left" />

**Play any version**

Every release, snapshot and classic version Mojang has ever published. The
right Java runtime is downloaded for you.

</td>
<td width="50%" valign="top">

<img src="frontend/src/assets/icons/diamond_pickaxe.png" width="28" align="left" />

**Mods without the hassle**

Fabric, Quilt, Forge and NeoForge install themselves. No installer to run, no
folders to find.

</td>
</tr>
<tr>
<td valign="top">

<img src="frontend/src/assets/icons/enchanted_book.png" width="28" align="left" />

**Browse thousands of addons**

Mods, datapacks, resource packs, shaders and modpacks from Modrinth, with
compatibility and dependencies checked before anything is installed.

</td>
<td valign="top">

<img src="frontend/src/assets/icons/nether_star.png" width="28" align="left" />

**Ask the AI**

Say what you want ("my game lags on a weak PC") and get a short list of real
mods that fit, each with a reason.

</td>
</tr>
<tr>
<td valign="top">

<img src="frontend/src/assets/icons/campfire.png" width="28" align="left" />

**Host a server in a minute**

Create a server, press Start, share the address. Friends can join from
anywhere, even when your router does not cooperate.

</td>
<td valign="top">

<img src="frontend/src/assets/icons/name_tag.png" width="28" align="left" />

**Your own skins**

Keep a skin library, paint new ones on a 3D model, and see them in
singleplayer and on your servers.

</td>
</tr>
<tr>
<td valign="top">

<img src="frontend/src/assets/icons/totem_of_undying.png" width="28" align="left" />

**Profiles for the whole family**

Several nicknames on one computer, each with its own instances, skins,
language and theme.

</td>
<td valign="top">

<img src="frontend/src/assets/icons/ender_pearl.png" width="28" align="left" />

**Light and private**

Everything stays on your computer. The app is small, starts fast and updates
itself.

</td>
</tr>
</table>

<br />

## A quick tour

<table>
<tr>
<td width="50%"><img src="docs/assets/screenshots/search.png" alt="Addons page" /></td>
<td width="50%"><img src="docs/assets/screenshots/instance.png" alt="An instance page" /></td>
</tr>
<tr>
<td align="center"><sub>Addons: search Modrinth and add with one click</sub></td>
<td align="center"><sub>Every instance keeps its own worlds, packs and settings</sub></td>
</tr>
<tr>
<td><img src="docs/assets/screenshots/server.png" alt="A server page" /></td>
<td><img src="docs/assets/screenshots/skin-editor.png" alt="The skin editor" /></td>
</tr>
<tr>
<td align="center"><sub>Servers with a ready-to-share internet address</sub></td>
<td align="center"><sub>Paint skins straight on the 3D model</sub></td>
</tr>
<tr>
<td><img src="docs/assets/screenshots/skins.png" alt="The skin library" /></td>
<td><img src="docs/assets/screenshots/ai.png" alt="Ask AI" /></td>
</tr>
<tr>
<td align="center"><sub>A skin library for each profile</sub></td>
<td align="center"><sub>Ask AI for suggestions in plain words</sub></td>
</tr>
</table>

<br />

## Download

Get the newest version from the [Releases page](https://github.com/Juan17la/Udeos_Launcher/releases).

| System | File to pick |
|--------|--------------|
| Windows 10 and 11 | `...-windows-amd64-installer.exe` (or the portable `.zip`) |
| macOS (Intel and Apple Silicon) | `...-macos-universal.dmg` |
| Debian and Ubuntu | `...-linux-amd64.deb` |
| Fedora | `...-linux-x86_64.rpm` |
| Any other Linux | `...-linux-amd64.tar.gz` |

You do not need to install Java. The builds are not code-signed yet, so the
first time you open the app Windows SmartScreen or macOS Gatekeeper asks you to
confirm. The [getting started guide](docs/user-guide/getting-started.md) walks
you through it.

<br />

## Good to know

- **Udeos uses offline mode.** You play singleplayer, LAN worlds, your own
  servers and any server that accepts offline players. Servers that require a
  Microsoft account (most big public networks) will not let you in.
- **Nothing is uploaded.** Your nickname, instances and skins live only on your
  computer. The launcher connects out only to download game files, addons and
  updates, and to the AI provider when you use Ask AI.
- **Udeos is not affiliated with Mojang or Microsoft.** Minecraft is a
  trademark of Mojang AB. Please support the game by buying it.

<br />

## Documentation

| I want to... | Read |
|--------------|------|
| Learn how to use the launcher | [User guide](docs/user-guide/getting-started.md) |
| Fix a problem | [Troubleshooting](docs/user-guide/troubleshooting.md) |
| Understand how it works inside | [Documentation index](docs/README.md) |
| Build it or help out | [Contributing](CONTRIBUTING.md) |

<br />

## License

Udeos Launcher is source-available under the
[PolyForm Noncommercial License 1.0.0](LICENSE). You are free to use it, read
the code, modify it and share it for any noncommercial purpose. Selling it, or
using it or any part of it to make money, is reserved to the author. For
commercial permission, open an issue or contact
[@Juan17la](https://github.com/Juan17la).

<div align="center">
<br />
<sub>Made by Juan Diego López Arias</sub>
</div>
