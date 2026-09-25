# 6. Frontend and design system

## Design system

The UI follows the pastel Minecraft design system written down in
[11. Design system](11-design-system.md): PT Mono everywhere, one 15px
radius on every element, buttons wider than they are tall, 16px minimum
spacing, headings straight on the canvas, neumorphic panels, glassmorphic
overlays and loaders that always show a percentage, a three-colour tag
system and 150ms transitions. That page is the styling source of truth;
the interactive mockup the first version was ported from is history.

How it is built:

- **Tokens** — `frontend/src/theme/tokens.css` registers the palette, the
  radius, the neumorphic/glass shadows, the font and the transition once in
  a Tailwind `@theme` block, backed by runtime CSS variables for the values
  that differ between the light and dark theme. Switching theme only flips
  an attribute on the document root.
- **Building blocks** — `frontend/src/ui/`, one flat folder, and only for
  things used in more than one place: `Button` (primary, idle, danger,
  ghost), `Field` (Label, Input, Select, Checkbox), `Dialog` (a native
  `<dialog>`: top layer, focus trap and Escape come from the browser;
  + `ConfirmDialog`), `Loader` (`AutoLoader`), `StatusMessage` (inline
  feedback and the toasts alike, with a native `<progress>` bar),
  `SegmentedControl`, `DropZone`. Each owns its class strings; nothing else
  spells out a button or an input. The three surfaces that carry no
  behaviour — `panel` (+ `panel-hover`), `glass` and `tag` (plus a fill:
  `bg-tag-gray`, `bg-green-soft`, `bg-gold-soft`) — are `@utility` classes in
  `theme/tokens.css`, so a card is one `<div className="panel …">`.
- **Components and screens** (`frontend/src/components`, `frontend/src/screens`)
  compose the blocks and only write layout classes (flex, grid, gap, width).
  Something used by one page stays in that page as a local function
  (`InstanceCard` in Dashboard, `ResultCard` in Search, `IconChoice` in
  Create Instance) instead of becoming a shared component, and reads the
  app/launch state itself rather than taking it as props. `PlayButton`
  (Dashboard cards, the last-played panel, the instance page) is the one
  shared piece of card behaviour.
- **Hooks and utils** — `hooks/useFileList` is the one implementation of what
  every instance tab does (list, drop/browse, remove, note, error) and
  `utils/instanceContent.ts` the table that tells it which backend calls a
  kind uses; `hooks/useAddAction` is the shared Add-to-instance flow.
  `utils/` holds logic with no React in it: `validation.ts` (`TextRule`, the
  nickname and instance-name rules), `format.ts` (ago via
  `Intl.RelativeTimeFormat`, hours, bytes),
  `errors.ts`, `compat.ts`, `search.ts`.
- **Errors** — the backend's messages are long; the UI shows a 1–3 word
  headline picked by `frontend/src/utils/errors.ts` with the message as detail.
- **Pixel icons** — Minecraft block and item textures (16×16 PNG) in
  `frontend/src/assets/icons/`, loaded by file name (`iconURL`) and drawn
  with `image-rendering: pixelated` so they stay crisp at any size. The
  same files drive the instance icon picker (`ICON_CHOICES`, also in the
  instance's *Edit name and icon* dialog), the stand-in brand mark and the
  faint decorative items floating behind pages (`THEME_DECOR`). Keys from
  the earlier hand-drawn set are aliased so saved instances keep an icon.
- **Fonts** are bundled with the app (`@fontsource/pt-mono`), so the launcher
  looks the same offline.

## Screens

- **Login** (first run only): language, then nickname plus the consent
  checkbox. Both links open the Privacy & Terms dialog. The nickname is
  validated with the same rule Minecraft uses (3–16 letters, digits or
  underscores — `NICKNAME` in `utils/validation.ts`).
- **Dashboard**: a card per instance (icon, name, version, loader, counts of
  packs and worlds, Play and Manage) and a "Last played" panel on the right
  with a big Play button. Mods counts only appear for non-vanilla instances.
- **Create instance**: name, the loader choice (Vanilla, Forge, NeoForge, Fabric, Quilt),
  version from Mojang's list (releases by default, a checkbox reveals
  snapshots and old versions; with a loader picked only the versions it
  supports are offered and a note names the build that will be installed)
  and the icon grid.
- **Instance page**: the sticky side card (icon, tags, install state, Play,
  Open folder, Delete with confirmation) and the tabs. The card is
  `components/SidePanel` (shared with a server's page): exactly the window's
  height under the back button (`h-[calc(100vh-12.5rem)]`), never the
  list's, so the page does not scroll because of it and a long mods list
  scrolls past it. In a short window the details scroll inside the card;
  Play and the other actions stay at its bottom. The dashboard's Last played
  panel is sized the same way (it has no back button: `9.5rem`). A vanilla instance shows Resource Packs, Worlds, Screenshots and
  Settings; Mods and Shaders appear only for modded instances. Worlds,
  Resource Packs, Mods and Shaders share the same drop zone pattern (drag a
  file onto the window, or Browse) and a Remove button per item; worlds also
  have Save to Device and ask for confirmation before deleting. The file
  tabs have two views, remembered in `localStorage`: **Cards** (default —
  the Modrinth icon, title, version and description from `ListContent`;
  hand-added files show their name and "Added by hand") and **Compact**
  rows. Screenshots open in a preview dialog when clicked. **Settings** is
  the instance's launch settings: a memory slider (up to the machine's RAM,
  red in the danger zone), Java executable (with a file picker) and extra
  JVM arguments. Every file tab has an "Open folder" link.

Every page but the dashboard starts with a **Back to …** button above its
title (`components/BackButton`). It sticks under the nav on a strip of
canvas (`sticky top-[70px]`, tucked 2px under the 72px nav so no hairline shows), so it is in reach however far the page
scrolls; it must sit straight inside the page's `<main>` (a sticky element
only sticks within its parent), and its padding is taken back by negative
margins so it adds no height. It is dynamic: the app state keeps the
screens the player came through (`previous`/`back` in `state/`), so Back
from a project's Details returns to Addons with its instance lock intact,
and from there to the instance page. Login and the dashboard are roots —
nothing behind them, and Back never returns to the login screen.

The navigation bar carries Instances, Addons, the account menu (theme,
language, Privacy & Terms) and New Instance. It is `sticky top-0` on the
canvas colour, so the main options stay in view while a page scrolls; the
sticky side panels sit under it (`top-24`), or under the back button on
pages that have one (`top-30`).

- **Project details**: two columns. Left, in panels: every Minecraft
  version the project ever published for (the first twelve, "+N more"
  unfolds the rest), its loaders, and the player's instances that can take
  it, each with its own Add (installs straight away through the content
  queue). Right: the project page itself — icon, categories, client/server
  side, license, Source/Issues/Wiki links (opened in the system browser
  through `openExternal`), the gallery with captions, and the full body.
  Modrinth bodies are Markdown with HTML mixed in; `utils/markdown.tsx`
  turns the Markdown into HTML text, parses everything with `DOMParser`
  (an inert document — nothing runs) and rebuilds only whitelisted tags as
  React elements, links and images only with http(s) URLs. No HTML is ever
  handed to the DOM, so a `<script>` or `<iframe>` in a project page cannot
  reach the Wails bindings.

## State and data flow

`state/` holds one app context (profile, instance list, current screen and
the history behind it)
and two hooks it composes: `useLaunchController` owns the *launch state*,
`useContentQueue` the install queue behind the Addons toasts. Each is its
own context so progress ticks re-render only what shows them. The "game closed unexpectedly" dialog offers
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
