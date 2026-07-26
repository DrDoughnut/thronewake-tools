import {
  maxLevel,
  queueGroups,
  trainingCategory,
  type QueueDef,
  type QueueGroup,
} from '../data/buildings';
import { factionByKey, type UnitRef } from '../data/factions';
import type { Cost, Faction, Unit } from '../data/types';
import {
  effectiveUpkeep,
  offenseFactor,
  trainingSeconds,
  upgradeStat,
  type Modifiers,
} from './stats';

export interface ArmyQuery {
  faction: string;
  /** How long the queues run, in hours. */
  hours: number;
  /** Server speed: 1×, 3×, 10×. Divides every training time. */
  speed: number;
  /** Fractional training speed bonus; 0.25 means 25% faster. */
  speedBonus: number;
  /** Building level per queue key. */
  levels: Record<string, number>;
  /** Selected unit keys per group key. */
  selection: Record<string, string[]>;
}

export interface QueueOutput {
  queue: QueueDef;
  level: number;
  /** Units produced by this queue, in total across its selection. */
  count: number;
  cost: Cost;
  /** Seconds per unit, per selected unit key. */
  secondsEach: Record<string, number>;
  /** True when the level is above the normal cap but still published. */
  pushed: boolean;
}

export interface ArmyLine {
  ref: UnitRef;
  unit: Unit;
  count: number;
}

export interface ArmyTotals {
  cost: Cost;
  totalCost: number;
  /** Resources per hour of production. */
  costPerHour: number;
  /** Attack contributed by infantry-class units (everything not stabled). */
  attackInf: number;
  /** Attack contributed by cavalry. */
  attackCav: number;
  attack: number;
  defInf: number;
  defCav: number;
  upkeep: number;
  capacity: number;
  units: number;
}

export interface ArmyResult {
  faction: Faction;
  outputs: QueueOutput[];
  /** One entry per trainable unit of the faction, including zeroes. */
  lines: ArmyLine[];
  totals: ArmyTotals;
}

const ZERO_COST: Cost = [0, 0, 0, 0];

const addCost = (a: Cost, b: Cost): Cost => [
  a[0] + b[0],
  a[1] + b[1],
  a[2] + b[2],
  a[3] + b[3],
];

/** Units this faction can train in the given group's building. */
export function trainableUnits(faction: Faction, group: QueueGroup): Unit[] {
  return faction.units.filter((u) => trainingCategory(u) === group.category);
}

/** Every unit the faction can train anywhere, in roster order. */
export function allTrainable(faction: Faction): Unit[] {
  return faction.units.filter((u) => trainingCategory(u) !== null);
}

/**
 * Work out what a set of queues turns out over a stretch of time.
 *
 * Queues run in parallel and independently, so two barracks at the same level
 * produce twice as much as one. Where a group has several units selected, each
 * queue splits its time evenly between them — two units means each gets half
 * the hours, not half the units, so a slow unit yields fewer of itself.
 *
 * Production is whole units: a queue 90% of the way through one when time runs
 * out has not produced it.
 */
export function computeArmy(query: ArmyQuery, mods: Modifiers): ArmyResult {
  const faction = factionByKey(query.faction);
  const speed = query.speed > 0 ? query.speed : 1;
  const totalSeconds = Math.max(0, query.hours) * 3600;

  const counts = new Map<string, number>();
  const outputs: QueueOutput[] = [];

  for (const group of queueGroups) {
    const selected = (query.selection[group.key] ?? [])
      .map((key) => faction.units.find((u) => u.key === key))
      .filter(
        (u): u is Unit => u !== undefined && trainingCategory(u) === group.category,
      );

    for (const queue of group.queues) {
      const level = clampLevel(query.levels[queue.key] ?? 0, queue);
      const buildingSpeed = queue.building.speed[level] ?? 0;

      const secondsEach: Record<string, number> = {};
      let queueCount = 0;
      let cost: Cost = ZERO_COST;

      if (selected.length > 0 && level > 0 && buildingSpeed > 0) {
        // Even split of the queue's time, not of its output.
        const share = totalSeconds / selected.length;
        for (const unit of selected) {
          const each =
            trainingSeconds(faction, unit, buildingSpeed, mods, query.speedBonus) / speed;
          secondsEach[unit.key] = each;
          const made = each > 0 ? Math.floor(share / each) : 0;
          queueCount += made;
          counts.set(unit.key, (counts.get(unit.key) ?? 0) + made);
          const multiplier = queue.building.costMultiplier;
          cost = addCost(cost, unit.cost.map((c) => c * multiplier * made) as Cost);
        }
      }

      outputs.push({
        queue,
        level,
        count: queueCount,
        cost,
        secondsEach,
        pushed: level > 20,
      });
    }
  }

  // Every trainable unit gets a line, zero included, so the strip below the
  // buildings keeps a stable set of slots instead of reflowing as you pick.
  const lines: ArmyLine[] = allTrainable(faction).map((unit) => ({
    ref: `${faction.key}/${unit.key}`,
    unit,
    count: counts.get(unit.key) ?? 0,
  }));

  const offense = offenseFactor(faction, mods);
  const totals: ArmyTotals = {
    cost: outputs.reduce((c, o) => addCost(c, o.cost), ZERO_COST),
    totalCost: 0,
    costPerHour: 0,
    attackInf: 0,
    attackCav: 0,
    attack: 0,
    defInf: 0,
    defCav: 0,
    upkeep: 0,
    capacity: 0,
    units: 0,
  };

  for (const { unit, count } of lines) {
    if (count === 0) continue;
    const attack = upgradeStat(unit, unit.off, mods.smithy) * offense * count;
    // Siege counts as infantry-class attack: only mounted units are weighed
    // against a defender's anti-cavalry value.
    if (unit.stabled) totals.attackCav += attack;
    else totals.attackInf += attack;

    totals.defInf += upgradeStat(unit, unit.defInf, mods.smithy) * count;
    totals.defCav += upgradeStat(unit, unit.defCav, mods.smithy) * count;
    totals.upkeep += effectiveUpkeep(faction, unit, mods) * count;
    totals.capacity += unit.capacity * count;
    totals.units += count;
  }

  totals.attack = totals.attackInf + totals.attackCav;
  totals.totalCost = totals.cost.reduce((a, b) => a + b, 0);
  totals.costPerHour = query.hours > 0 ? totals.totalCost / query.hours : 0;

  return { faction, outputs, lines, totals };
}

function clampLevel(level: number, queue: QueueDef): number {
  if (!Number.isFinite(level)) return 0;
  return Math.min(maxLevel(queue), Math.max(0, Math.floor(level)));
}
