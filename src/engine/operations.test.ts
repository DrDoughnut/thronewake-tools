import { describe, expect, it } from 'vitest';
import {
  combineUtcDateAndTime,
  decodeCompactPlan,
  distanceBetween,
  encodeCompactPlan,
  enforceMaxSafeWindow,
  formatDateTime,
  formatLocalClock,
  formatLocalDateTime,
  isInSafeWindow,
  importPlanIntoMasterRoster,
  migrateToMasterRoster,
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
});
