import { useState, useMemo, useEffect } from 'react';
import {
  BUILDINGS,
  BUILDINGS_BY_GID,
} from '../data/buildingCatalog';
import {
  getRecommendations,
  villageBuildingCp,
  villageFieldCp,
  villageCityCp,
  villageTotalCp,
  villageBuildingPop,
  villageFieldPop,
  villageTotalPop,
  usedBuildingSlots,
  buildingSlotCapacity,
  encodeVillageCompact,
  decodeVillageCompact,
  type VillageState,
  type VillageBuilding,
  type OptimizerStep,
  type OptimizerMetric,
  MAIN_BUILDING_GID,
  PALACE_GID,
  RESIDENCE_GID,
} from '../engine/cpOptimizer';
import { factions } from '../data/factions';
import { buildingIcon } from '../icons';

const STORAGE_KEY = 'thronewake.cpOptimizer.state.v1';

function defaultVillage(): VillageState {
  return {
    id: 'v1',
    name: 'Village 1',
    faction: 'embermark_dominion',
    isCapital: true,
    isCity: false,
    fieldLevel: 0,
    extensionSlots: 0,
    buildings: [
      { id: 'b1', gid: MAIN_BUILDING_GID, level: 1 },
    ],
  };
}

interface OptimizerAppState {
  activeVillageId: string;
  villages: VillageState[];
}

function loadInitialState(): OptimizerAppState {
  try {
    const hash = window.location.hash.replace(/^[#?]/, '');
    const params = new URLSearchParams(hash);
    const p = params.get('v') || params.get('plan');
    if (p) {
      const decoded = decodeVillageCompact(p);
      if (decoded) {
        return {
          activeVillageId: decoded.id,
          villages: [decoded],
        };
      }
    }
  } catch {}

  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed.villages) && parsed.villages.length > 0) {
        return {
          activeVillageId: parsed.activeVillageId || parsed.villages[0].id,
          villages: parsed.villages,
        };
      }
    }
  } catch {}

  return {
    activeVillageId: 'v1',
    villages: [defaultVillage()],
  };
}

export function CpOptimizer() {
  const [appState, setAppState] = useState<OptimizerAppState>(() => loadInitialState());
  const [copied, setCopied] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerCategory, setPickerCategory] = useState<string>('all');
  const [pickerSearch, setPickerSearch] = useState<string>('');

  const [optimizerMetric, setOptimizerMetric] = useState<OptimizerMetric>('cp');

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(appState));
    } catch {}
  }, [appState]);

  useEffect(() => {
    const handleHashChange = () => {
      try {
        const hash = window.location.hash.replace(/^[#?]/, '');
        const params = new URLSearchParams(hash);
        const m = params.get('m');
        if (m === 'pop' || m === 'cp') {
          setOptimizerMetric(m);
        }
        const p = params.get('v') || params.get('plan');
        if (p) {
          const decoded = decodeVillageCompact(p);
          if (decoded) {
            setAppState((prev) => {
              const exists = prev.villages.find((v) => v.id === decoded.id || v.name === decoded.name);
              const nextVillages = exists
                ? prev.villages.map((v) => (v.id === exists.id ? decoded : v))
                : [decoded, ...prev.villages];
              return {
                ...prev,
                activeVillageId: decoded.id,
                villages: nextVillages,
              };
            });
          }
        }
      } catch {}
    };
    window.addEventListener('hashchange', handleHashChange);
    window.addEventListener('popstate', handleHashChange);
    return () => {
      window.removeEventListener('hashchange', handleHashChange);
      window.removeEventListener('popstate', handleHashChange);
    };
  }, []);

  const activeVillage = useMemo(() => {
    return appState.villages.find((v) => v.id === appState.activeVillageId) || appState.villages[0] || defaultVillage();
  }, [appState.villages, appState.activeVillageId]);

  const shareHash = useMemo(() => {
    const compact = encodeVillageCompact(activeVillage);
    return `tool=optimizer&m=${optimizerMetric}&v=` + encodeURIComponent(compact);
  }, [activeVillage, optimizerMetric]);

  useEffect(() => {
    window.history.replaceState(null, '', window.location.pathname + '#' + shareHash);
  }, [shareHash]);

  const copyShareLink = async () => {
    const fullUrl = window.location.origin + window.location.pathname + '#' + shareHash;
    try {
      await navigator.clipboard.writeText(fullUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      window.location.hash = shareHash;
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const patchActiveVillage = (patch: Partial<VillageState>) => {
    setAppState((prev) => ({
      ...prev,
      villages: prev.villages.map((v) => (v.id === activeVillage.id ? { ...v, ...patch } : v)),
    }));
  };

  const toggleCapital = () => {
    const nextIsCapital = !activeVillage.isCapital;
    let updatedBuildings = activeVillage.buildings;
    if (nextIsCapital) {
      updatedBuildings = updatedBuildings.map((b) => (b.gid === RESIDENCE_GID ? { ...b, gid: PALACE_GID } : b));
    } else {
      updatedBuildings = updatedBuildings.map((b) => (b.gid === PALACE_GID ? { ...b, gid: RESIDENCE_GID } : b));
    }

    patchActiveVillage({
      isCapital: nextIsCapital,
      buildings: updatedBuildings,
    });
  };

  const addVillage = () => {
    const newId = 'v' + Date.now();
    const newV: VillageState = {
      ...defaultVillage(),
      id: newId,
      name: 'Village ' + (appState.villages.length + 1),
      isCapital: appState.villages.length === 0,
      faction: activeVillage.faction,
    };
    setAppState((prev) => ({
      ...prev,
      activeVillageId: newId,
      villages: [...prev.villages, newV],
    }));
  };

  const removeVillage = (vId: string) => {
    if (appState.villages.length <= 1) return;
    setAppState((prev) => {
      const nextList = prev.villages.filter((v) => v.id !== vId);
      return {
        ...prev,
        activeVillageId: prev.activeVillageId === vId ? nextList[0].id : prev.activeVillageId,
        villages: nextList,
      };
    });
  };

  const moveVillage = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= appState.villages.length) return;
    const newVillages = [...appState.villages];
    const temp = newVillages[index];
    newVillages[index] = newVillages[targetIndex];
    newVillages[targetIndex] = temp;
    setAppState((prev) => ({
      ...prev,
      villages: newVillages,
    }));
  };

  const bCp = useMemo(() => villageBuildingCp(activeVillage), [activeVillage]);
  const fCp = useMemo(() => villageFieldCp(activeVillage), [activeVillage]);
  const cCp = useMemo(() => villageCityCp(activeVillage), [activeVillage]);
  const currentDailyCp = useMemo(() => villageTotalCp(activeVillage), [activeVillage]);
  const empireDailyCp = useMemo(
    () => appState.villages.reduce((sum, v) => sum + villageTotalCp(v), 0),
    [appState.villages]
  );

  const bPop = useMemo(() => villageBuildingPop(activeVillage), [activeVillage]);
  const fPop = useMemo(() => villageFieldPop(activeVillage), [activeVillage]);
  const currentTotalPop = useMemo(() => villageTotalPop(activeVillage), [activeVillage]);
  const empireTotalPop = useMemo(
    () => appState.villages.reduce((sum, v) => sum + villageTotalPop(v), 0),
    [appState.villages]
  );

  const usedSlots = useMemo(() => usedBuildingSlots(activeVillage), [activeVillage]);
  const totalSlots = useMemo(() => buildingSlotCapacity(activeVillage), [activeVillage]);

  const recommendations = useMemo(() => {
    return getRecommendations(activeVillage, optimizerMetric);
  }, [activeVillage, optimizerMetric]);

  const updateBuildingLevel = (bId: string, delta: number) => {
    const targetB = activeVillage.buildings.find((b) => b.id === bId);
    if (!targetB) return;
    const catalogEntry = BUILDINGS_BY_GID.get(targetB.gid);
    const maxL = catalogEntry ? catalogEntry.maxLevel : 20;
    const nextLevel = Math.max(1, Math.min(maxL, targetB.level + delta));

    patchActiveVillage({
      buildings: activeVillage.buildings.map((b) =>
        b.id === bId ? { ...b, level: nextLevel } : b
      ),
    });
  };

  const removeBuilding = (bId: string) => {
    patchActiveVillage({
      buildings: activeVillage.buildings.filter((b) => b.id !== bId),
    });
  };

  const addBuildingToVillage = (gid: number) => {
    const catalogEntry = BUILDINGS_BY_GID.get(gid);
    if (!catalogEntry) return;

    const existing = activeVillage.buildings.find((b) => b.gid === gid);
    if (existing) {
      updateBuildingLevel(existing.id, 1);
      setPickerOpen(false);
      return;
    }

    const newBuilding: VillageBuilding = {
      id: 'b' + Date.now(),
      gid,
      level: 1,
    };

    patchActiveVillage({
      buildings: [...activeVillage.buildings, newBuilding],
    });
    setPickerOpen(false);
  };

  const applyRecommendation = (rec: OptimizerStep) => {
    const existing = activeVillage.buildings.find((b) => b.gid === rec.gid);
    if (existing) {
      patchActiveVillage({
        buildings: activeVillage.buildings.map((b) =>
          b.id === existing.id ? { ...b, level: Math.max(b.level, rec.level) } : b
        ),
      });
    } else {
      patchActiveVillage({
        buildings: [
          ...activeVillage.buildings,
          { id: 'b' + Date.now(), gid: rec.gid, level: rec.level },
        ],
      });
    }
  };

  const availableBuildings = useMemo(() => {
    return BUILDINGS.filter((b) => {
      if ([1, 2, 3, 4, 40].includes(b.gid)) return false;
      if (b.gid === PALACE_GID && !activeVillage.isCapital) return false;
      if (b.gid === RESIDENCE_GID && activeVillage.isCapital) return false;

      if (pickerCategory !== 'all' && b.category.toLowerCase() !== pickerCategory.toLowerCase()) {
        return false;
      }
      if (pickerSearch.trim()) {
        const query = pickerSearch.toLowerCase();
        return b.name.toLowerCase().includes(query) || b.slug.toLowerCase().includes(query);
      }
      return true;
    });
  }, [pickerCategory, pickerSearch, activeVillage.isCapital]);

  const categories = ['all', 'Infrastructure', 'Military', 'Resources'];

  return (
    <div className="cp-optimizer-page">
      {/* Header Bar */}
      <div className="cp-header-wrap">
        <div>
          <h1 className="tool-header__title">
            {optimizerMetric === 'pop' ? '👥 Population Build-Order Optimizer' : '🏛️ Culture Point Build-Order Optimizer'}
          </h1>
          <p className="tool-header__tagline">
            {optimizerMetric === 'pop'
              ? 'Calculate the cheapest, mathematically optimal building upgrade sequence to maximize village Population per resource spent.'
              : 'Calculate the cheapest, mathematically optimal building upgrade sequence to maximize Culture Points per resource spent.'}
          </p>
        </div>

        <div className="cp-header-controls" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {/* Mode Switcher Toggle */}
          <div className="pill-group" style={{ display: 'flex' }}>
            <button
              type="button"
              className={'pill ' + (optimizerMetric === 'cp' ? 'pill--primary is-active' : '')}
              onClick={() => setOptimizerMetric('cp')}
              title="Optimize build sequence for Culture Points (CP)"
            >
              🏛️ CP Mode
            </button>
            <button
              type="button"
              className={'pill ' + (optimizerMetric === 'pop' ? 'pill--primary is-active' : '')}
              onClick={() => setOptimizerMetric('pop')}
              title="Optimize build sequence for Population (Pop)"
            >
              👥 Pop Mode
            </button>
          </div>

          {/* Share Link Button */}
          <button
            type="button"
            className="pill pill--action pill--share"
            onClick={copyShareLink}
            title="Copy shareable link with village setup to clipboard"
          >
            {copied ? '✓ Copied!' : '🔗 Copy Share Link'}
          </button>
        </div>
      </div>

      {/* Optimizer Layout: Left Sidebar for Villages + Right Main Area */}
      <div className="cp-layout">
        {/* Left Vertical Village Sidebar */}
        <aside className="cp-sidebar panel">
          <div className="op-section-head">
            <div>
              <span className="op-section-tag op-section-tag--attacker">Villages</span>
              <h2 className="panel__title">Realm ({appState.villages.length})</h2>
            </div>
            <button
              type="button"
              className="pill pill--tiny pill--primary"
              onClick={addVillage}
              title="Add another village"
            >
              + Add
            </button>
          </div>

          <div className="cp-village-list-vertical">
            {appState.villages.map((v, idx) => {
              const isCurrent = v.id === activeVillage.id;
              const vCp = villageTotalCp(v);
              const vPop = villageTotalPop(v);
              const vSlots = usedBuildingSlots(v);
              const vMaxSlots = buildingSlotCapacity(v);

              return (
                <div
                  key={v.id}
                  className={'cp-village-card-v ' + (isCurrent ? 'is-active' : '')}
                  onClick={() => setAppState((prev) => ({ ...prev, activeVillageId: v.id }))}
                  role="button"
                  tabIndex={0}
                >
                  <div className="cp-village-card-v__head">
                    <div className="cp-village-card-v__title">
                      <span className="cp-village-card-v__idx">#{idx + 1}</span>
                      <strong className="cp-village-card-v__name">{v.name || 'Village ' + (idx + 1)}</strong>
                    </div>

                    <div className="cp-village-card-v__reorder">
                      <button
                        type="button"
                        className="cp-reorder-btn"
                        disabled={idx === 0}
                        onClick={(e) => {
                          e.stopPropagation();
                          moveVillage(idx, 'up');
                        }}
                        title="Move village up"
                      >
                        ▲
                      </button>
                      <button
                        type="button"
                        className="cp-reorder-btn"
                        disabled={idx === appState.villages.length - 1}
                        onClick={(e) => {
                          e.stopPropagation();
                          moveVillage(idx, 'down');
                        }}
                        title="Move village down"
                      >
                        ▼
                      </button>
                      {appState.villages.length > 1 && (
                        <button
                          type="button"
                          className="cp-village-card-v__remove"
                          onClick={(e) => {
                            e.stopPropagation();
                            removeVillage(v.id);
                          }}
                          title="Delete this village"
                        >
                          ×
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="cp-village-card-v__meta">
                    <span className="cp-village-card-v__cp">
                      {optimizerMetric === 'pop' ? `${vPop.toLocaleString()} Pop` : `+${vCp.toLocaleString()} CP/d`}
                    </span>
                    <span className="cp-village-card-v__slots">{vSlots}/{vMaxSlots} slots</span>
                  </div>

                  <div className="cp-village-card-v__badges">
                    {v.isCapital ? (
                      <span className="cp-badge cp-badge--capital" title="Capital">👑 Palace</span>
                    ) : (
                      <span className="cp-badge" title="Non-Capital">🏠 Residence</span>
                    )}
                    {v.isCity && <span className="cp-badge cp-badge--city" title="City">🏙️ City</span>}
                  </div>
                </div>
              );
            })}
          </div>
        </aside>

        {/* Right Main Content Area */}
        <main className="cp-main-content">
          {/* Main Grid: Village Settings + Metrics Dashboard */}
          <div className="cp-top-grid">
            {/* Village Settings Panel */}
            <section className="panel cp-settings-panel">
              <div className="op-section-head">
                <div>
                  <span className="op-section-tag op-section-tag--attacker">Village Context</span>
                  <h2 className="panel__title">Settings: {activeVillage.name}</h2>
                </div>
              </div>

              <div className="cp-settings-grid">
                {/* Village Name & Faction */}
                <div className="cp-setting-item">
                  <label className="cp-label">
                    <span>Village Name</span>
                    <input
                      type="text"
                      className="text-input"
                      value={activeVillage.name}
                      onChange={(e) => patchActiveVillage({ name: e.target.value })}
                    />
                  </label>
                </div>

                <div className="cp-setting-item">
                  <label className="cp-label">
                    <span>Faction</span>
                    <select
                      className="text-input"
                      value={activeVillage.faction}
                      onChange={(e) => patchActiveVillage({ faction: e.target.value })}
                    >
                      {factions.map((f) => (
                        <option key={f.key} value={f.key}>
                          {f.name}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>

                {/* Capital (Palace) & City Status */}
                <div className="cp-setting-item cp-setting-item--toggles">
                  <button
                    type="button"
                    className={'pill pill--toggle ' + (activeVillage.isCapital ? 'is-active' : '')}
                    onClick={toggleCapital}
                    title={activeVillage.isCapital ? 'Capital uses Palace' : 'Non-Capital uses Residence'}
                  >
                    {activeVillage.isCapital ? '👑 Capital (Palace) ✓' : '🏠 Residence (Non-Capital)'}
                  </button>
                  <button
                    type="button"
                    className={'pill pill--toggle ' + (activeVillage.isCity ? 'is-active' : '')}
                    onClick={() => patchActiveVillage({ isCity: !activeVillage.isCity })}
                    title="City grants +200 flat CP/day and +25% bonus from buildings & fields"
                  >
                    {activeVillage.isCity ? '🏙️ City (+200 & +25%) ✓' : '🏙️ Upgrade to City'}
                  </button>
                </div>

                {/* Average Field Level */}
                <div className="cp-setting-item">
                  <label className="cp-label" title="Average resource field level (18 fields total)">
                    <span>Avg Resource Field Level (0–20): <strong>{activeVillage.fieldLevel || 0}</strong></span>
                    <div className="cp-field-slider-wrap">
                      <input
                        type="range"
                        min="0"
                        max="20"
                        value={activeVillage.fieldLevel || 0}
                        onChange={(e) => patchActiveVillage({ fieldLevel: Number(e.target.value) })}
                        className="cp-slider"
                      />
                      <span className="cp-field-cp-tag">
                        {optimizerMetric === 'pop' ? `+${fPop} Pop` : `+${fCp} CP/d`}
                      </span>
                    </div>
                  </label>
                </div>

                {/* Additional Slots Counter */}
                <div className="cp-setting-item">
                  <label className="cp-label" title="Additional building slots beyond the base 20">
                    <span>Additional Building Slots</span>
                    <div className="cp-counter-wrap">
                      <button
                        type="button"
                        className="pill pill--tiny"
                        disabled={(activeVillage.extensionSlots || 0) <= 0}
                        onClick={() => patchActiveVillage({ extensionSlots: Math.max(0, (activeVillage.extensionSlots || 0) - 1) })}
                      >
                        -
                      </button>
                      <input
                        type="number"
                        min="0"
                        className="text-input cp-counter-input"
                        value={activeVillage.extensionSlots || 0}
                        onChange={(e) => patchActiveVillage({ extensionSlots: Math.max(0, Number(e.target.value) || 0) })}
                      />
                      <button
                        type="button"
                        className="pill pill--tiny"
                        onClick={() => patchActiveVillage({ extensionSlots: (activeVillage.extensionSlots || 0) + 1 })}
                      >
                        +
                      </button>
                    </div>
                  </label>
                </div>
              </div>
            </section>

            {/* Live Metrics Dashboard */}
            <section className="panel cp-dashboard-panel">
              <div className="op-section-head">
                <div>
                  <span className="op-section-tag op-section-tag--target">Live Overview</span>
                  <h2 className="panel__title">
                    {optimizerMetric === 'pop' ? 'Population & Slots' : 'Culture Points & Slots'}
                  </h2>
                </div>
              </div>

              <div className="cp-metrics-grid">
                {/* Metric 1: Village Production / Total */}
                <div className="cp-stat-card">
                  <span className="cp-stat-card__label">
                    {optimizerMetric === 'pop' ? 'Total Village Population' : 'Daily CP Production'}
                  </span>
                  <span className="cp-stat-card__val">
                    {optimizerMetric === 'pop' ? (
                      <>{currentTotalPop.toLocaleString()} <small>Pop</small></>
                    ) : (
                      <>{Math.round(currentDailyCp).toLocaleString()} <small>CP/day</small></>
                    )}
                  </span>
                  <div className="cp-stat-card__breakdown">
                    {optimizerMetric === 'pop' ? (
                      <>
                        <span>Buildings: <strong>{bPop}</strong></span>
                        <span>·</span>
                        <span>Fields: <strong>{fPop}</strong></span>
                      </>
                    ) : (
                      <>
                        <span>Buildings: <strong>{bCp}</strong></span>
                        <span>·</span>
                        <span>Fields: <strong>{fCp}</strong></span>
                        {activeVillage.isCity && (
                          <>
                            <span>·</span>
                            <span title="Flat +200 CP + 25% of buildings & fields">City: <strong>+{cCp}</strong></span>
                          </>
                        )}
                      </>
                    )}
                  </div>
                </div>

                {/* Metric 2: Empire Stats */}
                <div className="cp-stat-card">
                  <span className="cp-stat-card__label">
                    {optimizerMetric === 'pop' ? 'Empire Population' : 'Empire Daily CP'}
                  </span>
                  <span className="cp-stat-card__val">
                    {optimizerMetric === 'pop' ? (
                      <>{empireTotalPop.toLocaleString()} <small>Pop</small></>
                    ) : (
                      <>{Math.round(empireDailyCp).toLocaleString()} <small>CP/d</small></>
                    )}
                  </span>
                  <div className="cp-stat-card__breakdown">
                    <span>{appState.villages.length} {appState.villages.length === 1 ? 'village' : 'villages'} in realm</span>
                  </div>
                </div>

                {/* Metric 3: Slot Usage */}
                <div className="cp-stat-card">
                  <span className="cp-stat-card__label">Shared Building Slots</span>
                  <span className={'cp-stat-card__val ' + (usedSlots >= totalSlots ? 'is-full' : '')}>
                    {usedSlots} / {totalSlots} <small>slots used</small>
                  </span>
                  <div className="cp-stat-card__breakdown">
                    <span>{totalSlots - usedSlots} slots remaining</span>
                  </div>
                </div>
              </div>
            </section>
          </div>

          {/* Main Workspace: Left Column (Current Buildings) + Right Column (Recommendations) */}
          <div className="cp-workspace-grid">
            {/* Current Buildings Section */}
            <section className="panel cp-buildings-panel">
              <div className="op-section-head">
                <div>
                  <span className="op-section-tag op-section-tag--attacker">Village State</span>
                  <h2 className="panel__title">Current Buildings ({activeVillage.buildings.length})</h2>
                  <p className="op-section-copy">
                    Set your existing building levels. Recommendations will build on top of these.
                  </p>
                </div>

                <div className="op-section-head__actions">
                  <button
                    type="button"
                    className="pill pill--tiny pill--primary"
                    onClick={() => setPickerOpen(true)}
                  >
                    + Add Building
                  </button>
                </div>
              </div>

              {/* Buildings List (Page scrolls naturally) */}
              <div className="cp-buildings-list">
                {activeVillage.buildings.map((b) => {
                  const catalogEntry = BUILDINGS_BY_GID.get(b.gid);
                  const name = catalogEntry ? catalogEntry.name : 'Building #' + b.gid;
                  const maxL = catalogEntry ? catalogEntry.maxLevel : 20;
                  const levelCp = catalogEntry && catalogEntry.levels[b.level - 1] ? catalogEntry.levels[b.level - 1].cp : 0;
                  const levelPop = catalogEntry && catalogEntry.levels[b.level - 1] ? catalogEntry.levels[b.level - 1].pop : 0;
                  const iconUrl = buildingIcon(b.gid);

                  return (
                    <div key={b.id} className="cp-building-row">
                      <div className="cp-building-row__main">
                        {iconUrl && (
                          <img src={iconUrl} alt="" className="cp-building-icon" aria-hidden="true" />
                        )}
                        <div className="cp-building-row__info">
                          <strong className="cp-building-row__name">{name}</strong>
                          <span className="cp-building-row__meta">
                            {catalogEntry?.category} · {levelPop} Pop · +{levelCp} CP/d
                          </span>
                        </div>
                      </div>

                      <div className="cp-building-row__level-ctrl">
                        <button
                          type="button"
                          className="pill pill--tiny"
                          disabled={b.level <= 1}
                          onClick={() => updateBuildingLevel(b.id, -1)}
                          title="Decrease level"
                        >
                          -
                        </button>
                        <span className="cp-building-row__level">Lvl {b.level}</span>
                        <button
                          type="button"
                          className="pill pill--tiny"
                          disabled={b.level >= maxL}
                          onClick={() => updateBuildingLevel(b.id, 1)}
                          title="Increase level"
                        >
                          +
                        </button>
                      </div>

                      <button
                        type="button"
                        className="op-remove"
                        onClick={() => removeBuilding(b.id)}
                        title="Remove building"
                      >
                        ×
                      </button>
                    </div>
                  );
                })}
              </div>
            </section>

            {/* Actionable Recommendations Queue (Page scrolls naturally) */}
            <section className="panel cp-recommendations-panel">
              <div className="op-section-head">
                <div>
                  <span className="op-section-tag op-section-tag--target">Optimizer Output</span>
                  <h2 className="panel__title">
                    {optimizerMetric === 'pop' ? 'Population Build Order' : 'Recommended Build Order'} ({recommendations.length} steps)
                  </h2>
                  <p className="op-section-copy">
                    {optimizerMetric === 'pop'
                      ? 'Sorted by cheapest resource per Population gained. Prerequisite chains & storage caps are handled automatically.'
                      : 'Sorted by cheapest resource per CP gained. Prerequisite chains & storage caps are handled automatically.'}
                  </p>
                </div>
              </div>

              {recommendations.length === 0 ? (
                <div className="cp-rec-empty">
                  <p>No further upgrades available for the current village slot limit or configuration.</p>
                </div>
              ) : (
                <div className="cp-rec-list">
                  {recommendations.map((rec, idx) => {
                    const iconUrl = buildingIcon(rec.gid);
                    return (
                      <div key={rec.gid + '-' + rec.level + '-' + idx} className="cp-rec-card">
                        <div className="cp-rec-card__left">
                          <span className="cp-rec-card__step">#{idx + 1}</span>
                          {iconUrl && (
                            <img src={iconUrl} alt="" className="cp-building-icon" aria-hidden="true" />
                          )}
                          <div className="cp-rec-card__title-group">
                            <strong className="cp-rec-card__name">
                              {rec.name} <span className="cp-rec-card__level">Level {rec.level}</span>
                            </strong>
                            <span className="cp-rec-card__sub">
                              {rec.target ? (
                                <span className="cp-tag cp-tag--req">Req. for {resolveTargetLabel(rec.target)}</span>
                              ) : (
                                <span>{optimizerMetric === 'pop' ? `+${rec.popGain} Pop` : `+${rec.cpGain} CP/d`}</span>
                              )}
                              <span className="cp-rec-card__sep">·</span>
                              <span>Total: {rec.levelCost.toLocaleString()} res</span>
                            </span>
                          </div>
                        </div>

                        <div className="cp-rec-card__right">
                          <span className={'cp-efficiency-badge ' + (rec.isReqStep ? 'is-req' : '')}>
                            {rec.isReqStep
                              ? 'Prereq Step'
                              : optimizerMetric === 'pop'
                              ? Math.round(rec.costPerPopGain) + ' res/Pop'
                              : Math.round(rec.costPerCpGain) + ' res/CP'}
                          </span>

                          <button
                            type="button"
                            className="pill pill--tiny pill--primary cp-build-btn"
                            onClick={() => applyRecommendation(rec)}
                            title={'Apply this upgrade (' + rec.name + ' level ' + rec.level + ') to your village'}
                          >
                            🔨 Build
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          </div>
        </main>
      </div>

      <footer style={{ marginTop: '24px', textAlign: 'center', color: 'var(--text-faint)', fontSize: '11.5px' }}>
        <span>
          CP Build-Order Optimization engine adapted from{' '}
          <a
            href="https://github.com/Qira95/kingdomoptimizer"
            target="_blank"
            rel="noreferrer"
            style={{ color: 'var(--accent)', textDecoration: 'underline' }}
          >
            Qira95&apos;s Kingdom Optimizer
          </a>
          .
        </span>
      </footer>

      {/* Add Building Modal Picker */}
      {pickerOpen && (
        <div className="cp-modal-backdrop" onClick={() => setPickerOpen(false)} role="dialog" aria-modal="true">
          <div className="cp-modal panel" onClick={(e) => e.stopPropagation()}>
            <div className="op-section-head">
              <h2 className="panel__title">Add Building</h2>
              <button type="button" className="op-remove" onClick={() => setPickerOpen(false)} aria-label="Close modal">
                ×
              </button>
            </div>

            <div className="cp-picker-filters">
              <input
                type="text"
                className="text-input cp-picker-search"
                placeholder="Search building..."
                value={pickerSearch}
                onChange={(e) => setPickerSearch(e.target.value)}
                autoFocus
              />

              <div className="pill-group">
                {categories.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    className={'pill pill--tiny ' + (pickerCategory === cat ? 'is-active' : '')}
                    onClick={() => setPickerCategory(cat)}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            <div className="cp-picker-grid">
              {availableBuildings.map((b) => {
                const iconUrl = buildingIcon(b.gid);
                return (
                  <button
                    key={b.gid}
                    type="button"
                    className="cp-picker-card"
                    onClick={() => addBuildingToVillage(b.gid)}
                  >
                    {iconUrl && (
                      <img src={iconUrl} alt="" className="cp-building-icon cp-building-icon--picker" aria-hidden="true" />
                    )}
                    <div>
                      <strong>{b.name}</strong>
                      <small>{b.category} · Max Lvl {b.maxLevel}</small>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function resolveTargetLabel(targetKey: string): string {
  const [gidStr, lvlStr] = targetKey.split(':');
  const b = BUILDINGS_BY_GID.get(Number(gidStr));
  return (b ? b.name : '#' + gidStr) + ' ' + lvlStr;
}
