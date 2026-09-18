// The launcher's art: Minecraft block and item textures (16×16 PNGs in
// icons/, one file per icon key) used for instance icons, the background
// decorations and, until a real mark lands, the brand logo.
//
// To add an icon: drop <key>.png into icons/ and, if players may pick it
// for an instance, list it in ICON_CHOICES. To ship a logo: drop the file
// here, import it and set ASSETS.logo for its theme.

export type Theme = 'light' | 'dark'

const files = import.meta.glob('./icons/*.png', { eager: true, import: 'default' }) as Record<string, string>
/** Icon key → image URL, for every file in icons/. */
export const ICONS: Record<string, string> = Object.fromEntries(Object.entries(files).map(([path, url]) => [path.slice('./icons/'.length, -'.png'.length), url]))

/** Keys from before the textures landed (instances saved with them keep working). */
const LEGACY: Record<string, string> = {
  grass: 'grass_block_side', planks: 'oak_planks', crafting_table: 'oak_planks', furnace: 'stone', enderman: 'ender_pearl',
  sword: 'diamond_sword', axe: 'diamond_axe', pickaxe: 'diamond_pickaxe',
}

/** The image for an icon key; unknown keys fall back to the grass block. */
export function iconURL(name: string): string {
  return ICONS[name] ?? ICONS[LEGACY[name]] ?? ICONS.grass_block_side
}

/** Icons a player can pick for an instance, in picker order. */
export const ICON_CHOICES: string[] = [
  'grass_block_side', 'dirt', 'stone', 'cobblestone', 'stone_bricks', 'mossy_cobblestone', 'deepslate', 'bedrock', 'obsidian', 'crying_obsidian',
  'netherrack', 'magma', 'end_stone', 'purpur_block', 'sand', 'sandstone', 'snow', 'ice', 'bricks',
  'oak_planks', 'oak_log', 'spruce_planks', 'cherry_planks', 'bamboo_planks', 'crimson_planks', 'warped_planks',
  'moss_block', 'sponge', 'slime_block', 'honeycomb_block', 'glowstone', 'sea_lantern', 'prismarine', 'amethyst_block',
  'coal_ore', 'iron_ore', 'gold_ore', 'diamond_ore', 'emerald_ore', 'redstone_ore', 'lapis_ore', 'ancient_debris_side',
  'iron_block', 'gold_block', 'diamond_block', 'emerald_block', 'netherite_block', 'redstone_block', 'lapis_block', 'copper_block',
  'stone_sword', 'iron_sword', 'golden_sword', 'diamond_sword', 'netherite_sword',
  'iron_pickaxe', 'golden_pickaxe', 'diamond_pickaxe', 'netherite_pickaxe', 'diamond_axe', 'netherite_axe', 'diamond_shovel', 'diamond_hoe',
  'bow', 'crossbow_standby', 'arrow', 'trident', 'mace', 'elytra', 'totem_of_undying',
  'diamond_helmet', 'diamond_chestplate', 'netherite_helmet', 'netherite_chestplate',
  'apple', 'golden_apple', 'bread', 'cooked_beef', 'cake', 'carrot', 'sweet_berries', 'glow_berries', 'honey_bottle',
  'diamond', 'emerald', 'iron_ingot', 'gold_ingot', 'netherite_ingot', 'redstone', 'amethyst_shard', 'echo_shard',
  'ender_pearl', 'ender_eye', 'nether_star', 'heart_of_the_sea', 'dragon_breath', 'end_crystal', 'blaze_rod', 'ghast_tear', 'magma_cream', 'slime_ball', 'shulker_shell',
  'book', 'enchanted_book', 'experience_bottle', 'potion', 'spyglass', 'fishing_rod', 'lantern', 'campfire', 'water_bucket', 'lava_bucket',
  'minecart', 'saddle', 'name_tag', 'goat_horn', 'firework_rocket', 'music_disc_cat',
]

/** "diamond_sword" → "Diamond Sword", for tooltips. */
export const iconLabel = (key: string) => key.replace(/_side$/, '').replace(/_standby$/, '').split('_').map((w) => w[0].toUpperCase() + w.slice(1)).join(' ')

/** Items floating behind the login and dashboard, per theme (cycled by Decor). */
export const THEME_DECOR: Record<Theme, string[]> = {
  light: ['diamond_pickaxe', 'diamond', 'apple', 'grass_block_side', 'emerald', 'iron_sword', 'golden_apple'],
  dark: ['ender_pearl', 'netherite_sword', 'netherite_ingot', 'golden_apple', 'end_crystal', 'nether_star', 'obsidian'],
}

export const ASSETS: {
  /** Brand mark (top bar, login): one image per theme; empty = the ender pearl / grass block icon. */
  logo: Record<Theme, string | undefined>
} = { logo: { light: undefined, dark: undefined } }
