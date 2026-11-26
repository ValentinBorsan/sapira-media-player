import { X } from 'lucide-react';

interface ShortcutsModalProps {
  open: boolean;
  onClose: () => void;
}

const SHORTCUTS: Array<{ label: string; keys: string[] }> = [
  { label: 'Play / Pause', keys: ['Space', 'K'] },
  { label: 'Command Palette', keys: ['⌘/Ctrl', 'K'] },
  { label: 'Seek -5s / +5s', keys: ['←', '→'] },
  { label: 'Seek -10s / +10s', keys: ['J', 'L'] },
  { label: 'Volume ±5% (0–200%)', keys: ['↑', '↓'] },
  { label: 'Mute / Unmute', keys: ['M'] },
  { label: 'Playback Speed', keys: ['[', ']'] },
  { label: 'Next / Previous', keys: ['N', 'P'] },
  { label: 'Toggle Fullscreen', keys: ['F'] },
  { label: 'Subtitles On / Off', keys: ['C'] },
  { label: 'Subtitle Sync ±0.5s', keys: ['G', 'H'] },
  { label: 'Aspect Ratio', keys: ['A'] },
  { label: 'Ambilight Cinema Glow', keys: ['D'] },
  { label: 'Rotate Video 90°', keys: ['R'] },
  { label: 'Frame Step -1 / +1', keys: ['/', '.'] },
  { label: 'Screenshot Frame', keys: ['S'] },
  { label: 'Picture-in-Picture', keys: ['I'] },
  { label: 'Always on Top', keys: ['T'] },
  { label: 'A–B Loop Segment', keys: ['B'] },
  { label: 'Mini-Player Mode', keys: ['W'] },
  { label: 'Equalizer On / Off', keys: ['E'] },
  { label: 'Synced Lyrics Panel', keys: ['Y'] },
  { label: 'Sleep Timer', keys: ['Z'] },
  { label: 'Toggle Queue', keys: ['Q'] },
  { label: 'Open Stream / URL', keys: ['U'] },
  { label: 'Codec & Media Info', keys: ['⌘/Ctrl', 'I'] },
  { label: 'Settings', keys: [','] },
  { label: 'Open Files', keys: ['O'] },
];

export function ShortcutsModal({ open, onClose }: ShortcutsModalProps) {
  if (!open) return null;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="shortcuts-modal" onClick={(e) => e.stopPropagation()}>
        <div className="shortcuts-header">
          <h2 className="drawer-title">Keyboard Shortcuts</h2>
          <button className="icon-btn" onClick={onClose} aria-label="Close shortcuts">
            <X size={16} />
          </button>
        </div>

        <div className="shortcuts-grid">
          {SHORTCUTS.map((item) => (
            <div key={item.label} className="shortcut-row">
              <span>{item.label}</span>
              <span style={{ display: 'inline-flex', gap: 4 }}>
                {item.keys.map((k) => (
                  <kbd key={k}>{k}</kbd>
                ))}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
