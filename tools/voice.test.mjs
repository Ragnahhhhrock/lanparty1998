// node tools/voice.test.mjs: proximity voice chat. How far a voice carries, who makes the offer, who counts as talking,
// and what the room server will pass on. The microphone and the WebRTC link need a browser.
import assert from 'node:assert/strict';
import * as v from '../js/voice-logic.js';
import * as server from '../server/src/voice-logic.js';

let n = 0;
const test = (name, fn) => { fn(); n++; console.log(`ok  ${name}`); };

test('a voice is full volume close by, fades in a straight line, and is gone at the far end', () => {
  assert.equal(v.gainAt(0), 1);
  assert.equal(v.gainAt(v.RANGE.full), 1);
  assert.equal(v.gainAt(v.RANGE.silent), 0);
  assert.equal(v.gainAt(v.RANGE.silent + 5), 0);
  const mid = (v.RANGE.full + v.RANGE.silent) / 2;
  assert.ok(Math.abs(v.gainAt(mid) - 0.5) < 1e-9);
  let last = 1;
  for (let d = v.RANGE.full; d <= v.RANGE.silent; d += 0.25) { const g = v.gainAt(d); assert.ok(g <= last + 1e-12); last = g; }
});

test('the basement is bigger than a voice: across the room is out of earshot', () => {
  const room = Math.hypot(12, 10);             // the long diagonal
  assert.equal(v.gainAt(room), 0);
  assert.ok(v.gainAt(2) > 0.9, 'a person at the next desk is easy to hear');
});

test('exactly one of two players makes the offer', () => {
  for (const [a, b] of [['a1b2c3d4', 'b1b2c3d4'], ['00000000', 'ffffffff'], ['x', 'y']]) {
    assert.notEqual(v.makesOffer(a, b), v.makesOffer(b, a));
  }
  assert.equal(v.makesOffer('same', 'same'), false);
});

test('the mic key joins, then mutes and unmutes', () => {
  assert.equal(v.nextMic('live'), 'muted');
  assert.equal(v.nextMic('muted'), 'live');
  assert.equal(v.nextMic('off'), 'live');
});

test('loudness: silence is 0, a full-scale square wave is 1', () => {
  assert.equal(v.rms(new Uint8Array(256).fill(128)), 0);
  const loud = new Uint8Array(256).map((_, i) => (i % 2 ? 255 : 0));
  assert.ok(v.rms(loud) > 0.99);
  assert.equal(v.rms(new Uint8Array(0)), 0);
});

test('talking switches on at once and holds through a breath before going off', () => {
  const t = new v.Talking({ on: 0.04, off: 0.02, hold: 0.3 });
  assert.equal(t.update(0.01, 0.1), false);
  assert.equal(t.update(0.2, 0.1), true);
  assert.equal(t.update(0.0, 0.1), true);     // a pause
  assert.equal(t.update(0.0, 0.1), true);
  assert.equal(t.update(0.0, 0.15), false);   // long enough
  t.update(0.2, 0.1);
  t.update(0.03, 0.2);                        // between the two levels counts as still talking
  assert.equal(t.update(0.03, 0.2), true);
  t.reset();
  assert.equal(t.active, false);
});

test('HUD words', () => {
  assert.equal(v.statusLine('off'), 'Voice off');
  assert.equal(v.statusLine('live'), 'MIC LIVE');
  assert.equal(v.statusLine('muted', ['DAZZA']), 'MIC MUTED · DAZZA talking');
  assert.equal(v.statusLine('live', ['YOU', 'MACCA']), 'MIC LIVE · YOU, MACCA talking');
  assert.equal(v.buttonLabel('off'), 'Voice: off');
  assert.equal(v.buttonLabel('live'), 'Mic: LIVE');
  assert.equal(v.buttonLabel('muted'), 'Mic: MUTED');
});

test('microphone problems are put in plain words', () => {
  assert.match(v.micProblem({ name: 'NotAllowedError' }), /blocked/);
  assert.match(v.micProblem({ name: 'NotFoundError' }), /No microphone/);
  assert.match(v.micProblem({ name: 'NotReadableError' }), /using/);
  assert.match(v.micProblem(new Error('x')), /Couldn't/);
  assert.match(v.micProblem(null), /Couldn't/);
});

test('ICE servers are STUN only, and the mic is asked for mono with echo control', () => {
  assert.ok(v.ICE_SERVERS.length >= 1);
  for (const s of v.ICE_SERVERS) assert.match(s.urls, /^stun:/);
  assert.equal(v.MIC.echoCancellation, true);
  assert.equal(v.MIC.channelCount, 1);
});

/* ---------- the room server ---------- */

const sdp = 'v=0\r\no=- 1 2 IN IP4 127.0.0.1\r\ns=-\r\n';

test('offers and answers pass, with only the fields we know', () => {
  assert.deepEqual(server.cleanSignal({ k: 'offer', sdp, extra: 'x' }), { k: 'offer', sdp });
  assert.deepEqual(server.cleanSignal({ k: 'answer', sdp }), { k: 'answer', sdp });
});

test('offers that are missing, tiny, huge or the wrong type are dropped', () => {
  assert.equal(server.cleanSignal({ k: 'offer' }), null);
  assert.equal(server.cleanSignal({ k: 'offer', sdp: 'x' }), null);
  assert.equal(server.cleanSignal({ k: 'offer', sdp: 'v'.repeat(server.MAX_SDP + 1) }), null);
  assert.equal(server.cleanSignal({ k: 'offer', sdp: 5 }), null);
  assert.equal(server.cleanSignal({ k: 'other', sdp }), null);
  assert.equal(server.cleanSignal(null), null);
  assert.equal(server.cleanSignal('offer'), null);
});

test('candidates pass cleaned; the end of candidates passes; junk does not', () => {
  const c = { candidate: 'candidate:1 1 udp 2122260223 192.168.1.5 54321 typ host', sdpMid: '0', sdpMLineIndex: 0, usernameFragment: 'zzz' };
  assert.deepEqual(server.cleanSignal({ k: 'ice', c }), { k: 'ice', c: { candidate: c.candidate, sdpMid: '0', sdpMLineIndex: 0 } });
  assert.deepEqual(server.cleanSignal({ k: 'ice', c: null }), { k: 'ice', c: null });
  assert.deepEqual(server.cleanSignal({ k: 'ice', c: { candidate: 'a', sdpMid: null, sdpMLineIndex: 99 } }), { k: 'ice', c: { candidate: 'a', sdpMid: null, sdpMLineIndex: null } });
  assert.equal(server.cleanSignal({ k: 'ice', c: { candidate: 'x'.repeat(server.MAX_CANDIDATE + 1) } }), null);
  assert.equal(server.cleanSignal({ k: 'ice', c: { candidate: 3 } }), null);
  assert.equal(server.cleanSignal({ k: 'ice' }), null);
});

test('a handshake can be long but nothing else can', () => {
  assert.ok(server.MAX_RAW > server.MAX_SDP, 'room for an offer plus its envelope');
  assert.ok(server.MAX_RAW_OTHER < server.MAX_RAW);
  assert.ok(server.MAX_RAW_OTHER >= 2000, 'chat and the rest keep their old limit');
});

test('one player cannot flood the room with handshakes', () => {
  const b = { count: 3, perMs: 1000 };
  let s = server.spend(undefined, 0, b);
  assert.deepEqual(s, { start: 0, count: 1 });
  s = server.spend(s, 10, b); s = server.spend(s, 20, b);
  assert.equal(server.spend(s, 30, b), null);          // the fourth inside the window
  assert.deepEqual(server.spend(s, 1000, b), { start: 1000, count: 1 });   // a new window
});

test('the relayed message names the sender, whatever the sender claimed', () => {
  const d = server.cleanSignal({ k: 'offer', sdp, from: 'someone-else' });
  assert.deepEqual(server.relaySignal('abc12345', d), { t: 'rtc', from: 'abc12345', d: { k: 'offer', sdp } });
});

console.log(`\n${n} voice tests passed`);
