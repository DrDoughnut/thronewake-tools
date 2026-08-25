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
  serverSpeedMultiplier,
  splitUtcDateAndTime,
  toUtcDatetimeInput,
  travelHours,
  migrateToMasterRoster,
  importPlanIntoMasterRoster,
  type ImportMode,
  type MasterRoster,
  type OperationPlan,
  type ResolvedSafeTime,
  type SafeChecks,
  type SafeWindow,
  type TeamRoomData,
} from '../engine/operations';
import { type RoomCryptoSession } from '../engine/cryptoSync';
import { TeamRoomBar } from '../components/TeamRoomBar';
import { OperationTabs } from '../components/OperationTabs';
import { ImportPlanModal } from '../components/ImportPlanModal';
import {
  AllianceArmiesModal,
  TargetDatabaseModal,
  AttackerCard,
  PlayerGroupCard,
  Time24Input,
} from '../components/RosterModals';
import { OperationParticipantPicker } from '../components/OperationParticipantPicker';

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
  active?: boolean;
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
  active?: boolean;
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

const defaultCatapultUnit =
  playableFactions[0].units.find((u) => u.role === 'siege') || playableFactions[0].units[0];
const defaultUnitRef = `${playableFactions[0].key}/${defaultCatapultUnit.key}`;

const initialSafeTime = (): SafeTimeOwner => ({
  safeEnabled: false,
  safeStart: '22:00',
  safeEnd: '04:00',
});

const defaultState: PlannerState = {
  landing: '2026-08-16T19:00',
  serverSpeed: 3,
  attackers: [
    {
      id: 'a1',
      name: 'Attacker 1',
      x: 0,
      y: 0,
      unitRef: defaultUnitRef,
      artifactMultiplier: 1,
      bannerfieldLevel: 0,
      ...initialSafeTime(),
    },
  ],
  targets: [
    {
      id: 't1',
      name: 'Village 1',
      x: 10,
      y: 10,
      fake: false,
      playerId: 'p1',
      ...initialSafeTime(),
    },
  ],
  players: [
    {
      id: 'p1',
      name: 'Defender 1',
      ...initialSafeTime(),
    },
  ],
};

export function decodeState(rawHash?: string): PlannerState {
  const fallback = defaultState;
  const hash = rawHash !== undefined
    ? rawHash.replace(/^#/, '')
    : window.location.hash.replace(/^#/, '');

  if (!hash) return fallback;

  const params = new URLSearchParams(hash);
  const compactParam = params.get('p');
  let rawPlan = params.get('plan');

  if (compactParam) {
    const compactParsed = decodeCompactPlan(compactParam);
    if (compactParsed) {
      const cleanAttackers: Attacker[] = (compactParsed.attackers.length ? compactParsed.attackers : fallback.attackers).map((atk, idx) => ({
        id: atk.id || `a${idx + 1}`,
        name: atk.name || `Attacker ${idx + 1}`,
        x: Number(atk.x) || 0,
        y: Number(atk.y) || 0,
        unitRef: (atk.unitRef as UnitRef) || defaultUnitRef,
        artifactMultiplier: (atk.artifactMultiplier === 1.5 || atk.artifactMultiplier === 2) ? atk.artifactMultiplier : 1,
        bannerfieldLevel: Math.min(20, Math.max(0, Number(atk.bannerfieldLevel) || 0)),
        safeEnabled: Boolean(atk.safeEnabled),
        safeStart: atk.safeStart || '22:00',
        safeEnd: atk.safeEnd || '04:00',
      }));

      const cleanPlayers: Player[] = (compactParsed.players.length ? compactParsed.players : []).map((player, idx) => ({
        id: player.id || `p${idx + 1}`,
        name: player.name || `Player ${idx + 1}`,
        safeEnabled: Boolean(player.safeEnabled),
        safeStart: player.safeStart || '22:00',
        safeEnd: player.safeEnd || '04:00',
      }));

      if (cleanPlayers.length === 0 && compactParsed.targets.length > 0) {
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
          name: 'Player 1',
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
        playerId: tgt.playerId && playerIds.has(tgt.playerId) ? tgt.playerId : cleanPlayers[0]?.id || 'p1',
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
      { freq: 1046.5, time: 0, dur: 0.18 }, // C6
      { freq: 1318.5, time: 0.15, dur: 0.18 }, // E6
      { freq: 1568.0, time: 0.30, dur: 0.40 }, // G6
    ];
    notes.forEach(({ freq, time, dur }) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, ctx.currentTime + time);
      gain.gain.setValueAtTime(0, ctx.currentTime + time);
      gain.gain.linearRampToValueAtTime(0.85, ctx.currentTime + time + 0.015);
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
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(987.77, ctx.currentTime);
      gain.gain.setValueAtTime(0, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.85, ctx.currentTime + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.10);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.11);
    } else {
      const tones = [
        { freq: 1318.5, time: 0, dur: 0.14 }, // E6
        { freq: 1760.0, time: 0.09, dur: 0.32 }, // A6
      ];
      tones.forEach(({ freq, time, dur }) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, ctx.currentTime + time);
        gain.gain.setValueAtTime(0, ctx.currentTime + time);
        gain.gain.linearRampToValueAtTime(0.90, ctx.currentTime + time + 0.015);
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

function SafetimeHeaderTooltip() {
  const [show, setShow] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const triggerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!show || !triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const popoverWidth = 320;
    let left = rect.left + rect.width / 2 - popoverWidth / 2;
    if (left + popoverWidth > window.innerWidth - 16) {
      left = window.innerWidth - popoverWidth - 16;
    }
    if (left < 16) left = 16;
    setPos({ top: rect.bottom + 6, left });
  }, [show]);

  return (
    <div
      ref={triggerRef}
      className="op-safetime-th"
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
      onFocus={() => setShow(true)}
      onBlur={() => setShow(false)}
      tabIndex={0}
      role="button"
      aria-label="Safetime checks explanation. Hover for details."
      onClick={(e) => e.stopPropagation()}
    >
      <span>Safetime (A/B/C)</span>
      <span className="op-help-icon" aria-hidden="true">?</span>

      {show &&
        pos &&
        createPortal(
          <div
            className="safetime-popover safetime-popover--th"
            style={{ top: pos.top, left: pos.left }}
            role="tooltip"
          >
            <div className="safetime-popover__header">
              <span className="safetime-popover__title">Safetime Check Legend</span>
            </div>
            <div className="safetime-popover__list">
              <div className="safetime-popover__item">
                <div className="safetime-popover__item-top">
                  <span className="op-check-dot is-clear">A</span>
                  <strong>Land / Defender Safe Time</strong>
                </div>
                <p className="safetime-popover__desc">
                  Asserts arrival time does not land during the defender&apos;s protected safe hours.
                </p>
              </div>
              <div className="safetime-popover__item">
                <div className="safetime-popover__item-top">
                  <span className="op-check-dot is-clear">B</span>
                  <strong>Send / Attacker Safe Time</strong>
                </div>
                <p className="safetime-popover__desc">
                  Asserts departure time does not occur during your own attacking safe hours.
                </p>
              </div>
              <div className="safetime-popover__item">
                <div className="safetime-popover__item-top">
                  <span className="op-check-dot is-clear">C</span>
                  <strong>Send / Defender Safe Time</strong>
                </div>
                <p className="safetime-popover__desc">
                  Asserts departure time does not occur while the defender is in safe time.
                </p>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
}

function SafetimeCheckCell({
  route,
  showLocal,
}: {
  route: PlannedRoute;
  showLocal: boolean;
}) {
  const [show, setShow] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const triggerRef = useRef<HTMLDivElement>(null);

  const defenderWindowText = route.targetSafe.safeEnabled
    ? `${route.targetSafe.sourceName ?? route.target.name} safe time: ${route.targetSafe.safeStart}–${route.targetSafe.safeEnd} UTC`
    : `${route.targetSafe.sourceName ?? route.target.name} has no safe time`;

  const stamp = (d: Date, seconds = false) => {
    const utc = `${formatDateTime(d, seconds)} UTC`;
    return showLocal ? `${utc} (${formatLocalDateTime(d, seconds)} local)` : utc;
  };

  useEffect(() => {
    if (!show || !triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const popoverWidth = 330;
    let left = rect.left + rect.width / 2 - popoverWidth / 2;
    if (left + popoverWidth > window.innerWidth - 16) {
      left = window.innerWidth - popoverWidth - 16;
    }
    if (left < 16) left = 16;
    setPos({ top: rect.bottom + 6, left });
  }, [show]);

  const checks = [
    {
      code: 'A',
      title: 'Land / Defender Safe Time',
      blocked: route.checks.landDefender,
      time: `Land: ${stamp(route.land)}`,
      windowText: defenderWindowText,
    },
    {
      code: 'B',
      title: 'Send / Attacker Safe Time',
      blocked: route.checks.sendAttacker,
      time: `Send: ${stamp(route.send, true)}`,
      windowText: route.attacker.safeEnabled
        ? `${route.attacker.name} safe time: ${route.attacker.safeStart}–${route.attacker.safeEnd} UTC`
        : `${route.attacker.name} has no safe time`,
    },
    {
      code: 'C',
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

            <div className="safetime-popover__list">
              {checks.map((c) => (
                <div
                  key={c.code}
                  className={`safetime-popover__item ${c.blocked ? 'is-blocked' : 'is-clear'}`}
                >
                  <div className="safetime-popover__item-top">
                    <span className={`op-check-dot ${c.blocked ? 'is-blocked' : 'is-clear'}`}>
                      {c.code}
                    </span>
                    <strong>{c.title}</strong>
                    <span className="safetime-popover__badge">
                      {c.blocked ? 'BLOCKED' : 'CLEAR'}
                    </span>
                  </div>
                  <div className="safetime-popover__meta">
                    <span>{c.time}</span>
                    <span className="safetime-popover__window">{c.windowText}</span>
                  </div>
                </div>
              ))}
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
  isSelected,
  type,
  onClick,
}: {
  label: string;
  window: SafeWindow;
  isSelected?: boolean;
  type: 'attacker' | 'defender';
  onClick?: () => void;
}) {
  const segments = safeSegments(window);
  const isInteractive = Boolean(onClick);

  return (
    <div
      className={
        `schedule__row schedule__row--${type} ` +
        (isSelected ? 'is-selected-lane ' : '') +
        (isInteractive ? 'schedule__row--interactive' : '')
      }
      onClick={onClick}
      role={isInteractive ? 'button' : undefined}
      tabIndex={isInteractive ? 0 : undefined}
      onKeyDown={
        isInteractive
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onClick?.();
              }
            }
          : undefined
      }
      title={isInteractive ? `Click to inspect routes for ${label}` : undefined}
    >
      <span className="schedule__label" title={label}>
        {isSelected && (
          <span
            className={`schedule__active-indicator schedule__active-indicator--${type}`}
            aria-hidden="true"
          >
            ●
          </span>
        )}
        {label}
      </span>
      <div className="schedule__track">
        {segments.map((seg) => (
          <span
            key={`${seg.start}-${seg.end}`}
            className={`schedule__safe schedule__safe--${type}`}
            style={{
              '--left': (seg.start / 14.4) + '%',
              '--width': ((seg.end - seg.start) / 14.4) + '%',
            } as CSSProperties}
          />
        ))}
      </div>
    </div>
  );
}

function ScheduleTimeline({
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
        <div className="op-schedule__header-left">
          <h2 className="panel__title">Daily safe-time schedule · UTC</h2>
          <div className="op-schedule__journey-readout">
            <span className="op-schedule__journey-label">Selected Route:</span>
            <strong className="op-route-attacker">{route.attacker.name}</strong>
            <span className="op-route-arrow" aria-hidden="true">➔</span>
            <strong className="op-route-target">
              {route.targetSafe.sourceName && route.targetSafe.sourceName !== route.target.name
                ? `${route.targetSafe.sourceName}: ${route.target.name}`
                : route.target.name}
            </strong>
            <a
              href={`https://www.thronewake.com/map/tile/${route.target.x}/${route.target.y}?center=true`}
              target="_blank"
              rel="noopener noreferrer"
              className="op-map-pin-link"
              title={`Open in-game map centered on (${route.target.x}|${route.target.y})`}
              onClick={(e) => e.stopPropagation()}
            >
              📍 ({route.target.x}|{route.target.y})
            </a>
            <span className={`op-hit-tag ${route.target.fake ? 'is-fake' : 'is-real'}`}>
              {route.target.fake ? 'Fake' : 'Real'}
            </span>
          </div>
          <div className="op-schedule__times-row">
            <span>
              Send: <strong>{formatClock(minuteOfDay(route.send), true)} UTC</strong>
              {showLocal && ` (${formatLocalClock(route.send, true)} local)`}
            </span>
            <span className="op-schedule__sep">·</span>
            <span>
              Land: <strong>{formatClock(minuteOfDay(route.land))} UTC</strong>
              {showLocal && ` (${formatLocalClock(route.land)} local)`}
            </span>
            <span className="op-schedule__sep">·</span>
            <span>Travel: <strong>{formatDuration(route.travel)}</strong></span>
          </div>
        </div>
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

      {/* Village switcher bar */}
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

// ── Main OperationPlanner Component ─────────────────────────────────────────

export function OperationPlanner({
  isV2Unlocked,
  onExitV2,
}: {
  isV2Unlocked?: boolean;
  onExitV2?: () => void;
} = {}) {
  const isV2Active = isV2Unlocked ?? (() => {
    try {
      return localStorage.getItem('thronewake.v2.unlocked') === '1';
    } catch {
      return false;
    }
  })();

  const initialDecoded = useMemo(() => decodeState(), []);

  // Master Roster (Alliance Armies + Defender Database)
  const [roster, setRoster] = useState<MasterRoster>(() => ({
    attackers: initialDecoded.attackers,
    players: initialDecoded.players,
    targets: initialDecoded.targets,
  }));

  // Multi-Operation Plans
  const [operations, setOperations] = useState<OperationPlan[]>(() => [
    {
      id: 'op1',
      name: 'Operation 1',
      landing: initialDecoded.landing,
      serverSpeed: initialDecoded.serverSpeed,
      assignedAttackerIds: initialDecoded.attackers.map((a) => a.id),
      assignedTargetIds: initialDecoded.targets.map((t) => t.id),
      fakeTargetIds: initialDecoded.targets.filter((t) => t.fake).map((t) => t.id),
      createdAt: Date.now(),
      updatedAt: Date.now(),
    },
  ]);

  const [activeOpId, setActiveOpId] = useState<string | null>(() => {
    if (isV2Unlocked) return null;
    return 'op1';
  });

  // Modals state
  const [isArmiesModalOpen, setIsArmiesModalOpen] = useState(false);
  const [isTargetsModalOpen, setIsTargetsModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);

  const [showLocal, setShowLocal] = useState<boolean>(readShowLocal);
  const [selectedKey, setSelectedKey] = useState('');
  const [workspaceView, setWorkspaceView] = useState<'setup' | 'routes'>('setup');
  const [filterAttacker, setFilterAttacker] = useState<string>('all');
  const [filterTarget, setFilterTarget] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<'all' | 'possible' | 'blocked'>('all');
  const [filterType, setFilterType] = useState<'all' | 'real' | 'fake'>('all');
  const [alarmEnabled, setAlarmEnabled] = useState<boolean>(true);
  const [alarmAttackerId, setAlarmAttackerId] = useState<string>('all');
  const [now, setNow] = useState<Date>(() => new Date());
  const zoneLabel = useMemo(() => localZoneLabel(), []);

  const [roomSession, setRoomSession] = useState<RoomCryptoSession | null>(null);

  // Active operation resolution
  const activeOp = useMemo(() => {
    if (activeOpId) {
      const found = operations.find((o) => o.id === activeOpId);
      if (found) return found;
    }
    return operations[0] || {
      id: 'op1',
      name: 'Operation 1',
      landing: '2026-08-16T19:00',
      serverSpeed: 3,
      assignedAttackerIds: roster.attackers.map((a) => a.id),
      assignedTargetIds: roster.targets.map((t) => t.id),
      fakeTargetIds: [],
    };
  }, [operations, activeOpId, roster]);

  // Live 1-second ticker for countdown
  useEffect(() => {
    const interval = setInterval(() => {
      setNow(new Date());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Sync state on hashchange
  useEffect(() => {
    const handleHashChange = () => {
      if (!roomSession) {
        const decoded = decodeState();
        setRoster({
          attackers: decoded.attackers,
          players: decoded.players,
          targets: decoded.targets,
        });
        setOperations((prev) =>
          prev.map((o) =>
            o.id === activeOpId
              ? {
                  ...o,
                  landing: decoded.landing,
                  serverSpeed: decoded.serverSpeed,
                  assignedAttackerIds: decoded.attackers.map((a) => a.id),
                  assignedTargetIds: decoded.targets.map((t) => t.id),
                  fakeTargetIds: decoded.targets.filter((t) => t.fake).map((t) => t.id),
                }
              : o,
          ),
        );
      }
    };
    window.addEventListener('hashchange', handleHashChange);
    window.addEventListener('popstate', handleHashChange);
    return () => {
      window.removeEventListener('hashchange', handleHashChange);
      window.removeEventListener('popstate', handleHashChange);
    };
  }, [roomSession, activeOpId]);

  const [copied, setCopied] = useState(false);

  // Active marching armies & target villages for current operation
  const marchingAttackers = useMemo(() => {
    if (!isV2Active) return roster.attackers;
    const assigned = activeOp.assignedAttackerIds || [];
    return roster.attackers.filter((a) => assigned.includes(a.id));
  }, [isV2Active, roster.attackers, activeOp.assignedAttackerIds]);

  const activeTargets = useMemo(() => {
    if (!isV2Active) return roster.targets;
    const assigned = activeOp.assignedTargetIds || [];
    const fakeTargetIds = activeOp.fakeTargetIds || [];
    return roster.targets
      .filter((target) => assigned.includes(target.id))
      .map((target) => ({ ...target, fake: fakeTargetIds.includes(target.id) }));
  }, [isV2Active, roster.targets, activeOp.assignedTargetIds, activeOp.fakeTargetIds]);

  const copyShareLink = async () => {
    let fullUrl = '';
    let hash = '';

    if (isV2Active && roomSession) {
      hash = `room=${encodeURIComponent(roomSession.roomName)}`;
      fullUrl = `${window.location.origin}${window.location.pathname}#${hash}`;
    } else {
      const currentPlannerState: PlannerState = {
        landing: activeOp.landing,
        serverSpeed: activeOp.serverSpeed,
        attackers: marchingAttackers,
        targets: activeTargets,
        players: roster.players,
      };
      hash = plannerHash(currentPlannerState);
      fullUrl = `${window.location.origin}${window.location.pathname}#${hash}`;
    }

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
    if (isV2Active && roomSession) {
      window.history.replaceState(null, '', `${window.location.pathname}#room=${encodeURIComponent(roomSession.roomName)}`);
    } else if (!isV2Active) {
      const currentPlannerState: PlannerState = {
        landing: activeOp.landing,
        serverSpeed: activeOp.serverSpeed,
        attackers: marchingAttackers,
        targets: activeTargets,
        players: roster.players,
      };
      window.history.replaceState(null, '', `${window.location.pathname}#${plannerHash(currentPlannerState)}`);
    }
  }, [isV2Active, roomSession, activeOp, marchingAttackers, activeTargets, roster.players]);

  useEffect(() => {
    writeShowLocal(showLocal);
  }, [showLocal]);

  const [lastSavedSnapshot, setLastSavedSnapshot] = useState<string>('');

  const currentSnapshot = useMemo(() => {
    return JSON.stringify({ roster, operations });
  }, [roster, operations]);

  const hasUnsavedChanges = useMemo(() => {
    if (!roomSession || !lastSavedSnapshot) return false;
    return currentSnapshot !== lastSavedSnapshot;
  }, [roomSession, lastSavedSnapshot, currentSnapshot]);

  // Team Room Handlers
  const handleRoomDataLoaded = (data: TeamRoomData, session: RoomCryptoSession) => {
    const migrated = migrateToMasterRoster(data);
    setRoomSession(session);
    setRoster(migrated.roster);
    setOperations(migrated.operations);
    setActiveOpId((prev) => {
      if (prev && migrated.operations.some((o) => o.id === prev)) {
        return prev;
      }
      return null;
    });
    setLastSavedSnapshot(
      JSON.stringify({
        roster: migrated.roster,
        operations: migrated.operations,
      })
    );
  };

  const handleRoomDisconnected = () => {
    setRoomSession(null);
    setActiveOpId(null);
    setLastSavedSnapshot('');
    try {
      localStorage.removeItem('thronewake.v2.unlocked');
      localStorage.removeItem('thronewake.teamroom.session');
    } catch {}
    onExitV2?.();
  };

  const handleSaveRequested = async (): Promise<TeamRoomData> => {
    const payload: TeamRoomData = {
      version: 2,
      roomName: roomSession?.roomName || 'unnamed-room',
      activeOpId,
      roster,
      operations,
      updatedAt: Date.now(),
    };
    setLastSavedSnapshot(JSON.stringify({ roster, operations }));
    return payload;
  };

  // Operation Tab Handlers
  const handleSelectOp = (opId: string) => {
    setActiveOpId(opId || null);
    if (opId) setWorkspaceView('setup');
  };

  const handleCreateOp = (name: string, icon?: string) => {
    const newId = 'op_' + Date.now();
    const newOp: OperationPlan = {
      id: newId,
      name,
      icon: icon || '🎯',
      landing: activeOp.landing,
      serverSpeed: activeOp.serverSpeed,
      assignedAttackerIds: roster.attackers.map((a) => a.id),
      assignedTargetIds: roster.targets.map((t) => t.id),
      fakeTargetIds: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    setOperations((prev) => [...prev, newOp]);
    setActiveOpId(newId);
    setWorkspaceView('setup');
  };

  const handleDuplicateOp = (opId: string) => {
    const source = operations.find((o) => o.id === opId) || activeOp;
    const newId = 'op_' + Date.now();
    const newOp: OperationPlan = {
      ...source,
      id: newId,
      name: `${source.name} (Copy)`,
      assignedAttackerIds: [...source.assignedAttackerIds],
      assignedTargetIds: [...source.assignedTargetIds],
      fakeTargetIds: [...(source.fakeTargetIds || [])],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    setOperations((prev) => [...prev, newOp]);
    setActiveOpId(newId);
    setWorkspaceView('setup');
  };

  const handleRenameOp = (opId: string, newName: string) => {
    setOperations((prev) =>
      prev.map((o) => (o.id === opId ? { ...o, name: newName, updatedAt: Date.now() } : o)),
    );
  };

  const handleDeleteOp = (opId: string) => {
    if (operations.length <= 1) return;
    const remaining = operations.filter((o) => o.id !== opId);
    setOperations(remaining);
    if (activeOpId === opId) {
      setActiveOpId(null);
    }
  };

  const handleImportPlan = (
    imported: PlannerState,
    mode: ImportMode,
    customWaveName?: string,
  ) => {
    const result = importPlanIntoMasterRoster(roster, operations, imported, mode, customWaveName);
    setRoster(result.roster);
    setOperations(result.operations);
    if (result.activeOpId !== null) {
      setActiveOpId(result.activeOpId);
      setWorkspaceView('setup');
    }
  };

  // Operation March Assignment Toggles
  const handleToggleAttacker = (attackerId: string) => {
    const currentOpId = activeOpId || activeOp.id;
    setOperations((prev) =>
      prev.map((o) => {
        if (o.id !== currentOpId) return o;
        const current = o.assignedAttackerIds || [];
        const next = current.includes(attackerId)
          ? current.filter((id) => id !== attackerId)
          : [...current, attackerId];
        return { ...o, assignedAttackerIds: next, updatedAt: Date.now() };
      }),
    );
  };

  const handleToggleTarget = (targetId: string) => {
    const currentOpId = activeOpId || activeOp.id;
    setOperations((prev) =>
      prev.map((operation) => {
        if (operation.id !== currentOpId) return operation;
        const assignedTargetIds = operation.assignedTargetIds || [];
        const fakeTargetIds = operation.fakeTargetIds || [];
        const nextAssigned = assignedTargetIds.includes(targetId)
          ? assignedTargetIds.filter((id) => id !== targetId)
          : [...assignedTargetIds, targetId];
        return {
          ...operation,
          assignedTargetIds: nextAssigned,
          fakeTargetIds: nextAssigned.includes(targetId)
            ? fakeTargetIds
            : fakeTargetIds.filter((id) => id !== targetId),
          updatedAt: Date.now(),
        };
      }),
    );
  };

  const handleToggleTargetFake = (targetId: string) => {
    const currentOpId = activeOpId || activeOp.id;
    setOperations((prev) =>
      prev.map((operation) => {
        if (operation.id !== currentOpId) return operation;
        const current = operation.fakeTargetIds || [];
        const fakeTargetIds = current.includes(targetId)
          ? current.filter((id) => id !== targetId)
          : [...current, targetId];
        return { ...operation, fakeTargetIds, updatedAt: Date.now() };
      }),
    );
  };

  const handleSelectAllAttackers = () => {
    const currentOpId = activeOpId || activeOp.id;
    setOperations((prev) =>
      prev.map((o) =>
        o.id === currentOpId
          ? { ...o, assignedAttackerIds: roster.attackers.map((a) => a.id), updatedAt: Date.now() }
          : o,
      ),
    );
  };

  const handleDeselectAllAttackers = () => {
    const currentOpId = activeOpId || activeOp.id;
    setOperations((prev) =>
      prev.map((o) =>
        o.id === currentOpId ? { ...o, assignedAttackerIds: [], updatedAt: Date.now() } : o,
      ),
    );
  };

  const handleSelectAllTargets = () => {
    const currentOpId = activeOpId || activeOp.id;
    setOperations((prev) =>
      prev.map((o) =>
        o.id === currentOpId
          ? { ...o, assignedTargetIds: roster.targets.map((t) => t.id), updatedAt: Date.now() }
          : o,
      ),
    );
  };

  const handleDeselectAllTargets = () => {
    const currentOpId = activeOpId || activeOp.id;
    setOperations((prev) =>
      prev.map((o) =>
        o.id === currentOpId ? { ...o, assignedTargetIds: [], fakeTargetIds: [], updatedAt: Date.now() } : o,
      ),
    );
  };

  // Master Roster CRUD: Attackers
  const handleAddAttacker = () => {
    const newId = nextId('a');
    const newAtk: Attacker = {
      id: newId,
      name: `Hammer ${roster.attackers.length + 1}`,
      x: 0,
      y: 0,
      unitRef: defaultUnitRef,
      artifactMultiplier: 1,
      bannerfieldLevel: 0,
      ...initialSafeTime(),
    };
    setRoster((prev) => ({
      ...prev,
      attackers: [...prev.attackers, newAtk],
    }));
    // Auto-assign to current op
    setOperations((prev) =>
      prev.map((o) =>
        o.id === (activeOpId || activeOp.id)
          ? { ...o, assignedAttackerIds: [...(o.assignedAttackerIds || []), newId] }
          : o,
      ),
    );
  };

  const handlePatchAttacker = (id: string, patch: Partial<Attacker>) => {
    setRoster((prev) => ({
      ...prev,
      attackers: prev.attackers.map((a) => (a.id === id ? { ...a, ...patch } : a)),
    }));
  };

  const handleRemoveAttacker = (attackerId: string) => {
    setRoster((prev) => ({
      ...prev,
      attackers: prev.attackers.filter((a) => a.id !== attackerId),
    }));
    setOperations((prev) =>
      prev.map((o) => ({
        ...o,
        assignedAttackerIds: (o.assignedAttackerIds || []).filter((id) => id !== attackerId),
      })),
    );
  };

  // Master Roster CRUD: Targets & Players
  const handleAddPlayer = () => {
    const pId = nextId('p');
    const newPlayer: Player = {
      id: pId,
      name: `Defender ${roster.players.length + 1}`,
      ...initialSafeTime(),
    };
    setRoster((prev) => ({
      ...prev,
      players: [...prev.players, newPlayer],
    }));
  };

  const handlePatchPlayer = (id: string, patch: Partial<Player>) => {
    setRoster((prev) => ({
      ...prev,
      players: prev.players.map((p) => (p.id === id ? { ...p, ...patch } : p)),
    }));
  };

  const handleRemovePlayer = (playerId: string) => {
    const removedVillageIds = new Set(
      roster.targets.filter((t) => t.playerId === playerId).map((t) => t.id),
    );
    setRoster((prev) => ({
      ...prev,
      players: prev.players.filter((p) => p.id !== playerId),
      targets: prev.targets.filter((t) => t.playerId !== playerId),
    }));
    setOperations((prev) =>
      prev.map((o) => ({
        ...o,
        assignedTargetIds: (o.assignedTargetIds || []).filter((id) => !removedVillageIds.has(id)),
        fakeTargetIds: (o.fakeTargetIds || []).filter((id) => !removedVillageIds.has(id)),
      })),
    );
  };

  const handleAddVillage = (playerId: string) => {
    const player = roster.players.find((p) => p.id === playerId);
    if (!player) return;
    const existing = roster.targets.filter((t) => t.playerId === playerId);
    const newId = nextId('t');
    const newTarget: Target = {
      id: newId,
      name: `Village ${existing.length + 1}`,
      x: 0,
      y: 0,
      fake: false,
      playerId,
      safeEnabled: player.safeEnabled,
      safeStart: player.safeStart,
      safeEnd: player.safeEnd,
    };
    setRoster((prev) => ({
      ...prev,
      targets: [...prev.targets, newTarget],
    }));
    setOperations((prev) =>
      prev.map((o) =>
        o.id === (activeOpId || activeOp.id)
          ? { ...o, assignedTargetIds: [...(o.assignedTargetIds || []), newId] }
          : o,
      ),
    );
  };

  const handlePatchTarget = (id: string, patch: Partial<Target>) => {
    setRoster((prev) => ({
      ...prev,
      targets: prev.targets.map((t) => (t.id === id ? { ...t, ...patch } : t)),
    }));
  };

  const handleRemoveTarget = (targetId: string) => {
    setRoster((prev) => ({
      ...prev,
      targets: prev.targets.filter((t) => t.id !== targetId),
    }));
    setOperations((prev) =>
      prev.map((o) => ({
        ...o,
        assignedTargetIds: (o.assignedTargetIds || []).filter((id) => id !== targetId),
        fakeTargetIds: (o.fakeTargetIds || []).filter((id) => id !== targetId),
      })),
    );
  };

  // Active operation landing time updates
  const fallbackLanding = useRef<Date | null>(null);

  const parsedLanding = useMemo(() => {
    const parsed = parseUtcDatetime(activeOp.landing);
    if (parsed) return parsed;
    if (!fallbackLanding.current) fallbackLanding.current = new Date();
    return fallbackLanding.current;
  }, [activeOp.landing]);

  const { date: landingDate, time: landingTime } = useMemo(() => {
    return splitUtcDateAndTime(parsedLanding);
  }, [parsedLanding]);

  const updateLanding = (newDate: string, newTime: string) => {
    const combined = combineUtcDateAndTime(newDate, newTime);
    if (combined) {
      const nextLanding = toUtcDatetimeInput(combined);
      const currentOpId = activeOpId || activeOp.id;
      setOperations((prev) =>
        prev.map((o) => (o.id === currentOpId ? { ...o, landing: nextLanding, updatedAt: Date.now() } : o)),
      );
    }
  };

  const shiftLandingHours = (hoursToAdd: number) => {
    const next = new Date(parsedLanding.getTime() + hoursToAdd * 3_600_000);
    const nextLanding = toUtcDatetimeInput(next);
    const currentOpId = activeOpId || activeOp.id;
    setOperations((prev) =>
      prev.map((o) => (o.id === currentOpId ? { ...o, landing: nextLanding, updatedAt: Date.now() } : o)),
    );
  };

  const setLandingNow = () => {
    const now = new Date();
    const nextLanding = toUtcDatetimeInput(now);
    const currentOpId = activeOpId || activeOp.id;
    setOperations((prev) =>
      prev.map((o) => (o.id === currentOpId ? { ...o, landing: nextLanding, updatedAt: Date.now() } : o)),
    );
  };

  const updateServerSpeed = (speed: number) => {
    const currentOpId = activeOpId || activeOp.id;
    setOperations((prev) =>
      prev.map((o) => (o.id === currentOpId ? { ...o, serverSpeed: speed, updatedAt: Date.now() } : o)),
    );
  };

  // Route Calculations for Active Marching Armies & Targets
  const routes = useMemo<PlannedRoute[]>(() => {
    const land = parsedLanding;
    if (!land) return [];

    const computed = marchingAttackers.flatMap((attacker) =>
      activeTargets.map((target) => {
        const unit = lookup(attacker.unitRef).unit;
        const distance = distanceBetween(attacker, target);
        const travel = travelHours(distance, {
          unitSpeed: unit.speed,
          serverSpeed: serverSpeedMultiplier(activeOp.serverSpeed),
          artifactMultiplier: attacker.artifactMultiplier,
          bannerfieldLevel: attacker.bannerfieldLevel,
        });
        const send = new Date(land.getTime() - travel * 3_600_000);
        const attackerWindow = ownerWindow(attacker);
        const targetSafe = resolveSafeTime(target, roster.players);
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
  }, [marchingAttackers, activeTargets, roster.players, activeOp.serverSpeed, parsedLanding]);

  const selectedRoute = routes.find((route) => route.key === selectedKey) ?? routes[0];
  const handleInspectRoute = (routeKey: string) => {
    setSelectedKey(routeKey);
  };

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
      if (alarmAttackerId !== 'all' && route.attacker.id !== alarmAttackerId) {
        continue;
      }
      const diffSec = Math.floor((route.send.getTime() - nowMs) / 1000);
      const alertKey = `${route.key}_${route.send.getTime()}`;

      if (diffSec >= 55 && diffSec <= 60 && !alerted1MinRef.current.has(alertKey)) {
        alerted1MinRef.current.add(alertKey);
        play1MinChime();
      }

      if (diffSec >= 0 && diffSec <= 5) {
        if (lastBeepSecRef.current !== diffSec) {
          lastBeepSecRef.current = diffSec;
          playCountdownBeep(diffSec);
        }
      }
    }
  }, [now, routes, alarmEnabled, alarmAttackerId]);

  const handleRoomServerSpeedChange = (speed: number) => {
    setOperations((prev) =>
      prev.map((o) => ({
        ...o,
        serverSpeed: speed,
        updatedAt: Date.now(),
      }))
    );
  };

  const handleChangeOpIcon = (opId: string, icon: string) => {
    setOperations((prev) =>
      prev.map((o) => (o.id === opId ? { ...o, icon, updatedAt: Date.now() } : o))
    );
  };

  const isOperationOpen = !isV2Active || Boolean(roomSession && activeOpId);

  return (
    <div className={`operations ${isV2Active ? 'operations--v2-classified' : ''}`}>
      {/* Top-Secret v2 Mode: Unified Team Room Card with Zero-Knowledge Cloud Sync & Global Server Speed */}
      {isV2Active && (
        <>
          <TeamRoomBar
            hasUnsavedChanges={hasUnsavedChanges}
            serverSpeed={activeOp.serverSpeed}
            onServerSpeedChange={handleRoomServerSpeedChange}
            onRoomDataLoaded={handleRoomDataLoaded}
            onRoomDisconnected={handleRoomDisconnected}
            onSaveRequested={handleSaveRequested}
          />

          {roomSession && (
            <>
              <section className="panel op-v2-roster" aria-label="Master Directory (Alliance Roster and Targets)">
                <div className="op-v2-roster__head">
                  <div>
                    <h2 className="op-section-title">📚 Master Directory (Alliance Roster & Targets)</h2>
                    <p>Shared room library. Register all alliance armies and defender targets here once, then assign them to specific operation waves below.</p>
                  </div>
                  <button type="button" className="pill pill--tiny pill--import-btn" onClick={() => setIsImportModalOpen(true)}>📥 Import</button>
                </div>
                <div className="op-v2-roster__cards">
                  <button type="button" className="op-v2-roster-card op-v2-roster-card--hammers" onClick={() => setIsArmiesModalOpen(true)}>
                    <span className="op-v2-roster-card__icon" aria-hidden="true">⚔️</span>
                    <span className="op-v2-roster-card__copy">
                      <strong>Alliance Hammer Directory</strong>
                      <span>{roster.attackers.length} registered hammers · {marchingAttackers.length} deployed in active wave</span>
                    </span>
                    <span className="op-v2-roster-card__action">Manage <span aria-hidden="true">→</span></span>
                  </button>
                  <button type="button" className="op-v2-roster-card op-v2-roster-card--targets" onClick={() => setIsTargetsModalOpen(true)}>
                    <span className="op-v2-roster-card__icon" aria-hidden="true">🎯</span>
                    <span className="op-v2-roster-card__copy">
                      <strong>Enemy Target Directory</strong>
                      <span>{roster.targets.length} registered villages across {roster.players.length} defender accounts</span>
                    </span>
                    <span className="op-v2-roster-card__action">Manage <span aria-hidden="true">→</span></span>
                  </button>
                </div>
              </section>

              {/* Multi-Operation Tabs */}
              <OperationTabs
                operations={operations}
                activeOpId={activeOpId}
                onSelectOp={handleSelectOp}
                onCreateOp={handleCreateOp}
                onDuplicateOp={handleDuplicateOp}
                onRenameOp={handleRenameOp}
                onChangeIconOp={handleChangeOpIcon}
                onDeleteOp={handleDeleteOp}
              />
            </>
          )}
        </>
      )}

      {/* Standby panel when in v2 mode and no operation wave is currently open */}
      {isV2Active && roomSession && !activeOpId && (
        <section className="panel op-standby-panel">
          <div className="op-standby-panel__body">
            <span className="op-standby-panel__icon">🗺️</span>
            <h3 className="op-standby-panel__title">No Operation Wave Open</h3>
            <p className="op-standby-panel__desc">
              Select an operation wave from the list above or click <strong>+ New Operation</strong> to plan launch timings, deploy registered alliance armies, and view coordinated route plans.
            </p>
            <div className="op-standby-panel__actions">
              <button
                type="button"
                className="pill pill--primary"
                onClick={() => setIsImportModalOpen(true)}
                title="Import or seed a plan from a shared URL or code"
              >
                📥 Import / Seed Plan Link
              </button>
              <button
                type="button"
                className="pill pill--secondary"
                onClick={() => setIsArmiesModalOpen(true)}
              >
                👥 Alliance Hammer Directory
              </button>
              <button
                type="button"
                className="pill pill--secondary"
                onClick={() => setIsTargetsModalOpen(true)}
              >
                🎯 Enemy Target Directory
              </button>
            </div>
            <p className="op-standby-panel__hint">
              Tip: Manage your Alliance Armies and Defender Targets anytime using the Master Directory cards above.
            </p>
          </div>
        </section>
      )}

      {/* Operation Wave Content: Rendered when an operation is open or in standard v1 mode */}
      {isOperationOpen && (
        <>
          {isV2Active && roomSession && activeOpId && (
            <div className="op-workspace-bar">
              <div className="op-workspace-bar__operation">
                <span className="op-workspace-bar__eyebrow">Active Operation</span>
                <strong className="op-workspace-bar__title">
                  <span className="op-workspace-bar__emoji">{activeOp.icon || '🎯'}</span>
                  {activeOp.name}
                </strong>
              </div>
              <nav className="op-workspace-nav" aria-label="Planner workspace">
                <button
                  type="button"
                  className={workspaceView === 'setup' ? 'is-active' : ''}
                  onClick={() => setWorkspaceView('setup')}
                >
                  ⚙️ Setup
                </button>
                <button
                  type="button"
                  className={workspaceView === 'routes' ? 'is-active' : ''}
                  onClick={() => setWorkspaceView('routes')}
                >
                  🗺️ Routes & Schedule ({routes.length})
                </button>
              </nav>
              <button
                type="button"
                className="pill pill--tiny pill--secondary op-workspace-close"
                onClick={() => setActiveOpId(null)}
                title="Close operation"
              >
                ✕
              </button>
            </div>
          )}

          {(!isV2Active || workspaceView === 'setup') && (
            <>
          {/* Active Operation Wave Command Center */}
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
                <details className="op-time-adjust">
                  <summary>Adjust time</summary>
                  <div className="op-landing-shortcuts">
                    <button type="button" className="pill pill--tiny" onClick={() => shiftLandingHours(1)}>+1h</button>
                    <button type="button" className="pill pill--tiny" onClick={() => shiftLandingHours(4)}>+4h</button>
                    <button type="button" className="pill pill--tiny" onClick={() => shiftLandingHours(8)}>+8h</button>
                    <button type="button" className="pill pill--tiny" onClick={() => shiftLandingHours(12)}>+12h</button>
                    <button type="button" className="pill pill--tiny" onClick={() => shiftLandingHours(24)}>+24h</button>
                    <button type="button" className="pill pill--tiny" onClick={setLandingNow}>Now</button>
                  </div>
                </details>
              </div>

              {(!isV2Active || !roomSession) && (
                <div className="op-speed-control">
                  <span className="op-command__label">Server Speed</span>
                  <div className="speed-group" role="group" aria-label="Server speed">
                    {[1, 3, 10].map((speed) => (
                      <button
                        key={speed}
                        type="button"
                        className={'pill pill--speed ' + (activeOp.serverSpeed === speed ? 'is-active' : '')}
                        aria-pressed={activeOp.serverSpeed === speed}
                        onClick={() => updateServerSpeed(speed)}
                      >
                        {speed}×
                      </button>
                    ))}
                  </div>
                  <span className="op-speed-note">
                    {activeOp.serverSpeed === 1 ? '1× troop speed' : activeOp.serverSpeed === 3 ? '2× troop speed' : '4× troop speed'}
                  </span>
                </div>
              )}

              <div className="op-share-control">
                <span className="op-command__label">
                  {isV2Active && roomSession ? 'Share Room' : 'Share Plan'}
                </span>
                <button
                  type="button"
                  className={`pill pill--share ${copied ? 'is-copied' : ''}`}
                  onClick={copyShareLink}
                  title={
                    isV2Active && roomSession
                      ? 'Copy Team Room link for teammates (prompts for passcode to enter room)'
                      : 'Copy short shareable link with current plan settings'
                  }
                >
                  {copied
                    ? isV2Active && roomSession
                      ? '✓ Room Link Copied!'
                      : '✓ Link Copied!'
                    : isV2Active && roomSession
                    ? '🔗 Copy Room Invite Link'
                    : '🔗 Copy Share Link'}
                </button>
              </div>
            </div>

            <p className="hint">
              All times and safe windows use 24-hour UTC. Coordinate distances are calculated Euclidean.
            </p>
          </section>

          {/* Mode-Specific Participant Configuration */}
          {isV2Active && roomSession ? (
            /* Top-Secret v2: Operation March Participant Selector Checklist */
            <OperationParticipantPicker
              attackers={roster.attackers}
              players={roster.players}
              targets={roster.targets}
              assignedAttackerIds={activeOp.assignedAttackerIds || []}
              assignedTargetIds={activeOp.assignedTargetIds || []}
              fakeTargetIds={activeOp.fakeTargetIds || []}
              onToggleAttacker={handleToggleAttacker}
              onToggleTarget={handleToggleTarget}
              onToggleTargetFake={handleToggleTargetFake}
              onSelectAllAttackers={handleSelectAllAttackers}
              onDeselectAllAttackers={handleDeselectAllAttackers}
              onSelectAllTargets={handleSelectAllTargets}
              onDeselectAllTargets={handleDeselectAllTargets}
              onOpenAttackerModal={() => setIsArmiesModalOpen(true)}
              onOpenTargetModal={() => setIsTargetsModalOpen(true)}
            />
          ) : (
            /* Standard v1: Direct Inline Attacking Armies and Target Defenders Panels */
            <>
              <section className="panel op-section">
                <div className="op-section-head">
                  <div className="op-section-head__title-group">
                    <span className="op-section-tag op-section-tag--attacker">Attackers</span>
                    <h2 className="panel__title">Attacking Armies ({roster.attackers.length})</h2>
                    <p className="op-section-copy">Configure slowest troop, speed modifiers, coordinates, and safe hours.</p>
                  </div>
                  <button type="button" className="pill pill--tiny pill--primary" onClick={handleAddAttacker}>
                    + Add Attacker
                  </button>
                </div>

                <div className="op-strip-list">
                  {roster.attackers.map((attacker, index) => (
                    <AttackerCard
                      key={attacker.id}
                      attacker={attacker}
                      index={index}
                      showUnitPicker={true}
                      onPatch={(patch) => handlePatchAttacker(attacker.id, patch)}
                      onRemove={() => handleRemoveAttacker(attacker.id)}
                    />
                  ))}
                </div>
              </section>

              <section className="panel op-section">
                <div className="op-section-head">
                  <div className="op-section-head__title-group">
                    <span className="op-section-tag op-section-tag--target">Defenders</span>
                    <h2 className="panel__title">
                      Target Defenders ({roster.players.length} {roster.players.length === 1 ? 'account' : 'accounts'} · {roster.targets.length} {roster.targets.length === 1 ? 'village' : 'villages'})
                    </h2>
                    <p className="op-section-copy">
                      Each defender account defines its safe hours once. All villages under an account inherit its safe hours.
                    </p>
                  </div>
                  <button type="button" className="pill pill--tiny pill--primary" onClick={handleAddPlayer}>
                    + Add Defender
                  </button>
                </div>

                <div className="op-defenders-list">
                  {roster.players.map((player, pIdx) => (
                    <PlayerGroupCard
                      key={player.id}
                      player={player}
                      pIdx={pIdx}
                      targets={roster.targets}
                      onPatchPlayer={(patch) => handlePatchPlayer(player.id, patch)}
                      onRemovePlayer={() => handleRemovePlayer(player.id)}
                      onAddVillage={() => handleAddVillage(player.id)}
                      onPatchTarget={handlePatchTarget}
                      onRemoveTarget={handleRemoveTarget}
                    />
                  ))}
                </div>
              </section>
            </>
          )}
            </>
          )}

          {(!isV2Active || workspaceView === 'routes') && (
            <>
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
              <details className="op-alarm-settings">
                <summary>{alarmEnabled ? '🔔 Alarm on' : '🔕 Alarm muted'}</summary>
                <div className="op-alarm-toolbar">
                <button
                  type="button"
                  className={`pill pill--alarm ${alarmEnabled ? 'is-enabled' : 'is-muted'}`}
                  onClick={() => setAlarmEnabled((prev) => !prev)}
                  title={alarmEnabled ? 'Audio alert enabled (1m chime & 5s countdown beeps). Click to mute.' : 'Sound alert is muted. Click to enable.'}
                >
                  {alarmEnabled ? '🔔 Alarm: ON' : '🔕 Alarm: Muted'}
                </button>
                <label className="op-alarm-select-label" title="Choose which attacker army triggers launch sound alarms">
                  <span className="op-alarm-select-tag">Army:</span>
                  <select
                    className="select op-select-solid-sm op-alarm-select"
                    value={alarmAttackerId}
                    onChange={(e) => setAlarmAttackerId(e.target.value)}
                    aria-label="Select attacker army for audio alarm"
                  >
                    <option value="all">All Armies</option>
                    {roster.attackers.map((atk) => (
                      <option key={atk.id} value={atk.id}>
                        {atk.name}
                      </option>
                    ))}
                  </select>
                </label>
                <div className="op-alarm-test-group">
                  <button
                    type="button"
                    className="pill pill--tiny op-alarm-test-btn"
                    onClick={test5sCountdownSequence}
                    title="Preview 5-second countdown beeps"
                  >
                    🔊 Test 5s Countdown
                  </button>
                  <button
                    type="button"
                    className="pill pill--tiny op-alarm-test-btn"
                    onClick={play1MinChime}
                    title="Preview 1-minute warning chime"
                  >
                    🎵 Test 1m Chime
                  </button>
                </div>
                </div>
              </details>
            </div>

            {/* Route Filters Toolbar */}
            <details className="op-filter-disclosure">
              <summary>Filters · {visibleRoutes.length}/{routes.length} shown</summary>
              <div className="op-filters-bar">
              <div className="op-filter-selects">
                <label className="op-filter-label">
                  <span>Attacker:</span>
                  <select
                    className="select op-select-filter"
                    value={filterAttacker}
                    onChange={(e) => setFilterAttacker(e.target.value)}
                    aria-label="Filter routes by attacker"
                  >
                    <option value="all">All Attackers ({marchingAttackers.length})</option>
                    {marchingAttackers.map((atk) => {
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
                    <option value="all">All Targets ({activeTargets.length})</option>
                    {activeTargets.map((tgt) => {
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
                    Blocked ({routes.filter((r) => !routeIsPossible(r.checks)).length})
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
            </details>

            <div className="op-routes">
              <table>
                <thead>
                  <tr>
                    <th>Route</th>
                    <th>Distance / Map Pin</th>
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
                        No routes match the selected participants or filters.
                      </td>
                    </tr>
                  ) : (
                    visibleRoutes.map((route) => {
                      const countdown = getCountdownInfo(route.send, now);
                      const defenderName = route.targetSafe.sourceName || route.target.name;
                      const hasDifferentVillageName =
                        route.targetSafe.sourceName && route.targetSafe.sourceName !== route.target.name;

                      return (
                        <tr
                          key={route.key}
                          className={`op-route-row ${(selectedRoute?.key === route.key ? 'is-selected ' : '') + (route.possible ? 'is-possible' : 'is-blocked')}`}
                          onClick={() => handleInspectRoute(route.key)}
                          role="button"
                          tabIndex={0}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault();
                              handleInspectRoute(route.key);
                            }
                          }}
                        >
                          <td data-label="Route">
                            <div className="op-route-summary">
                              <div className="op-route-button__names">
                                <strong className="op-route-attacker">{route.attacker.name}</strong>
                                <span className="op-route-arrow" aria-hidden="true">➔</span>
                                <strong className="op-route-target">{defenderName}</strong>
                                <span className={`op-hit-tag ${route.target.fake ? 'is-fake' : 'is-real'}`}>
                                  {route.target.fake ? 'Fake' : 'Real'}
                                </span>
                              </div>
                              {hasDifferentVillageName && (
                                <span className="op-route-village-subtext">
                                  {route.target.name}
                                </span>
                              )}
                            </div>
                          </td>
                          <td data-label="Distance / Map Pin">
                            <div className="op-distance-cell">
                              <span className="tabular-stat">{route.distance.toFixed(1)} fields</span>
                              <a
                                href={`https://www.thronewake.com/map/tile/${route.target.x}/${route.target.y}?center=true`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="op-map-pin-link"
                                title={`Open in-game map centered on (${route.target.x}|${route.target.y})`}
                                onClick={(e) => e.stopPropagation()}
                              >
                                📍 ({route.target.x}|{route.target.y})
                              </a>
                            </div>
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
                            <Stamp date={route.send} showLocal={showLocal} seconds className="op-timestamp op-timestamp--send" />
                          </td>
                          <td data-label="Land Time (UTC)">
                            <Stamp date={route.land} showLocal={showLocal} className="op-timestamp op-timestamp--land" />
                          </td>
                          <td data-label="Safetime Checks">
                            <SafetimeCheckCell route={route} showLocal={showLocal} />
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </section>

          {/* Schedule Timeline: Rendered directly below the Route Table on the same view */}
          {(!isV2Active || workspaceView === 'routes') && selectedRoute && (
            <ScheduleTimeline
              routes={routes}
              route={selectedRoute}
              onSelectRoute={setSelectedKey}
              showLocal={showLocal}
            />
          )}
            </>
          )}
        </>
      )}

      {/* Modals */}
      <AllianceArmiesModal
        attackers={roster.attackers}
        isOpen={isArmiesModalOpen}
        onClose={() => setIsArmiesModalOpen(false)}
        onAddAttacker={handleAddAttacker}
        onPatchAttacker={handlePatchAttacker}
        onRemoveAttacker={handleRemoveAttacker}
      />

      <TargetDatabaseModal
        players={roster.players}
        targets={roster.targets}
        isOpen={isTargetsModalOpen}
        onClose={() => setIsTargetsModalOpen(false)}
        onAddPlayer={handleAddPlayer}
        onPatchPlayer={handlePatchPlayer}
        onRemovePlayer={handleRemovePlayer}
        onAddVillage={handleAddVillage}
        onPatchTarget={handlePatchTarget}
        onRemoveTarget={handleRemoveTarget}
      />

      <ImportPlanModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onImport={handleImportPlan}
      />
    </div>
  );
}
