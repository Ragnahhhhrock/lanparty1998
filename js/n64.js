// The console under the TV. Sit in front of it and the TV becomes a terminal (a DOS-style prompt, see
// js/n64-term.js) that loads an N64 emulator. The player opens a folder of their own ROMs, runs one, and the
// game is drawn on the TV's glass in the room. No ROMs are bundled and none are uploaded: the files are read
// in the browser and handed to the emulator, which runs in a hidden iframe (vendor/emulatorjs/frame.html,
// js/n64-frame.js). Taking the cartridge out removes the iframe.
//
// What the TV should show right now is picture(): { kind: 'idle' | 'term' | 'game', texture }.
import * as THREE from 'three';
import { Terminal, COLS, ROWS, PROMPT, TONE } from './n64-term.js';
import * as library from './n64-roms.js';

const FRAME_URL = new URL('../vendor/emulatorjs/frame.html', import.meta.url).href;
const FONT = '"VT323", "Lucida Console", monospace';
const W = 640, H = 480, PAD = 13, LH = H / ROWS;       // the glass is 4:3, like the picture a cartridge makes
// Phosphor tokens: --crt-black, --dos-grey, --amber, --phosphor, --w98-shadow, --toast
const INK = { bg: '#000000', plain: '#aaaaaa', head: '#ffcc00', ok: '#9dff7a', dim: '#808080', error: '#ffe066', prompt: '#9dff7a' };
const reducedMotion = () => matchMedia?.('(prefers-reduced-motion: reduce)').matches;

export class N64Console {
  constructor() {
    this.term = new Terminal();
    this.library = [];
    this.frame = null;        // the iframe with the core in it, once a cartridge is in
    this.title = null;
    this.engaged = false;     // somebody is sitting at the console
    this.menu = false;        // the terminal is up over a running game
    this.loading = 0;         // counts cartridge loads, so a stale one can be dropped
    this.onstand = null;      // EXIT at the prompt
    this.onchange = null;     // the picture or the status changed
    this.onplay = null;       // a cartridge started (no title is passed on)

    const c = document.createElement('canvas');
    c.width = W; c.height = H;
    this.canvas = c;
    this.g = c.getContext('2d');
    this.termTexture = new THREE.CanvasTexture(c);
    this.termTexture.colorSpace = THREE.SRGBColorSpace;
    this.gameTex = null;
    this.gameCanvas = null;
    this.gameDim = '';
    this.clock = 0;
    this.blink = true;
    this.dirty = true;

    this.folderInput = this.makeInput('n64-folder', { webkitdirectory: true, multiple: true });
    this.fileInput = this.makeInput('n64-files', { accept: '.z64,.n64,.v64,.zip,.7z', multiple: true });
    for (const input of [this.folderInput, this.fileInput]) {
      input.addEventListener('change', () => { this.addFound(library.fromFileList(input.files), 'Read'); input.value = ''; });
    }
    this.booted = false;
  }

  makeInput(id, attrs) {
    const input = document.createElement('input');
    input.type = 'file';
    input.id = id;
    input.hidden = true;
    input.setAttribute('aria-hidden', 'true');
    for (const [k, v] of Object.entries(attrs)) { if (v === true) input.setAttribute(k, ''); else input.setAttribute(k, v); }
    document.body.appendChild(input);
    return input;
  }

  /* ---------- sitting down and standing up ---------- */
  enter() {
    this.engaged = true;
    if (!this.booted) { this.booted = true; this.term.banner(); this.remember(); }
    if (this.running && !this.menu) this.core()?.resume();
    this.changed();
  }

  leave() {
    this.engaged = false;
    this.core()?.pause();   // the picture stays on the glass, frozen, like a paused game
    this.changed();
  }

  // folders remembered from last time (Chrome and Edge); read them again if the browser lets us without asking
  async remember() {
    const handles = await library.savedFolders();
    this.term.folders = handles.length;
    if (!handles.length) return;
    const { found, read } = await library.scanFolders(handles);
    if (found.length) this.addFound(found, 'Read', true);
    else if (read === 0) { this.term.print(`${handles.length} folder${handles.length === 1 ? '' : 's'} remembered. RESCAN reads them again.`, TONE.dim); this.changed(); }
  }

  /* ---------- the core ---------- */
  core() { return this.frame?.contentWindow?.n64 ?? null; }
  get running() { return !!this.frame && this.core()?.state === 'running'; }
  get playing() { return this.running && !this.menu; }

  async insert(rom) {
    const mine = ++this.loading;
    await this.eject(true);
    const term = this.term;
    term.busy = 'Reading cartridge...';
    this.changed();
    const frame = document.createElement('iframe');
    frame.className = 'n64-frame';
    frame.src = FRAME_URL;
    frame.title = 'Console core';
    frame.tabIndex = -1;
    frame.setAttribute('aria-hidden', 'true');
    this.frame = frame;
    await new Promise((ok) => { frame.addEventListener('load', ok, { once: true }); document.body.appendChild(frame); });
    const core = this.core();
    const title = rom.name.replace(/\.[^.]+$/, '');
    const tick = setInterval(() => { if (this.loading === mine && core?.progress) { term.busy = core.progress; this.changed(); } }, 250);
    try {
      await core.start(rom.file, title);
      if (this.loading !== mine) return; // somebody ejected or picked another while this loaded
      this.title = title;
      term.title = title;
      term.busy = null;
      this.menu = false;
      term.print(`${title} is running. Esc brings this prompt back.`, TONE.ok);
      if (!this.engaged) core.pause();
      core.resumeAudio();
      this.onplay?.();
    } catch (err) {
      if (this.loading !== mine) return;
      term.busy = null;
      term.print(`Bad cartridge: ${core?.failure || err.message}`, TONE.error);
      this.unplug();
    } finally {
      clearInterval(tick);
      this.changed();
    }
  }

  unplug() {
    this.frame?.remove();
    this.frame = null;
    this.title = null;
    this.term.title = null;
    this.menu = false;
    this.gameTex?.dispose();
    this.gameTex = null;
    this.gameCanvas = null;
  }

  async eject(quiet = false) {
    if (!this.frame) return;
    if (!quiet) this.loading++;
    this.unplug();
    if (!quiet) { this.term.busy = null; this.term.print('Cartridge out.', TONE.dim); }
    this.changed();
  }

  /* ---------- what the TV shows ---------- */
  // 'game' while a cartridge runs (or is paused on its last frame), 'term' while somebody is at the prompt, else 'idle'.
  picture() {
    if (this.running && !this.menu) {
      const texture = this.gameTexture();
      if (texture) return { kind: 'game', texture };
    }
    if (this.engaged || this.menu || this.term.busy) return { kind: 'term', texture: this.termTexture };
    if (this.running) {
      const texture = this.gameTexture();
      if (texture) return { kind: 'game', texture };
    }
    return { kind: 'idle', texture: null };
  }

  gameTexture() {
    const canvas = this.core()?.canvas;
    if (!canvas) return null;
    const dim = `${canvas.width}x${canvas.height}`;
    if (canvas !== this.gameCanvas || dim !== this.gameDim) { // the picture was resized: make a texture to fit it
      this.gameTex?.dispose();
      const t = new THREE.CanvasTexture(canvas);
      t.colorSpace = THREE.SRGBColorSpace;
      t.generateMipmaps = false;
      t.minFilter = THREE.LinearFilter;
      this.gameTex = t;
      this.gameCanvas = canvas;
      this.gameDim = dim;
    }
    return this.gameTex;
  }

  // call every frame
  update(dt) {
    this.clock += dt;
    const blink = reducedMotion() || Math.floor(this.clock * 2) % 2 === 0;
    if (blink !== this.blink) { this.blink = blink; this.dirty = true; }
    if (this.playing && this.gameTex) this.gameTex.needsUpdate = true;
    if (this.dirty && (this.engaged || this.menu || this.term.busy)) { this.draw(); this.dirty = false; }
  }

  changed() { this.dirty = true; this.onchange?.(); }

  /* ---------- drawing the terminal ---------- */
  draw() {
    const g = this.g, term = this.term;
    g.fillStyle = INK.bg;
    g.fillRect(0, 0, W, H);
    g.textBaseline = 'alphabetic';
    let px = 24;
    g.font = `${px}px ${FONT}`;
    const cell = g.measureText('M').width;
    if (cell * COLS > W - PAD * 2) { px = Math.floor(px * (W - PAD * 2) / (cell * COLS)); g.font = `${px}px ${FONT}`; }
    const cw = g.measureText('M').width;
    const base = (row) => row * LH + LH - 6;
    term.visible().forEach((line, i) => {
      g.fillStyle = INK[line.tone] ?? INK.plain;
      g.fillText(line.text, PAD, base(i));
    });
    const row = ROWS - 1;
    if (term.busy) {
      g.fillStyle = INK.head;
      g.fillText(term.busy.slice(0, COLS), PAD, base(row));
    } else {
      const text = PROMPT + term.input;
      g.fillStyle = INK.prompt;
      g.fillText(text, PAD, base(row));
      if (this.blink) g.fillRect(PAD + text.length * cw, base(row) - LH * 0.7, cw * 0.9, LH * 0.8);
    }
    if (term.scroll > 0) { g.fillStyle = INK.dim; g.fillText('-- more below --', W - PAD - 16 * cw, base(row)); }
    this.termTexture.needsUpdate = true;
  }

  /* ---------- keys ---------- */
  // A key event while somebody is at the console. Returns true when it was used (so the room ignores it).
  key(e) {
    const core = this.core();
    if (e.type === 'keydown') core?.resumeAudio();
    if (this.playing) {
      if (e.type === 'keydown' && e.code === 'Escape') { e.preventDefault(); this.openMenu(); return true; }
      core.key(e.type, e.keyCode, e.repeat);
      e.preventDefault();
      return true;
    }
    if (e.type !== 'keydown') return false;
    if (e.ctrlKey || e.metaKey || e.altKey) return false;
    const term = this.term;
    switch (e.code) {
      case 'Enter': case 'NumpadEnter': this.submit(); break;
      case 'Backspace': term.backspace(); break;
      case 'ArrowUp': term.older(); break;
      case 'ArrowDown': term.newer(); break;
      case 'PageUp': term.scrollBy(ROWS - 2); break;
      case 'PageDown': term.scrollBy(-(ROWS - 2)); break;
      case 'Escape': if (this.menu) this.closeMenu(); else term.clearInput(); break;
      case 'Tab': break; // not a character, but it must not move the page's focus either
      default:
        if (e.key.length !== 1) return false;
        term.type(e.key);
    }
    e.preventDefault();
    this.changed();
    return true;
  }

  submit() {
    const action = this.term.submit();
    if (action) this.run(action);
  }

  openMenu() {
    if (!this.running) return;
    this.menu = true;
    this.core().pause();
    this.term.print(`${this.title} is paused. Esc or RESUME to carry on.`, TONE.dim);
    this.changed();
  }

  closeMenu() {
    if (!this.menu) return;
    this.menu = false;
    this.core()?.resume();
    this.changed();
  }

  /* ---------- actions: typed commands and the buttons on the bar ---------- */
  async run(action) {
    const term = this.term;
    switch (action.type) {
      case 'open-folder': return this.openFolder();
      case 'open-files': this.fileInput.click(); term.print('Pick one or more ROM files.', TONE.dim); break;
      case 'rescan': return this.rescan();
      case 'forget':
        await library.forgetFolders();
        this.library = []; term.setRoms([]); term.folders = 0;
        term.print('Folders and cartridge list forgotten. The files on your drive are untouched.', TONE.dim);
        break;
      case 'play': return this.insert(action.rom);
      case 'eject': return this.eject();
      case 'resume': if (this.running) this.closeMenu(); else term.print('No game is running.', TONE.error); break;
      case 'reset':
        if (this.running) { this.core().reset(); this.closeMenu(); term.print('Reset.', TONE.dim); } else term.print('Nothing to reset.', TONE.error);
        break;
      case 'save':
        if (!this.running) term.print('Nothing to save.', TONE.error);
        else term.print(await this.core().save() ? 'State saved.' : 'Could not save the state.', TONE.ok);
        break;
      case 'restore':
        if (!this.running) term.print('Nothing to restore into.', TONE.error);
        else if (await this.core().load()) { this.closeMenu(); term.print('State restored.', TONE.ok); } else term.print('No saved state for this cartridge.', TONE.error);
        break;
      case 'stand': this.onstand?.(); break;
      default: break;
    }
    this.changed();
  }

  async openFolder() {
    const term = this.term;
    if (!window.showDirectoryPicker) {
      this.folderInput.click();
      term.print('Pick the folder with your ROMs in it.', TONE.dim);
      this.changed();
      return;
    }
    let handle;
    try { handle = await window.showDirectoryPicker({ id: 'lan98-n64', mode: 'read' }); } catch { term.print('Cancelled.', TONE.dim); this.changed(); return; }
    term.busy = `Reading ${handle.name}...`;
    this.changed();
    const found = await library.walkDirectory(handle);
    try {
      const have = await library.savedFolders();
      let same = false;
      for (const h of have) if (await h.isSameEntry(handle)) same = true;
      if (!same) { await library.saveFolders([...have, handle]); term.folders = have.length + 1; }
    } catch { /* remembering is optional */ }
    this.addFound(found, 'Read');
  }

  async rescan() {
    const term = this.term;
    const handles = await library.savedFolders();
    if (!handles.length) { term.print('No folders remembered. OPEN picks one.', TONE.error); this.changed(); return; }
    term.busy = 'Reading folders...';
    this.changed();
    const { found, read } = await library.scanFolders(handles, { ask: true });
    if (!read) { term.busy = null; term.print('The browser did not let me read them. OPEN picks a folder again.', TONE.error); this.changed(); return; }
    this.addFound(found, 'Read');
  }

  // found: [{ file, path }]. Adds them to the shelf and says how many.
  addFound(found, verb, quiet = false) {
    const term = this.term;
    term.busy = null;
    const before = this.library.length;
    this.library = library.mergeRoms(this.library, found.map(library.makeRom));
    term.setRoms(this.library);
    const added = this.library.length - before;
    if (!quiet || added) {
      if (!found.length) term.print('No ROMs there. I look for .z64 .n64 .v64 .zip and .7z files.', TONE.error);
      else term.print(`${verb} ${found.length} cartridge${found.length === 1 ? '' : 's'}${added !== found.length ? `, ${added} new` : ''}. DIR lists them.`, TONE.ok);
    }
    this.changed();
  }

  // files or folders dropped on the page while somebody is at the console
  async dropped(dataTransfer) {
    const entries = library.dropEntries(dataTransfer);
    if (!entries.length) return;
    this.term.busy = 'Reading what you dropped...';
    this.changed();
    const found = [];
    for (const entry of entries) await library.walkEntry(entry, found);
    this.addFound(found, 'Read');
  }

  /* ---------- for the bar ---------- */
  get status() {
    if (this.term.busy) return this.term.busy;
    if (this.playing) return `${this.title}. Esc: prompt`;
    if (this.menu) return `${this.title} paused. Esc: carry on`;
    return this.library.length ? `${this.library.length} cartridges. Type DIR` : 'No cartridges. Type OPEN';
  }
}
