// Downhill: an endless ski run, with no DOM so `node tools/ski.test.mjs` can test it.
// You ski down a slope that never ends. Trees, stumps and rocks knock you over, moguls slow you, ramps launch you,
// and gates are worth style points. Past 2000 m a bear comes down the hill after you. Skiing straight keeps
// you ahead of it; stopping, turning too much or falling lets it catch up. F is a burst of speed.
// Everything is in pixels (y goes down the hill); 8 pixels is a metre.
export const PX_PER_M = 8;
export const BEAR_AT_M = 2000;
export const MAX_SPEED = 220;          // px/s skiing straight
export const BOOST = 1.5;              // multiplier for the burst of speed
export const BEAR_SPEED = 205;         // px/s: just under straight skiing, well under a burst
export const CATCH = 12;               // px: the bear is this close and you are lunch
const BAND = 96;                       // px high: the hill is made one band at a time
const CLEAR = 240;                     // nothing but snow for the first stretch
const SPREAD = 900;                    // px either side of the line down the middle

// How each heading skis. dir is -3 (stopped, facing left) .. 3 (stopped, facing right): 0 is straight down.
//   across: sideways speed as a share of the speed down the hill, down: how much of top speed it can reach
export const HEADINGS = {
  0: { across: 0, down: 1 },
  1: { across: 0.45, down: 0.85 },
  2: { across: 1.1, down: 0.5 },
  3: { across: 0, down: 0 },
};

// What stands on the hill. solid ones knock you over; w and h are the size of the part you can hit (the trunk, not the branches).
export const KINDS = {
  tree:  { solid: true, w: 8, h: 8 },
  pine:  { solid: true, w: 10, h: 8 },
  stump: { solid: true, w: 7, h: 5 },
  rock:  { solid: true, w: 9, h: 6 },
  mogul: { solid: false, w: 14, h: 5 },
  ramp:  { solid: false, w: 18, h: 6 },
  gate:  { solid: false, w: 0, h: 0 },   // a pair of flags; x is the middle, ski between them
};
export const GATE_HALF = 26;

// a small deterministic generator, so a seed always makes the same hill
function mulberry(seed) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export class Run {
  constructor(seed = Math.floor(Math.random() * 2 ** 31)) {
    this.seed = seed;
    this.bands = new Map();
    this.reset();
  }

  reset() {
    this.x = 0; this.y = 0;
    this.dir = 0;                // heading, see HEADINGS
    this.speed = 0;              // px/s down the hill (always >= 0)
    this.across = 0;             // px/s sideways
    this.state = 'ski';          // ski | air | fallen | eaten
    this.stateT = 0;             // time left in air or fallen
    this.airMax = 0;
    this.tricked = false;
    this.boosting = false;
    this.time = 0;
    this.style = 0;
    this.gates = 0;
    this.falls = 0;
    this.jumps = 0;
    this.bear = null;            // { x, y, run: seconds spent running, chew: seconds spent eating }
    this.events = [];            // what just happened, for the sound and the status line; the caller drains it
    this.hit = new Set();        // objects already used up (a ramp you jumped, a gate you went through)
    this.rng = mulberry(this.seed ^ 0x9e3779b9);
  }

  get dist() { return Math.max(0, Math.floor(this.y / PX_PER_M)); }
  get over() { return this.state === 'eaten'; }
  get score() { return this.style + this.dist; }
  get mps() { return Math.round(Math.hypot(this.speed, this.across) / PX_PER_M); }

  /* ---------- the hill ---------- */

  band(k) {
    let list = this.bands.get(k);
    if (list) return list;
    const rng = mulberry(this.seed + Math.imul(k, 0x45d9f3b));
    list = [];
    const y0 = k * BAND;
    if (y0 + BAND > CLEAR) {
      const depth = Math.min(1, Math.max(0, y0 - CLEAR) / (60 * PX_PER_M * 10)); // thickens over the first kilometre or so
      const n = 3 + Math.floor(rng() * 3) + Math.floor(depth * 3);
      for (let i = 0; i < n; i++) {
        const r = rng();
        const kind = r < 0.34 ? 'tree' : r < 0.5 ? 'pine' : r < 0.58 ? 'stump' : r < 0.68 ? 'rock' : r < 0.86 ? 'mogul' : 'ramp';
        list.push({ id: `${k}:${i}`, kind, x: Math.round((rng() * 2 - 1) * SPREAD), y: Math.round(y0 + rng() * BAND) });
      }
      if (rng() < 0.18) list.push({ id: `${k}:g`, kind: 'gate', x: Math.round((rng() * 2 - 1) * SPREAD * 0.5), y: Math.round(y0 + rng() * BAND) });
    }
    list.sort((a, b) => a.y - b.y);
    this.bands.set(k, list);
    if (this.bands.size > 80) for (const key of this.bands.keys()) { if (key < k - 20) this.bands.delete(key); }
    return list;
  }

  // every object in a box of the hill
  objectsIn(x0, y0, x1, y1) {
    const out = [];
    for (let k = Math.floor(y0 / BAND) - 1; k <= Math.floor(y1 / BAND); k++) {
      if (k < 0) continue;
      for (const o of this.band(k)) {
        if (o.x >= x0 - 40 && o.x <= x1 + 40 && o.y >= y0 - 40 && o.y <= y1 + 40) out.push(o);
      }
    }
    return out;
  }

  /* ---------- controls ---------- */

  // turn one step left (-1) or right (+1)
  turn(d) {
    if (this.state !== 'ski') return;
    this.dir =Math.max(-3, Math.min(3, this.dir + d));
  }

  straight() { if (this.state === 'ski') this.dir = 0; }

  // while you are stopped across the hill, up walks you up it a little
  up() {
    if (this.state === 'air') this.trick();
    else if (this.state === 'ski' && Math.abs(this.dir) === 3 && this.speed < 5) this.y -= 6;
  }

  boost(on) { this.boosting = !!on; }

  trick() {
    if (this.state !== 'air' || this.tricked) return false;
    this.tricked = true;
    this.style += 75;
    this.events.push('trick');
    return true;
  }

  /* ---------- the clock ---------- */

  step(dt) {
    if (this.over) { if (this.bear) this.bear.chew += dt; return; }
    this.time += dt;
    this.events.length = 0;

    if (this.state === 'fallen') {
      this.speed = 0; this.across = 0;
      this.stateT -= dt;
      if (this.stateT <= 0) { this.state = 'ski'; this.dir = 0; }
    } else {
      this.move(dt);
    }
    this.updateBear(dt);
  }

  move(dt) {
    const h = HEADINGS[Math.abs(this.dir)];
    const side = Math.sign(this.dir);
    const top = MAX_SPEED * h.down * (this.boosting && this.dir === 0 ? BOOST : 1);
    if (this.state === 'air') { // you keep what you had
      this.stateT -= dt;
      if (this.stateT <= 0) this.land();
    } else if (this.speed < top) {
      this.speed = Math.min(top, this.speed + 90 * dt);
    } else {
      this.speed = Math.max(top, this.speed - (h.down === 0 ? 260 : 120) * dt);
    }
    this.across = side * this.speed * h.across;
    const sy = this.speed, sx = this.across;
    // move in small steps, so a fast skier can't skip over a tree
    const steps = Math.max(1, Math.ceil(Math.hypot(sx, sy) * dt / 4));
    for (let i = 0; i < steps && this.state !== 'fallen'; i++) {
      this.x += (sx * dt) / steps;
      this.y += (sy * dt) / steps;
      this.touch();
    }
  }

  land() {
    this.state = 'ski';
    this.events.push('land');
    this.style += Math.round(this.airMax * 10);
  }

  touch() {
    for (const o of this.objectsIn(this.x - 24, this.y - 24, this.x + 24, this.y + 24)) {
      const k = KINDS[o.kind];
      if (o.kind === 'gate') {
        if (!this.hit.has(o.id) && this.y >= o.y && this.y - o.y < 8) {
          this.hit.add(o.id);
          if (Math.abs(this.x - o.x) < GATE_HALF) { this.gates++; this.style += 50; this.events.push('gate'); }
        }
        continue;
      }
      if (Math.abs(this.x - o.x) > k.w / 2 + 3 || Math.abs(this.y - o.y) > k.h / 2 + 2) continue;
      if (this.state === 'air') continue; // sailing over it
      if (k.solid) {
        if (this.hit.has(o.id)) continue; // you fell over this one already, and have got up still standing on it
        this.hit.add(o.id);
        this.state = 'fallen'; this.stateT = 1.3; this.falls++;
        this.speed = 0; this.across = 0;
        this.events.push('crash');
        return;
      }
      if (this.hit.has(o.id)) continue;
      this.hit.add(o.id);
      if (o.kind === 'ramp') {
        const air = 0.55 + Math.min(0.5, this.speed / 440);
        this.state = 'air'; this.stateT = air; this.airMax = air; this.tricked = false; this.jumps++;
        this.events.push('jump');
      } else { // a mogul: a small hop, and it takes the speed off
        this.state = 'air'; this.stateT = 0.2; this.airMax = 0.2; this.tricked = true;
        this.speed *= 0.82;
        this.style += 2;
        this.events.push('bump');
      }
    }
  }

  // height of the skier above the snow, 0..1, for drawing
  get lift() {
    if (this.state !== 'air' || !this.airMax) return 0;
    const t = 1 - this.stateT / this.airMax;
    return Math.sin(Math.PI * Math.min(1, Math.max(0, t))) * (this.airMax > 0.3 ? 1 : 0.35);
  }

  updateBear(dt) {
    if (!this.bear && this.dist >= BEAR_AT_M) {
      const side = this.rng() < 0.5 ? -1 : 1;
      this.bear = { x: this.x + side * 220, y: this.y - 260, run: 0, chew: 0 };
      this.events.push('bear');
    }
    const b = this.bear;
    if (!b) return;
    const dx = this.x - b.x, dy = this.y - b.y, d = Math.hypot(dx, dy);
    b.run += dt;
    if (d <= CATCH) { this.state = 'eaten'; this.speed = 0; this.across = 0; this.events.push('eaten'); return; }
    // faster than a skier standing still, slower than one skiing straight; it takes a shortcut when you are far ahead
    const v = BEAR_SPEED * (d > 400 ? 1.25 : 1);
    b.x += (dx / d) * v * dt;
    b.y += (dy / d) * v * dt;
  }
}
