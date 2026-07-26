import { useMemo } from 'react';
import { Controls } from '../components/Controls';
import { FormulaDisplay } from '../components/FormulaDisplay';
import { ResultsTable } from '../components/ResultsTable';
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

  const ranking = useMemo(
    () =>
      rank(group.sets, query, {
        smithy: state.smithy,
        buildings: state.buildings,
      }),
    [group, query, state.smithy, state.buildings],
  );

  const heading =
    state.mode === 'formula' ? (
      <code className="heading-formula">{state.expression}</code>
    ) : (
      <FormulaDisplay query={query as PresetQuery} />
    );

  return (
    <main className="app__body">
      <aside className="app__controls">
        <Controls state={state} patch={patch} formulaError={ranking.error} />
      </aside>
      <section className="app__results">
        <ResultsTable ranking={ranking} heading={heading} />
      </section>
    </main>
  );
}
