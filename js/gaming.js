// What the speaker PCs sound like. Whoever is sitting at a PC with speakers (and isn't wearing headphones) is playing
// a shooter, and every few seconds something happens on their screen: a shotgun blast, an imp screaming, a run of
// chaingun. The noises come from the PC, so they get quieter with distance and swing left and right as you turn.
// Headphone PCs are silent. The sounds themselves are synthesised in js/sfx.js. No audio files.
import * as sfx from './sfx.js';

export const EARSHOT = 8;    // metres; past this you can't hear a PC's speakers
const LOUDEST = 0.7;         // a PC right next to you
const SEATED = 0.6;          // when you're sat at a PC of your own, the game in your ears covers some of the room
const AUDIBLE = 0.05;        // quieter than this isn't worth starting

// Things that happen on a screen: [seconds in, sound, extra]. w is how often compared with the rest.
export const MOMENTS = [
  { w: 4, sounds: [[0, 'shotgun']] },
  { w: 3, sounds: [[0, 'impShriek']] },
  { w: 3, sounds: [[0, 'impShriek'], [0.9, 'shotgun'], [1.5, 'impShriek', 1.4]] },  // sees you, gets shot, dies loudly
  { w: 2, sounds: [[0, 'shotgun'], [1.3, 'shotgun']] },
  { w: 2, sounds: [[0, 'chaingun']] },
  { w: 1, sounds: [[0, 'rocket']] },
  { w: 2, sounds: [[0, 'pickup']] },
];

// a steady 0..1 from a name, so each PC keeps its own pitch
const hash01 = (s) => {
  let h = 2166136261;
  for (const ch of String(s)) h = Math.imul(h ^ ch.charCodeAt(0), 16777619) >>> 0;
  return h / 4294967296;
};

// How loud a PC at (x, z) is for a listener, and which side it is on. The listener is { x, z, yaw, seated } and
// yaw is the camera's: it looks along (-sin yaw, -cos yaw), so its right hand is (cos yaw, -sin yaw).
export function hearing(listener, x, z) {
  const dx = x - listener.x, dz = z - listener.z, d = Math.hypot(dx, dz);
  if (d >= EARSHOT) return { vol: 0, pan: 0 };
  let vol = LOUDEST * (1 - d / EARSHOT) ** 1.5;
  if (listener.seated) vol *= SEATED;
  const pan = d < 0.4 ? 0 : Math.max(-0.85, Math.min(0.85, ((dx * Math.cos(listener.yaw) - dz * Math.sin(listener.yaw)) / d) * 0.85));
  return { vol, pan };
}

export class GameNoise {
  // play(name, vol, pan, pitch, extra) makes the noise; rand() is 0..1 (both are swapped out by the tests)
  constructor({ play = (name, vol, pan, pitch, extra) => sfx[name]?.(vol, pan, pitch, extra), rand = Math.random } = {}) {
    this.play = play;
    this.rand = rand;
    this.pcs = new Map();  // id -> { x, z, pitch, next: seconds until something happens on its screen }
    this.queue = [];       // noises already decided: { at, id, sound, extra }
    this.clock = 0;
  }

  // sources: the speaker PCs somebody is playing right now, [{ id, x, z }]. listener: see hearing().
  tick(dt, sources, listener) {
    this.clock += dt;
    const live = new Set();
    for (const s of sources) {
      live.add(s.id);
      let pc = this.pcs.get(s.id);
      if (!pc) { pc = { pitch: 0.9 + hash01(s.id) * 0.2, next: 1 + this.rand() * 5 }; this.pcs.set(s.id, pc); } // staggered, so they don't all fire at once
      pc.x = s.x; pc.z = s.z;
      if ((pc.next -= dt) <= 0) {
        pc.next = 3 + this.rand() * 7;
        for (const [at, sound, extra] of this.pick().sounds) this.queue.push({ at: this.clock + at, id: s.id, sound, extra });
      }
    }
    for (const id of [...this.pcs.keys()]) if (!live.has(id)) this.pcs.delete(id); // they left, or put their headphones on
    const due = [];
    this.queue = this.queue.filter((q) => {
      if (!this.pcs.has(q.id)) return false;
      if (q.at > this.clock) return true;
      due.push(q);
      return false;
    });
    for (const q of due) {
      const pc = this.pcs.get(q.id);
      const { vol, pan } = hearing(listener, pc.x, pc.z);
      if (vol >= AUDIBLE) this.play(q.sound, vol, pan, pc.pitch, q.extra);
    }
  }

  pick() {
    let r = this.rand() * MOMENTS.reduce((n, m) => n + m.w, 0);
    for (const m of MOMENTS) if ((r -= m.w) < 0) return m;
    return MOMENTS[0];
  }
}
