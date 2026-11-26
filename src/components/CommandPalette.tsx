import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Clock,
  Command,
  Film,
  FolderOpen,
  Globe,
  Languages,
  ListMusic,
  Music,
  Palette,
  Search,
  Settings,
  SlidersHorizontal,
  Sparkles,
  X,
} from 'lucide-react';
import type { MediaTrack } from '../types/media';
import { SAPIRA_THEMES, STRINGS, type SapiraLanguage, type SapiraTheme } from '../utils/i18n';
import type { SavedPlaylist } from '../utils/playlists';
import type { RecentMediaEntry } from '../utils/recents';

export interface PaletteActionItem {
  id: string;
  title: string;
  subtitle: string;
  shortcut?: string;
  icon: React.ReactNode;
  run: () => void;
}

interface CommandPaletteProps {
  open: boolean;
  language: SapiraLanguage;
  queue: MediaTrack[];
  playlists: SavedPlaylist[];
  recents: RecentMediaEntry[];
  onClose: () => void;
  onSelectQueueTrack: (index: number) => void;
  onPlayPlaylist: (playlistId: string) => void;
  onPlayRecent: (entry: RecentMediaEntry) => void;
  onOpenFiles: () => void;
  onOpenFolder: () => void;
  onOpenStream: () => void;
  onOpenSettings: () => void;
  onToggleEq: () => void;
  onToggleAmbilight: () => void;
  onSetTheme: (theme: SapiraTheme) => void;
  onSetLanguage: (lang: SapiraLanguage) => void;
}

export function CommandPalette({
  open,
  language,
  queue,
  playlists,
  recents,
  onClose,
  onSelectQueueTrack,
  onPlayPlaylist,
  onPlayRecent,
  onOpenFiles,
  onOpenFolder,
  onOpenStream,
  onOpenSettings,
  onToggleEq,
  onToggleAmbilight,
  onSetTheme,
  onSetLanguage,
}: CommandPaletteProps) {
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const t = STRINGS[language];

  useEffect(() => {
    if (open) {
      setQuery('');
      setActiveIndex(0);
      window.setTimeout(() => inputRef.current?.focus(), 10);
    }
  }, [open]);

  const items = useMemo<PaletteActionItem[]>(() => {
    const all: PaletteActionItem[] = [];

    // 1. Queue items
    queue.forEach((track, idx) => {
      all.push({
        id: `q-${track.id}`,
        title: track.name,
        subtitle: `${t.queue} · ${track.ext}`,
        icon: track.kind === 'video' ? <Film size={14} /> : <Music size={14} />,
        run: () => onSelectQueueTrack(idx),
      });
    });

    // 2. Playlists
    playlists.forEach((pl) => {
      all.push({
        id: `pl-${pl.id}`,
        title: pl.name,
        subtitle: `${t.playlists} · ${pl.tracks.length} items`,
        icon: <ListMusic size={14} />,
        run: () => onPlayPlaylist(pl.id),
      });
    });

    // 3. Quick Commands
    all.push(
      {
        id: 'cmd-open-files',
        title: t.openMedia,
        subtitle: language === 'ro' ? 'Alege fișiere din PC' : 'Pick media files from PC',
        shortcut: 'O',
        icon: <Film size={14} />,
        run: onOpenFiles,
      },
      {
        id: 'cmd-open-folder',
        title: t.openFolder,
        subtitle: language === 'ro' ? 'Scanează un folder media' : 'Scan a media folder',
        icon: <FolderOpen size={14} />,
        run: onOpenFolder,
      },
      {
        id: 'cmd-open-stream',
        title: t.openUrl,
        subtitle: 'HLS (.m3u8) / Radio / HTTP',
        shortcut: 'U',
        icon: <Globe size={14} />,
        run: onOpenStream,
      },
      {
        id: 'cmd-ambilight',
        title: language === 'ro' ? 'Comută Ambilight Cinema Glow' : 'Toggle Ambilight Cinema Glow',
        subtitle: 'Video Pro',
        shortcut: 'D',
        icon: <Sparkles size={14} />,
        run: onToggleAmbilight,
      },
      {
        id: 'cmd-eq',
        title: language === 'ro' ? 'Comută Egalizatorul Audio' : 'Toggle Audio Equalizer',
        subtitle: '5-Band Web Audio EQ',
        shortcut: 'E',
        icon: <SlidersHorizontal size={14} />,
        run: onToggleEq,
      },
      {
        id: 'cmd-settings',
        title: t.settings,
        subtitle: language === 'ro' ? 'Deschide panoul de configurare' : 'Open preferences panel',
        shortcut: ',',
        icon: <Settings size={14} />,
        run: onOpenSettings,
      }
    );

    // 4. Color Themes
    SAPIRA_THEMES.forEach((th) => {
      const thName = language === 'ro' ? th.labelRo : th.labelEn;
      all.push({
        id: `theme-${th.id}`,
        title: `${language === 'ro' ? 'Temă' : 'Theme'}: ${thName}`,
        subtitle: language === 'ro' ? 'Schimbă paleta cromatică' : 'Switch color theme',
        icon: <Palette size={14} />,
        run: () => onSetTheme(th.id),
      });
    });

    // 5. Language Switch
    all.push(
      {
        id: 'lang-ro',
        title: 'Limbă: Română',
        subtitle: 'Setează interfața în limba română',
        icon: <Languages size={14} />,
        run: () => onSetLanguage('ro'),
      },
      {
        id: 'lang-en',
        title: 'Language: English',
        subtitle: 'Switch interface to English',
        icon: <Languages size={14} />,
        run: () => onSetLanguage('en'),
      }
    );

    // 6. Recent files (deduplicated against current queue)
    const queuePaths = new Set(queue.map((qItem) => qItem.path));
    recents.forEach((rec) => {
      if (queuePaths.has(rec.path)) return;
      all.push({
        id: `rec-${rec.path}`,
        title: rec.name,
        subtitle: `${t.recents} · ${rec.ext}`,
        icon: <Clock size={14} />,
        run: () => onPlayRecent(rec),
      });
    });

    const q = query.trim().toLowerCase();
    if (!q) return all.slice(0, 18);

    return all.filter(
      (item) =>
        item.title.toLowerCase().includes(q) || item.subtitle.toLowerCase().includes(q)
    );
  }, [
    language,
    onOpenFiles,
    onOpenFolder,
    onOpenSettings,
    onOpenStream,
    onPlayPlaylist,
    onPlayRecent,
    onSelectQueueTrack,
    onSetLanguage,
    onSetTheme,
    onToggleAmbilight,
    onToggleEq,
    playlists,
    query,
    queue,
    recents,
    t,
  ]);

  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  if (!open) return null;

  const executeItem = (item: PaletteActionItem | undefined) => {
    if (!item) return;
    onClose();
    item.run();
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="command-palette" onClick={(e) => e.stopPropagation()}>
        <div className="command-input-row">
          <Search size={16} style={{ color: 'var(--prism-cyan)', flexShrink: 0 }} />
          <input
            ref={inputRef}
            type="text"
            className="command-input"
            placeholder={t.commandPlaceholder}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'ArrowDown') {
                e.preventDefault();
                setActiveIndex((prev) => (items.length > 0 ? (prev + 1) % items.length : 0));
              } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                setActiveIndex((prev) =>
                  items.length > 0 ? (prev - 1 + items.length) % items.length : 0
                );
              } else if (e.key === 'Enter') {
                e.preventDefault();
                executeItem(items[activeIndex]);
              } else if (e.key === 'Escape') {
                e.preventDefault();
                onClose();
              }
            }}
          />
          <span className="command-badge">
            <Command size={11} />K
          </span>
          <button className="icon-btn" style={{ width: 28, height: 28 }} onClick={onClose}>
            <X size={15} />
          </button>
        </div>

        <div className="command-list">
          {items.length === 0 ? (
            <div className="queue-empty" style={{ padding: '28px 16px' }}>
              <p>{language === 'ro' ? 'Niciun rezultat găsit.' : 'No matching commands or media.'}</p>
            </div>
          ) : (
            items.map((item, idx) => (
              <button
                key={item.id}
                type="button"
                className={`command-item ${idx === activeIndex ? 'selected' : ''}`}
                onMouseEnter={() => setActiveIndex(idx)}
                onClick={() => executeItem(item)}
              >
                <span className="command-item-icon">{item.icon}</span>
                <span className="command-item-copy">
                  <span className="command-item-title">{item.title}</span>
                  <span className="command-item-sub">{item.subtitle}</span>
                </span>
                {item.shortcut && <kbd>{item.shortcut}</kbd>}
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
