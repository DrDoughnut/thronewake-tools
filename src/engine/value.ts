import { lookup, type UnitRef } from '../data/factions';
import {
  computeStats,
  effectiveTime,
  effectiveUpkeep,
  offenseFactor,
  totalCost,
  upgradeStat,
  type Modifiers,
  type UnitStats,
} from './stats';
import { rules } from '../data/rules';
import { FormulaError, parseFormula } from './formula';

/** Numerator stats available in preset mode. */
export type NumeratorStat = 'a' | 'di' | 'dc' | 'c' | 's' | 'ds';
/** Denominators available in preset mode — each divides the numerator. */
export type Divisor = 'cu' | 't' | 'tc';

export interface PresetQuery {
  mode: 'preset';
  /** Stats summed into the numerator. An empty set means "just 1". */
  stats: NumeratorStat[];
  /** Multiply the numerator by the set's slowest speed (per unit). */
  bySpeed: boolean;
  divisors: Divisor[];
}

export interface FormulaQuery {
  mode: 'formula';
  expression: string;
}

export type Query = PresetQuery | FormulaQuery;

export const STAT_VARIABLES = ['v', 'a', 'di', 'dc', 's', 'ds', 'c', 'cu', 't', 'tc'] as const;

export interface Row {
  set: UnitRef[];
  value: number;
}

export interface Ranking {
  rows: Row[];
  /** Number of decimals that make the column readable. */
  precision: number;
  /** Set when the formula could not be parsed; rows are empty. */
  error?: string;
}

/**
 * Preset mode: the rating from the toggle buttons.
 *
 *     (speed · Σ chosen stats) / Π chosen divisors
 *
 * For a multi-unit row the numerator is summed and the denominator is
 * weighted, so the row rates a *mix* rather than an average unit.
 */
function presetValue(set: UnitRef[], q: PresetQuery, mods: Modifiers): number {
  const byTime = q.divisors.includes('t');
  const byUpkeep = q.divisors.includes('cu');
  const byCost = q.divisors.includes('tc');

  let numerator = 0;
  let denominator = 0;

  set.forEach((ref, i) => {
    const { faction, unit } = lookup(ref);

    let value = 0;
    if (q.stats.includes('a')) {
      value += upgradeStat(unit, unit.off, mods.smithy) * offenseFactor(faction, mods);
    }
    if (q.stats.includes('di')) value += upgradeStat(unit, unit.defInf, mods.smithy);
    if (q.stats.includes('dc')) value += upgradeStat(unit, unit.defCav, mods.smithy);
    if (q.stats.includes('c')) value += unit.capacity;
    if (q.stats.includes('s')) value += upgradeStat(unit, rules.recon.scouting, mods.smithy);
    if (q.stats.includes('ds')) value += upgradeStat(unit, rules.recon.counterScouting, mods.smithy);

    // With no stat selected the row still needs a numerator to divide.
    if (value === 0) value = 1;

    if (byTime) value /= effectiveTime(faction, unit, mods) / 3600;
    numerator += value;

    // In a mixed row, everything after the leading unit is assumed to be
    // trained alongside it rather than instead of it: its cost and upkeep
    // enter the denominator scaled by its build time, so a slow support
    // unit weighs proportionally less than the unit it accompanies.
    const mixWeight = i >= 1 && byTime ? unit.time : 1;

    denominator +=
      (byUpkeep ? effectiveUpkeep(faction, unit, mods) : 1) *
      (byCost ? totalCost(unit) : 1) /
      mixWeight;
  });

  if (q.bySpeed) {
    const slowest = set.reduce((min, ref) => Math.min(min, lookup(ref).unit.speed), Infinity);
    numerator *= slowest / set.length;
  }

  return numerator / denominator;
}

/** Formula mode: evaluate the expression per unit and sum across the row. */
function formulaValue(
  set: UnitRef[],
  evaluate: (stats: UnitStats) => number,
  mods: Modifiers,
): number {
  return set.reduce((sum, ref) => {
    const { faction, unit } = lookup(ref);
    return sum + evaluate(computeStats(faction, unit, mods));
  }, 0);
}

/**
 * Choose how many decimals to print so the column carries information:
 * enough to separate the values, but never trailing zeroes on every row.
 */
function choosePrecision(values: number[]): number {
  const finite = values.filter(Number.isFinite);
  if (finite.length === 0) return 0;
  const max = Math.max(...finite);
  if (max <= 0) return 2;

  let precision = Math.max(2 - Math.floor(Math.log10(max)), 0);
  while (
    precision > 0 &&
    finite.every((v) => /\.0+$/.test(v.toFixed(precision)))
  ) {
    precision--;
  }
  return precision;
}

export function rank(sets: UnitRef[][], query: Query, mods: Modifiers): Ranking {
  let values: number[];

  if (query.mode === 'formula') {
    try {
      const formula = parseFormula(query.expression, STAT_VARIABLES);
      values = sets.map((set) =>
        formulaValue(set, (stats) => formula.evaluate(stats as unknown as Record<string, number>), mods),
      );
    } catch (err) {
      return {
        rows: [],
        precision: 0,
        error: err instanceof FormulaError ? err.message : 'Could not read that formula.',
      };
    }
  } else {
    values = sets.map((set) => presetValue(set, query, mods));
  }

  const rows = sets
    .map((set, i) => ({ set, value: values[i] }))
    .sort((a, b) => b.value - a.value);

  return { rows, precision: choosePrecision(values) };
}
