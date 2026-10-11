// LANamp: the music player window. Draws the playlist, the clock and the spectrum for a Player (music.js),
// and lets the visitor add folders of their own MP3s (library.js). The files never leave their computer.
import { TRACKS, fmtTime, trackLabel } from './music.js';
import { makeTrack, fileKey, byPath, readAllTags, walkDirectory, walkEntry, dropEntries, fromFileList, savedFolders, saveFolders, forgetFolders } from './library.js';

export function initLanamp(root, player) {
  const $ = (id) => root.querySelector(id);
  const time = $('#amp-time'), song = $('#amp-song'), genre = $('#amp-genre'), kind = $('#amp-kind'), list = $('#amp-list');
  const status = $('#amp-status'), addBtn = $('#amp-add'), rescanBtn = $('#amp-rescan'), clearBtn = $('#amp-clear'), picker = $('#amp-files');
  const canvas = $('#amp-vis'), g = canvas.getContext('2d');
  const css = getComputedStyle(document.documentElement);
  const colour = (n) => css.getPropertyValue(n).trim() || '#9dff7a';
  const green = colour('--phosphor'), amber = colour('--amber'), black = colour('--crt-black');

  /* ---------- the playlist ---------- */
  const line = (t) => `${trackLabel(t)} (${fmtTime(t.seconds)})`;
  let lit = null;
  const renderList = () => {
    const frag = document.createDocumentFragment();
    player.tracks.forEach((t, i) => { const li = document.createElement('li'); li.dataset.i = i; li.textContent = line(t); frag.append(li); });
    list.replaceChildren(frag);
    lit = null;
    show();
  };
  const refreshLabels = () => {
    player.tracks.forEach((t, i) => { const li = list.children[i], text = line(t); if (li && li.textContent !== text) li.textContent = text; });
    show();
  };
  list.addEventListener('click', (e) => { const li = e.target.closest('li'); if (li) player.play(Number(li.dataset.i)); });

  function show() {
    const t = player.track;
    song.textContent = `${player.index + 1}. ${trackLabel(t)} (${fmtTime(t.seconds)}) ***`;
    genre.textContent = t.file ? (t.album || 'MP3').toUpperCase().slice(0, 16) : `${t.genre.toUpperCase()} ${t.bpm}BPM`;
    kind.textContent = t.file ? 'MP3 FILE' : 'SYNTH 22kHz';
    const li = list.children[player.index];
    if (li !== lit) {
      lit?.classList.remove('now'); li?.classList.add('now'); lit = li ?? null;
      if (li) { // keep the playing song in view without scrolling the page
        const a = li.getBoundingClientRect(), b = list.getBoundingClientRect();
        if (a.top < b.top || a.bottom > b.bottom) list.scrollTop += a.top - b.top - (b.height - a.height) / 2;
      }
    }
  }
  player.addEventListener('track', show);
  player.addEventListener('meta', () => { const li = list.children[player.index]; if (li) li.textContent = line(player.track); show(); });
  player.addEventListener('unplayable', () => say('SKIPPED A FILE THE BROWSER CANNOT PLAY'));
  renderList();

  /* ---------- the buttons ---------- */
  $('#amp-prev').addEventListener('click', () => player.skip(-1));
  $('#amp-next').addEventListener('click', () => player.skip(1));
  $('#amp-play').addEventListener('click', () => player.play());
  $('#amp-pause').addEventListener('click', () => player.pause());
  $('#amp-stop').addEventListener('click', () => player.stop());
  const flag = (id, key) => $(id).addEventListener('click', (e) => { player[key] = !player[key]; e.currentTarget.setAttribute('aria-pressed', player[key]); });
  flag('#amp-shuffle', 'shuffle'); flag('#amp-repeat', 'repeat');
  $('#amp-vol').addEventListener('input', (e) => player.setVolume(e.target.value / 100));
  player.setVolume(0.6);

  /* ---------- the visitor's own MP3s ---------- */
  const say = (text) => { status.textContent = text; };
  const count = (n) => n.toLocaleString('en-US');
  let library = new Map(); // key -> track, for the files the visitor has added
  let folders = [];        // directory handles kept for RESCAN (Chrome and Edge)
  let scans = 0;           // each load bumps this, so a slow tag read from an older one stops
  const buttons = () => { rescanBtn.hidden = !folders.length; clearBtn.hidden = !library.size && !folders.length; };

  // found: [{ file, path }]. With replace the library becomes exactly these files; otherwise they are added to it.
  async function load(found, replace = false) {
    const mine = ++scans;
    const next = new Map(replace ? [] : library);
    for (const f of found) { const k = fileKey(f.path, f.file.size); if (!next.has(k)) next.set(k, library.get(k) ?? makeTrack(f)); }
    if (!found.length && !next.size) { say('NO MP3 FILES FOUND'); return; }
    const before = library.size;
    library = next;
    player.setTracks([...TRACKS, ...[...next.values()].sort(byPath)]);
    renderList(); buttons();
    say(`${count(next.size)} MP3 FILE${next.size === 1 ? '' : 'S'}${next.size === before ? ' (NOTHING NEW)' : ''}`);
    const todo = [...next.values()].filter((t) => !t.tagged);
    if (!todo.length) return;
    let last = 0;
    await readAllTags(todo, {
      isStale: () => mine !== scans,
      onTick: (n, final) => {
        if (mine !== scans || (!final && performance.now() - last < 500)) return;
        last = performance.now();
        refreshLabels();
        say(final ? `${count(next.size)} MP3 FILE${next.size === 1 ? '' : 'S'}` : `READING TAGS ${count(n)}/${count(todo.length)}`);
      },
    });
  }

  // run a scan that fills `found`, showing a running count while it works
  async function scan(fill) {
    const found = [];
    const timer = setInterval(() => say(`SCANNING... ${count(found.length)} MP3`), 150);
    say('SCANNING...');
    try { await fill(found); } finally { clearInterval(timer); }
    return found;
  }

  async function addFolder() {
    if (!window.showDirectoryPicker) { picker.click(); return; } // Firefox and Safari: a plain folder chooser
    let handle;
    try { handle = await window.showDirectoryPicker({ id: 'lanamp', mode: 'read', startIn: 'music' }); }
    catch (e) { if (e.name !== 'AbortError') say('COULD NOT OPEN THAT FOLDER'); return; }
    let known = false;
    for (const h of folders) if (await h.isSameEntry(handle)) known = true;
    if (!known) { folders.push(handle); saveFolders(folders); }
    buttons();
    await load(await scan((found) => walkDirectory(handle, found)));
  }

  // The browser asks once per visit before a remembered folder can be read again.
  async function rescan() {
    const ready = [];
    for (const h of folders) {
      try {
        if (await h.queryPermission({ mode: 'read' }) === 'granted' || await h.requestPermission({ mode: 'read' }) === 'granted') ready.push(h);
      } catch { /* the folder is gone */ }
    }
    if (!ready.length) { say('NO ACCESS TO THE SAVED FOLDERS'); return; }
    const all = ready.length === folders.length;
    await load(await scan(async (found) => { for (const h of ready) await walkDirectory(h, found); }), all);
    if (!all) say('CLICK RESCAN AGAIN FOR THE OTHER FOLDERS');
  }

  function clearLibrary() {
    scans++; library = new Map(); folders = []; forgetFolders();
    player.setTracks(TRACKS);
    renderList(); buttons(); say('');
  }

  addBtn.addEventListener('click', addFolder);
  rescanBtn.addEventListener('click', rescan);
  clearBtn.addEventListener('click', clearLibrary);
  if (!('webkitdirectory' in picker)) picker.removeAttribute('webkitdirectory'); // phones: pick files instead of a folder
  picker.addEventListener('change', async () => {
    const files = fromFileList(picker.files);
    picker.value = '';
    await load(files);
  });
  root.addEventListener('dragover', (e) => { if (e.dataTransfer?.types.includes('Files')) e.preventDefault(); });
  root.addEventListener('drop', async (e) => {
    e.preventDefault();
    const entries = dropEntries(e.dataTransfer); // must be read before the first await
    await load(await scan(async (found) => { for (const en of entries) await walkEntry(en, found); }));
  });
  savedFolders().then((h) => { folders = h; buttons(); });

  let acc = 0;
  return {
    // called every frame; redraws about 15 times a second
    update(dt) {
      acc += dt;
      if (acc < 1 / 15 || root.classList.contains('off')) return;
      acc = 0;
      time.textContent = fmtTime(player.elapsed);
      g.fillStyle = black; g.fillRect(0, 0, canvas.width, canvas.height);
      const f = player.state === 'playing' ? player.spectrum() : null;
      for (let i = 0; i < 19; i++) {
        const v = f ? f[1 + i * 2] / 255 : 0, h = Math.max(1, Math.round(v * canvas.height));
        g.fillStyle = v > 0.8 ? amber : green;
        g.fillRect(i * 4, canvas.height - h, 3, h);
      }
    },
    keys: { KeyZ: () => player.skip(-1), KeyX: () => player.play(), KeyC: () => player.pause(), KeyV: () => player.stop(), KeyB: () => player.skip(1) },
  };
}
