export type SapiraLanguage = 'ro' | 'en';
export type SapiraTheme = 'sapphire' | 'violet' | 'emerald' | 'amber' | 'monochrome';

export interface ThemeMeta {
  id: SapiraTheme;
  labelRo: string;
  labelEn: string;
  swatch: string;
  colors: [string, string, string];
}

export const SAPIRA_THEMES: ThemeMeta[] = [
  {
    id: 'sapphire',
    labelRo: 'Safir & Perlă',
    labelEn: 'Ice Sapphire',
    swatch: 'linear-gradient(135deg, #f5d0fe 0%, #60a5fa 50%, #38bdf8 100%)',
    colors: ['rgb(233, 213, 255)', 'rgb(147, 197, 253)', 'rgb(103, 232, 249)'],
  },
  {
    id: 'violet',
    labelRo: 'Nebuloasă Violet',
    labelEn: 'Cosmic Violet',
    swatch: 'linear-gradient(135deg, #f472b6 0%, #a855f7 50%, #818cf8 100%)',
    colors: ['rgb(244, 114, 182)', 'rgb(192, 132, 252)', 'rgb(129, 140, 248)'],
  },
  {
    id: 'emerald',
    labelRo: 'Auroră Smarald',
    labelEn: 'Emerald Prism',
    swatch: 'linear-gradient(135deg, #34d399 0%, #10b981 50%, #5eead4 100%)',
    colors: ['rgb(167, 243, 208)', 'rgb(52, 211, 153)', 'rgb(94, 234, 212)'],
  },
  {
    id: 'amber',
    labelRo: 'Chihlimbar Solar',
    labelEn: 'Solar Amber',
    swatch: 'linear-gradient(135deg, #fb923c 0%, #f59e0b 50%, #fde047 100%)',
    colors: ['rgb(253, 186, 116)', 'rgb(251, 191, 36)', 'rgb(254, 240, 138)'],
  },
  {
    id: 'monochrome',
    labelRo: 'Monocrom Pur',
    labelEn: 'Pure Monochrome',
    swatch: 'linear-gradient(135deg, #94a3b8 0%, #e2e8f0 55%, #ffffff 100%)',
    colors: ['rgb(203, 213, 225)', 'rgb(226, 232, 240)', 'rgb(255, 255, 255)'],
  },
];

export interface UiStrings {
  openMedia: string;
  openFolder: string;
  openUrl: string;
  playlists: string;
  queue: string;
  recents: string;
  settings: string;
  shortcuts: string;
  commandPalette: string;
  commandPlaceholder: string;
  emptySubtitle1: string;
  emptySubtitle2: string;
  telemetryRight: string;
  signalActive: string;
  signalStandby: string;
  audioCore: string;
  appearanceSection: string;
  themeLabel: string;
  themeDesc: string;
  languageLabel: string;
  languageDesc: string;
  playbackSection: string;
  autoResumeLabel: string;
  autoResumeDesc: string;
  seekStepLabel: string;
  seekStepDesc: string;
  defaultSpeedLabel: string;
  defaultSpeedDesc: string;
  defaultAspectLabel: string;
  defaultAspectDesc: string;
  subtitlesSection: string;
  autoSubLabel: string;
  autoSubDesc: string;
  subSizeLabel: string;
  subSizeDesc: string;
  interfaceSection: string;
  hudDelayLabel: string;
  hudDelayDesc: string;
  never: string;
  telemetryLabel: string;
  telemetryDesc: string;
  visualizerLabel: string;
  visualizerDesc: string;
  osdLabel: string;
  osdDesc: string;
  onlineLyricsLabel: string;
  onlineLyricsDesc: string;
  clearResume: string;
  resetDefaults: string;
}

export const STRINGS: Record<SapiraLanguage, UiStrings> = {
  ro: {
    openMedia: 'Deschide Media',
    openFolder: 'Deschide Folder',
    openUrl: 'Deschide URL',
    playlists: 'Playlisturi',
    queue: 'Coadă',
    recents: 'Recente',
    settings: 'Setări',
    shortcuts: 'Scurtături',
    commandPalette: 'Paletă Comenzi',
    commandPlaceholder: 'Caută melodii, filme, playlisturi, teme sau comenzi…',
    emptySubtitle1: 'Trage fișiere video sau audio oriunde în fereastră.',
    emptySubtitle2: 'Redare locală de precizie. Zero aglomerație.',
    telemetryRight: 'LOCAL · OPEN SOURCE',
    signalActive: 'SEMNAL // ACTIV',
    signalStandby: 'SEMNAL // AȘTEPTARE',
    audioCore: 'NUCLEU AUDIO',
    appearanceSection: 'Identitate Vizuală & Limbă',
    themeLabel: 'Temă cromatică',
    themeDesc: 'Paleta de accente luminoase și auroră audio',
    languageLabel: 'Limba interfeței',
    languageDesc: 'Comută instant între Română și Engleză',
    playbackSection: 'Redare',
    autoResumeLabel: 'Reluare automată (Auto-resume)',
    autoResumeDesc: 'Memorează poziția rămasă pentru fișierele locale',
    seekStepLabel: 'Pas derulare (← / →)',
    seekStepDesc: 'Intervalul sărit la apăsarea săgeților',
    defaultSpeedLabel: 'Viteză implicită',
    defaultSpeedDesc: 'Rata inițială de redare',
    defaultAspectLabel: 'Format imagine implicit',
    defaultAspectDesc: 'Modul de încadrare video',
    subtitlesSection: 'Subtitrări',
    autoSubLabel: 'Auto-încărcare subtitrări',
    autoSubDesc: 'Caută automat .srt / .vtt / .ass lângă film',
    subSizeLabel: 'Dimensiune subtitrare',
    subSizeDesc: 'Mărimea implicită a textului',
    interfaceSection: 'Interfață & Audio',
    hudDelayLabel: 'Ascundere automată HUD',
    hudDelayDesc: 'Ascunde controalele în timpul redării video',
    never: 'Niciodată',
    telemetryLabel: 'Grilă & telemetrie Prism HUD',
    telemetryDesc: 'Matricea discretă de puncte și colțarele',
    visualizerLabel: 'Vizualizator auroral audio',
    visualizerDesc: 'Coroana reactivă la muzică în Audio Core',
    osdLabel: 'Notificări pe ecran (OSD)',
    osdDesc: 'Afișează confirmări scurte la volum, seek, viteză',
    onlineLyricsLabel: 'Căutare automată versuri online (LRCLIB)',
    onlineLyricsDesc: 'Dezactivat implicit pentru 100% confidențialitate offline',
    clearResume: 'Șterge Istoric Resume',
    resetDefaults: 'Resetează Setările',
  },
  en: {
    openMedia: 'Open Media',
    openFolder: 'Open Folder',
    openUrl: 'Open URL',
    playlists: 'Playlists',
    queue: 'Queue',
    recents: 'Recents',
    settings: 'Settings',
    shortcuts: 'Shortcuts',
    commandPalette: 'Command Palette',
    commandPlaceholder: 'Search songs, movies, playlists, themes, or commands…',
    emptySubtitle1: 'Drop video or music files anywhere into the chamber.',
    emptySubtitle2: 'Precision local playback. Zero clutter.',
    telemetryRight: 'LOCAL · OPEN SOURCE',
    signalActive: 'SIGNAL // ACTIVE',
    signalStandby: 'SIGNAL // STANDBY',
    audioCore: 'AUDIO CORE',
    appearanceSection: 'Visual Identity & Language',
    themeLabel: 'Color theme',
    themeDesc: 'Accent spectrum and audio aurora palette',
    languageLabel: 'Interface language',
    languageDesc: 'Switch instantly between Romanian and English',
    playbackSection: 'Playback',
    autoResumeLabel: 'Auto-resume playback',
    autoResumeDesc: 'Remember position for local media files',
    seekStepLabel: 'Seek step (← / →)',
    seekStepDesc: 'Arrow key jump interval',
    defaultSpeedLabel: 'Default speed',
    defaultSpeedDesc: 'Initial playback rate',
    defaultAspectLabel: 'Default aspect ratio',
    defaultAspectDesc: 'Video framing mode',
    subtitlesSection: 'Subtitles',
    autoSubLabel: 'Auto-load folder subtitles',
    autoSubDesc: 'Match .srt / .vtt / .ass next to video file',
    subSizeLabel: 'Subtitle size',
    subSizeDesc: 'Default caption scale',
    interfaceSection: 'Interface & Audio',
    hudDelayLabel: 'HUD auto-hide delay',
    hudDelayDesc: 'Hide controls during video playback',
    never: 'Never',
    telemetryLabel: 'Prism HUD grid & telemetry',
    telemetryDesc: 'Dot matrix and corner reticles',
    visualizerLabel: 'Audio aurora visualizer',
    visualizerDesc: 'Music-reactive corona in Audio Core',
    osdLabel: 'On-screen notifications (OSD)',
    osdDesc: 'Show brief pills on volume, seek, speed',
    onlineLyricsLabel: 'Auto-fetch online lyrics (LRCLIB)',
    onlineLyricsDesc: 'Off by default for strict offline privacy',
    clearResume: 'Clear Resume History',
    resetDefaults: 'Reset Defaults',
  },
};
