/**
 * Player release notes. Bump `APP_VERSION` and add an entry here
 * whenever a change is worth telling returning players about.
 */
export const APP_VERSION = '1.8.0';

export interface ChangelogEntry {
  version: string;
  date: string;
  changes: string[];
}

export const CHANGELOG: ChangelogEntry[] = [
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
