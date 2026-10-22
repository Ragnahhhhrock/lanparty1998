// The Amiga 500 at the front-left desk. It runs the open-source PUAE core (EmulatorJS, vendored; see
// vendor/emulatorjs/SOURCES.md) with the AROS Kickstart replacement built into the core, so there is no ROM
// to ship. It boots bundles/lanparty-amiga.adf (tools/make-amiga-disk.py), a floppy made for this room.
//
// The core runs in a hidden iframe (vendor/emulatorjs/amiga.html, js/amiga-frame.js). It starts when somebody comes
// near the desk or sits down at it, is paused when they go away, and its picture is copied onto the monitor.
// The machine is also the monitor's "screen" for the power and glow code (mode, liveGlow, draw), like a Screen.
import * as THREE from 'three';
import { wantRunning } from './spectator.js';
import { feedGlow } from './feed.js';

const FRAME_URL = new URL('../vendor/emulatorjs/amiga.html', import.meta.url).href;
const DISK_URL = new URL('../bundles/lanparty-amiga.adf', import.meta.url).href;
const W = 640, H = 480;
const SRC = [20, 0, 598, 478];      // the part of the core's 640x480 canvas that is picture, not border
const BOOT_MAX = 60;                // seconds of fast-forwarding at most; it stops as soon as the shell's grey screen is up
const FONT = '"VT323", "Lucida Console", monospace';

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
    this.frame = null;
    this.status = 'Off';
    this.on = false;            // should it be running right now
    this.engaged = false;       // somebody is at the keyboard
    this.failed = false;
    this.booting = false;
    this.glow = null;
    this.glowAcc = 0;
    this.ffUntil = 0;
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
      g.fillText('NO DISK', 24, 48);
    }
    this.texture.needsUpdate = true;
  }

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

  async start() {
    if (this.frame) { if (this.running) { this.core().resume(); this.core().resumeAudio(); } return; }
    if (this.booting) return;
    this.booting = true;
    this.status = 'Booting...';
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
      const [res] = await Promise.all([fetch(DISK_URL), loaded]);
      if (!res.ok) throw new Error('no disk');
      const disk = new Uint8Array(await res.arrayBuffer());
      await this.core().start(disk, 'lanparty-amiga.adf', 'Amiga 500');
      this.ff = true;
      this.ffStart = performance.now();
      this.core().setVolume(0);
      this.core().fastForward(true);
      this.status = 'Ready';
      if (!this.on) this.core().pause();
    } catch {
      this.failed = true; this.on = false;
      this.frame?.remove(); this.frame = null;
      this.status = 'No disk';
      this.clear();
    } finally { this.booting = false; }
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
    if (this.ff) { if (this.picture) { this.g.fillStyle = '#000000'; this.g.fillRect(0, 0, W, H); this.texture.needsUpdate = true; this.picture = false; } return; }
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
