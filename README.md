# Sapira Media Player

**Sapira Media Player** is a minimalist, futuristic open-source desktop audio & video media player built with Electron, React 19, and TypeScript, featuring a custom **Prism HUD** interface (*Ice Sapphire & Pearl* default theme).

## Highlights

- **Universal Video & Audio Engine**:
  - Native playback + built-in `sapira-media://` HTTP `206 Partial Content` streaming for instant seeking on large local files.
  - Automatic **FFmpeg Remux & Universal Transcode** fallback (`MKV`, `AVI`, `WMV`, `FLV`, `MOV`, `TS`, `M2TS`, `WEBM`, `WMA`, `ALAC`, `AC3`, `EAC3`, `DTS`, `HEVC`), multi-audio track switching, and embedded subtitle extraction.
- **Cinema & Video Pro**:
  - Real-time **GPU Ambilight** ambient glow around the video frame (`D`).
  - Live **Video Adjustments** (brightness, contrast, saturation, zoom `1×–2×`, `90°` rotation `R`, horizontal mirror), **Frame-by-Frame** stepping (`.` / `/`), **A–B Loop** (`B`), **Picture-in-Picture** (`I`), and **Screenshots** (`S`).
  - **Timeline Chapters** (`ffprobe`) with tick markers and hover chapter titles, plus `.srt` / `.vtt` / `.ass` / `.ssa` / `.sub` subtitles with live sync offset (`G` / `H`).
- **Music Sanctuary & Audio Pro**:
  - Faceted sapphire **Audio Core** with radial Web Audio spectrum & music-reactive **Prism Sweep** logo refraction.
  - Synchronized **`.lrc` & Online Lyrics** (`LRCLIB`) with click-to-seek (`Y`), **5-Band Graphic Equalizer**, **200% Volume Preamp Boost**, **Sleep Timer** with 10s smooth fade-out (`Z`), and compact **Mini-Player** (`W`).
- **Network Streaming, YouTube & Live Radio**:
  - Direct **HLS (`.m3u8`)** & HTTP/Icecast streams (`Cmd/Ctrl + U`).
  - Automatic **YouTube, Twitch, SoundCloud, Vimeo & Bandcamp** stream extraction when `yt-dlp` is installed on the system.
  - Built-in **Live Radio Directory** (30,000+ Romanian & international stations via the open-source Radio Browser API) + persistent **Favorites**.
- **Productivity & Personalization**:
  - Instant **Command Palette** (`Cmd/Ctrl + K`) to jump across queue tracks, saved playlists (`.m3u` import/export), recent media, themes, and actions.
  - **5 Live Themes** (*Ice Sapphire*, *Nebula Violet*, *Cyber Emerald*, *Solar Amber*, *Obsidian Mono*) & live **English / Română** interface switching.

## Key Shortcuts

| Action | Shortcut |
| --- | --- |
| Play / Pause | `Space` or `K` |
| Seek -5s / +5s (`-10s` / `+10s`) | `←` / `→` (`J` / `L`) |
| Frame Step Back / Forward | `.` / `/` |
| Volume ±5% (up to 200% Boost) | `↑` / `↓` |
| Command Palette | `Cmd/Ctrl + K` |
| Open Network Stream / Radio | `Cmd/Ctrl + U` |
| Lyrics Overlay / Sleep Timer | `Y` / `Z` |
| Toggle Ambilight / Rotate `90°` | `D` / `R` |
| A–B Loop / Aspect Ratio | `B` / `A` |
| Picture-in-Picture / Screenshot | `I` / `S` |
| Mini-Player / Always on Top | `W` / `T` |
| Queue & Playlists / Media Info | `Q` / `Cmd/Ctrl + I` |
| Settings / All Shortcuts | `Cmd/Ctrl + ,` / `?` |

## Development

```bash
npm install
npm run dev
```

Optional system tools (auto-detected if installed in `PATH` or Homebrew/WinGet):
- `ffmpeg` & `ffprobe` — enables AC3/DTS/AVI/WMV remuxing, embedded MKV subtitles, and video chapters.
- `yt-dlp` — enables direct playback of YouTube, SoundCloud, Twitch, Vimeo, and Bandcamp URLs.

## Desktop Installers (macOS & Windows)

Build native installers into `release/`:

```bash
# macOS (.dmg for Apple Silicon arm64 & Intel x64 + .zip)
npm run dist:mac

# Windows (NSIS Setup .exe + Portable .exe)
npm run dist:win

# Build both macOS and Windows installers at once
npm run dist:all
```

> **macOS Gatekeeper Note (Unsigned Open-Source Build):** Because the `.dmg` is built without a paid Apple Developer ID certificate, on another Mac right-click **Sapira Media Player.app** → **Open** on first launch (or run `xattr -cr "/Applications/Sapira Media Player.app"`).

## Privacy & Code Signing Policy

- **Privacy Guarantee**: This program will not transfer any information to other networked systems unless specifically requested by the user or the person installing or operating it. See [PRIVACY.md](./PRIVACY.md).
- **Windows Code Signing**: Free code signing on Windows provided by [SignPath.io](https://signpath.io/), certificate by [SignPath Foundation](https://signpath.org/). See [CODE_SIGNING_POLICY.md](./CODE_SIGNING_POLICY.md) for team roles and build verification rules.

## Contributing & Automated Releases

See [CONTRIBUTING.md](./CONTRIBUTING.md) for architecture notes and development guidelines. Pushing a `v*` tag triggers [`.github/workflows/release.yml`](./.github/workflows/release.yml) to build, sign, and publish macOS, Windows, and Linux installers with `SHA256SUMS.txt` automatically on GitHub Releases.

## License

MIT — see [LICENSE](./LICENSE).
