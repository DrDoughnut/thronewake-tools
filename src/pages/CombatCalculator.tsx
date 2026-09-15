import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { UnitIcon } from '../components/UnitIcon';
import { FactionSelect } from '../components/FactionSelect';
import { KiloNumberInput } from '../components/KiloNumberInput';
import { BUILDINGS } from '../data/buildingCatalog';
import { formatTimeSeconds } from '../data/buildingEffects';
import { factions, unitRef } from '../data/factions';
import { trapperCapacity, watchTowerBonus, watchTowerDurability, watchTowerFlat } from '../data/rules';
import type { Faction, Unit } from '../data/types';
import {
  resolveBattle,
  offensePoints,
  defensePoints,
  type Regiment,
  type Village,
  type Wave,
} from '../engine/combat';
import { buildingCumulativeCost } from '../engine/cpOptimizer';
import { defaultModifiers, effectiveTime, offenseFactor, totalCost, upgradeStat, type Modifiers } from '../engine/stats';
import { buildingIcon, statIcon, unitIcon } from '../icons';
import { loadStoredJson, saveStoredJson, StorageKeys } from '../storage';
import {
  type Army,
  type CatapultTarget,
  type CombatState,
  initialCombatState,
  makeArmy,
  safeFaction,
  encodeCombatState,
  decodeCombatState,
} from '../combatState';

/** Stonemason's Lodge: +10% building durability per level, from the catalog. */
const durabilityFor = (level: number) => 1 + 0.1 * Math.max(0, level);

/** Unit keys are unique across every roster, so one map prices them all. */
const UNIT_COST = new Map(
  factions.flatMap((f) => f.units.map((u) => [u.key, totalCost(u)] as const)),
);

/** All 10 faction units are available for combat calculation and garrison defence. */
const fightable = (faction: Faction): Unit[] => faction.units;

/** Residence / Palace flat defense: level 10 = 200, level 20 = 800 (2 * level^2). */
const palaceFlatDef = (level: number) => 2 * (Math.max(0, level) ** 2);

const siegeKind = (unit: Unit): 'ram' | 'catapult' | undefined => {
  if (unit.role === 'ram') return 'ram';
  if (unit.role === 'siege') return 'catapult';
  return undefined;
};

interface ResourceLossBreakdown {
  wood: number;
  clay: number;
  iron: number;
  crop: number;
  total: number;
  xp: number;
}

function computeLossBreakdown(before: Regiment[], after: Regiment[]): ResourceLossBreakdown {
  let wood = 0;
  let clay = 0;
  let iron = 0;
  let crop = 0;
  let xp = 0;

  before.forEach((r, i) => {
    const lost = Math.max(0, r.count - (after[i]?.count ?? 0));
    if (lost <= 0) return;
    for (const f of factions) {
      const u = f.units.find((unit) => unit.key === r.key);
      if (u) {
        wood += lost * u.cost[0];
        clay += lost * u.cost[1];
        iron += lost * u.cost[2];
        crop += lost * u.cost[3];
        xp += lost * u.upkeep;
        break;
      }
    }
  });

  return {
    wood,
    clay,
    iron,
    crop,
    total: wood + clay + iron + crop,
    xp,
  };
}

/** Turn one army's roster selection into the flat stats the engine wants. */
function toRegiments(army: Army): Regiment[] {
  const faction = safeFaction(army.faction);
  const breweryLevel = faction.key === 'stormfang_clans' ? (army.brewery ?? 0) : 0;
  const mods: Modifiers = {
    ...defaultModifiers,
    smithy: army.smithy,
    buildings: {
      ...defaultModifiers.buildings,
      stormbrewWorks: breweryLevel,
    },
  };
  const factor = offenseFactor(faction, mods);

  return fightable(faction)
    .filter((unit) => (army.counts[unit.key] ?? 0) > 0)
    .map((unit) => {
      const unitSmithy = unit.noUpgrade ? 0 : (army.levels?.[unit.key] ?? army.smithy);
      return {
        key: unit.key,
        count: army.counts[unit.key] ?? 0,
        off: upgradeStat(unit, unit.off, unitSmithy) * factor,
        defInf: upgradeStat(unit, unit.defInf, unitSmithy),
        defCav: upgradeStat(unit, unit.defCav, unitSmithy),
        cavalry: Boolean(unit.stabled),
        siege: siegeKind(unit),
        upgrade: unitSmithy,
      };
    });
}

/** Resources burnt by the difference between two rosters. */
function lossCost(before: Regiment[], after: Regiment[]): number {
  return before.reduce((sum, r, i) => {
    const lost = Math.max(0, r.count - (after[i]?.count ?? 0));
    return sum + lost * (UNIT_COST.get(r.key) ?? 0);
  }, 0);
}

const unitsLost = (before: Regiment[], after: Regiment[]) =>
  before.reduce((n, r, i) => n + Math.max(0, r.count - (after[i]?.count ?? 0)), 0);

function loadInitialState(): CombatState {
  if (typeof window !== 'undefined' && window.location.hash) {
    const fromHash = decodeCombatState(window.location.hash);
    if (fromHash) return fromHash;
  }
  const saved = loadStoredJson<Partial<CombatState> | null>(StorageKeys.COMBAT_STATE, null);
  // The shape changed when armies became lists; anything older starts fresh.
  if (saved && Array.isArray(saved.attackers) && Array.isArray(saved.defenders)
    && saved.attackers.length > 0 && saved.defenders.length > 0) {
    return { ...initialCombatState, ...saved };
  }
  return initialCombatState;
}

const round = (n: number) => Math.round(n).toLocaleString();

const compact = (n: number) => {
  if (!Number.isFinite(n)) return '—';
  const abs = Math.abs(n);
  if (abs >= 1_000_000) return `${(n / 1_000_000).toFixed(abs >= 10_000_000 ? 0 : 1)}M`;
  if (abs >= 10_000) return `${Math.round(n / 1000)}k`;
  return round(n);
};

const pct = (n: number) => `${(n * 100).toFixed(n > 0 && n < 0.01 ? 2 : 1)}%`;

export const lossPctColor = (ratio: number): string => {
  const clamped = Math.min(Math.max(ratio, 0), 1);
  const hue = Math.round((1 - clamped) * 140); // 140 (green) -> 70 (yellow) -> 0 (red)
  return `hsl(${hue}, 85%, 55%)`;
};

export function CombatCalculator() {
  const [state, setState] = useState<CombatState>(loadInitialState);
  const [copied, setCopied] = useState(false);
  const [showSurvivors, setShowSurvivors] = useState(false);

  // Sync to localStorage
  useEffect(() => {
    saveStoredJson(StorageKeys.COMBAT_STATE, state);
  }, [state]);

  // Compute shareable URL hash and update address bar
  const shareHash = useMemo(() => encodeCombatState(state), [state]);

  useEffect(() => {
    window.history.replaceState(null, '', window.location.pathname + '#' + shareHash);
  }, [shareHash]);

  // Listen to hash changes (e.g. back/forward navigation or link pasting)
  useEffect(() => {
    const onHashChange = () => {
      const decoded = decodeCombatState(window.location.hash);
      if (decoded) {
        setState(decoded);
      }
    };
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  const copyShareLink = async () => {
    const fullUrl = window.location.origin + window.location.pathname + '#' + shareHash;
    try {
      await navigator.clipboard.writeText(fullUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      window.location.hash = shareHash;
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const [selectedWave, setSelectedWave] = useState<'overall' | number>('overall');

  // The village race can be explicitly chosen or falls back to first defender
  const villageFaction = safeFaction(state.villageFaction || state.defenders[0]?.faction || '');

  const battle = useMemo(() => {
    const waveArmies = state.attackers.map(toRegiments);
    const defenders = state.defenders.flatMap(toRegiments);

    // Watch tower base bonus
    const towerBonus = watchTowerBonus(villageFaction.key, state.wallLevel);
    // City guards provide 0 to 20% (+1% per level) extra defense bonus
    const cityGuardBonus = Math.min(0.20, Math.max(0, state.cityGuards) * 0.01);

    // Residence / Palace flat defense
    const extraDef = palaceFlatDef(state.palaceLevel);

    const durabilityMult = Math.max(1, state.durabilityArtifact || 1);
    const stonemasonMult = durabilityFor(state.stonemason);

    const village: Village = {
      pop: state.defenderPop,
      wallLevel: state.wallLevel,
      wallDefBonus: towerBonus,
      wallDefFlat: watchTowerFlat(villageFaction.key, state.wallLevel),
      wallDurability: watchTowerDurability(villageFaction.key) * durabilityMult * stonemasonMult,
      durability: stonemasonMult * durabilityMult,
      extraDef,
      trapperCapacity: villageFaction.key === 'verdant_wardens' ? trapperCapacity(state.trapperLevel ?? 0) : 0,
      cityGuardBonus,
    };

    // Targets per wave
    const waves: Wave[] = waveArmies.map((regiments, idx) => {
      const army = state.attackers[idx];
      const tc = army?.targetCount || army?.targets?.length || 1;
      const targets = (army?.targets && army.targets.length > 0
        ? army.targets
        : [{ gid: 10, level: 20 }]).slice(0, tc);

      return {
        regiments,
        pop: state.attackerPop,
        type: army?.type || 'attack',
        targets: targets.map((t) => t.level),
        morale: state.morale,
      };
    });

    if (waveArmies.every((a) => a.length === 0)) return null;
    return { result: resolveBattle(village, defenders, waves), waveArmies, defenders };
  }, [state, villageFaction]);

  const set = <K extends keyof CombatState>(key: K, value: CombatState[K]) =>
    setState((prev) => ({ ...prev, [key]: value }));

  const side = (kind: 'attackers' | 'defenders') => ({
    add: () =>
      setState((p) => ({
        ...p,
        [kind]: [...p[kind], makeArmy(p[kind][p[kind].length - 1]?.faction ?? 'embermark_dominion')],
      })),
    remove: (id: string) =>
      setState((p) => ({ ...p, [kind]: p[kind].filter((a) => a.id !== id) })),
    move: (id: string, direction: -1 | 1) =>
      setState((p) => {
        const list = p[kind];
        const idx = list.findIndex((a) => a.id === id);
        if (idx < 0) return p;
        const targetIdx = idx + direction;
        if (targetIdx < 0 || targetIdx >= list.length) return p;
        const next = [...list];
        const temp = next[idx];
        next[idx] = next[targetIdx];
        next[targetIdx] = temp;
        return { ...p, [kind]: next };
      }),
    patch: (id: string, patch: Partial<Army>) =>
      setState((p) => ({
        ...p,
        [kind]: p[kind].map((a) => (a.id === id ? { ...a, ...patch } : a)),
      })),
    count: (id: string, unitKey: string, value: number) =>
      setState((p) => ({
        ...p,
        [kind]: p[kind].map((a) =>
          a.id === id
            ? { ...a, counts: { ...a.counts, [unitKey]: Math.max(0, Math.floor(value) || 0) } }
            : a),
      })),
    level: (id: string, unitKey: string, value: number) =>
      setState((p) => ({
        ...p,
        [kind]: p[kind].map((a) =>
          a.id === id
            ? {
                ...a,
                levels: {
                  ...(a.levels || {}),
                  [unitKey]: Math.min(23, Math.max(0, Math.floor(value) || 0)),
                },
              }
            : a),
      })),
    targetCount: (id: string, count: number) =>
      setState((p) => ({
        ...p,
        attackers: p.attackers.map((a) => {
          if (a.id !== id) return a;
          const tc = Math.min(4, Math.max(1, count));
          const targets = [...(a.targets || [{ gid: 10, level: 20 }])];
          while (targets.length < tc) {
            targets.push({ gid: 10, level: 20 });
          }
          return { ...a, targetCount: tc, targets };
        }),
      })),
    target: (id: string, targetIdx: number, patch: Partial<CatapultTarget>) =>
      setState((p) => ({
        ...p,
        attackers: p.attackers.map((a) => {
          if (a.id !== id) return a;
          const targets = [...(a.targets || [{ gid: 10, level: 20 }])];
          while (targets.length <= targetIdx) {
            targets.push({ gid: 10, level: 20 });
          }
          targets[targetIdx] = { ...targets[targetIdx], ...patch };
          return { ...a, targets };
        }),
      })),
  });

  const attackers = side('attackers');
  const defenders = side('defenders');

  // Regiment lists per defender army to track losses per defender
  const defenderArmiesRegs = useMemo(
    () => state.defenders.map((d) => toRegiments(d)),
    [state.defenders]
  );

  const defenderRanges = useMemo(() => {
    let off = 0;
    return defenderArmiesRegs.map((regs) => {
      const start = off;
      const end = off + regs.length;
      off = end;
      return { start, end };
    });
  }, [defenderArmiesRegs]);

  const getDefenderRegs = (regList: Regiment[] | undefined, dIdx: number): Regiment[] => {
    if (!regList) return [];
    const range = defenderRanges[dIdx];
    if (!range) return [];
    return regList.slice(range.start, range.end);
  };

  const isOverall = selectedWave === 'overall';
  const activeWaveIdx = typeof selectedWave === 'number'
    ? Math.min(selectedWave, Math.max(0, state.attackers.length - 1))
    : null;

  const w = activeWaveIdx !== null && battle ? battle.result.waves[activeWaveIdx] : null;

  // Chiefs / Leader loyalty impact:
  const chiefKeys = new Set(['high_prefect', 'clan_warlord', 'circle_elder', 'the_ascendant']);

  const totalRams = state.attackers.reduce((sum, a) => {
    const ramU = fightable(safeFaction(a.faction)).find((u) => u.role === 'ram');
    return sum + (ramU ? (a.counts[ramU.key] ?? 0) : 0);
  }, 0);

  const totalChiefs = useMemo(() => {
    if (!battle) {
      return state.attackers.reduce((sum, a) => {
        const chiefU = fightable(safeFaction(a.faction)).find((u) => chiefKeys.has(u.key) || u.role === 'chief');
        return sum + (chiefU ? (a.counts[chiefU.key] ?? 0) : 0);
      }, 0);
    }
    return battle.result.waves.reduce((sum, waveRes) => {
      const survivors = waveRes.attackerSurvivors;
      return sum + survivors.filter((r) => chiefKeys.has(r.key)).reduce((s, r) => s + r.count, 0);
    }, 0);
  }, [battle, state.attackers]);

  const chiefUnitKey = useMemo(() => {
    if (battle) {
      for (const waveRes of battle.result.waves) {
        const surv = waveRes.attackerSurvivors.find((r) => chiefKeys.has(r.key) && r.count > 0);
        if (surv) return surv.key;
      }
    }
    for (const a of state.attackers) {
      const u = fightable(safeFaction(a.faction)).find(
        (unit) => chiefKeys.has(unit.key) || unit.role === 'chief'
      );
      if (u && (a.counts[u.key] ?? 0) > 0) return u.key;
    }
    return undefined;
  }, [battle, state.attackers]);

  const overallTargetOutcomes = useMemo(() => {
    if (!battle) return [];
    const items: { gid: number; text: string }[] = [];
    battle.result.waves.forEach((waveRes, wIdx) => {
      const attArmy = state.attackers[wIdx];
      const catUnit = fightable(safeFaction(attArmy.faction)).find((u) => u.role === 'siege');
      const catCount = catUnit ? (attArmy.counts[catUnit.key] ?? 0) : 0;
      if (catCount <= 0) return;
      const tc = attArmy.targetCount || 1;
      const targets = (attArmy.targets || [{ gid: 10, level: 20 }]).slice(0, tc);
      targets.forEach((target, tIdx) => {
        const finalLevel = waveRes.targets[tIdx] ?? target.level;
        const bldg = BUILDINGS.find((b) => b.gid === target.gid);
        const bldgName = bldg?.name || 'Building';
        const destroyed = finalLevel === 0;
        const prefix = state.attackers.length > 1 ? `Wave ${wIdx + 1}: ` : '';
        if (finalLevel < target.level) {
          items.push({
            gid: target.gid,
            text: `${prefix}Target #${tIdx + 1} (${bldgName}) damaged from level ${target.level} to ${finalLevel}${destroyed ? ' (destroyed)' : ''}.`,
          });
        } else {
          items.push({
            gid: target.gid,
            text: `${prefix}Target #${tIdx + 1} (${bldgName}) held firm at level ${target.level}.`,
          });
        }
      });
    });
    return items;
  }, [battle, state.attackers]);

  const attackerWavesToShow = isOverall
    ? state.attackers.map((army, idx) => ({ army, idx }))
    : activeWaveIdx !== null && state.attackers[activeWaveIdx]
    ? [{ army: state.attackers[activeWaveIdx], idx: activeWaveIdx }]
    : state.attackers.map((army, idx) => ({ army, idx }));

  const currentWaveAttArmy = activeWaveIdx !== null ? state.attackers[activeWaveIdx] : state.attackers[0];
  const currentWaveAttFaction = safeFaction(currentWaveAttArmy?.faction || 'embermark_dominion');
  const currentWaveAttUnits = fightable(currentWaveAttFaction);
  const wallBeforeWave = activeWaveIdx === null || activeWaveIdx === 0
    ? state.wallLevel
    : (battle ? battle.result.waves[activeWaveIdx - 1]?.wallLevel ?? state.wallLevel : state.wallLevel);
  const ramUnitInWave = currentWaveAttUnits.find((u) => u.role === 'ram');
  const ramsInWave = ramUnitInWave ? (currentWaveAttArmy?.counts[ramUnitInWave.key] ?? 0) : 0;
  const catUnitInWave = currentWaveAttUnits.find((u) => u.role === 'siege');
  const catsInWave = catUnitInWave ? (currentWaveAttArmy?.counts[catUnitInWave.key] ?? 0) : 0;
  const waveActiveTargets = (currentWaveAttArmy?.targets || [{ gid: 10, level: 20 }]).slice(
    0,
    currentWaveAttArmy?.targetCount ?? 1
  );
  const waveChiefsCount = useMemo(() => {
    if (activeWaveIdx !== null && battle && battle.result.waves[activeWaveIdx]) {
      const survivors = battle.result.waves[activeWaveIdx].attackerSurvivors;
      return survivors
        .filter((r) => chiefKeys.has(r.key))
        .reduce((sum, r) => sum + r.count, 0);
    }
    return currentWaveAttUnits
      .filter((u) => chiefKeys.has(u.key) || u.role === 'chief')
      .reduce((sum, u) => sum + (currentWaveAttArmy?.counts[u.key] ?? 0), 0);
  }, [battle, activeWaveIdx, currentWaveAttUnits, currentWaveAttArmy]);

  // Summary calculations for right-hand column:
  const enteringDefendersForWave = useMemo(() => {
    if (!battle) return state.defenders.flatMap(toRegiments);
    if (activeWaveIdx === null || activeWaveIdx === 0) return battle.defenders;
    return battle.result.waves[activeWaveIdx - 1]?.defenderSurvivors ?? battle.defenders;
  }, [battle, activeWaveIdx, state.defenders]);

  const attackerCost = battle
    ? isOverall
      ? battle.result.waves.reduce(
          (sum, wave, i) => sum + lossCost(battle.waveArmies[i], wave.attackerSurvivors),
          0
        )
      : activeWaveIdx !== null
      ? lossCost(battle.waveArmies[activeWaveIdx], battle.result.waves[activeWaveIdx].attackerSurvivors)
      : 0
    : 0;

  const defenderCost = battle
    ? isOverall
      ? lossCost(battle.defenders, battle.result.defenderSurvivors)
      : activeWaveIdx !== null
      ? lossCost(enteringDefendersForWave, battle.result.waves[activeWaveIdx].defenderSurvivors)
      : 0
    : 0;

  const damageCost = battle
    ? isOverall
      ? (() => {
          const wallDamage = Math.max(
            0,
            buildingCumulativeCost(31, state.wallLevel).total -
              buildingCumulativeCost(31, battle.result.wallLevel).total
          );
          const targetsDamage = battle.result.waves.reduce((sum, waveRes, waveI) => {
            const army = state.attackers[waveI];
            const tc = army?.targetCount || army?.targets?.length || 1;
            const targets = (army?.targets && army.targets.length > 0
              ? army.targets
              : [{ gid: 10, level: 20 }]).slice(0, tc);
            return (
              sum +
              waveRes.targets.reduce((wSum, finalLevel, tIdx) => {
                const t = targets[tIdx] ?? { gid: 10, level: 20 };
                const before = buildingCumulativeCost(t.gid, t.level).total;
                const after = buildingCumulativeCost(t.gid, finalLevel).total;
                return wSum + Math.max(0, before - after);
              }, 0)
            );
          }, 0);
          return wallDamage + targetsDamage;
        })()
      : activeWaveIdx !== null
      ? (() => {
          const waveRes = battle.result.waves[activeWaveIdx];
          const wallDamage = Math.max(
            0,
            buildingCumulativeCost(31, wallBeforeWave).total -
              buildingCumulativeCost(31, waveRes.wallLevel).total
          );
          const army = state.attackers[activeWaveIdx];
          const tc = army?.targetCount || army?.targets?.length || 1;
          const targets = (army?.targets && army.targets.length > 0
            ? army.targets
            : [{ gid: 10, level: 20 }]).slice(0, tc);
          const targetsDamage = waveRes.targets.reduce((wSum, finalLevel, tIdx) => {
            const t = targets[tIdx] ?? { gid: 10, level: 20 };
            const before = buildingCumulativeCost(t.gid, t.level).total;
            const after = buildingCumulativeCost(t.gid, finalLevel).total;
            return wSum + Math.max(0, before - after);
          }, 0);
          return wallDamage + targetsDamage;
        })()
      : 0
    : 0;

  // Offense / Defense summary points:
  const attPoints = useMemo(() => {
    if (!battle) return { i: 0, c: 0 };
    if (isOverall) {
      return battle.waveArmies.reduce(
        (acc, regs) => {
          const pts = offensePoints(regs);
          return { i: acc.i + pts.i, c: acc.c + pts.c };
        },
        { i: 0, c: 0 }
      );
    }
    if (activeWaveIdx !== null && battle.waveArmies[activeWaveIdx]) {
      return offensePoints(battle.waveArmies[activeWaveIdx]);
    }
    return { i: 0, c: 0 };
  }, [battle, isOverall, activeWaveIdx]);

  const defPoints = useMemo(() => {
    return defensePoints(enteringDefendersForWave);
  }, [enteringDefendersForWave]);

  const totalOffPoints = isOverall
    ? (battle ? battle.result.waves.reduce((sum, wave) => sum + wave.offPoints, 0) : 0)
    : (w?.offPoints ?? 0);

  const rawAttOff = attPoints.i + attPoints.c;
  const infRatio = rawAttOff > 0 ? attPoints.i / rawAttOff : 0.5;
  const cavRatio = rawAttOff > 0 ? attPoints.c / rawAttOff : 0.5;
  const blendedTroopDef = defPoints.i * infRatio + defPoints.c * cavRatio;

  const towerBonus = watchTowerBonus(villageFaction.key, state.wallLevel);
  const cityGuardBonus = Math.min(0.20, Math.max(0, state.cityGuards) * 0.01);
  const wallDefScale = 1 + towerBonus + cityGuardBonus;
  const flatDef = 10 + palaceFlatDef(state.palaceLevel) + watchTowerFlat(villageFaction.key, state.wallLevel);

  // Defense totals in summary table reflect troops only (blended defense against attacker composition):
  const totalDefPoints = isOverall
    ? (battle ? blendedTroopDef : (defPoints.i + defPoints.c > 0 ? blendedTroopDef : 0))
    : blendedTroopDef;



  const totalOffLossPct = battle
    ? isOverall
      ? battle.result.waves.reduce((n, wave, i) => n + unitsLost(battle.waveArmies[i], wave.attackerSurvivors), 0) /
        Math.max(1, battle.waveArmies.reduce((n, regs) => n + regs.reduce((s, r) => s + r.count, 0), 0))
      : (w?.offLosses ?? 0)
    : 0;

  const totalDefLossPct = battle
    ? isOverall
      ? unitsLost(battle.defenders, battle.result.defenderSurvivors) /
        Math.max(1, battle.defenders.reduce((s, r) => s + r.count, 0))
      : (w?.defLosses ?? 0)
    : 0;

  const attRes = useMemo(() => {
    if (!battle) return { wood: 0, clay: 0, iron: 0, crop: 0, total: 0, xp: 0 };
    if (isOverall) {
      return computeLossBreakdown(
        battle.waveArmies.flat(),
        battle.result.waves.flatMap((wave) => wave.attackerSurvivors)
      );
    }
    if (activeWaveIdx !== null && w) {
      return computeLossBreakdown(battle.waveArmies[activeWaveIdx], w.attackerSurvivors);
    }
    return { wood: 0, clay: 0, iron: 0, crop: 0, total: 0, xp: 0 };
  }, [battle, isOverall, activeWaveIdx, w]);

  const defRes = useMemo(() => {
    if (!battle) return { wood: 0, clay: 0, iron: 0, crop: 0, total: 0, xp: 0 };
    if (isOverall) {
      return computeLossBreakdown(battle.defenders, battle.result.defenderSurvivors);
    }
    if (activeWaveIdx !== null && w) {
      return computeLossBreakdown(enteringDefendersForWave, w.defenderSurvivors);
    }
    return { wood: 0, clay: 0, iron: 0, crop: 0, total: 0, xp: 0 };
  }, [battle, isOverall, activeWaveIdx, w, enteringDefendersForWave]);

  // Recruitment queue time lost (assuming level 20 training buildings)
  const attQueueSeconds = useMemo(() => {
    if (!battle) return 0;
    const computeQueueSecs = (before: Regiment[], after: Regiment[]) => {
      let secs = 0;
      before.forEach((r, i) => {
        const lost = Math.max(0, r.count - (after[i]?.count ?? 0));
        if (lost <= 0) return;
        for (const f of factions) {
          const u = f.units.find((unit) => unit.key === r.key);
          if (u) {
            const timePerUnit = effectiveTime(f, u, defaultModifiers);
            secs += lost * timePerUnit;
            break;
          }
        }
      });
      return secs;
    };

    if (isOverall) {
      return computeQueueSecs(
        battle.waveArmies.flat(),
        battle.result.waves.flatMap((wave) => wave.attackerSurvivors)
      );
    }
    if (activeWaveIdx !== null && w) {
      return computeQueueSecs(battle.waveArmies[activeWaveIdx], w.attackerSurvivors);
    }
    return 0;
  }, [battle, isOverall, activeWaveIdx, w]);

  const defQueueSeconds = useMemo(() => {
    if (!battle) return 0;
    const computeQueueSecs = (before: Regiment[], after: Regiment[]) => {
      let secs = 0;
      before.forEach((r, i) => {
        const lost = Math.max(0, r.count - (after[i]?.count ?? 0));
        if (lost <= 0) return;
        for (const f of factions) {
          const u = f.units.find((unit) => unit.key === r.key);
          if (u) {
            const timePerUnit = effectiveTime(f, u, defaultModifiers);
            secs += lost * timePerUnit;
            break;
          }
        }
      });
      return secs;
    };

    if (isOverall) {
      return computeQueueSecs(battle.defenders, battle.result.defenderSurvivors);
    }
    if (activeWaveIdx !== null && w) {
      return computeQueueSecs(enteringDefendersForWave, w.defenderSurvivors);
    }
    return 0;
  }, [battle, isOverall, activeWaveIdx, w, enteringDefendersForWave]);

  const totalLossCost = attackerCost + (defenderCost + damageCost);
  const offCostRatio = totalLossCost > 0 ? (attackerCost / totalLossCost) * 100 : 50;
  const defCostRatio = totalLossCost > 0 ? ((defenderCost + damageCost) / totalLossCost) * 100 : 50;

  return (
    <main className="cc-page">
      <div className="cc-layout">
        {/* Left column: Battle details on top, then Attackers, Village, Defenders */}
        <div className="cc-col-main">
          <section className="panel cc-details">
            <div className="cc-details__header">
              <div className="cc-details__title-group">
                <h2 className="panel__title">Battle Details</h2>
                <div className="cc-view-pills">
                  <button
                    type="button"
                    className={`pill pill--tiny ${isOverall ? 'pill--active' : ''}`}
                    onClick={() => setSelectedWave('overall')}
                  >
                    Overall
                  </button>
                  {state.attackers.map((_, i) => (
                    <button
                      key={i}
                      type="button"
                      className={`pill pill--tiny ${activeWaveIdx === i ? 'pill--active' : ''}`}
                      onClick={() => setSelectedWave(i)}
                    >
                      Wave {i + 1}
                    </button>
                  ))}
                </div>
              </div>
              <div className="cc-details__actions">
                <label className="cc-toggle" title="Show or hide survivors row in combat report">
                  <input
                    type="checkbox"
                    checked={showSurvivors}
                    onChange={(e) => setShowSurvivors(e.target.checked)}
                  />
                  <span>Show survivors</span>
                </label>
                <button
                  type="button"
                  className="pill pill--tiny cc-share-btn"
                  onClick={copyShareLink}
                  title="Copy shareable link with current armies and settings"
                  aria-label="Share combat configuration"
                >
                  {copied ? '✓ Copied!' : '🔗 Share'}
                </button>
              </div>
            </div>

            {/* Classic Travian 2.0 Style Combat Report */}
            <div className="cc-report-tables">
              {/* Offense Tables (All waves if overall, or selected wave) */}
              {attackerWavesToShow.map(({ army: attArmy, idx: aIdx }) => {
                const attFaction = safeFaction(attArmy?.faction || 'embermark_dominion');
                const attUnits = fightable(attFaction);
                const waveRes = battle?.result.waves[aIdx];
                const waveSurvivors = waveRes ? waveRes.attackerSurvivors : [];
                const waveTotalCount = attUnits.reduce((sum, u) => sum + (attArmy?.counts[u.key] ?? 0), 0);
                const waveTotalLost = attUnits.reduce((sum, u) => {
                  const count = attArmy?.counts[u.key] ?? 0;
                  const rem = waveRes ? (waveSurvivors.find((r) => r.key === u.key)?.count ?? 0) : count;
                  return sum + Math.max(0, count - rem);
                }, 0);
                const waveLossRatio = waveTotalCount > 0 ? waveTotalLost / waveTotalCount : 0;
                const waveCostLost = attUnits.reduce((sum, u) => {
                  const count = attArmy?.counts[u.key] ?? 0;
                  const rem = waveRes ? (waveSurvivors.find((r) => r.key === u.key)?.count ?? 0) : count;
                  const lost = Math.max(0, count - rem);
                  return sum + lost * (UNIT_COST.get(u.key) ?? 0);
                }, 0);
                const waveBounty = attUnits.reduce((sum, u) => {
                  const rem = waveRes ? (waveSurvivors.find((r) => r.key === u.key)?.count ?? 0) : 0;
                  return sum + rem * (u.capacity ?? 0);
                }, 0);

                return (
                  <div key={attArmy.id || aIdx} className="cc-report-table-wrap">
                    <div className="cc-report-table cc-report-table--off">
                      {/* Attacker Banner Bar (matching in-game report) */}
                      <div className="cc-report-banner cc-report-banner--off">
                        <div className="cc-report-banner__title">
                          <span className="cc-report-banner__icon">⚔️</span>
                          <span className="cc-report-table__side-label">
                            Offense{state.attackers.length > 1 ? ` · W${aIdx + 1}` : ''}
                            {attArmy?.type === 'siege' ? ' (Siege)' : attArmy?.type === 'raid' ? ' (Raid)' : ''}
                          </span>
                        </div>
                        <span
                          className="cc-report-banner__loss"
                          style={{ color: lossPctColor(waveLossRatio) }}
                        >
                          Loss: {pct(waveLossRatio)} · {compact(waveCostLost)} res
                        </span>
                      </div>

                      {/* Hidden text for screen-reader & test assertions */}
                      <div className="sr-only">
                        <span className="cc-report-table__side-sub">{attFaction.name}</span>
                        <span className="cc-report-table__row-hdr">Troops</span>
                        <span className="cc-report-table__row-hdr">💀 casualties</span>
                        {showSurvivors && <span className="cc-report-table__row-hdr">survivors</span>}
                      </div>

                      {/* 10 Unit Columns Grid */}
                      <div className="cc-report-units-grid">
                        {attUnits.map((u) => {
                          const count = attArmy?.counts[u.key] ?? 0;
                          const rem = waveRes ? (waveSurvivors.find((r) => r.key === u.key)?.count ?? 0) : count;
                          const lost = waveRes ? Math.max(0, count - rem) : 0;
                          const unitSmithy = u.noUpgrade
                            ? 0
                            : (attArmy?.levels?.[u.key] ?? attArmy?.smithy ?? 0);

                          return (
                            <div key={u.key} className="cc-report-unit-col">
                              {/* Row 1: Unit Icon (size 32) + Troops */}
                              <div
                                className="cc-report-cell cc-report-cell--troops"
                                title={`${u.name}: ${count.toLocaleString()} troops`}
                              >
                                <div className="cc-report-cell__icon-wrap">
                                  <UnitIcon
                                    unitRef={unitRef(attFaction.key, u.key)}
                                    size={28}
                                    mods={{ ...defaultModifiers, smithy: unitSmithy }}
                                  />
                                </div>
                                <span className={`cc-report-count ${count > 0 ? 'cc-report-count--active' : ''}`}>
                                  {count > 0 ? count.toLocaleString() : '0'}
                                </span>
                              </div>

                              {/* Row 2: Skull 💀 + Casualties */}
                              <div
                                className="cc-report-cell cc-report-cell--lost"
                                title={`${u.name} casualties: ${lost.toLocaleString()}`}
                              >
                                <div className="cc-report-cell__icon-wrap">
                                  <span className="cc-report-skull" role="img" aria-label="Casualties">💀</span>
                                </div>
                                <span className={`cc-report-count ${lost > 0 ? 'cc-report-loss' : ''}`}>
                                  {lost > 0 ? lost.toLocaleString() : '0'}
                                </span>
                              </div>

                              {/* Row 3: Survivors (if enabled) */}
                              {showSurvivors && (
                                <div
                                  className="cc-report-cell cc-report-cell--surv"
                                  title={`${u.name} survivors: ${rem.toLocaleString()}`}
                                >
                                  <div className="cc-report-cell__icon-wrap" aria-hidden="true" />
                                  <span className={`cc-report-count ${rem > 0 ? 'cc-report-count--active' : ''}`}>
                                    {rem > 0 ? rem.toLocaleString() : '0'}
                                  </span>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>

                      {/* Loot / Carry Capacity */}
                      <div className="cc-report-footer">
                        <div className="cc-report-bounty">
                          <img src={statIcon('capacity')} alt="Carry capacity" className="cc-report-icon" />
                          <span>Carry capacity: <strong>{waveBounty.toLocaleString()}</strong></span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}

              {/* In-game Combat Report Details (between Offense and Defense) */}
              <div className="cc-report-outcomes">
                <div className="cc-report-outcomes__title">
                  Details {isOverall ? '(All Waves)' : `(Wave ${(activeWaveIdx ?? 0) + 1})`}
                </div>
                <ul className="cc-report-outcomes__list">
                  {battle ? (
                    isOverall ? (
                      <>
                        {/* Watch Tower Overall */}
                        {state.wallLevel > battle.result.wallLevel ? (
                          <li className="cc-report-outcome-item">
                            <img src={buildingIcon('watch_tower')} alt="" className="cc-report-outcome-icon" />
                            <span>
                              Watch Tower damaged from level {state.wallLevel} to {battle.result.wallLevel}.{' '}
                              {battle.result.waves.length === 1 && battle.result.waves[0]?.wallDuringBattle !== undefined ? (
                                <>
                                  (
                                  <VirtualWatchTowerTrigger
                                    initialLevel={state.wallLevel}
                                    virtualLevel={battle.result.waves[0].wallDuringBattle}
                                    finalLevel={battle.result.wallLevel}
                                    factionKey={villageFaction.key}
                                    cityGuardBonus={cityGuardBonus}
                                  />
                                  )
                                </>
                              ) : battle.result.waves.length > 1 ? (
                                (() => {
                                  const ramWaves = battle.result.waves
                                    .map((waveRes, idx) => {
                                      const before = idx === 0 ? state.wallLevel : (battle.result.waves[idx - 1]?.wallLevel ?? state.wallLevel);
                                      return { idx: idx + 1, before, during: waveRes.wallDuringBattle, final: waveRes.wallLevel };
                                    })
                                    .filter((item) => item.before > 0 || item.during > 0);
                                  if (ramWaves.length === 1) {
                                    return (
                                      <>
                                        (
                                        <VirtualWatchTowerTrigger
                                          initialLevel={ramWaves[0].before}
                                          virtualLevel={ramWaves[0].during}
                                          finalLevel={ramWaves[0].final}
                                          factionKey={villageFaction.key}
                                          cityGuardBonus={cityGuardBonus}
                                        />
                                        )
                                      </>
                                    );
                                  } else if (ramWaves.length > 1) {
                                    return (
                                      <>
                                        (Virtual Watch Tower:{' '}
                                        {ramWaves.map((rw, i) => {
                                          const rwWallBonus = Math.round(watchTowerBonus(villageFaction.key, rw.during) * 1000) / 10;
                                          const rwGuardBonus = Math.round(cityGuardBonus * 1000) / 10;
                                          const rwTotalBonus = rwWallBonus + (rw.during > 0 ? rwGuardBonus : 0);
                                          return (
                                            <span key={rw.idx}>
                                              {i > 0 && ', '}
                                              <VirtualWatchTowerTrigger
                                                initialLevel={rw.before}
                                                virtualLevel={rw.during}
                                                finalLevel={rw.final}
                                                factionKey={villageFaction.key}
                                                cityGuardBonus={cityGuardBonus}
                                              >
                                                <span className="cc-dotted-term">
                                                  Wave {rw.idx} from {rw.before} to {rw.during} &mdash; +{rwTotalBonus % 1 === 0 ? rwTotalBonus : rwTotalBonus.toFixed(1)}%
                                                </span>
                                                <span className="cc-help-badge" aria-hidden="true">?</span>
                                              </VirtualWatchTowerTrigger>
                                            </span>
                                          );
                                        })}
                                        )
                                      </>
                                    );
                                  }
                                  return null;
                                })()
                              ) : null}
                            </span>
                          </li>
                        ) : totalRams > 0 ? (
                          <li className="cc-report-outcome-item">
                            <img src={buildingIcon('watch_tower')} alt="" className="cc-report-outcome-icon" />
                            <span>
                              Watch Tower held firm at level {battle.result.wallLevel}.
                              {battle.result.waves.length === 1 &&
                              battle.result.waves[0]?.wallDuringBattle !== undefined &&
                              battle.result.waves[0].wallDuringBattle !== state.wallLevel ? (
                                <>
                                  {' '}(
                                  <VirtualWatchTowerTrigger
                                    initialLevel={state.wallLevel}
                                    virtualLevel={battle.result.waves[0].wallDuringBattle}
                                    finalLevel={battle.result.wallLevel}
                                    factionKey={villageFaction.key}
                                    cityGuardBonus={cityGuardBonus}
                                  />
                                  )
                                </>
                              ) : null}
                            </span>
                          </li>
                        ) : null}

                        {/* Catapult targets across all waves */}
                        {overallTargetOutcomes.map((item, idx) => (
                          <li key={idx} className="cc-report-outcome-item">
                            <img src={buildingIcon(item.gid)} alt="" className="cc-report-outcome-icon" />
                            <span>{item.text}</span>
                          </li>
                        ))}

                        {/* Chief loyalty reduction across all waves */}
                        {totalChiefs > 0 && (
                          <li className="cc-report-outcome-item">
                            <img
                              src={chiefUnitKey ? unitIcon(chiefUnitKey) : statIcon('attack')}
                              alt=""
                              className="cc-report-outcome-icon"
                            />
                            <span>
                              The loyalty of the village was lowered by ~{totalChiefs * 20}%–
                              {totalChiefs * 25}% (by {totalChiefs}{' '}
                              {totalChiefs === 1 ? 'chief' : 'chiefs'}).
                            </span>
                          </li>
                        )}

                        {/* Trapper outcome across all waves */}
                        {(() => {
                          const totalTrapped = battle.result.waves.reduce((sum, wave) => sum + (wave.trappedTroops ?? 0), 0);
                          const totalLiberated = battle.result.waves.reduce((sum, wave) => sum + (wave.trappedLiberated ?? 0), 0);
                          const totalDied = battle.result.waves.reduce((sum, wave) => sum + (wave.trappedDied ?? 0), 0);
                          if (totalTrapped <= 0) return null;
                          return (
                            <li className="cc-report-outcome-item">
                              <img src={buildingIcon(36)} alt="" className="cc-report-outcome-icon" />
                              <span>
                                {totalLiberated > 0
                                  ? `${totalTrapped.toLocaleString()} troops were trapped; ${totalLiberated.toLocaleString()} were liberated (${totalDied.toLocaleString()} died in the fray).`
                                  : `${totalTrapped.toLocaleString()} troops were trapped and remain captured.`}
                              </span>
                            </li>
                          );
                        })()}

                        {!(state.wallLevel > battle.result.wallLevel) &&
                          !(totalRams > 0) &&
                          overallTargetOutcomes.length === 0 &&
                          !(totalChiefs > 0) &&
                          !battle.result.waves.some((wave) => (wave.trappedTroops ?? 0) > 0) && (
                            <li className="cc-report-outcome-none">
                              No siege damage, loyalty reduction, or trapped troops across the battle.
                            </li>
                          )}
                      </>
                    ) : w ? (
                      <>
                        {/* Watch Tower Wave */}
                        {wallBeforeWave > w.wallLevel ? (
                          <li className="cc-report-outcome-item">
                            <img src={buildingIcon('watch_tower')} alt="" className="cc-report-outcome-icon" />
                            <span>
                              Watch Tower damaged from level {wallBeforeWave} to {w.wallLevel}. (
                              <VirtualWatchTowerTrigger
                                initialLevel={wallBeforeWave}
                                virtualLevel={w.wallDuringBattle}
                                finalLevel={w.wallLevel}
                                factionKey={villageFaction.key}
                                cityGuardBonus={cityGuardBonus}
                              />
                              )
                            </span>
                          </li>
                        ) : ramsInWave > 0 ? (
                          <li className="cc-report-outcome-item">
                            <img src={buildingIcon('watch_tower')} alt="" className="cc-report-outcome-icon" />
                            <span>
                              Watch Tower held firm at level {w.wallLevel}.
                              {w.wallDuringBattle !== wallBeforeWave ? (
                                <>
                                  {' '}(
                                  <VirtualWatchTowerTrigger
                                    initialLevel={wallBeforeWave}
                                    virtualLevel={w.wallDuringBattle}
                                    finalLevel={w.wallLevel}
                                    factionKey={villageFaction.key}
                                    cityGuardBonus={cityGuardBonus}
                                  />
                                  )
                                </>
                              ) : ''}
                            </span>
                          </li>
                        ) : null}

                        {/* Catapult Target Outcomes for Wave */}
                        {catsInWave > 0 &&
                          waveActiveTargets.map((target, tIdx) => {
                            const finalLevel = w.targets[tIdx] ?? target.level;
                            const bldg = BUILDINGS.find((b) => b.gid === target.gid);
                            const bldgName = bldg?.name || 'Building';
                            const destroyed = finalLevel === 0;
                            return (
                              <li key={tIdx} className="cc-report-outcome-item">
                                <img src={buildingIcon(target.gid)} alt="" className="cc-report-outcome-icon" />
                                <span>
                                  {finalLevel < target.level ? (
                                    <>
                                      Target #{tIdx + 1} ({bldgName}) damaged from level {target.level} to{' '}
                                      {finalLevel}
                                      {destroyed ? ' (destroyed)' : ''}.
                                    </>
                                  ) : (
                                    <>
                                      Target #{tIdx + 1} ({bldgName}) held firm at level {target.level}.
                                    </>
                                  )}
                                </span>
                              </li>
                            );
                          })}

                        {/* Chief Loyalty Reduction for Wave */}
                        {waveChiefsCount > 0 && (
                          <li className="cc-report-outcome-item">
                            <img
                              src={
                                currentWaveAttUnits.find((u) => chiefKeys.has(u.key))
                                  ? unitIcon(currentWaveAttUnits.find((u) => chiefKeys.has(u.key))!.key)
                                  : statIcon('attack')
                              }
                              alt=""
                              className="cc-report-outcome-icon"
                            />
                            <span>
                              The loyalty of the village was lowered by ~{waveChiefsCount * 20}%–
                              {waveChiefsCount * 25}% (by {waveChiefsCount}{' '}
                              {waveChiefsCount === 1 ? 'chief' : 'chiefs'}).
                            </span>
                          </li>
                        )}

                        {/* Trapper outcome for this wave */}
                        {(w.trappedTroops ?? 0) > 0 && (
                          <li className="cc-report-outcome-item">
                            <img src={buildingIcon(36)} alt="" className="cc-report-outcome-icon" />
                            <span>
                              {(w.trappedLiberated ?? 0) > 0
                                ? `${(w.trappedTroops ?? 0).toLocaleString()} troops were trapped; ${(w.trappedLiberated ?? 0).toLocaleString()} were liberated (${(w.trappedDied ?? 0).toLocaleString()} died in the fray).`
                                : `${(w.trappedTroops ?? 0).toLocaleString()} troops were trapped and remain captured.`}
                            </span>
                          </li>
                        )}

                        {!(wallBeforeWave > w.wallLevel) &&
                          !(ramsInWave > 0) &&
                          !(catsInWave > 0) &&
                          !(waveChiefsCount > 0) &&
                          !((w.trappedTroops ?? 0) > 0) && (
                            <li className="cc-report-outcome-none">
                              No siege damage, loyalty reduction, or trapped troops in this wave.
                            </li>
                          )}
                      </>
                    ) : (
                      <li className="cc-report-outcome-none">
                        No siege damage or loyalty reduction in this wave.
                      </li>
                    )
                  ) : (
                    <li className="cc-report-outcome-none">
                      Assign attacker troops below to simulate combat outcomes.
                    </li>
                  )}
                </ul>
              </div>

              {/* Defense Tables (Every defender in state.defenders is shown!) */}
              {state.defenders.map((defArmy, dIdx) => {
                const defFaction = safeFaction(defArmy.faction);
                const defUnits = fightable(defFaction);

                const initialRegs = defenderArmiesRegs[dIdx] || [];
                let enteringRegs: Regiment[] = initialRegs;
                let survivingRegs: Regiment[] = initialRegs;

                if (battle) {
                  if (isOverall) {
                    enteringRegs = getDefenderRegs(battle.defenders, dIdx);
                    survivingRegs = getDefenderRegs(battle.result.defenderSurvivors, dIdx);
                  } else if (activeWaveIdx !== null) {
                    enteringRegs = activeWaveIdx === 0
                      ? getDefenderRegs(battle.defenders, dIdx)
                      : getDefenderRegs(battle.result.waves[activeWaveIdx - 1]?.defenderSurvivors, dIdx);
                    survivingRegs = getDefenderRegs(battle.result.waves[activeWaveIdx]?.defenderSurvivors, dIdx);
                  }
                }

                const defEnteringCount = defUnits.reduce((sum, u) => {
                  const baseCount = defArmy.counts[u.key] ?? 0;
                  return (
                    sum +
                    (battle
                      ? (enteringRegs.find((r) => r.key === u.key)?.count ??
                        (isOverall || activeWaveIdx === 0 ? baseCount : 0))
                      : baseCount)
                  );
                }, 0);
                const defTotalLost = defUnits.reduce((sum, u) => {
                  const baseCount = defArmy.counts[u.key] ?? 0;
                  const entering = battle
                    ? (enteringRegs.find((r) => r.key === u.key)?.count ??
                      (isOverall || activeWaveIdx === 0 ? baseCount : 0))
                    : baseCount;
                  const surviving = battle
                    ? (survivingRegs.find((r) => r.key === u.key)?.count ?? 0)
                    : 0;
                  return sum + Math.max(0, entering - surviving);
                }, 0);
                const defLossRatio = defEnteringCount > 0 ? defTotalLost / defEnteringCount : 0;
                const defCostLost = defUnits.reduce((sum, u) => {
                  const baseCount = defArmy.counts[u.key] ?? 0;
                  const entering = battle
                    ? (enteringRegs.find((r) => r.key === u.key)?.count ??
                      (isOverall || activeWaveIdx === 0 ? baseCount : 0))
                    : baseCount;
                  const surviving = battle
                    ? (survivingRegs.find((r) => r.key === u.key)?.count ?? 0)
                    : 0;
                  const lost = Math.max(0, entering - surviving);
                  return sum + lost * (UNIT_COST.get(u.key) ?? 0);
                }, 0);

                return (
                  <div key={defArmy.id || dIdx} className="cc-report-table-wrap">
                    <div className="cc-report-table cc-report-table--def">
                      {/* Defender Banner Bar (matching in-game report) */}
                      <div className="cc-report-banner cc-report-banner--def">
                        <div className="cc-report-banner__title">
                          <span className="cc-report-banner__icon">🛡️</span>
                          <span className="cc-report-table__side-label">
                            Defense{state.defenders.length > 1 ? ` · #${dIdx + 1}` : ''}
                          </span>
                        </div>
                        <span
                          className="cc-report-banner__loss"
                          style={{ color: lossPctColor(defLossRatio) }}
                        >
                          Loss: {pct(defLossRatio)} · {compact(defCostLost)} res
                        </span>
                      </div>

                      {/* Hidden text for screen-reader & test assertions */}
                      <div className="sr-only">
                        <span className="cc-report-table__side-sub">{defFaction.name}</span>
                        <span className="cc-report-table__row-hdr">Troops</span>
                        <span className="cc-report-table__row-hdr">💀 casualties</span>
                        {showSurvivors && <span className="cc-report-table__row-hdr">survivors</span>}
                      </div>

                      {/* 10 Unit Columns Grid */}
                      <div className="cc-report-units-grid">
                        {defUnits.map((u) => {
                          const baseCount = defArmy.counts[u.key] ?? 0;
                          const count = battle
                            ? (enteringRegs.find((r) => r.key === u.key)?.count ?? (isOverall || activeWaveIdx === 0 ? baseCount : 0))
                            : baseCount;
                          const entering = battle
                            ? (enteringRegs.find((r) => r.key === u.key)?.count ?? (isOverall || activeWaveIdx === 0 ? baseCount : 0))
                            : baseCount;
                          const surviving = battle
                            ? (survivingRegs.find((r) => r.key === u.key)?.count ?? 0)
                            : 0;
                          const lost = battle ? Math.max(0, entering - surviving) : 0;
                          const unitSmithy = u.noUpgrade
                            ? 0
                            : (defArmy.levels?.[u.key] ?? defArmy.smithy ?? 0);

                          return (
                            <div key={u.key} className="cc-report-unit-col">
                              {/* Row 1: Unit Icon (size 28) + Troops */}
                              <div
                                className="cc-report-cell cc-report-cell--troops"
                                title={`${u.name}: ${count.toLocaleString()} troops`}
                              >
                                <div className="cc-report-cell__icon-wrap">
                                  <UnitIcon
                                    unitRef={unitRef(defFaction.key, u.key)}
                                    size={28}
                                    mods={{ ...defaultModifiers, smithy: unitSmithy }}
                                  />
                                </div>
                                <span className={`cc-report-count ${count > 0 ? 'cc-report-count--active' : ''}`}>
                                  {count > 0 ? count.toLocaleString() : '0'}
                                </span>
                              </div>

                              {/* Row 2: Skull 💀 + Casualties */}
                              <div
                                className="cc-report-cell cc-report-cell--lost"
                                title={`${u.name} casualties: ${lost.toLocaleString()}`}
                              >
                                <div className="cc-report-cell__icon-wrap">
                                  <span className="cc-report-skull" role="img" aria-label="Casualties">💀</span>
                                </div>
                                <span className={`cc-report-count ${lost > 0 ? 'cc-report-loss' : ''}`}>
                                  {lost > 0 ? lost.toLocaleString() : '0'}
                                </span>
                              </div>

                              {/* Row 3: Survivors (if enabled) */}
                              {showSurvivors && (
                                <div
                                  className="cc-report-cell cc-report-cell--surv"
                                  title={`${u.name} survivors: ${surviving.toLocaleString()}`}
                                >
                                  <div className="cc-report-cell__icon-wrap" aria-hidden="true" />
                                  <span className={`cc-report-count ${surviving > 0 ? 'cc-report-count--active' : ''}`}>
                                    {surviving > 0 ? surviving.toLocaleString() : '0'}
                                  </span>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* Distinct Separator between Battle Details and Inputs */}
          <div className="cc-inputs-separator" role="separator">
            <div className="cc-inputs-separator__line" />
            <div className="cc-inputs-separator__badge">
              <span className="cc-inputs-separator__icon">⚙️</span>
              <span className="cc-inputs-separator__text">Combat Configuration & Armies</span>
            </div>
            <div className="cc-inputs-separator__line" />
          </div>

          {/* 1. Attackers */}
          <ArmyCard
            kind="off"
            title="Attackers"
            armies={state.attackers}
            controls={attackers}
          />

          {/* 2. The Village (in the middle) */}
          <section className="panel cc-village">
            <div className="cc-village__header">
              <div className="cc-village__title-group">
                <h2 className="panel__title">
                  <span className="cc-field-emoji" role="img" aria-label="Village">🏡</span>
                  The village
                </h2>
                <div className="cc-village__race-select">
                  <span className="sr-only">Village Race</span>
                  <FactionSelect
                    value={villageFaction.key}
                    onChange={(k) => set('villageFaction', k)}
                    ariaLabel="Village Race"
                  />
                </div>
              </div>
              <div className="cc-village__actions">
                <label className="cc-toggle">
                  <input
                    type="checkbox"
                    checked={state.morale}
                    onChange={(e) => set('morale', e.target.checked)}
                  />
                  Morale bonus
                </label>
              </div>
            </div>

            <div className="cc-village__grid">
              <NumberField
                icon={<img src={buildingIcon('watch_tower')} alt="" className="cc-field-icon" />}
                label="Watch Tower"
                value={state.wallLevel}
                max={20}
                onToggle={(next) => set('wallLevel', next)}
                onChange={(v) => set('wallLevel', v)}
              />

              <NumberField
                icon={<span className="cc-field-emoji" role="img" aria-label="City Guards">🛡️</span>}
                label="City Guards"
                value={state.cityGuards}
                max={20}
                min={0}
                onToggle={(next) => setState((p) => ({ ...p, cityGuards: next, isCity: next > 0 }))}
                onChange={(v) => setState((p) => ({ ...p, cityGuards: v, isCity: v > 0 }))}
              />

              <NumberField
                icon={<img src={buildingIcon(25)} alt="" className="cc-field-icon" />}
                label="Residence / Palace"
                value={state.palaceLevel}
                max={20}
                onToggle={(next) => set('palaceLevel', next)}
                onChange={(v) => set('palaceLevel', v)}
              />

              <NumberField
                icon={<img src={buildingIcon('stonemasons_lodge')} alt="" className="cc-field-icon" />}
                label="Stonemason"
                value={state.stonemason}
                max={20}
                onToggle={(next) => set('stonemason', next)}
                onChange={(v) => set('stonemason', v)}
              />

              {villageFaction.key === 'verdant_wardens' && (
                <NumberField
                  icon={<img src={buildingIcon(36)} alt="" className="cc-field-icon" />}
                  label="Trapper"
                  value={state.trapperLevel ?? 0}
                  max={20}
                  onToggle={(next) => set('trapperLevel', next)}
                  onChange={(v) => set('trapperLevel', v)}
                />
              )}

              <label className="ds-field cc-field--artifact">
                <span className="ds-field__label">
                  <span className="cc-field-title">
                    <span className="cc-field-emoji" role="img" aria-label="Durability artifact">🏆</span>
                    Durability artifact
                  </span>
                </span>
                <select
                  className="ds-field__input"
                  value={state.durabilityArtifact || 1}
                  onChange={(e) => set('durabilityArtifact', Number(e.target.value) || 1)}
                >
                  <option value="1">— (None)</option>
                  <option value="4">4× (Small)</option>
                  <option value="3">3× (Large)</option>
                  <option value="5">5× (Unique)</option>
                </select>
              </label>

              {state.morale && (
                <>
                  <NumberField
                    icon={<span className="cc-field-emoji" role="img" aria-label="Attacker pop">👥</span>}
                    label="Attacker pop"
                    value={state.attackerPop}
                    max={100_000}
                    allowKilo
                    onChange={(v) => set('attackerPop', v)}
                  />

                  <NumberField
                    icon={<span className="cc-field-emoji" role="img" aria-label="Defender pop">👥</span>}
                    label="Defender pop"
                    value={state.defenderPop}
                    max={100_000}
                    allowKilo
                    onChange={(v) => set('defenderPop', v)}
                  />
                </>
              )}
            </div>

            <div className="cc-village__footer">
              <div className="cc-village-summary">
                <div className="cc-village-stat">
                  <span className="cc-village-stat__label">Defense Bonus</span>
                  <span className="cc-village-stat__value">
                    +{((watchTowerBonus(villageFaction.key, state.wallLevel) + (state.cityGuards > 0 ? state.cityGuards * 0.01 : 0)) * 100).toFixed(1)}%
                  </span>
                  <span className="cc-village-stat__sub">
                    Tower lvl {state.wallLevel}
                    {state.cityGuards > 0 ? ` (+${state.cityGuards}% Guards)` : ''}
                  </span>
                </div>

                <div className="cc-village-stat">
                  <span className="cc-village-stat__label">Base Defense</span>
                  <span className="cc-village-stat__value">
                    +{watchTowerFlat(villageFaction.key, state.wallLevel) + (state.palaceLevel > 0 ? palaceFlatDef(state.palaceLevel) : 0)}
                  </span>
                  <span className="cc-village-stat__sub">
                    {watchTowerFlat(villageFaction.key, state.wallLevel)} Tower
                    {state.palaceLevel > 0 ? ` + ${palaceFlatDef(state.palaceLevel)} Palace` : ''}
                  </span>
                </div>

                <div className="cc-village-stat">
                  <span className="cc-village-stat__label">Wall vs Rams</span>
                  <span className="cc-village-stat__value">
                    {(watchTowerDurability(villageFaction.key) * (state.durabilityArtifact || 1) * durabilityFor(state.stonemason)).toFixed(1)}×
                  </span>
                  <span className="cc-village-stat__sub">
                    {villageFaction.name}
                    {state.stonemason > 0 ? ` (+${state.stonemason * 10}% stone)` : ''}
                    {state.durabilityArtifact > 1 ? ` (${state.durabilityArtifact}× art)` : ''}
                  </span>
                </div>

                <div className="cc-village-stat">
                  <span className="cc-village-stat__label">Buildings vs Catapults</span>
                  <span className="cc-village-stat__value">
                    {(durabilityFor(state.stonemason) * (state.durabilityArtifact || 1)).toFixed(1)}×
                  </span>
                  <span className="cc-village-stat__sub">
                    Stonemason lvl {state.stonemason}
                    {state.durabilityArtifact > 1 ? ` (${state.durabilityArtifact}× art)` : ''}
                  </span>
                </div>

                {villageFaction.key === 'verdant_wardens' && (state.trapperLevel ?? 0) > 0 && (
                  <div className="cc-village-stat">
                    <span className="cc-village-stat__label">Trapper Traps</span>
                    <span className="cc-village-stat__value">
                      {trapperCapacity(state.trapperLevel ?? 0)}
                    </span>
                    <span className="cc-village-stat__sub">
                      Trapper lvl {state.trapperLevel}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </section>

          {/* 3. Defenders (bottom) */}
          <ArmyCard
            kind="def"
            title="Defenders"
            caption="Every row stands in the same village and fights as one garrison."
            armies={state.defenders}
            controls={defenders}
          />
        </div>

        {/* Right column: Battle summaries & stray details */}
        <div className="cc-col-details">
          <section className="panel cc-summary-panel">
            <h2 className="panel__title">
              Battle Summary {isOverall ? '(Overall)' : `(Wave ${(activeWaveIdx ?? 0) + 1})`}
            </h2>

            {/* Side-by-side Summary Card Table */}
            <div className="cc-report-summary">
              <table className="cc-report-summary-table">
                <thead>
                  <tr>
                    <th>offense</th>
                    <th>defense</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>
                      {compact(attPoints.i)} <img src={statIcon('attack')} alt="Inf Off" className="cc-report-icon" />
                    </td>
                    <td>
                      {compact(defPoints.i)} <img src={statIcon('defense')} alt="Inf Def" className="cc-report-icon" />
                    </td>
                  </tr>
                  <tr>
                    <td>
                      {compact(attPoints.c)} <img src={statIcon('attack')} alt="Cav Off" className="cc-report-icon" />
                    </td>
                    <td>
                      {compact(defPoints.c)} <img src={statIcon('defense_cavalry')} alt="Cav Def" className="cc-report-icon" />
                    </td>
                  </tr>
                  <tr>
                    <td>
                      <strong>{compact(totalOffPoints)}</strong> <img src={statIcon('attack')} alt="Total Off" className="cc-report-icon" />
                    </td>
                    <td>
                      <BlendedDefenseTrigger
                        totalTroopDef={totalDefPoints}
                        defPoints={defPoints}
                        infRatio={infRatio}
                        cavRatio={cavRatio}
                        blendedTroopDef={blendedTroopDef}
                        flatDef={flatDef}
                        wallDefScale={wallDefScale}
                        towerBonus={towerBonus}
                        cityGuardBonus={cityGuardBonus}
                      >
                        <strong className="cc-dotted-term">{compact(totalDefPoints)}</strong>{' '}
                        <img src={statIcon('defense')} alt="Total Def" className="cc-report-icon" />
                        <span className="cc-help-badge" aria-hidden="true">?</span>
                      </BlendedDefenseTrigger>
                    </td>
                  </tr>
                  <tr className="cc-summary-divider">
                    <td colSpan={2}>
                      <span className="cc-hdr-emoji" role="img" aria-label="Casualties">💀</span> casualties
                    </td>
                  </tr>
                  <tr className="cc-summary-casualties">
                    <td style={{ color: lossPctColor(totalOffLossPct), fontWeight: 750 }}>{pct(totalOffLossPct)}</td>
                    <td style={{ color: lossPctColor(totalDefLossPct), fontWeight: 750 }}>{pct(totalDefLossPct)}</td>
                  </tr>
                  <tr className="cc-summary-divider">
                    <td colSpan={2}>
                      <span className="cc-hdr-emoji" role="img" aria-label="Resources">📦</span> resources lost
                    </td>
                  </tr>
                  {/* Offense Total vs Defender Troop Loss */}
                  <tr>
                    <td rowSpan={damageCost > 0 ? 2 : 1} style={{ verticalAlign: 'middle' }}>
                      <strong>{round(attRes.total)}</strong> <img src={statIcon('capacity')} alt="Total Offense Loss" className="cc-report-icon" />
                    </td>
                    <td>
                      <span>{round(defRes.total)}</span> <img src={statIcon('capacity')} alt="Defender Troops" className="cc-report-icon" />
                      <div className="cc-summary-breakdown-sub">troops</div>
                    </td>
                  </tr>
                  {/* Defender Building Damage if any */}
                  {damageCost > 0 && (
                    <tr className="cc-summary-sub-row">
                      <td>
                        <span>+{round(damageCost)}</span> <img src={statIcon('capacity')} alt="Building Damage" className="cc-report-icon" />
                        <div className="cc-summary-breakdown-sub">buildings & wall</div>
                      </td>
                    </tr>
                  )}
                  {/* Total Defender Loss Row */}
                  <tr className="cc-summary-total-row">
                    <td>
                      <span className="cc-summary-breakdown-sub">total loss</span>
                    </td>
                    <td>
                      <strong>{round(defRes.total + damageCost)}</strong> <img src={statIcon('capacity')} alt="Total Defender Loss" className="cc-report-icon" />
                      <div className="cc-summary-breakdown-sub">troops + buildings</div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Visual Comparative Loss Ratio Bar */}
            <div className="cc-loss-comparison-card">
              <div className="cc-loss-comparison-header">
                <span className="cc-loss-comparison-header--off">
                  ⚔️ Offense {offCostRatio.toFixed(1)}%
                </span>
                <span className="cc-loss-comparison-header--def">
                  Defense {defCostRatio.toFixed(1)}% 🛡️
                </span>
              </div>
              <div
                className="cc-loss-comparison-bar"
                role="progressbar"
                aria-label="Relative resource loss ratio"
                aria-valuenow={Math.round(offCostRatio)}
                aria-valuemin={0}
                aria-valuemax={100}
              >
                <div
                  className="cc-loss-comparison-bar__fill--off"
                  style={{ width: `${offCostRatio}%` }}
                />
                <div
                  className="cc-loss-comparison-bar__fill--def"
                  style={{ width: `${defCostRatio}%` }}
                />
              </div>
              <div className="cc-loss-comparison-sub">
                {round(attackerCost)} res vs {round(defenderCost + damageCost)} res
              </div>
            </div>

            {/* Recruitment Queue Time Lost Card */}
            <div className="cc-queue-time-card">
              <div className="cc-queue-time-header">
                <span role="img" aria-label="Queue time">⏳</span>
                <span>Recruitment Queue Lost (Lvl 20)</span>
              </div>
              <div className="cc-queue-time-grid">
                <div className="cc-queue-time-col cc-queue-time-col--off">
                  <span className="cc-queue-time-label">Offense Queue</span>
                  <span className="cc-queue-time-val">{formatTimeSeconds(attQueueSeconds)}</span>
                </div>
                <div className="cc-queue-time-col cc-queue-time-col--def">
                  <span className="cc-queue-time-label">Defense Queue</span>
                  <span className="cc-queue-time-val">{formatTimeSeconds(defQueueSeconds)}</span>
                </div>
              </div>
            </div>

            {/* Summary Cards */}
            <div className="cc-summary" style={{ marginTop: 8 }}>
              <div className="cc-summary__card cc-summary__card--off">
                <span className="cc-summary__label">Offense loss</span>
                <span className="cc-summary__value">{compact(attackerCost)}</span>
                <span className="cc-summary__sub">{round(attackerCost)} res</span>
              </div>
              <div className="cc-summary__card cc-summary__card--def">
                <span className="cc-summary__label">Defender troops</span>
                <span className="cc-summary__value">{compact(defenderCost)}</span>
                <span className="cc-summary__sub">{round(defenderCost)} res</span>
              </div>
              <div className="cc-summary__card">
                <span className="cc-summary__label">Building damage</span>
                <span className="cc-summary__value">{compact(damageCost)}</span>
                <span className="cc-summary__sub">{round(damageCost)} rebuild cost</span>
              </div>
              <div className="cc-summary__card cc-summary__card--def">
                <span className="cc-summary__label">Total defender loss</span>
                <span className="cc-summary__value">{compact(defenderCost + damageCost)}</span>
                <span className="cc-summary__sub">troops + buildings</span>
              </div>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}

interface SideControls {
  add: () => void;
  remove: (id: string) => void;
  move?: (id: string, direction: -1 | 1) => void;
  patch: (id: string, patch: Partial<Army>) => void;
  count: (id: string, unitKey: string, value: number) => void;
  level: (id: string, unitKey: string, value: number) => void;
  targetCount?: (id: string, count: number) => void;
  target?: (id: string, targetIdx: number, patch: Partial<CatapultTarget>) => void;
}

interface ArmyCardProps {
  kind: 'off' | 'def';
  title: string;
  caption?: string;
  armies: Army[];
  controls: SideControls;
}

function ArmyCard({
  kind,
  title,
  caption,
  armies,
  controls,
}: ArmyCardProps) {
  return (
    <section className={`panel cc-army cc-army--${kind}`}>
      <div className="cc-army__head">
        <h2 className="panel__title">
          <span className={`cc-army__icon cc-army__icon--${kind}`}>
            {kind === 'off' ? '⚔️' : '🛡️'}
          </span>
          {title}
        </h2>
        <button type="button" className="pill pill--tiny" onClick={controls.add}
          disabled={armies.length >= 12}>
          + Add {kind === 'off' ? 'wave' : 'defender'}
        </button>
      </div>

      <div className="cc-rows">
        {armies.map((army, index) => (
          <ArmyRow
            key={army.id}
            army={army}
            index={index}
            totalArmies={armies.length}
            kind={kind}
            removable={armies.length > 1}
            controls={controls}
          />
        ))}
      </div>

      {caption && <p className="hint hint--tight">{caption}</p>}
    </section>
  );
}

interface ArmyRowProps {
  army: Army;
  index: number;
  totalArmies: number;
  kind: 'off' | 'def';
  removable: boolean;
  controls: SideControls;
}

function ArmyRow({
  army,
  index,
  totalArmies,
  kind,
  removable,
  controls,
}: ArmyRowProps) {
  const faction = safeFaction(army.faction);
  const units = fightable(faction);
  const total = units.reduce((n, u) => n + (army.counts[u.key] ?? 0), 0);
  const cataUnit = units.find((u) => u.role === 'siege');
  const cataCount = cataUnit ? (army.counts[cataUnit.key] ?? 0) : 0;
  const hasCatapults = cataCount > 0;

  return (
    <div className="cc-row">
      <div className="cc-row__bar">
        {kind === 'off' ? (
          <div className="cc-row__index-group">
            <span className="cc-row__index" title={`Wave #${index + 1}`}>W{index + 1}</span>
            {totalArmies > 1 && (
              <div className="cc-row__reorder-btns">
                <button
                  type="button"
                  className="cc-row__order-btn"
                  disabled={index === 0}
                  title={`Move Wave ${index + 1} earlier`}
                  aria-label={`Move Wave ${index + 1} earlier`}
                  onClick={() => controls.move?.(army.id, -1)}
                >
                  ▲
                </button>
                <button
                  type="button"
                  className="cc-row__order-btn"
                  disabled={index === totalArmies - 1}
                  title={`Move Wave ${index + 1} later`}
                  aria-label={`Move Wave ${index + 1} later`}
                  onClick={() => controls.move?.(army.id, 1)}
                >
                  ▼
                </button>
              </div>
            )}
          </div>
        ) : (
          <span className="cc-row__index" title={`Defender #${index + 1}`}>{index + 1}</span>
        )}
        <div className="cc-row__faction-wrap">
          <FactionSelect
            value={faction.key}
            ariaLabel={`Row ${index + 1} faction`}
            onChange={(key) => controls.patch(army.id, { faction: key, counts: {}, levels: {} })}
          />

          {kind === 'off' && (
            <select
              className="cc-row__attack-type"
              value={army.type || 'attack'}
              aria-label={`Row ${index + 1} attack type`}
              onChange={(e) =>
                controls.patch(army.id, {
                  type: e.target.value as 'attack' | 'siege' | 'raid',
                })
              }
            >
              <option value="attack">Attack</option>
              <option value="siege">Siege (+25%)</option>
              <option value="raid">Raid</option>
            </select>
          )}
        </div>

        {kind === 'off' && faction.key === 'stormfang_clans' && (
          <label className="cc-row__brewery-num" title="Stormbrew Works (Brewery) level (0–20, +1% offense per level)">
            <img src={buildingIcon(35)} alt="" className="cc-field-icon" />
            <span>Brewery</span>
            <input
              type="number"
              min={0}
              max={20}
              className="cc-smithy-input"
              value={army.brewery ?? 0}
              aria-label={`Row ${index + 1} brewery`}
              onChange={(e) =>
                controls.patch(army.id, {
                  brewery: Math.min(20, Math.max(0, parseInt(e.target.value, 10) || 0)),
                })
              }
            />
          </label>
        )}

        <span className="cc-row__total">{total > 0 ? `${total.toLocaleString()} troops` : '—'}</span>
        {removable && (
          <button
            type="button"
            className="cc-row__remove"
            title={`Remove row ${index + 1}`}
            aria-label={`Remove ${kind === 'off' ? 'wave' : 'defender'} ${index + 1}`}
            onClick={() => {
              const label = kind === 'off' ? `Wave ${index + 1}` : `Defender #${index + 1}`;
              const confirmed =
                typeof window !== 'undefined' && typeof window.confirm === 'function'
                  ? window.confirm(`Are you sure you want to remove ${label}?`)
                  : true;
              if (confirmed) {
                controls.remove(army.id);
              }
            }}
          >
            ×
          </button>
        )}
      </div>

      <div className="cc-troops-container">
        <ul className="cc-troops">
          {units.map((unit) => {
            const count = army.counts[unit.key] ?? 0;
            const unitLevel = unit.noUpgrade ? 0 : (army.levels?.[unit.key] ?? army.smithy ?? 0);

            return (
              <li key={unit.key} className={`cc-troop ${count > 0 ? 'is-active' : ''}`}>
                <div className="cc-troop__head">
                  <div className="cc-troop__icon-box">
                    <button
                      type="button"
                      className="cc-troop__icon-btn"
                      title={unit.noUpgrade ? 'No upgrades' : `Click to toggle level (${unitLevel === 20 ? '0' : '20'})`}
                      disabled={Boolean(unit.noUpgrade)}
                      onClick={() => {
                        if (unit.noUpgrade) return;
                        const next = unitLevel === 20 ? 0 : 20;
                        controls.level(army.id, unit.key, next);
                      }}
                    >
                      <UnitIcon unitRef={unitRef(faction.key, unit.key)} size={22} />
                    </button>
                    <input
                      className="cc-troop__level"
                      type="number"
                      min={0}
                      max={23}
                      placeholder="0"
                      value={army.levels?.[unit.key] !== undefined ? army.levels[unit.key] : ''}
                      title={unit.noUpgrade ? 'No upgrades' : `${unit.name} level (0–23)`}
                      aria-label={`${unit.name} level`}
                      disabled={Boolean(unit.noUpgrade)}
                      onChange={(e) => {
                        const raw = e.target.value;
                        if (raw === '') {
                          const nextLevels = { ...(army.levels || {}) };
                          delete nextLevels[unit.key];
                          controls.patch(army.id, { levels: nextLevels });
                        } else {
                          controls.level(army.id, unit.key, Math.min(23, Math.max(0, Number(raw))));
                        }
                      }}
                    />
                  </div>
                  <span className="cc-troop__name" title={unit.name}>{unit.name}</span>
                </div>
                {/* Troop input with 'k' / 'm' support */}
                <KiloNumberInput
                  className="cc-troop__count"
                  value={count}
                  placeholder="0"
                  ariaLabel={`${unit.name}, row ${index + 1}`}
                  onChange={(val) => controls.count(army.id, unit.key, val)}
                />
              </li>
            );
          })}
        </ul>
      </div>

      {kind === 'off' && hasCatapults && (
        <div className="cc-cata-row">
          <div className="cc-cata-row__head">
            <div className="cc-cata-row__title">
              <img src={unitIcon(cataUnit ? cataUnit.key : 'dominion_catapult')} alt="" className="cc-field-icon" />
              <span>Catapult targets:</span>
            </div>
            <div className="cc-target-count-pills">
              {[1, 2].map((n) => (
                <button
                  key={n}
                  type="button"
                  className={`pill pill--tiny ${(army.targetCount ?? 1) === n ? 'pill--active' : ''}`}
                  onClick={() => controls.targetCount?.(army.id, n)}
                >
                  {n} {n === 1 ? 'target' : 'targets'}
                </button>
              ))}
            </div>
          </div>
          <div className="cc-targets-row">
            {Array.from({ length: army.targetCount ?? 1 }, (_, tIdx) => {
              const target = army.targets?.[tIdx] ?? { gid: 10, level: 20 };
              const bldg = BUILDINGS.find((b) => b.gid === target.gid);
              const maxLvl = bldg?.maxLevel ?? 20;
              return (
                <div key={tIdx} className="cc-target-card-compact">
                  <span className="cc-target-card-compact__badge">#{tIdx + 1}</span>
                  <select
                    className="ds-field__input cc-target-select"
                    value={target.gid}
                    aria-label={`Target #${tIdx + 1} building`}
                    onChange={(e) => {
                      const newGid = Number(e.target.value);
                      const newBldg = BUILDINGS.find((b) => b.gid === newGid);
                      const newMax = newBldg?.maxLevel ?? 20;
                      controls.target?.(army.id, tIdx, {
                        gid: newGid,
                        level: Math.min(target.level, newMax),
                      });
                    }}
                  >
                    {BUILDINGS.map((b) => (
                      <option key={b.gid} value={b.gid}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                  <label className="cc-target-lvl-label">
                    <span>Lvl</span>
                    <input
                      type="number"
                      min={0}
                      max={maxLvl}
                      className="ds-field__input cc-target-lvl-input"
                      value={target.level}
                      aria-label={`Target #${tIdx + 1} level`}
                      onChange={(e) =>
                        controls.target?.(army.id, tIdx, {
                          level: Math.min(maxLvl, Math.max(0, parseInt(e.target.value, 10) || 0)),
                        })
                      }
                    />
                  </label>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

interface NumberFieldProps {
  label: string;
  icon?: React.ReactNode;
  value: number;
  max: number;
  min?: number;
  step?: number;
  allowKilo?: boolean;
  onToggle?: (nextValue: number) => void;
  onChange: (value: number) => void;
}

function NumberField({
  label,
  icon,
  value,
  max,
  min = 0,
  step = 1,
  allowKilo = false,
  onToggle,
  onChange,
}: NumberFieldProps) {
  const handleToggle = (e: React.MouseEvent) => {
    if (!onToggle) return;
    e.preventDefault();
    e.stopPropagation();
    onToggle(value === max ? min : max);
  };

  return (
    <label className="ds-field">
      <span className="ds-field__label">
        <span
          className={`cc-field-title ${onToggle ? 'cc-field-title--toggle' : ''}`}
          title={onToggle ? `Click to toggle level (${value === max ? min : max})` : undefined}
          onClick={onToggle ? handleToggle : undefined}
          role={onToggle ? 'button' : undefined}
          tabIndex={onToggle ? 0 : undefined}
          onKeyDown={
            onToggle
              ? (e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onToggle(value === max ? min : max);
                  }
                }
              : undefined
          }
        >
          {icon}
          {label}
        </span>
      </span>
      {allowKilo ? (
        <KiloNumberInput
          className="ds-field__input"
          value={value}
          min={min}
          max={max}
          ariaLabel={label}
          onChange={(v) => onChange(Math.min(max, Math.max(min, v)))}
        />
      ) : (
        <input
          className="ds-field__input"
          type="number"
          min={min}
          max={max}
          step={step}
          value={value}
          aria-label={label}
          onChange={(e) => onChange(Math.min(max, Math.max(min, Number(e.target.value) || 0)))}
        />
      )}
    </label>
  );
}

const FORMULA_CARD_WIDTH = 320;
const FORMULA_CARD_HEIGHT = 290;

function placeFormulaCard(anchor: DOMRect, width = FORMULA_CARD_WIDTH, height = FORMULA_CARD_HEIGHT) {
  let left = anchor.left + anchor.width / 2 - width / 2;
  if (left + width > window.innerWidth - 12) left = window.innerWidth - width - 12;
  if (left < 12) left = 12;

  let top = anchor.bottom + 8;
  if (top + height > window.innerHeight - 12) {
    top = anchor.top - height - 8;
  }
  if (top < 12) top = 12;

  return { left, top };
}

interface VirtualWatchTowerTriggerProps {
  initialLevel: number;
  virtualLevel: number;
  finalLevel: number;
  factionKey?: string;
  cityGuardBonus?: number;
  children?: React.ReactNode;
}

function VirtualWatchTowerTrigger({
  initialLevel,
  virtualLevel,
  finalLevel,
  factionKey = 'verdant_wardens',
  cityGuardBonus = 0,
  children,
}: VirtualWatchTowerTriggerProps) {
  const wrapRef = useRef<HTMLSpanElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [pinned, setPinned] = useState(false);
  const [pos, setPos] = useState<{ left: number; top: number } | null>({ left: 0, top: 0 });
  const closeTimerRef = useRef<number | null>(null);

  const clearTimer = () => {
    if (closeTimerRef.current !== null) {
      window.clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  };

  const openPopover = () => {
    clearTimer();
    if (wrapRef.current) {
      setPos(placeFormulaCard(wrapRef.current.getBoundingClientRect(), 340, 240));
    } else {
      setPos({ left: 100, top: 100 });
    }
    setOpen(true);
  };

  const handleMouseEnter = () => {
    if (!pinned) openPopover();
  };

  const handleMouseLeave = () => {
    if (!pinned) {
      clearTimer();
      closeTimerRef.current = window.setTimeout(() => {
        setOpen(false);
      }, 180);
    }
  };

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (pinned && open) {
      setPinned(false);
      setOpen(false);
    } else {
      setPinned(true);
      openPopover();
    }
  };

  useEffect(() => {
    if (!open) return;
    const handlePointerDown = (e: MouseEvent | TouchEvent) => {
      const target = e.target as Node;
      if (wrapRef.current?.contains(target) || popoverRef.current?.contains(target)) {
        return;
      }
      setPinned(false);
      setOpen(false);
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setPinned(false);
        setOpen(false);
      }
    };
    document.addEventListener('pointerdown', handlePointerDown as any);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown as any);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open]);

  useEffect(() => {
    if (!open || !wrapRef.current) return;
    const reposition = () => {
      if (wrapRef.current) setPos(placeFormulaCard(wrapRef.current.getBoundingClientRect(), 340, 240));
    };
    reposition();
    window.addEventListener('scroll', reposition, true);
    window.addEventListener('resize', reposition);
    return () => {
      window.removeEventListener('scroll', reposition, true);
      window.removeEventListener('resize', reposition);
    };
  }, [open]);

  const guardBonus = Math.round((cityGuardBonus || 0) * 1000) / 10;
  const wallInitialBonus = Math.round(watchTowerBonus(factionKey, initialLevel) * 1000) / 10;
  const wallVirtualBonus = Math.round(watchTowerBonus(factionKey, virtualLevel) * 1000) / 10;
  const wallFinalBonus = Math.round(watchTowerBonus(factionKey, finalLevel) * 1000) / 10;

  const initialBonus = initialLevel > 0 ? wallInitialBonus + guardBonus : 0;
  const virtualBonus = virtualLevel > 0 ? wallVirtualBonus + guardBonus : 0;
  const finalBonus = finalLevel > 0 ? wallFinalBonus + guardBonus : 0;
  const formatBonus = (val: number) => (val % 1 === 0 ? val.toString() : val.toFixed(1));

  return (
    <span
      ref={wrapRef}
      className="cc-virtual-wall-trigger"
      tabIndex={0}
      role="button"
      aria-label="Virtual Watch Tower explanation"
      onClick={handleClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onFocus={openPopover}
      onBlur={() => {
        if (!pinned) setOpen(false);
      }}
    >
      {children ? (
        children
      ) : (
        <>
          <span className="cc-dotted-term">
            Virtual Watch Tower from {initialLevel} to {virtualLevel} &mdash; +{formatBonus(virtualBonus)}%
          </span>
          <span className="cc-help-badge" aria-hidden="true">?</span>
        </>
      )}
      {open &&
        pos &&
        createPortal(
          <div
            ref={popoverRef}
            className="cc-formula-popover"
            style={{ left: pos.left, top: pos.top, width: 320 }}
            onMouseEnter={() => {
              clearTimer();
              setOpen(true);
            }}
            onMouseLeave={handleMouseLeave}
          >
            <div className="cc-formula-popover__header">
              <span className="cc-formula-popover__icon">🧱</span>
              <div>
                <h4 className="cc-formula-popover__title">Virtual Watch Tower</h4>
                <div className="cc-formula-popover__sub">Combat fortification level</div>
              </div>
              <button
                type="button"
                className="cc-formula-popover__close"
                aria-label="Close"
                onClick={(e) => {
                  e.stopPropagation();
                  setPinned(false);
                  setOpen(false);
                }}
              >
                &times;
              </button>
            </div>

            <div className="cc-formula-popover__body">
              <div className="cc-formula-popover__block" style={{ fontSize: '11.5px', lineHeight: 1.35, color: 'var(--text-muted)' }}>
                <div>• <strong>Pre-combat:</strong> Rams drop tower to Lvl {virtualLevel}, setting defense (+{formatBonus(virtualBonus)}%).</div>
                <div style={{ marginTop: '3px' }}>• <strong>Post-combat:</strong> Rams & battle ratio set final Lvl {finalLevel}.</div>
              </div>

              <div className="cc-formula-popover__block">
                <div className="cc-formula-popover__section-title">Wall Levels in Battle</div>
                <div className="cc-formula-popover__row">
                  <span>Initial:</span>
                  <span className="cc-formula-popover__val">Lvl {initialLevel} (+{formatBonus(initialBonus)}%)</span>
                </div>
                <div className="cc-formula-popover__row" style={{ color: 'var(--brand, #e6a23c)', fontWeight: 600 }}>
                  <span>Virtual (in combat):</span>
                  <span className="cc-formula-popover__val">Lvl {virtualLevel} (+{formatBonus(virtualBonus)}%)</span>
                </div>
                <div className="cc-formula-popover__row">
                  <span>Final (after battle):</span>
                  <span className="cc-formula-popover__val">Lvl {finalLevel} (+{formatBonus(finalBonus)}%)</span>
                </div>
                {guardBonus > 0 && (
                  <div style={{ fontSize: '10.5px', color: 'var(--text-faint)', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 4, marginTop: 4 }}>
                    Includes +{formatBonus(guardBonus)}% City Guards (active while tower stands)
                  </div>
                )}
              </div>
            </div>
          </div>,
          document.body
        )}
    </span>
  );
}

interface BlendedDefenseTriggerProps {
  children: React.ReactNode;
  totalTroopDef: number;
  defPoints: { i: number; c: number };
  infRatio: number;
  cavRatio: number;
  blendedTroopDef: number;
  flatDef: number;
  wallDefScale: number;
  towerBonus: number;
  cityGuardBonus: number;
}

function BlendedDefenseTrigger({
  children,
  totalTroopDef,
  defPoints,
  infRatio,
  cavRatio,
  blendedTroopDef,
  flatDef,
  wallDefScale,
}: BlendedDefenseTriggerProps) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [pinned, setPinned] = useState(false);
  const [pos, setPos] = useState<{ left: number; top: number } | null>({ left: 0, top: 0 });
  const closeTimerRef = useRef<number | null>(null);

  const clearTimer = () => {
    if (closeTimerRef.current !== null) {
      window.clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  };

  const openPopover = () => {
    clearTimer();
    if (wrapRef.current) {
      setPos(placeFormulaCard(wrapRef.current.getBoundingClientRect(), 340, 290));
    } else {
      setPos({ left: 100, top: 100 });
    }
    setOpen(true);
  };

  const handleMouseEnter = () => {
    if (!pinned) openPopover();
  };

  const handleMouseLeave = () => {
    if (!pinned) {
      clearTimer();
      closeTimerRef.current = window.setTimeout(() => {
        setOpen(false);
      }, 180);
    }
  };

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (pinned && open) {
      setPinned(false);
      setOpen(false);
    } else {
      setPinned(true);
      openPopover();
    }
  };

  useEffect(() => {
    if (!open) return;
    const handlePointerDown = (e: MouseEvent | TouchEvent) => {
      const target = e.target as Node;
      if (wrapRef.current?.contains(target) || popoverRef.current?.contains(target)) {
        return;
      }
      setPinned(false);
      setOpen(false);
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setPinned(false);
        setOpen(false);
      }
    };
    document.addEventListener('pointerdown', handlePointerDown as any);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown as any);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open]);

  useEffect(() => {
    if (!open || !wrapRef.current) return;
    const reposition = () => {
      if (wrapRef.current) setPos(placeFormulaCard(wrapRef.current.getBoundingClientRect(), 340, 290));
    };
    reposition();
    window.addEventListener('scroll', reposition, true);
    window.addEventListener('resize', reposition);
    return () => {
      window.removeEventListener('scroll', reposition, true);
      window.removeEventListener('resize', reposition);
    };
  }, [open]);

  return (
    <div
      ref={wrapRef}
      className="cc-formula-trigger"
      tabIndex={0}
      role="button"
      aria-label="Blended defense breakdown"
      onClick={handleClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onFocus={openPopover}
      onBlur={() => {
        if (!pinned) setOpen(false);
      }}
    >
      {children}
      {open &&
        pos &&
        createPortal(
          <div
            ref={popoverRef}
            className="cc-formula-popover"
            style={{ left: pos.left, top: pos.top, width: 340 }}
            onMouseEnter={() => {
              clearTimer();
              setOpen(true);
            }}
            onMouseLeave={handleMouseLeave}
          >
            <div className="cc-formula-popover__header">
              <span className="cc-formula-popover__icon">🛡️</span>
              <div>
                <h4 className="cc-formula-popover__title">Garrison Troop Defense (Blended)</h4>
                <div className="cc-formula-popover__sub">Defenders adapt to attacker composition</div>
              </div>
              <button
                type="button"
                className="cc-formula-popover__close"
                aria-label="Close"
                onClick={(e) => {
                  e.stopPropagation();
                  setPinned(false);
                  setOpen(false);
                }}
              >
                &times;
              </button>
            </div>

            <div className="cc-formula-popover__body">
              {/* 1. Attacker Composition */}
              <div className="cc-formula-popover__block">
                <div className="cc-formula-popover__section-title">1. Attacker Composition</div>
                <div className="cc-formula-popover__ratio-bar">
                  <div
                    className="cc-formula-popover__ratio-seg cc-formula-popover__ratio-seg--inf"
                    style={{ width: `${Math.max(14, Math.min(86, infRatio * 100))}%` }}
                  >
                    <span>🗡️ {(infRatio * 100).toFixed(1)}% Inf</span>
                  </div>
                  <div
                    className="cc-formula-popover__ratio-seg cc-formula-popover__ratio-seg--cav"
                    style={{ width: `${100 - Math.max(14, Math.min(86, infRatio * 100))}%` }}
                  >
                    <span>🏇 {(cavRatio * 100).toFixed(1)}% Cav</span>
                  </div>
                </div>
              </div>

              {/* 2. Garrison Troop Defense */}
              <div className="cc-formula-popover__block">
                <div className="cc-formula-popover__section-title">2. Garrison Troop Defense</div>
                <div className="cc-formula-popover__row">
                  <span>Infantry Defense:</span>
                  <span className="cc-formula-popover__val">
                    {round(defPoints.i).toLocaleString()} × {(infRatio * 100).toFixed(1)}%
                  </span>
                </div>
                <div className="cc-formula-popover__row">
                  <span>Cavalry Defense:</span>
                  <span className="cc-formula-popover__val">
                    {round(defPoints.c).toLocaleString()} × {(cavRatio * 100).toFixed(1)}%
                  </span>
                </div>
                <div className="cc-formula-popover__subtotal">
                  <span>Blended Troop Def:</span>
                  <strong>{round(blendedTroopDef).toLocaleString()}</strong>
                </div>
              </div>

              {/* Total Troop Defense */}
              <div className="cc-formula-popover__total-row">
                <span>Total Troop Defense:</span>
                <span className="cc-formula-popover__total-val">
                  {round(totalTroopDef).toLocaleString()}
                </span>
              </div>

              {/* Fortifications Note */}
              <div className="cc-formula-popover__block" style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                <span>
                  🏰 Fortifications (Watch Tower ×{wallDefScale.toFixed(3)} and +{round(flatDef).toLocaleString()} base def) scale troop strength during casualty resolution.
                </span>
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}
