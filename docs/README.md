# Udeos Launcher — documentation

These pages explain how the launcher is put together and how it works, in
plain language. They are meant to be read in order the first time.

| # | Page | What you will learn |
|---|------|---------------------|
| 1 | [Architecture](01-architecture.md) | The two halves of the app (Go backend, web UI), how they talk, and how the code is organised |
| 2 | [Running and building](02-running-and-building.md) | What to install, how to run in development mode, how to produce the desktop binary on each OS |
| 3 | [Installing Minecraft from the CDN](03-installation-from-the-cdn.md) | Step by step: what Mojang publishes, what the launcher downloads, and how it verifies it |
| 4 | [Launching the game](04-launching-the-game.md) | How the java command line is built and how "offline" play works without an account |
| 5 | [Data on disk](05-data-on-disk.md) | Where files live, what is shared between instances and what is private to each |
| 6 | [Frontend and design system](06-frontend-and-design.md) | Screens, state, themes, pixel icons and how the mockup became the real UI |
| 7 | [Git workflow](07-git-workflow.md) | One branch per feature and the scripts in `git/` |
| 8 | [Mod loaders](08-mod-loaders.md) | How Fabric and Forge are installed without the player running anything, and how mods get into an instance |
| 9 | [Content search](09-content-search.md) | Browsing mods, resource packs, shaders and modpacks from Modrinth, and how results are cached for offline use |

Related material outside this folder: the requirements and diagrams in
`Info_claude/`, and the interactive mockup in `Minecraft Launcher UI Mockups/`.
