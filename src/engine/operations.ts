export interface Coordinates {
  x: number;
  y: number;
}

export interface SafeWindow {
  enabled: boolean;
  /** Minutes after midnight in the shared schedule time zone. */
  start: number;
  /** Minutes after midnight in the shared schedule time zone. */
  end: number;
}

export interface TravelModifiers {
  unitSpeed: number;
  serverSpeed: number;
  artifactMultiplier: 1 | 1.5 | 2;
  bannerfieldLevel: number;
}

export interface SafeChecks {
  landDefender: boolean;
  sendAttacker: boolean;
  sendDefender: boolean;
}

export const BANNERFIELD_THRESHOLD = 20;
export const BANNERFIELD_BONUS_PER_LEVEL = 0.2;

export function distanceBetween(from: Coordinates, to: Coordinates): number {
  return Math.hypot(to.x - from.x, to.y - from.y);
}

/**
 * Travel is split at 20 fields. Server speed and the artifact apply to the
 * whole journey; Bannerfield applies only to the remaining distance and adds
 * 20% of base speed per level.
 */
export function travelHours(distance: number, modifiers: TravelModifiers): number {
  const baseSpeed = Math.max(0.0001, modifiers.unitSpeed)
    * Math.max(0.0001, modifiers.serverSpeed)
    * modifiers.artifactMultiplier;
  const firstLeg = Math.min(Math.max(0, distance), BANNERFIELD_THRESHOLD) / baseSpeed;
  const remaining = Math.max(0, distance - BANNERFIELD_THRESHOLD);
  const level = Math.min(20, Math.max(0, Math.round(modifiers.bannerfieldLevel)));
  const longDistanceSpeed = baseSpeed * (1 + level * BANNERFIELD_BONUS_PER_LEVEL);
  return firstLeg + remaining / longDistanceSpeed;
}

export const MAX_SAFE_HOURS = 6;
export const MAX_SAFE_MINUTES = MAX_SAFE_HOURS * 60; // 360 minutes

/** Computes the duration of a safe-time window in minutes (0 to 1440). */
export function safeWindowDurationMinutes(startMinutes: number, endMinutes: number): number {
  const normStart = ((Math.round(startMinutes) % 1440) + 1440) % 1440;
  const normEnd = ((Math.round(endMinutes) % 1440) + 1440) % 1440;
  if (normStart === normEnd) return 0;
  return (normEnd - normStart + 1440) % 1440;
}

/**
 * Enforces a maximum duration (default 6 hours / 360m) on safe-time windows.
 * When `changedField` is 'start', slides `end` forward if duration exceeds max.
 * When `changedField` is 'end', slides `start` backward if duration exceeds max.
 */
export function enforceMaxSafeWindow(
  startClock: string,
  endClock: string,
  changedField: 'start' | 'end',
  maxMinutes = MAX_SAFE_MINUTES,
): { safeStart: string; safeEnd: string } {
  let start = parseClock(startClock);
  let end = parseClock(endClock);
  const dur = safeWindowDurationMinutes(start, end);

  if (dur > maxMinutes) {
    if (changedField === 'start') {
      end = (start + maxMinutes) % 1440;
    } else {
      start = (end - maxMinutes + 1440) % 1440;
    }
  }

  return {
    safeStart: formatClock(start),
    safeEnd: formatClock(end),
  };
}

export function minuteOfDay(date: Date): number {
  return date.getUTCHours() * 60 + date.getUTCMinutes() + date.getUTCSeconds() / 60;
}

/** Start is inclusive and end is exclusive. Zero duration window blocks nothing. */
export function isInSafeWindow(date: Date, window: SafeWindow): boolean {
  if (!window.enabled) return false;
  if (window.start === window.end) return false;
  const minute = minuteOfDay(date);
  if (window.start < window.end) return minute >= window.start && minute < window.end;
  return minute >= window.start || minute < window.end;
}

export function safeChecks(
  send: Date,
  land: Date,
  attacker: SafeWindow,
  defender: SafeWindow,
): SafeChecks {
  return {
    landDefender: isInSafeWindow(land, defender),
    sendAttacker: isInSafeWindow(send, attacker),
    sendDefender: isInSafeWindow(send, defender),
  };
}

export function routeIsPossible(checks: SafeChecks): boolean {
  return !Object.values(checks).some(Boolean);
}

export function safeSegments(window: SafeWindow): Array<{ start: number; end: number }> {
  if (!window.enabled) return [];
  if (window.start === window.end) return [];
  if (window.start < window.end) return [{ start: window.start, end: window.end }];
  return [
    { start: 0, end: window.end },
    { start: window.start, end: 1440 },
  ];
}

export function formatDuration(hours: number): string {
  const totalMinutes = Math.max(0, Math.round(hours * 60));
  const days = Math.floor(totalMinutes / 1440);
  const h = Math.floor((totalMinutes % 1440) / 60);
  const m = totalMinutes % 60;
  return [days ? days + 'd' : '', h || days ? h + 'h' : '', String(m).padStart(2, '0') + 'm']
    .filter(Boolean)
    .join(' ');
}

export function parseClock(value: string): number {
  const [hours, minutes] = value.split(':').map(Number);
  return Math.min(1439, Math.max(0, (hours || 0) * 60 + (minutes || 0)));
}

export function formatClock(minutes: number, includeSeconds = false): string {
  const totalSeconds = Math.round(minutes * 60);
  const normalizedSec = ((totalSeconds % 86400) + 86400) % 86400;
  const h = String(Math.floor(normalizedSec / 3600)).padStart(2, '0');
  const m = String(Math.floor((normalizedSec % 3600) / 60)).padStart(2, '0');
  if (includeSeconds) {
    const s = String(normalizedSec % 60).padStart(2, '0');
    return `${h}:${m}:${s}`;
  }
  return `${h}:${m}`;
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'] as const;

/** Converts a UTC instant to the zone-less value accepted by datetime-local or internal state. */
export function toUtcDatetimeInput(date: Date): string {
  return date.toISOString().slice(0, 16);
}

/** Returns date string "YYYY-MM-DD" and 24h clock string "HH:mm" in UTC. */
export function splitUtcDateAndTime(date: Date): { date: string; time: string } {
  const iso = date.toISOString();
  return {
    date: iso.slice(0, 10),
    time: iso.slice(11, 16),
  };
}

/** Combines "YYYY-MM-DD" and "HH:mm" into a UTC Date object. */
export function combineUtcDateAndTime(dateStr: string, timeStr: string): Date | null {
  const matchDate = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateStr);
  const matchTime = /^(\d{1,2}):(\d{2})$/.exec(timeStr);
  if (!matchDate || !matchTime) return null;
  const [, year, month, day] = matchDate;
  const [, hours, minutes] = matchTime;
  const h = Number(hours);
  const m = Number(minutes);
  if (h < 0 || h > 23 || m < 0 || m > 59) return null;
  const result = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day), h, m));
  return Number.isFinite(result.getTime()) ? result : null;
}

/** Interprets a datetime-local string (or YYYY-MM-DDTHH:mm) as UTC. */
export function parseUtcDatetime(value: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})(?:T|\s+)(\d{1,2}):(\d{2})$/.exec(value);
  if (!match) return null;
  const [, year, month, day, hours, minutes] = match;
  const h = Number(hours);
  const m = Number(minutes);
  if (h < 0 || h > 23 || m < 0 || m > 59) return null;
  const result = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day), h, m));
  return Number.isFinite(result.getTime()) ? result : null;
}

/** 3× and 10× worlds use 2× and 4× troop movement speed respectively. */
export function serverSpeedMultiplier(worldSpeed: number): number {
  if (worldSpeed === 10) return 4;
  if (worldSpeed === 3) return 2;
  return 1;
}

/** Formats a date in strict 24-hour UTC: "15 Aug 14:00 UTC" or with seconds "15 Aug 14:00:25 UTC". */
export function formatDateTime(date: Date, includeSeconds = false): string {
  const day = String(date.getUTCDate()).padStart(2, '0');
  const month = MONTHS[date.getUTCMonth()];
  const hours = String(date.getUTCHours()).padStart(2, '0');
  const minutes = String(date.getUTCMinutes()).padStart(2, '0');
  if (includeSeconds) {
    const seconds = String(date.getUTCSeconds()).padStart(2, '0');
    return `${day} ${month} ${hours}:${minutes}:${seconds} UTC`;
  }
  return `${day} ${month} ${hours}:${minutes} UTC`;
}

/**
 * Local-time display.
 *
 * Every number the planner computes is UTC and stays UTC — a shared plan has
 * to mean the same instant for everyone reading it. These helpers only render
 * that same instant a second time in the viewer's own zone, so nobody has to
 * convert in their head. `timeZone` is for tests; left out, it resolves to
 * whatever zone the browser is in.
 */
function localParts(
  date: Date,
  includeSeconds: boolean,
  timeZone?: string,
): Record<string, string> {
  const formatter = new Intl.DateTimeFormat('en-GB', {
    timeZone,
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    ...(includeSeconds ? { second: '2-digit' as const } : null),
    // h23 rather than hour12:false — some engines render midnight as "24" for
    // the latter.
    hourCycle: 'h23',
    timeZoneName: 'short',
  });
  const parts: Record<string, string> = {};
  for (const part of formatter.formatToParts(date)) {
    parts[part.type] = part.value;
  }
  return parts;
}

/** "16 Aug 00:30 GMT+2" in the viewer's zone. Falls back to UTC if Intl fails. */
export function formatLocalDateTime(date: Date, includeSeconds = false, timeZone?: string): string {
  try {
    const p = localParts(date, includeSeconds, timeZone);
    const time = includeSeconds ? `${p.hour}:${p.minute}:${p.second}` : `${p.hour}:${p.minute}`;
    return `${p.day} ${p.month} ${time} ${p.timeZoneName}`;
  } catch {
    return formatDateTime(date, includeSeconds);
  }
}

/** Just the clock portion of the above: "00:30". */
export function formatLocalClock(date: Date, includeSeconds = false, timeZone?: string): string {
  try {
    const p = localParts(date, includeSeconds, timeZone);
    return includeSeconds ? `${p.hour}:${p.minute}:${p.second}` : `${p.hour}:${p.minute}`;
  } catch {
    return formatClock(minuteOfDay(date), includeSeconds);
  }
}

/** IANA name of the viewer's zone, for labelling the toggle: "Europe/Prague". */
export function localZoneLabel(timeZone?: string): string {
  try {
    return timeZone ?? Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    return 'Local';
  }
}

export interface CompactSafeTimeOwner {
  safeEnabled: boolean;
  safeStart: string;
  safeEnd: string;
}

export interface CompactAttacker extends CompactSafeTimeOwner {
  id: string;
  name: string;
  x: number;
  y: number;
  unitRef: string;
  artifactMultiplier: 1 | 1.5 | 2;
  bannerfieldLevel: number;
  /** Id of the owning alliance member player, or '' when standalone. */
  playerId?: string;
  active?: boolean;
}

export interface CompactPlayer extends CompactSafeTimeOwner {
  id: string;
  name: string;
}

export interface CompactTarget extends CompactSafeTimeOwner {
  id: string;
  name: string;
  x: number;
  y: number;
  /** Legacy/share-plan attack type. V2 stores this per operation in fakeTargetIds. */
  fake: boolean;
  /** Id of the owning player, or '' when the village carries its own window. */
  playerId: string;
  active?: boolean;
}

export interface CompactPlannerState {
  landing: string;
  serverSpeed: number;
  attackers: CompactAttacker[];
  targets: CompactTarget[];
  players: CompactPlayer[];
}

export type Attacker = CompactAttacker;
export type Player = CompactPlayer;
export type Target = CompactTarget;
export type PlannerState = CompactPlannerState;


export interface MasterRoster {
  attackers: CompactAttacker[];
  players: CompactPlayer[];
  targets: CompactTarget[];
  /** Optional alliance member accounts who own hammers and share safe-time windows. */
  attackerPlayers?: CompactPlayer[];
}

export interface OperationPlan {
  id: string;
  name: string;
  icon?: string;
  landing: string;
  serverSpeed: number;
  assignedAttackerIds: string[];
  assignedTargetIds: string[];
  /** Target villages marked as fake for this operation only. */
  fakeTargetIds: string[];
  /** Overridden slowest troop per attacker for this operation only (attackerId -> unitRef). */
  attackerUnitOverrides?: Record<string, string>;
  createdAt?: number;
  updatedAt?: number;
}

export interface TeamOperation {
  id: string;
  name: string;
  landing: string;
  serverSpeed: number;
  attackers: CompactAttacker[];
  targets: CompactTarget[];
  players: CompactPlayer[];
  createdAt?: number;
  updatedAt?: number;
}

export interface TeamRoomData {
  version: 2;
  roomName: string;
  activeOpId: string | null;
  roster: MasterRoster;
  operations: OperationPlan[];
  updatedAt: number;
}

/**
 * Migrates any team room payload (v1, legacy v2 with duplicated ops)
 * into a clean MasterRoster + OperationPlan[] structure.
 */
export function migrateToMasterRoster(raw: any, fallbackState?: CompactPlannerState): TeamRoomData {
  if (!raw || typeof raw !== 'object') {
    const fallback: CompactPlannerState = fallbackState || {
      landing: '2026-08-16T19:00',
      serverSpeed: 3,
      attackers: [
        {
          id: 'a1',
          name: 'Attacker 1',
          x: 0,
          y: 0,
          unitRef: 'embermark_dominion/emberblade',
          artifactMultiplier: 1,
          bannerfieldLevel: 0,
          safeEnabled: true,
          safeStart: '22:00',
          safeEnd: '04:00',
          active: true,
        },
      ],
      targets: [
        {
          id: 't1',
          name: 'Target 1',
          x: 10,
          y: 10,
          fake: false,
          playerId: 'p1',
          safeEnabled: true,
          safeStart: '22:00',
          safeEnd: '04:00',
          active: true,
        },
      ],
      players: [
        {
          id: 'p1',
          name: 'Defender 1',
          safeEnabled: true,
          safeStart: '22:00',
          safeEnd: '04:00',
        },
      ],
    };

    return {
      version: 2,
      roomName: 'Local Operations',
      activeOpId: 'op1',
      roster: {
        attackers: fallback.attackers,
        players: fallback.players,
        targets: fallback.targets,
      },
      operations: [
        {
          id: 'op1',
          name: 'Operation 1',
          landing: fallback.landing,
          serverSpeed: fallback.serverSpeed,
          assignedAttackerIds: fallback.attackers.map((a) => a.id),
          assignedTargetIds: fallback.targets.map((t) => t.id),
          fakeTargetIds: fallback.targets.filter((t) => t.fake).map((t) => t.id),
          attackerUnitOverrides: undefined,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        },
      ],
      updatedAt: Date.now(),
    };
  }

  // If already in new MasterRoster format:
  if (raw.roster && Array.isArray(raw.operations)) {
    return {
      version: 2,
      roomName: raw.roomName || 'unnamed-room',
      activeOpId: raw.activeOpId || (raw.operations[0]?.id ?? 'op1'),
      roster: {
        attackers: Array.isArray(raw.roster.attackers) ? raw.roster.attackers : [],
        players: Array.isArray(raw.roster.players) ? raw.roster.players : [],
        targets: Array.isArray(raw.roster.targets)
          ? raw.roster.targets.map((target: CompactTarget) => ({ ...target, fake: false }))
          : [],
        attackerPlayers: Array.isArray(raw.roster.attackerPlayers) ? raw.roster.attackerPlayers : [],
      },
      operations: raw.operations.map((op: any, index: number) => ({
        id: op.id || `op_${index + 1}`,
        name: op.name || `Operation ${index + 1}`,
        icon: op.icon || undefined,
        landing: op.landing || '2026-08-16T19:00',
        serverSpeed: op.serverSpeed || 3,
        assignedAttackerIds: Array.isArray(op.assignedAttackerIds)
          ? op.assignedAttackerIds
          : raw.roster.attackers.map((a: any) => a.id),
        assignedTargetIds: Array.isArray(op.assignedTargetIds)
          ? op.assignedTargetIds
          : raw.roster.targets.map((t: any) => t.id),
        fakeTargetIds: Array.isArray(op.fakeTargetIds)
          ? op.fakeTargetIds
          : raw.roster.targets
              .filter((target: CompactTarget) => target.fake)
              .map((target: CompactTarget) => target.id)
              .filter((id: string) => !Array.isArray(op.assignedTargetIds) || op.assignedTargetIds.includes(id)),
        attackerUnitOverrides: op.attackerUnitOverrides && typeof op.attackerUnitOverrides === 'object'
          ? op.attackerUnitOverrides
          : undefined,
        createdAt: op.createdAt || Date.now(),
        updatedAt: op.updatedAt || Date.now(),
      })),
      updatedAt: raw.updatedAt || Date.now(),
    };
  }

  // If legacy TeamRoomData where operations had their own copies of attackers/targets:
  const legacyOps: any[] = Array.isArray(raw.operations) ? raw.operations : [];
  const masterAttackersMap = new Map<string, CompactAttacker>();
  const masterPlayersMap = new Map<string, CompactPlayer>();
  const masterTargetsMap = new Map<string, CompactTarget>();

  const convertedOps: OperationPlan[] = [];

  for (let i = 0; i < legacyOps.length; i++) {
    const op = legacyOps[i];
    const opId = op.id || `op_${i + 1}`;
    const opAttackers: CompactAttacker[] = Array.isArray(op.attackers) ? op.attackers : [];
    const opPlayers: CompactPlayer[] = Array.isArray(op.players) ? op.players : [];
    const opTargets: CompactTarget[] = Array.isArray(op.targets) ? op.targets : [];

    opAttackers.forEach((a) => {
      if (!masterAttackersMap.has(a.id)) {
        masterAttackersMap.set(a.id, a);
      }
    });

    opPlayers.forEach((p) => {
      if (!masterPlayersMap.has(p.id)) {
        masterPlayersMap.set(p.id, p);
      }
    });

    opTargets.forEach((t) => {
      if (!masterTargetsMap.has(t.id)) {
        masterTargetsMap.set(t.id, { ...t, fake: false });
      }
    });

    const opOverrides: Record<string, string> = {};
    opAttackers.forEach((a) => {
      if (a.unitRef) {
        opOverrides[a.id] = a.unitRef;
      }
    });

    convertedOps.push({
      id: opId,
      name: op.name || `Operation ${i + 1}`,
      icon: op.icon || undefined,
      landing: op.landing || '2026-08-16T19:00',
      serverSpeed: op.serverSpeed || 3,
      assignedAttackerIds: opAttackers.filter((a) => a.active !== false).map((a) => a.id),
      assignedTargetIds: opTargets.filter((t) => t.active !== false).map((t) => t.id),
      fakeTargetIds: opTargets.filter((t) => t.active !== false && t.fake).map((t) => t.id),
      attackerUnitOverrides: Object.keys(opOverrides).length > 0 ? opOverrides : undefined,
      createdAt: op.createdAt || Date.now(),
      updatedAt: op.updatedAt || Date.now(),
    });
  }

  if (convertedOps.length === 0) {
    convertedOps.push({
      id: 'op1',
      name: 'Operation 1',
      icon: '🎯',
      landing: '2026-08-16T19:00',
      serverSpeed: 3,
      assignedAttackerIds: Array.from(masterAttackersMap.keys()),
      assignedTargetIds: Array.from(masterTargetsMap.keys()),
      fakeTargetIds: Array.from(masterTargetsMap.keys()),
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
  }

  return {
    version: 2,
    roomName: raw.roomName || 'unnamed-room',
    activeOpId: raw.activeOpId || convertedOps[0].id,
    roster: {
      attackers: Array.from(masterAttackersMap.values()),
      players: Array.from(masterPlayersMap.values()),
      targets: Array.from(masterTargetsMap.values()),
      attackerPlayers: [],
    },
    operations: convertedOps,
    updatedAt: raw.updatedAt || Date.now(),
  };
}

/**
 * Losslessly merges cloud and local TeamRoomData during concurrent saves or live sync
 * into a single unified state without losing entities or waves.
 */
export function mergeTeamRoomData(cloud: TeamRoomData, local: TeamRoomData): TeamRoomData {
  // 1. Merge Master Attackers (Union by ID)
  const attackerMap = new Map<string, CompactAttacker>();
  cloud.roster.attackers.forEach((a) => attackerMap.set(a.id, a));
  local.roster.attackers.forEach((a) => attackerMap.set(a.id, a));

  // 1.5. Merge Master Attacker Players (Union by ID)
  const attackerPlayerMap = new Map<string, CompactPlayer>();
  (cloud.roster.attackerPlayers || []).forEach((ap) => attackerPlayerMap.set(ap.id, ap));
  (local.roster.attackerPlayers || []).forEach((ap) => attackerPlayerMap.set(ap.id, ap));

  // 2. Merge Master Players (Union by ID)
  const playerMap = new Map<string, CompactPlayer>();
  cloud.roster.players.forEach((p) => playerMap.set(p.id, p));
  local.roster.players.forEach((p) => playerMap.set(p.id, p));

  // 3. Merge Master Targets (Union by ID)
  const targetMap = new Map<string, CompactTarget>();
  cloud.roster.targets.forEach((t) => targetMap.set(t.id, t));
  local.roster.targets.forEach((t) => targetMap.set(t.id, t));

  // 4. Merge Operations (Union by ID, taking latest modified)
  const opMap = new Map<string, OperationPlan>();
  cloud.operations.forEach((op) => opMap.set(op.id, op));
  local.operations.forEach((op) => {
    const existing = opMap.get(op.id);
    if (!existing || (op.updatedAt || 0) >= (existing.updatedAt || 0)) {
      opMap.set(op.id, op);
    }
  });

  return {
    version: 2,
    roomName: local.roomName || cloud.roomName,
    activeOpId: local.activeOpId || cloud.activeOpId,
    roster: {
      attackers: Array.from(attackerMap.values()),
      players: Array.from(playerMap.values()),
      targets: Array.from(targetMap.values()),
      attackerPlayers: Array.from(attackerPlayerMap.values()),
    },
    operations: Array.from(opMap.values()),
    updatedAt: Date.now(),
  };
}

export type ImportMode = 'new_wave' | 'merge_only' | 'replace';

export interface ImportResult {
  roster: MasterRoster;
  operations: OperationPlan[];
  activeOpId: string | null;
  summary: {
    attackersAdded: number;
    attackersReused: number;
    playersAdded: number;
    playersReused: number;
    targetsAdded: number;
    targetsReused: number;
    createdWaveName?: string;
  };
}

/**
 * Imports a local or shared plan into the Master Roster and operations list.
 * Supports creating a new wave, merging into master roster, or full overwrite.
 */
export function importPlanIntoMasterRoster(
  currentRoster: MasterRoster,
  currentOperations: OperationPlan[],
  importedPlan: PlannerState,
  mode: ImportMode,
  customWaveName?: string,
): ImportResult {
  if (mode === 'replace') {
    const newWaveId = 'op_' + Date.now();
    const newWaveName = customWaveName?.trim() || 'Operation 1 (Imported)';
    const newOperations: OperationPlan[] = [
      {
        id: newWaveId,
        name: newWaveName,
        landing: importedPlan.landing,
        serverSpeed: importedPlan.serverSpeed,
        assignedAttackerIds: importedPlan.attackers.map((a) => a.id),
        assignedTargetIds: importedPlan.targets.map((t) => t.id),
        fakeTargetIds: importedPlan.targets.filter((t) => t.fake).map((t) => t.id),
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
    ];

    return {
      roster: {
        attackers: [...importedPlan.attackers],
        players: [...importedPlan.players],
        targets: importedPlan.targets.map((target) => ({ ...target, fake: false })),
        attackerPlayers: currentRoster.attackerPlayers ? [...currentRoster.attackerPlayers] : [],
      },
      operations: newOperations,
      activeOpId: newWaveId,
      summary: {
        attackersAdded: importedPlan.attackers.length,
        attackersReused: 0,
        playersAdded: importedPlan.players.length,
        playersReused: 0,
        targetsAdded: importedPlan.targets.length,
        targetsReused: 0,
        createdWaveName: newWaveName,
      },
    };
  }

  // Merge or New Wave
  const attackers: CompactAttacker[] = [...currentRoster.attackers];
  const players: CompactPlayer[] = [...currentRoster.players];
  const targets: CompactTarget[] = [...currentRoster.targets];

  let attackersAdded = 0;
  let attackersReused = 0;
  let playersAdded = 0;
  let playersReused = 0;
  let targetsAdded = 0;
  let targetsReused = 0;

  const attackerIdMap = new Map<string, string>();
  const playerIdMap = new Map<string, string>();
  const targetIdMap = new Map<string, string>();

  // 1. Process Attacking Armies
  importedPlan.attackers.forEach((impAtk, idx) => {
    const existing = attackers.find(
      (a) =>
        a.x === impAtk.x &&
        a.y === impAtk.y &&
        (a.name || '').trim().toLowerCase() === (impAtk.name || '').trim().toLowerCase(),
    );

    if (existing) {
      attackerIdMap.set(impAtk.id, existing.id);
      attackersReused++;
    } else {
      let uniqueId = impAtk.id || `a_${Date.now()}_${idx + 1}`;
      if (attackers.some((a) => a.id === uniqueId)) {
        uniqueId = `a_${Date.now()}_${idx + 1}`;
      }
      const newAtk: CompactAttacker = {
        ...impAtk,
        id: uniqueId,
      };
      attackers.push(newAtk);
      attackerIdMap.set(impAtk.id, uniqueId);
      attackersAdded++;
    }
  });

  // 2. Process Defender Player Accounts
  importedPlan.players.forEach((impPlayer, idx) => {
    const existing = players.find(
      (p) => (p.name || '').trim().toLowerCase() === (impPlayer.name || '').trim().toLowerCase(),
    );

    if (existing) {
      playerIdMap.set(impPlayer.id, existing.id);
      playersReused++;
    } else {
      let uniqueId = impPlayer.id || `p_${Date.now()}_${idx + 1}`;
      if (players.some((p) => p.id === uniqueId)) {
        uniqueId = `p_${Date.now()}_${idx + 1}`;
      }
      const newPlayer: CompactPlayer = {
        ...impPlayer,
        id: uniqueId,
      };
      players.push(newPlayer);
      playerIdMap.set(impPlayer.id, uniqueId);
      playersAdded++;
    }
  });

  // Fallback default player if none exist
  if (players.length === 0) {
    players.push({
      id: 'p1',
      name: 'Defender 1',
      safeEnabled: true,
      safeStart: '22:00',
      safeEnd: '04:00',
    });
  }

  // 3. Process Target Villages
  importedPlan.targets.forEach((impTgt, idx) => {
    const mappedPlayerId = impTgt.playerId
      ? (playerIdMap.get(impTgt.playerId) || players[0]?.id || 'p1')
      : (players[0]?.id || 'p1');

    const existing = targets.find(
      (t) =>
        t.x === impTgt.x &&
        t.y === impTgt.y &&
        (t.name || '').trim().toLowerCase() === (impTgt.name || '').trim().toLowerCase(),
    );

    if (existing) {
      targetIdMap.set(impTgt.id, existing.id);
      targetsReused++;
    } else {
      let uniqueId = impTgt.id || `t_${Date.now()}_${idx + 1}`;
      if (targets.some((t) => t.id === uniqueId)) {
        uniqueId = `t_${Date.now()}_${idx + 1}`;
      }
      const newTgt: CompactTarget = {
        ...impTgt,
        id: uniqueId,
        playerId: mappedPlayerId,
        fake: false,
      };
      targets.push(newTgt);
      targetIdMap.set(impTgt.id, uniqueId);
      targetsAdded++;
    }
  });

  const updatedRoster: MasterRoster = {
    attackers,
    players,
    targets,
    attackerPlayers: currentRoster.attackerPlayers ? [...currentRoster.attackerPlayers] : [],
  };

  if (mode === 'new_wave') {
    const newWaveId = 'op_' + Date.now();
    const newWaveName = customWaveName?.trim() || `Operation ${currentOperations.length + 1} (Imported)`;
    const rawAssignedAttackerIds = importedPlan.attackers
      .map((a) => attackerIdMap.get(a.id))
      .filter((id): id is string => Boolean(id));
    const assignedAttackerIds = rawAssignedAttackerIds.length > 0 ? rawAssignedAttackerIds : attackers.map((a) => a.id);
    const assignedTargetIds = importedPlan.targets
      .map((t) => targetIdMap.get(t.id))
      .filter((id): id is string => Boolean(id));

    const newWave: OperationPlan = {
      id: newWaveId,
      name: newWaveName,
      landing: importedPlan.landing,
      serverSpeed: importedPlan.serverSpeed,
      assignedAttackerIds,
      assignedTargetIds,
      fakeTargetIds: importedPlan.targets
        .filter((target) => target.fake)
        .map((target) => targetIdMap.get(target.id))
        .filter((id): id is string => Boolean(id)),
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    return {
      roster: updatedRoster,
      operations: [...currentOperations, newWave],
      activeOpId: newWaveId,
      summary: {
        attackersAdded,
        attackersReused,
        playersAdded,
        playersReused,
        targetsAdded,
        targetsReused,
        createdWaveName: newWaveName,
      },
    };
  }

  // mode === 'merge_only'
  return {
    roster: updatedRoster,
    operations: currentOperations,
    activeOpId: null,
    summary: {
      attackersAdded,
      attackersReused,
      playersAdded,
      playersReused,
      targetsAdded,
      targetsReused,
    },
  };
}

export interface ResolvedSafeTime extends CompactSafeTimeOwner {
  /** Player the window was inherited from, or undefined if it is the village's own. */
  sourceName?: string;
}

/**
 * Safe hours are an account-level setting in this game, so every village of a
 * player shares one window. A village assigned to a player therefore inherits
 * rather than overrides; only an unassigned one carries its own.
 */
export function resolveSafeTime(
  target: CompactSafeTimeOwner & { playerId?: string },
  players: Array<CompactSafeTimeOwner & { id: string; name: string }>,
): ResolvedSafeTime {
  const owner = target.playerId ? players.find((p) => p.id === target.playerId) : undefined;
  if (!owner) {
    return {
      safeEnabled: target.safeEnabled,
      safeStart: target.safeStart,
      safeEnd: target.safeEnd,
    };
  }
  return {
    safeEnabled: owner.safeEnabled,
    safeStart: owner.safeStart,
    safeEnd: owner.safeEnd,
    sourceName: owner.name,
  };
}

/** Encodes operation planner state into an ultra-compact, URL-safe delimited string. */
export function encodeCompactPlan(state: CompactPlannerState): string {
  const parts: string[] = [];
  const landingClean = state.landing || '2026-08-16T19:00';
  const speed = state.serverSpeed || 3;
  parts.push(`v1_${landingClean}_${speed}`);

  // `~` and `,` are the record and field delimiters; `&`, `#`, `=`, `?` and `%`
  // are URL structure. A name containing any of them would truncate or corrupt
  // the plan when the link is parsed back, so they collapse to a space — which
  // the `+` substitution below then carries safely through a URL.
  const sanitizeName = (raw: string, fallback: string) => {
    const clean = (raw || fallback).trim().replace(/[~,&#=?%+]/g, ' ');
    return clean.replace(/\s+/g, '+') || fallback;
  };

  for (const atk of state.attackers) {
    const cleanName = sanitizeName(atk.name, 'Attacker');
    const x = Number(atk.x) || 0;
    const y = Number(atk.y) || 0;
    const unit = atk.unitRef || 'embermark_dominion/emberblade';
    const art = atk.artifactMultiplier || 1;
    const banner = Math.min(20, Math.max(0, Number(atk.bannerfieldLevel) || 0));
    const safeOn = atk.safeEnabled ? 1 : 0;
    const sStart = atk.safeStart || '22:00';
    const sEnd = atk.safeEnd || '04:00';
    const active = atk.active === false ? 0 : 1;
    parts.push(`a:${cleanName},${x},${y},${unit},${art},${banner},${safeOn},${sStart}-${sEnd},${active}`);
  }

  // Players are emitted before the villages that reference them, and a village
  // stores its owner as a 1-based position in this list rather than an id, so
  // the reference costs one character.
  const players = state.players ?? [];
  for (const player of players) {
    const cleanName = sanitizeName(player.name, 'Player');
    const safeOn = player.safeEnabled ? 1 : 0;
    const sStart = player.safeStart || '22:00';
    const sEnd = player.safeEnd || '04:00';
    parts.push(`p:${cleanName},${safeOn},${sStart}-${sEnd}`);
  }

  for (const tgt of state.targets) {
    const cleanName = sanitizeName(tgt.name, 'Target');
    const x = Number(tgt.x) || 0;
    const y = Number(tgt.y) || 0;
    const safeOn = tgt.safeEnabled ? 1 : 0;
    const sStart = tgt.safeStart || '22:00';
    const sEnd = tgt.safeEnd || '04:00';
    const fake = tgt.fake ? 1 : 0;
    const ownerIndex = tgt.playerId ? players.findIndex((p) => p.id === tgt.playerId) + 1 : 0;
    const active = tgt.active === false ? 0 : 1;
    // `fake`, owner reference, and `active` are appended last, so a link written
    // before they existed still decodes — the fields simply read as absent.
    parts.push(`t:${cleanName},${x},${y},${safeOn},${sStart}-${sEnd},${fake},${ownerIndex},${active}`);
  }

  return parts.join('~');
}

/** Decodes an ultra-compact delimited string back into planner state. */
export function decodeCompactPlan(compactStr: string): CompactPlannerState | null {
  if (!compactStr || typeof compactStr !== 'string') return null;
  let str = compactStr;
  if (str.includes('%')) {
    try {
      str = decodeURIComponent(str);
    } catch {}
  }
  const segments = str.split('~');
  if (segments.length < 1) return null;

  const header = segments[0];
  const headerMatch = /^v1_([^_+]+)_(\d+)$/.exec(header);
  if (!headerMatch) return null;

  const landing = headerMatch[1];
  const serverSpeed = Number(headerMatch[2]) || 3;

  // Percent-decoding already happened once above, on the whole string. Doing it
  // again per field would decode a name that legitimately contains a percent
  // escape twice, so this only undoes the space substitution.
  const decodeField = (str: string) => (str || '').replace(/\+/g, ' ');

  const attackers: CompactAttacker[] = [];
  const targets: CompactTarget[] = [];
  const players: CompactPlayer[] = [];
  /** Villages hold a 1-based player position until every `p:` record is read. */
  const ownerIndexByTarget: number[] = [];

  const readWindow = (timesStr: string | undefined) => {
    let safeStart = '22:00';
    let safeEnd = '04:00';
    if (timesStr && timesStr.includes('-')) {
      const [s, e] = timesStr.split('-');
      if (s) safeStart = s;
      if (e) safeEnd = e;
    }
    return enforceMaxSafeWindow(safeStart, safeEnd, 'start');
  };

  for (let i = 1; i < segments.length; i++) {
    const seg = segments[i];
    if (seg.startsWith('a:')) {
      const body = seg.slice(2);
      const fields = body.split(',');
      const [name, xStr, yStr, unitRef, artStr, bannerStr, safeOnStr, timesStr, activeStr] = fields;
      const safeEnabled = safeOnStr === '1' || safeOnStr === 'true';
      let safeStart = '22:00';
      let safeEnd = '04:00';
      if (timesStr && timesStr.includes('-')) {
        const [s, e] = timesStr.split('-');
        if (s) safeStart = s;
        if (e) safeEnd = e;
      }
      const safe = enforceMaxSafeWindow(safeStart, safeEnd, 'start');
      const artNum = Number(artStr);
      const artifactMultiplier = artNum === 1.5 || artNum === 2 ? artNum : 1;
      const active = activeStr === undefined ? true : (activeStr === '1' || activeStr === 'true');

      attackers.push({
        id: `a${attackers.length + 1}`,
        name: decodeField(name) || `Attacker ${attackers.length + 1}`,
        x: Number(xStr) || 0,
        y: Number(yStr) || 0,
        unitRef: unitRef || 'embermark_dominion/emberblade',
        artifactMultiplier,
        bannerfieldLevel: Math.min(20, Math.max(0, Number(bannerStr) || 0)),
        safeEnabled,
        safeStart: safe.safeStart,
        safeEnd: safe.safeEnd,
        active,
      });
    } else if (seg.startsWith('t:')) {
      const body = seg.slice(2);
      const fields = body.split(',');
      const [name, xStr, yStr, safeOnStr, timesStr, fakeStr, ownerStr, activeStr] = fields;
      const safeEnabled = safeOnStr === '1' || safeOnStr === 'true';
      const safe = readWindow(timesStr);
      const active = activeStr === undefined ? true : (activeStr === '1' || activeStr === 'true');

      ownerIndexByTarget.push(Number(ownerStr) || 0);
      targets.push({
        id: `t${targets.length + 1}`,
        name: decodeField(name) || `Target ${targets.length + 1}`,
        x: Number(xStr) || 0,
        y: Number(yStr) || 0,
        fake: fakeStr === '1' || fakeStr === 'true',
        playerId: '',
        safeEnabled,
        safeStart: safe.safeStart,
        safeEnd: safe.safeEnd,
        active,
      });
    } else if (seg.startsWith('p:')) {
      const fields = seg.slice(2).split(',');
      const [name, safeOnStr, timesStr] = fields;
      const safe = readWindow(timesStr);

      players.push({
        id: `p${players.length + 1}`,
        name: decodeField(name) || `Player ${players.length + 1}`,
        safeEnabled: safeOnStr === '1' || safeOnStr === 'true',
        safeStart: safe.safeStart,
        safeEnd: safe.safeEnd,
      });
    }
  }

  // Resolved after the loop, because a village may be listed before its owner.
  targets.forEach((target, index) => {
    const owner = players[ownerIndexByTarget[index] - 1];
    target.playerId = owner ? owner.id : '';
  });

  return {
    landing,
    serverSpeed,
    attackers,
    targets,
    players,
  };
}

/**
 * Parses in-game Thronewake player profile clipboard or raw village list.
 * Extracts defender name, alliance, and all village names & coordinates.
 */
export function parseThronewakeProfileClipboard(rawText: string): PlannerState | null {
  const text = rawText.trim();
  if (!text) return null;

  // 1. Extract Player/Defender Name
  let playerName = '';
  const playerMatch = text.match(/(?:Player:|Defender:)\s*\n?\s*([^\n\r]+)/i);
  if (playerMatch && playerMatch[1]) {
    playerName = playerMatch[1].trim();
  }

  // If no explicit Player: label, check if first line looks like a player name
  if (!playerName) {
    const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    if (lines.length > 0 && !lines[0].toLowerCase().includes('village') && !lines[0].includes('(')) {
      playerName = lines[0];
    }
  }

  if (!playerName) {
    playerName = 'Defender';
  }

  const playerId = 'p_imp_' + Math.random().toString(36).slice(2, 7);
  const targets: CompactTarget[] = [];
  const lines = text.split(/\r?\n/);

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    // Ignore Wilder site lines
    if (line.toLowerCase().includes('wilder')) continue;

    // Match patterns like: "Byzantion (-8|-33)" or "Village Name (-8|-33)" or "Name\t(-8|-33)"
    const match = line.match(/^(?:Name\s+Population\s+Actions\s+)?(.*?)\s*\(\s*(-?\d+)\s*[|,\t]\s*(-?\d+)\s*\)/i);
    if (match) {
      let vName = match[1].replace(/^(?:Name|Actions|Population)\s*/i, '').trim();
      const x = parseInt(match[2], 10);
      const y = parseInt(match[3], 10);

      if (Number.isNaN(x) || Number.isNaN(y)) continue;
      if (x < -500 || x > 500 || y < -500 || y > 500) continue;

      if (!vName) {
        vName = `Village ${targets.length + 1}`;
      }

      targets.push({
        id: `t_imp_${targets.length + 1}_${Math.random().toString(36).slice(2, 6)}`,
        name: vName,
        x,
        y,
        fake: true, // Default to Fake
        playerId,
        safeEnabled: false,
        safeStart: '00:00',
        safeEnd: '00:00',
        active: true,
      });
    }
  }

  if (targets.length === 0) return null;

  return {
    landing: toUtcDatetimeInput(new Date()),
    serverSpeed: 3,
    attackers: [],
    targets,
    players: [
      {
        id: playerId,
        name: playerName,
        safeEnabled: false,
        safeStart: '00:00',
        safeEnd: '00:00',
      },
    ],
  };
}

export interface RoomBackupPackage {
  format: 'thronewake_room_backup_v2';
  version: 2;
  exportedAt: number;
  roomName: string;
  data: TeamRoomData;
}

/**
 * Creates a clean, human-readable JSON backup package of the entire team room.
 */
export function createRoomBackup(data: TeamRoomData): string {
  const pkg: RoomBackupPackage = {
    format: 'thronewake_room_backup_v2',
    version: 2,
    exportedAt: Date.now(),
    roomName: data.roomName || 'unnamed-room',
    data,
  };
  return JSON.stringify(pkg, null, 2);
}

/**
 * Validates and parses a room backup from JSON string or raw object text.
 * Accepts both wrapped RoomBackupPackage and raw TeamRoomData.
 */
export function parseRoomBackup(text: string): TeamRoomData | null {
  const trimmed = text.trim();
  if (!trimmed) return null;
  if (!trimmed.startsWith('{')) return null;

  try {
    const parsed = JSON.parse(trimmed) as unknown;
    if (!parsed || typeof parsed !== 'object') return null;

    const candidate = parsed as Record<string, unknown>;

    // Case 1: Wrapped RoomBackupPackage
    if (
      candidate.format === 'thronewake_room_backup_v2' &&
      candidate.data &&
      typeof candidate.data === 'object'
    ) {
      const roomData = candidate.data as TeamRoomData;
      if (
        roomData.roster &&
        Array.isArray(roomData.roster.attackers) &&
        Array.isArray(roomData.roster.targets) &&
        Array.isArray(roomData.operations)
      ) {
        return roomData;
      }
    }

    // Case 2: Direct TeamRoomData JSON
    if (
      (candidate.version === 2 || Array.isArray(candidate.operations)) &&
      candidate.roster &&
      typeof candidate.roster === 'object'
    ) {
      const roster = candidate.roster as Record<string, unknown>;
      if (Array.isArray(roster.attackers) && Array.isArray(roster.targets)) {
        return candidate as unknown as TeamRoomData;
      }
    }

    return null;
  } catch {
    return null;
  }
}

