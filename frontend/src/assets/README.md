# Assets

`icons/` holds the Minecraft block and item textures (16×16 PNG) the launcher
draws with: instance icons (the ones in `ICON_CHOICES`), the background
decorations (`THEME_DECOR`), the logo (`ui/Logo.tsx`: ender pearl with a
mace across it) and the stone block shown for projects without an icon.
`index.ts` loads every `icons/*.png` by file name (`iconURL('diamond_sword')`),
so adding an icon is dropping the file in and, to let players pick it,
listing it in `ICON_CHOICES`.
