import { useEffect, useRef } from 'react';
import {
  Camera,
  Captions,
  FilePlus2,
  FolderOpen,
  Globe,
  HelpCircle,
  Info,
  ListMusic,
  Maximize2,
  Minimize2,
  Pause,
  Pin,
  Play,
  Settings,
} from 'lucide-react';

interface ContextMenuProps {
  position: { x: number; y: number } | null;
  hasTrack: boolean;
  isVideoMode: boolean;
  isPlaying: boolean;
  miniMode: boolean;
  alwaysOnTop: boolean;
  onClose: () => void;
  onOpenFiles: () => void;
  onOpenFolder: () => void;
  onOpenStream: () => void;
  onOpenMediaInfo: () => void;
  onTogglePlay: () => void;
  onLoadSubtitle: () => void;
  onCycleAspect: () => void;
  onScreenshot: () => void;
  onToggleMiniMode: () => void;
  onToggleAlwaysOnTop: () => void;
  onToggleQueue: () => void;
  onOpenSettings: () => void;
  onOpenShortcuts: () => void;
}

export function ContextMenu({
  position,
  hasTrack,
  isVideoMode,
  isPlaying,
  miniMode,
  alwaysOnTop,
  onClose,
  onOpenFiles,
  onOpenFolder,
  onOpenStream,
  onOpenMediaInfo,
  onTogglePlay,
  onLoadSubtitle,
  onCycleAspect,
  onScreenshot,
  onToggleMiniMode,
  onToggleAlwaysOnTop,
  onToggleQueue,
  onOpenSettings,
  onOpenShortcuts,
}: ContextMenuProps) {
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!position) return;
    const handlePointerDown = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('mousedown', handlePointerDown);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('mousedown', handlePointerDown);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [position, onClose]);

  if (!position) return null;

  const menuWidth = 236;
  const approxHeight = hasTrack ? (isVideoMode ? 410 : 320) : 220;
  const left = Math.min(position.x, Math.max(8, window.innerWidth - menuWidth - 8));
  const top = Math.min(position.y, Math.max(8, window.innerHeight - approxHeight - 8));

  const run = (fn: () => void) => {
    onClose();
    fn();
  };

  return (
    <div
      ref={menuRef}
      className="context-menu"
      style={{ left, top }}
      role="menu"
      onClick={(e) => e.stopPropagation()}
      onContextMenu={(e) => e.preventDefault()}
    >
      <button className="context-item" onClick={() => run(onOpenFiles)}>
        <FilePlus2 size={14} />
        <span className="context-label">Open Media…</span>
        <kbd>O</kbd>
      </button>
      <button className="context-item" onClick={() => run(onOpenFolder)}>
        <FolderOpen size={14} />
        <span className="context-label">Open Folder…</span>
      </button>
      <button className="context-item" onClick={() => run(onOpenStream)}>
        <Globe size={14} />
        <span className="context-label">Open Network Stream…</span>
        <kbd>U</kbd>
      </button>

      {hasTrack && (
        <>
          <div className="context-divider" />
          <button className="context-item" onClick={() => run(onTogglePlay)}>
            {isPlaying ? <Pause size={14} /> : <Play size={14} />}
            <span className="context-label">{isPlaying ? 'Pause' : 'Play'}</span>
            <kbd>Space</kbd>
          </button>

          {isVideoMode && (
            <>
              <button className="context-item" onClick={() => run(onLoadSubtitle)}>
                <Captions size={14} />
                <span className="context-label">Load Subtitles…</span>
                <kbd>C</kbd>
              </button>
              <button className="context-item" onClick={() => run(onCycleAspect)}>
                <Maximize2 size={14} />
                <span className="context-label">Cycle Aspect Ratio</span>
                <kbd>A</kbd>
              </button>
              <button className="context-item" onClick={() => run(onScreenshot)}>
                <Camera size={14} />
                <span className="context-label">Screenshot Frame</span>
                <kbd>S</kbd>
              </button>
            </>
          )}

          <button className="context-item" onClick={() => run(onOpenMediaInfo)}>
            <Info size={14} />
            <span className="context-label">Codec & Media Info</span>
            <kbd>⌘I</kbd>
          </button>

          <button className="context-item" onClick={() => run(onToggleMiniMode)}>
            <Minimize2 size={14} />
            <span className="context-label">{miniMode ? 'Exit Mini-Player' : 'Mini-Player'}</span>
            <kbd>W</kbd>
          </button>

          {window.sapira && (
            <button className="context-item" onClick={() => run(onToggleAlwaysOnTop)}>
              <Pin size={14} />
              <span className="context-label">
                {alwaysOnTop ? 'Unpin from Top' : 'Always on Top'}
              </span>
              <kbd>T</kbd>
            </button>
          )}

          <button className="context-item" onClick={() => run(onToggleQueue)}>
            <ListMusic size={14} />
            <span className="context-label">Library & Playlists</span>
            <kbd>Q</kbd>
          </button>
        </>
      )}

      <div className="context-divider" />

      <button className="context-item accent" onClick={() => run(onOpenSettings)}>
        <Settings size={14} />
        <span className="context-label">Settings…</span>
        <kbd>,</kbd>
      </button>

      <button className="context-item" onClick={() => run(onOpenShortcuts)}>
        <HelpCircle size={14} />
        <span className="context-label">Keyboard Shortcuts</span>
        <kbd>?</kbd>
      </button>
    </div>
  );
}
