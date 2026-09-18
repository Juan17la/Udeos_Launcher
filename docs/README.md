# Udeos Launcher — documentation

These pages explain how the launcher is put together and how it works, in
plain language. They are meant to be read in order the first time.

| # | Page | What you will learn |
|---|------|---------------------|
| 1 | [Architecture](01-architecture.md) | The two halves of the app (Go backend, web UI), how they talk, and how the code is organised |
| 2 | [Running and building](02-running-and-building.md) | What to install, how to run in development mode, how to produce the desktop binary on each OS, and how releases are built by CI |
| 3 | [Installing Minecraft from the CDN](03-installation-from-the-cdn.md) | Step by step: what Mojang publishes, what the launcher downloads, and how it verifies it |
| 4 | [Launching the game](04-launching-the-game.md) | How the java command line is built and how "offline" play works without an account |
| 5 | [Data on disk](05-data-on-disk.md) | Where files live, what is shared between instances and what is private to each |
| 6 | [Frontend and design system](06-frontend-and-design.md) | Screens, state, themes, pixel icons and how the mockup became the real UI |
| 7 | [Git workflow](07-git-workflow.md) | One branch per feature, merged with a merge commit |
| 8 | [Mod loaders](08-mod-loaders.md) | How Fabric and Forge are installed without the player running anything, and how mods get into an instance |
| 9 | [Content search](09-content-search.md) | Browsing mods, resource packs, shaders and modpacks from Modrinth, and how results are cached for offline use |
| 10 | [Adding content](10-adding-content.md) | Installing a search result into an instance: version and loader checks, dependencies, incompatibilities, and what is remembered |
| 11 | [Design system](11-design-system.md) | The pastel Minecraft design rules the UI follows, and how they map to tokens and the `ui/` building blocks |

The requirements, diagrams and the interactive UI mockup the design was ported
from are working material kept outside this repository.
