import { BUILDINGS_BY_GID, type CatalogBuilding } from './buildingCatalog';

// Main Building level 1-20 construction time reduction factors
const MB_FACTORS: Record<number, number> = {
  1: 1.0,
  2: 0.964,
  3: 0.929,
  4: 0.896,
  5: 0.864,
  6: 0.833,
  7: 0.803,
  8: 0.774,
  9: 0.746,
  10: 0.719,
  11: 0.693,
  12: 0.668,
  13: 0.644,
  14: 0.621,
  15: 0.598,
  16: 0.577,
  17: 0.556,
  18: 0.536,
  19: 0.517,
  20: 0.493,
};

export function getMainBuildingFactor(mbLevel: number): number {
  const lvl = Math.max(1, Math.min(20, Math.round(mbLevel)));
  return MB_FACTORS[lvl] || 1.0;
}

export function formatTimeSeconds(seconds: number | null | undefined): string {
  if (seconds === null || seconds === undefined || isNaN(seconds) || seconds <= 0) {
    return 'Instant';
  }
  const s = Math.round(seconds);
  const days = Math.floor(s / 86400);
  const hours = Math.floor((s % 86400) / 3600);
  const mins = Math.floor((s % 3600) / 60);
  const secs = s % 60;

  if (days > 0) {
    return `${days}d ${hours}h ${mins}m`;
  }
  if (hours > 0) {
    return `${hours}h ${mins}m ${secs}s`;
  }
  if (mins > 0) {
    return `${mins}m ${secs}s`;
  }
  return `${secs}s`;
}

export function formatEffectLabel(key: string, value: number | null | undefined): string {
  if (value === null || value === undefined) return '';

  switch (key) {
    case 'production1':
      return `+${value.toLocaleString()} Wood/hr`;
    case 'production2':
      return `+${value.toLocaleString()} Clay/hr`;
    case 'production3':
      return `+${value.toLocaleString()} Iron/hr`;
    case 'production4':
      return `+${value.toLocaleString()} Crop/hr`;
    case 'productionBoost1':
      return `+${Math.round(value * 100)}% Wood Production`;
    case 'productionBoost2':
      return `+${Math.round(value * 100)}% Clay Production`;
    case 'productionBoost3':
      return `+${Math.round(value * 100)}% Iron Production`;
    case 'productionBoost4':
      return `+${Math.round(value * 100)}% Crop Production`;
    case 'storageWarehouse':
      return `${value.toLocaleString()} Resource Capacity`;
    case 'storageGranary':
      return `${value.toLocaleString()} Crop Capacity`;
    case 'troopSpeedBoost':
      return `+${Math.round(value * 100)}% Speed (>20 fields)`;
    case 'buildingTime':
      return `${(value * 100).toFixed(1)}% Build Time (${(100 - value * 100).toFixed(1)}% faster)`;
    case 'troopVisibility':
      return value > 0 ? `Shows troop incoming units` : 'Rallying & targeting base';
    case 'merchants':
      return `${value} ${value === 1 ? 'Merchant' : 'Merchants'}`;
    case 'trainingTimeBarracks':
    case 'trainingTimeStable':
    case 'trainingTimeWorkshop':
    case 'trainingTimeResidence':
      return `${(value * 100).toFixed(1)}% Training Time`;
    case 'storageCranny':
      return `${value.toLocaleString()} Protected Res`;
    case 'storageCrannyGaul':
      return `${value.toLocaleString()} Protected (Gauls)`;
    case 'smallPartyTime':
      return `Small Party: ${formatTimeSeconds(value)}`;
    case 'largePartyTime':
      return `Large Party: ${formatTimeSeconds(value)}`;
    case 'slots':
      return `${value} Expansion ${value === 1 ? 'Slot' : 'Slots'}`;
    case 'merchantBoost':
      return `+${Math.round(value * 100)}% Merchant Capacity`;
    case 'merchantBoostRoman':
      return `+${Math.round(value * 100)}% (Romans)`;
    case 'durability':
      return `+${Math.round(value * 100)}% Building Durability`;
    case 'offBoost':
      return `+${Math.round(value * 100)}% Attack Power`;
    case 'partyTime':
      return `Celebration: ${formatTimeSeconds(value)}`;
    case 'traps':
      return `${value.toLocaleString()} Traps`;
    case 'reduceSupply':
      return `Reduces cavalry upkeep by -1`;
    case 'healTime':
      return `${(value * 100).toFixed(1)}% Healing Time`;
    case 'woundedCapacity':
      return `${value.toLocaleString()} Wounded Recovery`;
    case 'woundedCapacityPlus':
      return `${value.toLocaleString()} Wounded (Plus)`;
    default:
      return `${key}: ${value}`;
  }
}

export function describePrerequisites(building: CatalogBuilding): string[] {
  const reqs: string[] = [];

  for (const p of building.prerequisites) {
    if (p.type === 'Building') {
      const gids = Array.isArray(p.gid) ? p.gid : [p.gid!];
      const names = gids.map((g) => BUILDINGS_BY_GID.get(g)?.name || `Building #${g}`).join(' or ');
      reqs.push(`${names} Level ${p.level || 1}`);
    } else if (p.type === 'Tribe') {
      const tribeNames: Record<number, string> = {
        1: 'Embermark Dominion (Romans)',
        2: 'Stormfang Clans (Teutons)',
        3: 'Vaeloria (Gauls)',
      };
      const vids = p.vid || [];
      const names = vids.map((v) => tribeNames[v] || `Tribe #${v}`).join(', ');
      reqs.push(`Exclusive to ${names}`);
    } else if (p.type === 'Capital') {
      reqs.push('Capital only');
    } else if (p.type === 'City') {
      reqs.push('City only');
    } else if (p.type === 'Level11CapitalOrCity') {
      reqs.push('Level 11+ requires Capital or City');
    } else if (p.type === 'Level13Capital') {
      reqs.push('Level 13+ requires Capital');
    } else if (p.type === 'NotBuilding') {
      const gids = Array.isArray(p.gid) ? p.gid : [p.gid!];
      const names = gids.map((g) => BUILDINGS_BY_GID.get(g)?.name || `Building #${g}`).join(', ');
      reqs.push(`Cannot coexist with ${names}`);
    }
  }

  return reqs;
}
