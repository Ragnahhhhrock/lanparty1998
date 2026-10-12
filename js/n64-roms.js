// The player's own cartridges: finding N64 ROM files on their drive and remembering the folders.
// Nothing is bundled and nothing is uploaded: files are read in place by the browser, and only handed to
// the emulator when somebody runs one. The matching and walking are DOM-free so tools/n64.test.mjs can
// check them; only the IndexedDB part needs a browser.

export const ROM_EXT = /\.(z64|n64|v64|zip|7z)$/i;
export const MAX_ROM_BYTES = 128 * 1048576;  // the biggest cartridges are 64 MB; a zip can be a bit more
const SKIP_DIRS = /^(\.|\$recycle\.bin$|system volume information$|node_modules$)/i;

export const isRom = (name) => ROM_EXT.test(name);

export const romId = (path, size) => `${path}|${size}`;

// A cartridge for the terminal: the File stays with it until it is run.
export function makeRom({ file, path }) {
  return { id: romId(path, file.size), name: path.split('/').pop(), path, size: file.size, file };
}

// Add `more` to `have`, once each, and return the new list.
export function mergeRoms(have, more) {
  const seen = new Set(have.map((r) => r.id));
  const out = [...have];
  for (const r of more) if (!seen.has(r.id)) { seen.add(r.id); out.push(r); }
  return out;
}

const usable = (file) => file.size > 0 && file.size <= MAX_ROM_BYTES;

/* ---------- finding the files ---------- */
// A directory picked with showDirectoryPicker(): every ROM below it. Folders we may not open are skipped.
export async function walkDirectory(dir, found = [], path = `${dir.name}/`) {
  try {
    for await (const entry of dir.values()) {
      if (entry.kind === 'directory') {
        if (!SKIP_DIRS.test(entry.name)) await walkDirectory(entry, found, `${path}${entry.name}/`);
      } else if (isRom(entry.name)) {
        try {
          const file = await entry.getFile();
          if (usable(file)) found.push({ file, path: `${path}${entry.name}` });
        } catch { /* vanished or locked */ }
      }
    }
  } catch { /* not allowed to read this folder */ }
  return found;
}

// The files from an <input type="file"> (a folder picked with webkitdirectory, or loose files).
export function fromFileList(list) {
  return [...list].filter((f) => isRom(f.name) && usable(f)).map((file) => ({ file, path: file.webkitRelativePath || file.name }));
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
    if (isRom(entry.name) && usable(entry)) found.push({ file: entry, path: entry.name });
    return found;
  }
  try {
    if (entry.isFile) {
      if (isRom(entry.name)) {
        const file = await new Promise((ok, no) => entry.file(ok, no));
        if (usable(file)) found.push({ file, path: `${path}${entry.name}` });
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
const DB = 'lanparty98-n64', STORE = 'folders';
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

// Read the ROMs under each remembered folder. `ask` lets the browser show its permission prompt (it
// needs a key press or click to do that); without it, only folders that are already allowed are read.
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
