/**
 * Shared shapes for the game data.
 *
 * Everything the calculator knows about Thronewake lives in `src/data`.
 * The engine (`src/engine`) never hard-codes a unit, a faction or a number —
 * so retuning the game means editing data files only.
 */

/** The four resource types, in display order. */
export const RESOURCES = ['wood', 'clay', 'iron', 'grain'] as const;
export type Resource = (typeof RESOURCES)[number];

/** Cost is always a 4-tuple in RESOURCES order. */
export type Cost = [number, number, number, number];

/**
 * What a unit does. Drives filtering, icon fallbacks and which
 * modifiers apply to it.
 *
 * - `foot` / `mounted`  — regular troops
 * - `scout`             — uses the reconnaissance stat pair instead of off/def
 * - `ram` / `siege`     — wall and building demolishers
 * - `chief`             — loyalty reducer
 * - `settler`           — village founder
 */
export type UnitRole = 'foot' | 'mounted' | 'scout' | 'ram' | 'siege' | 'chief' | 'settler';

export interface Unit {
  /** Stable slug, unique within its faction. Used for icon lookup and URLs. */
  key: string;
  /** Display name. Swap freely — nothing keys off this. */
  name: string;
  /** Emoji shown when no icon image is present. See `docs/icons.md`. */
  glyph: string;
  role: UnitRole;
  /** Flavour text from the game. Shown as a tooltip; absent for some units. */
  description?: string;

  /** Offense points. */
  off: number;
  /** Defense against foot troops. */
  defInf: number;
  /** Defense against mounted troops. */
  defCav: number;

  /** Squares per hour at base server speed. */
  speed: number;
  /** Carry capacity, in resources. */
  capacity: number;
  /** Grain upkeep per hour. */
  upkeep: number;
  /** Base training time in seconds, at training-building level 1. */
  time: number;
  cost: Cost;

  /**
   * Trained in the Stable, so its faction's cavalry building (if any)
   * discounts this unit's training time.
   */
  stabled?: boolean;
  /**
   * Level of the faction's cavalry building at which this unit stops
   * costing one point of upkeep. Absent means it never does.
   */
  upkeepReliefAt?: number;
  /** Unit cannot be researched/upgraded in the smithy (wildlife, siege of some factions). */
  noUpgrade?: boolean;
}

export interface Faction {
  key: string;
  name: string;
  /** Short label for tight spaces. */
  short: string;
  /** Accent colour used for row tinting and icon fallbacks. */
  color: string;
  /** Flavour text from the game. */
  blurb?: string;
  /** Not player-controlled — excluded from most presets. */
  wild?: boolean;
  units: Unit[];
}
