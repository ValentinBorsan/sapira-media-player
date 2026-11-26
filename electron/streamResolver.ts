import { spawn, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  buildTranscodeStreamUrl,
  getFfmpegPath,
  registerResolvedDualStream,
} from './ffmpegEngine';

export interface ResolvedExternalStream {
  ok: boolean;
  streamUrl?: string;
  muxKey?: string;
  copyVideo?: boolean;
  title?: string;
  artist?: string;
  thumbnail?: string;
  duration?: number;
  isHls?: boolean;
  kind?: 'video' | 'audio';
  missingYtDlp?: boolean;
  error?: string;
}

const WEB_PLATFORM_HOSTS = [
  'youtube.com',
  'youtu.be',
  'music.youtube.com',
  'twitch.tv',
  'soundcloud.com',
  'vimeo.com',
  'dailymotion.com',
  'bandcamp.com',
  'tiktok.com',
  'twitter.com',
  'x.com',
];

let cachedYtDlpPath: string | null | undefined;

export function findYtDlpPath(): string | null {
  if (cachedYtDlpPath !== undefined && cachedYtDlpPath !== null && fs.existsSync(cachedYtDlpPath)) {
    return cachedYtDlpPath;
  }

  const isWin = process.platform === 'win32';
  const binName = isWin ? 'yt-dlp.exe' : 'yt-dlp';
  const candidates: string[] = [];

  if (process.resourcesPath) {
    candidates.push(path.join(process.resourcesPath, binName));
    candidates.push(path.join(process.resourcesPath, 'bin', binName));
  }

  if (!isWin) {
    candidates.push(
      `/opt/homebrew/bin/${binName}`,
      `/usr/local/bin/${binName}`,
      path.join(os.homedir(), '.local', 'bin', binName),
      `/usr/bin/${binName}`
    );
  } else {
    candidates.push(
      path.join(process.env.LOCALAPPDATA || '', 'Microsoft', 'WinGet', 'Links', binName),
      `C:\\yt-dlp\\${binName}`
    );
  }

  for (const c of candidates) {
    if (c && fs.existsSync(c)) {
      cachedYtDlpPath = c;
      return c;
    }
  }

  try {
    const cmd = isWin ? 'where' : 'which';
    const res = spawnSync(cmd, [binName], { encoding: 'utf8', timeout: 2500 });
    if (res.status === 0 && res.stdout) {
      const first = res.stdout.split(/\r?\n/)[0]?.trim();
      if (first && fs.existsSync(first)) {
        cachedYtDlpPath = first;
        return first;
      }
    }
  } catch {
    // Ignore
  }

  cachedYtDlpPath = null;
  return null;
}

function buildSpawnPath(ytDlp: string): string {
  const home = os.homedir();
  const extra =
    process.platform === 'win32'
      ? [
          path.join(home, '.deno', 'bin'),
          path.join(process.env.LOCALAPPDATA || '', 'Microsoft', 'WinGet', 'Links'),
        ]
      : [
          '/opt/homebrew/bin',
          '/usr/local/bin',
          path.join(home, '.deno', 'bin'),
          path.join(home, '.local', 'bin'),
          '/usr/bin',
          '/bin',
        ];
  const parts = [path.dirname(ytDlp), ...extra, ...(process.env.PATH || '').split(path.delimiter)];
  return Array.from(new Set(parts.filter(Boolean))).join(path.delimiter);
}

function explainYtDlpError(stderr: string): string {
  const lines = stderr
    .trim()
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  const last = lines[lines.length - 1] || 'Unable to extract stream URL';
  if (/Requested format is not available/i.test(last)) {
    const install =
      process.platform === 'win32' ? 'winget install DenoLand.Deno' : 'brew install deno';
    return `${last} (Tip: ensure yt-dlp is up to date and a JS runtime is installed via "${install}")`;
  }
  return last;
}

export function isWebPlatformUrl(rawUrl: string): boolean {
  try {
    const u = new URL(rawUrl.trim());
    const host = u.hostname.toLowerCase().replace(/^www\./, '');
    return WEB_PLATFORM_HOSTS.some((h) => host === h || host.endsWith(`.${h}`));
  } catch {
    return false;
  }
}

interface YtDlpFormatEntry {
  url?: string;
  manifest_url?: string;
  vcodec?: string;
  acodec?: string;
  protocol?: string;
  http_headers?: Record<string, string>;
}

export async function resolveExternalStream(
  rawUrl: string,
  preferAudio = false
): Promise<ResolvedExternalStream> {
  const ytDlp = findYtDlpPath();
  if (!ytDlp) {
    return {
      ok: false,
      missingYtDlp: true,
      error:
        process.platform === 'win32'
          ? 'yt-dlp not found. Run: winget install yt-dlp'
          : 'yt-dlp not found. Run: brew install yt-dlp',
    };
  }

  // Normalize YouTube Mix URLs (watch?v=XYZ&list=RD...&start_radio=1) to clean watch?v=XYZ
  let targetUrl = rawUrl.trim();
  try {
    const parsedUrl = new URL(targetUrl);
    const host = parsedUrl.hostname.toLowerCase().replace(/^www\./, '');
    if ((host === 'youtube.com' || host === 'music.youtube.com') && parsedUrl.pathname === '/watch') {
      const vid = parsedUrl.searchParams.get('v');
      if (vid) {
        targetUrl = `https://www.youtube.com/watch?v=${encodeURIComponent(vid)}`;
      }
    }
  } catch {
    // Keep original URL
  }

  const hasFfmpeg = Boolean(getFfmpegPath());
  const formatSelector = preferAudio
    ? 'ba[ext=m4a][protocol^=http]/ba[ext=mp3][protocol^=http]/ba[protocol^=http]/ba/b*'
    : hasFfmpeg
      ? 'bv*[height<=1080][vcodec^=avc1]+ba[acodec^=mp4a]/b[ext=mp4][height<=1080][acodec!=none][vcodec!=none]/bv*[height<=1080]+ba/b[acodec!=none][vcodec!=none]/bv*+ba'
      : 'b[ext=mp4][acodec!=none][vcodec!=none]/b[acodec!=none][vcodec!=none]/b';

  return new Promise((resolve) => {
    const proc = spawn(
      ytDlp,
      [
        '--dump-single-json',
        '--no-playlist',
        '--no-warnings',
        '-f',
        formatSelector,
        targetUrl,
      ],
      {
        env: {
          ...process.env,
          PATH: buildSpawnPath(ytDlp),
        },
      }
    );

    let stdout = '';
    let stderr = '';

    proc.stdout.on('data', (chunk) => {
      stdout += String(chunk);
    });
    proc.stderr.on('data', (chunk) => {
      stderr += String(chunk);
    });

    proc.on('error', (err) => {
      resolve({ ok: false, error: err.message });
    });

    proc.on('close', async (code) => {
      if (code !== 0 || !stdout.trim()) {
        resolve({
          ok: false,
          error: explainYtDlpError(stderr),
        });
        return;
      }
      try {
        const info = JSON.parse(stdout) as {
          url?: string;
          manifest_url?: string;
          requested_formats?: YtDlpFormatEntry[];
          title?: string;
          uploader?: string;
          artist?: string;
          thumbnail?: string;
          duration?: number;
          protocol?: string;
          vcodec?: string;
          acodec?: string;
          http_headers?: Record<string, string>;
        };

        // Case 1: Dual separate DASH streams (video + audio) muxed via local FFmpeg server
        if (
          !preferAudio &&
          hasFfmpeg &&
          Array.isArray(info.requested_formats) &&
          info.requested_formats.length >= 2
        ) {
          const vFmt = info.requested_formats.find(
            (f) => f.vcodec && f.vcodec !== 'none' && (f.url || f.manifest_url)
          );
          const aFmt = info.requested_formats.find(
            (f) => f.acodec && f.acodec !== 'none' && (f.url || f.manifest_url)
          );
          const videoUrl = vFmt?.url || vFmt?.manifest_url;
          const audioUrl = aFmt?.url || aFmt?.manifest_url;

          if (videoUrl && audioUrl) {
            const copyVideo = Boolean(vFmt?.vcodec && /^(avc1|h264)/i.test(vFmt.vcodec));
            const userAgent =
              vFmt?.http_headers?.['User-Agent'] || info.http_headers?.['User-Agent'];
            const muxKey = registerResolvedDualStream({
              videoUrl,
              audioUrl,
              copyVideo,
              userAgent,
            });
            const localMuxUrl = await buildTranscodeStreamUrl({
              filePath: muxKey,
              kind: 'video',
              startSeconds: 0,
              copyVideo,
            });
            resolve({
              ok: true,
              streamUrl: localMuxUrl,
              muxKey,
              copyVideo,
              title: info.title,
              artist: info.artist || info.uploader,
              thumbnail: info.thumbnail,
              duration: info.duration,
              isHls: false,
              kind: 'video',
            });
            return;
          }
        }

        // Case 2: Single progressive or HLS stream URL
        const firstReq = info.requested_formats?.[0];
        const streamUrl = info.url || info.manifest_url || firstReq?.url || firstReq?.manifest_url;
        if (!streamUrl) {
          resolve({ ok: false, error: 'No playable stream URL returned' });
          return;
        }
        const proto = info.protocol || firstReq?.protocol || '';
        const vcodec = info.vcodec ?? firstReq?.vcodec;
        const isHls = Boolean(proto.includes('m3u8')) || /\.m3u8(\?|$)/i.test(streamUrl);
        const isAudioOnly =
          preferAudio || vcodec === 'none' || /soundcloud\.com/i.test(rawUrl);

        resolve({
          ok: true,
          streamUrl,
          title: info.title,
          artist: info.artist || info.uploader,
          thumbnail: info.thumbnail,
          duration: info.duration,
          isHls,
          kind: isAudioOnly ? 'audio' : 'video',
        });
      } catch {
        resolve({ ok: false, error: 'Failed to parse stream metadata' });
      }
    });
  });
}
