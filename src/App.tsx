import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type Hls from 'hls.js';
import { AmbilightCanvas } from './components/AmbilightCanvas';
import { AudioStage } from './components/AudioStage';
import { CommandPalette } from './components/CommandPalette';
import { ContextMenu } from './components/ContextMenu';
import { EmptyStage } from './components/EmptyStage';
import { LyricsOverlay } from './components/LyricsOverlay';
import { MediaInfoModal } from './components/MediaInfoModal';
import { MiniPlayer } from './components/MiniPlayer';
import { PlayerControls } from './components/PlayerControls';
import { QueueDrawer } from './components/QueueDrawer';
import { SapiraLogo } from './components/SapiraLogo';
import { SettingsModal } from './components/SettingsModal';
import { ShortcutsModal } from './components/ShortcutsModal';
import { StreamModal, type StreamLaunchOptions } from './components/StreamModal';
import { TitleBar } from './components/TitleBar';
import type {
  AbLoopState,
  AspectMode,
  AudioMetadata,
  LyricLine,
  MediaProbeResult,
  MediaTrack,
  RepeatMode,
  ResolvedExternalStream,
  SleepTimerOption,
  SubtitleCue,
  SubtitleSize,
  VideoAdjustments,
} from './types/media';
import {
  EQ_BANDS,
  EQ_PRESETS,
  loadEqState,
  saveEqState,
  type EqPresetId,
  type EqState,
} from './utils/equalizer';
import {
  createTrackFromBrowserFile,
  createTrackFromScanned,
  createTrackFromStreamUrl,
  formatTime,
  isExternalPlatformUrl,
  PLAYBACK_RATES,
} from './utils/format';
import {
  clearAllPlaybackPositions,
  clearPlaybackPosition,
  getSavedPosition,
  savePlaybackPosition,
} from './utils/playbackMemory';
import {
  loadPlaylists,
  makePlaylistId,
  savePlaylists,
  trackToStoredRef,
  type SavedPlaylist,
  type StoredTrackRef,
} from './utils/playlists';
import {
  clearRecents,
  loadRecents,
  pushRecentEntry,
  type RecentMediaEntry,
} from './utils/recents';
import {
  DEFAULT_SETTINGS,
  loadSettings,
  saveSettings,
  type SapiraSettings,
} from './utils/settings';
import { findActiveCue, parseSubtitles } from './utils/subtitles';
import { fetchOnlineLyrics, findActiveLyricIndex, parseLrc } from './utils/lyrics';

interface OsdMessage {
  text: string;
  isError?: boolean;
  key: number;
}

const ASPECT_ORDER: AspectMode[] = ['fit', 'fill', '16:9', '21:9'];

const DEFAULT_VIDEO_FX: VideoAdjustments = {
  brightness: 100,
  contrast: 100,
  saturation: 100,
  zoom: 1,
  rotation: 0,
  mirror: false,
  ambilight: true,
};

export function App() {
  const mediaRef = useRef<HTMLVideoElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const subInputRef = useRef<HTMLInputElement | null>(null);
  const lrcInputRef = useRef<HTMLInputElement | null>(null);
  const hudTimerRef = useRef<number | null>(null);
  const osdTimerRef = useRef<number | null>(null);
  const lastSavedTimeRef = useRef<number>(0);
  const lastUiTimeUpdateRef = useRef<number>(0);
  const dragDepthRef = useRef(0);

  // Web Audio analyser + 200% Preamp Gain + 5-band EQ refs
  const audioCtxRef = useRef<AudioContext | null>(null);
  const preampGainRef = useRef<GainNode | null>(null);
  const eqFiltersRef = useRef<BiquadFilterNode[]>([]);
  const connectedElementRef = useRef<HTMLMediaElement | null>(null);
  const mediaSourceNodeRef = useRef<MediaElementAudioSourceNode | null>(null);
  const isRemoteTrackRef = useRef(false);
  const activeTrackIdRef = useRef<string | null>(null);
  const seekRequestIdRef = useRef(0);
  const [analyser, setAnalyser] = useState<AnalyserNode | null>(null);
  const [eqState, setEqState] = useState<EqState>(() => loadEqState());
  const [audioMeta, setAudioMeta] = useState<AudioMetadata>({});
  const [miniMode, setMiniMode] = useState(false);

  const [settings, setSettings] = useState<SapiraSettings>(() => loadSettings());
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [streamModalOpen, setStreamModalOpen] = useState(false);
  const [mediaInfoOpen, setMediaInfoOpen] = useState(false);
  const [contextMenuPos, setContextMenuPos] = useState<{ x: number; y: number } | null>(null);
  const [playlists, setPlaylists] = useState<SavedPlaylist[]>(() => loadPlaylists());
  const [recents, setRecents] = useState<RecentMediaEntry[]>(() => loadRecents());

  // Universal FFmpeg + HLS + A-B Loop state
  const hlsRef = useRef<Hls | null>(null);
  const transcodeFallbackTriedRef = useRef(false);
  const [probe, setProbe] = useState<MediaProbeResult | null>(null);
  const [isTranscoding, setIsTranscoding] = useState(false);
  const [transcodeOffset, setTranscodeOffset] = useState(0);
  const [selectedAudioTrack, setSelectedAudioTrack] = useState(0);
  const [abLoop, setAbLoop] = useState<AbLoopState>({ a: null, b: null });
  const [videoFx, setVideoFx] = useState<VideoAdjustments>(() => ({ ...DEFAULT_VIDEO_FX }));

  // Synchronized Lyrics + Sleep Timer state
  const [lyricsOpen, setLyricsOpen] = useState(false);
  const [lyricLines, setLyricLines] = useState<LyricLine[]>([]);
  const [lyricsSynced, setLyricsSynced] = useState(false);
  const [lyricsLoading, setLyricsLoading] = useState(false);
  const [lyricsSource, setLyricsSource] = useState<string | null>(null);

  const [sleepTimer, setSleepTimer] = useState<SleepTimerOption>(0);
  const [sleepDeadlineMs, setSleepDeadlineMs] = useState<number | null>(null);
  const [sleepRemainingSec, setSleepRemainingSec] = useState<number | null>(null);
  const [sleepFadeFactor, setSleepFadeFactor] = useState(1);

  const [queue, setQueue] = useState<MediaTrack[]>([]);
  const [currentIndex, setCurrentIndex] = useState<number>(-1);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [buffered, setBuffered] = useState(0);
  const [volume, setVolume] = useState(0.85);
  const [muted, setMuted] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(() => loadSettings().defaultPlaybackRate);
  const [shuffle, setShuffle] = useState(false);
  const [repeatMode, setRepeatMode] = useState<RepeatMode>('off');
  const [aspectMode, setAspectMode] = useState<AspectMode>(() => loadSettings().defaultAspectMode);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [alwaysOnTop, setAlwaysOnTop] = useState(false);
  const [hudVisible, setHudVisible] = useState(true);
  const [queueOpen, setQueueOpen] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [shutterKey, setShutterKey] = useState<number | null>(null);
  const [osd, setOsd] = useState<OsdMessage | null>(null);

  // Subtitles state
  const [subtitleCues, setSubtitleCues] = useState<SubtitleCue[]>([]);
  const [subtitleName, setSubtitleName] = useState<string | null>(null);
  const [subtitlesEnabled, setSubtitlesEnabled] = useState(true);
  const [subtitleSize, setSubtitleSize] = useState<SubtitleSize>(
    () => loadSettings().defaultSubtitleSize
  );
  const [subtitleOffset, setSubtitleOffset] = useState(0);

  const currentTrack = currentIndex >= 0 && currentIndex < queue.length ? queue[currentIndex] : null;
  const isVideoMode = currentTrack?.kind === 'video';
  isRemoteTrackRef.current = Boolean(currentTrack?.isRemote);
  activeTrackIdRef.current = currentTrack?.id ?? null;

  const activeCue = useMemo(() => {
    if (!isVideoMode || !subtitlesEnabled || subtitleCues.length === 0) return null;
    return findActiveCue(subtitleCues, currentTime, subtitleOffset);
  }, [isVideoMode, subtitlesEnabled, subtitleCues, currentTime, subtitleOffset]);

  const activeLyricIndex = useMemo(() => {
    if (isVideoMode || !lyricsSynced || lyricLines.length === 0) return -1;
    return findActiveLyricIndex(lyricLines, currentTime);
  }, [isVideoMode, lyricsSynced, lyricLines, currentTime]);

  const showOsd = useCallback(
    (text: string, isError = false) => {
      if (!isError && !settings.showOsd) return;
      setOsd({ text, isError, key: Date.now() });
      if (osdTimerRef.current) window.clearTimeout(osdTimerRef.current);
      osdTimerRef.current = window.setTimeout(() => {
        setOsd(null);
      }, isError ? 3200 : 1350);
    },
    [settings.showOsd]
  );

  const handleSettingChange = useCallback(
    <K extends keyof SapiraSettings>(key: K, value: SapiraSettings[K]) => {
      setSettings((prev) => {
        const next = { ...prev, [key]: value };
        saveSettings(next);
        return next;
      });
      if (key === 'defaultPlaybackRate') {
        setPlaybackRate(value as number);
      } else if (key === 'defaultAspectMode') {
        setAspectMode(value as AspectMode);
      } else if (key === 'defaultSubtitleSize') {
        setSubtitleSize(value as SubtitleSize);
      }
    },
    []
  );

  const handleResetSettings = useCallback(() => {
    const fresh = { ...DEFAULT_SETTINGS };
    setSettings(fresh);
    saveSettings(fresh);
    setPlaybackRate(fresh.defaultPlaybackRate);
    setAspectMode(fresh.defaultAspectMode);
    setSubtitleSize(fresh.defaultSubtitleSize);
    showOsd('Settings reset to defaults');
  }, [showOsd]);

  const handleClearResumeHistory = useCallback(() => {
    clearAllPlaybackPositions();
    showOsd('Resume history cleared');
  }, [showOsd]);

  const ensureAudioAnalyser = useCallback(() => {
    const el = mediaRef.current;
    // Never bind cross-origin / remote stream elements to Web Audio:
    // MediaElementAudioSourceNode zeroes audio output for non-CORS streams.
    if (!el || isRemoteTrackRef.current) return;

    if (connectedElementRef.current === el) {
      if (audioCtxRef.current?.state === 'suspended') {
        audioCtxRef.current.resume().catch(() => {});
      }
      return;
    }

    try {
      if (audioCtxRef.current && preampGainRef.current) {
        mediaSourceNodeRef.current?.disconnect();
        const source = audioCtxRef.current.createMediaElementSource(el);
        source.connect(preampGainRef.current);
        mediaSourceNodeRef.current = source;
        connectedElementRef.current = el;
        if (audioCtxRef.current.state === 'suspended') {
          audioCtxRef.current.resume().catch(() => {});
        }
        return;
      }

      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const source = ctx.createMediaElementSource(el);
      const preamp = ctx.createGain();
      preamp.gain.value = volume > 1 ? volume : 1;

      const filters = EQ_BANDS.map((band, idx) => {
        const filter = ctx.createBiquadFilter();
        filter.type = band.type;
        filter.frequency.value = band.freq;
        if (band.type === 'peaking') filter.Q.value = 1.1;
        filter.gain.value = eqState.enabled ? (eqState.gains[idx] ?? 0) : 0;
        return filter;
      });
      const node = ctx.createAnalyser();
      node.fftSize = 256;
      node.smoothingTimeConstant = 0.82;

      source.connect(preamp);
      let prev: AudioNode = preamp;
      for (const filter of filters) {
        prev.connect(filter);
        prev = filter;
      }
      prev.connect(node);
      node.connect(ctx.destination);

      audioCtxRef.current = ctx;
      preampGainRef.current = preamp;
      eqFiltersRef.current = filters;
      mediaSourceNodeRef.current = source;
      connectedElementRef.current = el;
      setAnalyser(node);
      if (ctx.state === 'suspended') {
        ctx.resume().catch(() => {});
      }
    } catch {
      // Fallback gracefully if Web Audio is unavailable
    }
  }, [eqState.enabled, eqState.gains, volume]);

  // Apply live EQ gains & persist state
  useEffect(() => {
    saveEqState(eqState);
    const filters = eqFiltersRef.current;
    if (filters.length === EQ_BANDS.length) {
      filters.forEach((f, idx) => {
        f.gain.value = eqState.enabled ? (eqState.gains[idx] ?? 0) : 0;
      });
    }
  }, [eqState]);

  const applySubtitlePayload = useCallback(
    (name: string, content: string, silent = false) => {
      const parsed = parseSubtitles(content);
      if (parsed.length === 0) {
        if (!silent) showOsd('No valid cues found in subtitle', true);
        return;
      }
      setSubtitleCues(parsed);
      setSubtitleName(name);
      setSubtitlesEnabled(true);
      setSubtitleOffset(0);
      if (!silent) showOsd(`Subtitles: ${name}`);
    },
    [showOsd]
  );

  const handleLoadSubtitle = useCallback(async () => {
    if (window.sapira) {
      const payload = await window.sapira.openSubtitle();
      if (payload) {
        applySubtitlePayload(payload.name, payload.content);
      }
      return;
    }
    subInputRef.current?.click();
  }, [applySubtitlePayload]);

  const handleBrowserSubtitleInput = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        const text = await file.text();
        applySubtitlePayload(file.name, text);
      }
      e.target.value = '';
    },
    [applySubtitlePayload]
  );

  const appendTracks = useCallback((newTracks: MediaTrack[], autoplayIfIdle = true) => {
    if (newTracks.length === 0) return;
    setQueue((prev) => {
      const wasEmpty = prev.length === 0;
      const next = [...prev, ...newTracks];
      if (wasEmpty && autoplayIfIdle) {
        setCurrentIndex(0);
      }
      return next;
    });
  }, []);

  const handleOpenFiles = useCallback(async () => {
    if (window.sapira) {
      const items = await window.sapira.openFiles();
      const tracks = items.map(createTrackFromScanned);
      if (tracks.length > 0) {
        appendTracks(tracks);
        showOsd(`Added ${tracks.length} ${tracks.length === 1 ? 'file' : 'files'}`);
      }
      return;
    }
    fileInputRef.current?.click();
  }, [appendTracks, showOsd]);

  const handleOpenFolder = useCallback(async () => {
    if (window.sapira) {
      const items = await window.sapira.openFolder();
      const tracks = items.map(createTrackFromScanned);
      if (tracks.length > 0) {
        appendTracks(tracks);
        showOsd(`Added ${tracks.length} ${tracks.length === 1 ? 'file' : 'files'}`);
      } else {
        showOsd('No supported media found in folder');
      }
      return;
    }
    fileInputRef.current?.click();
  }, [appendTracks, showOsd]);

  const handleBrowserFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files ?? []);
      const tracks = files
        .map(createTrackFromBrowserFile)
        .filter((t): t is MediaTrack => t !== null);
      if (tracks.length > 0) {
        appendTracks(tracks);
        showOsd(`Added ${tracks.length} ${tracks.length === 1 ? 'file' : 'files'}`);
      }
      e.target.value = '';
    },
    [appendTracks, showOsd]
  );

  // Sync Electron events (fullscreen, always-on-top & macOS open-file)
  useEffect(() => {
    if (!window.sapira) {
      const onFs = () => setIsFullscreen(Boolean(document.fullscreenElement));
      document.addEventListener('fullscreenchange', onFs);
      return () => document.removeEventListener('fullscreenchange', onFs);
    }

    window.sapira.isFullscreen().then(setIsFullscreen).catch(() => {});
    window.sapira.isAlwaysOnTop().then(setAlwaysOnTop).catch(() => {});
    const offFs = window.sapira.onFullscreenChange(setIsFullscreen);
    const offOpen = window.sapira.onOpenFiles((items) => {
      const tracks = items.map(createTrackFromScanned);
      appendTracks(tracks);
    });
    return () => {
      offFs();
      offOpen();
    };
  }, [appendTracks]);

  // Load track into unified media element + probe codecs, HLS, sidecar/embedded subtitles
  useEffect(() => {
    const el = mediaRef.current;
    if (!el) return;

    // Immediately stop any previous stream/media on this element so two streams never overlap
    if (hlsRef.current) {
      try {
        hlsRef.current.stopLoad();
        hlsRef.current.detachMedia();
      } catch {
        // Ignore
      }
      hlsRef.current.destroy();
      hlsRef.current = null;
    }
    el.pause();
    el.removeAttribute('src');
    el.load();

    setSubtitleCues([]);
    setSubtitleName(null);
    setSubtitleOffset(0);
    setLyricLines([]);
    setLyricsSynced(false);
    setLyricsSource(null);
    setLyricsLoading(false);
    setAudioMeta({});
    setProbe(null);
    setIsTranscoding(false);
    setTranscodeOffset(0);
    setSelectedAudioTrack(0);
    setAbLoop({ a: null, b: null });
    transcodeFallbackTriedRef.current = false;
    lastSavedTimeRef.current = 0;
    lastUiTimeUpdateRef.current = 0;

    // Invalidate any in-flight transcode seek requests from previous track
    seekRequestIdRef.current += 1;

    if (!currentTrack) {
      el.pause();
      el.removeAttribute('src');
      el.load();
      setIsPlaying(false);
      setCurrentTime(0);
      setDuration(0);
      setBuffered(0);
      return;
    }

    if (!currentTrack.isObjectUrl) {
      const canonicalPath = currentTrack.sourceUrl || currentTrack.path;
      setRecents((prev) =>
        pushRecentEntry(prev, {
          path: canonicalPath,
          url: currentTrack.sourceUrl ? undefined : currentTrack.url,
          sourceUrl: currentTrack.sourceUrl,
          artist: currentTrack.remoteArtist,
          coverUrl: currentTrack.remoteCoverUrl,
          name: currentTrack.name,
          ext: currentTrack.ext,
          kind: currentTrack.kind,
          size: currentTrack.size,
          isRemote: currentTrack.isRemote,
        })
      );
    }

    let cancelled = false;

    const startPlayback = async () => {
      el.playbackRate = playbackRate;
      el.volume = Math.max(0, Math.min(1, muted ? 0 : volume * sleepFadeFactor));
      el.muted = muted;

      let playUrl = currentTrack.url;
      let playIsHls = Boolean(currentTrack.isHls);
      let muxKey = currentTrack.muxKey;
      let muxCopyVideo = currentTrack.muxCopyVideo;
      let remoteDur = currentTrack.remoteDuration;
      let remoteArtist = currentTrack.remoteArtist;
      let remoteCover = currentTrack.remoteCoverUrl;
      let displayTitle = currentTrack.name;

      // Re-resolve expiring YouTube / SoundCloud / Twitch URLs when opened from Recents or Playlists
      const platformSource =
        currentTrack.sourceUrl ||
        (currentTrack.isRemote && isExternalPlatformUrl(currentTrack.path)
          ? currentTrack.path
          : undefined);
      const STREAM_TTL_MS = 45 * 60 * 1000;
      const needsFreshResolve =
        Boolean(platformSource) &&
        (!currentTrack.resolvedAt ||
          Date.now() - currentTrack.resolvedAt > STREAM_TTL_MS ||
          currentTrack.url === platformSource);

      if (platformSource && needsFreshResolve && window.sapira) {
        showOsd('Resolving stream…');
        const resolved: ResolvedExternalStream = await window.sapira
          .resolveExternalStream(platformSource, currentTrack.kind === 'audio')
          .catch((): ResolvedExternalStream => ({
            ok: false,
            error: 'Failed to resolve external link',
          }));
        if (cancelled) return;
        if (!resolved.ok || !resolved.streamUrl) {
          showOsd(resolved.error || 'Could not resolve stream link', true);
          setIsPlaying(false);
          return;
        }
        playUrl = resolved.streamUrl;
        playIsHls = Boolean(resolved.isHls);
        muxKey = resolved.muxKey;
        muxCopyVideo = resolved.copyVideo;
        remoteDur = resolved.duration ?? remoteDur;
        remoteArtist = resolved.artist || remoteArtist;
        remoteCover = resolved.thumbnail || remoteCover;
        if (resolved.title && (displayTitle === 'Network Stream' || displayTitle === 'Web Stream')) {
          displayTitle = resolved.title;
        }
        const now = Date.now();
        setQueue((prev) =>
          prev.map((t) =>
            t.id === currentTrack.id
              ? {
                  ...t,
                  name: displayTitle,
                  url: playUrl,
                  isHls: playIsHls,
                  sourceUrl: platformSource,
                  resolvedAt: now,
                  muxKey,
                  muxCopyVideo,
                  remoteDuration: remoteDur,
                  remoteArtist,
                  remoteCoverUrl: remoteCover,
                }
              : t
          )
        );
      }

      if (currentTrack.isRemote && (remoteArtist || remoteCover)) {
        setAudioMeta({
          title: displayTitle,
          artist: remoteArtist,
          coverDataUrl: remoteCover,
        });
      }

      if (currentTrack.isRemote && remoteDur && remoteDur > 0) {
        setDuration(remoteDur);
      }
      if (currentTrack.isRemote && muxKey) {
        setIsTranscoding(true);
        setTranscodeOffset(0);
      }

      // 1. Remote HLS (.m3u8) stream (lazy-loaded so startup bundle stays lean)
      if (playIsHls) {
        const { default: HlsLib } = await import('hls.js');
        if (cancelled) return;
        if (HlsLib.isSupported()) {
          const hls = new HlsLib({ enableWorker: true });
          hlsRef.current = hls;
          hls.loadSource(playUrl);
          hls.attachMedia(el);
          hls.on(HlsLib.Events.MANIFEST_PARSED, () => {
            if (!cancelled) {
              el.play().catch(() => setIsPlaying(false));
            }
          });
          hls.on(HlsLib.Events.ERROR, (_evt, data) => {
            if (data.fatal && !cancelled) {
              showOsd('HLS stream error', true);
            }
          });
          return;
        }
      }

      // 2. Local file in Electron: start native containers IMMEDIATELY (0ms wait)
      // and run ffprobe asynchronously in the background!
      const LEGACY_TRANSCODE_EXTS = new Set([
        'AVI', 'FLV', 'WMV', 'MPG', 'MPEG', 'VOB', 'M2TS', 'MTS', 'TS',
        'ASF', 'DIVX', 'RMVB', '3GP', 'WMA', 'APE', 'WV', 'MKA', 'AC3', 'DTS', 'AMR',
      ]);
      const isLocalElectronFile = Boolean(
        window.sapira && !currentTrack.isRemote && !currentTrack.isObjectUrl && currentTrack.path
      );
      const mustAwaitProbeBeforePlay =
        isLocalElectronFile && LEGACY_TRANSCODE_EXTS.has(currentTrack.ext.toUpperCase());

      // Ensure CORS mode is configured BEFORE setting el.src so Web Audio
      // MediaElementAudioSourceNode receives CORS-clean PCM samples under webSecurity: true
      const useAnonymousCors = !currentTrack.isRemote && !currentTrack.isObjectUrl;
      if (useAnonymousCors) {
        if (el.crossOrigin !== 'anonymous') {
          el.crossOrigin = 'anonymous';
        }
      } else if (el.crossOrigin !== null) {
        el.removeAttribute('crossorigin');
      }

      if (!currentTrack.isRemote) {
        ensureAudioAnalyser();
      }

      if (!mustAwaitProbeBeforePlay) {
        el.src = playUrl;
        el.load();
        el.play().catch(() => setIsPlaying(false));
      }

      let probeRes: MediaProbeResult | null = null;
      if (isLocalElectronFile && window.sapira) {
        try {
          probeRes = await window.sapira.probeMedia(currentTrack.path);
          if (cancelled) return;
          setProbe(probeRes);
          if (probeRes.duration > 0) {
            setDuration((prev) => (prev > 0 ? prev : probeRes!.duration));
          }
        } catch {
          // Ignore probe errors
        }
      }

      if (cancelled) return;

      if (probeRes?.needsTranscode && window.sapira && !transcodeFallbackTriedRef.current) {
        transcodeFallbackTriedRef.current = true;
        const resumePos =
          settings.autoResume && probeRes.duration > 20
            ? getSavedPosition(currentTrack.path) ?? 0
            : 0;
        const safeStart = resumePos > 0 && resumePos < probeRes.duration - 10 ? resumePos : 0;
        const streamUrl = await window.sapira.getTranscodeUrl({
          filePath: currentTrack.path,
          kind: currentTrack.kind,
          startSeconds: safeStart,
          audioTrackIndex: 0,
          copyVideo: probeRes.canCopyVideo,
        });
        if (cancelled) return;
        setIsTranscoding(true);
        setTranscodeOffset(safeStart);
        setCurrentTime(safeStart);
        el.src = streamUrl;
        el.load();
        el.play().catch(() => setIsPlaying(false));
        if (safeStart > 0) {
          showOsd(`Resumed at ${formatTime(safeStart)}`);
        }
      } else if (mustAwaitProbeBeforePlay) {
        el.src = playUrl;
        el.load();
        el.play().catch(() => setIsPlaying(false));
      }

      // 3. Subtitles (sidecar file priority, then embedded subtitle track!)
      if (currentTrack.kind === 'video' && settings.autoLoadSubtitles && window.sapira && !currentTrack.isRemote) {
        const sidecar = await window.sapira.findSubtitleForVideo(currentTrack.path).catch(() => null);
        if (cancelled) return;
        if (sidecar) {
          applySubtitlePayload(sidecar.name, sidecar.content, true);
        } else if (probeRes && probeRes.subtitleTracks.length > 0) {
          const firstSub = probeRes.subtitleTracks[0];
          const extracted = await window.sapira
            .extractEmbeddedSubtitle(currentTrack.path, firstSub.trackIndex)
            .catch(() => null);
          if (!cancelled && extracted) {
            const label =
              firstSub.title ||
              (firstSub.language ? `Embedded (${firstSub.language.toUpperCase()})` : 'Embedded Track #1');
            applySubtitlePayload(label, extracted, true);
          }
        }
      }

      // 4. Audio metadata, album art & automatic Lyrics (.lrc sidecar -> LRCLIB online!)
      if (currentTrack.kind === 'audio') {
        let resolvedMeta: AudioMetadata = {};
        if (window.sapira && !currentTrack.isRemote && currentTrack.path) {
          const meta = await window.sapira.readAudioMetadata(currentTrack.path).catch(() => null);
          if (!cancelled && meta) {
            resolvedMeta = meta;
            setAudioMeta(meta);
          }
          const sidecarLrc = await window.sapira
            .findLyricsForAudio(currentTrack.path)
            .catch(() => null);
          if (!cancelled && sidecarLrc) {
            const parsed = parseLrc(sidecarLrc.content);
            if (parsed.lines.length > 0) {
              setLyricLines(parsed.lines);
              setLyricsSynced(parsed.synced);
              setLyricsSource(sidecarLrc.name);
              return;
            }
          }
        }

        // Try open-source LRCLIB automatic lookup only when explicitly enabled by the user
        if (!cancelled && !currentTrack.isRemote && settings.autoFetchOnlineLyrics) {
          setLyricsLoading(true);
          const online = await fetchOnlineLyrics({
            title: resolvedMeta.title || currentTrack.name,
            artist: resolvedMeta.artist,
            album: resolvedMeta.album,
            duration: probeRes?.duration,
          });
          if (!cancelled) {
            setLyricsLoading(false);
            if (online && online.lines.length > 0) {
              setLyricLines(online.lines);
              setLyricsSynced(online.synced);
              setLyricsSource(online.sourceLabel);
            }
          }
        }
      }
    };

    startPlayback();

    return () => {
      cancelled = true;
      if (hlsRef.current) {
        try {
          hlsRef.current.stopLoad();
          hlsRef.current.detachMedia();
        } catch {
          // Ignore
        }
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
      try {
        el.pause();
        el.removeAttribute('src');
        el.load();
      } catch {
        // Ignore cleanup errors on detached element
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentTrack?.id]);

  // Persist position before window closes
  useEffect(() => {
    const onBeforeUnload = () => {
      const el = mediaRef.current;
      if (el && currentTrack && Number.isFinite(el.duration)) {
        savePlaybackPosition(currentTrack.path, el.currentTime, el.duration);
      }
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [currentTrack]);

  // Keep volume (0–200% boost + sleep fade-out), muted, playbackRate synced
  useEffect(() => {
    const el = mediaRef.current;
    if (!el) return;
    const effective = muted ? 0 : volume * sleepFadeFactor;
    el.volume = Math.max(0, Math.min(1, effective));
    el.muted = muted;
    if (preampGainRef.current) {
      preampGainRef.current.gain.value = effective > 1 ? effective : 1;
    }
  }, [volume, muted, sleepFadeFactor]);

  // Sleep Timer countdown & 10-second gentle audio fade-out
  useEffect(() => {
    if (!sleepDeadlineMs) {
      setSleepRemainingSec(null);
      setSleepFadeFactor(1);
      return;
    }
    const tick = () => {
      const remMs = sleepDeadlineMs - Date.now();
      if (remMs <= 0) {
        mediaRef.current?.pause();
        setSleepTimer(0);
        setSleepDeadlineMs(null);
        setSleepRemainingSec(null);
        setSleepFadeFactor(1);
        showOsd('Sleep Timer — Playback paused');
        return;
      }
      const remSec = Math.ceil(remMs / 1000);
      setSleepRemainingSec(remSec);
      if (remMs <= 10_000) {
        setSleepFadeFactor(Math.max(0.02, remMs / 10_000));
      } else {
        setSleepFadeFactor(1);
      }
    };
    tick();
    const id = window.setInterval(tick, 250);
    return () => window.clearInterval(id);
  }, [sleepDeadlineMs, showOsd]);

  useEffect(() => {
    const el = mediaRef.current;
    if (!el) return;
    el.playbackRate = playbackRate;
  }, [playbackRate]);

  // Auto-hide HUD in video mode while playing
  const bumpHud = useCallback(() => {
    setHudVisible(true);
    if (hudTimerRef.current) window.clearTimeout(hudTimerRef.current);
    if (
      isVideoMode &&
      isPlaying &&
      !queueOpen &&
      !shortcutsOpen &&
      !settingsOpen &&
      settings.hudHideDelayMs > 0
    ) {
      hudTimerRef.current = window.setTimeout(() => {
        setHudVisible(false);
      }, settings.hudHideDelayMs);
    }
  }, [isVideoMode, isPlaying, queueOpen, shortcutsOpen, settingsOpen, settings.hudHideDelayMs]);

  useEffect(() => {
    if (
      !isVideoMode ||
      !isPlaying ||
      queueOpen ||
      shortcutsOpen ||
      settingsOpen ||
      settings.hudHideDelayMs === 0
    ) {
      setHudVisible(true);
      if (hudTimerRef.current) window.clearTimeout(hudTimerRef.current);
      return;
    }
    bumpHud();
    return () => {
      if (hudTimerRef.current) window.clearTimeout(hudTimerRef.current);
    };
  }, [isVideoMode, isPlaying, queueOpen, shortcutsOpen, settingsOpen, settings.hudHideDelayMs, bumpHud]);

  const togglePlay = useCallback(() => {
    const el = mediaRef.current;
    if (!el || !currentTrack) return;
    if (!currentTrack.isRemote) {
      ensureAudioAnalyser();
    }
    if (el.paused) {
      el.play().catch(() => {});
      showOsd('Play');
    } else {
      el.pause();
      if (!currentTrack.isRemote && Number.isFinite(el.duration)) {
        savePlaybackPosition(currentTrack.path, el.currentTime, el.duration);
      }
      showOsd('Paused');
    }
  }, [currentTrack, ensureAudioAnalyser, showOsd]);

  const seekTranscodeStream = useCallback(
    async (targetTime: number, nextAudioTrackIdx?: number) => {
      const el = mediaRef.current;
      if (!el || !currentTrack || !window.sapira) return;
      const reqTrackId = currentTrack.id;
      const reqId = ++seekRequestIdRef.current;
      const totalDur = duration || probe?.duration || currentTrack.remoteDuration || 0;
      const clamped = totalDur > 0 ? Math.max(0, Math.min(totalDur - 0.5, targetTime)) : Math.max(0, targetTime);
      const audioIdx = nextAudioTrackIdx ?? selectedAudioTrack;
      const wasPaused = el.paused;
      const targetFilePath = currentTrack.muxKey || currentTrack.path;
      const canCopy = currentTrack.muxKey
        ? Boolean(currentTrack.muxCopyVideo)
        : Boolean(probe?.canCopyVideo);

      const streamUrl = await window.sapira.getTranscodeUrl({
        filePath: targetFilePath,
        kind: currentTrack.kind,
        startSeconds: clamped,
        audioTrackIndex: audioIdx,
        copyVideo: canCopy,
      });

      const latestEl = mediaRef.current;
      if (
        !latestEl ||
        !streamUrl ||
        reqId !== seekRequestIdRef.current ||
        activeTrackIdRef.current !== reqTrackId
      ) {
        return;
      }

      setIsTranscoding(true);
      setTranscodeOffset(clamped);
      setCurrentTime(clamped);
      latestEl.src = streamUrl;
      latestEl.playbackRate = playbackRate;
      latestEl.load();
      if (!wasPaused) {
        latestEl.play().catch(() => {});
      }
    },
    [currentTrack, duration, playbackRate, probe?.canCopyVideo, probe?.duration, selectedAudioTrack]
  );

  const handleSeek = useCallback(
    (time: number) => {
      const el = mediaRef.current;
      if (!el) return;
      if (isTranscoding) {
        seekTranscodeStream(time);
        return;
      }
      if (!Number.isFinite(el.duration)) return;
      const clamped = Math.max(0, Math.min(el.duration, time));
      el.currentTime = clamped;
      setCurrentTime(clamped);
    },
    [isTranscoding, seekTranscodeStream]
  );

  const handleSeekRelative = useCallback(
    (delta: number) => {
      const el = mediaRef.current;
      if (!el) return;
      if (isTranscoding) {
        const totalDur = duration || probe?.duration || 0;
        const nextT = Math.max(0, totalDur > 0 ? Math.min(totalDur - 0.5, currentTime + delta) : currentTime + delta);
        seekTranscodeStream(nextT);
        showOsd(`${delta > 0 ? '+' : ''}${delta}s`);
        return;
      }
      if (!Number.isFinite(el.duration)) return;
      const clamped = Math.max(0, Math.min(el.duration, el.currentTime + delta));
      el.currentTime = clamped;
      setCurrentTime(clamped);
      showOsd(`${delta > 0 ? '+' : ''}${delta}s`);
    },
    [currentTime, duration, isTranscoding, probe?.duration, seekTranscodeStream, showOsd]
  );

  const handleSelectAudioTrack = useCallback(
    async (audioIdx: number) => {
      setSelectedAudioTrack(audioIdx);
      await seekTranscodeStream(currentTime, audioIdx);
      showOsd(`Audio Track #${audioIdx + 1}`);
    },
    [currentTime, seekTranscodeStream, showOsd]
  );

  const handleSelectEmbeddedSubtitle = useCallback(
    async (subTrackIndex: number, label: string) => {
      if (!window.sapira || !currentTrack) return;
      showOsd(`Extracting ${label}…`);
      const content = await window.sapira.extractEmbeddedSubtitle(currentTrack.path, subTrackIndex);
      if (content) {
        applySubtitlePayload(label, content);
      } else {
        showOsd('Could not extract subtitle track', true);
      }
    },
    [applySubtitlePayload, currentTrack, showOsd]
  );

  const handleCycleAbLoop = useCallback(() => {
    setAbLoop((prev) => {
      if (prev.a === null) {
        showOsd(`Loop A: ${formatTime(currentTime)}`);
        return { a: currentTime, b: null };
      }
      if (prev.b === null) {
        if (currentTime <= prev.a + 0.5) {
          showOsd('Point B must be after Point A', true);
          return prev;
        }
        showOsd(`Loop A–B: ${formatTime(prev.a)} → ${formatTime(currentTime)}`);
        return { a: prev.a, b: currentTime };
      }
      showOsd('A–B Loop cleared');
      return { a: null, b: null };
    });
  }, [currentTime, showOsd]);

  const handleVideoFxChange = useCallback(
    <K extends keyof VideoAdjustments>(key: K, value: VideoAdjustments[K]) => {
      setVideoFx((prev) => ({ ...prev, [key]: value }));
    },
    []
  );

  const handleVideoFxReset = useCallback(() => {
    setVideoFx((prev) => ({ ...DEFAULT_VIDEO_FX, ambilight: prev.ambilight }));
    showOsd('Video adjustments reset');
  }, [showOsd]);

  const handleFrameStep = useCallback(
    (dir: -1 | 1) => {
      const el = mediaRef.current;
      if (!el || !isVideoMode) return;
      if (!el.paused) el.pause();
      const fps = probe?.fps && probe.fps > 0 ? probe.fps : 24;
      const stepSec = dir / fps;
      handleSeek(Math.max(0, currentTime + stepSec));
      showOsd(`Frame ${dir > 0 ? '+1' : '-1'} (${Math.round(fps)} fps)`);
    },
    [currentTime, handleSeek, isVideoMode, probe?.fps, showOsd]
  );

  const handleOpenStreamSubmit = useCallback(
    (opts: StreamLaunchOptions) => {
      const track = createTrackFromStreamUrl(opts.url, opts.title, opts.kind, {
        artist: opts.artist,
        coverUrl: opts.coverUrl,
        forceHls: opts.forceHls,
        sourceUrl: opts.sourceUrl,
        resolvedAt: opts.resolvedAt,
        muxKey: opts.muxKey,
        muxCopyVideo: opts.muxCopyVideo,
        duration: opts.duration,
      });
      if (!track) {
        showOsd('Invalid stream URL (use http:// or https://)', true);
        return;
      }
      setQueue((prev) => {
        const next = [...prev, track];
        setCurrentIndex(next.length - 1);
        return next;
      });
      showOsd(`Streaming: ${track.name}`);
    },
    [showOsd]
  );

  const handlePlayRecent = useCallback(
    (entry: RecentMediaEntry) => {
      const canonical = entry.sourceUrl || entry.path;
      const existingIdx = queue.findIndex((t) => (t.sourceUrl || t.path) === canonical);
      if (existingIdx !== -1) {
        setCurrentIndex(existingIdx);
        return;
      }
      const track = entry.isRemote
        ? createTrackFromStreamUrl(canonical, entry.name, entry.kind, {
            sourceUrl: entry.sourceUrl || (isExternalPlatformUrl(canonical) ? canonical : undefined),
            artist: entry.artist,
            coverUrl: entry.coverUrl,
          })
        : createTrackFromScanned({
            path: entry.path,
            name: entry.name,
            ext: entry.ext,
            kind: entry.kind,
            size: entry.size,
          });
      if (!track) return;
      setQueue((prev) => {
        const next = [...prev, track];
        setCurrentIndex(next.length - 1);
        return next;
      });
    },
    [queue]
  );

  const handleNext = useCallback(() => {
    if (queue.length === 0) return;
    if (shuffle && queue.length > 1) {
      let rand = currentIndex;
      while (rand === currentIndex) {
        rand = Math.floor(Math.random() * queue.length);
      }
      setCurrentIndex(rand);
      return;
    }
    if (currentIndex < queue.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else if (repeatMode === 'all') {
      setCurrentIndex(0);
    }
  }, [queue.length, shuffle, currentIndex, repeatMode]);

  const handlePrev = useCallback(() => {
    const el = mediaRef.current;
    if (el && el.currentTime > 3) {
      el.currentTime = 0;
      setCurrentTime(0);
      return;
    }
    if (queue.length === 0) return;
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    } else if (repeatMode === 'all') {
      setCurrentIndex(queue.length - 1);
    }
  }, [queue.length, currentIndex, repeatMode]);

  const handleEnded = useCallback(() => {
    const el = mediaRef.current;
    if (currentTrack) {
      clearPlaybackPosition(currentTrack.path);
    }
    if (sleepTimer === 'eot') {
      setSleepTimer(0);
      setIsPlaying(false);
      showOsd('Sleep Timer — Stopped at end of track');
      return;
    }
    if (repeatMode === 'one' && el) {
      el.currentTime = 0;
      el.play().catch(() => {});
      return;
    }
    if (shuffle && queue.length > 1) {
      handleNext();
      return;
    }
    if (currentIndex < queue.length - 1 || repeatMode === 'all') {
      handleNext();
    } else {
      setIsPlaying(false);
    }
  }, [currentTrack, sleepTimer, repeatMode, shuffle, queue.length, currentIndex, handleNext, showOsd]);

  const handleVolumeChange = useCallback(
    (nextVol: number) => {
      const clamped = Math.max(0, Math.min(2, Math.round(nextVol * 100) / 100));
      if (clamped > 1 && !currentTrack?.isRemote) {
        ensureAudioAnalyser();
      }
      setVolume(clamped);
      if (clamped > 0 && muted) setMuted(false);
      const pct = Math.round(clamped * 100);
      showOsd(pct > 100 ? `Volume Boost ${pct}%` : `Volume ${pct}%`);
    },
    [currentTrack?.isRemote, ensureAudioAnalyser, muted, showOsd]
  );

  const handleSelectSleepTimer = useCallback(
    (opt: SleepTimerOption) => {
      setSleepTimer(opt);
      if (opt === 0) {
        setSleepDeadlineMs(null);
        setSleepFadeFactor(1);
        showOsd('Sleep Timer Off');
      } else if (opt === 'eot') {
        setSleepDeadlineMs(null);
        setSleepFadeFactor(1);
        showOsd('Sleep Timer: End of Track');
      } else {
        setSleepDeadlineMs(Date.now() + opt * 60 * 1000);
        setSleepFadeFactor(1);
        showOsd(`Sleep Timer: ${opt} min`);
      }
    },
    [showOsd]
  );

  const handleLoadLyricsFile = useCallback(async () => {
    if (window.sapira) {
      const payload = await window.sapira.openLyrics();
      if (payload) {
        const parsed = parseLrc(payload.content);
        if (parsed.lines.length > 0) {
          setLyricLines(parsed.lines);
          setLyricsSynced(parsed.synced);
          setLyricsSource(payload.name);
          setLyricsOpen(true);
          showOsd(`Lyrics: ${payload.name}`);
        } else {
          showOsd('No lyrics found in file', true);
        }
      }
      return;
    }
    lrcInputRef.current?.click();
  }, [showOsd]);

  const handleBrowserLrcInput = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        const text = await file.text();
        const parsed = parseLrc(text);
        if (parsed.lines.length > 0) {
          setLyricLines(parsed.lines);
          setLyricsSynced(parsed.synced);
          setLyricsSource(file.name);
          setLyricsOpen(true);
          showOsd(`Lyrics: ${file.name}`);
        }
      }
      e.target.value = '';
    },
    [showOsd]
  );

  const handleSearchLyricsOnline = useCallback(async () => {
    if (!currentTrack) return;
    setLyricsOpen(true);
    setLyricsLoading(true);
    const res = await fetchOnlineLyrics({
      title: audioMeta.title || currentTrack.name,
      artist: audioMeta.artist,
      album: audioMeta.album,
      duration: duration || probe?.duration,
    });
    setLyricsLoading(false);
    if (res && res.lines.length > 0) {
      setLyricLines(res.lines);
      setLyricsSynced(res.synced);
      setLyricsSource(res.sourceLabel);
      showOsd('Synced lyrics loaded');
    } else {
      showOsd('No matching online lyrics found', true);
    }
  }, [audioMeta, currentTrack, duration, probe?.duration, showOsd]);

  const handleToggleMute = useCallback(() => {
    setMuted((prev) => {
      const next = !prev;
      showOsd(next ? 'Muted' : `Volume ${Math.round(volume * 100)}%`);
      return next;
    });
  }, [volume, showOsd]);

  const handleRateChange = useCallback(
    (rate: number) => {
      setPlaybackRate(rate);
      showOsd(`${rate}×`);
    },
    [showOsd]
  );

  const stepPlaybackRate = useCallback(
    (dir: -1 | 1) => {
      const idx = PLAYBACK_RATES.indexOf(playbackRate as (typeof PLAYBACK_RATES)[number]);
      const baseIdx = idx === -1 ? 2 : idx;
      const nextIdx = Math.max(0, Math.min(PLAYBACK_RATES.length - 1, baseIdx + dir));
      handleRateChange(PLAYBACK_RATES[nextIdx]);
    },
    [playbackRate, handleRateChange]
  );

  const handleToggleFullscreen = useCallback(async () => {
    if (window.sapira) {
      await window.sapira.toggleFullscreen();
      return;
    }
    if (!document.fullscreenElement) {
      await document.documentElement.requestFullscreen().catch(() => {});
    } else {
      await document.exitFullscreen().catch(() => {});
    }
  }, []);

  const handleToggleAlwaysOnTop = useCallback(async () => {
    if (!window.sapira) return;
    const next = await window.sapira.toggleAlwaysOnTop();
    setAlwaysOnTop(next);
    showOsd(next ? 'Pinned on top' : 'Unpinned');
  }, [showOsd]);

  const handleToggleMiniMode = useCallback(async () => {
    if (window.sapira) {
      const next = await window.sapira.toggleMiniMode();
      setMiniMode(next);
      if (next) {
        setQueueOpen(false);
        setShortcutsOpen(false);
      }
      return;
    }
    setMiniMode((prev) => !prev);
  }, []);

  const handleEqToggle = useCallback(() => {
    ensureAudioAnalyser();
    setEqState((prev) => {
      const next = { ...prev, enabled: !prev.enabled };
      showOsd(next.enabled ? `EQ On (${EQ_PRESETS[next.preset as Exclude<EqPresetId, 'custom'>]?.label ?? 'Custom'})` : 'EQ Bypassed');
      return next;
    });
  }, [ensureAudioAnalyser, showOsd]);

  const handleEqPreset = useCallback(
    (preset: Exclude<EqPresetId, 'custom'>) => {
      ensureAudioAnalyser();
      setEqState({
        enabled: true,
        preset,
        gains: [...EQ_PRESETS[preset].gains],
      });
      showOsd(`EQ: ${EQ_PRESETS[preset].label}`);
    },
    [ensureAudioAnalyser, showOsd]
  );

  const handleEqBandChange = useCallback(
    (index: number, gain: number) => {
      ensureAudioAnalyser();
      setEqState((prev) => {
        const nextGains = [...prev.gains];
        nextGains[index] = gain;
        return { enabled: true, preset: 'custom', gains: nextGains };
      });
    },
    [ensureAudioAnalyser]
  );

  // OS Media Controls & Now Playing (MediaSession API)
  useEffect(() => {
    if (!('mediaSession' in navigator)) return;
    const ms = navigator.mediaSession;

    if (!currentTrack) {
      ms.metadata = null;
      ms.playbackState = 'none';
      return;
    }

    const artworkSrc = audioMeta.coverDataUrl || new URL('./sapira-logo.png', window.location.href).href;
    ms.metadata = new MediaMetadata({
      title: audioMeta.title || currentTrack.name,
      artist: audioMeta.artist || 'Sapira Media Player',
      album: audioMeta.album || currentTrack.ext,
      artwork: [{ src: artworkSrc, sizes: '512x512', type: 'image/png' }],
    });
    ms.playbackState = isPlaying ? 'playing' : 'paused';

    const safeSetHandler = (
      action: MediaSessionAction,
      handler: MediaSessionActionHandler | null
    ) => {
      try {
        ms.setActionHandler(action, handler);
      } catch {
        // Unsupported action on platform
      }
    };

    safeSetHandler('play', () => {
      mediaRef.current?.play().catch(() => {});
    });
    safeSetHandler('pause', () => {
      mediaRef.current?.pause();
    });
    safeSetHandler('previoustrack', () => handlePrev());
    safeSetHandler('nexttrack', () => handleNext());
    safeSetHandler('seekbackward', () => handleSeekRelative(-10));
    safeSetHandler('seekforward', () => handleSeekRelative(10));
    safeSetHandler('seekto', (details) => {
      if (typeof details.seekTime === 'number') {
        handleSeek(details.seekTime);
      }
    });
  }, [
    currentTrack,
    audioMeta,
    isPlaying,
    handlePrev,
    handleNext,
    handleSeekRelative,
    handleSeek,
  ]);

  const handleCycleAspect = useCallback(() => {
    setAspectMode((prev) => {
      const idx = ASPECT_ORDER.indexOf(prev);
      const next = ASPECT_ORDER[(idx + 1) % ASPECT_ORDER.length];
      showOsd(`Aspect: ${next.toUpperCase()}`);
      return next;
    });
  }, [showOsd]);

  const handleTogglePip = useCallback(async () => {
    const el = mediaRef.current;
    if (!el || !isVideoMode) return;
    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
        showOsd('Exited PiP');
      } else if (document.pictureInPictureEnabled) {
        await el.requestPictureInPicture();
        showOsd('Picture-in-Picture');
      } else {
        showOsd('Picture-in-Picture unavailable', true);
      }
    } catch {
      showOsd('Unable to toggle Picture-in-Picture', true);
    }
  }, [isVideoMode, showOsd]);

  const handleScreenshot = useCallback(async () => {
    const el = mediaRef.current;
    if (!el || !isVideoMode || !currentTrack || el.videoWidth === 0) {
      showOsd('No video frame to capture', true);
      return;
    }
    try {
      const canvas = document.createElement('canvas');
      canvas.width = el.videoWidth;
      canvas.height = el.videoHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.drawImage(el, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL('image/png');

      setShutterKey(Date.now());
      window.setTimeout(() => setShutterKey(null), 320);

      if (window.sapira) {
        const res = await window.sapira.saveScreenshot({
          dataUrl,
          trackName: currentTrack.name,
          timestamp: formatTime(el.currentTime),
        });
        if (res.ok) {
          showOsd('Screenshot saved to Pictures/Sapira');
        } else {
          showOsd('Failed to save screenshot', true);
        }
      } else {
        const link = document.createElement('a');
        link.href = dataUrl;
        link.download = `Sapira_${currentTrack.name}_${formatTime(el.currentTime).replace(/:/g, '-')}.png`;
        link.click();
        showOsd('Screenshot downloaded');
      }
    } catch {
      showOsd('Failed to capture frame', true);
    }
  }, [isVideoMode, currentTrack, showOsd]);

  const handleToggleSubtitles = useCallback(() => {
    if (subtitleCues.length === 0) {
      handleLoadSubtitle();
      return;
    }
    setSubtitlesEnabled((prev) => {
      const next = !prev;
      showOsd(next ? 'Subtitles On' : 'Subtitles Off');
      return next;
    });
  }, [subtitleCues.length, handleLoadSubtitle, showOsd]);

  const handleSubtitleOffsetStep = useCallback(
    (delta: number) => {
      setSubtitleOffset((prev) => {
        const next = Math.round((prev + delta) * 10) / 10;
        showOsd(`Sub sync: ${next >= 0 ? '+' : ''}${next.toFixed(1)}s`);
        return next;
      });
    },
    [showOsd]
  );

  const handleRemoveTrack = useCallback((idx: number) => {
    setQueue((prev) => {
      const target = prev[idx];
      if (target?.isObjectUrl) URL.revokeObjectURL(target.url);
      const next = prev.filter((_, i) => i !== idx);
      setCurrentIndex((curr) => {
        if (next.length === 0) return -1;
        if (idx < curr) return curr - 1;
        if (idx === curr) return Math.min(curr, next.length - 1);
        return curr;
      });
      return next;
    });
  }, []);

  const handleClearQueue = useCallback(() => {
    setQueue((prev) => {
      prev.forEach((t) => {
        if (t.isObjectUrl) URL.revokeObjectURL(t.url);
      });
      return [];
    });
    setCurrentIndex(-1);
  }, []);

  const handleMoveTrack = useCallback((fromIndex: number, toIndex: number) => {
    setQueue((prev) => {
      if (
        fromIndex < 0 ||
        toIndex < 0 ||
        fromIndex >= prev.length ||
        toIndex >= prev.length ||
        fromIndex === toIndex
      ) {
        return prev;
      }
      const next = [...prev];
      const [moved] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, moved);
      return next;
    });
    setCurrentIndex((curr) => {
      if (curr === fromIndex) return toIndex;
      if (fromIndex < curr && toIndex >= curr) return curr - 1;
      if (fromIndex > curr && toIndex <= curr) return curr + 1;
      return curr;
    });
  }, []);

  // Persist playlists automatically
  useEffect(() => {
    savePlaylists(playlists);
  }, [playlists]);

  const handleCreatePlaylist = useCallback(
    (name: string, fromQueue = false): string => {
      const id = makePlaylistId();
      const tracks: StoredTrackRef[] = fromQueue ? queue.map(trackToStoredRef) : [];
      const created: SavedPlaylist = {
        id,
        name,
        createdAt: Date.now(),
        tracks,
      };
      setPlaylists((prev) => [created, ...prev]);
      showOsd(`Playlist "${name}" created`);
      return id;
    },
    [queue, showOsd]
  );

  const handleDeletePlaylist = useCallback(
    (id: string) => {
      setPlaylists((prev) => prev.filter((p) => p.id !== id));
      showOsd('Playlist deleted');
    },
    [showOsd]
  );

  const handleAddFilesToPlaylist = useCallback(
    async (playlistId: string) => {
      if (!window.sapira) {
        showOsd('Desktop file picker required for persistent playlists', true);
        return;
      }
      const items = await window.sapira.openFiles();
      if (items.length === 0) return;
      setPlaylists((prev) =>
        prev.map((pl) => {
          if (pl.id !== playlistId) return pl;
          const existingPaths = new Set(pl.tracks.map((t) => t.path));
          const uniqueNew = items.filter((item) => !existingPaths.has(item.path));
          return { ...pl, tracks: [...pl.tracks, ...uniqueNew] };
        })
      );
      showOsd(`Added ${items.length} ${items.length === 1 ? 'item' : 'items'} to playlist`);
    },
    [showOsd]
  );

  const handleAddFolderToPlaylist = useCallback(
    async (playlistId: string) => {
      if (!window.sapira) {
        showOsd('Desktop folder picker required for persistent playlists', true);
        return;
      }
      const items = await window.sapira.openFolder();
      if (items.length === 0) {
        showOsd('No supported media found in folder');
        return;
      }
      setPlaylists((prev) =>
        prev.map((pl) => {
          if (pl.id !== playlistId) return pl;
          const existingPaths = new Set(pl.tracks.map((t) => t.path));
          const uniqueNew = items.filter((item) => !existingPaths.has(item.path));
          return { ...pl, tracks: [...pl.tracks, ...uniqueNew] };
        })
      );
      showOsd(`Added ${items.length} ${items.length === 1 ? 'item' : 'items'} to playlist`);
    },
    [showOsd]
  );

  const handleRemoveTrackFromPlaylist = useCallback((playlistId: string, trackIndex: number) => {
    setPlaylists((prev) =>
      prev.map((pl) => {
        if (pl.id !== playlistId) return pl;
        return { ...pl, tracks: pl.tracks.filter((_, idx) => idx !== trackIndex) };
      })
    );
  }, []);

  const storedRefToTrack = useCallback((ref: StoredTrackRef): MediaTrack => {
    if (/^https?:\/\//i.test(ref.path)) {
      const streamTrack = createTrackFromStreamUrl(ref.sourceUrl || ref.path, ref.name, ref.kind, {
        sourceUrl: ref.sourceUrl || (isExternalPlatformUrl(ref.path) ? ref.path : undefined),
        artist: ref.artist,
        coverUrl: ref.coverUrl,
      });
      if (streamTrack) return streamTrack;
    }
    return createTrackFromScanned(ref);
  }, []);

  const handlePlayPlaylist = useCallback(
    (playlistId: string, startIndex = 0) => {
      const target = playlists.find((p) => p.id === playlistId);
      if (!target || target.tracks.length === 0) return;
      const tracks = target.tracks.map(storedRefToTrack);
      setQueue((prev) => {
        prev.forEach((t) => {
          if (t.isObjectUrl) URL.revokeObjectURL(t.url);
        });
        return tracks;
      });
      setCurrentIndex(Math.max(0, Math.min(tracks.length - 1, startIndex)));
      showOsd(`Playing "${target.name}"`);
    },
    [playlists, showOsd, storedRefToTrack]
  );

  const handleAppendPlaylistToQueue = useCallback(
    (playlistId: string) => {
      const target = playlists.find((p) => p.id === playlistId);
      if (!target || target.tracks.length === 0) return;
      const tracks = target.tracks.map(storedRefToTrack);
      appendTracks(tracks);
      showOsd(`Queued "${target.name}" (${tracks.length})`);
    },
    [playlists, appendTracks, showOsd, storedRefToTrack]
  );

  const handleExportPlaylist = useCallback(
    async (playlistId: string) => {
      if (!window.sapira) return;
      const target = playlists.find((p) => p.id === playlistId);
      if (!target || target.tracks.length === 0) return;
      const res = await window.sapira.exportM3u({
        name: target.name,
        paths: target.tracks.map((t) => t.path),
      });
      if (res.ok) showOsd(`Exported "${target.name}.m3u"`);
    },
    [playlists, showOsd]
  );

  const handleImportPlaylist = useCallback(async () => {
    if (!window.sapira) return;
    const res = await window.sapira.importM3u();
    if (!res || res.items.length === 0) {
      if (res) showOsd('No playable local files found in .m3u', true);
      return;
    }
    const created: SavedPlaylist = {
      id: makePlaylistId(),
      name: res.name,
      createdAt: Date.now(),
      tracks: res.items,
    };
    setPlaylists((prev) => [created, ...prev]);
    showOsd(`Imported "${res.name}" (${res.items.length})`);
  }, [showOsd]);

  // Global keyboard shortcuts
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setCommandPaletteOpen((v) => !v);
        return;
      }

      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) {
        return;
      }

      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'o') {
        e.preventDefault();
        handleOpenFiles();
        return;
      }

      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'u') {
        e.preventDefault();
        setStreamModalOpen(true);
        return;
      }

      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'i') {
        if (currentTrack) {
          e.preventDefault();
          setMediaInfoOpen((v) => !v);
        }
        return;
      }

      if ((e.metaKey || e.ctrlKey) && e.key === ',') {
        e.preventDefault();
        setSettingsOpen((v) => !v);
        return;
      }

      if (e.metaKey || e.ctrlKey || e.altKey) return;

      switch (e.key) {
        case ' ':
        case 'k':
        case 'K':
          e.preventDefault();
          togglePlay();
          bumpHud();
          break;
        case 'ArrowLeft':
          e.preventDefault();
          handleSeekRelative(-settings.seekStepSeconds);
          bumpHud();
          break;
        case 'ArrowRight':
          e.preventDefault();
          handleSeekRelative(settings.seekStepSeconds);
          bumpHud();
          break;
        case 'j':
        case 'J':
          e.preventDefault();
          handleSeekRelative(-10);
          bumpHud();
          break;
        case 'l':
        case 'L':
          e.preventDefault();
          handleSeekRelative(10);
          bumpHud();
          break;
        case 'ArrowUp':
          e.preventDefault();
          handleVolumeChange(volume + 0.05);
          bumpHud();
          break;
        case 'ArrowDown':
          e.preventDefault();
          handleVolumeChange(volume - 0.05);
          bumpHud();
          break;
        case 'm':
        case 'M':
          e.preventDefault();
          handleToggleMute();
          bumpHud();
          break;
        case '[':
          e.preventDefault();
          stepPlaybackRate(-1);
          bumpHud();
          break;
        case ']':
          e.preventDefault();
          stepPlaybackRate(1);
          bumpHud();
          break;
        case 'n':
        case 'N':
          e.preventDefault();
          handleNext();
          bumpHud();
          break;
        case 'p':
        case 'P':
          e.preventDefault();
          handlePrev();
          bumpHud();
          break;
        case 'f':
        case 'F':
          e.preventDefault();
          handleToggleFullscreen();
          break;
        case 't':
        case 'T':
          e.preventDefault();
          handleToggleAlwaysOnTop();
          break;
        case 'w':
        case 'W':
          if (currentTrack) {
            e.preventDefault();
            handleToggleMiniMode();
          }
          break;
        case 'e':
        case 'E':
          e.preventDefault();
          handleEqToggle();
          bumpHud();
          break;
        case 'a':
        case 'A':
          if (isVideoMode) {
            e.preventDefault();
            handleCycleAspect();
            bumpHud();
          }
          break;
        case 'd':
        case 'D':
          if (isVideoMode) {
            e.preventDefault();
            setVideoFx((prev) => {
              const next = !prev.ambilight;
              showOsd(next ? 'Ambilight Glow On' : 'Ambilight Glow Off');
              return { ...prev, ambilight: next };
            });
          }
          break;
        case 'r':
        case 'R':
          if (isVideoMode) {
            e.preventDefault();
            setVideoFx((prev) => {
              const nextRot = ((prev.rotation + 90) % 360) as 0 | 90 | 180 | 270;
              showOsd(`Rotate ${nextRot}°`);
              return { ...prev, rotation: nextRot };
            });
          }
          break;
        case '.':
          if (isVideoMode) {
            e.preventDefault();
            handleFrameStep(1);
            bumpHud();
          }
          break;
        case '/':
          if (isVideoMode) {
            e.preventDefault();
            handleFrameStep(-1);
            bumpHud();
          }
          break;
        case 'i':
        case 'I':
          if (isVideoMode) {
            e.preventDefault();
            handleTogglePip();
          }
          break;
        case 's':
        case 'S':
          if (isVideoMode) {
            e.preventDefault();
            handleScreenshot();
          }
          break;
        case 'c':
        case 'C':
          if (isVideoMode) {
            e.preventDefault();
            handleToggleSubtitles();
            bumpHud();
          }
          break;
        case 'g':
        case 'G':
          if (isVideoMode && subtitleCues.length > 0) {
            e.preventDefault();
            handleSubtitleOffsetStep(-0.5);
          }
          break;
        case 'h':
        case 'H':
          if (isVideoMode && subtitleCues.length > 0) {
            e.preventDefault();
            handleSubtitleOffsetStep(0.5);
          }
          break;
        case 'b':
        case 'B':
          if (currentTrack) {
            e.preventDefault();
            handleCycleAbLoop();
            bumpHud();
          }
          break;
        case 'y':
        case 'Y':
          if (currentTrack && !isVideoMode) {
            e.preventDefault();
            setLyricsOpen((v) => !v);
          }
          break;
        case 'z':
        case 'Z':
          if (currentTrack) {
            e.preventDefault();
            const order: SleepTimerOption[] = [0, 15, 30, 60, 'eot'];
            const idx = order.indexOf(sleepTimer);
            handleSelectSleepTimer(order[(idx + 1) % order.length]);
          }
          break;
        case 'u':
        case 'U':
          e.preventDefault();
          setStreamModalOpen(true);
          break;
        case 'q':
        case 'Q':
          e.preventDefault();
          setQueueOpen((v) => !v);
          break;
        case 'o':
        case 'O':
          e.preventDefault();
          handleOpenFiles();
          break;
        case ',':
          e.preventDefault();
          setSettingsOpen((v) => !v);
          break;
        case '?':
          e.preventDefault();
          setShortcutsOpen((v) => !v);
          break;
        case 'Escape':
          if (commandPaletteOpen) {
            setCommandPaletteOpen(false);
          } else if (streamModalOpen) {
            setStreamModalOpen(false);
          } else if (mediaInfoOpen) {
            setMediaInfoOpen(false);
          } else if (settingsOpen) {
            setSettingsOpen(false);
          } else if (shortcutsOpen) {
            setShortcutsOpen(false);
          } else if (queueOpen) {
            setQueueOpen(false);
          } else if (isFullscreen) {
            handleToggleFullscreen();
          }
          break;
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [
    bumpHud,
    commandPaletteOpen,
    currentTrack,
    handleCycleAbLoop,
    handleCycleAspect,
    handleEqToggle,
    handleFrameStep,
    handleNext,
    handleOpenFiles,
    handlePrev,
    handleScreenshot,
    handleSeekRelative,
    handleSelectSleepTimer,
    handleSubtitleOffsetStep,
    handleToggleAlwaysOnTop,
    handleToggleFullscreen,
    handleToggleMiniMode,
    handleToggleMute,
    handleTogglePip,
    handleToggleSubtitles,
    handleVolumeChange,
    isFullscreen,
    isVideoMode,
    mediaInfoOpen,
    queueOpen,
    settings.seekStepSeconds,
    settingsOpen,
    shortcutsOpen,
    showOsd,
    sleepTimer,
    stepPlaybackRate,
    streamModalOpen,
    subtitleCues.length,
    togglePlay,
    volume,
  ]);

  // Drag & drop handlers (supports media files, folders, AND .srt/.vtt subtitles)
  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    dragDepthRef.current += 1;
    setDragActive(true);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    dragDepthRef.current = Math.max(0, dragDepthRef.current - 1);
    if (dragDepthRef.current === 0) {
      setDragActive(false);
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    dragDepthRef.current = 0;
    setDragActive(false);

    const files = Array.from(e.dataTransfer.files);
    if (files.length === 0) return;

    // Check if any dropped file is .lrc lyrics
    const lrcFile = files.find((f) => /\.lrc$/i.test(f.name));
    if (lrcFile) {
      const content = window.sapira
        ? (await window.sapira.readLyricsFile(window.sapira.getPathForFile(lrcFile)))?.content
        : await lrcFile.text();
      if (content) {
        const parsed = parseLrc(content);
        if (parsed.lines.length > 0) {
          setLyricLines(parsed.lines);
          setLyricsSynced(parsed.synced);
          setLyricsSource(lrcFile.name);
          setLyricsOpen(true);
          showOsd(`Lyrics: ${lrcFile.name}`);
        }
      }
      if (files.length === 1) return;
    }

    // Check if any dropped file is a subtitle (.srt / .vtt / .ass / .ssa / .sub)
    const subFile = files.find((f) => /\.(srt|vtt|ass|ssa|sub)$/i.test(f.name));
    const nonSubFiles = files.filter((f) => !/\.(srt|vtt|ass|ssa|sub|lrc)$/i.test(f.name));

    if (subFile) {
      if (window.sapira) {
        const subPath = window.sapira.getPathForFile(subFile);
        if (subPath) {
          const payload = await window.sapira.readSubtitleFile(subPath);
          if (payload) applySubtitlePayload(payload.name, payload.content);
        }
      } else {
        const text = await subFile.text();
        applySubtitlePayload(subFile.name, text);
      }
      if (nonSubFiles.length === 0) return;
    }

    if (window.sapira) {
      const paths = nonSubFiles
        .map((f) => window.sapira!.getPathForFile(f))
        .filter((p): p is string => Boolean(p));

      if (paths.length > 0) {
        const scanned = await window.sapira.inspectPaths(paths);
        const tracks = scanned.map(createTrackFromScanned);
        if (tracks.length > 0) {
          appendTracks(tracks);
          showOsd(`Added ${tracks.length} ${tracks.length === 1 ? 'file' : 'files'}`);
        } else if (!subFile) {
          showOsd('No supported media files dropped', true);
        }
        return;
      }
    }

    const browserTracks = nonSubFiles
      .map(createTrackFromBrowserFile)
      .filter((t): t is MediaTrack => t !== null);
    if (browserTracks.length > 0) {
      appendTracks(browserTracks);
      showOsd(`Added ${browserTracks.length} ${browserTracks.length === 1 ? 'file' : 'files'}`);
    } else if (!subFile) {
      showOsd('Unsupported file format', true);
    }
  };

  const cycleRepeat = () => {
    setRepeatMode((prev) => {
      const next: RepeatMode = prev === 'off' ? 'all' : prev === 'all' ? 'one' : 'off';
      showOsd(`Repeat: ${next}`);
      return next;
    });
  };

  const toggleShuffle = () => {
    setShuffle((prev) => {
      const next = !prev;
      showOsd(next ? 'Shuffle On' : 'Shuffle Off');
      return next;
    });
  };

  const handleOpenCommandPalette = useCallback(() => setCommandPaletteOpen(true), []);
  const handleOpenStreamModal = useCallback(() => setStreamModalOpen(true), []);
  const handleOpenMediaInfoModal = useCallback(() => setMediaInfoOpen(true), []);
  const handleToggleQueueDrawer = useCallback(() => setQueueOpen((v) => !v), []);
  const handleToggleSettingsModal = useCallback(() => setSettingsOpen((v) => !v), []);
  const handleToggleShortcutsModal = useCallback(() => setShortcutsOpen((v) => !v), []);
  const handleCloseLyrics = useCallback(() => setLyricsOpen(false), []);

  const effectiveHudVisible = !currentTrack || !isVideoMode || hudVisible;
  const aspectClass =
    aspectMode === 'fill'
      ? 'aspect-fill'
      : aspectMode === '16:9'
        ? 'aspect-16-9'
        : aspectMode === '21:9'
          ? 'aspect-21-9'
          : '';

  const rotScale = videoFx.rotation % 180 !== 0 ? 0.72 : 1;
  const mirrorX = videoFx.mirror ? -1 : 1;
  const videoStyle = isVideoMode
    ? {
        filter: `brightness(${videoFx.brightness}%) contrast(${videoFx.contrast}%) saturate(${videoFx.saturation}%)`,
        transform: `rotate(${videoFx.rotation}deg) scale(${(videoFx.zoom * rotScale * mirrorX).toFixed(3)}, ${(videoFx.zoom * rotScale).toFixed(3)})`,
      }
    : undefined;

  return (
    <div
      className={`sapira-shell ${!effectiveHudVisible ? 'cursor-hidden' : ''}`}
      data-theme={settings.theme}
      onMouseMove={bumpHud}
      onContextMenu={(e) => {
        const target = e.target as HTMLElement | null;
        if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) {
          // Let Electron's native Cut / Copy / Paste / Select All menu handle inputs
          return;
        }
        e.preventDefault();
        bumpHud();
        setContextMenuPos({ x: e.clientX, y: e.clientY });
      }}
      onDragEnter={handleDragEnter}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="video/*,audio/*"
        style={{ display: 'none' }}
        onChange={handleBrowserFileInput}
      />
      <input
        ref={subInputRef}
        type="file"
        accept=".srt,.vtt,.ass,.ssa,.sub"
        style={{ display: 'none' }}
        onChange={handleBrowserSubtitleInput}
      />

      <input
        ref={lrcInputRef}
        type="file"
        accept=".lrc,.txt"
        style={{ display: 'none' }}
        onChange={handleBrowserLrcInput}
      />

      {!miniMode && (
        <TitleBar
          currentTrack={currentTrack}
          displayTitle={audioMeta.title || currentTrack?.name || null}
          isPlaying={isPlaying}
          isTranscoding={isTranscoding}
          alwaysOnTop={alwaysOnTop}
          queueCount={queue.length}
          queueOpen={queueOpen}
          settingsOpen={settingsOpen}
          isFullscreen={isFullscreen}
          hudVisible={effectiveHudVisible}
          onOpenCommandPalette={handleOpenCommandPalette}
          onOpenFiles={handleOpenFiles}
          onOpenFolder={handleOpenFolder}
          onOpenStream={handleOpenStreamModal}
          onOpenMediaInfo={handleOpenMediaInfoModal}
          onToggleAlwaysOnTop={handleToggleAlwaysOnTop}
          onToggleMiniMode={handleToggleMiniMode}
          onToggleQueue={handleToggleQueueDrawer}
          onToggleSettings={handleToggleSettingsModal}
          onToggleShortcuts={handleToggleShortcutsModal}
        />
      )}

      <main className="media-stage">
        <AmbilightCanvas
          videoRef={mediaRef}
          active={Boolean(isVideoMode && !miniMode && videoFx.ambilight)}
          isPlaying={isPlaying}
        />

        <video
          key={currentTrack?.isRemote ? 'remote-media' : 'local-media'}
          ref={mediaRef}
          crossOrigin={!currentTrack?.isRemote && !currentTrack?.isObjectUrl ? 'anonymous' : undefined}
          className={`video-element ${aspectClass} ${!isVideoMode || miniMode ? 'hidden-audio' : ''}`}
          style={videoStyle}
          playsInline
          onClick={() => {
            if (isVideoMode) {
              togglePlay();
              bumpHud();
            }
          }}
          onDoubleClick={() => {
            if (isVideoMode) {
              handleToggleFullscreen();
            }
          }}
          onPlay={() => {
            setIsPlaying(true);
            if (!isRemoteTrackRef.current && audioCtxRef.current?.state === 'suspended') {
              audioCtxRef.current.resume().catch(() => {});
            }
          }}
          onPause={() => setIsPlaying(false)}
          onEnded={handleEnded}
          onLoadedMetadata={(e) => {
            const el = e.currentTarget;
            if (isTranscoding) {
              const knownDur = probe?.duration || currentTrack?.remoteDuration;
              if (knownDur) setDuration(knownDur);
              return;
            }
            const dur = Number.isFinite(el.duration)
              ? el.duration
              : probe?.duration || currentTrack?.remoteDuration || 0;
            setDuration(dur);

            if (currentTrack && !currentTrack.isRemote && settings.autoResume && dur > 20) {
              const saved = getSavedPosition(currentTrack.path);
              if (saved !== null && saved < dur - 10) {
                el.currentTime = saved;
                setCurrentTime(saved);
                showOsd(`Resumed at ${formatTime(saved)}`);
                return;
              }
            }
            setCurrentTime(el.currentTime || 0);
          }}
          onTimeUpdate={(e) => {
            const el = e.currentTarget;
            const t = isTranscoding ? transcodeOffset + el.currentTime : el.currentTime;
            const totalDur = isTranscoding ? probe?.duration || duration : el.duration;
            if (abLoop.a !== null && abLoop.b !== null && t >= abLoop.b) {
              handleSeek(abLoop.a);
              return;
            }
            const now = performance.now();
            const needsTightSync =
              (isVideoMode && subtitlesEnabled && subtitleCues.length > 0) ||
              (!isVideoMode && lyricsOpen && lyricsSynced && lyricLines.length > 0);
            const minIntervalMs = needsTightSync ? 65 : 150;
            if (now - lastUiTimeUpdateRef.current >= minIntervalMs) {
              lastUiTimeUpdateRef.current = now;
              setCurrentTime(t);
              if (!isTranscoding && el.buffered.length > 0) {
                setBuffered(el.buffered.end(el.buffered.length - 1));
              }
            }
            if (
              currentTrack &&
              !currentTrack.isRemote &&
              settings.autoResume &&
              Number.isFinite(totalDur) &&
              totalDur > 20 &&
              Math.abs(t - lastSavedTimeRef.current) >= 3
            ) {
              lastSavedTimeRef.current = t;
              savePlaybackPosition(currentTrack.path, t, totalDur);
            }
          }}
          onError={async () => {
            const errTrackId = currentTrack?.id;
            if (!errTrackId) return;

            if (currentTrack?.isRemote) {
              const el = mediaRef.current;
              if (el && window.sapira && !transcodeFallbackTriedRef.current) {
                transcodeFallbackTriedRef.current = true;
                const originalSrc = el.currentSrc;
                const streamUrl = await window.sapira
                  .getTranscodeUrl({
                    filePath: currentTrack.muxKey || currentTrack.url,
                    kind: currentTrack.kind,
                    copyVideo: false,
                  })
                  .catch(() => null);
                const latestEl = mediaRef.current;
                if (
                  !latestEl ||
                  activeTrackIdRef.current !== errTrackId ||
                  latestEl.currentSrc !== originalSrc
                ) {
                  return;
                }
                if (streamUrl) {
                  hlsRef.current?.destroy();
                  hlsRef.current = null;
                  setIsTranscoding(true);
                  setTranscodeOffset(0);
                  latestEl.src = streamUrl;
                  latestEl.load();
                  latestEl.play().catch(() => setIsPlaying(false));
                  return;
                }
              }
              if (activeTrackIdRef.current === errTrackId) {
                showOsd('Unable to play this online stream. Reopen the original link to try again.', true);
                setIsPlaying(false);
              }
              return;
            }

            // Automatic FFmpeg universal transcode fallback when native Chromium decode fails!
            if (
              currentTrack &&
              !currentTrack.isRemote &&
              !currentTrack.isObjectUrl &&
              window.sapira &&
              !transcodeFallbackTriedRef.current
            ) {
              transcodeFallbackTriedRef.current = true;
              const p = probe ?? (await window.sapira.probeMedia(currentTrack.path).catch(() => null));
              if (activeTrackIdRef.current !== errTrackId) return;
              if (p?.ffmpegAvailable) {
                setProbe(p);
                if (p.duration > 0) setDuration(p.duration);
                const streamUrl = await window.sapira.getTranscodeUrl({
                  filePath: currentTrack.path,
                  kind: currentTrack.kind,
                  startSeconds: 0,
                  audioTrackIndex: selectedAudioTrack,
                  copyVideo: false,
                });
                const el = mediaRef.current;
                if (el && streamUrl && activeTrackIdRef.current === errTrackId) {
                  setIsTranscoding(true);
                  setTranscodeOffset(0);
                  el.src = streamUrl;
                  el.load();
                  el.play().catch(() => {});
                  showOsd('FFmpeg Universal Decoder activated');
                  return;
                }
              }
            }
            if (activeTrackIdRef.current === errTrackId) {
              showOsd(
                probe?.ffmpegAvailable === false
                  ? 'Unable to decode this file. Install FFmpeg for legacy codecs.'
                  : 'Unable to decode this file.',
                true
              );
              setIsPlaying(false);
            }
          }}
        />

        {activeCue && !miniMode && (
          <div className={`subtitle-layer ${effectiveHudVisible ? 'hud-raised' : ''}`}>
            <span className={`subtitle-text size-${subtitleSize}`}>{activeCue.text}</span>
          </div>
        )}

        {!currentTrack && !miniMode && (
          <EmptyStage
            language={settings.language}
            showTelemetry={settings.showHudTelemetry}
            onOpenFiles={handleOpenFiles}
            onOpenFolder={handleOpenFolder}
            onOpenStream={() => setStreamModalOpen(true)}
            onOpenLibrary={() => setQueueOpen(true)}
          />
        )}

        {currentTrack && currentTrack.kind === 'audio' && !miniMode && (
          <>
            <AudioStage
              track={currentTrack}
              metadata={audioMeta}
              isPlaying={isPlaying}
              lyricsOpen={lyricsOpen}
              analyser={currentTrack.isRemote ? null : analyser}
              theme={settings.theme}
              language={settings.language}
              showTelemetry={settings.showHudTelemetry}
              showVisualizer={settings.audioVisualizer}
              onTogglePlay={togglePlay}
            />
            <LyricsOverlay
              open={lyricsOpen}
              lines={lyricLines}
              synced={lyricsSynced}
              activeIndex={activeLyricIndex}
              isPlaying={isPlaying}
              loading={lyricsLoading}
              sourceLabel={lyricsSource}
              onClose={handleCloseLyrics}
              onSeek={handleSeek}
              onLoadFile={handleLoadLyricsFile}
              onSearchOnline={handleSearchLyricsOnline}
            />
          </>
        )}

        {miniMode && (
          <MiniPlayer
            track={currentTrack}
            metadata={audioMeta}
            isPlaying={isPlaying}
            currentTime={currentTime}
            duration={duration}
            canStepTrack={queue.length > 1 || repeatMode === 'all'}
            onTogglePlay={togglePlay}
            onPrev={handlePrev}
            onNext={handleNext}
            onSeek={handleSeek}
            onExitMiniMode={handleToggleMiniMode}
          />
        )}
      </main>

      {currentTrack && !miniMode && (
        <PlayerControls
          visible={effectiveHudVisible}
          isVideoMode={isVideoMode}
          isPlaying={isPlaying}
          currentTime={currentTime}
          duration={duration}
          buffered={buffered}
          volume={volume}
          muted={muted}
          playbackRate={playbackRate}
          shuffle={shuffle}
          repeatMode={repeatMode}
          aspectMode={aspectMode}
          isFullscreen={isFullscreen}
          queueOpen={queueOpen}
          canStepTrack={queue.length > 1 || repeatMode === 'all'}
          hasSubtitles={subtitleCues.length > 0}
          subtitleName={subtitleName}
          subtitlesEnabled={subtitlesEnabled}
          subtitleSize={subtitleSize}
          subtitleOffset={subtitleOffset}
          embeddedSubtitles={probe?.subtitleTracks ?? []}
          audioTracks={probe?.audioTracks ?? []}
          chapters={probe?.chapters ?? []}
          selectedAudioTrack={selectedAudioTrack}
          abLoop={abLoop}
          videoFx={videoFx}
          lyricsOpen={lyricsOpen}
          hasLyrics={lyricLines.length > 0}
          sleepTimer={sleepTimer}
          sleepRemainingSec={sleepRemainingSec}
          eqState={eqState}
          onTogglePlay={togglePlay}
          onSeek={handleSeek}
          onSeekRelative={handleSeekRelative}
          onPrev={handlePrev}
          onNext={handleNext}
          onVolumeChange={handleVolumeChange}
          onToggleMute={handleToggleMute}
          onRateChange={handleRateChange}
          onToggleShuffle={toggleShuffle}
          onCycleRepeat={cycleRepeat}
          onCycleAspect={handleCycleAspect}
          onTogglePip={handleTogglePip}
          onScreenshot={handleScreenshot}
          onLoadSubtitle={handleLoadSubtitle}
          onToggleSubtitles={handleToggleSubtitles}
          onClearSubtitles={() => {
            setSubtitleCues([]);
            setSubtitleName(null);
            setSubtitleOffset(0);
            showOsd('Subtitles cleared');
          }}
          onSubtitleSizeChange={setSubtitleSize}
          onSubtitleOffsetStep={handleSubtitleOffsetStep}
          onSubtitleOffsetReset={() => {
            setSubtitleOffset(0);
            showOsd('Sub sync: 0.0s');
          }}
          onSelectEmbeddedSubtitle={handleSelectEmbeddedSubtitle}
          onSelectAudioTrack={handleSelectAudioTrack}
          onCycleAbLoop={handleCycleAbLoop}
          onVideoFxChange={handleVideoFxChange}
          onVideoFxReset={handleVideoFxReset}
          onFrameStep={handleFrameStep}
          onToggleLyrics={() => setLyricsOpen((v) => !v)}
          onSelectSleepTimer={handleSelectSleepTimer}
          onEqToggle={handleEqToggle}
          onEqPreset={handleEqPreset}
          onEqBandChange={handleEqBandChange}
          onToggleQueue={() => setQueueOpen((v) => !v)}
          onToggleFullscreen={handleToggleFullscreen}
          onInteraction={bumpHud}
        />
      )}

      <QueueDrawer
        open={queueOpen}
        queue={queue}
        currentIndex={currentIndex}
        isPlaying={isPlaying}
        playlists={playlists}
        recents={recents}
        onClose={() => setQueueOpen(false)}
        onSelect={(idx) => setCurrentIndex(idx)}
        onMoveTrack={handleMoveTrack}
        onRemove={handleRemoveTrack}
        onClear={handleClearQueue}
        onAddFiles={handleOpenFiles}
        onAddFolder={handleOpenFolder}
        onCreatePlaylist={handleCreatePlaylist}
        onDeletePlaylist={handleDeletePlaylist}
        onAddFilesToPlaylist={handleAddFilesToPlaylist}
        onAddFolderToPlaylist={handleAddFolderToPlaylist}
        onRemoveTrackFromPlaylist={handleRemoveTrackFromPlaylist}
        onPlayPlaylist={handlePlayPlaylist}
        onAppendPlaylistToQueue={handleAppendPlaylistToQueue}
        onExportPlaylist={handleExportPlaylist}
        onImportPlaylist={handleImportPlaylist}
        onPlayRecent={handlePlayRecent}
        onClearRecents={() => {
          clearRecents();
          setRecents([]);
          showOsd('Recent history cleared');
        }}
      />

      <ContextMenu
        position={contextMenuPos}
        hasTrack={Boolean(currentTrack)}
        isVideoMode={isVideoMode}
        isPlaying={isPlaying}
        miniMode={miniMode}
        alwaysOnTop={alwaysOnTop}
        onClose={() => setContextMenuPos(null)}
        onOpenFiles={handleOpenFiles}
        onOpenFolder={handleOpenFolder}
        onOpenStream={() => {
          if (miniMode) handleToggleMiniMode();
          setStreamModalOpen(true);
        }}
        onOpenMediaInfo={() => {
          if (miniMode) handleToggleMiniMode();
          setMediaInfoOpen(true);
        }}
        onTogglePlay={togglePlay}
        onLoadSubtitle={handleLoadSubtitle}
        onCycleAspect={handleCycleAspect}
        onScreenshot={handleScreenshot}
        onToggleMiniMode={handleToggleMiniMode}
        onToggleAlwaysOnTop={handleToggleAlwaysOnTop}
        onToggleQueue={() => setQueueOpen((v) => !v)}
        onOpenSettings={() => {
          if (miniMode) handleToggleMiniMode();
          setSettingsOpen(true);
        }}
        onOpenShortcuts={() => {
          if (miniMode) handleToggleMiniMode();
          setShortcutsOpen(true);
        }}
      />

      <CommandPalette
        open={commandPaletteOpen}
        language={settings.language}
        queue={queue}
        playlists={playlists}
        recents={recents}
        onClose={() => setCommandPaletteOpen(false)}
        onSelectQueueTrack={(idx) => setCurrentIndex(idx)}
        onPlayPlaylist={(plId) => handlePlayPlaylist(plId, 0)}
        onPlayRecent={handlePlayRecent}
        onOpenFiles={handleOpenFiles}
        onOpenFolder={handleOpenFolder}
        onOpenStream={() => setStreamModalOpen(true)}
        onOpenSettings={() => setSettingsOpen(true)}
        onToggleEq={handleEqToggle}
        onToggleAmbilight={() =>
          setVideoFx((prev) => {
            const next = !prev.ambilight;
            showOsd(next ? 'Ambilight Glow On' : 'Ambilight Glow Off');
            return { ...prev, ambilight: next };
          })
        }
        onSetTheme={(th) => {
          handleSettingChange('theme', th);
          showOsd(`Theme: ${th.toUpperCase()}`);
        }}
        onSetLanguage={(lang) => {
          handleSettingChange('language', lang);
          showOsd(lang === 'ro' ? 'Limbă: Română' : 'Language: English');
        }}
      />

      <StreamModal
        open={streamModalOpen}
        onClose={() => setStreamModalOpen(false)}
        onSubmit={handleOpenStreamSubmit}
      />

      <MediaInfoModal
        open={mediaInfoOpen}
        track={currentTrack}
        probe={probe}
        isTranscoding={isTranscoding}
        duration={duration}
        onClose={() => setMediaInfoOpen(false)}
      />

      <SettingsModal
        open={settingsOpen}
        settings={settings}
        onClose={() => setSettingsOpen(false)}
        onChange={handleSettingChange}
        onReset={handleResetSettings}
        onClearResumeHistory={handleClearResumeHistory}
      />

      <ShortcutsModal open={shortcutsOpen} onClose={() => setShortcutsOpen(false)} />

      {shutterKey && <div key={shutterKey} className="shutter-flash" />}

      {osd && (
        <div key={osd.key} className={`osd-pill ${osd.isError ? 'error' : ''}`}>
          {osd.text}
        </div>
      )}

      {dragActive && (
        <div className="drop-overlay">
          <SapiraLogo size={54} />
          <div className="drop-overlay-title">Drop media or subtitles into Sapira Media Player</div>
          <div className="drop-overlay-sub">
            MP4 · MKV · AVI · MOV · WMV · FLAC · MP3 · WAV · .SRT / .VTT / .ASS
          </div>
        </div>
      )}
    </div>
  );
}
export default App;
