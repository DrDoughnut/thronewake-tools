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

/** A targeted defender account. Owns the safe window that all of its villages share. */
interface Player extends SafeTimeOwner {
  id: string;
  name: string;
}

interface Target extends SafeTimeOwner {
  id: string;
  name: string;
  x: number;
  y: number;
  fake: boolean;
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
  const defPlayerId = 'p1';
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
    players: [{
      id: defPlayerId,
      name: 'Defender 1',
      ...initialSafeTime(),
    }],
    targets: [{
      id: 't1',
      name: 'Village 1',
      x: 50,
      y: 50,
      fake: false,
      playerId: defPlayerId,
      ...initialSafeTime(),
    }],
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
        name: player.name || `Defender ${idx + 1}`,
        safeEnabled: Boolean(player.safeEnabled),
        safeStart: player.safeStart || '22:00',
        safeEnd: player.safeEnd || '04:00',
      }));

      if (cleanPlayers.length === 0) {
        compactParsed.targets.forEach((tgt, idx) => {
          const pId = `p${idx + 1}`;
          cleanPlayers.push({
            id: pId,
            name: tgt.name || `Defender ${idx + 1}`,
            safeEnabled: Boolean(tgt.safeEnabled),
            safeStart: tgt.safeStart || '22:00',
            safeEnd: tgt.safeEnd || '04:00',
          });
          tgt.playerId = pId;
        });
      }
      if (cleanPlayers.length === 0) {
        cleanPlayers.push({
          id: 'p1',
          name: 'Defender 1',
          ...initialSafeTime(),
        });
      }
      const playerIds = new Set(cleanPlayers.map((player) => player.id));

      const cleanTargets: Target[] = (compactParsed.targets.length ? compactParsed.targets : fallback.targets).map((tgt, idx) => ({
        id: tgt.id || `t${idx + 1}`,
        name: tgt.name || `Village ${idx + 1}`,
        x: Number(tgt.x) || 0,
        y: Number(tgt.y) || 0,
        fake: Boolean(tgt.fake),
        playerId: tgt.playerId && playerIds.has(tgt.playerId) ? tgt.playerId : cleanPlayers[0].id,
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

        const legacyPlayers: Player[] = Array.isArray(parsed.players) && parsed.players.length > 0
          ? parsed.players.map((p, idx) => {
              const safe = enforceMaxSafeWindow(p?.safeStart || '22:00', p?.safeEnd || '04:00', 'start');
              return {
                id: p.id || `p${idx + 1}`,
                name: p.name || `Defender ${idx + 1}`,
                safeEnabled: Boolean(p.safeEnabled),
                safeStart: safe.safeStart,
                safeEnd: safe.safeEnd,
              };
            })
          : [];

        if (legacyPlayers.length === 0) {
          parsed.targets.forEach((tgt, idx) => {
            const pId = `p${idx + 1}`;
            const safe = enforceMaxSafeWindow(tgt?.safeStart || '22:00', tgt?.safeEnd || '04:00', 'start');
            legacyPlayers.push({
              id: pId,
              name: tgt?.name || `Defender ${idx + 1}`,
              safeEnabled: Boolean(tgt?.safeEnabled),
              safeStart: safe.safeStart,
              safeEnd: safe.safeEnd,
            });
            if (tgt) tgt.playerId = pId;
          });
        }
        if (legacyPlayers.length === 0) {
          legacyPlayers.push({
            id: 'p1',
            name: 'Defender 1',
            ...initialSafeTime(),
          });
        }
        const playerIds = new Set(legacyPlayers.map((p) => p.id));

        const cleanTargets: Target[] = (parsed.targets.length ? parsed.targets : fallback.targets).map((tgt, idx) => {
          const safe = enforceMaxSafeWindow(tgt?.safeStart || '22:00', tgt?.safeEnd || '04:00', 'start');
          return {
            id: typeof tgt?.id === 'string' && tgt.id ? tgt.id : `t${idx + 1}`,
            name: typeof tgt?.name === 'string' && tgt.name ? tgt.name : `Village ${idx + 1}`,
            x: Number(tgt?.x) || 0,
            y: Number(tgt?.y) || 0,
            fake: Boolean(tgt?.fake),
            playerId: tgt?.playerId && playerIds.has(tgt.playerId) ? tgt.playerId : legacyPlayers[0].id,
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
          players: legacyPlayers,
        };
      }
    } catch {}
  }

  return fallback;
}

const nextId = (prefix: string) => prefix + Math.random().toString(36).slice(2, 8);

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
  } catch {}
}

const plannerHash = (state: PlannerState) => `tool=operations&p=${encodeCompactPlan(state)}`;

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

function numberFromInput(value: string): number {
  return Number(value) || 0;
}

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
    setLocalText(raw);
    if (/^([01]?\d|2[0-3]):[0-5]\d$/.test(raw)) {
      onChange(raw);
    }
  };

  const handleBlur = () => {
    const match = /^(\d{1,2}):?(\d{0,2})$/.exec(localText.trim());
    if (match) {
      let h = parseInt(match[1], 10);
      let m = parseInt(match[2] || '0', 10);
      if (isNaN(h) || h < 0) h = 0;
      if (h > 23) h = 23;
      if (isNaN(m) || m < 0) m = 0;
      if (m > 59) m = 59;
      const formatted = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
      setLocalText(formatted);
      onChange(formatted);
    } else {
      setLocalText(value);
    }
  };

  return (
    <input
      className={className}
      type="text"
      inputMode="numeric"
      disabled={disabled}
      placeholder={placeholder}
      value={localText}
      onChange={handleChange}
      onBlur={handleBlur}
    />
  );
}

function SafeTimeFields({
  owner,
  label = 'Safe Hours',
  onChange,
}: {
  owner: SafeTimeOwner;
  label?: string;
  onChange: (patch: Partial<SafeTimeOwner>) => void;
}) {
  const duration = safeWindowDurationMinutes(parseClock(owner.safeStart), parseClock(owner.safeEnd));
  const isCapped = duration >= 360;

  const handleStartChange = (val: string) => {
    const updated = enforceMaxSafeWindow(val, owner.safeEnd, 'start');
    onChange(updated);
  };

  const handleEndChange = (val: string) => {
    const updated = enforceMaxSafeWindow(owner.safeStart, val, 'end');
    onChange(updated);
  };

  return (
    <div className={`op-safetime ${owner.safeEnabled ? 'is-enabled' : 'is-disabled'}`}>
      <div className="op-safetime__header">
        <label className="op-toggle">
          <input
            type="checkbox"
            checked={owner.safeEnabled}
            onChange={(e) => onChange({ safeEnabled: e.target.checked })}
          />
          <span className="op-toggle__indicator" aria-hidden="true" />
          <span className="op-toggle__title">{label}</span>
        </label>
        <span className="op-safetime__tag">
          {owner.safeEnabled ? `${owner.safeStart}–${owner.safeEnd} UTC` : 'Disabled'}
        </span>
      </div>

      {owner.safeEnabled && (
        <div className="op-safetime__body">
          <div className="op-safetime__inputs">
            <label className="op-field-time">
              <span className="op-field-time__label">Start</span>
              <Time24Input
                value={owner.safeStart}
                onChange={handleStartChange}
                placeholder="22:00"
              />
            </label>
            <label className="op-field-time">
              <span className="op-field-time__label">End</span>
              <Time24Input
                value={owner.safeEnd}
                onChange={handleEndChange}
                placeholder="04:00"
              />
            </label>
          </div>

          <div className="op-safetime__footer-meta">
            <span className="op-safetime__window-type">
              ({Math.round(duration / 60)}h window{isCapped ? ' · 6h cap' : ''})
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Web Audio Dual-Stage Chimes ───────────────────────────────────────────

function play1MinChime() {
  try {
    const AudioContextClass =
      window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    if (ctx.state === 'suspended') {
      ctx.resume();
    }
    const notes = [
      { freq: 1046.5, time: 0, dur: 0.16 }, // C6
      { freq: 1318.5, time: 0.14, dur: 0.16 }, // E6
      { freq: 1568.0, time: 0.28, dur: 0.35 }, // G6
    ];
    notes.forEach(({ freq, time, dur }) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, ctx.currentTime + time);
      gain.gain.setValueAtTime(0, ctx.currentTime + time);
      gain.gain.linearRampToValueAtTime(0.25, ctx.currentTime + time + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + time + dur);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime + time);
      osc.stop(ctx.currentTime + time + dur + 0.05);
    });
  } catch {}
}

function playCountdownBeep(secondRemaining: number) {
  try {
    const AudioContextClass =
      window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    if (ctx.state === 'suspended') {
      ctx.resume();
    }
    if (secondRemaining > 0) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      gain.gain.setValueAtTime(0, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.3, ctx.currentTime + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.08);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.09);
    } else {
      const tones = [
        { freq: 1318.5, time: 0, dur: 0.12 }, // E6
        { freq: 1760.0, time: 0.08, dur: 0.25 }, // A6
      ];
      tones.forEach(({ freq, time, dur }) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, ctx.currentTime + time);
        gain.gain.setValueAtTime(0, ctx.currentTime + time);
        gain.gain.linearRampToValueAtTime(0.35, ctx.currentTime + time + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + time + dur);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime + time);
        osc.stop(ctx.currentTime + time + dur + 0.05);
      });
    }
  } catch {}
}

function test5sCountdownSequence() {
  let count = 5;
  playCountdownBeep(count);
  const timer = setInterval(() => {
    count -= 1;
    playCountdownBeep(count);
    if (count <= 0) {
      clearInterval(timer);
    }
  }, 1000);
}

function getCountdownInfo(sendDate: Date, now: Date) {
  const diffSec = Math.floor((sendDate.getTime() - now.getTime()) / 1000);
  if (diffSec < 0) {
    const pastSec = Math.abs(diffSec);
    const pastMin = Math.floor(pastSec / 60);
    const pastHrs = Math.floor(pastMin / 60);
    let label = '';
    if (pastHrs > 0) {
      label = `Passed (${pastHrs}h ${pastMin % 60}m ago)`;
    } else if (pastMin > 0) {
      label = `Passed (${pastMin}m ago)`;
    } else {
      label = `Passed (${pastSec}s ago)`;
    }
    return {
      diffSec,
      label,
      tier: 'past' as const,
    };
  }

  const hrs = Math.floor(diffSec / 3600);
  const mins = Math.floor((diffSec % 3600) / 60);
  const secs = diffSec % 60;
  const timeStr = `${hrs > 0 ? String(hrs).padStart(2, '0') + 'h ' : ''}${String(mins).padStart(2, '0')}m ${String(secs).padStart(2, '0')}s`;

  let tier: 'future' | 'urgent' | 'imminent' = 'future';
  if (diffSec <= 60) {
    tier = 'imminent';
  } else if (diffSec <= 900) {
    tier = 'urgent';
  }

  return {
    diffSec,
    label: `in ${timeStr}`,
    tier,
  };
}

/** Renders a single village row under a Defender Player */
function VillageStrip({
  target,
  index,
  player,
  canRemove,
  onPatch,
  onRemove,
}: {
  target: Target;
  index: number;
  player: Player;
  canRemove: boolean;
  onPatch: (patch: Partial<Target>) => void;
  onRemove: () => void;
}) {
  return (
    <article className={`op-strip-card op-strip-card--target ${target.fake ? 'is-fake' : 'is-real'}`}>
      <div className="op-strip-card__identity">
        <span className="op-card__idx">#{index + 1}</span>
        <input
          className="text-input op-card__name"
          aria-label="Village name"
          placeholder="Village name"
          value={target.name}
          onChange={(event) => onPatch({ name: event.target.value })}
        />
        <div className="coord-inline">
          <label className="coord-field">
            <span className="coord-field__tag">X</span>
            <CoordInput
              value={target.x}
              onChange={(x) => onPatch({ x })}
              ariaLabel="Village X coordinate"
            />
          </label>
          <label className="coord-field">
            <span className="coord-field__tag">Y</span>
            <CoordInput
              value={target.y}
              onChange={(y) => onPatch({ y })}
              ariaLabel="Village Y coordinate"
            />
          </label>
        </div>
      </div>

      <div className="op-strip-card__target-meta">
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

      <div className="op-strip-card__safetime">
        <span
          className="op-inherited-tag"
          title={
            player.safeEnabled
              ? `${player.name}: ${player.safeStart}–${player.safeEnd} UTC`
              : `${player.name} has no safe hours`
          }
        >
          ↳ {player.safeEnabled
            ? `Inherits ${player.name} (${player.safeStart}–${player.safeEnd} UTC)`
            : `Inherits ${player.name} (No safe hours)`}
        </span>
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

  const defenderVillages = routes
    .filter((r) => r.attacker.id === route.attacker.id && defenderKey(r.target) === selectedDefenderKey)
    .map((r) => r.target);

  const handleSelectAttacker = (attackerId: string) => {
    const nextRoute = routes.find(
      (r) => r.attacker.id === attackerId && r.target.id === route.target.id
    ) ?? routes.find((r) => r.attacker.id === attackerId);
    if (nextRoute) {
      onSelectRoute(nextRoute.key);
    }
  };

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
      <div className="op-section-head op-schedule__header-wrap">
        <h2 className="panel__title">Daily safe-time schedule · UTC</h2>
        <div className="op-schedule__status-group">
          <span className={'op-status ' + (route.possible ? 'is-possible' : 'is-blocked')}>
            {route.possible ? 'All Checks Clear ✓' : 'Route Blocked ✕'}
          </span>
        </div>
      </div>

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

      <div className="schedule__row schedule__row--events">
        <span className="schedule__label">Movement</span>
        <div className="schedule__track schedule__track--events">
          {route.attackerWindow.enabled && safeSegments(route.attackerWindow).map((seg) => (
            <span
              key={`mov-atk-${seg.start}-${seg.end}`}
              className="schedule__movement-safe schedule__movement-safe--attacker"
              style={{
                '--left': (seg.start / 14.4) + '%',
                '--width': ((seg.end - seg.start) / 14.4) + '%',
              } as CSSProperties}
            />
          ))}
          {route.targetWindow.enabled && safeSegments(route.targetWindow).map((seg) => (
            <span
              key={`mov-def-${seg.start}-${seg.end}`}
              className="schedule__movement-safe schedule__movement-safe--defender"
              style={{
                '--left': (seg.start / 14.4) + '%',
                '--width': ((seg.end - seg.start) / 14.4) + '%',
              } as CSSProperties}
            />
          ))}

          {/* Send Pin: Badge on top, line in middle, head at bottom touching track */}
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

          {/* Land Pin: Head at top touching track, line in middle, badge at bottom */}
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

      {/* Village switcher bar placed at bottom under Movement track */}
      {defenderVillages.length > 1 && (
        <div className="schedule__villages-footer">
          <span className="schedule__villages-label">Villages ({route.targetSafe.sourceName ?? route.target.name}):</span>
          <div className="schedule__village-pills">
            {defenderVillages.map((village) => {
              const isCurrent = village.id === route.target.id;
              const vRoute = routes.find((r) => r.attacker.id === route.attacker.id && r.target.id === village.id);
              return (
                <button
                  key={village.id}
                  type="button"
                  className={`pill pill--tiny ${isCurrent ? 'pill--primary' : ''}`}
                  onClick={() => vRoute && onSelectRoute(vRoute.key)}
                  title={vRoute ? `Send: ${formatClock(minuteOfDay(vRoute.send), true)} UTC` : undefined}
                >
                  {isCurrent ? '● ' : '○ '}{village.name} ({village.x}|{village.y}){village.fake ? ' [Fake]' : ''}
                  {vRoute && <span className="schedule__pill-time"> · {formatClock(minuteOfDay(vRoute.send), true)} UTC</span>}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
}

export function OperationPlanner() {
  const [state, setState] = useState<PlannerState>(() => decodeState());
  const [showLocal, setShowLocal] = useState<boolean>(readShowLocal);
  const [selectedKey, setSelectedKey] = useState('');
  const [filterAttacker, setFilterAttacker] = useState<string>('all');
  const [filterTarget, setFilterTarget] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<'all' | 'possible' | 'blocked'>('all');
  const [filterType, setFilterType] = useState<'all' | 'real' | 'fake'>('all');
  const [alarmEnabled, setAlarmEnabled] = useState<boolean>(true);
  const [alarmAttackerId, setAlarmAttackerId] = useState<string>('all');
  const [now, setNow] = useState<Date>(() => new Date());
  const zoneLabel = useMemo(() => localZoneLabel(), []);

  // Live 1-second ticker for countdown
  useEffect(() => {
    const interval = setInterval(() => {
      setNow(new Date());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Sync state whenever hash or popstate changes
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

    return computed.sort((a, b) => a.send.getTime() - b.send.getTime());
  }, [state.attackers, state.targets, state.players, state.serverSpeed, parsedLanding]);

  const selectedRoute = routes.find((route) => route.key === selectedKey) ?? routes[0];

  const visibleRoutes = useMemo(() => {
    return routes.filter((route) => {
      if (filterAttacker !== 'all' && route.attacker.id !== filterAttacker) return false;
      if (filterTarget !== 'all' && route.target.id !== filterTarget) return false;
      if (filterStatus === 'possible' && !route.possible) return false;
      if (filterStatus === 'blocked' && route.possible) return false;
      if (filterType === 'real' && route.target.fake) return false;
      if (filterType === 'fake' && !route.target.fake) return false;
      return true;
    });
  }, [routes, filterAttacker, filterTarget, filterStatus, filterType]);

  // Audio alert tracking for 1-minute chime & 5-second countdown ticks
  const alerted1MinRef = useRef<Set<string>>(new Set());
  const lastBeepSecRef = useRef<number | null>(null);

  useEffect(() => {
    if (!alarmEnabled) return;
    const nowMs = now.getTime();
    for (const route of routes) {
      // Alarm ONLY for designated "You" army (or all if selected)
      if (alarmAttackerId !== 'all' && route.attacker.id !== alarmAttackerId) {
        continue;
      }
      const diffSec = Math.floor((route.send.getTime() - nowMs) / 1000);
      const alertKey = `${route.key}_${route.send.getTime()}`;

      // Stage 1: 1-minute out chime (between 55s and 60s)
      if (diffSec >= 55 && diffSec <= 60 && !alerted1MinRef.current.has(alertKey)) {
        alerted1MinRef.current.add(alertKey);
        play1MinChime();
      }

      // Stage 2: 5-second final countdown beeps (5, 4, 3, 2, 1, 0)
      if (diffSec >= 0 && diffSec <= 5) {
        if (lastBeepSecRef.current !== diffSec) {
          lastBeepSecRef.current = diffSec;
          playCountdownBeep(diffSec);
        }
      }
    }
  }, [now, routes, alarmEnabled, alarmAttackerId]);

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

  const patchPlayer = (id: string, patch: Partial<Player>) => {
    setState((current) => {
      const updatedPlayers = current.players.map((p) =>
        p.id === id ? { ...p, ...patch } : p);
      const targetPlayer = updatedPlayers.find((p) => p.id === id);
      const updatedTargets = current.targets.map((t) => {
        if (t.playerId === id && targetPlayer) {
          return {
            ...t,
            safeEnabled: targetPlayer.safeEnabled,
            safeStart: targetPlayer.safeStart,
            safeEnd: targetPlayer.safeEnd,
          };
        }
        return t;
      });
      return {
        ...current,
        players: updatedPlayers,
        targets: updatedTargets,
      };
    });
  };

  const addDefender = () => {
    setState((current) => {
      const pId = nextId('p');
      const tId = nextId('t');
      const pNum = current.players.length + 1;
      const newPlayer: Player = {
        id: pId,
        name: 'Defender ' + pNum,
        ...initialSafeTime(),
      };
      const newTarget: Target = {
        id: tId,
        name: 'Village 1',
        x: 0,
        y: 0,
        fake: false,
        playerId: pId,
        ...initialSafeTime(),
      };
      return {
        ...current,
        players: [...current.players, newPlayer],
        targets: [...current.targets, newTarget],
      };
    });
  };

  const removeDefender = (playerId: string) => {
    setState((current) => {
      if (current.players.length <= 1) return current;
      return {
        ...current,
        players: current.players.filter((p) => p.id !== playerId),
        targets: current.targets.filter((t) => t.playerId !== playerId),
      };
    });
  };

  const addVillage = (playerId: string) => {
    setState((current) => {
      const player = current.players.find((p) => p.id === playerId);
      if (!player) return current;
      const existingVillages = current.targets.filter((t) => t.playerId === playerId);
      const newTarget: Target = {
        id: nextId('t'),
        name: `Village ${existingVillages.length + 1}`,
        x: 0,
        y: 0,
        fake: false,
        playerId: playerId,
        safeEnabled: player.safeEnabled,
        safeStart: player.safeStart,
        safeEnd: player.safeEnd,
      };
      return {
        ...current,
        targets: [...current.targets, newTarget],
      };
    });
  };

  const removeVillage = (targetId: string) => {
    setState((current) => {
      const target = current.targets.find((t) => t.id === targetId);
      if (!target) return current;
      const playerVillages = current.targets.filter((t) => t.playerId === target.playerId);
      if (playerVillages.length <= 1) return current;
      return {
        ...current,
        targets: current.targets.filter((t) => t.id !== targetId),
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

      {/* Stacked Full-Width Sections: Attackers on top, Targets below */}
      <div className="op-sections-stacked">
        {/* Attackers Section */}
        <section className="panel op-section-full op-section-full--attackers">
          <div className="op-section-head">
            <div className="op-section-head__title-group">
              <span className="op-section-tag op-section-tag--attacker">Attackers</span>
              <h2 className="panel__title">Attacking Armies ({state.attackers.length})</h2>
              <p className="op-section-copy">Configure slowest troop, speed modifiers, coordinates, and safe hours.</p>
            </div>
            <button type="button" className="pill pill--tiny pill--primary" onClick={addAttacker}>
              + Add Attacker
            </button>
          </div>

          <div className="op-strip-list">
            {state.attackers.map((attacker, index) => (
              <article className="op-strip-card op-strip-card--attacker" key={attacker.id}>
                {/* Top Strip: Identity + Troop + Modifiers + Remove */}
                <div className="op-strip-card__top">
                  <div className="op-strip-card__identity">
                    <span className="op-card__idx">#{index + 1}</span>
                    <input
                      className="text-input op-card__name"
                      aria-label="Attacker name"
                      placeholder="Player / Village"
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
                  </div>

                  <div className="op-strip-card__military">
                    <div className="op-strip-card__unit">
                      <UnitGridPicker
                        unitRef={attacker.unitRef}
                        onChange={(newRef) => patchAttacker(attacker.id, { unitRef: newRef })}
                      />
                    </div>

                    <div className="op-strip-card__modifiers">
                      <label className="op-modifier-inline" title="Speed Artifact">
                        <span className="op-modifier-inline__tag">Artifact</span>
                        <select
                          className="select op-select-solid-sm"
                          value={attacker.artifactMultiplier}
                          onChange={(event) => patchAttacker(attacker.id, {
                            artifactMultiplier: Number(event.target.value) as Attacker['artifactMultiplier'],
                          })}
                        >
                          <option value={1}>1.0×</option>
                          <option value={1.5}>1.5×</option>
                          <option value={2}>2.0×</option>
                        </select>
                      </label>

                      <label className="op-modifier-inline" title="Bannerfield Level (+20% speed per level beyond 20 fields)">
                        <span className="op-modifier-inline__tag">Bannerfield</span>
                        <input
                          className="text-input op-input-solid-sm"
                          type="number"
                          min={0}
                          max={20}
                          value={attacker.bannerfieldLevel}
                          onChange={(event) => patchAttacker(attacker.id, {
                            bannerfieldLevel: Math.min(20, Math.max(0, numberFromInput(event.target.value))),
                          })}
                        />
                        <span className="bannerfield-bonus-tag-sm">+{attacker.bannerfieldLevel * 20}%</span>
                      </label>
                    </div>
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

                {/* Bottom Strip: Dedicated Safe Hours */}
                <div className="op-strip-card__bottom">
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

        {/* Defenders Section */}
        <section className="panel op-section-full op-section-full--defenders">
          <div className="op-section-head">
            <div className="op-section-head__title-group">
              <span className="op-section-tag op-section-tag--target">Defenders</span>
              <h2 className="panel__title">Target Defenders ({state.players.length})</h2>
              <p className="op-section-copy">
                Each defender account defines its safe hours once. All villages under an account inherit its safe hours.
              </p>
            </div>
            <div className="op-section-head__actions">
              <button type="button" className="pill pill--tiny pill--primary" onClick={addDefender}>
                + Add Defender
              </button>
            </div>
          </div>

          <div className="op-defenders-list">
            {state.players.map((player, pIdx) => {
              const playerVillages = state.targets.filter((t) => t.playerId === player.id);
              return (
                <div className="op-target-group is-player" key={player.id}>
                  {/* Defender Player Header */}
                  <div className="op-target-group__head">
                    <div className="op-target-group__player-title">
                      <span className="op-target-group__icon">👤</span>
                      <span className="op-card__idx">#{pIdx + 1}</span>
                      <input
                        className="text-input op-player__name"
                        aria-label="Defender account name"
                        value={player.name}
                        onChange={(event) => patchPlayer(player.id, { name: event.target.value })}
                        placeholder="Defender name"
                      />
                      <span className="op-target-group__meta">
                        {playerVillages.length} {playerVillages.length === 1 ? 'village' : 'villages'}
                      </span>
                    </div>

                    <div className="op-target-group__player-safetime">
                      <SafeTimeFields
                        owner={player}
                        label={`${player.name} Safe Hours`}
                        onChange={(patch) => patchPlayer(player.id, patch)}
                      />
                    </div>

                    <div className="op-target-group__actions">
                      <button
                        type="button"
                        className="pill pill--tiny"
                        onClick={() => addVillage(player.id)}
                        title={`Add another village targeted on ${player.name}`}
                      >
                        + Add Village
                      </button>
                      <button
                        type="button"
                        className="op-remove"
                        aria-label={'Remove ' + player.name}
                        disabled={state.players.length <= 1}
                        onClick={() => removeDefender(player.id)}
                        title={state.players.length <= 1 ? 'At least one defender account is required' : 'Remove defender and all attached villages'}
                      >
                        ×
                      </button>
                    </div>
                  </div>

                  {/* Villages List under this Defender */}
                  <div className="op-strip-list">
                    {playerVillages.map((target, vIdx) => (
                      <VillageStrip
                        key={target.id}
                        target={target}
                        index={vIdx}
                        player={player}
                        canRemove={playerVillages.length > 1}
                        onPatch={(patch) => patchTarget(target.id, patch)}
                        onRemove={() => removeVillage(target.id)}
                      />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </div>

      {/* Results Section */}
      <section className="panel op-results">
        <div className="op-section-head op-results__head-wrap">
          <div>
            <h2 className="panel__title">Route Plan (Sorted by Send Time)</h2>
            <p className="op-section-copy">
              Click anywhere on a row to inspect its schedule. {routes.filter((route) => route.possible).length} of {routes.length} routes clear all safetime checks
              {' · '}{routes.filter((route) => !route.target.fake).length} real, {routes.filter((route) => route.target.fake).length} fake.
            </p>
          </div>

          {/* Alarm Control Button Toolbar */}
          <div className="op-alarm-toolbar">
            <button
              type="button"
              className={`pill pill--alarm ${alarmEnabled ? 'is-enabled' : 'is-muted'}`}
              onClick={() => setAlarmEnabled((prev) => !prev)}
              title={alarmEnabled ? 'Audio alert enabled (1m chime & 5s countdown beeps). Click to mute.' : 'Sound alert is muted. Click to enable.'}
            >
              {alarmEnabled ? '🔔 Alarm: ON' : '🔕 Alarm: Muted'}
            </button>
            <label className="op-alarm-select-label" title="Choose which attacker army triggers launch sound alarms (independent of viewing filters)">
              <span className="op-alarm-select-tag">Army:</span>
              <select
                className="select op-select-solid-sm op-alarm-select"
                value={alarmAttackerId}
                onChange={(e) => setAlarmAttackerId(e.target.value)}
                aria-label="Select attacker army for audio alarm"
              >
                <option value="all">All Armies</option>
                {state.attackers.map((atk) => (
                  <option key={atk.id} value={atk.id}>
                    {atk.name} (You)
                  </option>
                ))}
              </select>
            </label>
            <button
              type="button"
              className="pill pill--tiny"
              onClick={play1MinChime}
              title="Test 1-minute melodic warning chime"
            >
              Test 1m
            </button>
            <button
              type="button"
              className="pill pill--tiny"
              onClick={test5sCountdownSequence}
              title="Test 5-second countdown beeps (5..4..3..2..1..0)"
            >
              ⏱️ Test 5s
            </button>
          </div>
        </div>

        {/* Route Filter Toolbar */}
        <div className="op-filter-toolbar">
          <div className="op-filter-group">
            <label className="op-filter-label">
              <span>Attacker:</span>
              <select
                className="select op-select-filter"
                value={filterAttacker}
                onChange={(e) => setFilterAttacker(e.target.value)}
                aria-label="Filter routes by attacker"
              >
                <option value="all">All Attackers ({state.attackers.length})</option>
                {state.attackers.map((atk) => {
                  const count = routes.filter((r) => r.attacker.id === atk.id).length;
                  return (
                    <option key={atk.id} value={atk.id}>
                      {atk.name} ({count} routes)
                    </option>
                  );
                })}
              </select>
            </label>

            <label className="op-filter-label">
              <span>Target:</span>
              <select
                className="select op-select-filter"
                value={filterTarget}
                onChange={(e) => setFilterTarget(e.target.value)}
                aria-label="Filter routes by target"
              >
                <option value="all">All Targets ({state.targets.length})</option>
                {state.targets.map((tgt) => {
                  const count = routes.filter((r) => r.target.id === tgt.id).length;
                  return (
                    <option key={tgt.id} value={tgt.id}>
                      {tgt.name} ({count} routes)
                    </option>
                  );
                })}
              </select>
            </label>
          </div>

          <div className="op-filter-pills-group">
            <div className="op-filter-pills" role="group" aria-label="Filter by route viability">
              <button
                type="button"
                className={`pill pill--tiny ${filterStatus === 'all' ? 'is-active' : ''}`}
                onClick={() => setFilterStatus('all')}
              >
                All Status ({routes.length})
              </button>
              <button
                type="button"
                className={`pill pill--tiny pill--clear-filter ${filterStatus === 'possible' ? 'is-active' : ''}`}
                onClick={() => setFilterStatus('possible')}
              >
                Clear ({routes.filter((r) => r.possible).length})
              </button>
              <button
                type="button"
                className={`pill pill--tiny pill--blocked-filter ${filterStatus === 'blocked' ? 'is-active' : ''}`}
                onClick={() => setFilterStatus('blocked')}
              >
                Blocked ({routes.filter((r) => !r.possible).length})
              </button>
            </div>

            <div className="op-filter-pills" role="group" aria-label="Filter by attack type">
              <button
                type="button"
                className={`pill pill--tiny ${filterType === 'all' ? 'is-active' : ''}`}
                onClick={() => setFilterType('all')}
              >
                All Types
              </button>
              <button
                type="button"
                className={`pill pill--tiny ${filterType === 'real' ? 'is-active' : ''}`}
                onClick={() => setFilterType('real')}
              >
                Real ({routes.filter((r) => !r.target.fake).length})
              </button>
              <button
                type="button"
                className={`pill pill--tiny ${filterType === 'fake' ? 'is-active' : ''}`}
                onClick={() => setFilterType('fake')}
              >
                Fake ({routes.filter((r) => r.target.fake).length})
              </button>
            </div>
          </div>
        </div>

        <div className="op-routes">
          <table>
            <thead>
              <tr>
                <th>Route</th>
                <th>Distance</th>
                <th>Travel Duration</th>
                <th>Launch In</th>
                <th>Send Time (UTC)</th>
                <th>Land Time (UTC)</th>
                <th>
                  <SafetimeHeaderTooltip />
                </th>
              </tr>
            </thead>
            <tbody>
              {visibleRoutes.length === 0 ? (
                <tr>
                  <td colSpan={7} className="op-routes-empty">
                    No routes match the selected filters.
                  </td>
                </tr>
              ) : (
                visibleRoutes.map((route) => {
                  const countdown = getCountdownInfo(route.send, now);
                  return (
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
                      <td data-label="Launch In">
                        <span className={`op-countdown-tag op-countdown-tag--${countdown.tier}`}>
                          {countdown.label}
                        </span>
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
                  );
                })
              )}
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

