import { describe, expect, it } from 'vitest';
import {
  combineUtcDateAndTime,
  createRoomBackup,
  decodeCompactPlan,
  distanceBetween,
  encodeCompactPlan,
  enforceMaxSafeWindow,
  formatDateTime,
  formatLocalClock,
  formatLocalDateTime,
  isInSafeWindow,
  importPlanIntoMasterRoster,
  mergeTeamRoomData,
  migrateToMasterRoster,
  parseRoomBackup,
  parseThronewakeProfileClipboard,
  resolveSafeTime,
  routeIsPossible,
  safeChecks,
  safeSegments,
  safeWindowDurationMinutes,
  splitUtcDateAndTime,
  travelHours,
} from './operations';

describe('operation travel', () => {
  it('uses coordinate distance and the slowest troop speed', () => {
    expect(distanceBetween({ x: 0, y: 0 }, { x: 3, y: 4 })).toBe(5);
    expect(travelHours(12, {
      unitSpeed: 6,
      serverSpeed: 1,
      artifactMultiplier: 1,
      bannerfieldLevel: 20,
    })).toBe(2);
  });

  it('applies artifacts throughout and Bannerfield only after 20 fields', () => {
    const plain = travelHours(40, {
      unitSpeed: 5,
      serverSpeed: 1,
      artifactMultiplier: 1,
      bannerfieldLevel: 0,
    });
    const boosted = travelHours(40, {
      unitSpeed: 5,
      serverSpeed: 1,
      artifactMultiplier: 2,
      bannerfieldLevel: 5,
    });
    expect(plain).toBe(8);
    // First 20 at speed 10 (2h), remaining 20 at speed 20 (1h).
    expect(boosted).toBe(3);
  });
});

describe('safe time', () => {
  const at = (hour: number, minute = 0) => new Date(Date.UTC(2026, 7, 15, hour, minute));

  it('handles same-day and overnight windows', () => {
    expect(isInSafeWindow(at(12), { enabled: true, start: 600, end: 840 })).toBe(true);
    expect(isInSafeWindow(at(9), { enabled: true, start: 600, end: 840 })).toBe(false);
    expect(isInSafeWindow(at(23), { enabled: true, start: 1320, end: 360 })).toBe(true);
    expect(isInSafeWindow(at(4), { enabled: true, start: 1320, end: 360 })).toBe(true);
    expect(safeSegments({ enabled: true, start: 1320, end: 360 })).toEqual([
      { start: 0, end: 360 },
      { start: 1320, end: 1440 },
    ]);
  });

  it('reports each of the three blocking checks separately', () => {
    const checks = safeChecks(
      at(23),
      at(12),
      { enabled: true, start: 1320, end: 360 },
      { enabled: true, start: 660, end: 780 },
    );
    expect(checks).toEqual({
      landDefender: true,
      sendAttacker: true,
      sendDefender: false,
    });
    expect(routeIsPossible(checks)).toBe(false);
  });

  it('formats dates in strict 24-hour UTC without AM/PM and supports optional seconds', () => {
    const evening = new Date(Date.UTC(2026, 7, 15, 22, 30, 45));
    expect(formatDateTime(evening)).toBe('15 Aug 22:30 UTC');
    expect(formatDateTime(evening, true)).toBe('15 Aug 22:30:45 UTC');
    const morning = new Date(Date.UTC(2026, 0, 5, 8, 5, 9));
    expect(formatDateTime(morning)).toBe('05 Jan 08:05 UTC');
    expect(formatDateTime(morning, true)).toBe('05 Jan 08:05:09 UTC');
  });

  it('renders the same instant in a named zone, rolling the date where it must', () => {
    // 22:30 UTC is 00:30 the next day in Prague (CEST, UTC+2) in August.
    const evening = new Date(Date.UTC(2026, 7, 15, 22, 30, 45));
    expect(formatDateTime(evening)).toBe('15 Aug 22:30 UTC');
    // The zone suffix itself is whatever the platform's ICU calls it (CEST or
    // GMT+2), so only the instant is pinned.
    expect(formatLocalDateTime(evening, false, 'Europe/Prague')).toMatch(/^16 Aug 00:30 \S+$/);
    expect(formatLocalClock(evening, false, 'Europe/Prague')).toBe('00:30');
    expect(formatLocalClock(evening, true, 'Europe/Prague')).toBe('00:30:45');
    // Winter, so the same zone is one hour off UTC instead of two.
    const winter = new Date(Date.UTC(2026, 0, 5, 23, 10));
    expect(formatLocalDateTime(winter, false, 'Europe/Prague')).toMatch(/^06 Jan 00:10 \S+$/);
    // Behind UTC, the local date rolls backwards.
    expect(formatLocalClock(new Date(Date.UTC(2026, 7, 15, 2, 0)), false, 'America/New_York'))
      .toBe('22:00');
  });

  it('falls back to UTC rather than throwing on an unusable time zone', () => {
    const evening = new Date(Date.UTC(2026, 7, 15, 22, 30));
    expect(formatLocalDateTime(evening, false, 'Not/AZone')).toBe('15 Aug 22:30 UTC');
    expect(formatLocalClock(evening, false, 'Not/AZone')).toBe('22:30');
  });

  it('splits and combines UTC date and time accurately', () => {
    const original = new Date(Date.UTC(2026, 7, 15, 14, 45));
    const { date, time } = splitUtcDateAndTime(original);
    expect(date).toBe('2026-08-15');
    expect(time).toBe('14:45');
    const reconstructed = combineUtcDateAndTime(date, time);
    expect(reconstructed?.getTime()).toBe(original.getTime());
  });

  it('calculates safe window duration in minutes correctly across day boundary', () => {
    // 02:00 to 06:00 = 4h = 240m
    expect(safeWindowDurationMinutes(120, 360)).toBe(240);
    // 22:00 to 04:00 = 6h = 360m
    expect(safeWindowDurationMinutes(1320, 240)).toBe(360);
    // 22:00 to 22:00 = 0m
    expect(safeWindowDurationMinutes(1320, 1320)).toBe(0);
  });

  it('enforces maximum 6-hour safe window by sliding the opposite endpoint', () => {
    // User moves Start earlier to 18:00 (End was 04:00 -> 10h duration). End slides to 00:00 (18:00 + 6h)
    expect(enforceMaxSafeWindow('18:00', '04:00', 'start')).toEqual({
      safeStart: '18:00',
      safeEnd: '00:00',
    });

    // User moves End later to 08:00 (Start was 22:00 -> 10h duration). Start slides to 02:00 (08:00 - 6h)
    expect(enforceMaxSafeWindow('22:00', '08:00', 'end')).toEqual({
      safeStart: '02:00',
      safeEnd: '08:00',
    });

    // Window under 6 hours remains untouched
    expect(enforceMaxSafeWindow('23:00', '04:00', 'start')).toEqual({
      safeStart: '23:00',
      safeEnd: '04:00',
    });
  });

  it('encodes and decodes compact plan string cleanly in a round-trip', () => {
    const original = {
      landing: '2026-08-16T19:00',
      serverSpeed: 3,
      players: [],
      attackers: [
        {
          id: 'a1',
          name: 'DrDoughnut',
          x: 17,
          y: -25,
          unitRef: 'stormfang_clans/skullthrower',
          artifactMultiplier: 1 as const,
          bannerfieldLevel: 9,
          safeEnabled: true,
          safeStart: '01:00',
          safeEnd: '07:00',
        },
        {
          id: 'a2',
          name: 'Jezu',
          x: 4,
          y: 34,
          unitRef: 'stormfang_clans/skullthrower',
          artifactMultiplier: 1.5 as const,
          bannerfieldLevel: 0,
          safeEnabled: false,
          safeStart: '22:00',
          safeEnd: '04:00',
        },
      ],
      targets: [
        {
          id: 't1',
          name: 'Froggy G',
          x: -34,
          y: -31,
          fake: false,
          playerId: '',
          safeEnabled: true,
          safeStart: '04:30',
          safeEnd: '10:30',
        },
        {
          id: 't2',
          name: 'Dangerdoom',
          x: -42,
          y: -21,
          fake: false,
          playerId: '',
          safeEnabled: true,
          safeStart: '17:00',
          safeEnd: '23:00',
        },
      ],
    };

    const encoded = encodeCompactPlan(original);
    // Ensure string is short (< 250 chars), has no spaces (Discord-safe), and doesn't contain bulky JSON syntax
    expect(encoded.length).toBeLessThan(250);
    expect(encoded).not.toContain(' ');
    expect(encoded).toContain('Froggy+G');
    expect(encoded).not.toContain('"safeEnabled"');
    expect(encoded).toContain('v1_2026-08-16T19:00_3');

    const decoded = decodeCompactPlan(encoded);
    expect(decoded).toBeTruthy();
    expect(decoded?.landing).toBe('2026-08-16T19:00');
    expect(decoded?.serverSpeed).toBe(3);
    expect(decoded?.attackers).toHaveLength(2);
    expect(decoded?.attackers[0].name).toBe('DrDoughnut');
    expect(decoded?.attackers[0].x).toBe(17);
    expect(decoded?.attackers[0].y).toBe(-25);
    expect(decoded?.attackers[0].bannerfieldLevel).toBe(9);
    expect(decoded?.attackers[1].artifactMultiplier).toBe(1.5);
    expect(decoded?.targets).toHaveLength(2);
    expect(decoded?.targets[0].name).toBe('Froggy G');
    expect(decoded?.targets[1].name).toBe('Dangerdoom');
  });

  it('round-trips players, village ownership and the fake mark', () => {
    const encoded = encodeCompactPlan({
      landing: '2026-08-16T19:00',
      serverSpeed: 3,
      players: [
        { id: 'pA', name: 'Froggy G', safeEnabled: true, safeStart: '01:00', safeEnd: '07:00' },
        { id: 'pB', name: 'Petrgon', safeEnabled: false, safeStart: '22:00', safeEnd: '04:00' },
      ],
      attackers: [],
      targets: [
        { id: 't1', name: 'Capital', x: 1, y: 2, fake: false, playerId: 'pB', safeEnabled: false, safeStart: '22:00', safeEnd: '04:00' },
        { id: 't2', name: 'Second', x: 3, y: 4, fake: true, playerId: 'pA', safeEnabled: false, safeStart: '22:00', safeEnd: '04:00' },
        { id: 't3', name: 'Loner', x: 5, y: 6, fake: true, playerId: '', safeEnabled: true, safeStart: '10:00', safeEnd: '12:00' },
      ],
    });

    const decoded = decodeCompactPlan(encoded);
    expect(decoded?.players.map((p) => p.name)).toEqual(['Froggy G', 'Petrgon']);
    expect(decoded?.targets.map((t) => t.fake)).toEqual([false, true, true]);
    // Ownership survives as a reference to the decoded player, not the original id.
    expect(decoded?.targets[0].playerId).toBe(decoded?.players[1].id);
    expect(decoded?.targets[1].playerId).toBe(decoded?.players[0].id);
    expect(decoded?.targets[2].playerId).toBe('');

    // A village inherits its player's window; an unassigned one keeps its own.
    expect(resolveSafeTime(decoded!.targets[1], decoded!.players)).toEqual({
      safeEnabled: true,
      safeStart: '01:00',
      safeEnd: '07:00',
      sourceName: 'Froggy G',
    });
    expect(resolveSafeTime(decoded!.targets[2], decoded!.players)).toEqual({
      safeEnabled: true,
      safeStart: '10:00',
      safeEnd: '12:00',
    });
  });

  it('still decodes a target record written before players and fake marks existed', () => {
    const legacy = 'v1_2026-08-16T19:00_3~t:Froggy+G,-34,-31,1,04:30-10:30';
    const decoded = decodeCompactPlan(legacy);
    expect(decoded?.targets).toHaveLength(1);
    expect(decoded?.targets[0].name).toBe('Froggy G');
    expect(decoded?.targets[0].safeStart).toBe('04:30');
    expect(decoded?.targets[0].fake).toBe(false);
    expect(decoded?.targets[0].playerId).toBe('');
    expect(decoded?.players).toEqual([]);
  });

  it('keeps URL-structural characters out of names so a link cannot be truncated', () => {
    const encoded = encodeCompactPlan({
      landing: '2026-08-16T19:00',
      serverSpeed: 3,
      players: [],
      attackers: [
        {
          id: 'a1',
          name: 'R&D #1',
          x: 1,
          y: 2,
          unitRef: 'stormfang_clans/skullthrower',
          artifactMultiplier: 1,
          bannerfieldLevel: 0,
          safeEnabled: false,
          safeStart: '22:00',
          safeEnd: '04:00',
        },
      ],
      targets: [
        {
          id: 't1',
          name: 'Loot=100%',
          x: 3,
          y: 4,
          fake: false,
          playerId: '',
          safeEnabled: false,
          safeStart: '22:00',
          safeEnd: '04:00',
        },
      ],
    });

    expect(encoded).not.toMatch(/[&#=?%]/);

    const decoded = decodeCompactPlan(encoded);
    expect(decoded?.attackers).toHaveLength(1);
    expect(decoded?.targets).toHaveLength(1);
    expect(decoded?.attackers[0].name).toBe('R D 1');
    expect(decoded?.targets[0].x).toBe(3);
    expect(decoded?.targets[0].y).toBe(4);
  });

  it('decodes percent-encoded compact string cleanly', () => {
    const rawEncoded = 'v1_2026-08-16T19%3A00_3%7Ea%3ADrDoughnut%2C17%2C-25%2Cstormfang_clans%2Fskullthrower%2C1%2C9%2C1%2C01%3A00-07%3A00%7Ea%3AJezu%2C4%2C34%2Cstormfang_clans%2Fskullthrower%2C1%2C0%2C0%2C22%3A00-04%3A00%7Et%3AFroggy+G%2C-34%2C-31%2C1%2C04%3A30-10%3A30%7Et%3ASmall+cat%2C-35%2C-22%2C1%2C04%3A30-10%3A30%7Et%3APetrgon%2C-8%2C-46%2C1%2C22%3A45-04%3A00%7Et%3ADangerdoom%2C-42%2C-21%2C1%2C17%3A00-23%3A00';
    const decoded = decodeCompactPlan(rawEncoded);
    expect(decoded).toBeTruthy();
    expect(decoded?.landing).toBe('2026-08-16T19:00');
    expect(decoded?.serverSpeed).toBe(3);
    expect(decoded?.attackers).toHaveLength(2);
    expect(decoded?.attackers[0].name).toBe('DrDoughnut');
    expect(decoded?.attackers[0].x).toBe(17);
    expect(decoded?.attackers[0].y).toBe(-25);
    expect(decoded?.attackers[0].unitRef).toBe('stormfang_clans/skullthrower');
    expect(decoded?.targets).toHaveLength(4);
    expect(decoded?.targets[0].name).toBe('Froggy G');
    expect(decoded?.targets[1].name).toBe('Small cat');
    expect(decoded?.targets[2].name).toBe('Petrgon');
    expect(decoded?.targets[3].name).toBe('Dangerdoom');
  });

  it('encodes and decodes active/inactive participation flags on attackers and targets', () => {
    const state = {
      landing: '2026-08-20T12:00',
      serverSpeed: 3,
      players: [],
      attackers: [
        {
          id: 'a1',
          name: 'Active Army',
          x: 0,
          y: 0,
          unitRef: 'embermark_dominion/emberblade',
          artifactMultiplier: 1 as const,
          bannerfieldLevel: 0,
          safeEnabled: false,
          safeStart: '22:00',
          safeEnd: '04:00',
          active: true,
        },
        {
          id: 'a2',
          name: 'Inactive Bench Army',
          x: 10,
          y: 10,
          unitRef: 'embermark_dominion/emberblade',
          artifactMultiplier: 1 as const,
          bannerfieldLevel: 0,
          safeEnabled: false,
          safeStart: '22:00',
          safeEnd: '04:00',
          active: false,
        },
      ],
      targets: [
        {
          id: 't1',
          name: 'Target Village',
          x: 20,
          y: 20,
          fake: false,
          playerId: '',
          safeEnabled: false,
          safeStart: '22:00',
          safeEnd: '04:00',
          active: false,
        },
      ],
    };

    const encoded = encodeCompactPlan(state);
    const decoded = decodeCompactPlan(encoded);

    expect(decoded).toBeTruthy();
    expect(decoded?.attackers[0].active).toBe(true);
    expect(decoded?.attackers[1].active).toBe(false);
    expect(decoded?.targets[0].active).toBe(false);
  });
});

describe('operation-level target modes', () => {
  it('migrates legacy roster fake flags into each relevant operation and neutralizes the database target', () => {
    const migrated = migrateToMasterRoster({
      version: 2,
      roomName: 'legacy-room',
      activeOpId: 'op1',
      roster: {
        attackers: [],
        players: [],
        targets: [
          { id: 't1', name: 'Capital', x: 1, y: 2, fake: true, playerId: '', safeEnabled: false, safeStart: '22:00', safeEnd: '04:00' },
        ],
      },
      operations: [
        { id: 'op1', name: 'Real wave', landing: '2026-08-20T12:00', serverSpeed: 3, assignedAttackerIds: [], assignedTargetIds: ['t1'] },
        { id: 'op2', name: 'Other wave', landing: '2026-08-21T12:00', serverSpeed: 3, assignedAttackerIds: [], assignedTargetIds: [] },
      ],
      updatedAt: 1,
    });

    expect(migrated.roster.targets[0].fake).toBe(false);
    expect(migrated.operations[0].fakeTargetIds).toEqual(['t1']);
    expect(migrated.operations[1].fakeTargetIds).toEqual([]);
  });

  it('keeps imported fake modes on the new operation when reusing a master target', () => {
    const target = { id: 'existing', name: 'Capital', x: 1, y: 2, fake: false, playerId: 'p1', safeEnabled: false, safeStart: '22:00', safeEnd: '04:00' };
    const result = importPlanIntoMasterRoster(
      {
        attackers: [],
        players: [{ id: 'p1', name: 'Defender', safeEnabled: false, safeStart: '22:00', safeEnd: '04:00' }],
        targets: [target],
      },
      [],
      {
        landing: '2026-08-20T12:00',
        serverSpeed: 3,
        attackers: [],
        players: [{ id: 'import-p1', name: 'Defender', safeEnabled: false, safeStart: '22:00', safeEnd: '04:00' }],
        targets: [{ ...target, id: 'import-t1', fake: true, playerId: 'import-p1' }],
      },
      'new_wave',
    );

    expect(result.roster.targets[0].fake).toBe(false);
    expect(result.operations[0].fakeTargetIds).toEqual(['existing']);
  });

  it('preserves custom operation icons across migrateToMasterRoster loads', () => {
    const migrated = migrateToMasterRoster({
      version: 2,
      roomName: 'test-room',
      activeOpId: 'op1',
      roster: { attackers: [], players: [], targets: [] },
      operations: [
        { id: 'op1', name: 'Wave 1', icon: '💣', landing: '2026-08-20T12:00', serverSpeed: 3, assignedAttackerIds: [], assignedTargetIds: [] },
        { id: 'op2', name: 'Wave 2', icon: '🌊', landing: '2026-08-21T12:00', serverSpeed: 3, assignedAttackerIds: [], assignedTargetIds: [] },
      ],
      updatedAt: 100,
    });

    expect(migrated.operations[0].icon).toBe('💣');
    expect(migrated.operations[1].icon).toBe('🌊');
  });

  it('preserves per-wave attackerUnitOverrides across migrateToMasterRoster loads', () => {
    const migrated = migrateToMasterRoster({
      version: 2,
      roomName: 'test-room',
      activeOpId: 'op1',
      roster: {
        attackers: [
          { id: 'a1', name: 'Hammer 1', x: 0, y: 0, unitRef: 'embermark_dominion/emberblade', artifactMultiplier: 1, bannerfieldLevel: 0, safeEnabled: false, safeStart: '22:00', safeEnd: '04:00' },
        ],
        players: [],
        targets: [],
      },
      operations: [
        {
          id: 'op1',
          name: 'Catapult Wave',
          landing: '2026-08-20T12:00',
          serverSpeed: 3,
          assignedAttackerIds: ['a1'],
          assignedTargetIds: [],
          attackerUnitOverrides: { a1: 'embermark_dominion/dominion_catapult' },
        },
        {
          id: 'op2',
          name: 'Ram Wave',
          landing: '2026-08-20T13:00',
          serverSpeed: 3,
          assignedAttackerIds: ['a1'],
          assignedTargetIds: [],
          attackerUnitOverrides: { a1: 'embermark_dominion/iron_ram' },
        },
      ],
      updatedAt: 100,
    });

    expect(migrated.operations[0].attackerUnitOverrides?.a1).toBe('embermark_dominion/dominion_catapult');
    expect(migrated.operations[1].attackerUnitOverrides?.a1).toBe('embermark_dominion/iron_ram');
  });

  it('seamlessly merges concurrent team room states without losing attackers, targets, or waves', () => {
    const cloudState = {
      version: 2 as const,
      roomName: 'test-room',
      activeOpId: 'op1',
      roster: {
        attackers: [
          {
            id: 'a1',
            name: 'Hammer 1 (Cloud)',
            x: 10,
            y: 20,
            unitRef: 'embermark_dominion/dominion_catapult',
            artifactMultiplier: 1 as const,
            bannerfieldLevel: 0,
            safeEnabled: false,
            safeStart: '00:00',
            safeEnd: '00:00',
          },
        ],
        players: [],
        targets: [
          {
            id: 't1',
            name: 'Target 1 (Cloud)',
            x: 30,
            y: 40,
            fake: false,
            playerId: '',
            safeEnabled: false,
            safeStart: '00:00',
            safeEnd: '00:00',
          },
        ],
      },
      operations: [
        {
          id: 'op1',
          name: 'Op 1',
          landing: '2026-08-20T12:00',
          serverSpeed: 3,
          assignedAttackerIds: ['a1'],
          assignedTargetIds: ['t1'],
          fakeTargetIds: [],
          updatedAt: 100,
        },
      ],
      updatedAt: 100,
    };

    const localState = {
      version: 2 as const,
      roomName: 'test-room',
      activeOpId: 'op2',
      roster: {
        attackers: [
          {
            id: 'a2',
            name: 'Hammer 2 (Local Added)',
            x: 50,
            y: 60,
            unitRef: 'stormfang_clans/iron_ram',
            artifactMultiplier: 1 as const,
            bannerfieldLevel: 0,
            safeEnabled: false,
            safeStart: '00:00',
            safeEnd: '00:00',
          },
        ],
        players: [],
        targets: [
          {
            id: 't2',
            name: 'Target 2 (Local Added)',
            x: 70,
            y: 80,
            fake: true,
            playerId: '',
            safeEnabled: false,
            safeStart: '00:00',
            safeEnd: '00:00',
          },
        ],
      },
      operations: [
        {
          id: 'op2',
          name: 'Op 2 (Local Added Wave)',
          landing: '2026-08-20T14:00',
          serverSpeed: 3,
          assignedAttackerIds: ['a2'],
          assignedTargetIds: ['t2'],
          fakeTargetIds: [],
          updatedAt: 200,
        },
      ],
      updatedAt: 200,
    };

    const merged = mergeTeamRoomData(cloudState, localState);

    // Both attackers and targets are preserved in master directory
    expect(merged.roster.attackers).toHaveLength(2);
    expect(merged.roster.targets).toHaveLength(2);
    expect(merged.roster.attackers.map((a) => a.id)).toEqual(['a1', 'a2']);
    expect(merged.roster.targets.map((t) => t.id)).toEqual(['t1', 't2']);

    // Both operation waves are preserved
    expect(merged.operations).toHaveLength(2);
    expect(merged.operations.map((o) => o.id)).toEqual(['op1', 'op2']);
  });

  it('parses in-game Thronewake player profile clipboard and extracts defender & villages', () => {
    const rawClipboard = `Gugl
Player:
Gugl
Tribe:
Stormfang Clans
Alliance:
Alliance Not Found
[ANF]
Combat score:
Combat score11,078
Population:
Population
5,734
Villages:
8
Safe time:
Active
Rewards

Villages
Name	Population	Actions
Byzantion (-8|-33)
Capital
City
Small Great Storage Plan
Wilder Site (-5|-31):
Stone
+25%
Population
1,107
Constantinopole (-7|-41)
City
Wilder Site (-8|-43):
Stone
+50%
Wilder Site (-5|-39):
Metal
+50%
Population
1,019
Istanbul (-13|-37)
Small Shadow Veil
Wilder Site (-14|-38):
Stone
+25%
Food
+25%
Population
903
Ligos (0|-20)
City
Wilder Site (1|-19):
Stone
+50%
Wilder Site (1|-17):
Lumber
+25%
Food
+25%
Population
824
Carigrad (-18|-36)
Population
785
Augusta (-6|-13)
Wilder Site (-4|-15):
Stone
+50%
Population
591
Mikligardr (-7|-7)
Wilder Site (-9|-9):
Metal
+50%
Wilder Site (-6|-7):
Lumber
+50%
Population
327
Kushta (3|9)
Population
178`;

    const parsed = parseThronewakeProfileClipboard(rawClipboard);
    expect(parsed).toBeTruthy();
    expect(parsed?.players).toHaveLength(1);
    expect(parsed?.players[0].name).toBe('Gugl');

    expect(parsed?.targets).toHaveLength(8);
    expect(parsed?.targets[0]).toMatchObject({
      name: 'Byzantion',
      x: -8,
      y: -33,
      fake: true,
    });
    expect(parsed?.targets[1]).toMatchObject({
      name: 'Constantinopole',
      x: -7,
      y: -41,
      fake: true,
    });
    expect(parsed?.targets[2]).toMatchObject({
      name: 'Istanbul',
      x: -13,
      y: -37,
      fake: true,
    });
    expect(parsed?.targets[3]).toMatchObject({
      name: 'Ligos',
      x: 0,
      y: -20,
      fake: true,
    });
    expect(parsed?.targets[4]).toMatchObject({
      name: 'Carigrad',
      x: -18,
      y: -36,
      fake: true,
    });
    expect(parsed?.targets[5]).toMatchObject({
      name: 'Augusta',
      x: -6,
      y: -13,
      fake: true,
    });
    expect(parsed?.targets[6]).toMatchObject({
      name: 'Mikligardr',
      x: -7,
      y: -7,
      fake: true,
    });
    expect(parsed?.targets[7]).toMatchObject({
      name: 'Kushta',
      x: 3,
      y: 9,
      fake: true,
    });
  });

  describe('room backup export & parsing', () => {
    const mockRoomData = {
      version: 2 as const,
      roomName: 'chaotic402069',
      activeOpId: 'op1',
      roster: {
        attackers: [
          {
            id: 'a1',
            name: 'Main Hammer',
            x: 10,
            y: 20,
            unitRef: 'embermark_dominion/dominion_catapult',
            artifactMultiplier: 1 as const,
            bannerfieldLevel: 0,
            safeEnabled: false,
            safeStart: '00:00',
            safeEnd: '00:00',
          },
        ],
        players: [
          {
            id: 'p1',
            name: 'Enemy Leader',
            safeEnabled: false,
            safeStart: '00:00',
            safeEnd: '00:00',
          },
        ],
        targets: [
          {
            id: 't1',
            name: 'Enemy Capital',
            x: 50,
            y: 60,
            fake: false,
            playerId: 'p1',
            safeEnabled: false,
            safeStart: '00:00',
            safeEnd: '00:00',
          },
        ],
      },
      operations: [
        {
          id: 'op1',
          name: 'Operation 1',
          landing: '2026-09-05T12:00',
          serverSpeed: 3,
          assignedAttackerIds: ['a1'],
          assignedTargetIds: ['t1'],
          fakeTargetIds: [],
          updatedAt: 123456,
        },
      ],
      updatedAt: 123456,
    };

    it('serializes a room to formatted backup JSON package', () => {
      const backupJson = createRoomBackup(mockRoomData);
      expect(backupJson).toContain('thronewake_room_backup_v2');
      expect(backupJson).toContain('chaotic402069');
      expect(backupJson).toContain('Main Hammer');
      expect(backupJson).toContain('Enemy Capital');
    });

    it('parses wrapped RoomBackupPackage JSON cleanly', () => {
      const backupJson = createRoomBackup(mockRoomData);
      const parsed = parseRoomBackup(backupJson);
      expect(parsed).toBeTruthy();
      expect(parsed?.roomName).toBe('chaotic402069');
      expect(parsed?.roster.attackers).toHaveLength(1);
      expect(parsed?.roster.attackers[0].name).toBe('Main Hammer');
      expect(parsed?.roster.targets).toHaveLength(1);
      expect(parsed?.roster.targets[0].name).toBe('Enemy Capital');
      expect(parsed?.operations).toHaveLength(1);
      expect(parsed?.operations[0].id).toBe('op1');
    });

    it('parses direct raw TeamRoomData JSON cleanly', () => {
      const rawJson = JSON.stringify(mockRoomData);
      const parsed = parseRoomBackup(rawJson);
      expect(parsed).toBeTruthy();
      expect(parsed?.roomName).toBe('chaotic402069');
      expect(parsed?.roster.attackers).toHaveLength(1);
      expect(parsed?.operations).toHaveLength(1);
    });

    it('returns null for invalid or non-room JSON and text', () => {
      expect(parseRoomBackup('')).toBeNull();
      expect(parseRoomBackup('not json')).toBeNull();
      expect(parseRoomBackup('{"foo": "bar"}')).toBeNull();
      expect(parseRoomBackup('https://thronewake.app/#p=abc')).toBeNull();
    });
  });

  describe('alliance member accounts & multi-hammer safe-time inheritance', () => {
    const member1 = {
      id: 'ap1',
      name: 'Doughnut',
      safeEnabled: true,
      safeStart: '23:00',
      safeEnd: '07:00',
    };

    const hammer1 = {
      id: 'h1',
      name: 'Cata Hammer',
      x: 10,
      y: 20,
      unitRef: 'embermark_dominion/dominion_catapult',
      artifactMultiplier: 1 as const,
      bannerfieldLevel: 0,
      playerId: 'ap1',
      safeEnabled: false,
      safeStart: '00:00',
      safeEnd: '00:00',
    };

    const hammer2 = {
      id: 'h2',
      name: 'Ram Hammer',
      x: 15,
      y: 25,
      unitRef: 'stormfang_clans/iron_ram',
      artifactMultiplier: 1.5 as const,
      bannerfieldLevel: 10,
      playerId: 'ap1',
      safeEnabled: false,
      safeStart: '00:00',
      safeEnd: '00:00',
    };

    const standaloneHammer = {
      id: 'h3',
      name: 'Solo Hammer',
      x: 50,
      y: 50,
      unitRef: 'embermark_dominion/dominion_catapult',
      artifactMultiplier: 1 as const,
      bannerfieldLevel: 0,
      playerId: '',
      safeEnabled: true,
      safeStart: '01:00',
      safeEnd: '06:00',
    };

    it('inherits safe-time from alliance member for multiple hammers', () => {
      const res1 = resolveSafeTime(hammer1, [member1]);
      expect(res1.safeEnabled).toBe(true);
      expect(res1.safeStart).toBe('23:00');
      expect(res1.safeEnd).toBe('07:00');
      expect(res1.sourceName).toBe('Doughnut');

      const res2 = resolveSafeTime(hammer2, [member1]);
      expect(res2.safeEnabled).toBe(true);
      expect(res2.safeStart).toBe('23:00');
      expect(res2.safeEnd).toBe('07:00');
      expect(res2.sourceName).toBe('Doughnut');
    });

    it('falls back to hammer individual safe-time if standalone or player not found', () => {
      const resStandalone = resolveSafeTime(standaloneHammer, [member1]);
      expect(resStandalone.safeEnabled).toBe(true);
      expect(resStandalone.safeStart).toBe('01:00');
      expect(resStandalone.safeEnd).toBe('06:00');
      expect(resStandalone.sourceName).toBeUndefined();

      const resUnknownPlayer = resolveSafeTime({ ...hammer1, playerId: 'nonexistent' }, [member1]);
      expect(resUnknownPlayer.safeEnabled).toBe(false);
      expect(resUnknownPlayer.safeStart).toBe('00:00');
      expect(resUnknownPlayer.safeEnd).toBe('00:00');
    });

    it('merges attackerPlayers losslessly in mergeTeamRoomData', () => {
      const roomA = {
        version: 2 as const,
        roomName: 'test-room',
        activeOpId: 'op1',
        roster: {
          attackers: [hammer1],
          players: [],
          targets: [],
          attackerPlayers: [member1],
        },
        operations: [],
        updatedAt: 100,
      };

      const member2 = {
        id: 'ap2',
        name: 'Teammate',
        safeEnabled: true,
        safeStart: '02:00',
        safeEnd: '08:00',
      };

      const roomB = {
        version: 2 as const,
        roomName: 'test-room',
        activeOpId: 'op1',
        roster: {
          attackers: [hammer2],
          players: [],
          targets: [],
          attackerPlayers: [member2],
        },
        operations: [],
        updatedAt: 200,
      };

      const merged = mergeTeamRoomData(roomA, roomB);
      expect(merged.roster.attackers).toHaveLength(2);
      expect(merged.roster.attackerPlayers).toHaveLength(2);
      expect(merged.roster.attackerPlayers?.map((p) => p.name)).toEqual(['Doughnut', 'Teammate']);
    });
  });
});
