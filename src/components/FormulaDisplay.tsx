import { DIVISOR_META, NUMERATOR_META, SPEED_META, type StatMeta } from '../data/statMeta';
import type { PresetQuery } from '../engine/value';
import { StatIcon } from './StatIcon';

function Chip(meta: StatMeta) {
  return (
    <span className="chip" title={meta.hint}>
      <StatIcon meta={meta} size={14} />
      {meta.short}
    </span>
  );
}

/** Renders the preset rating as a readable fraction, e.g. Speed·(Off) / Cost. */
export function FormulaDisplay({ query }: { query: PresetQuery }) {
  const numerator = query.stats.map((s) => NUMERATOR_META[s]);
  const divisors = query.divisors.map((d) => DIVISOR_META[d]);

  const top = (
    <>
      {query.bySpeed && (
        <>
          <Chip {...SPEED_META} />
          {numerator.length > 0 && <span className="formula__op">·</span>}
        </>
      )}
      {numerator.length === 0 && !query.bySpeed ? (
        <span className="formula__one">1</span>
      ) : (
        numerator.map((m, i) => (
          <span key={m.variable}>
            {i > 0 && <span className="formula__op">+</span>}
            <Chip {...m} />
          </span>
        ))
      )}
    </>
  );

  if (divisors.length === 0) {
    return <span className="formula">{top}</span>;
  }

  return (
    <span className="formula formula--fraction">
      <span className="formula__num">{top}</span>
      <span className="formula__bar" aria-hidden="true" />
      <span className="formula__den">
        {divisors.map((m, i) => (
          <span key={m.variable}>
            {i > 0 && <span className="formula__op">·</span>}
            <Chip {...m} />
          </span>
        ))}
      </span>
    </span>
  );
}
