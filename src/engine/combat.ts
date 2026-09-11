/**
 * Battle resolution, ported from the T4.6 model Thronewake is built on.
 *
 * The shapes here are deliberately free of any specific unit: callers hand in
 * stats that have already had the smithy applied, so this module can be tested
 * against bare numbers and never needs touching when the rosters change.
 *
 * Deviation from the reference implementation, deliberate: the early ram phase
 * lowers the wall *before* the armies are compared, so the reduced wall bonus
 * applies to the battle itself. The published description of the fight order
 * ("rams demolish the wall to an intermediate level, troops fight, rams finish
 * the wall, then catapults shoot") says it works that way; the reference reads
 * the undamaged level back out of the village and so never applies it.
 */

/** A village defends itself for this much before any troops are counted. */
export const BASE_VILLAGE_DEF = 10;

/** The winner keeps (loser / winner) to this power. Constant in T4. */
export const IMMENSITY = 1.5;

/** Morale can never cost an attacker more than a third of its offense. */
export const MIN_MORALE = 0.667;

export interface Regiment {
  key: string;
  count: number;
  /** Per-unit offense, smithy already applied. */
  off: number;
  /** Per-unit defence against infantry, smithy already applied. */
  defInf: number;
  /** Per-unit defence against cavalry, smithy already applied. */
  defCav: number;
  /** Mounted units are the ones weighed against a defender's anti-cavalry value. */
  cavalry: boolean;
  /** Siege units also carry their smithy level, which scales demolition. */
  siege?: 'ram' | 'catapult';
  upgrade: number;
}

export interface Village {
  /** Population, for the attacker's morale malus. */
  pop: number;
  wallLevel: number;
  /** Fractional defence bonus of the wall at its level: 0.558 is +55.8%. */
  wallDefBonus: number;
  /** Flat defence the wall adds before the multiplier. */
  wallDefFlat: number;
  /** Tribe-specific ram resistance of the wall. */
  wallDurability: number;
  /** Stonemason multiplier dividing incoming siege: 3 means catapults count thirds. */
  durability: number;
  /** Any further flat defence, e.g. from a residence. */
  extraDef: number;
}

export interface Wave {
  regiments: Regiment[];
  /** Attacker population, for morale. */
  pop: number;
  type: 'attack' | 'raid';
  /** Levels of the buildings the catapults are aimed at. */
  targets: number[];
  /** Morale is a T4.6 mechanic; later Travian removed it. */
  morale: boolean;
}

export interface WaveResult {
  /** Fraction of the attacking army lost, 0–1. */
  offLosses: number;
  /** Fraction of the defending army lost, 0–1. */
  defLosses: number;
  /** Offense points after morale. */
  offPoints: number;
  /** Defence points after the wall and the infantry/cavalry blend. */
  defPoints: number;
  /** Morale multiplier that was applied to the attacker, 1 when inactive. */
  morale: number;
  /** Wall level once the rams have finished. */
  wallLevel: number;
  /** Wall level during the fight, after the early ram phase. */
  wallDuringBattle: number;
  /** Resulting level of each catapult target, in the order given. */
  targets: number[];
  /** Survivors, so a caller can price what is left. */
  attackerSurvivors: Regiment[];
  defenderSurvivors: Regiment[];
}

const roundP = (precision: number) => (value: number) =>
  Math.round(value / precision) * precision;

const round4 = roundP(1e-4);
const round3 = roundP(1e-3);
const roundSiege = roundP(0.005);

interface Points {
  /** Contributed by, or weighed against, infantry. */
  i: number;
  /** Contributed by, or weighed against, cavalry. */
  c: number;
}

/**
 * Offense, split by whether it came from a mounted unit. Siege counts as
 * infantry-class: only cavalry is weighed against anti-cavalry defence.
 */
export function offensePoints(regiments: Regiment[]): Points {
  return regiments.reduce(
    (acc, r) => {
      const value = r.off * r.count;
      return r.cavalry ? { i: acc.i, c: acc.c + value } : { i: acc.i + value, c: acc.c };
    },
    { i: 0, c: 0 },
  );
}

/** Defence, kept as its two separate values until the attacker's mix is known. */
export function defensePoints(regiments: Regiment[]): Points {
  return regiments.reduce(
    (acc, r) => ({
      i: acc.i + r.defInf * r.count,
      c: acc.c + r.defCav * r.count,
    }),
    { i: 0, c: 0 },
  );
}

/**
 * Blend the two defence values by how the attacker's offense is made up.
 *
 * This is why hammer composition matters as much as hammer size: the same
 * defence answers a cavalry hammer and an infantry hammer with two different
 * numbers, and a stack built against the wrong one is much thinner than it
 * looks on paper.
 */
export function adducedDefense(off: Points, def: Points): [number, number] {
  const totalOff = off.i + off.c;
  if (totalOff === 0) return [0, 0];
  const infantryPart = round4(off.i / totalOff);
  const cavalryPart = round4(off.c / totalOff);
  return [totalOff, def.i * infantryPart + def.c * cavalryPart];
}

/**
 * The attacker's malus for outweighing the defender in population. Returns a
 * multiplier at or below 1, and never bites when the defender is the larger.
 */
export function morale(offPop: number, defPop: number, pointsRatio = 1): number {
  if (offPop <= defPop) return 1;
  const popRatio = offPop / Math.max(defPop, 3);
  return Math.max(MIN_MORALE, round3(popRatio ** (-0.2 * Math.min(pointsRatio, 1))));
}

/** Siege effectiveness from the smithy, rounded to the game's own step. */
export function siegeUpgrade(level: number): number {
  return roundSiege(1.0205 ** level);
}

/** Demolition efficiency as a function of how the battle itself went. */
export function sigma(ratio: number): number {
  return (ratio > 1 ? 2 - ratio ** -1.5 : ratio ** 1.5) / 2;
}

export function demolishPoints(
  siegeCount: number,
  upgrade: number,
  durability: number,
  pointsRatio: number,
  moraleFactor = 1,
): number {
  const effective = Math.floor(siegeCount / durability) * moraleFactor;
  return 4 * sigma(pointsRatio) * effective * siegeUpgrade(upgrade);
}

/**
 * Knock levels off a building. Each level costs its own number in points, so
 * flattening a level-20 building takes 20+19+…+1 = 210.
 */
export function demolish(level: number, damage: number): number {
  let remaining = damage - 0.5;
  let current = level;
  if (remaining < 0) return current;
  while (remaining >= current && current) {
    remaining -= current;
    current--;
  }
  return current;
}

/**
 * Points needed to take a wall from `level` down to each lower level during the
 * early ram phase, indexed by how many levels come off.
 */
const earlyRamTable: number[][] = [];
for (let level = 0; level <= 20; level++) {
  const row: number[] = [];
  let l = 0;
  for (; l <= level / 2; l++) {
    row.push(-2 * l ** 2 + (2 * level + 1) * l);
  }
  const base = (level * (level + 1)) / 2 + 20;
  for (; l <= level; l++) {
    const dl = l - Math.floor(level / 2) - 1;
    row.push(1.25 * dl ** 2 + 49.75 * dl + base);
  }
  row.push(1e9);
  earlyRamTable.push(row);
}

/** Wall level once the early ram phase is done. */
export function demolishWall(
  wallDurability: number,
  level: number,
  points: number,
): number {
  const row = earlyRamTable[Math.max(0, Math.min(20, Math.floor(level)))];
  let demolished = 0;
  while (Math.floor(wallDurability * row[demolished + 1]) <= points) demolished++;
  return level - demolished;
}

const totalCount = (regiments: Regiment[]) =>
  regiments.reduce((n, r) => n + r.count, 0);

const applyLosses = (regiments: Regiment[], losses: number): Regiment[] =>
  regiments.map((r) => ({ ...r, count: Math.round(r.count * (1 - losses)) }));

const findSiege = (regiments: Regiment[], kind: 'ram' | 'catapult'): [number, number] => {
  const found = regiments.find((r) => r.siege === kind && r.count > 0);
  return found ? [found.count, found.upgrade] : [0, 0];
};

/**
 * Resolve one wave against a village and a set of defenders.
 *
 * Pure: the defenders passed in are not modified, and the survivors come back
 * on the result for the caller to carry into the next wave.
 */
export function resolveWave(
  village: Village,
  defenders: Regiment[],
  wave: Wave,
): WaveResult {
  const off = offensePoints(wave.regiments);
  const def = defensePoints(defenders);
  const [baseOff, blendedDef] = adducedDefense(off, def);

  const defenceAt = (wallLevel: number) => {
    // A wall that has been rammed down mid-battle stops paying its bonus.
    const scale = village.wallLevel > 0 ? wallLevel / village.wallLevel : 0;
    const bonus = 1 + village.wallDefBonus * scale;
    const flat = BASE_VILLAGE_DEF + village.extraDef + village.wallDefFlat * scale;
    return (blendedDef + flat) * bonus;
  };

  const pointsFor = (wallLevel: number) => {
    const finalDef = defenceAt(wallLevel);
    const moraleFactor = wave.morale
      ? morale(wave.pop, village.pop, finalDef > 0 ? baseOff / finalDef : 1)
      : 1;
    return { finalOff: baseOff * moraleFactor, finalDef, moraleFactor };
  };

  let wallDuringBattle = village.wallLevel;
  let wallAfter = village.wallLevel;
  let { finalOff, finalDef, moraleFactor } = pointsFor(wallDuringBattle);

  const [rams, ramUpgrade] = findSiege(wave.regiments, 'ram');
  if (rams > 0 && village.wallLevel > 0) {
    const ratio = finalDef > 0 ? finalOff / finalDef : Infinity;
    const earlyPoints = demolishPoints(rams, ramUpgrade, village.durability, ratio);
    wallDuringBattle = demolishWall(village.wallDurability, village.wallLevel, earlyPoints);

    // The fight is now against the reduced wall, which changes the ratio the
    // rams' second pass is measured at.
    ({ finalOff, finalDef, moraleFactor } = pointsFor(wallDuringBattle));
    const battleRatio = finalDef > 0 ? finalOff / finalDef : Infinity;
    const finalPoints = demolishPoints(
      rams,
      ramUpgrade,
      village.durability,
      battleRatio,
    );
    wallAfter = demolish(village.wallLevel, finalPoints);
  }

  const ratio = finalDef > 0 ? finalOff / finalDef : Infinity;
  const x = ratio ** IMMENSITY;

  let offLosses: number;
  let defLosses: number;
  if (wave.type === 'raid') {
    // Raids bleed both sides rather than wiping the loser.
    offLosses = 1 / (1 + x);
    defLosses = x / (1 + x);
  } else {
    offLosses = Math.min(1 / x, 1);
    defLosses = Math.min(x, 1);
  }

  // A single unit attacking alone dies unless it is strong enough on its own.
  if (totalCount(wave.regiments) === 1) {
    const solo = (off.i + off.c) * (wave.morale ? morale(wave.pop, village.pop) : 1);
    if (solo < 84.5) offLosses = 1;
  }

  const [cats, catUpgrade] = findSiege(wave.regiments, 'catapult');
  let targets = [...wave.targets];
  if (cats > 0 && targets.length > 0) {
    const points = demolishPoints(
      cats / targets.length,
      catUpgrade,
      village.durability,
      ratio,
    );
    targets = targets.map((level) => demolish(level, points));
  }

  return {
    offLosses,
    defLosses,
    offPoints: finalOff,
    defPoints: finalDef,
    morale: moraleFactor,
    wallLevel: wallAfter,
    wallDuringBattle,
    targets,
    attackerSurvivors: applyLosses(wave.regiments, offLosses),
    defenderSurvivors: applyLosses(defenders, defLosses),
  };
}

export interface BattleResult {
  waves: WaveResult[];
  /** Defenders left once every wave has landed. */
  defenderSurvivors: Regiment[];
  /** Wall level at the end. */
  wallLevel: number;
  /** Final level of each building that was targeted, keyed by its index. */
  targets: number[];
}

/**
 * Run waves in order against one village.
 *
 * Defenders carry their losses between waves, which is the whole point of a
 * cata train: each wave is cheaper than the last because the wall and the
 * garrison are already thinner when it lands.
 */
export function resolveBattle(
  village: Village,
  defenders: Regiment[],
  waves: Wave[],
): BattleResult {
  let standing = defenders.map((r) => ({ ...r }));
  let place = { ...village };
  const results: WaveResult[] = [];
  let targets = waves[0]?.targets ? [...waves[0].targets] : [];

  for (const wave of waves) {
    // Later waves aim at whatever the earlier ones left standing.
    const aimed = { ...wave, targets: wave.targets.map((_, i) => targets[i] ?? wave.targets[i]) };
    const result = resolveWave(place, standing, aimed);
    results.push(result);

    standing = result.defenderSurvivors;
    place = { ...place, wallLevel: result.wallLevel };
    targets = result.targets;
  }

  return {
    waves: results,
    defenderSurvivors: standing,
    wallLevel: place.wallLevel,
    targets,
  };
}
