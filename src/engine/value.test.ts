import { describe, expect, it } from 'vitest';
import { rank, type PresetQuery, type Divisor, type NumeratorStat } from './value';
import {
  effectiveTime,
  effectiveUpkeep,
  offenseFactor,
  upgradeStat,
  type Modifiers,
} from './stats';
import { factions, lookup } from '../data/factions';
import { unitSetGroups, groupByKey } from '../data/unitSets';
import { trainingSpeedup } from '../data/rules';
import reference from './__fixtures__/reference.json';

/**
 * `reference.json` is produced by a separate implementation of the rating
 * algorithm (see the generator in the project notes), run over the same
 * Thronewake roster the app ships. It pins the ranking, weighting and
 * divisor logic; the smithy curve is checked independently below against
 * the published worked example.
 */

interface Case {
  stats: NumeratorStat[];
  bySpeed: boolean;
  divisors: Divisor[];
  mods: Modifiers;
}

const mods = (
  smithy: number,
  buildings: Partial<Modifiers['buildings']> = {},
): Modifiers => ({
  smithy,
  buildings: { ridersWells: 0, stormbrewWorks: 0, ...buildings },
});

const cases: Record<string, Case> = {
  'early-off': { stats: ['a'], bySpeed: false, divisors: ['tc'], mods: mods(0) },
  'early-def': { stats: ['di', 'dc'], bySpeed: false, divisors: ['tc'], mods: mods(0) },
  'early-farm': { stats: ['c'], bySpeed: false, divisors: ['tc'], mods: mods(0) },
  'late-off': { stats: ['a'], bySpeed: false, divisors: ['cu'], mods: mods(20) },
  'late-def': { stats: ['di', 'dc'], bySpeed: false, divisors: ['cu'], mods: mods(20) },
  'late-farm': { stats: ['c'], bySpeed: true, divisors: ['cu'], mods: mods(20) },
  'off-per-time': { stats: ['a'], bySpeed: false, divisors: ['t'], mods: mods(10) },
  'mixed-pairs': { stats: ['a'], bySpeed: false, divisors: ['cu', 't'], mods: mods(20) },
  'all-divisors': { stats: ['a', 'di', 'dc', 'c'], bySpeed: true, divisors: ['cu', 't', 'tc'], mods: mods(7) },
  'recon': { stats: ['s', 'ds'], bySpeed: false, divisors: ['cu'], mods: mods(15) },
  'ancients-no-cost': { stats: ['a', 'di', 'dc'], bySpeed: false, divisors: ['cu'], mods: mods(12) },
};

const fixture = reference as Record<string, { set: string[]; value: number }[]>;

describe('preset ratings match the reference implementation', () => {
  for (const [name, spec] of Object.entries(cases)) {
    it(name, () => {
      const expected = fixture[name];
      expect(expected, `fixture is missing "${name}"`).toBeDefined();

      const query: PresetQuery = {
        mode: 'preset',
        stats: spec.stats,
        bySpeed: spec.bySpeed,
        divisors: spec.divisors,
      };
      const { rows } = rank(expected.map((e) => e.set), query, spec.mods);

      // rank() sorts, so compare by unit set rather than by position.
      const actual = new Map(rows.map((r) => [r.set.join('+'), r.value]));
      for (const { set, value } of expected) {
        const got = actual.get(set.join('+'));
        expect(got, `no row for ${set.join('+')}`).toBeDefined();
        expect(got!).toBeCloseTo(value, 10);
      }
    });
  }
});

describe('smithy upgrades', () => {
  // Published worked example: base 40, upkeep 1, smithy 20 → 52.4048.
  //   40 + (40 + 300·1/7)·(1.007^20 − 1) = 40 + 82.8571·0.149713
  it('reproduces the documented worked example', () => {
    const unit = { upkeep: 1 } as Parameters<typeof upgradeStat>[0];
    expect(upgradeStat(unit, 40, 20)).toBeCloseTo(52.4048, 4);
  });

  it('is a no-op at level 0', () => {
    const unit = { upkeep: 6 } as Parameters<typeof upgradeStat>[0];
    expect(upgradeStat(unit, 40, 0)).toBe(40);
  });

  it('gives low-upkeep units proportionally more', () => {
    const cheap = { upkeep: 1 } as Parameters<typeof upgradeStat>[0];
    const heavy = { upkeep: 6 } as Parameters<typeof upgradeStat>[0];
    const gain = (u: typeof cheap) => upgradeStat(u, 100, 20) / 100;
    expect(gain(cheap)).toBeLessThan(gain(heavy));
  });

  it('leaves unresearchable units alone', () => {
    const fixed = { upkeep: 1, noUpgrade: true } as Parameters<typeof upgradeStat>[0];
    expect(upgradeStat(fixed, 40, 20)).toBe(40);
  });
});

describe('faction buildings stay faction-scoped', () => {
  const emberCav = 'embermark_dominion/sun_rider';
  const stormCav = 'stormfang_clans/blood_charger';

  it("Rider's Wells cuts Embermark cavalry training time and nobody else's", () => {
    const ember = lookup(emberCav);
    const storm = lookup(stormCav);

    const off = mods(0);
    const on = mods(0, { ridersWells: 20 });

    // 20 levels × 1% = ×0.80 for Embermark. Compare against the unrounded
    // formula — rounding the already-rounded baseline is off by one.
    expect(effectiveTime(ember.faction, ember.unit, on)).toBe(
      Math.round(ember.unit.time * trainingSpeedup * 0.8),
    );
    expect(effectiveTime(ember.faction, ember.unit, off)).toBe(
      Math.round(ember.unit.time * trainingSpeedup),
    );
    // Stormfang cavalry is untouched by an Embermark building.
    expect(effectiveTime(storm.faction, storm.unit, on)).toBe(
      effectiveTime(storm.faction, storm.unit, off),
    );
  });

  it("Rider's Wells relieves upkeep only at each unit's own threshold", () => {
    const { faction, unit } = lookup(emberCav); // Sun Rider, relief at 15
    expect(unit.upkeepReliefAt).toBe(15);
    expect(effectiveUpkeep(faction, unit, mods(0, { ridersWells: 14 }))).toBe(unit.upkeep);
    expect(effectiveUpkeep(faction, unit, mods(0, { ridersWells: 15 }))).toBe(unit.upkeep - 1);
  });

  it('Stormbrew Works raises Stormfang offense only', () => {
    const maxBrew = mods(0, { stormbrewWorks: 20 });

    const storm = lookup(stormCav);
    const ember = lookup(emberCav);
    expect(offenseFactor(storm.faction, maxBrew)).toBeCloseTo(1.2, 10);
    expect(offenseFactor(ember.faction, maxBrew)).toBe(1);

    // And it reaches the rating, not just the helper.
    const query: PresetQuery = { mode: 'preset', stats: ['a'], bySpeed: false, divisors: ['cu'] };
    const before = rank([[stormCav]], query, mods(0)).rows[0].value;
    const after = rank([[stormCav]], query, maxBrew).rows[0].value;
    expect(after).toBeCloseTo(before * 1.2, 10);

    const emberBefore = rank([[emberCav]], query, mods(0)).rows[0].value;
    const emberAfter = rank([[emberCav]], query, maxBrew).rows[0].value;
    expect(emberAfter).toBeCloseTo(emberBefore, 10);
  });

  it('gives upkeep relief to exactly the three Embermark cavalry units', () => {
    const relieved = factions.flatMap((f) =>
      f.units.filter((u) => u.upkeepReliefAt !== undefined).map((u) => `${f.key}/${u.key}`),
    );
    expect(relieved.sort()).toEqual([
      'embermark_dominion/crimson_lancer',
      'embermark_dominion/sentinel',
      'embermark_dominion/sun_rider',
    ]);
  });
});

describe('data integrity', () => {
  it('gives every faction ten units with unique keys', () => {
    const keys = new Set<string>();
    for (const faction of factions) {
      expect(faction.units, faction.key).toHaveLength(10);
      for (const unit of faction.units) {
        // Unit keys double as icon filenames, so they must be globally unique.
        expect(keys.has(unit.key), `duplicate unit key: ${unit.key}`).toBe(false);
        keys.add(unit.key);
      }
    }
    expect(keys.size).toBe(40);
  });

  it('resolves every unit reference used by the roster groups', () => {
    for (const group of unitSetGroups) {
      expect(group.sets.length, group.key).toBeGreaterThan(0);
      for (const set of group.sets) {
        for (const ref of set) expect(() => lookup(ref), ref).not.toThrow();
      }
    }
  });

  it('keeps leaders and settlers out of every roster', () => {
    // They exist in the data because they are part of the game's roster,
    // but you build those to a number rather than for value per resource.
    for (const group of unitSetGroups) {
      for (const set of group.sets) {
        for (const ref of set) {
          const { unit } = lookup(ref);
          expect(unit.role, `${ref} in "${group.key}"`).not.toBe('chief');
          expect(unit.role, `${ref} in "${group.key}"`).not.toBe('settler');
        }
      }
    }
  });

  it('includes one ram and one catapult per playable faction in "All troops"', () => {
    const all = groupByKey('all');
    const roles = all.sets.flat().map((ref) => lookup(ref).unit.role);
    expect(roles.filter((r) => r === 'ram')).toHaveLength(3);
    expect(roles.filter((r) => r === 'siege')).toHaveLength(3);
    expect(all.sets).toHaveLength(21);
  });

  it('separates seven offense cores from twelve offense-and-siege compositions', () => {
    const offense = groupByKey('offense');
    const offenseSiege = groupByKey('offense-siege');
    expect(offense.sets).toHaveLength(7);
    expect(offense.sets.every((set) => set.length === 2)).toBe(true);
    expect(offenseSiege.sets).toHaveLength(12);
    expect(offenseSiege.sets.every((set) => set.length === 3)).toBe(true);
  });

  it('gives each faction exactly one scout, leader and settler', () => {
    for (const faction of factions) {
      const count = (role: string) => faction.units.filter((u) => u.role === role).length;
      expect(count('scout'), faction.key).toBe(1);
      expect(count('chief'), faction.key).toBe(1);
      expect(count('settler'), faction.key).toBe(1);
    }
  });
});

describe('ranking', () => {
  const base = mods(0);
  const query: PresetQuery = { mode: 'preset', stats: ['a'], bySpeed: false, divisors: ['tc'] };

  it('sorts highest value first', () => {
    const { rows } = rank(
      [
        ['embermark_dominion/emberblade'],
        ['embermark_dominion/iron_spear'],
        ['embermark_dominion/shieldbearer'],
      ],
      query,
      base,
    );
    const values = rows.map((r) => r.value);
    expect(values).toEqual([...values].sort((a, b) => b - a));
  });

  it('yields a non-finite value for free units rated per cost', () => {
    // The Ancients cost nothing to field, so "per resource" is undefined for
    // them rather than merely very large. The table renders these as an
    // em dash; what matters here is that it does not crash or sort wrongly.
    const { rows, precision } = rank([['ancients/monolith_warden']], query, base);
    expect(Number.isFinite(rows[0].value)).toBe(false);
    expect(Number.isFinite(precision)).toBe(true);
  });

  it('reports a formula error instead of throwing', () => {
    const result = rank(
      [['embermark_dominion/iron_spear']],
      { mode: 'formula', expression: 'a / (' },
      base,
    );
    expect(result.error).toBeTruthy();
    expect(result.rows).toHaveLength(0);
  });

  it('evaluates a custom formula per unit and sums across a mixed row', () => {
    const expr = { mode: 'formula', expression: 'a' } as const;
    const a = rank([['embermark_dominion/iron_spear']], expr, base).rows[0].value;
    const b = rank([['embermark_dominion/emberblade']], expr, base).rows[0].value;
    const pair = rank(
      [['embermark_dominion/iron_spear', 'embermark_dominion/emberblade']],
      expr,
      base,
    ).rows[0].value;
    expect(pair).toBeCloseTo(a + b, 10);
  });
});
