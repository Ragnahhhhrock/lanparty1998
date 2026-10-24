// The Amiga at the front-left desk: an Amiga 500, 1200 or 2000 with up to three floppy drives, a hard disk or a CD
// fitted, running the open-source PUAE core (EmulatorJS, vendored; see vendor/emulatorjs/SOURCES.md) with the AROS
// Kickstart replacement built into the core, so there is no ROM to ship. The disks come from the disk box
// (js/amiga-disks.js): the two house floppies, and whatever the player's own folders turn up.
//
// The core runs in a hidden iframe (vendor/emulatorjs/amiga.html, js/amiga-frame.js). It starts when somebody comes
// near the desk or sits down at it, is paused when they go away, and its picture is copied onto the monitor.
// Changing the machine (the model, a drive, a disk) power-cycles it: the core takes its disks when it starts.
// The machine is also the monitor's "screen" for the power and glow code (mode, liveGlow, draw), like a Screen.
import * as THREE from 'three';
import { wantRunning } from './spectator.js';
import { feedGlow } from './feed.js';
import { HOUSE_DISKS, MODELS, cleanConfig, coreOptions, bundle, mergeDisks, makeDisk } from './amiga-disks.js';

const FRAME_URL = new URL('../vendor/emulatorjs/amiga.html', import.meta.url).href;
const W = 640, H = 480;
const SRC = [20, 0, 598, 478];      // the part of the core's 640x480 canvas that is picture, not border
const BOOT_MAX = 14;                // seconds of fast-forwarding at most; it stops as soon as the shell's window is up
const POWER_CYCLE_DELAY = 700;      // ms: several changes in a row (a drive, then a disk) are one power cycle
const FONT = '"VT323", "Lucida Console", monospace';
const KEY = 'lan98-amiga';
const SLOT_KIND = { df0: 'floppy', df1: 'floppy', df2: 'floppy', hd: 'hd', cd: 'cd' };

const load = () => { try { return JSON.parse(localStorage.getItem(KEY)); } catch { return null; } };
const save = (c) => { try { localStorage.setItem(KEY, JSON.stringify(c)); } catch { /* no storage */ } };

export class AmigaMachine {
  constructor() {
    const c = document.createElement('canvas');
    c.width = W; c.height = H;
    this.canvas = c;
    this.g = c.getContext('2d');
    this.texture = new THREE.CanvasTexture(c);
    this.texture.colorSpace = THREE.SRGBColorSpace;
    this.mode = 'amiga';        // what power.js reads off a screen
    this.free = false;
    this.config = cleanConfig(load());
    this.library = [...HOUSE_DISKS];  // everything in the disk box
    this.houseBytes = new Map();
    this.listeners = [];        // called when the machine or the box changed: the desk and the panel redraw
    this.frame = null;
    this.status = 'Off';
    this.on = false;            // should it be running right now
    this.engaged = false;       // somebody is at the keyboard
    this.failed = false;
    this.booting = false;
    this.generation = 0;        // counts power cycles, so a stale boot can be dropped
    this.glow = null;
    this.glowAcc = 0;
    this.clear();
  }

  core() { return this.frame?.contentWindow?.amiga ?? null; }
  get running() { return this.core()?.state === 'running'; }
  get ready() { return this.running && !this.ff; }

  clear() {
    const g = this.g;
    g.fillStyle = '#000000'; g.fillRect(0, 0, W, H);       // --crt-black
    if (this.failed) {
      g.fillStyle = '#aaaaaa'; g.font = `28px ${FONT}`;    // --dos-grey
      g.fillText('NO SIGNAL', 24, 48);
    }
    this.picture = false;
    this.texture.needsUpdate = true;
  }

  /* ---------- the box and the machine ---------- */
  watch(fn) { this.listeners.push(fn); }
  emit() { for (const fn of this.listeners) fn(); }
  disk(id) { return this.library.find((d) => d.id === id) ?? null; }
  // disks from the player's folders. If one of them is a disk that was in a drive last visit, the machine starts again with it.
  addDisks(found) {
    const missing = new Set(Object.entries(this.config.inserted).filter(([slot, id]) => id && this.fitted(slot) && !this.disk(id)).map(([, id]) => id));
    this.library = mergeDisks(this.library, found.map(makeDisk));
    this.changed([...missing].some((id) => this.disk(id)));
  }
  where(id) { return Object.keys(this.config.inserted).find((k) => this.config.inserted[k] === id && this.fitted(k)) ?? null; }
  fitted(slot) { return slot === 'df0' || this.config[slot] === true; }

  // Persist, tell the desk and the panel, and power-cycle (soon) if the machine itself changed.
  changed(cycle = false) {
    save(this.config);
    this.emit();
    if (cycle) { clearTimeout(this.cycleTimer); this.cycleTimer = setTimeout(() => this.powerCycle(), POWER_CYCLE_DELAY); }
  }

  setModel(model) {
    if (!MODELS[model] || this.config.model === model) return;
    this.config.model = model;
    this.changed(true);
  }

  // fit or remove a drive: 'df1', 'df2', 'hd' or 'cd'. A disk in a drive that goes goes back in the box.
  fit(slot, on) {
    if (!(slot in SLOT_KIND) || slot === 'df0' || this.config[slot] === !!on) return;
    this.config[slot] = !!on;
    if (!on) this.config.inserted[slot] = null;
    this.changed(true);
  }

  // put a disk from the box in a drive; false if it does not fit there (a CD in a floppy drive, a drive that is not fitted)
  insert(slot, id) {
    const d = this.disk(id);
    if (!d || !this.fitted(slot) || d.kind !== SLOT_KIND[slot]) return false;
    for (const k of Object.keys(this.config.inserted)) if (this.config.inserted[k] === id) this.config.inserted[k] = null;   // one disk, one place
    this.config.inserted[slot] = id;
    this.changed(true);
    return true;
  }

  eject(slot) {
    if (!this.config.inserted[slot]) return;
    this.config.inserted[slot] = null;
    this.changed(true);
  }

  // bytes for each disk that is in a fitted drive
  async diskBytes() {
    const out = {};
    for (const [slot, id] of Object.entries(this.config.inserted)) {
      if (!id || !this.fitted(slot)) continue;
      const d = this.disk(id);
      if (!d) continue;                                           // a disk from a folder that has not been read this visit: the drive is empty until it is
      const ext = d.name.split('.').pop().toLowerCase();
      if (d.file) out[id] = { data: new Uint8Array(await d.file.arrayBuffer()), ext };
      else {
        if (!this.houseBytes.has(id)) {
          const res = await fetch(d.url);
          if (!res.ok) throw new Error('no disk');
          this.houseBytes.set(id, new Uint8Array(await res.arrayBuffer()));
        }
        out[id] = { data: this.houseBytes.get(id), ext };
      }
    }
    return out;
  }

  // describe what is fitted, for the status line
  describe() {
    const c = this.config, names = [];
    for (const slot of ['df0', 'df1', 'df2', 'hd', 'cd']) {
      if (!this.fitted(slot)) continue;
      const d = this.disk(c.inserted[slot]);
      names.push(`${slot.toUpperCase()} ${d ? d.label : 'empty'}`);
    }
    return `${MODELS[c.model].label}: ${names.join(', ')}`;
  }

  /* ---------- running ---------- */
  // dt seconds, dist metres to the desk, busy: the player is at a PC of their own, or the page is hidden or on the intro
  update(dt, dist, busy) {
    const want = !this.failed && (this.engaged || wantRunning(this.on, dist, busy));
    if (want !== this.on) {
      this.on = want;
      if (want) this.start(); else this.core()?.pause();
    }
    if (this.ff && (performance.now() - this.ffStart > BOOT_MAX * 1000 || this.shellUp())) this.endFastForward();
    if (this.running && !this.ff) this.core().setVolume(Math.max(0, Math.min(1, 1 - (dist - 1.5) / 5.5)) * 0.5);   // quieter the further away you are
  }

  // switch it off and on again with what is in the drives now
  powerCycle() {
    this.generation++;
    this.frame?.remove();
    this.frame = null;
    this.booting = false;
    this.ff = false;
    this.windowAt = undefined;
    this.failed = false;
    this.clear();
    this.status = 'Off';
    if (this.on) this.start(); else this.emit();
  }

  async start() {
    if (this.frame) { if (this.running) { this.core().resume(); this.core().resumeAudio(); } return; }
    if (this.booting) return;
    this.booting = true;
    const mine = this.generation;
    this.status = 'Booting...';
    this.emit();
    try {
      const frame = document.createElement('iframe');
      frame.className = 'amiga-frame';
      frame.src = FRAME_URL;
      frame.title = 'Amiga core';
      frame.tabIndex = -1;
      frame.setAttribute('aria-hidden', 'true');
      this.frame = frame;
      const loaded = new Promise((ok) => frame.addEventListener('load', ok, { once: true }));
      document.body.appendChild(frame);
      const bytes = await this.diskBytes();
      await loaded;
      if (mine !== this.generation) return;               // somebody changed the machine while it was loading
      const zip = bundle(this.config, bytes);
      await this.core().start(zip, 'machine.zip', MODELS[this.config.model].label, coreOptions(this.config));
      if (mine !== this.generation) return;
      this.ff = true;
      this.ffStart = performance.now();
      this.core().setVolume(0);
      this.core().fastForward(true);
      this.status = 'Ready';
      if (!this.on) this.core().pause();
    } catch {
      if (mine !== this.generation) return;
      this.failed = true; this.on = false;
      this.frame?.remove(); this.frame = null;
      this.status = 'No signal';
      this.clear();
    } finally { if (mine === this.generation) { this.booting = false; this.emit(); } }
  }

  // has the boot got as far as the shell? Its window has a blue title bar; the grey screen before it has none.
  // The window is given a moment to print the startup text before the fast-forward ends.
  shellUp() {
    const src = this.core()?.canvas;
    if (!src || performance.now() - this.ffStart < 1500) return false;
    this.probe ??= document.createElement('canvas');
    this.probe.width = this.probe.height = 1;
    const pg = this.probe.getContext('2d', { willReadFrequently: true });
    try { pg.drawImage(src, 300, 41, 1, 1, 0, 0, 1, 1); } catch { return false; }
    const [r, , b] = pg.getImageData(0, 0, 1, 1).data;
    if (b - r > 40) this.windowAt ??= performance.now();
    return this.windowAt !== undefined && performance.now() - this.windowAt > 1200;
  }

  endFastForward() {
    this.ff = false;
    const c = this.core();
    if (!c) return;
    c.fastForward(false);
    c.setVolume(0.5);
    c.resumeAudio();
  }

  // the monitor: copy the core's picture (called a dozen times a second with the other screens)
  draw() {
    if (!this.running || this.core().paused) return;
    const src = this.core().canvas;
    if (!src) return;
    try { this.g.drawImage(src, ...SRC, 0, 0, W, H); } catch { return; }
    this.picture = true;
    this.texture.needsUpdate = true;
    this.glowAcc += 1;
    if (this.glowAcc >= 6) {
      this.glowAcc = 0;
      this.probe ??= document.createElement('canvas');
      this.probe.width = this.probe.height = 1;
      const pg = this.probe.getContext('2d');
      pg.drawImage(this.canvas, 0, 0, 1, 1);
      const [r, gr, b] = pg.getImageData(0, 0, 1, 1).data;
      this.glow = feedGlow(r, gr, b);
    }
  }

  // what the CRT throws into a dark room: [colour, gain], or null for the usual by-screen colours
  liveGlow() { return this.running && this.picture ? this.glow : null; }

  enter() { this.engaged = true; this.core()?.resumeAudio(); }
  leave() { this.engaged = false; }
  reset() { this.core()?.reset(); }

  // a key from the room; false if it is not ours to take
  key(e) {
    const c = this.core();
    if (!c || !this.running || e.code === 'Backquote') return false;
    c.resumeAudio();
    c.key(e.type, { key: e.key, code: e.code, keyCode: e.keyCode, which: e.which, shiftKey: e.shiftKey, ctrlKey: e.ctrlKey, altKey: e.altKey, metaKey: e.metaKey, repeat: e.repeat });
    e.preventDefault();
    return true;
  }
}
