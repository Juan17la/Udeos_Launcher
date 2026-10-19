# Design system

The styling source of truth for the launcher. The second half maps each rule
to where it lives in the code.

## The world

Dark and game-native, for casual players and modders: playful in the
details, quiet where you work. Surfaces are told apart by a step of lightness,
a blue-tinted hairline and a low soft shadow. One blue accent carries every
primary action; the Minecraft textures supply the rest of the colour. The page
stays clean; the Minecraft flavour lives in moments (an item dropping into an
empty list, the hopping-block loader, the icon dropping in on the Create page,
the live Playing chip, "GG" when a game closes). Two faint items sit in the
sidebar's empty middle and a grass strip closes it.
Dark is the reference theme. Light (cool sky paper, the same blue one step
deeper) and Custom (a light or dark base plus one accent, everything else
derived with contrast checked) use the same tokens with other values.

## Rules

- **Type.** Geist for everything you read, Geist Mono for versions, sizes,
  addresses and other numbers, Pixelify Sans only for the wordmark and the
  big progress figure. Body 14px, headings tighter with a slight negative
  tracking and balanced wrapping. No eyebrow labels above headings.
- **Radius.** 6px small, 10px controls, 16px panels, 22px large surfaces; tags are pills.
- **Decoration.** Item sprites only (no full block textures, they read as
  missing images), pixel items beside page headings, instance stats and empty
  states. Decoration never sits behind a label.
- **Surfaces.** `panel` (card, form, side panel), `glass` (dialog, popover,
  notice; an opaque raised sheet, no blur), `tag` and `skeleton` are utility
  classes. Panels inside panels use `bg-panel-2`.
- **One primary action per view.** `primary` is the solid accent, `secondary`
  a raised neutral (Manage, Open), `idle` a quiet fill, `ghost` a hairline
  outline, `danger` a red tint. A disabled primary turns neutral instead of
  fading the blue. Solid blue is for the one main action of a screen (Play
  on the Library's first card, Create & play, Start on a server page); card actions (Play,
  Start, Add) are quiet: neutral with a blue glyph. A card opens its page
  through `CardLink` (a real button stretched over it), so its own buttons
  are never nested inside a clickable element. Delete lives at the bottom of
  Settings, away from Play. Addons folds version, loader, sort and topics
  behind one Filters button; long mod lists start as rows with a filter box,
  and remove shows on hover or focus.
- **Motion.** Exponential ease-out, 160ms for states. No page or card
  entrance: it replayed on every page change and read as a flicker. Motion is
  for what needs noticing: the hopping block loader, an item dropping into an
  empty list, an error's one nudge, a pulse while something runs. Hover is
  colour only: no transforms on cards or buttons, no `will-change`, because a
  page of cards on layers made WebKitGTK scroll badly. Reduced motion stops
  the hops, drops and nudges.
- **Shell.** A left sidebar (brand, the contextual New button, Instances,
  Servers, Skins, Addons, then Activity and the profile at the bottom). Under
  1000px it folds to an icon rail. A page that has a parent shows a Back row
  over its content; top-level pages do not.

## Waiting

Every wait shows where it happens.

- **In place.** Launching an instance replaces Play with the launch strip on
  that card or page: phase, one percentage, a bar and Cancel. Once the
  game runs, Play becomes a green "Playing · 12 min" chip with Close game
  (confirmed, for a frozen game), and a "Have fun" note appears once. A server
  that is starting or stopping shows a sliding bar and one line on its card
  and side panel. There is no launch modal.
- **Activity.** The sidebar item is always there. While work runs it shows a
  ring, a count and a thin bar; its popover lists every job with progress and
  Cancel, plus the open games (with Close game) and running servers. A
  finished or failed job also flashes a short notice beside the sidebar (a
  success clears itself, an error stays until read).
- **Undo, not confirm, for small removals.** Removing a mod, resource pack or
  shader hides it at once with "Removed X · Undo" for 5 seconds; worlds,
  instances, servers, backups and skins still ask first.
- **Measured or not.** Real progress (game files, downloads) is a filled bar.
  An unmeasurable wait is a sliding segment. A slow run that is expected
  (first install, loader patching) turns the bar gold and says so on the page.
  The bar is scaled, never given a CSS transition, because it is updated every
  frame.
- **Lists that are loading** show skeleton rows of their own shape
  (`SkeletonRows`), buttons that work show a spinner in place of their icon,
  and `AutoLoader` is for the few waits with no known shape.

## Where it lives

| Rule | Where |
|---|---|
| Colours, radii, shadows, fonts, easing | `frontend/src/theme/tokens.css` (`@theme` plus the `:root` and `[data-theme]` blocks) |
| Custom theme derivation | `frontend/src/utils/theme.ts` (`customVars`, `paletteFrom`) |
| Fonts | `@fontsource-variable/geist`, `geist-mono`, `@fontsource/pixelify-sans`, imported in `main.tsx` |
| Buttons, fields, dialog, tabs, loaders | `frontend/src/ui/` |
| Sidebar shell | `components/Sidebar.tsx`, grid on `#root` in tokens.css |
| Launch strip | `components/LaunchStrip.tsx`, fed by `hooks/useLaunchProgress.ts` |
| Activity tray | `components/Activity.tsx` |
| Playing chip, Close game | `components/PlayButton.tsx`, `StopGame` in `app_play.go` |
| Sidebar items | `frontend/src/ui/Backdrop.tsx`, `.backdrop` in tokens.css |
| Card click target | `frontend/src/ui/CardLink.tsx` |
| Empty states, loaders | `ui/Empty.tsx`, `ui/Loader.tsx` (`BlockHop`) |
