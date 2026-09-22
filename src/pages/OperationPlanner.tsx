import { Fragment, memo, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
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
  isInSafeWindow,
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
  extractLegacyTags,
  mergeTeamRoomData,
  type ImportMode,
  type MasterRoster,
  type OperationPlan,
  type OperationStatus,
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

const EMPTY_OBJECT = Object.freeze({}) as any;
const EMPTY_ARRAY = Object.freeze([]) as unknown as any[];

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
  playerId?: string;
  active?: boolean;
}

/** A targeted defender account. Owns the safe window that all of its villages share. */
interface Player extends SafeTimeOwner {
  id: string;
  name: string;
  factionKey?: string;
}

interface Target extends SafeTimeOwner {
  id: string;
  name: string;
  x: number;
  y: number;
  fake: boolean;
  playerId: string;
  active?: boolean;
  isCapital?: boolean;
  isCity?: boolean;
  artifactName?: string;
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
  unitRef: UnitRef;
  isSiege?: boolean;
  slotId?: string;
  attackerSafe: ResolvedSafeTime;
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
        isCapital: Boolean(tgt.isCapital),
        isCity: Boolean(tgt.isCity),
        artifactName: tgt.artifactName || '',
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
          const legacyMeta = extractLegacyTags(tgt as Target);
          return {
            id: typeof tgt?.id === 'string' && tgt.id ? tgt.id : `t${idx + 1}`,
            name: typeof tgt?.name === 'string' && tgt.name ? legacyMeta.name : `Village ${idx + 1}`,
            x: Number(tgt?.x) || 0,
            y: Number(tgt?.y) || 0,
            fake: Boolean(tgt?.fake),
            playerId: tgt?.playerId && playerIds.has(tgt.playerId) ? tgt.playerId : legacyPlayers[0].id,
            safeEnabled: Boolean(tgt?.safeEnabled),
            safeStart: safe.safeStart,
            safeEnd: safe.safeEnd,
            isCapital: legacyMeta.isCapital,
            isCity: legacyMeta.isCity,
            artifactName: legacyMeta.artifactName,
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
      <span>Safetime</span>
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
      windowText: route.attackerSafe.safeEnabled
        ? `${route.attackerSafe.sourceName ?? route.attacker.name} safe time: ${route.attackerSafe.safeStart}–${route.attackerSafe.safeEnd} UTC`
        : `${route.attackerSafe.sourceName ?? route.attacker.name} has no safe time`,
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

const TimelineLane = memo(function TimelineLane({
  label,
  window,
  isSelected,
  type,
  onClick,
  landPosition,
  isBlocked,
  sendRoutes = EMPTY_ARRAY,
  onSelectRoute,
}: {
  label: string;
  window: SafeWindow;
  isSelected?: boolean;
  type: 'attacker' | 'defender';
  onClick?: () => void;
  landPosition?: number | null;
  isBlocked?: boolean;
  sendRoutes?: PlannedRoute[];
  onSelectRoute?: (routeKey: string) => void;
}) {
  const segments = safeSegments(window);
  const isInteractive = Boolean(onClick);

  return (
    <div
      className={
        `schedule__row schedule__row--${type} ` +
        (isSelected ? 'is-selected-lane ' : '') +
        (isBlocked ? 'is-safetime-blocked ' : '') +
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
        {sendRoutes.map((route) => {
          const isOverlapping = (type === 'attacker' ? route.checks.sendAttacker : route.checks.sendDefender) || isInSafeWindow(route.send, window);
          return (
            <span
              key={route.key}
              className={`schedule__send-line ${isOverlapping ? 'is-overlapping' : ''}`}
              data-route-key={route.key}
              style={{ left: `${minuteOfDay(route.send) / 14.4}%` }}
              onClick={(e) => {
                e.stopPropagation();
                onSelectRoute?.(route.key);
              }}
              title={`${route.attacker.name} → ${route.target.name}: send ${formatDateTime(route.send)} UTC${isOverlapping ? ' · ⚠️ OVERLAPS SAFE TIME (Conflict)' : ''}`}
            >
              <span className="schedule__send-pin-head" />
              {isOverlapping && <span className="schedule__send-pin-pulse" aria-hidden="true" />}
            </span>
          );
        })}
        {landPosition !== null && landPosition !== undefined && (
          <div
            className="schedule__landing-line"
            style={{ left: `${landPosition}%` }}
            title={`Coordinated Landing at ${landPosition.toFixed(1)}%`}
          />
        )}
      </div>
    </div>
  );
});

const ScheduleTimeline = memo(function ScheduleTimeline({
  routes,
  route,
  onSelectRoute,
  showLocal,
  allAttackers,
  allAttackerPlayers,
  allPlayers,
  allTargets,
  landingDate,
  landingTime,
  parsedLanding,
  onToggleTargetFake,
  mode = 'full',
  onChangeLandingMinutes,
  onReviewRoutes,
}: {
  routes: PlannedRoute[];
  route?: PlannedRoute;
  onSelectRoute: (routeKey: string) => void;
  showLocal: boolean;
  allAttackers?: Attacker[];
  allAttackerPlayers?: Player[];
  allPlayers?: Player[];
  allTargets?: Target[];
  landingDate?: string;
  landingTime?: string;
  parsedLanding?: Date;
  onToggleTargetFake?: (targetId: string) => void;
  mode?: 'planning' | 'inspector' | 'full';
  onChangeLandingMinutes?: (minutes: number) => void;
  onReviewRoutes?: () => void;
}) {
  const axisRef = useRef<HTMLDivElement>(null);
  const dragLanding = (clientX: number) => {
    const bounds = axisRef.current?.getBoundingClientRect();
    if (!bounds?.width) return;
    onChangeLandingMinutes?.(Math.max(0, Math.min(1435, Math.round((clientX - bounds.left) / bounds.width * 1440 / 5) * 5)));
  };
  const defenderKey = (target: Target) => target.playerId || target.id;

  const { routesByAttacker, routesByDefender, attackerHasRoutes, defenderHasRoutes } = useMemo(() => {
    const byAtk = new Map<string, PlannedRoute[]>();
    const byDef = new Map<string, PlannedRoute[]>();
    const atkHas = new Set<string>();
    const defHas = new Set<string>();

    if (!routes || routes.length === 0) {
      return { routesByAttacker: byAtk, routesByDefender: byDef, attackerHasRoutes: atkHas, defenderHasRoutes: defHas };
    }

    for (const r of routes) {
      atkHas.add(r.attacker.id);
      if (r.attacker.playerId) atkHas.add(r.attacker.playerId);

      const dKey = defenderKey(r.target);
      defHas.add(dKey);
      defHas.add(r.target.id);
      if (r.target.playerId) defHas.add(r.target.playerId);

      const aKey = r.attacker.id;
      const listA = byAtk.get(aKey);
      if (listA) listA.push(r);
      else byAtk.set(aKey, [r]);

      if (r.attacker.playerId && r.attacker.playerId !== aKey) {
        const listAP = byAtk.get(r.attacker.playerId);
        if (listAP) listAP.push(r);
        else byAtk.set(r.attacker.playerId, [r]);
      }

      const listD = byDef.get(dKey);
      if (listD) listD.push(r);
      else byDef.set(dKey, [r]);
    }

    return { routesByAttacker: byAtk, routesByDefender: byDef, attackerHasRoutes: atkHas, defenderHasRoutes: defHas };
  }, [routes]);

  const defenders = useMemo(() => {
    if (allPlayers && allPlayers.length > 0) {
      const list: { key: string; label: string; window: SafeWindow; hasRoutes: boolean }[] = [];
      const seenKeys = new Set<string>();

      allPlayers.forEach((player) => {
        seenKeys.add(player.id);
        list.push({
          key: player.id,
          label: player.name,
          window: ownerWindow(player),
          hasRoutes: defenderHasRoutes.has(player.id),
        });
      });

      (allTargets || []).forEach((target) => {
        const key = defenderKey(target);
        if (!seenKeys.has(key) && (!target.playerId || !allPlayers.some((p) => p.id === target.playerId))) {
          seenKeys.add(key);
          list.push({
            key,
            label: target.name,
            window: ownerWindow(target),
            hasRoutes: defenderHasRoutes.has(key) || defenderHasRoutes.has(target.id),
          });
        }
      });

      return list;
    }

    return [...new Map(routes.map((item) => [
      defenderKey(item.target),
      {
        key: defenderKey(item.target),
        label: item.targetSafe.sourceName ?? item.target.name,
        window: ownerWindow(item.targetSafe),
        hasRoutes: true,
      },
    ])).values()];
  }, [allPlayers, allTargets, routes, defenderHasRoutes]);

  const attackers = useMemo(() => {
    if (allAttackerPlayers && allAttackerPlayers.length > 0) {
      const list: { id: string; name: string; window: SafeWindow; hasRoutes: boolean }[] = [];
      const seenIds = new Set<string>();

      allAttackerPlayers.forEach((player) => {
        seenIds.add(player.id);
        list.push({
          id: player.id,
          name: player.name,
          window: ownerWindow(player),
          hasRoutes: attackerHasRoutes.has(player.id),
        });
      });

      (allAttackers || []).forEach((atk) => {
        if (!atk.playerId || !allAttackerPlayers.some((p) => p.id === atk.playerId)) {
          if (!seenIds.has(atk.id)) {
            seenIds.add(atk.id);
            list.push({
              id: atk.id,
              name: atk.name,
              window: ownerWindow(atk),
              hasRoutes: attackerHasRoutes.has(atk.id),
            });
          }
        }
      });

      return list;
    }

    if (allAttackers && allAttackers.length > 0) {
      return allAttackers.map((a) => ({
        id: a.id,
        name: a.name,
        window: ownerWindow(a),
        hasRoutes: attackerHasRoutes.has(a.id),
      }));
    }

    return [...new Map(routes.map((item) => [
      item.attacker.id,
      {
        id: item.attacker.id,
        name: item.attacker.name,
        window: ownerWindow(item.attacker),
        hasRoutes: true,
      },
    ])).values()];
  }, [allAttackerPlayers, allAttackers, routes, attackerHasRoutes]);

  const groupByParticipation = mode === 'planning' && routes.length > 0;
  const orderedAttackers = groupByParticipation
    ? [...attackers].sort((a, b) => Number(b.hasRoutes) - Number(a.hasRoutes) || a.name.localeCompare(b.name))
    : attackers;
  const orderedDefenders = groupByParticipation
    ? [...defenders].sort((a, b) => Number(b.hasRoutes) - Number(a.hasRoutes) || a.label.localeCompare(b.label))
    : defenders;

  const selectedDefenderKey = route ? defenderKey(route.target) : null;
  const sendPosition = route ? Math.min(100, Math.max(0, minuteOfDay(route.send) / 14.4)) : null;
  const targetLandingDate = (mode === 'planning' || !route) ? parsedLanding : route.land;
  const landPosition = targetLandingDate ? Math.min(100, Math.max(0, minuteOfDay(targetLandingDate) / 14.4)) : null;

  const defenderVillages = route
    ? routes
        .filter((r) => r.attacker.id === route.attacker.id && defenderKey(r.target) === selectedDefenderKey)
        .map((r) => r.target)
    : [];

  const handleSelectAttacker = (attackerId: string) => {
    if (routes.length === 0) return;
    const nextRoute = routes.find(
      (r) =>
        (r.attacker.id === attackerId || (r.attacker.playerId && r.attacker.playerId === attackerId)) &&
        (route ? r.target.id === route.target.id : true),
    ) ?? routes.find(
      (r) => r.attacker.id === attackerId || (r.attacker.playerId && r.attacker.playerId === attackerId),
    );
    if (nextRoute) {
      onSelectRoute(nextRoute.key);
    }
  };

  const handleSelectDefender = (laneKey: string) => {
    if (routes.length === 0) return;
    const nextRoute = routes.find(
      (r) =>
        (route ? r.attacker.id === route.attacker.id : true) &&
        (defenderKey(r.target) === laneKey || r.target.playerId === laneKey),
    ) ?? routes.find(
      (r) => defenderKey(r.target) === laneKey || r.target.playerId === laneKey,
    );
    if (nextRoute) {
      onSelectRoute(nextRoute.key);
    }
  };

  return (
    <section className="panel op-schedule">
      <div className="op-section-head op-schedule__header-wrap">
        <div className="op-schedule__header-left">
          <h2 className="panel__title">Daily safe-time schedule · UTC</h2>
          {mode !== 'planning' && (
            route ? (
              <div className="op-schedule__journey-readout">
                <span className="op-schedule__journey-label">Selected Route:</span>
                <strong className="op-route-attacker">
                  {route.attackerSafe.sourceName && route.attackerSafe.sourceName !== route.attacker.name
                    ? `${route.attackerSafe.sourceName}: ${route.attacker.name}`
                    : route.attacker.name}
                </strong>
                <span className="op-route-arrow" aria-hidden="true">➔</span>
                <strong className="op-route-target">
                  {route.targetSafe.sourceName && route.targetSafe.sourceName !== route.target.name
                    ? `${route.targetSafe.sourceName}: ${route.target.name}`
                    : route.target.name}
                </strong>
                {(() => {
                  const meta = extractLegacyTags(route.target);
                  return (
                    <>
                      {meta.isCapital && <span className="op-badge-tag op-badge-tag--cap">👑 Cap</span>}
                      {meta.isCity && <span className="op-badge-tag op-badge-tag--city">🏛️ City</span>}
                      {meta.artifactName && (
                        <span className="op-badge-tag op-badge-tag--art" title={`Artifact: ${meta.artifactName}`}>
                          🏺 {meta.artifactName}
                        </span>
                      )}
                    </>
                  );
                })()}
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
                <button
                  type="button"
                  className={`pill pill--tiny op-target-mode ${route.target.fake ? 'is-fake' : 'is-real'}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleTargetFake?.(route.target.id);
                  }}
                  title={`Click to toggle ${route.target.name} between Real and Fake`}
                >
                  {route.target.fake ? 'Fake' : 'Real'}
                </button>
              </div>
            ) : (
              <div className="op-schedule__journey-readout">
                <span className="op-schedule__journey-label">Coordinated Landing:</span>
                <strong className="op-route-target">
                  {landingTime ? `${landingTime} UTC` : 'Pending'}
                </strong>
                {landingDate && <span className="op-schedule__sep">·</span>}
                {landingDate && <span>{landingDate}</span>}
                <span className="op-schedule__journey-hint">
                  (Pick marching armies & targets to preview route paths)
                </span>
              </div>
            )
          )}

          {mode !== 'planning' && (
            route ? (
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
            ) : (
              targetLandingDate && (
                <div className="op-schedule__times-row">
                  <span>
                    Target Land Time: <strong>{formatClock(minuteOfDay(targetLandingDate))} UTC</strong>
                    {showLocal && ` (${formatLocalClock(targetLandingDate)} local)`}
                  </span>
                </div>
              )
            )
          )}
        </div>

        {mode === 'planning' && routes.length > 0 && (
          <button type="button" className={`pill is-active ${routes.some((r) => !r.possible) ? 'pill--blocked-filter' : 'pill--clear-filter'}`} onClick={onReviewRoutes}>
            {routes.some((r) => !r.possible) ? `${routes.filter((r) => !r.possible).length} routes blocked` : 'All routes cleared'} · Review routes →
          </button>
        )}
        {mode !== 'planning' && (
          <div className="op-schedule__status-group">
            {route ? (
              <span className={'op-status ' + (route.possible ? 'is-possible' : 'is-blocked')}>
                {route.possible ? 'All Checks Clear ✓' : 'Route Blocked ✕'}
              </span>
            ) : (
              <span className="op-status is-idle">
                Setup Preview
              </span>
            )}
          </div>
        )}
      </div>

      {mode === 'planning' && routes.length > 0 && (
        <p className="hint">
          Yellow pins show send times for selected routes. Pulsing animated pins indicate a conflict where a send time overlaps safe hours. Drag the green landing pin or slider to clear them.
        </p>
      )}
      <div className="schedule__axis-row">
        <span className="schedule__axis-spacer" />
        <div className="schedule__axis-track" ref={axisRef}>
          <span className="schedule__axis-tick" style={{ left: '0%' }}>00:00</span>
          <span className="schedule__axis-tick" style={{ left: '25%' }}>06:00</span>
          <span className="schedule__axis-tick" style={{ left: '50%' }}>12:00</span>
          <span className="schedule__axis-tick" style={{ left: '75%' }}>18:00</span>
          <span className="schedule__axis-tick" style={{ left: '100%' }}>24:00</span>
          {landPosition !== null && (
            <div className={`schedule__axis-land-pin ${onChangeLandingMinutes ? 'is-draggable' : ''}`} style={{ left: `${landPosition}%` }}
              role={onChangeLandingMinutes ? 'slider' : undefined}
              tabIndex={onChangeLandingMinutes ? 0 : undefined}
              aria-label={onChangeLandingMinutes ? 'Drag coordinated landing time' : undefined}
              aria-valuemin={0} aria-valuemax={1435}
              aria-valuenow={targetLandingDate ? minuteOfDay(targetLandingDate) : 0}
              aria-valuetext={landingTime ? `${landingTime} UTC` : undefined}
              onPointerDown={onChangeLandingMinutes ? (event) => { event.preventDefault(); event.currentTarget.setPointerCapture(event.pointerId); dragLanding(event.clientX); } : undefined}
              onPointerMove={onChangeLandingMinutes ? (event) => { if (event.currentTarget.hasPointerCapture(event.pointerId)) dragLanding(event.clientX); } : undefined}
              onPointerUp={onChangeLandingMinutes ? (event) => { if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId); } : undefined}
              onKeyDown={onChangeLandingMinutes ? (event) => {
                const current = targetLandingDate ? minuteOfDay(targetLandingDate) : 0;
                const next = event.key === 'Home' ? 0 : event.key === 'End' ? 1435 : ['ArrowRight', 'ArrowUp'].includes(event.key) ? current + 5 : ['ArrowLeft', 'ArrowDown'].includes(event.key) ? current - 5 : null;
                if (next !== null) { event.preventDefault(); onChangeLandingMinutes(Math.max(0, Math.min(1435, next))); }
              } : undefined}
            >
              <span className="schedule__axis-land-badge">
                🎯 {landingTime ? `${landingTime} UTC` : 'Land'}
              </span>
            </div>
          )}
        </div>
      </div>

      <p className="schedule__group">Attackers</p>
      {orderedAttackers.map((attacker, index) => (
        <Fragment key={attacker.id}>
        {groupByParticipation && !attacker.hasRoutes && (index === 0 || orderedAttackers[index - 1].hasRoutes) && (
          <div className="schedule__no-routes">no routes</div>
        )}
        <TimelineLane
          label={attacker.name}
          sendRoutes={mode === 'planning' ? routesByAttacker.get(attacker.id) || EMPTY_ARRAY : EMPTY_ARRAY}
          window={attacker.window}
          isSelected={mode !== 'planning' && Boolean(route && (attacker.id === route.attacker.id || attacker.id === route.attacker.playerId))}
          type="attacker"
          onClick={routes.length > 0 && mode !== 'planning' ? () => handleSelectAttacker(attacker.id) : undefined}
          onSelectRoute={onSelectRoute}
          landPosition={landPosition}
        />
        </Fragment>
      ))}

      <p className="schedule__group">Defenders</p>
      {orderedDefenders.map((defender, index) => {
        const isBlocked = targetLandingDate ? isInSafeWindow(targetLandingDate, defender.window) : false;
        return (
          <Fragment key={defender.key}>
          {groupByParticipation && !defender.hasRoutes && (index === 0 || orderedDefenders[index - 1].hasRoutes) && (
            <div className="schedule__no-routes">no routes</div>
          )}
          <TimelineLane
            label={defender.label}
            sendRoutes={mode === 'planning' ? routesByDefender.get(defender.key) || EMPTY_ARRAY : EMPTY_ARRAY}
            window={defender.window}
            isSelected={mode !== 'planning' && Boolean(route && defender.key === selectedDefenderKey)}
            isBlocked={isBlocked}
            type="defender"
            onClick={routes.length > 0 && mode !== 'planning' ? () => handleSelectDefender(defender.key) : undefined}
            onSelectRoute={onSelectRoute}
            landPosition={landPosition}
          />
          </Fragment>
        );
      })}

      {mode !== 'planning' && (
        <>
          <div className="schedule__row schedule__row--events">
            <span className="schedule__label">Movement</span>
            <div className="schedule__track schedule__track--events">
              {route?.attackerWindow.enabled && safeSegments(route.attackerWindow).map((seg) => (
                <span
                  key={`mov-atk-${seg.start}-${seg.end}`}
                  className="schedule__movement-safe schedule__movement-safe--attacker"
                  style={{
                    '--left': (seg.start / 14.4) + '%',
                    '--width': ((seg.end - seg.start) / 14.4) + '%',
                  } as CSSProperties}
                />
              ))}
              {route?.targetWindow.enabled && safeSegments(route.targetWindow).map((seg) => (
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
              {route && sendPosition !== null && (
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
              )}

              {/* Land Pin */}
              {landPosition !== null && (
                <div
                  className="schedule__pin schedule__pin--land"
                  style={{ left: `${landPosition}%` }}
                  title={route ? 'Land ' + formatDateTime(route.land) : `Landing ${landingTime || ''} UTC`}
                >
                  <div className="schedule__pin-head" />
                  <div className="schedule__pin-line" />
                  <div className="schedule__pin-badge">
                    <span className="schedule__pin-dot" />
                    <span>
                      Land {route ? formatClock(minuteOfDay(route.land)) : landingTime || ''} UTC
                      {showLocal && targetLandingDate && (
                        <span className="schedule__pin-local">{formatLocalClock(targetLandingDate)} local</span>
                      )}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Village switcher bar */}
          {route && defenderVillages.length > 1 && (
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
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}
    </section>
  );
});

function routeBlockerText(route: PlannedRoute) {
  return [
    route.checks.sendAttacker && 'attacker is in safe time at send',
    route.checks.sendDefender && 'defender is in safe time at send',
    route.checks.landDefender && 'defender is in safe time at landing',
  ].filter(Boolean).join('; ');
}

function OperationRouteWarnings({ routes }: { routes: PlannedRoute[] }) {
  const blocked = routes.filter((route) => !route.possible);
  if (!blocked.length) return null;
  const targets = [...new Map(routes.map((r) => [r.target.id, r.target])).values()];
  const attackers = [...new Map(routes.map((r) => [r.attacker.id, r.attacker])).values()];
  const unreachable = targets.filter((target) => !routes.some((r) => r.target.id === target.id && r.possible));
  const stranded = attackers.filter((attacker) => !routes.some((r) => r.attacker.id === attacker.id && r.possible));
  const affected = attackers.filter((attacker) => blocked.some((r) => r.attacker.id === attacker.id));
  return (
    <section className="op-route-clash-banner" aria-label="Blocked routes" role="alert">
      <span className="op-route-clash-banner__icon" aria-hidden="true">⚠️</span>
      <div className="op-route-clash-banner__content">
        <strong className="op-route-clash-banner__title">{blocked.length} routes blocked at this operation time</strong>
        <p className="op-route-clash-banner__desc">Adjust the landing time in Scheduling or update the selections below.</p>
        <ul>
          {unreachable.map((target) => <li key={target.id}>Consider removing target {target.name}: none of the selected armies can attack it at this operation time.</li>)}
          {stranded.map((attacker) => <li key={attacker.id}>Consider removing army {attacker.name}: it has no clear route to any selected target.</li>)}
          {affected.length === 1 && attackers.length > 1 && !stranded.some((a) => a.id === affected[0].id) && (
            <li>Only army {affected[0].name} has blocked routes. Consider changing its troop speed or removing it; the other armies’ routes are clear.</li>
          )}
          {!unreachable.length && !stranded.length && affected.length !== 1 && <li>Every army and target has a clear route, but some pairings are blocked. Try another landing time before removing participants.</li>}
        </ul>
        <details>
          <summary>Blocked route details ({blocked.length})</summary>
          <ul>{blocked.map((route) => <li key={route.key}>{route.attacker.name} → {route.target.name}: {routeBlockerText(route)}.</li>)}</ul>
        </details>
      </div>
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
      status: 'draft',
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
    try {
      const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ''));
      const op = hashParams.get('op');
      if (op) return op;
    } catch {}
    if (isV2Unlocked) return null;
    return 'op1';
  });

  // Modals state
  const [isArmiesModalOpen, setIsArmiesModalOpen] = useState(false);
  const [isTargetsModalOpen, setIsTargetsModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);

  const showLocal = true;
  const [selectedKey, setSelectedKey] = useState('');
  const [workspaceView, setWorkspaceView] = useState<'scheduling' | 'targets' | 'routes'>(() => {
    try {
      const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ''));
      const view = hashParams.get('view');
      if (view === 'scheduling' || view === 'targets' || view === 'routes') {
        return view;
      }
      if (hashParams.get('op')) {
        return 'routes';
      }
    } catch {}
    return 'scheduling';
  });
  const [filterAttacker, setFilterAttacker] = useState<string>('all');
  const [filterTarget, setFilterTarget] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<'all' | 'possible' | 'blocked'>('all');
  const [filterType, setFilterType] = useState<'all' | 'real' | 'fake'>('all');
  const [filterUnit, setFilterUnit] = useState<string>('all');
  const [alarmEnabled, setAlarmEnabled] = useState<boolean>(true);
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
      status: 'draft' as const,
      landing: '2026-08-16T19:00',
      serverSpeed: 3,
      assignedAttackerIds: [],
      assignedTargetIds: [],
      fakeTargetIds: [],
    };
  }, [operations, activeOpId, roster]);

  const isOpLocked = activeOp.status === 'ready';

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
    const overrides = activeOp.attackerUnitOverrides || {};
    return roster.attackers
      .filter((a) => assigned.includes(a.id))
      .map((a) => ({
        ...a,
        unitRef: overrides[a.id] ? (overrides[a.id] as UnitRef) : a.unitRef,
      }));
  }, [isV2Active, roster.attackers, activeOp.assignedAttackerIds, activeOp.attackerUnitOverrides]);

  const marchingAttackerPlayers = useMemo(() => {
    const map = new Map<string, { id: string; name: string }>();
    for (const atk of marchingAttackers) {
      const p = atk.playerId ? (roster.attackerPlayers || []).find((player) => player.id === atk.playerId) : undefined;
      const id = p ? p.id : atk.id;
      const name = p ? p.name : atk.name;
      if (!map.has(id)) {
        map.set(id, { id, name });
      }
    }
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [marchingAttackers, roster.attackerPlayers]);

  const activeTargets = useMemo(() => {
    if (!isV2Active) return roster.targets;
    const assigned = activeOp.assignedTargetIds || [];
    const fakeTargetIds = activeOp.fakeTargetIds || [];
    return roster.targets
      .filter((target) => assigned.includes(target.id))
      .map((target) => ({ ...target, fake: fakeTargetIds.includes(target.id) }));
  }, [isV2Active, roster.targets, activeOp.assignedTargetIds, activeOp.fakeTargetIds]);

  const [routeLinkCopied, setRouteLinkCopied] = useState(false);

  const copyShareLink = async () => {
    let fullUrl = '';
    let hash = '';

    if (isV2Active && roomSession) {
      const opPart = activeOpId
        ? `&op=${encodeURIComponent(activeOpId)}&view=${encodeURIComponent(workspaceView)}`
        : '';
      hash = `room=${encodeURIComponent(roomSession.roomName)}${opPart}`;
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

  const copyRouteLink = async () => {
    let fullUrl = '';
    let hash = '';

    if (isV2Active && roomSession) {
      const targetOp = activeOpId || (operations.length > 0 ? operations[0].id : '');
      const opPart = targetOp ? `&op=${encodeURIComponent(targetOp)}&view=routes` : '';
      hash = `room=${encodeURIComponent(roomSession.roomName)}${opPart}`;
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
      setRouteLinkCopied(true);
      setTimeout(() => setRouteLinkCopied(false), 2000);
    } catch {
      window.location.hash = hash;
      setRouteLinkCopied(true);
      setTimeout(() => setRouteLinkCopied(false), 2000);
    }
  };

  useEffect(() => {
    if (isV2Active && roomSession) {
      const opPart = activeOpId
        ? `&op=${encodeURIComponent(activeOpId)}&view=${encodeURIComponent(workspaceView)}`
        : '';
      const newHash = `#room=${encodeURIComponent(roomSession.roomName)}${opPart}`;
      if (window.location.hash !== newHash) {
        window.history.replaceState(null, '', `${window.location.pathname}${newHash}`);
      }
    } else if (!isV2Active) {
      const timer = setTimeout(() => {
        const currentPlannerState: PlannerState = {
          landing: activeOp.landing,
          serverSpeed: activeOp.serverSpeed,
          attackers: marchingAttackers,
          targets: activeTargets,
          players: roster.players,
        };
        window.history.replaceState(null, '', `${window.location.pathname}#${plannerHash(currentPlannerState)}`);
      }, 350);
      return () => clearTimeout(timer);
    }
  }, [
    isV2Active,
    roomSession,
    activeOpId,
    workspaceView,
    activeOp.landing,
    activeOp.serverSpeed,
    marchingAttackers,
    activeTargets,
    roster.players,
  ]);

  // Respond to hash navigation while connected
  useEffect(() => {
    if (!isV2Active) return;
    const handleHashChange = () => {
      try {
        const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ''));
        const opParam = hashParams.get('op');
        const viewParam = hashParams.get('view');
        if (opParam && operations.some((o) => o.id === opParam)) {
          setActiveOpId(opParam);
          if (viewParam === 'scheduling' || viewParam === 'targets' || viewParam === 'routes') {
            setWorkspaceView(viewParam);
          } else {
            setWorkspaceView('routes');
          }
        }
      } catch {}
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, [isV2Active, operations]);

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

    let targetOpId: string | null = null;
    let targetView: 'scheduling' | 'targets' | 'routes' | null = null;
    try {
      const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ''));
      const opParam = hashParams.get('op');
      const viewParam = hashParams.get('view');
      if (opParam && migrated.operations.some((o) => o.id === opParam)) {
        targetOpId = opParam;
      }
      if (viewParam === 'scheduling' || viewParam === 'targets' || viewParam === 'routes') {
        targetView = viewParam;
      } else if (opParam) {
        targetView = 'routes';
      }
    } catch {}

    setActiveOpId((prev) => {
      if (targetOpId) return targetOpId;
      if (prev && migrated.operations.some((o) => o.id === prev)) {
        return prev;
      }
      return null;
    });

    if (targetView) {
      setWorkspaceView(targetView);
    }

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
    window.history.replaceState(null, '', `${window.location.pathname}#tool=operations`);
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
    if (opId) setWorkspaceView('scheduling');
  };

  const handleCreateOp = (name: string, icon?: string) => {
    const newId = 'op_' + Date.now();
    const newOp: OperationPlan = {
      id: newId,
      name,
      icon: icon || '🎯',
      status: 'draft',
      landing: activeOp.landing,
      serverSpeed: activeOp.serverSpeed,
      assignedAttackerIds: [],
      assignedTargetIds: [],
      fakeTargetIds: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    setOperations((prev) => [...prev, newOp]);
    setActiveOpId(newId);
    setWorkspaceView('scheduling');
  };

  const handleDuplicateOp = (opId: string) => {
    const source = operations.find((o) => o.id === opId) || activeOp;
    const newId = 'op_' + Date.now();
    const newOp: OperationPlan = {
      ...source,
      id: newId,
      name: `${source.name} (Copy)`,
      status: 'draft',
      assignedAttackerIds: [...source.assignedAttackerIds],
      assignedTargetIds: [...source.assignedTargetIds],
      fakeTargetIds: [...(source.fakeTargetIds || [])],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    setOperations((prev) => [...prev, newOp]);
    setActiveOpId(newId);
    setWorkspaceView('scheduling');
  };

  const handleToggleOpStatus = (opId?: string) => {
    const targetId = opId || activeOpId || activeOp.id;
    setOperations((prev) =>
      prev.map((o) => {
        if (o.id !== targetId) return o;
        const newStatus: OperationStatus = o.status === 'ready' ? 'draft' : 'ready';
        return { ...o, status: newStatus, updatedAt: Date.now() };
      }),
    );
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
      setWorkspaceView('scheduling');
    }
  };

  const handleImportRoom = (importedRoom: TeamRoomData, mode: 'replace' | 'merge') => {
    if (mode === 'replace') {
      setRoster(importedRoom.roster);
      setOperations(importedRoom.operations);
      if (importedRoom.activeOpId) {
        setActiveOpId(importedRoom.activeOpId);
      } else if (importedRoom.operations.length > 0) {
        setActiveOpId(importedRoom.operations[0].id);
      }
      setWorkspaceView('scheduling');
    } else {
      const currentData: TeamRoomData = {
        version: 2,
        roomName: roomSession?.roomName || 'unnamed-room',
        activeOpId: activeOpId || activeOp.id,
        roster,
        operations,
        updatedAt: Date.now(),
      };
      const merged = mergeTeamRoomData(importedRoom, currentData);
      setRoster(merged.roster);
      setOperations(merged.operations);
      if (merged.activeOpId) {
        setActiveOpId(merged.activeOpId);
      }
      setWorkspaceView('scheduling');
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
        const isAdding = !assignedTargetIds.includes(targetId);
        const nextAssigned = isAdding
          ? [...assignedTargetIds, targetId]
          : assignedTargetIds.filter((id) => id !== targetId);
        const nextFake = isAdding
          ? [...fakeTargetIds, targetId]
          : fakeTargetIds.filter((id) => id !== targetId);
        return {
          ...operation,
          assignedTargetIds: nextAssigned,
          fakeTargetIds: nextFake,
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
          ? {
              ...o,
              assignedTargetIds: roster.targets.map((t) => t.id),
              fakeTargetIds: roster.targets.map((t) => t.id),
              updatedAt: Date.now(),
            }
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

  const handleUpdateAttackerUnit = (attackerId: string, unitRef: string) => {
    const currentOpId = activeOpId || activeOp.id;
    setOperations((prev) =>
      prev.map((o) => {
        if (o.id !== currentOpId) return o;
        const currentOverrides = o.attackerUnitOverrides || {};
        return {
          ...o,
          attackerUnitOverrides: {
            ...currentOverrides,
            [attackerId]: unitRef,
          },
          updatedAt: Date.now(),
        };
      }),
    );
  };

  const handleToggleRouteSiege = (routeKey: string) => {
    const currentOpId = activeOpId || activeOp.id;
    setOperations((prev) =>
      prev.map((o) => {
        if (o.id !== currentOpId) return o;
        const currentRouteSiege = o.routeSiegeOverrides?.[routeKey];
        const existingRoute = routes.find((r) => r.key === routeKey);
        const nextVal = currentRouteSiege !== undefined ? !currentRouteSiege : !existingRoute?.isSiege;
        return {
          ...o,
          routeSiegeOverrides: {
            ...(o.routeSiegeOverrides || {}),
            [routeKey]: nextVal,
          },
          updatedAt: Date.now(),
        };
      }),
    );
  };



  // Master Roster CRUD: Attackers & Alliance Members
  const handleAddAttacker = (playerIdOrEvent?: string | unknown) => {
    const playerId = typeof playerIdOrEvent === 'string' ? playerIdOrEvent : '';
    const newId = nextId('a');
    const owningPlayer = playerId ? (roster.attackerPlayers || []).find((p) => p.id === playerId) : undefined;
    const playerHammersCount = playerId
      ? roster.attackers.filter((a) => a.playerId === playerId).length
      : roster.attackers.length;

    const playerFaction = owningPlayer?.factionKey
      ? playableFactions.find((f) => f.key === owningPlayer.factionKey)
      : undefined;
    const initialUnitRef = playerFaction
      ? (`${playerFaction.key}/${playerFaction.units[0].key}` as UnitRef)
      : defaultUnitRef;

    const newAtk: Attacker = {
      id: newId,
      name: owningPlayer
        ? `${owningPlayer.name} Hammer ${playerHammersCount + 1}`
        : `Hammer ${roster.attackers.length + 1}`,
      x: 0,
      y: 0,
      unitRef: initialUnitRef,
      artifactMultiplier: 1,
      bannerfieldLevel: 0,
      playerId: playerId || '',
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

  const handleAddAttackerPlayer = () => {
    const pId = nextId('ap');
    const newPlayer: Player = {
      id: pId,
      name: `Member ${(roster.attackerPlayers || []).length + 1}`,
      ...initialSafeTime(),
    };
    const newHammerId = nextId('a');
    const newHammer: Attacker = {
      id: newHammerId,
      name: `${newPlayer.name} Hammer 1`,
      x: 0,
      y: 0,
      unitRef: defaultUnitRef,
      artifactMultiplier: 1,
      bannerfieldLevel: 0,
      playerId: pId,
      ...initialSafeTime(),
    };
    setRoster((prev) => ({
      ...prev,
      attackerPlayers: [...(prev.attackerPlayers || []), newPlayer],
      attackers: [...prev.attackers, newHammer],
    }));
    setOperations((prev) =>
      prev.map((o) =>
        o.id === (activeOpId || activeOp.id)
          ? { ...o, assignedAttackerIds: [...(o.assignedAttackerIds || []), newHammerId] }
          : o,
      ),
    );
  };

  const handlePatchAttackerPlayer = (id: string, patch: Partial<Player>) => {
    setRoster((prev) => {
      const nextAttackerPlayers = (prev.attackerPlayers || []).map((p) => (p.id === id ? { ...p, ...patch } : p));
      let nextAttackers = prev.attackers;
      if (patch.factionKey) {
        const targetFaction = playableFactions.find((f) => f.key === patch.factionKey);
        if (targetFaction) {
          const defaultUnit = `${targetFaction.key}/${targetFaction.units[0].key}`;
          nextAttackers = prev.attackers.map((a) => {
            if (a.playerId === id && !a.unitRef.startsWith(`${patch.factionKey}/`)) {
              return { ...a, unitRef: defaultUnit };
            }
            return a;
          });
        }
      }
      return {
        ...prev,
        attackerPlayers: nextAttackerPlayers,
        attackers: nextAttackers,
      };
    });
  };

  const handleRemoveAttackerPlayer = (playerId: string) => {
    setRoster((prev) => ({
      ...prev,
      attackerPlayers: (prev.attackerPlayers || []).filter((p) => p.id !== playerId),
      attackers: prev.attackers.filter((a) => a.playerId !== playerId),
    }));
    const removedAttackerIds = new Set(
      roster.attackers.filter((a) => a.playerId === playerId).map((a) => a.id),
    );
    setOperations((prev) =>
      prev.map((o) => ({
        ...o,
        assignedAttackerIds: (o.assignedAttackerIds || []).filter((id) => !removedAttackerIds.has(id)),
      })),
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
      fake: true,
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
          ? {
              ...o,
              assignedTargetIds: [...(o.assignedTargetIds || []), newId],
              fakeTargetIds: [...(o.fakeTargetIds || []), newId],
            }
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
    return splitUtcDateAndTime(parsedLanding, true);
  }, [parsedLanding]);

  const sliderMinutes = useMemo(() => {
    return parsedLanding.getUTCHours() * 60 + parsedLanding.getUTCMinutes();
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

    const computed: PlannedRoute[] = [];

    marchingAttackers.forEach((attacker) => {
      const defaultUnitRef = (activeOp.attackerUnitOverrides?.[attacker.id] || attacker.unitRef) as UnitRef;

      activeTargets.forEach((target) => {
        const routeKey = `${attacker.id}:${target.id}`;

        const effectiveUnitRef = (activeOp.routeUnitOverrides?.[routeKey] || defaultUnitRef) as UnitRef;
        const unit = lookup(effectiveUnitRef).unit;
        const isSiege = activeOp.routeSiegeOverrides?.[routeKey] ?? false;
        const effectiveSpeed = isSiege ? unit.speed * 0.5 : unit.speed;
        const distance = distanceBetween(attacker, target);
        const travel = travelHours(distance, {
          unitSpeed: effectiveSpeed,
          serverSpeed: serverSpeedMultiplier(activeOp.serverSpeed),
          artifactMultiplier: attacker.artifactMultiplier,
          bannerfieldLevel: attacker.bannerfieldLevel,
        });
        const send = new Date(land.getTime() - travel * 3_600_000);
        const attackerSafe = resolveSafeTime(attacker, roster.attackerPlayers || []);
        const attackerWindow = ownerWindow(attackerSafe);
        const targetSafe = resolveSafeTime(target, roster.players);
        const targetWindow = ownerWindow(targetSafe);
        const checks = safeChecks(send, land, attackerWindow, targetWindow);

        computed.push({
          key: routeKey,
          attacker,
          target,
          unitRef: effectiveUnitRef,
          isSiege,
          attackerSafe,
          targetSafe,
          attackerWindow,
          targetWindow,
          distance,
          travel,
          send,
          land,
          checks,
          possible: routeIsPossible(checks),
        });
      });
    });

    return computed.sort((a, b) => a.send.getTime() - b.send.getTime());
  }, [
    marchingAttackers,
    activeTargets,
    roster.players,
    roster.attackerPlayers,
    activeOp.id,
    activeOp.serverSpeed,
    activeOp.fakeTargetIds,
    activeOp.attackerUnitOverrides,
    activeOp.routeUnitOverrides,
    activeOp.routeSiegeOverrides,
    parsedLanding,
  ]);

  const selectedRoute = routes.find((route) => route.key === selectedKey) ?? routes[0];
  const handleInspectRoute = (routeKey: string) => {
    setSelectedKey(routeKey);
  };

  const availableUnitsInRoutes = useMemo(() => {
    const map = new Map<string, { key: string; unitRef: UnitRef; isSiege: boolean; count: number }>();
    routes.forEach((r) => {
      const key = `${r.unitRef}${r.isSiege ? ':siege' : ''}`;
      const existing = map.get(key);
      if (existing) {
        existing.count += 1;
      } else {
        map.set(key, { key, unitRef: r.unitRef, isSiege: !!r.isSiege, count: 1 });
      }
    });
    return Array.from(map.values());
  }, [routes]);

  const visibleRoutes = useMemo(() => {
    return routes.filter((route) => {
      if (filterAttacker !== 'all') {
        const isMatch =
          (route.attacker.playerId && route.attacker.playerId === filterAttacker) ||
          route.attacker.id === filterAttacker;
        if (!isMatch) return false;
      }
      if (filterTarget !== 'all' && route.target.id !== filterTarget) return false;
      if (filterUnit !== 'all') {
        const routeFilterKey = `${route.unitRef}${route.isSiege ? ':siege' : ''}`;
        if (routeFilterKey !== filterUnit && route.unitRef !== filterUnit) return false;
      }
      if (filterStatus === 'possible' && !route.possible) return false;
      if (filterStatus === 'blocked' && route.possible) return false;
      if (filterType === 'real' && route.target.fake) return false;
      if (filterType === 'fake' && !route.target.fake) return false;
      return true;
    });
  }, [routes, filterAttacker, filterTarget, filterUnit, filterStatus, filterType]);

  // Identify the next upcoming attack to launch (earliest send time >= now)
  const nextUpcomingRouteKey = useMemo(() => {
    const nowMs = now.getTime();
    // visibleRoutes is already sorted by send time ascending
    const nextRoute = visibleRoutes.find((r) => r.send.getTime() >= nowMs);
    return nextRoute ? nextRoute.key : null;
  }, [visibleRoutes, now]);

  // Detect rapid consecutive attacks by the same attacker (under 10 seconds apart), excluding attacks already in the past
  const routeClashes = useMemo(() => {
    const clashes = new Map<string, { gapSeconds: number; attackerName: string; partnerRouteKey: string }>();
    const nowMs = now.getTime();

    // Group active/future routes by attacker identity (player ID if linked to a player, otherwise attacker village ID)
    const groupedByPlayer = new Map<string, typeof routes>();

    for (const r of routes) {
      // Don't show warning card on passed attacks
      if (r.send.getTime() < nowMs) continue;

      const playerKey = r.attacker.playerId || r.attacker.id;
      const group = groupedByPlayer.get(playerKey) ?? [];
      group.push(r);
      groupedByPlayer.set(playerKey, group);
    }

    for (const [, playerRoutes] of groupedByPlayer.entries()) {
      if (playerRoutes.length < 2) continue;
      // Sort routes by send time ascending
      const sorted = [...playerRoutes].sort((a, b) => a.send.getTime() - b.send.getTime());
      for (let i = 0; i < sorted.length - 1; i++) {
        const curr = sorted[i];
        const next = sorted[i + 1];
        const diffMs = next.send.getTime() - curr.send.getTime();
        if (diffMs >= 0 && diffMs < 10_000) {
          const gapSec = Math.round(diffMs / 1000);
          const attackerDisplayName = curr.attackerSafe.sourceName || curr.attacker.name;

          clashes.set(curr.key, {
            gapSeconds: gapSec,
            attackerName: attackerDisplayName,
            partnerRouteKey: next.key,
          });
          clashes.set(next.key, {
            gapSeconds: gapSec,
            attackerName: attackerDisplayName,
            partnerRouteKey: curr.key,
          });
        }
      }
    }

    return clashes;
  }, [routes]);

  const attackerWarnings = useMemo(() => {
    if (marchingAttackers.length === 0 || routes.length === 0) return {};
    const blockedRoutes = routes.filter((r) => !r.possible);
    if (blockedRoutes.length === 0) return {};
    const map: Record<string, string> = {};
    for (const attacker of marchingAttackers) {
      const msgs = blockedRoutes
        .filter((r) => r.attacker.id === attacker.id)
        .map((r) => `${r.target.name}: ${routeBlockerText(r)}`);
      if (msgs.length > 0) map[attacker.id] = msgs.join('\n');
    }
    return map;
  }, [marchingAttackers, routes]);

  const targetWarnings = useMemo(() => {
    if (activeTargets.length === 0 || routes.length === 0) return {};
    const blockedRoutes = routes.filter((r) => !r.possible);
    if (blockedRoutes.length === 0) return {};
    const map: Record<string, string> = {};
    for (const target of activeTargets) {
      const msgs = blockedRoutes
        .filter((r) => r.target.id === target.id)
        .map((r) => `${r.attacker.name}: ${routeBlockerText(r)}`);
      if (msgs.length > 0) map[target.id] = msgs.join('\n');
    }
    return map;
  }, [activeTargets, routes]);

  // Audio alert tracking for 1-minute chime & 5-second countdown ticks
  const alerted1MinRef = useRef<Set<string>>(new Set());
  const lastBeepSecRef = useRef<number | null>(null);

  useEffect(() => {
    if (!alarmEnabled) return;
    const nowMs = now.getTime();
    for (const route of visibleRoutes) {
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
  }, [now, visibleRoutes, alarmEnabled]);

  const handleRoomServerSpeedChange = (speed: number) => {
    setOperations((prev) =>
      prev.map((o) => ({
        ...o,
        serverSpeed: speed,
        updatedAt: Date.now(),
      }))
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
            <>
              <div className="op-workspace-bar">
                <div className="op-workspace-bar__operation">
                  <span className="op-workspace-bar__eyebrow">Viewing Workspace</span>
                  <div className="op-workspace-bar__title-group">
                    <strong className="op-workspace-bar__title">
                      {activeOp.name}
                    </strong>
                    <span
                      className={`op-status-badge ${isOpLocked ? 'op-status-badge--ready' : 'op-status-badge--draft'}`}
                      title={isOpLocked ? 'Confirmed / Ready: Protected against accidental edits' : 'Draft: Editable'}
                    >
                      {isOpLocked ? '✅ Ready' : '📝 Draft'}
                    </span>
                    <button
                      type="button"
                      className={`pill pill--tiny ${isOpLocked ? 'op-lock-toggle--unlock' : 'op-lock-toggle--lock'}`}
                      onClick={() => handleToggleOpStatus(activeOp.id)}
                      title={isOpLocked ? 'Unlock operation to allow edits' : 'Lock operation as Ready to prevent accidental edits'}
                      aria-label={isOpLocked ? 'Unlock operation' : 'Lock operation as Ready'}
                    >
                      {isOpLocked ? '🔓 Unlock' : '🔒 Mark as Ready'}
                    </button>
                    <button
                      type="button"
                      className={`pill pill--tiny pill--share ${routeLinkCopied ? 'is-copied' : ''}`}
                      onClick={copyRouteLink}
                      title="Copy direct route link to this operation wave to share in Discord"
                    >
                      {routeLinkCopied ? '✓ Copied' : '🔗 Share Routes'}
                    </button>
                  </div>
                </div>
                <nav className="op-workspace-nav" aria-label="Planner workspace">
                  <button
                    type="button"
                    className={workspaceView === 'scheduling' ? 'is-active' : ''}
                    onClick={() => setWorkspaceView('scheduling')}
                  >
                    🕒 1. Scheduling
                  </button>
                  <button
                    type="button"
                    className={workspaceView === 'targets' ? 'is-active' : ''}
                    onClick={() => setWorkspaceView('targets')}
                  >
                    🎯 2. Targets & Setup
                  </button>
                  <button
                    type="button"
                    className={workspaceView === 'routes' ? 'is-active' : ''}
                    onClick={() => setWorkspaceView('routes')}
                  >
                    🗺️ 3. Routes ({routes.length})
                  </button>
                </nav>
                <button
                  type="button"
                  className="pill pill--tiny pill--secondary op-workspace-close"
                  onClick={() => setActiveOpId(null)}
                  title="Close operation workspace"
                >
                  ✕
                </button>
              </div>

              {isOpLocked && (
                <div className="op-lock-banner" role="alert">
                  <div className="op-lock-banner__info">
                    <span className="op-lock-banner__icon">🔒</span>
                    <div className="op-lock-banner__text">
                      <strong>Operation Confirmed &amp; Locked ({activeOp.name})</strong>
                      <span>Editing controls are locked to protect against accidental changes. You can safely inspect arrival times, filter attacks, and copy routes.</span>
                    </div>
                  </div>
                  <button
                    type="button"
                    className="pill pill--tiny pill--primary op-lock-banner__btn"
                    onClick={() => handleToggleOpStatus(activeOp.id)}
                    title="Unlock operation to allow edits"
                  >
                    🔓 Unlock
                  </button>
                </div>
              )}
            </>
          )}

          {/* In Standalone v1 mode, render everything inline on a single page */}
          {!isV2Active && (
            <>
              {/* Command Center */}
              <section className="panel op-command">
                <div className="op-command__main">
                  <div className="op-landing-control">
                    <div className="op-landing-control__label-row">
                      <span className="op-command__label">Coordinated Landing Time</span>
                      <span className="op-utc-badge">24h UTC</span>
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
                        placeholder="14:00:00"
                        withSeconds
                      />
                    </div>
                    <div className="op-time-slider-wrap">
                      <span className="op-time-slider-label">00:00</span>
                      <input
                        type="range"
                        className="op-time-slider"
                        min={0}
                        max={1435}
                        step={5}
                        value={sliderMinutes}
                        onChange={(e) => {
                          const totalMins = Number(e.target.value);
                          const h = Math.floor(totalMins / 60).toString().padStart(2, '0');
                          const m = (totalMins % 60).toString().padStart(2, '0');
                          const s = '00';
                          updateLanding(landingDate, `${h}:${m}:${s}`);
                        }}
                        aria-label="Coordinated Landing Time 24h Slider"
                      />
                      <span className="op-time-slider-label">23:59</span>
                    </div>
                    <div className="op-landing-control__local">
                      Local: <strong>{formatLocalDateTime(parsedLanding)}</strong> ({zoneLabel})
                    </div>
                  </div>

                  <div className="op-speed-control">
                    <label className="op-command__label" htmlFor="server-speed-select">
                      Server Speed
                    </label>
                    <div className="op-speed-pills" id="server-speed-select" role="group" aria-label="Server Speed">
                      {([1, 2, 3, 5] as const).map((spd) => (
                        <button
                          key={spd}
                          type="button"
                          className={`pill pill--small ${activeOp.serverSpeed === spd ? 'pill--primary' : 'pill--secondary'}`}
                          onClick={() => updateServerSpeed(spd)}
                        >
                          {spd}×
                        </button>
                      ))}
                    </div>
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

                <p className="op-command__sub">
                  Drag the slider to coordinate attacks across safe hours. All calculations update live.
                </p>
              </section>

              {/* Standard v1: Direct Inline Attacking Armies and Target Defenders Panels */}
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

          {/* ── STEP 1: SCHEDULING (V2) ───────────────────────────── */}
          {isV2Active && workspaceView === 'scheduling' && (
            <>
              {/* Active Operation Wave Command Center */}
              <section className="panel op-command">
                <div className="op-command__main">
                  <div className="op-landing-control">
                    <div className="op-landing-control__label-row">
                      <span className="op-command__label">Coordinated Landing Time</span>
                      <span className="op-utc-badge">24h UTC</span>
                    </div>
                    <div className="op-landing-control__inputs">
                      <input
                        className="text-input text-input--date"
                        type="date"
                        value={landingDate}
                        disabled={isOpLocked}
                        onChange={(event) => updateLanding(event.target.value, landingTime)}
                      />
                      <Time24Input
                        value={landingTime}
                        disabled={isOpLocked}
                        onChange={(newTime) => updateLanding(landingDate, newTime)}
                        placeholder="14:00:00"
                        withSeconds
                      />
                    </div>
                    <div className="op-time-slider-wrap">
                      <span className="op-time-slider-label">00:00</span>
                      <input
                        type="range"
                        className="op-time-slider"
                        min={0}
                        max={1435}
                        step={5}
                        value={sliderMinutes}
                        disabled={isOpLocked}
                        onChange={(e) => {
                          if (isOpLocked) return;
                          const totalMins = Number(e.target.value);
                          const h = Math.floor(totalMins / 60).toString().padStart(2, '0');
                          const m = (totalMins % 60).toString().padStart(2, '0');
                          const s = '00';
                          updateLanding(landingDate, `${h}:${m}:${s}`);
                        }}
                        aria-label="Coordinated Landing Time 24h Slider"
                      />
                      <span className="op-time-slider-label">23:59</span>
                    </div>
                    <div className="op-landing-control__local">
                      Local: <strong>{formatLocalDateTime(parsedLanding)}</strong> ({zoneLabel})
                    </div>
                  </div>
                </div>
              </section>

              {/* Safe-Time Schedule Planning Matrix: Shows all directory participants with synchronized landing line */}
              <ScheduleTimeline
                routes={routes}
                route={selectedRoute}
                onSelectRoute={setSelectedKey}
                showLocal={showLocal}
                allAttackers={roster.attackers}
                allAttackerPlayers={roster.attackerPlayers}
                allPlayers={roster.players}
                allTargets={roster.targets}
                landingDate={landingDate}
                landingTime={landingTime}
                parsedLanding={parsedLanding}
                onToggleTargetFake={isOpLocked ? () => {} : handleToggleTargetFake}
                onChangeLandingMinutes={(minutes) => !isOpLocked && updateLanding(landingDate, `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}:00`)}
                onReviewRoutes={() => setWorkspaceView('routes')}
                mode="planning"
              />

              <div className="op-step-nav-bar">
                <span className="hint" style={{ margin: 0 }}>
                  Step 1 of 3: Coordinated Landing & Safetime Planning
                </span>
                <div className="op-step-nav-bar__right">
                  <button
                    type="button"
                    className="pill pill--primary"
                    onClick={() => setWorkspaceView('targets')}
                  >
                    Next: Target Selection →
                  </button>
                </div>
              </div>
            </>
          )}

          {/* ── STEP 2: TARGET & ATTACKER SELECTION (V2) ───────────── */}
          {isV2Active && workspaceView === 'targets' && (
            <>
              <div className="op-step-context-banner">
                <div>
                  <span>Coordinated Landing: </span>
                  <strong>{landingDate} · {landingTime} UTC</strong>
                  {showLocal && <span style={{ opacity: 0.7 }}> ({formatLocalDateTime(parsedLanding)})</span>}
                </div>
                <button
                  type="button"
                  className="btn-link"
                  onClick={() => setWorkspaceView('scheduling')}
                >
                  ✏️ Adjust Landing Time
                </button>
              </div>


              <OperationRouteWarnings routes={routes} />

              {/* Mode-Specific Participant Configuration */}
              <OperationParticipantPicker
                attackerWarnings={attackerWarnings}
                targetWarnings={targetWarnings}
                attackers={roster.attackers}
                attackerPlayers={roster.attackerPlayers || EMPTY_ARRAY}
                players={roster.players}
                targets={roster.targets}
                assignedAttackerIds={activeOp.assignedAttackerIds || EMPTY_ARRAY}
                assignedTargetIds={activeOp.assignedTargetIds || EMPTY_ARRAY}
                fakeTargetIds={activeOp.fakeTargetIds || EMPTY_ARRAY}
                attackerUnitOverrides={activeOp.attackerUnitOverrides || EMPTY_OBJECT}
                parsedLanding={parsedLanding}
                isLocked={isOpLocked}
                onToggleAttacker={handleToggleAttacker}
                onToggleTarget={handleToggleTarget}
                onToggleTargetFake={handleToggleTargetFake}
                onUpdateAttackerUnit={handleUpdateAttackerUnit}
                onSelectAllAttackers={handleSelectAllAttackers}
                onDeselectAllAttackers={handleDeselectAllAttackers}
                onSelectAllTargets={handleSelectAllTargets}
                onDeselectAllTargets={handleDeselectAllTargets}
                onOpenAttackerModal={() => setIsArmiesModalOpen(true)}
                onOpenTargetModal={() => setIsTargetsModalOpen(true)}
              />


              <div className="op-step-nav-bar">
                <button
                  type="button"
                  className="pill pill--secondary"
                  onClick={() => setWorkspaceView('scheduling')}
                >
                  ← Back: Scheduling
                </button>
                <div className="op-step-nav-bar__right">
                  <button
                    type="button"
                    className="pill pill--primary"
                    onClick={() => setWorkspaceView('routes')}
                  >
                    Proceed to Routes & Launch ({routes.length}) →
                  </button>
                </div>
              </div>
            </>
          )}

          {(!isV2Active || workspaceView === 'routes') && (
            <>
          {isV2Active && routes.some((route) => !route.possible) && (
            <section className="panel" aria-label="Resolve blocked routes">
              <strong>{routes.filter((route) => !route.possible).length} routes blocked</strong>
              <p>Go back to Scheduling and try another landing time. The selected routes’ send lines move with it. If no time works, remove the affected armies or targets from this operation; they cannot participate with blocked routes.</p>
              <button type="button" className="pill pill--primary" onClick={() => setWorkspaceView('scheduling')}>← Back to Scheduling</button>
            </section>
          )}
          {/* Results Section */}
          <section className="panel op-results">
            <div className="op-section-head op-results__head-wrap">
              <div>
                <h2 className="panel__title">Route Plan (Sorted by Send Time)</h2>
                <p className="op-section-copy">
                  {!isV2Active && 'Click anywhere on a row to inspect its schedule. '}{routes.filter((route) => route.possible).length} of {routes.length} routes clear all safetime checks
                  {' · '}{routes.filter((route) => !route.target.fake).length} real, {routes.filter((route) => route.target.fake).length} fake.
                </p>
              </div>

              {/* Alarm Control Button Toolbar */}
              <div className="op-alarm-toolbar">
                {isV2Active && roomSession && (
                  <button
                    type="button"
                    className={`pill pill--share ${routeLinkCopied ? 'is-copied' : ''}`}
                    onClick={copyRouteLink}
                    title="Copy direct route link to this operation to share in Discord"
                  >
                    {routeLinkCopied ? '✓ Route Link Copied!' : '🔗 Share Routes'}
                  </button>
                )}
                <button
                  type="button"
                  className={`pill pill--alarm ${alarmEnabled ? 'is-enabled' : 'is-muted'}`}
                  onClick={() => setAlarmEnabled((prev) => !prev)}
                  title={alarmEnabled ? 'Audio alert enabled (1m chime & 5s countdown beeps). Click to mute.' : 'Sound alert is muted. Click to enable.'}
                >
                  {alarmEnabled ? '🔔 Alarm: ON' : '🔕 Alarm: Muted'}
                </button>
                <span className="hint">Alarms follow the route filters below.</span>
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
            </div>

            {/* Route Filters Toolbar */}
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
                    <option value="all">All Attackers ({marchingAttackerPlayers.length})</option>
                    {marchingAttackerPlayers.map((atkPlayer) => {
                      const count = routes.filter(
                        (r) =>
                          (r.attacker.playerId && r.attacker.playerId === atkPlayer.id) ||
                          r.attacker.id === atkPlayer.id
                      ).length;
                      return (
                        <option key={atkPlayer.id} value={atkPlayer.id}>
                          {atkPlayer.name} ({count} routes)
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

                {availableUnitsInRoutes.length > 1 && (
                  <label className="op-filter-label">
                    <span>Troop:</span>
                    <select
                      className="select op-select-filter"
                      value={filterUnit}
                      onChange={(e) => setFilterUnit(e.target.value)}
                      aria-label="Filter routes by troop"
                    >
                      <option value="all">All Troops ({routes.length})</option>
                      {availableUnitsInRoutes.map((entry) => {
                        const u = lookup(entry.unitRef).unit;
                        return (
                          <option key={entry.key} value={entry.key}>
                            {u.name}{entry.isSiege ? ' 🔥 [Siege]' : ''} ({entry.count} routes)
                          </option>
                        );
                      })}
                    </select>
                  </label>
                )}
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

            {routeClashes.size > 0 && (
              <div className="op-route-clash-banner" role="alert">
                <span className="op-route-clash-banner__icon">⚠️</span>
                <div className="op-route-clash-banner__content">
                  <strong className="op-route-clash-banner__title">
                    Warning: Fast Attack Conflict Detected (&lt; 10s gap)
                  </strong>
                  <p className="op-route-clash-banner__desc">
                    One or more attackers have multiple upcoming attacks scheduled less than 10 seconds apart. Sending attacks this quickly is difficult in-game; check the flagged routes in the table below.
                  </p>
                </div>
              </div>
            )}

            <div className="op-routes">
              <table>
                <thead>
                  <tr>
                    <th>Route</th>
                    <th>Type</th>
                    <th>Siege</th>
                    <th>Map Pin</th>
                    <th>Launch In</th>
                    <th>Travel</th>
                    <th>Send Time (UTC)</th>
                    <th>
                      <SafetimeHeaderTooltip />
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {visibleRoutes.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="op-routes-empty">
                        No routes match the selected participants or filters.
                      </td>
                    </tr>
                  ) : (
                    visibleRoutes.map((route) => {
                      const countdown = getCountdownInfo(route.send, now);
                      const defenderPlayer = route.targetSafe.sourceName || null;
                      const defenderVillage = route.target.name;
                      const tgtMeta = extractLegacyTags(route.target);
                      const attackerPlayer = route.attackerSafe.sourceName || null;
                      const attackerVillage = route.attacker.name;

                      const isNextUpcoming = route.key === nextUpcomingRouteKey;
                      const isPast = route.send.getTime() < now.getTime();
                      const statusClass = isPast ? 'is-past-route' : 'is-future-route';

                      return (
                        <tr
                          key={route.key}
                          className={`op-route-row ${(selectedRoute?.key === route.key ? 'is-selected ' : '') + (route.possible ? 'is-possible' : 'is-blocked')}${isNextUpcoming ? ' is-next-launch' : ''} ${statusClass}`}
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
                            <div className="op-route-b">
                              <div className="op-route-b__row op-route-b__row--source">
                                <strong className="op-route-b__player op-route-b__player--attacker">
                                  {attackerPlayer || attackerVillage}
                                </strong>
                                {attackerPlayer && (
                                  <span className="op-route-b__village" title={attackerVillage}>
                                    · {attackerVillage}
                                  </span>
                                )}
                              </div>
                              <div className="op-route-b__row op-route-b__row--target">
                                <span className="op-route-b__arrow" aria-hidden="true">➔</span>
                                <strong className="op-route-b__player op-route-b__player--target">
                                  {defenderPlayer || defenderVillage}
                                </strong>
                                {defenderPlayer && (
                                  <span className="op-route-b__village" title={defenderVillage}>
                                    · {defenderVillage}
                                  </span>
                                )}
                                {tgtMeta.isCapital && <span className="op-badge-tag op-badge-tag--cap">👑 Cap</span>}
                                {tgtMeta.isCity && <span className="op-badge-tag op-badge-tag--city">🏛️ City</span>}
                                {tgtMeta.artifactName && (
                                  <span className="op-badge-tag op-badge-tag--art" title={`Artifact: ${tgtMeta.artifactName}`}>
                                    🏺 {tgtMeta.artifactName}
                                  </span>
                                )}
                              </div>
                            </div>
                          </td>
                          <td data-label="Type">
                            <button
                              type="button"
                              className={`pill pill--tiny op-target-mode ${route.target.fake ? 'is-fake' : 'is-real'}`}
                              disabled={isOpLocked}
                              onClick={(e) => {
                                e.stopPropagation();
                                if (!isOpLocked) handleToggleTargetFake(route.target.id);
                              }}
                              title={isOpLocked ? 'Operation is locked' : `Click to toggle ${route.target.name} between Real and Fake`}
                            >
                              {route.target.fake ? 'Fake' : 'Real'}
                            </button>
                          </td>
                          <td data-label="Siege" onClick={(e) => e.stopPropagation()}>
                            <button
                              type="button"
                              className={`op-route-siege-toggle ${route.isSiege ? 'is-siege' : ''}`}
                              onClick={() => !isOpLocked && handleToggleRouteSiege(route.key)}
                              disabled={isOpLocked}
                              title={
                                isOpLocked
                                  ? `Operation locked: ${route.isSiege ? 'Siege' : 'Normal'}`
                                  : (route.isSiege ? 'Siege attack (travels at half speed) - click to switch to Normal' : 'Normal speed attack - click to switch to Siege (half speed)')
                              }
                              aria-label="Toggle siege mode for route"
                            >
                              {route.isSiege ? '🔥 Siege' : 'Normal'}
                            </button>
                          </td>
                          <td data-label="Map Pin">
                            <a
                              href={`https://www.thronewake.com/map/tile/${route.target.x}/${route.target.y}?center=true`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="op-map-pin-btn"
                              title={`Open in-game map centered on target (${route.target.x}|${route.target.y})`}
                              onClick={(e) => e.stopPropagation()}
                            >
                              <span className="op-map-pin-icon" aria-hidden="true">📍</span>
                              <span className="op-map-pin-coords">({route.target.x}|{route.target.y})</span>
                              <span className="op-map-pin-arrow" aria-hidden="true">↗</span>
                            </a>
                          </td>
                          <td data-label="Launch In">
                            <div className="op-launch-cell">
                              <span className={`op-countdown-tag op-countdown-tag--${countdown.tier}`}>
                                {countdown.label}
                              </span>
                              {routeClashes.has(route.key) && (
                                <span
                                  className="op-launch-clash-tag"
                                  title={`Warning: Another attack by ${routeClashes.get(route.key)?.attackerName} launches only ${routeClashes.get(route.key)?.gapSeconds}s apart!`}
                                >
                                  ⚠️ &lt;10s ({routeClashes.get(route.key)?.gapSeconds}s)
                                </span>
                              )}
                            </div>
                          </td>
                          <td data-label="Travel">
                            <div className="op-dist-travel-cell">
                              <span className="travel-stat">{formatDuration(route.travel)}</span>
                              <span className="op-dist-sub">{route.distance.toFixed(1)} fields</span>
                            </div>
                          </td>
                          <td data-label="Send Time (UTC)">
                            <Stamp date={route.send} showLocal={showLocal} seconds className="op-timestamp op-timestamp--send" />
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
          {!isV2Active && (
            <ScheduleTimeline
              routes={routes}
              route={selectedRoute}
              onSelectRoute={setSelectedKey}
              showLocal={showLocal}
              allAttackers={roster.attackers}
              allAttackerPlayers={roster.attackerPlayers}
              allPlayers={roster.players}
              allTargets={roster.targets}
              landingDate={landingDate}
              landingTime={landingTime}
              parsedLanding={parsedLanding}
              onToggleTargetFake={handleToggleTargetFake}
              mode="inspector"
            />
          )}

          <div className="op-step-nav-bar">
            <button
              type="button"
              className="pill pill--secondary"
              onClick={() => setWorkspaceView('targets')}
            >
              ← Back: Target Selection
            </button>
            <div className="op-step-nav-bar__right">
              <button
                type="button"
                className="pill pill--secondary"
                onClick={() => setWorkspaceView('scheduling')}
              >
                🕒 Jump to Scheduling
              </button>
            </div>
          </div>
            </>
          )}
        </>
      )}

      {/* Modals */}
      <AllianceArmiesModal
        attackers={roster.attackers}
        attackerPlayers={roster.attackerPlayers || []}
        isOpen={isArmiesModalOpen}
        onClose={() => setIsArmiesModalOpen(false)}
        onAddAttackerPlayer={handleAddAttackerPlayer}
        onPatchAttackerPlayer={handlePatchAttackerPlayer}
        onRemoveAttackerPlayer={handleRemoveAttackerPlayer}
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
        onImportRoom={handleImportRoom}
      />
    </div>
  );
}
