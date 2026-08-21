import { describe, it, expect } from 'vitest';
import {
  computeBuildOrder,
  getRecommendations,
  villageBuildingCp,
  villageFieldCp,
  villageCityCp,
  villageTotalCp,
  villageBuildingPop,
  villageFieldPop,
  villageTotalPop,
  usedBuildingSlots,
  buildingSlotCapacity,
  encodeVillageCompact,
  decodeVillageCompact,
  isBuildingAllowed,
  type VillageState,
  MAIN_BUILDING_GID,
  WAREHOUSE_GID,
  PALACE_GID,
  RESIDENCE_GID,
} from './cpOptimizer';
import { BUILDINGS, BUILDINGS_BY_GID } from '../data/buildingCatalog';

describe('CP Build-Order Optimizer Engine', () => {
  const baseVillage: VillageState = {
    id: 'v1',
    name: 'Village 1',
    faction: 'embermark_dominion',
    isCapital: true,
    isCity: false,
    fieldLevel: 0,
    extensionSlots: 0,
    buildings: [{ id: 'b1', gid: MAIN_BUILDING_GID, level: 1 }],
  };

  it('computes build order satisfying all invariants (prereqs, storage, sequence)', () => {
    const buildOrder = computeBuildOrder(BUILDINGS, {
      builtLevels: { [MAIN_BUILDING_GID]: 1 },
      validate: true,
    });
    expect(buildOrder.length).toBeGreaterThan(50);
    expect(buildOrder[0].levelCost).toBeGreaterThan(0);
    expect(buildOrder[0].totalCp).toBeGreaterThan(0);

    const recs = getRecommendations(baseVillage);
    expect(recs.length).toBeGreaterThan(0);
  });

  it('enforces Capital has Palace and Non-Capital uses Residence', () => {
    const capitalAllowedPalace = isBuildingAllowed(PALACE_GID, {
      faction: 'embermark_dominion',
      isCapital: true,
      isCity: false,
      builtGids: new Set(),
    });
    const capitalAllowedResidence = isBuildingAllowed(RESIDENCE_GID, {
      faction: 'embermark_dominion',
      isCapital: true,
      isCity: false,
      builtGids: new Set(),
    });

    expect(capitalAllowedPalace).toBe(true);
    expect(capitalAllowedResidence).toBe(false);

    const nonCapitalAllowedPalace = isBuildingAllowed(PALACE_GID, {
      faction: 'embermark_dominion',
      isCapital: false,
      isCity: false,
      builtGids: new Set(),
    });
    const nonCapitalAllowedResidence = isBuildingAllowed(RESIDENCE_GID, {
      faction: 'embermark_dominion',
      isCapital: false,
      isCity: false,
      builtGids: new Set(),
    });

    expect(nonCapitalAllowedPalace).toBe(false);
    expect(nonCapitalAllowedResidence).toBe(true);
  });

  it('contains accurate Travian 4 Embassy costs and CP', () => {
    const embassy = BUILDINGS_BY_GID.get(18);
    expect(embassy).toBeTruthy();
    expect(embassy!.levels[0].cp).toBe(5);
    expect(embassy!.levels[0].wood).toBe(180);
    expect(embassy!.levels[0].clay).toBe(130);
    expect(embassy!.levels[0].iron).toBe(150);
    expect(embassy!.levels[0].crop).toBe(80);

    expect(embassy!.levels[19].cp).toBe(153);
    expect(embassy!.levels[19].wood).toBe(19600);
  });

  it('includes Expedition Camp (Hero Mansion) and excludes removed buildings', () => {
    // Expedition Camp exists (gid 37)
    const camp = BUILDINGS_BY_GID.get(37);
    expect(camp).toBeTruthy();
    expect(camp!.name).toBe('Expedition Camp');
    expect(camp!.levels[0].wood).toBe(700);

    // Only 1 wall in total: Watch Tower (gid 31) with Gaul Palisade costs
    const wall = BUILDINGS_BY_GID.get(31);
    expect(wall).toBeTruthy();
    expect(wall!.name).toBe('Watch Tower');
    expect(wall!.levels[0].wood).toBe(160);
    expect(wall!.levels[0].clay).toBe(100);
    expect(wall!.levels[0].iron).toBe(80);
    expect(wall!.levels[0].crop).toBe(60);

    // Removed duplicate walls and obsolete buildings
    expect(BUILDINGS_BY_GID.has(32)).toBe(false);
    expect(BUILDINGS_BY_GID.has(33)).toBe(false);
    expect(BUILDINGS_BY_GID.has(42)).toBe(false);
    expect(BUILDINGS_BY_GID.has(43)).toBe(false);
    expect(BUILDINGS_BY_GID.has(45)).toBe(false);
  });

  it('calculates village CP correctly including City flat +200 and +25% bonus', () => {
    const village: VillageState = {
      ...baseVillage,
      buildings: [
        { id: 'b1', gid: MAIN_BUILDING_GID, level: 5 }, // MB level 5 (3 CP)
        { id: 'b2', gid: 24, level: 1 }, // Town Hall level 1 (5 CP)
      ],
      fieldLevel: 5, // 18 fields * 2 CP = 36 CP
      isCity: true,
      isCapital: true,
    };

    const bCp = villageBuildingCp(village);
    expect(bCp).toBeGreaterThan(0);

    const fCp = villageFieldCp(village);
    expect(fCp).toBe(36);

    const baseSum = bCp + fCp;
    const expectedCityBonus = 200 + Math.round(baseSum * 0.25);

    const cCp = villageCityCp(village);
    expect(cCp).toBe(expectedCityBonus);

    const total = villageTotalCp(village);
    expect(total).toBe(baseSum + expectedCityBonus);
  });

  it('tracks building slot capacity with flexible extension counter and counts shared slots', () => {
    const village: VillageState = {
      ...baseVillage,
      buildings: [
        { id: 'b1', gid: MAIN_BUILDING_GID, level: 5 }, // shared slot
        { id: 'b2', gid: WAREHOUSE_GID, level: 10 },    // shared slot (multi-instance)
        { id: 'b3', gid: WAREHOUSE_GID, level: 5 },     // shared slot (2nd warehouse copy)
        { id: 'b4', gid: 16, level: 1 },                // Rally Point: dedicated slot
        { id: 'b5', gid: 31, level: 1 },                // Watch Tower: dedicated slot
      ],
      extensionSlots: 3,
    };

    expect(usedBuildingSlots(village)).toBe(3); // MB + 2 Warehouses
    expect(buildingSlotCapacity(village)).toBe(23); // 20 base + 3 extension
  });

  it('correctly round-trips village state in compact format for shareable links', () => {
    const village: VillageState = {
      id: 'v1',
      name: 'North Hold',
      faction: 'stormfang_clans',
      isCapital: false,
      isCity: true,
      fieldLevel: 8,
      extensionSlots: 2,
      buildings: [
        { id: 'b1', gid: MAIN_BUILDING_GID, level: 10 },
        { id: 'b2', gid: 22, level: 10 }, // Academy
        { id: 'b3', gid: 24, level: 5 },  // Town Hall
      ],
    };

    const encoded = encodeVillageCompact(village);
    expect(encoded).toContain('North%20Hold');
    expect(encoded).toContain('stormfang_clans');

    const decoded = decodeVillageCompact(encoded);
    expect(decoded).toBeTruthy();
    expect(decoded!.name).toBe('North Hold');
    expect(decoded!.faction).toBe('stormfang_clans');
    expect(decoded!.isCapital).toBe(false);
    expect(decoded!.isCity).toBe(true);
    expect(decoded!.fieldLevel).toBe(8);
    expect(decoded!.extensionSlots).toBe(2);
    expect(decoded!.buildings).toHaveLength(3);
    expect(decoded!.buildings.map((b) => b.gid)).toEqual([15, 22, 24]);
  });

  it('strictly requires and schedules Warehouse and Granary upgrades before any building whose cost exceeds current storage', () => {
    const buildOrder = computeBuildOrder(BUILDINGS, {
      builtLevels: { [MAIN_BUILDING_GID]: 1 },
    });

    const wh = BUILDINGS_BY_GID.get(WAREHOUSE_GID);
    const gr = BUILDINGS_BY_GID.get(11);
    const warehouseCap = [
      800,
      ...(wh ? wh.levels.map((l) => l.effects.storageWarehouse || 0) : []),
    ];
    const granaryCap = [
      800,
      ...(gr ? gr.levels.map((l) => l.effects.storageGranary || 0) : []),
    ];

    let currentWhLvl = 0;
    let currentGrLvl = 0;

    for (let i = 0; i < buildOrder.length; i++) {
      const step = buildOrder[i];
      const maxRes = Math.max(step.wood, step.clay, step.iron);
      const currentWhCapacity = warehouseCap[currentWhLvl] || 800;
      const currentGrCapacity = granaryCap[currentGrLvl] || 800;

      // Storage capacity for single warehouse (<= 80k) must strictly precede any building step
      if (maxRes <= 80000) {
        expect(maxRes).toBeLessThanOrEqual(currentWhCapacity);
      }
      if (step.crop <= 80000) {
        expect(step.crop).toBeLessThanOrEqual(currentGrCapacity);
      }

      if (step.gid === WAREHOUSE_GID) currentWhLvl = Math.max(currentWhLvl, step.level);
      if (step.gid === 11) currentGrLvl = Math.max(currentGrLvl, step.level);
    }

    // Verify Embassy Level 9 (1295 wood) specifically has Warehouse Level 2 scheduled before it
    const emb9Index = buildOrder.findIndex((s) => s.gid === 18 && s.level === 9);
    const wh2Index = buildOrder.findIndex((s) => s.gid === WAREHOUSE_GID && s.level === 2);
    expect(wh2Index).toBeGreaterThan(-1);
    expect(emb9Index).toBeGreaterThan(-1);
    expect(wh2Index).toBeLessThan(emb9Index);
  });

  it('correctly includes Trapper for Vaeloria, Stormbrew Works for Stormfang, and Riders Wells for Embermark', () => {
    // 1. Vaeloria -> Trapper (gid 36)
    const recsVaeloria = getRecommendations({
      ...baseVillage,
      faction: 'vaeloria',
    });
    const trapperStep = recsVaeloria.find((r) => r.gid === 36);
    expect(trapperStep).toBeTruthy();
    expect(trapperStep!.name).toBe('Trapper');
    // Scenario A: User added Stormbrew Works to their current village buildings
    const recsStormfangExisting = getRecommendations({
      ...baseVillage,
      faction: 'stormfang_clans',
      isCapital: true,
      extensionSlots: 0,
      buildings: [
        { id: 'b1', gid: MAIN_BUILDING_GID, level: 1 },
        { id: 'b2', gid: 35, level: 1 }, // Stormbrew Works Level 1
      ],
    });
    const brewStepsExisting = recsStormfangExisting.filter((r) => r.gid === 35);
    expect(brewStepsExisting.length).toBeGreaterThan(0);
    expect(brewStepsExisting[0].name).toBe('Stormbrew Works');

    // Scenario B: Starting from scratch with extension slots
    const recsStormfangScratch = getRecommendations({
      ...baseVillage,
      faction: 'stormfang_clans',
      isCapital: true,
      extensionSlots: 5,
    });
    const brewStepScratch = recsStormfangScratch.find((r) => r.gid === 35);
    expect(brewStepScratch).toBeTruthy();
    expect(brewStepScratch!.name).toBe('Stormbrew Works');

    // 3. Embermark Dominion -> Rider's Wells (gid 41)
    const recsEmbermark = getRecommendations({
      ...baseVillage,
      faction: 'embermark_dominion',
      buildings: [
        { id: 'b1', gid: MAIN_BUILDING_GID, level: 10 },
        { id: 'b2', gid: 20, level: 20 }, // Stable 20
        { id: 'b3', gid: 16, level: 10 }, // Rally Point 10
      ],
    });
    const wellsStep = recsEmbermark.find((r) => r.gid === 41);
    expect(wellsStep).toBeTruthy();
    expect(wellsStep!.name).toBe("Rider's Wells");
  });

  it('computes population metrics and optimizes build order for Population (res/Pop)', () => {
    const v: VillageState = {
      id: 'v1',
      name: 'Pop Village',
      faction: 'embermark_dominion',
      isCapital: false,
      isCity: false,
      fieldLevel: 5,
      extensionSlots: 0,
      buildings: [
        { id: 'b1', gid: MAIN_BUILDING_GID, level: 5 }, // MB 5 = 6 pop
        { id: 'b2', gid: 19, level: 3 }, // Barracks 3 = 6 pop
      ],
    };

    const bPop = villageBuildingPop(v);
    expect(bPop).toBe(14); // 6 (MB 5) + 8 (Barracks 3)

    const fPop = villageFieldPop(v);
    expect(fPop).toBeGreaterThan(0); // 18 fields * fieldPop(5)

    const totalPop = villageTotalPop(v);
    expect(totalPop).toBe(bPop + fPop);

    // Compute Pop-optimized build order
    const popRecs = getRecommendations(v, 'pop');
    expect(popRecs.length).toBeGreaterThan(0);

    // First recommendation should provide population gain or be a prerequisite
    const firstStep = popRecs[0];
    expect(firstStep.costPerPopGain).toBeLessThanOrEqual(popRecs[popRecs.length - 1].costPerPopGain);

    // Cranny gives 0 population, so it should not be scheduled before high-pop buildings
    const crannyIndex = popRecs.findIndex((r) => r.gid === 23);
    const mbIndex = popRecs.findIndex((r) => r.gid === MAIN_BUILDING_GID);
    if (crannyIndex !== -1 && mbIndex !== -1) {
      expect(mbIndex).toBeLessThan(crannyIndex);
    }
  });
});
