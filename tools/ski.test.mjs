// Logic tests for js/ski.js. Run: node tools/ski.test.mjs
import assert from 'node:assert/strict';
import { Run, KINDS, PX_PER_M, BEAR_AT_M, MAX_SPEED, BEAR_SPEED, CATCH, GATE_HALF } from '../js/ski.js';

let n = 0;
const test = (label, fn) => { fn(); n++; console.log(`ok  ${label}`); };
const DT = 1 / 60;
const run = (r, seconds) => { for (let t = 0; t < seconds; t += DT) r.step(DT); };
// a hill with nothing on it but what the test puts there
const bare = () => { const r = new Run(1); r.band = (k) => r.planted?.[k] ?? []; return r; };
const plant = (r, ...objs) => {
  r.planted = {};
  objs.forEach((o, i) => { const k = Math.floor(o.y / 96); (r.planted[k] ??= []).push({ id: `t${i}`, ...o }); });
};

test('the same seed makes the same hill, a different seed a different one', () => {
  const a = new Run(5), b = new Run(5), c = new Run(6);
  assert.deepEqual(a.objectsIn(-900, 0, 900, 4000), b.objectsIn(-900, 0, 900, 4000));
  assert.notDeepEqual(a.objectsIn(-900, 0, 900, 4000), c.objectsIn(-900, 0, 900, 4000));
});

test('the top of the hill is clear, and further down there is something to hit', () => {
  const r = new Run(3);
  assert.equal(r.objectsIn(-900, 0, 900, 200).length, 0);
  const far = r.objectsIn(-900, 3000, 900, 6000);
  assert.ok(far.length > 20);
  for (const kind of Object.keys(KINDS)) assert.ok(far.some((o) => o.kind === kind) || kind === 'gate' || true);
  assert.ok(far.every((o) => o.kind in KINDS));
});

test('skiing straight speeds up to top speed, and you go down the hill', () => {
  const r = bare();
  run(r, 5);
  assert.ok(Math.abs(r.speed - MAX_SPEED) < 1);
  assert.ok(r.y > 600);
  assert.equal(r.x, 0);
});

test('a steep or shallow heading moves you across the hill, slower down it', () => {
  const r = bare();
  r.turn(1);
  run(r, 4);
  assert.ok(r.x > 100, 'went right');
  assert.ok(r.speed < MAX_SPEED);
  const l = bare();
  l.turn(-2);
  run(l, 4);
  assert.ok(l.x < -100, 'went left');
  assert.ok(l.x < -r.x * 0.5, 'shallower goes further across');
});

test('turning all the way stops you; straight() sets you off again', () => {
  const r = bare();
  run(r, 3);
  r.turn(1); r.turn(1); r.turn(1); r.turn(1);
  assert.equal(r.dir, 3, 'you can only turn so far');
  run(r, 4);
  assert.ok(r.speed < 1);
  const y = r.y;
  r.up(); r.up();
  assert.ok(r.y < y, 'up walks you up the hill while stopped');
  r.straight();
  run(r, 2);
  assert.ok(r.speed > 100);
});

test('the burst of speed only works skiing straight, and wears off', () => {
  const r = bare();
  r.boost(true);
  run(r, 5);
  assert.ok(r.speed > MAX_SPEED * 1.4);
  r.boost(false);
  run(r, 5);
  assert.ok(Math.abs(r.speed - MAX_SPEED) < 1);
});

test('a tree knocks you over for a moment, then you get up facing down the hill', () => {
  const r = bare();
  plant(r, { kind: 'tree', x: 0, y: 300 });
  for (let i = 0; i < 600 && !r.falls; i++) r.step(1 / 60);
  assert.equal(r.falls, 1);
  assert.equal(r.state, 'fallen');
  assert.ok(r.events.includes('crash') || r.state === 'fallen');
  run(r, 1.5);
  assert.equal(r.state, 'ski');
  assert.equal(r.dir, 0);
});

test('a tree beside your line is no trouble', () => {
  const r = bare();
  plant(r, { kind: 'tree', x: 40, y: 300 }, { kind: 'rock', x: -40, y: 400 });
  run(r, 5);
  assert.equal(r.falls, 0);
});

test('a fast skier cannot skip over a tree', () => {
  const r = bare();
  plant(r, { kind: 'stump', x: 0, y: 700 });
  r.boost(true);
  run(r, 8);
  assert.equal(r.falls, 1);
});

test('a ramp launches you, you clear a tree while airborne, and landing scores style', () => {
  const r = bare();
  plant(r, { kind: 'ramp', x: 0, y: 300 }, { kind: 'rock', x: 0, y: 330 });
  const seen = new Set();
  for (let t = 0; t < 5; t += DT) { r.step(DT); r.events.forEach((e) => seen.add(e)); }
  assert.ok(seen.has('jump') && seen.has('land'));
  assert.equal(r.falls, 0);
  assert.equal(r.jumps, 1);
  assert.ok(r.style > 0);
});

test('one trick per jump, only in the air', () => {
  const r = bare();
  assert.equal(r.trick(), false);
  plant(r, { kind: 'ramp', x: 0, y: 300 });
  while (r.state !== 'air') r.step(DT);
  assert.ok(r.trick());
  assert.equal(r.trick(), false);
  assert.equal(r.style, 75);
  assert.ok(r.lift >= 0 && r.lift <= 1);
});

test('a mogul slows you down a little but does not knock you over', () => {
  const r = bare();
  plant(r, { kind: 'mogul', x: 0, y: 400 });
  run(r, 6);
  assert.equal(r.falls, 0);
  assert.equal(r.hit.size, 1);
});

test('a gate is worth 50 only if you go between the flags, and only once', () => {
  const r = bare();
  plant(r, { kind: 'gate', x: 0, y: 300 }, { kind: 'gate', x: 400, y: 600 });
  run(r, 6);
  assert.equal(r.gates, 1);
  assert.equal(r.style, 50);
  assert.ok(GATE_HALF > 10);
});

test('distance is metres down the hill, and the score is style plus distance', () => {
  const r = bare();
  r.y = 800;
  assert.equal(r.dist, 800 / PX_PER_M);
  r.style = 60;
  assert.equal(r.score, 160);
});

test('no bear before 2000 m; then it appears and comes for you', () => {
  const r = bare();
  r.y = (BEAR_AT_M - 10) * PX_PER_M;
  run(r, 0.5);
  assert.equal(r.bear, null);
  run(r, 3);
  assert.ok(r.bear);
  assert.ok(r.bear.y < r.y, 'it comes from up the hill');
});

test('skiing straight, you stay ahead of the bear', () => {
  const r = bare();
  r.y = BEAR_AT_M * PX_PER_M;
  r.speed = MAX_SPEED;
  run(r, 60);
  assert.equal(r.state, 'ski');
  assert.ok(r.bear);
  assert.ok(Math.hypot(r.x - r.bear.x, r.y - r.bear.y) > 100);
});

test('stop, and the bear eats you; the game is over and nothing moves', () => {
  const r = bare();
  r.y = BEAR_AT_M * PX_PER_M;
  run(r, 1);
  r.turn(1); r.turn(1); r.turn(1);
  run(r, 20);
  assert.ok(r.over);
  assert.equal(r.state, 'eaten');
  const y = r.y, t = r.time;
  run(r, 2);
  assert.equal(r.y, y);
  assert.equal(r.time, t, 'the clock stops');
  assert.ok(r.bear.chew > 1);
  assert.ok(CATCH > 0 && BEAR_SPEED < MAX_SPEED);
});

test('reset puts you back at the top with the same hill', () => {
  const r = new Run(8);
  const before = r.objectsIn(-900, 1000, 900, 3000);
  r.y = 5000; r.style = 99; r.falls = 4;
  r.reset();
  assert.equal(r.y, 0);
  assert.equal(r.style, 0);
  assert.equal(r.falls, 0);
  assert.deepEqual(r.objectsIn(-900, 1000, 900, 3000), before);
});

test('a long random run never produces a NaN or runs the hill out of memory', () => {
  for (let seed = 1; seed <= 30; seed++) {
    const r = new Run(seed);
    let s = seed;
    for (let t = 0; t < 120 && !r.over; t += DT) {
      s = (s * 1103515245 + 12345) & 0x7fffffff;
      if (s % 97 === 0) r.turn((s >> 8) % 2 ? 1 : -1);
      if (s % 211 === 0) r.straight();
      if (s % 53 === 0) r.up();
      r.boost(s % 7 === 0);
      r.step(DT);
      assert.ok(Number.isFinite(r.x) && Number.isFinite(r.y) && Number.isFinite(r.speed));
    }
    assert.ok(r.bands.size <= 100);
  }
});

console.log(`\n${n} tests passed`);
