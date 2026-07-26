import type { Unit, UnitRole } from './types';

/**
 * Training buildings and their queues.
 *
 * `speed[level]` multiplies a unit's base training time. These tables are the
 * game's own, read from the client bundle — level 1 trains at the base rate
 * and each level takes 10% off, but the published values are rounded, so they
 * are listed rather than computed.
 *
 * Note the regular buildings publish levels up to 22 while the Great variants
 * stop at 20. That is not an oversight here: it is what the game ships.
 */

/** Barracks, Stable and Workshop — reachable past 20. */
const SPEED_TO_22 = [
  0, 1, 0.9, 0.81, 0.729, 0.6561, 0.5905, 0.5314, 0.4783, 0.4305, 0.3874,
  0.3487, 0.3138, 0.2824, 0.2542, 0.2288, 0.2059, 0.1853, 0.1668, 0.1501,
  0.1351, 0.1216, 0.1094,
];

/** Great Barracks and Great Stable — capped at 20. */
const SPEED_TO_20 = SPEED_TO_22.slice(0, 21);

/** Which units a building can train. */
export type TrainingCategory = 'infantry' | 'cavalry' | 'siege';

export interface TrainingBuilding {
  key: string;
  name: string;
  category: TrainingCategory;
  /** Multiplier on unit training cost. The Great variants charge triple. */
  costMultiplier: number;
  /** Training-time multiplier per building level. Index is the level. */
  speed: number[];
}

export const trainingBuildings: Record<string, TrainingBuilding> = {
  barracks: {
    key: 'barracks',
    name: 'Barracks',
    category: 'infantry',
    costMultiplier: 1,
    speed: SPEED_TO_22,
  },
  greatBarracks: {
    key: 'greatBarracks',
    name: 'Great Barracks',
    category: 'infantry',
    costMultiplier: 3,
    speed: SPEED_TO_20,
  },
  stable: {
    key: 'stable',
    name: 'Stable',
    category: 'cavalry',
    costMultiplier: 1,
    speed: SPEED_TO_22,
  },
  greatStable: {
    key: 'greatStable',
    name: 'Great Stable',
    category: 'cavalry',
    costMultiplier: 3,
    speed: SPEED_TO_20,
  },
  workshop: {
    key: 'workshop',
    name: 'Workshop',
    category: 'siege',
    costMultiplier: 1,
    speed: SPEED_TO_22,
  },
};

/**
 * A single production queue.
 *
 * Each queue trains independently and in parallel, so two barracks at the
 * same level produce twice as fast as one. Great variants share the queue
 * model but charge triple for what they turn out.
 */
export interface QueueDef {
  key: string;
  name: string;
  building: TrainingBuilding;
}

const q = (key: string, name: string, building: TrainingBuilding): QueueDef => ({
  key,
  name,
  building,
});

/**
 * Queues that share a unit selection.
 *
 * All the barracks build the same thing, so picking units is a decision you
 * make once for the group rather than three times. Levels stay per queue.
 */
export interface QueueGroup {
  key: string;
  name: string;
  category: TrainingCategory;
  queues: QueueDef[];
}

export const queueGroups: QueueGroup[] = [
  {
    key: 'barracks',
    name: 'Barracks',
    category: 'infantry',
    queues: [
      q('barracks1', 'Barracks #1', trainingBuildings.barracks),
      q('barracks2', 'Barracks #2', trainingBuildings.barracks),
      q('greatBarracks', 'Great Barracks', trainingBuildings.greatBarracks),
    ],
  },
  {
    key: 'stable',
    name: 'Stable',
    category: 'cavalry',
    queues: [
      q('stable1', 'Stable #1', trainingBuildings.stable),
      q('stable2', 'Stable #2', trainingBuildings.stable),
      q('greatStable', 'Great Stable', trainingBuildings.greatStable),
    ],
  },
  {
    key: 'workshop',
    name: 'Workshop',
    category: 'siege',
    queues: [q('workshop', 'Workshop', trainingBuildings.workshop)],
  },
];

export const queues: QueueDef[] = queueGroups.flatMap((g) => g.queues);

export const groupOf = (queueKey: string): QueueGroup =>
  queueGroups.find((g) => g.queues.some((q) => q.key === queueKey))!;

/** The highest level a queue's building can reach. */
export const maxLevel = (queue: QueueDef): number => queue.building.speed.length - 1;

/**
 * Level at which the "max" shortcut stops. Regular buildings go beyond this
 * by typing, which is what the extra published levels are for.
 */
export const NORMAL_MAX_LEVEL = 20;

const NOT_TRAINABLE: UnitRole[] = ['chief', 'settler'];

/**
 * Which building trains this unit, or `null` for leaders and settlers —
 * those come from the Palace and Residence, not a training queue.
 */
export function trainingCategory(unit: Unit): TrainingCategory | null {
  if (NOT_TRAINABLE.includes(unit.role)) return null;
  if (unit.role === 'ram' || unit.role === 'siege') return 'siege';
  // `stabled` is the game's own cavalry flag, so mounted scouts land in the
  // Stable and foot scouts in the Barracks, exactly as in game.
  return unit.stabled ? 'cavalry' : 'infantry';
}
