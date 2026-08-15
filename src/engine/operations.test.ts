import { describe, expect, it } from 'vitest';
import {
  combineUtcDateAndTime,
  decodeCompactPlan,
  distanceBetween,
  encodeCompactPlan,
  enforceMaxSafeWindow,
  formatDateTime,
  isInSafeWindow,
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

  it('reports each of the four blocking checks separately', () => {
    const checks = safeChecks(
      at(23),
      at(12),
      { enabled: true, start: 1320, end: 360 },
      { enabled: true, start: 660, end: 780 },
    );
    expect(checks).toEqual({
      landAttacker: false,
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
          safeEnabled: true,
          safeStart: '04:30',
          safeEnd: '10:30',
        },
        {
          id: 't2',
          name: 'Dangerdoom',
          x: -42,
          y: -21,
          safeEnabled: true,
          safeStart: '17:00',
          safeEnd: '23:00',
        },
      ],
    };

    const encoded = encodeCompactPlan(original);
    // Ensure string is short (< 250 chars) and doesn't contain bulky JSON syntax
    expect(encoded.length).toBeLessThan(250);
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
});
