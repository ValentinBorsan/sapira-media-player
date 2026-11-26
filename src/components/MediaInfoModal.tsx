import { Cpu, X } from 'lucide-react';
import type { MediaProbeResult, MediaTrack } from '../types/media';
import { formatFileSize, formatTime } from '../utils/format';

interface MediaInfoModalProps {
  open: boolean;
  track: MediaTrack | null;
  probe: MediaProbeResult | null;
  isTranscoding: boolean;
  duration: number;
  onClose: () => void;
}

export function MediaInfoModal({
  open,
  track,
  probe,
  isTranscoding,
  duration,
  onClose,
}: MediaInfoModalProps) {
  if (!open || !track) return null;

  const engineLabel = track.isHls
    ? 'HLS Adaptive Stream (hls.js)'
    : track.isRemote
      ? 'Direct HTTP Stream'
      : isTranscoding
        ? probe?.canCopyVideo
          ? 'FFmpeg Lossless Video Remux + AAC'
          : 'FFmpeg Universal Transcode'
        : 'Direct Hardware Stream (Range 206)';

  const rows: Array<{ label: string; value: string }> = [
    { label: 'Title', value: track.name },
    { label: 'Format', value: `${track.ext} (${probe?.formatName || track.kind.toUpperCase()})` },
    { label: 'Playback Engine', value: engineLabel },
  ];

  if (duration > 0 || (probe?.duration ?? 0) > 0) {
    rows.push({ label: 'Duration', value: formatTime(duration || probe?.duration || 0) });
  }
  if (track.size > 0) {
    rows.push({ label: 'File Size', value: formatFileSize(track.size) });
  }
  if (probe?.width && probe?.height) {
    rows.push({
      label: 'Resolution',
      value: `${probe.width} × ${probe.height}${probe.fps ? ` @ ${probe.fps} fps` : ''}`,
    });
  }
  if (probe?.videoCodec) {
    rows.push({ label: 'Video Codec', value: probe.videoCodec.toUpperCase() });
  }
  if (probe && probe.audioTracks.length > 0) {
    const a = probe.audioTracks[0];
    rows.push({
      label: 'Audio Streams',
      value: `${probe.audioTracks.length} (${a.codec.toUpperCase()} · ${a.channels}ch)`,
    });
  }
  if (probe && probe.subtitleTracks.length > 0) {
    rows.push({
      label: 'Embedded Subtitles',
      value: `${probe.subtitleTracks.length} track(s)`,
    });
  }
  if (probe?.bitRate) {
    rows.push({
      label: 'Bitrate',
      value: `${Math.round(probe.bitRate / 1000)} kbps`,
    });
  }
  rows.push({ label: 'Source', value: track.path });

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="settings-modal" style={{ width: 'min(500px, 100%)' }} onClick={(e) => e.stopPropagation()}>
        <div className="shortcuts-header">
          <div className="drawer-title-group">
            <Cpu size={15} style={{ color: 'var(--prism-cyan)' }} />
            <h2 className="drawer-title">Media & Codec Inspector</h2>
          </div>
          <button className="icon-btn" onClick={onClose} aria-label="Close media info">
            <X size={16} />
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {rows.map((r) => (
            <div
              key={r.label}
              className="shortcut-row"
              style={{ alignItems: 'flex-start', gap: 16 }}
            >
              <span style={{ flexShrink: 0, color: 'var(--text-muted)' }}>{r.label}</span>
              <span
                style={{
                  color: 'var(--text-primary)',
                  fontFamily: 'var(--font-mono)',
                  fontSize: 11.5,
                  textAlign: 'right',
                  wordBreak: 'break-all',
                }}
              >
                {r.value}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
