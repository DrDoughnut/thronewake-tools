import { useCallback, useEffect, useState } from 'react';
import type { Divisor, NumeratorStat } from './engine/value';
import type { Modifiers } from './engine/stats';
import { factionBuildingList, rules, type FactionBuildingKey } from './data/rules';
import { groupByKey } from './data/unitSets';

export interface AppState extends Modifiers {
  /** Key of the roster group being ranked. */
  group: string;
  mode: 'preset' | 'formula';
  stats: NumeratorStat[];
  bySpeed: boolean;
  divisors: Divisor[];
  expression: string;
}

const noBuildings = () =>
  Object.fromEntries(factionBuildingList.map((b) => [b.key, 0])) as Record<
    FactionBuildingKey,
    number
  >;

const allBuildings = () =>
  Object.fromEntries(factionBuildingList.map((b) => [b.key, b.maxLevel])) as Record<
    FactionBuildingKey,
    number
  >;

export const initialState: AppState = {
  group: 'all',
  mode: 'preset',
  stats: ['a'],
  bySpeed: false,
  divisors: ['tc'],
  expression: 'a/tc',
  smithy: 0,
  buildings: noBuildings(),
};

/**
 * The six shortcuts along the top. Each answers a question a player
 * actually asks, rather than being a random combination of toggles.
 */
export interface Preset {
  key: string;
  label: string;
  hint: string;
  patch: Partial<AppState>;
}

// "Late" presets assume everything is built, including each faction's own
// building — which only ever helps that faction's own units.
const maxed = () => ({ smithy: 20, buildings: allBuildings() });
const bare = () => ({ smithy: 0, buildings: noBuildings() });

export const presets: Preset[] = [
  {
    key: 'early-def',
    label: 'Early defense',
    hint: 'Most defense per resource spent, before any upgrades.',
    patch: { group: 'all', mode: 'preset', stats: ['di', 'dc'], bySpeed: false, divisors: ['tc'], ...bare() },
  },
  {
    key: 'early-off',
    label: 'Early offense',
    hint: 'Most offense per resource spent, before any upgrades.',
    patch: { group: 'all', mode: 'preset', stats: ['a'], bySpeed: false, divisors: ['tc'], ...bare() },
  },
  {
    key: 'early-farm',
    label: 'Early raiding',
    hint: 'Loot hauled per hour, per resource spent — speed × carry ÷ cost.',
    patch: { group: 'all', mode: 'preset', stats: ['c'], bySpeed: true, divisors: ['tc'], ...bare() },
  },
  {
    key: 'late-def',
    label: 'Late defense',
    hint: 'Most defense per point of upkeep, everything maxed. This is what matters once grain, not resources, is the ceiling.',
    patch: { group: 'defense', mode: 'preset', stats: ['di', 'dc'], bySpeed: false, divisors: ['cu'], ...maxed() },
  },
  {
    key: 'late-off',
    label: 'Late offense',
    hint: 'Most offense per point of upkeep, everything maxed.',
    patch: { group: 'offense', mode: 'preset', stats: ['a'], bySpeed: false, divisors: ['cu'], ...maxed() },
  },
  {
    key: 'late-farm',
    label: 'Late raiding',
    hint: 'Raw loot throughput — speed × carry. Once resources and grain are no longer the constraint, all that matters is how much a unit hauls per hour.',
    patch: { group: 'all', mode: 'preset', stats: ['c'], bySpeed: true, divisors: [], ...maxed() },
  },
];

/* ── URL persistence ──────────────────────────────────────────────────── */

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));

function encode(state: AppState): string {
  const p = new URLSearchParams();
  p.set('g', state.group);
  if (state.mode === 'formula') {
    p.set('f', state.expression);
  } else {
    if (state.stats.length) p.set('n', state.stats.join('.'));
    if (state.divisors.length) p.set('d', state.divisors.join('.'));
    if (state.bySpeed) p.set('v', '1');
  }
  if (state.smithy) p.set('sm', String(state.smithy));
  // Only non-zero building levels are written, so a default link stays short
  // and adding a building never invalidates existing links.
  for (const b of factionBuildingList) {
    const level = state.buildings[b.key as FactionBuildingKey];
    if (level) p.set(b.key, String(level));
  }
  return p.toString();
}

function decode(hash: string): AppState {
  const p = new URLSearchParams(hash.replace(/^#/, ''));
  if ([...p.keys()].length === 0) return initialState;

  const group = p.get('g');
  const formula = p.get('f');
  const stats = (p.get('n')?.split('.') ?? []) as NumeratorStat[];
  const divisors = (p.get('d')?.split('.') ?? []) as Divisor[];
  const num = (key: string, max: number) => clamp(Number(p.get(key) ?? 0) || 0, 0, max);

  return {
    // groupByKey falls back to the first group, so a stale link never breaks.
    group: groupByKey(group ?? '').key,
    mode: formula !== null ? 'formula' : 'preset',
    stats: stats.filter((s) => ['a', 'di', 'dc', 'c', 's', 'ds'].includes(s)),
    divisors: divisors.filter((d) => ['cu', 't', 'tc'].includes(d)),
    bySpeed: p.get('v') === '1',
    expression: formula ?? initialState.expression,
    smithy: num('sm', rules.smithy.maxLevel),
    buildings: Object.fromEntries(
      factionBuildingList.map((b) => [b.key, num(b.key, b.maxLevel)]),
    ) as Record<FactionBuildingKey, number>,
  };
}

/**
 * App state, mirrored into the URL fragment so any configuration is a
 * shareable link. Nothing is sent anywhere — the fragment never leaves
 * the browser.
 */
export function useAppState() {
  const [state, setState] = useState<AppState>(() => decode(window.location.hash));

  useEffect(() => {
    const encoded = encode(state);
    const next = `${window.location.pathname}${window.location.search}#${encoded}`;
    // replaceState keeps the back button useful for leaving the page
    // instead of stepping through every slider nudge.
    window.history.replaceState(null, '', next);
  }, [state]);

  useEffect(() => {
    const onPop = () => setState(decode(window.location.hash));
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  const patch = useCallback((changes: Partial<AppState>) => {
    setState((prev) => ({ ...prev, ...changes }));
  }, []);

  return { state, patch, setState };
}

/** Toggle a value in a list, preserving a stable display order. */
export function toggle<T>(list: T[], value: T, order: readonly T[]): T[] {
  const next = list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
  return order.filter((v) => next.includes(v));
}
