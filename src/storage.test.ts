// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest';
import { loadInitialArmyState, sanitizeArmyState } from './armyState';
import { loadInitialAppState, sanitizeUnitsState } from './state';
import { loadStoredJson, saveStoredJson, StorageKeys } from './storage';

describe('Storage Helpers', () => {
  beforeEach(() => {
    window.localStorage.clear();
    window.location.hash = '';
  });

  it('safely handles missing keys, invalid JSON, and saving JSON', () => {
    expect(loadStoredJson('nonexistent_key', { fallback: true })).toEqual({ fallback: true });

    window.localStorage.setItem('corrupt_key', '{not_valid_json');
    expect(loadStoredJson('corrupt_key', 'safe_fallback')).toBe('safe_fallback');

    saveStoredJson('valid_key', { test: 123, list: ['a', 'b'] });
    expect(loadStoredJson('valid_key', null)).toEqual({ test: 123, list: ['a', 'b'] });
  });
});

describe('Army Calculator State Persistence', () => {
  beforeEach(() => {
    window.localStorage.clear();
    window.location.hash = '';
  });

  it('loads default state when no URL params and no localStorage exist', () => {
    const state = loadInitialArmyState();
    expect(state.faction).toBe('embermark_dominion');
    expect(state.durationValue).toBe(1);
    expect(state.durationUnit).toBe('days');
  });

  it('loads saved state from localStorage when no URL params are present', () => {
    saveStoredJson(StorageKeys.ARMY_STATE, {
      faction: 'stormfang_clans',
      durationValue: 5,
      durationUnit: 'weeks',
      speed: 10,
      levels: { barracks1: 15 },
      selection: { barracks: ['axeborn'] },
    });

    const state = loadInitialArmyState();
    expect(state.faction).toBe('stormfang_clans');
    expect(state.durationValue).toBe(5);
    expect(state.durationUnit).toBe('weeks');
    expect(state.speed).toBe(10);
    expect(state.levels.barracks1).toBe(15);
    expect(state.selection.barracks).toEqual(['axeborn']);
  });

  it('prefers URL hash parameters over localStorage state', () => {
    saveStoredJson(StorageKeys.ARMY_STATE, {
      faction: 'stormfang_clans',
      durationValue: 5,
      durationUnit: 'weeks',
    });

    window.location.hash = '#tool=army&f=verdant_wardens&hv=2&hu=hours';

    const state = loadInitialArmyState();
    expect(state.faction).toBe('verdant_wardens');
    expect(state.durationValue).toBe(2);
    expect(state.durationUnit).toBe('hours');
  });

  it('sanitizes invalid or corrupted values in stored army state', () => {
    const sanitized = sanitizeArmyState({
      faction: 'invalid_faction_key',
      durationValue: -99,
      durationUnit: 'invalid_unit' as any,
      speed: 999 as any,
      speedBonusPercent: 99999,
    });

    expect(sanitized.faction).toBe('embermark_dominion');
    expect(sanitized.durationValue).toBe(1);
    expect(sanitized.durationUnit).toBe('days');
    expect(sanitized.speed).toBe(3);
    expect(sanitized.speedBonusPercent).toBe(1000);
  });
});

describe('Unit Attributes State Persistence', () => {
  beforeEach(() => {
    window.localStorage.clear();
    window.location.hash = '';
  });

  it('loads saved state from localStorage when no URL params are present', () => {
    saveStoredJson(StorageKeys.UNITS_STATE, {
      group: 'defense',
      mode: 'preset',
      stats: ['di', 'dc'],
      divisors: ['cu'],
      bySpeed: true,
      smithy: 10,
    });

    const state = loadInitialAppState();
    expect(state.group).toBe('defense');
    expect(state.stats).toEqual(['di', 'dc']);
    expect(state.divisors).toEqual(['cu']);
    expect(state.bySpeed).toBe(true);
    expect(state.smithy).toBe(10);
  });

  it('prefers URL hash parameters over localStorage state', () => {
    saveStoredJson(StorageKeys.UNITS_STATE, {
      group: 'defense',
      smithy: 10,
    });

    window.location.hash = '#tool=units&g=offense&sm=20';

    const state = loadInitialAppState();
    expect(state.group).toBe('offense');
    expect(state.smithy).toBe(20);
  });

  it('sanitizes invalid or corrupted values in stored units state', () => {
    const sanitized = sanitizeUnitsState({
      group: 'invalid_group_key',
      smithy: 999,
      stats: ['invalid_stat' as any],
    });

    expect(sanitized.group).toBe('all');
    expect(sanitized.smithy).toBe(23);
    expect(sanitized.stats).toEqual([]);
  });
});
