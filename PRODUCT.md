# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack
Existing codebase: Wails v2 (Go backend) with a React 18 + TypeScript + Tailwind 4 + Vite frontend in `frontend/`. The UI renders in the OS webview (WebKitGTK on Linux), so no modern-CSS feature may be assumed without checking. Desktop only (Windows, Linux, macOS); "web" here means HTML/CSS in a webview.

## Users
Casual Minecraft: Java Edition players (kids, teens, families sharing one PC) who want to type a nickname and press Play with no account. Also modders and modpack players who juggle several modded instances and want density and control. Friends who join a host's server are a secondary audience.

## Product Purpose
Udeos Launcher is a free desktop launcher. It creates isolated instances for any Minecraft version, downloads the game and Java itself, installs Fabric, Quilt, Forge and NeoForge, browses and installs Modrinth content with compatibility and dependency checks, hosts servers reachable from the internet, manages skins, and offers an AI advisor for mod suggestions. Success: a player goes from install to in-game with no configuration, and a modder can manage many instances without friction.

## Positioning
Offline nickname auth (no Microsoft account), everything built in (loaders, Java, servers with a relay, skin library with a local skin server, AI mod advisor), and small and fast on weak PCs.

## Operating Context
Long waits are the norm: game and Java downloads, loader installs, content downloads, server start-up, update checks, AI replies. The user must always see what is running, how far along it is, and what they can do meanwhile. Progress today appears as a launch modal, bottom-right notifications and toasts, and button spinners. Players switch between profiles (nicknames), each with their own instances, skins, language and theme.

## Capabilities and Constraints
- Screens: Login, Dashboard (instances), CreateInstance, Instance page (Worlds, Screenshots, Resource Packs, Mods, Shaders, Settings tabs), Search/Addons, ProjectDetail, Servers and server page, Skins and SkinEditor, Advisor (AI), dialogs (launch, profile, update, close, conflicts, datapacks).
- English and Spanish; all copy goes through `frontend/src/i18n`. Layouts must tolerate longer Spanish strings.
- Light, dark and custom themes selectable per profile (`ThemePicker`, `utils/theme.ts`).
- Real Minecraft textures in `frontend/src/assets/icons/` are the icon set; the logo is an ender pearl plus a mace rotated -45 degrees (`ui/Logo.tsx`).
- Existing architecture rule: flat `frontend/src/ui/`, shared components only when reused in more than one place, logic out of screens (docs/architecture/frontend.md).
- Real progress (game install, downloads) must be shown as measured progress; unmeasurable waits use an indeterminate loader. Never animate a bar updated every frame with a CSS transition.
- Nav is 72px sticky; header and back chrome must never make a page overflow.
- Open: the visual world, typeface (PT Mono is being replaced) and shell layout are to be decided in new-work.

## Brand Commitments
Name "Udeos Launcher". Pixel Minecraft textures as icons, the ender pearl + mace logo, light/dark/custom themes. The user considers the current look generic and AI-styled and wants it modern, current and smooth; all other visual decisions are open.

## Evidence on Hand
Screenshots in `docs/assets/screenshots/`, UX audit and hierarchy in `docs/system-design/`, current design system in `docs/architecture/design-system.md`, the Minecraft textures in `frontend/src/assets/icons/`. No testimonials, metrics or user research exist; do not fabricate any.

## Product Principles
1. Press Play first: the path from opening the launcher to playing is the shortest thing on screen.
2. Waiting is a feature: every download, install and start-up shows what is happening, how far along it is, and what the user can do meanwhile.
3. Casual by default, dense on demand: nothing a child cannot understand on the surface, with modder-grade control one step in.
4. Light on weak PCs: no heavy effects that cost frames on low-end hardware or old webviews.
5. Everything local and private; no account wall.

## Accessibility & Inclusion
Bilingual EN/ES. Readable by kids: large click targets, short text. Keyboard operable (cards are links with Enter, native dialogs). Respect reduced motion.
