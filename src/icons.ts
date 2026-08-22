/**
 * Unit artwork.
 *
 * Files live flat at `src/assets/icons/units/<unit-key>.png`. Unit keys are
 * the game's own slugs and are unique across every faction, so no folder
 * nesting is needed — the four settlers are `settler1`…`settler4`, exactly
 * as the game names them.
 *
 * The glob runs at build time: dropping a file in is the whole workflow,
 * with no manifest to keep in sync. A unit with no matching file falls back
 * to its emoji `glyph`, so a missing icon degrades instead of breaking.
 *
 * Accepted extensions: png, jpg, jpeg, webp, svg, avif.
 */
const modules = import.meta.glob(
  './assets/icons/units/*.{png,jpg,jpeg,webp,svg,avif}',
  { eager: true, query: '?url', import: 'default' },
) as Record<string, string>;

const icons = new Map<string, string>();
for (const [path, url] of Object.entries(modules)) {
  const match = path.match(/([^/]+)\.[a-z]+$/i);
  if (match) icons.set(match[1], url);
}

/** Artwork URL for a unit key, or undefined when the file is absent. */
export const unitIcon = (unitKey: string): string | undefined => icons.get(unitKey);

/**
 * Stat and building icons, from the same source as the unit art. Live in
 * `src/assets/icons/stats/` and are referenced by the `icon` field on each
 * stat's metadata.
 */
const statModules = import.meta.glob(
  './assets/icons/stats/*.{png,jpg,jpeg,webp,svg,avif}',
  { eager: true, query: '?url', import: 'default' },
) as Record<string, string>;

const statIcons = new Map<string, string>();
for (const [path, url] of Object.entries(statModules)) {
  const match = path.match(/([^/]+)\.[a-z]+$/i);
  if (match) statIcons.set(match[1], url);
}

export const statIcon = (key: string): string | undefined => statIcons.get(key);

/**
 * Building artwork.
 * Files live in `src/assets/icons/buildings/<slug>.{png,webp...}`.
 */
const buildingModules = import.meta.glob(
  './assets/icons/buildings/*.{png,jpg,jpeg,webp,svg,avif}',
  { eager: true, query: '?url', import: 'default' },
) as Record<string, string>;

const buildingIcons = new Map<string, string>();
for (const [path, url] of Object.entries(buildingModules)) {
  const match = path.match(/([^/]+)\.[a-z]+$/i);
  if (match) buildingIcons.set(match[1], url);
}

const GID_TO_ICON_KEY: Record<number, string> = {
  1: 'woodcutter',
  2: 'clay_pit',
  3: 'iron_mine',
  4: 'cropland',
  5: 'sawmill',
  6: 'brickyard',
  7: 'iron_foundry',
  8: 'grain_mill',
  9: 'bakery',
  10: 'warehouse',
  11: 'granary',
  13: 'smithy',
  14: 'bannerfield',
  15: 'main_building',
  16: 'rally_point',
  17: 'marketplace',
  18: 'embassy',
  19: 'barracks',
  20: 'stable',
  21: 'workshop',
  22: 'academy',
  23: 'cranny',
  24: 'town_hall',
  25: 'residence',
  26: 'palace',
  27: 'treasury',
  28: 'trade_office',
  29: 'great_barracks',
  30: 'great_stable',
  31: 'watch_tower',
  34: 'stonemasons_lodge',
  35: 'stormbrew_works',
  36: 'trapper',
  37: 'expedition_camp',
  38: 'great_warehouse',
  39: 'great_granary',
  41: 'riders_wells',
  46: 'herbalist',
};

export const buildingIcon = (gidOrSlug: number | string): string | undefined => {
  if (typeof gidOrSlug === 'number') {
    const key = GID_TO_ICON_KEY[gidOrSlug];
    if (key && buildingIcons.has(key)) return buildingIcons.get(key);
  }
  const cleanSlug = String(gidOrSlug).replace(/-/g, '_').toLowerCase();
  if (cleanSlug === 'town_hall') {
    return buildingIcons.get('main_building') || buildingIcons.get('town_hall');
  }
  if (cleanSlug === 'festival_grounds') {
    return buildingIcons.get('town_hall');
  }
  return buildingIcons.get(cleanSlug);
};
