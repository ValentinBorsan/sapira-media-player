import { useMemo, useState } from 'react';
import {
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  BookmarkPlus,
  Clock,
  Download,
  Film,
  FolderOpen,
  Globe,
  ListPlus,
  Music,
  Play,
  Plus,
  Search,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import type { MediaTrack } from '../types/media';
import { formatFileSize } from '../utils/format';
import type { SavedPlaylist } from '../utils/playlists';
import type { RecentMediaEntry } from '../utils/recents';

type DrawerTab = 'queue' | 'playlists' | 'recents';
type MediaFilter = 'all' | 'audio' | 'video';

interface QueueDrawerProps {
  open: boolean;
  queue: MediaTrack[];
  currentIndex: number;
  isPlaying: boolean;
  playlists: SavedPlaylist[];
  recents: RecentMediaEntry[];
  onClose: () => void;
  onSelect: (index: number) => void;
  onMoveTrack: (fromIndex: number, toIndex: number) => void;
  onRemove: (index: number) => void;
  onClear: () => void;
  onAddFiles: () => void;
  onAddFolder: () => void;
  onCreatePlaylist: (name: string, fromQueue?: boolean) => string;
  onDeletePlaylist: (id: string) => void;
  onAddFilesToPlaylist: (playlistId: string) => void;
  onAddFolderToPlaylist: (playlistId: string) => void;
  onRemoveTrackFromPlaylist: (playlistId: string, trackIndex: number) => void;
  onPlayPlaylist: (playlistId: string, startIndex?: number) => void;
  onAppendPlaylistToQueue: (playlistId: string) => void;
  onExportPlaylist: (playlistId: string) => void;
  onImportPlaylist: () => void;
  onPlayRecent: (entry: RecentMediaEntry) => void;
  onClearRecents: () => void;
}

export function QueueDrawer({
  open,
  queue,
  currentIndex,
  isPlaying,
  playlists,
  recents,
  onClose,
  onSelect,
  onMoveTrack,
  onRemove,
  onClear,
  onAddFiles,
  onAddFolder,
  onCreatePlaylist,
  onDeletePlaylist,
  onAddFilesToPlaylist,
  onAddFolderToPlaylist,
  onRemoveTrackFromPlaylist,
  onPlayPlaylist,
  onAppendPlaylistToQueue,
  onExportPlaylist,
  onImportPlaylist,
  onPlayRecent,
  onClearRecents,
}: QueueDrawerProps) {
  const [tab, setTab] = useState<DrawerTab>('queue');
  const [filter, setFilter] = useState<MediaFilter>('all');
  const [search, setSearch] = useState('');
  const [selectedPlaylistId, setSelectedPlaylistId] = useState<string | null>(null);
  const [creatingMode, setCreatingMode] = useState<'empty' | 'fromQueue' | null>(null);
  const [newPlaylistName, setNewPlaylistName] = useState('');

  const activePlaylist = useMemo(
    () => playlists.find((p) => p.id === selectedPlaylistId) ?? null,
    [playlists, selectedPlaylistId]
  );

  const audioCount = useMemo(() => queue.filter((t) => t.kind === 'audio').length, [queue]);
  const videoCount = useMemo(() => queue.filter((t) => t.kind === 'video').length, [queue]);

  const filteredQueue = useMemo(() => {
    const q = search.trim().toLowerCase();
    return queue
      .map((track, originalIndex) => ({ track, originalIndex }))
      .filter(({ track }) => {
        if (filter !== 'all' && track.kind !== filter) return false;
        if (q && !track.name.toLowerCase().includes(q) && !track.ext.toLowerCase().includes(q)) {
          return false;
        }
        return true;
      });
  }, [queue, filter, search]);

  const filteredPlaylistTracks = useMemo(() => {
    if (!activePlaylist) return [];
    const q = search.trim().toLowerCase();
    return activePlaylist.tracks
      .map((track, originalIndex) => ({ track, originalIndex }))
      .filter(({ track }) => {
        if (filter !== 'all' && track.kind !== filter) return false;
        if (q && !track.name.toLowerCase().includes(q) && !track.ext.toLowerCase().includes(q)) {
          return false;
        }
        return true;
      });
  }, [activePlaylist, filter, search]);

  const handleConfirmCreate = () => {
    const trimmed = newPlaylistName.trim();
    if (!trimmed) return;
    const id = onCreatePlaylist(trimmed, creatingMode === 'fromQueue');
    setNewPlaylistName('');
    setCreatingMode(null);
    setTab('playlists');
    setSelectedPlaylistId(id);
  };

  return (
    <>
      <div className={`drawer-backdrop ${open ? 'open' : ''}`} onClick={onClose} />

      <aside className={`queue-drawer ${open ? 'open' : ''}`} aria-label="Library and Playlists">
        <div className="drawer-header">
          <div className="drawer-tabs">
            <button
              className={`drawer-tab ${tab === 'queue' ? 'active' : ''}`}
              onClick={() => {
                setTab('queue');
                setSearch('');
              }}
            >
              Queue
              <span className="drawer-count">{queue.length}</span>
            </button>
            <button
              className={`drawer-tab ${tab === 'playlists' ? 'active' : ''}`}
              onClick={() => {
                setTab('playlists');
                setSearch('');
              }}
            >
              Playlists
              <span className="drawer-count">{playlists.length}</span>
            </button>
            <button
              className={`drawer-tab ${tab === 'recents' ? 'active' : ''}`}
              onClick={() => {
                setTab('recents');
                setSearch('');
              }}
            >
              Recents
            </button>
          </div>
          <button className="icon-btn" onClick={onClose} aria-label="Close library">
            <X size={16} />
          </button>
        </div>

        {/* Inline Playlist Creation Bar */}
        {creatingMode && (
          <div className="playlist-create-bar">
            <input
              type="text"
              className="drawer-input"
              placeholder={
                creatingMode === 'fromQueue'
                  ? 'Name for saved queue…'
                  : 'New playlist name (e.g. Chill, Movies)…'
              }
              value={newPlaylistName}
              onChange={(e) => setNewPlaylistName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleConfirmCreate();
                if (e.key === 'Escape') {
                  setCreatingMode(null);
                  setNewPlaylistName('');
                }
              }}
              autoFocus
            />
            <button className="drawer-chip-btn accent" onClick={handleConfirmCreate}>
              Save
            </button>
            <button
              className="icon-btn"
              style={{ width: 28, height: 28 }}
              onClick={() => {
                setCreatingMode(null);
                setNewPlaylistName('');
              }}
              aria-label="Cancel"
            >
              <X size={14} />
            </button>
          </div>
        )}

        {/* TAB 1: ACTIVE QUEUE */}
        {tab === 'queue' && (
          <>
            <div className="drawer-toolbar">
              <button className="drawer-chip-btn" onClick={onAddFiles}>
                <Plus size={13} />
                Files
              </button>
              <button className="drawer-chip-btn" onClick={onAddFolder}>
                <FolderOpen size={13} />
                Folder
              </button>
              {queue.length > 0 && (
                <button
                  className="drawer-chip-btn accent"
                  onClick={() => {
                    setCreatingMode('fromQueue');
                    setNewPlaylistName('');
                  }}
                  title="Save current queue as playlist"
                >
                  <BookmarkPlus size={13} />
                  Save
                </button>
              )}
              <div style={{ flex: 1 }} />
              {queue.length > 0 && (
                <button className="drawer-chip-btn danger" onClick={onClear} title="Clear queue">
                  <Trash2 size={13} />
                </button>
              )}
            </div>

            {queue.length > 0 && (
              <div className="drawer-filter-bar">
                <div className="search-input-wrap">
                  <Search size={13} className="search-icon" />
                  <input
                    type="text"
                    className="drawer-input search"
                    placeholder="Filter audio or movies…"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>
                <div className="pill-group">
                  <button
                    className={`pill-opt ${filter === 'all' ? 'selected' : ''}`}
                    onClick={() => setFilter('all')}
                  >
                    All
                  </button>
                  <button
                    className={`pill-opt ${filter === 'audio' ? 'selected' : ''}`}
                    onClick={() => setFilter('audio')}
                  >
                    Audio {audioCount > 0 ? `(${audioCount})` : ''}
                  </button>
                  <button
                    className={`pill-opt ${filter === 'video' ? 'selected' : ''}`}
                    onClick={() => setFilter('video')}
                  >
                    Video {videoCount > 0 ? `(${videoCount})` : ''}
                  </button>
                </div>
              </div>
            )}

            {queue.length === 0 ? (
              <div className="queue-empty">
                <p>Your queue is empty.</p>
                <p>Select audio or movie files from your PC, or open a saved Playlist.</p>
                <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
                  <button className="drawer-chip-btn accent" onClick={onAddFiles}>
                    <Plus size={13} />
                    Select Files
                  </button>
                  <button className="drawer-chip-btn" onClick={() => setTab('playlists')}>
                    Playlists
                  </button>
                </div>
              </div>
            ) : filteredQueue.length === 0 ? (
              <div className="queue-empty">
                <p>No matching {filter !== 'all' ? filter : 'media'} files.</p>
              </div>
            ) : (
              <div className="queue-list">
                {filteredQueue.map(({ track, originalIndex }) => {
                  const active = originalIndex === currentIndex;
                  const canReorder = filter === 'all' && search.trim() === '';
                  return (
                    <div
                      key={track.id}
                      className={`queue-item ${active ? 'active' : ''}`}
                      onClick={() => onSelect(originalIndex)}
                    >
                      <div className="queue-item-icon">
                        {active ? (
                          <div className={`eq-bars ${!isPlaying ? 'paused' : ''}`}>
                            <span />
                            <span />
                            <span />
                          </div>
                        ) : track.kind === 'video' ? (
                          <Film size={15} />
                        ) : (
                          <Music size={15} />
                        )}
                      </div>

                      <div className="queue-item-info">
                        <span className="queue-item-name" title={track.name}>
                          {track.name}
                        </span>
                        <span className="queue-item-meta">
                          {track.ext} · {track.kind.toUpperCase()}
                          {track.size > 0 ? ` · ${formatFileSize(track.size)}` : ''}
                        </span>
                      </div>

                      <div className="queue-item-actions" onClick={(e) => e.stopPropagation()}>
                        {canReorder && originalIndex > 0 && (
                          <button
                            className="queue-mini-btn"
                            onClick={() => onMoveTrack(originalIndex, originalIndex - 1)}
                            title="Move up"
                            aria-label="Move up"
                          >
                            <ArrowUp size={12} />
                          </button>
                        )}
                        {canReorder && originalIndex < queue.length - 1 && (
                          <button
                            className="queue-mini-btn"
                            onClick={() => onMoveTrack(originalIndex, originalIndex + 1)}
                            title="Move down"
                            aria-label="Move down"
                          >
                            <ArrowDown size={12} />
                          </button>
                        )}
                        <button
                          className="queue-mini-btn danger"
                          onClick={() => onRemove(originalIndex)}
                          title="Remove from queue"
                          aria-label={`Remove ${track.name}`}
                        >
                          <X size={13} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}

        {/* TAB 2: PLAYLISTS LIST OR PLAYLIST DETAIL */}
        {tab === 'playlists' && !activePlaylist && (
          <>
            <div className="drawer-toolbar">
              <button
                className="drawer-chip-btn accent"
                onClick={() => {
                  setCreatingMode('empty');
                  setNewPlaylistName('');
                }}
              >
                <Plus size={13} />
                New Playlist
              </button>
              {window.sapira && (
                <button className="drawer-chip-btn" onClick={onImportPlaylist}>
                  <Upload size={13} />
                  Import .M3U
                </button>
              )}
            </div>

            {playlists.length === 0 ? (
              <div className="queue-empty">
                <p>No playlists yet.</p>
                <p>Create a playlist and select your favorite songs or movies from your PC.</p>
                <button
                  className="drawer-chip-btn accent"
                  style={{ marginTop: 6 }}
                  onClick={() => {
                    setCreatingMode('empty');
                    setNewPlaylistName('');
                  }}
                >
                  <Plus size={13} />
                  Create First Playlist
                </button>
              </div>
            ) : (
              <div className="queue-list">
                {playlists.map((pl) => {
                  const plAudio = pl.tracks.filter((t) => t.kind === 'audio').length;
                  const plVideo = pl.tracks.filter((t) => t.kind === 'video').length;
                  return (
                    <div
                      key={pl.id}
                      className="playlist-card"
                      onClick={() => {
                        setSelectedPlaylistId(pl.id);
                        setFilter('all');
                        setSearch('');
                      }}
                    >
                      <div className="playlist-card-info">
                        <span className="queue-item-name" title={pl.name}>
                          {pl.name}
                        </span>
                        <span className="queue-item-meta">
                          {pl.tracks.length} {pl.tracks.length === 1 ? 'item' : 'items'}
                          {plAudio > 0 ? ` · ${plAudio} audio` : ''}
                          {plVideo > 0 ? ` · ${plVideo} video` : ''}
                        </span>
                      </div>

                      <div className="playlist-card-actions" onClick={(e) => e.stopPropagation()}>
                        {pl.tracks.length > 0 && (
                          <button
                            className="queue-mini-btn accent"
                            onClick={() => onPlayPlaylist(pl.id, 0)}
                            title="Play playlist"
                            aria-label={`Play ${pl.name}`}
                          >
                            <Play size={13} fill="currentColor" />
                          </button>
                        )}
                        {window.sapira && pl.tracks.length > 0 && (
                          <button
                            className="queue-mini-btn"
                            onClick={() => onExportPlaylist(pl.id)}
                            title="Export .M3U"
                            aria-label="Export playlist"
                          >
                            <Download size={13} />
                          </button>
                        )}
                        <button
                          className="queue-mini-btn danger"
                          onClick={() => onDeletePlaylist(pl.id)}
                          title="Delete playlist"
                          aria-label={`Delete ${pl.name}`}
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}

        {tab === 'playlists' && activePlaylist && (
          <>
            <div className="playlist-detail-header">
              <button
                className="icon-btn"
                style={{ width: 28, height: 28 }}
                onClick={() => {
                  setSelectedPlaylistId(null);
                  setSearch('');
                }}
                aria-label="Back to playlists"
              >
                <ArrowLeft size={15} />
              </button>
              <span className="playlist-detail-title" title={activePlaylist.name}>
                {activePlaylist.name}
              </span>
              {activePlaylist.tracks.length > 0 && (
                <button
                  className="drawer-chip-btn accent"
                  onClick={() => onPlayPlaylist(activePlaylist.id, 0)}
                >
                  <Play size={12} fill="currentColor" />
                  Play All
                </button>
              )}
            </div>

            <div className="drawer-toolbar">
              <button
                className="drawer-chip-btn"
                onClick={() => onAddFilesToPlaylist(activePlaylist.id)}
              >
                <Plus size={13} />
                Add Files
              </button>
              <button
                className="drawer-chip-btn"
                onClick={() => onAddFolderToPlaylist(activePlaylist.id)}
              >
                <FolderOpen size={13} />
                Add Folder
              </button>
              <div style={{ flex: 1 }} />
              {activePlaylist.tracks.length > 0 && (
                <button
                  className="drawer-chip-btn"
                  onClick={() => onAppendPlaylistToQueue(activePlaylist.id)}
                  title="Append to current queue"
                >
                  <ListPlus size={13} />
                  Queue
                </button>
              )}
            </div>

            {activePlaylist.tracks.length > 0 && (
              <div className="drawer-filter-bar">
                <div className="search-input-wrap">
                  <Search size={13} className="search-icon" />
                  <input
                    type="text"
                    className="drawer-input search"
                    placeholder="Search in playlist…"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>
                <div className="pill-group">
                  <button
                    className={`pill-opt ${filter === 'all' ? 'selected' : ''}`}
                    onClick={() => setFilter('all')}
                  >
                    All
                  </button>
                  <button
                    className={`pill-opt ${filter === 'audio' ? 'selected' : ''}`}
                    onClick={() => setFilter('audio')}
                  >
                    Audio
                  </button>
                  <button
                    className={`pill-opt ${filter === 'video' ? 'selected' : ''}`}
                    onClick={() => setFilter('video')}
                  >
                    Video
                  </button>
                </div>
              </div>
            )}

            {activePlaylist.tracks.length === 0 ? (
              <div className="queue-empty">
                <p>This playlist is empty.</p>
                <p>Pick songs or movies from your PC to add them here.</p>
                <button
                  className="drawer-chip-btn accent"
                  style={{ marginTop: 6 }}
                  onClick={() => onAddFilesToPlaylist(activePlaylist.id)}
                >
                  <Plus size={13} />
                  Select Files from PC
                </button>
              </div>
            ) : filteredPlaylistTracks.length === 0 ? (
              <div className="queue-empty">
                <p>No matching files in this playlist.</p>
              </div>
            ) : (
              <div className="queue-list">
                {filteredPlaylistTracks.map(({ track, originalIndex }) => (
                  <div
                    key={`${track.path}-${originalIndex}`}
                    className="queue-item"
                    onClick={() => onPlayPlaylist(activePlaylist.id, originalIndex)}
                  >
                    <div className="queue-item-icon">
                      {track.kind === 'video' ? <Film size={15} /> : <Music size={15} />}
                    </div>

                    <div className="queue-item-info">
                      <span className="queue-item-name" title={track.name}>
                        {track.name}
                      </span>
                      <span className="queue-item-meta">
                        {track.ext} · {track.kind.toUpperCase()}
                        {track.size > 0 ? ` · ${formatFileSize(track.size)}` : ''}
                      </span>
                    </div>

                    <div className="queue-item-actions" onClick={(e) => e.stopPropagation()}>
                      <button
                        className="queue-mini-btn danger"
                        onClick={() => onRemoveTrackFromPlaylist(activePlaylist.id, originalIndex)}
                        title="Remove from playlist"
                        aria-label={`Remove ${track.name}`}
                      >
                        <X size={13} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {tab === 'recents' && (
          <>
            <div className="drawer-toolbar">
              <span style={{ fontSize: 12, color: 'var(--text-muted)', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <Clock size={13} />
                Last {recents.length} played
              </span>
              <div style={{ flex: 1 }} />
              {recents.length > 0 && (
                <button className="drawer-chip-btn danger" onClick={onClearRecents}>
                  <Trash2 size={13} />
                  Clear
                </button>
              )}
            </div>

            {recents.length === 0 ? (
              <div className="queue-empty">
                <p>No recent history yet.</p>
                <p>Movies, songs, and streams you play will appear here for quick access.</p>
              </div>
            ) : (
              <div className="queue-list">
                {recents.map((item) => (
                  <div
                    key={item.path}
                    className="queue-item"
                    onClick={() => onPlayRecent(item)}
                  >
                    <div className="queue-item-icon">
                      {item.isRemote ? (
                        <Globe size={15} />
                      ) : item.kind === 'video' ? (
                        <Film size={15} />
                      ) : (
                        <Music size={15} />
                      )}
                    </div>
                    <div className="queue-item-info">
                      <span className="queue-item-name" title={item.name}>
                        {item.name}
                      </span>
                      <span className="queue-item-meta">
                        {item.ext} · {item.kind.toUpperCase()}
                        {item.size > 0 ? ` · ${formatFileSize(item.size)}` : ''}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </aside>
    </>
  );
}
