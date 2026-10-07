import { useEffect, useState } from 'react';
import { factions, unitRef } from '../data/factions';
import {
  EDIT_FIELDS,
  STAT_PRESETS,
  editCount,
  fieldValue,
  matchingPreset,
  setField,
  type EditField,
  type StatEdits,
} from '../data/statEdits';
import { UnitIcon } from './UnitIcon';

interface Props {
  edits: StatEdits;
  onChange: (edits: StatEdits) => void;
}

/**
 * The raw unit stats the ranking draws from, editable in place. Changed
 * cells are marked and show the live value on hover.
 */
export function StatTable({ edits, onChange }: Props) {
  const [factionKey, setFactionKey] = useState('all');
  const [copied, setCopied] = useState(false);
  const preset = matchingPreset(edits);
  const changes = editCount(edits);
  const shown = factionKey === 'all' ? factions : factions.filter((f) => f.key === factionKey);

  const copyLink = () => {
    navigator.clipboard?.writeText(window.location.href).then(
      () => {
        setCopied(true);
        setTimeout(() => setCopied(false), 1800);
      },
      () => {},
    );
  };

  return (
    <section className="panel stat-table" aria-label="Unit stat table">
      <div className="stat-table__head">
        <h2 className="panel__title">Unit stats</h2>
        <div className="stat-table__presets" role="group" aria-label="Stat preset">
          {STAT_PRESETS.map((p) => (
            <button
              key={p.key}
              type="button"
              className={`pill pill--small ${preset?.key === p.key ? 'is-active' : ''}`}
              aria-pressed={preset?.key === p.key}
              title={p.hint}
              onClick={() => onChange(p.edits)}
            >
              {p.label}
            </button>
          ))}
          {!preset && (
            <span className="pill pill--small is-active stat-table__custom" aria-current="true">
              Custom · {changes} {changes === 1 ? 'change' : 'changes'}
            </span>
          )}
        </div>
        <div className="stat-table__actions">
          <select
            className="select"
            value={factionKey}
            onChange={(e) => setFactionKey(e.target.value)}
            aria-label="Faction"
          >
            <option value="all">All factions</option>
            {factions.map((f) => (
              <option key={f.key} value={f.key}>{f.name}</option>
            ))}
          </select>
          <button
            type="button"
            className={`pill pill--small pill--share ${copied ? 'is-copied' : ''}`}
            onClick={copyLink}
          >
            {copied ? '✓ Copied' : '🔗 Copy link'}
          </button>
        </div>
      </div>

      <div className="stat-table__scroll">
        <table className="stat-table__table">
          <thead>
            <tr>
              <th scope="col" className="stat-table__unit-col">Unit</th>
              {EDIT_FIELDS.map((f) => (
                <th key={f.code} scope="col" title={f.label}>{f.short}</th>
              ))}
              <th scope="col"><span className="sr-only">Reset</span></th>
            </tr>
          </thead>
          {shown.map((faction) => (
            <tbody key={faction.key} style={{ '--faction-color': faction.color } as React.CSSProperties}>
              {factionKey === 'all' && (
                <tr className="stat-table__faction">
                  <th scope="rowgroup" colSpan={EDIT_FIELDS.length + 2}>{faction.name}</th>
                </tr>
              )}
              {faction.units.map((unit) => {
                const ref = unitRef(faction.key, unit.key);
                const edit = edits[ref];
                return (
                  <tr key={ref} className={edit ? 'is-edited' : undefined}>
                    <th scope="row" className="stat-table__unit-col">
                      <span className="stat-table__unit">
                        <UnitIcon unitRef={ref} size={22} />
                        {unit.name}
                      </span>
                    </th>
                    {EDIT_FIELDS.map((f) => (
                      <td key={f.code}>
                        <StatCell
                          live={fieldValue(unit, f.code)}
                          value={edit?.[f.code]}
                          label={`${unit.name} ${f.label}`}
                          onCommit={(v) => onChange(setField(edits, ref, f.code as EditField, v))}
                        />
                      </td>
                    ))}
                    <td>
                      {edit && (
                        <button
                          type="button"
                          className="stat-table__reset"
                          title={`Reset ${unit.name} to live stats`}
                          aria-label={`Reset ${unit.name} to live stats`}
                          onClick={() => {
                            const next = { ...edits };
                            delete next[ref];
                            onChange(next);
                          }}
                        >
                          ↺
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          ))}
        </table>
      </div>
    </section>
  );
}

interface CellProps {
  live: number;
  /** The edited value, when this stat has been changed. */
  value: number | undefined;
  label: string;
  onCommit: (value: number) => void;
}

/**
 * Keeps its own text while typing, so a cell can be cleared and retyped;
 * only a valid number reaches the edits, and leaving the cell shows the
 * value actually in use.
 */
function StatCell({ live, value, label, onCommit }: CellProps) {
  const current = value ?? live;
  const [text, setText] = useState(String(current));
  useEffect(() => setText(String(current)), [current]);

  return (
    <input
      className={`stat-table__input ${value !== undefined ? 'is-edited' : ''}`}
      type="number"
      inputMode="decimal"
      min={0}
      step="any"
      value={text}
      aria-label={label}
      title={value !== undefined ? `Live: ${live}` : undefined}
      onChange={(e) => {
        setText(e.target.value);
        const n = Number(e.target.value);
        if (e.target.value !== '' && Number.isFinite(n) && n >= 0) onCommit(n);
      }}
      onBlur={() => setText(String(current))}
    />
  );
}
