import { describe, it, expect } from 'vitest';
import {
  encodeCombatState,
  decodeCombatState,
  hasCombatHashParams,
  initialCombatState,
  type CombatState,
} from './combatState';

describe('combatState URL persistence', () => {
  it('encodes and decodes initial state cleanly', () => {
    const encoded = encodeCombatState(initialCombatState);
    expect(encoded).toBe('tool=combat');

    const decoded = decodeCombatState('#' + encoded);
    expect(decoded).not.toBeNull();
    expect(decoded?.type).toBe('attack');
    expect(decoded?.attackerPop).toBe(1500);
    expect(decoded?.wallLevel).toBe(20);
    expect(decoded?.attackers.length).toBe(1);
    expect(decoded?.defenders.length).toBe(1);
  });

  it('encodes and decodes custom armies and village settings round-trip', () => {
    const customState: CombatState = {
      attackers: [
        {
          id: 'wave-1',
          faction: 'embermark_dominion',
          smithy: 18,
          counts: { axeborn: 4500, dominion_catapult: 250 },
        },
        {
          id: 'wave-2',
          faction: 'stormfang_clans',
          smithy: 20,
          counts: { skullthrower: 100 },
        },
      ],
      defenders: [
        {
          id: 'garrison-1',
          faction: 'verdant_wardens',
          smithy: 20,
          counts: { briar_guard: 12000, green_lancer: 3500 },
        },
      ],
      type: 'raid',
      morale: true,
      attackerPop: 2400,
      defenderPop: 950,
      villageFaction: 'stormfang_clans',
      wallLevel: 15,
      isCity: true,
      cityGuards: 10,
      palaceLevel: 10,
      stonemason: 10,
      durabilityArtifact: 1,
      targetCount: 2,
      targets: [
        { gid: 20, level: 12 },
        { gid: 10, level: 15 },
      ],
      targetGid: 20,
      targetLevel: 12,
    };

    const encoded = encodeCombatState(customState);
    expect(encoded).toContain('tool=combat');
    expect(encoded).toContain('t=r');
    expect(encoded).toContain('m=1');
    expect(encoded).toContain('ap=2400');
    expect(encoded).toContain('dp=950');
    // villageFaction uses short alias
    expect(encoded).toContain('vf=sc');
    expect(encoded).toContain('wl=15');
    expect(encoded).toContain('city=1');
    expect(encoded).toContain('cg=10');
    expect(encoded).toContain('pal=10');
    expect(encoded).toContain('sm=10');
    expect(encoded).toContain('tc=2');
    expect(encoded).toContain('tgs=20%3A12%2C10%3A15');
    // armies use short faction codes and numeric unit indices
    // embermark_dominion → ed; axeborn is a stormfang unit (cross-faction, falls back to key); dominion_catapult idx=7
    expect(decodeURIComponent(encoded)).toContain('ed:18:axeborn=4500,7=250');
    // stormfang_clans → sc; skullthrower idx=7
    expect(decodeURIComponent(encoded)).toContain('sc:20:7=100');
    // verdant_wardens → vw; briar_guard idx=0, green_lancer idx=4
    expect(decodeURIComponent(encoded)).toContain('vw:20:0=12000,4=3500');

    expect(hasCombatHashParams('#' + encoded)).toBe(true);

    const decoded = decodeCombatState('#' + encoded);
    expect(decoded).not.toBeNull();
    expect(decoded?.type).toBe('raid');
    expect(decoded?.morale).toBe(true);
    expect(decoded?.attackerPop).toBe(2400);
    expect(decoded?.defenderPop).toBe(950);
    expect(decoded?.villageFaction).toBe('stormfang_clans');
    expect(decoded?.wallLevel).toBe(15);
    expect(decoded?.isCity).toBe(true);
    expect(decoded?.cityGuards).toBe(10);
    expect(decoded?.palaceLevel).toBe(10);
    expect(decoded?.stonemason).toBe(10);
    expect(decoded?.targetCount).toBe(2);
    expect(decoded?.targets[0]).toEqual({ gid: 20, level: 12 });
    expect(decoded?.targets[1]).toEqual({ gid: 10, level: 15 });

    expect(decoded?.attackers.length).toBe(2);
    expect(decoded?.attackers[0].faction).toBe('embermark_dominion');
    expect(decoded?.attackers[0].smithy).toBe(18);
    expect(decoded?.attackers[0].counts.axeborn).toBe(4500);
    expect(decoded?.attackers[0].counts.dominion_catapult).toBe(250);

    expect(decoded?.attackers[1].faction).toBe('stormfang_clans');
    expect(decoded?.attackers[1].smithy).toBe(20);
    expect(decoded?.attackers[1].counts.skullthrower).toBe(100);

    expect(decoded?.defenders.length).toBe(1);
    expect(decoded?.defenders[0].faction).toBe('verdant_wardens');
    expect(decoded?.defenders[0].smithy).toBe(20);
    expect(decoded?.defenders[0].counts.briar_guard).toBe(12000);
    expect(decoded?.defenders[0].counts.green_lancer).toBe(3500);
  });

  it('safely handles malformed parameters and clamps out-of-bounds values', () => {
    const malformedHash = '#tool=combat&wl=999&sm=-50&ap=invalid&att=unknown_faction:99:fake_unit:not_a_num';
    const decoded = decodeCombatState(malformedHash);
    expect(decoded).not.toBeNull();
    expect(decoded?.wallLevel).toBe(20); // clamped to 20
    expect(decoded?.stonemason).toBe(0); // clamped to 0
    expect(decoded?.attackerPop).toBe(1500); // fallback
    expect(decoded?.attackers[0].smithy).toBe(20); // clamped to 20
    expect(decoded?.attackers[0].counts.fake_unit).toBeUndefined(); // discarded invalid count
  });

  it('encodes and decodes durabilityArtifact, brewery, and per-unit levels', () => {
    const customState: CombatState = {
      ...initialCombatState,
      durabilityArtifact: 4,
      attackers: [
        {
          id: 'wave-1',
          faction: 'stormfang_clans',
          smithy: 15,
          brewery: 10,
          levels: { skullthrower: 20 },
          counts: { skullthrower: 500 },
        },
      ],
    };

    const encoded = encodeCombatState(customState);
    expect(encoded).toContain('da=4');
    // stormfang_clans → sc; skullthrower idx=7
    expect(decodeURIComponent(encoded)).toContain('sc:15:7=500:10:7=20');

    const decoded = decodeCombatState('#' + encoded);
    expect(decoded?.durabilityArtifact).toBe(4);
    expect(decoded?.attackers[0].brewery).toBe(10);
    expect(decoded?.attackers[0].levels?.skullthrower).toBe(20);
  });

  it('returns null for non-combat tool hash', () => {
    expect(decodeCombatState('#tool=optimizer&m=cp')).toBeNull();
    expect(hasCombatHashParams('#tool=optimizer')).toBe(false);
  });
});
