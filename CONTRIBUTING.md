# Contributing to Sapira Media Player

Thank you for contributing to **Sapira Media Player**! Sapira is built around two core principles:

1. **Zero-Clutter Futuristic Minimalism**: Every control earns its place on screen; advanced power stays one keypress (`⌘K`, `,`, `?`) or popover away.
2. **Local-First, Open-Source Privacy**: Zero telemetry, zero tracking, zero ads.

## Development Setup

### Prerequisites
- **Node.js** 20+ and **npm**
- *(Optional)* **FFmpeg** (`brew install ffmpeg` / `winget install Gyan.FFmpeg`) for legacy container/codec remuxing (`.avi`, `.wmv`, `AC3`/`DTS`, embedded `.mkv` subtitles, chapter markers).
- *(Optional)* **yt-dlp** (`brew install yt-dlp` / `winget install yt-dlp`) for resolving YouTube, Twitch, and SoundCloud stream links.

### Running Locally

```bash
npm install
npm run dev
```

### Verification Before Submitting a PR

```bash
npm run typecheck
npm run build
```

### Building Native Installers

```bash
npm run dist:mac   # macOS (.dmg + .zip)
npm run dist:win   # Windows (NSIS Setup .exe + Portable .exe)
npm run dist:all   # Both macOS & Windows
```

## License

By contributing to Sapira Media Player, you agree that your contributions will be licensed under the [MIT License](./LICENSE).
