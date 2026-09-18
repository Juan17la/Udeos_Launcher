# Assets

`icons/` holds the Minecraft block and item textures (16×16 PNG) the launcher
draws with: instance icons (the ones in `ICON_CHOICES`), the background
decorations (`THEME_DECOR`) and the stand-in logo. `index.ts` loads every
`icons/*.png` by file name (`iconURL('diamond_sword')`), so adding an icon is
dropping the file in and, to let players pick it, listing it in
`ICON_CHOICES`.

The real brand mark (an enderman, say) is still a placeholder: drop the file
here, import it and set `ASSETS.logo` per theme.
