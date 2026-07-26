import type { Divisor, NumeratorStat } from '../engine/value';

/**
 * Presentation for each stat: the label on its toggle, the chip drawn in
 * the formula readout, and what the variable is called in custom formulas.
 *
 * `icon` names a file in `src/assets/icons/stats/`, taken from the game's
 * own artwork. Stats with no in-game icon fall back to `glyph`.
 */
export interface StatMeta {
  /** Variable name in custom formulas. */
  variable: string;
  label: string;
  short: string;
  /** Icon file basename, when the game ships one for this stat. */
  icon?: string;
  /** Text fallback, used when there is no icon. */
  glyph?: string;
  hint: string;
}

export const NUMERATOR_META: Record<NumeratorStat, StatMeta> = {
  a: {
    variable: 'a', label: 'Attack', short: 'Attack', icon: 'attack',
    hint: 'Attack points, after the smithy and Stormbrew Works.',
  },
  di: {
    variable: 'di', label: 'Defense vs infantry', short: 'Inf def', icon: 'defense',
    hint: 'Defensive strength against infantry units.',
  },
  dc: {
    variable: 'dc', label: 'Defense vs cavalry', short: 'Cav def', icon: 'defense_cavalry',
    hint: 'Defensive strength against cavalry units.',
  },
  c: {
    variable: 'c', label: 'Carrying capacity', short: 'Carry', icon: 'capacity',
    hint: 'Resources the unit can carry.',
  },
  s: {
    variable: 's', label: 'Scouting', short: 'Scout', glyph: '◎',
    hint: 'Reconnaissance strength. Not published by the game — see the note in the roster hint.',
  },
  ds: {
    variable: 'ds', label: 'Counter-scouting', short: 'C-scout', glyph: '⦸',
    hint: 'Strength against enemy scouts. Not published by the game — see the note in the roster hint.',
  },
};

export const DIVISOR_META: Record<Divisor, StatMeta> = {
  cu: {
    variable: 'cu', label: 'Upkeep', short: 'Upkeep', icon: 'upkeep',
    hint: 'Grain per hour. Rate per upkeep to find what your farms can afford.',
  },
  t: {
    variable: 't', label: 'Training time', short: 'Time', icon: 'hourglass',
    hint: 'Hours to train, assuming a fully levelled training building.',
  },
  tc: {
    variable: 'tc', label: 'Total cost', short: 'Cost', icon: 'scale',
    hint: 'Sum of all four resources. Rate per cost to find what your economy can afford.',
  },
};

export const SPEED_META: StatMeta = {
  variable: 'v',
  label: 'Speed',
  short: 'Speed',
  icon: 'speed',
  hint: 'Squares per hour. Multiplies the rating — for a mixed row the slowest unit sets the pace.',
};

/**
 * The four resources, in cost-array order. Icon names are the game's own:
 * it maps wood→lumber, clay→stone, iron→metal, crop→food.
 */
export const RESOURCE_META: StatMeta[] = [
  { variable: 'wood', label: 'Wood', short: 'Wood', icon: 'res_wood', hint: 'Wood cost.' },
  { variable: 'clay', label: 'Clay', short: 'Clay', icon: 'res_clay', hint: 'Clay cost.' },
  { variable: 'iron', label: 'Iron', short: 'Iron', icon: 'res_iron', hint: 'Iron cost.' },
  { variable: 'crop', label: 'Grain', short: 'Grain', icon: 'res_crop', hint: 'Grain cost.' },
];

/** Every variable a custom formula may reference, with its description. */
export const FORMULA_VARIABLES: StatMeta[] = [
  SPEED_META,
  NUMERATOR_META.a,
  NUMERATOR_META.di,
  NUMERATOR_META.dc,
  NUMERATOR_META.s,
  NUMERATOR_META.ds,
  NUMERATOR_META.c,
  DIVISOR_META.cu,
  DIVISOR_META.t,
  DIVISOR_META.tc,
];
