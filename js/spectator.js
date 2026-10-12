// Spectator mode: K-Rad and n00bslayer, at the two PCs on the right-hand wall, play DOOM against each other all night.
//
// Nobody is at the keyboard. Two bots boot the game, find each other over IPX, fight a deathmatch to the frag limit,
// look at the scores, load the next map and do it again, for as long as the page is open. What you see on each CRT is
// what that player sees: the first-person view from their own eyes, so walking up behind K-Rad shows you K-Rad's
// match, and the PC next to it shows the same fight from the other side.
//
// This is not the real DOOM running (that needs a seat and a player). It is a small raycaster of our own, drawn only
// from the palette in css/tokens.css, with made-up maps, made-up fighters and nothing from the game's art or data.
//
// There is no DOM in here. The sim (Deathmatch) steps at 35 tics a second, as DOOM did, whatever the frame rate; the
// picture (drawScreen) is drawn into any 2D canvas context. node tools/spectator.test.mjs plays it for hours of
// game time and checks the maps, the matches and that every colour it paints is a token.

export const TIC_RATE = 35;
const TIC = 1 / TIC_RATE;
export const FRAG_LIMIT = 8;
export const TIME_LIMIT = 200;     // seconds, then whoever is ahead wins (a draw plays on until the next frag)
export const INTERMISSION = 7;     // seconds on the scores
export const BOOT_FIRST = 9;       // seconds from the DOS prompt to the first map
export const BOOT_NEXT = 5;        // seconds between maps
export const RESPAWN = 2;          // seconds dead
const MAX_STEP = 0.25;             // a tab that was asleep does not get to run the match in one go
const RADIUS = 0.25, SPEED = 3.0, TURN = 3.2;
const FIRE_GAP = 5;                // tics between shots
const ITEM_BACK = 20;              // seconds for a pickup to come back

export const PLAYERS = [
  { name: 'K-Rad', shirt: '#2b6fd6', mac: '00:A0:24:3F:11:9C' },        // --shirt-2, as on their avatar
  { name: 'n00bslayer', shirt: '#3aa35a', mac: '00:60:08:B2:4E:07' },   // --shirt-4
];

/* ---------- the arenas ----------
   '#' grey panel, '2' wood, '3' steel, '4' ember, '.' floor, S spawn, H medikit, A ammo, V armour vest.
   Invented layouts: nothing here is a map from any game. */
const MAP_DEFS = [
  { name: 'HANGAR 3', rows: [
    '######################',
    '#S.......#..#.......S#',
    '#.....H..#..#........#',
    '#........2..2....A...#',
    '#...##........##.....#',
    '#.......33.3.........#',
    '#.......3..3.........#',
    '#...A...3..3...H.....#',
    '#.......33.3.........#',
    '#...##........##.....#',
    '#...##...............#',
    '#........4..4....A...#',
    '#........4..4........#',
    '#..H.....#..#...V....#',
    '#S.......#..#.......S#',
    '######################',
  ] },
  { name: 'COOLING TOWER', rows: [
    '######################',
    '#S.......#....#.....S#',
    '#........#..H.#......#',
    '#..A.....4....4......#',
    '#........#....#......#',
    '#...##...#....#...##.#',
    '#...##..........##...#',
    '#.........22.........#',
    '#.........22.........#',
    '#...##..........##...#',
    '#...##...#....#...##.#',
    '#........#....#......#',
    '#..H.....4....4....A.#',
    '#........#..A.#...V..#',
    '#S.......#....#.....S#',
    '######################',
  ] },
  { name: 'THE CELLAR', rows: [
    '######################',
    '#S.........2.........#',
    '#..........2...H.....#',
    '#..222.....2.........#',
    '#..2.........222.....#',
    '#..2....A....2.......#',
    '#....................#',
    '#.....V..3333...2....#',
    '#........3..3...2....#',
    '#....2...3..3........#',
    '#....2.......H.......#',
    '#........222.....A...#',
    '#...........2........#',
    '#.....H.....2......S.#',
    '#S...................#',
    '######################',
  ] },
];

const WALL_TILE = { '#': 1, '2': 2, '3': 3, '4': 4 };

function parseMap(def) {
  const h = def.rows.length, w = def.rows[0].length;
  const cells = new Uint8Array(w * h), spawns = [], items = [];
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const ch = def.rows[y][x];
    if (WALL_TILE[ch]) cells[y * w + x] = WALL_TILE[ch];
    else if (ch === 'S') spawns.push({ x: x + 0.5, y: y + 0.5 });
    else if (ch === 'H' || ch === 'A' || ch === 'V') items.push({ x: x + 0.5, y: y + 0.5, kind: ch });
  }
  return { name: def.name, w, h, cells, spawns, items };
}
export const MAPS = MAP_DEFS.map(parseMap);

const angleDiff = (to, from) => { let d = to - from; while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI; return d; };
const wrap = (a) => angleDiff(a, 0);
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

/* ---------- the match ---------- */

export class Deathmatch {
  constructor({ rng = Math.random } = {}) {
    this.rng = rng;
    this.acc = 0;
    this.clock = 0;                // seconds of game time
    this.matchNo = 0;
    this.wins = [0, 0];
    this.mapIndex = 0;
    this.last = null;              // the result of the match before: { winner, frags, deaths, mapName }
    this.fighters = [];
    this.items = [];
    this.startBoot(true);
  }

  update(dt) {
    this.acc += Math.min(Math.max(dt, 0), MAX_STEP);
    while (this.acc >= TIC) { this.acc -= TIC; this.tick(); }
  }

  startBoot(first) {
    this.phase = 'boot';
    this.phaseT = 0;
    this.first = first;
    this.bootFor = first ? BOOT_FIRST : BOOT_NEXT;
    this.map = MAPS[this.mapIndex % MAPS.length];
  }

  startMatch() {
    this.phase = 'play';
    this.phaseT = 0;
    this.matchNo++;
    this.map = MAPS[this.mapIndex % MAPS.length];
    const order = this.rng() < 0.5 ? [0, 1] : [1, 0];
    this.fighters = PLAYERS.map((p, i) => this.makeFighter(i, p, this.map.spawns[order[i] * (this.map.spawns.length - 1)]));
    this.items = this.map.items.map((it) => ({ ...it, up: true, wait: 0 }));
    for (const f of this.fighters) this.face(f);
  }

  makeFighter(i, p, at) {
    return {
      i, name: p.name, shirt: p.shirt, x: at.x, y: at.y, a: 0, hp: 100, armor: 0, ammo: 100,
      frags: 0, deaths: 0, alive: true, deadT: 0, cool: 0, flash: 0, hurt: 0, bonus: 0, bobT: 0, moving: 0,
      msg: '', msgT: 0, goal: null, field: null, planT: 0, strafe: this.rng() < 0.5 ? 1 : -1, strafeT: 10,
      memory: null, memoryT: 0, still: 0, lastX: at.x, lastY: at.y, sees: false,
    };
  }

  face(f) { // toward the middle of the map
    f.a = Math.atan2(this.map.h / 2 - f.y, this.map.w / 2 - f.x);
  }

  tick() {
    this.clock += TIC;
    this.phaseT += TIC;
    if (this.phase === 'boot') {
      if (this.phaseT >= this.bootFor) this.startMatch();
      return;
    }
    if (this.phase === 'intermission') {
      if (this.phaseT >= INTERMISSION) this.startBoot(false);
      return;
    }
    // play
    const order = Math.round(this.phaseT * TIC_RATE) % 2 ? [1, 0] : [0, 1];   // nobody gets to act first every tic
    for (const i of order) this.think(this.fighters[i]);
    for (const it of this.items) if (!it.up && (it.wait -= TIC) <= 0) it.up = true;
    const [a, b] = this.fighters;
    if (this.phase === 'play') {
      if (a.frags >= FRAG_LIMIT || b.frags >= FRAG_LIMIT) this.endMatch();
      else if (this.phaseT >= TIME_LIMIT && a.frags !== b.frags) this.endMatch();
    }
  }

  endMatch() {
    const [a, b] = this.fighters;
    const winner = a.frags > b.frags ? 0 : 1;
    this.wins[winner]++;
    this.last = { winner, frags: [a.frags, b.frags], deaths: [a.deaths, b.deaths], mapName: this.map.name };
    this.phase = 'intermission';
    this.phaseT = 0;
    this.mapIndex++;
  }

  /* ----- the world ----- */

  solid(x, y) {
    const m = this.map, cx = Math.floor(x), cy = Math.floor(y);
    return cx < 0 || cy < 0 || cx >= m.w || cy >= m.h || m.cells[cy * m.w + cx] !== 0;
  }
  blocked(x, y) {
    const r = RADIUS;
    return this.solid(x - r, y - r) || this.solid(x + r, y - r) || this.solid(x - r, y + r) || this.solid(x + r, y + r);
  }
  los(ax, ay, bx, by) {
    const d = Math.hypot(bx - ax, by - ay), n = Math.max(1, Math.ceil(d / 0.1));
    for (let k = 1; k < n; k++) if (this.solid(ax + (bx - ax) * k / n, ay + (by - ay) * k / n)) return false;
    return true;
  }
  move(f, dx, dy) {
    if (!this.blocked(f.x + dx, f.y)) f.x += dx;
    if (!this.blocked(f.x, f.y + dy)) f.y += dy;
  }

  // distance, in steps, from every floor cell to the goal's cell (8 ways, no cutting a corner)
  bfs(gx, gy) {
    const m = this.map, field = new Int16Array(m.w * m.h).fill(-1), queue = [];
    const start = Math.floor(gy) * m.w + Math.floor(gx);
    field[start] = 0; queue.push(start);
    for (let q = 0; q < queue.length; q++) {
      const c = queue[q], cx = c % m.w, cy = (c / m.w) | 0;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        if (!dx && !dy) continue;
        const nx = cx + dx, ny = cy + dy;
        if (nx < 0 || ny < 0 || nx >= m.w || ny >= m.h || m.cells[ny * m.w + nx] || field[ny * m.w + nx] >= 0) continue;
        if (dx && dy && (m.cells[cy * m.w + nx] || m.cells[ny * m.w + cx])) continue;
        field[ny * m.w + nx] = field[c] + 1;
        queue.push(ny * m.w + nx);
      }
    }
    return field;
  }

  // the direction to walk to get to the goal: the lowest neighbouring cell on its field
  heading(f) {
    const g = f.goal;
    if (!g) return f.a;
    const m = this.map, cx = Math.floor(f.x), cy = Math.floor(f.y);
    let best = f.field[cy * m.w + cx], bx = -1, by = -1;
    if (best < 0) return Math.atan2(g.y - f.y, g.x - f.x);
    if (best === 0) return Math.atan2(g.y - f.y, g.x - f.x);
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      if (!dx && !dy) continue;
      const nx = cx + dx, ny = cy + dy;
      if (nx < 0 || ny < 0 || nx >= m.w || ny >= m.h || m.cells[ny * m.w + nx]) continue;
      if (dx && dy && (m.cells[cy * m.w + nx] || m.cells[ny * m.w + cx])) continue;
      const v = m.cells[ny * m.w + nx] ? -1 : f.field[ny * m.w + nx];
      if (v >= 0 && v < best) { best = v; bx = nx; by = ny; }
    }
    if (bx < 0) return Math.atan2(g.y - f.y, g.x - f.x);
    return Math.atan2(by + 0.5 - f.y, bx + 0.5 - f.x);
  }

  nearestItem(f, kind) {
    let best = null, bd = Infinity;
    for (const it of this.items) {
      if (it.kind !== kind || !it.up) continue;
      const d = Math.hypot(it.x - f.x, it.y - f.y);
      if (d < bd) { bd = d; best = it; }
    }
    return best && { x: best.x, y: best.y, kind };
  }

  randomCell(f) {
    const m = this.map;
    for (let tries = 0; tries < 40; tries++) {
      const x = 1 + Math.floor(this.rng() * (m.w - 2)), y = 1 + Math.floor(this.rng() * (m.h - 2));
      if (m.cells[y * m.w + x] === 0 && Math.hypot(x + 0.5 - f.x, y + 0.5 - f.y) > 5) return { x: x + 0.5, y: y + 0.5, kind: 'roam' };
    }
    return { x: m.w / 2 + 0.5, y: m.h / 2 + 0.5, kind: 'roam' };
  }

  chooseGoal(f, e) {
    let g = null;
    if (f.hp < 40) g = this.nearestItem(f, 'H');
    if (!g && f.armor === 0 && f.hp < 70 && this.rng() < 0.5) g = this.nearestItem(f, 'V');
    if (!g && f.ammo < 25) g = this.nearestItem(f, 'A');
    if (!g && f.memory) g = { x: f.memory.x, y: f.memory.y, kind: 'chase' };
    if (!g && f.goal?.kind === 'roam' && Math.hypot(f.goal.x - f.x, f.goal.y - f.y) > 0.9) g = f.goal;
    if (!g) {
      const it = this.rng() < 0.35 ? this.items.filter((i) => i.up)[Math.floor(this.rng() * this.items.length)] : null;
      g = it ? { x: it.x, y: it.y, kind: 'roam' } : this.randomCell(f);
    }
    return g;
  }

  say(f, text) { f.msg = text; f.msgT = 3 * TIC_RATE; }

  respawn(f) {
    const e = this.fighters[1 - f.i];
    const far = [...this.map.spawns].sort((a, b) => Math.hypot(b.x - e.x, b.y - e.y) - Math.hypot(a.x - e.x, a.y - e.y));
    const at = far[Math.floor(this.rng() * Math.min(2, far.length))];
    Object.assign(f, { x: at.x, y: at.y, hp: 100, armor: 0, ammo: Math.max(f.ammo, 50), alive: true, deadT: 0, cool: 0, flash: 0, hurt: 0, goal: null, memory: null, memoryT: 0, planT: 0, lastX: at.x, lastY: at.y, still: 0 });
    this.face(f);
  }

  /* ----- one bot, one tic ----- */

  think(f) {
    const e = this.fighters[1 - f.i];
    if (f.cool > 0) f.cool--;
    if (f.flash > 0) f.flash--;
    if (f.hurt > 0) f.hurt--;
    if (f.bonus > 0) f.bonus--;
    if (f.msgT > 0) f.msgT--;
    if (!f.alive) {
      f.deadT++;
      if (f.deadT >= RESPAWN * TIC_RATE) this.respawn(f);
      return;
    }

    const dx = e.x - f.x, dy = e.y - f.y, d = Math.hypot(dx, dy), bearing = Math.atan2(dy, dx);
    const off = angleDiff(bearing, f.a);
    const clear = e.alive && this.los(f.x, f.y, e.x, e.y);
    f.sees = clear && (Math.abs(off) < 1.3 || d < 2.5);
    if (f.sees) { f.memory = { x: e.x, y: e.y }; f.memoryT = 70; }
    else if (f.memoryT > 0) { f.memoryT--; if (f.memoryT === 0) f.memory = null; }

    if (--f.planT <= 0 || !f.goal) {
      f.planT = 12 + Math.floor(this.rng() * 8);
      const g = this.chooseGoal(f, e);
      if (!f.goal || g.x !== f.goal.x || g.y !== f.goal.y) f.field = this.bfs(g.x, g.y);
      f.goal = g;
    }
    if (f.goal.kind === 'roam' && Math.hypot(f.goal.x - f.x, f.goal.y - f.y) < 0.7) f.planT = 0;

    // where to go, and where to look
    let go = null, sp = 1;
    const errands = f.goal.kind === 'H' || f.goal.kind === 'V' || f.goal.kind === 'A';
    if (f.sees && !(errands && f.hp < 40)) {
      if (d > 6) go = this.heading(f);
      else if (d < 2.4) { go = bearing + Math.PI; sp = 0.7; }
      else {
        go = bearing + f.strafe * Math.PI / 2; sp = 0.85;
        if (--f.strafeT <= 0) { f.strafe = this.rng() < 0.6 ? -f.strafe : f.strafe; f.strafeT = 12 + Math.floor(this.rng() * 30); }
      }
    } else go = this.heading(f);
    const aim = f.sees ? bearing + (this.rng() - 0.5) * 0.08 * Math.min(d, 8) / 4 : go;
    const err = angleDiff(aim, f.a);
    f.a = wrap(f.a + Math.sign(err) * Math.min(Math.abs(err), TURN * TIC * (f.sees ? 1.7 : 1)));
    if (!f.sees && Math.abs(err) > 0.9) sp *= 0.25;

    const step = SPEED * sp * TIC;
    const before = f.x + f.y * 1000;
    this.move(f, Math.cos(go) * step, Math.sin(go) * step);
    if (d < 0.55) this.move(f, -dx / d * 0.04, -dy / d * 0.04);     // do not stand inside each other
    f.moving = sp;
    f.bobT += sp * 0.45;
    if (f.x + f.y * 1000 === before) f.still++; else f.still = 0;
    if (f.still > 20) { f.still = 0; f.planT = 0; f.goal = null; f.strafe = -f.strafe; }   // wedged on a corner: think again

    // pickups
    for (const it of this.items) {
      if (!it.up || Math.hypot(it.x - f.x, it.y - f.y) > 0.6) continue;
      if (it.kind === 'H' && f.hp < 100) { f.hp = Math.min(100, f.hp + 25); this.say(f, 'Picked up a medikit.'); }
      else if (it.kind === 'A' && f.ammo < 200) { f.ammo = Math.min(200, f.ammo + 50); this.say(f, 'Picked up a box of ammo.'); }
      else if (it.kind === 'V' && f.armor < 100) { f.armor = Math.min(100, f.armor + 50); this.say(f, 'Picked up an armour vest.'); }
      else continue;
      it.up = false; it.wait = ITEM_BACK; f.bonus = 6;
    }

    // fire
    if (f.sees && e.alive && f.ammo > 0 && f.cool === 0 && Math.abs(angleDiff(bearing, f.a)) < 0.14 + 0.35 / Math.max(d, 1)) {
      f.cool = FIRE_GAP; f.ammo--; f.flash = 2;
      const chance = clamp(0.78 - d * 0.05 - Math.abs(angleDiff(bearing, f.a)) * 1.6, 0.1, 0.75);
      if (this.rng() < chance) this.hit(f, e, 5 * (1 + Math.floor(this.rng() * 3)));
    }
  }

  hit(by, f, dmg) {
    const soak = f.armor > 0 ? Math.min(f.armor, Math.floor(dmg / 3)) : 0;
    f.armor -= soak;
    f.hp -= dmg - soak;
    f.hurt = 6;
    if (!f.memory) { f.memory = { x: by.x, y: by.y }; f.memoryT = 70; }   // somebody is shooting at you: look for them
    if (f.hp > 0) return;
    f.hp = 0; f.alive = false; f.deadT = 0; f.deaths++;
    by.frags++;
    this.say(by, `You fragged ${f.name}.`);
    this.say(f, `${by.name} fragged you.`);
  }

  // the colour a CRT throws into a dark room, and how strongly: [hex, gain]
  glow(i) {
    const f = this.fighters[i];
    if (this.phase === 'boot') return [0x9dff7a, 0.9];                     // --phosphor
    if (this.phase === 'intermission' || !f) return [0xffcc00, 0.8];       // --amber
    if (!f.alive) return [0xe2231a, 1.1];                                  // --volt
    if (f.hurt > 0) return [0xe2231a, 1.3];
    if (f.flash > 0) return [0xffcc00, 1.5];
    return [0xaaaaaa, 1.0];                                                // --dos-grey
  }
}

/* ---------- the picture ---------- */

const VIEW_H = 200;           // the 3D view; the status bar takes the rest of the 240
const COL = 2;                // pixels per ray: the chunky look of a 90s mode
const PLANE = 0.95;           // how wide the view is: about 87 degrees
const MSG_COLOR = '#ffe066';  // --toast

// every colour the picture paints, so tools/spectator.test.mjs can check each is a token in css/tokens.css
const C = {
  black: '#000000',      // --crt-black
  dark: '#0a0a0a',       // --w98-dark
  grey: '#808080',       // --w98-shadow
  dos: '#aaaaaa',        // --dos-grey
  white: '#ffffff',      // --w98-light
  phosphor: '#9dff7a',   // --phosphor
  amber: '#ffcc00',      // --amber
  toast: MSG_COLOR,
  volt: '#e2231a',       // --volt
  pepperoni: '#b22a1e',  // --pepperoni
  wood: '#4a2c17',       // --wood
  woodDark: '#24150b',   // --wood-dark
  oak: '#8a5a2e',        // --oak
  carpet: '#3b2f2a',     // --carpet
  tube: '#3d4146',       // --power-tube-off: the ceiling
  steel: '#46697a',      // --poster-steel
  steelLight: '#8fb1c0', // --poster-steel-light
  space: '#0b1033',      // --poster-space
  ember: '#7a1a12',      // --poster-ember
  paper: '#e8e1cc',      // --paper
  green: '#3aa35a',      // --floppy-green
  lime: '#b5d334',       // --zap-lime
  console: '#9a9da1',    // --console-body
  consoleDark: '#44474b',// --console-dark
  skin: '#e0b48f',       // --skin
  hair: '#3b2716',       // --hair
  denim: '#2c3e66',      // --denim
  shoe: '#1a1a1a',       // --shoe
  cardboard: '#b8935a',  // --cardboard
};
export const PALETTE = Object.values(C).concat(PLAYERS.map((p) => p.shirt));

const WALLS = {
  1: { base: C.grey, hi: C.dos, lo: C.dark },
  2: { base: C.wood, hi: C.oak, lo: C.woodDark },
  3: { base: C.steel, hi: C.steelLight, lo: C.space },
  4: { base: C.ember, hi: C.pepperoni, lo: C.woodDark },
};

const shade = (g, a, x, y, w, h) => {
  if (a <= 0.01 || h <= 0) return;
  g.fillStyle = `rgba(0, 0, 0, ${Math.min(0.9, a).toFixed(2)})`;
  g.fillRect(x, y, w, h);
};
const rect = (g, color, x, y, w, h) => { if (w > 0 && h > 0) { g.fillStyle = color; g.fillRect(x, y, w, h); } };

const zbuf = new Float32Array(512);

// [x0, x1, y0, y1, colour]: x across the sprite from -0.5 to 0.5, y down it from 0 to 1
const marine = (shirt, firing) => {
  const p = [
    [-0.22, -0.04, 0.62, 0.93, C.denim], [0.04, 0.22, 0.62, 0.93, C.denim],
    [-0.24, -0.02, 0.93, 1.0, C.shoe], [0.02, 0.24, 0.93, 1.0, C.shoe],
    [-0.30, 0.30, 0.30, 0.64, shirt],
    [-0.46, -0.30, 0.32, 0.58, shirt], [0.30, 0.46, 0.32, 0.58, shirt],
    [-0.46, -0.30, 0.58, 0.66, C.skin], [0.30, 0.46, 0.58, 0.66, C.skin],
    [-0.12, 0.12, 0.08, 0.30, C.skin], [-0.14, 0.14, 0.04, 0.12, C.hair],
    [-0.06, 0.10, 0.44, 0.56, C.consoleDark],
  ];
  if (firing) p.push([-0.04, 0.08, 0.38, 0.46, C.amber]);
  return p;
};
const corpse = (shirt) => [
  [-0.62, 0.62, 0.86, 1.0, C.pepperoni], [-0.5, 0.36, 0.7, 0.92, shirt], [0.36, 0.5, 0.72, 0.9, C.skin], [-0.5, -0.4, 0.74, 0.9, C.shoe],
];
const ITEM_SPRITES = {
  H: [[-0.42, 0.42, 0.45, 1.0, C.paper], [-0.08, 0.08, 0.5, 0.95, C.green], [-0.3, 0.3, 0.66, 0.78, C.green]],
  A: [[-0.42, 0.42, 0.5, 1.0, C.consoleDark], [-0.34, -0.14, 0.15, 0.5, C.amber], [-0.1, 0.1, 0.15, 0.5, C.amber], [0.14, 0.34, 0.15, 0.5, C.amber]],
  V: [[-0.42, 0.42, 0.25, 1.0, C.green], [-0.3, 0.3, 0.38, 0.5, C.lime], [-0.3, 0.3, 0.7, 0.82, C.lime]],
};

function drawView(g, sim, i, o) {
  const w = o.w, f = sim.fighters[i], map = sim.map, cols = Math.floor(w / COL);
  const secs = f.deadT / TIC_RATE;
  const eye = f.alive ? 0.5 : Math.max(0.12, 0.5 - secs * 0.5);
  const bob = f.alive ? Math.sin(f.bobT) * f.moving * 3 : 0;
  const hz = Math.round(VIEW_H / 2 + bob);

  rect(g, C.tube, 0, 0, w, hz);
  rect(g, C.carpet, 0, hz, w, VIEW_H - hz);
  for (let k = 0; k < 6; k++) {   // the far end of the room is darker
    const a = 0.62 - k * 0.1;
    shade(g, a, 0, hz - (k + 1) * (hz / 6), w, hz / 6 + 1);
    shade(g, a, 0, hz + k * ((VIEW_H - hz) / 6), w, (VIEW_H - hz) / 6 + 1);
  }

  const dirX = Math.cos(f.a), dirY = Math.sin(f.a), planeX = -dirY * PLANE, planeY = dirX * PLANE;
  for (let c = 0; c < cols; c++) {
    const cam = 2 * c / cols - 1, rx = dirX + planeX * cam, ry = dirY + planeY * cam;
    let mx = Math.floor(f.x), my = Math.floor(f.y);
    const ddx = rx === 0 ? 1e30 : Math.abs(1 / rx), ddy = ry === 0 ? 1e30 : Math.abs(1 / ry);
    const stepX = rx < 0 ? -1 : 1, stepY = ry < 0 ? -1 : 1;
    let sideX = rx < 0 ? (f.x - mx) * ddx : (mx + 1 - f.x) * ddx, sideY = ry < 0 ? (f.y - my) * ddy : (my + 1 - f.y) * ddy;
    let side = 0, tile = 0;
    for (let n = 0; n < 64; n++) {
      if (sideX < sideY) { sideX += ddx; mx += stepX; side = 0; } else { sideY += ddy; my += stepY; side = 1; }
      if (mx < 0 || my < 0 || mx >= map.w || my >= map.h) { tile = 1; break; }
      tile = map.cells[my * map.w + mx];
      if (tile) break;
    }
    const dist = Math.max(0.05, side === 0 ? sideX - ddx : sideY - ddy);
    zbuf[c] = dist;
    let u = side === 0 ? f.y + dist * ry : f.x + dist * rx;
    u -= Math.floor(u);
    const lineH = VIEW_H / dist, top = hz - lineH * (1 - eye), x = c * COL;
    const y0 = Math.max(0, top), y1 = Math.min(VIEW_H, top + lineH);
    if (y1 <= y0) continue;
    const t = WALLS[tile] ?? WALLS[1];
    rect(g, t.base, x, y0, COL, y1 - y0);
    if (lineH > 8) {
      if (u < 0.04 || (tile === 2 && (u * 3) % 1 < 0.05) || (tile === 3 && Math.abs(u - 0.5) < 0.03)) rect(g, t.lo, x, y0, COL, y1 - y0);
      const th = Math.max(1, lineH * 0.035);
      rect(g, t.hi, x, top, COL, th);
      rect(g, t.lo, x, top + lineH * 0.5, COL, th);
      rect(g, t.lo, x, top + lineH - th, COL, th);
      if (tile === 1) rect(g, t.lo, x, top + lineH * 0.25, COL, th);
    }
    shade(g, dist * 0.085 + (side ? 0.18 : 0), x, y0, COL, y1 - y0);
  }

  // things standing in the room, far ones first
  const inv = 1 / (planeX * dirY - dirX * planeY);
  const sprites = [];
  const add = (wx, wy, parts, size) => {
    const dx = wx - f.x, dy = wy - f.y;
    const tx = inv * (dirY * dx - dirX * dy), ty = inv * (-planeY * dx + planeX * dy);
    if (ty > 0.2) sprites.push({ tx, ty, parts, size });
  };
  for (const it of sim.items) if (it.up) add(it.x, it.y, ITEM_SPRITES[it.kind], 0.3);
  const e = sim.fighters[1 - i];
  if (e) add(e.x, e.y, e.alive ? marine(e.shirt, e.flash > 0) : corpse(e.shirt), e.alive ? 0.85 : 0.35);
  sprites.sort((a, b) => b.ty - a.ty);
  for (const s of sprites) {
    const unit = VIEW_H / s.ty, hs = unit * s.size, ws = hs * (s.size > 0.5 ? 0.55 : 1.4);
    const sx = (w / 2) * (1 + s.tx / (s.ty * PLANE)), bottom = hz + unit * eye, topY = bottom - hs;
    for (const [x0, x1, y0, y1, color] of s.parts) {
      const px0 = Math.round(sx + x0 * ws), px1 = Math.round(sx + x1 * ws), py0 = Math.round(topY + y0 * hs), py1 = Math.round(topY + y1 * hs);
      if (px1 <= px0 || py1 <= py0) continue;
      for (let c = Math.max(0, Math.floor(px0 / COL)); c <= Math.min(cols - 1, Math.floor((px1 - 1) / COL)); c++) {
        if (zbuf[c] < s.ty) continue;
        const xa = Math.max(px0, c * COL), xb = Math.min(px1, (c + 1) * COL);
        rect(g, color, xa, py0, xb - xa, py1 - py0);
      }
    }
  }

  if (f.alive) { // the gun in your hands
    const gx = Math.round(w / 2 + Math.cos(f.bobT * 0.5) * f.moving * 6), gy = Math.round(VIEW_H - 50 + (f.flash > 0 ? 5 : 0) + Math.abs(Math.sin(f.bobT)) * f.moving * 4);
    rect(g, C.skin, gx - 44, gy + 18, 14, 40); rect(g, C.skin, gx + 30, gy + 18, 14, 40);
    rect(g, C.consoleDark, gx - 30, gy + 6, 60, 50);
    rect(g, C.console, gx - 30, gy + 6, 60, 4);
    rect(g, C.console, gx - 12, gy - 18, 24, 26);
    rect(g, C.dark, gx - 9, gy - 22, 18, 5);
    rect(g, C.dark, gx - 1, gy - 14, 2, 20);
    if (f.flash > 0) { rect(g, C.amber, gx - 9, gy - 36, 18, 14); rect(g, C.white, gx - 4, gy - 42, 8, 8); }
  } else rect(g, 'rgba(226, 35, 26, 0.45)', 0, 0, w, VIEW_H);

  if (f.hurt > 0) rect(g, `rgba(226, 35, 26, ${(f.hurt / 6 * 0.4).toFixed(2)})`, 0, 0, w, VIEW_H);   // --volt
  if (f.bonus > 0) rect(g, `rgba(255, 204, 0, ${(f.bonus / 6 * 0.22).toFixed(2)})`, 0, 0, w, VIEW_H); // --amber
  if (f.flash > 0) rect(g, 'rgba(255, 204, 0, 0.1)', 0, 0, w, VIEW_H);

  if (f.msgT > 0 && f.msg) { // the message line, top left
    text(g, o, f.msg, 9, 21, C.black, 22);
    text(g, o, f.msg, 8, 20, C.toast, 22);
  }
  // the scores, top right
  g.textAlign = 'right';
  const me = sim.fighters[i], them = sim.fighters[1 - i];
  text(g, o, `${me.name} ${me.frags}`, w - 8, 18, C.amber, 18);
  text(g, o, `${them.name} ${them.frags}`, w - 8, 34, C.dos, 18);
  g.textAlign = 'left';

  // the status bar
  const by = VIEW_H, bh = o.h - VIEW_H;
  rect(g, C.woodDark, 0, by, w, bh);
  rect(g, C.wood, 0, by, w, 2);
  const cells = [['AMMO', f.ammo, false], ['HEALTH', `${f.hp}%`, f.hp < 30], ['ARMOR', `${f.armor}%`, false], ['FRAGS', f.frags, false]];
  cells.forEach(([label, value, low], k) => {
    const x = k * (w / 4) + 8;
    text(g, o, label, x, by + 17, C.dos, 18);
    text(g, o, String(value), x, by + 36, low ? C.volt : C.amber, 22);
    if (k) rect(g, C.wood, k * (w / 4) - 2, by + 6, 2, bh - 10);
  });
}

function text(g, o, s, x, y, color, size) {
  g.font = `${size}px ${o.font}`;
  g.fillStyle = color;
  g.fillText(s, x, y);
}

function bootLines(sim, i) {
  const other = PLAYERS[1 - i];
  if (sim.first) return [
    'C:\\>cd \\DOOM', 'C:\\DOOM>ipxsetup -nodes 2 -deathmatch', 'IPX network setup', 'Looking for a node...',
    `Found node [${other.mac}]`, 'Both nodes ready.', `Warping to ${sim.map.name}...`,
  ];
  return ['IPX network game', `Found node [${other.mac}]`, `Next map: ${sim.map.name}`, 'Loading...'];
}

function drawBoot(g, sim, i, o) {
  rect(g, C.black, 0, 0, o.w, o.h);
  const lines = bootLines(sim, i), rate = sim.first ? 2.6 : 3.2;
  const shown = Math.min(lines.length, Math.floor(sim.phaseT * rate) + 1);
  for (let k = 0; k < shown; k++) text(g, o, lines[k], 8, 20 + k * 17, k === 0 && sim.first ? C.dos : k === lines.length - 1 ? C.phosphor : C.dos, 18);
  const t0 = lines.length / rate;                        // the lines are all up; the load bar fills for the rest of the boot
  if (sim.phaseT > t0) {
    const k = clamp((sim.phaseT - t0) / Math.max(0.5, sim.bootFor - t0), 0, 1), y = 20 + lines.length * 17 + 8;
    rect(g, C.dos, 8, y, o.w - 16, 16);
    rect(g, C.black, 10, y + 2, o.w - 20, 12);
    rect(g, C.phosphor, 12, y + 4, (o.w - 24) * k, 8);
  } else if (Math.floor(sim.phaseT * 2) % 2 === 0) rect(g, C.phosphor, 8, 20 + shown * 17 - 12, 9, 12);
}

function drawIntermission(g, sim, i, o) {
  const r = sim.last, w = o.w;
  rect(g, C.black, 0, 0, w, o.h);
  text(g, o, `${r.mapName}`, 12, 34, C.amber, 26);
  text(g, o, 'DEATHMATCH FINISHED', 12, 56, C.dos, 20);
  g.textAlign = 'right';
  for (const [label, x] of [['FRAGS', 170], ['DEATHS', 232], ['WINS', 304]]) text(g, o, label, x, 96, C.dos, 18);
  PLAYERS.forEach((p, k) => {
    const y = 126 + k * 32, win = r.winner === k, col = win ? C.phosphor : C.dos;
    g.textAlign = 'left'; text(g, o, p.name, 12, y, col, 22);
    g.textAlign = 'right';
    text(g, o, String(r.frags[k]), 170, y, col, 22);
    text(g, o, String(r.deaths[k]), 232, y, col, 22);
    text(g, o, String(sim.wins[k]), 304, y, col, 22);
  });
  g.textAlign = 'left';
  rect(g, C.dos, 12, 70, w - 24, 2);
  text(g, o, `${PLAYERS[r.winner].name} wins${r.winner === i ? '.' : '. Oh well.'}`, 12, 190, C.phosphor, 22);
  const next = MAPS[sim.mapIndex % MAPS.length].name;
  text(g, o, `Next: ${next}  ${Math.max(0, Math.ceil(INTERMISSION - sim.phaseT))}`, 12, 222, C.dos, 20);
}

// Draw what the player at PC `i` (0: K-Rad, 1: n00bslayer) sees right now into a 2D context.
// o: { w, h, font } (the CRT is 320x240 and the font is the CRT font)
export function drawScreen(g, sim, i, o) {
  g.textAlign = 'left';
  if (sim.phase === 'boot') drawBoot(g, sim, i, o);
  else if (sim.phase === 'intermission') drawIntermission(g, sim, i, o);
  else drawView(g, sim, i, o);
}
