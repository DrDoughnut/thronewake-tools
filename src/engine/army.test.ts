import { describe, expect, it } from 'vitest';
import { computeArmy, trainableUnits, type ArmyQuery } from './army';
import type { Modifiers } from './stats';
import {
  maxLevel,
  queueGroups,
  queues,
  trainingBuildings,
  trainingCategory,
} from '../data/buildings';
import { factionByKey, factions, playableFactions } from '../data/factions';

const mods = (smithy = 0, buildings: Partial<Modifiers['buildings']> = {}): Modifiers => ({
  smithy,
  buildings: { ridersWells: 0, stormbrewWorks: 0, ...buildings },
});

const group = (key: string) => queueGroups.find((g) => g.key === key)!;
const queue = (key: string) => queues.find((q) => q.key === key)!;
const outFor = (r: ReturnType<typeof computeArmy>, key: string) =>
  r.outputs.find((o) => o.queue.key === key)!;
const countOf = (r: ReturnType<typeof computeArmy>, unitKey: string) =>
  r.lines.find((l) => l.unit.key === unitKey)!.count;

const query = (over: Partial<ArmyQuery> = {}): ArmyQuery => ({
  faction: 'embermark_dominion',
  hours: 24,
  speed: 1,
  speedBonus: 0,
  levels: {},
  selection: {},
  ...over,
});

/** One queue at a level, building one unit. */
const one = (
  queueKey: string,
  level: number,
  groupKey: string,
  units: string[],
  over: Partial<ArmyQuery> = {},
) => query({ ...over, levels: { [queueKey]: level }, selection: { [groupKey]: units } });

describe('training categories', () => {
  it('routes every trainable unit to exactly one building', () => {
    for (const faction of factions) {
      for (const unit of faction.units) {
        const category = trainingCategory(unit);
        if (unit.role === 'chief' || unit.role === 'settler') {
          expect(category, `${faction.key}/${unit.key}`).toBeNull();
        } else {
          expect(category, `${faction.key}/${unit.key}`).not.toBeNull();
        }
      }
    }
  });

  it('sends mounted scouts to the Stable and foot scouts to the Barracks', () => {
    expect(trainingCategory(factionByKey('embermark_dominion').units[3])).toBe('cavalry');
    expect(trainingCategory(factionByKey('stormfang_clans').units[3])).toBe('infantry');
  });

  it('offers every playable faction units in all three groups', () => {
    for (const faction of playableFactions) {
      for (const g of queueGroups) {
        expect(trainableUnits(faction, g).length, `${faction.key}/${g.key}`).toBeGreaterThan(0);
      }
    }
  });

  it('never offers leaders or settlers', () => {
    for (const faction of playableFactions) {
      for (const g of queueGroups) {
        for (const unit of trainableUnits(faction, g)) {
          expect(unit.role).not.toBe('chief');
          expect(unit.role).not.toBe('settler');
        }
      }
    }
  });
});

describe('building levels', () => {
  it('lets Barracks, Stable and Workshop reach 22 but caps the Great variants at 20', () => {
    expect(maxLevel(queue('barracks1'))).toBe(22);
    expect(maxLevel(queue('stable1'))).toBe(22);
    expect(maxLevel(queue('workshop'))).toBe(22);
    expect(maxLevel(queue('greatBarracks'))).toBe(20);
    expect(maxLevel(queue('greatStable'))).toBe(20);
  });

  it('produces nothing at level 0', () => {
    const r = computeArmy(one('barracks1', 0, 'barracks', ['emberblade']), mods());
    expect(r.totals.units).toBe(0);
    expect(r.totals.totalCost).toBe(0);
  });

  it('trains faster at 22 than at 20', () => {
    const at20 = computeArmy(one('barracks1', 20, 'barracks', ['emberblade']), mods());
    const at22 = computeArmy(one('barracks1', 22, 'barracks', ['emberblade']), mods());
    expect(at22.totals.units).toBeGreaterThan(at20.totals.units);
    expect(outFor(at22, 'barracks1').pushed).toBe(true);
    expect(outFor(at20, 'barracks1').pushed).toBe(false);
  });
});

describe('server speed', () => {
  const at = (speed: number) =>
    computeArmy(one('barracks1', 20, 'barracks', ['emberblade'], { speed }), mods());

  it('divides training time by the server speed', () => {
    const base = outFor(at(1), 'barracks1').secondsEach.emberblade;
    expect(outFor(at(3), 'barracks1').secondsEach.emberblade).toBeCloseTo(base / 3, 10);
    expect(outFor(at(10), 'barracks1').secondsEach.emberblade).toBeCloseTo(base / 10, 10);
  });

  it('produces proportionally more units', () => {
    // Not an exact multiple of the 1× count: the queue floors once at the
    // end, so a faster server also converts what was previously a part-built
    // unit into a finished one.
    const base = outFor(at(1), 'barracks1').secondsEach.emberblade;
    for (const speed of [3, 10]) {
      expect(at(speed).totals.units).toBe(Math.floor(86400 / (base / speed)));
      expect(at(speed).totals.units).toBeGreaterThanOrEqual(at(1).totals.units * speed);
    }
  });
});

describe('shared unit selection', () => {
  it('splits a queue\'s time evenly between selected units', () => {
    const solo = computeArmy(one('barracks1', 20, 'barracks', ['emberblade']), mods());
    const pair = computeArmy(
      one('barracks1', 20, 'barracks', ['emberblade', 'shieldbearer']),
      mods(),
    );
    // Half the time each, so about half as many Emberblades as when solo.
    expect(countOf(pair, 'emberblade')).toBe(Math.floor(countOf(solo, 'emberblade') / 2));
    expect(countOf(pair, 'shieldbearer')).toBeGreaterThan(0);
  });

  it('splits time, not output — the slower unit yields fewer', () => {
    // Emberblade trains in 1600s, Iron Spear in 1920s, so equal time gives
    // fewer Iron Spears.
    const r = computeArmy(
      one('barracks1', 20, 'barracks', ['emberblade', 'iron_spear']),
      mods(),
    );
    expect(countOf(r, 'emberblade')).toBeGreaterThan(countOf(r, 'iron_spear'));
  });

  it('applies the selection to every queue in the group', () => {
    const r = computeArmy(
      query({
        levels: { barracks1: 20, barracks2: 20 },
        selection: { barracks: ['emberblade'] },
      }),
      mods(),
    );
    const single = computeArmy(one('barracks1', 20, 'barracks', ['emberblade']), mods());
    expect(r.totals.units).toBe(single.totals.units * 2);
  });

  it('ignores a unit the group cannot train', () => {
    const r = computeArmy(one('barracks1', 20, 'barracks', ['crimson_lancer']), mods());
    expect(r.totals.units).toBe(0);
  });
});

describe('queues', () => {
  it('runs in parallel — two barracks produce twice one', () => {
    const oneQ = computeArmy(one('barracks1', 20, 'barracks', ['emberblade']), mods());
    const twoQ = computeArmy(
      query({
        levels: { barracks1: 20, barracks2: 20 },
        selection: { barracks: ['emberblade'] },
      }),
      mods(),
    );
    expect(twoQ.totals.units).toBe(oneQ.totals.units * 2);
    expect(twoQ.totals.totalCost).toBe(oneQ.totals.totalCost * 2);
  });

  it('charges triple for the Great Barracks but trains at the same rate', () => {
    const normal = computeArmy(one('barracks1', 20, 'barracks', ['emberblade']), mods());
    const great = computeArmy(one('greatBarracks', 20, 'barracks', ['emberblade']), mods());
    expect(great.totals.units).toBe(normal.totals.units);
    expect(great.totals.totalCost).toBe(normal.totals.totalCost * 3);
    expect(trainingBuildings.greatBarracks.costMultiplier).toBe(3);
  });

  it('produces whole units only', () => {
    const r = computeArmy(
      one('barracks1', 1, 'barracks', ['emberblade'], { hours: 1 }),
      mods(),
    );
    expect(Number.isInteger(r.totals.units)).toBe(true);
    expect(r.totals.units).toBe(2);
  });
});

describe('the army strip', () => {
  it('lists every trainable unit, zeroes included, in roster order', () => {
    const r = computeArmy(one('barracks1', 20, 'barracks', ['emberblade']), mods());
    // Ten units per faction, minus the leader and the settler.
    expect(r.lines).toHaveLength(8);
    expect(r.lines.map((l) => l.unit.key)).toEqual([
      'emberblade', 'shieldbearer', 'iron_spear', 'sentinel',
      'sun_rider', 'crimson_lancer', 'iron_ram', 'dominion_catapult',
    ]);
    expect(r.lines.filter((l) => l.count === 0)).toHaveLength(7);
  });
});

describe('modifiers', () => {
  it('applies the training speed bonus', () => {
    const plain = computeArmy(one('barracks1', 20, 'barracks', ['emberblade']), mods());
    const fast = computeArmy(
      one('barracks1', 20, 'barracks', ['emberblade'], { speedBonus: 1 }),
      mods(),
    );
    expect(outFor(fast, 'barracks1').secondsEach.emberblade).toBeCloseTo(
      outFor(plain, 'barracks1').secondsEach.emberblade / 2,
      10,
    );
  });

  it("applies Rider's Wells training time to Embermark cavalry only", () => {
    const wells = mods(0, { ridersWells: 20 });
    const q = one('stable1', 20, 'stable', ['sun_rider']);
    expect(outFor(computeArmy(q, wells), 'stable1').secondsEach.sun_rider).toBeCloseTo(
      outFor(computeArmy(q, mods()), 'stable1').secondsEach.sun_rider * 0.8,
      10,
    );

    const sq = one('stable1', 20, 'stable', ['blood_charger'], {
      faction: 'stormfang_clans',
    });
    expect(outFor(computeArmy(sq, wells), 'stable1').secondsEach.blood_charger).toBe(
      outFor(computeArmy(sq, mods()), 'stable1').secondsEach.blood_charger,
    );
  });

  it("cuts upkeep with Rider's Wells for the Embermark cavalry that qualify", () => {
    const q = one('stable1', 20, 'stable', ['sun_rider']);
    const plain = computeArmy(q, mods());
    // Sun Rider upkeep 3 → 2 once the Wells reach 15.
    const relieved = computeArmy(q, mods(0, { ridersWells: 15 }));
    expect(plain.totals.upkeep).toBe(3 * plain.totals.units);
    expect(relieved.totals.upkeep).toBe(2 * relieved.totals.units);
  });

  it('leaves Stormfang cavalry upkeep alone', () => {
    const q = one('stable1', 20, 'stable', ['blood_charger'], {
      faction: 'stormfang_clans',
    });
    const a = computeArmy(q, mods());
    const b = computeArmy(q, mods(0, { ridersWells: 20 }));
    expect(b.totals.upkeep / b.totals.units).toBe(a.totals.upkeep / a.totals.units);
  });
});

describe('totals', () => {
  it('splits attack into infantry and cavalry, summing to the total', () => {
    const r = computeArmy(
      query({
        levels: { barracks1: 20, stable1: 20 },
        selection: { barracks: ['emberblade'], stable: ['crimson_lancer'] },
      }),
      mods(),
    );
    expect(r.totals.attackInf).toBeGreaterThan(0);
    expect(r.totals.attackCav).toBeGreaterThan(0);
    expect(r.totals.attack).toBeCloseTo(r.totals.attackInf + r.totals.attackCav, 8);
  });

  it('counts siege as infantry-class attack', () => {
    const r = computeArmy(one('workshop', 20, 'workshop', ['iron_ram']), mods());
    expect(r.totals.attackCav).toBe(0);
    expect(r.totals.attackInf).toBeGreaterThan(0);
  });

  it('reports resources per hour', () => {
    const r = computeArmy(
      one('barracks1', 20, 'barracks', ['emberblade'], { hours: 10 }),
      mods(),
    );
    expect(r.totals.costPerHour).toBeCloseTo(r.totals.totalCost / 10, 8);
  });

  it('sums cost per resource and overall', () => {
    const r = computeArmy(one('barracks1', 20, 'barracks', ['emberblade']), mods());
    const unit = factionByKey('embermark_dominion').units[0];
    expect(r.totals.cost).toEqual(unit.cost.map((c) => c * r.totals.units));
    expect(r.totals.totalCost).toBe(r.totals.cost.reduce((a, b) => a + b, 0));
  });

  it('sums carrying capacity', () => {
    const r = computeArmy(one('barracks1', 20, 'barracks', ['emberblade']), mods());
    const unit = factionByKey('embermark_dominion').units[0];
    expect(r.totals.capacity).toBe(unit.capacity * r.totals.units);
  });

  it('groups exist for barracks, stable and workshop', () => {
    expect(queueGroups.map((g) => g.key)).toEqual(['barracks', 'stable', 'workshop']);
    expect(group('barracks').queues).toHaveLength(3);
    expect(group('workshop').queues).toHaveLength(1);
  });
});
