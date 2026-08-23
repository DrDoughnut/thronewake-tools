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
  /** Marks a diversion rather than a real hit. Display only. */
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
  activeOpId: string;
  operations: TeamOperation[];
  updatedAt: number;
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
