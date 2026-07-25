# Thronewake Tools

Browser-only calculators for Thronewake. No backend, no database, no API — the
whole thing is static files, and every number is computed in your browser.
Deploy it to GitHub Pages, Netlify, S3, or open `dist/index.html` from a USB
stick; it works the same.

The first tool is the **unit attributes calculator**: it ranks every unit (or
mixed pair of units) by whatever is actually limiting you — resources, grain, or
hours — with smithy upgrades and each faction's own buildings applied.

## Running it

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # → dist/
npm test         # engine, data and UI tests
```

## Where things live

```
src/
  data/           ← the game. Edit this when Thronewake changes.
    types.ts        shapes for units and factions
    rules.ts        every tunable constant (upgrade curve, building effects)
    factions.ts     the unit tables — names, stats, costs, flavour text
    unitSets.ts     which rows the results table shows
    statMeta.ts     labels and hints for each stat
  engine/         ← the maths. Knows nothing about any specific unit.
    stats.ts        upgrade and modifier formulas
    value.ts        the rating calculation and ranking
    formula.ts      parser for user-written formulas
  components/     ← the UI
  assets/icons/   ← unit artwork (see docs/icons.md)
```

The split is the point: **data changes should never require touching the
engine, and engine changes should never require touching the UI.**

## Where the data came from

Unit names, roster order, stats, costs, training times, flavour text and artwork
are the game's own, read out of the live client bundle. Two fields are ours:

- `glyph` — an emoji fallback drawn only if a unit's icon file is missing
- `role` — derived from roster slot and unit kind; drives filtering

The four factions are **Embermark Dominion**, **Stormfang Clans**, **Verdant
Wardens** (all playable) and **The Ancients** (not playable — no training cost
and no training time, so cost- and time-based ratings do not apply to them).

Leaders and settlers are in the data but excluded from every roster: you build
those to a number, not for value per resource, so ranking them is noise.

> [!NOTE]
> This is a snapshot, not a live feed. Balance changes in Thronewake will not
> appear until the tables are refreshed.

## How the rating works

Each row is scored as

```
(speed · Σ chosen stats) / Π chosen divisors
```

with any subset of stats and divisors selected. Rows containing two units model
a mixed army: their stats are summed, and the trailing unit's cost and upkeep
enter the denominator weighted by its training time, so a slow support unit
weighs less than the unit it accompanies.

Modifiers:

| Modifier | Scope | Effect |
| --- | --- | --- |
| Smithy | all factions | `base + (base + 300·upkeep/7) · (1.007^level − 1)`, applied to attack and both defense values. Always the unit's base upkeep. |
| Rider's Wells | Embermark only | −1% cavalry training time per level. Frees a point of upkeep for the Sentinel at 10, Sun Rider at 15, Crimson Lancer at 20. |
| Stormbrew Works | Stormfang only | +1% attack per level, up to +20%. |

Both faction buildings are always shown, because a cross-faction comparison is
exactly where "…and what if they have it built" matters. The engine applies a
building only to units of the faction that owns it, so raising a slider can
never inflate another faction's numbers — there are tests for this.

Training times assume a fully levelled training building.

> [!NOTE]
> In game, Stormbrew Works only applies while a Stormbrew Celebration is
> running in your capital, and it forces catapults onto random targets. The
> calculator models the attack bonus alone.

### Custom formulas

The **Write it** box takes an expression over `v a di dc s ds c cu t tc`, with
`+ − × ÷ ^`, brackets, and `sqrt cbrt pow abs min max round floor ceil log log2
log10`. `2k` means 2000.

This is parsed by a small recursive-descent evaluator
([`engine/formula.ts`](src/engine/formula.ts)), **not** `eval`. Settings —
including the formula — round-trip through the URL fragment, so a link from
someone else must not be able to run code in your browser.

## Not modelled

Two real Thronewake modifiers are **not** included, because they are alliance
bonuses rather than village buildings and it is not obvious they belong in a
per-unit rating:

- **Arms Mastery** — +2% attack *and* defense per level, max level 5
- **War Discipline** — increases troop training speed

Both are straightforward to add to `rules.ts` and `engine/stats.ts` if wanted.

> [!WARNING]
> **Scouting values are guesses.** Thronewake publishes only five unit
> attributes — attack, defense vs infantry, defense vs cavalry, speed and
> carrying capacity. There is no per-unit scouting stat. The reconnaissance
> roster uses 35 / 20 carried over from the game Thronewake is modelled on,
> which is **unverified**. Scout rankings are still meaningful on cost, speed
> and upkeep, which are real; treat the scouting column itself with suspicion.

## Correctness

`npm test` covers three things:

1. **The rating algorithm** is pinned to
   `src/engine/__fixtures__/reference.json`, generated by a separate
   implementation of the same algorithm run over the same roster. Eleven
   configurations spanning every stat, every divisor, mixed rows,
   reconnaissance and the cost-free Ancients match to ten decimal places.
2. **The smithy curve** is checked against the published worked example:
   base 40, upkeep 1, level 20 → 52.4048.
3. **The data** — every faction has ten units, unit keys are globally unique
   (they double as icon filenames), every roster reference resolves, and each
   faction has exactly one scout, leader and settler.

Plus a jsdom smoke test that mounts the app, drives the controls, and checks
the table keeps up.

### A note on the smithy formula

An earlier draft used a variant of the upgrade curve that divides upkeep by
1.007 and adds a `+0.0021·upkeep` term. It disagrees with the documented
formula by about 0.08% and the two extra constants have no stated basis, so the
documented form is what ships. If in-game numbers ever disagree with this tool,
that curve is the first thing to re-check.
