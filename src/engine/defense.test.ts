import { describe, it, expect } from 'vitest';
import { simulateDefense, type DefenseQuery, type Hammer } from './defense';
import type { Village } from './combat';

const village: Village = {
  pop: 0,
  wallLevel: 0,
  wallDefBonus: 0,
  wallDefFlat: 0,
  wallDurability: 1,
  durability: 1,
  extraDef: 0,
};

/** Cumulative resources to reach each level: escalating, like a real building. */
const targetCost = Array.from({ length: 21 }, (_, level) =>
  Array.from({ length: level }, (_, i) => 100 * (i + 1) ** 2).reduce((a, b) => a + b, 0),
);

const hammer = (over: Partial<Hammer> = {}): Hammer => ({
  offense: 120_000,
  cavalryShare: 0,
  catapults: 80,
  catapultUpgrade: 0,
  ...over,
});

const base: DefenseQuery = {
  villages: 8,
  hammers: [hammer(), hammer(), hammer()],
  unit: { key: 'def', defInf: 100, defCav: 100, cost: 500 },
  troops: 4000,
  village,
  targetLevel: 20,
  targetCost,
  villagePremium: 0,
  trials: 600,
  seed: 4242,
};

const q = (over: Partial<DefenseQuery>): DefenseQuery => ({ ...base, ...over });

describe('Defense Simulator Engine', () => {
  describe('sampling', () => {
    it('returns the same table for the same seed', () => {
      expect(simulateDefense(q({})).outcomes).toEqual(simulateDefense(q({})).outcomes);
    });

    it('covers every hammer once every village is garrisoned', () => {
      const result = simulateDefense(q({}));
      expect(result.outcomes[base.villages - 1].coverage).toBe(1);
      expect(result.outcomes[0].coverage).toBeLessThan(0.5);
    });

    it('lets hammers stack, so a stack sized for one meets two', () => {
      // Three hammers across two villages must double up somewhere.
      const result = simulateDefense(q({ villages: 2, hammers: [hammer(), hammer(), hammer()] }));
      expect(result.outcomes[1].coverage).toBe(1);
      expect(result.outcomes[1].holdRate).toBeLessThan(1);
    });
  });

  describe('hammers of different sizes', () => {
    it('is harder to answer than the same total split evenly', () => {
      // One oversized hammer cannot be held by a stack sized for the average,
      // so the same total offense costs more when it arrives lopsided.
      const even = simulateDefense(q({
        hammers: [hammer({ offense: 120_000 }), hammer({ offense: 120_000 })],
      }));
      const lopsided = simulateDefense(q({
        hammers: [hammer({ offense: 20_000 }), hammer({ offense: 220_000 })],
      }));

      expect(lopsided.best.totalCost).toBeGreaterThan(even.best.totalCost);
    });

    it('answers a cavalry hammer with the anti-cavalry value', () => {
      const unit = { key: 'def', defInf: 40, defCav: 200, cost: 500 };
      const versusFoot = simulateDefense(q({ unit, hammers: [hammer({ cavalryShare: 0 })] }));
      const versusHorse = simulateDefense(q({ unit, hammers: [hammer({ cavalryShare: 1 })] }));

      // The same garrison is five times the wall against mounted attackers.
      expect(versusHorse.best.totalCost).toBeLessThan(versusFoot.best.totalCost);
    });
  });

  describe('pricing in resources', () => {
    it('charges dead defenders at what they cost to train', () => {
      const cheap = simulateDefense(q({ unit: { key: 'd', defInf: 100, defCav: 100, cost: 100 } }));
      const dear = simulateDefense(q({ unit: { key: 'd', defInf: 100, defCav: 100, cost: 1000 } }));

      expect(dear.outcomes[0].troopsLost).toBeCloseTo(cheap.outcomes[0].troopsLost, 6);
      expect(dear.outcomes[0].troopCost).toBeCloseTo(cheap.outcomes[0].troopCost * 10, 6);
    });

    it('prices damage on the levels actually lost, not an average of them', () => {
      // Levels escalate in cost, so a village stripped of five levels costs far
      // more than five villages stripped of one.
      const result = simulateDefense(q({ hammers: [hammer()] }));
      const outcome = result.outcomes[0];
      if (outcome.buildingLevelsLost > 0) {
        const flat = outcome.buildingLevelsLost * 100;
        expect(outcome.buildingCost).toBeGreaterThan(flat);
      }
      expect(outcome.buildingCost).toBeGreaterThanOrEqual(0);
    });

    it('charges nothing for buildings when no catapults come along', () => {
      const result = simulateDefense(q({
        hammers: [hammer({ catapults: 0 }), hammer({ catapults: 0 })],
      }));
      for (const outcome of result.outcomes) {
        expect(outcome.buildingCost).toBe(0);
        expect(outcome.buildingLevelsLost).toBe(0);
      }
    });

    it('adds the premium only to villages levelled outright', () => {
      const without = simulateDefense(q({ villagePremium: 0 }));
      const with100k = simulateDefense(q({ villagePremium: 100_000 }));

      const a = without.outcomes[0];
      const b = with100k.outcomes[0];
      expect(b.totalCost - a.totalCost).toBeCloseTo(a.villagesFlattened * 100_000, 6);

      // Catapults still land after a battle they lost, so far more villages
      // take damage than are levelled — which is why the premium rides on the
      // latter. A village scratched for a level has not lost its artifact.
      expect(a.villagesDamaged).toBeGreaterThan(a.villagesFlattened);
    });
  });

  describe('choosing a split', () => {
    it('preserves the most troops by concentrating them', () => {
      expect(simulateDefense(q({})).cheapest.split).toBe(1);
    });

    it('defends more villages as a village gets more valuable', () => {
      const cheap = simulateDefense(q({ villagePremium: 0 }));
      const dear = simulateDefense(q({ villagePremium: 5_000_000 }));
      expect(dear.best.split).toBeGreaterThanOrEqual(cheap.best.split);
    });

    it('spreads wider when there is enough defence to go round', () => {
      const thin = simulateDefense(q({ troops: 2000, villagePremium: 1_000_000 }));
      const flush = simulateDefense(q({ troops: 40_000, villagePremium: 1_000_000 }));
      expect(flush.best.split).toBeGreaterThan(thin.best.split);
    });
  });

  describe('breakeven', () => {
    it('prices the two best splits identically at the crossing point', () => {
      const result = simulateDefense(q({ villagePremium: 50_000 }));
      const breakeven = result.breakeven;
      if (!breakeven) return;

      const cost = (split: number, premium: number) => {
        const o = result.outcomes.find((x) => x.split === split)!;
        return o.troopCost + o.buildingCost + o.villagesFlattened * premium;
      };

      expect(cost(breakeven.favouredAbove, breakeven.premium)).toBeCloseTo(
        cost(breakeven.favouredBelow, breakeven.premium), 4,
      );
      expect(cost(breakeven.favouredAbove, breakeven.premium * 2 + 1)).toBeLessThan(
        cost(breakeven.favouredBelow, breakeven.premium * 2 + 1),
      );
    });
  });

  describe('input handling', () => {
    it('clamps nonsense into a runnable query', () => {
      const result = simulateDefense(q({ villages: 0, troops: -100, trials: 0 }));
      expect(result.outcomes).toHaveLength(1);
      expect(result.best.split).toBe(1);
    });

    it('reports no losses when every incoming is a fake', () => {
      const result = simulateDefense(q({ hammers: [] }));
      for (const outcome of result.outcomes) {
        expect(outcome.troopsLost).toBe(0);
        expect(outcome.totalCost).toBe(0);
        expect(outcome.coverage).toBe(0);
      }
    });
  });
});
