import type { AspectMode, SubtitleSize } from '../types/media';
import type { SapiraLanguage, SapiraTheme } from './i18n';

export interface SapiraSettings {
  theme: SapiraTheme;
  language: SapiraLanguage;
  autoResume: boolean;
  seekStepSeconds: 3 | 5 | 10 | 15;
  defaultPlaybackRate: number;
  defaultAspectMode: AspectMode;
  autoLoadSubtitles: boolean;
  defaultSubtitleSize: SubtitleSize;
  hudHideDelayMs: 1500 | 2500 | 4000 | 0;
  showHudTelemetry: boolean;
  audioVisualizer: boolean;
  showOsd: boolean;
  autoFetchOnlineLyrics: boolean;
}

export const DEFAULT_SETTINGS: SapiraSettings = {
  theme: 'sapphire',
  language: 'ro',
  autoResume: true,
  seekStepSeconds: 5,
  defaultPlaybackRate: 1,
  defaultAspectMode: 'fit',
  autoLoadSubtitles: true,
  defaultSubtitleSize: 'md',
  hudHideDelayMs: 2500,
  showHudTelemetry: true,
  audioVisualizer: true,
  showOsd: true,
  autoFetchOnlineLyrics: false,
};

const SETTINGS_KEY = 'sapira.settings.v1';

export function loadSettings(): SapiraSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return { ...DEFAULT_SETTINGS };
    const parsed = JSON.parse(raw) as Partial<SapiraSettings>;
    return { ...DEFAULT_SETTINGS, ...parsed };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export function saveSettings(settings: SapiraSettings): void {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch {
    // Ignore storage quota errors
  }
}
