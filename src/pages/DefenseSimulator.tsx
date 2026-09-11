import { useEffect, useMemo, useState } from 'react';
import { BUILDINGS } from '../data/buildingCatalog';
import { playableFactions } from '../data/factions';
import { watchTowerBonus } from '../data/rules';
import type { Faction, Unit } from '../data/types';
import type { Village } from '../engine/combat';
import { buildingCumulativeCost } from '../engine/cpOptimizer';
import { simulateDefense, type Hammer, type SplitOutcome } from '../engine/defense';
import { totalCost, upgradeStat } from '../engine/stats';
import { loadStoredJson, saveStoredJson, StorageKeys } from '../storage';

/** Stonemason's Lodge: +10% building durability per level, from the catalog. */
const durabilityFor = (level: number) => 1 + 0.1 * Math.max(0, level);

interface SimState {
  villages: number;
  hammers: Hammer[];
  defenceFaction: string;
  defenceUnit: string;
  troops: number;
  smithy: number;
  wallLevel: number;
  stonemason: number;
  targetGid: number;
  targetLevel: number;
  villagePremium: number;
}

const defaultHammer: Hammer = {
  offense: 120_000,
  cavalryShare: 0.5,
  catapults: 100,
  catapultUpgrade: 20,
};

const initialState: SimState = {
  villages: 10,
  hammers: [
    { ...defaultHammer, offense: 180_000 },
    { ...defaultHammer, offense: 120_000 },
    { ...defaultHammer, offense: 60_000, catapults: 0 },
  ],
  defenceFaction: 'verdant_wardens',
  defenceUnit: 'briar_guard',
  troops: 20_000,
  smithy: 20,
  wallLevel: 20,
  stonemason: 0,
  targetGid: 15,
  targetLevel: 20,
  villagePremium: 0,
};

const TRIALS = 2500;
const SEED = 20_260_911;

/** Units worth garrisoning with: foot and mounted, no siege or support. */
const defensive = (faction: Faction): Unit[] =>
  faction.units.filter((u) => u.role === 'foot' || u.role === 'mounted');

const safeFaction = (key: string): Faction =>
  playableFactions.find((f) => f.key === key) ?? playableFactions[0];

function loadInitialState(): SimState {
  const saved = loadStoredJson<Partial<SimState> | null>(StorageKeys.DEFENSE_STATE, null);
  if (saved && typeof saved === 'object' && Array.isArray(saved.hammers)) {
    return { ...initialState, ...saved };
  }
  return initialState;
}

const round = (n: number) => Math.round(n).toLocaleString();

const compact = (n: number) => {
  if (!Number.isFinite(n)) return '—';
  const abs = Math.abs(n);
  if (abs >= 1_000_000) return `${(n / 1_000_000).toFixed(abs >= 10_000_000 ? 0 : 1)}M`;
  if (abs >= 10_000) return `${Math.round(n / 1000)}k`;
  return round(n);
};

export function DefenseSimulator() {
  const [state, setState] = useState<SimState>(loadInitialState);
  const [hovered, setHovered] = useState<number | null>(null);

  useEffect(() => {
    saveStoredJson(StorageKeys.DEFENSE_STATE, state);
  }, [state]);

  const faction = safeFaction(state.defenceFaction);
  const unitList = defensive(faction);
  const unit = unitList.find((u) => u.key === state.defenceUnit) ?? unitList[0];
  const targetBuilding = BUILDINGS.find((b) => b.gid === state.targetGid);
  const maxLevel = targetBuilding?.maxLevel ?? 20;

  const result = useMemo(() => {
    const village: Village = {
      pop: 0,
      wallLevel: state.wallLevel,
      // Your villages, so the tower is your own faction's.
      wallDefBonus: watchTowerBonus(state.defenceFaction, state.wallLevel),
      wallDefFlat: 0,
      wallDurability: 1,
      durability: durabilityFor(state.stonemason),
      extraDef: 0,
    };

    // Cumulative build cost by level, so damage can be priced on the levels
    // actually knocked off rather than on a flat per-level average.
    const targetCost = Array.from({ length: maxLevel + 1 }, (_, level) =>
      buildingCumulativeCost(state.targetGid, level).total);

    return simulateDefense({
      villages: state.villages,
      hammers: state.hammers,
      unit: {
        key: unit.key,
        defInf: upgradeStat(unit, unit.defInf, state.smithy),
        defCav: upgradeStat(unit, unit.defCav, state.smithy),
        cost: totalCost(unit),
      },
      troops: state.troops,
      village,
      targetLevel: Math.min(state.targetLevel, maxLevel),
      targetCost,
      villagePremium: state.villagePremium,
      trials: TRIALS,
      seed: SEED,
    });
  }, [state, unit, maxLevel]);

  const { outcomes, best, breakeven } = result;
  const shown = outcomes.find((o) => o.split === hovered) ?? best;
  const peak = Math.max(...outcomes.map((o) => o.totalCost), 1);

  const set = <K extends keyof SimState>(key: K, value: SimState[K]) =>
    setState((prev) => ({ ...prev, [key]: value }));

  const patchHammer = (index: number, patch: Partial<Hammer>) =>
    setState((prev) => ({
      ...prev,
      hammers: prev.hammers.map((h, i) => (i === index ? { ...h, ...patch } : h)),
    }));

  return (
    <main className="app__body ds-page">
      <aside className="app__controls">
        <div className="panel">
          <h2 className="panel__title">Your defence</h2>
          <label className="ds-field">
            <span className="ds-field__label">Troop</span>
            <select className="ds-field__input" value={faction.key}
              onChange={(e) => {
                const next = safeFaction(e.target.value);
                setState((p) => ({
                  ...p,
                  defenceFaction: next.key,
                  defenceUnit: defensive(next)[0].key,
                }));
              }}>
              {playableFactions.map((f) => (
                <option key={f.key} value={f.key}>{f.name}</option>
              ))}
            </select>
          </label>
          <label className="ds-field">
            <span className="ds-field__label">Unit</span>
            <select className="ds-field__input" value={unit.key}
              onChange={(e) => set('defenceUnit', e.target.value)}>
              {unitList.map((u) => (
                <option key={u.key} value={u.key}>{u.name}</option>
              ))}
            </select>
          </label>
          <p className="hint">
            {round(upgradeStat(unit, unit.defInf, state.smithy))} vs foot,{' '}
            {round(upgradeStat(unit, unit.defCav, state.smithy))} vs mounted,{' '}
            {round(totalCost(unit))} resources each.
          </p>
          <NumberField label="Troops available" value={state.troops} max={5_000_000}
            step={100} onChange={(v) => set('troops', v)} />
          <label className="ds-field ds-field--slider" htmlFor="ds-smithy">
            <span className="ds-field__label">
              Smithy<span className="ds-field__value">{state.smithy}</span>
            </span>
            <input id="ds-smithy" type="range" min={0} max={20} value={state.smithy}
              onChange={(e) => set('smithy', Number(e.target.value))} />
          </label>
        </div>

        <div className="panel">
          <h2 className="panel__title">The villages</h2>
          <NumberField label="Villages with incoming" value={state.villages} max={40} min={1}
            onChange={(v) => set('villages', Math.max(1, v))} />
          <NumberField label="Watch Tower level" value={state.wallLevel} max={20}
            onChange={(v) => set('wallLevel', v)} />
          <NumberField label="Stonemason's Lodge level" value={state.stonemason} max={20}
            onChange={(v) => set('stonemason', v)} />
          <p className="hint">
            {faction.name}'s tower at level {state.wallLevel} defends at{' '}
            <strong>+{(watchTowerBonus(faction.key, state.wallLevel) * 100).toFixed(1)}%</strong>.
          </p>
          <label className="ds-field">
            <span className="ds-field__label">Catapults aim at</span>
            <select className="ds-field__input" value={state.targetGid}
              onChange={(e) => set('targetGid', Number(e.target.value))}>
              {BUILDINGS.map((b) => (
                <option key={b.gid} value={b.gid}>{b.name}</option>
              ))}
            </select>
          </label>
          <NumberField label="Its level" value={state.targetLevel} max={maxLevel}
            onChange={(v) => set('targetLevel', v)} />
          <NumberField label="Village worth beyond its buildings" value={state.villagePremium}
            max={500_000_000} step={10_000} onChange={(v) => set('villagePremium', v)} />
          <p className="hint">
            Resources. Leave it at zero and the answer counts only troops and rebuilding;
            raise it for an artifact village the buildings alone do not price.
          </p>
        </div>
      </aside>

      <section className="app__results">
        <div className="panel ds-hammers">
          <div className="ds-hammers__head">
            <h2 className="panel__title">Incoming hammers</h2>
            <div className="ds-hammers__actions">
              <button type="button" className="pill pill--tiny"
                onClick={() => set('hammers', [...state.hammers, { ...defaultHammer }])}
                disabled={state.hammers.length >= 40}>
                Add hammer
              </button>
              <button type="button" className="pill pill--tiny"
                onClick={() => set('hammers', state.hammers.slice(0, -1))}
                disabled={state.hammers.length === 0}>
                Remove
              </button>
            </div>
          </div>

          {state.hammers.length === 0 ? (
            <p className="hint">Every incoming is a fake. Nothing to defend against.</p>
          ) : (
            <ul className="ds-hammer-list">
              <li className="ds-hammer ds-hammer--head" aria-hidden="true">
                <span>#</span><span>Offense</span><span>Mounted</span>
                <span>Catapults</span><span>Siege smithy</span>
              </li>
              {state.hammers.map((h, i) => (
                <li key={i} className="ds-hammer">
                  <span className="ds-hammer__index">{i + 1}</span>
                  <input className="cc-unit__count" type="number" min={0} step={1000}
                    value={h.offense} aria-label={`Hammer ${i + 1} offense`}
                    onChange={(e) => patchHammer(i, { offense: Math.max(0, Number(e.target.value) || 0) })} />
                  <span className="ds-hammer__share">
                    <input type="range" min={0} max={100} value={Math.round(h.cavalryShare * 100)}
                      aria-label={`Hammer ${i + 1} mounted share`}
                      onChange={(e) => patchHammer(i, { cavalryShare: Number(e.target.value) / 100 })} />
                    <span>{Math.round(h.cavalryShare * 100)}%</span>
                  </span>
                  <input className="cc-unit__count" type="number" min={0}
                    value={h.catapults} aria-label={`Hammer ${i + 1} catapults`}
                    onChange={(e) => patchHammer(i, { catapults: Math.max(0, Number(e.target.value) || 0) })} />
                  <input className="cc-unit__count" type="number" min={0} max={20}
                    value={h.catapultUpgrade} aria-label={`Hammer ${i + 1} siege smithy`}
                    onChange={(e) => patchHammer(i, {
                      catapultUpgrade: Math.min(20, Math.max(0, Number(e.target.value) || 0)),
                    })} />
                </li>
              ))}
            </ul>
          )}
          <p className="hint">
            Each hammer is resolved on its own, so sizes and compositions can differ — and
            two landing on one village fight as consecutive waves against a garrison that is
            already thinned.
          </p>
        </div>

        <div className="ds-verdict">
          <div className="ds-verdict__headline">
            <span className="ds-verdict__count">{best.split}</span>
            <span className="ds-verdict__of">
              of {state.villages} village{state.villages === 1 ? '' : 's'}
            </span>
          </div>
          <dl className="ds-verdict__facts">
            <div><dt>Each stack</dt><dd>{compact(best.stack)}</dd></div>
            <div><dt>vs average hammer</dt>
              <dd>{best.ratio === Infinity ? '∞' : `${best.ratio.toFixed(2)}×`}</dd></div>
            <div><dt>Troops lost</dt><dd>{compact(best.troopsLost)}</dd></div>
            <div><dt>Total cost</dt><dd>{compact(best.totalCost)}</dd></div>
          </dl>
        </div>

        {breakeven && (
          <p className="ds-breakeven">
            Defend <strong>{breakeven.favouredAbove}</strong> instead of{' '}
            <strong>{breakeven.favouredBelow}</strong> only while a village is worth more than{' '}
            <strong>{round(breakeven.premium)}</strong> resources beyond its buildings.
            You do not have to price an artifact, only say which side of that line it sits on.
          </p>
        )}

        <div className="panel ds-chart">
          <div className="ds-chart__head">
            <h2 className="panel__title">Resources lost by split</h2>
            <div className="ds-legend">
              <span className="ds-legend__item">
                <i className="ds-swatch ds-swatch--defense" aria-hidden="true" />Troops
              </span>
              <span className="ds-legend__item">
                <i className="ds-swatch ds-swatch--villages" aria-hidden="true" />Damage
              </span>
            </div>
          </div>

          <div className="ds-plot-wrap">
            <div className="ds-plot__scale" aria-hidden="true">
              <span>{compact(peak)}</span><span>0</span>
            </div>
            <div className="ds-plot" onMouseLeave={() => setHovered(null)}>
              {outcomes.map((o) => (
                <Bar key={o.split} outcome={o} peak={peak}
                  isBest={o.split === best.split}
                  isHovered={o.split === shown.split}
                  onHover={() => setHovered(o.split)} />
              ))}
            </div>
          </div>

          <p className="ds-readout">
            <strong>Defend {shown.split}</strong> — {compact(shown.stack)} troops each, holding at{' '}
            {shown.ratio === Infinity ? '∞' : `${shown.ratio.toFixed(2)}×`} the average hammer.
            Covers {Math.round(shown.coverage * 100)}% of the incoming;{' '}
            {Math.round(shown.holdRate * 100)}% of the stacks that get hit hold.
            {shown.split === best.split ? ' This is the recommended split.' : ''}
          </p>
        </div>

        <div className="ds-table-wrap">
          <table className="ds-table">
            <caption className="ds-table__caption">
              Averages over {round(TRIALS)} simulated attacks, every split facing the same
              hammers. Each fight is resolved by the combat engine, so the defence that
              answers a hammer depends on how much of it is mounted.
            </caption>
            <thead>
              <tr>
                <th scope="col">Defend</th><th scope="col">Each stack</th>
                <th scope="col">Ratio</th><th scope="col">Covered</th>
                <th scope="col">Holds</th><th scope="col">Troops lost</th>
                <th scope="col">Levelled</th>
                <th scope="col">Levels lost</th><th scope="col">Troop cost</th>
                <th scope="col">Rebuild</th><th scope="col">Total</th>
              </tr>
            </thead>
            <tbody>
              {outcomes.map((o) => (
                <tr key={o.split} className={o.split === best.split ? 'is-best' : undefined}
                  onMouseEnter={() => setHovered(o.split)}>
                  <th scope="row">{o.split}</th>
                  <td>{compact(o.stack)}</td>
                  <td className={o.ratio < 1 ? 'ds-td--thin' : undefined}>
                    {o.ratio === Infinity ? '∞' : `${o.ratio.toFixed(2)}×`}
                  </td>
                  <td>{Math.round(o.coverage * 100)}%</td>
                  <td>{Math.round(o.holdRate * 100)}%</td>
                  <td>{compact(o.troopsLost)}</td>
                  <td>{o.villagesFlattened.toFixed(2)}</td>
                  <td>{o.buildingLevelsLost.toFixed(1)}</td>
                  <td>{compact(o.troopCost)}</td>
                  <td>{compact(o.buildingCost)}</td>
                  <td>{compact(o.totalCost)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}

interface NumberFieldProps {
  label: string;
  value: number;
  max: number;
  min?: number;
  step?: number;
  onChange: (value: number) => void;
}

function NumberField({ label, value, max, min = 0, step = 1, onChange }: NumberFieldProps) {
  return (
    <label className="ds-field">
      <span className="ds-field__label">{label}</span>
      <input className="ds-field__input" type="number" min={min} max={max} step={step}
        value={value}
        onChange={(e) => onChange(Math.min(max, Math.max(min, Number(e.target.value) || 0)))} />
    </label>
  );
}

interface BarProps {
  outcome: SplitOutcome;
  peak: number;
  isBest: boolean;
  isHovered: boolean;
  onHover: () => void;
}

function Bar({ outcome, peak, isBest, isHovered, onHover }: BarProps) {
  const total = outcome.totalCost;
  const height = (total / peak) * 100;
  const damageShare = total > 0 ? ((total - outcome.troopCost) / total) * 100 : 0;

  const classes = ['ds-bar'];
  if (isBest) classes.push('is-best');
  if (isHovered) classes.push('is-hovered');

  return (
    <button type="button" className={classes.join(' ')} onMouseEnter={onHover} onFocus={onHover}
      aria-label={`Defend ${outcome.split}: ${round(total)} resources lost`}>
      <span className="ds-bar__column">
        <span className="ds-bar__stack" style={{ height: `${height}%` }}>
          {isBest && <span className="ds-bar__flag">best</span>}
          <span className="ds-bar__seg ds-bar__seg--villages"
            style={{ height: `${damageShare}%` }} />
          <span className="ds-bar__seg ds-bar__seg--defense"
            style={{ height: `${100 - damageShare}%` }} />
        </span>
      </span>
      <span className="ds-bar__tick">{outcome.split}</span>
    </button>
  );
}
