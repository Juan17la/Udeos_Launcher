# 12. Servers: hosting a world and letting friends in

## What a server is

A server is an **instance with the `Server` flag**: the same store, owner
(profile), launch settings (memory, Java, JVM flags) and `mods/` folder as a
game instance. Its game folder (`instances/<id>/.minecraft`) *is* the server
folder: `server.properties`, `eula.txt`, the world, `whitelist.json`,
`ops.json`, `banned-players.json`, `backups/` and the server jars all live
there. `ListInstances` skips servers; `ListServers` returns them with their
live state.

Code map:

| Where | Job |
|-------|-----|
| `app_servers.go` | Bindings the UI calls (create, start/stop, console, players, properties, internet settings, backups) |
| `internal/core/server.go` | The server process, its console and state, backups, and opening it to the internet |
| `internal/loader/server.go` | Installs the Fabric/Forge/NeoForge dedicated server and works out how to start it |
| `internal/server` | `server.properties`, player lists, address names |
| `internal/tunnel` | Client for the bore relay (internet access without the router) |
| `internal/upnp` | Asks the router to forward the port (internet access through the router) |
| `frontend/src/screens/Servers.tsx`, `screens/server/` | The Servers page and a server's page (Console, Players, Internet, Backups, Mods, Settings) |

## Creating a server

`CreateServer` makes the instance and then writes three things into its
folder:

- `eula.txt` with `eula=true` — the create form makes the player accept
  Mojang's EULA first; a server refuses to start without it.
- `server.properties` with the server's name as `motd`, **`online-mode=false`**
  (Udeos players have no Microsoft account, so an online-mode server would
  refuse every one of them) and the first free **port** from 25565 upwards
  that no other Udeos server uses.
- `server-icon.png` (64×64) when an icon was chosen: the picture next to the
  server in the multiplayer list.

It also fixes the **address name** (`udeoslauncher.<server name>`) at
creation, so renaming the server later does not change the address friends
saved. Nothing is downloaded yet. Quilt servers are refused (Quilt ships no
dedicated server installer the launcher can drive; most Quilt mods run on a
Fabric server).

## Starting it on this computer

`Launcher.StartServer` runs these steps. The UI hears about every step
through two events: `server:log` (a console line) and `server:state`
(re-read `ListServers`).

1. **Mark it starting.** An entry goes into `l.servers[id]` right away so a
   second Start is refused and the card shows "Starting".
2. **Prepare the files** (`prepareServer`):
   - load the version JSON (same code path as the game) and pick **Java** the
     same way Play does (the instance's own Java, else the profile's, else
     the Mojang runtime the version asks for, downloaded if missing);
   - **Vanilla / Fabric**: download Mojang's `server.jar` (hash-checked, skipped
     when already there). Vanilla starts with `-jar server.jar nogui`;
   - **Fabric**: download Fabric's server launcher
     (`fabric-server-launch.jar`, it loads the vanilla `server.jar` next to it);
   - **Forge / NeoForge**: download the installer into the shared cache and run
     it headless with `--installServer <folder>` (takes a minute or two; the
     console says so). A marker file `.udeos-<loader>-<build>` stops it running
     again. 1.17+ installers leave an argument file
     (`libraries/…/unix_args.txt` or `win_args.txt`), started as
     `@<that file> nogui`; older ones leave a runnable `forge-<build>.jar`.
3. **Read the port** from `server.properties` (25565 when missing).
4. **Start Java** from the server folder:
   `java -Xmx<memory>M <jvm flags> <start arguments>`. Memory is the server's
   own setting, else the profile's default, else 2048 MB. On Windows
   `javaw.exe` is swapped for `java.exe` (`ConsoleJava`) so the output can be
   read, and no console window opens.
5. **Watch the console.** stdout and stderr are read line by line; the last
   500 lines are kept for the Console tab. Three kinds of lines change the
   state:
   - `…]: Done (…)! For help…` → **Ready**: players can join;
   - `…]: <name> joined the game` / `left the game` → the online list;
   - `Saved the game` / `Saved the world` → a waiting backup may continue.
6. **Open to the internet** if the server's `Public` switch is on (below).
7. When the process exits, internet access is closed, the play time is added
   to the instance and the entry is removed.

Typing in the Console tab writes the line to the server's stdin (a leading
`/` is dropped). **Stop** types `stop` and kills the process if it is still
alive 60 seconds later. When the launcher closes, every running server gets
`stop` and the launcher waits up to 30 seconds for them to save.

**Backups** of a running server pause saving: `save-off`, `save-all flush`,
wait for the "Saved the game" line, zip the world into `backups/`, `save-on`.
Restoring needs a stopped server and backs the current world up first.

## How friends join

| From | Address | How it works |
|------|---------|--------------|
| This computer | `localhost:<port>` | Nothing in between |
| Same Wi-Fi / LAN | `<this computer's LAN IP>:<port>` (Internet tab) | The LAN IP is the address of the network card that would reach the internet (`upnp.LocalIP`: a UDP "dial" that sends no packet). The OS firewall must let Java accept connections |
| Anywhere | The internet address (Internet tab) | **Relay** (default) or **Router** mode, below |

Opening to the internet happens in `startPublic`; `stopPublic` cancels it.
Each server has one running mode at a time, chosen in the Internet tab
(`Instance.Internet.Mode`).

### Relay mode (default)

Most home connections cannot accept connections from the internet: the
router has no UPnP, or the provider shares one public IP between many homes
(CGNAT, the `100.64.0.0/10` range). The relay works around both, because the
launcher only ever **dials out**.

It speaks the protocol of [bore](https://github.com/ekzhang/bore); the free
public relay `bore.pub` is the default and anyone can run their own
(`bore server --secret …`) and put its host and secret in "Your own relay".
Messages are JSON followed by a 0 byte, on TCP port 7835:

```
 Udeos (this computer)                    relay (bore.pub)              friend
 ─────────────────────                    ────────────────              ──────
 control connection ──── Hello(41234) ──▶ listens on :41234
                    ◀─── Hello(41234) ───
                    ◀─── Heartbeat ────── (every 500 ms)
                                                            ◀── connects to :41234
                    ◀─── Connection(id) ─ parks the friend's socket
 new connection ──────── Accept(id) ────▶ pairs it with the friend's socket
 dial 127.0.0.1:<port>      ◀══════════ bytes both ways ══════════▶
 (the Minecraft server)
```

- **Control connection** (`tunnel.Open`): `Hello` with the port wanted
  (0 = any); the relay answers `Hello` with the public port it opened, then
  sends a heartbeat every 500 ms. If nothing arrives for 30 seconds the
  launcher treats the relay as gone and closes the socket — closing it is
  what frees the port on the relay, so the reconnect can get it back.
- **One connection per player** (`tunnel.forward`): for every `Connection(id)`
  the launcher opens a new connection to the relay, sends `Accept(id)`, dials
  the local server and copies bytes both ways until either side closes. The
  relay drops a player it has not been claimed for within 10 seconds.
- **Secret**: a relay with a secret sends `Challenge(uuid)` first on every
  connection; the answer is the hex HMAC-SHA256 of the UUID's 16 bytes, keyed
  with SHA-256 of the secret (`tunnel.Answer`).
- **Same address after restarts**: the public port is saved
  (`Internet.RelayPort`) and asked for again next time; if the relay refuses
  (taken, or outside its range) any port is taken and saved instead.
- **Reconnects** (`relayPublic`): 3 seconds after the control connection
  drops, 15 seconds after a failed attempt, until access is closed. Players
  already in the game are not affected by a control drop: each one has its
  own connection. Closing access (switch off, stop, new settings) cuts them.

On the Minecraft server every relayed player seems to come from
`127.0.0.1`: the launcher dials it locally.

**The address.** The raw address is `bore.pub:<port>`. The named one is
`<name>.<a-b-c-d>.nip.io:<port>`: nip.io is a free public DNS that answers
any `…<a-b-c-d>.nip.io` with the IP `a.b.c.d`, so each server gets a
readable name without an account or a domain (`server.PublicAddress`). The
port is what makes it unique on a shared relay; `:25565` is left out because
Minecraft adds it by itself. The raw address is shown too, for when nip.io
does not resolve.

Relay trade-off: every packet takes a detour through the relay, so players
far from it get more lag, and a public relay is shared with strangers.

### Router mode

`upnp.Map` finds the router on the local network (SSDP), asks it to forward
TCP `<port>` to this computer with no lease time, and reads the router's
public IP. The address is then `<name>.<a-b-c-d>.nip.io[:port]` pointing
straight at this home: no detour, least lag. When the router says its
public IP is private or in the CGNAT range, the forward exists but is
useless and the tab says so. The forward is removed (`upnp.Unmap`) when
access closes. No UPnP on the router → the tab explains how to forward the
port by hand or suggests the relay.

## Pitfalls worth knowing

- **Deadlines on connections that outlive their handshake.** Go deadlines
  are absolute points in time, not per-call timeouts. `tunnel.send` sets a
  write deadline for the handshake message and **clears it afterwards**. A
  version that left it set cut every relayed player about 10 seconds after
  they joined: the `Accept` connection becomes the player's connection, and
  the first write after the deadline failed. The server could still be
  pinged and joined, so it looked like a network problem.
  `TestPlayerOutlivesHandshakeTimeout` guards it.
- **A silent relay must be hung up on**, not just ignored: the relay keeps
  the public port as long as the control socket is open.
- **Offline mode is required** for Udeos players. Switching a server to
  online mode shuts out everyone who does not have a Microsoft account.

## Troubleshooting

| Symptom | Likely cause |
|---------|--------------|
| "Internet access failed: could not reach the relay…" | No internet, or the relay is down or blocked by a firewall. Retries every 15 s |
| The address changed after a restart | The old relay port was taken; the new one is saved |
| The named address does not resolve | nip.io unreachable from the friend's network: use the raw address |
| Friends on the same Wi-Fi cannot join | The OS firewall blocks Java; allow it for private networks |
| Router mode: "shared" / CGNAT warning | The provider shares the public IP: use Relay mode |
| Friends get "Invalid session" when joining | The server was switched to `online-mode=true` |
