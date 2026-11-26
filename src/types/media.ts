export type MediaKind = 'video' | 'audio';
export type RepeatMode = 'off' | 'all' | 'one';
export type AspectMode = 'fit' | 'fill' | '16:9' | '21:9';
export type SubtitleSize = 'sm' | 'md' | 'lg';

export interface AudioMetadata {
  title?: string;
  artist?: string;
  album?: string;
  year?: string;
  coverDataUrl?: string;
}

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

export interface VideoAdjustments {
  brightness: number; // 50..150 (%)
  contrast: number;   // 50..150 (%)
  saturation: number; // 0..200 (%)
  zoom: number;       // 1..2 (x)
  rotation: 0 | 90 | 180 | 270;
  mirror: boolean;
  ambilight: boolean;
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

export interface AbLoopState {
  a: number | null;
  b: number | null;
}

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
  kind?: MediaKind;
  missingYtDlp?: boolean;
  error?: string;
}

export interface LyricLine {
  time: number;
  text: string;
}

export type SleepTimerOption = 0 | 15 | 30 | 45 | 60 | 'eot';

export interface SubtitleCue {
  start: number;
  end: number;
  text: string;
}

export interface SubtitleFilePayload {
  path: string;
  name: string;
  content: string;
}

export interface ScannedMediaFile {
  path: string;
  name: string;
  ext: string;
  kind: MediaKind;
  size: number;
}

export interface MediaTrack {
  id: string;
  name: string;
  path: string;
  url: string;
  ext: string;
  kind: MediaKind;
  size: number;
  isObjectUrl?: boolean;
  isRemote?: boolean;
  isHls?: boolean;
  sourceUrl?: string;
  resolvedAt?: number;
  muxKey?: string;
  muxCopyVideo?: boolean;
  remoteDuration?: number;
  remoteArtist?: string;
  remoteCoverUrl?: string;
}

export interface SapiraBridge {
  platform: string;
  openFiles: () => Promise<ScannedMediaFile[]>;
  openFolder: () => Promise<ScannedMediaFile[]>;
  inspectPaths: (paths: string[]) => Promise<ScannedMediaFile[]>;
  getPathForFile: (file: File) => string;
  toMediaUrl: (filePath: string) => string;
  probeMedia: (filePath: string) => Promise<MediaProbeResult>;
  getTranscodeUrl: (params: {
    filePath: string;
    kind: MediaKind;
    startSeconds?: number;
    audioTrackIndex?: number;
    copyVideo?: boolean;
  }) => Promise<string>;
  extractEmbeddedSubtitle: (
    filePath: string,
    subTrackIndex: number
  ) => Promise<string | null>;
  toggleFullscreen: () => Promise<boolean>;
  isFullscreen: () => Promise<boolean>;
  toggleAlwaysOnTop: () => Promise<boolean>;
  isAlwaysOnTop: () => Promise<boolean>;
  toggleMiniMode: () => Promise<boolean>;
  isMiniMode: () => Promise<boolean>;
  readAudioMetadata: (filePath: string) => Promise<AudioMetadata>;
  openSubtitle: () => Promise<SubtitleFilePayload | null>;
  findSubtitleForVideo: (videoPath: string) => Promise<SubtitleFilePayload | null>;
  readSubtitleFile: (filePath: string) => Promise<SubtitleFilePayload | null>;
  openLyrics: () => Promise<SubtitleFilePayload | null>;
  findLyricsForAudio: (audioPath: string) => Promise<SubtitleFilePayload | null>;
  readLyricsFile: (filePath: string) => Promise<SubtitleFilePayload | null>;
  saveScreenshot: (payload: {
    dataUrl: string;
    trackName: string;
    timestamp: string;
  }) => Promise<{ ok: boolean; filePath?: string }>;
  exportM3u: (payload: {
    name: string;
    paths: string[];
  }) => Promise<{ ok: boolean; filePath?: string }>;
  importM3u: () => Promise<{ name: string; items: ScannedMediaFile[] } | null>;
  minimize: () => Promise<void>;
  maximize: () => Promise<void>;
  close: () => Promise<void>;
  clipboardReadText: () => Promise<string>;
  clipboardWriteText: (text: string) => Promise<void>;
  checkYtDlp: () => Promise<boolean>;
  resolveExternalStream: (
    url: string,
    preferAudio?: boolean
  ) => Promise<ResolvedExternalStream>;
  onFullscreenChange: (callback: (isFullscreen: boolean) => void) => () => void;
  onOpenFiles: (callback: (items: ScannedMediaFile[]) => void) => () => void;
}

declare global {
  interface Window {
    sapira?: SapiraBridge;
  }
}
