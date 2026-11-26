import { app, BrowserWindow, clipboard, dialog, ipcMain, Menu, protocol, session } from 'electron';
import fs from 'node:fs';
import path from 'node:path';
import { Readable } from 'node:stream';
import { readAudioMetadata } from './audioMetadata';
import {
  buildTranscodeStreamUrl,
  extractEmbeddedSubtitle,
  probeMediaFile,
  getFfmpegPath,
  isResolvedStream,
  registerResolvedStream,
  stopTranscodeEngine,
} from './ffmpegEngine';
import { findYtDlpPath, resolveExternalStream } from './streamResolver';

const VIDEO_EXTENSIONS = new Set([
  '.mp4',
  '.mkv',
  '.webm',
  '.mov',
  '.m4v',
  '.avi',
  '.flv',
  '.wmv',
  '.mpg',
  '.mpeg',
  '.m2ts',
  '.mts',
  '.ts',
  '.vob',
  '.3gp',
  '.ogv',
  '.asf',
  '.divx',
  '.rmvb',
]);

const AUDIO_EXTENSIONS = new Set([
  '.mp3',
  '.flac',
  '.wav',
  '.ogg',
  '.oga',
  '.m4a',
  '.aac',
  '.opus',
  '.wma',
  '.aiff',
  '.aif',
  '.alac',
  '.ape',
  '.wv',
  '.mka',
  '.ac3',
  '.dts',
  '.amr',
]);

const SUBTITLE_EXTENSIONS = new Set(['.srt', '.vtt', '.ass', '.ssa', '.sub']);

const MIME_TYPES: Record<string, string> = {
  '.mp4': 'video/mp4',
  '.m4v': 'video/mp4',
  '.webm': 'video/webm',
  '.mkv': 'video/x-matroska',
  '.mov': 'video/quicktime',
  '.avi': 'video/x-msvideo',
  '.flv': 'video/x-flv',
  '.wmv': 'video/x-ms-wmv',
  '.mpg': 'video/mpeg',
  '.mpeg': 'video/mpeg',
  '.m2ts': 'video/mp2t',
  '.mts': 'video/mp2t',
  '.ts': 'video/mp2t',
  '.vob': 'video/mpeg',
  '.3gp': 'video/3gpp',
  '.ogv': 'video/ogg',
  '.mp3': 'audio/mpeg',
  '.flac': 'audio/flac',
  '.wav': 'audio/wav',
  '.ogg': 'audio/ogg',
  '.oga': 'audio/ogg',
  '.m4a': 'audio/mp4',
  '.aac': 'audio/aac',
  '.opus': 'audio/opus',
  '.wma': 'audio/x-ms-wma',
  '.aiff': 'audio/aiff',
  '.aif': 'audio/aiff',
  '.mka': 'audio/x-matroska',
  '.ac3': 'audio/ac3',
};

interface ScannedMediaFile {
  path: string;
  name: string;
  ext: string;
  kind: 'video' | 'audio';
  size: number;
}

protocol.registerSchemesAsPrivileged([
  {
    scheme: 'sapira-media',
    privileges: {
      standard: true,
      secure: true,
      supportFetchAPI: true,
      stream: true,
      bypassCSP: true,
    },
  },
]);

let mainWindow: BrowserWindow | null = null;
const pendingOpenPaths: string[] = [];
let isMiniMode = false;
let savedNormalBounds: Electron.Rectangle | null = null;
let savedAlwaysOnTopBeforeMini = false;

function getMediaKind(filePath: string): 'video' | 'audio' | null {
  const ext = path.extname(filePath).toLowerCase();
  if (VIDEO_EXTENSIONS.has(ext)) return 'video';
  if (AUDIO_EXTENSIONS.has(ext)) return 'audio';
  return null;
}

function inspectSingleFile(filePath: string): ScannedMediaFile | null {
  const kind = getMediaKind(filePath);
  if (!kind) return null;
  try {
    const stat = fs.statSync(filePath);
    if (!stat.isFile()) return null;
    const ext = path.extname(filePath).toLowerCase();
    const name = path.basename(filePath, ext);
    return {
      path: filePath,
      name,
      ext: ext.slice(1).toUpperCase(),
      kind,
      size: stat.size,
    };
  } catch {
    return null;
  }
}

function collectMediaFromPaths(inputPaths: string[], maxDepth = 3): ScannedMediaFile[] {
  const results: ScannedMediaFile[] = [];
  const seen = new Set<string>();

  const walk = (targetPath: string, depth: number) => {
    let stat: fs.Stats;
    try {
      stat = fs.statSync(targetPath);
    } catch {
      return;
    }

    if (stat.isFile()) {
      const resolved = path.resolve(targetPath);
      if (seen.has(resolved)) return;
      const item = inspectSingleFile(resolved);
      if (item) {
        seen.add(resolved);
        results.push(item);
      }
      return;
    }

    if (stat.isDirectory() && depth < maxDepth) {
      let entries: string[];
      try {
        entries = fs.readdirSync(targetPath).sort((a, b) =>
          a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' })
        );
      } catch {
        return;
      }
      for (const entry of entries) {
        if (entry.startsWith('.')) continue;
        walk(path.join(targetPath, entry), depth + 1);
      }
    }
  };

  for (const p of inputPaths) {
    walk(p, 0);
  }
  return results;
}

function registerMediaProtocol() {
  protocol.handle('sapira-media', async (request) => {
    try {
      const url = new URL(request.url);
      const rawPath = url.searchParams.get('path');
      if (!rawPath) {
        return new Response('Missing path parameter', { status: 400 });
      }

      const filePath = path.resolve(rawPath);
      const kind = getMediaKind(filePath);
      if (!kind) {
        return new Response('Unsupported media type', { status: 403 });
      }

      if (!fs.existsSync(filePath)) {
        return new Response('File not found', { status: 404 });
      }

      const stat = fs.statSync(filePath);
      const fileSize = stat.size;
      const ext = path.extname(filePath).toLowerCase();
      const contentType = MIME_TYPES[ext] || 'application/octet-stream';
      const rangeHeader = request.headers.get('range');

      if (request.method === 'HEAD') {
        return new Response(null, {
          status: 200,
          headers: {
            'Content-Type': contentType,
            'Content-Length': String(fileSize),
            'Accept-Ranges': 'bytes',
            'Access-Control-Allow-Origin': '*',
          },
        });
      }

      if (rangeHeader) {
        const invalidRangeResponse = () =>
          new Response('Requested Range Not Satisfiable', {
            status: 416,
            headers: {
              'Content-Range': `bytes */${fileSize}`,
              'Access-Control-Allow-Origin': '*',
            },
          });

        const match = /^bytes=(\d*)-(\d*)$/.exec(rangeHeader.trim());
        if (!match || (match[1] === '' && match[2] === '') || fileSize === 0) {
          return invalidRangeResponse();
        }

        let start: number;
        let end: number;

        if (match[1] === '') {
          // RFC 9110 suffix-byte-range-spec: bytes=-N returns the last N bytes
          const suffixLength = Number.parseInt(match[2], 10);
          if (!Number.isFinite(suffixLength) || suffixLength <= 0) {
            return invalidRangeResponse();
          }
          start = Math.max(0, fileSize - suffixLength);
          end = fileSize - 1;
        } else {
          start = Number.parseInt(match[1], 10);
          end =
            match[2] !== ''
              ? Math.min(Number.parseInt(match[2], 10), fileSize - 1)
              : fileSize - 1;
        }

        if (
          !Number.isFinite(start) ||
          !Number.isFinite(end) ||
          start < 0 ||
          start > end ||
          start >= fileSize
        ) {
          return invalidRangeResponse();
        }

        const chunkSize = end - start + 1;
        const nodeStream = fs.createReadStream(filePath, { start, end });
        const webStream = Readable.toWeb(nodeStream) as ReadableStream;

        return new Response(webStream, {
          status: 206,
          headers: {
            'Content-Type': contentType,
            'Content-Length': String(chunkSize),
            'Content-Range': `bytes ${start}-${end}/${fileSize}`,
            'Accept-Ranges': 'bytes',
            'Access-Control-Allow-Origin': '*',
          },
        });
      }

      const nodeStream = fs.createReadStream(filePath);
      const webStream = Readable.toWeb(nodeStream) as ReadableStream;

      return new Response(webStream, {
        status: 200,
        headers: {
          'Content-Type': contentType,
          'Content-Length': String(fileSize),
          'Accept-Ranges': 'bytes',
          'Access-Control-Allow-Origin': '*',
        },
      });
    } catch (error) {
      console.error('[sapira-media] error:', error);
      return new Response('Internal media stream error', { status: 500 });
    }
  });
}

function isDevEnvironment(): boolean {
  return !app.isPackaged && process.env.NODE_ENV !== 'production';
}

function isAllowedAppUrl(rawUrl: string): boolean {
  try {
    const parsed = new URL(rawUrl);
    if (isDevEnvironment() && parsed.origin === 'http://localhost:5173') {
      return true;
    }
    if (parsed.protocol === 'file:') {
      const expectedIndex = path.resolve(__dirname, '..', 'dist', 'index.html');
      const actualPath = path.resolve(
        process.platform === 'win32'
          ? decodeURIComponent(parsed.pathname).replace(/^\/([a-zA-Z]:)/, '$1')
          : decodeURIComponent(parsed.pathname)
      );
      return actualPath === expectedIndex;
    }
    return false;
  } catch {
    return false;
  }
}

function isTrustedIpcSender(event: Electron.IpcMainInvokeEvent): boolean {
  if (!mainWindow || mainWindow.isDestroyed()) return false;
  if (event.sender !== mainWindow.webContents) return false;
  const frame = event.senderFrame;
  if (!frame || frame !== mainWindow.webContents.mainFrame) return false;
  return isAllowedAppUrl(frame.url);
}

function handleTrustedIpc<Args extends unknown[], Result>(
  channel: string,
  handler: (event: Electron.IpcMainInvokeEvent, ...args: Args) => Result | Promise<Result>
): void {
  ipcMain.handle(channel, (event, ...args) => {
    if (!isTrustedIpcSender(event)) {
      throw new Error(`Blocked untrusted IPC call on channel: ${channel}`);
    }
    return handler(event, ...(args as Args));
  });
}

function createWindow() {
  const isMac = process.platform === 'darwin';

  const isDev = isDevEnvironment();
  const iconPath = isDev
    ? path.join(__dirname, '..', 'public', 'sapira-logo.png')
    : path.join(__dirname, '..', 'dist', 'sapira-logo.png');

  mainWindow = new BrowserWindow({
    width: 1180,
    height: 740,
    minWidth: 720,
    minHeight: 480,
    backgroundColor: '#04050A',
    title: 'Sapira Media Player',
    icon: fs.existsSync(iconPath) ? iconPath : undefined,
    titleBarStyle: isMac ? 'hiddenInset' : 'hidden',
    trafficLightPosition: isMac ? { x: 16, y: 15 } : undefined,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webSecurity: true,
    },
  });

  // Block untrusted popups and top-level navigations away from the app shell
  mainWindow.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  mainWindow.webContents.on('will-navigate', (event, navigationUrl) => {
    if (!isAllowedAppUrl(navigationUrl)) {
      event.preventDefault();
    }
  });

  mainWindow.once('ready-to-show', () => {
    mainWindow?.show();
    if (pendingOpenPaths.length > 0) {
      const items = collectMediaFromPaths(pendingOpenPaths.splice(0));
      if (items.length > 0) {
        mainWindow?.webContents.send('media:openFiles', items);
      }
    }
  });

  mainWindow.on('enter-full-screen', () => {
    mainWindow?.webContents.send('window:fullscreenChanged', true);
  });

  mainWindow.on('leave-full-screen', () => {
    mainWindow?.webContents.send('window:fullscreenChanged', false);
  });

  mainWindow.on('close', () => {
    try {
      mainWindow?.webContents.setAudioMuted(true);
    } catch {
      // Ignore
    }
    stopTranscodeEngine();
  });

  mainWindow.on('closed', () => {
    stopTranscodeEngine();
    mainWindow = null;
  });

  // Native Cut / Copy / Paste / Select All context menu when right-clicking inputs or selected text
  mainWindow.webContents.on('context-menu', (_event, params) => {
    if (params.isEditable || params.selectionText.trim().length > 0) {
      const editMenu = Menu.buildFromTemplate([
        { role: 'undo', enabled: params.editFlags.canUndo },
        { role: 'redo', enabled: params.editFlags.canRedo },
        { type: 'separator' },
        { role: 'cut', enabled: params.editFlags.canCut },
        { role: 'copy', enabled: params.editFlags.canCopy },
        { role: 'paste', enabled: params.editFlags.canPaste },
        { type: 'separator' },
        { role: 'selectAll', enabled: params.editFlags.canSelectAll },
      ]);
      editMenu.popup({ window: mainWindow ?? undefined });
    }
  });

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
  } else {
    mainWindow.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));
  }
}

function registerIpcHandlers() {
  const videoExtsNoDot = Array.from(VIDEO_EXTENSIONS).map((e) => e.slice(1));
  const audioExtsNoDot = Array.from(AUDIO_EXTENSIONS).map((e) => e.slice(1));

  handleTrustedIpc('dialog:openFiles', async () => {
    const result = await dialog.showOpenDialog({
      title: 'Open Media in Sapira',
      properties: ['openFile', 'multiSelections'],
      filters: [
        {
          name: 'All Supported Media',
          extensions: [...videoExtsNoDot, ...audioExtsNoDot],
        },
        { name: 'Video', extensions: videoExtsNoDot },
        { name: 'Audio', extensions: audioExtsNoDot },
      ],
    });
    if (result.canceled || result.filePaths.length === 0) return [];
    return collectMediaFromPaths(result.filePaths);
  });

  handleTrustedIpc('dialog:openFolder', async () => {
    const result = await dialog.showOpenDialog({
      title: 'Open Media Folder in Sapira',
      properties: ['openDirectory'],
    });
    if (result.canceled || result.filePaths.length === 0) return [];
    return collectMediaFromPaths(result.filePaths);
  });

  handleTrustedIpc('media:inspectPaths', async (_event, paths: string[]) => {
    if (!Array.isArray(paths)) return [];
    const validPaths = paths.filter((p): p is string => typeof p === 'string' && p.length > 0);
    return collectMediaFromPaths(validPaths);
  });

  handleTrustedIpc('window:toggleFullscreen', () => {
    if (!mainWindow) return false;
    const next = !mainWindow.isFullScreen();
    mainWindow.setFullScreen(next);
    return next;
  });

  handleTrustedIpc('window:isFullscreen', () => {
    return mainWindow ? mainWindow.isFullScreen() : false;
  });

  handleTrustedIpc('window:toggleAlwaysOnTop', () => {
    if (!mainWindow) return false;
    const next = !mainWindow.isAlwaysOnTop();
    mainWindow.setAlwaysOnTop(next, 'floating');
    return next;
  });

  handleTrustedIpc('window:isAlwaysOnTop', () => {
    return mainWindow ? mainWindow.isAlwaysOnTop() : false;
  });

  handleTrustedIpc('window:isMiniMode', () => isMiniMode);

  handleTrustedIpc('window:toggleMiniMode', () => {
    if (!mainWindow) return false;
    if (!isMiniMode) {
      if (mainWindow.isFullScreen()) {
        mainWindow.setFullScreen(false);
      }
      savedNormalBounds = mainWindow.getBounds();
      savedAlwaysOnTopBeforeMini = mainWindow.isAlwaysOnTop();
      isMiniMode = true;
      mainWindow.setMinimumSize(360, 112);
      mainWindow.setBounds({
        x: savedNormalBounds.x,
        y: savedNormalBounds.y,
        width: 420,
        height: 126,
      }, true);
      mainWindow.setAlwaysOnTop(true, 'floating');
    } else {
      isMiniMode = false;
      mainWindow.setMinimumSize(720, 480);
      if (savedNormalBounds) {
        mainWindow.setBounds(savedNormalBounds, true);
      } else {
        mainWindow.setSize(1180, 740, true);
      }
      mainWindow.setAlwaysOnTop(savedAlwaysOnTopBeforeMini, 'floating');
    }
    return isMiniMode;
  });

  handleTrustedIpc('media:readAudioMetadata', async (_event, filePath: string) => {
    if (typeof filePath !== 'string' || !filePath) return {};
    const resolved = path.resolve(filePath);
    if (getMediaKind(resolved) !== 'audio') return {};
    return readAudioMetadata(resolved);
  });

  handleTrustedIpc('media:probe', async (_event, filePath: string) => {
    if (typeof filePath !== 'string' || !filePath || !getMediaKind(filePath)) {
      return {
        ffmpegAvailable: false,
        duration: 0,
        audioTracks: [],
        subtitleTracks: [],
        chapters: [],
        needsTranscode: false,
        canCopyVideo: false,
      };
    }
    return probeMediaFile(path.resolve(filePath));
  });

  handleTrustedIpc(
    'media:getTranscodeUrl',
    async (
      _event,
      params: {
        filePath: string;
        kind: 'video' | 'audio';
        startSeconds?: number;
        audioTrackIndex?: number;
        copyVideo?: boolean;
      }
    ) => {
      if (!params || typeof params.filePath !== 'string' || !params.filePath) return '';
      const remote = /^(https?|mux):\/\//i.test(params.filePath);
      if (remote && (!getFfmpegPath() || !isResolvedStream(params.filePath))) return '';
      if (!remote && !getMediaKind(params.filePath)) return '';
      return buildTranscodeStreamUrl({
        ...params,
        filePath: remote ? params.filePath : path.resolve(params.filePath),
      });
    }
  );

  handleTrustedIpc(
    'subtitle:extractEmbedded',
    async (_event, payload: { filePath: string; subTrackIndex: number }) => {
      if (!payload || typeof payload.filePath !== 'string' || !getMediaKind(payload.filePath)) {
        return null;
      }
      return extractEmbeddedSubtitle(path.resolve(payload.filePath), payload.subTrackIndex ?? 0);
    }
  );

  const readSubtitleSafe = (filePath: string) => {
    const ext = path.extname(filePath).toLowerCase();
    if (!SUBTITLE_EXTENSIONS.has(ext)) return null;
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      return {
        path: filePath,
        name: path.basename(filePath),
        content,
      };
    } catch {
      return null;
    }
  };

  handleTrustedIpc('dialog:openSubtitle', async () => {
    const result = await dialog.showOpenDialog({
      title: 'Load Subtitles',
      properties: ['openFile'],
      filters: [{ name: 'Subtitles', extensions: ['srt', 'vtt', 'ass', 'ssa', 'sub'] }],
    });
    if (result.canceled || result.filePaths.length === 0) return null;
    return readSubtitleSafe(result.filePaths[0]);
  });

  handleTrustedIpc('subtitle:readFile', async (_event, filePath: string) => {
    if (typeof filePath !== 'string') return null;
    return readSubtitleSafe(path.resolve(filePath));
  });

  handleTrustedIpc('subtitle:findForVideo', async (_event, videoPath: string) => {
    if (typeof videoPath !== 'string' || !videoPath) return null;
    try {
      const resolved = path.resolve(videoPath);
      const dir = path.dirname(resolved);
      const base = path.basename(resolved, path.extname(resolved)).toLowerCase();
      const entries = fs.readdirSync(dir);

      for (const ext of ['.srt', '.vtt', '.ass', '.ssa', '.sub']) {
        const exact = entries.find((e) => e.toLowerCase() === `${base}${ext}`);
        if (exact) return readSubtitleSafe(path.join(dir, exact));
      }

      const langMatch = entries.find((e) => {
        const lower = e.toLowerCase();
        return (
          lower.startsWith(`${base}.`) &&
          SUBTITLE_EXTENSIONS.has(path.extname(lower))
        );
      });
      if (langMatch) return readSubtitleSafe(path.join(dir, langMatch));
      return null;
    } catch {
      return null;
    }
  });

  const readLyricsSafe = (filePath: string) => {
    const ext = path.extname(filePath).toLowerCase();
    if (ext !== '.lrc' && ext !== '.txt') return null;
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      return {
        path: filePath,
        name: path.basename(filePath),
        content,
      };
    } catch {
      return null;
    }
  };

  handleTrustedIpc('dialog:openLyrics', async () => {
    const result = await dialog.showOpenDialog({
      title: 'Load Synchronized Lyrics (.lrc)',
      properties: ['openFile'],
      filters: [{ name: 'Lyrics', extensions: ['lrc', 'txt'] }],
    });
    if (result.canceled || result.filePaths.length === 0) return null;
    return readLyricsSafe(result.filePaths[0]);
  });

  handleTrustedIpc('lyrics:readFile', async (_event, filePath: string) => {
    if (typeof filePath !== 'string') return null;
    return readLyricsSafe(path.resolve(filePath));
  });

  handleTrustedIpc('lyrics:findForAudio', async (_event, audioPath: string) => {
    if (typeof audioPath !== 'string' || !audioPath) return null;
    try {
      const resolved = path.resolve(audioPath);
      const dir = path.dirname(resolved);
      const base = path.basename(resolved, path.extname(resolved)).toLowerCase();
      const entries = fs.readdirSync(dir);
      const match = entries.find((e) => e.toLowerCase() === `${base}.lrc`);
      return match ? readLyricsSafe(path.join(dir, match)) : null;
    } catch {
      return null;
    }
  });

  handleTrustedIpc(
    'media:saveScreenshot',
    async (
      _event,
      payload: { dataUrl: string; trackName: string; timestamp: string }
    ) => {
      try {
        if (
          !payload ||
          typeof payload.dataUrl !== 'string' ||
          !payload.dataUrl.startsWith('data:image/png;base64,') ||
          payload.dataUrl.length > 32 * 1024 * 1024
        ) {
          return { ok: false };
        }

        const base64 = payload.dataUrl.slice('data:image/png;base64,'.length);
        const buffer = Buffer.from(base64, 'base64');
        if (buffer.length === 0) return { ok: false };

        const outDir = path.resolve(app.getPath('pictures'), 'Sapira');
        fs.mkdirSync(outDir, { recursive: true });

        const safeName =
          (typeof payload.trackName === 'string' ? payload.trackName : 'frame')
            .replace(/[^a-zA-Z0-9._-]+/g, '_')
            .replace(/^\.+/, '')
            .slice(0, 48) || 'frame';
        const safeTs =
          (typeof payload.timestamp === 'string' ? payload.timestamp : '0-00')
            .replace(/:/g, '-')
            .replace(/[^a-zA-Z0-9._-]+/g, '_')
            .replace(/^\.+/, '')
            .slice(0, 24) || '0-00';
        const fileName = `Sapira_${safeName}_${safeTs}_${Date.now().toString(36)}.png`;
        const filePath = path.resolve(outDir, path.basename(fileName));

        const relative = path.relative(outDir, filePath);
        if (!relative || relative.startsWith('..') || path.isAbsolute(relative)) {
          throw new Error('Screenshot destination escaped Pictures/Sapira');
        }

        fs.writeFileSync(filePath, buffer);
        return { ok: true, filePath };
      } catch (error) {
        console.error('[screenshot] save failed:', error);
        return { ok: false };
      }
    }
  );

  handleTrustedIpc(
    'playlist:exportM3u',
    async (_event, payload: { name: string; paths: string[] }) => {
      try {
        if (!payload || !Array.isArray(payload.paths)) return { ok: false };
        const safeName = (payload.name || 'sapira-playlist').replace(/[^a-zA-Z0-9._ -]+/g, '_');
        const result = await dialog.showSaveDialog({
          title: 'Export Playlist (.m3u)',
          defaultPath: `${safeName}.m3u`,
          filters: [{ name: 'M3U Playlist', extensions: ['m3u'] }],
        });
        if (result.canceled || !result.filePath) return { ok: false };
        const cleanPaths = payload.paths.filter((p): p is string => typeof p === 'string' && p.length > 0);
        const lines = ['#EXTM3U', ...cleanPaths];
        fs.writeFileSync(result.filePath, `${lines.join('\n')}\n`, 'utf-8');
        return { ok: true, filePath: result.filePath };
      } catch {
        return { ok: false };
      }
    }
  );

  handleTrustedIpc('playlist:importM3u', async () => {
    try {
      const result = await dialog.showOpenDialog({
        title: 'Import Playlist (.m3u)',
        properties: ['openFile'],
        filters: [{ name: 'M3U Playlist', extensions: ['m3u', 'm3u8'] }],
      });
      if (result.canceled || result.filePaths.length === 0) return null;
      const m3uPath = result.filePaths[0];
      const baseDir = path.dirname(m3uPath);
      const raw = fs.readFileSync(m3uPath, 'utf-8');
      const filePaths = raw
        .split(/\r?\n/)
        .map((l) => l.trim())
        .filter((l) => l.length > 0 && !l.startsWith('#'))
        .map((entry) => (path.isAbsolute(entry) ? entry : path.resolve(baseDir, entry)));
      const items = collectMediaFromPaths(filePaths, 1);
      const name = path.basename(m3uPath, path.extname(m3uPath));
      return { name, items };
    } catch {
      return null;
    }
  });

  handleTrustedIpc('window:minimize', () => {
    mainWindow?.minimize();
  });

  handleTrustedIpc('window:maximize', () => {
    if (!mainWindow) return;
    if (mainWindow.isMaximized()) {
      mainWindow.unmaximize();
    } else {
      mainWindow.maximize();
    }
  });

  handleTrustedIpc('window:close', () => {
    mainWindow?.close();
  });

  handleTrustedIpc('clipboard:readText', () => {
    return clipboard.readText();
  });

  handleTrustedIpc('clipboard:writeText', (_event, text: string) => {
    clipboard.writeText(typeof text === 'string' ? text : '');
  });

  handleTrustedIpc('stream:checkYtDlp', () => {
    return Boolean(findYtDlpPath());
  });

  handleTrustedIpc(
    'stream:resolveExternal',
    async (_event, payload: { url: string; preferAudio?: boolean }) => {
      if (!payload || typeof payload.url !== 'string') {
        return { ok: false, error: 'Invalid URL' };
      }
      const result = await resolveExternalStream(payload.url, Boolean(payload.preferAudio));
      if (result.ok && result.streamUrl) registerResolvedStream(result.streamUrl);
      return result;
    }
  );
}

function setupApplicationMenu() {
  const isMac = process.platform === 'darwin';
  const template: Electron.MenuItemConstructorOptions[] = [
    ...(isMac ? [{ role: 'appMenu' as const }] : []),
    { role: 'editMenu' as const },
    { role: 'viewMenu' as const },
    { role: 'windowMenu' as const },
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

function extractMediaPathsFromArgv(argv: string[]): string[] {
  return argv
    .slice(1)
    .filter((arg) => !arg.startsWith('-') && getMediaKind(arg) !== null);
}

const gotSingleInstanceLock = app.requestSingleInstanceLock();
if (!gotSingleInstanceLock) {
  app.quit();
} else {
  app.on('second-instance', (_event, argv) => {
    const cliPaths = extractMediaPathsFromArgv(argv);
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
      if (cliPaths.length > 0) {
        const items = collectMediaFromPaths(cliPaths);
        if (items.length > 0) {
          mainWindow.webContents.send('media:openFiles', items);
        }
      }
    }
  });
}

app.on('open-file', (event, filePath) => {
  event.preventDefault();
  if (mainWindow && mainWindow.webContents) {
    const items = collectMediaFromPaths([filePath]);
    if (items.length > 0) {
      mainWindow.webContents.send('media:openFiles', items);
    }
  } else {
    pendingOpenPaths.push(filePath);
  }
});

app.whenReady().then(() => {
  if (!gotSingleInstanceLock) return;
  const initialCliPaths = extractMediaPathsFromArgv(process.argv);
  if (initialCliPaths.length > 0) {
    pendingOpenPaths.push(...initialCliPaths);
  }

  // Ensure YouTube CDN (googlevideo.com) requests from file:// receive expected Referer/Origin headers
  session.defaultSession.webRequest.onBeforeSendHeaders(
    { urls: ['*://*.googlevideo.com/*'] },
    (details, callback) => {
      const requestHeaders = { ...details.requestHeaders };
      if (!requestHeaders.Referer && !requestHeaders.referer) {
        requestHeaders.Referer = 'https://www.youtube.com/';
      }
      if (!requestHeaders.Origin && !requestHeaders.origin) {
        requestHeaders.Origin = 'https://www.youtube.com';
      }
      callback({ requestHeaders });
    }
  );

  setupApplicationMenu();
  registerMediaProtocol();
  registerIpcHandlers();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('before-quit', () => {
  stopTranscodeEngine();
});

app.on('window-all-closed', () => {
  stopTranscodeEngine();
  app.quit();
});
