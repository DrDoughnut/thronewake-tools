/**
 * CP Build-Order Optimizer Engine for Thronewake
 * 
 * Algorithm & optimization foundations adapted from Qira95's Kingdom Optimizer:
 * https://github.com/Qira95/kingdomoptimizer
 * 
 * Customized for Thronewake game mechanics, building catalog, city CP formulas,
 * faction requirements, and single universal watch tower.
 */

import {
  BUILDINGS,
  BUILDINGS_BY_GID,
  FACTION_TRIBE_MAP,
  type CatalogBuilding,
} from '../data/buildingCatalog';

export const PLUS = false; // Standard storage capacity (no Plus +25% storage bonus)
export const BASE_STORAGE = 800; // village base storage capacity
export const NO_CP_SENTINEL = 9999999999999;

export const WAREHOUSE_GID = 10;
export const GRANARY_GID = 11;
export const MAIN_BUILDING_GID = 15;
export const RESIDENCE_GID = 25;
export const PALACE_GID = 26;
export const HERBALIST_GID = 46;
export const RESOURCE_FIELD_GIDS = new Set([1, 2, 3, 4]);

// Dedicated positions: Rally point (16), Watch Tower (31)
export const DEDICATED_SLOT_GIDS = new Set([16, 31]);

export const BASE_BUILDING_SLOTS = 20;
// Herbalist (46), Warehouse (10), Granary (11), Cranny (23), Trapper (36)
export const MULTI_INSTANCE_GIDS = new Set([10, 11, 23, 36, 46]);

export const FIELD_SLOTS = 18;
export const CITY_CP = 200;
export const CAPITAL_CITY_CP = 500;

export interface VillageBuilding {
  id: string;
  gid: number;
  level: number;
}

export interface VillageState {
  id: string;
  name: string;
  faction: string; // 'embermark_dominion' | 'stormfang_clans' | 'vaeloria'
  isCapital: boolean;
  isCity: boolean;
  fieldLevel: number; // 0-20
  extensionSlots: number; // 0+
  buildings: VillageBuilding[];
}

export function occupiesSharedSlot(gid: number): boolean {
  return !DEDICATED_SLOT_GIDS.has(gid);
}

export function usedBuildingSlots(village: VillageState): number {
  const singleTypes = new Set<number>();
  let multiCopies = 0;
  for (const b of village.buildings) {
    if (!occupiesSharedSlot(b.gid)) continue;
    if (MULTI_INSTANCE_GIDS.has(b.gid)) {
      multiCopies += 1;
    } else {
      singleTypes.add(b.gid);
    }
  }
  return singleTypes.size + multiCopies;
}

export function buildingSlotCapacity(village: VillageState): number {
  const extra = Math.max(0, village.extensionSlots || 0);
  return BASE_BUILDING_SLOTS + extra;
}

export function isBuildingAllowed(
  gid: number,
  context: {
    faction: string;
    isCapital: boolean;
    isCity: boolean;
    builtGids: Set<number>;
  }
): boolean {
  const building = BUILDINGS_BY_GID.get(gid);
  if (!building) return false;

  // Capital has Palace, Non-capital uses Residence
  if (gid === PALACE_GID && !context.isCapital) return false;
  if (gid === RESIDENCE_GID && context.isCapital) return false;

  const tribeId = FACTION_TRIBE_MAP[context.faction] || 1;

  for (const p of building.prerequisites) {
    switch (p.type) {
      case 'Tribe':
        if (p.vid && !p.vid.includes(tribeId)) return false;
        break;
      case 'Capital':
        if (!context.isCapital) return false;
        break;
      case 'City':
        if (!context.isCity) return false;
        break;
      case 'NotBuilding':
        if (typeof p.gid === 'number' && context.builtGids.has(p.gid)) return false;
        break;
      case 'WonderOfTheWorldVillage':
        return false;
      default:
        break;
    }
  }
  return true;
}

// CP & Population calculations (constant per day, speed does not scale CP)
const WOODCUTTER = BUILDINGS_BY_GID.get(1);
const FIELD_CP_BY_LEVEL = WOODCUTTER ? WOODCUTTER.levels.map((l) => l.cp) : [];
export const FIELD_MAX_LEVEL = FIELD_CP_BY_LEVEL.length;

export function fieldCp(level: number): number {
  if (!level || level < 1) return 0;
  const capped = Math.min(level, FIELD_MAX_LEVEL);
  return FIELD_CP_BY_LEVEL[capped - 1] || 0;
}

export function fieldPop(level: number): number {
  if (!level || level < 1) return 0;
  const capped = Math.min(level, FIELD_MAX_LEVEL);
  return WOODCUTTER && WOODCUTTER.levels[capped - 1] ? WOODCUTTER.levels[capped - 1].pop : 0;
}

export function villageBuildingCp(village: VillageState): number {
  let total = 0;
  for (const b of village.buildings) {
    const building = BUILDINGS_BY_GID.get(b.gid);
    if (!building || !b.level) continue;
    const capped = Math.min(b.level, building.maxLevel);
    if (capped > 0 && building.levels[capped - 1]) {
      total += building.levels[capped - 1].cp;
    }
  }
  return total;
}

export function villageFieldCp(village: VillageState): number {
  return fieldCp(village.fieldLevel || 0) * FIELD_SLOTS;
}

export function villageCityCp(village: VillageState): number {
  if (!village.isCity) return 0;
  const base = villageBuildingCp(village) + villageFieldCp(village);
  return 200 + Math.round(base * 0.25);
}

export function villageTotalCp(village: VillageState): number {
  return villageBuildingCp(village) + villageFieldCp(village) + villageCityCp(village);
}

export function villageBuildingPop(village: VillageState): number {
  let total = 0;
  for (const b of village.buildings) {
    const building = BUILDINGS_BY_GID.get(b.gid);
    if (!building || !b.level) continue;
    const capped = Math.min(b.level, building.maxLevel);
    if (capped > 0 && building.levels[capped - 1]) {
      total += building.levels[capped - 1].pop;
    }
  }
  return total;
}

export function villageFieldPop(village: VillageState): number {
  return fieldPop(village.fieldLevel || 0) * FIELD_SLOTS;
}

export function villageTotalPop(village: VillageState): number {
  return villageBuildingPop(village) + villageFieldPop(village);
}

export type OptimizerMetric = 'cp' | 'pop';

export interface CostEntry {
  gid: number;
  slug: string;
  name: string;
  level: number;
  wood: number;
  clay: number;
  iron: number;
  crop: number;
  levelCost: number;
  cpGain: number;
  popGain: number;
  gain: number;
  costPerGain: number;
  costPerCpGain: number;
  costPerPopGain: number;
  target?: string;
  levelCostWithRequirements?: number;
  gainWithRequirements?: number;
  cpGainWithRequirements?: number;
  popGainWithRequirements?: number;
  costPerGainWithRequirements?: number;
  costPerCpGainWithRequirements?: number;
  requirementCount?: number;
  missing?: CostEntry[];
  requirementsAdded?: boolean;
  totalCp?: number;
  totalPop?: number;
  totalGain?: number;
  totalCost?: number;
}

export interface OptimizerStep {
  gid: number;
  slug: string;
  name: string;
  level: number;
  levelCost: number;
  wood: number;
  clay: number;
  iron: number;
  crop: number;
  cpGain: number;
  popGain: number;
  gain: number;
  costPerGain: number;
  costPerCpGain: number;
  costPerPopGain: number;
  totalCp: number;
  totalPop: number;
  totalGain: number;
  totalCost: number;
  target?: string;
  isReqStep: boolean;
}

export function computeBuildOrder(
  buildingsList: CatalogBuilding[],
  {
    metric = 'cp',
    builtLevels = {},
    capacity = Infinity,
    extraOccupiedSlots = 0,
    isAllowed = () => true,
    validate = false,
  }: {
    metric?: OptimizerMetric;
    builtLevels?: Record<number, number>;
    capacity?: number;
    extraOccupiedSlots?: number;
    isAllowed?: (gid: number, builtGids: Set<number>) => boolean;
    validate?: boolean;
  } = {}
): OptimizerStep[] {
  const byGid = new Map(buildingsList.map((b) => [b.gid, b]));

  const domainBuildings = buildingsList.filter(
    (b) =>
      !RESOURCE_FIELD_GIDS.has(b.gid) &&
      !b.prerequisites.some((p) => p.type === 'WonderOfTheWorldVillage')
  );
  const domainGids = new Set(domainBuildings.map((b) => b.gid));

  const warehouseBuilding = byGid.get(WAREHOUSE_GID);
  const granaryBuilding = byGid.get(GRANARY_GID);
  const warehouseCap = [
    BASE_STORAGE,
    ...(warehouseBuilding ? warehouseBuilding.levels.map((l) => l.effects.storageWarehouse || 0) : []),
  ];
  const granaryCap = [
    BASE_STORAGE,
    ...(granaryBuilding ? granaryBuilding.levels.map((l) => l.effects.storageGranary || 0) : []),
  ];

  const requirementsByGid: Record<number, string[]> = {};
  for (const b of domainBuildings) {
    requirementsByGid[b.gid] = [];
    for (const p of b.prerequisites) {
      if (p.type !== 'Building' || typeof p.level !== 'number') continue;
      const gids = Array.isArray(p.gid) ? p.gid : [p.gid!];
      const chosen = gids.find((g) => domainGids.has(g));
      if (chosen !== undefined) {
        requirementsByGid[b.gid].push(`${chosen}:${p.level}`);
      }
    }
  }

  const costData: CostEntry[] = [];
  for (const b of domainBuildings) {
    b.levels.forEach((levelDetail, index) => {
      const levelCost = levelDetail.wood + levelDetail.clay + levelDetail.iron + levelDetail.crop;
      const cpGain = index ? levelDetail.cp - b.levels[index - 1].cp : levelDetail.cp;
      const popGain = index ? levelDetail.pop - b.levels[index - 1].pop : levelDetail.pop;
      const gain = metric === 'pop' ? popGain : cpGain;
      const costPerCpGain = cpGain ? levelCost / cpGain : NO_CP_SENTINEL;
      const costPerPopGain = popGain ? levelCost / popGain : NO_CP_SENTINEL;
      const costPerGain = gain ? levelCost / gain : NO_CP_SENTINEL;

      costData.push({
        gid: b.gid,
        slug: b.slug,
        name: b.name,
        level: levelDetail.level,
        wood: levelDetail.wood,
        clay: levelDetail.clay,
        iron: levelDetail.iron,
        crop: levelDetail.crop,
        levelCost,
        cpGain,
        popGain,
        gain,
        costPerGain,
        costPerCpGain,
        costPerPopGain,
      });
    });
  }

  costData.sort((a, b) => a.costPerGain - b.costPerGain);
  const catalog = new Map(costData.map((e) => [`${e.gid}:${e.level}`, e]));

  const built: string[] = [];
  const builtGids = new Set<number>();
  for (const [gidStr, level] of Object.entries(builtLevels)) {
    const g = Number(gidStr);
    if (!domainGids.has(g) || level < 1) continue;
    builtGids.add(g);
    for (let l = 1; l <= level; l += 1) {
      built.push(`${g}:${l}`);
    }
  }

  const occupied = new Set<number>([...builtGids].filter(occupiesSharedSlot));
  const initialBuilt = new Set(built);
  const buildOrder: CostEntry[] = [];

  function getStorageLevel(amount: number, cap: number[]): number {
    const index = cap.findIndex((e) => amount <= (PLUS ? e * 1.25 : e));
    return index === -1 ? cap.length - 1 : index;
  }

  function getCode(b: { gid: number; level: number }, offset = 0): string {
    return `${b.gid}:${b.level - offset}`;
  }

  function uniqueBuildings(list: CostEntry[]): CostEntry[] {
    const seen = new Set<string>();
    const result: CostEntry[] = [];
    for (const item of list) {
      const code = getCode(item);
      if (!seen.has(code)) {
        seen.add(code);
        result.push(item);
      }
    }
    return result;
  }

  function findMissingRequirements(building: CostEntry): CostEntry[] {
    const required: string[] = [];

    // Storage requirements for THIS building level must be satisfied first
    const maxRes = Math.max(building.wood, building.clay, building.iron);
    const requiredWarehouse = getStorageLevel(maxRes, warehouseCap);
    const requiredGranary = getStorageLevel(building.crop, granaryCap);

    if (requiredWarehouse > 0) {
      required.push(`${WAREHOUSE_GID}:${requiredWarehouse}`);
    }
    if (requiredGranary > 0) {
      required.push(`${GRANARY_GID}:${requiredGranary}`);
    }

    // Previous building level
    if (building.level > 1) {
      required.push(getCode(building, 1));
    }

    // Structural building prerequisites
    const structReqs = requirementsByGid[building.gid] || [];
    for (const reqCode of structReqs) {
      required.push(reqCode);
    }

    const missingCodes = required.filter((code) => !built.includes(code));
    const missingBuildings: CostEntry[] = [];
    for (const code of missingCodes) {
      const requiredBuilding = catalog.get(code);
      if (!requiredBuilding) {
        throw new Error(`requirement ${code} not found in catalog`);
      }
      // Push prerequisites BEFORE the required building
      missingBuildings.push(...findMissingRequirements(requiredBuilding), requiredBuilding);
    }

    return uniqueBuildings(missingBuildings);
  }

  function chainFeasible(building: CostEntry, missing: CostEntry[]): boolean {
    const newTypes = new Set<number>();
    for (const bd of [building, ...missing]) {
      if (!isAllowed(bd.gid, builtGids)) {
        return false;
      }
      if (occupiesSharedSlot(bd.gid) && !occupied.has(bd.gid)) {
        newTypes.add(bd.gid);
      }
    }
    return occupied.size + extraOccupiedSlots + newTypes.size <= capacity;
  }

  function clearBuilding(building: CostEntry) {
    delete building.levelCostWithRequirements;
    delete building.gainWithRequirements;
    delete building.cpGainWithRequirements;
    delete building.popGainWithRequirements;
    delete building.costPerGainWithRequirements;
    delete building.costPerCpGainWithRequirements;
    delete building.requirementCount;
    delete building.missing;
    delete building.requirementsAdded;
  }

  function updateDependencies(building: CostEntry) {
    for (const buildingData of costData) {
      if (!buildingData.requirementsAdded || !buildingData.missing) continue;
      const depIndex = buildingData.missing.findIndex(
        (bd) => bd.gid === building.gid && bd.level === building.level
      );
      if (depIndex === -1) continue;
      buildingData.missing.splice(depIndex, 1);
      const requirementCostSum = buildingData.missing.reduce((sum, r) => sum + r.levelCost, 0);
      const requirementGainSum = buildingData.missing.reduce((sum, r) => sum + r.gain, 0);
      const requirementCPSum = buildingData.missing.reduce((sum, r) => sum + r.cpGain, 0);
      const requirementPopSum = buildingData.missing.reduce((sum, r) => sum + r.popGain, 0);

      buildingData.levelCostWithRequirements = buildingData.levelCost + requirementCostSum;
      buildingData.gainWithRequirements = buildingData.gain + requirementGainSum;
      buildingData.cpGainWithRequirements = buildingData.cpGain + requirementCPSum;
      buildingData.popGainWithRequirements = buildingData.popGain + requirementPopSum;

      buildingData.costPerGainWithRequirements =
        buildingData.gainWithRequirements > 0
          ? buildingData.levelCostWithRequirements / buildingData.gainWithRequirements
          : NO_CP_SENTINEL;

      buildingData.requirementCount = buildingData.missing.length;
    }
    costData.sort(
      (a, b) =>
        (a.costPerGainWithRequirements || a.costPerGain) -
        (b.costPerGainWithRequirements || b.costPerGain)
    );
  }

  function commit(building: CostEntry) {
    clearBuilding(building);
    updateDependencies(building);
    buildOrder.push(building);
    built.push(getCode(building));
    builtGids.add(building.gid);
    if (occupiesSharedSlot(building.gid) && !occupied.has(building.gid)) {
      occupied.add(building.gid);
    }
  }

  function forceBuild(building: CostEntry, target?: string) {
    if (built.includes(getCode(building))) {
      return;
    }
    let newTarget: string | undefined;
    if (!target) {
      newTarget = getCode(building);
    }
    const missing = findMissingRequirements(building);

    if (missing.length === 0) {
      if (target && target !== getCode(building)) {
        building.target = target;
      }
      commit(building);
    } else {
      missing.forEach((missingBuilding) => forceBuild(missingBuilding, target || newTarget));
      forceBuild(building, target || newTarget);
    }
  }

  function buildBuilding(building: CostEntry) {
    if (built.includes(getCode(building))) {
      return;
    }
    const missing = findMissingRequirements(building);

    if (!chainFeasible(building, missing)) {
      return;
    }

    if (missing.length === 0) {
      commit(building);
    } else {
      const requirementCostSum = missing.reduce((sum, r) => sum + r.levelCost, 0);
      const requirementGainSum = missing.reduce((sum, r) => sum + r.gain, 0);
      const requirementCPSum = missing.reduce((sum, r) => sum + r.cpGain, 0);
      const requirementPopSum = missing.reduce((sum, r) => sum + r.popGain, 0);

      building.levelCostWithRequirements = building.levelCost + requirementCostSum;
      building.gainWithRequirements = building.gain + requirementGainSum;
      building.cpGainWithRequirements = building.cpGain + requirementCPSum;
      building.popGainWithRequirements = building.popGain + requirementPopSum;

      building.costPerGainWithRequirements =
        building.gainWithRequirements > 0
          ? building.levelCostWithRequirements / building.gainWithRequirements
          : NO_CP_SENTINEL;

      building.requirementCount = missing.length;
      building.missing = missing;
      building.requirementsAdded = true;

      const topRank = costData[0]?.costPerGainWithRequirements || costData[0]?.costPerGain || Infinity;
      if (building.costPerGainWithRequirements <= topRank) {
        forceBuild(building);
      } else {
        costData.push(building);
        costData.sort(
          (a, b) =>
            (a.costPerGainWithRequirements || a.costPerGain) -
            (b.costPerGainWithRequirements || b.costPerGain)
        );
      }
    }
  }

  while (costData.length > 0) {
    const next = costData.shift();
    if (next) buildBuilding(next);
  }

  const result: OptimizerStep[] = buildOrder.map((b, i) => {
    const prevTotalCp = i ? buildOrder[i - 1].totalCp || 0 : 0;
    const prevTotalPop = i ? buildOrder[i - 1].totalPop || 0 : 0;
    const prevTotalGain = i ? buildOrder[i - 1].totalGain || 0 : 0;
    const prevTotalCost = i ? buildOrder[i - 1].totalCost || 0 : 0;

    const totalCp = b.cpGain + prevTotalCp;
    const totalPop = b.popGain + prevTotalPop;
    const totalGain = b.gain + prevTotalGain;
    const totalCost = b.levelCost + prevTotalCost;

    b.totalCp = totalCp;
    b.totalPop = totalPop;
    b.totalGain = totalGain;
    b.totalCost = totalCost;

    return {
      gid: b.gid,
      slug: b.slug,
      name: b.name,
      level: b.level,
      levelCost: b.levelCost,
      wood: b.wood,
      clay: b.clay,
      iron: b.iron,
      crop: b.crop,
      cpGain: b.cpGain,
      popGain: b.popGain,
      gain: b.gain,
      costPerGain: b.costPerGain,
      costPerCpGain: b.costPerCpGain,
      costPerPopGain: b.costPerPopGain,
      totalCp,
      totalPop,
      totalGain,
      totalCost,
      target: b.target,
      isReqStep: !b.gain && Boolean(b.target),
    };
  });

  if (validate) {
    const replayBuilt = new Set(initialBuilt);
    result.forEach((b, i) => {
      const required = [...(requirementsByGid[b.gid] || [])];
      if (b.level > 1) required.push(`${b.gid}:${b.level - 1}`);
      const g = getStorageLevel(b.crop, granaryCap);
      const w = getStorageLevel(Math.max(b.wood, b.clay, b.iron), warehouseCap);
      if (g > 0) required.push(`${GRANARY_GID}:${g}`);
      if (w > 0) required.push(`${WAREHOUSE_GID}:${w}`);
      for (const code of required) {
        if (!replayBuilt.has(code)) {
          throw new Error(`invariant violated at step ${i} (${b.slug}:${b.level}): missing ${code}`);
        }
      }
      replayBuilt.add(`${b.gid}:${b.level}`);
    });
  }

  return result;
}

export function getRecommendations(
  village: VillageState,
  metric: OptimizerMetric = 'cp'
): OptimizerStep[] {
  const builtLevels: Record<number, number> = {};
  for (const b of village.buildings) {
    builtLevels[b.gid] = Math.max(builtLevels[b.gid] || 0, b.level);
  }

  const distinctSharedTypes = Object.keys(builtLevels).filter((gid) =>
    occupiesSharedSlot(Number(gid))
  ).length;
  const extraOccupiedSlots = usedBuildingSlots(village) - distinctSharedTypes;

  const isAllowed = (gid: number, builtGids: Set<number>) =>
    isBuildingAllowed(gid, {
      faction: village.faction,
      isCapital: village.isCapital,
      isCity: village.isCity,
      builtGids,
    });

  return computeBuildOrder(BUILDINGS, {
    metric,
    builtLevels,
    capacity: buildingSlotCapacity(village),
    extraOccupiedSlots,
    isAllowed,
  });
}

// Compact URL encoding/decoding for sharing village build setups
export function encodeVillageCompact(village: VillageState): string {
  // Format: v1_name_faction_flags_fieldLevel_extSlots~b:gid,lvl~b:gid,lvl...
  // flags: bit 0: capital, bit 1: city
  const flagNum = (village.isCapital ? 1 : 0) | (village.isCity ? 2 : 0);
  const safeName = encodeURIComponent(village.name || 'Village 1').replace(/~/g, '%7E');
  const meta = [
    safeName,
    village.faction,
    flagNum,
    village.fieldLevel || 0,
    village.extensionSlots || 0,
  ].join(',');

  const bChunks = village.buildings.map((b) => `b:${b.gid},${b.level}`);
  return `v1_${meta}~${bChunks.join('~')}`;
}

export function decodeVillageCompact(compactStr: string): VillageState | null {
  if (!compactStr || !compactStr.startsWith('v1_')) return null;
  try {
    const raw = compactStr.slice(3);
    const [metaStr, ...bStrs] = raw.split('~');
    if (!metaStr) return null;
    const parts = metaStr.split(',');
    const name = decodeURIComponent(parts[0] || 'Village 1');
    const faction = parts[1] || 'embermark_dominion';
    const flagNum = Number(parts[2]) || 0;
    const isCapital = Boolean(flagNum & 1);
    const isCity = Boolean(flagNum & 2);
    const fieldLevel = Number(parts[3]) || 0;
    const extensionSlots = Number(parts[4]) || 0;

    const buildings: VillageBuilding[] = [];
    for (const bStr of bStrs) {
      if (!bStr.startsWith('b:')) continue;
      const [gStr, lStr] = bStr.slice(2).split(',');
      const gid = Number(gStr);
      const level = Number(lStr);
      if (gid && level && BUILDINGS_BY_GID.has(gid)) {
        buildings.push({
          id: 'b' + Math.random().toString(36).slice(2, 7),
          gid,
          level,
        });
      }
    }

    if (buildings.length === 0) {
      buildings.push({ id: 'b1', gid: MAIN_BUILDING_GID, level: 1 });
    }

    return {
      id: 'v1',
      name,
      faction,
      isCapital,
      isCity,
      fieldLevel,
      extensionSlots,
      buildings,
    };
  } catch {
    return null;
  }
}
