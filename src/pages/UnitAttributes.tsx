import { useMemo, useState } from 'react';
import { Controls } from '../components/Controls';
import { FormulaDisplay } from '../components/FormulaDisplay';
import { ResultsTable } from '../components/ResultsTable';
import { StatTable } from '../components/StatTable';
import { editCount, makeResolver, matchingPreset } from '../data/statEdits';
import { groupByKey } from '../data/unitSets';
import { rank, type PresetQuery, type Query } from '../engine/value';
import { useAppState } from '../state';

export function UnitAttributes() {
  const { state, patch } = useAppState();
  const [isStatTableOpen, setIsStatTableOpen] = useState(false);
  const group = groupByKey(state.group);

  const query: Query = useMemo(
    () =>
      state.mode === 'formula'
        ? { mode: 'formula', expression: state.expression }
        : {
            mode: 'preset',
            stats: state.stats,
            bySpeed: state.bySpeed,
            divisors: state.divisors,
          },
    [state.mode, state.expression, state.stats, state.bySpeed, state.divisors],
  );

  const mods = useMemo(
    () => ({ smithy: state.smithy, buildings: state.buildings }),
    [state.smithy, state.buildings],
  );

  const resolve = useMemo(() => makeResolver(state.edits), [state.edits]);
  const ranking = useMemo(
    () => rank(group.sets, query, mods, resolve),
    [group, query, mods, resolve],
  );
  const changes = editCount(state.edits);
  const preset = matchingPreset(state.edits);

  const heading =
    state.mode === 'formula' ? (
      <code className="heading-formula">{state.expression}</code>
    ) : (
      <FormulaDisplay query={query as PresetQuery} />
    );

  return (
    <>
      <main className="app__body ua-page">
        <aside className="app__controls">
          <Controls state={state} patch={patch} formulaError={ranking.error} />
        </aside>
        <section className="app__results">
          {changes > 0 && (
            <div className="stats-notice" role="status">
              <span>
                Ranked with <strong>{preset ? preset.label : 'custom'}</strong> stats
                {' · '}{changes} {changes === 1 ? 'change' : 'changes'} from the live game
              </span>
              <button type="button" className="pill pill--tiny" onClick={() => patch({ edits: {} })}>
                Back to live
              </button>
            </div>
          )}
          <ResultsTable ranking={ranking} heading={heading} mods={mods} resolve={resolve} />
        </section>
      </main>
      <div className="units-stats-break">
        <div className="cc-inputs-separator" role="separator">
          <div className="cc-inputs-separator__line" />
          <button
            type="button"
            className={`cc-inputs-separator__badge cc-inputs-separator__badge--btn ${isStatTableOpen ? 'is-open' : ''}`}
            onClick={() => setIsStatTableOpen((prev) => !prev)}
            aria-expanded={isStatTableOpen}
            title={isStatTableOpen ? 'Collapse raw unit stat table' : 'Expand raw unit stat table'}
          >
            <span className="cc-inputs-separator__icon">📋</span>
            <span className="cc-inputs-separator__text">
              {isStatTableOpen ? 'Hide Unit Stat Table' : 'Show Unit Stat Table'}
            </span>
            {changes > 0 && (
              <span className="units-stats-break__badge-count">
                {changes} {changes === 1 ? 'custom stat' : 'custom stats'}
              </span>
            )}
            <span className="units-stats-break__arrow">{isStatTableOpen ? '▲' : '▼'}</span>
          </button>
          <div className="cc-inputs-separator__line" />
        </div>
        {!isStatTableOpen && (
          <p className="units-stats-break__note">
            Expand to view and edit raw unit stats (attack, defense, speed, training cost/time).
          </p>
        )}
      </div>
      <div className={`units-stats-collapse ${isStatTableOpen ? 'is-open' : 'is-collapsed'}`}>
        <StatTable edits={state.edits} onChange={(edits) => patch({ edits })} />
      </div>
    </>
  );
}
