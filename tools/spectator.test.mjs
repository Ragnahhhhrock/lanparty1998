// node tools/spectator.test.mjs: spectator mode, the endless DOOM deathmatch K-Rad and n00bslayer play on their CRTs.
// The maps, the bots, the match cycle and the picture are checked here with no browser: the sim is played for hours of
// game time, and the picture is drawn into a stand-in canvas that records what it was asked to paint.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  Deathmatch, drawScreen, MAPS, PLAYERS, PALETTE, TIC_RATE, FRAG_LIMIT, TIME_LIMIT, INTERMISSION, BOOT_FIRST, BOOT_NEXT, RESPAWN,
} from '../js/spectator.js';

let n = 0;
const test = (name, fn) => { fn(); n++; console.log(`ok  ${name}`); };

// a repeatable random source
const seeded = (seed) => () => { seed |= 0; seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };

/* ---------- the maps ---------- */

test('every map is a closed rectangle with spawns and pickups on the floor', () => {
  assert.ok(MAPS.length >= 3, 'enough maps to rotate');
  for (const m of MAPS) {
    assert.equal(m.cells.length, m.w * m.h, m.name);
    for (let x = 0; x < m.w; x++) for (const y of [0, m.h - 1]) assert.ok(m.cells[y * m.w + x], `${m.name}: open edge at ${x},${y}`);
    for (let y = 0; y < m.h; y++) for (const x of [0, m.w - 1]) assert.ok(m.cells[y * m.w + x], `${m.name}: open edge at ${x},${y}`);
    assert.ok(m.spawns.length >= 3, `${m.name}: spawns`);
    for (const p of [...m.spawns, ...m.items]) assert.equal(m.cells[Math.floor(p.y) * m.w + Math.floor(p.x)], 0, `${m.name}: ${p.x},${p.y} is in a wall`);
    for (const k of ['H', 'A']) assert.ok(m.items.some((i) => i.kind === k), `${m.name}: has a ${k} pickup`);
  }
});

test('every floor cell of every map can be reached from every spawn', () => {
  const sim = new Deathmatch({ rng: seeded(1) });
  for (const m of MAPS) {
    sim.map = m;
    const floor = m.cells.reduce((k, c) => k + (c === 0 ? 1 : 0), 0);
    for (const s of m.spawns) {
      const field = sim.bfs(s.x, s.y);
      assert.equal(field.filter((v) => v >= 0).length, floor, `${m.name}: a part of the floor is shut off from ${s.x},${s.y}`);
    }
  }
});

test('the spawns can see something of each other, or at least the fighters will meet', () => {
  const sim = new Deathmatch({ rng: seeded(1) });
  for (const m of MAPS) {
    sim.map = m;
    let seen = 0;
    for (const a of m.spawns) for (const b of m.spawns) if (a !== b && sim.los(a.x, a.y, b.x, b.y)) seen++;
    assert.ok(seen > 0, `${m.name}: no two spawns in line of sight`);
  }
});

/* ---------- the match ---------- */

// one update is capped at a quarter of a second, so longer stretches go in small steps
const advance = (sim, seconds) => { for (let t = 0; t < seconds - 1e-9; t += 0.2) sim.update(Math.min(0.2, seconds - t)); };

// plays `seconds` of game time in frames of `frame` seconds, calling each(sim) after every frame
function play(sim, seconds, frame, each) {
  for (let t = 0; t < seconds; t += frame) { sim.update(frame); each?.(sim); }
}

test('it starts at the DOS prompt, boots, plays, shows the scores, loads the next map and goes round again', () => {
  const sim = new Deathmatch({ rng: seeded(7) });
  assert.equal(sim.phase, 'boot');
  assert.equal(sim.first, true, 'the first boot is the long one with ipxsetup');
  const seen = [], maps = new Set();
  let last = '';
  play(sim, 3600, 1 / 12, (s) => { if (s.phase !== last) { seen.push(s.phase); last = s.phase; } if (s.phase === 'play') maps.add(s.map.name); });
  assert.deepEqual(seen.slice(0, 4), ['boot', 'play', 'intermission', 'boot']);
  assert.ok(sim.matchNo >= 12, `matches played in an hour: ${sim.matchNo}`);
  assert.equal(maps.size, MAPS.length, 'every map comes up');
  assert.equal(sim.wins[0] + sim.wins[1], sim.matchNo - (sim.phase === 'play' ? 1 : 0), 'every finished match has a winner');
  assert.equal(sim.first, false, 'later boots are the short one');
});

test('nobody has to be watching for it to go on: hours of game time, no stalls, nothing leaves the map', () => {
  for (const seed of [1, 2, 3, 4, 5]) {
    const sim = new Deathmatch({ rng: seeded(seed) });
    let phaseFor = 0, lastPhase = '', worst = 0;
    play(sim, 4 * 3600, 1 / 12, (s) => {
      phaseFor = s.phase === lastPhase ? phaseFor + 1 / 12 : 0; lastPhase = s.phase;
      worst = Math.max(worst, phaseFor);
      if (s.phase !== 'play') return;   // between matches the fighters still stand where the last map left them
      for (const f of s.fighters) {
        assert.ok(Number.isFinite(f.x) && Number.isFinite(f.y) && Number.isFinite(f.a), `${f.name} is somewhere real`);
        assert.ok(!s.blocked(f.x, f.y) || !f.alive, `${f.name} is inside a wall at ${f.x},${f.y}`);
        assert.ok(f.hp >= 0 && f.hp <= 100 && f.armor >= 0 && f.armor <= 100 && f.ammo >= 0 && f.ammo <= 200, `${f.name} stats`);
      }
    });
    // a match is at most the time limit plus sudden death; nothing sits in a phase for ever
    assert.ok(worst < TIME_LIMIT + 120, `seed ${seed}: a phase went on for ${worst}s`);
    assert.ok(sim.matchNo > 50, `seed ${seed}: only ${sim.matchNo} matches in four hours`);
  }
});

test('both of them fight, both of them frag, both of them win some', () => {
  const sim = new Deathmatch({ rng: seeded(11) });
  let frags = [0, 0], deaths = [0, 0];
  play(sim, 3 * 3600, 1 / 12, (s) => { if (s.phase === 'intermission' && s.phaseT < 0.1) { s.last.frags.forEach((v, i) => { frags[i] += v; }); s.last.deaths.forEach((v, i) => { deaths[i] += v; }); } });
  assert.ok(frags[0] > 100 && frags[1] > 100, `frags ${frags}`);
  assert.deepEqual(frags, deaths.slice().reverse(), 'every frag is the other one\'s death');
  assert.ok(sim.wins[0] > 10 && sim.wins[1] > 10, `wins ${sim.wins}`);
});

test('a match ends on the frag limit, or on the clock with somebody ahead', () => {
  const sim = new Deathmatch({ rng: seeded(21) });
  let checked = 0, ended = new Set();
  play(sim, 3 * 3600, 1 / 12, (s) => {
    if (s.phase === 'intermission' && s.phaseT < 0.1) {
      const [a, b] = s.last.frags;
      assert.notEqual(a, b, 'a match is never a draw');
      assert.equal(s.last.winner, a > b ? 0 : 1);
      const fragged = Math.max(a, b) >= FRAG_LIMIT;
      assert.ok(Math.max(a, b) <= FRAG_LIMIT, 'the first to the limit ends it at once');
      ended.add(fragged ? 'frags' : 'clock');
      checked++;
    }
  });
  assert.ok(checked > 100);
  assert.ok(ended.has('frags'), 'most matches are won on frags');
});

test('the pace is a watchable fight: a frag every so often, not every second, not never', () => {
  const sim = new Deathmatch({ rng: seeded(5) });
  let frags = 0, playSeconds = 0;
  play(sim, 3600, 1 / 12, (s) => { if (s.phase === 'play') playSeconds += 1 / 12; });
  const total = sim.wins.length && 0;
  // count by replaying: total frags are visible through the last results, so use a second run with a counter
  const sim2 = new Deathmatch({ rng: seeded(5) });
  play(sim2, 3600, 1 / 12, (s) => { if (s.phase === 'intermission' && s.phaseT < 0.1) frags += s.last.frags[0] + s.last.frags[1]; });
  const perFrag = playSeconds / frags;
  assert.ok(perFrag > 5 && perFrag < 40, `seconds per frag: ${perFrag.toFixed(1)}`);
});

test('the bots go for medikits and ammo when they need them', () => {
  const sim = new Deathmatch({ rng: seeded(3) });
  advance(sim, BOOT_FIRST + 0.1);
  assert.equal(sim.phase, 'play');
  const f = sim.fighters[0];
  f.hp = 20; f.planT = 0;
  assert.equal(sim.chooseGoal(f, sim.fighters[1]).kind, 'H');
  f.hp = 100; f.ammo = 5;
  assert.equal(sim.chooseGoal(f, sim.fighters[1]).kind, 'A');
  let took = false;
  for (const it of sim.items) if (it.kind === 'H') { f.x = it.x; f.y = it.y; f.hp = 50; sim.think(f); took = !it.up; break; }
  assert.ok(took && f.hp === 75, 'standing on a medikit takes it');
});

test('the dead come back after a couple of seconds, somewhere else', () => {
  const sim = new Deathmatch({ rng: seeded(3) });
  advance(sim, BOOT_FIRST + 0.1);
  const [a, b] = sim.fighters;
  sim.hit(a, b, 500);
  assert.equal(b.alive, false);
  assert.equal(a.frags, 1);
  assert.equal(b.deaths, 1);
  assert.match(a.msg, /fragged n00bslayer/);
  assert.match(b.msg, /K-Rad fragged you/);
  const where = [b.x, b.y];
  advance(sim, RESPAWN - 0.3);
  assert.equal(b.alive, false, 'still down');
  advance(sim, 0.7);
  assert.equal(b.alive, true);
  assert.equal(b.hp, 100);
  assert.notDeepEqual([b.x, b.y], where, 'a spawn point, not the spot they died on');
});

test('armour takes a third of what hits it', () => {
  const sim = new Deathmatch({ rng: seeded(3) });
  advance(sim, BOOT_FIRST + 0.1);
  const [a, b] = sim.fighters;
  b.armor = 50;
  sim.hit(a, b, 15);
  assert.equal(b.hp, 100 - 10);
  assert.equal(b.armor, 45);
});

test('the clock cannot be run away with: a tab that slept for an hour does one step of catching up', () => {
  const sim = new Deathmatch({ rng: seeded(3) });
  sim.update(3600);
  assert.ok(sim.clock <= 0.3, `ran ${sim.clock}s on one update`);
  sim.update(-5);
  sim.update(NaN);
  assert.ok(Number.isFinite(sim.clock));
});

test('the timings are the ones the screens rely on', () => {
  assert.equal(TIC_RATE, 35, 'DOOM ran at 35 tics a second');
  assert.ok(BOOT_FIRST > BOOT_NEXT && INTERMISSION >= 5);
  const sim = new Deathmatch({ rng: seeded(1) });
  sim.update(0.2);
  assert.equal(sim.phase, 'boot');
  advance(sim, BOOT_FIRST + 0.5);
  assert.equal(sim.phase, 'play');
  assert.equal(sim.fighters.length, 2);
  assert.deepEqual(sim.fighters.map((f) => f.name), PLAYERS.map((p) => p.name));
});

/* ---------- the picture ---------- */

const tokens = JSON.parse(readFileSync(new URL('../design/tokens.json', import.meta.url), 'utf8'));
const tokenHex = new Set();
(function walk(o) { for (const v of Object.values(o)) { if (typeof v === 'string' && /^#[0-9a-f]{6}$/i.test(v)) tokenHex.add(v.toLowerCase()); else if (v && typeof v === 'object') walk(v); } })(tokens);

// a canvas that writes down every colour it is given, every rectangle and every string
function recorder() {
  const log = { colors: new Set(), rects: 0, texts: [], bad: [] };
  const g = {
    textAlign: 'left', font: '',
    set fillStyle(v) { log.colors.add(v); this._fill = v; }, get fillStyle() { return this._fill; },
    fillRect(x, y, w, h) { log.rects++; if (![x, y, w, h].every(Number.isFinite)) log.bad.push(`fillRect(${x}, ${y}, ${w}, ${h})`); },
    fillText(s, x, y) { log.texts.push(s); if (!Number.isFinite(x) || !Number.isFinite(y)) log.bad.push(`fillText(${s}, ${x}, ${y})`); },
  };
  return { g, log };
}
const OPTS = { w: 320, h: 240, font: 'VT323' };
const OVERLAY = /^rgba\((0, 0, 0|226, 35, 26|255, 204, 0), (0|1|0?\.\d+)\)$/;   // black shade, --volt, --amber

test('every colour in the palette is a token in css/tokens.css', () => {
  for (const c of PALETTE) assert.ok(tokenHex.has(c.toLowerCase()), `${c} is not a token`);
});

test('every phase draws, for both players, with nothing but token colours and real numbers', () => {
  const sim = new Deathmatch({ rng: seeded(9) });
  const seen = new Set();
  const used = new Set();
  play(sim, 1500, 1 / 12, (s) => {
    for (const i of [0, 1]) {
      const { g, log } = recorder();
      drawScreen(g, s, i, OPTS);
      assert.deepEqual(log.bad, [], `${s.phase}: bad numbers`);
      for (const c of log.colors) { used.add(c); assert.ok(tokenHex.has(String(c).toLowerCase()) || OVERLAY.test(c), `${s.phase}: ${c} is not a token`); }
      for (const t of log.texts) assert.ok(!/undefined|NaN|null/.test(t), `${s.phase}: "${t}"`);
      assert.ok(log.rects >= 1 && log.rects < 4000, `${s.phase}: ${log.rects} rectangles`);
      if (s.phase === 'play') assert.ok(log.rects > 150, `play: only ${log.rects} rectangles, is the room drawn?`);
    }
    seen.add(s.phase + (s.phase === 'boot' && s.first ? '-first' : ''));
  });
  assert.deepEqual([...seen].sort(), ['boot', 'boot-first', 'intermission', 'play']);
  assert.ok(used.size > 12, 'a fair spread of the palette was used');
});

test('the first boot is a DOS prompt running ipxsetup, and each PC finds the other one', () => {
  const sim = new Deathmatch({ rng: seeded(9) });
  const lines = (i) => { const { g, log } = recorder(); advance(sim, BOOT_FIRST - 0.5); drawScreen(g, sim, i, OPTS); return log.texts.join('\n'); };
  const krad = lines(0);
  assert.match(krad, /ipxsetup -nodes 2 -deathmatch/);
  assert.ok(krad.includes(PLAYERS[1].mac) && !krad.includes(PLAYERS[0].mac), 'K-Rad finds n00bslayer\'s node');
  const sim2 = new Deathmatch({ rng: seeded(9) });
  advance(sim2, BOOT_FIRST - 0.5);
  const { g, log } = recorder(); drawScreen(g, sim2, 1, OPTS);
  assert.ok(log.texts.join('\n').includes(PLAYERS[0].mac), 'and the other way round');
});

test('the match screens show your own bar, the score and the message line', () => {
  const sim = new Deathmatch({ rng: seeded(9) });
  advance(sim, BOOT_FIRST + 0.1);
  sim.hit(sim.fighters[1], sim.fighters[0], 500);
  const { g, log } = recorder(); drawScreen(g, sim, 0, OPTS);
  const text = log.texts.join('|');
  for (const word of ['AMMO', 'HEALTH', 'ARMOR', 'FRAGS', 'K-Rad 0', 'n00bslayer 1', 'n00bslayer fragged you']) assert.ok(text.includes(word), `${word} is on the screen: ${text}`);
  const other = recorder(); drawScreen(other.g, sim, 1, OPTS);
  assert.ok(other.log.texts.join('|').includes('You fragged K-Rad'), 'the other screen has the same frag from the other side');
});

test('the intermission shows the result and who is next', () => {
  const sim = new Deathmatch({ rng: seeded(9) });
  advance(sim, BOOT_FIRST + 0.1);
  sim.fighters[0].frags = FRAG_LIMIT - 1;
  sim.hit(sim.fighters[0], sim.fighters[1], 500);
  sim.update(0.1);
  assert.equal(sim.phase, 'intermission');
  const { g, log } = recorder(); drawScreen(g, sim, 1, OPTS);
  const text = log.texts.join('|');
  assert.ok(text.includes('K-Rad wins. Oh well.') && text.includes('Next:') && text.includes('FRAGS') && text.includes('WINS'), text);
  const mine = recorder(); drawScreen(mine.g, sim, 0, OPTS);
  assert.ok(mine.log.texts.join('|').includes('K-Rad wins.|') || mine.log.texts.join('|').includes('K-Rad wins.'), 'the winner is not told "oh well"');
  assert.ok(!mine.log.texts.join('|').includes('Oh well'));
});

test('drawing is cheap enough for two CRTs at twelve frames a second', () => {
  const sim = new Deathmatch({ rng: seeded(9) });
  advance(sim, BOOT_FIRST + 0.1);
  const { g, log } = recorder();
  const t0 = performance.now();
  for (let k = 0; k < 200; k++) { sim.update(1 / 12); drawScreen(g, sim, k % 2, OPTS); }
  const ms = (performance.now() - t0) / 200;
  assert.ok(ms < 2, `${ms.toFixed(2)} ms a frame to record (the real canvas costs more, but not by much)`);
  assert.ok(log.rects / 200 < 2500, `${log.rects / 200} rectangles a frame`);
});

test('the glow follows the fight', () => {
  const sim = new Deathmatch({ rng: seeded(9) });
  assert.equal(sim.glow(0)[0], 0x9dff7a, 'booting: phosphor green');
  advance(sim, BOOT_FIRST + 0.1);
  const [a, b] = sim.fighters;
  b.hurt = 3;
  assert.equal(sim.glow(1)[0], 0xe2231a, 'getting shot: red');
  a.flash = 1;
  assert.equal(sim.glow(0)[0], 0xffcc00, 'firing: amber');
  for (const i of [0, 1]) { const [hex, gain] = sim.glow(i); assert.ok(Number.isInteger(hex) && gain > 0 && gain <= 2.2); }
});

console.log(`\n${n} passed`);
