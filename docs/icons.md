# Unit artwork

All 40 units ship with artwork taken from the game client. Files live flat in:

```
src/assets/icons/units/<unit-key>.png
```

Unit keys are the game's own slugs and are unique across every faction, so no
folder nesting is needed. The four settlers are `settler1`…`settler4`, exactly
as the game names them.

## Replacing or adding art

Drop a file in that folder named after the unit's `key`. That is the whole
workflow — [`src/icons.ts`](../src/icons.ts) globs the directory at build time,
so there is no manifest to update. Vite content-hashes the files like any other
asset.

Accepted extensions: `png`, `jpg`, `jpeg`, `webp`, `svg`, `avif`.

Keys are the `key` fields in [`src/data/factions.ts`](../src/data/factions.ts):

```
src/assets/icons/units/emberblade.png
src/assets/icons/units/blood_charger.png
src/assets/icons/units/oak_cavalier.png
```

A file whose name matches no unit key is ignored, and a unit with no matching
file falls back to its emoji `glyph` rather than rendering broken. If you rename
a unit's `key`, rename its icon file to match.

## Refreshing from the game

The current set was downloaded from the game's asset bundle, which serves them
under content-hashed names (`emberblade-CJ1QB4U9.png`). The hash is stripped on
the way in; that is the only transformation applied. If the game reskins a unit,
re-download and overwrite in place.

## Sizing

Source icons are 100px on the long edge. They render at 34×34 CSS pixels inside
a rounded badge with `object-fit: contain`, so they stay crisp at up to ~3×.
Transparent backgrounds look best — the badge supplies the faction-coloured
backdrop.

## Faction colour

The `color` field on each faction drives the icon badge, the row's left border,
and the value bar in the results table. One value, three places.
