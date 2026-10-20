# Design

Udeos Launcher: a dark, game-native interface for casual players and modders,
playful in the details and quiet where you work. See
[docs/architecture/design-system.md](docs/architecture/design-system.md) for
the full rules and where each lives in code.

- **Palette:** deep night-blue canvas (`#0E1423`, dark but never black) with two soft accent glows, panels a step lighter with blue-tinted hairlines, one blue accent (`#336CEB` dark, `#2563EB` light; white on it passes AA). Light theme is cool sky paper. Gold means "working or slow on purpose", green means "playing / on", red means failure.
- **Type:** Geist (UI), Geist Mono (numbers, versions, addresses), Pixelify Sans (wordmark and progress figure only).
- **Shape:** 6/10/16/22px radii, pill tags; soft offset shadows kept low.
- **Decoration lives in moments:** a pixel item drops into each empty list, the loader is a hopping block, the Create page drops in the icon you pick, Playing is a live green chip, closing a game says "GG". The canvas carries faint scattered items (sidebar middle and the page's open space, behind the cards), a grass strip at the sidebar's foot, pixel items beside headings and stats.
- **Motion:** exponential ease-out, colour-only hover, no page entrance (it flickered on every page change); motion only where something needs noticing (loading, empty, error, playing).
- **Signature:** progress lives where the work is (launch strip, then a green "Playing" chip with Close game), plus an always-present Activity tray in the sidebar that also lists open games and servers.
- **The instance played last** stands on its own tone (`panel-feature`: a flat fill of the muted accent `--color-feature`, no gradient or glow; no surface carries a gradient), two cards tall, with an inverted white Play. Servers that are up, starting or stopping use the same tone; content on it takes the `on-feature` token scope.
- **Sidebar** folds to an icon rail below 1000px or when the player collapses it (remembered); the `rail:` variant styles both.
- **Blue is for the one main action of a screen.** Card actions (Play, Start, Add) are quiet: neutral with a blue glyph; the card itself opens its page.
