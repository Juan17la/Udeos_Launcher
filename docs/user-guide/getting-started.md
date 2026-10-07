# Getting started

This guide takes you from download to your first game. No Minecraft or
Microsoft account is needed at any point.

## Install

Download the file for your system from the
[Releases page](https://github.com/Juan17la/Udeos_Launcher/releases).

| System | File | How to install |
|--------|------|----------------|
| Windows 10 and 11 | `...-windows-amd64-installer.exe` | Run it. If SmartScreen says "Windows protected your PC", choose More info, then Run anyway. |
| Windows (portable) | `...-windows-amd64-portable.zip` | Unzip anywhere and open `udeos-launcher.exe`. |
| macOS | `...-macos-universal.dmg` | Open it and drag Udeos Launcher to Applications. The first time, right-click the app and choose Open, because the app is not notarized yet. |
| Debian, Ubuntu | `...-linux-amd64.deb` | Double-click it, or `sudo apt install ./<file>.deb`. |
| Fedora | `...-linux-x86_64.rpm` | `sudo dnf install ./<file>.rpm` |
| Other Linux | `...-linux-amd64.tar.gz` | Unpack and run `udeos-launcher`. It needs GTK 3 and WebKitGTK 4.1. |

Java is not required. The launcher downloads the exact Java runtime each
Minecraft version needs, the same one the official launcher uses.

## First start

The welcome screen asks one thing at a time:

1. Your nickname. This is the name other players see in game. It must be 3 to
   16 characters: letters, numbers and underscores.
2. Your language: English or Spanish.
3. Your theme: Dark, Light or Custom (pick your own colours). You also accept
   the privacy agreement here.

Back and Next move between the steps. You can change all of this later from
the account menu in the top right corner.

## Your first instance

An instance is a separate copy of the game with its own worlds, mods, packs and
settings. You can have as many as you like.

1. Press New Instance.
2. Give it a name and an icon.
3. Choose Vanilla or a mod loader (Fabric, Quilt, Forge or NeoForge).
4. Choose the Minecraft version. The newest release is selected for you;
   tick "Show snapshots and old versions" to see the rest.
5. Press Create. With "Play as soon as it is installed" ticked (the default),
   the game downloads and opens right away.

The first launch of a version downloads the game, its sounds and textures and
Java, which can take a few minutes. The next ones start almost instantly,
because everything already downloaded is reused, even by other instances.

While it downloads you see a progress window. Hide puts it away in a small
notification in the corner so you can keep using the launcher.

## The main screens

| Screen | What it is for |
|--------|----------------|
| Instances | Your instances, with the last one you played on the left. |
| Servers | Worlds you host for your friends. See [Servers](servers.md). |
| Skins | Your skin library and editor. See [Skins](skins.md). |
| Addons | Mods, datapacks, resource packs, shaders and modpacks from Modrinth. See [Addons](addons.md). |

The Activity button in the navigation bar shows everything that is running in
the background: downloads, installs and new servers being prepared.

## Profiles

Several people can share one computer. Open the account menu and choose Switch
profile to add another nickname or switch to one. Each profile has its own
instances, servers, skins, language and theme. Removing a profile never deletes
anything: its instances and skins move to the profile that stays.

## Updates

When a new version is published, the launcher asks once when it starts. Update
downloads the right file for your system and installs it. You can always skip
it and update later.

## Privacy

Everything lives on your computer. The launcher only connects out to:

- Mojang, to download the game and Java;
- the mod loaders' own servers (Fabric, Quilt, Forge, NeoForge);
- Modrinth, to search and download addons;
- GitHub, to check for updates;
- the AI provider, only when you use Ask AI;
- the relay service, only when one of your servers is open to the internet.

Nothing about you is uploaded. [Networking](../internals/networking.md) lists
every address in detail.

## Next steps

- [Instances](instances.md): everything you can do with an instance.
- [Addons](addons.md): add mods, packs and modpacks.
- [Troubleshooting](troubleshooting.md): when something does not work.
