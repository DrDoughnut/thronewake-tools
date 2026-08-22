# Changelog

All notable changes to the **Thronewake Tools** suite are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

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
