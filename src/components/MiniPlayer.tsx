import { Expand, Pause, Play, SkipBack, SkipForward } from 'lucide-react';
import type { AudioMetadata, MediaTrack } from '../types/media';
import { formatTime } from '../utils/format';

interface MiniPlayerProps {
  track: MediaTrack | null;
  metadata: AudioMetadata;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  canStepTrack: boolean;
  onTogglePlay: () => void;
  onPrev: () => void;
  onNext: () => void;
  onSeek: (time: number) => void;
  onExitMiniMode: () => void;
}

export function MiniPlayer({
  track,
  metadata,
  isPlaying,
  currentTime,
  duration,
  canStepTrack,
  onTogglePlay,
  onPrev,
  onNext,
  onSeek,
  onExitMiniMode,
}: MiniPlayerProps) {
  const isMac = window.sapira?.platform === 'darwin';
  const title = metadata.title || track?.name || 'Sapira Media Player';
  const subtitle = metadata.artist
    ? metadata.album
      ? `${metadata.artist} · ${metadata.album}`
      : metadata.artist
    : track
      ? `${track.ext} · ${track.kind.toUpperCase()}`
      : 'Ready';

  const progress = duration > 0 ? Math.min(100, (currentTime / duration) * 100) : 0;

  return (
    <div className={`mini-shell ${isMac ? 'is-mac' : ''}`}>
      <div className="mini-content">
        <div className={`mini-art ${isPlaying ? 'playing' : ''}`}>
          <img
            src={metadata.coverDataUrl || './sapira-logo.png'}
            alt={title}
            className={metadata.coverDataUrl ? 'mini-cover-img' : 'mini-logo-img'}
          />
        </div>

        <div className="mini-info">
          <div className="mini-title" title={title}>
            {title}
          </div>
          <div className="mini-sub" title={subtitle}>
            <span>{subtitle}</span>
            {duration > 0 && (
              <span className="mini-time">
                {formatTime(currentTime)} / {formatTime(duration)}
              </span>
            )}
          </div>
        </div>

        <div className="mini-controls">
          <button
            className="icon-btn"
            onClick={onPrev}
            disabled={!canStepTrack && currentTime < 3}
            title="Previous (P)"
            aria-label="Previous"
          >
            <SkipBack size={15} />
          </button>

          <button
            className="play-btn mini-play"
            onClick={onTogglePlay}
            title={isPlaying ? 'Pause (Space)' : 'Play (Space)'}
            aria-label={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? (
              <Pause size={16} fill="currentColor" />
            ) : (
              <Play size={16} fill="currentColor" style={{ marginLeft: 2 }} />
            )}
          </button>

          <button
            className="icon-btn"
            onClick={onNext}
            disabled={!canStepTrack}
            title="Next (N)"
            aria-label="Next"
          >
            <SkipForward size={15} />
          </button>

          <button
            className="icon-btn"
            onClick={onExitMiniMode}
            title="Expand player (W)"
            aria-label="Exit mini player"
          >
            <Expand size={15} />
          </button>
        </div>
      </div>

      <div
        className="mini-progress-hit"
        onClick={(e) => {
          if (duration <= 0) return;
          const rect = e.currentTarget.getBoundingClientRect();
          const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
          onSeek(ratio * duration);
        }}
      >
        <div className="mini-progress-fill" style={{ width: `${progress}%` }} />
      </div>
    </div>
  );
}
