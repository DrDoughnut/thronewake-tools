/**
 * Human-maintained release notes. Bump `APP_VERSION` and add an entry here
 * whenever a change is worth telling a returning user about.
 */
export const APP_VERSION = '1.5.1';

export interface ChangelogEntry {
  version: string;
  date: string;
  changes: string[];
}

export const CHANGELOG: ChangelogEntry[] = [
  {
    version: '1.5.1',
    date: '2026-08-15',
    changes: [
      'Operation Planner: ultra-compact 75% shorter shareable links with live browser address bar & clipboard synchronization.',
      'Operation Planner: one-click "🔗 Copy Share Link" button with instant clipboard feedback.',
      'Operation Planner: full backward compatibility for legacy JSON plan URL bookmarks.',
      'Branding: integrated official Thronewake crest emblem SVG favicon.',
    ],
  },
  {
    version: '1.5.0',
    date: '2026-08-15',
    changes: [
      'Operation Planner: added full coordinated multi-army attack & defense route calculation.',
      'Operation Planner: chronological route sorting by Send time with precision seconds.',
      'Operation Planner: interactive 3-faction Unit Grid Picker for slowest troop selection.',
      'Operation Planner: detailed Safetime Checks (A, B, C, D) with interactive popovers and guidance tooltips.',
      'Operation Planner: 24-hour UTC safe-time schedule timeline with sliding 6-hour max window enforcement.',
      'Operation Planner: full-row route selection linked to lane highlighting and movement track safe window overlays.',
      'Operation Planner: distinct color coding (Warm Ember for Attackers, Azure/Cyan for Defenders).',
      'Operation Planner: resilient keyboard-friendly 24h time and negative coordinate inputs.',
      'Operation Planner: compact 75% shorter shareable links and one-click Copy Share Link button with full backward compatibility for saved links.',
    ],
  },
  {
    version: '1.4.0',
    date: '2026-08-15',
    changes: [
      'Added the Operation Planner for coordinated landings across multiple attackers and targets.',
      'Travel time accounts for coordinate distance, the slowest troop, server speed, 1.5×/2× speed artifacts, and Bannerfield beyond 20 fields.',
      'Optional attacker and defender safe times are checked at both send and landing, with a daily overlap timeline.',
    ],
  },
  {
    version: '1.3.0',
    date: '2026-08-04',
    changes: [
      'Unit Attributes: hover, focus or tap a unit\'s icon in the table for a stat card — attack, defense, speed, capacity and upkeep under the current smithy and building levels.',
      'Army Calculator: the same stat card appears on the produced-army icons at the bottom, not on the unit-picker buttons.',
    ],
  },
  {
    version: '1.2.0',
    date: '2026-08-04',
    changes: [
      'Army Calculator: fixed the 0 / 20 / 22 level shortcuts wrapping onto their own line.',
      'Army Calculator: queue cells are divided by a hairline instead of a wide gap, and the level input is smaller.',
      'Army Calculator: the cost icon sits next to its number instead of its label.',
      'Army Calculator: training bonus now steps by 2% instead of 5%.',
      'Tightened the mobile layout across breakpoints.',
      'Added a version badge next to the wordmark; click it for the changelog.',
    ],
  },
  {
    version: '1.1.0',
    date: '2026-08-03',
    changes: [
      'Army Calculator: production run length is now a number plus a unit (hours / days / weeks / months).',
      'Army Calculator: added a 1× / 3× / 10× server speed toggle, defaulting to 3×.',
      "Army Calculator: Barracks #1/#2/Great Barracks (and the Stable equivalents) share one row and one unit picker; picking more than one unit splits each queue's time between them.",
      'Army Calculator: attack is split into infantry and cavalry as well as the total, and upkeep is shown with Rider\'s Wells relief applied.',
      'Army Calculator: added resources-per-hour, real game resource icons, and a horizontal army strip that keeps a slot for every unit, zeroes included.',
    ],
  },
  {
    version: '1.0.0',
    date: '2026-07-25',
    changes: [
      'Initial release: Unit Attributes calculator, ranking every unit against real Thronewake data.',
      'Faction-scoped building modifiers (Rider\'s Wells, Stormbrew Works) and the smithy upgrade curve.',
      'Mobile-friendly layout; every setting round-trips through a shareable URL.',
    ],
  },
];
