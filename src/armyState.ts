import { useCallback, useEffect, useState } from 'react';
import { maxLevel, queueGroups, queues, trainingCategory } from './data/buildings';
import { factionBuildingList, rules, type FactionBuildingKey } from './data/rules';
import { factionByKey, playableFactions } from './data/factions';
import type { Modifiers } from './engine/stats';

/** Server speeds Thronewake runs at. */
export const SERVER_SPEEDS = [1, 3, 10] as const;
export const DEFAULT_SPEED = 3;

/** Units the production-run length can be entered in. */
export const DURATION_UNITS = ['hours', 'days', 'weeks', 'months'] as const;
export type DurationUnit = (typeof DURATION_UNITS)[number];

/** Hours per unit. A month is approximated as 30 days. */
export const HOURS_PER_UNIT: Record<DurationUnit, number> = {
  hours: 1,
  days: 24,
  weeks: 24 * 7,
  months: 24 * 30,
};

export const toHours = (value: number, unit: DurationUnit) => value * HOURS_PER_UNIT[unit];

export interface ArmyState extends Modifiers {
  faction: string;
  /** Length of the production run, as typed. Converted to hours via `toHours`. */
  durationValue: number;
  durationUnit: DurationUnit;
  /** Server speed multiplier. */
  speed: number;
  /** Percentage, as typed: 25 means +25% training speed. */
  speedBonusPercent: number;
  /** Building level per queue key. */
  levels: Record<string, number>;
  /** Selected unit keys per group key. */
  selection: Record<string, string[]>;
}

const zeroLevels = () => Object.fromEntries(queues.map((q) => [q.key, 0]));
const noSelection = () =>
  Object.fromEntries(queueGroups.map((g) => [g.key, [] as string[]]));

const noBuildings = () =>
  Object.fromEntries(factionBuildingList.map((b) => [b.key, 0])) as Record<
    FactionBuildingKey,
    number
  >;

export const initialArmyState: ArmyState = {
  faction: playableFactions[0].key,
  durationValue: 1,
  durationUnit: 'days',
  speed: DEFAULT_SPEED,
  speedBonusPercent: 0,
  smithy: 0,
  buildings: noBuildings(),
  levels: zeroLevels(),
  selection: noSelection(),
};

/**
 * Unit keys are faction-specific, so switching faction re-points the
 * selection at the equivalent roster slots rather than clearing it.
 */
export function retargetSelection(
  selection: Record<string, string[]>,
  fromFaction: string,
  toFaction: string,
): Record<string, string[]> {
  const from = factionByKey(fromFaction);
  const to = factionByKey(toFaction);

  return Object.fromEntries(
    queueGroups.map((g) => {
      const keys = selection[g.key] ?? [];
      const mapped = keys
        .map((key) => {
          const slot = from.units.findIndex((u) => u.key === key);
          const candidate = slot >= 0 ? to.units[slot] : undefined;
          return candidate && trainingCategory(candidate) === g.category
            ? candidate.key
            : undefined;
        })
        .filter((k): k is string => k !== undefined);
      return [g.key, [...new Set(mapped)]];
    }),
  );
}

/* ── URL persistence ──────────────────────────────────────────────────── */

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));

function encode(state: ArmyState): string {
  const p = new URLSearchParams();
  p.set('tool', 'army');
  p.set('f', state.faction);
  p.set('hv', String(state.durationValue));
  p.set('hu', state.durationUnit);
  p.set('x', String(state.speed));
  if (state.speedBonusPercent) p.set('sb', String(state.speedBonusPercent));
  if (state.smithy) p.set('sm', String(state.smithy));
  for (const b of factionBuildingList) {
    const level = state.buildings[b.key as FactionBuildingKey];
    if (level) p.set(b.key, String(level));
  }
  for (const q of queues) {
    const level = state.levels[q.key];
    if (level) p.set(q.key, String(level));
  }
  for (const g of queueGroups) {
    const picked = state.selection[g.key];
    if (picked?.length) p.set(`u_${g.key}`, picked.join('.'));
  }
  return p.toString();
}

function decode(hash: string): ArmyState {
  const p = new URLSearchParams(hash.replace(/^#/, ''));
  const factionKey = p.get('f');
  const faction = playableFactions.some((f) => f.key === factionKey)
    ? factionKey!
    : initialArmyState.faction;

  const num = (key: string, max: number, fallback = 0) => {
    const raw = p.get(key);
    if (raw === null) return fallback;
    return clamp(Number(raw) || 0, 0, max);
  };

  const roster = factionByKey(faction);
  const speedRaw = Number(p.get('x'));
  const speed = (SERVER_SPEEDS as readonly number[]).includes(speedRaw)
    ? speedRaw
    : DEFAULT_SPEED;

  const unitRaw = p.get('hu');
  const durationUnit = (DURATION_UNITS as readonly string[]).includes(unitRaw ?? '')
    ? (unitRaw as DurationUnit)
    : initialArmyState.durationUnit;

  return {
    faction,
    durationValue:
      clamp(Number(p.get('hv') ?? initialArmyState.durationValue) || 0, 0, 100000) ||
      initialArmyState.durationValue,
    durationUnit,
    speed,
    speedBonusPercent: num('sb', 1000),
    smithy: num('sm', rules.smithy.researchMaxLevel),
    buildings: Object.fromEntries(
      factionBuildingList.map((b) => [b.key, num(b.key, b.maxLevel)]),
    ) as Record<FactionBuildingKey, number>,
    levels: Object.fromEntries(queues.map((q) => [q.key, num(q.key, maxLevel(q))])),
    selection: Object.fromEntries(
      queueGroups.map((g) => {
        const raw = p.get(`u_${g.key}`);
        if (!raw) return [g.key, []];
        const keys = raw
          .split('.')
          .filter((key) =>
            roster.units.some(
              (u) => u.key === key && trainingCategory(u) === g.category,
            ),
          );
        return [g.key, [...new Set(keys)]];
      }),
    ),
  };
}

/** Army-calculator state, mirrored into the URL fragment so it is shareable. */
export function useArmyState() {
  const [state, setState] = useState<ArmyState>(() => decode(window.location.hash));

  useEffect(() => {
    const next = `${window.location.pathname}${window.location.search}#${encode(state)}`;
    window.history.replaceState(null, '', next);
  }, [state]);

  const patch = useCallback((changes: Partial<ArmyState>) => {
    setState((prev) => ({ ...prev, ...changes }));
  }, []);

  const setLevel = useCallback((key: string, level: number) => {
    setState((prev) => ({ ...prev, levels: { ...prev.levels, [key]: level } }));
  }, []);

  /** Toggle a unit in a group's selection, keeping roster order. */
  const toggleUnit = useCallback((groupKey: string, unitKey: string) => {
    setState((prev) => {
      const group = queueGroups.find((g) => g.key === groupKey)!;
      const roster = factionByKey(prev.faction)
        .units.filter((u) => trainingCategory(u) === group.category)
        .map((u) => u.key);
      const current = new Set(prev.selection[groupKey] ?? []);
      if (current.has(unitKey)) current.delete(unitKey);
      else current.add(unitKey);
      return {
        ...prev,
        selection: {
          ...prev.selection,
          [groupKey]: roster.filter((k) => current.has(k)),
        },
      };
    });
  }, []);

  const setFaction = useCallback((faction: string) => {
    setState((prev) => ({
      ...prev,
      faction,
      selection: retargetSelection(prev.selection, prev.faction, faction),
    }));
  }, []);

  return { state, patch, setLevel, toggleUnit, setFaction };
}
