import { spawn, spawnSync, type ChildProcess } from 'node:child_process';
import fs from 'node:fs';
import http from 'node:http';
import crypto from 'node:crypto';
import path from 'node:path';

export interface ProbedAudioTrack {
  trackIndex: number;
  streamIndex: number;
  codec: string;
  channels: number;
  language?: string;
  title?: string;
}

export interface ProbedSubtitleTrack {
  trackIndex: number;
  streamIndex: number;
  codec: string;
  language?: string;
  title?: string;
}

export interface ProbedChapter {
  start: number;
  end: number;
  title: string;
}

export interface MediaProbeResult {
  ffmpegAvailable: boolean;
  duration: number;
  formatName?: string;
  bitRate?: number;
  videoCodec?: string;
  width?: number;
  height?: number;
  fps?: number;
  audioTracks: ProbedAudioTrack[];
  subtitleTracks: ProbedSubtitleTrack[];
  chapters: ProbedChapter[];
  needsTranscode: boolean;
  canCopyVideo: boolean;
}

const TEXT_SUB_CODECS = new Set([
  'subrip',
  'srt',
  'ass',
  'ssa',
  'webvtt',
  'mov_text',
  'text',
  'subviewer',
  'microdvd',
]);

const NATIVE_VIDEO_CODECS = new Set(['h264', 'vp8', 'vp9', 'av1', 'theora']);
const NATIVE_AUDIO_CODECS = new Set(['aac', 'mp3', 'opus', 'vorbis', 'flac', 'pcm_s16le', 'pcm_s24le', 'pcm_f32le']);

const FORCE_TRANSCODE_EXTS = new Set([
  '.avi',
  '.flv',
  '.wmv',
  '.mpg',
  '.mpeg',
  '.vob',
  '.m2ts',
  '.mts',
  '.ts',
  '.asf',
  '.divx',
  '.rmvb',
  '.3gp',
  '.wma',
  '.ape',
  '.wv',
  '.mka',
  '.ac3',
  '.dts',
  '.amr',
]);

let cachedFfmpegPath: string | null | undefined;
let cachedFfprobePath: string | null | undefined;
let serverPort = 0;
const sessionToken = crypto.randomBytes(16).toString('hex');
const activeFfmpegProcs = new Set<ChildProcess>();
let activeStreamKey = '';
let transcodeServer: http.Server | null = null;

export interface DualStreamSource {
  videoUrl: string;
  audioUrl: string;
  copyVideo: boolean;
  userAgent?: string;
}

const resolvedStreams = new Set<string>();
const resolvedDualStreams = new Map<string, DualStreamSource>();

export function registerResolvedStream(source: string): void {
  if (!/^https?:\/\//i.test(source)) return;
  resolvedStreams.delete(source);
  resolvedStreams.add(source);
  if (resolvedStreams.size > 128) {
    const oldest = resolvedStreams.values().next().value;
    if (oldest) resolvedStreams.delete(oldest);
  }
}

export function registerResolvedDualStream(source: DualStreamSource): string {
  const key = `mux://${crypto.randomBytes(12).toString('hex')}`;
  resolvedDualStreams.set(key, source);
  if (resolvedDualStreams.size > 64) {
    const oldest = resolvedDualStreams.keys().next().value;
    if (oldest) resolvedDualStreams.delete(oldest);
  }
  return key;
}

export function isResolvedStream(source: string): boolean {
  return resolvedStreams.has(source) || resolvedDualStreams.has(source);
}


function findBinary(name: 'ffmpeg' | 'ffprobe'): string | null {
  const isWin = process.platform === 'win32';
  const binName = isWin ? `${name}.exe` : name;

  const candidates: string[] = [];
  if (process.resourcesPath) {
    candidates.push(path.join(process.resourcesPath, binName));
    candidates.push(path.join(process.resourcesPath, 'bin', binName));
  }
  if (!isWin) {
    candidates.push(
      `/opt/homebrew/bin/${binName}`,
      `/usr/local/bin/${binName}`,
      `/usr/bin/${binName}`
    );
  } else {
    candidates.push(
      `C:\\ffmpeg\\bin\\${binName}`,
      path.join(process.env.LOCALAPPDATA || '', 'Microsoft', 'WinGet', 'Links', binName)
    );
  }

  for (const candidate of candidates) {
    if (candidate && fs.existsSync(candidate)) {
      return candidate;
    }
  }

  try {
    const cmd = isWin ? 'where' : 'which';
    const res = spawnSync(cmd, [binName], { encoding: 'utf8', timeout: 2500 });
    if (res.status === 0 && res.stdout) {
      const first = res.stdout.split(/\r?\n/)[0]?.trim();
      if (first && fs.existsSync(first)) return first;
    }
  } catch {
    // Ignore
  }
  return null;
}

export function getFfmpegPath(): string | null {
  if (cachedFfmpegPath === undefined) {
    cachedFfmpegPath = findBinary('ffmpeg');
  }
  return cachedFfmpegPath;
}

export function getFfprobePath(): string | null {
  if (cachedFfprobePath === undefined) {
    cachedFfprobePath = findBinary('ffprobe');
  }
  return cachedFfprobePath;
}

export async function probeMediaFile(filePath: string): Promise<MediaProbeResult> {
  const ffmpeg = getFfmpegPath();
  const ffprobe = getFfprobePath();
  const ext = path.extname(filePath).toLowerCase();

  const fallback: MediaProbeResult = {
    ffmpegAvailable: Boolean(ffmpeg),
    duration: 0,
    audioTracks: [],
    subtitleTracks: [],
    chapters: [],
    needsTranscode: Boolean(ffmpeg && FORCE_TRANSCODE_EXTS.has(ext)),
    canCopyVideo: false,
  };

  if (!ffprobe || !fs.existsSync(filePath)) {
    return fallback;
  }

  return new Promise((resolve) => {
    const proc = spawn(ffprobe, [
      '-v',
      'quiet',
      '-print_format',
      'json',
      '-show_format',
      '-show_streams',
      '-show_chapters',
      filePath,
    ]);

    let stdout = '';
    proc.stdout.on('data', (chunk) => {
      stdout += String(chunk);
    });

    proc.on('error', () => resolve(fallback));
    proc.on('close', (code) => {
      if (code !== 0 || !stdout) {
        resolve(fallback);
        return;
      }
      try {
        const parsed = JSON.parse(stdout);
        const streams: Array<Record<string, unknown>> = Array.isArray(parsed.streams)
          ? parsed.streams
          : [];
        const fmt: Record<string, unknown> = parsed.format ?? {};

        const duration = Number.parseFloat(String(fmt.duration ?? '0')) || 0;
        const bitRate = Number.parseInt(String(fmt.bit_rate ?? '0'), 10) || undefined;
        const formatName = typeof fmt.format_name === 'string' ? fmt.format_name : undefined;

        let videoCodec: string | undefined;
        let width: number | undefined;
        let height: number | undefined;
        let fps: number | undefined;
        let pixelFormat: string | undefined;

        const audioTracks: ProbedAudioTrack[] = [];
        const subtitleTracks: ProbedSubtitleTrack[] = [];

        for (const s of streams) {
          const codecType = String(s.codec_type ?? '');
          const codecName = String(s.codec_name ?? '').toLowerCase();
          const streamIndex = Number(s.index ?? 0);
          const tags = (s.tags as Record<string, string> | undefined) ?? {};

          if (codecType === 'video' && !videoCodec && s.disposition && !(s.disposition as Record<string, number>).attached_pic) {
            videoCodec = codecName;
            width = Number(s.width) || undefined;
            height = Number(s.height) || undefined;
            pixelFormat = typeof s.pix_fmt === 'string' ? s.pix_fmt : undefined;
            if (typeof s.r_frame_rate === 'string' && s.r_frame_rate.includes('/')) {
              const [num, den] = s.r_frame_rate.split('/').map(Number);
              if (num > 0 && den > 0) fps = Math.round((num / den) * 100) / 100;
            }
          } else if (codecType === 'audio') {
            audioTracks.push({
              trackIndex: audioTracks.length,
              streamIndex,
              codec: codecName,
              channels: Number(s.channels ?? 2),
              language: tags.language || tags.LANGUAGE,
              title: tags.title || tags.TITLE,
            });
          } else if (codecType === 'subtitle' && TEXT_SUB_CODECS.has(codecName)) {
            subtitleTracks.push({
              trackIndex: subtitleTracks.length,
              streamIndex,
              codec: codecName,
              language: tags.language || tags.LANGUAGE,
              title: tags.title || tags.TITLE,
            });
          }
        }

        const primaryAudio = audioTracks[0];
        const videoUnsupported = Boolean(videoCodec && !NATIVE_VIDEO_CODECS.has(videoCodec));
        const audioUnsupported = Boolean(primaryAudio && !NATIVE_AUDIO_CODECS.has(primaryAudio.codec));
        const containerUnsupported = FORCE_TRANSCODE_EXTS.has(ext);
        const canCopyVideo = Boolean(
          videoCodec === 'h264' && (!pixelFormat || pixelFormat === 'yuv420p')
        );

        const rawChapters: Array<Record<string, unknown>> = Array.isArray(parsed.chapters)
          ? parsed.chapters
          : [];
        const chapters: ProbedChapter[] = rawChapters
          .map((ch, idx) => {
            const start = Number.parseFloat(String(ch.start_time ?? '0')) || 0;
            const end = Number.parseFloat(String(ch.end_time ?? '0')) || 0;
            const tags = (ch.tags as Record<string, string> | undefined) ?? {};
            const title = tags.title || tags.TITLE || `Chapter ${idx + 1}`;
            return { start, end, title };
          })
          .filter((ch) => ch.end > ch.start);

        resolve({
          ffmpegAvailable: Boolean(ffmpeg),
          duration,
          formatName,
          bitRate,
          videoCodec,
          width,
          height,
          fps,
          audioTracks,
          subtitleTracks,
          chapters,
          needsTranscode: Boolean(
            ffmpeg && (containerUnsupported || videoUnsupported || audioUnsupported)
          ),
          canCopyVideo,
        });
      } catch {
        resolve(fallback);
      }
    });
  });
}

export async function extractEmbeddedSubtitle(
  filePath: string,
  subTrackIndex: number
): Promise<string | null> {
  const ffmpeg = getFfmpegPath();
  if (!ffmpeg || !fs.existsSync(filePath)) return null;

  return new Promise((resolve) => {
    const proc = spawn(ffmpeg, [
      '-v',
      'error',
      '-i',
      filePath,
      '-map',
      `0:s:${subTrackIndex}`,
      '-f',
      'srt',
      '-',
    ]);

    let out = '';
    proc.stdout.on('data', (chunk) => {
      out += String(chunk);
    });
    proc.on('error', () => resolve(null));
    proc.on('close', (code) => {
      resolve(code === 0 && out.trim().length > 0 ? out : null);
    });
  });
}

function killActiveFfmpeg() {
  for (const proc of activeFfmpegProcs) {
    try {
      proc.kill('SIGKILL');
    } catch {
      // Ignore
    }
  }
  activeFfmpegProcs.clear();
}

export function startTranscodeServer(): Promise<number> {
  if (transcodeServer && serverPort > 0) {
    return Promise.resolve(serverPort);
  }

  return new Promise((resolve) => {
    transcodeServer = http.createServer((req, res) => {
      try {
        const reqUrl = new URL(req.url || '/', `http://127.0.0.1:${serverPort}`);
        if (reqUrl.pathname !== '/stream' || reqUrl.searchParams.get('token') !== sessionToken) {
          res.writeHead(403);
          res.end('Forbidden');
          return;
        }

        const filePath = reqUrl.searchParams.get('path') || '';
        const kind = reqUrl.searchParams.get('kind') === 'audio' ? 'audio' : 'video';
        const startSec = Math.max(0, Number.parseFloat(reqUrl.searchParams.get('start') || '0') || 0);
        const audioIdx = Math.max(0, Number.parseInt(reqUrl.searchParams.get('audioIdx') || '0', 10) || 0);
        const copyVideo = reqUrl.searchParams.get('copyVideo') === '1';

        const ffmpeg = getFfmpegPath();
        const dual = resolvedDualStreams.get(filePath);
        const remote = Boolean(dual) || isResolvedStream(filePath);
        if (!ffmpeg || !filePath || (!remote && !fs.existsSync(filePath))) {
          res.writeHead(404);
          res.end('Not found');
          return;
        }

        if (req.method === 'HEAD') {
          res.writeHead(200, {
            'Content-Type': kind === 'audio' && !dual ? 'audio/mpeg' : 'video/mp4',
            'Cache-Control': 'no-store',
            'Access-Control-Allow-Origin': '*',
          });
          res.end();
          return;
        }

        const nextKey = `${filePath}|${startSec}|${audioIdx}|${kind}`;
        if (activeStreamKey !== nextKey) {
          killActiveFfmpeg();
          activeStreamKey = nextKey;
        }

        const ytHeaders = 'Referer: https://www.youtube.com/\r\nOrigin: https://www.youtube.com\r\n';
        const args: string[] = ['-v', 'error'];
        if (dual) {
          const buildNetArgs = () => {
            const netArgs = [
              '-protocol_whitelist',
              'http,https,tcp,tls,crypto',
              '-rw_timeout',
              '15000000',
              '-headers',
              ytHeaders,
            ];
            if (dual.userAgent) {
              netArgs.push('-user_agent', dual.userAgent);
            }
            return netArgs;
          };
          args.push(...buildNetArgs());
          if (startSec > 0) args.push('-ss', startSec.toFixed(2));
          args.push('-i', dual.videoUrl);
          args.push(...buildNetArgs());
          if (startSec > 0) args.push('-ss', startSec.toFixed(2));
          args.push('-i', dual.audioUrl);
        } else {
          if (startSec > 0) {
            args.push('-ss', startSec.toFixed(2));
          }
          if (remote) {
            args.push(
              '-protocol_whitelist',
              'http,https,tcp,tls,crypto',
              '-rw_timeout',
              '10000000',
              '-headers',
              ytHeaders
            );
          }
          args.push('-i', filePath);
        }

        if (kind === 'audio' && !dual) {
          args.push(
            '-vn',
            '-map',
            `0:a:${audioIdx}?`,
            '-c:a',
            'libmp3lame',
            '-b:a',
            '320k',
            '-f',
            'mp3',
            'pipe:1'
          );
          res.writeHead(200, {
            'Content-Type': 'audio/mpeg',
            'Cache-Control': 'no-store',
            'Access-Control-Allow-Origin': '*',
          });
        } else {
          if (dual) {
            args.push('-map', '0:v:0?', '-map', '1:a:0?');
          } else {
            args.push('-map', '0:v:0?', '-map', `0:a:${audioIdx}?`);
          }
          const shouldCopyVideo = dual ? dual.copyVideo && copyVideo : copyVideo;
          if (shouldCopyVideo) {
            args.push('-c:v', 'copy');
          } else {
            args.push(
              '-c:v',
              'libx264',
              '-preset',
              'ultrafast',
              '-crf',
              '20',
              '-pix_fmt',
              'yuv420p'
            );
          }
          args.push(
            '-c:a',
            'aac',
            '-b:a',
            '256k',
            '-ac',
            '2',
            '-movflags',
            'frag_keyframe+empty_moov+default_base_moof',
            '-f',
            'mp4',
            'pipe:1'
          );
          res.writeHead(200, {
            'Content-Type': 'video/mp4',
            'Cache-Control': 'no-store',
            'Access-Control-Allow-Origin': '*',
          });
        }

        const proc = spawn(ffmpeg, args, { stdio: ['ignore', 'pipe', 'ignore'] });
        activeFfmpegProcs.add(proc);

        proc.stdout.pipe(res);

        const cleanup = () => {
          activeFfmpegProcs.delete(proc);
          try {
            proc.kill('SIGKILL');
          } catch {
            // Ignore
          }
        };

        res.on('close', cleanup);
        proc.on('close', () => activeFfmpegProcs.delete(proc));
        proc.on('error', () => {
          if (!res.headersSent) res.writeHead(500);
          res.end();
        });
      } catch {
        if (!res.headersSent) res.writeHead(500);
        res.end();
      }
    });

    transcodeServer.listen(0, '127.0.0.1', () => {
      const addr = transcodeServer?.address();
      if (addr && typeof addr === 'object') {
        serverPort = addr.port;
      }
      resolve(serverPort);
    });
  });
}

export async function buildTranscodeStreamUrl(params: {
  filePath: string;
  kind: 'video' | 'audio';
  startSeconds?: number;
  audioTrackIndex?: number;
  copyVideo?: boolean;
}): Promise<string> {
  const port = await startTranscodeServer();
  const q = new URLSearchParams({
    token: sessionToken,
    path: params.filePath,
    kind: params.kind,
    start: String(params.startSeconds ?? 0),
    audioIdx: String(params.audioTrackIndex ?? 0),
    copyVideo: params.copyVideo ? '1' : '0',
    t: String(Date.now()),
  });
  return `http://127.0.0.1:${port}/stream?${q.toString()}`;
}

export function stopTranscodeEngine() {
  killActiveFfmpeg();
  if (transcodeServer) {
    transcodeServer.close();
    transcodeServer = null;
  }
}
