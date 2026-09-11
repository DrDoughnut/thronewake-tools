import { useEffect, useMemo, useState } from 'react';
import { rules } from '../data/rules';
import { simulateDefense, type SplitOutcome } from '../engine/defense';
import { loadStoredJson, saveStoredJson, StorageKeys } from '../storage';

interface SimState {
  villages: number;
  realHammers: number;
  hammerOffense: number;
  defensePool: number;
  villageValue: number;
  wallPercent: number;
  casualtyExponent: number;
}

const initialState: SimState = {
  villages: 10,
  realHammers: 3,
  hammerOffense: 40_000,
  defensePool: 100_000,
  villageValue: 60_000,
  wallPercent: 0,
  casualtyExponent: rules.battle.casualtyExponent,
};

/** Fixed so the table does not reshuffle under the reader between renders. */
const TRIALS = 6000;
const SEED = 20_260_911;

const FIELDS: { key: keyof SimState; label: string; hint: string; max: number; step?: number }[] = [
  {
    key: 'villages',
    label: 'Villages with incoming',
    hint: 'Every village showing an attack, fakes included.',
    max: 40,
  },
  {
    key: 'realHammers',
    label: 'Real hammers among them',
    hint: 'How many carry an actual army. The rest are fakes you cannot tell apart yet.',
    max: 40,
  },
  {
    key: 'hammerOffense',
    label: 'Offense per hammer',
    hint: "One attacker's total offense power, weighted for your defence mix.",
    max: 5_000_000,
    step: 1000,
  },
  {
    key: 'defensePool',
    label: 'Defence available',
    hint: 'Every defence point you can get into position in time.',
    max: 50_000_000,
    step: 1000,
  },
  {
    key: 'villageValue',
    label: 'A village is worth',
    hint: 'What losing one costs, in defence points. The table below prices this for you.',
    max: 50_000_000,
    step: 1000,
  },
  {
    key: 'wallPercent',
    label: 'Wall and hero bonus (%)',
    hint: 'Defensive multiplier at the target: 20 means the stack fights at 1.2×.',
    max: 200,
  },
];

function loadInitialState(): SimState {
  try {
    const params = new URLSearchParams(window.location.hash.replace(/^[#?]/, ''));
    if (params.get('d')) {
      // Hyphen, not a dot: the exponent is fractional and would split itself.
      const [v, r, o, p, val, w, e] = params.get('d')!.split('-').map(Number);
      if ([v, r, o, p, val, w, e].every(Number.isFinite)) {
        return {
          villages: v,
          realHammers: r,
          hammerOffense: o,
          defensePool: p,
          villageValue: val,
          wallPercent: w,
          casualtyExponent: e,
        };
      }
    }
  } catch {}

  const saved = loadStoredJson<Partial<SimState> | null>(StorageKeys.DEFENSE_STATE, null);
  if (saved && typeof saved === 'object') {
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

  const result = useMemo(
    () =>
      simulateDefense({
        villages: state.villages,
        realHammers: state.realHammers,
        hammerOffense: state.hammerOffense,
        defensePool: state.defensePool,
        defenseBonus: 1 + state.wallPercent / 100,
        casualtyExponent: state.casualtyExponent,
        villageValue: state.villageValue,
        trials: TRIALS,
        seed: SEED,
      }),
    [state],
  );

  useEffect(() => {
    saveStoredJson(StorageKeys.DEFENSE_STATE, state);
    const packed = [
      state.villages,
      state.realHammers,
      state.hammerOffense,
      state.defensePool,
      state.villageValue,
      state.wallPercent,
      state.casualtyExponent,
    ].join('-');
    window.history.replaceState(null, '', `${window.location.pathname}#tool=defense&d=${packed}`);
  }, [state]);

  const { outcomes, best, breakeven } = result;
  const shown = outcomes.find((o) => o.split === hovered) ?? best;
  const peak = Math.max(...outcomes.map((o) => o.totalCost), 1);

  const set = (key: keyof SimState, value: number) =>
    setState((prev) => ({ ...prev, [key]: value }));

  return (
    <main className="app__body ds-page">
      <aside className="app__controls">
        <div className="panel">
          <h2 className="panel__title">The attack</h2>
          {FIELDS.map((f) => (
            <label key={f.key} className="ds-field" title={f.hint}>
              <span className="ds-field__label">{f.label}</span>
              <input
                className="ds-field__input"
                type="number"
                min={0}
                max={f.max}
                step={f.step ?? 1}
                value={state[f.key]}
                onChange={(e) =>
                  set(f.key, Math.min(f.max, Math.max(0, Number(e.target.value) || 0)))
                }
              />
            </label>
          ))}
        </div>

        <div className="panel">
          <h2 className="panel__title">Casualty curve</h2>
          <label className="ds-field ds-field--slider" htmlFor="ds-exponent">
            <span className="ds-field__label">
              Exponent
              <span className="ds-field__value">{state.casualtyExponent.toFixed(2)}</span>
            </span>
            <input
              id="ds-exponent"
              type="range"
              min={rules.battle.minExponent}
              max={rules.battle.maxExponent}
              step={0.05}
              value={state.casualtyExponent}
              onChange={(e) => set('casualtyExponent', Number(e.target.value))}
            />
          </label>
          <p className="hint">
            The winner loses <code>(loser ÷ winner)</code> to this power. Thronewake does not
            publish its casualty formula — this default is carried over from the game it is
            modelled on and is <strong>unverified</strong>.
          </p>
        </div>
      </aside>

      <section className="app__results">
        <div className="ds-verdict">
          <div className="ds-verdict__headline">
            <span className="ds-verdict__count">{best.split}</span>
            <span className="ds-verdict__of">
              of {state.villages} village{state.villages === 1 ? '' : 's'}
            </span>
          </div>
          <dl className="ds-verdict__facts">
            <div>
              <dt>Each stack</dt>
              <dd>{compact(best.stack)}</dd>
            </div>
            <div>
              <dt>vs one hammer</dt>
              <dd>{best.ratio === Infinity ? '∞' : `${best.ratio.toFixed(2)}×`}</dd>
            </div>
            <div>
              <dt>Villages lost</dt>
              <dd>{best.villagesLost.toFixed(2)}</dd>
            </div>
            <div>
              <dt>Defence lost</dt>
              <dd>{compact(best.defenseLost)}</dd>
            </div>
          </dl>
        </div>

        {breakeven && (
          <p className="ds-breakeven">
            Defend <strong>{breakeven.favouredAbove}</strong> instead of{' '}
            <strong>{breakeven.favouredBelow}</strong> only while a village is worth more than{' '}
            <strong>{round(breakeven.villageValue)}</strong> defence points — about{' '}
            {(breakeven.villageValue / Math.max(1, state.hammerOffense)).toFixed(1)} hammers.
            You do not have to price an artifact, only say which side of that line it sits on.
          </p>
        )}

        <div className="panel ds-chart">
          <div className="ds-chart__head">
            <h2 className="panel__title">Expected loss by split</h2>
            <div className="ds-legend">
              <span className="ds-legend__item">
                <i className="ds-swatch ds-swatch--defense" aria-hidden="true" />
                Defence lost
              </span>
              <span className="ds-legend__item">
                <i className="ds-swatch ds-swatch--villages" aria-hidden="true" />
                Villages lost
              </span>
            </div>
          </div>

          <div className="ds-plot-wrap">
            <div className="ds-plot__scale" aria-hidden="true">
              <span>{compact(peak)}</span>
              <span>0</span>
            </div>
            <div className="ds-plot" onMouseLeave={() => setHovered(null)}>
              {outcomes.map((o) => (
                <Bar
                  key={o.split}
                  outcome={o}
                  villageValue={state.villageValue}
                  peak={peak}
                  isBest={o.split === best.split}
                  isHovered={o.split === shown.split}
                  onHover={() => setHovered(o.split)}
                />
              ))}
            </div>
          </div>

          <p className="ds-readout">
            <strong>Defend {shown.split}</strong> — {compact(shown.stack)} each, fighting at{' '}
            {shown.ratio === Infinity ? '∞' : `${shown.ratio.toFixed(2)}×`} a single hammer.
            Covers {Math.round(shown.coverage * 100)}% of the incoming;{' '}
            {Math.round(shown.holdRate * 100)}% of the stacks that get hit hold.
            {shown.split === best.split ? ' This is the recommended split.' : ''}
          </p>
        </div>

        <div className="ds-table-wrap">
          <table className="ds-table">
            <caption className="ds-table__caption">
              Averages over {round(TRIALS)} simulated attacks. Every split faces the same
              hammers, so neighbouring rows differ on merit rather than luck.
            </caption>
            <thead>
              <tr>
                <th scope="col">Defend</th>
                <th scope="col">Each stack</th>
                <th scope="col">Ratio</th>
                <th scope="col">Covered</th>
                <th scope="col">Holds</th>
                <th scope="col">Villages lost</th>
                <th scope="col">Defence lost</th>
                <th scope="col">Total cost</th>
              </tr>
            </thead>
            <tbody>
              {outcomes.map((o) => (
                <tr
                  key={o.split}
                  className={o.split === best.split ? 'is-best' : undefined}
                  onMouseEnter={() => setHovered(o.split)}
                >
                  <th scope="row">{o.split}</th>
                  <td>{compact(o.stack)}</td>
                  <td className={o.ratio < 1 ? 'ds-td--thin' : undefined}>
                    {o.ratio === Infinity ? '∞' : `${o.ratio.toFixed(2)}×`}
                  </td>
                  <td>{Math.round(o.coverage * 100)}%</td>
                  <td>{Math.round(o.holdRate * 100)}%</td>
                  <td>{o.villagesLost.toFixed(2)}</td>
                  <td>{compact(o.defenseLost)}</td>
                  <td>{compact(o.totalCost)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className="hint">
          The hammer size is treated as known exactly, so a stack at 1.00× is a guaranteed hold
          and the recommendation will sit right on that edge. Real scouting has error, which
          punishes the edge — until that is modelled, read 1.00× as the most optimistic case
          rather than a safe one.
        </p>
      </section>
    </main>
  );
}

interface BarProps {
  outcome: SplitOutcome;
  villageValue: number;
  peak: number;
  isBest: boolean;
  isHovered: boolean;
  onHover: () => void;
}

function Bar({ outcome, villageValue, peak, isBest, isHovered, onHover }: BarProps) {
  const villagePart = outcome.villagesLost * villageValue;
  const total = outcome.totalCost;
  const height = (total / peak) * 100;
  const villageShare = total > 0 ? (villagePart / total) * 100 : 0;

  const classes = ['ds-bar'];
  if (isBest) classes.push('is-best');
  if (isHovered) classes.push('is-hovered');

  return (
    <button
      type="button"
      className={classes.join(' ')}
      onMouseEnter={onHover}
      onFocus={onHover}
      aria-label={`Defend ${outcome.split}: total cost ${round(total)} defence points`}
    >
      <span className="ds-bar__column">
        <span className="ds-bar__stack" style={{ height: `${height}%` }}>
          {isBest && <span className="ds-bar__flag">best</span>}
          <span
            className="ds-bar__seg ds-bar__seg--villages"
            style={{ height: `${villageShare}%` }}
          />
          <span
            className="ds-bar__seg ds-bar__seg--defense"
            style={{ height: `${100 - villageShare}%` }}
          />
        </span>
      </span>
      <span className="ds-bar__tick">{outcome.split}</span>
    </button>
  );
}
