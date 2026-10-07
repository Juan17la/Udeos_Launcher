# Troubleshooting

Start here when something does not work. If your problem is not listed, open an
[issue](https://github.com/Juan17la/Udeos_Launcher/issues) and attach the log
file mentioned below.

## Where the logs are

| Log | Location |
|-----|----------|
| What the launcher saw of the last game | `<instance>/.minecraft/logs/udeos-launcher.log` (the first line is the full Java command) |
| The game's own log | `<instance>/.minecraft/logs/latest.log` |
| Crash reports | `<instance>/.minecraft/crash-reports/` |
| Skin agent | `<instance>/.minecraft/authlib-injector.log` |

The Folder button on an instance opens its `.minecraft` folder. The crash dialog
has a button that opens the logs folder directly.

## Installing and opening the app

| Problem | What to do |
|---------|------------|
| Windows: "Windows protected your PC" | The app is not code-signed yet. Choose More info, then Run anyway. |
| macOS: "cannot be opened because the developer cannot be verified" | Right-click the app, choose Open, then Open again. |
| Linux: the app does not start from a `.tar.gz` | Install GTK 3 and WebKitGTK 4.1 (`libwebkit2gtk-4.1-0` on Debian and Ubuntu). |
| The update fails on Linux | Updating a `.deb` or `.rpm` install asks for your password. Cancelling the prompt stops the update. |

## Playing

| Problem | Likely cause and fix |
|---------|---------------------|
| The first Play takes a long time | It downloads the game, its sounds and Java (several hundred MB). Later launches are quick. |
| "Could not reach..." when creating an instance | No internet. Lists you have seen before still work offline, but new downloads need a connection. |
| The game closes right after starting | Open the log. A mod for another loader or another Minecraft version is the most common cause on modded instances. |
| The game is slow or freezes | Raise Memory in the instance's Settings tab, or ask the AI for performance mods. |
| "Out of memory" in the log | Raise Memory, but keep at least 2 GB free for your system. |
| A server says "Failed to verify username" or "Invalid session" | It requires Microsoft accounts. Udeos plays in offline mode, so it can only join servers that allow offline players. |

## Addons

| Problem | Likely cause and fix |
|---------|---------------------|
| "X has no build for Minecraft 1.21.1 with Forge" | The mod is not made for that loader or version. The message says which loader it does support. NeoForge is the usual answer for 1.21 and newer. |
| An addon is refused because of a conflict | Press See options in the Activity list for another version or a similar mod. |
| Shaders do nothing | A shader pack needs a shader mod: Iris on Fabric or Quilt, Oculus on Forge. |
| A file you dropped is refused | It is not the right kind for that tab, or it is built for another loader. |
| Ask AI says "Rate limited" | The built-in key is shared by every player. Wait a minute, or add your own free Groq key in the AI settings. |

## Servers

| Problem | Likely cause and fix |
|---------|---------------------|
| Friends get "Invalid session" | They use another launcher and the server is set to Udeos players. Change Who can join to Anyone. |
| Friends on the same Wi-Fi cannot join | Your firewall blocks Java. Allow it on private networks. |
| The named address does not work for a friend | Their network cannot resolve `nip.io`. Give them the raw address shown below it. |
| "Internet access failed: could not reach the relay" | No internet, or the relay is down or blocked. The launcher retries every 15 seconds. |
| The address changed after a restart | The old relay port was taken by someone else. The new address is saved. |
| "Port 25565 is in use by another program" | The server moved to the next free port and saved it. Friends on the internet are not affected. |
| Router mode warns about a shared address (CGNAT) | Your provider shares one public address between homes. Use Relay mode. |

## Skins

| Problem | Likely cause and fix |
|---------|---------------------|
| You see Steve in game | The skin applies from the next Play. If it still fails, the skin agent could not download (no internet on the first Play). |
| Arms look cut or have a black stripe | The skin is Slim but set to Classic, or the other way round. |
| A friend on Udeos sees you with a default skin | Their launcher could not use port 25585 because another program has it. |
