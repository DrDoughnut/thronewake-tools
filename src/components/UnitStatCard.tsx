import type { Faction, Unit } from '../data/types';
import { DIVISOR_META, NUMERATOR_META, SPEED_META, type StatMeta } from '../data/statMeta';
import { computeStats, type Modifiers, type UnitStats } from '../engine/stats';
import { StatIcon } from './StatIcon';

interface Props {
  faction: Faction;
  unit: Unit;
  mods: Modifiers;
}

/**
 * The five stats Thronewake actually publishes, plus upkeep. Scouting is
 * left out here on purpose — see the note in `statMeta.ts`.
 */
const ROWS: StatMeta[] = [
  SPEED_META,
  NUMERATOR_META.a,
  NUMERATOR_META.di,
  NUMERATOR_META.dc,
  NUMERATOR_META.c,
  DIVISOR_META.cu,
];

/** The in-game hover card: a unit's key stats, evaluated under whatever the current smithy/building levels are. */
export function UnitStatCard({ faction, unit, mods }: Props) {
  const stats = computeStats(faction, unit, mods);

  return (
    <div className="stat-card">
      <div className="stat-card__head">
        <span className="stat-card__name">{unit.name}</span>
        <span className="stat-card__faction" style={{ color: faction.color }}>
          {faction.name}
        </span>
      </div>
      <dl className="stat-card__rows">
        {ROWS.map((meta) => (
          <div className="stat-card__row" key={meta.variable}>
            <dt>
              <StatIcon meta={meta} size={13} /> {meta.short}
            </dt>
            <dd>{Math.round(stats[meta.variable as keyof UnitStats])}</dd>
          </div>
        ))}
      </dl>
      {unit.description && <p className="stat-card__flavor">{unit.description}</p>}
    </div>
  );
}
