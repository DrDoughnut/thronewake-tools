import { rules } from '../data/rules';

/**
 * How many villages is it worth defending?
 *
 * The tension the simulator exists to resolve: defence spread across many
 * villages covers more of the incoming, but a stack that loses is a *total*
 * loss — the defence dies and the village falls anyway. Concentrating makes
 * each stack survivable but leaves most villages naked, and you cannot tell
 * a real hammer from a fake when you commit.
 *
 * So the answer is not `pool / hammer`. That is the break-even split, where
 * every stack fights at a 1:1 power ratio and is annihilated winning.
 */

export interface DefenseQuery {
  /** Villages showing incoming attacks — real and fake together. */
  villages: number;
  /** How many of those incoming are real hammers. The rest are fakes. */
  realHammers: number;
  /** Offense power of one real hammer, weighted for your defence mix. */
  hammerOffense: number;
  /** Total defence points you can commit across all villages. */
  defensePool: number;
  /** Wall, hero and terrain bonus as a multiplier: 1.2 means +20%. */
  defenseBonus: number;
  /** See `rules.battle` — UNVERIFIED. */
  casualtyExponent: number;
  /** What losing one village costs, expressed in defence points. */
  villageValue: number;
  trials: number;
  seed: number;
}

export interface SplitOutcome {
  /** Villages defended. Each gets an equal share of the pool. */
  split: number;
  /** Defence points standing in each defended village. */
  stack: number;
  /** Stack power against a single hammer. Below 1.0 it cannot hold even one. */
  ratio: number;
  villagesLost: number;
  villagesSaved: number;
  defenseLost: number;
  /** `defenseLost + villagesLost · villageValue`. Lower is better. */
  totalCost: number;
  /** Of the defended villages that were hit, the share that held. */
  holdRate: number;
  /** Share of real hammers that landed somewhere you had defence. */
  coverage: number;
}

export interface Breakeven {
  /** Village value, in defence points, at which the two splits swap. */
  villageValue: number;
  /** The split that wins when a village is worth more than that. */
  favouredAbove: number;
  /** The split that wins when a village is worth less. */
  favouredBelow: number;
}

export interface DefenseResult {
  outcomes: SplitOutcome[];
  best: SplitOutcome;
  /** Best split ignoring village value entirely — pure defence preservation. */
  cheapest: SplitOutcome;
  /**
   * Where the recommendation flips to the next-best split. Absent when the
   * two lose the same number of villages, so no village price separates them.
   */
  breakeven?: Breakeven;
}

/** Deterministic PRNG, so a given seed always produces the same table. */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const clampInt = (n: number, lo: number, hi: number) =>
  Math.min(hi, Math.max(lo, Math.floor(Number.isFinite(n) ? n : lo)));

function sanitize(query: DefenseQuery): DefenseQuery {
  const villages = clampInt(query.villages, 1, 60);
  return {
    villages,
    realHammers: clampInt(query.realHammers, 0, 200),
    hammerOffense: Math.max(0, query.hammerOffense || 0),
    defensePool: Math.max(0, query.defensePool || 0),
    defenseBonus: Math.max(0.01, query.defenseBonus || 1),
    casualtyExponent: Math.max(0.1, query.casualtyExponent || rules.battle.casualtyExponent),
    villageValue: Math.max(0, query.villageValue || 0),
    trials: clampInt(query.trials, 1, 200_000),
    seed: Math.floor(query.seed) || 1,
  };
}

interface Tally {
  villagesLost: number;
  villagesSaved: number;
  defenseLost: number;
  hitDefended: number;
  heldDefended: number;
  coveredHammers: number;
}

/**
 * Resolve one trial for one split.
 *
 * Villages are interchangeable before the attack lands, so "which k do you
 * defend" is just the first k — randomising the hammers instead gives the
 * same distribution at a fraction of the work.
 */
function resolveSplit(
  q: DefenseQuery,
  split: number,
  hits: Int32Array,
  tally: Tally,
): void {
  const stack = q.defensePool / split;
  const power = stack * q.defenseBonus;

  for (let v = 0; v < q.villages; v++) {
    const landing = hits[v];
    if (landing === 0) continue;

    const incoming = landing * q.hammerOffense;

    if (v >= split) {
      // Undefended. The village falls and no defence is spent on it.
      tally.villagesLost++;
      continue;
    }

    tally.coveredHammers += landing;
    tally.hitDefended++;

    if (power >= incoming && power > 0) {
      // Held. Casualties scale with how close the fight was: winning by a
      // hair still costs nearly the whole stack.
      tally.heldDefended++;
      tally.villagesSaved++;
      tally.defenseLost += stack * Math.pow(incoming / power, q.casualtyExponent);
    } else {
      // Broken. The stack is wiped and the village falls regardless.
      tally.defenseLost += stack;
      tally.villagesLost++;
    }
  }
}

export function simulateDefense(rawQuery: DefenseQuery): DefenseResult {
  const q = sanitize(rawQuery);
  const rand = mulberry32(q.seed);

  const tallies: Tally[] = Array.from({ length: q.villages }, () => ({
    villagesLost: 0,
    villagesSaved: 0,
    defenseLost: 0,
    hitDefended: 0,
    heldDefended: 0,
    coveredHammers: 0,
  }));

  const hits = new Int32Array(q.villages);

  for (let trial = 0; trial < q.trials; trial++) {
    hits.fill(0);
    for (let h = 0; h < q.realHammers; h++) {
      // With replacement: two hammers can land on the same village, and a
      // stack sized for one of them breaks against two.
      hits[Math.floor(rand() * q.villages)]++;
    }

    // Every split faces this same trial's hammers, so adjacent splits differ
    // by their own merits rather than by sampling noise.
    for (let split = 1; split <= q.villages; split++) {
      resolveSplit(q, split, hits, tallies[split - 1]);
    }
  }

  const outcomes: SplitOutcome[] = tallies.map((t, i) => {
    const split = i + 1;
    const stack = q.defensePool / split;
    const villagesLost = t.villagesLost / q.trials;
    const defenseLost = t.defenseLost / q.trials;

    return {
      split,
      stack,
      ratio: q.hammerOffense > 0 ? (stack * q.defenseBonus) / q.hammerOffense : Infinity,
      villagesLost,
      villagesSaved: t.villagesSaved / q.trials,
      defenseLost,
      totalCost: defenseLost + villagesLost * q.villageValue,
      holdRate: t.hitDefended > 0 ? t.heldDefended / t.hitDefended : 0,
      coverage:
        q.realHammers > 0 ? t.coveredHammers / (q.realHammers * q.trials) : 0,
    };
  });

  const best = pickBest(outcomes, (o) => o.totalCost);
  const cheapest = pickBest(outcomes, (o) => o.defenseLost);

  return { outcomes, best, cheapest, breakeven: findBreakeven(outcomes, best) };
}

/** Lowest score wins; ties go to the smaller split, which risks less. */
function pickBest(
  outcomes: SplitOutcome[],
  score: (o: SplitOutcome) => number,
): SplitOutcome {
  return outcomes.reduce((a, b) => (score(b) < score(a) ? b : a));
}

/**
 * Total cost is linear in village value, so two splits cross at exactly one
 * price. Reporting that price answers "how many villages should I defend"
 * without anyone having to put a number on an artifact first — you only need
 * to know which side of the line you are on.
 */
function findBreakeven(
  outcomes: SplitOutcome[],
  best: SplitOutcome,
): Breakeven | undefined {
  const rivals = outcomes.filter((o) => o.split !== best.split);
  if (rivals.length === 0) return undefined;

  const runnerUp = pickBest(rivals, (o) => o.totalCost);
  const lossGap = runnerUp.villagesLost - best.villagesLost;
  if (Math.abs(lossGap) < 1e-9) return undefined;

  const value = (best.defenseLost - runnerUp.defenseLost) / lossGap;
  if (!Number.isFinite(value) || value < 0) return undefined;

  // Above the crossing price, whichever split loses fewer villages wins.
  const fewerLosses = lossGap > 0 ? best : runnerUp;
  const moreLosses = lossGap > 0 ? runnerUp : best;

  return {
    villageValue: value,
    favouredAbove: fewerLosses.split,
    favouredBelow: moreLosses.split,
  };
}
