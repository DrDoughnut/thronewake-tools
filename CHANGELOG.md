# Changelog

All notable changes to the **Thronewake Tools** suite are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [1.12.0] - 2026-09-15

### Changed
- **Official Building Reskins & Renames**:
  - Synchronized building names, artwork, descriptions, and level progression directly with the live Thronewake client bundle (`thronewake.com`):
    - **Grazing Field** (formerly Cropland): Updated name, artwork, and full level 1–22 progression (including City levels 21 & 22) with authentic bundle population and production values.
    - **Butcher** (formerly Grain Mill): Updated name, authentic bundle artwork, description, and prerequisites (+5% Food production/lvl up to +25%).
    - **Smokehouse** (formerly Bakery): Updated name, authentic bundle artwork, description, and prerequisites (+5% Food production/lvl up to +25%).
    - **Forge** (formerly Iron Foundry): Synchronized name and authentic artwork.
    - **Shelter** (formerly Cranny): Synchronized name and authentic artwork.
    - **Thornsnare Grove** (formerly Trapper): Synchronized name and authentic artwork.
    - **Ancient Monument** (formerly Wonder of the World): Synchronized name and authentic artwork.
  - Resource terminology in building effects modernized to match the game ("Crop" &rarr; "Food", e.g. `+X Food/hr`, `+X% Food Production`, `X Food Capacity`).
  - Added full backwards compatibility via slug and icon aliases (`SLUG_ALIASES`, `ICON_ALIASES`), ensuring existing deep links (e.g. `?b=cropland`, `?b=grain-mill`, `?b=bakery`) and saved configurations resolve seamlessly.

- **Combat Calculator**:
  - Interactive formula popovers for Virtual Wall (effective combat wall reduction from ram damage) and Blended Defense calculations with viewport-aware portal positioning and dotted-line help indicators.

## [1.11.0] - 2026-09-11

### Changed
- **Combat Calculator laid out horizontally.** Troops now run across a row with the unit's icon and name above each count, so a whole army reads as one line instead of a column of seven. The attacker card, the village, and the defender card stack in that order, with the village between the two sides it belongs to.

### Added
- **Multiple attacking armies**: each attacker row is its own wave, landing in order against whatever the previous one left. Replaces the old "repeat this army N times" wave count, so a cata train can be built out of genuinely different armies.
- **Multiple defending armies**: several rows stand in the same village and fight as one garrison, each with its own faction and smithy — which is what reinforcement actually looks like. The Watch Tower belongs to the first defender, as the village owner.

## [1.10.3] - 2026-09-11

### Fixed
- **Verdant Wardens villages were treated as Embermark in the CP Optimizer.** The faction picker emits `verdant_wardens`, but `FACTION_TRIBE_MAP` knew only the older name `vaeloria`, and its `|| 1` fallback silently resolved the miss to tribe 1 — so a Verdant village was offered Rider's Wells (Embermark-exclusive) and never the Trapper (its own). Both keys now resolve, so saved villages and older shared links keep working. The existing test passed only because it used the dead key the UI cannot produce.
- **"Vaeloria" shown to players** in Building Stats — for the Cranny's protected resources and for tribe-exclusive prerequisites — is now "Verdant Wardens".

### Changed
- **Ram resistance confirmed in-game**: Embermark 1×, Verdant Wardens 2×, Stormfang Clans 5×, and no longer marked unverified.

## [1.10.2] - 2026-09-11

### Fixed
- **Watch Tower factions were the wrong way round.** Embermark Dominion is the 1.03 tower and Verdant Wardens the 1.025, not the reverse — matching the repo's own tribe ids and the reference model's City Wall / Palisade / Earth Wall. A level-20 Embermark tower is +80.6%; Verdant +63.9%; Stormfang +48.6%.

### Added
- **Tower flat defence**: read from the level and faction (Embermark 10 per level, Verdant 8, Stormfang 6), added before the bonus multiplies.
- **Per-faction ram resistance**: the tower now resists rams by a faction multiplier, and it applies to the finishing ram pass as well as the early one — the reference applies it only to the early phase, which would let a tough wall be levelled as fast as a flimsy one once the fight is over. Marked UNVERIFIED in `rules.ts`: the reference gives all three walls a durability of 1, so these came from a player and setting them all to 1 restores the reference behaviour.
- **Bonus rounding** now matches the reference, which rounds to three decimals before subtracting one, so a level-10 Palisade is +28.0% rather than +28.00845%.

## [1.10.1] - 2026-09-11

### Added
- **Watch Tower defence**: Both battle tools now read the tower's bonus from its level and the defending faction (`growth ^ level`) instead of taking a typed-in percentage — Verdant Wardens 1.03, Embermark Dominion 1.025, Stormfang Clans 1.02, so a level-20 Verdant tower defends at +80.6%. Flat tower defence is still not modelled.

## [1.10.0] - 2026-09-11

### Added
- **Combat Calculator Tool (`⚒️ Combat Calculator`)**:
  - **Real T4 Battle Resolution**: Offense and defence points from the live rosters with smithy applied, the infantry/cavalry defence blend, the village's own base defence, wall bonus and flat defence, and the morale malus on an attacker that outweighs its target.
  - **Normal Attacks and Raids**: Normal attacks wipe the loser and bill the winner `(loser ÷ winner)^1.5`; raids bleed both sides instead.
  - **Rams and Catapults**: Rams take the wall down before the armies meet, so the reduced bonus applies to the fight itself. Catapults demolish with the real curve, levels costing their own number in points, split across every target and blunted by the Stonemason's Lodge.
  - **Cata Trains**: Waves resolve in order against a garrison carrying its losses, a wall left where the previous wave put it, and buildings already knocked down.
  - **Priced in Resources**: Losses on both sides are valued at what the troops cost to train, and building damage at what the levels cost to rebuild.

### Changed
- **Defense Simulator rebuilt on the combat engine**: Hammers now carry individual sizes, cavalry shares and catapult counts instead of one shared offense number, every village is resolved by the combat engine, and expected value is compared in resources rather than in "defence points" — which was comparing troops to buildings in units that do not convert. Two hammers landing on one village now fight as consecutive waves.
- **Casualty exponent confirmed**: `immensity` is a flat 1.5 in T4 and only scaled with battle size in T3, so the curve is no longer marked unverified and its tunable in `rules.ts` has been removed in favour of the engine constant.

### Known gaps
- **Ram durability** is not yet per-faction, so the Watch Tower resists rams identically for everyone.

## [1.9.0] - 2026-09-11

### Added
- **Defense Simulator Tool (`🛡️ Defense Sim`)**:
  - **Monte Carlo Split Search**: Sweeps every way of dividing your defence pool across the villages showing incoming, simulating thousands of attacks per split and reporting expected villages lost, defence lost, and total cost. Every split faces the same sampled attacks, so neighbouring rows differ on merit rather than sampling noise.
  - **Fakes and Stacking**: Real hammers are distributed at random across the villages showing incoming, so defence can be committed to a village that turns out to be a fake, and two real hammers can land on one village and break a stack sized for a single attacker.
  - **Breakeven Village Pricing**: Total cost is linear in what a village is worth, so the tool reports the exact value at which the recommendation flips to the next split — answering "how many should I defend" without first having to price an artifact.
  - **Adjustable Casualty Curve**: The loser is wiped and the winner keeps `(loser ÷ winner)` to an adjustable exponent, exposed as a slider. Thronewake does not publish its casualty formula; the 1.5 default is carried over from the game it is modelled on and is **unverified**.
  - **Deep-Link State Sharing**: Syncs the whole scenario to the URL hash (`#tool=defense&d=…`) alongside local storage.

### Changed
- **Dark Theme Everywhere**: Removed the `prefers-color-scheme: light` override, so the interface stays on the dark palette regardless of the operating system setting.

## [1.8.1] - 2026-09-06

- **Army Calculator Improvements**:
  - **War Anvil Training Artifacts**: Added selector for **Small War Anvil** (troop training takes 50% less time in this village), **Large War Anvil** (troop training takes 25% less time for all villages), and **Unique War Anvil** (troop training takes 50% less time for all villages). Calculates exact reductions and increased unit output across all parallel queues with URL and storage sync.
  - **Secondary Building Mutual Exclusivity**: Enforces the single secondary training building rule per village. If **Barracks #2** or **Stable #2** is active (>0), the other is automatically locked, crossed out, and greyed out. Setting or typing a level in the locked queue automatically switches to it and resets the other to 0.
  - **Mobile 0-Level Reset Button**: Restored the quick `0` level reset button on mobile screens so mobile players can quickly clear queues without backspacing input text.

## [1.8.0] - 2026-08-22

### Added
- **Building Stats & Encyclopedia Tool (`📖 Building Stats`)**:
  - **Comprehensive Building Catalog**: Interactive reference browsing all 37 structures with high-resolution 58px artwork, descriptions, and category tags (`Resources`, `Infrastructure`, `Military`).
  - **Full Level 1–22 Progression Tables**: Detailed data tables presenting resource costs (Wood, Clay, Iron, Crop, Total), Population (`Pop` & `+Δ`), Culture Points (`CP/d` & `+Δ`), efficiency ratios (`res/CP` & `res/Pop`), construction time, and formatted building effects across every level.
  - **Main Building Speed Modifier Slider (Lvl 1–20)**: Real-time slider recalculating exact construction times at any Main Building level using live game scaling formulas.
  - **City Level 22 Support**: Integrated special City badges and exact progression stats for City-upgradeable buildings (Town Hall, Warehouse, Granary, Barracks, Stable, Workshop).
  - **Category & Tribe Filters**: Filter structures by Category and Tribe exclusivity (Embermark Dominion, Stormfang Clans, Vaeloria), or perform live text searches by building name and effect keywords.
  - **Aggregate Cost & Stat Summary**: Metric cards summarizing total resources to max level, total construction time at current MB level, maximum population, and maximum culture points.
  - **Deep-Link State Sharing**: Syncs building selection and MB level directly to URL hash (`#tool=buildings&b=town-hall&mb=20`) for direct sharing.

## [1.7.0] - 2026-08-21

### Added
- **Culture Point (CP) & Population (Pop) Build-Order Optimizer**:
  - Top header toggle switch between **[🏛️ CP Mode]** and **[👥 Pop Mode]**.
  - **CP Mode**: Mathematical sequence ranking for cheapest resources per Culture Point gained (`res/CP`), factoring in 18-field average bonus, building CP, and Thronewake City flat +200 CP/day + 25% boost.
  - **Population Mode**: Mathematical sequence ranking for cheapest resources per Population gained (`res/Pop`), prioritizing infrastructure, troop buildings, and economic growth.
  - **Dynamic Multi-Village Realm Sidebar**: Add, remove, and vertically reorder villages in your realm with live individual and empire-wide production/population statistics.
  - **Prerequisite & Storage Invariant Gating**: Topological resolution ensuring Warehouse and Granary upgrades are automatically scheduled prior to any candidate building whose cost exceeds current storage capacity.
  - **Faction-Exclusive Buildings**: Accurate modeling for Trapper (Vaeloria / Gauls), Stormbrew Works (Stormfang Clans / Teutons Capital), and Rider's Wells (Embermark Dominion / Romans).
  - **Universal Wall Modeling**: Unified Watch Tower wall using Gaul cost formula across all factions.
  - **Expedition Camp**: Support for hero mansion equivalent building with Main Building 3 and Rally Point 1 prerequisites.
  - **High-Resolution Artwork**: 37 webp building icons rendered at 58px × 58px with rounded borders and drop shadows.
  - **Shareable URLs**: Compressed URL hash encoding/decoding (`v1_...`) supporting instant setup sharing.
- **Single Capital Realm Enforcement**:
  - Enforced strict single-capital rule across the entire realm. Designating a new Capital automatically updates the former capital to a regular village and converts Palace ↔ Residence.
- **City Building Level 22 Maximums**:
  - Warehouse, Granary, Barracks, Stable, Workshop, and Town Hall can reach **Level 22** in a City with exact CP progression (Level 22 Town Hall = 138 CP, Level 22 Warehouse & Granary = 69 CP each).
- **City Slot Expansion**:
  - Shared building slot capacity modeled accurately with **20 base shared slots** (plus dedicated Rally Point and Wall), and Cities automatically granted +3 extra slots for **23 shared slots**.
- **Multi-Instance Building Support**:
  - Additional copies of Warehouse, Granary, Shelter/Cranny, Trapper, and Herbalist can now be constructed once existing copies reach max level.
- **Quick-Jump Building Level Dropdown**:
  - Added an interactive `<select>` dropdown inside each building row to jump directly to any level from 1 to 20 (or 22 in Cities) without having to click the increment button repeatedly.

### Fixed
- Fixed Embassy (GID 18) and Expedition Camp (GID 37) population tables where marginal population increments had been saved instead of cumulative totals.
- Formatted zero-gain and sentinel efficiency scores to cleanly render `∞ res/Pop` and `∞ res/CP` instead of large sentinel integers or division-by-zero errors.
- Fixed text clipping, overflow, and line-wrapping in the header and recommendation cards when toggling Population mode.
- Prevented multiple capitals from coexisting in multi-village configurations.

### Acknowledgements
- Optimization algorithms and dependency chain solver adapted from **Zdeněk Kunovjánek's** ([@Qira95](https://github.com/Qira95)) [kingdomoptimizer](https://github.com/Qira95/kingdomoptimizer).

---

## [1.6.0] - 2026-08-18

### Added
- **Operation Planner Enhancements**:
  - Player-centric defender grouping and target assignment.
  - Dual-stage alarms (30m pre-warning + launch buzzer).
  - Multi-army coordination across attackers and targets with slowest troop speed calculation.
  - Bannerfield long-range speed bonus and 24-hour UTC safe-time protection checks.
  - Compact plan URL serialization and Discord-safe link sharing.

---

## [1.5.6] - 2026-08-16

### Added
- Targets overhaul with fake/real target classification.
- Local time conversion and UTC countdown timers.

---

## [1.5.5] - 2026-08-15

### Added
- Interactive timeline lane selection and hover effects for daily schedule visualization.

---

## [1.5.4] - 2026-08-14

### Added
- URL character sanitization and landing time validation improvements.
- Contributor documentation.

---

## [1.5.3] - 2026-08-13

### Added
- Discord-safe URL encoding and rich OpenGraph embed previews.

---

## [1.0.0] - 2026-08-10

### Initial Release
- **Unit Attributes**: Ranks units and mixed pairs by resource, crop, or time constraints with Smithy and faction building modifiers.
- **Army Calculator**: Multi-queue parallel training time, cost, and combat strength calculation.
