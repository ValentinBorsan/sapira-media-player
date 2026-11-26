import { useEffect, useRef, useState } from 'react';
import {
  Camera,
  Captions,
  FileText,
  FlipHorizontal2,
  Languages,
  ListMusic,
  Maximize2,
  MicVocal,
  Minimize2,
  Moon,
  Pause,
  PictureInPicture2,
  Play,
  Repeat,
  Repeat1,
  RotateCcw,
  RotateCw,
  Shuffle,
  SkipBack,
  SkipForward,
  SlidersHorizontal,
  Sparkles,
  Trash2,
  Volume1,
  Volume2,
  VolumeX,
} from 'lucide-react';
import type {
  AbLoopState,
  AspectMode,
  ProbedAudioTrack,
  ProbedChapter,
  ProbedSubtitleTrack,
  RepeatMode,
  SleepTimerOption,
  SubtitleSize,
  VideoAdjustments,
} from '../types/media';
import { EQ_BANDS, EQ_PRESETS, type EqPresetId, type EqState } from '../utils/equalizer';
import { formatTime, PLAYBACK_RATES } from '../utils/format';

interface PlayerControlsProps {
  visible: boolean;
  isVideoMode: boolean;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  buffered: number;
  volume: number;
  muted: boolean;
  playbackRate: number;
  shuffle: boolean;
  repeatMode: RepeatMode;
  aspectMode: AspectMode;
  isFullscreen: boolean;
  queueOpen: boolean;
  canStepTrack: boolean;
  hasSubtitles: boolean;
  subtitleName: string | null;
  subtitlesEnabled: boolean;
  subtitleSize: SubtitleSize;
  subtitleOffset: number;
  embeddedSubtitles: ProbedSubtitleTrack[];
  audioTracks: ProbedAudioTrack[];
  chapters: ProbedChapter[];
  selectedAudioTrack: number;
  abLoop: AbLoopState;
  videoFx: VideoAdjustments;
  lyricsOpen: boolean;
  hasLyrics: boolean;
  sleepTimer: SleepTimerOption;
  sleepRemainingSec: number | null;
  eqState: EqState;
  onTogglePlay: () => void;
  onSeek: (time: number) => void;
  onSeekRelative: (delta: number) => void;
  onPrev: () => void;
  onNext: () => void;
  onVolumeChange: (vol: number) => void;
  onToggleMute: () => void;
  onRateChange: (rate: number) => void;
  onToggleShuffle: () => void;
  onCycleRepeat: () => void;
  onCycleAspect: () => void;
  onTogglePip: () => void;
  onScreenshot: () => void;
  onLoadSubtitle: () => void;
  onToggleSubtitles: () => void;
  onClearSubtitles: () => void;
  onSubtitleSizeChange: (size: SubtitleSize) => void;
  onSubtitleOffsetStep: (delta: number) => void;
  onSubtitleOffsetReset: () => void;
  onSelectEmbeddedSubtitle: (subTrackIndex: number, label: string) => void;
  onSelectAudioTrack: (audioTrackIndex: number) => void;
  onCycleAbLoop: () => void;
  onVideoFxChange: <K extends keyof VideoAdjustments>(key: K, value: VideoAdjustments[K]) => void;
  onVideoFxReset: () => void;
  onFrameStep: (dir: -1 | 1) => void;
  onToggleLyrics: () => void;
  onSelectSleepTimer: (opt: SleepTimerOption) => void;
  onEqToggle: () => void;
  onEqPreset: (preset: Exclude<EqPresetId, 'custom'>) => void;
  onEqBandChange: (index: number, gain: number) => void;
  onToggleQueue: () => void;
  onToggleFullscreen: () => void;
  onInteraction: () => void;
}

const ASPECT_LABELS: Record<AspectMode, string> = {
  fit: 'FIT',
  fill: 'FILL',
  '16:9': '16:9',
  '21:9': '21:9',
};

export function PlayerControls({
  visible,
  isVideoMode,
  isPlaying,
  currentTime,
  duration,
  buffered,
  volume,
  muted,
  playbackRate,
  shuffle,
  repeatMode,
  aspectMode,
  isFullscreen,
  queueOpen,
  canStepTrack,
  hasSubtitles,
  subtitleName,
  subtitlesEnabled,
  subtitleSize,
  subtitleOffset,
  embeddedSubtitles,
  audioTracks,
  chapters,
  selectedAudioTrack,
  abLoop,
  videoFx,
  lyricsOpen,
  hasLyrics,
  sleepTimer,
  sleepRemainingSec,
  eqState,
  onTogglePlay,
  onSeek,
  onSeekRelative,
  onPrev,
  onNext,
  onVolumeChange,
  onToggleMute,
  onRateChange,
  onToggleShuffle,
  onCycleRepeat,
  onCycleAspect,
  onTogglePip,
  onScreenshot,
  onLoadSubtitle,
  onToggleSubtitles,
  onClearSubtitles,
  onSubtitleSizeChange,
  onSubtitleOffsetStep,
  onSubtitleOffsetReset,
  onSelectEmbeddedSubtitle,
  onSelectAudioTrack,
  onCycleAbLoop,
  onVideoFxChange,
  onVideoFxReset,
  onFrameStep,
  onToggleLyrics,
  onSelectSleepTimer,
  onEqToggle,
  onEqPreset,
  onEqBandChange,
  onToggleQueue,
  onToggleFullscreen,
  onInteraction,
}: PlayerControlsProps) {
  const scrubberRef = useRef<HTMLDivElement | null>(null);
  const [dragging, setDragging] = useState(false);
  const [hoverPercent, setHoverPercent] = useState<number | null>(null);
  const [speedMenuOpen, setSpeedMenuOpen] = useState(false);
  const [subMenuOpen, setSubMenuOpen] = useState(false);
  const [eqMenuOpen, setEqMenuOpen] = useState(false);
  const [audioMenuOpen, setAudioMenuOpen] = useState(false);
  const [sleepMenuOpen, setSleepMenuOpen] = useState(false);
  const [videoFxMenuOpen, setVideoFxMenuOpen] = useState(false);

  const hasCustomVideoFx =
    videoFx.brightness !== 100 ||
    videoFx.contrast !== 100 ||
    videoFx.saturation !== 100 ||
    videoFx.zoom !== 1 ||
    videoFx.rotation !== 0 ||
    videoFx.mirror;

  const isLiveStream = !Number.isFinite(duration) || (duration <= 0 && isPlaying);
  const safeDuration = Number.isFinite(duration) && duration > 0 ? duration : 0;
  const progressPercent = safeDuration > 0 ? Math.min(100, (currentTime / safeDuration) * 100) : 0;
  const bufferedPercent = safeDuration > 0 ? Math.min(100, (buffered / safeDuration) * 100) : 0;

  const getRatioFromClientX = (clientX: number) => {
    const el = scrubberRef.current;
    if (!el) return 0;
    const rect = el.getBoundingClientRect();
    return Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
  };

  useEffect(() => {
    if (!dragging) return;
    const handleMove = (e: PointerEvent) => {
      const ratio = getRatioFromClientX(e.clientX);
      setHoverPercent(ratio * 100);
      if (safeDuration > 0) {
        onSeek(ratio * safeDuration);
      }
    };
    const handleUp = () => {
      setDragging(false);
    };
    window.addEventListener('pointermove', handleMove);
    window.addEventListener('pointerup', handleUp);
    return () => {
      window.removeEventListener('pointermove', handleMove);
      window.removeEventListener('pointerup', handleUp);
    };
  }, [dragging, safeDuration, onSeek]);

  const effectiveVolume = muted ? 0 : volume;
  const VolumeIcon = effectiveVolume === 0 ? VolumeX : effectiveVolume < 0.5 ? Volume1 : Volume2;

  return (
    <div
      className={`dock-wrapper ${!visible ? 'hud-hidden' : ''}`}
      onMouseMove={onInteraction}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="player-dock">
        <div className="timeline-row">
          <span className="time-label">{formatTime(currentTime)}</span>

          <div
            ref={scrubberRef}
            className={`scrubber-hit ${dragging ? 'dragging' : ''}`}
            onPointerDown={(e) => {
              setDragging(true);
              const ratio = getRatioFromClientX(e.clientX);
              setHoverPercent(ratio * 100);
              if (safeDuration > 0) {
                onSeek(ratio * safeDuration);
              }
            }}
            onPointerMove={(e) => {
              const ratio = getRatioFromClientX(e.clientX);
              setHoverPercent(ratio * 100);
            }}
            onPointerLeave={() => {
              if (!dragging) setHoverPercent(null);
            }}
          >
            {hoverPercent !== null && safeDuration > 0 && (() => {
              const hoverTime = (hoverPercent / 100) * safeDuration;
              const hoveredChapter = chapters.find(
                (ch) => hoverTime >= ch.start && hoverTime < ch.end
              );
              return (
                <div className="scrubber-tooltip" style={{ left: `${hoverPercent}%` }}>
                  {formatTime(hoverTime)}
                  {hoveredChapter ? ` · ${hoveredChapter.title}` : ''}
                </div>
              );
            })()}

            <div className="scrubber-track">
              <div className="scrubber-buffered" style={{ width: `${bufferedPercent}%` }} />
              {safeDuration > 0 &&
                chapters.map((ch) =>
                  ch.start > 1 && ch.start < safeDuration ? (
                    <div
                      key={`${ch.start}-${ch.title}`}
                      className="scrubber-chapter-tick"
                      style={{ left: `${(ch.start / safeDuration) * 100}%` }}
                    />
                  ) : null
                )}
              {safeDuration > 0 && abLoop.a !== null && (
                <div
                  className="scrubber-ab-range"
                  style={{
                    left: `${Math.min(100, (abLoop.a / safeDuration) * 100)}%`,
                    width:
                      abLoop.b !== null
                        ? `${Math.max(0.5, Math.min(100, ((abLoop.b - abLoop.a) / safeDuration) * 100))}%`
                        : '2px',
                  }}
                />
              )}
              <div className="scrubber-fill" style={{ width: `${progressPercent}%` }} />
              <div className="scrubber-thumb" style={{ left: `${progressPercent}%` }} />
            </div>
          </div>

          <span className="time-label right">
            {isLiveStream ? (
              <span style={{ color: '#67e8f9', fontWeight: 600, letterSpacing: '0.08em' }}>
                ● LIVE
              </span>
            ) : (
              formatTime(safeDuration)
            )}
          </span>
        </div>

        <div className="controls-row">
          <div className="controls-left">
            <div className="volume-group">
              <button
                className="icon-btn"
                onClick={onToggleMute}
                title={muted ? 'Unmute (M)' : 'Mute (M)'}
                aria-label={muted ? 'Unmute' : 'Mute'}
              >
                <VolumeIcon size={17} />
              </button>
              <input
                type="range"
                min={0}
                max={2}
                step={0.02}
                value={effectiveVolume}
                onChange={(e) => onVolumeChange(Number(e.target.value))}
                className={`volume-slider ${effectiveVolume > 1.01 ? 'boosted' : ''}`}
                aria-label="Volume (up to 200% boost)"
                title={`Volume ${Math.round(effectiveVolume * 100)}% (up to 200% Boost)`}
              />
              <span className={`volume-pct ${effectiveVolume > 1.01 ? 'boosted' : ''}`}>
                {Math.round(effectiveVolume * 100)}%
              </span>
            </div>

            {isVideoMode && (
              <button
                className={`speed-btn ${aspectMode !== 'fit' ? 'active' : ''}`}
                onClick={onCycleAspect}
                title="Aspect ratio (A)"
              >
                {ASPECT_LABELS[aspectMode]}
              </button>
            )}

            <button
              className={`speed-btn ${abLoop.a !== null ? 'active' : ''}`}
              onClick={onCycleAbLoop}
              title="A–B Loop segment (B)"
            >
              {abLoop.a === null ? 'A–B' : abLoop.b === null ? 'A–…' : 'A–B ●'}
            </button>
          </div>

          <div className="controls-center">
            <button
              className="icon-btn"
              onClick={onPrev}
              disabled={!canStepTrack && currentTime < 3}
              title="Previous (P)"
              aria-label="Previous track"
            >
              <SkipBack size={17} />
            </button>

            <button
              className="icon-btn"
              onClick={() => onSeekRelative(-10)}
              title="Rewind 10s (J)"
              aria-label="Rewind 10 seconds"
            >
              <RotateCcw size={16} />
            </button>

            <button
              className="play-btn"
              onClick={onTogglePlay}
              title={isPlaying ? 'Pause (Space)' : 'Play (Space)'}
              aria-label={isPlaying ? 'Pause' : 'Play'}
            >
              {isPlaying ? (
                <Pause size={19} fill="currentColor" />
              ) : (
                <Play size={19} fill="currentColor" style={{ marginLeft: 2 }} />
              )}
            </button>

            <button
              className="icon-btn"
              onClick={() => onSeekRelative(10)}
              title="Forward 10s (L)"
              aria-label="Forward 10 seconds"
            >
              <RotateCw size={16} />
            </button>

            <button
              className="icon-btn"
              onClick={onNext}
              disabled={!canStepTrack}
              title="Next (N)"
              aria-label="Next track"
            >
              <SkipForward size={17} />
            </button>
          </div>

          <div className="controls-right">
            <button
              className={`icon-btn ${shuffle ? 'active' : ''}`}
              onClick={onToggleShuffle}
              title="Shuffle"
              aria-label="Toggle shuffle"
            >
              <Shuffle size={15} />
            </button>

            <button
              className={`icon-btn ${repeatMode !== 'off' ? 'active' : ''}`}
              onClick={onCycleRepeat}
              title={`Repeat: ${repeatMode}`}
              aria-label="Cycle repeat mode"
            >
              {repeatMode === 'one' ? <Repeat1 size={16} /> : <Repeat size={15} />}
            </button>

            {isVideoMode && (
              <>
                <div className="popover-wrap">
                  <button
                    className={`icon-btn ${(hasSubtitles && subtitlesEnabled) || subMenuOpen ? 'active' : ''}`}
                    onClick={() => {
                      setSubMenuOpen((v) => !v);
                      setSpeedMenuOpen(false);
                    }}
                    title="Subtitles (C)"
                    aria-label="Subtitles"
                  >
                    <Captions size={17} />
                  </button>

                  {subMenuOpen && (
                    <div className="subtitle-menu">
                      <div className="subtitle-menu-header">
                        <span>Subtitles</span>
                        {hasSubtitles && (
                          <button
                            className={`pill-opt ${subtitlesEnabled ? 'selected' : ''}`}
                            onClick={onToggleSubtitles}
                          >
                            {subtitlesEnabled ? 'ON' : 'OFF'}
                          </button>
                        )}
                      </div>

                      {subtitleName ? (
                        <div className="subtitle-file-label" title={subtitleName}>
                          {subtitleName}
                        </div>
                      ) : (
                        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                          No subtitle loaded. Drop a .srt or .vtt file anytime.
                        </div>
                      )}

                      <div className="subtitle-row">
                        <span>Size</span>
                        <div className="pill-group">
                          {(['sm', 'md', 'lg'] as SubtitleSize[]).map((sz) => (
                            <button
                              key={sz}
                              className={`pill-opt ${subtitleSize === sz ? 'selected' : ''}`}
                              onClick={() => onSubtitleSizeChange(sz)}
                            >
                              {sz.toUpperCase()}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="subtitle-row">
                        <span>Sync</span>
                        <div className="pill-group">
                          <button
                            className="pill-opt"
                            onClick={() => onSubtitleOffsetStep(-0.5)}
                            title="Earlier 0.5s (G)"
                          >
                            -0.5s
                          </button>
                          <button
                            className="pill-opt"
                            onClick={onSubtitleOffsetReset}
                            title="Reset sync"
                          >
                            {subtitleOffset >= 0 ? `+${subtitleOffset.toFixed(1)}s` : `${subtitleOffset.toFixed(1)}s`}
                          </button>
                          <button
                            className="pill-opt"
                            onClick={() => onSubtitleOffsetStep(0.5)}
                            title="Later 0.5s (H)"
                          >
                            +0.5s
                          </button>
                        </div>
                      </div>

                      {embeddedSubtitles.length > 0 && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                            Embedded Tracks
                          </span>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                            {embeddedSubtitles.map((st) => {
                              const label =
                                st.title ||
                                (st.language ? st.language.toUpperCase() : `Track #${st.trackIndex + 1}`);
                              return (
                                <button
                                  key={st.streamIndex}
                                  className="pill-opt"
                                  onClick={() => {
                                    onSelectEmbeddedSubtitle(st.trackIndex, label);
                                    setSubMenuOpen(false);
                                  }}
                                >
                                  {label}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      <div className="subtitle-actions">
                        <button
                          className="drawer-chip-btn"
                          style={{ flex: 1, justifyContent: 'center' }}
                          onClick={() => {
                            onLoadSubtitle();
                            setSubMenuOpen(false);
                          }}
                        >
                          <FileText size={13} />
                          Load Subtitles
                        </button>
                        {hasSubtitles && (
                          <button
                            className="drawer-chip-btn danger"
                            onClick={() => {
                              onClearSubtitles();
                              setSubMenuOpen(false);
                            }}
                            title="Remove subtitles"
                          >
                            <Trash2 size={13} />
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {audioTracks.length > 1 && (
                  <div className="popover-wrap">
                    <button
                      className={`icon-btn ${selectedAudioTrack > 0 || audioMenuOpen ? 'active' : ''}`}
                      onClick={() => {
                        setAudioMenuOpen((v) => !v);
                        setSubMenuOpen(false);
                        setEqMenuOpen(false);
                        setSpeedMenuOpen(false);
                      }}
                      title="Audio Track"
                      aria-label="Select audio track"
                    >
                      <Languages size={16} />
                    </button>

                    {audioMenuOpen && (
                      <div className="speed-menu" style={{ minWidth: 164 }}>
                        {audioTracks.map((at) => {
                          const label =
                            at.title ||
                            `${at.language ? at.language.toUpperCase() : `Track ${at.trackIndex + 1}`} (${at.codec.toUpperCase()} ${at.channels}ch)`;
                          return (
                            <button
                              key={at.streamIndex}
                              className={`speed-option ${selectedAudioTrack === at.trackIndex ? 'selected' : ''}`}
                              style={{ textAlign: 'left' }}
                              onClick={() => {
                                onSelectAudioTrack(at.trackIndex);
                                setAudioMenuOpen(false);
                              }}
                            >
                              {label}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

                <div className="popover-wrap">
                  <button
                    className={`icon-btn ${hasCustomVideoFx || videoFxMenuOpen ? 'active' : ''}`}
                    onClick={() => {
                      setVideoFxMenuOpen((v) => !v);
                      setSubMenuOpen(false);
                      setEqMenuOpen(false);
                      setSpeedMenuOpen(false);
                      setSleepMenuOpen(false);
                    }}
                    title="Cinema Glow, Video Filters & Rotate (V)"
                    aria-label="Video adjustments"
                  >
                    <Sparkles size={15} />
                  </button>

                  {videoFxMenuOpen && (
                    <div className="video-fx-menu">
                      <div className="subtitle-menu-header">
                        <span>Cinema & Video Pro</span>
                        <button className="pill-opt" onClick={onVideoFxReset}>
                          Reset
                        </button>
                      </div>

                      <div className="subtitle-row">
                        <span>Ambilight Glow (D)</span>
                        <button
                          className={`pill-opt ${videoFx.ambilight ? 'selected' : ''}`}
                          onClick={() => onVideoFxChange('ambilight', !videoFx.ambilight)}
                        >
                          {videoFx.ambilight ? 'ON' : 'OFF'}
                        </button>
                      </div>

                      <div className="subtitle-row">
                        <span>Transform</span>
                        <div style={{ display: 'inline-flex', gap: 4 }}>
                          <button
                            className={`pill-opt ${videoFx.rotation !== 0 ? 'selected' : ''}`}
                            onClick={() =>
                              onVideoFxChange(
                                'rotation',
                                ((videoFx.rotation + 90) % 360) as 0 | 90 | 180 | 270
                              )
                            }
                            title="Rotate 90° (R)"
                          >
                            <RotateCw size={11} style={{ marginRight: 3, verticalAlign: 'middle' }} />
                            {videoFx.rotation}°
                          </button>
                          <button
                            className={`pill-opt ${videoFx.mirror ? 'selected' : ''}`}
                            onClick={() => onVideoFxChange('mirror', !videoFx.mirror)}
                            title="Mirror horizontal"
                          >
                            <FlipHorizontal2 size={12} />
                          </button>
                        </div>
                      </div>

                      <div className="fx-slider-row">
                        <div className="fx-slider-label">
                          <span>Brightness</span>
                          <span className="fx-slider-val">{videoFx.brightness}%</span>
                        </div>
                        <input
                          type="range"
                          min={50}
                          max={150}
                          step={2}
                          value={videoFx.brightness}
                          onChange={(e) => onVideoFxChange('brightness', Number(e.target.value))}
                          className="fx-range"
                        />
                      </div>

                      <div className="fx-slider-row">
                        <div className="fx-slider-label">
                          <span>Contrast</span>
                          <span className="fx-slider-val">{videoFx.contrast}%</span>
                        </div>
                        <input
                          type="range"
                          min={50}
                          max={150}
                          step={2}
                          value={videoFx.contrast}
                          onChange={(e) => onVideoFxChange('contrast', Number(e.target.value))}
                          className="fx-range"
                        />
                      </div>

                      <div className="fx-slider-row">
                        <div className="fx-slider-label">
                          <span>Saturation</span>
                          <span className="fx-slider-val">{videoFx.saturation}%</span>
                        </div>
                        <input
                          type="range"
                          min={0}
                          max={200}
                          step={5}
                          value={videoFx.saturation}
                          onChange={(e) => onVideoFxChange('saturation', Number(e.target.value))}
                          className="fx-range"
                        />
                      </div>

                      <div className="fx-slider-row">
                        <div className="fx-slider-label">
                          <span>Zoom</span>
                          <span className="fx-slider-val">{videoFx.zoom.toFixed(2)}×</span>
                        </div>
                        <input
                          type="range"
                          min={1}
                          max={2}
                          step={0.05}
                          value={videoFx.zoom}
                          onChange={(e) => onVideoFxChange('zoom', Number(e.target.value))}
                          className="fx-range"
                        />
                      </div>

                      <div className="subtitle-row" style={{ paddingTop: 2 }}>
                        <span>Frame Step</span>
                        <div className="pill-group">
                          <button
                            className="pill-opt"
                            onClick={() => onFrameStep(-1)}
                            title="Previous frame (/)"
                          >
                            -1F
                          </button>
                          <button
                            className="pill-opt"
                            onClick={() => onFrameStep(1)}
                            title="Next frame (.)"
                          >
                            +1F
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <button
                  className="icon-btn"
                  onClick={onScreenshot}
                  title="Screenshot (S)"
                  aria-label="Take screenshot"
                >
                  <Camera size={16} />
                </button>

                <button
                  className="icon-btn"
                  onClick={onTogglePip}
                  title="Picture-in-Picture (I)"
                  aria-label="Picture in Picture"
                >
                  <PictureInPicture2 size={16} />
                </button>
              </>
            )}

            {!isVideoMode && (
              <button
                className={`icon-btn ${lyricsOpen || hasLyrics ? 'active' : ''}`}
                onClick={onToggleLyrics}
                title="Synchronized Lyrics (Y)"
                aria-label="Toggle lyrics"
              >
                <MicVocal size={15} />
              </button>
            )}

            <div className="popover-wrap">
              <button
                className={`speed-btn ${sleepTimer !== 0 || sleepMenuOpen ? 'active' : ''}`}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}
                onClick={() => {
                  setSleepMenuOpen((v) => !v);
                  setEqMenuOpen(false);
                  setSubMenuOpen(false);
                  setSpeedMenuOpen(false);
                }}
                title="Sleep Timer (Z)"
                aria-label="Sleep timer"
              >
                <Moon size={13} />
                {sleepTimer === 'eot'
                  ? 'END'
                  : sleepRemainingSec !== null
                    ? formatTime(sleepRemainingSec)
                    : ''}
              </button>

              {sleepMenuOpen && (
                <div className="speed-menu" style={{ minWidth: 138 }}>
                  {(
                    [
                      { label: 'Off', val: 0 },
                      { label: '15 min', val: 15 },
                      { label: '30 min', val: 30 },
                      { label: '45 min', val: 45 },
                      { label: '60 min', val: 60 },
                      { label: 'End of Track', val: 'eot' },
                    ] as Array<{ label: string; val: SleepTimerOption }>
                  ).map((item) => (
                    <button
                      key={String(item.val)}
                      className={`speed-option ${sleepTimer === item.val ? 'selected' : ''}`}
                      onClick={() => {
                        onSelectSleepTimer(item.val);
                        setSleepMenuOpen(false);
                      }}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="popover-wrap">
              <button
                className={`icon-btn ${eqState.enabled || eqMenuOpen ? 'active' : ''}`}
                onClick={() => {
                  setEqMenuOpen((v) => !v);
                  setSubMenuOpen(false);
                  setSpeedMenuOpen(false);
                }}
                title="Equalizer (E)"
                aria-label="Audio equalizer"
              >
                <SlidersHorizontal size={15} />
              </button>

              {eqMenuOpen && (
                <div className="eq-menu">
                  <div className="subtitle-menu-header">
                    <span>Equalizer</span>
                    <button
                      className={`pill-opt ${eqState.enabled ? 'selected' : ''}`}
                      onClick={onEqToggle}
                    >
                      {eqState.enabled ? 'ON' : 'OFF'}
                    </button>
                  </div>

                  <div className="eq-presets">
                    {(Object.keys(EQ_PRESETS) as Array<Exclude<EqPresetId, 'custom'>>).map(
                      (presetId) => (
                        <button
                          key={presetId}
                          className={`pill-opt ${eqState.preset === presetId ? 'selected' : ''}`}
                          onClick={() => onEqPreset(presetId)}
                        >
                          {EQ_PRESETS[presetId].label}
                        </button>
                      )
                    )}
                  </div>

                  <div className="eq-sliders">
                    {EQ_BANDS.map((band, idx) => {
                      const val = eqState.gains[idx] ?? 0;
                      return (
                        <div key={band.freq} className="eq-band">
                          <span className="eq-db">
                            {val > 0 ? `+${val.toFixed(0)}` : val.toFixed(0)}
                          </span>
                          <div className="eq-slider-wrap">
                            <input
                              type="range"
                              min={-12}
                              max={12}
                              step={0.5}
                              value={val}
                              onChange={(e) => onEqBandChange(idx, Number(e.target.value))}
                              className="eq-range"
                              aria-label={`${band.label} Hz`}
                            />
                          </div>
                          <span className="eq-freq">{band.label}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            <div className="speed-wrap">
              <button
                className={`speed-btn ${playbackRate !== 1 || speedMenuOpen ? 'active' : ''}`}
                onClick={() => {
                  setSpeedMenuOpen((v) => !v);
                  setSubMenuOpen(false);
                  setEqMenuOpen(false);
                }}
                title="Playback speed ([ / ])"
              >
                {playbackRate}×
              </button>

              {speedMenuOpen && (
                <div className="speed-menu">
                  {PLAYBACK_RATES.map((rate) => (
                    <button
                      key={rate}
                      className={`speed-option ${playbackRate === rate ? 'selected' : ''}`}
                      onClick={() => {
                        onRateChange(rate);
                        setSpeedMenuOpen(false);
                      }}
                    >
                      {rate}×
                    </button>
                  ))}
                </div>
              )}
            </div>

            <button
              className={`icon-btn ${queueOpen ? 'active' : ''}`}
              onClick={onToggleQueue}
              title="Queue (Q)"
              aria-label="Toggle queue"
            >
              <ListMusic size={16} />
            </button>

            <button
              className="icon-btn"
              onClick={onToggleFullscreen}
              title="Fullscreen (F)"
              aria-label="Toggle fullscreen"
            >
              {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
