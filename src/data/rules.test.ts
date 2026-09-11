import { describe, it, expect } from 'vitest';
import { rules, watchTowerBonus } from './rules';
import { playableFactions } from './factions';

describe('Watch Tower', () => {
  it('gives nothing at level zero', () => {
    for (const faction of playableFactions) {
      expect(watchTowerBonus(faction.key, 0)).toBe(0);
    }
  });

  it('compounds its growth per level', () => {
    expect(watchTowerBonus('verdant_wardens', 20)).toBeCloseTo(1.03 ** 20 - 1, 9);
    expect(watchTowerBonus('embermark_dominion', 20)).toBeCloseTo(1.025 ** 20 - 1, 9);
    expect(watchTowerBonus('stormfang_clans', 20)).toBeCloseTo(1.02 ** 20 - 1, 9);
  });

  it('reaches roughly +81% for the strongest tower at the cap', () => {
    expect(watchTowerBonus('verdant_wardens', 20)).toBeGreaterThan(0.8);
    expect(watchTowerBonus('verdant_wardens', 20)).toBeLessThan(0.81);
  });

  it('covers every playable faction, so none silently takes the fallback', () => {
    for (const faction of playableFactions) {
      expect(rules.watchTower.growth[faction.key]).toBeDefined();
    }
  });

  it('falls back rather than throwing on an unknown faction', () => {
    expect(watchTowerBonus('not_a_faction', 10)).toBeCloseTo(
      rules.watchTower.fallbackGrowth ** 10 - 1, 9);
  });

  it('clamps past the cap and below zero', () => {
    expect(watchTowerBonus('verdant_wardens', 99)).toBe(watchTowerBonus('verdant_wardens', 20));
    expect(watchTowerBonus('verdant_wardens', -5)).toBe(0);
  });
});
