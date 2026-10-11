// node tools/music.test.mjs: LANamp's tape. The synthesis itself needs a browser; the track data and the
// sequencer's choices are checked here with a recording stand-in for the instruments.
import assert from 'node:assert/strict';
import { TRACKS, playStep, fmtTime, trackLabel, Player } from '../js/music.js';
import { isMp3, parseId3, parseId3v1, nameTags, makeTrack, byPath, readTags, readAllTags, fromFileList } from '../js/library.js';

let n = 0;
const queue = [];
const test = (name, fn) => queue.push([name, fn]);
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

/* ---------- the visitor's own MP3 files (js/library.js) ---------- */
const ascii = (str) => [...str].map((c) => c.charCodeAt(0));
const syncsafe = (v) => [(v >> 21) & 0x7f, (v >> 14) & 0x7f, (v >> 7) & 0x7f, v & 0x7f];
const be32 = (v) => [(v >>> 24) & 255, (v >>> 16) & 255, (v >>> 8) & 255, v & 255];
const frame23 = (id, body) => [...ascii(id), ...be32(body.length), 0, 0, ...body];
const frame24 = (id, body) => [...ascii(id), ...syncsafe(body.length), 0, 0, ...body];
const tag = (ver, frames, flags = 0) => new Uint8Array([...ascii('ID3'), ver, 0, flags, ...syncsafe(frames.length), ...frames]);
const utf16 = (str) => [1, 0xff, 0xfe, ...[...str].flatMap((c) => [c.charCodeAt(0) & 255, c.charCodeAt(0) >> 8])];
const fakeFile = (name, bytes, size = bytes.length) => ({ name, size, slice: (a, b) => { const from = a < 0 ? size + a : a; return { arrayBuffer: async () => new Uint8Array(bytes).slice(from, b ?? size).buffer }; } });

test('only .mp3 files are picked up', () => {
  assert.ok(isMp3('a.mp3') && isMp3('B.MP3'));
  assert.ok(!isMp3('a.mp3.txt') && !isMp3('mp3') && !isMp3('a.ogg'));
  const picked = fromFileList([{ name: 'x.mp3', webkitRelativePath: 'Music/x.mp3' }, { name: 'cover.jpg' }, { name: 'y.MP3' }]);
  assert.deepEqual(picked.map((p) => p.path), ['Music/x.mp3', 'y.MP3']);
});
test('ID3v2.3 text frames in Latin-1 and UTF-16', () => {
  const t = parseId3(tag(3, [...frame23('TIT2', [0, ...ascii('Song Title')]), ...frame23('TPE1', utf16('The Band')), ...frame23('TALB', [0, ...ascii('Album')]), ...frame23('APIC', [0, 1, 2, 3])]));
  assert.deepEqual(t, { title: 'Song Title', artist: 'The Band', album: 'Album' });
});
test('ID3v2.4 UTF-8 frames, and multiple artists are joined', () => {
  const t = parseId3(tag(4, [...frame24('TIT2', [3, ...new TextEncoder().encode('Caf\u00e9 Del Mar')]), ...frame24('TPE1', [3, ...ascii('A'), 0, ...ascii('B')])]));
  assert.equal(t.title, 'Caf\u00e9 Del Mar');
  assert.equal(t.artist, 'A / B');
});
test('a tag cut short by the read limit gives what it has, and junk gives nothing', () => {
  const full = tag(3, [...frame23('TIT2', [0, ...ascii('First')]), ...frame23('TPE1', [0, ...ascii('Second one is long')])]);
  assert.deepEqual(parseId3(full.subarray(0, 28)), { title: 'First' });
  assert.deepEqual(parseId3(new Uint8Array([1, 2, 3])), {});
  assert.deepEqual(parseId3(new Uint8Array(40)), {});
});
test('ID3v1 trailer', () => {
  const b = new Uint8Array(128); b.set(ascii('TAG')); b.set(ascii('Old Song'), 3); b.set(ascii('Old Band'), 33);
  assert.deepEqual(parseId3v1(b), { title: 'Old Song', artist: 'Old Band' });
  assert.deepEqual(parseId3v1(new Uint8Array(128)), {});
});
test('names stand in for missing tags', () => {
  assert.deepEqual(nameTags('Music/03 - Daft Punk - One_More Time.mp3'), { artist: 'Daft Punk', title: 'One More Time' });
  assert.deepEqual(nameTags('Music/Rock/song.MP3'), { artist: '', title: 'song' });
  assert.deepEqual(nameTags('a/12. Plain.mp3'), { artist: '', title: 'Plain' });
  assert.equal(trackLabel({ artist: '', title: 'Plain' }), 'Plain');
  assert.equal(fmtTime(null), '--:--');
});
test('readTags prefers ID3v2 and falls back to the v1 trailer', async () => {
  const v2 = tag(3, frame23('TIT2', [0, ...ascii('New')]));
  assert.equal((await readTags(fakeFile('a.mp3', v2))).title, 'New');
  const v1 = new Uint8Array(400); v1.set(ascii('TAG'), 272); v1.set(ascii('Tail'), 275);
  assert.equal((await readTags(fakeFile('b.mp3', v1))).title, 'Tail');
  assert.deepEqual(await readTags(fakeFile('c.mp3', new Uint8Array(300))), {});
});
test('tags are read in the background and one bad file does not stop the rest', async () => {
  const good = (name) => makeTrack({ file: fakeFile(name, tag(3, frame23('TIT2', [0, ...ascii(name)]))), path: `M/${name}` });
  const bad = makeTrack({ file: { name: 'bad.mp3', size: 10, slice: () => { throw new Error('locked'); } }, path: 'M/bad.mp3' });
  const list = [good('one.mp3'), bad, good('two.mp3')];
  let ticks = 0;
  await readAllTags(list, { onTick: () => ticks++ });
  assert.deepEqual(list.map((t) => t.title), ['one.mp3', 'bad', 'two.mp3']);
  assert.ok(list.every((t) => t.tagged) && ticks >= 1);
  const stale = [good('x.mp3')];
  await readAllTags(stale, { isStale: () => true });
  assert.ok(!stale[0].tagged);
});
test('file tracks fit the player and sort in folder order', () => {
  const t = makeTrack({ file: fakeFile('a.mp3', [1, 2, 3]), path: 'Music/a.mp3' });
  assert.equal(t.kind, 'file'); assert.equal(t.seconds, null); assert.ok(t.bpm > 0 && t.trim > 0);
  const paths = [{ path: 'M/track 10.mp3' }, { path: 'M/track 2.mp3' }, { path: 'A/z.mp3' }].sort(byPath).map((p) => p.path);
  assert.deepEqual(paths, ['A/z.mp3', 'M/track 2.mp3', 'M/track 10.mp3']);
});

/* ---------- the player with the browser stood in for ---------- */
const node = () => ({ connect(x) { return x; }, gain: { value: 1, setValueAtTime() {}, linearRampToValueAtTime() {}, exponentialRampToValueAtTime() {}, cancelScheduledValues() {} } });
const fakeCtx = () => ({
  sampleRate: 8000, currentTime: 0, state: 'running', destination: {}, resume() {},
  createGain: node, createDynamicsCompressor: node, createMediaElementSource: node,
  createAnalyser: () => ({ ...node(), frequencyBinCount: 8, getByteFrequencyData() {} }),
  createBuffer: (c, len) => ({ getChannelData: () => new Float32Array(len) }),
});
function fakePlayer() {
  const audios = [];
  globalThis.Audio = class { constructor() { this.listeners = {}; this.plays = 0; this.paused = true; this.currentTime = 0; audios.push(this); }
    addEventListener(e, f) { this.listeners[e] = f; } fire(e) { this.listeners[e]?.(); }
    play() { this.plays++; this.paused = false; return Promise.resolve(); } pause() { this.paused = true; } };
  globalThis.URL.createObjectURL = (f) => `blob:${f.name}`; globalThis.URL.revokeObjectURL = () => {};
  const player = new Player(fakeCtx());
  const files = ['a.mp3', 'b.mp3'].map((name) => makeTrack({ file: fakeFile(name, [1]), path: `M/${name}` }));
  player.setTracks([...TRACKS, ...files]);
  return { player, audios, files };
}
test('the player plays a file through an audio element and moves on when it ends', () => {
  const { player, audios } = fakePlayer();
  player.play(8);
  assert.equal(player.state, 'playing');
  assert.equal(audios[0].src, 'blob:a.mp3'); assert.equal(audios[0].plays, 1);
  audios[0].fire('ended');
  assert.equal(player.index, 9); assert.equal(audios[0].src, 'blob:b.mp3');
  player.pause(); assert.ok(audios[0].paused); assert.equal(player.state, 'paused');
  player.play(); assert.equal(audios[0].src, 'blob:b.mp3'); assert.equal(audios[0].plays, 3);
  player.stop(); assert.ok(audios[0].paused); assert.equal(player.state, 'stopped');
});
test('skipping between the tape and files stops the right source', () => {
  const { player, audios } = fakePlayer();
  player.play(7); assert.ok(player.timer);
  player.skip(1); assert.equal(player.index, 8); assert.equal(audios[0].plays, 1);
  player.skip(1); player.skip(1); // b.mp3, then round to the tape's first song
  assert.equal(player.index, 0); assert.ok(audios[0].paused); assert.equal(player.state, 'playing');
  player.stop();
});
test('a file the browser cannot decode is skipped, but not forever', () => {
  const { player, audios } = fakePlayer();
  let said = 0; player.addEventListener('unplayable', () => said++);
  player.play(8); audios[0].fire('error');
  assert.equal(player.index, 9); assert.equal(said, 1);
  audios[0].fire('error'); audios[0].fire('error'); audios[0].fire('error');
  assert.ok(said <= player.tracks.length, 'it stopped chasing bad files');
  player.stop();
});
test('replacing the playlist keeps the song if it is still there, and stops if not', () => {
  const { player, audios, files } = fakePlayer();
  player.play(9);
  player.setTracks([...TRACKS, files[1]]);
  assert.equal(player.index, 8); assert.equal(player.state, 'playing'); assert.ok(!audios[0].paused);
  player.setTracks(TRACKS);
  assert.equal(player.state, 'stopped'); assert.equal(player.index, 0); assert.ok(audios[0].paused);
});

for (const [name, fn] of queue) { await fn(); n++; console.log('ok ', name); }
console.log(`${n} passed`);
