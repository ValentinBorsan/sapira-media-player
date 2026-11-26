import { useEffect, useRef } from 'react';
import { FileText, Globe, MicVocal, X } from 'lucide-react';
import type { LyricLine } from '../types/media';

interface LyricsOverlayProps {
  open: boolean;
  lines: LyricLine[];
  synced: boolean;
  activeIndex: number;
  loading: boolean;
  sourceLabel: string | null;
  onClose: () => void;
  onSeek: (time: number) => void;
  onLoadFile: () => void;
  onSearchOnline: () => void;
}

export function LyricsOverlay({
  open,
  lines,
  synced,
  activeIndex,
  loading,
  sourceLabel,
  onClose,
  onSeek,
  onLoadFile,
  onSearchOnline,
}: LyricsOverlayProps) {
  const activeLineRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (!open || !synced || activeIndex < 0) return;
    activeLineRef.current?.scrollIntoView({
      behavior: 'smooth',
      block: 'center',
    });
  }, [open, synced, activeIndex]);

  if (!open) return null;

  return (
    <aside
      className="lyrics-panel"
      onClick={(e) => e.stopPropagation()}
      aria-label="Synchronized Lyrics"
    >
      <div className="lyrics-header">
        <div className="drawer-title-group">
          <MicVocal size={15} style={{ color: '#67e8f9' }} />
          <span className="drawer-title">Lyrics</span>
          {synced && lines.length > 0 && <span className="drawer-count">SYNCED</span>}
        </div>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
          <button
            className="queue-mini-btn"
            onClick={onSearchOnline}
            title="Fetch lyrics online (LRCLIB)"
            aria-label="Search lyrics online"
          >
            <Globe size={13} />
          </button>
          <button
            className="queue-mini-btn"
            onClick={onLoadFile}
            title="Load local .LRC file"
            aria-label="Load local LRC file"
          >
            <FileText size={13} />
          </button>
          <button className="icon-btn" style={{ width: 28, height: 28 }} onClick={onClose} aria-label="Close lyrics">
            <X size={15} />
          </button>
        </div>
      </div>

      {sourceLabel && (
        <div className="lyrics-source" title={sourceLabel}>
          {sourceLabel}
        </div>
      )}

      {loading ? (
        <div className="queue-empty">
          <p>Searching synchronized lyrics…</p>
        </div>
      ) : lines.length === 0 ? (
        <div className="queue-empty">
          <p>No lyrics loaded for this track.</p>
          <p>Search online via LRCLIB or load a local .LRC file.</p>
          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
            <button className="drawer-chip-btn accent" onClick={onSearchOnline}>
              <Globe size={13} />
              Fetch Online
            </button>
            <button className="drawer-chip-btn" onClick={onLoadFile}>
              <FileText size={13} />
              Load .LRC
            </button>
          </div>
        </div>
      ) : (
        <div className="lyrics-scroll">
          <div style={{ minHeight: 72 }} />
          {lines.map((line, idx) => {
            const isActive = synced && idx === activeIndex;
            const isPast = synced && activeIndex >= 0 && idx < activeIndex;
            return (
              <button
                key={`${line.time}-${idx}`}
                ref={isActive ? activeLineRef : null}
                type="button"
                className={`lyric-line ${isActive ? 'active' : ''} ${isPast ? 'past' : ''}`}
                onClick={() => {
                  if (synced) onSeek(line.time);
                }}
              >
                {line.text}
              </button>
            );
          })}
          <div style={{ minHeight: 96 }} />
        </div>
      )}
    </aside>
  );
}
