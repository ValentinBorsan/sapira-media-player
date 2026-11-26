import type { MediaKind, MediaTrack, ScannedMediaFile } from '../types/media';

export const VIDEO_EXTS = new Set([
  'mp4',
  'mkv',
  'webm',
  'mov',
  'm4v',
  'avi',
  'flv',
  'wmv',
  'mpg',
  'mpeg',
  'm2ts',
  'mts',
  'ts',
  'vob',
  '3gp',
  'ogv',
  'asf',
  'divx',
  'rmvb',
]);

export const AUDIO_EXTS = new Set([
  'mp3',
  'flac',
  'wav',
  'ogg',
  'oga',
  'm4a',
  'aac',
  'opus',
  'wma',
  'aiff',
  'aif',
  'alac',
  'ape',
  'wv',
  'mka',
  'ac3',
  'dts',
  'amr',
]);

export const PLAYBACK_RATES = [0.5, 0.75, 1, 1.25, 1.5, 2] as const;

export function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
  const total = Math.floor(seconds);
  const hrs = Math.floor(total / 3600);
  const mins = Math.floor((total % 3600) / 60);
  const secs = total % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  if (hrs > 0) {
    return `${hrs}:${pad(mins)}:${pad(secs)}`;
  }
  return `${mins}:${pad(secs)}`;
}

export function formatFileSize(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return '';
  const units = ['B', 'KB', 'MB', 'GB'];
  let val = bytes;
  let idx = 0;
  while (val >= 1024 && idx < units.length - 1) {
    val /= 1024;
    idx += 1;
  }
  return `${val.toFixed(idx === 0 ? 0 : 1)} ${units[idx]}`;
}

export function inferMediaKind(filename: string, mimeType = ''): MediaKind | null {
  const cleanName = filename.split('?')[0].split('#')[0];
  const parts = cleanName.split('.');
  const ext = parts.length > 1 ? parts[parts.length - 1].toLowerCase() : '';
  if (ext === 'm3u8') return 'video';
  if (VIDEO_EXTS.has(ext)) return 'video';
  if (AUDIO_EXTS.has(ext)) return 'audio';
  if (mimeType.startsWith('video/')) return 'video';
  if (mimeType.startsWith('audio/')) return 'audio';
  return null;
}

function makeId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

const EXTERNAL_PLATFORM_RE =
  /(^|\.)(youtube\.com|youtu\.be|twitch\.tv|soundcloud\.com|vimeo\.com|dailymotion\.com|bandcamp\.com|tiktok\.com|twitter\.com|x\.com)$/i;

export function isExternalPlatformUrl(rawUrl?: string): boolean {
  if (!rawUrl) return false;
  try {
    const parsed = new URL(rawUrl.trim());
    if (!/^https?:$/i.test(parsed.protocol)) return false;
    const host = parsed.hostname.toLowerCase().replace(/^www\./, '');
    return EXTERNAL_PLATFORM_RE.test(host);
  } catch {
    return false;
  }
}

export function createTrackFromScanned(
  item: ScannedMediaFile & { sourceUrl?: string; artist?: string; coverUrl?: string }
): MediaTrack {
  const isRemote = /^https?:\/\//i.test(item.path);
  const url = isRemote
    ? item.path
    : window.sapira
      ? window.sapira.toMediaUrl(item.path)
      : `file://${encodeURI(item.path)}`;
  const sourceUrl =
    item.sourceUrl || (isRemote && isExternalPlatformUrl(item.path) ? item.path : undefined);
  return {
    id: makeId(),
    name: item.name,
    path: item.path,
    url,
    ext: item.ext,
    kind: item.kind,
    size: item.size,
    isRemote,
    sourceUrl,
    remoteArtist: item.artist,
    remoteCoverUrl: item.coverUrl,
  };
}

export function createTrackFromBrowserFile(file: File): MediaTrack | null {
  const kind = inferMediaKind(file.name, file.type);
  if (!kind) return null;
  const dotIdx = file.name.lastIndexOf('.');
  const name = dotIdx > 0 ? file.name.slice(0, dotIdx) : file.name;
  const ext = dotIdx > 0 ? file.name.slice(dotIdx + 1).toUpperCase() : kind.toUpperCase();
  return {
    id: makeId(),
    name,
    path: file.name,
    url: URL.createObjectURL(file),
    ext,
    kind,
    size: file.size,
    isObjectUrl: true,
  };
}

export function createTrackFromStreamUrl(
  rawUrl: string,
  customTitle?: string,
  forceKind?: MediaKind,
  extra?: {
    artist?: string;
    coverUrl?: string;
    forceHls?: boolean;
    sourceUrl?: string;
    resolvedAt?: number;
    muxKey?: string;
    muxCopyVideo?: boolean;
    duration?: number;
  }
): MediaTrack | null {
  const trimmed = rawUrl.trim();
  if (!/^https?:\/\//i.test(trimmed)) return null;
  try {
    const parsed = new URL(trimmed);
    const pathname = decodeURIComponent(parsed.pathname);
    const base = pathname.split('/').filter(Boolean).pop() || parsed.hostname;
    const dotIdx = base.lastIndexOf('.');
    const rawExt = dotIdx > 0 ? base.slice(dotIdx + 1).toLowerCase() : '';
    const isHls = Boolean(extra?.forceHls) || rawExt === 'm3u8' || /\.m3u8(\?|$)/i.test(trimmed);
    const inferred = forceKind || inferMediaKind(base) || 'video';
    const cleanSource = extra?.sourceUrl?.trim();
    const canonicalSource =
      cleanSource || (isExternalPlatformUrl(trimmed) ? trimmed : undefined);
    const ext = isHls
      ? 'HLS'
      : canonicalSource
        ? 'WEB'
        : rawExt
          ? rawExt.toUpperCase().slice(0, 5)
          : 'STREAM';
    const defaultName = dotIdx > 0 ? base.slice(0, dotIdx) : base;

    return {
      id: makeId(),
      name: customTitle?.trim() || defaultName || 'Network Stream',
      path: canonicalSource || trimmed,
      url: trimmed,
      ext,
      kind: inferred,
      size: 0,
      isRemote: true,
      isHls,
      sourceUrl: canonicalSource,
      resolvedAt: extra?.resolvedAt,
      muxKey: extra?.muxKey,
      muxCopyVideo: extra?.muxCopyVideo,
      remoteDuration: extra?.duration,
      remoteArtist: extra?.artist?.trim() || undefined,
      remoteCoverUrl: extra?.coverUrl?.trim() || undefined,
    };
  } catch {
    return null;
  }
}
