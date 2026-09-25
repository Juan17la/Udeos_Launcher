# 13. Skins: a library, an editor, and getting them into the game

## What the player sees

The **Skins** page (nav: Instances · Servers · Skins · Addons) fits the
window: the page itself never scrolls, only the library does, inside its
box. It shows:

- **Wearing** (the wide left panel): the skin the active profile wears on a
  3D model that fills the panel and turns (drag to turn it), its name, model
  and a one-line "In singleplayer and on your servers", and Edit.
- A **drop zone** as the main action, since most players download their
  skins: tinted, with an icon, "Drop a skin you downloaded" and Browse. A
  dropped `.png` opens "Add skin" with the name taken from the file, the
  model its pixels suggest, a turning preview that follows the model choice,
  and "Wear it now".
- **Library**: Steve (the default) first, then every saved skin, as cards
  (the model at a 3/4 angle, name, Classic or Slim). **A click on a card
  wears it**; the worn one is outlined and tagged "In use". Edit and Delete
  appear over the model on hover or keyboard focus (Steve has neither);
  deleting a worn skin puts Steve back.
- **New skin** (a quieter button next to the library title) opens the editor
  on Steve, or Alex once the model is switched to Slim.

### The default skin

`frontend/src/assets/default_skin.png` (Steve) is what a profile wears until
it picks a skin, in the launcher (panel, card, account avatar) and in the
game: the Go side embeds the same file (`app_skins.go`, set as
`Library.Default`) and the skin server hands it out for launcher profiles
with nothing chosen. `default_skin_slim.png` (Alex) is only the editor's
starting point for a new slim skin.
Without that, Minecraft 1.19.3+ would pick one of nine default skins from
the UUID, which would not match the page.

The skin a profile wears is used by **every instance of that profile** from
the next Play. Its face also becomes the avatar in the account menu and the
profile switcher.

### Classic and slim

A skin is always a 64×64 PNG; the **model** says how Minecraft reads the
arms: 4 pixels wide (*classic*, Steve) or 3 (*slim*, Alex). The same picture
looks wrong on the other model, so the model is chosen per skin. On import
the launcher guesses it: slim skins leave the last column of the right arm's
back (x 54–55, y 20–31) transparent, and a classic skin cannot. Old 64×32
skins are converted to 64×64 the way the game does it (the left arm and leg
become mirrored copies of the right ones).

### The editor

Two paintable views of the same picture:

- **Flat skin**: the 64×64 texture at 8× with a texel grid, each face
  outlined, a checkerboard where the game reads the skin and a veil over
  the parts it never reads (those cannot be painted). The line under it
  names the texel under the pointer ("Head · front · Base (12, 9)").
- **On the model**: a click on the model paints the texel under the
  pointer; dragging beside it (or with the right button) turns it. The
  **Layer** switch shows the second layer (hat, jacket, sleeves, trousers)
  and paints on it.

Tools: pencil (B), eraser (E), fill (G; it never leaves the face it starts
on, because the next face in the texture is another side of the body),
color picker (I, or right-click on the flat skin), undo/redo (Ctrl+Z,
Ctrl+Y), the system color chooser and the last twelve colors used. Leaving
the editor without saving (a nav click, Back) keeps the work as a draft that
is offered again next time; Cancel asks before throwing changes away.

The 3D view is a small canvas renderer (`frontend/src/utils/skin.ts`), not a
3D library: each box of the player model is six faces, each face an affine
`drawImage` of its texture rectangle, drawn far to near with only the faces
turned toward the viewer. Faces are lit by how much they face a light above
and to the left. The same list of drawn faces answers "which texel is under
the pointer" by inverting each face's transform, which is how painting on
the model works. The face layout follows Minecraft's `ModelPart.Cube`.

## Getting the skin into the game

Minecraft does not read skins from disk. It asks Mojang's session servers
for the player's profile, whose `textures` property (signed by Mojang) points
to the skin image. An offline player has no such profile, so the game falls
back to a default skin. The launcher changes who the game asks:

1. **A tiny skin server** (`internal/skin/yggdrasil.go`) runs inside the
   launcher on `127.0.0.1:25585` (any free port if that one is taken) from
   the first Play or server start. It speaks the same protocol as Mojang's
   session servers ("Yggdrasil"): the game asks it for a player's profile
   and gets the offline UUID, the name and, for a launcher profile, a
   `textures` property signed with the launcher's key (its skin, else Steve).
2. **authlib-injector** (a Java agent, open source, AGPL-3.0 — downloaded on
   first use into `libraries/moe/yushi/authlib-injector/`, hash-checked, not
   shipped with the launcher) is added to every game's command line:
   `-javaagent:<jar>=http://127.0.0.1:25585`. It points the game's
   authentication library at the skin server instead of Mojang, trusts its
   key and allows skin images from `127.0.0.1`. If it cannot be downloaded
   (first run with no internet) the game still starts, without skins, and
   the launcher log says so.

The texture address carries the picture itself:
`http://127.0.0.1:25585/textures/<the PNG in base64url>/<its SHA-256>`. The
game caches skins by the last part (the hash), and any Udeos launcher can
answer the address, not only the one that made it; that is what lets a
friend's game draw your skin on your server (below). The key is the same in
every copy of the launcher for the same reason; all it vouches for is "this
picture belongs to this offline name", which offline mode lets anyone claim
anyway.

### Where skins show

| Where | Shows? | Why |
|-------|--------|-----|
| Singleplayer | Yes, all versions | The game asks the skin server for your own profile at start |
| Servers you host, "Who can join: Udeos players" (the default for new servers) | Yes: your skin and every profile of this launcher, seen by every Udeos player there | The server asks the skin server who joined (see below) |
| Servers you host, "Anyone" | No (only you, on 1.20.1 and older) | An offline-mode server sends no skins; before 1.20.2 the game still looks up its own |
| Public servers | Usually a default skin | They are not asking your launcher; that is fine by design |

A friend's own skin does not show on your server: their launcher knows it,
yours does not, and there is no shared skin server between them.

### Server login ("Who can join")

A server's Settings tab has three choices; they are stored as
`Instance.UdeosLogin` plus `online-mode` in `server.properties` (the
settings form reads and writes them as one `login` key, which is not a
real server.properties key):

- **Udeos players** (`udeosLogin`, new servers): the server starts with
  authlib-injector too, `online-mode=true` and
  `enforce-secure-profile=false` (rewritten on every start). In online mode
  the server asks "did this player join?" (`hasJoined`); the skin server
  answers yes for any valid name, with the offline UUID (so inventories and
  positions from offline mode carry over) and the skin if it is one of this
  launcher's profiles. Udeos players' games have the agent, so their "join"
  call goes to their own skin server and succeeds. Players of other
  launchers call Mojang instead and get "Invalid session". Microsoft chat
  keys are not required, since Udeos players have none.
- **Anyone**: `online-mode=false`, no agent. Any launcher joins, no skins.
- **Microsoft accounts**: `online-mode=true`, no agent. Only real accounts
  (Udeos players cannot join); whitelist UUIDs then come from Mojang.

## Data on disk

- `skins/library.json` — the skins (id, name, model, creation date) and
  which skin each profile wears (`equipped`: nickname → skin id).
- `skins/<id>.png` — each picture, always a re-encoded 64×64 PNG.
- `libraries/moe/yushi/authlib-injector/<version>/` — the agent.
- `instances/<id>/.minecraft/authlib-injector.log` — the agent's own log.

## Code map

| Where | Job |
|-------|-----|
| `internal/skin/skin.go` | The library, checking and converting PNGs, guessing the model |
| `internal/skin/yggdrasil.go` | The skin server, signing, downloading authlib-injector |
| `internal/core` | `SkinAgent` starts the server once and returns the JVM flag; `Launch` and `StartServer` add it |
| `app_skins.go` | Bindings: list, save, delete, equip, read/pick a file |
| `frontend/src/utils/skin.ts` | Model layout, renderer, hit test |
| `frontend/src/components/SkinView.tsx` | The turning model, and the face avatar |
| `frontend/src/screens/Skins.tsx`, `SkinEditor.tsx` | The page and the editor |

## Troubleshooting

| Symptom | Likely cause |
|---------|--------------|
| Steve in singleplayer instead of your skin | The instance was started before the skin was chosen (it applies from the next Play), or authlib-injector could not be downloaded: see `logs/udeos-launcher.log` |
| Arms look cut or have a black stripe | The skin is slim but set to Classic, or the other way round |
| Friends get "Invalid session" | The server is on "Udeos players" and they use another launcher: switch to "Anyone" |
| A friend on Udeos sees you with a default skin | Their launcher could not open port 25585 (something else uses it) |
