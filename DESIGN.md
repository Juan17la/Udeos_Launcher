# Design

Udeos Launcher: a dark, game-native interface for casual players and modders,
playful in the details and quiet where you work. See
[docs/architecture/design-system.md](docs/architecture/design-system.md) for
the full rules and where each lives in code.

- **Palette:** deep night-blue canvas (`#0E1423`, dark but never black) with two soft accent glows, panels a step lighter with blue-tinted hairlines, one blue accent (`#336CEB` dark, `#2563EB` light; white on it passes AA). Light theme is cool sky paper. Gold means "working or slow on purpose", green means "playing / on", red means failure.
- **Type:** Geist (UI), Geist Mono (numbers, versions, addresses), Pixelify Sans (wordmark and progress figure only).
- **Shape:** 6/10/16/22px radii, pill tags; soft offset shadows kept low. Controls are 10px and come in one height scale, 32/40/48 (buttons, fields, the launch strip, the Playing chip).
- **Buttons:** flat fills with a 2px darker bottom edge, like a block's lower face; pressing swaps it for an inset top edge. No gloss, no glow, bold (not extrabold) labels.
- **Tags:** neutral metadata on `tag-gray`, 24px tall; the version in Geist Mono behind a 16px grass block. Green and gold are never spent on metadata: a green chip means live (In use, Playing, Online), a gold one means working or not final (starting, beta).
- **Selected** is one look everywhere a choice is picked from a set (chips, icon cells, list rows, theme cards, the current page): an accent tint with an accent hairline (`selected` utility), never a solid blue fill.
- **Pixel art** is drawn bare at 16, 32, 48 or 64px (whole multiples of the 16px textures), never inside a tinted rounded tile.
- **Decoration lives in moments:** a pixel item drops into each empty list, every loader is a hopping block (the 16px `Spinner` in buttons and status lines, `BlockHop` for regions), a status dot is a square pixel, success and failure notices carry an emerald and a redstone, the Create page drops in the icon you pick, Playing is a live green chip, closing a game says "GG". The canvas carries faint scattered items (sidebar middle and the page's open space, behind the cards), a grass strip at the sidebar's foot, pixel items beside headings and stats.
- **Motion:** exponential ease-out, colour-only hover, no entrance fades on pages, dialogs or popovers (WebKitGTK flickered on them); motion only where something needs noticing (loading, empty, error, playing).
- **Signature:** progress lives where the work is (launch strip, then a green "Playing" chip with Close game), plus an always-present Activity tray in the sidebar that also lists open games and servers.
- **The instance played last** is a sticky panel two cards tall, tinted 12% toward the accent with an accent hairline, labelled "Last played" in plain muted text, its icon at 96px, and the screen's one solid blue Play. Servers that are up, starting or stopping stand on `panel-feature` (a flat fill of the muted accent `--color-feature`, no gradient or glow; no surface carries a gradient); content on it takes the `on-feature` token scope, and focus outlines on it turn on-feature.
- **Sidebar** folds to an icon rail below 1000px or when the player collapses it (remembered); the `rail:` variant styles both.
- **Blue is for the one main action of a screen.** Card actions (Play, Start, Add), toolbar Add, Copy, the sidebar's New and per-row installs are quiet: `secondary` with a blue glyph; the card itself opens its page.
