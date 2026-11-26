export type EqPresetId = 'flat' | 'bass' | 'vocal' | 'night' | 'studio' | 'custom';

export interface EqBandSpec {
  freq: number;
  label: string;
  type: BiquadFilterType;
}

export const EQ_BANDS: EqBandSpec[] = [
  { freq: 60, label: '60', type: 'lowshelf' },
  { freq: 230, label: '230', type: 'peaking' },
  { freq: 910, label: '910', type: 'peaking' },
  { freq: 3600, label: '3.6K', type: 'peaking' },
  { freq: 14000, label: '14K', type: 'highshelf' },
];

export const EQ_PRESETS: Record<Exclude<EqPresetId, 'custom'>, { label: string; gains: number[] }> = {
  flat: { label: 'Flat', gains: [0, 0, 0, 0, 0] },
  bass: { label: 'Bass', gains: [6, 3.5, 0, 1, 2] },
  vocal: { label: 'Vocal', gains: [-2, 1, 4.5, 3, 1] },
  night: { label: 'Night', gains: [-3, 1.5, 2.5, 1, -2.5] },
  studio: { label: 'Studio', gains: [2.5, 0.5, -0.5, 2, 3.5] },
};

export interface EqState {
  enabled: boolean;
  preset: EqPresetId;
  gains: number[];
}

const EQ_STORAGE_KEY = 'sapira.audio.eq.v1';

export function loadEqState(): EqState {
  try {
    const raw = localStorage.getItem(EQ_STORAGE_KEY);
    if (!raw) return { enabled: false, preset: 'flat', gains: [0, 0, 0, 0, 0] };
    const parsed = JSON.parse(raw) as Partial<EqState>;
    if (Array.isArray(parsed.gains) && parsed.gains.length === EQ_BANDS.length) {
      return {
        enabled: Boolean(parsed.enabled),
        preset: parsed.preset ?? 'custom',
        gains: parsed.gains.map((g) => Math.max(-12, Math.min(12, Number(g) || 0))),
      };
    }
  } catch {
    // Ignore storage errors
  }
  return { enabled: false, preset: 'flat', gains: [0, 0, 0, 0, 0] };
}

export function saveEqState(state: EqState): void {
  try {
    localStorage.setItem(EQ_STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Ignore storage errors
  }
}
