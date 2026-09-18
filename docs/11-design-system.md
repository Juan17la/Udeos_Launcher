# 11. Design system

The rules below are the styling source of truth for the launcher. The
second half maps each rule to where it lives in the code.

## Core system architecture & spatial rules

- **Universal border radius:** a non-negotiable `15px` (`border-radius: 15px`)
  applies strictly across all UI elements, including buttons, input fields,
  cards, popups, tags, status alerts and loaders.
- **Unframed headings:** page titles and section subtitles sit directly on the
  background canvas. Titles must never be enclosed within boxes, panels,
  cards or structural containers.
- **Asymmetric button padding:** all buttons must prioritise horizontal
  padding over vertical padding (Padding_X > Padding_Y), maintaining wider
  side margins relative to top/bottom spacing (e.g. `12px 24px` or `10px 20px`).
- **Strict spacing & column separation:** minimum layout gap and padding is
  `16px`. In vertical column layouts, elements must never touch or collapse
  into each other; explicit margin spacing is mandatory.
- **Zero microcopy & instruction removal:** omit instructional paragraphs,
  helper texts and onboarding tutorials. UI controls must remain strictly
  self-explanatory.
- **Typography:** `PT Mono` is applied globally across all UI components,
  buttons, labels, tags, inputs and state indicators.

## Interactive components & state behaviours

- **Selectable / toggle buttons:** selected = soft pastel mint green
  (`#A8E6CF`); unselected = soft pastel light gray (`#E0E0E0`), inspired by
  the lighter Minecraft UI button style, visually distinct from the canvas.
- **Locked / constrained filters:** when a filter is locked with a fixed
  parameter, it displays the selected option in a disabled state while
  retaining the standard `15px` radius and padding rules.
- **Universal glassmorphic loaders:** every asynchronous action, processing
  state or data fetch requires a loader. Loaders use a glassmorphic
  background (`backdrop-filter: blur(16px)`) and always display a live
  numerical percentage counter (`0%`–`100%`).
- **Feedback & status states:**
  - Success: instant visual feedback via a glassmorphic panel with a pastel
    mint checkmark or subtle green pulse.
  - Error / failure: soft pastel red glow or border (`#FF8B94`) with
    ultra-concise messaging capped strictly at 1–3 words (e.g. "Connection
    lost").
- **Three-colour tag system:** tags use the `15px` radius and `PT Mono` across
  three pastel shades:
  - Pastel light gray (`#E2E8F0`): neutral metadata and general categories.
  - Pastel mint green (`#A8E6CF`): active, verified or positive statuses.
  - Pastel soft gold (`#FFEAA7`): premium features, highlights or secondary
    attributes.

## Pastel theme & palette

| UI component | Dark theme (Minecraft Pastel Dark) | Light theme (Minecraft Pastel Light) |
| --- | --- | --- |
| Base canvas background | Deep charcoal slate `#25282A` | Soft off-white gray `#F7F9FA` |
| Idle / unselected button | Soft pastel light gray `#E0E0E0` | Soft pastel light gray `#E0E0E0` |
| Primary button (default) | Dark slate gray `#343A40` | Pastel mint green `#A8E6CF` |
| Primary button (hover) | Pastel mint green `#A8E6CF` | Dark slate gray `#343A40` |
| Selectable (active / idle) | `#A8E6CF` / `#E0E0E0` | `#A8E6CF` / `#E0E0E0` |
| Secondary button (default) | Pastel soft gold `#FFEAA7` | Pastel soft gold `#FFEAA7` |
| Secondary button (hover) | Pastel gold `#FFD369` | Pastel gold `#FFD369` |
| Glass containers | Translucent dark fill + `backdrop-filter: blur(16px)` | Translucent light fill + `backdrop-filter: blur(16px)` |

### Revisions

- **Palette (2026-09-18, current)** — Pastel Overworld (light, the default)
  and Pastel End (dark); the table above is history.

  | Role | Light: Pastel Overworld | Dark: Pastel End |
  | --- | --- | --- |
  | Canvas | soft birch cream `#F6F3EB` | muted obsidian `#29252E` |
  | Panels, cards, popups | warm off-white `#FCFBF8` (rows `#F3F0E8`) | deep lavender-gray `#383240` (rows `#4D4556`) |
  | Primary button, active tab, selected | pastel mint `#9BBF9D` (hover `#86AE89`) | pastel ender lavender `#AA8CC5` (hover `#BBA1D3`) |
  | Secondary button (Open instance) | pastel sky blue `#9EC5CB` | charcoal-purple `#4D4556` (no End blue was specified) |
  | Idle button, profile button, inactive toggle | warm pebble gray `#DCD7CF` | charcoal-purple `#4D4556` |
  | Headings, body text | soft oak charcoal `#36302B` | off-white lavender `#EDE7F2` |
  | Subtext, labels | muted earth brown `#8C847D` | soft muted violet `#AFA6B8` |
  | Floating item glow | none | magenta halo `rgba(194,145,217,.4)` (`--decor-glow`) |
  | Neumorphic shadow / rim | `rgba(54,48,43,.08)` / white `.85` | `rgba(15,12,20,.5)` / lavender `rgba(217,195,225,.05)` |
  | Inset (inputs, pressed) | `rgba(54,48,43,.06)` | `rgba(15,12,20,.35)` |
  | Elevation under primary / secondary | mint `rgba(155,191,157,.35)` / sky `rgba(158,197,203,.35)` | lavender `rgba(170,140,197,.3)` |

  Shared: version badge pastel leaf green `#CBE3C3`, loader badge pastel
  glowstone gold `#F5DF98`, gray badge `#DCD7CF` / `#AFA6B8`, ink on badges
  `#36302B`. The primary colour changes hue between themes, so its token is
  `--color-primary` (never "green"). Text on idle fills follows the theme
  text colour; ink is only for the light badge fills.
- **Logo**: an ender pearl with a mace laid diagonally across it, the same
  in both themes (`ui/Logo.tsx`). Projects without an icon show the stone
  block (`components/ProjectIcon.tsx`).
- **Loaders**: plain fetches (search results, version lists, listings,
  project detail) show an instant glass spinner; the percentage loader is
  reserved for work with real progress — the game install and content
  downloads.
- **Surface tones**: three, clearly apart — canvas (`#25282A` / `#F7F9FA`),
  panel (`#31363A` / `#FFFFFF`) and a second panel tone for rows nested in or
  beside panels (`#3B4146` / `#EDF1F4`, `Panel tone="alt"`, used by `Card row`).
- **Slider selector**: option groups (Addons type tabs, instance tabs, the
  loader picker, the nav) are a recessed light-gray track with a green thumb
  that slides under the chosen option (`SegmentedControl`).
- **Motion**: buttons lift 1px on hover and press to 98%; notifications slide
  in from the right (`toast-in`); status messages fade in; the slider thumb
  and every hover/active state transition in 150ms.
- **Play**: while its instance is being prepared the Play button is disabled
  at full opacity with a gold loader ring running round its edge
  (`Button loading`); the install itself reports as a bottom-right
  notification with a live percentage instead of a blocking overlay.

## Visual hierarchy & layering

- **Primary panels (neumorphism base):** main structural panels use soft
  light-and-shadow direction against the canvas to create tactile elevation
  without heavy outlines.
- **Overlays & dialogs (glassmorphism):** floating popovers, dropdowns, modal
  layers and status indicators use high-blur translucent fills
  (`backdrop-filter: blur(16px)`) to stay weightless.
- **Snappy state transitions:** all hover, active and focus interactions use
  a fast `150ms ease-in-out` transition.

---

## Where each rule lives

Tokens are in `frontend/src/theme/tokens.css` (one Tailwind `@theme inline`
block plus the runtime light/dark variables it references).

| Rule | Token / utility | Owner |
| --- | --- | --- |
| PT Mono | `--font-mono` → `body`, headings; `@fontsource/pt-mono/400.css` in `main.tsx` | tokens.css |
| 15px radius | `--radius-sm/md/lg: 15px` → `rounded-md` everywhere; `rounded-full` is banned | every block in `ui/` |
| Padding X > Y | `Button` sizes `8px 16px` / `10px 20px` / `12px 24px`; icon cells `8px 10px`; fields `16px 10px` | `ui/Button.tsx`, `ui/Field.tsx`, `IconChoice` in `screens/CreateInstance.tsx` |
| ≥16px spacing | screens use `gap-4`/`gap-6`, `p-4`+ on every `Panel` | screens |
| Unframed headings | `Login` and `CreateInstance` render `h1`/`h2` above their `Panel` | screens |
| Canvas / text | `--color-bg`, `--color-text`, `--color-muted` per theme | tokens.css |
| Primary button | `--color-primary` / `--color-primary-hover` per theme, `--shadow-primary`, white text | `Button variant="primary"` |
| Secondary button | `--color-secondary` / `--color-secondary-hover`, `--shadow-secondary` | `Button variant="secondary"` (Open instance) |
| Idle button | `--color-idle`, `--color-idle-hover` | `Button variant="idle"`, unselected toggle |
| Selected state | `--color-primary` + white text | `Checkbox`, `IconPicker`, current nav link |
| Locked filter | native `disabled` on `Select`/`Input`: idle fill, value kept, same radius/padding | `Field.tsx`, `screens/Search.tsx` |
| Loaders | `StatusMessage` with `percent` (glass + `NN%` + native `<progress>`) for real progress; `AutoLoader` (glass pill + spinner) for fetches; `useSimulatedProgress` only for unmeasurable phases inside a real install; `Button loading` ring on Play | `ui/StatusMessage.tsx`, `ui/Loader.tsx`, `ui/Button.tsx`, `components/Notifications.tsx` |
| Success | `StatusMessage kind="success"`: glass, primary-coloured check, `pulse-primary` keyframe | `ui/StatusMessage.tsx` |
| Error ≤3 words | `StatusMessage kind="error"`: `--color-error` border + `--shadow-error-glow`; headline from `t.errors.*` via `utils/errors.ts`, reason as detail | `ui/StatusMessage.tsx`, `utils/errors.ts`, i18n `errors` |
| Tags | `tag` utility + a fill: `bg-tag-gray` \| `bg-green-soft` \| `bg-gold-soft` | `theme/tokens.css` |
| Neumorphic panels | `--shadow-neu`, `--shadow-neu-inset`, `--color-panel` / `--color-panel-2` → `panel` (+ `panel-hover`) utility; list rows are `bg-panel-2 shadow-neu` | `theme/tokens.css` |
| Glass overlays | `--color-glass`, `--color-glass-border`, `backdrop-blur-[16px]` → `glass` utility used by `Dialog` (native `<dialog>` + `backdrop:`), `StatusMessage`, account popover, loaders | `theme/tokens.css`, `ui/Dialog.tsx` |
| 150ms ease-in-out | `--default-transition-duration: 150ms`, `--default-transition-timing-function: ease-in-out`; blocks use `transition-all duration-150 ease-in-out` | tokens.css, `ui/` |
| No microcopy | login intro, nickname hint, "more languages" and the create-form "required" line were removed; validation shows as an error only when triggered | i18n, `screens/Login.tsx` |

Tag semantics in this app: gray = download counts, project type, version
lists, app version; green = an instance's Minecraft version and "Compatible";
gold = loader labels and loader chips.

## Checking it

`frontend` builds with `npx tsc --noEmit && npx vite build`. A headless
browser pass over every screen (`npm run dev` and the `?screen=` shortcuts:
`login`, `dashboard`, `create`, `search`, `instance:<id>`) should find, via
`getComputedStyle`, that every element has `font-family` starting with
`PT Mono`, every rounded element has `border-radius: 15px`, every `button`
has `padding-left > padding-top`, and every transition lasts `0.15s`.
