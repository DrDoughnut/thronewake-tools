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
    /** Per-level growth of the scaling term. */
    growth: 1.007,
    /** Weight of upkeep inside the scaling term. */
    upkeepWeight: 300 / 7,
  },

  /**
   * Training-building speedup assumed when reporting build times.
   *
   * A fully levelled training building cuts training time by 10% per level
   * above the first, so a level-20 building trains at 0.9^19 of the base
   * rate. Times shown by the calculator are therefore "best case".
   */
  training: {
    speedupPerLevel: 0.9,
    assumedLevel: 20,
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
} as const;

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

/** `0.9 ^ 19` — the training-time multiplier from a maxed training building. */
export const trainingSpeedup =
  rules.training.speedupPerLevel ** (rules.training.assumedLevel - 1);
