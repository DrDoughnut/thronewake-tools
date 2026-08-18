import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { createPortal } from 'react-dom';
import { playableFactions, lookup, type UnitRef } from '../data/factions';
import {
  combineUtcDateAndTime,
  decodeCompactPlan,
  distanceBetween,
  encodeCompactPlan,
  enforceMaxSafeWindow,
  formatClock,
  formatDateTime,
  formatDuration,
  formatLocalClock,
  formatLocalDateTime,
  localZoneLabel,
  minuteOfDay,
  parseClock,
  parseUtcDatetime,
  resolveSafeTime,
  routeIsPossible,
  safeChecks,
  safeSegments,
  safeWindowDurationMinutes,
  serverSpeedMultiplier,
  splitUtcDateAndTime,
  toUtcDatetimeInput,
  travelHours,
  type ResolvedSafeTime,
  type SafeChecks,
  type SafeWindow,
} from '../engine/operations';
import { UnitGridPicker } from '../components/UnitGridPicker';

interface SafeTimeOwner {
  safeEnabled: boolean;
  safeStart: string;
  safeEnd: string;
}

interface Attacker extends SafeTimeOwner {
  id: string;
  name: string;
  x: number;
  y: number;
  unitRef: UnitRef;
  artifactMultiplier: 1 | 1.5 | 2;
  bannerfieldLevel: number;
}

/** A targeted account. Owns the safe window that all of its villages share. */
interface Player extends SafeTimeOwner {
  id: string;
  name: string;
}

interface Target extends SafeTimeOwner {
  id: string;
  name: string;
  x: number;
  y: number;
  /** A diversion rather than a real hit. Display only — travel is identical. */
  fake: boolean;
  /** Owning player, or '' when this village carries its own safe window. */
  playerId: string;
}

interface PlannerState {
  landing: string;
  serverSpeed: number;
  attackers: Attacker[];
  targets: Target[];
  players: Player[];
}

interface PlannedRoute {
  key: string;
  attacker: Attacker;
  target: Target;
  /** Where the target's window came from, after player inheritance. */
  targetSafe: ResolvedSafeTime;
  attackerWindow: SafeWindow;
  targetWindow: SafeWindow;
  distance: number;
  travel: number;
  send: Date;
  land: Date;
  checks: SafeChecks;
  possible: boolean;
}

const defaultUnitRef = playableFactions[0].key + '/' + playableFactions[0].units[0].key;

const initialSafeTime = (): SafeTimeOwner => ({
  safeEnabled: false,
  safeStart: '22:00',
  safeEnd: '04:00',
});

const initialState = (): PlannerState => {
  const landing = new Date();
  landing.setUTCHours(landing.getUTCHours() + 8, 0, 0, 0);
  return {
    landing: toUtcDatetimeInput(landing),
    serverSpeed: 3,
    attackers: [{
      id: 'a1',
      name: 'Hammer 1',
      x: 0,
      y: 0,
      unitRef: defaultUnitRef,
      artifactMultiplier: 1,
      bannerfieldLevel: 0,
      ...initialSafeTime(),
    }],
    targets: [{
      id: 't1',
      name: 'Primary target',
      x: 50,
      y: 50,
      fake: false,
      playerId: '',
      ...initialSafeTime(),
    }],
    players: [],
  };
};

export function decodeState(hashOrSearch?: string): PlannerState {
  const fallback = initialState();
  let rawP: string | null = null;
  let rawPlan: string | null = null;

  const sources = hashOrSearch
    ? [hashOrSearch]
    : [
        typeof window !== 'undefined' ? window.location.hash : '',
        typeof window !== 'undefined' ? window.location.search : '',
      ];

  for (const src of sources) {
    if (!src) continue;
    try {
      const clean = src.replace(/^[#?]/, '');
      const p = new URLSearchParams(clean);
      if (!rawP && p.get('p')) rawP = p.get('p');
      if (!rawPlan && p.get('plan')) rawPlan = p.get('plan');
    } catch {}
  }

  // 1. Try compact format ('p' parameter)
  if (rawP) {
    const compactParsed = decodeCompactPlan(rawP);
    if (compactParsed) {
      const cleanAttackers: Attacker[] = (compactParsed.attackers.length ? compactParsed.attackers : fallback.attackers).map((atk, idx) => ({
        id: atk.id || `a${idx + 1}`,
        name: atk.name || `Hammer ${idx + 1}`,
        x: Number(atk.x) || 0,
        y: Number(atk.y) || 0,
        unitRef: typeof atk.unitRef === 'string' ? (atk.unitRef as UnitRef) : defaultUnitRef,
        artifactMultiplier: atk.artifactMultiplier || 1,
        bannerfieldLevel: atk.bannerfieldLevel || 0,
        safeEnabled: Boolean(atk.safeEnabled),
        safeStart: atk.safeStart || '22:00',
        safeEnd: atk.safeEnd || '04:00',
      }));

      const cleanPlayers: Player[] = compactParsed.players.map((player, idx) => ({
        id: player.id || `p${idx + 1}`,
        name: player.name || `Player ${idx + 1}`,
        safeEnabled: Boolean(player.safeEnabled),
        safeStart: player.safeStart || '22:00',
        safeEnd: player.safeEnd || '04:00',
      }));
      const playerIds = new Set(cleanPlayers.map((player) => player.id));

      const cleanTargets: Target[] = (compactParsed.targets.length ? compactParsed.targets : fallback.targets).map((tgt, idx) => ({
        id: tgt.id || `t${idx + 1}`,
        name: tgt.name || `Target ${idx + 1}`,
        x: Number(tgt.x) || 0,
        y: Number(tgt.y) || 0,
        fake: Boolean(tgt.fake),
        // A dangling owner reference drops back to the village's own window
        // rather than leaving a target pointing at nothing.
        playerId: tgt.playerId && playerIds.has(tgt.playerId) ? tgt.playerId : '',
        safeEnabled: Boolean(tgt.safeEnabled),
        safeStart: tgt.safeStart || '22:00',
        safeEnd: tgt.safeEnd || '04:00',
      }));

      return {
        landing: parseUtcDatetime(compactParsed.landing) ? compactParsed.landing : fallback.landing,
        serverSpeed: [1, 3, 10].includes(Number(compactParsed.serverSpeed)) ? Number(compactParsed.serverSpeed) : fallback.serverSpeed,
        attackers: cleanAttackers,
        targets: cleanTargets,
        players: cleanPlayers,
      };
    }
  }

  // 2. Fall back to legacy full JSON format ('plan' parameter)
  if (rawPlan) {
    try {
      if (rawPlan.startsWith('%7B') || rawPlan.startsWith('%7b')) {
        try {
          rawPlan = decodeURIComponent(rawPlan);
        } catch {}
      }
      const parsed = JSON.parse(rawPlan) as Partial<PlannerState>;
      if (Array.isArray(parsed.attackers) && Array.isArray(parsed.targets)) {
        const cleanAttackers: Attacker[] = (parsed.attackers.length ? parsed.attackers : fallback.attackers).map((atk, idx) => {
          const safe = enforceMaxSafeWindow(atk?.safeStart || '22:00', atk?.safeEnd || '04:00', 'start');
          return {
            id: typeof atk?.id === 'string' && atk.id ? atk.id : `a${idx + 1}`,
            name: typeof atk?.name === 'string' && atk.name ? atk.name : `Hammer ${idx + 1}`,
            x: Number(atk?.x) || 0,
            y: Number(atk?.y) || 0,
            unitRef: typeof atk?.unitRef === 'string' ? (atk.unitRef as UnitRef) : defaultUnitRef,
            artifactMultiplier: (atk?.artifactMultiplier === 1.5 || atk?.artifactMultiplier === 2) ? atk.artifactMultiplier : 1,
            bannerfieldLevel: Math.min(20, Math.max(0, Number(atk?.bannerfieldLevel) || 0)),
            safeEnabled: Boolean(atk?.safeEnabled),
            safeStart: safe.safeStart,
            safeEnd: safe.safeEnd,
          };
        });

        const cleanTargets: Target[] = (parsed.targets.length ? parsed.targets : fallback.targets).map((tgt, idx) => {
          const safe = enforceMaxSafeWindow(tgt?.safeStart || '22:00', tgt?.safeEnd || '04:00', 'start');
          return {
            id: typeof tgt?.id === 'string' && tgt.id ? tgt.id : `t${idx + 1}`,
            name: typeof tgt?.name === 'string' && tgt.name ? tgt.name : `Target ${idx + 1}`,
            x: Number(tgt?.x) || 0,
            y: Number(tgt?.y) || 0,
            // The legacy JSON format predates players and fake marks.
            fake: Boolean(tgt?.fake),
            playerId: '',
            safeEnabled: Boolean(tgt?.safeEnabled),
            safeStart: safe.safeStart,
            safeEnd: safe.safeEnd,
          };
        });

        return {
          landing: typeof parsed.landing === 'string' && parseUtcDatetime(parsed.landing)
            ? parsed.landing
            : fallback.landing,
          serverSpeed: [1, 3, 10].includes(Number(parsed.serverSpeed))
            ? Number(parsed.serverSpeed)
            : fallback.serverSpeed,
          attackers: cleanAttackers,
          targets: cleanTargets,
          players: [],
        };
      }
    } catch {}
  }

  return fallback;
}

/**
 * Local-time display is a viewer preference, not part of the plan: a shared
 * link should describe the operation and nothing about how the sender happens
 * to be reading it. So it is deliberately kept out of the URL and remembered
 * on this machine instead — the one thing here that outlives the fragment.
 */
const LOCAL_PREF_KEY = 'thronewake.showLocalTime';

function readShowLocal(): boolean {
  try {
    return window.localStorage.getItem(LOCAL_PREF_KEY) === '1';
  } catch {
    return false;
  }
}

function writeShowLocal(value: boolean): void {
  try {
    window.localStorage.setItem(LOCAL_PREF_KEY, value ? '1' : '0');
  } catch {
    // Private browsing or a blocked store — the toggle still works this session.
  }
}

const plannerHash = (state: PlannerState) => `tool=operations&p=${encodeCompactPlan(state)}`;

/** A single instant, always in UTC, with the viewer's own clock beneath it. */
function Stamp({
  date,
  showLocal,
  seconds = false,
  className = '',
}: {
  date: Date;
  showLocal: boolean;
  seconds?: boolean;
  className?: string;
}) {
  return (
    <span className={`op-stamp ${className}`}>
      <span className="op-stamp__utc">{formatDateTime(date, seconds)}</span>
      {showLocal && (
        <span className="op-stamp__local">{formatLocalDateTime(date, seconds)}</span>
      )}
    </span>
  );
}

function ownerWindow(owner: SafeTimeOwner): SafeWindow {
  return {
    enabled: owner.safeEnabled,
    start: parseClock(owner.safeStart),
    end: parseClock(owner.safeEnd),
  };
}

const nextId = (prefix: string) => prefix + Math.random().toString(36).slice(2, 8);

function numberFromInput(value: string): number {
  return Number(value) || 0;
}

/** Keyboard-friendly coordinate input that handles negative numbers and intermediate typing smoothly. */
interface CoordInputProps {
  value: number;
  onChange: (val: number) => void;
  ariaLabel?: string;
}

function CoordInput({ value, onChange, ariaLabel }: CoordInputProps) {
  const [localText, setLocalText] = useState(String(value));

  useEffect(() => {
    setLocalText(String(value));
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    // Allow typing "-", empty string, or positive/negative integer
    if (raw === '' || raw === '-') {
      setLocalText(raw);
      return;
    }
    if (/^-?\d*$/.test(raw)) {
      setLocalText(raw);
      const parsed = parseInt(raw, 10);
      if (!isNaN(parsed)) {
        onChange(parsed);
      }
    }
  };

  const handleBlur = () => {
    if (localText === '' || localText === '-') {
      setLocalText('0');
      onChange(0);
    } else {
      const parsed = parseInt(localText, 10) || 0;
      setLocalText(String(parsed));
      onChange(parsed);
    }
  };

  return (
    <input
      className="text-input text-input--coord"
      type="text"
      inputMode="numeric"
      value={localText}
      aria-label={ariaLabel}
      onChange={handleChange}
      onBlur={handleBlur}
      onFocus={(e) => e.target.select()}
    />
  );
}

/** Keyboard-friendly 24-hour time input (HH:mm) that prevents digit swallowing. */
interface Time24InputProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
  placeholder?: string;
  disabled?: boolean;
}

function Time24Input({
  value,
  onChange,
  className = 'text-input text-input--time24',
  placeholder = '14:00',
  disabled = false,
}: Time24InputProps) {
  const [localText, setLocalText] = useState(value);

  useEffect(() => {
    setLocalText(value);
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    let cleaned = raw.replace(/[^\d:]/g, '');
    if (cleaned.length > 5) cleaned = cleaned.slice(0, 5);
    setLocalText(cleaned);

    // If it matches valid HH:mm pattern, sync with parent immediately
    if (/^([01]\d|2[0-3]):[0-5]\d$/.test(cleaned)) {
      onChange(cleaned);
    }
  };

  const handleBlur = () => {
    if (!localText.trim()) {
      setLocalText(value);
      return;
    }
    const formatted = formatClock(parseClock(localText));
    setLocalText(formatted);
    onChange(formatted);
  };

  return (
    <input
      className={className}
      type="text"
      maxLength={5}
      placeholder={placeholder}
      value={localText}
      disabled={disabled}
      onChange={handleChange}
      onBlur={handleBlur}
      onFocus={(e) => e.target.select()}
    />
  );
}

function SafeTimeFields({
  owner,
  label,
  onChange,
}: {
  owner: SafeTimeOwner;
  label: string;
  onChange: (patch: Partial<SafeTimeOwner>) => void;
}) {
  const isOvernight = parseClock(owner.safeStart) > parseClock(owner.safeEnd);
  const durMinutes = safeWindowDurationMinutes(parseClock(owner.safeStart), parseClock(owner.safeEnd));
  const durHours = (durMinutes / 60).toFixed(1).replace(/\.0$/, '');

  const handleStartChange = (safeStart: string) => {
    const updated = enforceMaxSafeWindow(safeStart, owner.safeEnd, 'start');
    onChange(updated);
  };

  const handleEndChange = (safeEnd: string) => {
    const updated = enforceMaxSafeWindow(owner.safeStart, safeEnd, 'end');
    onChange(updated);
  };

  return (
    <div className={`op-safetime ${owner.safeEnabled ? 'is-enabled' : 'is-disabled'}`}>
      <div className="op-safetime__header">
        <label className="op-toggle">
          <input
            type="checkbox"
            checked={owner.safeEnabled}
            onChange={(event) => onChange({ safeEnabled: event.target.checked })}
          />
          <span className="op-toggle__indicator" />
          <span className="op-toggle__title">{label}</span>
        </label>
        <span className="op-safetime__tag">
          {owner.safeEnabled ? `${durHours}h active` : 'Disabled'}
        </span>
      </div>

      {owner.safeEnabled && (
        <div className="op-safetime__body">
          <div className="op-safetime__inputs">
            <label className="op-field-time">
              <span className="op-field-time__label">From (UTC)</span>
              <Time24Input
                value={owner.safeStart}
                onChange={handleStartChange}
                placeholder="22:00"
              />
            </label>
            <label className="op-field-time">
              <span className="op-field-time__label">Until (UTC)</span>
              <Time24Input
                value={owner.safeEnd}
                onChange={handleEndChange}
                placeholder="04:00"
              />
            </label>
          </div>
          <div className="op-safetime__footer-meta">
            <span className="op-safetime__window-type">
              {isOvernight ? '🌙 Overnight window (crosses 00:00 UTC)' : '☀️ Same-day window'} · Max 6h
            </span>
            <span className="op-safetime__range-badge">
              {owner.safeStart} – {owner.safeEnd} UTC
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

function TargetCard({
  target,
  index,
  players,
  canRemove,
  onPatch,
  onRemove,
}: {
  target: Target;
  index: number;
  players: Player[];
  canRemove: boolean;
  onPatch: (patch: Partial<Target>) => void;
  onRemove: () => void;
}) {
  const inherited = resolveSafeTime(target, players);

  return (
    <article className="op-card op-card--target">
      {/* Row 1: Name + Coordinates + Remove Button */}
      <div className="op-card__header-row">
        <span className="op-card__idx">#{index + 1}</span>
        <input
          className="text-input op-card__name"
          aria-label="Target name"
          value={target.name}
          onChange={(event) => onPatch({ name: event.target.value })}
        />
        <div className="coord-inline">
          <label className="coord-field">
            <span className="coord-field__tag">X</span>
            <CoordInput
              value={target.x}
              onChange={(x) => onPatch({ x })}
              ariaLabel="Target X coordinate"
            />
          </label>
          <label className="coord-field">
            <span className="coord-field__tag">Y</span>
            <CoordInput
              value={target.y}
              onChange={(y) => onPatch({ y })}
              ariaLabel="Target Y coordinate"
            />
          </label>
        </div>
        <button
          type="button"
          className="op-remove"
          aria-label={'Remove ' + target.name}
          disabled={!canRemove}
          onClick={onRemove}
        >
          ×
        </button>
      </div>

      {/* Row 2: Owner and whether this hit is real or a diversion */}
      <div className="op-target-meta">
        <label className="op-modifier-field">
          <span className="op-field-label">Player</span>
          <select
            className="select op-select-solid"
            value={target.playerId}
            onChange={(event) => onPatch({ playerId: event.target.value })}
          >
            <option value="">Own safe hours</option>
            {players.map((player) => (
              <option key={player.id} value={player.id}>{player.name}</option>
            ))}
          </select>
        </label>

        <div className="op-modifier-field">
          <span className="op-field-label">Attack Type</span>
          <div className="op-fake-group" role="group" aria-label="Attack type">
            <button
              type="button"
              className={`pill pill--tiny op-fake-pill ${target.fake ? '' : 'is-real'}`}
              aria-pressed={!target.fake}
              onClick={() => onPatch({ fake: false })}
            >
              Real
            </button>
            <button
              type="button"
              className={`pill pill--tiny op-fake-pill ${target.fake ? 'is-fake' : ''}`}
              aria-pressed={target.fake}
              onClick={() => onPatch({ fake: true })}
            >
              Fake
            </button>
          </div>
        </div>
      </div>

      {/* Bottom: Safe Time Configuration */}
      <div className="op-card__footer">
        {target.playerId ? (
          <p className="op-inherited">
            {inherited.safeEnabled
              ? `Inherits ${inherited.sourceName}: ${inherited.safeStart}–${inherited.safeEnd} UTC`
              : `${inherited.sourceName} has no safe hours set`}
          </p>
        ) : (
          <SafeTimeFields
            owner={target}
            label="Defender Safe Hours"
            onChange={onPatch}
          />
        )}
      </div>
    </article>
  );
}

function SafetimeHeaderTooltip() {
  const [show, setShow] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);

  useEffect(() => {
    if (!show || !triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const tooltipWidth = 320;
    let left = rect.left - 120;
    if (left + tooltipWidth > window.innerWidth - 16) {
      left = window.innerWidth - tooltipWidth - 16;
    }
    if (left < 16) left = 16;
    setPos({ top: rect.bottom + 6, left });
  }, [show]);

  return (
    <div className="safetime-header-wrap">
      <span>Safetime Checks</span>
      <button
        ref={triggerRef}
        type="button"
        className="safetime-info-btn"
        onMouseEnter={() => setShow(true)}
        onMouseLeave={() => setShow(false)}
        onFocus={() => setShow(true)}
        onBlur={() => setShow(false)}
        aria-label="Safetime checks explanation"
      >
        ?
      </button>

      {show &&
        pos &&
        createPortal(
          <div
            className="safetime-tooltip-card"
            style={{ top: pos.top, left: pos.left }}
            role="tooltip"
          >
            <div className="safetime-tooltip-card__title">How Safetime Checks Work</div>
            <p className="safetime-tooltip-card__copy">
              A route is marked <strong>Possible</strong> only when all 4 conditions are clear (✓):
            </p>
            <ul className="safetime-tooltip-card__list">
              <li><strong>Check A:</strong> Landing does not fall into the Attacker’s safe hours.</li>
              <li><strong>Check B:</strong> Landing does not fall into the Defender’s safe hours.</li>
              <li><strong>Check C:</strong> Send (launch) does not fall into the Attacker’s safe hours.</li>
              <li><strong>Check D:</strong> Send (launch) does not fall into the Defender’s safe hours.</li>
            </ul>
            <p className="safetime-tooltip-card__footer">
              Hover any route’s check dots to see the detailed evaluation.
            </p>
          </div>,
          document.body,
        )}
    </div>
  );
}

function SafetimeChecksCell({ route, showLocal }: { route: PlannedRoute; showLocal: boolean }) {
  const stamp = (date: Date, seconds = false) =>
    formatDateTime(date, seconds)
    + (showLocal ? ` · ${formatLocalDateTime(date, seconds)}` : '');

  // Names whoever actually owns the window, so an inherited one is not
  // mistaken for something set on the village.
  const defenderLabel = route.targetSafe.sourceName ?? route.target.name;
  const defenderWindowText = route.targetSafe.safeEnabled
    ? `${defenderLabel} safe time: ${route.targetSafe.safeStart}–${route.targetSafe.safeEnd} UTC`
    : `${defenderLabel} has no safe time`;

  const [show, setShow] = useState(false);
  const triggerRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);

  useEffect(() => {
    if (!show || !triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const popoverWidth = 360;
    let left = rect.left - 140;
    if (left + popoverWidth > window.innerWidth - 16) {
      left = window.innerWidth - popoverWidth - 16;
    }
    if (left < 16) left = 16;
    setPos({ top: rect.bottom + 6, left });
  }, [show]);

  const checks = [
    {
      code: 'A',
      title: 'Land / Attacker Safe Time',
      blocked: route.checks.landAttacker,
      time: `Land: ${stamp(route.land)}`,
      windowText: route.attacker.safeEnabled
        ? `${route.attacker.name} safe time: ${route.attacker.safeStart}–${route.attacker.safeEnd} UTC`
        : `${route.attacker.name} has no safe time`,
    },
    {
      code: 'B',
      title: 'Land / Defender Safe Time',
      blocked: route.checks.landDefender,
      time: `Land: ${stamp(route.land)}`,
      windowText: defenderWindowText,
    },
    {
      code: 'C',
      title: 'Send / Attacker Safe Time',
      blocked: route.checks.sendAttacker,
      time: `Send: ${stamp(route.send, true)}`,
      windowText: route.attacker.safeEnabled
        ? `${route.attacker.name} safe time: ${route.attacker.safeStart}–${route.attacker.safeEnd} UTC`
        : `${route.attacker.name} has no safe time`,
    },
    {
      code: 'D',
      title: 'Send / Defender Safe Time',
      blocked: route.checks.sendDefender,
      time: `Send: ${stamp(route.send, true)}`,
      windowText: defenderWindowText,
    },
  ];

  return (
    <div
      ref={triggerRef}
      className="op-checks-cell"
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
      onFocus={() => setShow(true)}
      onBlur={() => setShow(false)}
      tabIndex={0}
      role="button"
      aria-label={`Safetime checks: ${route.possible ? 'Clear' : 'Blocked'}. Hover for details.`}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="op-check-dots">
        {checks.map((c) => (
          <span
            key={c.code}
            className={`op-check-dot ${c.blocked ? 'is-blocked' : 'is-clear'}`}
            title={`${c.code}: ${c.title} — ${c.blocked ? 'BLOCKED' : 'CLEAR'}`}
          >
            {c.code}
          </span>
        ))}
      </div>
      <span className={`op-check-pill ${route.possible ? 'is-clear' : 'is-blocked'}`}>
        {route.possible ? 'Clear' : 'Blocked'}
      </span>

      {show &&
        pos &&
        createPortal(
          <div
            className="safetime-popover"
            style={{ top: pos.top, left: pos.left }}
            role="tooltip"
          >
            <div className="safetime-popover__header">
              <div>
                <span className="safetime-popover__title">Safetime Check Details</span>
                <span className="safetime-popover__route">
                  {route.attacker.name} → {route.target.name}
                </span>
              </div>
              <span className={`op-status ${route.possible ? 'is-possible' : 'is-blocked'}`}>
                {route.possible ? 'All Clear ✓' : 'Blocked ✕'}
              </span>
            </div>

            <div className="safetime-popover__items">
              {checks.map((chk) => (
                <div
                  key={chk.code}
                  className={`safetime-popover__row ${chk.blocked ? 'is-blocked' : 'is-clear'}`}
                >
                  <span className="safetime-popover__badge">{chk.code}</span>
                  <div className="safetime-popover__details">
                    <div className="safetime-popover__name">
                      <strong>{chk.title}</strong>
                      <span className="safetime-popover__state">
                        {chk.blocked ? 'BLOCKED' : 'CLEAR'}
                      </span>
                    </div>
                    <div className="safetime-popover__meta">
                      <span>{chk.time}</span>
                      <span className="safetime-popover__sub">{chk.windowText}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="safetime-popover__footer">
              <span>
                Send: <strong>{formatClock(minuteOfDay(route.send), true)} UTC</strong>
                {showLocal && <em className="op-local-inline">{formatLocalClock(route.send, true)} local</em>}
              </span>
              <span>
                Land: <strong>{formatClock(minuteOfDay(route.land))} UTC</strong>
                {showLocal && <em className="op-local-inline">{formatLocalClock(route.land)} local</em>}
              </span>
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
}

function TimelineLane({
  label,
  window,
  isSelected = false,
  type = 'attacker',
  onClick,
}: {
  label: string;
  window: SafeWindow;
  isSelected?: boolean;
  type?: 'attacker' | 'defender';
  onClick?: () => void;
}) {
  return (
    <div
      className={`schedule__row schedule__row--${type} ${onClick ? 'schedule__row--interactive ' : ''}${isSelected ? 'is-selected-lane' : 'is-faded-lane'}`}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick();
        }
      } : undefined}
      title={onClick ? (isSelected ? `${label} (currently selected)` : `Click to switch route to ${label}`) : undefined}
    >
      <span className="schedule__label">
        {isSelected && (
          <span className={`schedule__active-indicator schedule__active-indicator--${type}`} aria-hidden="true">
            ●
          </span>
        )}
        {label}
      </span>
      <div className="schedule__track">
        {safeSegments(window).map((segment) => (
          <span
            key={segment.start + '-' + segment.end}
            className={`schedule__safe schedule__safe--${type} ${isSelected ? 'is-selected' : ''}`}
            style={{
              '--left': (segment.start / 14.4) + '%',
              '--width': ((segment.end - segment.start) / 14.4) + '%',
            } as CSSProperties}
          />
        ))}
        {!window.enabled && <span className="schedule__none">No safe time provided</span>}
      </div>
    </div>
  );
}

function DailySchedule({
  routes,
  route,
  onSelectRoute,
  showLocal,
}: {
  routes: PlannedRoute[];
  route: PlannedRoute;
  onSelectRoute: (routeKey: string) => void;
  showLocal: boolean;
}) {
  const attackers = [...new Map(routes.map((item) => [item.attacker.id, item.attacker])).values()];
  // Villages of one player share a window, so they collapse into a single lane
  // keyed by the player — otherwise five villages draw five identical bars.
  const defenderKey = (target: Target) => target.playerId || target.id;
  const defenders = [...new Map(routes.map((item) => [
    defenderKey(item.target),
    {
      key: defenderKey(item.target),
      label: item.targetSafe.sourceName ?? item.target.name,
      window: ownerWindow(item.targetSafe),
    },
  ])).values()];
  const selectedDefenderKey = defenderKey(route.target);
  const sendPosition = Math.min(100, Math.max(0, minuteOfDay(route.send) / 14.4));
  const landPosition = Math.min(100, Math.max(0, minuteOfDay(route.land) / 14.4));

  const handleSelectAttacker = (attackerId: string) => {
    const nextRoute = routes.find(
      (r) => r.attacker.id === attackerId && r.target.id === route.target.id
    ) ?? routes.find((r) => r.attacker.id === attackerId);
    if (nextRoute) {
      onSelectRoute(nextRoute.key);
    }
  };

  // A defender lane covers every village of one player, so match on the lane's
  // key rather than a single target id.
  const handleSelectDefender = (laneKey: string) => {
    const nextRoute = routes.find(
      (r) => r.attacker.id === route.attacker.id && defenderKey(r.target) === laneKey
    ) ?? routes.find((r) => defenderKey(r.target) === laneKey);
    if (nextRoute) {
      onSelectRoute(nextRoute.key);
    }
  };

  return (
    <section className="panel op-schedule">
      <div className="op-section-head">
        <div>
          <h2 className="panel__title">Daily safe-time schedule · UTC</h2>
          <p className="op-section-copy">
            Selected route: <strong>{route.attacker.name}</strong> → <strong>{route.target.name}</strong>. Click any lane or route row to switch.
          </p>
        </div>
        <span className={'op-status ' + (route.possible ? 'is-possible' : 'is-blocked')}>
          {route.possible ? 'All Checks Clear' : 'Route Blocked'}
        </span>
      </div>

      {/* Accurately positioned 00:00 to 24:00 timeline axis */}
      <div className="schedule__axis-row" aria-hidden="true">
        <span className="schedule__axis-spacer" />
        <div className="schedule__axis-track">
          <span className="schedule__axis-tick" style={{ left: '0%' }}>00:00</span>
          <span className="schedule__axis-tick" style={{ left: '25%' }}>06:00</span>
          <span className="schedule__axis-tick" style={{ left: '50%' }}>12:00</span>
          <span className="schedule__axis-tick" style={{ left: '75%' }}>18:00</span>
          <span className="schedule__axis-tick" style={{ left: '100%' }}>24:00</span>
        </div>
      </div>

      <p className="schedule__group">Attackers</p>
      {attackers.map((attacker) => (
        <TimelineLane
          key={attacker.id}
          label={attacker.name}
          window={ownerWindow(attacker)}
          isSelected={attacker.id === route.attacker.id}
          type="attacker"
          onClick={() => handleSelectAttacker(attacker.id)}
        />
      ))}

      <p className="schedule__group">Defenders</p>
      {defenders.map((defender) => (
        <TimelineLane
          key={defender.key}
          label={defender.label}
          window={defender.window}
          isSelected={defender.key === selectedDefenderKey}
          type="defender"
          onClick={() => handleSelectDefender(defender.key)}
        />
      ))}

      {/* Movement row displaying selected route safe-time boxes and vertical pins */}
      <div className="schedule__row schedule__row--events">
        <span className="schedule__label">Movement</span>
        <div className="schedule__track schedule__track--events">
          {/* Selected Attacker Safe Window overlays */}
          {route.attackerWindow.enabled && safeSegments(route.attackerWindow).map((seg) => (
            <span
              key={`mov-atk-${seg.start}-${seg.end}`}
              className="schedule__movement-safe schedule__movement-safe--attacker"
              style={{
                '--left': (seg.start / 14.4) + '%',
                '--width': ((seg.end - seg.start) / 14.4) + '%',
              } as CSSProperties}
              title={`${route.attacker.name} Safe Window: ${route.attacker.safeStart}–${route.attacker.safeEnd} UTC`}
            >
              <span className="schedule__movement-safe-tag">Attacker Safe</span>
            </span>
          ))}

          {/* Selected Defender Safe Window overlays */}
          {route.targetWindow.enabled && safeSegments(route.targetWindow).map((seg) => (
            <span
              key={`mov-def-${seg.start}-${seg.end}`}
              className="schedule__movement-safe schedule__movement-safe--defender"
              style={{
                '--left': (seg.start / 14.4) + '%',
                '--width': ((seg.end - seg.start) / 14.4) + '%',
              } as CSSProperties}
              title={`${route.targetSafe.sourceName ?? route.target.name} Safe Window: ${route.targetSafe.safeStart}–${route.targetSafe.safeEnd} UTC`}
            >
              <span className="schedule__movement-safe-tag">Defender Safe</span>
            </span>
          ))}

          {/* Send Pin */}
          <div
            className="schedule__pin schedule__pin--send"
            style={{ left: `${sendPosition}%` }}
            title={'Send ' + formatDateTime(route.send, true)}
          >
            <div className="schedule__pin-badge">
              <span className="schedule__pin-dot" />
              <span>
                Send {formatClock(minuteOfDay(route.send), true)} UTC
                {showLocal && (
                  <span className="schedule__pin-local">{formatLocalClock(route.send, true)} local</span>
                )}
              </span>
            </div>
            <div className="schedule__pin-line" />
            <div className="schedule__pin-head" />
          </div>

          {/* Land Pin */}
          <div
            className="schedule__pin schedule__pin--land"
            style={{ left: `${landPosition}%` }}
            title={'Land ' + formatDateTime(route.land)}
          >
            <div className="schedule__pin-head" />
            <div className="schedule__pin-line" />
            <div className="schedule__pin-badge">
              <span className="schedule__pin-dot" />
              <span>
                Land {formatClock(minuteOfDay(route.land))} UTC
                {showLocal && (
                  <span className="schedule__pin-local">{formatLocalClock(route.land)} local</span>
                )}
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export function OperationPlanner() {
  const [state, setState] = useState<PlannerState>(() => decodeState());
  const [showLocal, setShowLocal] = useState<boolean>(readShowLocal);
  const [selectedKey, setSelectedKey] = useState('');
  const zoneLabel = useMemo(() => localZoneLabel(), []);

  // Sync state whenever hash or popstate changes (e.g. pasted URL, bookmark, back/forward)
  useEffect(() => {
    const handleHashChange = () => {
      setState(decodeState());
    };
    window.addEventListener('hashchange', handleHashChange);
    window.addEventListener('popstate', handleHashChange);
    return () => {
      window.removeEventListener('hashchange', handleHashChange);
      window.removeEventListener('popstate', handleHashChange);
    };
  }, []);

  const [copied, setCopied] = useState(false);

  const copyShareLink = async () => {
    const hash = plannerHash(state);
    const fullUrl = `${window.location.origin}${window.location.pathname}#${hash}`;
    try {
      await navigator.clipboard.writeText(fullUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      window.location.hash = hash;
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  useEffect(() => {
    window.history.replaceState(null, '', `${window.location.pathname}#${plannerHash(state)}`);
  }, [state]);

  useEffect(() => {
    writeShowLocal(showLocal);
  }, [showLocal]);

  // `decodeState` guarantees a parseable landing, so this fallback should never
  // fire. It is pinned to a ref anyway: recomputing `new Date()` inside a memo
  // would make every route time drift on an unrelated re-render.
  const fallbackLanding = useRef<Date | null>(null);

  const parsedLanding = useMemo(() => {
    const parsed = parseUtcDatetime(state.landing);
    if (parsed) return parsed;
    if (!fallbackLanding.current) fallbackLanding.current = new Date();
    return fallbackLanding.current;
  }, [state.landing]);

  const { date: landingDate, time: landingTime } = useMemo(() => {
    return splitUtcDateAndTime(parsedLanding);
  }, [parsedLanding]);

  const updateLanding = (newDate: string, newTime: string) => {
    const combined = combineUtcDateAndTime(newDate, newTime);
    if (combined) {
      setState((current) => ({ ...current, landing: toUtcDatetimeInput(combined) }));
    }
  };

  const shiftLandingHours = (hoursToAdd: number) => {
    const next = new Date(parsedLanding.getTime() + hoursToAdd * 3_600_000);
    setState((current) => ({ ...current, landing: toUtcDatetimeInput(next) }));
  };

  const setLandingNow = () => {
    const now = new Date();
    setState((current) => ({ ...current, landing: toUtcDatetimeInput(now) }));
  };

  const routes = useMemo<PlannedRoute[]>(() => {
    const land = parsedLanding;
    if (!land) return [];

    const computed = state.attackers.flatMap((attacker) =>
      state.targets.map((target) => {
        const unit = lookup(attacker.unitRef).unit;
        const distance = distanceBetween(attacker, target);
        const travel = travelHours(distance, {
          unitSpeed: unit.speed,
          serverSpeed: serverSpeedMultiplier(state.serverSpeed),
          artifactMultiplier: attacker.artifactMultiplier,
          bannerfieldLevel: attacker.bannerfieldLevel,
        });
        const send = new Date(land.getTime() - travel * 3_600_000);
        const attackerWindow = ownerWindow(attacker);
        const targetSafe = resolveSafeTime(target, state.players);
        const targetWindow = ownerWindow(targetSafe);
        const checks = safeChecks(send, land, attackerWindow, targetWindow);
        return {
          key: attacker.id + ':' + target.id,
          attacker,
          target,
          targetSafe,
          attackerWindow,
          targetWindow,
          distance,
          travel,
          send,
          land,
          checks,
          possible: routeIsPossible(checks),
        };
      }),
    );

    // Sort routes chronologically by Send time ascending (earliest departure first)
    return computed.sort((a, b) => a.send.getTime() - b.send.getTime());
  }, [state.attackers, state.targets, state.players, state.serverSpeed, parsedLanding]);

  const selectedRoute = routes.find((route) => route.key === selectedKey) ?? routes[0];

  /**
   * Target cards, bucketed by owner. A player keeps their bucket even with no
   * villages in it yet, so the "+ Village" button has somewhere to live;
   * unassigned villages collect in a final bucket.
   */
  const targetGroups = useMemo(() => {
    const groups: Array<{
      key: string;
      label: string;
      player: Player | null;
      targets: Target[];
    }> = state.players.map((player) => ({
      key: player.id,
      label: player.name,
      player,
      targets: state.targets.filter((target) => target.playerId === player.id),
    }));

    const unassigned = state.targets.filter((target) => !target.playerId);
    if (unassigned.length) {
      groups.push({
        key: '',
        label: 'Unassigned villages',
        player: null,
        targets: unassigned,
      });
    }
    return groups;
  }, [state.players, state.targets]);

  const patchAttacker = (id: string, patch: Partial<Attacker>) => {
    setState((current) => ({
      ...current,
      attackers: current.attackers.map((attacker) =>
        attacker.id === id ? { ...attacker, ...patch } : attacker),
    }));
  };

  const patchTarget = (id: string, patch: Partial<Target>) => {
    setState((current) => ({
      ...current,
      targets: current.targets.map((target) =>
        target.id === id ? { ...target, ...patch } : target),
    }));
  };

  const addAttacker = () => {
    setState((current) => ({
      ...current,
      attackers: [...current.attackers, {
        id: nextId('a'),
        name: 'Hammer ' + (current.attackers.length + 1),
        x: 0,
        y: 0,
        unitRef: defaultUnitRef,
        artifactMultiplier: 1,
        bannerfieldLevel: 0,
        ...initialSafeTime(),
      }],
    }));
  };

  const addTarget = (playerId = '') => {
    setState((current) => {
      const owner = current.players.find((player) => player.id === playerId);
      return {
        ...current,
        targets: [...current.targets, {
          id: nextId('t'),
          name: owner
            ? `${owner.name} village ${current.targets.filter((t) => t.playerId === playerId).length + 1}`
            : 'Target ' + (current.targets.length + 1),
          x: 0,
          y: 0,
          fake: false,
          playerId: owner ? owner.id : '',
          ...initialSafeTime(),
        }],
      };
    });
  };

  const patchPlayer = (id: string, patch: Partial<Player>) => {
    setState((current) => ({
      ...current,
      players: current.players.map((player) =>
        player.id === id ? { ...player, ...patch } : player),
    }));
  };

  const addPlayer = () => {
    setState((current) => {
      const player: Player = {
        id: nextId('p'),
        name: 'Player ' + (current.players.length + 1),
        ...initialSafeTime(),
        safeEnabled: true,
      };
      return { ...current, players: [...current.players, player] };
    });
  };

  /** Removing a player leaves its villages in place, holding the window they
   *  had been inheriting, so a misclick does not silently unprotect them. */
  const removePlayer = (id: string) => {
    setState((current) => {
      const owner = current.players.find((player) => player.id === id);
      return {
        ...current,
        players: current.players.filter((player) => player.id !== id),
        targets: current.targets.map((target) =>
          target.playerId === id
            ? {
                ...target,
                playerId: '',
                safeEnabled: owner ? owner.safeEnabled : target.safeEnabled,
                safeStart: owner ? owner.safeStart : target.safeStart,
                safeEnd: owner ? owner.safeEnd : target.safeEnd,
              }
            : target),
      };
    });
  };

  return (
    <div className="operations">
      <section className="panel op-command">
        <div className="op-command__main">
          <div className="op-landing-control">
            <div className="op-landing-control__label-row">
              <span className="op-command__label">Coordinated Landing Time</span>
              <span className="op-utc-badge">24h UTC</span>
              <label
                className="op-local-toggle"
                title={`Also show every time in ${zoneLabel}. Stays on this device — shared links carry only the plan.`}
              >
                <input
                  type="checkbox"
                  checked={showLocal}
                  onChange={(event) => setShowLocal(event.target.checked)}
                />
                <span>Show local time</span>
              </label>
            </div>
            <div className="op-landing-control__inputs">
              <input
                className="text-input text-input--date"
                type="date"
                value={landingDate}
                onChange={(event) => updateLanding(event.target.value, landingTime)}
              />
              <Time24Input
                value={landingTime}
                onChange={(newTime) => updateLanding(landingDate, newTime)}
                placeholder="14:00"
              />
            </div>
            {showLocal && (
              <span className="op-landing-local">
                = {formatLocalDateTime(parsedLanding)} · {zoneLabel}
              </span>
            )}
            <div className="op-landing-shortcuts">
              <span className="op-landing-shortcuts__label">Shift:</span>
              <button type="button" className="pill pill--tiny" onClick={() => shiftLandingHours(1)}>+1h</button>
              <button type="button" className="pill pill--tiny" onClick={() => shiftLandingHours(4)}>+4h</button>
              <button type="button" className="pill pill--tiny" onClick={() => shiftLandingHours(8)}>+8h</button>
              <button type="button" className="pill pill--tiny" onClick={() => shiftLandingHours(12)}>+12h</button>
              <button type="button" className="pill pill--tiny" onClick={() => shiftLandingHours(24)}>+24h</button>
              <button type="button" className="pill pill--tiny" onClick={setLandingNow}>Now</button>
            </div>
          </div>

          <div className="op-speed-control">
            <span className="op-command__label">Server Speed</span>
            <div className="speed-group" role="group" aria-label="Server speed">
              {[1, 3, 10].map((speed) => (
                <button
                  key={speed}
                  type="button"
                  className={'pill pill--speed ' + (state.serverSpeed === speed ? 'is-active' : '')}
                  aria-pressed={state.serverSpeed === speed}
                  onClick={() => setState((current) => ({ ...current, serverSpeed: speed }))}
                >
                  {speed}×
                </button>
              ))}
            </div>
            <span className="op-speed-note">
              {state.serverSpeed === 1 ? '1× troop speed' : state.serverSpeed === 3 ? '2× troop speed' : '4× troop speed'}
            </span>
          </div>

          <div className="op-share-control">
            <span className="op-command__label">Share Plan</span>
            <button
              type="button"
              className={`pill pill--share ${copied ? 'is-copied' : ''}`}
              onClick={copyShareLink}
              title="Copy short shareable link with current plan settings"
            >
              {copied ? '✓ Link Copied!' : '🔗 Copy Share Link'}
            </button>
          </div>
        </div>

        <p className="hint">
          All times and safe windows use 24-hour UTC. Coordinate distances are calculated Euclidean.
        </p>
      </section>

      <div className="op-rosters">
        {/* Attackers Section */}
        <section className="panel op-roster op-roster--attackers">
          <div className="op-section-head">
            <div className="op-section-head__title-group">
              <span className="op-section-tag op-section-tag--attacker">Attackers</span>
              <h2 className="panel__title">Attacking Armies ({state.attackers.length})</h2>
              <p className="op-section-copy">Configure slowest troop, speed modifiers, and base coordinates.</p>
            </div>
            <button type="button" className="pill pill--tiny pill--primary" onClick={addAttacker}>
              + Add Attacker
            </button>
          </div>

          <div className="op-cards">
            {state.attackers.map((attacker, index) => (
              <article className="op-card op-card--attacker" key={attacker.id}>
                {/* Row 1: Name + Coordinates + Remove Button */}
                <div className="op-card__header-row">
                  <span className="op-card__idx">#{index + 1}</span>
                  <input
                    className="text-input op-card__name"
                    aria-label="Attacker name"
                    value={attacker.name}
                    onChange={(event) => patchAttacker(attacker.id, { name: event.target.value })}
                  />
                  <div className="coord-inline">
                    <label className="coord-field">
                      <span className="coord-field__tag">X</span>
                      <CoordInput
                        value={attacker.x}
                        onChange={(x) => patchAttacker(attacker.id, { x })}
                        ariaLabel="Attacker X coordinate"
                      />
                    </label>
                    <label className="coord-field">
                      <span className="coord-field__tag">Y</span>
                      <CoordInput
                        value={attacker.y}
                        onChange={(y) => patchAttacker(attacker.id, { y })}
                        ariaLabel="Attacker Y coordinate"
                      />
                    </label>
                  </div>
                  <button
                    type="button"
                    className="op-remove"
                    aria-label={'Remove ' + attacker.name}
                    disabled={state.attackers.length === 1}
                    onClick={() =>
                      setState((current) => ({
                        ...current,
                        attackers: current.attackers.filter((item) => item.id !== attacker.id),
                      }))}
                  >
                    ×
                  </button>
                </div>

                {/* Row 2: Slowest Troop Grid Picker */}
                <div className="op-card__troop-section">
                  <span className="op-field-label">Slowest Troop</span>
                  <UnitGridPicker
                    unitRef={attacker.unitRef}
                    onChange={(newRef) => patchAttacker(attacker.id, { unitRef: newRef })}
                  />
                </div>

                {/* Row 3: Modifiers (Artifact & Bannerfield) */}
                <div className="op-modifiers-card">
                  <label className="op-modifier-field">
                    <span className="op-field-label">Speed Artifact</span>
                    <select
                      className="select op-select-solid"
                      value={attacker.artifactMultiplier}
                      onChange={(event) => patchAttacker(attacker.id, {
                        artifactMultiplier: Number(event.target.value) as Attacker['artifactMultiplier'],
                      })}
                    >
                      <option value={1}>1.0× (None)</option>
                      <option value={1.5}>1.5× (Small / Unique)</option>
                      <option value={2}>2.0× (Large)</option>
                    </select>
                  </label>

                  <label className="op-modifier-field">
                    <span className="op-field-label">Bannerfield Lvl</span>
                    <div className="bannerfield-input-wrap">
                      <input
                        className="text-input op-input-solid"
                        type="number"
                        min={0}
                        max={20}
                        value={attacker.bannerfieldLevel}
                        onChange={(event) => patchAttacker(attacker.id, {
                          bannerfieldLevel: Math.min(20, Math.max(0, numberFromInput(event.target.value))),
                        })}
                      />
                      <span className="bannerfield-bonus-tag">
                        +{attacker.bannerfieldLevel * 20}% &gt;20f
                      </span>
                    </div>
                  </label>
                </div>

                {/* Bottom: Safe Time Configuration */}
                <div className="op-card__footer">
                  <SafeTimeFields
                    owner={attacker}
                    label="Attacker Safe Hours"
                    onChange={(patch) => patchAttacker(attacker.id, patch)}
                  />
                </div>
              </article>
            ))}
          </div>
        </section>

        {/* Targets Section */}
        <section className="panel op-roster op-roster--targets">
          <div className="op-section-head">
            <div className="op-section-head__title-group">
              <span className="op-section-tag op-section-tag--target">Targets</span>
              <h2 className="panel__title">Target Destinations ({state.targets.length})</h2>
              <p className="op-section-copy">Set target coordinates and defender safe window protection.</p>
            </div>
            <div className="op-section-head__actions">
              <button type="button" className="pill pill--tiny" onClick={addPlayer}>
                + Add Player
              </button>
              <button type="button" className="pill pill--tiny pill--primary" onClick={() => addTarget()}>
                + Add Target
              </button>
            </div>
          </div>

          {state.players.length === 0 && (
            <p className="op-players__empty">
              Add a player to hold one safe window, then attach their villages to it instead of
              retyping the hours for every village.
            </p>
          )}

          {/* Villages are listed under the player they belong to. Cards are
              appended in the order they were created, which interleaves owners
              once more than one player is in play. */}
          {targetGroups.map((group) => (
            <div
              className={`op-target-group ${group.player ? 'is-player' : 'is-loose'}`}
              key={group.key || 'unassigned'}
            >
              <div className="op-target-group__head">
                {group.player ? (
                  <input
                    className="text-input op-player__name"
                    aria-label="Player name"
                    value={group.player.name}
                    onChange={(event) => patchPlayer(group.key, { name: event.target.value })}
                  />
                ) : (
                  <span className="op-target-group__name">{group.label}</span>
                )}
                <span className="op-target-group__meta">
                  {group.targets.length} {group.targets.length === 1 ? 'village' : 'villages'}
                </span>
                {group.player && (
                  <>
                    <button
                      type="button"
                      className="pill pill--tiny"
                      onClick={() => addTarget(group.key)}
                    >
                      + Village
                    </button>
                    <button
                      type="button"
                      className="op-remove"
                      aria-label={'Remove ' + group.player.name}
                      onClick={() => removePlayer(group.key)}
                    >
                      ×
                    </button>
                  </>
                )}
              </div>

              {/* One safe window for the whole group — every village inherits it. */}
              {group.player && (
                <SafeTimeFields
                  owner={group.player}
                  label={`${group.player.name} Safe Hours`}
                  onChange={(patch) => patchPlayer(group.key, patch)}
                />
              )}

              <div className="op-cards">
                {group.targets.map((target, index) => (
                  <TargetCard
                    key={target.id}
                    target={target}
                    index={index}
                    players={state.players}
                    canRemove={state.targets.length > 1}
                    onPatch={(patch) => patchTarget(target.id, patch)}
                    onRemove={() =>
                      setState((current) => ({
                        ...current,
                        targets: current.targets.filter((item) => item.id !== target.id),
                      }))}
                  />
                ))}
              </div>
            </div>
          ))}
        </section>
      </div>

      {/* Results Section */}
      <section className="panel op-results">
        <div className="op-section-head">
          <div>
            <h2 className="panel__title">Route Plan (Sorted by Send Time)</h2>
            <p className="op-section-copy">
              Click anywhere on a row to inspect its schedule. {routes.filter((route) => route.possible).length} of {routes.length} routes clear all safetime checks
              {' · '}{routes.filter((route) => !route.target.fake).length} real, {routes.filter((route) => route.target.fake).length} fake.
            </p>
          </div>
        </div>

        <div className="op-routes">
          <table>
            <thead>
              <tr>
                <th>Route</th>
                <th>Distance</th>
                <th>Travel Duration</th>
                <th>Send Time (UTC)</th>
                <th>Land Time (UTC)</th>
                <th>
                  <SafetimeHeaderTooltip />
                </th>
              </tr>
            </thead>
            <tbody>
              {routes.map((route) => (
                <tr
                  key={route.key}
                  className={`op-route-row ${(selectedRoute?.key === route.key ? 'is-selected ' : '') + (route.possible ? 'is-possible' : 'is-blocked')}`}
                  onClick={() => setSelectedKey(route.key)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      setSelectedKey(route.key);
                    }
                  }}
                >
                  <td data-label="Route">
                    <div className="op-route-summary">
                      <div className="op-route-button__names">
                        <strong className="op-route-attacker">{route.attacker.name}</strong>
                        <span className="op-route-arrow">→</span>
                        <strong className="op-route-target">{route.target.name}</strong>
                        <span className="op-route-coords">({route.target.x}|{route.target.y})</span>
                        <span className={`op-hit-tag ${route.target.fake ? 'is-fake' : 'is-real'}`}>
                          {route.target.fake ? 'Fake' : 'Real'}
                        </span>
                      </div>
                      <span className="op-route-unit-hint">
                        {lookup(route.attacker.unitRef).unit.name} ({lookup(route.attacker.unitRef).unit.speed} f/h)
                        {route.targetSafe.sourceName ? ` · ${route.targetSafe.sourceName}` : ''}
                      </span>
                    </div>
                  </td>
                  <td data-label="Distance">
                    <span className="tabular-stat">{route.distance.toFixed(2)}</span> fields
                  </td>
                  <td data-label="Travel Duration">
                    <span className="travel-stat">{formatDuration(route.travel)}</span>
                  </td>
                  <td data-label="Send Time (UTC)">
                    <Stamp
                      date={route.send}
                      showLocal={showLocal}
                      seconds
                      className="op-timestamp op-timestamp--send"
                    />
                  </td>
                  <td data-label="Land Time (UTC)">
                    <Stamp
                      date={route.land}
                      showLocal={showLocal}
                      className="op-timestamp op-timestamp--land"
                    />
                  </td>
                  <td data-label="Safetime Checks">
                    <SafetimeChecksCell route={route} showLocal={showLocal} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {selectedRoute && (
        <DailySchedule
          routes={routes}
          route={selectedRoute}
          onSelectRoute={setSelectedKey}
          showLocal={showLocal}
        />
      )}
    </div>
  );
}
