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
    androidFull: 'Sapira-Media-Player-Full-0.1.0-android.apk',
  },
};

const I18N = {
  ro: {
    navPreview: 'Interfață',
    navFeatures: 'Funcții',
    navDownload: 'Descărcare',
    heroTitleLead: "Filme și muzică.",
    heroTitleHighlight: "În ritmul tău.",
    heroSubtitle: "Redă filme, muzică fără pierderi și streamuri live pe macOS, Windows și Android.",
    ctaDownloadDefault: 'Descarcă Sapira',
    ctaDownloadMac: 'Alege versiunea macOS',
    ctaDownloadWin: 'Descarcă pentru Windows',
    ctaDownloadAndroid: 'Descarcă pentru Android (.apk)',
    ctaPreview: "Explorează interfața",
    checksumsLabel: "Sume de control SHA-256",
    privacyPolicy: "Confidențialitate și semnarea codului",
    modeAudio: 'Audio Core & Versuri',
    modeCinema: 'Cinema 4K & Ambilight',
    modeRadio: 'YouTube & 30k+ Radio',
    themeHint: 'Schimbă tema din colțul dreapta-sus pentru a testa culorile Prism HUD',
    mockSubtitle: '„Dincolo de orbită, lumina prismei deschide ultimul portal.”',
    dockPalette: 'Command Palette',
    featuresTitle: "Pentru felul în care privești și asculți.",
    feat1Title: "Formatele tale, într-un singur player",
    feat1Desc: "Redă MKV, MP4, FLAC și alte formate. FFmpeg extinde compatibilitatea cu formate video și audio mai vechi.",
    feat2Title: "Cinema cu Ambilight",
    feat2Desc: "Lumina ambientală urmărește imaginea. Ajustează cadrul și navighează cu subtitrări, capitole și avans cadru cu cadru.",
    feat3Title: "Sunet și versuri sincronizate",
    feat3Desc: "Reglează sunetul cu egalizatorul pe cinci benzi. Urmărește versurile pe măsură ce rulează piesa.",
    feat4Title: "Streamuri și radio live",
    feat4Desc: "Deschide streamuri HLS, descoperă posturi de radio sau folosește yt-dlp pentru linkuri YouTube și SoundCloud.",
    feat5Title: "Control rapid",
    feat5Desc: "Deschide paleta de comenzi din tastatură, folosește mini-playerul și organizează fișierele în playlisturi M3U.",
    shortcutsTitle: "Scurtături desktop",
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
    downloadTitle: "Descarcă Sapira",
    downloadSub: "Alege versiunea pentru macOS, Windows sau Android.",
    macDesc: 'Optimizat nativ pentru Apple Silicon (M1–M4) și procesoare Intel.',
    macGatekeeperNote: 'Prima rulare pe macOS (build open-source nesemnat Apple):',
    winDesc: 'Instalator complet cu asocieri de fișiere sau versiune portabilă fără instalare.',
    optionalToolsNote: 'Opțional (pentru linkuri YouTube & transcodare AC3/DTS):',
    androidDesc: 'APK nativ Kotlin + Media3 cu redare în fundal, MKV/FLAC și YouTube 1080p fără reclame.',
    androidFullBtn: 'Sapira Full (.apk)',
    androidFullSub: 'ARM64 / Universal · YouTube 1080p & Fundal',
    androidPlayBtn: 'Google Play Store',
    androidPlaySub: 'În curând · Ediția oficială Play',
    androidInstallNote: 'APK semnat RSA-4096 · Poți trimite linkuri direct prin Share din YouTube către Sapira Full.',
    footerLicense: 'Licență MIT Open-Source',
    navAndroid: "Android",
    skipLink: "Sari la conținut",
    heroKicker: "PLAYER MEDIA OPEN-SOURCE",
    heroNote: "Gratuit sub licența MIT. Fără cont sau telemetrie.",
    previewTitle: "Descoperă playerul.",
    previewIntro: "Explorează interfața desktop în această demonstrație interactivă.",
    showShortcuts: "Vezi comenzile rapide",
    androidTitle: "Sapira pe Android.",
    androidIntro: "Ia biblioteca cu tine. Reia un film de unde ai rămas, folosește gesturile în ecran complet sau ascultă cu ecranul blocat.",
    androidSource: "Explorează proiectul Android",
    installHelp: "Note de instalare",
    copy: "Copiază",
    copied: "Copiat!",
    copyFailed: "Copiază manual",
  },
  en: {
    navPreview: 'Interface',
    navFeatures: 'Features',
    navDownload: 'Download',
    heroTitleLead: "Your media.",
    heroTitleHighlight: "In its element.",
    heroSubtitle: "An open-source player for films, lossless music and live streams on macOS, Windows and Android.",
    ctaDownloadDefault: 'Download Sapira',
    ctaDownloadMac: 'Choose macOS build',
    ctaDownloadWin: 'Download for Windows',
    ctaDownloadAndroid: 'Download for Android (.apk)',
    ctaPreview: "Explore the interface",
    checksumsLabel: "SHA-256 checksums",
    privacyPolicy: "Privacy & Code Signing Policy",
    modeAudio: 'Audio Core & Lyrics',
    modeCinema: '4K Cinema & Ambilight',
    modeRadio: 'YouTube & 30k+ Radio',
    themeHint: 'Switch themes in the top-right bar to preview live Prism HUD palettes',
    mockSubtitle: '“Beyond the orbit, prism light unlocks the final horizon.”',
    dockPalette: 'Command Palette',
    featuresTitle: "Made for the way you watch and listen.",
    feat1Title: "Your formats, one player",
    feat1Desc: "Play MKV, MP4, FLAC and more. FFmpeg extends compatibility with legacy video and audio formats.",
    feat2Title: "Cinema with Ambilight",
    feat2Desc: "Ambient light follows the picture. Adjust the frame and explore films with subtitles, chapters and frame-by-frame playback.",
    feat3Title: "Sound and synced lyrics",
    feat3Desc: "Fine-tune your sound with the five-band equalizer. Follow the lyrics as the song plays.",
    feat4Title: "Streams and live radio",
    feat4Desc: "Open HLS streams, discover radio stations or use yt-dlp with YouTube and SoundCloud links.",
    feat5Title: "Keep playback within reach",
    feat5Desc: "Open the command palette from your keyboard, switch to the mini-player and organize files in M3U playlists.",
    shortcutsTitle: "Desktop shortcuts",
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
    downloadTitle: "Download Sapira",
    downloadSub: "Choose the build for macOS, Windows, or Android.",
    macDesc: 'Natively compiled for Apple Silicon (M1–M4) and Intel Macs.',
    macGatekeeperNote: 'First launch on macOS (unsigned open-source build):',
    winDesc: 'Full NSIS setup installer with file associations or zero-install portable executable.',
    optionalToolsNote: 'Optional power tools (for YouTube links & AC3/DTS remux):',
    androidDesc: 'Native Kotlin + Media3 APK with background play, MKV/FLAC and ad-free 1080p YouTube.',
    androidFullBtn: 'Sapira Full (.apk)',
    androidFullSub: 'ARM64 / Universal · YouTube 1080p & Background',
    androidPlayBtn: 'Google Play Store',
    androidPlaySub: 'Coming soon · Official Play edition',
    androidInstallNote: 'Signed RSA-4096 release APK · Share links directly from YouTube to Sapira Full.',
    footerLicense: 'MIT Open-Source License',
    navAndroid: "Android",
    skipLink: "Skip to content",
    heroKicker: "OPEN-SOURCE MEDIA PLAYER",
    heroNote: "Free under the MIT license. No account or telemetry.",
    previewTitle: "Meet the player.",
    previewIntro: "Explore the desktop interface in this interactive preview.",
    showShortcuts: "View keyboard shortcuts",
    androidTitle: "Sapira on Android.",
    androidIntro: "Play your library on the go. Resume a film where you left off, use fullscreen gestures, or keep listening with the screen locked.",
    androidSource: "Explore the Android project",
    installHelp: "Installation notes",
    copy: "Copy",
    copied: "Copied!",
    copyFailed: "Copy manually",
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
  let currentLang = (localStorage.getItem('sapira.landing.lang') || 'en') === 'ro' ? 'ro' : 'en';
  let currentTheme = localStorage.getItem('sapira.landing.theme') || 'sapphire';
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  let previewPlaying = !reducedMotion.matches;

  const detectedOs = (() => {
    const ua = navigator.userAgent.toLowerCase();
    if (ua.includes('android')) return 'android';
    if (/iphone|ipad|ipod/.test(ua)) return 'other';
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
      const active = btn.getAttribute('data-set-theme') === theme;
      btn.classList.toggle('active', active);
      btn.setAttribute('aria-pressed', String(active));
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
      else if (detectedOs === 'android') primaryLabel.textContent = dict.ctaDownloadAndroid;
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
    const androidFull = document.getElementById('dl-android-full');
    const androidHero = document.getElementById('dl-android-hero');
    const primaryCta = document.getElementById('primary-download-btn');

    if (macArm) macArm.href = buildUrl(RELEASE_CONFIG.files.macArm64);
    if (macX64) macX64.href = buildUrl(RELEASE_CONFIG.files.macX64);
    if (winSetup) winSetup.href = buildUrl(RELEASE_CONFIG.files.winSetup);
    if (winPort) winPort.href = buildUrl(RELEASE_CONFIG.files.winPortable);
    if (androidFull) androidFull.href = buildUrl(RELEASE_CONFIG.files.androidFull);
    if (androidHero) androidHero.href = buildUrl(RELEASE_CONFIG.files.androidFull);

    if (detectedOs === 'mac') {
      document.getElementById('card-mac')?.classList.add('recommended');
      if (primaryCta) primaryCta.href = '#card-mac';
    } else if (detectedOs === 'windows') {
      document.getElementById('card-win')?.classList.add('recommended');
      if (primaryCta) primaryCta.href = base || ghBase ? buildUrl(RELEASE_CONFIG.files.winSetup) : '#card-win';
    } else if (detectedOs === 'android') {
      document.getElementById('card-android')?.classList.add('recommended');
      if (primaryCta) primaryCta.href = base || ghBase ? buildUrl(RELEASE_CONFIG.files.androidFull) : '#card-android';
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
  const modeTabs = [...document.querySelectorAll('.mode-tab')];
  modeTabs.forEach((tab, index) => {
    tab.addEventListener('keydown', (event) => {
      const target = {
        ArrowLeft: (index - 1 + modeTabs.length) % modeTabs.length,
        ArrowRight: (index + 1) % modeTabs.length,
        Home: 0,
        End: modeTabs.length - 1,
      }[event.key];
      if (target === undefined) return;
      event.preventDefault();
      modeTabs[target].focus();
      modeTabs[target].click();
    });
    tab.addEventListener('click', () => {
      const mode = tab.getAttribute('data-mode');
      modeTabs.forEach((t) => {
        const active = t === tab;
        t.classList.toggle('active', active);
        t.setAttribute('aria-selected', String(active));
        t.tabIndex = active ? 0 : -1;
      });
      document.querySelectorAll('.stage-panel').forEach((panel) => {
        const active = panel.getAttribute('data-panel') === mode;
        panel.classList.toggle('active', active);
        panel.hidden = !active;
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
  function updatePreviewButton() {
    if (!playBtn) return;
    playBtn.textContent = previewPlaying ? '❚❚' : '▶';
    playBtn.setAttribute('aria-pressed', String(previewPlaying));
  }
  updatePreviewButton();
  playBtn?.addEventListener('click', () => {
    previewPlaying = !previewPlaying;
    updatePreviewButton();
  });

  // Copy CLI helper buttons
  document.querySelectorAll('.copy-btn').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const cmd = btn.getAttribute('data-copy');
      if (!cmd) return;
      try {
        await navigator.clipboard.writeText(cmd);
        btn.textContent = I18N[currentLang].copied;
      } catch {
        btn.textContent = I18N[currentLang].copyFailed;
      }
      setTimeout(() => { btn.textContent = I18N[currentLang].copy; }, 1400);
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
