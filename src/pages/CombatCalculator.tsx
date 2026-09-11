import { useEffect, useMemo, useState } from 'react';
import { UnitIcon } from '../components/UnitIcon';
import { BUILDINGS } from '../data/buildingCatalog';
import { factions, playableFactions, unitRef } from '../data/factions';
import { watchTowerBonus, watchTowerDurability, watchTowerFlat } from '../data/rules';
import type { Faction, Unit } from '../data/types';
import { resolveBattle, type Regiment, type Village, type Wave } from '../engine/combat';
import { buildingCumulativeCost } from '../engine/cpOptimizer';
import { defaultModifiers, offenseFactor, totalCost, upgradeStat } from '../engine/stats';
import { loadStoredJson, saveStoredJson, StorageKeys } from '../storage';

/** Stonemason's Lodge: +10% building durability per level, from the catalog. */
const durabilityFor = (level: number) => 1 + 0.1 * Math.max(0, level);

/** Unit keys are unique across every roster, so one map prices them all. */
const UNIT_COST = new Map(
  factions.flatMap((f) => f.units.map((u) => [u.key, totalCost(u)] as const)),
);

interface Army {
  id: string;
  faction: string;
  smithy: number;
  counts: Record<string, number>;
}

interface CombatState {
  /** Each attacker is its own wave, landing in the order listed. */
  attackers: Army[];
  /** Defenders all stand in the same village and fight as one garrison. */
  defenders: Army[];
  type: 'attack' | 'raid';
  morale: boolean;
  attackerPop: number;
  defenderPop: number;
  wallLevel: number;
  stonemason: number;
  targetGid: number;
  targetLevel: number;
  targetCount: number;
}

let nextId = 0;
const makeArmy = (faction: string): Army => ({
  id: `a${Date.now()}-${nextId++}`,
  faction,
  smithy: 20,
  counts: {},
});

const initialState: CombatState = {
  attackers: [{ ...makeArmy('embermark_dominion'), id: 'att-1' }],
  defenders: [{ ...makeArmy('verdant_wardens'), id: 'def-1' }],
  type: 'attack',
  morale: true,
  attackerPop: 1500,
  defenderPop: 1500,
  wallLevel: 20,
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

/** factionByKey throws, so a saved key from an older roster must not reach it. */
const safeFaction = (key: string): Faction =>
  playableFactions.find((f) => f.key === key) ?? playableFactions[0];

/** Turn one army's roster selection into the flat stats the engine wants. */
function toRegiments(army: Army): Regiment[] {
  const faction = safeFaction(army.faction);
  const mods = { ...defaultModifiers, smithy: army.smithy };
  const factor = offenseFactor(faction, mods);

  return fightable(faction)
    .filter((unit) => (army.counts[unit.key] ?? 0) > 0)
    .map((unit) => ({
      key: unit.key,
      count: army.counts[unit.key] ?? 0,
      off: upgradeStat(unit, unit.off, army.smithy) * factor,
      defInf: upgradeStat(unit, unit.defInf, army.smithy),
      defCav: upgradeStat(unit, unit.defCav, army.smithy),
      cavalry: Boolean(unit.stabled),
      siege: siegeKind(unit),
      upgrade: unit.noUpgrade ? 0 : army.smithy,
    }));
}

/** Resources burnt by the difference between two rosters. */
function lossCost(before: Regiment[], after: Regiment[]): number {
  return before.reduce((sum, r, i) => {
    const lost = Math.max(0, r.count - (after[i]?.count ?? 0));
    return sum + lost * (UNIT_COST.get(r.key) ?? 0);
  }, 0);
}

const unitsLost = (before: Regiment[], after: Regiment[]) =>
  before.reduce((n, r, i) => n + Math.max(0, r.count - (after[i]?.count ?? 0)), 0);

function loadInitialState(): CombatState {
  const saved = loadStoredJson<Partial<CombatState> | null>(StorageKeys.COMBAT_STATE, null);
  // The shape changed when armies became lists; anything older starts fresh.
  if (saved && Array.isArray(saved.attackers) && Array.isArray(saved.defenders)
    && saved.attackers.length > 0 && saved.defenders.length > 0) {
    return { ...initialState, ...saved };
  }
  return initialState;
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

  // The tower belongs to the village being defended, so it is the first
  // defender's faction that owns it.
  const villageFaction = safeFaction(state.defenders[0]?.faction ?? '');

  const battle = useMemo(() => {
    const waveArmies = state.attackers.map(toRegiments);
    const defenders = state.defenders.flatMap(toRegiments);

    const village: Village = {
      pop: state.defenderPop,
      wallLevel: state.wallLevel,
      wallDefBonus: watchTowerBonus(villageFaction.key, state.wallLevel),
      wallDefFlat: watchTowerFlat(villageFaction.key, state.wallLevel),
      wallDurability: watchTowerDurability(villageFaction.key),
      durability: durabilityFor(state.stonemason),
      extraDef: 0,
    };

    const targets = Array.from({ length: state.targetCount }, () => state.targetLevel);
    const waves: Wave[] = waveArmies.map((regiments) => ({
      regiments,
      pop: state.attackerPop,
      type: state.type,
      targets,
      morale: state.morale,
    }));

    if (waveArmies.every((a) => a.length === 0)) return null;
    return { result: resolveBattle(village, defenders, waves), waveArmies, defenders };
  }, [state, villageFaction]);

  const set = <K extends keyof CombatState>(key: K, value: CombatState[K]) =>
    setState((prev) => ({ ...prev, [key]: value }));

  const side = (kind: 'attackers' | 'defenders') => ({
    add: () =>
      setState((p) => ({
        ...p,
        [kind]: [...p[kind], makeArmy(p[kind][p[kind].length - 1]?.faction ?? 'embermark_dominion')],
      })),
    remove: (id: string) =>
      setState((p) => ({ ...p, [kind]: p[kind].filter((a) => a.id !== id) })),
    patch: (id: string, patch: Partial<Army>) =>
      setState((p) => ({
        ...p,
        [kind]: p[kind].map((a) => (a.id === id ? { ...a, ...patch } : a)),
      })),
    count: (id: string, unitKey: string, value: number) =>
      setState((p) => ({
        ...p,
        [kind]: p[kind].map((a) =>
          a.id === id
            ? { ...a, counts: { ...a.counts, [unitKey]: Math.max(0, Math.floor(value) || 0) } }
            : a),
      })),
  });

  const attackers = side('attackers');
  const defenders = side('defenders');

  const damageCost = battle
    ? battle.result.targets.reduce((sum, level) => {
        const before = buildingCumulativeCost(state.targetGid, state.targetLevel).total;
        const after = buildingCumulativeCost(state.targetGid, level).total;
        return sum + Math.max(0, before - after);
      }, 0)
    : 0;

  const attackerCost = battle
    ? battle.result.waves.reduce(
        (sum, w, i) => sum + lossCost(battle.waveArmies[i], w.attackerSurvivors), 0)
    : 0;
  const attackerUnits = battle
    ? battle.result.waves.reduce(
        (n, w, i) => n + unitsLost(battle.waveArmies[i], w.attackerSurvivors), 0)
    : 0;

  const defenderCost = battle ? lossCost(battle.defenders, battle.result.defenderSurvivors) : 0;
  const defenderUnits = battle ? unitsLost(battle.defenders, battle.result.defenderSurvivors) : 0;

  return (
    <main className="cc-page">
      <ArmyCard
        kind="off"
        title="Attackers"
        caption="Each row lands as its own wave, in order, against whatever the last one left."
        armies={state.attackers}
        controls={attackers}
      />

      <section className="panel cc-village">
        <h2 className="panel__title">The village</h2>
        <div className="cc-village__grid">
          <NumberField label="Watch Tower" value={state.wallLevel} max={20}
            onChange={(v) => set('wallLevel', v)} />
          <NumberField label="Stonemason" value={state.stonemason} max={20}
            onChange={(v) => set('stonemason', v)} />
          <NumberField label="Attacker pop" value={state.attackerPop} max={100_000}
            onChange={(v) => set('attackerPop', v)} />
          <NumberField label="Defender pop" value={state.defenderPop} max={100_000}
            onChange={(v) => set('defenderPop', v)} />
          <label className="ds-field">
            <span className="ds-field__label">Attack type</span>
            <select className="ds-field__input" value={state.type}
              onChange={(e) => set('type', e.target.value as 'attack' | 'raid')}>
              <option value="attack">Normal attack</option>
              <option value="raid">Raid</option>
            </select>
          </label>
          <label className="ds-field">
            <span className="ds-field__label">Catapults aim at</span>
            <select className="ds-field__input" value={state.targetGid}
              onChange={(e) => set('targetGid', Number(e.target.value))}>
              {BUILDINGS.map((b) => (
                <option key={b.gid} value={b.gid}>{b.name}</option>
              ))}
            </select>
          </label>
          <NumberField label="Its level" value={state.targetLevel} max={22}
            onChange={(v) => set('targetLevel', v)} />
          <NumberField label="Targets" value={state.targetCount} max={10} min={1}
            onChange={(v) => set('targetCount', Math.max(1, v))} />
        </div>

        <div className="cc-village__footer">
          <label className="cc-toggle">
            <input type="checkbox" checked={state.morale}
              onChange={(e) => set('morale', e.target.checked)} />
            Morale malus
          </label>
          <p className="hint hint--tight">
            {villageFaction.name} tower at level {state.wallLevel}:{' '}
            <strong>+{(watchTowerBonus(villageFaction.key, state.wallLevel) * 100).toFixed(1)}%</strong>,{' '}
            {watchTowerFlat(villageFaction.key, state.wallLevel)} flat, rams resisted at{' '}
            {watchTowerDurability(villageFaction.key)}×. Siege divided by{' '}
            {durabilityFor(state.stonemason).toFixed(1)}×.
          </p>
        </div>
      </section>

      <ArmyCard
        kind="def"
        title="Defenders"
        caption="Every row stands in the same village and fights as one garrison."
        armies={state.defenders}
        controls={defenders}
      />

      {!battle ? (
        <p className="cc-empty">Give an attacker some troops to resolve a battle.</p>
      ) : (
        <section className="cc-results">
          <div className="cc-summary">
            <div className="cc-summary__card cc-summary__card--off">
              <span className="cc-summary__label">Attackers lose</span>
              <span className="cc-summary__value">{round(attackerUnits)}</span>
              <span className="cc-summary__sub">{compact(attackerCost)} resources</span>
            </div>
            <div className="cc-summary__card cc-summary__card--def">
              <span className="cc-summary__label">Defenders lose</span>
              <span className="cc-summary__value">{round(defenderUnits)}</span>
              <span className="cc-summary__sub">{compact(defenderCost)} resources</span>
            </div>
            <div className="cc-summary__card">
              <span className="cc-summary__label">Buildings</span>
              <span className="cc-summary__value">
                {battle.result.targets.join(' · ') || '—'}
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
        </section>
      )}
    </main>
  );
}

interface SideControls {
  add: () => void;
  remove: (id: string) => void;
  patch: (id: string, patch: Partial<Army>) => void;
  count: (id: string, unitKey: string, value: number) => void;
}

interface ArmyCardProps {
  kind: 'off' | 'def';
  title: string;
  caption: string;
  armies: Army[];
  controls: SideControls;
}

function ArmyCard({ kind, title, caption, armies, controls }: ArmyCardProps) {
  return (
    <section className={`panel cc-army cc-army--${kind}`}>
      <div className="cc-army__head">
        <h2 className="panel__title">{title}</h2>
        <button type="button" className="pill pill--tiny" onClick={controls.add}
          disabled={armies.length >= 12}>
          + Add {kind === 'off' ? 'wave' : 'defender'}
        </button>
      </div>

      <div className="cc-rows">
        {armies.map((army, index) => (
          <ArmyRow key={army.id} army={army} index={index} kind={kind}
            removable={armies.length > 1} controls={controls} />
        ))}
      </div>

      <p className="hint hint--tight">{caption}</p>
    </section>
  );
}

interface ArmyRowProps {
  army: Army;
  index: number;
  kind: 'off' | 'def';
  removable: boolean;
  controls: SideControls;
}

function ArmyRow({ army, index, kind, removable, controls }: ArmyRowProps) {
  const faction = safeFaction(army.faction);
  const units = fightable(faction);
  const total = units.reduce((n, u) => n + (army.counts[u.key] ?? 0), 0);

  return (
    <div className="cc-row">
      <div className="cc-row__bar">
        <span className="cc-row__index">{index + 1}</span>
        <select className="cc-row__faction" value={faction.key}
          aria-label={`Row ${index + 1} faction`}
          onChange={(e) => controls.patch(army.id, { faction: e.target.value, counts: {} })}>
          {playableFactions.map((f) => (
            <option key={f.key} value={f.key}>{f.name}</option>
          ))}
        </select>
        <label className="cc-row__smithy">
          Smithy
          <input type="range" min={0} max={20} value={army.smithy}
            aria-label={`Row ${index + 1} smithy`}
            onChange={(e) => controls.patch(army.id, { smithy: Number(e.target.value) })} />
          <span className="ds-field__value">{army.smithy}</span>
        </label>
        <span className="cc-row__total">{total > 0 ? `${total.toLocaleString()} troops` : '—'}</span>
        {removable && (
          <button type="button" className="cc-row__remove" title={`Remove row ${index + 1}`}
            aria-label={`Remove ${kind === 'off' ? 'wave' : 'defender'} ${index + 1}`}
            onClick={() => controls.remove(army.id)}>
            ×
          </button>
        )}
      </div>

      {/* Troops run across rather than down, so a whole army reads at a glance
          and several of them stack without the page becoming a column. */}
      <ul className="cc-troops">
        {units.map((unit) => (
          <li key={unit.key} className="cc-troop">
            <UnitIcon unitRef={unitRef(faction.key, unit.key)} size={28}
              mods={{ ...defaultModifiers, smithy: army.smithy }} />
            <span className="cc-troop__name" title={unit.name}>{unit.name}</span>
            <input className="cc-troop__count" type="number" min={0}
              value={army.counts[unit.key] ?? 0}
              aria-label={`${unit.name}, row ${index + 1}`}
              onChange={(e) => controls.count(army.id, unit.key, Number(e.target.value))} />
          </li>
        ))}
      </ul>
    </div>
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
      <input className="ds-field__input" type="number" min={min} max={max} value={value}
        onChange={(e) => onChange(Math.min(max, Math.max(min, Number(e.target.value) || 0)))} />
    </label>
  );
}
