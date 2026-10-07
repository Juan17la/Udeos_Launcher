# Servers

Udeos can run a Minecraft server on your computer so friends can play in your
world, on the same Wi-Fi or from anywhere on the internet. You do not need to
set up the router or rent anything.

![A server page](../assets/screenshots/server.png)

## Creating a server

Open Servers and press New Server. Choose:

- Vanilla, With mods (Fabric, Forge or NeoForge) or From a modpack.
- The Minecraft version (the newest release is preselected).
- A name and an icon. The icon shows next to the server in your friends'
  multiplayer list.

Creating a server accepts Mojang's EULA, which every Minecraft server requires;
the form links to it. Nothing is downloaded until the first start.

A modpack's Details page also has a New server from this modpack button. Only
the parts of the pack a server needs are installed.

## Starting and stopping

Press Start. The first start downloads the server files (and, for Forge or
NeoForge, runs their installer, which takes a minute or two). The status reads
Starting, then Ready when players can join.

Stop saves the world and shuts the server down. Servers always stop cleanly:

- Closing the launcher while servers run asks first, then stops them and waits
  for them to save.
- Deleting a running server stops it first.
- Changing settings on a running server asks to stop it, because a server only
  reads its settings when it starts.
- Starting a third server at the same time asks first, since each one uses its
  own memory and processor time.

## The server page

| Tab | What it does |
|-----|--------------|
| Console | The server's live output. Type a command and press Enter (no `/` needed). |
| Players | Who is online, the whitelist, admins (operators) and banned players. |
| Internet | How friends reach you: the address to share and how it is opened. |
| Backups | Make a backup of the world (even while running) and restore one. |
| Mods | For modded servers, the same as an instance's Mods tab. |
| Datapacks | Datapacks for the server's world. |
| Settings | Name, game mode, difficulty, hardcore, PvP, flight, command blocks, seed, max players, view distance, port, who can join, and memory and Java. |

## How friends join

| Friend is... | They connect to |
|--------------|-----------------|
| On this computer | `localhost` |
| On the same Wi-Fi | The local address on the Internet tab |
| Anywhere else | The internet address at the top of the server page |

New servers are open to the internet whenever they run. The Internet tab can
turn that off and choose how it is done:

- Relay (default): works on almost any connection, even when the router cannot
  be configured or the internet provider shares one address between many
  homes. Traffic takes a small detour through a free public relay, so players
  far away may notice a bit more lag. You can enter your own relay if you run
  one.
- Router: asks your router to open the port (UPnP). Lowest lag, but many home
  routers do not allow it. The tab tells you when it does not work.

The address looks like `udeoslauncher.your-server.<numbers>.nip.io:41234` and
stays the same between restarts. The Copy button puts it on the clipboard.

## Who can join

In Settings, Who can join decides how players are checked:

| Choice | Who gets in | Skins |
|--------|-------------|-------|
| Udeos players (default) | Players using Udeos Launcher | Yes |
| Anyone | Any launcher, any name | No |
| Microsoft accounts | Only players with a real Minecraft account (Udeos players cannot join) | Yes |

Friends using another launcher see "Invalid session" on a server set to Udeos
players. Switch to Anyone for them.

## Sharing a modded server

A modded server is hard to join by hand: friends need the same version, loader
and every mod. On a modded server's page, Save file for friends writes a small
`.udeos` file. A friend opens New Instance, presses Import file and picks it,
and gets the exact same setup with your server already in their multiplayer
list.

Start the server at least once before saving the file, so it includes the
internet address.

## Backups

Backups are `.zip` files of the world in the server's `backups` folder. A backup
of a running server pauses saving for a moment so the copy is consistent.
Restoring needs a stopped server, and makes a backup of the current world first,
so you can always go back.
