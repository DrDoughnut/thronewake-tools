import {
  factionBuildings,
  rules,
  trainingSpeedup,
  type FactionBuildingKey,
} from '../data/rules';
import type { Faction, Unit } from '../data/types';

/** Everything the player can change that affects a unit's numbers. */
export interface Modifiers {
  /** Smithy level, 0…20. Available to every faction. */
  smithy: number;
  /**
   * Level of each faction-specific building. A building only ever affects
   * units of the faction that owns it, so these can be raised freely
   * without distorting a cross-faction comparison.
   */
  buildings: Record<FactionBuildingKey, number>;
}

export const defaultModifiers: Modifiers = {
  smithy: 0,
  buildings: { ridersWells: 0, stormbrewWorks: 0 },
};

/** The level of `building`, but only for the faction that owns it. */
function levelFor(
  faction: Faction,
  key: FactionBuildingKey,
  mods: Modifiers,
): number {
  const building = factionBuildings[key];
  return faction.key === building.faction ? (mods.buildings[key] ?? 0) : 0;
}

/**
 * Apply smithy upgrades to a single stat.
 *
 * Units that cannot be researched (`noUpgrade`) are returned untouched, so
 * they do not silently gain from the slider.
 */
export function upgradeStat(unit: Unit, base: number, level: number): number {
  if (unit.noUpgrade || level <= 0) return base;
  const { growth, upkeepWeight } = rules.smithy;
  return base + (base + upkeepWeight * unit.upkeep) * (growth ** level - 1);
}

/** Stormbrew Works offense multiplier. 1 for every other faction. */
export function offenseFactor(faction: Faction, mods: Modifiers): number {
  const level = levelFor(faction, 'stormbrewWorks', mods);
  return 1 + factionBuildings.stormbrewWorks.offensePerLevel * level;
}

/**
 * Upkeep after Rider's Wells relief. Each eligible unit drops one point of
 * upkeep once the building passes that unit's threshold.
 */
export function effectiveUpkeep(
  faction: Faction,
  unit: Unit,
  mods: Modifiers,
): number {
  if (unit.upkeepReliefAt === undefined) return unit.upkeep;
  const level = levelFor(faction, 'ridersWells', mods);
  return level >= unit.upkeepReliefAt ? Math.max(0, unit.upkeep - 1) : unit.upkeep;
}

/**
 * Training time in seconds, assuming a maxed training building and, for
 * stabled units, the faction's cavalry-building discount.
 */
export function effectiveTime(
  faction: Faction,
  unit: Unit,
  mods: Modifiers,
): number {
  const level = unit.stabled ? levelFor(faction, 'ridersWells', mods) : 0;
  const discount = 1 - factionBuildings.ridersWells.trainingSpeedPerLevel * level;
  return Math.round(unit.time * trainingSpeedup * discount);
}

/** Sum of the four resource costs. */
export const totalCost = (unit: Unit): number =>
  unit.cost[0] + unit.cost[1] + unit.cost[2] + unit.cost[3];

/**
 * Every derived number for one unit under one set of modifiers.
 * These are the variables available to custom formulas.
 */
export interface UnitStats {
  /** Speed, squares per hour. */
  v: number;
  /** Offense. */
  a: number;
  /** Defense against foot. */
  di: number;
  /** Defense against mounted. */
  dc: number;
  /** Scouting. */
  s: number;
  /** Counter-scouting. */
  ds: number;
  /** Carry capacity. */
  c: number;
  /** Upkeep per hour. */
  cu: number;
  /** Training time, in hours. */
  t: number;
  /** Total cost across all four resources. */
  tc: number;
}

export function computeStats(
  faction: Faction,
  unit: Unit,
  mods: Modifiers,
): UnitStats {
  return {
    v: unit.speed,
    a: upgradeStat(unit, unit.off, mods.smithy) * offenseFactor(faction, mods),
    di: upgradeStat(unit, unit.defInf, mods.smithy),
    dc: upgradeStat(unit, unit.defCav, mods.smithy),
    s: upgradeStat(unit, rules.recon.scouting, mods.smithy),
    ds: upgradeStat(unit, rules.recon.counterScouting, mods.smithy),
    c: unit.capacity,
    cu: effectiveUpkeep(faction, unit, mods),
    t: effectiveTime(faction, unit, mods) / 3600,
    tc: totalCost(unit),
  };
}
