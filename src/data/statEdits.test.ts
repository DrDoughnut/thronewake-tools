import { describe, expect, it } from 'vitest';
import { lookup } from './factions';
import {
  applyEdit,
  decodeEdits,
  editCount,
  encodeEdits,
  makeResolver,
  matchingPreset,
  sanitizeEdits,
  setField,
  STAT_PRESETS,
} from './statEdits';
import { rank } from '../engine/value';
import { defaultModifiers } from '../engine/stats';

const BLADE = 'embermark_dominion/emberblade';
const SPEAR = 'embermark_dominion/iron_spear';

describe('stat edits', () => {
  it('applies only the edited fields', () => {
    const live = lookup(BLADE).unit;
    const edited = applyEdit(live, { o: 55, g: 10 });
    expect(edited.off).toBe(55);
    expect(edited.cost).toEqual([live.cost[0], live.cost[1], live.cost[2], 10]);
    expect(edited.defInf).toBe(live.defInf);
    // The live table is never touched.
    expect(lookup(BLADE).unit.off).toBe(live.off);
  });

  it('drops a field set back to its live value, and the unit once it has none', () => {
    let edits = setField({}, BLADE, 'o', 55);
    expect(edits).toEqual({ [BLADE]: { o: 55 } });
    edits = setField(edits, BLADE, 'o', lookup(BLADE).unit.off);
    expect(edits).toEqual({});
  });

  it('round-trips through the link format, decimals included', () => {
    const edits = setField(setField(setField({}, BLADE, 'o', 55), BLADE, 'di', 40), SPEAR, 'sp', 6.5);
    const text = encodeEdits(edits);
    expect(text).toBe('emberblade.o55di40-iron_spear.sp6.5');
    expect(decodeEdits(text)).toEqual(edits);
    expect(editCount(edits)).toBe(3);
  });

  it('skips unknown units and fields in a link instead of failing', () => {
    expect(decodeEdits('nope.o5-emberblade.zz9o55')).toEqual({ [BLADE]: { o: 55 } });
    expect(decodeEdits('')).toEqual({});
    expect(decodeEdits('emberblade')).toEqual({});
  });

  it('cleans stored edits', () => {
    expect(sanitizeEdits({ [BLADE]: { o: 55, bogus: 1, di: 'x' }, 'x/y': { o: 1 } })).toEqual({
      [BLADE]: { o: 55 },
    });
    expect(sanitizeEdits(null)).toEqual({});
  });

  it('recognises the live preset', () => {
    expect(matchingPreset({})?.key).toBe('live');
    expect(matchingPreset({ [BLADE]: { o: 55 } })).toBeUndefined();
  });

  it('keeps presets free of no-op or unknown entries', () => {
    for (const p of STAT_PRESETS) {
      expect(sanitizeEdits(p.edits)).toEqual(p.edits);
      expect(decodeEdits(encodeEdits(p.edits))).toEqual(p.edits);
    }
  });

  it('applies the SxS cost totals', () => {
    const sxs = STAT_PRESETS.find((p) => p.key === 'sxs')!;
    expect(matchingPreset(sxs.edits)?.key).toBe('sxs');
    const resolve = makeResolver(sxs.edits);
    const total = (ref: string) => resolve(ref).unit.cost.reduce((a, b) => a + b, 0);
    expect(total('stormfang_clans/raider')).toBe(275);
    expect(total('stormfang_clans/blood_charger')).toBe(1500);
    expect(total('stormfang_clans/fang_rider')).toBe(1000);
    expect(total('verdant_wardens/oak_cavalier')).toBe(1850);
    expect(total('embermark_dominion/emberblade')).toBe(350);
    expect(total('embermark_dominion/sun_rider')).toBe(1350);
    expect(total('embermark_dominion/crimson_lancer')).toBe(2000);
    // The proposal never touched training times or speeds.
    for (const edit of Object.values(sxs.edits)) {
      expect(edit.t).toBeUndefined();
      expect(edit.sp).toBeUndefined();
    }
  });

  it('changes the ranking', () => {
    const query = { mode: 'preset', stats: ['a'], bySpeed: false, divisors: ['tc'] } as const;
    const sets = [[BLADE], [SPEAR]];
    const live = rank(sets, { ...query, stats: [...query.stats], divisors: [...query.divisors] }, defaultModifiers);
    expect(live.rows[0].set).toEqual([SPEAR]);

    const boosted = makeResolver({ [BLADE]: { o: 500 } });
    const edited = rank(sets, { ...query, stats: [...query.stats], divisors: [...query.divisors] }, defaultModifiers, boosted);
    expect(edited.rows[0].set).toEqual([BLADE]);
  });
});
