import {
  DIVISOR_META,
  FORMULA_VARIABLES,
  NUMERATOR_META,
  SPEED_META,
  type StatMeta,
} from '../data/statMeta';
import { factionBuildingList, rules, type FactionBuildingKey } from '../data/rules';
import { factions } from '../data/factions';
import { unitSetGroups, groupByKey } from '../data/unitSets';
import type { Divisor, NumeratorStat } from '../engine/value';
import { presets, toggle, type AppState } from '../state';
import { Slider } from './Slider';
import { StatIcon } from './StatIcon';

const COMBAT_STATS: NumeratorStat[] = ['a', 'di', 'dc', 'c'];
const RECON_STATS: NumeratorStat[] = ['s', 'ds'];
const DIVISOR_ORDER: Divisor[] = ['cu', 't', 'tc'];

const factionByKey = (key: string) => factions.find((f) => f.key === key);

interface Props {
  state: AppState;
  patch: (changes: Partial<AppState>) => void;
  formulaError?: string;
}

function StatButton({
  meta,
  active,
  onClick,
}: {
  meta: StatMeta;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className={`pill pill--stat ${active ? 'is-active' : ''}`}
      title={meta.hint}
      onClick={onClick}
    >
      <StatIcon meta={meta} size={17} />
      <span className="pill__label">{meta.short}</span>
    </button>
  );
}

export function Controls({ state, patch, formulaError }: Props) {
  const group = groupByKey(state.group);
  const statOrder = group.stats === 'recon' ? RECON_STATS : COMBAT_STATS;

  // Switching rosters can strand a stat the new roster has no toggle for,
  // so clear anything that is no longer selectable.
  const setGroup = (key: string) => {
    const next = groupByKey(key);
    const order = next.stats === 'recon' ? RECON_STATS : COMBAT_STATS;
    patch({ group: key, stats: state.stats.filter((s) => order.includes(s)) });
  };

  const toggleStat = (stat: NumeratorStat) =>
    patch({ mode: 'preset', stats: toggle(state.stats, stat, statOrder) });

  const toggleDivisor = (d: Divisor) =>
    patch({ mode: 'preset', divisors: toggle(state.divisors, d, DIVISOR_ORDER) });

  const setBuilding = (key: FactionBuildingKey, level: number) =>
    patch({ buildings: { ...state.buildings, [key]: level } });

  return (
    <div className="controls">
      <section className="panel">
        <h2 className="panel__title">Start from</h2>
        <div className="preset-grid">
          {presets.map((p) => (
            <button
              key={p.key}
              type="button"
              className="pill pill--preset"
              title={p.hint}
              onClick={() => patch(p.patch)}
            >
              {p.label}
            </button>
          ))}
        </div>
      </section>

      <section className="panel">
        <h2 className="panel__title">Roster</h2>
        <select
          className="select"
          value={state.group}
          onChange={(e) => setGroup(e.target.value)}
          aria-label="Which units to rank"
        >
          {unitSetGroups.map((g) => (
            <option key={g.key} value={g.key}>
              {g.name}
            </option>
          ))}
        </select>
        <p className="hint">{group.hint}</p>
      </section>

      <section className="panel">
        <h2 className="panel__title">Rate by</h2>

        <label className="mode-row">
          <input
            type="radio"
            name="mode"
            checked={state.mode === 'preset'}
            onChange={() => patch({ mode: 'preset' })}
          />
          <span>Build it</span>
        </label>

        <div className={`builder ${state.mode === 'preset' ? '' : 'builder--dim'}`}>
          <div className="builder__line">
            <span className="builder__caption">multiply by</span>
            {/* Fixed 4-up grid so the stat row below never wraps. */}
            <div className="stat-grid stat-grid--4">
              <StatButton
                meta={SPEED_META}
                active={state.bySpeed}
                onClick={() => patch({ mode: 'preset', bySpeed: !state.bySpeed })}
              />
            </div>
          </div>

          <div className="builder__line">
            <span className="builder__caption">sum of</span>
            <div className={`stat-grid stat-grid--${statOrder.length}`}>
              {statOrder.map((s) => (
                <StatButton
                  key={s}
                  meta={NUMERATOR_META[s]}
                  active={state.stats.includes(s)}
                  onClick={() => toggleStat(s)}
                />
              ))}
            </div>
          </div>

          <div className="builder__line">
            <span className="builder__caption">divided by</span>
            <div className="stat-grid stat-grid--3">
              {DIVISOR_ORDER.map((d) => (
                <StatButton
                  key={d}
                  meta={DIVISOR_META[d]}
                  active={state.divisors.includes(d)}
                  onClick={() => toggleDivisor(d)}
                />
              ))}
            </div>
          </div>
        </div>

        <label className="mode-row">
          <input
            type="radio"
            name="mode"
            checked={state.mode === 'formula'}
            onChange={() => patch({ mode: 'formula' })}
          />
          <span>Write it</span>
        </label>

        <div className={`builder ${state.mode === 'formula' ? '' : 'builder--dim'}`}>
          <input
            type="text"
            className={`text-input ${formulaError ? 'is-error' : ''}`}
            value={state.expression}
            spellCheck={false}
            autoComplete="off"
            aria-label="Custom formula"
            onFocus={() => patch({ mode: 'formula' })}
            onChange={(e) => patch({ mode: 'formula', expression: e.target.value })}
          />
          {formulaError && state.mode === 'formula' && <p className="error">{formulaError}</p>}
          <details className="reference">
            <summary>Names you can use</summary>
            <ul className="reference__list">
              {FORMULA_VARIABLES.map((m) => (
                <li key={m.variable}>
                  <code>{m.variable}</code>
                  <span>{m.label}</span>
                </li>
              ))}
            </ul>
            <p className="hint">
              Also <code>+ − × ÷ ^</code>, brackets, and{' '}
              <code>sqrt cbrt pow abs min max round floor ceil log log2 log10</code>. Write{' '}
              <code>2k</code> for 2000.
            </p>
          </details>
        </div>
      </section>

      <section className="panel">
        <h2 className="panel__title">Upgrades</h2>

        <Slider
          id="smithy"
          label={rules.smithy.name}
          iconKey={rules.smithy.icon}
          hint="Weapon and armour upgrades. Raises attack and both defense values for every faction."
          value={state.smithy}
          max={rules.smithy.maxLevel}
          onChange={(smithy) => patch({ smithy })}
        />
      </section>

      <section className="panel">
        <h2 className="panel__title">Faction buildings</h2>
        <p className="hint hint--tight">
          Each affects only its own faction&rsquo;s units, so raising these never
          distorts a cross-faction comparison.
        </p>

        {factionBuildingList.map((b) => {
          const owner = factionByKey(b.faction);
          return (
            <Slider
              key={b.key}
              id={b.key}
              label={b.name}
              hint={b.hint}
              badge={owner?.short}
              badgeColor={owner?.color}
              badgeTitle={owner?.name}
              value={state.buildings[b.key as FactionBuildingKey] ?? 0}
              max={b.maxLevel}
              onChange={(level) => setBuilding(b.key as FactionBuildingKey, level)}
            />
          );
        })}
      </section>
    </div>
  );
}
