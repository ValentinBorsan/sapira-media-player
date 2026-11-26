/**
 * Sapira Media Player — Official Landing Page Controller
 * Configure `githubRepo` (e.g. "your-username/sapira-media-player") or
 * `customDownloadBaseUrl` (e.g. a Cloudflare R2 bucket domain) once published.
 */
const RELEASE_CONFIG = {
  version: '0.1.0',
  githubRepo: 'ValentinBorsan/sapira-media-player',
  customDownloadBaseUrl: 'https://pub-c9b95716429943f88f4ec4cc39a49efd.r2.dev/v0.1.0',
  files: {
    macArm64: 'Sapira-Media-Player-0.1.0-arm64.dmg',
    macX64: 'Sapira-Media-Player-0.1.0-x64.dmg',
    winSetup: 'Sapira-Media-Player-Setup-0.1.0-x64.exe',
    winPortable: 'Sapira-Media-Player-Portable-0.1.0-x64.exe',
  },
};

const I18N = {
  ro: {
    navPreview: 'Interfață',
    navFeatures: 'Funcții',
    navShortcuts: 'Scurtături',
    navDownload: 'Descărcare',
    heroBadge: `v${RELEASE_CONFIG.version} · Open-Source MIT · Motor Electron 45`,
    heroTitleLead: 'Sunet pur.',
    heroTitleHighlight: 'Cinema 4K.',
    heroSubtitle:
      'Player desktop open-source pentru macOS și Windows. Zero telemetrie.',
    ctaDownloadDefault: 'Descarcă Sapira',
    ctaDownloadMac: 'Descarcă pentru macOS',
    ctaDownloadWin: 'Descarcă pentru Windows',
    ctaAllPlatforms: 'macOS & Windows ↓',
    chipZeroAds: '0% Reclamă · 0% Telemetrie',
    modeAudio: 'Audio Core & Versuri',
    modeCinema: 'Cinema 4K & Ambilight',
    modeRadio: 'YouTube & 30k+ Radio',
    themeHint: 'Schimbă tema din colțul dreapta-sus pentru a testa culorile Prism HUD',
    mockSubtitle: '„Dincolo de orbită, lumina prismei deschide ultimul portal.”',
    dockPalette: 'Command Palette',
    featuresEyebrow: 'ARHITECTURĂ DESKTOP COMPLETĂ',
    featuresTitle: 'Construit pentru fiecare format, de la vinil digital la cinema 4K.',
    feat1Title: 'Motor Universal de Codecuri & FFmpeg',
    feat1Desc:
      'Protocol nativ sapira-media:// cu streaming HTTP 206 Range instantaneu pe fișiere mari, completat de remuxare fără pierderi și transcodare automată FFmpeg pentru MKV, AVI, WMV, FLV, TS, HEVC, AC3, DTS, FLAC, WAV și ALAC.',
    feat2Title: 'GPU Ambilight & Cinema Pro',
    feat2Desc:
      'Halou ambiental în timp real în jurul cadrului video, reglaje live de imagine (luminozitate, contrast, saturație, zoom 2×, rotație 90°, oglindire), pas-cu-pas pe cadru, capitole pe timeline și subtitrări .srt/.ass/.vtt.',
    feat3Title: 'Sanctuar Audio & Versuri .LRC',
    feat3Desc:
      'Spectru radial Web Audio sincronizat cu muzica, versuri locale .lrc sau căutate automat online prin LRCLIB, egalizator grafic pe 5 benzi, amplificare volum până la 200% și Sleep Timer cu fade-out lin de 10 secunde.',
    feat4Title: 'YouTube, SoundCloud & 30.000+ Posturi Radio',
    feat4Desc:
      'Redă streamuri HLS (.m3u8), extrage direct linkuri YouTube, Twitch, SoundCloud sau Vimeo prin yt-dlp (inclusiv remux 1080p DASH) și explorează instantaneu posturi radio românești și internaționale.',
    feat5Title: 'Command Palette, Mini-Player & Securitate Sandboxed',
    feat5Desc:
      'Controlează totul instantaneu din tastatură (Cmd/Ctrl + K), comută în Mini-Player flotant (W), salvează playlisturi .m3u și alege dintre 5 teme optice și interfață live Română / Engleză — totul izolat în Electron 45 Sandbox.',
    shortcutsEyebrow: 'VITEZĂ FĂRĂ MOUSE',
    shortcutsTitle: 'Comenzi rapide gândite pentru flux continuu',
    scPlay: 'Redare / Pauză',
    scPalette: 'Command Palette',
    scStream: 'Stream / YouTube / Radio',
    scAmbilight: 'Comută GPU Ambilight',
    scLyrics: 'Versuri sincronizate',
    scSleep: 'Sleep Timer cu fade-out',
    scMini: 'Mod Mini-Player',
    scLoop: 'Buclă A–B',
    scFrame: 'Pas cadru înapoi / înainte',
    scRotate: 'Rotește video 90°',
    scPip: 'Picture-in-Picture / Captură',
    scVol: 'Volum până la 200% Boost',
    downloadEyebrow: 'DESCĂRCARE GRATUITĂ · OPEN SOURCE',
    downloadTitle: 'Alege ediția pentru sistemul tău',
    downloadSub: 'Pachete native compilate pe Electron 45. Fără cont, fără abonament, fără telemetrie.',
    macDesc: 'Optimizat nativ pentru Apple Silicon (M1–M4) și procesoare Intel.',
    macGatekeeperNote: 'Prima rulare pe macOS (build open-source nesemnat Apple):',
    winDesc: 'Instalator complet cu asocieri de fișiere sau versiune portabilă fără instalare.',
    optionalToolsNote: 'Opțional (pentru linkuri YouTube & transcodare AC3/DTS):',
    footerLicense: 'Licență MIT Open-Source',
  },
  en: {
    navPreview: 'Interface',
    navFeatures: 'Features',
    navShortcuts: 'Shortcuts',
    navDownload: 'Download',
    heroBadge: `v${RELEASE_CONFIG.version} · Open-Source MIT · Electron 45 Engine`,
    heroTitleLead: 'Pure sound.',
    heroTitleHighlight: '4K cinema.',
    heroSubtitle:
      'Minimalist open-source player for macOS and Windows. Zero telemetry.',
    ctaDownloadDefault: 'Download Sapira',
    ctaDownloadMac: 'Download for macOS',
    ctaDownloadWin: 'Download for Windows',
    ctaAllPlatforms: 'macOS & Windows ↓',
    chipZeroAds: '0% Ads · 0% Telemetry',
    modeAudio: 'Audio Core & Lyrics',
    modeCinema: '4K Cinema & Ambilight',
    modeRadio: 'YouTube & 30k+ Radio',
    themeHint: 'Switch themes in the top-right bar to preview live Prism HUD palettes',
    mockSubtitle: '“Beyond the orbit, prism light unlocks the final horizon.”',
    dockPalette: 'Command Palette',
    featuresEyebrow: 'COMPLETE DESKTOP ARCHITECTURE',
    featuresTitle: 'Engineered for every format, from lossless audio to 4K cinema.',
    feat1Title: 'Universal Codec & FFmpeg Engine',
    feat1Desc:
      'Custom sapira-media:// HTTP 206 Range streaming for instant seeking on multi-GB files, backed by automatic lossless remuxing and FFmpeg transcoding for MKV, AVI, WMV, FLV, TS, HEVC, AC3, DTS, FLAC, WAV, and ALAC.',
    feat2Title: 'GPU Ambilight & Cinema Pro',
    feat2Desc:
      'Real-time ambient canvas glow around video frames, live image adjustments (brightness, contrast, saturation, 2× zoom, 90° rotation, mirror), frame-by-frame stepping, timeline chapters, and .srt/.ass/.vtt subtitles.',
    feat3Title: 'Audio Sanctuary & Synced Lyrics',
    feat3Desc:
      'Music-reactive Web Audio radial spectrum, sidecar .lrc or automatic online LRCLIB synced lyrics, 5-band graphic equalizer, up to 200% preamp volume boost, and Sleep Timer with a gentle 10-second fade-out.',
    feat4Title: 'YouTube, SoundCloud & 30,000+ Radio Stations',
    feat4Desc:
      'Play direct HLS (.m3u8) streams, extract YouTube, Twitch, SoundCloud, or Vimeo streams via yt-dlp (including 1080p DASH muxing), and browse Romanian & global live radio stations with one click.',
    feat5Title: 'Command Palette, Mini-Player & Sandboxed Security',
    feat5Desc:
      'Control everything from the keyboard (Cmd/Ctrl + K), pop into the floating Mini-Player (W), manage .m3u playlists, and switch between 5 optical themes and live English / Romanian UI inside a hardened Electron 45 Sandbox.',
    shortcutsEyebrow: 'KEYBOARD-FIRST SPEED',
    shortcutsTitle: 'Precision shortcuts built for uninterrupted flow',
    scPlay: 'Play / Pause',
    scPalette: 'Command Palette',
    scStream: 'Stream / YouTube / Radio',
    scAmbilight: 'Toggle GPU Ambilight',
    scLyrics: 'Synchronized Lyrics',
    scSleep: 'Sleep Timer with fade-out',
    scMini: 'Mini-Player Mode',
    scLoop: 'A–B Segment Loop',
    scFrame: 'Frame Step Back / Forward',
    scRotate: 'Rotate Video 90°',
    scPip: 'Picture-in-Picture / Screenshot',
    scVol: 'Volume up to 200% Boost',
    downloadEyebrow: 'FREE DOWNLOAD · OPEN SOURCE',
    downloadTitle: 'Choose the build for your platform',
    downloadSub: 'Native installers built on Electron 45. No account, no subscription, zero telemetry.',
    macDesc: 'Natively compiled for Apple Silicon (M1–M4) and Intel Macs.',
    macGatekeeperNote: 'First launch on macOS (unsigned open-source build):',
    winDesc: 'Full NSIS setup installer with file associations or zero-install portable executable.',
    optionalToolsNote: 'Optional power tools (for YouTube links & AC3/DTS remux):',
    footerLicense: 'MIT Open-Source License',
  },
};

const THEME_COLORS = {
  sapphire: ['#a855f7', '#38bdf8'],
  violet: ['#ec4899', '#818cf8'],
  emerald: ['#059669', '#5eead4'],
  amber: ['#ea580c', '#fde047'],
  monochrome: ['#94a3b8', '#ffffff'],
};

(function initSapiraLanding() {
  let currentLang = (localStorage.getItem('sapira.landing.lang') || 'ro') === 'en' ? 'en' : 'ro';
  let currentTheme = localStorage.getItem('sapira.landing.theme') || 'sapphire';
  let previewPlaying = true;

  const detectedOs = (() => {
    const ua = navigator.userAgent.toLowerCase();
    if (ua.includes('win')) return 'windows';
    if (ua.includes('mac')) return 'mac';
    return 'other';
  })();

  function applyTheme(theme) {
    if (!THEME_COLORS[theme]) theme = 'sapphire';
    currentTheme = theme;
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('sapira.landing.theme', theme);
    document.querySelectorAll('.theme-dot').forEach((btn) => {
      btn.classList.toggle('active', btn.getAttribute('data-set-theme') === theme);
    });
  }

  function applyLanguage(lang) {
    currentLang = lang === 'en' ? 'en' : 'ro';
    document.documentElement.lang = currentLang;
    localStorage.setItem('sapira.landing.lang', currentLang);
    const dict = I18N[currentLang];

    document.querySelectorAll('[data-i18n]').forEach((el) => {
      const key = el.getAttribute('data-i18n');
      if (key && dict[key]) {
        el.textContent = dict[key];
      }
    });

    const primaryLabel = document.getElementById('primary-download-label');
    if (primaryLabel) {
      if (detectedOs === 'mac') primaryLabel.textContent = dict.ctaDownloadMac;
      else if (detectedOs === 'windows') primaryLabel.textContent = dict.ctaDownloadWin;
      else primaryLabel.textContent = dict.ctaDownloadDefault;
    }

    const langBtn = document.getElementById('lang-toggle');
    if (langBtn) {
      langBtn.textContent = currentLang === 'ro' ? 'RO · EN' : 'EN · RO';
    }
  }

  function wireDownloadLinks() {
    const base = RELEASE_CONFIG.customDownloadBaseUrl.replace(/\/$/, '');
    const repo = RELEASE_CONFIG.githubRepo.trim();
    const ghBase = repo ? `https://github.com/${repo}` : '';

    const buildUrl = (fileName) => {
      if (base) return `${base}/${fileName}`;
      if (ghBase) return `${ghBase}/releases/latest/download/${fileName}`;
      return '#download';
    };

    const macArm = document.getElementById('dl-mac-arm64');
    const macX64 = document.getElementById('dl-mac-x64');
    const winSetup = document.getElementById('dl-win-setup');
    const winPort = document.getElementById('dl-win-portable');
    const primaryCta = document.getElementById('primary-download-btn');

    if (macArm) macArm.href = buildUrl(RELEASE_CONFIG.files.macArm64);
    if (macX64) macX64.href = buildUrl(RELEASE_CONFIG.files.macX64);
    if (winSetup) winSetup.href = buildUrl(RELEASE_CONFIG.files.winSetup);
    if (winPort) winPort.href = buildUrl(RELEASE_CONFIG.files.winPortable);

    if (detectedOs === 'mac') {
      document.getElementById('card-mac')?.classList.add('recommended');
      if (primaryCta) primaryCta.href = base || ghBase ? buildUrl(RELEASE_CONFIG.files.macArm64) : '#card-mac';
    } else if (detectedOs === 'windows') {
      document.getElementById('card-win')?.classList.add('recommended');
      if (primaryCta) primaryCta.href = base || ghBase ? buildUrl(RELEASE_CONFIG.files.winSetup) : '#card-win';
    }

    if (ghBase) {
      ['github-nav-link', 'github-footer-link'].forEach((id) => {
        const el = document.getElementById(id);
        if (el) el.href = ghBase;
      });
      const rel = document.getElementById('releases-footer-link');
      if (rel) rel.href = `${ghBase}/releases`;

      // Automatically fetch latest GitHub Release asset URLs when no custom R2 CDN base is set
      if (!base) {
        fetch(`https://api.github.com/repos/${repo}/releases/latest`)
          .then((r) => (r.ok ? r.json() : null))
          .then((data) => {
            if (!data || !Array.isArray(data.assets)) return;
            const findAsset = (suffix) =>
              data.assets.find((a) => typeof a.name === 'string' && a.name.endsWith(suffix))
                ?.browser_download_url;
            const armUrl = findAsset('arm64.dmg');
            const x64Url = findAsset('x64.dmg');
            const setupUrl = data.assets.find((a) => /Setup.*\.exe$/i.test(a.name))?.browser_download_url;
            const portUrl = data.assets.find((a) => /Portable.*\.exe$/i.test(a.name))?.browser_download_url;

            if (armUrl && macArm) macArm.href = armUrl;
            if (x64Url && macX64) macX64.href = x64Url;
            if (setupUrl && winSetup) winSetup.href = setupUrl;
            if (portUrl && winPort) winPort.href = portUrl;
            if (primaryCta) {
              if (detectedOs === 'mac' && armUrl) primaryCta.href = armUrl;
              if (detectedOs === 'windows' && setupUrl) primaryCta.href = setupUrl;
            }
          })
          .catch(() => {});
      }
    }
  }

  // Theme buttons
  document.querySelectorAll('[data-set-theme]').forEach((btn) => {
    btn.addEventListener('click', () => {
      applyTheme(btn.getAttribute('data-set-theme'));
    });
  });

  // Language switch
  document.getElementById('lang-toggle')?.addEventListener('click', () => {
    applyLanguage(currentLang === 'ro' ? 'en' : 'ro');
  });

  // Showcase mode tabs
  const codecBadge = document.getElementById('mock-codec-badge');
  const ambilightHalo = document.getElementById('ambilight-halo');
  document.querySelectorAll('.mode-tab').forEach((tab) => {
    tab.addEventListener('click', () => {
      const mode = tab.getAttribute('data-mode');
      document.querySelectorAll('.mode-tab').forEach((t) => {
        const active = t === tab;
        t.classList.toggle('active', active);
        t.setAttribute('aria-selected', String(active));
      });
      document.querySelectorAll('.stage-panel').forEach((panel) => {
        panel.classList.toggle('active', panel.getAttribute('data-panel') === mode);
      });
      if (codecBadge) {
        codecBadge.textContent =
          mode === 'cinema'
            ? 'MKV · HEVC 4K HDR · 24 FPS'
            : mode === 'radio'
              ? 'HLS / ICECAST · 256 KBPS LIVE'
              : 'FLAC · 24-BIT / 96KHZ';
      }
      if (ambilightHalo) {
        ambilightHalo.classList.toggle('cinema-boost', mode === 'cinema');
      }
    });
  });

  // Play / Pause animation toggle
  const playBtn = document.getElementById('mock-play-btn');
  playBtn?.addEventListener('click', () => {
    previewPlaying = !previewPlaying;
    playBtn.textContent = previewPlaying ? '❚❚' : '▶';
  });

  // Copy CLI helper buttons
  document.querySelectorAll('.copy-btn').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const cmd = btn.getAttribute('data-copy');
      if (!cmd) return;
      try {
        await navigator.clipboard.writeText(cmd);
        const prev = btn.textContent;
        btn.textContent = 'Copied!';
        setTimeout(() => {
          btn.textContent = prev;
        }, 1400);
      } catch {
        // Ignore clipboard errors
      }
    });
  });

  // Animated Radial Spectrum Canvas in Audio Core preview
  const canvas = document.getElementById('spectrum-canvas');
  const ctx = canvas instanceof HTMLCanvasElement ? canvas.getContext('2d') : null;
  let phase = 0;

  function renderSpectrum() {
    if (ctx && canvas instanceof HTMLCanvasElement) {
      const w = canvas.width;
      const h = canvas.height;
      const cx = w / 2;
      const cy = h / 2;
      ctx.clearRect(0, 0, w, h);

      const [c1, c2] = THEME_COLORS[currentTheme] || THEME_COLORS.sapphire;
      const grad = ctx.createLinearGradient(40, 40, w - 40, h - 40);
      grad.addColorStop(0, c1);
      grad.addColorStop(1, c2);

      const bars = 64;
      const innerR = 92;
      if (previewPlaying) phase += 0.045;

      ctx.strokeStyle = grad;
      ctx.lineWidth = 2.6;
      ctx.lineCap = 'round';

      for (let i = 0; i < bars; i++) {
        const angle = (i / bars) * Math.PI * 2 - Math.PI / 2;
        const wave = previewPlaying
          ? 0.35 +
            0.35 * Math.sin(phase * 1.8 + i * 0.32) +
            0.3 * Math.cos(phase * 2.7 - i * 0.19)
          : 0.14;
        const len = 8 + Math.max(2, wave * 34);
        const x1 = cx + Math.cos(angle) * innerR;
        const y1 = cy + Math.sin(angle) * innerR;
        const x2 = cx + Math.cos(angle) * (innerR + len);
        const y2 = cy + Math.sin(angle) * (innerR + len);

        ctx.globalAlpha = 0.42 + wave * 0.5;
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
    }
    requestAnimationFrame(renderSpectrum);
  }

  applyTheme(currentTheme);
  applyLanguage(currentLang);
  wireDownloadLinks();
  requestAnimationFrame(renderSpectrum);
})();
