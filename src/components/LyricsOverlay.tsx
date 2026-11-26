import { memo, useEffect, useRef } from 'react';
import { FileText, Globe, MicVocal, Sparkles, X } from 'lucide-react';
import type { LyricLine } from '../types/media';
import { formatTime } from '../utils/format';

interface LyricsOverlayProps {
  open: boolean;
  lines: LyricLine[];
  synced: boolean;
  activeIndex: number;
  isPlaying?: boolean;
  loading: boolean;
  sourceLabel: string | null;
  onClose: () => void;
  onSeek: (time: number) => void;
  onLoadFile: () => void;
  onSearchOnline: () => void;
}

export const LyricsOverlay = memo(function LyricsOverlay({
  open,
  lines,
  synced,
  activeIndex,
  isPlaying = false,
  loading,
  sourceLabel,
  onClose,
  onSeek,
  onLoadFile,
  onSearchOnline,
}: LyricsOverlayProps) {
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const activeLineRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (!open || !synced || activeIndex < 0) return;
    const container = scrollContainerRef.current;
    const lineEl = activeLineRef.current;
    if (!container || !lineEl) return;

    const targetTop =
      lineEl.offsetTop - container.clientHeight * 0.4 + lineEl.offsetHeight * 0.5;
    container.scrollTo({
      top: Math.max(0, targetTop),
      behavior: 'smooth',
    });
  }, [open, synced, activeIndex]);

  if (!open) return null;

  return (
    <aside
      className="lyrics-stage"
      onClick={(e) => e.stopPropagation()}
      aria-label="Synchronized Lyrics"
    >
      <header className="lyrics-stage-bar">
        <div className="lyrics-stage-meta">
          <span className={`lyrics-pulse-dot ${isPlaying && lines.length > 0 ? 'live' : ''}`} />
          <MicVocal size={13} className="lyrics-stage-icon" />
          <span className="lyrics-stage-label">Lyrics</span>
          {lines.length > 0 && (
            <span className={`lyrics-sync-pill ${synced ? 'is-synced' : ''}`}>
              {synced ? 'SYNCED' : 'TEXT'}
            </span>
          )}
          {sourceLabel && (
            <span className="lyrics-source-inline" title={sourceLabel}>
              {sourceLabel}
            </span>
          )}
        </div>

        <div className="lyrics-stage-actions">
          <button
            type="button"
            className="lyrics-action-pill"
            onClick={onSearchOnline}
            title="Fetch synchronized lyrics from LRCLIB"
            aria-label="Search lyrics online"
          >
            <Globe size={12} />
            <span>Online</span>
          </button>
          <button
            type="button"
            className="lyrics-action-pill"
            onClick={onLoadFile}
            title="Load local .LRC or .TXT lyrics"
            aria-label="Load local LRC file"
          >
            <FileText size={12} />
            <span>.LRC</span>
          </button>
          <button
            type="button"
            className="lyrics-close-btn"
            onClick={onClose}
            aria-label="Close lyrics"
            title="Hide lyrics (L)"
          >
            <X size={14} />
          </button>
        </div>
      </header>

      {loading ? (
        <div className="lyrics-empty-state">
          <div className="lyrics-loading-orb">
            <Sparkles size={18} />
          </div>
          <p className="lyrics-empty-title">Matching synchronized lyrics…</p>
          <p className="lyrics-empty-sub">Querying LRCLIB open catalog</p>
        </div>
      ) : lines.length === 0 ? (
        <div className="lyrics-empty-state">
          <div className="lyrics-empty-badge">
            <MicVocal size={18} />
          </div>
          <p className="lyrics-empty-title">No lyrics loaded yet</p>
          <p className="lyrics-empty-sub">
            Fetch time-synced verses from LRCLIB or drop any <code>.lrc</code> file onto the stage.
          </p>
          <div className="lyrics-empty-btns">
            <button type="button" className="lyrics-cta-primary" onClick={onSearchOnline}>
              <Globe size={13} />
              <span>Fetch Online</span>
            </button>
            <button type="button" className="lyrics-cta-ghost" onClick={onLoadFile}>
              <FileText size={13} />
              <span>Load .LRC</span>
            </button>
          </div>
        </div>
      ) : (
        <div ref={scrollContainerRef} className="lyrics-scroll">
          <div className="lyrics-spacer-top" aria-hidden="true" />
          {lines.map((line, idx) => {
            const isActive = synced && idx === activeIndex;
            const isPast = synced && activeIndex >= 0 && idx < activeIndex;
            const dist = synced && activeIndex >= 0 ? Math.abs(idx - activeIndex) : 0;
            const depthClass = !synced
              ? 'unsynced'
              : isActive
                ? 'is-active'
                : dist === 1
                  ? 'is-near'
                  : dist === 2
                    ? 'is-mid'
                    : 'is-far';

            return (
              <button
                key={`${line.time}-${idx}`}
                ref={isActive ? activeLineRef : null}
                type="button"
                className={`lyric-line ${depthClass} ${isPast ? 'is-past' : ''} ${synced ? 'is-clickable' : ''}`}
                onClick={() => {
                  if (synced) onSeek(line.time);
                }}
              >
                <span className="lyric-line-text">{line.text || '♪'}</span>
                {synced && <span className="lyric-line-time">{formatTime(line.time)}</span>}
              </button>
            );
          })}
          <div className="lyrics-spacer-bottom" aria-hidden="true" />
        </div>
      )}
    </aside>
  );
});
