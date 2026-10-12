// What the player at a PC is looking at, sent to the rest of the room so the CRT on that desk shows their game.
//
// The seated player's DOS canvas is copied about five times a second, shrunk to FEED_W x FEED_H, squeezed to a small
// JPEG and sent to the room server as a binary message; the server stamps it with the PC and hands it to everyone else
// (server/src/feed-logic.js has the other half of the wire format). Each client draws what arrives onto that PC's screen
// texture (Screen.pushFeed in js/textures.js). Nothing is stored; if the pictures stop, the screen goes back to the
// stand-in "someone else's game" after FEED_TTL seconds.
//
// The wire format and the timings have no DOM in them (node tools/feed.test.mjs); FeedSender is the browser half.

export const FRAME_TAG = 0x46;     // 'F', as in server/src/feed-logic.js
export const FEED_W = 192;
export const FEED_H = 144;         // 4:3, like the DOS picture
export const FEED_FPS = 5;
export const FEED_QUALITY = 0.55;
export const FEED_TTL = 2.5;       // seconds without a picture before the desk's screen stops showing the last one

// player -> server: the tag, then the JPEG
export function packFrame(jpeg) {
  const out = new Uint8Array(jpeg.length + 1);
  out[0] = FRAME_TAG;
  out.set(jpeg, 1);
  return out.buffer;
}

// server -> player: the tag, the PC it came from, then the JPEG. Returns { pc, jpeg } or null for anything else.
export function unpackFrame(buf) {
  if (!(buf instanceof ArrayBuffer) || buf.byteLength < 3) return null;
  const bytes = new Uint8Array(buf);
  if (bytes[0] !== FRAME_TAG) return null;
  return { pc: bytes[1], jpeg: bytes.subarray(2) };
}

// Is a picture that arrived at `at` still worth showing at `now` (both in seconds)?
export const feedFresh = (at, now) => at != null && now - at < FEED_TTL;

// The colour a CRT throws into a dark room for a picture: the picture's average colour, pushed to full brightness so
// only the hue is kept, and how bright the picture was as the gain. rgb are 0..255. Returns [hex, gain].
export function feedGlow(r, g, b) {
  const top = Math.max(r, g, b, 1);
  const hex = (Math.round(r / top * 255) << 16) | (Math.round(g / top * 255) << 8) | Math.round(b / top * 255);
  const lum = (r + g + b) / 3 / 255;
  return [hex, Math.min(2.2, 0.5 + 2.2 * lum)];
}

/* ---------- the browser half ---------- */

// host: the element js-dos draws into (ui.dos). shouldSend(): true while the player is sitting at a running game with
// somebody to show it to. send(buffer): hands a packed frame to the room link.
export class FeedSender {
  constructor({ host, shouldSend, send }) {
    this.host = host;
    this.shouldSend = shouldSend;
    this.send = send;
    this.source = null;          // the DOS canvas being copied
    this.video = null;           // a muted video playing captureStream() of it, so a WebGL canvas can be read between frames
    this.stream = null;
    this.busy = false;
    this.small = document.createElement('canvas');
    this.small.width = FEED_W; this.small.height = FEED_H;
    this.g = this.small.getContext('2d');
    this.timer = setInterval(() => this.tick(), 1000 / FEED_FPS);
  }

  // js-dos draws into the biggest canvas it makes; a reboot makes a new one
  findCanvas() {
    let best = null, area = 0;
    for (const c of this.host.querySelectorAll('canvas')) {
      const a = c.width * c.height;
      if (a > area) { best = c; area = a; }
    }
    return best;
  }

  attach(canvas) {
    this.release();
    this.source = canvas;
    if (typeof canvas.captureStream !== 'function') return;   // copy it directly instead; see tick()
    try {
      this.stream = canvas.captureStream(FEED_FPS);
      const v = document.createElement('video');
      v.className = 'feed-video';
      v.muted = true; v.playsInline = true; v.srcObject = this.stream;
      document.body.append(v);
      v.play().catch(() => {});
      this.video = v;
    } catch { this.release(); this.source = canvas; }
  }

  release() {
    this.stream?.getTracks().forEach((t) => t.stop());
    this.video?.remove();
    this.stream = this.video = this.source = null;
  }

  tick() {
    if (this.busy || document.hidden || !this.shouldSend()) {
      if (!this.busy && this.source && !this.shouldSend()) this.release();   // stood up or nobody else is here: stop capturing
      return;
    }
    const canvas = this.findCanvas();
    if (!canvas || canvas.width < 2) return;
    if (canvas !== this.source) this.attach(canvas);
    const from = this.video && this.video.videoWidth ? this.video : this.video ? null : canvas;
    if (!from) return;                                   // the video has not produced a picture yet
    try { this.g.drawImage(from, 0, 0, FEED_W, FEED_H); } catch { return; }
    this.busy = true;
    this.small.toBlob(async (blob) => {
      try {
        if (blob && this.shouldSend()) this.send(packFrame(new Uint8Array(await blob.arrayBuffer())));
      } finally { this.busy = false; }
    }, 'image/jpeg', FEED_QUALITY);
  }

  stop() { clearInterval(this.timer); this.release(); }
}
