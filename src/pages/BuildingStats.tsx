import { useState, useMemo, useEffect } from 'react';
import { BUILDINGS, BUILDINGS_BY_GID, type CatalogBuilding } from '../data/buildingCatalog';
import { buildingIcon } from '../icons';
import {
  getMainBuildingFactor,
  formatTimeSeconds,
  formatEffectLabel,
  describePrerequisites,
} from '../data/buildingEffects';
import { CITY_UPGRADEABLE_GIDS } from '../engine/cpOptimizer';

const CATEGORIES = ['All', 'Resources', 'Infrastructure', 'Military'] as const;
type Category = (typeof CATEGORIES)[number];

const TRIBES = [
  { id: 'all', name: 'All Tribes' },
  { id: 'embermark', name: 'Embermark Dominion', vid: 1 },
  { id: 'stormfang', name: 'Stormfang Clans', vid: 2 },
  { id: 'vaeloria', name: 'Vaeloria', vid: 3 },
] as const;

export function BuildingStats() {
  // Read initial building and MB level from URL hash
  const hashParams = useMemo(() => {
    return new URLSearchParams(window.location.hash.replace(/^#/, ''));
  }, []);

  const initialGid = useMemo(() => {
    const gidParam = hashParams.get('gid');
    if (gidParam && BUILDINGS_BY_GID.has(Number(gidParam))) {
      return Number(gidParam);
    }
    const slugParam = hashParams.get('b');
    if (slugParam) {
      const found = BUILDINGS.find((b) => b.slug === slugParam);
      if (found) return found.gid;
    }
    return 24; // Default to Town Hall (GID 24)
  }, [hashParams]);

  const initialMb = useMemo(() => {
    const mbParam = Number(hashParams.get('mb'));
    return mbParam >= 1 && mbParam <= 20 ? mbParam : 20;
  }, [hashParams]);

  const [selectedGid, setSelectedGid] = useState<number>(initialGid);
  const [selectedCategory, setSelectedCategory] = useState<Category>('All');
  const [selectedTribe, setSelectedTribe] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [mbLevel, setMbLevel] = useState<number>(initialMb);

  // Sync state to URL hash
  useEffect(() => {
    const currentParams = new URLSearchParams(window.location.hash.replace(/^#/, ''));
    const building = BUILDINGS_BY_GID.get(selectedGid);
    if (!building) return;

    currentParams.set('tool', 'buildings');
    currentParams.set('b', building.slug);
    currentParams.set('mb', String(mbLevel));

    window.history.replaceState(null, '', `${window.location.pathname}#${currentParams.toString()}`);
  }, [selectedGid, mbLevel]);

  const selectedBuilding: CatalogBuilding =
    BUILDINGS_BY_GID.get(selectedGid) || BUILDINGS[0];

  const mbFactor = useMemo(() => getMainBuildingFactor(mbLevel), [mbLevel]);

  // Filtered buildings list
  const filteredBuildings = useMemo(() => {
    return BUILDINGS.filter((b) => {
      // Category filter
      if (selectedCategory !== 'All' && b.category !== selectedCategory) {
        return false;
      }

      // Tribe filter
      if (selectedTribe !== 'all') {
        const tribeObj = TRIBES.find((t) => t.id === selectedTribe);
        if (tribeObj && 'vid' in tribeObj) {
          const tribePrereq = b.prerequisites.find((p) => p.type === 'Tribe');
          if (tribePrereq && tribePrereq.vid && !tribePrereq.vid.includes(tribeObj.vid)) {
            return false;
          }
        }
      }

      // Search query filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchName = b.name.toLowerCase().includes(q);
        const matchCategory = b.category.toLowerCase().includes(q);
        const matchSlug = b.slug.toLowerCase().includes(q);
        return matchName || matchCategory || matchSlug;
      }

      return true;
    });
  }, [selectedCategory, selectedTribe, searchQuery]);

  // Aggregate stats across all levels
  const totals = useMemo(() => {
    let wood = 0;
    let clay = 0;
    let iron = 0;
    let crop = 0;
    let time = 0;

    for (const lvl of selectedBuilding.levels) {
      wood += lvl.wood;
      clay += lvl.clay;
      iron += lvl.iron;
      crop += lvl.crop;
      time += (lvl.time ?? 0) * mbFactor;
    }

    const totalCost = wood + clay + iron + crop;
    const maxLevelDetail = selectedBuilding.levels[selectedBuilding.levels.length - 1];
    const maxPop = maxLevelDetail ? maxLevelDetail.pop : 0;
    const maxCp = maxLevelDetail ? maxLevelDetail.cp : 0;

    return {
      wood,
      clay,
      iron,
      crop,
      totalCost,
      totalTime: time,
      maxPop,
      maxCp,
      levelCount: selectedBuilding.levels.length,
    };
  }, [selectedBuilding, mbFactor]);

  const prereqDescriptions = useMemo(
    () => describePrerequisites(selectedBuilding),
    [selectedBuilding]
  );

  const isCityBuilding = CITY_UPGRADEABLE_GIDS.has(selectedBuilding.gid);

  return (
    <div className="bs-container">
      {/* Top Filter & Search Bar */}
      <div className="bs-filter-card">
        <div className="bs-filter-header">
          <div className="bs-filter-tabs" role="tablist" aria-label="Building Categories">
            {CATEGORIES.map((cat) => {
              const count =
                cat === 'All'
                  ? BUILDINGS.length
                  : BUILDINGS.filter((b) => b.category === cat).length;
              return (
                <button
                  key={cat}
                  type="button"
                  role="tab"
                  aria-selected={selectedCategory === cat}
                  className={`pill ${selectedCategory === cat ? 'pill--primary' : ''}`}
                  onClick={() => setSelectedCategory(cat)}
                >
                  {cat} <span className="bs-badge-count">({count})</span>
                </button>
              );
            })}
          </div>

          <div className="bs-search-row">
            <div className="bs-search-box">
              <span className="bs-search-icon" aria-hidden="true">🔍</span>
              <input
                type="text"
                className="input-text bs-search-input"
                placeholder="Search buildings..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                aria-label="Search buildings"
              />
              {searchQuery && (
                <button
                  type="button"
                  className="bs-search-clear"
                  onClick={() => setSearchQuery('')}
                  title="Clear search"
                  aria-label="Clear search"
                >
                  ✕
                </button>
              )}
            </div>

            <select
              className="select bs-tribe-select"
              value={selectedTribe}
              onChange={(e) => setSelectedTribe(e.target.value)}
              aria-label="Filter by tribe"
            >
              {TRIBES.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Building Cards Grid */}
        <div className="bs-grid" role="listbox" aria-label="Select building">
          {filteredBuildings.map((b) => {
            const isSelected = b.gid === selectedBuilding.gid;
            const iconUrl = buildingIcon(b.gid);
            const isCity = CITY_UPGRADEABLE_GIDS.has(b.gid);

            return (
              <button
                key={b.gid}
                type="button"
                role="option"
                aria-selected={isSelected}
                className={`bs-card ${isSelected ? 'is-selected' : ''}`}
                onClick={() => setSelectedGid(b.gid)}
              >
                {iconUrl && (
                  <img
                    src={iconUrl}
                    alt=""
                    className="bs-card__icon"
                    aria-hidden="true"
                  />
                )}
                <div className="bs-card__info">
                  <strong className="bs-card__name">{b.name}</strong>
                  <span className="bs-card__meta">
                    {b.category} · Max Lvl {isCity ? '20 (22 City)' : b.maxLevel}
                  </span>
                </div>
              </button>
            );
          })}
          {filteredBuildings.length === 0 && (
            <div className="bs-grid-empty">
              No buildings found matching &quot;{searchQuery}&quot;.
            </div>
          )}
        </div>
      </div>

      {/* Selected Building Detail & Stats */}
      <div className="bs-detail-panel">
        {/* Building Hero Header */}
        <div className="bs-hero">
          <div className="bs-hero__main">
            {buildingIcon(selectedBuilding.gid) && (
              <img
                src={buildingIcon(selectedBuilding.gid)}
                alt=""
                className="bs-hero__icon"
                aria-hidden="true"
              />
            )}
            <div className="bs-hero__info">
              <div className="bs-hero__title-row">
                <h2 className="bs-hero__title">{selectedBuilding.name}</h2>
                <span className="bs-hero__category-pill pill pill--tiny">
                  {selectedBuilding.category}
                </span>
                {isCityBuilding && (
                  <span className="pill pill--tiny pill--accent">
                    🏙️ City Upgradeable (Lvl 22)
                  </span>
                )}
              </div>
              <p className="bs-hero__description">
                Base Culture Points: <strong>+{selectedBuilding.cultureBase} CP/day</strong> · Max Level: <strong>{selectedBuilding.maxLevel}</strong>
              </p>

              {/* Prerequisites */}
              {prereqDescriptions.length > 0 && (
                <div className="bs-hero__prereqs">
                  <span className="bs-hero__prereqs-label">Prerequisites:</span>
                  <div className="bs-hero__prereqs-list">
                    {prereqDescriptions.map((req, idx) => (
                      <span key={idx} className="bs-prereq-badge">
                        {req}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Main Building Slider Controller */}
          <div className="bs-hero__controls">
            <div className="bs-mb-control">
              <div className="bs-mb-control__header">
                <label htmlFor="bs-mb-slider" className="bs-mb-control__label">
                  Main Building Level: <strong>Lvl {mbLevel}</strong>
                </label>
                <span className="bs-mb-control__factor">
                  Build Speed: <strong>{(100 / mbFactor).toFixed(0)}%</strong> ({(mbFactor * 100).toFixed(1)}% time)
                </span>
              </div>
              <input
                id="bs-mb-slider"
                type="range"
                min={1}
                max={20}
                step={1}
                value={mbLevel}
                onChange={(e) => setMbLevel(Number(e.target.value))}
                className="bs-mb-slider"
                aria-label="Main Building Level Slider"
              />
              <div className="bs-mb-ticks">
                <span>Lvl 1</span>
                <span>Lvl 5</span>
                <span>Lvl 10</span>
                <span>Lvl 15</span>
                <span>Lvl 20</span>
              </div>
            </div>
          </div>
        </div>

        {/* Aggregate Summary Stats */}
        <div className="bs-summary-grid">
          <div className="bs-summary-card">
            <span className="bs-summary-card__label">Total Cost to Lvl {totals.levelCount}</span>
            <strong className="bs-summary-card__value">
              {totals.totalCost.toLocaleString()} <small>res</small>
            </strong>
            <div className="bs-summary-card__sub">
              <span>🪵 {totals.wood.toLocaleString()}</span>
              <span>🧱 {totals.clay.toLocaleString()}</span>
              <span>⛏️ {totals.iron.toLocaleString()}</span>
              <span>🌾 {totals.crop.toLocaleString()}</span>
            </div>
          </div>

          <div className="bs-summary-card">
            <span className="bs-summary-card__label">Total Construction Time</span>
            <strong className="bs-summary-card__value">
              {formatTimeSeconds(totals.totalTime)}
            </strong>
            <span className="bs-summary-card__sub">
              Calculated at Main Building Lvl {mbLevel}
            </span>
          </div>

          <div className="bs-summary-card">
            <span className="bs-summary-card__label">Total Population at Max</span>
            <strong className="bs-summary-card__value">
              +{totals.maxPop} <small>Pop</small>
            </strong>
            <span className="bs-summary-card__sub">
              ~{(totals.totalCost / (totals.maxPop || 1)).toFixed(0)} res / Pop
            </span>
          </div>

          <div className="bs-summary-card">
            <span className="bs-summary-card__label">Culture Points at Max</span>
            <strong className="bs-summary-card__value">
              +{totals.maxCp} <small>CP/day</small>
            </strong>
            <span className="bs-summary-card__sub">
              ~{(totals.totalCost / (totals.maxCp || 1)).toFixed(0)} res / CP
            </span>
          </div>
        </div>

        {/* Full Level Progression Table */}
        <div className="bs-table-container">
          <table className="bs-table">
            <thead>
              <tr>
                <th className="bs-th bs-th--sticky">Lvl</th>
                <th className="bs-th">🪵 Wood</th>
                <th className="bs-th">🧱 Clay</th>
                <th className="bs-th">⛏️ Iron</th>
                <th className="bs-th">🌾 Crop</th>
                <th className="bs-th">Total Res</th>
                <th className="bs-th">Pop (Δ)</th>
                <th className="bs-th">CP/d (Δ)</th>
                <th className="bs-th">res / CP</th>
                <th className="bs-th">res / Pop</th>
                <th className="bs-th">Build Time (MB {mbLevel})</th>
                <th className="bs-th bs-th--effects">Effects & Production</th>
              </tr>
            </thead>
            <tbody>
              {selectedBuilding.levels.map((lvl, idx) => {
                const prevLvl = idx > 0 ? selectedBuilding.levels[idx - 1] : null;
                const levelCost = lvl.wood + lvl.clay + lvl.iron + lvl.crop;
                const popDelta = prevLvl ? lvl.pop - prevLvl.pop : lvl.pop;
                const cpDelta = prevLvl ? lvl.cp - prevLvl.cp : lvl.cp;
                const resPerCp = cpDelta > 0 ? Math.round(levelCost / cpDelta) : null;
                const resPerPop = popDelta > 0 ? Math.round(levelCost / popDelta) : null;
                const scaledTime = lvl.time !== null ? lvl.time * mbFactor : null;
                const isCityLevel = lvl.level > 20;

                const effectsList = Object.entries(lvl.effects || {})
                  .map(([k, v]) => formatEffectLabel(k, v))
                  .filter(Boolean);

                return (
                  <tr
                    key={lvl.level}
                    className={`bs-tr ${isCityLevel ? 'bs-tr--city' : ''}`}
                  >
                    <td className="bs-td bs-td--sticky bs-td--lvl">
                      <strong>Lvl {lvl.level}</strong>
                      {isCityLevel && (
                        <span className="bs-badge-city" title="City Only Level">
                          City
                        </span>
                      )}
                    </td>
                    <td className="bs-td">{lvl.wood.toLocaleString()}</td>
                    <td className="bs-td">{lvl.clay.toLocaleString()}</td>
                    <td className="bs-td">{lvl.iron.toLocaleString()}</td>
                    <td className="bs-td">{lvl.crop.toLocaleString()}</td>
                    <td className="bs-td bs-td--total-cost">
                      <strong>{levelCost.toLocaleString()}</strong>
                    </td>
                    <td className="bs-td">
                      {lvl.pop}{' '}
                      <span className="bs-delta-badge">
                        (+{popDelta})
                      </span>
                    </td>
                    <td className="bs-td">
                      +{lvl.cp}{' '}
                      <span className="bs-delta-badge">
                        (+{cpDelta})
                      </span>
                    </td>
                    <td className="bs-td bs-td--eff">
                      {resPerCp !== null ? `${resPerCp.toLocaleString()}` : '∞'}
                    </td>
                    <td className="bs-td bs-td--eff">
                      {resPerPop !== null ? `${resPerPop.toLocaleString()}` : '∞'}
                    </td>
                    <td className="bs-td bs-td--time">
                      {formatTimeSeconds(scaledTime)}
                    </td>
                    <td className="bs-td bs-td--effects">
                      {effectsList.length > 0 ? (
                        <div className="bs-effects-list">
                          {effectsList.map((eff, i) => (
                            <span key={i} className="bs-effect-pill">
                              {eff}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="bs-no-effect">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
