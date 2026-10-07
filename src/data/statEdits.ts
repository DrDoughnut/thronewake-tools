import { factions, lookup, unitRef, type UnitRef } from './factions';
import type { Cost, Faction, Unit } from './types';

/**
 * Hypothetical unit stats, for trying out balance proposals.
 *
 * An edit set records only the numbers that differ from the live game, so
 * the live data stays the single source of truth and a link carries just
 * the changes. The ranking reads units through `makeResolver(edits)`
 * instead of `lookup`, and nothing else in the app sees the edits.
 */

/** The raw stats that can be edited, in table column order. */
export const EDIT_FIELDS = [
  { code: 'o', label: 'Attack', short: 'Att' },
  { code: 'di', label: 'Defense vs infantry', short: 'Def inf' },
  { code: 'dc', label: 'Defense vs cavalry', short: 'Def cav' },
  { code: 'sp', label: 'Speed (squares per hour)', short: 'Speed' },
  { code: 'ca', label: 'Carry capacity', short: 'Carry' },
  { code: 'up', label: 'Upkeep (grain per hour)', short: 'Upkeep' },
  { code: 't', label: 'Training time in seconds, at building level 1', short: 'Time (s)' },
  { code: 'w', label: 'Wood cost', short: 'Wood' },
  { code: 'c', label: 'Clay cost', short: 'Clay' },
  { code: 'i', label: 'Iron cost', short: 'Iron' },
  { code: 'g', label: 'Grain cost', short: 'Grain' },
] as const;

export type EditField = (typeof EDIT_FIELDS)[number]['code'];

export type UnitEdit = Partial<Record<EditField, number>>;
/** Changed stats per unit. Units and fields that are absent are live. */
export type StatEdits = Record<UnitRef, UnitEdit>;

const FIELD_CODES = new Set<string>(EDIT_FIELDS.map((f) => f.code));

/** A unit's live value for one editable field. */
export function fieldValue(unit: Unit, field: EditField): number {
  switch (field) {
    case 'o': return unit.off;
    case 'di': return unit.defInf;
    case 'dc': return unit.defCav;
    case 'sp': return unit.speed;
    case 'ca': return unit.capacity;
    case 'up': return unit.upkeep;
    case 't': return unit.time;
    case 'w': return unit.cost[0];
    case 'c': return unit.cost[1];
    case 'i': return unit.cost[2];
    case 'g': return unit.cost[3];
  }
}

/** The unit with an edit applied. Returns the same object when nothing changes. */
export function applyEdit(unit: Unit, edit: UnitEdit | undefined): Unit {
  if (!edit || Object.keys(edit).length === 0) return unit;
  const v = (field: EditField) => edit[field] ?? fieldValue(unit, field);
  const cost: Cost = [v('w'), v('c'), v('i'), v('g')];
  return {
    ...unit,
    off: v('o'),
    defInf: v('di'),
    defCav: v('dc'),
    speed: v('sp'),
    capacity: v('ca'),
    upkeep: v('up'),
    time: v('t'),
    cost,
  };
}

export type Resolver = (ref: UnitRef) => { faction: Faction; unit: Unit };

/** A drop-in for `lookup` that sees the edited stats. */
export function makeResolver(edits: StatEdits): Resolver {
  if (Object.keys(edits).length === 0) return lookup;
  const cache = new Map<UnitRef, { faction: Faction; unit: Unit }>();
  return (ref) => {
    let found = cache.get(ref);
    if (!found) {
      const live = lookup(ref);
      found = { faction: live.faction, unit: applyEdit(live.unit, edits[ref]) };
      cache.set(ref, found);
    }
    return found;
  };
}

/**
 * Set one field, dropping it (and the unit, once empty) when it is back at
 * the live value, so an edit set never carries no-op entries.
 */
export function setField(edits: StatEdits, ref: UnitRef, field: EditField, value: number): StatEdits {
  const live = fieldValue(lookup(ref).unit, field);
  const unitEdit: UnitEdit = { ...edits[ref] };
  if (value === live || !Number.isFinite(value) || value < 0) delete unitEdit[field];
  else unitEdit[field] = value;

  const next = { ...edits };
  if (Object.keys(unitEdit).length) next[ref] = unitEdit;
  else delete next[ref];
  return next;
}

export function editCount(edits: StatEdits): number {
  return Object.values(edits).reduce((n, e) => n + Object.keys(e).length, 0);
}

export function sameEdits(a: StatEdits, b: StatEdits): boolean {
  const refs = new Set([...Object.keys(a), ...Object.keys(b)]);
  for (const ref of refs) {
    const ea = a[ref] ?? {};
    const eb = b[ref] ?? {};
    const fields = new Set([...Object.keys(ea), ...Object.keys(eb)]) as Set<EditField>;
    for (const f of fields) if (ea[f] !== eb[f]) return false;
  }
  return true;
}

/* ── Link format ───────────────────────────────────────────────────────
 *
 * `emberblade.o45di40-iron_spear.sp6.5` — units joined by `-`, each a unit
 * key, a dot, then field codes run together with their values. Unit keys
 * are unique across factions and contain neither `-` nor `.`, and field
 * codes are letters only, so this reads back without ambiguity and stays
 * short in a URL.
 */

const refByUnitKey = new Map<string, UnitRef>();
for (const faction of factions) {
  for (const unit of faction.units) refByUnitKey.set(unit.key, unitRef(faction.key, unit.key));
}
const allRefs = new Set(refByUnitKey.values());

export function encodeEdits(edits: StatEdits): string {
  return Object.entries(edits)
    .filter(([, e]) => Object.keys(e).length)
    .map(([ref, e]) => {
      const fields = EDIT_FIELDS
        .filter((f) => e[f.code] !== undefined)
        .map((f) => `${f.code}${e[f.code]}`)
        .join('');
      return `${lookup(ref).unit.key}.${fields}`;
    })
    .join('-');
}

/** Reads a link's edits, skipping anything unknown so an old link never breaks. */
export function decodeEdits(text: string | null | undefined): StatEdits {
  let edits: StatEdits = {};
  if (!text) return edits;
  for (const part of text.split('-')) {
    const [unitKey, fields] = part.split(/\.(.*)/s);
    const ref = refByUnitKey.get(unitKey);
    if (!ref || !fields) continue;
    for (const [, code, num] of fields.matchAll(/([a-z]+)(\d+(?:\.\d+)?)/g)) {
      if (FIELD_CODES.has(code)) edits = setField(edits, ref, code as EditField, Number(num));
    }
  }
  return edits;
}

/** Cleans edits read back from storage, where they are not to be trusted. */
export function sanitizeEdits(saved: unknown): StatEdits {
  let edits: StatEdits = {};
  if (!saved || typeof saved !== 'object') return edits;
  for (const [ref, edit] of Object.entries(saved as Record<string, unknown>)) {
    if (!allRefs.has(ref) || !edit || typeof edit !== 'object') continue;
    for (const [code, value] of Object.entries(edit as Record<string, unknown>)) {
      if (FIELD_CODES.has(code) && typeof value === 'number') {
        edits = setField(edits, ref, code as EditField, value);
      }
    }
  }
  return edits;
}

/* ── Presets ─────────────────────────────────────────────────────────── */

export interface StatPreset {
  key: string;
  label: string;
  hint: string;
  edits: StatEdits;
}

export const STAT_PRESETS: StatPreset[] = [
  {
    key: 'live',
    label: 'Live game',
    hint: 'The stats currently in the game.',
    edits: {},
  },
];

/** The preset these edits match exactly, if any. */
export function matchingPreset(edits: StatEdits): StatPreset | undefined {
  return STAT_PRESETS.find((p) => sameEdits(p.edits, edits));
}
