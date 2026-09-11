import { useEffect, useMemo, useState } from 'react';
import { UnitIcon } from '../components/UnitIcon';
import { BUILDINGS } from '../data/buildingCatalog';
import { playableFactions, unitRef } from '../data/factions';
import type { Faction, Unit } from '../data/types';
import { resolveBattle, type Regiment, type Village, type Wave } from '../engine/combat';
import { buildingCumulativeCost } from '../engine/cpOptimizer';
import { defaultModifiers, offenseFactor, totalCost, upgradeStat } from '../engine/stats';
import { loadStoredJson, saveStoredJson, StorageKeys } from '../storage';

/**
 * The Watch Tower is Thronewake's wall — the rams say so themselves — but the
 * building catalog carries no numbers for it: every one of its twenty levels
 * has an empty `effects` object, so its defence bonus cannot be looked up.
 * Until those land, the bonus is typed in by hand rather than invented here.
 */
const WALL_DATA_MISSING = true;

/** Stonemason's Lodge: +10% building durability per level, from the catalog. */
const durabilityFor = (level: number) => 1 + 0.1 * Math.max(0, level);

interface CombatState {
  attackerFaction: string;
  defenderFaction: string;
  attacker: Record<string, number>;
  defender: Record<string, number>;
  attackerSmithy: number;
  defenderSmithy: number;
  waves: number;
  type: 'attack' | 'raid';
  morale: boolean;
  attackerPop: number;
  defenderPop: number;
  wallLevel: number;
  wallBonusPercent: number;
  wallFlat: number;
  stonemason: number;
  targetGid: number;
  targetLevel: number;
  targetCount: number;
}

const initialState: CombatState = {
  attackerFaction: 'embermark_dominion',
  defenderFaction: 'verdant_wardens',
  attacker: {},
  defender: {},
  attackerSmithy: 20,
  defenderSmithy: 20,
  waves: 1,
  type: 'attack',
  morale: true,
  attackerPop: 1500,
  defenderPop: 1500,
  wallLevel: 20,
  wallBonusPercent: 0,
  wallFlat: 0,
  stonemason: 0,
  targetGid: 15,
  targetLevel: 20,
  targetCount: 1,
};

/** Units worth putting in a battle: no settlers, no chiefs, no scouts. */
const fightable = (faction: Faction): Unit[] =>
  faction.units.filter((u) => u.role !== 'settler' && u.role !== 'chief' && u.role !== 'scout');

const siegeKind = (unit: Unit): 'ram' | 'catapult' | undefined => {
  if (unit.role === 'ram') return 'ram';
  if (unit.role === 'siege') return 'catapult';
  return undefined;
};

/** Turn a roster selection into the flat stats the combat engine wants. */
function toRegiments(
  faction: Faction,
  counts: Record<string, number>,
  smithy: number,
): Regiment[] {
  const mods = { ...defaultModifiers, smithy };
  const factor = offenseFactor(faction, mods);

  return fightable(faction)
    .filter((unit) => (counts[unit.key] ?? 0) > 0)
    .map((unit) => ({
      key: unit.key,
      count: counts[unit.key] ?? 0,
      off: upgradeStat(unit, unit.off, smithy) * factor,
      defInf: upgradeStat(unit, unit.defInf, smithy),
      defCav: upgradeStat(unit, unit.defCav, smithy),
      cavalry: Boolean(unit.stabled),
      siege: siegeKind(unit),
      upgrade: unit.noUpgrade ? 0 : smithy,
    }));
}

/** Resources burnt by the difference between two rosters. */
function lossCost(faction: Faction, before: Regiment[], after: Regiment[]): number {
  const units = new Map(faction.units.map((u) => [u.key, u]));
  return before.reduce((sum, r, i) => {
    const unit = units.get(r.key);
    if (!unit) return sum;
    const lost = Math.max(0, r.count - (after[i]?.count ?? 0));
    return sum + lost * totalCost(unit);
  }, 0);
}

const unitsLost = (before: Regiment[], after: Regiment[]) =>
  before.reduce((n, r, i) => n + Math.max(0, r.count - (after[i]?.count ?? 0)), 0);

/** factionByKey throws, so a saved key from an older roster must not reach it. */
const safeFaction = (key: string): Faction =>
  playableFactions.find((f) => f.key === key) ?? playableFactions[0];

function loadInitialState(): CombatState {
  const saved = loadStoredJson<Partial<CombatState> | null>(StorageKeys.COMBAT_STATE, null);
  return saved && typeof saved === 'object' ? { ...initialState, ...saved } : initialState;
}

const round = (n: number) => Math.round(n).toLocaleString();

const compact = (n: number) => {
  if (!Number.isFinite(n)) return '—';
  const abs = Math.abs(n);
  if (abs >= 1_000_000) return `${(n / 1_000_000).toFixed(abs >= 10_000_000 ? 0 : 1)}M`;
  if (abs >= 10_000) return `${Math.round(n / 1000)}k`;
  return round(n);
};

const pct = (n: number) => `${(n * 100).toFixed(n > 0 && n < 0.01 ? 2 : 1)}%`;

export function CombatCalculator() {
  const [state, setState] = useState<CombatState>(loadInitialState);

  useEffect(() => {
    saveStoredJson(StorageKeys.COMBAT_STATE, state);
  }, [state]);

  const attackerFaction = safeFaction(state.attackerFaction);
  const defenderFaction = safeFaction(state.defenderFaction);

  const battle = useMemo(() => {
    const attackRegiments = toRegiments(attackerFaction, state.attacker, state.attackerSmithy);
    const defendRegiments = toRegiments(defenderFaction, state.defender, state.defenderSmithy);

    const village: Village = {
      pop: state.defenderPop,
      wallLevel: state.wallLevel,
      wallDefBonus: state.wallBonusPercent / 100,
      wallDefFlat: state.wallFlat,
      wallDurability: 1,
      durability: durabilityFor(state.stonemason),
      extraDef: 0,
    };

    const targets = Array.from({ length: state.targetCount }, () => state.targetLevel);
    const waves: Wave[] = Array.from({ length: state.waves }, () => ({
      regiments: attackRegiments.map((r) => ({ ...r })),
      pop: state.attackerPop,
      type: state.type,
      targets,
      morale: state.morale,
    }));

    if (attackRegiments.length === 0) return null;
    return { result: resolveBattle(village, defendRegiments, waves), attackRegiments, defendRegiments };
  }, [state, attackerFaction, defenderFaction]);

  const set = <K extends keyof CombatState>(key: K, value: CombatState[K]) =>
    setState((prev) => ({ ...prev, [key]: value }));

  const setCount = (side: 'attacker' | 'defender', key: string, value: number) =>
    setState((prev) => ({
      ...prev,
      [side]: { ...prev[side], [key]: Math.max(0, Math.floor(value) || 0) },
    }));

  const targetBuilding = BUILDINGS.find((b) => b.gid === state.targetGid);

  // Rebuilding what the catapults knocked down, level by level.
  const damageCost = battle
    ? battle.result.targets.reduce((sum, level) => {
        const before = buildingCumulativeCost(state.targetGid, state.targetLevel).total;
        const after = buildingCumulativeCost(state.targetGid, level).total;
        return sum + Math.max(0, before - after);
      }, 0)
    : 0;

  const attackerCost = battle
    ? battle.result.waves.reduce(
        (sum, w) => sum + lossCost(attackerFaction, battle.attackRegiments, w.attackerSurvivors),
        0,
      )
    : 0;

  const defenderCost = battle
    ? lossCost(defenderFaction, battle.defendRegiments, battle.result.defenderSurvivors)
    : 0;

  return (
    <main className="app__body ds-page">
      <aside className="app__controls">
        <div className="panel">
          <h2 className="panel__title">The village</h2>
          <NumberField label="Watch Tower level" value={state.wallLevel} max={20}
            onChange={(v) => set('wallLevel', v)} />
          <NumberField label="Wall defence bonus (%)" value={state.wallBonusPercent} max={300}
            onChange={(v) => set('wallBonusPercent', v)} />
          <NumberField label="Wall flat defence" value={state.wallFlat} max={100_000}
            onChange={(v) => set('wallFlat', v)} />
          <NumberField label="Stonemason's Lodge level" value={state.stonemason} max={20}
            onChange={(v) => set('stonemason', v)} />
          <p className="hint">
            Siege is divided by {durabilityFor(state.stonemason).toFixed(1)}× durability.
          </p>
          {WALL_DATA_MISSING && (
            <p className="cc-warning">
              The Watch Tower has no defence values in the building catalog — all twenty
              levels carry an empty <code>effects</code> object — so the bonus above is typed
              in rather than read from the level. Nothing here is guessing on your behalf.
            </p>
          )}
        </div>

        <div className="panel">
          <h2 className="panel__title">The attack</h2>
          <label className="ds-field">
            <span className="ds-field__label">Attack type</span>
            <select className="ds-field__input" value={state.type}
              onChange={(e) => set('type', e.target.value as 'attack' | 'raid')}>
              <option value="attack">Normal attack</option>
              <option value="raid">Raid</option>
            </select>
          </label>
          <NumberField label="Waves" value={state.waves} max={20} min={1}
            onChange={(v) => set('waves', Math.max(1, v))} />
          <NumberField label="Attacker population" value={state.attackerPop} max={100_000}
            onChange={(v) => set('attackerPop', v)} />
          <NumberField label="Defender population" value={state.defenderPop} max={100_000}
            onChange={(v) => set('defenderPop', v)} />
          <label className="cc-toggle">
            <input type="checkbox" checked={state.morale}
              onChange={(e) => set('morale', e.target.checked)} />
            Morale malus
          </label>
          <p className="hint">
            A bigger attacker fights at reduced offense, never below 0.667×.
          </p>
        </div>

        <div className="panel">
          <h2 className="panel__title">Catapult targets</h2>
          <label className="ds-field">
            <span className="ds-field__label">Building</span>
            <select className="ds-field__input" value={state.targetGid}
              onChange={(e) => set('targetGid', Number(e.target.value))}>
              {BUILDINGS.map((b) => (
                <option key={b.gid} value={b.gid}>{b.name}</option>
              ))}
            </select>
          </label>
          <NumberField label="Starting level" value={state.targetLevel}
            max={targetBuilding?.maxLevel ?? 20} onChange={(v) => set('targetLevel', v)} />
          <NumberField label="How many targets" value={state.targetCount} max={10} min={1}
            onChange={(v) => set('targetCount', Math.max(1, v))} />
        </div>
      </aside>

      <section className="app__results">
        <div className="cc-armies">
          <ArmyPanel
            title="Attacker"
            tone="off"
            faction={attackerFaction}
            counts={state.attacker}
            smithy={state.attackerSmithy}
            onFaction={(k) => set('attackerFaction', k)}
            onSmithy={(v) => set('attackerSmithy', v)}
            onCount={(k, v) => setCount('attacker', k, v)}
            onClear={() => set('attacker', {})}
          />
          <ArmyPanel
            title="Defender"
            tone="def"
            faction={defenderFaction}
            counts={state.defender}
            smithy={state.defenderSmithy}
            onFaction={(k) => set('defenderFaction', k)}
            onSmithy={(v) => set('defenderSmithy', v)}
            onCount={(k, v) => setCount('defender', k, v)}
            onClear={() => set('defender', {})}
          />
        </div>

        {!battle ? (
          <p className="cc-empty">Give the attacker some troops to resolve a battle.</p>
        ) : (
          <>
            <div className="cc-summary">
              <div className="cc-summary__card cc-summary__card--off">
                <span className="cc-summary__label">Attacker loses</span>
                <span className="cc-summary__value">
                  {round(battle.result.waves.reduce(
                    (n, w) => n + unitsLost(battle.attackRegiments, w.attackerSurvivors), 0))}
                </span>
                <span className="cc-summary__sub">{compact(attackerCost)} resources</span>
              </div>
              <div className="cc-summary__card cc-summary__card--def">
                <span className="cc-summary__label">Defender loses</span>
                <span className="cc-summary__value">
                  {round(unitsLost(battle.defendRegiments, battle.result.defenderSurvivors))}
                </span>
                <span className="cc-summary__sub">{compact(defenderCost)} resources</span>
              </div>
              <div className="cc-summary__card">
                <span className="cc-summary__label">Buildings</span>
                <span className="cc-summary__value">
                  {battle.result.targets.map((l) => l).join(' · ') || '—'}
                </span>
                <span className="cc-summary__sub">{compact(damageCost)} to rebuild</span>
              </div>
              <div className="cc-summary__card">
                <span className="cc-summary__label">Watch Tower</span>
                <span className="cc-summary__value">{battle.result.wallLevel}</span>
                <span className="cc-summary__sub">from level {state.wallLevel}</span>
              </div>
            </div>

            <div className="ds-table-wrap">
              <table className="ds-table">
                <caption className="ds-table__caption">
                  Each wave meets whatever the last one left: the garrison carries its losses
                  forward, and the wall and buildings stay where the previous wave put them.
                </caption>
                <thead>
                  <tr>
                    <th scope="col">Wave</th>
                    <th scope="col">Offense</th>
                    <th scope="col">Defence</th>
                    <th scope="col">Morale</th>
                    <th scope="col">Att. losses</th>
                    <th scope="col">Def. losses</th>
                    <th scope="col">Wall</th>
                    <th scope="col">Targets</th>
                  </tr>
                </thead>
                <tbody>
                  {battle.result.waves.map((w, i) => (
                    <tr key={i}>
                      <th scope="row">{i + 1}</th>
                      <td>{compact(w.offPoints)}</td>
                      <td>{compact(w.defPoints)}</td>
                      <td>{w.morale === 1 ? '—' : `${w.morale.toFixed(3)}×`}</td>
                      <td className={w.offLosses === 1 ? 'ds-td--thin' : undefined}>
                        {pct(w.offLosses)}
                      </td>
                      <td className={w.defLosses === 1 ? 'ds-td--thin' : undefined}>
                        {pct(w.defLosses)}
                      </td>
                      <td>{w.wallLevel}</td>
                      <td>{w.targets.join(' · ') || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <p className="hint">
              Defence is blended by the attacker's own make-up:{' '}
              <code>defInf × (offInf ÷ off) + defCav × (offCav ÷ off)</code>. The same garrison
              answers a cavalry hammer and an infantry hammer with two different numbers, which
              is why composition matters as much as size. Casualties use the T4 curve — the
              loser is wiped, the winner keeps <code>(loser ÷ winner)^1.5</code>.
            </p>
          </>
        )}
      </section>
    </main>
  );
}

interface NumberFieldProps {
  label: string;
  value: number;
  max: number;
  min?: number;
  onChange: (value: number) => void;
}

function NumberField({ label, value, max, min = 0, onChange }: NumberFieldProps) {
  return (
    <label className="ds-field">
      <span className="ds-field__label">{label}</span>
      <input
        className="ds-field__input"
        type="number"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(Math.min(max, Math.max(min, Number(e.target.value) || 0)))}
      />
    </label>
  );
}

interface ArmyPanelProps {
  title: string;
  tone: 'off' | 'def';
  faction: Faction;
  counts: Record<string, number>;
  smithy: number;
  onFaction: (key: string) => void;
  onSmithy: (value: number) => void;
  onCount: (key: string, value: number) => void;
  onClear: () => void;
}

function ArmyPanel({
  title, tone, faction, counts, smithy, onFaction, onSmithy, onCount, onClear,
}: ArmyPanelProps) {
  const units = fightable(faction);
  const total = units.reduce((n, u) => n + (counts[u.key] ?? 0), 0);

  return (
    <div className={`panel cc-army cc-army--${tone}`}>
      <div className="cc-army__head">
        <h2 className="panel__title">{title}</h2>
        <button type="button" className="pill pill--tiny" onClick={onClear} disabled={total === 0}>
          Clear
        </button>
      </div>

      <div className="cc-army__controls">
        <select className="ds-field__input" value={faction.key}
          onChange={(e) => onFaction(e.target.value)} aria-label={`${title} faction`}>
          {playableFactions.map((f) => (
            <option key={f.key} value={f.key}>{f.name}</option>
          ))}
        </select>
        <label className="cc-smithy">
          Smithy
          <input type="range" min={0} max={20} value={smithy}
            onChange={(e) => onSmithy(Number(e.target.value))} />
          <span className="ds-field__value">{smithy}</span>
        </label>
      </div>

      <ul className="cc-units">
        {units.map((unit) => (
          <li key={unit.key} className="cc-unit">
            <UnitIcon unitRef={unitRef(faction.key, unit.key)} size={26}
              mods={{ ...defaultModifiers, smithy }} />
            <span className="cc-unit__name" title={unit.description}>{unit.name}</span>
            <input
              className="cc-unit__count"
              type="number"
              min={0}
              value={counts[unit.key] ?? 0}
              onChange={(e) => onCount(unit.key, Number(e.target.value))}
              aria-label={`${unit.name} count`}
            />
          </li>
        ))}
      </ul>
    </div>
  );
}
