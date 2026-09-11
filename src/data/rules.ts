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
   * Defence bonus is `growth ^ level`, so a level-20 tower at 1.03 is +80.6%.
   * The building catalog carries nothing to check these against: all twenty of
   * the Watch Tower's levels have an empty `effects` object, unlike the 32
   * buildings that do publish per-level effects.
   *
   * ⚠ These bases came from a player, and they are the opposite way round from
   * the game this one is modelled on, where the faction with the Trapper has
   * the 1.025 wall and the faction with the cavalry-upkeep building has 1.03.
   * The repo's own tribe ids agree with that older mapping — Embermark is 1
   * (the Trapper belongs to Vaeloria, id 3, per the CP optimizer's tests). If a
   * battle report ever disagrees with the tools, swap these two first.
   */
  watchTower: {
    maxLevel: 20,
    growth: {
      verdant_wardens: 1.03,
      embermark_dominion: 1.025,
      stormfang_clans: 1.02,
    } as Record<string, number>,
    fallbackGrowth: 1.025,
  },
} as const;

/**
 * Fractional defence bonus of a Watch Tower: 0.806 means +80.6%.
 *
 * Flat defence is deliberately not modelled — the catalog declares a `defFlat`
 * effect for the tower but publishes no values, and it is small enough to sit
 * out until real numbers turn up.
 */
export function watchTowerBonus(factionKey: string, level: number): number {
  const growth = rules.watchTower.growth[factionKey] ?? rules.watchTower.fallbackGrowth;
  const capped = Math.max(0, Math.min(rules.watchTower.maxLevel, Math.floor(level) || 0));
  return growth ** capped - 1;
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
