// LANamp's library: finds MP3 files on the visitor's own drive and turns them into playlist tracks.
// Everything stays in the browser. Files are read in place and played from blob: URLs; nothing is uploaded.
// The tag parsing and file naming are DOM-free so tools/music.test.mjs can check them.

const SKIP_DIRS = /^(\.|\$recycle\.bin$|system volume information$|node_modules$)/i;
const MAX_TAG = 1 << 20; // read at most 1 MB of ID3 tag; cover art after the text frames is ignored
const MAX_TEXT = 120;

export const isMp3 = (name) => /\.mp3$/i.test(name);

/* ---------- ID3 tags ---------- */
const syncsafe = (b, o) => ((b[o] & 0x7f) << 21) | ((b[o + 1] & 0x7f) << 14) | ((b[o + 2] & 0x7f) << 7) | (b[o + 3] & 0x7f);
const be32 = (b, o) => ((b[o] << 24) | (b[o + 1] << 16) | (b[o + 2] << 8) | b[o + 3]) >>> 0;
const tidy = (s) => s.replace(/\0+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, MAX_TEXT);

function decodeText(b) { // b[0] is the encoding byte
  const enc = b[0];
  let body = b.subarray(1), label = 'windows-1252';
  if (enc === 1 || enc === 2) {
    label = enc === 2 ? 'utf-16be' : 'utf-16le';
    if (body[0] === 0xff && body[1] === 0xfe) { label = 'utf-16le'; body = body.subarray(2); }
    else if (body[0] === 0xfe && body[1] === 0xff) { label = 'utf-16be'; body = body.subarray(2); }
  } else if (enc === 3) label = 'utf-8';
  const parts = new TextDecoder(label).decode(body).split('\0').map((p) => p.trim()).filter(Boolean);
  return tidy(parts.join(' / '));
}

// Undo ID3 "unsynchronisation": every FF 00 pair stands for a single FF.
function unsync(b) {
  const out = new Uint8Array(b.length);
  let n = 0;
  for (let i = 0; i < b.length; i++) { out[n++] = b[i]; if (b[i] === 0xff && b[i + 1] === 0x00) i++; }
  return out.subarray(0, n);
}

const FRAMES = { TIT2: 'title', TPE1: 'artist', TALB: 'album', TT2: 'title', TP1: 'artist', TAL: 'album' };

// bytes: the start of an MP3 file. Returns { title, artist, album } with whatever an ID3v2 tag holds.
export function parseId3(bytes) {
  const tags = {};
  if (bytes.length < 10 || bytes[0] !== 0x49 || bytes[1] !== 0x44 || bytes[2] !== 0x33) return tags;
  const ver = bytes[3], flags = bytes[5];
  if (ver < 2 || ver > 4) return tags;
  const end = Math.min(bytes.length, 10 + syncsafe(bytes, 6));
  let tag = bytes.subarray(10, end);
  if (flags & 0x80 && ver < 4) tag = unsync(tag);
  let o = 0;
  if (flags & 0x40 && ver >= 3 && tag.length >= 4) o = ver === 4 ? syncsafe(tag, 0) : be32(tag, 0) + 4; // skip the extended header
  const idLen = ver === 2 ? 3 : 4, head = ver === 2 ? 6 : 10;
  while (o + head <= tag.length && tag[o] !== 0) {
    const id = String.fromCharCode(...tag.subarray(o, o + idLen));
    const size = ver === 2 ? (tag[o + 3] << 16) | (tag[o + 4] << 8) | tag[o + 5] : ver === 4 ? syncsafe(tag, o + 4) : be32(tag, o + 4);
    const f1 = ver === 2 ? 0 : tag[o + 8], f2 = ver === 2 ? 0 : tag[o + 9];
    const start = o + head;
    if (size <= 0 || start + size > tag.length) break; // truncated by the read limit
    const key = FRAMES[id];
    const packed = ver === 3 ? f1 & 0xc0 : f2 & 0x0c; // compressed or encrypted frames are skipped
    if (key && !tags[key] && !packed) {
      const skip = ver === 4 && f2 & 0x01 ? 4 : 0; // data length indicator
      const text = decodeText(tag.subarray(start + skip, start + size));
      if (text) tags[key] = text;
    }
    o = start + size;
  }
  return tags;
}

// bytes: the last 128 bytes of an MP3 file (the old ID3v1 trailer).
export function parseId3v1(bytes) {
  if (bytes.length < 128 || bytes[0] !== 0x54 || bytes[1] !== 0x41 || bytes[2] !== 0x47) return {};
  const text = (a, b) => tidy(new TextDecoder('windows-1252').decode(bytes.subarray(a, b)));
  const tags = { title: text(3, 33), artist: text(33, 63), album: text(63, 93) };
  for (const k of Object.keys(tags)) if (!tags[k]) delete tags[k];
  return tags;
}

export async function readTags(file) {
  const head = new Uint8Array(await file.slice(0, 10).arrayBuffer());
  let tags = {};
  if (head[0] === 0x49 && head[1] === 0x44 && head[2] === 0x33) {
    const size = 10 + syncsafe(head, 6);
    tags = parseId3(new Uint8Array(await file.slice(0, Math.min(size, MAX_TAG)).arrayBuffer()));
  }
  if (!tags.title && file.size > 128) tags = { ...parseId3v1(new Uint8Array(await file.slice(file.size - 128).arrayBuffer())), ...tags };
  return tags;
}

/* ---------- tracks ---------- */
// What a file with no tags is called: "03 - Artist - Song_Name.mp3" becomes Artist / Song Name.
export function nameTags(path) {
  const base = path.split('/').pop().replace(/\.mp3$/i, '').replace(/_/g, ' ').replace(/^\d{1,3}\s*[-._)]\s*/, '').trim() || 'Untitled';
  const parts = base.split(/\s+-\s+/);
  return parts.length > 1 ? { artist: tidy(parts[0]), title: tidy(parts.slice(1).join(' - ')) } : { artist: '', title: tidy(base) };
}

export const fileKey = (path, size) => `${path}|${size}`;

// A playlist track for a file. Same shape as the synthesised tape (see music.js), plus the file itself.
export function makeTrack({ file, path }) {
  return { ...nameTags(path), album: '', genre: 'mp3', kind: 'file', bpm: 120, seconds: null, trim: 1, file, path, key: fileKey(path, file.size) };
}

export const byPath = (a, b) => a.path.localeCompare(b.path, undefined, { numeric: true, sensitivity: 'base' });

// Read the tags of many tracks a few at a time, so a big library fills in without freezing the page.
export async function readAllTags(tracks, { onTick = () => {}, isStale = () => false, pool = 6 } = {}) {
  let next = 0, done = 0;
  const worker = async () => {
    while (next < tracks.length && !isStale()) {
      const t = tracks[next++];
      try {
        const tags = await readTags(t.file);
        if (tags.title) t.title = tags.title;
        if (tags.artist) t.artist = tags.artist;
        if (tags.album) t.album = tags.album;
      } catch { /* an unreadable file keeps its file name */ }
      t.tagged = true;
      if (++done % 25 === 0) onTick(done, false);
    }
  };
  await Promise.all(Array.from({ length: pool }, worker));
  onTick(done, true);
}

/* ---------- finding the files ---------- */
// A directory picked with showDirectoryPicker(): every .mp3 below it. Folders we may not open are skipped.
export async function walkDirectory(dir, found, path = `${dir.name}/`) {
  try {
    for await (const entry of dir.values()) {
      if (entry.kind === 'directory') {
        if (!SKIP_DIRS.test(entry.name)) await walkDirectory(entry, found, `${path}${entry.name}/`);
      } else if (isMp3(entry.name)) {
        try { found.push({ file: await entry.getFile(), path: `${path}${entry.name}` }); } catch { /* vanished or locked */ }
      }
    }
  } catch { /* not allowed to read this folder */ }
  return found;
}

// The files from an <input type="file" webkitdirectory multiple>.
export function fromFileList(list) {
  return [...list].filter((f) => isMp3(f.name)).map((file) => ({ file, path: file.webkitRelativePath || file.name }));
}

// Things dropped on the window. Entries must be collected during the drop event; reading them can wait.
export function dropEntries(dataTransfer) {
  const out = [];
  for (const item of Array.from(dataTransfer.items ?? [])) {
    const entry = item.webkitGetAsEntry?.();
    if (entry) out.push(entry); else if (item.kind === 'file') { const f = item.getAsFile(); if (f) out.push(f); }
  }
  return out;
}

const readBatch = (reader) => new Promise((ok, no) => reader.readEntries(ok, no));
export async function walkEntry(entry, found, path = '') {
  if (entry instanceof File) { if (isMp3(entry.name)) found.push({ file: entry, path: entry.name }); return found; }
  try {
    if (entry.isFile) {
      if (isMp3(entry.name)) found.push({ file: await new Promise((ok, no) => entry.file(ok, no)), path: `${path}${entry.name}` });
    } else if (entry.isDirectory && !SKIP_DIRS.test(entry.name)) {
      const reader = entry.createReader();
      for (let batch = await readBatch(reader); batch.length; batch = await readBatch(reader)) {
        for (const child of batch) await walkEntry(child, found, `${path}${entry.name}/`);
      }
    }
  } catch { /* skip what can't be read */ }
  return found;
}

/* ---------- remembering the folders (Chrome and Edge only) ---------- */
// A directory handle can be kept in IndexedDB. Next visit the browser asks once before it lets the page read it again.
const DB = 'lanparty98', STORE = 'lanamp';
const open = () => new Promise((ok, no) => {
  const req = indexedDB.open(DB, 1);
  req.onupgradeneeded = () => req.result.createObjectStore(STORE);
  req.onsuccess = () => ok(req.result);
  req.onerror = () => no(req.error);
});
const run = async (mode, fn) => {
  const db = await open();
  return new Promise((ok, no) => {
    const tx = db.transaction(STORE, mode);
    const req = fn(tx.objectStore(STORE));
    tx.oncomplete = () => { db.close(); ok(req?.result); };
    tx.onerror = tx.onabort = () => { db.close(); no(tx.error); };
  });
};
export const savedFolders = () => run('readonly', (s) => s.get('folders')).then((v) => v ?? []).catch(() => []);
export const saveFolders = (handles) => run('readwrite', (s) => s.put(handles, 'folders')).catch(() => {});
export const forgetFolders = () => run('readwrite', (s) => s.delete('folders')).catch(() => {});
