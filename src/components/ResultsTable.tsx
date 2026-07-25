import { lookup } from '../data/factions';
import type { Ranking } from '../engine/value';
import { UnitIcon } from './UnitIcon';

interface Props {
  ranking: Ranking;
  /** Rendered description of what the value column means. */
  heading: React.ReactNode;
}

export function ResultsTable({ ranking, heading }: Props) {
  if (ranking.error) {
    return (
      <div className="results results--empty">
        <p className="error error--block">{ranking.error}</p>
      </div>
    );
  }

  const best = ranking.rows[0]?.value ?? 0;

  return (
    <div className="results">
      <table className="results__table">
        <thead>
          <tr>
            <th className="col-rank" scope="col">#</th>
            <th className="col-unit" scope="col">Unit</th>
            <th className="col-value" scope="col">{heading}</th>
          </tr>
        </thead>
        <tbody>
          {ranking.rows.map((row, i) => {
            const entries = row.set.map((ref) => lookup(ref));
            const faction = entries[0].faction;
            // Bar length is relative to the best row, which makes the
            // drop-off across the table readable at a glance.
            const share = best > 0 && Number.isFinite(row.value)
              ? Math.max(0, row.value / best)
              : 0;

            return (
              <tr key={row.set.join('+')} style={{ '--faction-color': faction.color } as React.CSSProperties}>
                <td className="col-rank">{i + 1}</td>
                <td className="col-unit">
                  <div className="unit-cell">
                    <div className="unit-cell__icons">
                      {row.set.map((ref) => (
                        <UnitIcon key={ref} unitRef={ref} />
                      ))}
                    </div>
                    <div className="unit-cell__text">
                      <span className="unit-cell__names">
                        {entries.map((e) => e.unit.name).join(' + ')}
                      </span>
                      <span className="unit-cell__faction">
                        {[...new Set(entries.map((e) => e.faction.name))].join(' / ')}
                      </span>
                    </div>
                  </div>
                </td>
                <td className="col-value">
                  <div className="value-cell">
                    <span className="value-cell__bar" style={{ width: `${share * 100}%` }} />
                    <span className="value-cell__number">
                      {Number.isFinite(row.value) ? row.value.toFixed(ranking.precision) : '—'}
                    </span>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
