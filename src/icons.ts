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
