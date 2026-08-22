import { useState, useMemo, useEffect } from 'react';
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
    const slugParam = hashParams.get('b');
    if (slugParam) {
      const found = BUILDINGS.find(
        (b) => b.slug === slugParam || (slugParam === 'main-building' && b.gid === TOWN_HALL_GID)
      );
      if (found) return found.gid;
    }
    return TOWN_HALL_GID; // Default to Town Hall (GID 15)
  }, [hashParams]);

  const initialTh = useMemo(() => {
    const thParam = Number(hashParams.get('th') || hashParams.get('mb'));
    return thParam >= 1 && thParam <= 22 ? thParam : 20;
  }, [hashParams]);

  const initialSpeed = useMemo(() => {
    const speedParam = Number(hashParams.get('speed'));
    return (SPEED_OPTIONS as readonly number[]).includes(speedParam)
      ? (speedParam as ServerSpeed)
      : 1;
  }, [hashParams]);

  const [selectedGid, setSelectedGid] = useState<number>(initialGid);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [thLevel, setThLevel] = useState<number>(initialTh);
  const [serverSpeed, setServerSpeed] = useState<ServerSpeed>(initialSpeed);

  const selectedBuilding: CatalogBuilding =
    BUILDINGS_BY_GID.get(selectedGid) || BUILDINGS_BY_GID.get(TOWN_HALL_GID) || BUILDINGS[0];

  const isCityBuilding = CITY_UPGRADEABLE_GIDS.has(selectedBuilding.gid);
  const maxLvl = selectedBuilding.levels.length;

  // Table Row Selection State:
  // step: 0 = unselected (0 -> max), 1 = first click on A (A-1 -> A), 2 = second click on B (min -> max)
  // 3rd click resets back to step 0
  const [selection, setSelection] = useState<{ step: number; firstLevel: number | null; startLevel: number; endLevel: number }>({
    step: 0,
    firstLevel: null,
    startLevel: 0,
    endLevel: maxLvl,
  });

  // When building changes, reset selection
  useEffect(() => {
    setSelection({
      step: 0,
      firstLevel: null,
      startLevel: 0,
      endLevel: selectedBuilding.levels.length,
    });
  }, [selectedGid, selectedBuilding.levels.length]);

  // Sync state to URL hash
  useEffect(() => {
    const currentParams = new URLSearchParams(window.location.hash.replace(/^#/, ''));
    currentParams.set('tool', 'buildings');
    currentParams.set('b', selectedBuilding.slug);
    currentParams.set('th', String(thLevel));
    if (serverSpeed > 1) {
      currentParams.set('speed', String(serverSpeed));
    } else {
      currentParams.delete('speed');
    }

    window.history.replaceState(null, '', `${window.location.pathname}#${currentParams.toString()}`);
  }, [selectedBuilding.slug, thLevel, serverSpeed]);

  const thFactor = useMemo(() => getTownHallFactor(thLevel), [thLevel]);

  // Buildings partitioned by category
  const categorizedBuildings = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    const filterFn = (b: CatalogBuilding) => {
      if (!q) return true;
      return (
        b.name.toLowerCase().includes(q) ||
        b.category.toLowerCase().includes(q) ||
        b.slug.toLowerCase().includes(q)
      );
    };

    return {
      Resources: BUILDINGS.filter((b) => b.category === 'Resources' && filterFn(b)),
      Infrastructure: BUILDINGS.filter((b) => b.category === 'Infrastructure' && filterFn(b)),
      Military: BUILDINGS.filter((b) => b.category === 'Military' && filterFn(b)),
    };
  }, [searchQuery]);

  // Range summary calculations
  const rangeSummary = useMemo(() => {
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
    () => describePrerequisites(selectedBuilding),
    [selectedBuilding]
  );

  // Row click: 1st click = row A, 2nd click = row B (range), 3rd click = reset to full
  const handleRowClick = (lvlNum: number) => {
    if (selection.step === 0) {
      // Step 1: select level lvlNum (cost from lvlNum - 1 to lvlNum)
      setSelection({
        step: 1,
        firstLevel: lvlNum,
        startLevel: lvlNum - 1,
        endLevel: lvlNum,
      });
    } else if (selection.step === 1 && selection.firstLevel !== null) {
      // Step 2: select range from min(A, B) - 1 to max(A, B)
      const minL = Math.min(selection.firstLevel, lvlNum);
      const maxL = Math.max(selection.firstLevel, lvlNum);
      setSelection({
        step: 2,
        firstLevel: selection.firstLevel,
        startLevel: minL - 1,
        endLevel: maxL,
      });
    } else {
      // Step 3: 3rd click resets back to default (0 -> maxLvl)
      setSelection({
        step: 0,
        firstLevel: null,
        startLevel: 0,
        endLevel: maxLvl,
      });
    }
  };

  const woodIcon = statIcon('res_wood');
  const clayIcon = statIcon('res_clay');
  const ironIcon = statIcon('res_iron');
  const cropIcon = statIcon('res_crop');

  return (
    <div className="bs-container">
      {/* Search Bar */}
      <div className="bs-search-card">
        <div className="bs-search-row">
          <div className="bs-search-box">
            <span className="bs-search-icon" aria-hidden="true">🔍</span>
            <input
              type="text"
              className="input-text bs-search-input"
              placeholder="Search all 37 buildings..."
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
            Select a building to view complete stats, upgrade costs, and effects.
          </span>
        </div>
      </div>

      {/* 3 Categories Section (Compact, No Squishing, No Scroll) */}
      <div className="bs-catalog-sections">
        {CATEGORIES.map((cat) => {
          const list = categorizedBuildings[cat];
          if (list.length === 0) return null;

          const catEmoji = cat === 'Resources' ? '🌾' : cat === 'Infrastructure' ? '🏛️' : '⚔️';

          return (
            <div key={cat} className="bs-catalog-section">
              <h3 className="bs-catalog-section__title">
                <span>{catEmoji} {cat}</span>
                <span className="bs-badge-count">({list.length})</span>
              </h3>
              <div className="bs-grid" role="listbox" aria-label={`${cat} buildings`}>
                {list.map((b) => {
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

      {/* Selected Building Detail Panel */}
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

          {/* Construction Modifiers Controller */}
          <div className="bs-hero__controls">
            <div className="bs-modifiers-box">
              {/* Town Hall Slider */}
              <div className="bs-th-control">
                <div className="bs-th-control__header">
                  <label htmlFor="bs-th-slider" className="bs-th-control__label">
                    Town Hall Level: <strong>Lvl {thLevel}</strong>
                  </label>
                  <span className="bs-th-control__factor">
                    {(100 / thFactor).toFixed(0)}% Speed ({(thFactor * 100).toFixed(1)}% time)
                  </span>
                </div>
                <input
                  id="bs-th-slider"
                  type="range"
                  min={1}
                  max={22}
                  step={1}
                  value={thLevel}
                  onChange={(e) => setThLevel(Number(e.target.value))}
                  className="bs-mb-slider"
                  aria-label="Town Hall Level Slider"
                />
                <div className="bs-mb-ticks">
                  <span>L1</span>
                  <span>L5</span>
                  <span>L10</span>
                  <span>L15</span>
                  <span>L20</span>
                  <span>L22</span>
                </div>
              </div>

              {/* Server Speed Selector */}
              <div className="bs-speed-control">
                <span className="bs-speed-control__label">Server Speed:</span>
                <div className="bs-speed-buttons">
                  {SPEED_OPTIONS.map((spd) => (
                    <button
                      key={spd}
                      type="button"
                      className={`pill pill--tiny ${serverSpeed === spd ? 'pill--primary' : ''}`}
                      onClick={() => setServerSpeed(spd)}
                    >
                      {spd}x
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Range Selection Instructions / Status */}
        <div className="bs-selection-bar">
          <span className="bs-selection-tip">
            💡 <strong>Interactive Range:</strong> Click row <strong>A</strong> then row <strong>B</strong> in the table below to sum a level range (3rd click resets to full).
          </span>
          {rangeSummary.isCustomRange && (
            <button
              type="button"
              className="pill pill--tiny pill--secondary"
              onClick={() =>
                setSelection({
                  step: 0,
                  firstLevel: null,
                  startLevel: 0,
                  endLevel: maxLvl,
                })
              }
            >
              Reset to Full (Lvl 0 → {maxLvl})
            </button>
          )}
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
                  .map(([k, v]) => formatEffectLabel(k, v))
                  .filter(Boolean);
                const effectsText = effectsList.join(' · ');

                return (
                  <tr
                    key={lvl.level}
                    className={`bs-tr ${isCityLevel ? 'bs-tr--city' : ''} ${isInRange ? 'is-in-range' : ''}`}
                    onClick={() => handleRowClick(lvl.level)}
                    title={`Click to set range at Level ${lvl.level}`}
                  >
                    <td className="bs-td bs-td--sticky bs-td--lvl">
                      <strong>Lvl {lvl.level}</strong>
                      {isCityLevel && (
                        <span className="bs-badge-city" title="City Only Level">
                          City
                        </span>
                      )}
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
  );
}
