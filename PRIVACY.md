# Privacy Policy — Sapira Media Player

**Effective Date:** November 2026

> **Core Privacy Guarantee:**
> This program will not transfer any information to other networked systems unless specifically requested by the user or the person installing or operating it.

---

## 1. Zero Telemetry & Zero Data Collection

**Sapira Media Player** is a local-first, open-source desktop application released under the [MIT License](./LICENSE):
- **No analytics or telemetry**: Sapira does not include any analytics SDK, usage tracker, crash reporter, or advertising module.
- **No accounts or cloud sync**: User preferences, saved `.m3u` playlists, playback resume positions, and favorite radio stations are stored strictly locally on the user's device.
- **No automatic background connections**: Sapira does not check for updates automatically or contact any external server during local audio or video playback.

## 2. Optional User-Initiated Network Features

Network connections occur **only** when explicitly initiated by the user:

1. **Direct Network Streams (`Open Stream`)**: When the user enters or selects an `http://` or `https://` media URL (`.m3u8`, `.mp4`, `.mp3`, Icecast), the player connects directly to that user-specified server to stream the media.
2. **Live Radio Directory (`Live Radio` Tab)**: When the user opens the *Live Radio* tab or searches for radio stations, Sapira queries the public, community-run open-source [Radio Browser API](https://www.radio-browser.info/) to list station streams.
3. **External Platform URLs (`yt-dlp`)**: When the user explicitly pastes a web video/audio URL (e.g., YouTube, SoundCloud, Twitch, Vimeo) and clicks *Play*, Sapira invokes the user's locally installed [`yt-dlp`](https://github.com/yt-dlp/yt-dlp) utility to resolve the media stream directly from that platform.
4. **Online Synchronized Lyrics (`LRCLIB`)**: Disabled by default (`autoFetchOnlineLyrics: false`). Only when the user clicks *Search Lyrics Online* or explicitly enables automatic online lyrics in *Settings*, Sapira sends track metadata (title, artist, album, duration) to the public open-source [LRCLIB API](https://lrclib.net/) to retrieve `.lrc` lyrics.

When interacting with any of the optional third-party endpoints above, standard HTTP request metadata (such as your IP address) is visible to the respective service under its own privacy terms.

## 3. Code Signing Transparency

Free code signing on Windows is provided by [SignPath.io](https://signpath.io/), certificate by [SignPath Foundation](https://signpath.org/). See [CODE_SIGNING_POLICY.md](./CODE_SIGNING_POLICY.md).
