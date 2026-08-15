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
  landAttacker: boolean;
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
    landAttacker: isInSafeWindow(land, attacker),
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
