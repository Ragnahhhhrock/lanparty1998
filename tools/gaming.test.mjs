// node tools/gaming.test.mjs: the noise of the speaker PCs. The scheduling and the hearing (distance, left and right)
// are checked directly; the synthesis needs a browser, so it is played into a stand-in AudioContext that records
// what it was asked to do and complains about anything a real one would throw on.
import assert from 'node:assert/strict';
import { GameNoise, MOMENTS, EARSHOT, hearing } from '../js/gaming.js';

let n = 0;
const queue = [];
const test = (name, fn) => queue.push([name, fn]);

// a stand-in AudioContext: every node records what it was asked and lets you chain; times and exponential ramps are checked
function fakeContext() {
  const log = { nodes: [], bad: [] };
  const param = (name) => ({
    value: 0,
    setValueAtTime(v, t) { if (!Number.isFinite(v) || !Number.isFinite(t) || t < 0) log.bad.push(`${name}.setValueAtTime(${v}, ${t})`); },
    linearRampToValueAtTime(v, t) { if (!Number.isFinite(v) || !Number.isFinite(t)) log.bad.push(`${name}.linearRamp(${v}, ${t})`); },
    exponentialRampToValueAtTime(v, t) { if (!(v > 0) || !Number.isFinite(t)) log.bad.push(`${name}.exponentialRamp(${v}, ${t})`); }, // a real one throws on <= 0
  });
  const node = (kind) => {
    const o = { kind, connect: (d) => d, start() {}, stop() {}, frequency: param('frequency'), gain: param('gain'), Q: param('Q'), pan: param('pan'), type: '' };
    log.nodes.push(o);
    return o;
  };
  const ctx = {
    currentTime: 10, sampleRate: 8000, destination: node('destination'),
    createGain: () => node('gain'), createOscillator: () => node('osc'), createBiquadFilter: () => node('filter'),
    createStereoPanner: () => node('panner'), resume() {},
    createBuffer: (ch, len) => ({ getChannelData: () => new Float32Array(len) }),
    createBufferSource: () => Object.assign(node('source'), { buffer: null, loop: false }),
  };
  return { ctx, log };
}

const listener = (over = {}) => ({ x: 0, z: 0, yaw: 0, seated: false, ...over });
const sequence = (values) => { let i = 0; return () => values[i++ % values.length]; };

test('every sound a moment names is a real sound in the kit', async () => {
  const sfx = await import('../js/sfx.js');
  for (const m of MOMENTS) for (const [at, sound] of m.sounds) {
    assert.equal(typeof sfx[sound], 'function', sound);
    assert.ok(at >= 0 && at < 3, `${sound} at ${at}`);
  }
});
test('the shotgun and the imp are both on the menu', () => {
  const all = MOMENTS.flatMap((m) => m.sounds.map((s) => s[1]));
  assert.ok(all.includes('shotgun') && all.includes('impShriek'));
});

test('close is loud, far is quiet and past earshot is silent', () => {
  const near = hearing(listener(), 0.5, 0).vol, mid = hearing(listener(), 4, 0).vol, far = hearing(listener(), EARSHOT - 0.5, 0).vol;
  assert.ok(near > mid && mid > far && far > 0, `${near} ${mid} ${far}`);
  assert.equal(hearing(listener(), EARSHOT + 1, 0).vol, 0);
  assert.ok(near <= 1);
});
test('sat at a PC of your own, the room is quieter', () => {
  assert.ok(hearing(listener({ seated: true }), 3, 0).vol < hearing(listener(), 3, 0).vol);
});
test('a PC on your right pans right and one on your left pans left, whichever way you face', () => {
  assert.ok(hearing(listener(), 3, 0).pan > 0.5);       // facing -z: +x is on your right
  assert.ok(hearing(listener(), -3, 0).pan < -0.5);
  assert.ok(Math.abs(hearing(listener(), 0, -3).pan) < 0.01); // dead ahead
  const turned = listener({ yaw: Math.PI / 2 });         // turned left, now facing -x: -z is on your right
  assert.ok(hearing(turned, 0, -3).pan > 0.5);
  assert.ok(hearing(turned, 0, 3).pan < -0.5);
});

test('PCs make noise on their own, a few times a minute', () => {
  const heard = [];
  const g = new GameNoise({ play: (name, vol, pan, pitch) => heard.push({ name, vol, pan, pitch }), rand: Math.random });
  const pcs = [{ id: 'a', x: 2, z: 0 }, { id: 'b', x: -2, z: 1 }];
  for (let i = 0; i < 60 * 60; i++) g.tick(1 / 60, pcs, listener()); // a minute
  assert.ok(heard.length >= 4, `only ${heard.length} noises in a minute`);
  assert.ok(heard.every((h) => h.vol > 0 && h.pan >= -1 && h.pan <= 1));
});
test('a scene plays its sounds in order, with its gaps', () => {
  const heard = [];
  // rand picks the third moment (the imp, the shotgun, the imp dying) the first time it picks
  const total = MOMENTS.reduce((s, m) => s + m.w, 0), third = (MOMENTS[0].w + MOMENTS[1].w + 0.5) / total;
  const g = new GameNoise({ play: (name, vol, pan, pitch, extra) => heard.push({ name, t: g.clock, extra }), rand: sequence([0, third, 0.5]) });
  for (let i = 0; i < 60 * 4; i++) g.tick(1 / 60, [{ id: 'a', x: 1, z: 0 }], listener());
  assert.deepEqual(heard.map((h) => h.name), ['impShriek', 'shotgun', 'impShriek']);
  assert.ok(heard[1].t - heard[0].t > 0.7 && heard[1].t - heard[0].t < 1.1, 'the shotgun comes about a second after the first scream');
  assert.equal(heard[2].extra, 1.4); // the second scream is the long one
});
test('a PC out of earshot is never heard', () => {
  const heard = [];
  const g = new GameNoise({ play: (name) => heard.push(name) });
  for (let i = 0; i < 60 * 120; i++) g.tick(1 / 60, [{ id: 'a', x: EARSHOT + 3, z: 0 }], listener());
  assert.equal(heard.length, 0);
});
test('headphones on, or standing up: the PC goes quiet, including what was already coming', () => {
  const heard = [];
  const total = MOMENTS.reduce((s, m) => s + m.w, 0), third = (MOMENTS[0].w + MOMENTS[1].w + 0.5) / total;
  const g = new GameNoise({ play: (name) => heard.push(name), rand: sequence([0, third, 0.5]) });
  const pc = [{ id: 'a', x: 1, z: 0 }];
  for (let i = 0; i < 70; i++) g.tick(1 / 60, pc, listener());   // the scream has gone, the shotgun is on its way
  assert.equal(heard.length, 1);
  for (let i = 0; i < 60 * 30; i++) g.tick(1 / 60, [], listener());
  assert.equal(heard.length, 1, 'nothing more from a PC nobody is playing');
  assert.equal(g.pcs.size, 0); assert.equal(g.queue.length, 0);
});
test('each PC keeps its own pitch, and it stays within a few per cent', () => {
  const pitches = new Map();
  const g = new GameNoise({ play: (name, vol, pan, pitch) => pitches.set(pitch, 1), rand: sequence([0.1]) });
  const ids = ['npc-K-Rad', 'npc-n00bslayer', 'player-7', 'player-8'];
  for (let i = 0; i < 60 * 30; i++) g.tick(1 / 60, ids.map((id, k) => ({ id, x: 1 + k * 0.2, z: 0 })), listener());
  assert.ok(pitches.size >= 3, 'the PCs do not all sound the same');
  for (const p of pitches.keys()) assert.ok(p >= 0.9 && p <= 1.1, String(p));
});

test('every game sound plays into a context without asking it for anything it would throw on', async () => {
  const sfx = await import('../js/sfx.js');
  const { ctx, log } = fakeContext();
  globalThis.AudioContext = function () { return ctx; };
  sfx.startAudio();
  for (const name of ['shotgun', 'impShriek', 'chaingun', 'rocket', 'pickup']) {
    const before = log.nodes.length;
    sfx[name](0.6, -0.5, 1.05);
    assert.ok(log.nodes.length > before + 3, `${name} made no sound`);
  }
  sfx.impShriek(1, 0, 1, 1.4);
  sfx.chaingun(1, 0, 1, 12);
  assert.deepEqual(log.bad, []);
  assert.ok(log.nodes.some((x) => x.kind === 'panner'), 'the sounds are panned');
});
test('nothing happens before audio has started', async () => {
  // a fresh copy of the module: no context yet
  const sfx = await import('../js/sfx.js?fresh');
  assert.doesNotThrow(() => { sfx.shotgun(); sfx.impShriek(); sfx.chaingun(); sfx.rocket(); sfx.pickup(); });
});

for (const [name, fn] of queue) { await fn(); n++; console.log('ok ', name); }
console.log(`${n} passed`);
