import { useState, useMemo, useEffect, useCallback } from 'react';
import { BUILDINGS, BUILDINGS_BY_GID, type CatalogBuilding } from '../data/buildingCatalog';
import { buildingIcon, statIcon } from '../icons';
import {
  getTownHallFactor,
  formatTimeSeconds,
  formatEffectLabel,
  describePrerequisites,
} from '../data/buildingEffects';
import { CITY_UPGRADEABLE_GIDS, TOWN_HALL_GID } from '../engine/cpOptimizer';

const SPEED_OPTIONS = [1, 2, 3, 5] as const;
type ServerSpeed = (typeof SPEED_OPTIONS)[number];

const CATEGORIES = ['Resources', 'Infrastructure', 'Military'] as const;

export function BuildingStats() {
  const hashParams = useMemo(() => {
    return new URLSearchParams(window.location.hash.replace(/^#/, ''));
  }, []);

  const initialGid = useMemo(() => {
    const gidParam = hashParams.get('gid');
    if (gidParam && BUILDINGS_BY_GID.has(Number(gidParam))) {
      return Number(gidParam);
    }
    const bSlug = hashParams.get('b');
    if (bSlug) {
      const found = BUILDINGS.find((b) => b.slug === bSlug);
      if (found) return found.gid;
    }
    return TOWN_HALL_GID; // Default Town Hall
  }, [hashParams]);

  const initialTh = useMemo(() => {
    const thParam = hashParams.get('th') || hashParams.get('mb');
    const parsed = thParam ? parseInt(thParam, 10) : NaN;
    return !isNaN(parsed) && parsed >= 1 && parsed <= 22 ? parsed : 20;
  }, [hashParams]);

  const initialSpeed = useMemo(() => {
    const speedParam = hashParams.get('speed');
    const parsed = speedParam ? parseInt(speedParam, 10) : NaN;
    return SPEED_OPTIONS.includes(parsed as ServerSpeed) ? (parsed as ServerSpeed) : 1;
  }, [hashParams]);

  const [selectedGid, setSelectedGid] = useState<number | null>(initialGid);
  const [thLevel, setThLevel] = useState<number>(initialTh);
  const [serverSpeed, setServerSpeed] = useState<ServerSpeed>(initialSpeed);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<'All' | (typeof CATEGORIES)[number]>('All');

  // Selected level range (3-click cycle)
  const [selection, setSelection] = useState<{
    step: number;
    firstLevel: number | null;
    startLevel: number;
    endLevel: number;
  }>({
    step: 0,
    firstLevel: null,
    startLevel: 0,
    endLevel: 22,
  });

  const selectedBuilding: CatalogBuilding | null = useMemo(() => {
    return selectedGid !== null ? BUILDINGS_BY_GID.get(selectedGid) ?? null : null;
  }, [selectedGid]);

  const maxLvl = selectedBuilding?.maxLevel ?? 20;
  const isCityBuilding = selectedBuilding ? CITY_UPGRADEABLE_GIDS.has(selectedBuilding.gid) : false;
  const thFactor = getTownHallFactor(thLevel);

  // Sync state to URL hash
  useEffect(() => {
    const params = new URLSearchParams(window.location.hash.replace(/^#/, ''));
    params.set('tool', 'buildings');
    if (selectedBuilding) {
      params.set('b', selectedBuilding.slug);
    } else {
      params.delete('b');
      params.delete('gid');
    }
    params.set('th', String(thLevel));
    if (serverSpeed !== 1) {
      params.set('speed', String(serverSpeed));
    } else {
      params.delete('speed');
    }
    const newHash = `#${params.toString()}`;
    if (window.location.hash !== newHash) {
      window.history.replaceState(null, '', newHash);
    }
  }, [selectedBuilding, thLevel, serverSpeed]);

  // Reset range selection when switching buildings
  useEffect(() => {
    if (selectedBuilding) {
      setSelection({
        step: 0,
        firstLevel: null,
        startLevel: 0,
        endLevel: selectedBuilding.maxLevel,
      });
    }
  }, [selectedBuilding?.gid, selectedBuilding?.maxLevel]);

  // Close modal handler
  const closeModal = useCallback(() => {
    setSelectedGid(null);
  }, []);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        closeModal();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [closeModal]);

  // Filtered buildings for browser
  const filteredBuildings = useMemo(() => {
    return BUILDINGS.filter((b) => {
      if (categoryFilter !== 'All' && b.category !== categoryFilter) return false;
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase().trim();
      const matchName = b.name.toLowerCase().includes(q);
      const matchCategory = b.category.toLowerCase().includes(q);
      const matchEffects = b.levels.some((lvl) =>
        Object.keys(lvl.effects || {}).some((k) => k.toLowerCase().includes(q))
      );
      return matchName || matchCategory || matchEffects;
    });
  }, [searchQuery, categoryFilter]);

  const categorizedBuildings = useMemo(() => {
    const map: Record<(typeof CATEGORIES)[number], CatalogBuilding[]> = {
      Resources: [],
      Infrastructure: [],
      Military: [],
    };
    for (const b of filteredBuildings) {
      if (map[b.category as (typeof CATEGORIES)[number]]) {
        map[b.category as (typeof CATEGORIES)[number]].push(b);
      }
    }
    return map;
  }, [filteredBuildings]);

  // Dynamic Range Summary
  const rangeSummary = useMemo(() => {
    if (!selectedBuilding) {
      return {
        startLevel: 0,
        endLevel: 0,
        wood: 0,
        clay: 0,
        iron: 0,
        crop: 0,
        totalCost: 0,
        totalTime: 0,
        popGain: 0,
        cpGain: 0,
        levelsCount: 0,
        isCustomRange: false,
      };
    }

    const startIdx = Math.max(0, Math.min(selection.startLevel, maxLvl));
    const endIdx = Math.max(startIdx, Math.min(selection.endLevel, maxLvl));

    let wood = 0;
    let clay = 0;
    let iron = 0;
    let crop = 0;
    let time = 0;

    for (let i = startIdx; i < endIdx; i++) {
      const lvl = selectedBuilding.levels[i];
      if (!lvl) continue;
      wood += lvl.wood;
      clay += lvl.clay;
      iron += lvl.iron;
      crop += lvl.crop;
      const baseTime = lvl.time ?? 0;
      time += (baseTime * thFactor) / serverSpeed;
    }

    const totalCost = wood + clay + iron + crop;
    const startPop = startIdx > 0 ? selectedBuilding.levels[startIdx - 1]?.pop || 0 : 0;
    const endPop = endIdx > 0 ? selectedBuilding.levels[endIdx - 1]?.pop || 0 : 0;
    const popGain = endPop - startPop;

    const startCp = startIdx > 0 ? selectedBuilding.levels[startIdx - 1]?.cp || 0 : 0;
    const endCp = endIdx > 0 ? selectedBuilding.levels[endIdx - 1]?.cp || 0 : 0;
    const cpGain = endCp - startCp;

    return {
      startLevel: startIdx,
      endLevel: endIdx,
      wood,
      clay,
      iron,
      crop,
      totalCost,
      totalTime: time,
      popGain,
      cpGain,
      levelsCount: endIdx - startIdx,
      isCustomRange: selection.step > 0,
    };
  }, [selectedBuilding, selection, maxLvl, thFactor, serverSpeed]);

  const prereqDescriptions = useMemo(
    () => (selectedBuilding ? describePrerequisites(selectedBuilding) : []),
    [selectedBuilding]
  );

  // Row click: 1st click = row A, 2nd click = row B (range), 3rd click = reset to full
  const handleRowClick = (lvlNum: number) => {
    if (selection.step === 0) {
      setSelection({
        step: 1,
        firstLevel: lvlNum,
        startLevel: lvlNum - 1,
        endLevel: lvlNum,
      });
    } else if (selection.step === 1 && selection.firstLevel !== null) {
      const minL = Math.min(selection.firstLevel, lvlNum);
      const maxL = Math.max(selection.firstLevel, lvlNum);
      setSelection({
        step: 2,
        firstLevel: selection.firstLevel,
        startLevel: minL - 1,
        endLevel: maxL,
      });
    } else {
      setSelection({
        step: 0,
        firstLevel: null,
        startLevel: 0,
        endLevel: maxLvl,
      });
    }
  };

  const handleSelectBuilding = (gid: number) => {
    setSelectedGid(gid);
  };

  const woodIcon = statIcon('res_wood');
  const clayIcon = statIcon('res_clay');
  const ironIcon = statIcon('res_iron');
  const cropIcon = statIcon('res_crop');

  return (
    <div className="bs-container">
      {/* Top Search & Filter Bar */}
      <div className="bs-search-card">
        <div className="bs-search-row">
          <div className="bs-search-box">
            <span className="bs-search-icon" aria-hidden="true">🔍</span>
            <input
              type="text"
              className="input-text bs-search-input"
              placeholder="Search all 39 buildings..."
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
          <span className="bs-search-hint">
            Click any building to open full stats, upgrade costs, construction times, and effects.
          </span>
        </div>

        {/* Category Filter Chips */}
        <div className="bs-category-filter-row">
          <button
            type="button"
            className={`pill pill--tiny ${categoryFilter === 'All' ? 'pill--primary is-active' : 'pill--secondary'}`}
            onClick={() => setCategoryFilter('All')}
          >
            All ({BUILDINGS.length})
          </button>
          {CATEGORIES.map((cat) => {
            const count = BUILDINGS.filter((b) => b.category === cat).length;
            const catEmoji = cat === 'Resources' ? '🌾' : cat === 'Infrastructure' ? '🏛️' : '⚔️';
            return (
              <button
                key={cat}
                type="button"
                className={`pill pill--tiny ${categoryFilter === cat ? 'pill--primary is-active' : 'pill--secondary'}`}
                onClick={() => setCategoryFilter(cat)}
              >
                {catEmoji} {cat} ({count})
              </button>
            );
          })}
        </div>
      </div>

      {/* 3-Column Category Browser Grid */}
      <div className="bs-columns-layout">
        {CATEGORIES.map((cat) => {
          const list = categorizedBuildings[cat];
          const catEmoji = cat === 'Resources' ? '🌾' : cat === 'Infrastructure' ? '🏛️' : '⚔️';

          return (
            <div key={cat} className="bs-category-column">
              <div className="bs-category-column__header">
                <h3 className="bs-category-column__title">
                  <span>{catEmoji} {cat}</span>
                  <span className="bs-badge-count">({list.length})</span>
                </h3>
              </div>
              <div className="bs-column-grid" role="listbox" aria-label={`${cat} buildings`}>
                {list.map((b) => {
                  const isSelected = selectedGid === b.gid;
                  const iconUrl = buildingIcon(b.gid);
                  const isCity = CITY_UPGRADEABLE_GIDS.has(b.gid);

                  return (
                    <button
                      key={b.gid}
                      type="button"
                      role="option"
                      aria-selected={isSelected}
                      className={`bs-card ${isSelected ? 'is-selected' : ''}`}
                      onClick={() => handleSelectBuilding(b.gid)}
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
                          Max Lvl {isCity ? '20 (22 City)' : b.maxLevel}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Building Details Modal Dialog */}
      {selectedBuilding && (
        <div className="bs-modal-overlay" onClick={closeModal}>
          <div
            className="bs-modal-content"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label={`${selectedBuilding.name} Stats & Details`}
          >
            {/* Top-Right Absolute Close Button */}
            <button
              type="button"
              className="bs-modal-close"
              onClick={closeModal}
              title="Close (Esc)"
              aria-label="Close modal"
            >
              ✕
            </button>

            {/* Modal Header: Hero Info */}
            <div className="bs-modal-header">
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
            </div>

            {/* Compact Modifiers Strip: Town Hall Dropdown & Server Speed */}
            <div className="bs-modal-modifiers">
              <div className="bs-modifier-item">
                <label htmlFor="bs-th-select" className="bs-modifier-label">
                  Town Hall:
                </label>
                <select
                  id="bs-th-select"
                  className="select bs-modifier-select"
                  value={thLevel}
                  onChange={(e) => setThLevel(Number(e.target.value))}
                  aria-label="Town Hall Level"
                >
                  {Array.from({ length: 22 }, (_, i) => i + 1).map((lvl) => {
                    const factor = getTownHallFactor(lvl);
                    const speedPct = (100 / factor).toFixed(0);
                    return (
                      <option key={lvl} value={lvl}>
                        Lvl {lvl} ({speedPct}% speed · {(factor * 100).toFixed(1)}% time)
                      </option>
                    );
                  })}
                </select>
              </div>

              <div className="bs-modifier-item">
                <span className="bs-modifier-label">Server Speed:</span>
                <div className="bs-speed-buttons">
                  {SPEED_OPTIONS.map((spd) => (
                    <button
                      key={spd}
                      type="button"
                      className={`bs-speed-btn ${serverSpeed === spd ? 'is-selected' : ''}`}
                      onClick={() => setServerSpeed(spd)}
                    >
                      {spd}x
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Range Selection Instructions Bar */}
            <div className="bs-selection-bar">
              <span className="bs-selection-tip">
                💡 <strong>Interactive Range:</strong> Click row <strong>A</strong> then row <strong>B</strong> in the table below to sum a level range (3rd click resets to full).
              </span>
            </div>

            {/* Dynamic Summary Cards */}
            <div className="bs-summary-grid">
              <div className="bs-summary-card">
                <span className="bs-summary-card__label">
                  Total Cost (Lvl {rangeSummary.startLevel} → {rangeSummary.endLevel})
                </span>
                <strong className="bs-summary-card__value">
                  {rangeSummary.totalCost.toLocaleString()} <small>res</small>
                </strong>
                <div className="bs-summary-card__res-row">
                  <span className="bs-res-item">
                    {woodIcon && <img src={woodIcon} alt="Wood" className="bs-res-icon" />}
                    {rangeSummary.wood.toLocaleString()}
                  </span>
                  <span className="bs-res-item">
                    {clayIcon && <img src={clayIcon} alt="Clay" className="bs-res-icon" />}
                    {rangeSummary.clay.toLocaleString()}
                  </span>
                  <span className="bs-res-item">
                    {ironIcon && <img src={ironIcon} alt="Iron" className="bs-res-icon" />}
                    {rangeSummary.iron.toLocaleString()}
                  </span>
                  <span className="bs-res-item">
                    {cropIcon && <img src={cropIcon} alt="Crop" className="bs-res-icon" />}
                    {rangeSummary.crop.toLocaleString()}
                  </span>
                </div>
              </div>

              <div className="bs-summary-card">
                <span className="bs-summary-card__label">
                  Total Build Time ({rangeSummary.levelsCount} {rangeSummary.levelsCount === 1 ? 'level' : 'levels'})
                </span>
                <strong className="bs-summary-card__value">
                  {formatTimeSeconds(rangeSummary.totalTime)}
                </strong>
                <span className="bs-summary-card__sub">
                  Town Hall Lvl {thLevel} · {serverSpeed}x Speed
                </span>
              </div>

              <div className="bs-summary-card">
                <span className="bs-summary-card__label">Population Gained</span>
                <strong className="bs-summary-card__value">
                  +{rangeSummary.popGain} <small>Pop</small>
                </strong>
                <span className="bs-summary-card__sub">
                  {rangeSummary.popGain > 0
                    ? `~${Math.round(rangeSummary.totalCost / rangeSummary.popGain).toLocaleString()} res / Pop`
                    : '0 Pop'}
                </span>
              </div>

              <div className="bs-summary-card">
                <span className="bs-summary-card__label">Culture Points Gained</span>
                <strong className="bs-summary-card__value">
                  +{rangeSummary.cpGain} <small>CP/day</small>
                </strong>
                <span className="bs-summary-card__sub">
                  {rangeSummary.cpGain > 0
                    ? `~${Math.round(rangeSummary.totalCost / rangeSummary.cpGain).toLocaleString()} res / CP`
                    : '0 CP'}
                </span>
              </div>
            </div>

            {/* Full Level Progression Table */}
            <div className="bs-table-container">
              <table className="bs-table">
                <thead>
                  <tr>
                    <th className="bs-th bs-th--sticky">Lvl</th>
                    <th className="bs-th">
                      <span className="bs-th-content">
                        {woodIcon && <img src={woodIcon} alt="" className="bs-res-icon" />} Wood
                      </span>
                    </th>
                    <th className="bs-th">
                      <span className="bs-th-content">
                        {clayIcon && <img src={clayIcon} alt="" className="bs-res-icon" />} Clay
                      </span>
                    </th>
                    <th className="bs-th">
                      <span className="bs-th-content">
                        {ironIcon && <img src={ironIcon} alt="" className="bs-res-icon" />} Iron
                      </span>
                    </th>
                    <th className="bs-th">
                      <span className="bs-th-content">
                        {cropIcon && <img src={cropIcon} alt="" className="bs-res-icon" />} Crop
                      </span>
                    </th>
                    <th className="bs-th">Total Res</th>
                    <th className="bs-th">Pop (Δ)</th>
                    <th className="bs-th">CP/d (Δ)</th>
                    <th className="bs-th">res / CP</th>
                    <th className="bs-th">res / Pop</th>
                    <th className="bs-th">Build Time (TH {thLevel})</th>
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
                    const baseTime = lvl.time ?? 0;
                    const scaledTime = lvl.time !== null ? (baseTime * thFactor) / serverSpeed : null;
                    const isCityLevel = lvl.level > 20;
                    const isInRange = selection.step > 0 && lvl.level > selection.startLevel && lvl.level <= selection.endLevel;

                    const effectsList = Object.entries(lvl.effects || {})
                      .map(([k, v]) => formatEffectLabel(k, v, serverSpeed))
                      .filter(Boolean);
                    const effectsText = effectsList.join(' · ');

                    return (
                      <tr
                        key={lvl.level}
                        className={`bs-tr ${isCityLevel ? 'bs-tr--city' : ''} ${isInRange ? 'is-in-range' : ''}`}
                        onClick={() => handleRowClick(lvl.level)}
                        title={`Click to set range at Level ${lvl.level}`}
                      >
                        <td className="bs-td bs-td--sticky">
                          <div className="bs-td-lvl-content">
                            <strong>Lvl {lvl.level}</strong>
                            {isCityLevel && (
                              <span className="bs-badge-city" title="City Only Level">
                                City
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="bs-td">
                          <span className="bs-cell-res">
                            {woodIcon && <img src={woodIcon} alt="" className="bs-res-icon" />}
                            {lvl.wood.toLocaleString()}
                          </span>
                        </td>
                        <td className="bs-td">
                          <span className="bs-cell-res">
                            {clayIcon && <img src={clayIcon} alt="" className="bs-res-icon" />}
                            {lvl.clay.toLocaleString()}
                          </span>
                        </td>
                        <td className="bs-td">
                          <span className="bs-cell-res">
                            {ironIcon && <img src={ironIcon} alt="" className="bs-res-icon" />}
                            {lvl.iron.toLocaleString()}
                          </span>
                        </td>
                        <td className="bs-td">
                          <span className="bs-cell-res">
                            {cropIcon && <img src={cropIcon} alt="" className="bs-res-icon" />}
                            {lvl.crop.toLocaleString()}
                          </span>
                        </td>
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
                        <td className="bs-td bs-td--effects" title={effectsText || undefined}>
                          {effectsText ? (
                            <span className="bs-effect-text">{effectsText}</span>
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
      )}
    </div>
  );
}
