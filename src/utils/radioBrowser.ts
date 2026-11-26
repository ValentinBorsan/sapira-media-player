import type { MediaKind } from '../types/media';

export interface RadioStationItem {
  id: string;
  name: string;
  url: string;
  country: string;
  tags: string;
  bitrate: number;
  favicon?: string;
  kind: MediaKind;
}

const MIRRORS = [
  'https://de1.api.radio-browser.info',
  'https://fi1.api.radio-browser.info',
  'https://at1.api.radio-browser.info',
];

export type RadioPresetFilter =
  | 'romania'
  | 'top'
  | 'chill'
  | 'jazz'
  | 'synthwave'
  | 'rock'
  | 'classical';

async function fetchRadioJson(endpointPath: string): Promise<unknown[]> {
  for (const host of MIRRORS) {
    try {
      const controller = new AbortController();
      const timer = window.setTimeout(() => controller.abort(), 5000);
      const res = await fetch(`${host}${endpointPath}`, {
        signal: controller.signal,
      });
      window.clearTimeout(timer);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) return data;
      }
    } catch {
      // Try next mirror
    }
  }
  return [];
}

function normalizeStations(rawList: unknown[]): RadioStationItem[] {
  const seen = new Set<string>();
  const out: RadioStationItem[] = [];

  for (const raw of rawList) {
    const r = raw as Record<string, unknown>;
    const url = String(r.url_resolved || r.url || '').trim();
    const name = String(r.name || '').trim();
    if (!url || !name || !/^https?:\/\//i.test(url)) continue;
    if (seen.has(url)) continue;
    seen.add(url);

    out.push({
      id: String(r.stationuuid || url),
      name,
      url,
      country: String(r.countrycode || r.country || '').toUpperCase(),
      tags: String(r.tags || '')
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
        .slice(0, 3)
        .join(' · '),
      bitrate: Number(r.bitrate || 0),
      favicon: typeof r.favicon === 'string' && r.favicon.startsWith('http') ? r.favicon : undefined,
      kind: 'audio',
    });
  }
  return out;
}

export async function searchRadioStations(params: {
  query?: string;
  preset?: RadioPresetFilter;
}): Promise<RadioStationItem[]> {
  const q = new URLSearchParams({
    hidebroken: 'true',
    is_https: 'true',
    order: 'clickcount',
    reverse: 'true',
    limit: '35',
  });

  if (params.query && params.query.trim()) {
    q.set('name', params.query.trim());
  } else if (params.preset === 'romania') {
    q.set('countrycode', 'RO');
  } else if (params.preset && params.preset !== 'top') {
    q.set('tag', params.preset);
  }

  const raw = await fetchRadioJson(`/json/stations/search?${q.toString()}`);
  return normalizeStations(raw);
}

const FAVORITE_STREAMS_KEY = 'sapira.favorite.streams.v1';

export function loadFavoriteStreams(): RadioStationItem[] {
  try {
    const raw = localStorage.getItem(FAVORITE_STREAMS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as RadioStationItem[]) : [];
  } catch {
    return [];
  }
}

export function saveFavoriteStreams(items: RadioStationItem[]): void {
  try {
    localStorage.setItem(FAVORITE_STREAMS_KEY, JSON.stringify(items));
  } catch {
    // Ignore storage quota errors
  }
}

export function toggleFavoriteStream(
  prev: RadioStationItem[],
  station: RadioStationItem
): RadioStationItem[] {
  const exists = prev.some((s) => s.url === station.url);
  const next = exists
    ? prev.filter((s) => s.url !== station.url)
    : [station, ...prev];
  saveFavoriteStreams(next);
  return next;
}
