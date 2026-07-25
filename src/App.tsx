import { useMemo } from 'react';
import { Controls } from './components/Controls';
import { FormulaDisplay } from './components/FormulaDisplay';
import { ResultsTable } from './components/ResultsTable';
import { groupByKey } from './data/unitSets';
import { rank, type PresetQuery, type Query } from './engine/value';
import { useAppState } from './state';

export default function App() {
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
    <div className="app">
      <header className="app__header">
        <div className="brand">
          <span className="brand__mark" aria-hidden="true">⌬</span>
          <div>
            <span className="brand__name">Thronewake Tools</span>
            <span className="brand__tool">Unit Attributes</span>
          </div>
        </div>
        <p className="app__blurb">
          Rank every unit by whatever actually constrains you — resources, grain, or
          the hours in a day. Runs entirely in your browser; the link in your address
          bar carries your settings.
        </p>
      </header>

      <main className="app__body">
        <aside className="app__controls">
          <Controls state={state} patch={patch} formulaError={ranking.error} />
        </aside>
        <section className="app__results">
          <ResultsTable ranking={ranking} heading={heading} />
        </section>
      </main>

      <footer className="app__footer">
        <p>
          Unit names, stats, costs and training times are taken from the live game
          data. Training times shown assume a fully levelled training building.
          Balance changes in Thronewake will not appear here until the tables are
          refreshed.
        </p>
      </footer>
    </div>
  );
}
