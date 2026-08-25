import type { Faction } from './types';

/**
 * ── Thronewake unit tables ───────────────────────────────────────────────
 *
 * Names, roster order, stats, costs and training times are the game's own,
 * read from the live client data. Icons live in
 * `src/assets/icons/units/<key>.png` and are matched by `key`.
 *
 * Two fields are ours rather than the game's:
 *   • `glyph` — emoji fallback drawn if a unit's icon file is missing
 *   • `role`  — derived from roster slot and unit kind; drives filtering
 *
 * `stabled` marks units the game trains in the Stable. Nothing currently
 * reads it (Thronewake has no cavalry-specific upgrade building), but it is
 * recorded because it is a fact about the unit.
 * ─────────────────────────────────────────────────────────────────────────
 */

export const factions: Faction[] = [
  {
    key: 'embermark_dominion',
    name: 'Embermark Dominion',
    short: 'EMB',
    color: '#a43632',
    blurb:
      'Forged in flame and bound by unyielding discipline. Balanced armies that conquer through order and enduring might.',
    units: [
      { key: 'emberblade', name: 'Emberblade', glyph: '⚔️', role: 'foot',
        off: 40, defInf: 35, defCav: 50, speed: 6, capacity: 50, upkeep: 1, time: 1600,
        cost: [120, 100, 150, 30],
        description:
          'A steadfast Dominion swordsman. Versatile and reliable in battle or on raids.' },
      { key: 'shieldbearer', name: 'Shieldbearer', glyph: '🛡️', role: 'foot',
        off: 30, defInf: 65, defCav: 35, speed: 5, capacity: 20, upkeep: 1, time: 1760,
        cost: [100, 130, 160, 70],
        description:
          'A disciplined defender trained to hold the line against enemy infantry.' },
      { key: 'iron_spear', name: 'Iron Spear', glyph: '🔱', role: 'foot',
        off: 70, defInf: 40, defCav: 25, speed: 7, capacity: 50, upkeep: 1, time: 1920,
        cost: [150, 160, 210, 80],
        description:
          'An aggressive spearman forged for the front line, striking hard but faring poorly against cavalry.' },
      { key: 'sentinel', name: 'Sentinel', glyph: '👁️', role: 'scout',
        off: 0, defInf: 20, defCav: 10, speed: 16, capacity: 0, upkeep: 2, time: 1360,
        cost: [140, 160, 20, 40], stabled: true, upkeepReliefAt: 10,
        description:
          'A fast cavalry scout who gathers intelligence and disrupts enemy espionage.' },
      { key: 'sun_rider', name: 'Sun Rider', glyph: '🐎', role: 'mounted',
        off: 120, defInf: 65, defCav: 50, speed: 14, capacity: 100, upkeep: 3, time: 2640,
        cost: [550, 440, 320, 100], stabled: true, upkeepReliefAt: 15,
        description:
          'A swift rider who carries the Dominion\'s fire deep into enemy lands through raids and rapid strikes.' },
      { key: 'crimson_lancer', name: 'Crimson Lancer', glyph: '🏇', role: 'mounted',
        off: 180, defInf: 80, defCav: 105, speed: 10, capacity: 70, upkeep: 4, time: 3520,
        cost: [550, 640, 800, 180], stabled: true, upkeepReliefAt: 20,
        description:
          'A heavily armed cavalry unit built for devastating charges.' },
      { key: 'iron_ram', name: 'Iron Ram', glyph: '🪵', role: 'ram',
        off: 60, defInf: 30, defCav: 75, speed: 4, capacity: 0, upkeep: 3, time: 4600,
        cost: [900, 360, 500, 70],
        description:
          'A powerful siege engine designed to crush enemy fortifications. This can destroy other players\' Watch Tower!' },
      { key: 'dominion_catapult', name: 'Dominion Catapult', glyph: '🔥', role: 'siege',
        off: 75, defInf: 60, defCav: 10, speed: 3, capacity: 0, upkeep: 6, time: 9000,
        cost: [950, 1350, 600, 90],
        description:
          'A long-range war machine capable of reducing buildings to rubble. This can destroy other players\' buildings!' },
      { key: 'high_prefect', name: 'High Prefect', glyph: '📜', role: 'chief',
        off: 50, defInf: 40, defCav: 30, speed: 4, capacity: 0, upkeep: 5, time: 90700,
        cost: [30750, 27200, 45000, 37500],
        description:
          'A commanding authority who can persuade enemy villages to join the Dominion. This is your leader unit.' },
      { key: 'settler1', name: 'Settler', glyph: '🏕️', role: 'settler',
        off: 10, defInf: 80, defCav: 80, speed: 5, capacity: 3000, upkeep: 1, time: 26900,
        cost: [4600, 4200, 5800, 4400] },
    ],
  },

  {
    key: 'stormfang_clans',
    name: 'Stormfang Clans',
    short: 'STO',
    color: '#6d828d',
    blurb:
      'Born of thunder and blood. Fierce raiders who thrive in chaos, cheap to field and relentless.',
    units: [
      { key: 'raider', name: 'Raider', glyph: '🪓', role: 'foot',
        off: 40, defInf: 20, defCav: 5, speed: 7, capacity: 60, upkeep: 1, time: 720,
        cost: [95, 75, 40, 40],
        description:
          'A cheap and aggressive warrior ideal for early plundering.' },
      { key: 'axeborn', name: 'Axeborn', glyph: '🪓', role: 'foot',
        off: 10, defInf: 35, defCav: 60, speed: 7, capacity: 40, upkeep: 1, time: 1120,
        cost: [145, 70, 85, 40],
        description:
          'An unyielding clan warrior who braces against mounted charges and excels against cavalry.' },
      { key: 'war_brute', name: 'War Brute', glyph: '💢', role: 'foot',
        off: 60, defInf: 30, defCav: 30, speed: 6, capacity: 50, upkeep: 1, time: 1200,
        cost: [130, 120, 170, 70],
        description:
          'A hardened frontline combatant with brutal slaying power.' },
      { key: 'pathstalker', name: 'Pathstalker', glyph: '👁️', role: 'scout',
        off: 0, defInf: 10, defCav: 5, speed: 9, capacity: 0, upkeep: 1, time: 1120,
        cost: [160, 100, 50, 50],
        description:
          'A silent tracker who slips through enemy lands to gather intelligence and expose hostile spies.' },
      { key: 'fang_rider', name: 'Fang Rider', glyph: '🐺', role: 'mounted',
        off: 55, defInf: 100, defCav: 40, speed: 10, capacity: 110, upkeep: 2, time: 2400,
        cost: [370, 270, 290, 75], stabled: true,
        description:
          'A vigilant rider who shields the clans from infantry and returns from raids laden with spoils.' },
      { key: 'blood_charger', name: 'Blood Charger', glyph: '🏇', role: 'mounted',
        off: 150, defInf: 50, defCav: 75, speed: 9, capacity: 80, upkeep: 3, time: 2960,
        cost: [450, 515, 480, 80], stabled: true,
        description:
          'A savage mounted warrior built for raw offensive force.' },
      { key: 'war_ram', name: 'War Ram', glyph: '🪵', role: 'ram',
        off: 65, defInf: 30, defCav: 80, speed: 4, capacity: 0, upkeep: 3, time: 4200,
        cost: [1000, 300, 350, 70],
        description:
          'A crude but effective battering ram used to smash defenses. This can destroy other players\' Watch Tower!' },
      { key: 'skullthrower', name: 'Skullthrower', glyph: '💀', role: 'siege',
        off: 50, defInf: 60, defCav: 10, speed: 3, capacity: 0, upkeep: 6, time: 9000,
        cost: [900, 1200, 600, 60],
        description:
          'A brutal siege engine that hurls destruction into enemy settlements. This can destroy other players\' buildings!' },
      { key: 'clan_warlord', name: 'Clan Warlord', glyph: '📜', role: 'chief',
        off: 40, defInf: 60, defCav: 40, speed: 4, capacity: 0, upkeep: 4, time: 70500,
        cost: [35500, 26600, 25000, 27200],
        description:
          'A dominant leader who bends conquered villages to the clan\'s will. This is your leader unit.' },
      { key: 'settler2', name: 'Settler', glyph: '🏕️', role: 'settler',
        off: 10, defInf: 80, defCav: 80, speed: 5, capacity: 3000, upkeep: 1, time: 31000,
        cost: [5800, 4400, 4600, 5200] },
    ],
  },

  {
    key: 'verdant_wardens',
    name: 'Verdant Wardens',
    short: 'VER',
    color: '#5f9463',
    blurb:
      'Guardians sworn to shield their sacred lands. They endure every storm and strike with swift precision.',
    units: [
      { key: 'briar_guard', name: 'Briar Guard', glyph: '🌿', role: 'foot',
        off: 15, defInf: 40, defCav: 50, speed: 7, capacity: 35, upkeep: 1, time: 1040,
        cost: [100, 130, 55, 30],
        description:
          'A wall of thorn and shield, inexpensive to raise and dependable against infantry and cavalry alike.' },
      { key: 'woodblade', name: 'Woodblade', glyph: '⚔️', role: 'foot',
        off: 65, defInf: 35, defCav: 20, speed: 6, capacity: 45, upkeep: 1, time: 1440,
        cost: [140, 150, 185, 60],
        description:
          'A fierce Warden swordsman who cuts deep on attack but is vulnerable to cavalry when defending.' },
      { key: 'wind_scout', name: 'Wind Scout', glyph: '👁️', role: 'scout',
        off: 0, defInf: 20, defCav: 10, speed: 17, capacity: 0, upkeep: 2, time: 1360,
        cost: [170, 150, 20, 40], stabled: true,
        description:
          'A lightning-fast rider who gathers intelligence across vast distances.' },
      { key: 'stag_rider', name: 'Stag Rider', glyph: '🦌', role: 'mounted',
        off: 100, defInf: 25, defCav: 40, speed: 19, capacity: 75, upkeep: 2, time: 2480,
        cost: [350, 450, 230, 60], stabled: true,
        description:
          'A fleet stag-mounted raider who sweeps across the land in sudden, hard-hitting strikes.' },
      { key: 'green_lancer', name: 'Green Lancer', glyph: '🌱', role: 'mounted',
        off: 45, defInf: 115, defCav: 55, speed: 16, capacity: 35, upkeep: 2, time: 2560,
        cost: [360, 330, 280, 120], stabled: true,
        description:
          'A swift lancer who races to the defense and scatters enemy infantry from the saddle.' },
      { key: 'oak_cavalier', name: 'Oak Cavalier', glyph: '🏇', role: 'mounted',
        off: 140, defInf: 60, defCav: 165, speed: 13, capacity: 65, upkeep: 3, time: 3120,
        cost: [500, 620, 675, 170], stabled: true,
        description:
          'The pride of Warden cavalry, delivering their strongest mounted assault while standing firm against horsemen.' },
      { key: 'timber_ram', name: 'Timber Ram', glyph: '🪵', role: 'ram',
        off: 50, defInf: 30, defCav: 105, speed: 4, capacity: 0, upkeep: 3, time: 5000,
        cost: [950, 555, 330, 75],
        description:
          'A sturdy siege weapon used to breach fortified gates. This can destroy other players\' Watch Tower!' },
      { key: 'stonecaster', name: 'Stonecaster', glyph: '🪨', role: 'siege',
        off: 70, defInf: 45, defCav: 10, speed: 3, capacity: 0, upkeep: 6, time: 9000,
        cost: [960, 1450, 630, 90],
        description:
          'A precise engine of war that batters enemy structures from afar. This can destroy other players\' buildings!' },
      { key: 'circle_elder', name: 'Circle Elder', glyph: '📜', role: 'chief',
        off: 40, defInf: 50, defCav: 50, speed: 5, capacity: 0, upkeep: 4, time: 90700,
        cost: [30750, 45400, 31000, 37500],
        description:
          'A respected leader who can peacefully integrate foreign villages into the Wardens. This is your leader unit.' },
      { key: 'settler3', name: 'Settler', glyph: '🏕️', role: 'settler',
        off: 10, defInf: 80, defCav: 80, speed: 5, capacity: 3000, upkeep: 1, time: 22700,
        cost: [4400, 5600, 4200, 3900] },
    ],
  },

  {
    key: 'ancients',
    name: 'The Ancients',
    short: 'ANC',
    color: '#8d7fae',
    blurb:
      'A forgotten stoneborn civilization. Silent, relentless, and awakened only to guard what should never be taken.',
    // Not player-controlled: no training cost and no training time.
    wild: true,
    units: [
      { key: 'stonepike', name: 'Stonepike', glyph: '🔱', role: 'foot',
        off: 20, defInf: 35, defCav: 50, speed: 6, capacity: 0, upkeep: 1, time: 0,
        cost: [0, 0, 0, 0],
        description:
          'Basic infantry of The Ancients, armed with long stone-forged pikes. Strong at holding the line.' },
      { key: 'carved_warrior', name: 'Carved Warrior', glyph: '🗿', role: 'foot',
        off: 65, defInf: 30, defCav: 10, speed: 7, capacity: 0, upkeep: 1, time: 0,
        cost: [0, 0, 0, 0],
        description:
          'A brutal Ancient infantry unit built for close combat. Reliable and relentless in attack.' },
      { key: 'monolith_warden', name: 'Monolith Warden', glyph: '🛡️', role: 'foot',
        off: 100, defInf: 90, defCav: 75, speed: 6, capacity: 0, upkeep: 1, time: 0,
        cost: [0, 0, 0, 0],
        description:
          'Elite Ancient guardian in massive stone armor with formidable defense on both fronts.' },
      { key: 'shardwing', name: 'Shardwing', glyph: '🦅', role: 'scout',
        off: 0, defInf: 10, defCav: 0, speed: 25, capacity: 0, upkeep: 1, time: 0,
        cost: [0, 0, 0, 0],
        description:
          'Swift scout that watches from afar and uncovers enemy movements. Fast and hard to catch.' },
      { key: 'slate_rider', name: 'Slate Rider', glyph: '🐎', role: 'mounted',
        off: 155, defInf: 80, defCav: 50, speed: 14, capacity: 0, upkeep: 2, time: 0,
        cost: [0, 0, 0, 0], stabled: true,
        description:
          'A fast Ancient mounted attacker tuned for offensive strikes.' },
      { key: 'obsidian_knight', name: 'Obsidian Knight', glyph: '🏇', role: 'mounted',
        off: 170, defInf: 140, defCav: 80, speed: 12, capacity: 0, upkeep: 3, time: 0,
        cost: [0, 0, 0, 0], stabled: true,
        description:
          'Heavy cavalry of The Ancients, feared for devastating charges. Powerful against most frontline troops.' },
      { key: 'gatebreaker', name: 'Gatebreaker', glyph: '🐘', role: 'ram',
        off: 250, defInf: 120, defCav: 150, speed: 5, capacity: 0, upkeep: 4, time: 0,
        cost: [0, 0, 0, 0],
        description:
          'Massive siege beast built to crush walls and fortifications. Slow, but devastating against defenses.' },
      { key: 'obelisk_engine', name: 'Obelisk Engine', glyph: '🪨', role: 'siege',
        off: 60, defInf: 45, defCav: 10, speed: 3, capacity: 0, upkeep: 5, time: 0,
        cost: [0, 0, 0, 0],
        description:
          'Ancient siege weapon that hurls stone with deadly force. Used to bring down buildings from afar.' },
      { key: 'the_ascendant', name: 'The Ascendant', glyph: '👑', role: 'chief',
        off: 80, defInf: 50, defCav: 50, speed: 5, capacity: 0, upkeep: 1, time: 0,
        cost: [0, 0, 0, 0], stabled: true,
        description:
          'An imposing Ancient whose survival in battle erodes enemy loyalty and brings villages under Ancient rule.' },
      { key: 'settler4', name: 'Settler', glyph: '🏕️', role: 'settler',
        off: 30, defInf: 40, defCav: 40, speed: 5, capacity: 0, upkeep: 1, time: 0,
        cost: [0, 0, 0, 0],
        description:
          'Pioneers who establish new settlements for The Ancients.' },
    ],
  },

];

/** `"embermark_dominion/emberblade"` — a unit's address across the app. */
export type UnitRef = string;

export const unitRef = (factionKey: string, unitKey: string): UnitRef =>
  `${factionKey}/${unitKey}`;

const index = new Map<UnitRef, { faction: Faction; unit: Faction['units'][number] }>();
for (const faction of factions) {
  for (const unit of faction.units) {
    index.set(unitRef(faction.key, unit.key), { faction, unit });
  }
}

export function lookup(ref: UnitRef) {
  const found = index.get(ref);
  if (!found) throw new Error(`Unknown unit reference: ${ref}`);
  return found;
}

/**
 * Resolves a bare unit key — the game's own id, which doubles as our icon
 * filename — without needing to know the faction. Keys are globally unique
 * (there is a test pinning this), so the lookup is unambiguous.
 */
export function findUnitByKey(key: string): { faction: Faction; unit: Faction['units'][number] } | undefined {
  for (const faction of factions) {
    const unit = faction.units.find((u) => u.key === key);
    if (unit) return { faction, unit };
  }
  return undefined;
}

export function factionByKey(key: string): Faction {
  const found = factions.find((f) => f.key === key);
  if (!found) throw new Error(`Unknown faction: ${key}`);
  return found;
}

/** Factions a player can actually pick. */
export const playableFactions = factions.filter((f) => !f.wild);

export const allUnitRefs = [...index.keys()];
