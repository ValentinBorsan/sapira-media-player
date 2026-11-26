import { RotateCcw, Sliders, Trash2, X } from 'lucide-react';
import type { AspectMode, SubtitleSize } from '../types/media';
import { SAPIRA_THEMES, STRINGS } from '../utils/i18n';
import type { SapiraSettings } from '../utils/settings';

interface SettingsModalProps {
  open: boolean;
  settings: SapiraSettings;
  onClose: () => void;
  onChange: <K extends keyof SapiraSettings>(key: K, value: SapiraSettings[K]) => void;
  onReset: () => void;
  onClearResumeHistory: () => void;
}

const SEEK_STEPS: Array<3 | 5 | 10 | 15> = [3, 5, 10, 15];
const ASPECTS: AspectMode[] = ['fit', 'fill', '16:9', '21:9'];
const RATES = [0.75, 1, 1.25, 1.5];

export function SettingsModal({
  open,
  settings,
  onClose,
  onChange,
  onReset,
  onClearResumeHistory,
}: SettingsModalProps) {
  if (!open) return null;

  const t = STRINGS[settings.language];
  const hudDelays: Array<{ label: string; value: 1500 | 2500 | 4000 | 0 }> = [
    { label: '1.5s', value: 1500 },
    { label: '2.5s', value: 2500 },
    { label: '4s', value: 4000 },
    { label: t.never, value: 0 },
  ];

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="settings-modal" onClick={(e) => e.stopPropagation()}>
        <div className="shortcuts-header">
          <div className="drawer-title-group">
            <Sliders size={15} style={{ color: 'var(--prism-cyan)' }} />
            <h2 className="drawer-title">{t.settings}</h2>
          </div>
          <button className="icon-btn" onClick={onClose} aria-label="Close settings">
            <X size={16} />
          </button>
        </div>

        <div className="settings-body">
          {/* Identity & Language Section */}
          <div className="settings-section">
            <div className="settings-section-title">{t.appearanceSection}</div>

            <div className="setting-row" style={{ flexDirection: 'column', alignItems: 'stretch', gap: 8 }}>
              <div className="setting-copy">
                <span className="setting-label">{t.themeLabel}</span>
                <span className="setting-desc">{t.themeDesc}</span>
              </div>
              <div className="theme-swatches">
                {SAPIRA_THEMES.map((th) => {
                  const selected = settings.theme === th.id;
                  const label = settings.language === 'ro' ? th.labelRo : th.labelEn;
                  return (
                    <button
                      key={th.id}
                      type="button"
                      className={`theme-chip ${selected ? 'selected' : ''}`}
                      onClick={() => onChange('theme', th.id)}
                    >
                      <span className="theme-dot" style={{ background: th.swatch }} />
                      <span>{label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="setting-row">
              <div className="setting-copy">
                <span className="setting-label">{t.languageLabel}</span>
                <span className="setting-desc">{t.languageDesc}</span>
              </div>
              <div className="pill-group">
                <button
                  className={`pill-opt ${settings.language === 'ro' ? 'selected' : ''}`}
                  onClick={() => onChange('language', 'ro')}
                >
                  ROMÂNĂ
                </button>
                <button
                  className={`pill-opt ${settings.language === 'en' ? 'selected' : ''}`}
                  onClick={() => onChange('language', 'en')}
                >
                  ENGLISH
                </button>
              </div>
            </div>
          </div>

          {/* Playback Section */}
          <div className="settings-section">
            <div className="settings-section-title">{t.playbackSection}</div>

            <div className="setting-row">
              <div className="setting-copy">
                <span className="setting-label">{t.autoResumeLabel}</span>
                <span className="setting-desc">{t.autoResumeDesc}</span>
              </div>
              <button
                className={`toggle-switch ${settings.autoResume ? 'on' : ''}`}
                onClick={() => onChange('autoResume', !settings.autoResume)}
                role="switch"
                aria-checked={settings.autoResume}
              >
                <span className="toggle-knob" />
              </button>
            </div>

            <div className="setting-row">
              <div className="setting-copy">
                <span className="setting-label">{t.seekStepLabel}</span>
                <span className="setting-desc">{t.seekStepDesc}</span>
              </div>
              <div className="pill-group">
                {SEEK_STEPS.map((sec) => (
                  <button
                    key={sec}
                    className={`pill-opt ${settings.seekStepSeconds === sec ? 'selected' : ''}`}
                    onClick={() => onChange('seekStepSeconds', sec)}
                  >
                    {sec}s
                  </button>
                ))}
              </div>
            </div>

            <div className="setting-row">
              <div className="setting-copy">
                <span className="setting-label">{t.defaultSpeedLabel}</span>
                <span className="setting-desc">{t.defaultSpeedDesc}</span>
              </div>
              <div className="pill-group">
                {RATES.map((rate) => (
                  <button
                    key={rate}
                    className={`pill-opt ${settings.defaultPlaybackRate === rate ? 'selected' : ''}`}
                    onClick={() => onChange('defaultPlaybackRate', rate)}
                  >
                    {rate}×
                  </button>
                ))}
              </div>
            </div>

            <div className="setting-row">
              <div className="setting-copy">
                <span className="setting-label">{t.defaultAspectLabel}</span>
                <span className="setting-desc">{t.defaultAspectDesc}</span>
              </div>
              <div className="pill-group">
                {ASPECTS.map((aspect) => (
                  <button
                    key={aspect}
                    className={`pill-opt ${settings.defaultAspectMode === aspect ? 'selected' : ''}`}
                    onClick={() => onChange('defaultAspectMode', aspect)}
                  >
                    {aspect.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Subtitles Section */}
          <div className="settings-section">
            <div className="settings-section-title">{t.subtitlesSection}</div>

            <div className="setting-row">
              <div className="setting-copy">
                <span className="setting-label">{t.autoSubLabel}</span>
                <span className="setting-desc">{t.autoSubDesc}</span>
              </div>
              <button
                className={`toggle-switch ${settings.autoLoadSubtitles ? 'on' : ''}`}
                onClick={() => onChange('autoLoadSubtitles', !settings.autoLoadSubtitles)}
                role="switch"
                aria-checked={settings.autoLoadSubtitles}
              >
                <span className="toggle-knob" />
              </button>
            </div>

            <div className="setting-row">
              <div className="setting-copy">
                <span className="setting-label">{t.subSizeLabel}</span>
                <span className="setting-desc">{t.subSizeDesc}</span>
              </div>
              <div className="pill-group">
                {(['sm', 'md', 'lg'] as SubtitleSize[]).map((sz) => (
                  <button
                    key={sz}
                    className={`pill-opt ${settings.defaultSubtitleSize === sz ? 'selected' : ''}`}
                    onClick={() => onChange('defaultSubtitleSize', sz)}
                  >
                    {sz.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Interface & Audio Section */}
          <div className="settings-section">
            <div className="settings-section-title">{t.interfaceSection}</div>

            <div className="setting-row">
              <div className="setting-copy">
                <span className="setting-label">{t.hudDelayLabel}</span>
                <span className="setting-desc">{t.hudDelayDesc}</span>
              </div>
              <div className="pill-group">
                {hudDelays.map((item) => (
                  <button
                    key={String(item.value)}
                    className={`pill-opt ${settings.hudHideDelayMs === item.value ? 'selected' : ''}`}
                    onClick={() => onChange('hudHideDelayMs', item.value)}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="setting-row">
              <div className="setting-copy">
                <span className="setting-label">{t.telemetryLabel}</span>
                <span className="setting-desc">{t.telemetryDesc}</span>
              </div>
              <button
                className={`toggle-switch ${settings.showHudTelemetry ? 'on' : ''}`}
                onClick={() => onChange('showHudTelemetry', !settings.showHudTelemetry)}
                role="switch"
                aria-checked={settings.showHudTelemetry}
              >
                <span className="toggle-knob" />
              </button>
            </div>

            <div className="setting-row">
              <div className="setting-copy">
                <span className="setting-label">{t.visualizerLabel}</span>
                <span className="setting-desc">{t.visualizerDesc}</span>
              </div>
              <button
                className={`toggle-switch ${settings.audioVisualizer ? 'on' : ''}`}
                onClick={() => onChange('audioVisualizer', !settings.audioVisualizer)}
                role="switch"
                aria-checked={settings.audioVisualizer}
              >
                <span className="toggle-knob" />
              </button>
            </div>

            <div className="setting-row">
              <div className="setting-copy">
                <span className="setting-label">{t.osdLabel}</span>
                <span className="setting-desc">{t.osdDesc}</span>
              </div>
              <button
                className={`toggle-switch ${settings.showOsd ? 'on' : ''}`}
                onClick={() => onChange('showOsd', !settings.showOsd)}
                role="switch"
                aria-checked={settings.showOsd}
              >
                <span className="toggle-knob" />
              </button>
            </div>

            <div className="setting-row">
              <div className="setting-copy">
                <span className="setting-label">{t.onlineLyricsLabel}</span>
                <span className="setting-desc">{t.onlineLyricsDesc}</span>
              </div>
              <button
                className={`toggle-switch ${settings.autoFetchOnlineLyrics ? 'on' : ''}`}
                onClick={() => onChange('autoFetchOnlineLyrics', !settings.autoFetchOnlineLyrics)}
                role="switch"
                aria-checked={settings.autoFetchOnlineLyrics}
              >
                <span className="toggle-knob" />
              </button>
            </div>
          </div>
        </div>

        <div className="settings-footer">
          <button className="drawer-chip-btn danger" onClick={onClearResumeHistory}>
            <Trash2 size={13} />
            {t.clearResume}
          </button>
          <button className="drawer-chip-btn" onClick={onReset}>
            <RotateCcw size={13} />
            {t.resetDefaults}
          </button>
        </div>
      </div>
    </div>
  );
}
