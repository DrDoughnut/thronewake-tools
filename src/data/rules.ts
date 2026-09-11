import { NORMAL_MAX_LEVEL, trainingBuildings } from './buildings';

/**
 * Tunable game rules — every constant the engine uses lives here.
 *
 * If Thronewake rebalances a building or an upgrade curve, this file is the
 * only thing that needs to change.
 */

export const rules = {
  /**
   * Smithy upgrades. Available to every faction.
   *
   *     improved = base + (base + 300·upkeep/7) · (1.007^level − 1)
   *
   * Applies to offense and both defense values. Always the unit's *base*
   * upkeep: bonuses that change a unit's actual grain cost do not feed back
   * into this.
   */
  smithy: {
    name: 'Smithy',
    icon: 'anvil',
    maxLevel: 20,
    /** Research can raise this building three levels above its normal cap. */
    researchMaxLevel: 23,
    /** Per-level growth of the scaling term. */
    growth: 1.007,
    /** Weight of upkeep inside the scaling term. */
    upkeepWeight: 300 / 7,
  },

  /**
   * Reconnaissance stat pair.
   *
   * ⚠ Thronewake does not expose per-unit scouting values — its unit
   * attributes are attack, defense-vs-infantry, defense-vs-cavalry, speed
   * and carrying capacity only. These two numbers are carried over from the
   * game Thronewake is modelled on and are UNVERIFIED. Scout rankings are
   * therefore driven mostly by cost, speed and upkeep, which are real.
   */
  recon: {
    scouting: 35,
    counterScouting: 20,
  },

  /**
   * Watch Tower — this game's wall, and the building the rams come for.
   *
   * The catalog publishes nothing for it: all twenty of the tower's levels
   * carry an empty `effects` object, unlike the 32 buildings that do. So these
   * come from the game this one is modelled on, whose three walls map onto the
   * factions by the repo's own tribe ids (1 Embermark, 2 Stormfang, 3 Verdant
   * Wardens — the faction the CP optimizer gives the Trapper to):
   *
   *     Embermark Dominion  ← City Wall   1.030, +10 flat per level
   *     Verdant Wardens     ← Palisade    1.025, +8  flat per level
   *     Stormfang Clans     ← Earth Wall  1.020, +6  flat per level
   *
   * The tower's own level-1 cost in the catalog (160/100/80/60) is the
   * Palisade's to the resource, which is some comfort that the two line up.
   */
  watchTower: {
    maxLevel: 20,
    /** Defence multiplier per level. Bonus is `growth ^ level`. */
    growth: {
      embermark_dominion: 1.03,
      verdant_wardens: 1.025,
      stormfang_clans: 1.02,
    } as Record<string, number>,
    /** Flat defence the tower adds, per level, before the multiplier. */
    flatPerLevel: {
      embermark_dominion: 10,
      verdant_wardens: 8,
      stormfang_clans: 6,
    } as Record<string, number>,
    /**
     * How much harder than baseline this tower is to ram down.
     *
     * A genuine divergence from the modelled game, which gives all three walls
     * a durability of 1 and separates them only by bonus and flat defence.
     * Confirmed in-game instead, and the spread is the point: the tower that
     * defends hardest is the one that falls fastest.
     */
    ramDurability: {
      embermark_dominion: 1,
      verdant_wardens: 2,
      stormfang_clans: 5,
    } as Record<string, number>,
    fallbackGrowth: 1.025,
    fallbackFlat: 8,
    fallbackDurability: 1,
  },
} as const;

const towerLevel = (level: number) =>
  Math.max(0, Math.min(rules.watchTower.maxLevel, Math.floor(level) || 0));

/**
 * Fractional defence bonus of a Watch Tower: 0.806 means +80.6%.
 *
 * Rounded to three decimals before the 1 comes off, which is what the
 * reference does — so a level-20 City Wall is exactly +80.6%, not +80.6111%.
 */
export function watchTowerBonus(factionKey: string, level: number): number {
  const growth = rules.watchTower.growth[factionKey] ?? rules.watchTower.fallbackGrowth;
  return Math.round(growth ** towerLevel(level) * 1000) / 1000 - 1;
}

/** Flat defence the tower contributes, added before the bonus multiplies. */
export function watchTowerFlat(factionKey: string, level: number): number {
  const perLevel = rules.watchTower.flatPerLevel[factionKey] ?? rules.watchTower.fallbackFlat;
  return perLevel * towerLevel(level);
}

/** Ram resistance multiplier. See the warning on `ramDurability`. */
export function watchTowerDurability(factionKey: string): number {
  return rules.watchTower.ramDurability[factionKey] ?? rules.watchTower.fallbackDurability;
}

/**
 * Buildings that only benefit their own faction's troops.
 *
 * Each is shown in the UI regardless of which roster is on screen, because
 * a cross-faction comparison is exactly where "and what if they have it
 * built" matters. The engine applies a building only to units belonging to
 * `faction`, so raising a slider never inflates another faction's numbers.
 */
export const factionBuildings = {
  ridersWells: {
    key: 'ridersWells',
    name: "Rider's Wells",
    faction: 'embermark_dominion',
    maxLevel: 20,
    hint:
      'Embermark only. Cuts cavalry training time by 1% per level, and frees a point of upkeep for the Sentinel at 10, the Sun Rider at 15 and the Crimson Lancer at 20.',
    /** Training time multiplier is `1 − trainingSpeedPerLevel · level`. */
    trainingSpeedPerLevel: 0.01,
  },
  stormbrewWorks: {
    key: 'stormbrewWorks',
    name: 'Stormbrew Works',
    faction: 'stormfang_clans',
    maxLevel: 20,
    hint:
      'Stormfang only. Adds 1% offense per level, up to +20%. In game this applies only while a Stormbrew Celebration is running in your capital, and it forces catapults onto random targets.',
    /** Offense multiplier is `1 + offensePerLevel · level`. */
    offensePerLevel: 0.01,
  },
} as const;

export type FactionBuildingKey = keyof typeof factionBuildings;

export const factionBuildingList = Object.values(factionBuildings);

/**
 * Training-time multiplier assumed by the unit-attributes calculator: a
 * level-20 training building, the highest reachable without deliberately
 * pushing past the normal cap. Read from the game's published table rather
 * than computed, so both tools agree to the digit.
 */
export const trainingSpeedup =
  trainingBuildings.barracks.speed[NORMAL_MAX_LEVEL];
