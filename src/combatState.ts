import { playableFactions } from './data/factions';
import type { Faction } from './data/types';

export interface Army {
  id: string;
  faction: string;
  smithy: number;
  levels?: Record<string, number>;
  counts: Record<string, number>;
  brewery?: number;
  targetCount?: number;
  targets?: CatapultTarget[];
  type?: 'attack' | 'raid' | 'siege';
}

export interface CatapultTarget {
  gid: number;
  level: number;
}

export const DEFAULT_TARGET_GID = 10;
export const DEFAULT_TARGET_LEVEL = 20;

export interface CombatState {
  /** Each attacker is its own wave, landing in the order listed. */
  attackers: Army[];
  /** Defenders all stand in the same village and fight as one garrison. */
  defenders: Army[];
  type: 'attack' | 'raid' | 'siege';
  morale: boolean;
  attackerPop: number;
  defenderPop: number;
  villageFaction: string;
  wallLevel: number;
  isCity: boolean;
  cityGuards: number;
  palaceLevel: number;
  stonemason: number;
  durabilityArtifact: number;
  targetCount: number;
  targets: CatapultTarget[];
  // Legacy / fallback target fields
  targetGid: number;
  targetLevel: number;
  trapperLevel?: number;
}

let nextArmyId = 0;
export const makeArmy = (faction: string): Army => ({
  id: `a${Date.now()}-${nextArmyId++}`,
  faction,
  smithy: 0,
  counts: {},
  targetCount: 1,
  targets: [{ gid: DEFAULT_TARGET_GID, level: DEFAULT_TARGET_LEVEL }],
  type: 'attack',
});

export const initialCombatState: CombatState = {
  attackers: [{ ...makeArmy('embermark_dominion'), id: 'att-1' }],
  defenders: [{ ...makeArmy('verdant_wardens'), id: 'def-1' }],
  type: 'attack',
  morale: false,
  attackerPop: 1500,
  defenderPop: 1500,
  villageFaction: 'verdant_wardens',
  wallLevel: 20,
  isCity: false,
  cityGuards: 0,
  palaceLevel: 0,
  stonemason: 0,
  durabilityArtifact: 1,
  targetCount: 1,
  targets: [{ gid: 10, level: 20 }], // Default to Warehouse (gid 10)
  targetGid: 10,
  targetLevel: 20,
  trapperLevel: 0,
};

export const safeFaction = (key: string): Faction =>
  playableFactions.find((f) => f.key === key) ?? playableFactions[0];

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));

/**
 * Serializes an army list to a URL-safe compact string.
 * Format: faction:smithy:counts:brewery:levels:targets
 */
function serializeArmies(armies: Army[]): string {
  return armies
    .map((army) => {
      const countsStr = Object.entries(army.counts)
        .filter(([, count]) => typeof count === 'number' && count > 0)
        .map(([k, count]) => `${k}=${count}`)
        .join(',');
      const breweryStr = (army.brewery ?? 0) > 0 ? String(army.brewery) : '';
      const levelsStr = army.levels
        ? Object.entries(army.levels)
            .filter(([, lvl]) => typeof lvl === 'number' && lvl !== army.smithy)
            .map(([k, lvl]) => `${k}=${lvl}`)
            .join(',')
        : '';
      const targetsStr = army.targets
        ? army.targets
            .slice(0, army.targetCount || army.targets.length)
            .map((t) => `${t.gid}@${t.level}`)
            .join(',')
        : '';

      const typeStr = army.type && army.type !== 'attack' ? army.type : '';

      if (breweryStr || levelsStr || targetsStr || typeStr) {
        return `${army.faction}:${army.smithy}:${countsStr}:${breweryStr}:${levelsStr}:${targetsStr}:${typeStr}`;
      }
      return `${army.faction}:${army.smithy}:${countsStr}`;
    })
    .join('~');
}

/**
 * Deserializes an army list from a compact string.
 */
function deserializeArmies(rawStr: string | null, prefix: string): Army[] {
  if (!rawStr) return [];
  return rawStr
    .split('~')
    .filter(Boolean)
    .map((chunk, idx) => {
      const parts = chunk.split(':');
      const factionRaw = parts[0] || '';
      const smithyRaw = parts[1] || '0';
      const countsRaw = parts[2] || '';
      const breweryRaw = parts[3];
      const levelsRaw = parts[4];
      const targetsRaw = parts[5];
      const typeRaw = parts[6];
      const type = (typeRaw === 'siege' || typeRaw === 'raid' || typeRaw === 'attack') ? typeRaw : undefined;

      const faction = safeFaction(factionRaw).key;
      const smithy = clamp(Number(smithyRaw) || 0, 0, 20);
      const counts: Record<string, number> = {};
      if (countsRaw) {
        countsRaw.split(',').forEach((unitChunk) => {
          const sep = unitChunk.includes('=') ? '=' : ':';
          const [uKey, uCount] = unitChunk.split(sep);
          if (uKey && uCount) {
            const num = Math.max(0, Math.floor(Number(uCount)) || 0);
            if (num > 0) counts[uKey] = num;
          }
        });
      }

      let brewery: number | undefined;
      if (breweryRaw) {
        const b = Number(breweryRaw);
        if (Number.isFinite(b) && b > 0) brewery = clamp(b, 0, 20);
      }

      let levels: Record<string, number> | undefined;
      if (levelsRaw) {
        levels = {};
        levelsRaw.split(',').forEach((lvlChunk) => {
          const sep = lvlChunk.includes('=') ? '=' : ':';
          const [uKey, uLvl] = lvlChunk.split(sep);
          if (uKey && uLvl) {
            levels![uKey] = clamp(Math.floor(Number(uLvl)) || 0, 0, 23);
          }
        });
      }

      let targets: CatapultTarget[] | undefined;
      let targetCount = 1;
      if (targetsRaw) {
        targets = targetsRaw
          .split(',')
          .map((tChunk) => {
            const [gidStr, lvlStr] = tChunk.split('@');
            return {
              gid: Number(gidStr) || DEFAULT_TARGET_GID,
              level: clamp(Number(lvlStr) || DEFAULT_TARGET_LEVEL, 0, 22),
            };
          })
          .filter(Boolean);
        if (targets.length > 0) targetCount = clamp(targets.length, 1, 4);
      }
      if (!targets || targets.length === 0) {
        targets = [{ gid: DEFAULT_TARGET_GID, level: DEFAULT_TARGET_LEVEL }];
      }

      return {
        id: `${prefix}-${idx + 1}-${Date.now()}`,
        faction,
        smithy,
        counts,
        targetCount,
        targets,
        type,
        ...(brewery !== undefined ? { brewery } : {}),
        ...(levels && Object.keys(levels).length > 0 ? { levels } : {}),
      };
    });
}

/**
 * Encodes CombatState into URL query string format.
 */
export function encodeCombatState(state: CombatState): string {
  const p = new URLSearchParams();
  p.set('tool', 'combat');

  // Village settings
  if (state.type !== initialCombatState.type) {
    p.set('t', state.type === 'raid' ? 'r' : state.type === 'siege' ? 's' : 'a');
  }
  if (state.morale !== initialCombatState.morale) {
    p.set('m', state.morale ? '1' : '0');
  }
  if (state.attackerPop !== initialCombatState.attackerPop) {
    p.set('ap', String(state.attackerPop));
  }
  if (state.defenderPop !== initialCombatState.defenderPop) {
    p.set('dp', String(state.defenderPop));
  }
  if (state.villageFaction !== initialCombatState.villageFaction) {
    p.set('vf', state.villageFaction);
  }
  if (state.wallLevel !== initialCombatState.wallLevel) {
    p.set('wl', String(state.wallLevel));
  }
  if (state.cityGuards > 0) {
    p.set('cg', String(state.cityGuards));
    p.set('city', '1');
  } else if (state.isCity) {
    p.set('city', '1');
  }
  if (state.palaceLevel > 0) {
    p.set('pal', String(state.palaceLevel));
  }
  if (state.stonemason !== initialCombatState.stonemason) {
    p.set('sm', String(state.stonemason));
  }
  if (state.durabilityArtifact && state.durabilityArtifact !== initialCombatState.durabilityArtifact) {
    p.set('da', String(state.durabilityArtifact));
  }
  if ((state.trapperLevel ?? 0) > 0) {
    p.set('tr', String(state.trapperLevel));
  }
  if (state.targetCount !== initialCombatState.targetCount) {
    p.set('tc', String(state.targetCount));
  }

  // Targets (encoded as gid:level,gid:level if different from default)
  const isDefaultTargets =
    state.targets &&
    state.targets.length === 1 &&
    state.targets[0].gid === initialCombatState.targets[0].gid &&
    state.targets[0].level === initialCombatState.targets[0].level;

  if (state.targets && state.targets.length > 0 && !isDefaultTargets) {
    const targetsStr = state.targets.map((t) => `${t.gid}:${t.level}`).join(',');
    p.set('tgs', targetsStr);
  } else if (!isDefaultTargets && (state.targetGid !== initialCombatState.targetGid || state.targetLevel !== initialCombatState.targetLevel)) {
    p.set('tg', String(state.targetGid));
    p.set('tl', String(state.targetLevel));
  }

  // Armies
  const attStr = serializeArmies(state.attackers);
  const isDefaultAtt =
    state.attackers.length === 1 &&
    state.attackers[0].faction === initialCombatState.attackers[0].faction &&
    (state.attackers[0].smithy ?? 0) === 0 &&
    (!state.attackers[0].levels || Object.keys(state.attackers[0].levels).length === 0) &&
    Object.values(state.attackers[0].counts).every((c) => !c);

  if (!isDefaultAtt && attStr !== 'embermark_dominion:0:') {
    p.set('att', attStr);
  }

  const defStr = serializeArmies(state.defenders);
  const isDefaultDef =
    state.defenders.length === 1 &&
    state.defenders[0].faction === initialCombatState.defenders[0].faction &&
    (state.defenders[0].smithy ?? 0) === 0 &&
    (!state.defenders[0].levels || Object.keys(state.defenders[0].levels).length === 0) &&
    Object.values(state.defenders[0].counts).every((c) => !c);

  if (!isDefaultDef && defStr !== 'verdant_wardens:0:') {
    p.set('def', defStr);
  }

  return p.toString();
}

/**
 * Checks if a URL hash contains custom combat parameters.
 */
export function hasCombatHashParams(hash: string): boolean {
  const p = new URLSearchParams(hash.replace(/^#/, ''));
  if (p.get('tool') !== 'combat') return false;
  return [...p.keys()].filter((k) => k !== 'tool').length > 0;
}

/**
 * Decodes a URL hash into a CombatState.
 */
export function decodeCombatState(hash: string): CombatState | null {
  const p = new URLSearchParams(hash.replace(/^#/, ''));
  if (p.get('tool') !== 'combat') return null;

  // Check for json payload fallback
  const cPayload = p.get('c');
  if (cPayload) {
    try {
      const decodedJson = JSON.parse(decodeURIComponent(atob(cPayload)));
      if (decodedJson && Array.isArray(decodedJson.attackers) && Array.isArray(decodedJson.defenders)) {
        return { ...initialCombatState, ...decodedJson };
      }
    } catch {}
  }

  const num = (key: string, fallback: number, min = 0, max = Infinity) => {
    const raw = p.get(key);
    if (raw === null) return fallback;
    const val = Number(raw);
    return Number.isFinite(val) ? clamp(val, min, max) : fallback;
  };

  const parsedAtt = deserializeArmies(p.getAll('att').join('~'), 'att');
  const parsedDef = deserializeArmies(p.getAll('def').join('~'), 'def');

  const typeParam = p.get('t');
  const type: 'attack' | 'raid' | 'siege' =
    typeParam === 'r' || typeParam === 'raid'
      ? 'raid'
      : typeParam === 's' || typeParam === 'siege'
      ? 'siege'
      : 'attack';

  const targetCount = num('tc', initialCombatState.targetCount, 1, 4);

  // Parse targets array
  let targets: CatapultTarget[] = [];
  const tgsParam = p.get('tgs');
  if (tgsParam) {
    targets = tgsParam.split(',').map((chunk) => {
      const [g, l] = chunk.split(':');
      return {
        gid: clamp(Number(g) || 10, 1, 99),
        level: clamp(Number(l) || 20, 0, 22),
      };
    }).slice(0, 4);
  }
  if (targets.length === 0) {
    const fallbackGid = num('tg', initialCombatState.targetGid, 1, 99);
    const fallbackLvl = num('tl', initialCombatState.targetLevel, 0, 22);
    targets = Array.from({ length: targetCount }, () => ({ gid: fallbackGid, level: fallbackLvl }));
  } else {
    // Fill up to targetCount if fewer
    while (targets.length < targetCount) {
      targets.push({ gid: 10, level: 20 });
    }
  }

  const villageFaction = safeFaction(p.get('vf') || initialCombatState.villageFaction).key;
  const isCity = p.get('city') === '1' || p.get('city') === 'true';

  const rawAtt = parsedAtt.length > 0 ? parsedAtt : initialCombatState.attackers;
  const attackers = rawAtt.map((a) => ({
    ...a,
    type: a.type ?? type,
  }));

  return {
    attackers,
    defenders: parsedDef.length > 0 ? parsedDef : initialCombatState.defenders,
    type,
    morale: p.get('m') !== '0',
    attackerPop: num('ap', initialCombatState.attackerPop, 0, 100_000),
    defenderPop: num('dp', initialCombatState.defenderPop, 0, 100_000),
    villageFaction,
    wallLevel: num('wl', initialCombatState.wallLevel, 0, 20),
    isCity: isCity || num('cg', 0, 0, 20) > 0,
    cityGuards: num('cg', initialCombatState.cityGuards, 0, 20),
    palaceLevel: num('pal', initialCombatState.palaceLevel, 0, 20),
    stonemason: num('sm', initialCombatState.stonemason, 0, 20),
    durabilityArtifact: num('da', initialCombatState.durabilityArtifact, 1, 5),
    trapperLevel: num('tr', initialCombatState.trapperLevel ?? 0, 0, 20),
    targetCount,
    targets,
    targetGid: targets[0]?.gid ?? 10,
    targetLevel: targets[0]?.level ?? 20,
  };
}
