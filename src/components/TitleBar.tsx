import { memo } from 'react';
import {
  FolderOpen,
  Globe,
  HelpCircle,
  Info,
  ListMusic,
  Minimize2,
  Minus,
  Pin,
  Plus,
  Search,
  Settings,
  Square,
  X,
} from 'lucide-react';
import type { MediaTrack } from '../types/media';

interface TitleBarProps {
  currentTrack: MediaTrack | null;
  displayTitle: string | null;
  isPlaying: boolean;
  isTranscoding?: boolean;
  alwaysOnTop: boolean;
  queueCount: number;
  queueOpen: boolean;
  settingsOpen: boolean;
  isFullscreen: boolean;
  hudVisible: boolean;
  onOpenCommandPalette: () => void;
  onOpenFiles: () => void;
  onOpenFolder: () => void;
  onOpenStream: () => void;
  onOpenMediaInfo: () => void;
  onToggleAlwaysOnTop: () => void;
  onToggleMiniMode: () => void;
  onToggleQueue: () => void;
  onToggleSettings: () => void;
  onToggleShortcuts: () => void;
}

export const TitleBar = memo(function TitleBar({
  currentTrack,
  displayTitle,
  isPlaying,
  isTranscoding,
  alwaysOnTop,
  queueCount,
  queueOpen,
  settingsOpen,
  isFullscreen,
  hudVisible,
  onOpenCommandPalette,
  onOpenFiles,
  onOpenFolder,
  onOpenStream,
  onOpenMediaInfo,
  onToggleAlwaysOnTop,
  onToggleMiniMode,
  onToggleQueue,
  onToggleSettings,
  onToggleShortcuts,
}: TitleBarProps) {
  const isElectron = Boolean(window.sapira);
  const isMac = window.sapira?.platform === 'darwin';

  return (
    <header
      className={[
        'titlebar',
        isMac ? 'is-mac' : '',
        isFullscreen ? 'is-fullscreen' : '',
        !hudVisible ? 'hud-hidden' : '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <div className="titlebar-left">
        <div className="titlebar-brand">
          <img src="./sapira-logo.png" alt="Sapira Media Player" className="titlebar-logo-img" />
          <span>Sapira Media Player</span>
        </div>
      </div>

      <div className="titlebar-center">
        {currentTrack && (
          <div
            className="track-pill"
            title={`${displayTitle || currentTrack.name} — Click for Media & Codec Info`}
            onClick={onOpenMediaInfo}
            style={{ cursor: 'pointer' }}
          >
            <span className={`signal-dot ${isPlaying ? 'live' : ''}`} />
            <span className="track-pill-title">{displayTitle || currentTrack.name}</span>
            <span className="format-badge">
              {currentTrack.ext}
              {isTranscoding ? ' · FF' : ''}
            </span>
          </div>
        )}
      </div>

      <div className="titlebar-right">
        <div className="titlebar-actions">
          <button
            className="icon-btn"
            onClick={onOpenCommandPalette}
            title="Command Palette (Cmd/Ctrl+K)"
            aria-label="Open command palette"
          >
            <Search size={15} />
          </button>
          <button
            className="icon-btn"
            onClick={onOpenFiles}
            title="Open files (O)"
            aria-label="Open files"
          >
            <Plus size={17} />
          </button>
          <button
            className="icon-btn"
            onClick={onOpenFolder}
            title="Open folder"
            aria-label="Open folder"
          >
            <FolderOpen size={16} />
          </button>
          <button
            className="icon-btn"
            onClick={onOpenStream}
            title="Open Network Stream / URL (U)"
            aria-label="Open network stream"
          >
            <Globe size={15} />
          </button>
          {currentTrack && (
            <button
              className="icon-btn"
              onClick={onOpenMediaInfo}
              title="Codec & Media Info (Cmd/Ctrl+I)"
              aria-label="Media info"
            >
              <Info size={15} />
            </button>
          )}
          {currentTrack && (
            <button
              className="icon-btn"
              onClick={onToggleMiniMode}
              title="Mini-Player (W)"
              aria-label="Enter mini player"
            >
              <Minimize2 size={15} />
            </button>
          )}
          {isElectron && (
            <button
              className={`icon-btn ${alwaysOnTop ? 'active' : ''}`}
              onClick={onToggleAlwaysOnTop}
              title={alwaysOnTop ? 'Unpin window (T)' : 'Always on top (T)'}
              aria-label="Toggle always on top"
            >
              <Pin size={15} />
            </button>
          )}
          <button
            className={`icon-btn ${settingsOpen ? 'active' : ''}`}
            onClick={onToggleSettings}
            title="Settings (,)"
            aria-label="Settings"
          >
            <Settings size={16} />
          </button>
          <button
            className="icon-btn"
            onClick={onToggleShortcuts}
            title="Keyboard shortcuts (?)"
            aria-label="Keyboard shortcuts"
          >
            <HelpCircle size={16} />
          </button>
          <button
            className={`icon-btn queue-trigger ${queueOpen ? 'active' : ''}`}
            onClick={onToggleQueue}
            title="Queue (Q)"
            aria-label="Toggle queue"
          >
            <ListMusic size={17} />
            {queueCount > 0 && <span className="queue-count-badge">{queueCount}</span>}
          </button>

          {isElectron && !isMac && (
            <div className="window-controls">
              <button
                className="window-btn"
                onClick={() => window.sapira?.minimize()}
                aria-label="Minimize"
              >
                <Minus size={14} />
              </button>
              <button
                className="window-btn"
                onClick={() => window.sapira?.maximize()}
                aria-label="Maximize"
              >
                <Square size={12} />
              </button>
              <button
                className="window-btn close"
                onClick={() => window.sapira?.close()}
                aria-label="Close"
              >
                <X size={14} />
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
});
