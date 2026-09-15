import { describe, it, expect } from 'vitest';
import {
  adducedDefense,
  BASE_VILLAGE_DEF,
  defensePoints,
  demolish,
  demolishWall,
  morale,
  offensePoints,
  resolveBattle,
  resolveWave,
  siegeUpgrade,
  sigma,
  type Regiment,
  type Village,
  type Wave,
} from './combat';
import { watchTowerBonus, watchTowerDurability, watchTowerFlat } from '../data/rules';
import { upgradeStat } from './stats';

const durabilityFor = (level: number) => 1 + 0.1 * Math.max(0, level);

const unit = (over: Partial<Regiment> = {}): Regiment => ({
  key: 'u',
  count: 100,
  off: 100,
  defInf: 100,
  defCav: 100,
  cavalry: false,
  upgrade: 0,
  ...over,
});

const village = (over: Partial<Village> = {}): Village => ({
  pop: 1000,
  wallLevel: 0,
  wallDefBonus: 0,
  wallDefFlat: 0,
  wallDurability: 1,
  durability: 1,
  extraDef: 0,
  ...over,
});

const wave = (regiments: Regiment[], over: Partial<Wave> = {}): Wave => ({
  regiments,
  pop: 1000,
  type: 'attack',
  targets: [],
  morale: false,
  ...over,
});

describe('Combat Engine', () => {
  describe('points', () => {
    it('files siege and foot troops as infantry, only mounts as cavalry', () => {
      const off = offensePoints([
        unit({ off: 10, count: 10 }),
        unit({ off: 20, count: 10, cavalry: true }),
        unit({ off: 30, count: 10, siege: 'catapult' }),
      ]);
      expect(off.i).toBe(400);
      expect(off.c).toBe(200);
    });

    it('keeps the two defence values apart until the attacker is known', () => {
      const def = defensePoints([unit({ defInf: 50, defCav: 200, count: 10 })]);
      expect(def).toEqual({ i: 500, c: 2000 });
    });
  });

  describe('the infantry/cavalry blend', () => {
    const def = { i: 1000, c: 4000 };

    it('answers a pure infantry hammer with the anti-infantry value', () => {
      expect(adducedDefense({ i: 500, c: 0 }, def)).toEqual([500, 1000]);
    });

    it('answers a pure cavalry hammer with the anti-cavalry value', () => {
      expect(adducedDefense({ i: 0, c: 500 }, def)).toEqual([500, 4000]);
    });

    it('weighs a mixed hammer by where its offense came from', () => {
      // Three quarters of the offense is mounted, so the blend leans that way.
      const [total, blended] = adducedDefense({ i: 250, c: 750 }, def);
      expect(total).toBe(1000);
      expect(blended).toBeCloseTo(0.25 * 1000 + 0.75 * 4000, 6);
    });

    it('reports nothing for an army with no offense at all', () => {
      expect(adducedDefense({ i: 0, c: 0 }, def)).toEqual([0, 0]);
    });
  });

  describe('casualties', () => {
    it('wipes the loser and bills the winner by the power ratio', () => {
      // 90 troop defence plus the village's own 10 answers 200 offense at 2:1,
      // so x = 2^1.5 and the winner keeps all but 1/x of its army.
      const result = resolveWave(village(), [unit({ off: 0, count: 10, defInf: 9 })],
        wave([unit({ off: 200, count: 1, defInf: 0, defCav: 0 })]));

      expect(result.defPoints).toBe(100);
      expect(result.defLosses).toBe(1);
      expect(result.offLosses).toBeCloseTo(1 / 2 ** 1.5, 6);
    });

    it('annihilates both sides at exactly even points', () => {
      const defenders = [unit({ off: 0, count: 1, defInf: 90, defCav: 90 })];
      const result = resolveWave(village(), defenders,
        wave([unit({ off: 100, count: 1, defInf: 0, defCav: 0 })]));

      // 90 troop defence + 10 base village defence answers 100 offense exactly.
      expect(result.defPoints).toBe(100);
      expect(result.offLosses).toBe(1);
      expect(result.defLosses).toBe(1);
    });

    it('bleeds both sides on a raid rather than wiping either', () => {
      const defenders = [unit({ off: 0, count: 10, defInf: 10 })];
      const result = resolveWave(village(), defenders,
        wave([unit({ off: 200, count: 1 })], { type: 'raid' }));

      expect(result.offLosses + result.defLosses).toBeCloseTo(1, 9);
      expect(result.offLosses).toBeGreaterThan(0);
      expect(result.defLosses).toBeLessThan(1);
    });

    it('kills a lone attacker that is not strong enough by itself', () => {
      const weak = resolveWave(village(), [], wave([unit({ count: 1, off: 80 })]));
      const strong = resolveWave(village(), [], wave([unit({ count: 1, off: 90 })]));

      expect(weak.offLosses).toBe(1);
      expect(strong.offLosses).toBeLessThan(1);
    });
  });

  describe('the village itself', () => {
    it('defends for its base value with no troops present', () => {
      const result = resolveWave(village(), [], wave([unit({ off: 1000, count: 1 })]));
      expect(result.defPoints).toBe(BASE_VILLAGE_DEF);
    });

    it('multiplies troop defence by the wall bonus', () => {
      const defenders = [unit({ off: 0, count: 10, defInf: 100 })];
      const bare = resolveWave(village(), defenders, wave([unit({ off: 500, count: 1 })]));
      const walled = resolveWave(village({ wallLevel: 20, wallDefBonus: 0.8 }), defenders,
        wave([unit({ off: 500, count: 1 })]));

      expect(walled.defPoints).toBeCloseTo(bare.defPoints * 1.8, 6);
      expect(walled.defLosses).toBeLessThan(bare.defLosses);
    });

    it('adds the wall flat defence before applying the bonus', () => {
      const withFlat = resolveWave(
        village({ wallLevel: 20, wallDefBonus: 1, wallDefFlat: 90 }), [],
        wave([unit({ off: 1000, count: 1 })]),
      );
      expect(withFlat.defPoints).toBe((BASE_VILLAGE_DEF + 90) * 2);
    });
  });

  describe('morale', () => {
    it('does not bite when the defender is the bigger player', () => {
      expect(morale(500, 1000)).toBe(1);
      expect(morale(1000, 1000)).toBe(1);
    });

    it('penalises an attacker that outweighs the defender', () => {
      expect(morale(4000, 1000)).toBeLessThan(1);
    });

    it('never costs more than a third of the offense', () => {
      expect(morale(10_000_000, 3)).toBeGreaterThanOrEqual(0.667);
    });

    it('is off unless the wave asks for it', () => {
      const army = [unit({ off: 200, count: 1 })];
      const off = resolveWave(village({ pop: 10 }), [], wave(army));
      const on = resolveWave(village({ pop: 10 }), [], wave(army, { morale: true, pop: 100_000 }));

      expect(off.morale).toBe(1);
      expect(on.morale).toBeLessThan(1);
      expect(on.offPoints).toBeLessThan(off.offPoints);
    });
  });

  describe('demolition', () => {
    it('ignores damage below the half-point threshold', () => {
      expect(demolish(20, 0)).toBe(20);
      expect(demolish(20, 0.4)).toBe(20);
    });

    it('charges a level its own number in points', () => {
      // Flattening a level-20 building costs 20+19+…+1 = 210.
      expect(demolish(20, 210.5)).toBe(0);
      expect(demolish(20, 209.5)).toBe(1);
    });

    it('never raises a level as damage grows', () => {
      let previous = 20;
      for (let damage = 0; damage <= 250; damage += 5) {
        const level = demolish(20, damage);
        expect(level).toBeLessThanOrEqual(previous);
        previous = level;
      }
      expect(previous).toBe(0);
    });

    it('scales siege with the smithy', () => {
      expect(siegeUpgrade(0)).toBe(1);
      expect(siegeUpgrade(20)).toBeGreaterThan(1.4);
    });

    it('rewards winning the battle more than losing it', () => {
      expect(sigma(1)).toBeCloseTo(0.5, 9);
      expect(sigma(0.5)).toBeLessThan(0.5);
      expect(sigma(4)).toBeGreaterThan(0.5);
      expect(sigma(1e6)).toBeLessThan(1);
    });

    it('splits catapults across every target', () => {
      const army = [
        unit({ off: 100_000, count: 1, key: 'hammer' }),
        unit({ key: 'cat', count: 20, off: 0, siege: 'catapult', upgrade: 0 }),
      ];
      const one = resolveWave(village(), [], wave(army, { targets: [20] }));
      const three = resolveWave(village(), [], wave(army, { targets: [20, 20, 20] }));

      expect(one.targets[0]).toBeLessThan(three.targets[0]);
      expect(three.targets).toHaveLength(3);
    });

    it('takes longer to break a wall the tougher it is', () => {
      const soft = demolishWall(1, 20, 500);
      const hard = demolishWall(3, 20, 500);
      expect(soft).toBeLessThan(hard);
    });

    it('blunts siege with the stonemason', () => {
      const army = [
        unit({ off: 100_000, count: 1 }),
        unit({ key: 'cat', count: 20, off: 0, siege: 'catapult', upgrade: 0 }),
      ];
      const bare = resolveWave(village(), [], wave(army, { targets: [20] }));
      const reinforced = resolveWave(village({ durability: 3 }), [],
        wave(army, { targets: [20] }));

      expect(reinforced.targets[0]).toBeGreaterThan(bare.targets[0]);
    });
  });

  describe('rams', () => {
    it('lowers the wall and so lowers the defence it was providing', () => {
      const defenders = [unit({ off: 0, count: 50, defInf: 100 })];
      const attack = [
        unit({ off: 5000, count: 20, key: 'hammer' }),
        unit({ key: 'ram', count: 150, off: 50, siege: 'ram', upgrade: 20 }),
      ];
      const place = village({ wallLevel: 20, wallDefBonus: 0.8, wallDurability: 1 });
      const result = resolveWave(place, defenders, wave(attack));

      expect(result.wallDuringBattle).toBeLessThan(20);
      expect(result.wallLevel).toBeLessThan(20);
      expect(result.defPoints).toBeLessThan((50 * 100 + BASE_VILLAGE_DEF) * 1.8);
    });

    it('resists the finishing pass as well as the early one', () => {
      const attack = [
        unit({ off: 5000, count: 20, key: 'hammer' }),
        unit({ key: 'ram', count: 60, off: 50, siege: 'ram', upgrade: 0 }),
      ];
      const flimsy = resolveWave(
        village({ wallLevel: 20, wallDefBonus: 0.8, wallDurability: 1 }), [], wave(attack));
      const tough = resolveWave(
        village({ wallLevel: 20, wallDefBonus: 0.8, wallDurability: 5 }), [], wave(attack));

      expect(tough.wallLevel).toBeGreaterThan(flimsy.wallLevel);
      expect(tough.wallDuringBattle).toBeGreaterThanOrEqual(flimsy.wallDuringBattle);
    });

    it('leaves the wall alone when there are no rams', () => {
      const result = resolveWave(village({ wallLevel: 15, wallDefBonus: 0.5 }), [],
        wave([unit({ off: 5000, count: 10 })]));

      expect(result.wallLevel).toBe(15);
      expect(result.wallDuringBattle).toBe(15);
    });
  });

  describe('waves', () => {
    const wall = [unit({ key: 'def', off: 0, count: 5000, defInf: 100, defCav: 100 })];
    const breakable = [unit({ key: 'def', off: 0, count: 2000, defInf: 100, defCav: 100 })];

    /** Too small to break the garrison, so all three waves leave survivors. */
    const probe = () => [unit({ key: 'off', off: 100, count: 1000, defInf: 0, defCav: 0 })];
    /** Big enough to clear the garrison on the first pass. */
    const hammer = () => [unit({ key: 'off', off: 300, count: 1000, defInf: 0, defCav: 0 })];

    it('thins the defence with every wave that lands', () => {
      const battle = resolveBattle(village(), wall, [wave(probe()), wave(probe()), wave(probe())]);

      const standing = battle.waves.map((w) => w.defenderSurvivors[0].count);
      expect(standing[0]).toBeGreaterThan(standing[1]);
      expect(standing[1]).toBeGreaterThan(standing[2]);
      expect(standing[2]).toBeGreaterThan(0);
      expect(battle.defenderSurvivors[0].count).toBe(standing[2]);
    });

    it('costs a later wave less than the one that cleared the way', () => {
      const battle = resolveBattle(village(), breakable, [wave(hammer()), wave(hammer())]);
      expect(battle.waves[0].defLosses).toBe(1);
      expect(battle.waves[1].offLosses).toBeLessThan(battle.waves[0].offLosses);
    });

    it('aims later catapults at what the earlier ones left standing', () => {
      const train = () => [
        unit({ key: 'off', off: 400, count: 1000, defInf: 0, defCav: 0 }),
        unit({ key: 'cat', count: 20, off: 60, siege: 'catapult', upgrade: 0 }),
      ];
      const battle = resolveBattle(village(), breakable, [
        wave(train(), { targets: [20] }),
        wave(train(), { targets: [20] }),
      ]);

      expect(battle.waves[0].targets[0]).toBeLessThan(20);
      expect(battle.waves[1].targets[0]).toBeLessThan(battle.waves[0].targets[0]);
      expect(battle.targets[0]).toBe(battle.waves[1].targets[0]);
    });

    it('carries a rammed wall into the next wave', () => {
      const train = () => [
        unit({ key: 'off', off: 400, count: 1000, defInf: 0, defCav: 0 }),
        unit({ key: 'ram', count: 20, off: 50, siege: 'ram', upgrade: 0 }),
      ];
      const battle = resolveBattle(village({ wallLevel: 20, wallDefBonus: 0.8 }), breakable, [
        wave(train()),
        wave(train()),
      ]);

      expect(battle.waves[0].wallLevel).toBeLessThan(20);
      expect(battle.waves[1].wallLevel).toBeLessThan(battle.waves[0].wallLevel);
      expect(battle.wallLevel).toBe(battle.waves[1].wallLevel);
    });

    it('leaves the defenders the caller passed in untouched', () => {
      const original = [unit({ key: 'def', off: 0, count: 500 })];
      resolveBattle(village(), original, [wave(hammer())]);
      expect(original[0].count).toBe(500);
    });

    describe('Trapper (Verdant Wardens)', () => {
      it('captures attacking troops before combat begins', () => {
        // 100 attacking troops against 50 traps and no defenders
        const result = resolveWave(
          village({ trapperCapacity: 50 }),
          [],
          wave([unit({ off: 100, count: 100 })], { type: 'raid' })
        );
        expect(result.trappedTroops).toBe(50);
        expect(result.trappedDied).toBe(50); // In a raid, trapped troops are not liberated
        // 50 fighting troops fight 0 defenders, taking 0 battle casualties
        expect(result.attackerSurvivors[0].count).toBe(50);
      });

      it('liberates trapped troops with 25% death on normal attack win', () => {
        // 100 attackers vs 40 traps, 0 defenders, normal attack
        const result = resolveWave(
          village({ trapperCapacity: 40 }),
          [],
          wave([unit({ off: 100, count: 100 })], { type: 'attack' })
        );
        expect(result.trappedTroops).toBe(40);
        // 40 * 0.25 = 10 died, 30 liberated
        expect(result.trappedDied).toBe(10);
        expect(result.trappedLiberated).toBe(30);
        // Fighting survivors (60) + liberated (30) = 90 survivors
        expect(result.attackerSurvivors[0].count).toBe(90);
      });

      it('does not liberate trapped troops if attacker loses/wipes', () => {
        // 10 attackers vs 10 traps and 500 strong defenders
        const result = resolveWave(
          village({ trapperCapacity: 10 }),
          [unit({ defInf: 100, count: 500 })],
          wave([unit({ off: 10, count: 10 })], { type: 'attack' })
        );
        expect(result.trappedTroops).toBe(10);
        expect(result.trappedLiberated).toBe(0);
        expect(result.trappedDied).toBe(10);
        expect(result.attackerSurvivors[0].count).toBe(0);
      });

      it('tracks traps across multiple waves in resolveBattle', () => {
        // Trapper capacity 50 across 2 waves
        // Wave 1: 30 troops trapped
        // Wave 2: 20 traps remaining
        const battle = resolveBattle(
          village({ trapperCapacity: 50 }),
          [],
          [
            wave([unit({ off: 100, count: 30 })], { type: 'raid' }),
            wave([unit({ off: 100, count: 30 })], { type: 'raid' }),
          ]
        );
        expect(battle.waves[0].trappedTroops).toBe(30);
        expect(battle.waves[1].trappedTroops).toBe(20); // only 20 remaining
        expect(battle.remainingTraps).toBe(0);
      });

      it('simulates 50k emberblades + 1500 rams vs 50k briar guards (lvl 20 watchtower, lvl 20 stonemason)', () => {
        // Attackers: 50,000 Emberblades + 1,500 Iron Rams with lvl 20 upgrades
        const emberbladeUnit = { key: 'emberblade', upkeep: 1, noUpgrade: false } as any;
        const ramUnit = { key: 'iron_ram', upkeep: 3, noUpgrade: false } as any;
        const briarUnit = { key: 'briar_guard', upkeep: 1, noUpgrade: false } as any;

        const offEmber = upgradeStat(emberbladeUnit, 40, 20);
        const offRam = upgradeStat(ramUnit, 60, 20);
        const defBriar = upgradeStat(briarUnit, 40, 20);

        const emberblades: Regiment = {
          key: 'emberblade',
          count: 50_000,
          off: offEmber,
          defInf: 35,
          defCav: 50,
          cavalry: false,
          upgrade: 20,
        };
        const rams: Regiment = {
          key: 'iron_ram',
          count: 1_500,
          off: offRam,
          defInf: 30,
          defCav: 75,
          cavalry: false,
          siege: 'ram',
          upgrade: 20,
        };

        // Defenders: 50,000 Briar Guards (defInf upgraded with smithy 20)
        const briarGuards: Regiment = {
          key: 'briar_guard',
          count: 50_000,
          off: 15,
          defInf: defBriar,
          defCav: 50,
          cavalry: false,
          upgrade: 20,
        };

        // Village: Verdant Wardens with level 20 watch tower & level 20 stonemason
        const factionKey = 'verdant_wardens';
        const targetVillage: Village = {
          pop: 1000,
          wallLevel: 20,
          wallDefBonus: watchTowerBonus(factionKey, 20),
          wallDefFlat: watchTowerFlat(factionKey, 20),
          wallDurability: watchTowerDurability(factionKey),
          durability: durabilityFor(20),
          extraDef: 0,
        };

        const result = resolveWave(
          targetVillage,
          [briarGuards],
          wave([emberblades, rams], { pop: 1000, type: 'attack', morale: false })
        );

        // Watchtower should go from 20 -> 0
        expect(result.wallLevel).toBe(0);

        // Calculate Verdant defender losses
        const survivingDefenders = result.defenderSurvivors[0]?.count ?? 0;
        const defenderLosses = 50_000 - survivingDefenders;

        // Verdant losses equal roughly 39362 (39,771 ~ 1.04% difference)
        expect(defenderLosses).toBeCloseTo(39362, -3);
        expect(Math.abs(defenderLosses - 39362)).toBeLessThan(500);
      });
    });
  });
});

