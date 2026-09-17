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

- **Button colours** follow Minecraft's own buttons instead of the mint/slate
  table above: primary = the minecraft.net green `#3C8527` (hover `#2A641C`
  in light, `#4DA336` in dark, white text) in both themes; idle = light gray
  `#E0E0E0`; secondary = gold `#FFAA00` (hover `#E69500`). Selected
  toggles use the same green with white text. Tags use soft tints of the
  same hues: green `#B9E29A`, gold `#FFD966`, gray `#E2E8F0`.
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
| 15px radius | `--radius-sm/md/lg: 15px` → `rounded-md` everywhere; `rounded-full` is banned | every atom |
| Padding X > Y | `Button` sizes `8px 16px` / `10px 20px` / `12px 24px`; `Selectable` `8px 16px`; fields `16px 10px` | `ui/atoms/Button.tsx`, `Selectable.tsx`, `Field.tsx` |
| ≥16px spacing | screens use `gap-4`/`gap-6`, `p-4`+ ; `Panel` defaults to `gap-4 p-4` | screens, `Surface.tsx` |
| Unframed headings | `Login` and `CreateInstance` render `h1`/`h2` above their `Panel` | screens |
| Canvas / text | `--color-bg`, `--color-text`, `--color-muted` per theme | tokens.css |
| Primary button | `--color-primary` (`#3C8527`) / `-hover` per theme, white text | `Button variant="primary"` |
| Secondary button | `--color-gold`, `--color-gold-hover` | `Button variant="secondary"` |
| Idle button | `--color-idle`, `--color-idle-hover` | `Button variant="idle"`, unselected `Selectable` |
| Selected state | `--color-green` + white text | `Selectable`, `Checkbox`, current nav link |
| Locked filter | native `disabled` on `Select`/`Input`: idle fill, value kept, same radius/padding | `Field.tsx`, `screens/Search.tsx` |
| Loaders | `GlassLoader` (glass + `NN%` + bar) for real progress; `AutoLoader` (glass pill + `Spinner`) for fetches; `useSimulatedProgress` only for unmeasurable phases inside a real install; `Button loading` ring on Play | `ui/atoms/Loader.tsx`, `ui/atoms/Button.tsx`, `components/Notifications.tsx` |
| Success | `StatusMessage kind="success"` / `Toast tone="success"`: glass, green check, `pulse-green` keyframe | `ui/atoms/Status.tsx`, `ui/molecules/Toast.tsx` |
| Error ≤3 words | `StatusMessage kind="error"` / `Toast tone="error"`: `--color-error` border + `--shadow-error-glow`; headline from `t.errors.*` via `lib/errors.ts`, reason as detail | `ui/atoms/Status.tsx`, `lib/errors.ts`, i18n `errors` |
| Tags | `Tag tone="gray" \| "green" \| "gold"` (`--color-tag-gray`, `--color-green-soft`, `--color-gold-soft`) | `ui/atoms/Tag.tsx` |
| Neumorphic panels | `--shadow-neu`, `--shadow-neu-inset`, `--color-panel` / `--color-panel-2` → `Panel` (`tone`), `Card` | `ui/atoms/Surface.tsx`, `ui/molecules/Card.tsx` |
| Glass overlays | `--color-glass`, `--color-glass-border`, `backdrop-blur-[16px]` → `Glass`, `Dialog`, `Toast`, account popover, loaders | `ui/atoms/Surface.tsx`, `ui/molecules/Dialog.tsx` |
| 150ms ease-in-out | `--default-transition-duration: 150ms`, `--default-transition-timing-function: ease-in-out`; atoms use `transition-all duration-150 ease-in-out` | tokens.css, atoms |
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
