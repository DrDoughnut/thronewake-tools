import { useMemo } from 'react';
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
      <main className="app__body">
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
      <StatTable edits={state.edits} onChange={(edits) => patch({ edits })} />
    </>
  );
}
