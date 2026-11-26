import fs from 'node:fs';
import path from 'node:path';

export interface AudioMetadata {
  title?: string;
  artist?: string;
  album?: string;
  year?: string;
  coverDataUrl?: string;
}

function decodeTextFrame(buf: Buffer): string {
  if (buf.length === 0) return '';
  const encoding = buf[0];
  const payload = buf.subarray(1);
  let text = '';
  if (encoding === 0) {
    text = payload.toString('latin1');
  } else if (encoding === 1) {
    // UTF-16 with BOM
    if (payload.length >= 2 && payload[0] === 0xfe && payload[1] === 0xff) {
      // UTF-16BE -> swap bytes to LE
      const swapped = Buffer.alloc(payload.length - 2);
      for (let i = 2; i + 1 < payload.length; i += 2) {
        swapped[i - 2] = payload[i + 1];
        swapped[i - 1] = payload[i];
      }
      text = swapped.toString('utf16le');
    } else if (payload.length >= 2 && payload[0] === 0xff && payload[1] === 0xfe) {
      text = payload.subarray(2).toString('utf16le');
    } else {
      text = payload.toString('utf16le');
    }
  } else if (encoding === 2) {
    const swapped = Buffer.alloc(payload.length);
    for (let i = 0; i + 1 < payload.length; i += 2) {
      swapped[i] = payload[i + 1];
      swapped[i + 1] = payload[i];
    }
    text = swapped.toString('utf16le');
  } else {
    text = payload.toString('utf8');
  }
  return text.replace(/\0+$/g, '').trim();
}

function readSynchsafeInt(buf: Buffer, offset: number): number {
  return (
    ((buf[offset] & 0x7f) << 21) |
    ((buf[offset + 1] & 0x7f) << 14) |
    ((buf[offset + 2] & 0x7f) << 7) |
    (buf[offset + 3] & 0x7f)
  );
}

function parseId3v2(fd: number, fileSize: number): AudioMetadata | null {
  const header = Buffer.alloc(10);
  if (fs.readSync(fd, header, 0, 10, 0) < 10) return null;
  if (header.toString('ascii', 0, 3) !== 'ID3') return null;

  const majorVersion = header[3];
  const tagSize = readSynchsafeInt(header, 6);
  const readSize = Math.min(tagSize, fileSize - 10, 8 * 1024 * 1024);
  if (readSize <= 0) return null;

  const data = Buffer.alloc(readSize);
  fs.readSync(fd, data, 0, readSize, 10);

  const meta: AudioMetadata = {};
  let offset = 0;

  while (offset + 10 <= data.length) {
    const frameId = data.toString('ascii', offset, offset + 4);
    if (!/^[A-Z0-9]{4}$/.test(frameId)) break;

    const frameSize =
      majorVersion === 4
        ? readSynchsafeInt(data, offset + 4)
        : data.readUInt32BE(offset + 4);
    if (frameSize <= 0 || offset + 10 + frameSize > data.length) break;

    const payload = data.subarray(offset + 10, offset + 10 + frameSize);
    offset += 10 + frameSize;

    if (frameId === 'TIT2' && !meta.title) {
      meta.title = decodeTextFrame(payload);
    } else if (frameId === 'TPE1' && !meta.artist) {
      meta.artist = decodeTextFrame(payload);
    } else if (frameId === 'TALB' && !meta.album) {
      meta.album = decodeTextFrame(payload);
    } else if ((frameId === 'TYER' || frameId === 'TDRC') && !meta.year) {
      meta.year = decodeTextFrame(payload).slice(0, 4);
    } else if (frameId === 'APIC' && !meta.coverDataUrl && payload.length > 16) {
      const encoding = payload[0];
      const mimeEnd = payload.indexOf(0, 1);
      if (mimeEnd > 1) {
        let mime = payload.toString('latin1', 1, mimeEnd) || 'image/jpeg';
        if (mime === 'jpg') mime = 'image/jpeg';
        if (!mime.startsWith('image/')) mime = 'image/jpeg';
        const descStart = mimeEnd + 2; // skip null + picture type byte
        let imgStart = descStart;
        if (encoding === 1 || encoding === 2) {
          for (let i = descStart; i + 1 < payload.length; i += 2) {
            if (payload[i] === 0 && payload[i + 1] === 0) {
              imgStart = i + 2;
              break;
            }
          }
        } else {
          const descEnd = payload.indexOf(0, descStart);
          if (descEnd !== -1) imgStart = descEnd + 1;
        }
        if (imgStart < payload.length && payload.length - imgStart <= 4 * 1024 * 1024) {
          const imgBuf = payload.subarray(imgStart);
          meta.coverDataUrl = `data:${mime};base64,${imgBuf.toString('base64')}`;
        }
      }
    }
  }

  return meta;
}

function parseFlac(fd: number, fileSize: number): AudioMetadata | null {
  const sig = Buffer.alloc(4);
  if (fs.readSync(fd, sig, 0, 4, 0) < 4) return null;
  if (sig.toString('ascii') !== 'fLaC') return null;

  const meta: AudioMetadata = {};
  let pos = 4;
  const blockHeader = Buffer.alloc(4);

  while (pos + 4 <= fileSize) {
    if (fs.readSync(fd, blockHeader, 0, 4, pos) < 4) break;
    pos += 4;

    const isLast = (blockHeader[0] & 0x80) !== 0;
    const blockType = blockHeader[0] & 0x7f;
    const blockLen = (blockHeader[1] << 16) | (blockHeader[2] << 8) | blockHeader[3];
    if (blockLen < 0 || pos + blockLen > fileSize) break;

    if (blockType === 4 && blockLen <= 512 * 1024) {
      // VORBIS_COMMENT
      const buf = Buffer.alloc(blockLen);
      fs.readSync(fd, buf, 0, blockLen, pos);
      let cur = 0;
      if (cur + 4 <= buf.length) {
        const vendorLen = buf.readUInt32LE(cur);
        cur += 4 + vendorLen;
        if (cur + 4 <= buf.length) {
          const count = buf.readUInt32LE(cur);
          cur += 4;
          for (let i = 0; i < count && cur + 4 <= buf.length; i++) {
            const len = buf.readUInt32LE(cur);
            cur += 4;
            if (cur + len > buf.length) break;
            const entry = buf.toString('utf8', cur, cur + len);
            cur += len;
            const eq = entry.indexOf('=');
            if (eq === -1) continue;
            const key = entry.slice(0, eq).toUpperCase();
            const val = entry.slice(eq + 1).trim();
            if (key === 'TITLE' && !meta.title) meta.title = val;
            else if (key === 'ARTIST' && !meta.artist) meta.artist = val;
            else if (key === 'ALBUM' && !meta.album) meta.album = val;
            else if ((key === 'DATE' || key === 'YEAR') && !meta.year) meta.year = val.slice(0, 4);
          }
        }
      }
    } else if (blockType === 6 && !meta.coverDataUrl && blockLen <= 4 * 1024 * 1024) {
      // PICTURE
      const buf = Buffer.alloc(blockLen);
      fs.readSync(fd, buf, 0, blockLen, pos);
      let cur = 4; // skip picture type
      if (cur + 4 <= buf.length) {
        const mimeLen = buf.readUInt32BE(cur);
        cur += 4;
        const mime = buf.toString('ascii', cur, cur + mimeLen) || 'image/jpeg';
        cur += mimeLen;
        if (cur + 4 <= buf.length) {
          const descLen = buf.readUInt32BE(cur);
          cur += 4 + descLen + 16; // skip width, height, depth, colors
          if (cur + 4 <= buf.length) {
            const imgLen = buf.readUInt32BE(cur);
            cur += 4;
            if (cur + imgLen <= buf.length) {
              const imgBuf = buf.subarray(cur, cur + imgLen);
              meta.coverDataUrl = `data:${mime};base64,${imgBuf.toString('base64')}`;
            }
          }
        }
      }
    }

    pos += blockLen;
    if (isLast) break;
  }

  return meta;
}

function findMp4Atom(
  buf: Buffer,
  start: number,
  end: number,
  target: string
): { start: number; end: number } | null {
  let pos = start;
  while (pos + 8 <= end) {
    const size = buf.readUInt32BE(pos);
    const type = buf.toString('ascii', pos + 4, pos + 8);
    if (size < 8 || pos + size > end) break;
    if (type === target) {
      return { start: pos + 8, end: pos + size };
    }
    pos += size;
  }
  return null;
}

function parseMp4(fd: number, fileSize: number): AudioMetadata | null {
  const maxScan = Math.min(fileSize, 6 * 1024 * 1024);
  const buf = Buffer.alloc(maxScan);
  fs.readSync(fd, buf, 0, maxScan, 0);

  const moov = findMp4Atom(buf, 0, maxScan, 'moov');
  if (!moov) return null;
  const udta = findMp4Atom(buf, moov.start, moov.end, 'udta');
  if (!udta) return null;
  const metaAtom = findMp4Atom(buf, udta.start, udta.end, 'meta');
  if (!metaAtom || metaAtom.start + 4 > metaAtom.end) return null;
  // meta is a FullBox (4 bytes version/flags)
  const ilst = findMp4Atom(buf, metaAtom.start + 4, metaAtom.end, 'ilst');
  if (!ilst) return null;

  const meta: AudioMetadata = {};
  let pos = ilst.start;

  while (pos + 8 <= ilst.end) {
    const size = buf.readUInt32BE(pos);
    const type = buf.toString('latin1', pos + 4, pos + 8);
    if (size < 8 || pos + size > ilst.end) break;

    const dataAtom = findMp4Atom(buf, pos + 8, pos + size, 'data');
    if (dataAtom && dataAtom.start + 8 <= dataAtom.end) {
      const dataType = buf.readUInt32BE(dataAtom.start);
      const payload = buf.subarray(dataAtom.start + 8, dataAtom.end);
      if (type === '\xa9nam' && !meta.title) {
        meta.title = payload.toString('utf8').trim();
      } else if (type === '\xa9ART' && !meta.artist) {
        meta.artist = payload.toString('utf8').trim();
      } else if (type === '\xa9alb' && !meta.album) {
        meta.album = payload.toString('utf8').trim();
      } else if (type === '\xa9day' && !meta.year) {
        meta.year = payload.toString('utf8').trim().slice(0, 4);
      } else if (type === 'covr' && !meta.coverDataUrl && payload.length <= 4 * 1024 * 1024) {
        const mime = dataType === 14 ? 'image/png' : 'image/jpeg';
        meta.coverDataUrl = `data:${mime};base64,${payload.toString('base64')}`;
      }
    }
    pos += size;
  }

  return meta;
}

function findFolderCover(filePath: string): string | undefined {
  try {
    const dir = path.dirname(filePath);
    const candidates = ['cover.jpg', 'cover.png', 'folder.jpg', 'folder.png', 'artwork.jpg', 'front.jpg'];
    const entries = fs.readdirSync(dir);
    for (const candidate of candidates) {
      const match = entries.find((e) => e.toLowerCase() === candidate);
      if (match) {
        const full = path.join(dir, match);
        const stat = fs.statSync(full);
        if (stat.isFile() && stat.size <= 3 * 1024 * 1024) {
          const mime = match.toLowerCase().endsWith('.png') ? 'image/png' : 'image/jpeg';
          return `data:${mime};base64,${fs.readFileSync(full).toString('base64')}`;
        }
      }
    }
  } catch {
    // Ignore folder read failures
  }
  return undefined;
}

export function readAudioMetadata(filePath: string): AudioMetadata {
  const resolved = path.resolve(filePath);
  const ext = path.extname(resolved).toLowerCase();
  let meta: AudioMetadata = {};

  let fd: number | null = null;
  try {
    const stat = fs.statSync(resolved);
    if (!stat.isFile()) return {};
    fd = fs.openSync(resolved, 'r');

    if (ext === '.mp3' || ext === '.aiff') {
      meta = parseId3v2(fd, stat.size) ?? {};
    } else if (ext === '.flac') {
      meta = parseFlac(fd, stat.size) ?? {};
    } else if (ext === '.m4a' || ext === '.mp4') {
      meta = parseMp4(fd, stat.size) ?? {};
    } else {
      // Try ID3v2 as fallback
      meta = parseId3v2(fd, stat.size) ?? {};
    }
  } catch {
    meta = {};
  } finally {
    if (fd !== null) {
      try {
        fs.closeSync(fd);
      } catch {
        // Ignore
      }
    }
  }

  if (!meta.coverDataUrl) {
    meta.coverDataUrl = findFolderCover(resolved);
  }

  return meta;
}
