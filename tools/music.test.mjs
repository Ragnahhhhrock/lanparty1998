// node tools/music.test.mjs: LANamp's tape. The synthesis itself needs a browser; the track data and the
// sequencer's choices are checked here with a recording stand-in for the instruments.
import assert from 'node:assert/strict';
import { TRACKS, playStep, fmtTime } from '../js/music.js';

let n = 0;
const test = (name, fn) => { fn(); n++; console.log('ok ', name); };
const recorder = () => { const calls = []; return { calls, kit: new Proxy({}, { get: (_, k) => (...a) => calls.push([k, ...a]) }) }; };

test('two tracks each of hip hop, drum and bass, EDM and rock', () => {
  const by = {};
  for (const t of TRACKS) by[t.genre] = (by[t.genre] ?? 0) + 1;
  assert.deepEqual(by, { 'hip hop': 2, 'drum & bass': 2, EDM: 2, rock: 2 });
});
test('every track is between one and three minutes', () => {
  for (const t of TRACKS) assert.ok(t.seconds >= 60 && t.seconds <= 180, `${t.title} ${t.seconds}s`);
  assert.equal(fmtTime(125), '2:05');
});
test('tempos suit the genre', () => {
  for (const t of TRACKS) {
    const [lo, hi] = { hiphop: [80, 100], dnb: [165, 180], edm: [120, 145], rock: [100, 150] }[t.kind];
    assert.ok(t.bpm >= lo && t.bpm <= hi, t.title);
  }
});
test('every step of every track plays without error', () => {
  for (const t of TRACKS) {
    const { kit, calls } = recorder();
    for (let bar = 0; bar < t.bars; bar++) for (let s = 0; s < 16; s++) playStep(t, bar, s, bar * 4 + s * 0.2, kit);
    assert.ok(calls.length > t.bars * 8, `${t.title} is too sparse`);
    assert.ok(calls.some((c) => c[0] === 'kick') && calls.some((c) => c[0] === 'hat'), t.title);
  }
});
test('the intro has no kick and the full sections do', () => {
  const t = TRACKS[0];
  const intro = recorder(), full = recorder();
  for (let s = 0; s < 16; s++) { playStep(t, 0, s, s * 0.1, intro.kit); playStep(t, 16, s, s * 0.1, full.kit); }
  assert.ok(!intro.calls.some((c) => c[0] === 'kick'));
  assert.ok(full.calls.some((c) => c[0] === 'kick'));
});
console.log(`${n} passed`);
