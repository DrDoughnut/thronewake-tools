/**
 * Player release notes. Bump `APP_VERSION` and add an entry here
 * whenever a change is worth telling returning players about.
 */
export const APP_VERSION = '1.10.3';

export interface ChangelogEntry {
  version: string;
  date: string;
  changes: string[];
}

export const CHANGELOG: ChangelogEntry[] = [
  {
    version: '1.10.3',
    date: '2026-09-11',
    changes: [
      'Fixed: Verdant Wardens villages were being treated as Embermark Dominion in the CP Optimizer, so they were offered Rider\u2019s Wells and never the Trapper. Existing villages and shared links are unaffected.',
      'Fixed: the Building Stats tool called the faction "Vaeloria" in Cranny protection and tribe-exclusive requirements. It is Verdant Wardens.',
      'Ram Resistance Confirmed: Embermark Dominion 1\u00d7, Verdant Wardens 2\u00d7, Stormfang Clans 5\u00d7 \u2014 the tower that defends hardest is the one that falls fastest.',
    ],
  },
  {
    version: '1.10.2',
    date: '2026-09-11',
    changes: [
      'Watch Tower factions corrected: Embermark Dominion has the 1.03 tower and Verdant Wardens the 1.025, not the other way round. At level 20 that is +80.6% for Embermark, +63.9% for Verdant and +48.6% for Stormfang.',
      'Tower Flat Defence: the tower now also adds flat defence per level (Embermark 10, Verdant 8, Stormfang 6) before its bonus multiplies.',
      'Ram Resistance: towers resist rams by a per-faction multiplier, applied to the finishing ram pass as well as the opening one. These multipliers are unverified — the game this one is modelled on treats all three walls alike.',
    ],
  },
  {
    version: '1.10.1',
    date: '2026-09-11',
    changes: [
      'Watch Tower Defence: the Combat Calculator and Defense Simulator now work the tower bonus out from its level and the defending faction rather than asking you to type a percentage. Verdant Wardens 1.03 per level, Embermark Dominion 1.025, Stormfang Clans 1.02 — so a level-20 Verdant tower defends at +80.6%.',
    ],
  },
  {
    version: '1.10.0',
    date: '2026-09-11',
    changes: [
      'New Combat Calculator: pick both armies from the real rosters, set the wall, stonemason and populations, and resolve a battle wave by wave with losses priced in resources on both sides.',
      'Real Battle Maths: defence is blended by how much of the attacking army is mounted, so the same garrison answers a cavalry hammer and an infantry hammer with different numbers. Raids bleed both sides instead of wiping the loser, and morale penalises an attacker that outweighs its target.',
      'Siege Modelled Properly: rams bring the wall down before the armies meet, and catapults peel building levels with the real demolition curve — which is what lets damage be priced as resources to rebuild.',
      'Cata Trains: waves land in order against a garrison that carries its losses, a wall that stays where the last wave left it, and buildings already knocked down.',
      'Defense Simulator Rebuilt: hammers now have individual sizes, cavalry shares and catapult counts, every fight goes through the combat engine, and the whole expected-value comparison is in resources instead of abstract defence points.',
    ],
  },
  {
    version: '1.9.0',
    date: '2026-09-11',
    changes: [
      'New Defense Simulator: works out how many villages your defence can actually hold, simulating thousands of attacks where you cannot yet tell a real hammer from a fake.',
      'Fake and Stacking Risk: hammers are spread at random across the villages showing incoming, so several can land on one village and break a stack sized for a single attacker.',
      'Breakeven Pricing: rather than asking you to put a number on an artifact, the tool reports the village value at which defending one more village stops paying.',
      'Adjustable Casualty Curve: the winner keeps (loser ÷ winner) to an adjustable power. Thronewake does not publish its casualty formula, so this default is carried over from the game it is modelled on and is unverified.',
      'Dark Theme Everywhere: the interface no longer switches to a light palette when your system is set to light mode.',
    ],
  },
  {
    version: '1.8.1',
    date: '2026-09-06',
    changes: [
      'War Anvil Artifacts: configure Small War Anvil (50% less training time in this village), Large War Anvil (25% less training time for all villages), or Unique War Anvil (50% less training time for all villages) in the Army Calculator.',
      'Secondary Building Exclusivity: enforces single secondary training building rule (Barracks #2 or Stable #2), greying out and crossing out the conflicting queue.',
      'Mobile Queue Controls: restored the 0-level reset button on mobile viewports for quick queue clearing.',
      'Building Stats: added Days until Breakeven for resource fields, calibrated Crop Field to standard Travian 4.6 costs, and upgraded mobile view to horizontal canvas panning.',
      'Operation Planner: clipboard importer tags Capital, City, and Artifacts onto village names; added daily safetime schedule and participant safe hours to both Setup and Routes views.',
    ],
  },
  {
    version: '1.8.0',
    date: '2026-08-22',
    changes: [
      'New Building Encyclopedia: browse upgrade costs, construction times, culture points, and effects for all 39 buildings.',
      'City Level 22 Stats: view costs and progression for Level 22 Town Hall, Warehouse, Granary, Barracks, Stable, and Workshop.',
      'Interactive Level Ranges: click table rows to sum total resource costs and build times between any two levels.',
      'Live Game Calibration: all building stats, costs, and times are matched directly to Thronewake.',
      'Town Hall & Server Speed: adjust Town Hall level and server speed sliders to see real-time construction times.',
    ],
  },
  {
    version: '1.7.0',
    date: '2026-08-21',
    changes: [
      'New CP & Population Optimizer: calculate the cheapest upgrade order to grow Culture Points or village population.',
      'Realm Management: manage multiple villages, designate capitals, and plan realm-wide build orders.',
      'City Support: models 3 extra building slots and Level 22 city building upgrades.',
      'Smart Requirements: automatically schedules prerequisites and warehouse expansions before expensive buildings.',
    ],
  },
  {
    version: '1.6.0',
    date: '2026-08-19',
    changes: [
      'Operation Planner: defender profiles to set safe hours once and manage all targeted villages.',
      'Launch Alarms: sound warnings before launch time with customizable army alert selection.',
      'Route Filters & Ticker: filter attacks by player or viability, with live launch countdowns.',
    ],
  },
  {
    version: '1.5.0',
    date: '2026-08-15',
    changes: [
      'Operation Planner: coordinate multi-army attacks and reinforcements with safe time checks.',
      'Interactive Timeline: 24-hour UTC schedule showing travel times, arrival times, and safe windows.',
      'Shareable Links: share attack plans with alliance members using compact links.',
    ],
  },
  {
    version: '1.3.0',
    date: '2026-08-04',
    changes: [
      'Unit Stat Cards: click or hover any unit icon to inspect full combat stats, speed, capacity, and upkeep.',
      'Smithy & Building Modifiers: live updates to combat power based on current smithy upgrade levels.',
    ],
  },
  {
    version: '1.1.0',
    date: '2026-08-03',
    changes: [
      'Army Calculator: queue training time splits, custom duration runs, and hourly resource requirements.',
      'Server Speed Selector: easily switch between 1x, 3x, and 10x speeds.',
    ],
  },
  {
    version: '1.0.0',
    date: '2026-07-25',
    changes: [
      'Initial release: Unit Attributes and Combat Stats rankings for all Thronewake factions.',
      'Mobile-friendly design with shareable URL state.',
    ],
  },
];
