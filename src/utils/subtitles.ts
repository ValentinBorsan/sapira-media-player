import type { SubtitleCue } from '../types/media';

function parseTimestamp(raw: string): number {
  const cleaned = raw.trim().replace(',', '.');
  const parts = cleaned.split(':').map((p) => Number.parseFloat(p));
  if (parts.some((n) => Number.isNaN(n))) return 0;
  if (parts.length === 3) {
    return parts[0] * 3600 + parts[1] * 60 + parts[2];
  }
  if (parts.length === 2) {
    return parts[0] * 60 + parts[1];
  }
  return parts[0] ?? 0;
}

function sanitizeCueText(raw: string): string {
  return raw
    .replace(/\\N/g, '\n')
    .replace(/\\n/g, '\n')
    .replace(/\\h/g, ' ')
    .replace(/<[^>]+>/g, '')
    .replace(/\{[^}]*\}/g, '')
    .trim();
}

function parseAssSubtitles(normalized: string): SubtitleCue[] {
  const lines = normalized.split('\n');
  const cues: SubtitleCue[] = [];
  let inEvents = false;
  let startIdx = 1;
  let endIdx = 2;
  let textIdx = 9;

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line || line.startsWith(';')) continue;
    if (/^\[events\]$/i.test(line)) {
      inEvents = true;
      continue;
    }
    if (line.startsWith('[') && line.endsWith(']')) {
      inEvents = false;
      continue;
    }
    if (!inEvents) continue;

    if (/^format\s*:/i.test(line)) {
      const cols = line
        .slice(line.indexOf(':') + 1)
        .split(',')
        .map((c) => c.trim().toLowerCase());
      const s = cols.indexOf('start');
      const e = cols.indexOf('end');
      const t = cols.indexOf('text');
      if (s !== -1) startIdx = s;
      if (e !== -1) endIdx = e;
      if (t !== -1) textIdx = t;
      continue;
    }

    if (/^dialogue\s*:/i.test(line)) {
      const payload = line.slice(line.indexOf(':') + 1);
      const parts: string[] = [];
      let cur = 0;
      for (let i = 0; i < textIdx; i++) {
        const comma = payload.indexOf(',', cur);
        if (comma === -1) break;
        parts.push(payload.slice(cur, comma).trim());
        cur = comma + 1;
      }
      parts.push(payload.slice(cur));
      if (parts.length > Math.max(startIdx, endIdx, textIdx)) {
        const start = parseTimestamp(parts[startIdx]);
        const end = parseTimestamp(parts[endIdx]);
        const text = sanitizeCueText(parts[textIdx]);
        if (end > start && text) {
          cues.push({ start, end, text });
        }
      }
    }
  }

  return cues.sort((a, b) => a.start - b.start);
}

function parseMicroDvdSubtitles(normalized: string, defaultFps = 23.976): SubtitleCue[] {
  const cues: SubtitleCue[] = [];
  const regex = /^\{(\d+)\}\{(\d+)\}(.+)$/;
  for (const rawLine of normalized.split('\n')) {
    const m = regex.exec(rawLine.trim());
    if (!m) continue;
    const startFrame = Number.parseInt(m[1], 10);
    const endFrame = Number.parseInt(m[2], 10);
    if (endFrame <= startFrame) continue;
    const text = sanitizeCueText(m[3].replace(/\|/g, '\n'));
    if (text) {
      cues.push({
        start: startFrame / defaultFps,
        end: endFrame / defaultFps,
        text,
      });
    }
  }
  return cues.sort((a, b) => a.start - b.start);
}

/**
 * Parses SRT, WebVTT, ASS/SSA (SubStation Alpha), and SUB (MicroDVD) subtitle formats.
 */
export function parseSubtitles(content: string): SubtitleCue[] {
  const normalized = content
    .replace(/^\uFEFF/, '')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n');

  if (/\[script info\]/i.test(normalized) || /^dialogue\s*:/im.test(normalized)) {
    return parseAssSubtitles(normalized);
  }

  if (/^\{\d+\}\{\d+\}/m.test(normalized)) {
    return parseMicroDvdSubtitles(normalized);
  }

  const blocks = normalized.split(/\n{2,}/);
  const cues: SubtitleCue[] = [];

  for (const block of blocks) {
    const lines = block
      .split('\n')
      .map((l) => l.trimEnd())
      .filter((l) => l.length > 0);

    if (lines.length === 0) continue;
    if (lines[0].startsWith('WEBVTT') || lines[0].startsWith('NOTE')) continue;

    const timeLineIdx = lines.findIndex((l) => l.includes('-->'));
    if (timeLineIdx === -1) continue;

    const timeLine = lines[timeLineIdx];
    const [startRaw, endRawWithSettings] = timeLine.split('-->');
    if (!startRaw || !endRawWithSettings) continue;

    const endRaw = endRawWithSettings.trim().split(/\s+/)[0];
    const start = parseTimestamp(startRaw);
    const end = parseTimestamp(endRaw);
    if (end <= start) continue;

    const text = lines
      .slice(timeLineIdx + 1)
      .map(sanitizeCueText)
      .filter(Boolean)
      .join('\n');

    if (text) {
      cues.push({ start, end, text });
    }
  }

  return cues.sort((a, b) => a.start - b.start);
}

export function findActiveCue(
  cues: SubtitleCue[],
  currentTime: number,
  offsetSeconds: number
): SubtitleCue | null {
  if (cues.length === 0) return null;
  const t = currentTime - offsetSeconds;
  let lo = 0;
  let hi = cues.length - 1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    const cue = cues[mid];
    if (t < cue.start) {
      hi = mid - 1;
    } else if (t > cue.end) {
      lo = mid + 1;
    } else {
      return cue;
    }
  }
  return null;
}
