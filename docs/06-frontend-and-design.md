# 6. Frontend and design system

## From mockup to app

The interactive mockup in `Minecraft Launcher UI Mockups/` was built on a
small design system ("Organic": rounded cards, pill buttons, two accent
ramps) and then re-skinned for Minecraft: JetBrains Mono everywhere, two
themes, bevelled "Minecraft button" surfaces and pixel-art block icons drawn
with CSS. The real frontend keeps exactly those pieces:

- **Tokens** — colours, spacing, radii and shadows live as CSS variables.
  The light theme is grass green with oak brown as second accent; the dark
  theme is End-stone purple with prismarine teal. Switching theme only flips
  an attribute on the document root; every component reads the variables.
- **Component classes** — `.btn` (primary, secondary, danger, ghost, icon),
  `.card`, `.tag`, `.seg` (segmented control used for tabs and the loader
  choice), `.input`, `.radio`/`.checkbox`, `.dialog`, `.nav`. Screens are
  composed from these rather than styled one by one.
- **Minecraft layer** — the bevel (a light top edge, a dark bottom edge, a
  vertical gradient) on primary/secondary/danger buttons, the slight lift of
  cards on hover, the pop-in animation of dialogs.
- **Pixel icons** — each icon is an 8×8 grid of characters mapped to a small
  palette; a single element with a long `box-shadow` paints the whole thing.
  No image files are involved, icons scale to any size and stay crisp, and
  the same data drives the instance icon picker, the navigation brand and
  the faint decorative items floating behind pages.
- **Fonts** are bundled with the app, so the launcher looks the same offline.

## Screens

- **Login** (first run only): language, then nickname plus the consent
  checkbox. Both links open the Privacy & Terms dialog. The nickname is
  validated with the same rule Minecraft uses (3–16 letters, digits or
  underscores).
- **Dashboard**: a card per instance (icon, name, version, loader, counts of
  packs and worlds, Play and Manage) and a "Last played" panel on the right
  with a big Play button. Mods counts only appear for non-vanilla instances.
- **Create instance**: name, version from Mojang's list (releases by default,
  a checkbox reveals snapshots and old versions), the loader choice (Forge
  and Fabric are shown but disabled until supported) and the icon grid.
- **Instance page**: the sticky side card (icon, tags, install state, Play,
  Open folder, Delete with confirmation) and the tabs. A vanilla instance
  shows Resource Packs, Worlds and Screenshots; Mods and Shaders appear only
  for modded instances. Worlds and Resource Packs share the same drop zone
  pattern (drag a file onto the window, or Browse); each row has Save to
  Device and a Remove button that asks for confirmation. Screenshots open
  in a preview dialog when clicked. Every tab has an "Open folder" link.

The navigation bar carries Dashboard, the disabled Search and Skin entries
(coming later), theme toggle, language, Privacy & Terms, the avatar initial
and New Instance.

## State and data flow

A single React context holds the profile, the instance list, the current
screen and the *launch state*. The "game closed unexpectedly" dialog offers
"Open logs folder", which opens `.minecraft/logs/` where both the launcher's
and the game's logs live. Screens never call the backend for the
instance list themselves; they call `play`, `saveProfile` or `refreshInstances`
on the context and re-render when it changes. Backend events feed the same
context: progress updates the launch state while it is "preparing", a
"running" game event clears the overlay, an "exited with error" event opens
the error dialog.

The bridge to Go is a typed object whose methods mirror the exported Go
methods one to one. Outside the desktop shell the same object is backed by a
mock, which is what makes browser-only UI work possible.

## Internationalisation

All visible strings live in two dictionaries (English, Spanish) with the same
shape; the Spanish one is type-checked against the English one so a missing
key is a compile error. Placeholders like `{name}` are filled at render time.
The choice is stored in the profile and applied on startup.

## Accessibility and the younger audience

Buttons are large with high-contrast labels, the tab control is a real
`radiogroup`, dialogs close with Escape and trap the click on the backdrop,
keyboard focus is always visible, and every action has a text label next to
its icon. Error messages are written for players, not developers, and the
one technical detail shown (the log path) is only there so an adult can help.
