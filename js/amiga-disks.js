// The disk box for the Amiga (js/amiga.js): finding the player's own disk images on their drive, remembering the
// folders, and packing what is in the drives into the one file the emulator is started with.
// Nothing is bundled but the two house floppies, and nothing is uploaded: files are read in place by the browser and
// only handed to the emulator when the machine is powered on. The matching, walking and packing are DOM-free so
// tools/amiga-disks.test.mjs can check them; only the IndexedDB part needs a browser.
import { makeZip } from './zip.js';

/* ---------- what we recognise ---------- */
export const KINDS = {
  floppy: { ext: /\.(adf|adz|dms)$/i, max: 4 * 1048576, label: 'Floppy' },
  hd: { ext: /\.(hdf|hdz)$/i, max: 256 * 1048576, label: 'Hard disk' },
  cd: { ext: /\.(iso|chd)$/i, max: 700 * 1048576, label: 'CD' },
};
const SKIP_DIRS = /^(\.|\$recycle\.bin$|system volume information$|node_modules$)/i;

export function kindOf(name) {
  for (const [kind, k] of Object.entries(KINDS)) if (k.ext.test(name)) return kind;
  return null;
}

// "Workbench 3.1 (Disk 1 of 2) [a].adf" -> "Workbench 3.1 (Disk 1 of 2) [a]"
export const labelOf = (name) => name.replace(/\.[^.]+$/, '').replace(/[_]+/g, ' ').trim() || name;

const diskId = (path, size) => `${path}|${size}`;

// A disk for the box: the File stays with it until the machine is powered on.
export function makeDisk({ file, path }) {
  const name = path.split('/').pop();
  return { id: diskId(path, file.size), name, label: labelOf(name), path, size: file.size, kind: kindOf(name), file };
}

// The two that came with the machine. They are fetched when they are first used.
export const HOUSE_DISKS = [
  { id: 'house:lanparty', name: 'lanparty-amiga.adf', label: 'LANPARTY', path: 'bundles/lanparty-amiga.adf', size: 901120, kind: 'floppy', url: new URL('../bundles/lanparty-amiga.adf', import.meta.url).href },
  { id: 'house:dazza', name: 'dazza-disk.adf', label: "DAZZA'S DISK", path: 'bundles/dazza-disk.adf', size: 901120, kind: 'floppy', url: new URL('../bundles/dazza-disk.adf', import.meta.url).href },
];

// Add `more` to `have`, once each, and return the new list.
export function mergeDisks(have, more) {
  const seen = new Set(have.map((d) => d.id));
  const out = [...have];
  for (const d of more) if (!seen.has(d.id)) { seen.add(d.id); out.push(d); }
  return out;
}

const usable = (name, file) => { const k = kindOf(name); return !!k && file.size > 0 && file.size <= KINDS[k].max; };

/* ---------- finding the files ---------- */
// A directory picked with showDirectoryPicker(): every disk image below it. Folders we may not open are skipped.
export async function walkDirectory(dir, found = [], path = `${dir.name}/`) {
  try {
    for await (const entry of dir.values()) {
      if (entry.kind === 'directory') {
        if (!SKIP_DIRS.test(entry.name)) await walkDirectory(entry, found, `${path}${entry.name}/`);
      } else if (kindOf(entry.name)) {
        try {
          const file = await entry.getFile();
          if (usable(entry.name, file)) found.push({ file, path: `${path}${entry.name}` });
        } catch { /* vanished or locked */ }
      }
    }
  } catch { /* not allowed to read this folder */ }
  return found;
}

// The files from an <input type="file"> (a folder picked with webkitdirectory, or loose files).
export function fromFileList(list) {
  return [...list].filter((f) => usable(f.name, f)).map((file) => ({ file, path: file.webkitRelativePath || file.name }));
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
export async function walkEntry(entry, found = [], path = '') {
  if (typeof File !== 'undefined' && entry instanceof File) {
    if (usable(entry.name, entry)) found.push({ file: entry, path: entry.name });
    return found;
  }
  try {
    if (entry.isFile) {
      if (kindOf(entry.name)) {
        const file = await new Promise((ok, no) => entry.file(ok, no));
        if (usable(entry.name, file)) found.push({ file, path: `${path}${entry.name}` });
      }
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
const DB = 'lanparty98-amiga', STORE = 'folders';
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

// Read the disk images under each remembered folder. `ask` lets the browser show its permission prompt (it needs a
// click to do that); without it, only folders that are already allowed are read.
export async function scanFolders(handles, { ask = false } = {}) {
  const found = [];
  let read = 0;
  for (const h of handles) {
    try {
      let ok = (await h.queryPermission?.({ mode: 'read' })) === 'granted';
      if (!ok && ask) ok = (await h.requestPermission?.({ mode: 'read' })) === 'granted';
      if (!ok) continue;
      await walkDirectory(h, found);
      read++;
    } catch { /* the folder is gone */ }
  }
  return { found, read };
}

/* ---------- the machine ---------- */
// puae: the core's model name. cases: how the box on the desk looks (js/room.js amigaSetup).
export const MODELS = {
  A500: { label: 'Amiga 500', puae: 'A500', drives: 'DF0 is in the case' },
  A1200: { label: 'Amiga 1200', puae: 'A1200', drives: 'DF0 is in the case' },
  A2000: { label: 'Amiga 2000', puae: 'A2000', drives: 'DF0 is in the case' },
};
// the coloured packs: a disk keeps its colour wherever it is (the 3D desk uses the hex, the panel the token)
export const FLOPPY_COLOURS = [
  { token: '--floppy-black', hex: 0x1c1c1f }, { token: '--floppy-blue', hex: 0x2b6fd6 }, { token: '--floppy-red', hex: 0xc0392b },
  { token: '--floppy-yellow', hex: 0xe8c21b }, { token: '--floppy-green', hex: 0x3aa35a }, { token: '--floppy-grey', hex: 0x8a8d92 },
];
export const floppyIndex = (id) => { let h = 0; for (const ch of String(id)) h = (h * 31 + ch.charCodeAt(0)) >>> 0; return h % FLOPPY_COLOURS.length; };

export const MODEL_IDS = Object.keys(MODELS);
export const FLOPPY_SLOTS = ['df0', 'df1', 'df2'];

export const DEFAULT_CONFIG = { model: 'A500', df1: false, df2: false, hd: false, cd: false, inserted: { df0: 'house:lanparty', df1: null, df2: null, hd: null, cd: null } };

// Make whatever came out of storage into a config the rest of the code can trust.
export function cleanConfig(raw) {
  const c = structuredCloneSafe(DEFAULT_CONFIG);
  if (!raw || typeof raw !== 'object') return c;
  if (MODEL_IDS.includes(raw.model)) c.model = raw.model;
  for (const k of ['df1', 'df2', 'hd', 'cd']) c[k] = raw[k] === true;
  if (raw.inserted && typeof raw.inserted === 'object') {
    for (const k of Object.keys(c.inserted)) {
      const v = raw.inserted[k];
      c.inserted[k] = typeof v === 'string' && v.length < 600 ? v : (k === 'df0' ? c.inserted.df0 : null);
    }
  }
  if (raw.inserted && 'df0' in raw.inserted && raw.inserted.df0 === null) c.inserted.df0 = null;
  return c;
}
const structuredCloneSafe = (o) => JSON.parse(JSON.stringify(o));

// Which drives does this config have, and what is in each? -> { df0: id|null, df1?, df2?, hd?, cd? } (absent: no such drive)
export function drivesOf(config) {
  const out = { df0: config.inserted.df0 };
  if (config.df1) out.df1 = config.inserted.df1;
  if (config.df2) out.df2 = config.inserted.df2;
  if (config.hd) out.hd = config.inserted.hd;
  if (config.cd) out.cd = config.inserted.cd;
  return out;
}

// The puae options the machine is started with.
export const coreOptions = (config) => ({ puae_model: MODELS[config.model].puae });

/* ---------- packing it up for the core ---------- */
// The core is handed one zip with a playlist in it. Its floppies go into DF0, DF1, DF2 in playlist order (an empty drive
// below a full one gets a blank, unformatted disk so the order holds), and a hard disk image goes last. A CD on its own
// (the core then starts as a CD32-style machine). `bytes` maps a disk id to { data: Uint8Array, ext }.
export function playlist(config, bytes) {
  const d = drivesOf(config);
  const got = (id) => (id && bytes[id]) || null;           // { data: Uint8Array, ext: 'adf' }
  if (got(d.cd)) {
    const c = got(d.cd);
    return { entries: [{ name: `cd.${c.ext}`, data: c.data }], m3u: null, cd: true };
  }
  const slots = ['df0', 'df1', 'df2'].filter((s) => s in d);
  let last = -1;
  slots.forEach((s, i) => { if (got(d[s])) last = i; });
  if (last < 0) last = 0;                                   // the core will not start on a hard disk alone, so there is always a DF0
  const entries = [], lines = [];
  for (let i = 0; i <= last; i++) {
    const s = slots[i], f = got(d[s]);
    const name = f ? `${s}.${f.ext}` : `${s}.adf`;
    entries.push({ name, data: f ? f.data : new Uint8Array(901120) });
    lines.push(name);
  }
  if (got(d.hd)) { const h = got(d.hd); entries.push({ name: `hd.${h.ext}`, data: h.data }); lines.push(`hd.${h.ext}`); }
  const m3u = lines.join('\n') + '\n';
  entries.push({ name: 'machine.m3u', data: m3u });
  return { entries, m3u, cd: false };
}

export const bundle = (config, bytes) => makeZip(playlist(config, bytes).entries);
