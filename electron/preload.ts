import { contextBridge, ipcRenderer, webUtils } from 'electron';

export interface ScannedMediaFile {
  path: string;
  name: string;
  ext: string;
  kind: 'video' | 'audio';
  size: number;
}

export interface AudioMetadata {
  title?: string;
  artist?: string;
  album?: string;
  year?: string;
  coverDataUrl?: string;
}

export interface SubtitleFilePayload {
  path: string;
  name: string;
  content: string;
}

const sapiraApi = {
  platform: process.platform,
  openFiles: (): Promise<ScannedMediaFile[]> => ipcRenderer.invoke('dialog:openFiles'),
  openFolder: (): Promise<ScannedMediaFile[]> => ipcRenderer.invoke('dialog:openFolder'),
  inspectPaths: (paths: string[]): Promise<ScannedMediaFile[]> =>
    ipcRenderer.invoke('media:inspectPaths', paths),
  getPathForFile: (file: File): string => {
    try {
      return webUtils.getPathForFile(file);
    } catch {
      return '';
    }
  },
  toMediaUrl: (filePath: string): string =>
    `sapira-media://local/?path=${encodeURIComponent(filePath)}`,
  probeMedia: (filePath: string) => ipcRenderer.invoke('media:probe', filePath),
  getTranscodeUrl: (params: {
    filePath: string;
    kind: 'video' | 'audio';
    startSeconds?: number;
    audioTrackIndex?: number;
    copyVideo?: boolean;
  }): Promise<string> => ipcRenderer.invoke('media:getTranscodeUrl', params),
  extractEmbeddedSubtitle: (
    filePath: string,
    subTrackIndex: number
  ): Promise<string | null> =>
    ipcRenderer.invoke('subtitle:extractEmbedded', { filePath, subTrackIndex }),
  toggleFullscreen: (): Promise<boolean> => ipcRenderer.invoke('window:toggleFullscreen'),
  isFullscreen: (): Promise<boolean> => ipcRenderer.invoke('window:isFullscreen'),
  toggleAlwaysOnTop: (): Promise<boolean> => ipcRenderer.invoke('window:toggleAlwaysOnTop'),
  isAlwaysOnTop: (): Promise<boolean> => ipcRenderer.invoke('window:isAlwaysOnTop'),
  toggleMiniMode: (): Promise<boolean> => ipcRenderer.invoke('window:toggleMiniMode'),
  isMiniMode: (): Promise<boolean> => ipcRenderer.invoke('window:isMiniMode'),
  readAudioMetadata: (filePath: string): Promise<AudioMetadata> =>
    ipcRenderer.invoke('media:readAudioMetadata', filePath),
  openSubtitle: (): Promise<SubtitleFilePayload | null> =>
    ipcRenderer.invoke('dialog:openSubtitle'),
  findSubtitleForVideo: (videoPath: string): Promise<SubtitleFilePayload | null> =>
    ipcRenderer.invoke('subtitle:findForVideo', videoPath),
  readSubtitleFile: (filePath: string): Promise<SubtitleFilePayload | null> =>
    ipcRenderer.invoke('subtitle:readFile', filePath),
  openLyrics: (): Promise<SubtitleFilePayload | null> =>
    ipcRenderer.invoke('dialog:openLyrics'),
  findLyricsForAudio: (audioPath: string): Promise<SubtitleFilePayload | null> =>
    ipcRenderer.invoke('lyrics:findForAudio', audioPath),
  readLyricsFile: (filePath: string): Promise<SubtitleFilePayload | null> =>
    ipcRenderer.invoke('lyrics:readFile', filePath),
  saveScreenshot: (payload: {
    dataUrl: string;
    trackName: string;
    timestamp: string;
  }): Promise<{ ok: boolean; filePath?: string }> =>
    ipcRenderer.invoke('media:saveScreenshot', payload),
  exportM3u: (payload: {
    name: string;
    paths: string[];
  }): Promise<{ ok: boolean; filePath?: string }> =>
    ipcRenderer.invoke('playlist:exportM3u', payload),
  importM3u: (): Promise<{ name: string; items: ScannedMediaFile[] } | null> =>
    ipcRenderer.invoke('playlist:importM3u'),
  minimize: (): Promise<void> => ipcRenderer.invoke('window:minimize'),
  maximize: (): Promise<void> => ipcRenderer.invoke('window:maximize'),
  close: (): Promise<void> => ipcRenderer.invoke('window:close'),
  clipboardReadText: (): Promise<string> => ipcRenderer.invoke('clipboard:readText'),
  clipboardWriteText: (text: string): Promise<void> =>
    ipcRenderer.invoke('clipboard:writeText', text),
  checkYtDlp: (): Promise<boolean> => ipcRenderer.invoke('stream:checkYtDlp'),
  resolveExternalStream: (url: string, preferAudio?: boolean) =>
    ipcRenderer.invoke('stream:resolveExternal', { url, preferAudio }),
  onFullscreenChange: (callback: (isFullscreen: boolean) => void) => {
    const listener = (_event: Electron.IpcRendererEvent, value: boolean) => callback(value);
    ipcRenderer.on('window:fullscreenChanged', listener);
    return () => {
      ipcRenderer.removeListener('window:fullscreenChanged', listener);
    };
  },
  onOpenFiles: (callback: (items: ScannedMediaFile[]) => void) => {
    const listener = (_event: Electron.IpcRendererEvent, items: ScannedMediaFile[]) =>
      callback(items);
    ipcRenderer.on('media:openFiles', listener);
    return () => {
      ipcRenderer.removeListener('media:openFiles', listener);
    };
  },
};

contextBridge.exposeInMainWorld('sapira', sapiraApi);
