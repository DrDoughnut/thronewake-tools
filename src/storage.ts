export const StorageKeys = {
  ARMY_STATE: 'thronewake.army.state',
  UNITS_STATE: 'thronewake.units.state',
  BUILDINGS_STATE: 'thronewake.buildings.state',
  LAST_TOOL: 'thronewake.lastTool',
  CP_OPTIMIZER: 'thronewake.cp.state',
  LOCAL_TIME: 'thronewake.showLocalTime',
  TEAMROOM_SESSION: 'thronewake.teamroom.session',
  V2_UNLOCKED: 'thronewake.v2.unlocked',
} as const;

export function loadStoredJson<T>(key: string, fallback: T): T {
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function saveStoredJson<T>(key: string, value: T): void {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {}
}
