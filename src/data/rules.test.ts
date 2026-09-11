import { describe, it, expect } from 'vitest';
import { rules, watchTowerBonus, watchTowerDurability, watchTowerFlat } from './rules';
import { playableFactions } from './factions';

describe('Watch Tower', () => {
  it('gives nothing at level zero', () => {
    for (const faction of playableFactions) {
      expect(watchTowerBonus(faction.key, 0)).toBe(0);
    }
  });

  it('compounds its growth per level, rounded the way the reference does', () => {
    // Embermark is the City Wall, the strongest bonus and the flimsiest build.
    expect(watchTowerBonus('embermark_dominion', 20)).toBeCloseTo(0.806, 9);
    expect(watchTowerBonus('verdant_wardens', 20)).toBeCloseTo(0.639, 9);
    expect(watchTowerBonus('stormfang_clans', 20)).toBeCloseTo(0.486, 9);
  });

  it('ranks the three towers the way their walls rank', () => {
    const at20 = (k: string) => watchTowerBonus(k, 20);
    expect(at20('embermark_dominion')).toBeGreaterThan(at20('verdant_wardens'));
    expect(at20('verdant_wardens')).toBeGreaterThan(at20('stormfang_clans'));

    // The bonus and the ram resistance run opposite ways: the tower that
    // defends hardest is the one that comes down fastest.
    expect(watchTowerDurability('embermark_dominion'))
      .toBeLessThan(watchTowerDurability('stormfang_clans'));
  });

  it('adds flat defence per level', () => {
    expect(watchTowerFlat('embermark_dominion', 20)).toBe(200);
    expect(watchTowerFlat('verdant_wardens', 20)).toBe(160);
    expect(watchTowerFlat('stormfang_clans', 20)).toBe(120);
    expect(watchTowerFlat('embermark_dominion', 0)).toBe(0);
  });

  it('covers every playable faction for flat defence and durability too', () => {
    for (const faction of playableFactions) {
      expect(rules.watchTower.flatPerLevel[faction.key]).toBeDefined();
      expect(rules.watchTower.ramDurability[faction.key]).toBeDefined();
    }
  });

  it('covers every playable faction, so none silently takes the fallback', () => {
    for (const faction of playableFactions) {
      expect(rules.watchTower.growth[faction.key]).toBeDefined();
    }
  });

  it('falls back rather than throwing on an unknown faction', () => {
    const raw = rules.watchTower.fallbackGrowth ** 10;
    expect(watchTowerBonus('not_a_faction', 10)).toBeCloseTo(Math.round(raw * 1000) / 1000 - 1, 9);
  });

  it('rounds to three decimals before the one comes off', () => {
    // 1.025^10 is 1.2800845…; the reference rounds that to 1.280 first, so the
    // bonus is +28.0% exactly rather than +28.00845%.
    expect(watchTowerBonus('verdant_wardens', 10)).toBeCloseTo(0.28, 10);
    expect(watchTowerBonus('verdant_wardens', 10)).not.toBeCloseTo(1.025 ** 10 - 1, 5);
  });

  it('clamps past the cap and below zero', () => {
    expect(watchTowerBonus('verdant_wardens', 99)).toBe(watchTowerBonus('verdant_wardens', 20));
    expect(watchTowerBonus('verdant_wardens', -5)).toBe(0);
  });
});
