# Assets

`icons/` holds the Minecraft block and item textures (16×16 PNG) the launcher
draws with: instance icons (the ones in `ICON_CHOICES`), the background
decorations (`THEME_DECOR`), the logo (`ui/Logo.tsx`: ender pearl with a
mace across it) and the stone block shown for projects without an icon.
`index.ts` loads every `icons/*.png` by file name (`iconURL('diamond_sword')`),
so adding an icon is dropping the file in and, to let players pick it,
listing it in `ICON_CHOICES`.

`default_skin.png` (Steve, classic) is the skin a profile wears until it
picks one — the Go side embeds the same file (`app_skins.go`) and hands it to
the game — and the editor starts new skins from it. `default_skin_slim.png`
(Alex, from the game jar) is where a new skin starts when it is switched to
Slim.
