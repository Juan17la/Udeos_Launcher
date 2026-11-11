# Non-functional requirements

How well the system must behave. Each requirement has an ID (`NFR-xx`), a
measurable criterion where one exists, and how it is met or checked today.
Functional behaviour is in [functional requirements](functional-requirements.md).

## Performance and efficiency

| ID | Requirement | Criterion | How it is met |
|----|-------------|-----------|---------------|
| NFR-01 | The app must stay light on weak computers. | No bundled browser; memory well below an Electron app. | Wails uses the system web view; Go backend. |
| NFR-02 | Reopening the launcher must feel instant. | Instance list visible without network calls. | Data read from the local folder; version manifest and Modrinth answers cached. |
| NFR-03 | A second instance of an already installed version must not download the game again. | Zero re-downloaded shared files. | Content-addressed shared libraries, assets and runtimes. |
| NFR-04 | Downloads must use the connection efficiently. | Parallel downloads with progress. | Pool of 8 concurrent workers in `internal/download`, 10 minute ceiling per file. |
| NFR-05 | Progress must never stall the interface. | Progress ticks re-render only the components that show them. | Launch and content progress live in their own React contexts. |
| NFR-06 | Scrolling long lists must stay smooth in WebKitGTK. | No per-card compositing layers, no hover transforms. | Colour-only hover, no `will-change`, no entrance fades. |
| NFR-07 | Network calls must not hang forever. | Timeouts on every client. | 60 s Mojang, 45 s AI, 10 min per download. |

## Reliability and data safety

| ID | Requirement | Criterion | How it is met |
|----|-------------|-----------|---------------|
| NFR-08 | No corrupt file may be used by the game. | Every Mojang and Modrinth file hash-verified. | SHA-1 (Mojang, downloads) and SHA-512 (Modrinth) checks before a file is moved into place. |
| NFR-09 | Player data must never be lost silently. | Destructive actions on worlds, instances, servers, backups and skins require confirmation; small removals are undoable for 5 s. | Confirm dialogs and the undo queue. |
| NFR-10 | Servers must always stop cleanly. | World saved on stop, on app close, on delete and before settings change. | Close dialog and the server supervisor. |
| NFR-11 | Restoring a backup must be reversible. | An automatic backup precedes every restore. | Backups tab logic. |
| NFR-12 | The launcher must keep working offline with what it has. | Installed instances launch without a connection; seen lists come from cache. | Disk caches for manifests and searches. |
| NFR-13 | A failed install must be recoverable by pressing Play again. | Partial downloads never marked complete. | Downloads go to a `.part` file that is removed on any error and renamed only after verification. |

## Security and privacy

| ID | Requirement | Criterion | How it is met |
|----|-------------|-----------|---------------|
| NFR-14 | No account and no personal data leaves the machine. | No telemetry; only the hosts listed in [Networking](../internals/networking.md) are contacted. | Single outbound list, reviewed per release. |
| NFR-15 | Remote content must not run code in the interface. | No HTML from Modrinth reaches the DOM unsanitised. | `utils/markdown.tsx` parses in an inert document and rebuilds only whitelisted tags; links and images only over http(s). |
| NFR-16 | External links must leave the app. | Links open in the system browser. | `openExternal` binding. |
| NFR-17 | AI keys must be protected. | Stored only locally, never displayed again, never logged. | `internal/ai` storage; settings show a masked state only. |
| NFR-18 | The AI must not invent content. | Every pick exists in the Modrinth results returned for that request. | The advisor validates every answer against Modrinth. |
| NFR-19 | The local skin server must not be exposed. | Bound to the loopback interface with header timeouts. | `internal/skin` Yggdrasil server. |
| NFR-20 | Vulnerabilities must have a reporting path. | Documented policy. | [SECURITY.md](../../SECURITY.md). |

## Usability and accessibility

| ID | Requirement | Criterion | How it is met |
|----|-------------|-----------|---------------|
| NFR-21 | A new player must reach the game with no configuration. | Setup in three short steps; Create & play preselects the newest release. | Login and Create Instance screens. |
| NFR-22 | Installing an addon must take at most two clicks. | One click from an instance, two from the sidebar. | Locked Addons mode and the compatible-instance picker. |
| NFR-23 | Every wait must show where it happens. | Measured progress for measurable work, an indeterminate bar otherwise, skeletons for loading lists. | Launch strip, Activity, `SkeletonRows`. |
| NFR-24 | Text must be readable by children. | Short sentences, no jargon on the surface, error headlines of one to three words. | i18n copy review, `utils/errors.ts`. |
| NFR-25 | Contrast must pass WCAG AA. | 4.5:1 for body text, white on the primary blue passes AA in both themes. | Token values in `theme/tokens.css`; custom themes checked by `utils/theme.ts`. |
| NFR-26 | The app must be keyboard operable. | Every action reachable by Tab, visible focus ring, Escape closes dialogs. | Native `<dialog>`, `CardLink` real buttons, `:focus-visible`. |
| NFR-27 | Motion must respect the player's settings. | `prefers-reduced-motion` stops hops, drops and nudges. | Global media query in tokens.css. |
| NFR-28 | Every icon action must have a text label or accessible name. | No unlabeled icon buttons. | Labels next to icons; tooltips and `aria-label` on rail items. |

## Internationalisation

| ID | Requirement | Criterion | How it is met |
|----|-------------|-----------|---------------|
| NFR-29 | Every visible string must be translatable. | No literal UI text in components. | `frontend/src/i18n`, English and Spanish. |
| NFR-30 | A missing translation must fail the build. | Type error on missing key. | Spanish dictionary typed against the English one. |
| NFR-31 | Layouts must tolerate longer Spanish text. | No overflow at 944 by 600 px of page in either language. | Truncation with tooltips in fixed rows. |

## Compatibility and portability

| ID | Requirement | Criterion | How it is met |
|----|-------------|-----------|---------------|
| NFR-32 | The app must run on Windows, macOS and Linux. | Windows 10/11 x64, macOS universal, Linux x64 with GTK 3 and WebKitGTK 4.1. | Release pipeline builds NSIS, `.zip`, `.dmg`, `.deb`, `.rpm`, `.tar.gz`. |
| NFR-33 | The layout must work at the minimum window size. | 960 by 640 px window, no page overflow, no wrapped tab bars. | Fixed layout rule in [Frontend](../architecture/frontend.md). |
| NFR-34 | Every Minecraft version in Mojang's manifest must be installable. | Old argument formats and natives handled. | `internal/mojang`, `internal/rules`, `internal/launch`. |
| NFR-35 | The interface must not depend on CSS features the slowest web view lacks. | Checked in WebKitGTK. | No `:has` in critical styles, no backdrop blur. |

## Maintainability

| ID | Requirement | Criterion | How it is met |
|----|-------------|-----------|---------------|
| NFR-36 | Backend packages must have one job each. | One package per concern under `internal/`. | See [architecture overview](../architecture/overview.md). |
| NFR-37 | The frontend must follow atomic design. | Atoms, molecules, organisms, templates; a level imports only from below. | `frontend/src/components/`. |
| NFR-38 | Visual values must live in one place. | Colours, radii, shadows, fonts in tokens only. | `frontend/src/theme/tokens.css`. |
| NFR-39 | Core logic must be tested. | Go unit tests run in CI. | `go test ./...` in `ci.yml` (27 test files). |
| NFR-40 | The UI must be workable without the desktop toolchain. | Every screen renders in a browser with a mock backend. | `api/mock.ts`, `?screen=` shortcut. |

## Legal and licensing

| ID | Requirement | Criterion | How it is met |
|----|-------------|-----------|---------------|
| NFR-41 | The software must be freely usable and modifiable. | MIT licence. | [LICENSE](../../LICENSE). |
| NFR-42 | The EULA must be accepted before any server runs. | Acceptance recorded at server creation. | Create Server form. |
| NFR-43 | The app must not imply affiliation with Mojang or Microsoft. | Disclaimer in the README. | README "Good to know". |
