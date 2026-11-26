import type { MediaKind, MediaTrack } from '../types/media';

export interface StoredTrackRef {
  path: string;
  name: string;
  ext: string;
  kind: MediaKind;
  size: number;
  sourceUrl?: string;
  artist?: string;
  coverUrl?: string;
}

export interface SavedPlaylist {
  id: string;
  name: string;
  createdAt: number;
  tracks: StoredTrackRef[];
}

const PLAYLISTS_KEY = 'sapira.playlists.v1';

export function makePlaylistId(): string {
  return `pl-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

export function trackToStoredRef(track: MediaTrack): StoredTrackRef {
  return {
    path: track.sourceUrl || track.path,
    name: track.name,
    ext: track.ext,
    kind: track.kind,
    size: track.size,
    sourceUrl: track.sourceUrl,
    artist: track.remoteArtist,
    coverUrl: track.remoteCoverUrl,
  };
}

export function loadPlaylists(): SavedPlaylist[] {
  try {
    const raw = localStorage.getItem(PLAYLISTS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as SavedPlaylist[]) : [];
  } catch {
    return [];
  }
}

export function savePlaylists(playlists: SavedPlaylist[]): void {
  try {
    localStorage.setItem(PLAYLISTS_KEY, JSON.stringify(playlists));
  } catch {
    // Ignore storage quota errors
  }
}
