// Spectator mode: K-Rad and n00bslayer, the two regulars at the right-wall PCs, are bots that play DOOM deathmatches
// one after another, and what is on their CRTs is the real game.
//
// Each of the two PCs is a hidden DOS PC running the real DOOM.EXE (js/emulator.js), which replays recorded
// bot-versus-bot deathmatches (js/dm-demos.js, tools/dm-recorder). Both PCs show the same fight; K-Rad's screen is
// player 1's view of it and n00bslayer's is player 2's. DOOM's own title loop cycles through the matches, so it
// never stops.
//
// Two extra DOS PCs are heavy, so they only run while somebody is near enough to see the screens, and never while the
// player has their own game running. Away from the desks the glass keeps the last picture it had.
//
// wantRunning is the only logic with no DOM (tools/spectator.test.mjs); Spectator is the browser half.

import { DosPC } from './emulator.js';
import { feedGlow } from './feed.js';

export const NEAR = 7;          // metres from the desks: start watching
export const FAR = 11;          // metres: stop again (further than NEAR so it doesn't flicker at the edge)
export const PICTURE_FPS = 12;
export const PICTURE_W = 320;
export const PICTURE_H = 240;   // 4:3, like the DOS picture

// Should the two hidden PCs be running? was: are they now; dist: metres from the desks; busy: the player is at a PC
// running a game of their own, or the page is hidden or on the intro screen.
export function wantRunning(was, dist, busy) {
  if (busy) return false;
  return was ? dist < FAR : dist < NEAR;
}

export class Spectator {
  constructor() {
    this.pcs = [null, null];
    this.hosts = [null, null];
    this.streams = [null, null];   // { canvas, stream, video } while capturing
    this.pictures = [0, 1].map(() => {
      const c = document.createElement('canvas');
      c.width = PICTURE_W; c.height = PICTURE_H;
      return c;
    });
    this.seen = [false, false];    // has a real DOOM picture arrived yet
    this.glows = [null, null];
    this.on = false;
    this.failed = false;
    this.acc = 0;
    this.glowAcc = 0;
  }

  // dt seconds; dist metres to the desks; busy as for wantRunning
  update(dt, dist, busy) {
    const want = !this.failed && wantRunning(this.on, dist, busy);
    if (want !== this.on) { this.on = want; want ? this.start() : this.pause(); }
    if (!this.on) return;
    this.acc += dt;
    if (this.acc < 1 / PICTURE_FPS) return;
    this.acc = 0;
    this.glowAcc += 1 / PICTURE_FPS;
    const glow = this.glowAcc >= 0.5;
    if (glow) this.glowAcc = 0;
    for (let i = 0; i < 2; i++) this.copy(i, glow);
  }

  // js-dos can't initialise two PCs at the same instant, so the second boots once the first is up
  async start() {
    if (this.starting) return;
    this.starting = true;
    try {
      for (let i = 0; i < 2; i++) {
        if (!this.hosts[i]) {
          const h = document.createElement('div');
          h.className = 'spectator-host';
          // laid out and visible to the browser, but off screen: js-dos needs a real size to draw into
          h.style.cssText = 'position:fixed;left:-2000px;top:0;width:320px;height:240px;pointer-events:none;';
          document.body.append(h);
          this.hosts[i] = h;
          this.pcs[i] = new DosPC(h);
        }
        const pc = this.pcs[i];
        const up = pc.running ? Promise.resolve() : new Promise((done) => { pc.onReady = done; setTimeout(done, 30000); });
        await pc.boot({ game: 'doom', kind: 'spectate', view: i });
        await up;
      }
    } catch {
      this.failed = true; this.on = false;
    } finally { this.starting = false; }
  }

  pause() {
    for (const pc of this.pcs) pc?.pause();
    this.releaseStreams();
  }

  releaseStreams() { for (let i = 0; i < 2; i++) this.releaseStream(i); }

  releaseStream(i) {
    const s = this.streams[i];
    if (!s) return;
    s.stream.getTracks().forEach((t) => t.stop());
    s.video.remove();
    this.streams[i] = null;
  }

  // js-dos draws into the biggest canvas it makes
  canvasOf(i) {
    let best = null, area = 0;
    for (const c of this.hosts[i]?.querySelectorAll('canvas') ?? []) {
      const a = c.width * c.height;
      if (a > area) { best = c; area = a; }
    }
    return best;
  }

  // a WebGL canvas can only be read between frames through a video of its captureStream (the same trick js/feed.js uses)
  copy(i, glow) {
    if (!this.pcs[i]?.running) return;
    const canvas = this.canvasOf(i);
    if (!canvas || canvas.width < 2) return;
    let s = this.streams[i];
    if (!s || s.canvas !== canvas) {
      this.releaseStream(i);
      if (typeof canvas.captureStream !== 'function') return;
      const stream = canvas.captureStream(PICTURE_FPS);
      const video = document.createElement('video');
      video.muted = true; video.playsInline = true; video.srcObject = stream;
      video.style.cssText = 'position:fixed;left:-2000px;top:0;width:2px;height:2px;';
      document.body.append(video);
      video.play().catch(() => {});
      s = this.streams[i] = { canvas, stream, video };
    }
    if (!s.video.videoWidth) return;
    const g = this.pictures[i].getContext('2d');
    try { g.drawImage(s.video, 0, 0, PICTURE_W, PICTURE_H); } catch { return; }
    this.seen[i] = true;
    if (glow) {
      this.probe ??= document.createElement('canvas');
      this.probe.width = this.probe.height = 1;
      const pg = this.probe.getContext('2d');
      pg.drawImage(this.pictures[i], 0, 0, 1, 1);
      const [r, gr, b] = pg.getImageData(0, 0, 1, 1).data;
      this.glows[i] = feedGlow(r, gr, b);
    }
  }

  // the picture for fighter i (0 K-Rad, 1 n00bslayer), or null before DOOM has drawn anything
  picture(i) { return this.seen[i] ? this.pictures[i] : null; }

  // what the CRT throws into the room: [colour, gain], or null for the usual by-screen colours
  glow(i) { return this.glows[i]; }
}
