import { useMemo } from 'react';
import { maxLevel, NORMAL_MAX_LEVEL, queueGroups } from '../data/buildings';
import { playableFactions } from '../data/factions';
import { factionBuildingList, rules, type FactionBuildingKey } from '../data/rules';
import { DIVISOR_META, NUMERATOR_META, RESOURCE_META } from '../data/statMeta';
import { computeArmy, trainableUnits } from '../engine/army';
import { DURATION_UNITS, SERVER_SPEEDS, toHours, useArmyState, type DurationUnit } from '../armyState';
import { Slider } from '../components/Slider';
import { StatIcon } from '../components/StatIcon';
import { UnitIcon } from '../components/UnitIcon';

const fmt = (n: number) => Math.round(n).toLocaleString();

function duration(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds <= 0) return '—';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.round(seconds % 60);
  if (h) return `${h}h ${String(m).padStart(2, '0')}m`;
  if (m) return `${m}m ${String(s).padStart(2, '0')}s`;
  return `${s}s`;
}

export function ArmyCalculator() {
  const { state, patch, setLevel, toggleUnit, setFaction } = useArmyState();

  const result = useMemo(
    () =>
      computeArmy(
        {
          faction: state.faction,
          hours: toHours(state.durationValue, state.durationUnit),
          speed: state.speed,
          speedBonus: state.speedBonusPercent / 100,
          levels: state.levels,
          selection: state.selection,
        },
        { smithy: state.smithy, buildings: state.buildings },
      ),
    [state],
  );

  const { faction, outputs, lines, totals } = result;
  const outputFor = (key: string) => outputs.find((o) => o.queue.key === key)!;

  return (
    <div className="army">
      <section className="panel army__setup">
        <div className="army__setup-row">
          <label className="field-inline">
            <span className="field-inline__label">Faction</span>
            <select
              className="select"
              value={state.faction}
              onChange={(e) => setFaction(e.target.value)}
            >
              {playableFactions.map((f) => (
                <option key={f.key} value={f.key}>
                  {f.name}
                </option>
              ))}
            </select>
          </label>

          <div className="field-inline field-inline--narrow">
            <span className="field-inline__label">Server speed</span>
            <div className="speed-group" role="group" aria-label="Server speed">
              {SERVER_SPEEDS.map((s) => (
                <button
                  key={s}
                  type="button"
                  className={`pill pill--speed ${state.speed === s ? 'is-active' : ''}`}
                  aria-pressed={state.speed === s}
                  onClick={() => patch({ speed: s })}
                >
                  {s}×
                </button>
              ))}
            </div>
          </div>

          <label className="field-inline field-inline--duration">
            <span className="field-inline__label">Production run</span>
            <div className="duration-input">
              <input
                className="text-input"
                type="number"
                min={0}
                step={1}
                value={state.durationValue}
                onChange={(e) =>
                  patch({ durationValue: Math.max(0, Number(e.target.value) || 0) })
                }
              />
              <select
                className="select"
                value={state.durationUnit}
                onChange={(e) => patch({ durationUnit: e.target.value as DurationUnit })}
              >
                {DURATION_UNITS.map((u) => (
                  <option key={u} value={u}>
                    {u}
                  </option>
                ))}
              </select>
            </div>
          </label>

          <label className="field-inline field-inline--narrow">
            <span className="field-inline__label">Training bonus %</span>
            <input
              className="text-input"
              type="number"
              min={0}
              step={2}
              value={state.speedBonusPercent}
              onChange={(e) =>
                patch({ speedBonusPercent: Math.max(0, Number(e.target.value) || 0) })
              }
            />
          </label>
        </div>

        <div className="army__setup-row army__setup-row--sliders">
          <Slider
            id="army-smithy"
            label={rules.smithy.name}
            iconKey={rules.smithy.icon}
            hint="Raises the attack and defense of the army you produce. Does not affect training speed."
            value={state.smithy}
            max={rules.smithy.maxLevel}
            researchMax={rules.smithy.researchMaxLevel}
            onChange={(smithy) => patch({ smithy })}
          />
          {factionBuildingList.map((b) => {
            const owner = playableFactions.find((f) => f.key === b.faction);
            return (
              <Slider
                key={b.key}
                id={`army-${b.key}`}
                label={b.name}
                hint={b.hint}
                badge={owner?.short}
                badgeColor={owner?.color}
                badgeTitle={owner?.name}
                value={state.buildings[b.key as FactionBuildingKey] ?? 0}
                max={b.maxLevel}
                onChange={(level) =>
                  patch({ buildings: { ...state.buildings, [b.key]: level } })
                }
              />
            );
          })}
        </div>
      </section>

      <div className="army__body">
        <div className="army__main">
          <section className="army__groups">
            {queueGroups.map((group) => {
              const options = trainableUnits(faction, group);
              const picked = state.selection[group.key] ?? [];

              return (
                <div className="qgroup panel" key={group.key}>
                  {group.queues.map((queue) => {
                    const level = state.levels[queue.key] ?? 0;
                    const cap = maxLevel(queue);
                    const out = outputFor(queue.key);

                    return (
                      <div className="qcell" key={queue.key}>
                        <div className="qcell__head">
                          <span className="qcell__name">{queue.name}</span>
                          {queue.building.costMultiplier !== 1 && (
                            <span
                              className="queue__tag"
                              title="Units from here cost triple."
                            >
                              ×{queue.building.costMultiplier}
                            </span>
                          )}
                        </div>

                        <div className="qcell__level">
                          <button
                            type="button"
                            className="pill pill--tiny"
                            onClick={() => setLevel(queue.key, 0)}
                          >
                            0
                          </button>
                          <input
                            className="text-input text-input--level"
                            type="number"
                            min={0}
                            max={cap}
                            aria-label={`${queue.name} level`}
                            value={level}
                            onChange={(e) =>
                              setLevel(
                                queue.key,
                                Math.min(cap, Math.max(0, Number(e.target.value) || 0)),
                              )
                            }
                          />
                          <span className="qcell__cap-buttons">
                            <button
                              type="button"
                              className="pill pill--tiny"
                              onClick={() => setLevel(queue.key, NORMAL_MAX_LEVEL)}
                            >
                              {NORMAL_MAX_LEVEL}
                            </button>
                            {cap > NORMAL_MAX_LEVEL && (
                              <button
                                type="button"
                                className="pill pill--tiny"
                                title={`This building can be pushed to ${cap}.`}
                                onClick={() => setLevel(queue.key, cap)}
                              >
                                {cap}
                              </button>
                            )}
                          </span>
                        </div>

                        <div className="qcell__out">
                          {level > 0 && picked.length > 0 ? `${fmt(out.count)} units` : 'idle'}
                          {out.pushed && <span className="qcell__pushed"> · past cap</span>}
                        </div>
                      </div>
                    );
                  })}

                  {/* Filler so a one-queue group still lines its picker up. */}
                  {Array.from({ length: 3 - group.queues.length }, (_, i) => (
                    <div className="qcell qcell--empty" key={`gap${i}`} aria-hidden="true" />
                  ))}

                  <div className="qgroup__units">
                    <span className="qgroup__caption">
                      {group.name} builds
                      {picked.length > 1 && (
                        <span className="qgroup__split">
                          {' '}
                          · each queue splits its time {picked.length} ways
                        </span>
                      )}
                    </span>
                    <div className="qgroup__picks">
                      {options.map((unit) => {
                        const active = picked.includes(unit.key);
                        const each = outputFor(group.queues[0].key).secondsEach[unit.key];
                        return (
                          <button
                            key={unit.key}
                            type="button"
                            className={`unit-pick ${active ? 'is-active' : ''}`}
                            aria-label={unit.name}
                            title={
                              each
                                ? `${unit.name} — ${duration(each)} each`
                                : (unit.description ?? unit.name)
                            }
                            style={
                              { '--faction-color': faction.color } as React.CSSProperties
                            }
                            onClick={() => toggleUnit(group.key, unit.key)}
                          >
                            <UnitIcon unitRef={`${faction.key}/${unit.key}`} size={28} />
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              );
            })}
          </section>

          <section className="panel army__strip">
            <h2 className="panel__title">Army produced</h2>
            <div className="strip">
              {lines.map((line) => (
                <div
                  className={`strip__cell ${line.count === 0 ? 'is-zero' : ''}`}
                  key={line.ref}
                  title={line.unit.name}
                >
                  <UnitIcon unitRef={line.ref} size={32} />
                  <span className="strip__count">{fmt(line.count)}</span>
                </div>
              ))}
            </div>
          </section>
        </div>

        <section className="army__result">
          <div className="panel">
            <h2 className="panel__title">Cost</h2>
            <dl className="totals">
              {RESOURCE_META.map((meta, i) => (
                <div className="totals__row" key={meta.variable}>
                  <dt>{meta.label}</dt>
                  <dd>
                    <StatIcon meta={meta} /> {fmt(totals.cost[i])}
                  </dd>
                </div>
              ))}
              <div className="totals__row totals__row--sum">
                <dt>Total</dt>
                <dd>{fmt(totals.totalCost)}</dd>
              </div>
              <div className="totals__row totals__row--sub">
                <dt>Per hour</dt>
                <dd>{fmt(totals.costPerHour)}</dd>
              </div>
            </dl>
          </div>

          <div className="panel">
            <h2 className="panel__title">Army strength</h2>
            <dl className="totals">
              <div className="totals__row totals__row--sub">
                <dt>Infantry attack</dt>
                <dd>{fmt(totals.attackInf)}</dd>
              </div>
              <div className="totals__row totals__row--sub">
                <dt>Cavalry attack</dt>
                <dd>{fmt(totals.attackCav)}</dd>
              </div>
              <div className="totals__row">
                <dt>
                  <StatIcon meta={NUMERATOR_META.a} /> Total attack
                </dt>
                <dd>{fmt(totals.attack)}</dd>
              </div>
              <div className="totals__row">
                <dt>
                  <StatIcon meta={NUMERATOR_META.di} /> Inf def
                </dt>
                <dd>{fmt(totals.defInf)}</dd>
              </div>
              <div className="totals__row">
                <dt>
                  <StatIcon meta={NUMERATOR_META.dc} /> Cav def
                </dt>
                <dd>{fmt(totals.defCav)}</dd>
              </div>
              <div className="totals__row">
                <dt>
                  <StatIcon meta={NUMERATOR_META.c} /> Carry
                </dt>
                <dd>{fmt(totals.capacity)}</dd>
              </div>
              <div className="totals__row">
                <dt>
                  <StatIcon meta={DIVISOR_META.cu} /> Upkeep
                </dt>
                <dd>{fmt(totals.upkeep)}</dd>
              </div>
              <div className="totals__row totals__row--sum">
                <dt>Units</dt>
                <dd>{fmt(totals.units)}</dd>
              </div>
            </dl>
          </div>
        </section>
      </div>
    </div>
  );
}
