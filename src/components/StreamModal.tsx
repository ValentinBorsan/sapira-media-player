import { useEffect, useRef, useState } from 'react';
import {
  ClipboardPaste,
  Copy,
  Film,
  Globe,
  Loader2,
  Play,
  Radio,
  Scissors,
  Search,
  Star,
  X,
} from 'lucide-react';
import type { MediaKind } from '../types/media';
import {
  loadFavoriteStreams,
  searchRadioStations,
  toggleFavoriteStream,
  type RadioPresetFilter,
  type RadioStationItem,
} from '../utils/radioBrowser';

export interface StreamLaunchOptions {
  url: string;
  sourceUrl?: string;
  resolvedAt?: number;
  muxKey?: string;
  muxCopyVideo?: boolean;
  duration?: number;
  title?: string;
  kind?: MediaKind;
  artist?: string;
  coverUrl?: string;
  forceHls?: boolean;
}

interface StreamModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (opts: StreamLaunchOptions) => void;
}

type StreamTab = 'url' | 'radio' | 'favorites';

interface VerifiedStreamPreset {
  title: string;
  subtitle: string;
  url: string;
  kind: MediaKind;
}

const VERIFIED_STREAMS: VerifiedStreamPreset[] = [
  {
    title: 'Tears of Steel — Sci-Fi HD',
    subtitle: 'HLS Video (.m3u8) · Blender Open Movie',
    url: 'https://demo.unified-streaming.com/k8s/features/stable/video/tears-of-steel/tears-of-steel.ism/.m3u8',
    kind: 'video',
  },
  {
    title: 'Big Buck Bunny — 1080p HD',
    subtitle: 'HLS Video (.m3u8) · Mux Reference',
    url: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8',
    kind: 'video',
  },
  {
    title: 'SomaFM — DEF CON Radio',
    subtitle: '24/7 Live Radio · Cyber / Electronic',
    url: 'https://ice2.somafm.com/defcon-128-mp3',
    kind: 'audio',
  },
  {
    title: 'SomaFM — Groove Salad',
    subtitle: '24/7 Live Radio · Downtempo / Chill',
    url: 'https://ice2.somafm.com/groovesalad-128-mp3',
    kind: 'audio',
  },
  {
    title: 'SomaFM — Drone Zone',
    subtitle: '24/7 Live Radio · Atmospheric Ambient',
    url: 'https://ice2.somafm.com/dronezone-128-mp3',
    kind: 'audio',
  },
  {
    title: 'SomaFM — Vaporwaves',
    subtitle: '24/7 Live Radio · Future Funk / Synth',
    url: 'https://ice2.somafm.com/vaporwaves-128-mp3',
    kind: 'audio',
  },
];

const RADIO_PRESETS: Array<{ id: RadioPresetFilter; label: string }> = [
  { id: 'romania', label: '🇷🇴 România' },
  { id: 'top', label: 'Top Global' },
  { id: 'chill', label: 'Chill' },
  { id: 'jazz', label: 'Jazz' },
  { id: 'synthwave', label: 'Synthwave' },
  { id: 'rock', label: 'Rock' },
  { id: 'classical', label: 'Classical' },
];

const WEB_PLATFORM_RE =
  /(youtube\.com|youtu\.be|twitch\.tv|soundcloud\.com|vimeo\.com|dailymotion\.com|bandcamp\.com|tiktok\.com|twitter\.com|x\.com)/i;

async function readClipboard(): Promise<string> {
  if (window.sapira) return window.sapira.clipboardReadText();
  return navigator.clipboard.readText();
}

async function writeClipboard(text: string): Promise<void> {
  if (window.sapira) {
    await window.sapira.clipboardWriteText(text);
    return;
  }
  await navigator.clipboard.writeText(text);
}

export function StreamModal({ open, onClose, onSubmit }: StreamModalProps) {
  const urlInputRef = useRef<HTMLInputElement | null>(null);
  const [tab, setTab] = useState<StreamTab>('url');
  const [url, setUrl] = useState('');
  const [title, setTitle] = useState('');
  const [mode, setMode] = useState<'auto' | 'video' | 'audio'>('auto');
  const [resolving, setResolving] = useState(false);
  const [resolveError, setResolveError] = useState<string | null>(null);
  const [hasYtDlp, setHasYtDlp] = useState<boolean | null>(null);

  // Radio Browser directory state
  const [radioPreset, setRadioPreset] = useState<RadioPresetFilter>('romania');
  const [radioQuery, setRadioQuery] = useState('');
  const [stations, setStations] = useState<RadioStationItem[]>([]);
  const [radioLoading, setRadioLoading] = useState(false);
  const [favorites, setFavorites] = useState<RadioStationItem[]>(() => loadFavoriteStreams());

  useEffect(() => {
    if (!open) return;
    setResolveError(null);
    if (window.sapira) {
      window.sapira.checkYtDlp().then(setHasYtDlp).catch(() => setHasYtDlp(false));
    }
  }, [open]);

  useEffect(() => {
    if (!open || tab !== 'radio') return;
    let cancelled = false;
    setRadioLoading(true);
    const timer = window.setTimeout(async () => {
      const res = await searchRadioStations({
        query: radioQuery.trim() || undefined,
        preset: radioPreset,
      });
      if (!cancelled) {
        setStations(res);
        setRadioLoading(false);
      }
    }, radioQuery.trim() ? 320 : 10);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [open, tab, radioPreset, radioQuery]);

  if (!open) return null;

  const handlePlayUrl = async () => {
    const trimmed = url.trim();
    if (!trimmed || resolving) return;
    setResolveError(null);

    if (WEB_PLATFORM_RE.test(trimmed) && window.sapira) {
      setResolving(true);
      const res = await window.sapira.resolveExternalStream(trimmed, mode === 'audio');
      setResolving(false);

      if (!res.ok || !res.streamUrl) {
        setResolveError(res.error || 'Could not resolve external link');
        return;
      }

      onSubmit({
        url: res.streamUrl,
        sourceUrl: trimmed,
        resolvedAt: Date.now(),
        muxKey: res.muxKey,
        muxCopyVideo: res.copyVideo,
        duration: res.duration,
        title: title.trim() || res.title || 'Web Stream',
        kind: mode === 'auto' ? res.kind : mode,
        artist: res.artist,
        coverUrl: res.thumbnail,
        forceHls: res.isHls,
      });
      setUrl('');
      setTitle('');
      onClose();
      return;
    }

    onSubmit({
      url: trimmed,
      title: title.trim() || undefined,
      kind: mode === 'auto' ? undefined : mode,
    });
    setUrl('');
    setTitle('');
    onClose();
  };

  const handlePaste = async () => {
    try {
      const clip = (await readClipboard()).trim();
      if (!clip) return;
      const input = urlInputRef.current;
      if (input && input.selectionStart !== null && input.selectionEnd !== null && url.length > 0) {
        setUrl(url.slice(0, input.selectionStart) + clip + url.slice(input.selectionEnd));
      } else {
        setUrl(clip);
      }
      input?.focus();
    } catch {
      // Ignore
    }
  };

  const handleCopy = async () => {
    if (!url) return;
    try {
      const input = urlInputRef.current;
      const hasSel =
        input &&
        input.selectionStart !== null &&
        input.selectionEnd !== null &&
        input.selectionEnd > input.selectionStart;
      await writeClipboard(hasSel ? url.slice(input.selectionStart!, input.selectionEnd!) : url);
      input?.focus();
    } catch {
      // Ignore
    }
  };

  const handleCut = async () => {
    if (!url) return;
    try {
      const input = urlInputRef.current;
      const hasSel =
        input &&
        input.selectionStart !== null &&
        input.selectionEnd !== null &&
        input.selectionEnd > input.selectionStart;
      if (hasSel) {
        const s = input.selectionStart!;
        const e = input.selectionEnd!;
        await writeClipboard(url.slice(s, e));
        setUrl(url.slice(0, s) + url.slice(e));
      } else {
        await writeClipboard(url);
        setUrl('');
      }
      input?.focus();
    } catch {
      // Ignore
    }
  };

  const isFavorite = (stationUrl: string) => favorites.some((f) => f.url === stationUrl);

  const playStation = (st: RadioStationItem) => {
    onSubmit({
      url: st.url,
      title: st.name,
      kind: st.kind,
      artist: [st.country, st.tags].filter(Boolean).join(' · ') || 'Live Radio',
      coverUrl: st.favicon,
    });
    onClose();
  };

  const installCmd =
    window.sapira?.platform === 'win32' ? 'winget install yt-dlp' : 'brew install yt-dlp';

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="settings-modal"
        style={{ width: 'min(580px, 100%)', maxHeight: 'min(86vh, 720px)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="shortcuts-header">
          <div className="drawer-tabs">
            <button
              type="button"
              className={`drawer-tab ${tab === 'url' ? 'active' : ''}`}
              onClick={() => setTab('url')}
            >
              <Globe size={13} />
              URL / YouTube
            </button>
            <button
              type="button"
              className={`drawer-tab ${tab === 'radio' ? 'active' : ''}`}
              onClick={() => setTab('radio')}
            >
              <Radio size={13} />
              Live Radio
            </button>
            <button
              type="button"
              className={`drawer-tab ${tab === 'favorites' ? 'active' : ''}`}
              onClick={() => setTab('favorites')}
            >
              <Star size={13} />
              Favorites
              <span className="drawer-count">{favorites.length}</span>
            </button>
          </div>
          <button className="icon-btn" onClick={onClose} aria-label="Close stream dialog">
            <X size={16} />
          </button>
        </div>

        {/* TAB 1: URL / YOUTUBE / VERIFIED STREAMS */}
        {tab === 'url' && (
          <>
            <div className="settings-body" style={{ gap: 14 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 8,
                  }}
                >
                  <span className="setting-label">
                    Direct Stream (.m3u8 / .mp4 / .mp3) or YouTube / Twitch / SoundCloud
                  </span>
                  <div style={{ display: 'inline-flex', gap: 5, flexShrink: 0 }}>
                    <button
                      type="button"
                      className="drawer-chip-btn accent"
                      style={{ height: 25, padding: '0 9px', fontSize: 11.5 }}
                      onClick={handlePaste}
                    >
                      <ClipboardPaste size={12} />
                      Paste
                    </button>
                    <button
                      type="button"
                      className="drawer-chip-btn"
                      style={{ height: 25, padding: '0 9px', fontSize: 11.5 }}
                      onClick={handleCopy}
                      disabled={!url}
                    >
                      <Copy size={12} />
                      Copy
                    </button>
                    <button
                      type="button"
                      className="drawer-chip-btn"
                      style={{ height: 25, padding: '0 9px', fontSize: 11.5 }}
                      onClick={handleCut}
                      disabled={!url}
                    >
                      <Scissors size={12} />
                      Cut
                    </button>
                  </div>
                </div>

                <input
                  ref={urlInputRef}
                  type="url"
                  className="drawer-input"
                  style={{ height: 36 }}
                  placeholder="https://youtube.com/watch?v=... or https://.../stream.m3u8"
                  value={url}
                  onChange={(e) => {
                    setUrl(e.target.value);
                    setResolveError(null);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handlePlayUrl();
                  }}
                  autoFocus
                />

                {hasYtDlp === false && (
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 8,
                      fontSize: 11.5,
                      color: 'var(--text-muted)',
                    }}
                  >
                    <span>
                      Optional: install <code>yt-dlp</code> to resolve YouTube / Twitch / SoundCloud links
                    </span>
                    <button
                      type="button"
                      className="pill-opt"
                      onClick={() => writeClipboard(installCmd)}
                      title="Copy install command"
                    >
                      Copy: {installCmd}
                    </button>
                  </div>
                )}

                {resolveError && (
                  <div style={{ fontSize: 12, color: '#fca5a5' }}>{resolveError}</div>
                )}
              </div>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr auto',
                  gap: 10,
                  alignItems: 'end',
                }}
              >
                <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                  <span className="setting-label">Custom Title (optional)</span>
                  <input
                    type="text"
                    className="drawer-input"
                    style={{ height: 32 }}
                    placeholder="e.g. Live Channel / Podcast"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handlePlayUrl();
                    }}
                  />
                </div>

                <div className="pill-group" style={{ height: 32 }}>
                  {(['auto', 'video', 'audio'] as const).map((m) => (
                    <button
                      key={m}
                      type="button"
                      className={`pill-opt ${mode === m ? 'selected' : ''}`}
                      onClick={() => setMode(m)}
                    >
                      {m.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>

              <div className="settings-section" style={{ marginTop: 2 }}>
                <div className="settings-section-title">Verified Working Streams (1-Click Play)</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                  {VERIFIED_STREAMS.map((preset) => {
                    const asStation: RadioStationItem = {
                      id: preset.url,
                      name: preset.title,
                      url: preset.url,
                      country: '',
                      tags: preset.subtitle,
                      bitrate: 0,
                      kind: preset.kind,
                    };
                    const fav = isFavorite(preset.url);
                    return (
                      <div
                        key={preset.url}
                        className="playlist-card"
                        style={{ padding: '8px 10px' }}
                        onClick={() => {
                          setUrl(preset.url);
                          setTitle(preset.title);
                          setMode(preset.kind);
                        }}
                      >
                        <div className="queue-item-icon" style={{ width: 28, height: 28 }}>
                          {preset.kind === 'video' ? <Film size={14} /> : <Radio size={14} />}
                        </div>
                        <div className="playlist-card-info">
                          <span className="queue-item-name" style={{ fontSize: 12.5 }}>
                            {preset.title}
                          </span>
                          <span className="queue-item-meta">{preset.subtitle}</span>
                        </div>
                        <button
                          type="button"
                          className={`queue-mini-btn ${fav ? 'accent' : ''}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            setFavorites((prev) => toggleFavoriteStream(prev, asStation));
                          }}
                          title="Save to Favorites"
                        >
                          <Star size={13} fill={fav ? 'currentColor' : 'none'} />
                        </button>
                        <button
                          type="button"
                          className="drawer-chip-btn accent"
                          style={{ height: 26, padding: '0 10px' }}
                          onClick={(e) => {
                            e.stopPropagation();
                            onSubmit({
                              url: preset.url,
                              title: preset.title,
                              kind: preset.kind,
                            });
                            onClose();
                          }}
                        >
                          <Play size={11} fill="currentColor" />
                          Play
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="settings-footer" style={{ justifyContent: 'flex-end' }}>
              <button className="drawer-chip-btn" onClick={onClose}>
                Cancel
              </button>
              <button
                className="btn-primary"
                style={{ height: 34, padding: '0 18px' }}
                onClick={handlePlayUrl}
                disabled={resolving}
              >
                {resolving ? <Loader2 size={14} /> : <Play size={14} fill="currentColor" />}
                {resolving ? 'Resolving…' : 'Play URL'}
              </button>
            </div>
          </>
        )}

        {/* TAB 2: LIVE RADIO DIRECTORY (RADIO BROWSER 30,000+ STATIONS) */}
        {tab === 'radio' && (
          <div className="settings-body" style={{ gap: 10 }}>
            <div className="search-input-wrap">
              <Search size={14} className="search-icon" />
              <input
                type="text"
                className="drawer-input search"
                style={{ height: 34 }}
                placeholder="Search 30,000+ live radio stations (e.g. Europa FM, Guerrilla, Lofi, BBC)…"
                value={radioQuery}
                onChange={(e) => setRadioQuery(e.target.value)}
                autoFocus
              />
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
              {RADIO_PRESETS.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  className={`pill-opt ${!radioQuery.trim() && radioPreset === p.id ? 'selected' : ''}`}
                  onClick={() => {
                    setRadioQuery('');
                    setRadioPreset(p.id);
                  }}
                >
                  {p.label}
                </button>
              ))}
            </div>

            {radioLoading ? (
              <div className="queue-empty" style={{ minHeight: 200 }}>
                <p>Loading live radio directory…</p>
              </div>
            ) : stations.length === 0 ? (
              <div className="queue-empty" style={{ minHeight: 200 }}>
                <p>No stations found. Try another keyword or filter.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                {stations.map((st) => {
                  const fav = isFavorite(st.url);
                  return (
                    <div
                      key={st.id}
                      className="playlist-card"
                      style={{ padding: '8px 10px' }}
                      onClick={() => playStation(st)}
                    >
                      <div className="queue-item-icon" style={{ width: 28, height: 28 }}>
                        <Radio size={14} />
                      </div>
                      <div className="playlist-card-info">
                        <span className="queue-item-name" style={{ fontSize: 12.5 }}>
                          {st.name}
                        </span>
                        <span className="queue-item-meta">
                          {[st.country, st.bitrate > 0 ? `${st.bitrate}k` : '', st.tags]
                            .filter(Boolean)
                            .join(' · ')}
                        </span>
                      </div>
                      <button
                        type="button"
                        className={`queue-mini-btn ${fav ? 'accent' : ''}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          setFavorites((prev) => toggleFavoriteStream(prev, st));
                        }}
                        title={fav ? 'Remove from Favorites' : 'Add to Favorites'}
                      >
                        <Star size={13} fill={fav ? 'currentColor' : 'none'} />
                      </button>
                      <button
                        type="button"
                        className="drawer-chip-btn accent"
                        style={{ height: 26, padding: '0 10px' }}
                        onClick={(e) => {
                          e.stopPropagation();
                          playStation(st);
                        }}
                      >
                        <Play size={11} fill="currentColor" />
                        Play
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB 3: SAVED FAVORITE STREAMS & STATIONS */}
        {tab === 'favorites' && (
          <div className="settings-body" style={{ gap: 8 }}>
            {favorites.length === 0 ? (
              <div className="queue-empty" style={{ minHeight: 220 }}>
                <p>No favorite stations saved yet.</p>
                <p>Click the ★ icon next to any Live Radio station or stream to pin it here.</p>
              </div>
            ) : (
              favorites.map((st) => (
                <div
                  key={st.url}
                  className="playlist-card"
                  style={{ padding: '8px 10px' }}
                  onClick={() => playStation(st)}
                >
                  <div className="queue-item-icon" style={{ width: 28, height: 28 }}>
                    {st.kind === 'video' ? <Film size={14} /> : <Radio size={14} />}
                  </div>
                  <div className="playlist-card-info">
                    <span className="queue-item-name" style={{ fontSize: 12.5 }}>
                      {st.name}
                    </span>
                    <span className="queue-item-meta">
                      {[st.country, st.bitrate > 0 ? `${st.bitrate}k` : '', st.tags]
                        .filter(Boolean)
                        .join(' · ')}
                    </span>
                  </div>
                  <button
                    type="button"
                    className="queue-mini-btn accent"
                    onClick={(e) => {
                      e.stopPropagation();
                      setFavorites((prev) => toggleFavoriteStream(prev, st));
                    }}
                    title="Remove from Favorites"
                  >
                    <Star size={13} fill="currentColor" />
                  </button>
                  <button
                    type="button"
                    className="drawer-chip-btn accent"
                    style={{ height: 26, padding: '0 10px' }}
                    onClick={(e) => {
                      e.stopPropagation();
                      playStation(st);
                    }}
                  >
                    <Play size={11} fill="currentColor" />
                    Play
                  </button>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
