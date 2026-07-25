import type { UnitRef } from './factions';

/**
 * The rows of the results table.
 *
 * A row is a *set* of units, not necessarily a single one. Multi-unit rows
 * model a mixed army: their stats are summed and their costs are weighted,
 * which is how you compare "foot backed by cavalry" against a pure cavalry
 * push. See `engine/value.ts` for the weighting.
 */
export interface UnitSetGroup {
  key: string;
  name: string;
  /** Long-form explanation shown under the picker. */
  hint: string;
  /** Which stat toggles make sense here — the UI hides the rest. */
  stats: 'combat' | 'recon';
  sets: UnitRef[][];
}

const one = (...refs: UnitRef[]): UnitRef[][] => refs.map((r) => [r]);

const EMB = 'embermark_dominion';
const STO = 'stormfang_clans';
const VER = 'verdant_wardens';
const ANC = 'ancients';

export const unitSetGroups: UnitSetGroup[] = [
  {
    key: 'all',
    name: 'All troops',
    hint: 'Every trainable fighting unit — infantry, cavalry and siege. Scouts are in their own roster; leaders and settlers are left out, since you build those to a number rather than for value.',
    stats: 'combat',
    sets: one(
      `${EMB}/emberblade`, `${EMB}/shieldbearer`, `${EMB}/iron_spear`,
      `${EMB}/sun_rider`, `${EMB}/crimson_lancer`,
      `${EMB}/iron_ram`, `${EMB}/dominion_catapult`,

      `${STO}/raider`, `${STO}/axeborn`, `${STO}/war_brute`,
      `${STO}/fang_rider`, `${STO}/blood_charger`,
      `${STO}/war_ram`, `${STO}/skullthrower`,

      `${VER}/briar_guard`, `${VER}/woodblade`, `${VER}/stag_rider`,
      `${VER}/green_lancer`, `${VER}/oak_cavalier`,
      `${VER}/timber_ram`, `${VER}/stonecaster`,
    ),
  },

  {
    key: 'offense',
    name: 'Offense compositions',
    hint: 'Foot-and-cavalry pairings that get sent together.',
    stats: 'combat',
    sets: [
      [`${EMB}/iron_spear`, `${EMB}/sun_rider`],
      [`${EMB}/iron_spear`, `${EMB}/crimson_lancer`],
      [`${EMB}/emberblade`, `${EMB}/crimson_lancer`],

      [`${STO}/raider`, `${STO}/blood_charger`],
      [`${STO}/war_brute`, `${STO}/blood_charger`],

      [`${VER}/woodblade`, `${VER}/stag_rider`],
      [`${VER}/woodblade`, `${VER}/oak_cavalier`],
    ],
  },

  {
    key: 'defense',
    name: 'Defense compositions',
    hint: 'Single defenders and the anti-infantry / anti-cavalry mixes, including cross-faction walls.',
    stats: 'combat',
    sets: [
      [`${EMB}/emberblade`],
      [`${EMB}/shieldbearer`],
      [`${EMB}/emberblade`, `${EMB}/shieldbearer`],

      [`${STO}/axeborn`],
      [`${STO}/fang_rider`],
      [`${STO}/axeborn`, `${STO}/fang_rider`],

      [`${VER}/briar_guard`],
      [`${VER}/green_lancer`],
      [`${VER}/oak_cavalier`],
      [`${VER}/briar_guard`, `${VER}/green_lancer`],
      [`${VER}/briar_guard`, `${VER}/oak_cavalier`],
      [`${VER}/green_lancer`, `${VER}/oak_cavalier`],

      // Cross-faction walls — what an alliance actually parks in a village.
      [`${EMB}/shieldbearer`, `${STO}/axeborn`],
      [`${STO}/axeborn`, `${VER}/green_lancer`],
      [`${VER}/briar_guard`, `${STO}/fang_rider`],
      [`${VER}/briar_guard`, `${EMB}/shieldbearer`],
    ],
  },

  {
    key: 'ancients',
    name: 'The Ancients',
    hint: 'Non-playable stoneborn units. They have no training cost or training time, so cost- and time-based ratings do not apply to them.',
    stats: 'combat',
    sets: one(
      `${ANC}/stonepike`, `${ANC}/carved_warrior`, `${ANC}/monolith_warden`,
      `${ANC}/slate_rider`, `${ANC}/obsidian_knight`, `${ANC}/gatebreaker`,
      `${ANC}/obelisk_engine`,
    ),
  },

  {
    key: 'recon',
    name: 'Reconnaissance',
    hint: 'Scouts, rated on scouting and counter-scouting instead of combat stats.',
    stats: 'recon',
    sets: one(
      `${EMB}/sentinel`, `${STO}/pathstalker`, `${VER}/wind_scout`, `${ANC}/shardwing`,
    ),
  },
];

export const groupByKey = (key: string): UnitSetGroup =>
  unitSetGroups.find((g) => g.key === key) ?? unitSetGroups[0];
