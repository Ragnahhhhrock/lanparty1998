// The Amiga's setup and disk box (index.html #amiga-panel): pick the machine, fit drives, find disk images on the
// player's own drives, and drag disks from the box into the drives. Every change goes through AmigaMachine
// (js/amiga.js), which power-cycles the machine; the panel only draws what the machine says and passes on what the
// player does. Files are read in place by the browser; nothing is uploaded.
import { MODELS, MODEL_IDS, KINDS, FLOPPY_COLOURS, floppyIndex, walkDirectory, fromFileList, dropEntries, walkEntry, savedFolders, saveFolders, forgetFolders, scanFolders } from './amiga-disks.js';

const $ = (id) => document.getElementById(id);
const BAYS = [['df0', 'DF0'], ['df1', 'DF1'], ['df2', 'DF2'], ['hd', 'HD0'], ['cd', 'CD0']];
const MIME = 'text/x-amiga-disk';
const KIND_OF_SLOT = { df0: 'floppy', df1: 'floppy', df2: 'floppy', hd: 'hd', cd: 'cd' };

export function setupAmigaPanel(machine) {
  const panel = $('amiga-panel'), bays = $('amp-bays'), box = $('amp-box'), note = $('amp-note');
  const model = $('amp-model');
  let folders = [];          // remembered directory handles
  let picked = null;         // a disk chosen with a click, waiting for a drive
  let asked = false;         // the remembered folders have been read once this visit

  for (const id of MODEL_IDS) model.add(new Option(MODELS[id].label, id));
  const say = (t) => { note.textContent = t; };

  /* ---------- drawing ---------- */
  function draw() {
    const c = machine.config;
    model.value = c.model;
    for (const cb of panel.querySelectorAll('[data-fit]')) cb.checked = c[cb.dataset.fit] === true;

    bays.textContent = '';
    for (const [slot, name] of BAYS) {
      if (!machine.fitted(slot)) continue;
      const d = machine.disk(c.inserted[slot]);
      const row = document.createElement('div');
      row.className = 'amp-bay';
      row.dataset.slot = slot;
      const n = document.createElement('span'); n.textContent = name;
      const inside = document.createElement('span');
      inside.className = 'amp-in' + (d ? '' : ' empty');
      inside.textContent = d ? d.label : (c.inserted[slot] ? 'disk not read yet' : 'empty');
      row.append(n, inside);
      if (c.inserted[slot]) {
        const out = document.createElement('button');
        out.type = 'button'; out.className = 'w98-btn'; out.textContent = 'Eject';
        out.setAttribute('aria-label', `Eject ${name}`);
        out.addEventListener('click', () => machine.eject(slot));
        row.append(out);
      } else if (picked) {
        const ins = document.createElement('button');
        ins.type = 'button'; ins.className = 'w98-btn'; ins.textContent = 'Insert';
        ins.addEventListener('click', () => put(slot, picked));
        row.append(ins);
      }
      row.addEventListener('dragover', (e) => { if (e.dataTransfer.types.includes(MIME)) { e.preventDefault(); row.classList.add('over'); } });
      row.addEventListener('dragleave', () => row.classList.remove('over'));
      row.addEventListener('drop', (e) => {
        const id = e.dataTransfer.getData(MIME);
        if (!id) return;
        e.preventDefault(); e.stopPropagation(); row.classList.remove('over');
        put(slot, id);
      });
      bays.append(row);
    }
    drawBox();
    $('amp-rescan').hidden = $('amp-forget').hidden = folders.length === 0;
  }

  function drawBox() {
    const q = $('amp-filter').value.trim().toLowerCase();
    box.textContent = '';
    for (const d of machine.library) {
      if (q && !`${d.label} ${d.path}`.toLowerCase().includes(q)) continue;
      const b = document.createElement('button');
      b.type = 'button';
      b.className = `amp-disk ${d.kind}` + (machine.where(d.id) ? ' in-drive' : '') + (picked === d.id ? ' picked' : '');
      b.draggable = true;
      b.title = d.path;
      b.dataset.id = d.id;
      if (d.kind === 'floppy') b.style.setProperty('--disk', `var(${FLOPPY_COLOURS[floppyIndex(d.id)].token})`);
      const shell = document.createElement('span'); shell.className = 'shell';
      const name = document.createElement('span'); name.className = 'name'; name.textContent = d.label;
      b.append(shell, name);
      b.setAttribute('aria-label', `${KINDS[d.kind].label} ${d.label}${machine.where(d.id) ? `, in ${machine.where(d.id).toUpperCase()}` : ''}`);
      b.addEventListener('dragstart', (e) => { e.dataTransfer.setData(MIME, d.id); e.dataTransfer.effectAllowed = 'move'; });
      b.addEventListener('click', () => { picked = picked === d.id ? null : d.id; if (picked) say(`${d.label}: choose a drive, or press Insert.`); draw(); });
      b.addEventListener('dblclick', () => autoInsert(d.id));
      box.append(b);
    }
    if (!box.firstChild) { const p = document.createElement('p'); p.className = 'amp-note'; p.textContent = 'No disks match.'; box.append(p); }
  }

  /* ---------- putting disks in ---------- */
  function put(slot, id) {
    const d = machine.disk(id);
    picked = null;
    if (!d) return;
    if (machine.insert(slot, id)) say(`${d.label} is in ${slot.toUpperCase()}. The Amiga is starting again.`);
    else say(`${d.label} does not go in ${slot.toUpperCase()}${machine.fitted(slot) ? '' : ': that drive is not fitted'}.`);
    draw();
  }
  // double click: the first drive that takes this kind of disk (fitting the drive if needed is the player's call)
  function autoInsert(id) {
    const d = machine.disk(id);
    if (!d) return;
    const slots = BAYS.map(([s]) => s).filter((s) => KIND_OF_SLOT[s] === d.kind && machine.fitted(s));
    const slot = slots.find((s) => !machine.config.inserted[s]) ?? slots[0];
    if (slot) put(slot, id); else say(`Fit a ${KINDS[d.kind].label.toLowerCase()} drive first.`);
  }

  /* ---------- finding disks ---------- */
  function got(found, where) {
    const before = machine.library.length;
    machine.addDisks(found);
    const added = machine.library.length - before;
    say(found.length ? `${where}: ${found.length} disk file${found.length === 1 ? '' : 's'} found, ${added} new.` : `${where}: no disk files found (.adf .hdf .iso).`);
    draw();
  }

  async function scan() {
    if (window.showDirectoryPicker) {
      let dir;
      try { dir = await window.showDirectoryPicker({ id: 'amiga-disks', mode: 'read' }); } catch { return; }   // cancelled
      say('Reading...');
      const found = await walkDirectory(dir);
      if (!(await sameAsSaved(dir))) { folders.push(dir); saveFolders(folders); }
      got(found, dir.name);
    } else $('amp-input-dir').click();
  }
  const sameAsSaved = async (dir) => { for (const f of folders) { try { if (await f.isSameEntry(dir)) return true; } catch { /* gone */ } } return false; };

  async function rescan(ask) {
    if (!folders.length) return;
    say('Reading your folders...');
    const { found, read } = await scanFolders(folders, { ask });
    if (found.length) got(found, 'Folders');
    else say(read ? 'Folders read: no disk files found.' : 'Press Rescan to let the browser read your folders again.');
    draw();
  }

  $('amp-scan').addEventListener('click', scan);
  $('amp-files').addEventListener('click', () => $('amp-input-files').click());
  $('amp-rescan').addEventListener('click', () => rescan(true));
  $('amp-forget').addEventListener('click', async () => { await forgetFolders(); folders = []; say('Folders forgotten. Disks already in the box stay until you reload.'); draw(); });
  $('amp-input-files').addEventListener('change', (e) => { got(fromFileList(e.target.files), 'Files'); e.target.value = ''; });
  $('amp-input-dir').addEventListener('change', (e) => { got(fromFileList(e.target.files), 'Folder'); e.target.value = ''; });
  $('amp-filter').addEventListener('input', drawBox);

  // files and folders dropped from the desktop
  const hasFiles = (e) => e.dataTransfer?.types?.includes('Files');
  panel.addEventListener('dragover', (e) => { if (hasFiles(e)) { e.preventDefault(); panel.classList.add('drop-files'); } });
  panel.addEventListener('dragleave', (e) => { if (!panel.contains(e.relatedTarget)) panel.classList.remove('drop-files'); });
  panel.addEventListener('drop', async (e) => {
    panel.classList.remove('drop-files');
    if (!hasFiles(e)) return;
    e.preventDefault();
    const entries = dropEntries(e.dataTransfer);       // must be read during the event
    say('Reading...');
    const found = [];
    for (const en of entries) await walkEntry(en, found);
    got(found, 'Dropped');
  });

  /* ---------- the machine controls ---------- */
  model.addEventListener('change', () => { machine.setModel(model.value); say(`${MODELS[model.value].label}: starting again.`); });
  for (const cb of panel.querySelectorAll('[data-fit]')) {
    cb.addEventListener('change', () => { machine.fit(cb.dataset.fit, cb.checked); say('Drives changed: the Amiga is starting again.'); draw(); });
  }
  const close = () => api.close();
  $('amp-close').addEventListener('click', close);
  $('amp-close').addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); close(); } });

  machine.watch(draw);
  draw();

  const api = {
    get open() { return !panel.hidden; },
    async show() {
      panel.hidden = false;
      $('ami-setup').setAttribute('aria-expanded', 'true');
      if (!asked) {                                    // the folders from last visit: read the ones the browser still allows
        asked = true;
        folders = await savedFolders();
        draw();
        if (folders.length) rescan(false);
      }
    },
    close() { panel.hidden = true; $('ami-setup').setAttribute('aria-expanded', 'false'); },
    toggle() { return api.open ? api.close() : api.show(); },
  };
  return api;
}
