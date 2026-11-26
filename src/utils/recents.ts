import type { MediaKind } from '../types/media';

export interface RecentMediaEntry {
  path: string;
  url?: string;
  sourceUrl?: string;
  artist?: string;
  coverUrl?: string;
  name: string;
  ext: string;
  kind: MediaKind;
  size: number;
  isRemote?: boolean;
  playedAt: number;
}

const RECENTS_KEY = 'sapira.recents.v1';
const MAX_RECENTS = 30;

export function loadRecents(): RecentMediaEntry[] {
  try {
    const raw = localStorage.getItem(RECENTS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as RecentMediaEntry[]) : [];
  } catch {
    return [];
  }
}

export function saveRecents(items: RecentMediaEntry[]): void {
  try {
    localStorage.setItem(RECENTS_KEY, JSON.stringify(items.slice(0, MAX_RECENTS)));
  } catch {
    // Ignore storage quota errors
  }
}

export function pushRecentEntry(
  prev: RecentMediaEntry[],
  entry: Omit<RecentMediaEntry, 'playedAt'>
): RecentMediaEntry[] {
  const filtered = prev.filter((item) => item.path !== entry.path);
  const next: RecentMediaEntry[] = [
    { ...entry, playedAt: Date.now() },
    ...filtered,
  ].slice(0, MAX_RECENTS);
  saveRecents(next);
  return next;
}

export function clearRecents(): void {
  try {
    localStorage.removeItem(RECENTS_KEY);
  } catch {
    // Ignore
  }
}
