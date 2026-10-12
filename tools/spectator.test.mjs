// Tests for spectator mode: js/dm-demos.js (the demo WAD) and js/spectator.js (when the hidden PCs run).
// Run: node tools/spectator.test.mjs
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { checkDemo, demoView, demoTics, buildWad, readWad, spectatorWad, DEMO_LUMPS, VIEW_BYTE } from '../js/dm-demos.js';
import { DEMO_FILES } from '../js/spectator-demos.js';
import { wantRunning, NEAR, FAR } from '../js/spectator.js';
import { confName } from '../js/games.js';

let n = 0;
const test = (name, fn) => { fn(); n++; console.log(`ok  ${name}`); };
const demo = (name) => new Uint8Array(readFileSync(new URL(`../bundles/${name}`, import.meta.url)));

test('every recorded demo is a whole two-player DOOM 1.9 deathmatch of about three minutes', () => {
  for (const f of DEMO_FILES) {
    const d = demo(f);
    assert.equal(checkDemo(d), null, f);
    assert.ok(demoTics(d) >= 35 * 150 && demoTics(d) <= 35 * 240, `${f} lasts ${demoTics(d)} tics`);
    assert.equal(d[1] <= 3, true, `${f} skill`);
  }
});

test('the demos are real engine output, not synthetic: every tic holds two sets of keypresses', () => {
  const d = demo(DEMO_FILES[0]);
  const moves = new Set();
  for (let i = 13; i < d.length - 1; i += 4) moves.add(d[i]);
  assert.ok(moves.size > 5, 'forward-move values vary');
});

test('the same demo seen by the other player differs only in the view byte', () => {
  const d = demo(DEMO_FILES[0]);
  const a = demoView(d, 0), b = demoView(d, 1);
  assert.equal(a[VIEW_BYTE], 0);
  assert.equal(b[VIEW_BYTE], 1);
  for (let i = 0; i < d.length; i++) if (i !== VIEW_BYTE) assert.equal(a[i], b[i]);
  assert.throws(() => demoView(d, 2));
});

test('bad demos are refused', () => {
  const d = demo(DEMO_FILES[0]);
  assert.match(checkDemo(d.slice(0, 5)), /short/);
  const old = d.slice(); old[0] = 106;
  assert.match(checkDemo(old), /version/);
  const solo = d.slice(); solo[10] = 0;
  assert.match(checkDemo(solo), /two-player/);
  const cut = d.slice(0, d.length - 1);
  assert.ok(checkDemo(cut));
});

test('a WAD reads back as the lumps it was built from', () => {
  const lumps = [{ name: 'AAA', data: Uint8Array.of(1, 2, 3) }, { name: 'DEMO1', data: Uint8Array.of(9) }, { name: 'E', data: new Uint8Array(0) }];
  const back = readWad(buildWad(lumps));
  assert.deepEqual(back.map((l) => [l.name, [...l.data]]), [['AAA', [1, 2, 3]], ['DEMO1', [9]], ['E', []]]);
  assert.throws(() => buildWad([{ name: 'TOOLONGNAME', data: new Uint8Array(1) }]));
});

test('the spectator WAD carries every demo under DOOM\'s own demo names, through the right eyes', () => {
  const demos = DEMO_FILES.map(demo);
  for (const view of [0, 1]) {
    const lumps = readWad(spectatorWad(demos, view));
    assert.deepEqual(lumps.map((l) => l.name), DEMO_LUMPS);
    lumps.forEach((l, i) => {
      assert.equal(l.data[VIEW_BYTE], view);
      assert.deepEqual([...l.data.slice(9)], [...demos[i % demos.length].slice(9)]);
    });
  }
  assert.equal(readWad(spectatorWad([demos[0]], 0)).length, DEMO_LUMPS.length, 'a short list wraps');
  assert.throws(() => spectatorWad([], 0));
});

test('the spectate config boots DOOM with the demo WAD and no sound', () => {
  assert.equal(confName('doom', 'spectate'), 'conf-doom-spectate.jsdos');
  const path = new URL(`../bundles/${confName('doom', 'spectate')}`, import.meta.url);
  assert.ok(existsSync(path));
  assert.ok(readFileSync(path, 'latin1').includes('\r\nDOOM.EXE -nosound -file DEMOS.WAD\r\n'));
});

test('the hidden PCs start when you are near, keep going a little further out, and never run over your own game', () => {
  assert.equal(wantRunning(false, NEAR - 0.1, false), true);
  assert.equal(wantRunning(false, NEAR + 0.1, false), false);
  assert.equal(wantRunning(true, NEAR + 0.1, false), true, 'hysteresis');
  assert.equal(wantRunning(true, FAR + 0.1, false), false);
  assert.equal(wantRunning(true, 1, true), false, 'busy');
  assert.equal(wantRunning(false, 1, true), false);
  assert.ok(FAR > NEAR);
});

console.log(`${n} passed`);
