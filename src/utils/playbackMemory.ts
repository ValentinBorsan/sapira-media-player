const STORAGE_KEY = 'sapira.playback.positions.v1';
const MAX_ENTRIES = 120;

interface SavedPosition {
  time: number;
  updatedAt: number;
}

type PositionMap = Record<string, SavedPosition>;

function readMap(): PositionMap {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return typeof parsed === 'object' && parsed !== null ? (parsed as PositionMap) : {};
  } catch {
    return {};
  }
}

function writeMap(map: PositionMap): void {
  try {
    const entries = Object.entries(map);
    if (entries.length > MAX_ENTRIES) {
      entries.sort((a, b) => b[1].updatedAt - a[1].updatedAt);
      const trimmed = Object.fromEntries(entries.slice(0, MAX_ENTRIES));
      localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
      return;
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
  } catch {
    // Ignore storage quota errors
  }
}

export function getSavedPosition(trackPath: string): number | null {
  const map = readMap();
  const entry = map[trackPath];
  if (!entry || !Number.isFinite(entry.time) || entry.time < 5) return null;
  return entry.time;
}

export function savePlaybackPosition(trackPath: string, time: number, duration: number): void {
  if (!trackPath || !Number.isFinite(time) || !Number.isFinite(duration) || duration <= 20) {
    return;
  }
  const map = readMap();
  // Clear position if near beginning (<5s) or effectively finished (within last 10s or >96%)
  if (time < 5 || duration - time < 10 || time / duration > 0.96) {
    if (map[trackPath]) {
      delete map[trackPath];
      writeMap(map);
    }
    return;
  }
  map[trackPath] = { time, updatedAt: Date.now() };
  writeMap(map);
}

export function clearPlaybackPosition(trackPath: string): void {
  if (!trackPath) return;
  const map = readMap();
  if (map[trackPath]) {
    delete map[trackPath];
    writeMap(map);
  }
}

export function clearAllPlaybackPositions(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Ignore
  }
}
