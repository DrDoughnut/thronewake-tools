import { describe, it, expect } from 'vitest';
import { simulateDefense, type DefenseQuery } from './defense';

const base: DefenseQuery = {
  villages: 10,
  realHammers: 3,
  hammerOffense: 10_000,
  defensePool: 60_000,
  defenseBonus: 1,
  casualtyExponent: 1.5,
  villageValue: 20_000,
  trials: 4000,
  seed: 12345,
};

const q = (over: Partial<DefenseQuery>): DefenseQuery => ({ ...base, ...over });

/** One village and one hammer removes the randomness, isolating the combat maths. */
const duel = (over: Partial<DefenseQuery>) =>
  simulateDefense(q({ villages: 1, realHammers: 1, trials: 1, ...over })).outcomes[0];

describe('Defense Simulator Engine', () => {
  describe('combat resolution', () => {
    it('costs the winner a share of the stack set by the power ratio', () => {
      const out = duel({ hammerOffense: 1000, defensePool: 2000 });

      // Winning at 2:1 costs (1/2)^1.5 of the stack.
      expect(out.villagesLost).toBe(0);
      expect(out.villagesSaved).toBe(1);
      expect(out.holdRate).toBe(1);
      expect(out.defenseLost).toBeCloseTo(2000 * Math.pow(0.5, 1.5), 6);
    });

    it('all but wipes a stack that wins narrowly', () => {
      const out = duel({ hammerOffense: 1000, defensePool: 1100 });

      // The premise behind the whole tool: a 10% margin is not a safe margin.
      expect(out.villagesLost).toBe(0);
      expect(out.defenseLost / 1100).toBeGreaterThan(0.85);
    });

    it('loses the stack and the village when the defence is short', () => {
      const out = duel({ hammerOffense: 1000, defensePool: 900 });

      expect(out.villagesLost).toBe(1);
      expect(out.defenseLost).toBe(900);
      expect(out.holdRate).toBe(0);
    });

    it('applies the wall bonus to the defence power', () => {
      const bare = duel({ hammerOffense: 1000, defensePool: 900, defenseBonus: 1 });
      const walled = duel({ hammerOffense: 1000, defensePool: 900, defenseBonus: 1.25 });

      expect(bare.villagesLost).toBe(1);
      expect(walled.villagesLost).toBe(0);
    });

    it('spends no defence on a village it never garrisoned', () => {
      const result = simulateDefense(q({ defensePool: 0 }));

      for (const out of result.outcomes) {
        expect(out.defenseLost).toBe(0);
        expect(out.villagesLost).toBeGreaterThan(0);
      }
    });
  });

  describe('sampling', () => {
    it('returns the same table for the same seed', () => {
      const a = simulateDefense(q({}));
      const b = simulateDefense(q({}));
      expect(b.outcomes).toEqual(a.outcomes);
      expect(b.best.split).toBe(a.best.split);
    });

    it('lets hammers stack, so some villages take more than one', () => {
      // Three hammers across two villages must double up somewhere, and a
      // stack that only covers a single hammer breaks when they do.
      const result = simulateDefense(
        q({ villages: 2, realHammers: 3, hammerOffense: 10_000, defensePool: 24_000 }),
      );
      const bothDefended = result.outcomes[1];

      expect(bothDefended.split).toBe(2);
      expect(bothDefended.coverage).toBe(1);
      expect(bothDefended.villagesLost).toBeGreaterThan(0);
    });

    it('covers every hammer once every village is garrisoned', () => {
      const result = simulateDefense(q({}));
      expect(result.outcomes[base.villages - 1].coverage).toBe(1);
      expect(result.outcomes[0].coverage).toBeLessThan(0.5);
    });
  });

  describe('choosing a split', () => {
    it('lands between hoarding one stack and spreading over everything', () => {
      const result = simulateDefense(q({}));

      // Concentrating wastes the pool on villages nobody hit; spreading puts
      // every stack under a 1.0 ratio where it dies without saving anything.
      expect(result.best.split).toBeGreaterThan(1);
      expect(result.best.split).toBeLessThan(base.villages);
      expect(result.best.ratio).toBeGreaterThanOrEqual(1);
    });

    it('never recommends a split that cannot hold a single hammer', () => {
      const result = simulateDefense(q({ villageValue: 500_000 }));
      const stack = result.best.stack * base.defenseBonus;
      expect(stack).toBeGreaterThanOrEqual(base.hammerOffense);
    });

    it('defends more villages as a village gets more valuable', () => {
      const cheap = simulateDefense(q({ villageValue: 2_000 }));
      const dear = simulateDefense(q({ villageValue: 400_000 }));

      expect(dear.best.split).toBeGreaterThan(cheap.best.split);
    });

    it('preserves the most defence by concentrating it', () => {
      // Ignoring what a village is worth, the cheapest answer is always to
      // put everything in one place — which is why village value drives it.
      const result = simulateDefense(q({}));
      expect(result.cheapest.split).toBe(1);
    });
  });

  describe('breakeven', () => {
    it('prices the two best splits identically at the crossing point', () => {
      const result = simulateDefense(q({}));
      const breakeven = result.breakeven;
      expect(breakeven).toBeDefined();

      const cost = (split: number, value: number) => {
        const out = result.outcomes.find((o) => o.split === split)!;
        return out.defenseLost + out.villagesLost * value;
      };

      const { villageValue, favouredAbove, favouredBelow } = breakeven!;
      expect(cost(favouredAbove, villageValue)).toBeCloseTo(
        cost(favouredBelow, villageValue),
        6,
      );

      // Either side of the crossing, the named split is genuinely the cheaper.
      expect(cost(favouredAbove, villageValue * 2)).toBeLessThan(
        cost(favouredBelow, villageValue * 2),
      );
      expect(cost(favouredBelow, villageValue * 0.5)).toBeLessThan(
        cost(favouredAbove, villageValue * 0.5),
      );
    });

    it('defends more villages on the dear side of the crossing', () => {
      const result = simulateDefense(q({}));
      expect(result.breakeven!.favouredAbove).toBeGreaterThan(
        result.breakeven!.favouredBelow,
      );
    });
  });

  describe('input handling', () => {
    it('clamps nonsense into a runnable query', () => {
      const result = simulateDefense(
        q({ villages: 0, realHammers: -5, defensePool: -100, trials: 0 }),
      );

      expect(result.outcomes).toHaveLength(1);
      expect(result.outcomes[0].villagesLost).toBe(0);
      expect(result.best.split).toBe(1);
    });

    it('reports no losses when every incoming is a fake', () => {
      const result = simulateDefense(q({ realHammers: 0 }));

      for (const out of result.outcomes) {
        expect(out.villagesLost).toBe(0);
        expect(out.defenseLost).toBe(0);
        expect(out.coverage).toBe(0);
      }
    });
  });
});
