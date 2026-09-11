import { resolveBattle, type Regiment, type Village, type Wave } from './combat';

/**
 * How many villages is it worth defending?
 *
 * The tension: defence spread across many villages covers more of the
 * incoming, but a stack that loses is a total loss — the troops die and the
 * catapults land anyway — and you cannot tell a real hammer from a fake when
 * you commit. So `pool / hammer` is the break-even split, where every stack
 * fights at 1:1 and is annihilated winning, not the answer.
 *
 * Everything is counted in resources. Troops lost are priced at what they cost
 * to train, buildings at what they cost to rebuild, so the two sides of the
 * trade are finally in the same units.
 */

export interface Hammer {
  /** Total offense points, as scouted. */
  offense: number;
  /** Share of that offense that is mounted, 0–1. Decides which defence answers it. */
  cavalryShare: number;
  /** Catapults riding along — the part that actually costs buildings. */
  catapults: number;
  /** Smithy level of the siege. */
  catapultUpgrade: number;
}

export interface DefenseUnit {
  key: string;
  defInf: number;
  defCav: number;
  /** Resources to replace one. */
  cost: number;
}

export interface DefenseQuery {
  /** Villages showing incoming, real and fake together. */
  villages: number;
  /** One entry per real hammer. Sizes and compositions may all differ. */
  hammers: Hammer[];
  /** What the defence is made of, which decides both its blend and its price. */
  unit: DefenseUnit;
  /** Troops available in total, to be divided across the villages you defend. */
  troops: number;
  village: Village;
  /** Level of the building the catapults are aimed at. */
  targetLevel: number;
  /** Cumulative resources to build each level, indexed by level. */
  targetCost: number[];
  /** Extra resources a village is worth beyond its buildings — an artifact, say. */
  villagePremium: number;
  trials: number;
  seed: number;
}

export interface SplitOutcome {
  /** Villages defended. Each gets an equal share of the troops. */
  split: number;
  /** Troops standing in each defended village. */
  stack: number;
  /** Stack defence against the average hammer. Below 1.0 it holds nothing. */
  ratio: number;
  troopsLost: number;
  /** Resources burnt replacing dead defenders. */
  troopCost: number;
  buildingLevelsLost: number;
  /** Resources burnt rebuilding what the catapults flattened. */
  buildingCost: number;
  /** Villages that took any building damage at all. */
  villagesDamaged: number;
  /**
   * Villages whose target was levelled outright. Catapults still land after a
   * battle they lost — only the damage shrinks — so "damaged" barely moves
   * with the split and cannot carry a village's value. Being flattened does:
   * it is the point at which an artifact is actually gone.
   */
  villagesFlattened: number;
  /** troopCost + buildingCost + premium on every village levelled. */
  totalCost: number;
  /** Share of real hammers that landed somewhere you had defence. */
  coverage: number;
  /** Of the defended villages that were hit, the share that held. */
  holdRate: number;
}

export interface Breakeven {
  /** Village premium at which the two best splits swap. */
  premium: number;
  favouredAbove: number;
  favouredBelow: number;
}

export interface DefenseResult {
  outcomes: SplitOutcome[];
  best: SplitOutcome;
  /** Best split counting only troops — what pure defence preservation wants. */
  cheapest: SplitOutcome;
  breakeven?: Breakeven;
}

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

/** Turn a scouted estimate into the regiments the combat engine resolves. */
function hammerRegiments(hammer: Hammer): Regiment[] {
  const share = Math.min(1, Math.max(0, hammer.cavalryShare));
  const regiments: Regiment[] = [];

  // Offense is carried as a single notional unit per arm: the engine only ever
  // reads count × off, so one unit of N points behaves as N units of 1.
  if (share < 1) {
    regiments.push({
      key: 'foot', count: 1, off: hammer.offense * (1 - share),
      defInf: 0, defCav: 0, cavalry: false, upgrade: 0,
    });
  }
  if (share > 0) {
    regiments.push({
      key: 'horse', count: 1, off: hammer.offense * share,
      defInf: 0, defCav: 0, cavalry: true, upgrade: 0,
    });
  }
  if (hammer.catapults > 0) {
    regiments.push({
      key: 'cat', count: hammer.catapults, off: 0,
      defInf: 0, defCav: 0, cavalry: false,
      siege: 'catapult', upgrade: hammer.catapultUpgrade,
    });
  }
  return regiments;
}

interface VillageOutcome {
  troopsLost: number;
  levelsLost: number;
  /** Resources to put those levels back. Priced here, where the actual levels
   *  are known: level costs escalate, so averaging levels first and pricing
   *  afterwards understates the damage. */
  rebuild: number;
  damaged: boolean;
  flattened: boolean;
  held: boolean;
}

/**
 * Resolve one village: a stack of `troops`, against however many hammers
 * happened to land on it, as consecutive waves.
 */
function resolveVillage(
  query: DefenseQuery,
  troops: number,
  incoming: number[],
  rebuildCost: (levelsLost: number) => number,
): VillageOutcome {
  const defenders: Regiment[] =
    troops > 0
      ? [{
          key: query.unit.key, count: troops, off: 0,
          defInf: query.unit.defInf, defCav: query.unit.defCav,
          cavalry: false, upgrade: 0,
        }]
      : [];

  const waves: Wave[] = incoming.map((i) => ({
    regiments: hammerRegiments(query.hammers[i]),
    pop: 0,
    type: 'attack' as const,
    targets: [query.targetLevel],
    // Morale needs both populations; a defence planner has neither to hand, so
    // it is left out rather than guessed at from a village count.
    morale: false,
  }));

  const battle = resolveBattle(query.village, defenders, waves);
  const survivors = battle.defenderSurvivors[0]?.count ?? 0;
  const finalLevel = battle.targets[0] ?? query.targetLevel;

  const levelsLost = Math.max(0, query.targetLevel - finalLevel);
  return {
    troopsLost: Math.max(0, troops - survivors),
    levelsLost,
    rebuild: rebuildCost(levelsLost),
    damaged: finalLevel < query.targetLevel,
    flattened: query.targetLevel > 0 && finalLevel === 0,
    held: troops > 0 && survivors > 0,
  };
}

function sanitize(query: DefenseQuery): DefenseQuery {
  return {
    ...query,
    villages: clampInt(query.villages, 1, 40),
    hammers: query.hammers.slice(0, 40),
    troops: Math.max(0, Math.floor(query.troops) || 0),
    targetLevel: clampInt(query.targetLevel, 0, 25),
    villagePremium: Math.max(0, query.villagePremium || 0),
    trials: clampInt(query.trials, 1, 50_000),
    seed: Math.floor(query.seed) || 1,
  };
}

export function simulateDefense(raw: DefenseQuery): DefenseResult {
  const query = sanitize(raw);
  const rand = mulberry32(query.seed);
  const { villages, hammers } = query;

  const rebuildCost = (levelsLost: number) => {
    if (levelsLost <= 0) return 0;
    const from = query.targetCost[query.targetLevel] ?? 0;
    const to = query.targetCost[Math.max(0, query.targetLevel - levelsLost)] ?? 0;
    return Math.max(0, from - to);
  };

  // A village's fate depends only on its stack and which hammers landed on it,
  // so identical situations are resolved once. Most villages take zero or one
  // hammer, which makes this cache hit almost every time.
  const memo = new Map<string, VillageOutcome>();
  const outcomeFor = (troops: number, incoming: number[]): VillageOutcome => {
    const key = `${troops}|${incoming.join(',')}`;
    let cached = memo.get(key);
    if (!cached) {
      cached = resolveVillage(query, troops, incoming, rebuildCost);
      memo.set(key, cached);
    }
    return cached;
  };

  const tallies = Array.from({ length: villages }, () => ({
    troopsLost: 0,
    levelsLost: 0,
    rebuild: 0,
    damaged: 0,
    flattened: 0,
    hitDefended: 0,
    heldDefended: 0,
    covered: 0,
  }));

  const landing: number[][] = Array.from({ length: villages }, () => []);

  for (let trial = 0; trial < query.trials; trial++) {
    for (const village of landing) village.length = 0;
    for (let h = 0; h < hammers.length; h++) {
      // With replacement: two hammers can pick the same village, and a stack
      // sized for one of them breaks against both.
      landing[Math.floor(rand() * villages)].push(h);
    }

    // Every split faces this same trial's hammers, so neighbouring splits
    // differ on merit rather than on sampling noise.
    for (let split = 1; split <= villages; split++) {
      const stack = Math.floor(query.troops / split);
      const tally = tallies[split - 1];

      for (let v = 0; v < villages; v++) {
        const incoming = landing[v];
        if (incoming.length === 0) continue;

        const defended = v < split;
        const result = outcomeFor(defended ? stack : 0, incoming);

        tally.troopsLost += result.troopsLost;
        tally.levelsLost += result.levelsLost;
        tally.rebuild += result.rebuild;
        if (result.damaged) tally.damaged++;
        if (result.flattened) tally.flattened++;
        if (defended) {
          tally.covered += incoming.length;
          tally.hitDefended++;
          if (result.held) tally.heldDefended++;
        }
      }
    }
  }

  const totalHammers = hammers.length * query.trials;
  const averageOffense =
    hammers.reduce((sum, h) => sum + h.offense, 0) / Math.max(1, hammers.length);
  const averageCav =
    hammers.reduce((sum, h) => sum + h.cavalryShare, 0) / Math.max(1, hammers.length);
  const perTroopDefence =
    query.unit.defInf * (1 - averageCav) + query.unit.defCav * averageCav;

  const outcomes: SplitOutcome[] = tallies.map((t, i) => {
    const split = i + 1;
    const stack = Math.floor(query.troops / split);
    const troopsLost = t.troopsLost / query.trials;
    const levelsLost = t.levelsLost / query.trials;
    const villagesDamaged = t.damaged / query.trials;
    const villagesFlattened = t.flattened / query.trials;

    const troopCost = troopsLost * query.unit.cost;
    const buildingCost = t.rebuild / query.trials;

    return {
      split,
      stack,
      ratio:
        averageOffense > 0
          ? (stack * perTroopDefence * (1 + query.village.wallDefBonus)) / averageOffense
          : Infinity,
      troopsLost,
      troopCost,
      buildingLevelsLost: levelsLost,
      buildingCost,
      villagesDamaged,
      villagesFlattened,
      totalCost: troopCost + buildingCost + villagesFlattened * query.villagePremium,
      coverage: totalHammers > 0 ? t.covered / totalHammers : 0,
      holdRate: t.hitDefended > 0 ? t.heldDefended / t.hitDefended : 0,
    };
  });

  const best = pickBest(outcomes, (o) => o.totalCost);
  const cheapest = pickBest(outcomes, (o) => o.troopCost);

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
 * Total cost is linear in the premium, so two splits cross at exactly one
 * price. Reporting that price answers "how many should I defend" without
 * anyone having to put a number on an artifact first — you only need to know
 * which side of the line you are on.
 */
function findBreakeven(
  outcomes: SplitOutcome[],
  best: SplitOutcome,
): Breakeven | undefined {
  const rivals = outcomes.filter((o) => o.split !== best.split);
  if (rivals.length === 0) return undefined;

  const runnerUp = pickBest(rivals, (o) => o.totalCost);
  const gap = runnerUp.villagesFlattened - best.villagesFlattened;
  if (Math.abs(gap) < 1e-9) return undefined;

  const fixed = (o: SplitOutcome) => o.troopCost + o.buildingCost;
  const premium = (fixed(best) - fixed(runnerUp)) / gap;
  if (!Number.isFinite(premium) || premium < 0) return undefined;

  const fewer = gap > 0 ? best : runnerUp;
  const more = gap > 0 ? runnerUp : best;
  return { premium, favouredAbove: fewer.split, favouredBelow: more.split };
}
