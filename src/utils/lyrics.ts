import type { LyricLine } from '../types/media';

const TIME_TAG_RE = /\[(\d{1,3}):(\d{2})(?:[.:](\d{1,3}))?\]/g;
const OFFSET_TAG_RE = /\[offset:\s*([+-]?\d+)\s*\]/i;

export function parseLrc(raw: string): { synced: boolean; lines: LyricLine[] } {
  const normalized = raw
    .replace(/^\uFEFF/, '')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n');

  let offsetSec = 0;
  const offsetMatch = OFFSET_TAG_RE.exec(normalized);
  if (offsetMatch) {
    offsetSec = Number.parseInt(offsetMatch[1], 10) / 1000;
  }

  const syncedLines: LyricLine[] = [];
  const plainLines: string[] = [];

  for (const rawLine of normalized.split('\n')) {
    const trimmed = rawLine.trim();
    if (!trimmed) continue;

    // Skip metadata tags like [ar:...], [ti:...], [al:...], [by:...]
    if (/^\[(ar|ti|al|au|by|length|re|ve|offset):/i.test(trimmed)) {
      continue;
    }

    const matches = Array.from(trimmed.matchAll(TIME_TAG_RE));
    if (matches.length > 0) {
      const text = trimmed.replace(TIME_TAG_RE, '').trim();
      for (const m of matches) {
        const mins = Number.parseInt(m[1], 10);
        const secs = Number.parseInt(m[2], 10);
        const fracRaw = m[3] || '0';
        const frac =
          Number.parseInt(fracRaw, 10) /
          (fracRaw.length === 1 ? 10 : fracRaw.length === 2 ? 100 : 1000);
        const time = Math.max(0, mins * 60 + secs + frac - offsetSec);
        if (text) {
          syncedLines.push({ time, text });
        }
      }
    } else if (!trimmed.startsWith('[')) {
      plainLines.push(trimmed);
    }
  }

  if (syncedLines.length > 0) {
    syncedLines.sort((a, b) => a.time - b.time);
    return { synced: true, lines: syncedLines };
  }

  return {
    synced: false,
    lines: plainLines.map((text, idx) => ({ time: idx, text })),
  };
}

export function findActiveLyricIndex(lines: LyricLine[], currentTime: number): number {
  if (lines.length === 0) return -1;
  let lo = 0;
  let hi = lines.length - 1;
  let ans = -1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (lines[mid].time <= currentTime + 0.12) {
      ans = mid;
      lo = mid + 1;
    } else {
      hi = mid - 1;
    }
  }
  return ans;
}

function cleanTrackQuery(raw: string): string {
  return raw
    .replace(/^\d{1,3}[\s._-]+/, '')
    .replace(/\((official|lyric|audio|video|hd|hq|remaster[^)]*)\)/gi, '')
    .replace(/\[(official|lyric|audio|video|hd|hq|remaster[^\]]*)\]/gi, '')
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export async function fetchOnlineLyrics(params: {
  title: string;
  artist?: string;
  album?: string;
  duration?: number;
}): Promise<{ synced: boolean; lines: LyricLine[]; sourceLabel: string } | null> {
  const cleanTitle = cleanTrackQuery(params.title);
  if (!cleanTitle) return null;

  try {
    // 1. Exact match if artist is known
    if (params.artist) {
      const q = new URLSearchParams({
        track_name: cleanTitle,
        artist_name: params.artist,
      });
      if (params.album) q.set('album_name', params.album);
      if (params.duration && Number.isFinite(params.duration) && params.duration > 0) {
        q.set('duration', String(Math.round(params.duration)));
      }
      const res = await fetch(`https://lrclib.net/api/get?${q.toString()}`);
      if (res.ok) {
        const data = (await res.json()) as {
          syncedLyrics?: string;
          plainLyrics?: string;
          trackName?: string;
          artistName?: string;
        };
        if (data.syncedLyrics) {
          const parsed = parseLrc(data.syncedLyrics);
          if (parsed.lines.length > 0) {
            return { ...parsed, sourceLabel: `${data.artistName || params.artist} — ${data.trackName || cleanTitle}` };
          }
        }
        if (data.plainLyrics) {
          const parsed = parseLrc(data.plainLyrics);
          if (parsed.lines.length > 0) {
            return { ...parsed, sourceLabel: `${data.artistName || params.artist} — ${data.trackName || cleanTitle}` };
          }
        }
      }
    }

    // 2. Fuzzy search fallback
    const searchQuery = params.artist ? `${params.artist} ${cleanTitle}` : cleanTitle;
    const res = await fetch(
      `https://lrclib.net/api/search?q=${encodeURIComponent(searchQuery)}`
    );
    if (!res.ok) return null;
    const results = (await res.json()) as Array<{
      syncedLyrics?: string;
      plainLyrics?: string;
      trackName?: string;
      artistName?: string;
    }>;
    if (!Array.isArray(results) || results.length === 0) return null;

    const bestSynced = results.find((r) => Boolean(r.syncedLyrics));
    const chosen = bestSynced || results.find((r) => Boolean(r.plainLyrics));
    if (!chosen) return null;

    const rawText = chosen.syncedLyrics || chosen.plainLyrics || '';
    const parsed = parseLrc(rawText);
    if (parsed.lines.length === 0) return null;

    return {
      ...parsed,
      sourceLabel: `${chosen.artistName || 'LRCLIB'} — ${chosen.trackName || cleanTitle}`,
    };
  } catch {
    return null;
  }
}
