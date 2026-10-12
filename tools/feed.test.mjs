// node tools/feed.test.mjs: the picture of a seated player's game that goes to everyone else's copy of their CRT.
// The wire format, what the server will pass on, and the timings are checked here; the capture and the drawing need a browser.
import assert from 'node:assert/strict';
import * as client from '../js/feed.js';
import * as server from '../server/src/feed-logic.js';

let n = 0;
const test = (name, fn) => { fn(); n++; console.log(`ok  ${name}`); };

// a stand-in JPEG: the real start-of-image bytes, then filler
const jpeg = (len = 800) => { const b = new Uint8Array(len); b.set([0xff, 0xd8, 0xff, 0xe0]); for (let i = 4; i < len; i++) b[i] = i & 255; return b; };

test('client and server agree on the tag', () => {
  assert.equal(client.FRAME_TAG, server.FRAME_TAG);
});

test('a frame goes player -> server -> other players with the PC stamped on it', () => {
  const sent = client.packFrame(jpeg());
  const accepted = server.acceptFrame(sent);
  assert.ok(accepted, 'the server takes a real frame');
  assert.deepEqual([...accepted], [...jpeg()]);
  const got = client.unpackFrame(server.relayFrame(4, accepted));
  assert.equal(got.pc, 4);
  assert.deepEqual([...got.jpeg], [...jpeg()]);
});

test('the server stamps the PC itself: nothing a player sends can name another desk', () => {
  const sent = new Uint8Array(client.packFrame(jpeg()));
  assert.equal(sent[1], 0xff, 'byte 1 is the JPEG, not a PC number');
  assert.equal(sent.length, jpeg().length + 1);
});

test('the server refuses what is not a picture', () => {
  assert.equal(server.acceptFrame('not binary'), null);
  assert.equal(server.acceptFrame(new ArrayBuffer(0)), null);
  assert.equal(server.acceptFrame(client.packFrame(jpeg(10))), null, 'too small to be a JPEG');
  assert.equal(server.acceptFrame(client.packFrame(jpeg(server.MAX_FRAME + 1))), null, 'too big');
  const wrongTag = new Uint8Array(client.packFrame(jpeg())); wrongTag[0] = 0x00;
  assert.equal(server.acceptFrame(wrongTag.buffer), null, 'wrong tag');
  const notJpeg = new Uint8Array(client.packFrame(jpeg())); notJpeg[1] = 0x00;
  assert.equal(server.acceptFrame(notJpeg.buffer), null, 'does not start like a JPEG');
  assert.ok(server.acceptFrame(client.packFrame(jpeg(server.MAX_FRAME))), 'the biggest allowed frame goes through');
});

test('the client ignores messages that are not frames', () => {
  assert.equal(client.unpackFrame(new Uint8Array([0x00, 1, 0xff, 0xd8]).buffer), null);
  assert.equal(client.unpackFrame(new ArrayBuffer(2)), null);
  assert.equal(client.unpackFrame('text'), null);
});

test('one player cannot flood the room', () => {
  assert.equal(server.tooSoon(1000, 1000 + server.MIN_GAP_MS - 1), true);
  assert.equal(server.tooSoon(1000, 1000 + server.MIN_GAP_MS), false);
  assert.equal(server.tooSoon(0, Date.now()), false, 'the first frame always goes');
  assert.ok(1000 / server.MIN_GAP_MS >= client.FEED_FPS, 'the server allows at least the rate the client sends at');
});

test('a frame fits the server limits and the frame size is 4:3', () => {
  assert.equal(client.FEED_W * 3, client.FEED_H * 4);
  assert.ok(client.FEED_W * client.FEED_H * 0.5 < server.MAX_FRAME * 8, 'a few bits a pixel is well inside the limit');
});

test('a picture goes stale after FEED_TTL', () => {
  assert.equal(client.feedFresh(null, 10), false);
  assert.equal(client.feedFresh(10, 10 + client.FEED_TTL - 0.01), true);
  assert.equal(client.feedFresh(10, 10 + client.FEED_TTL), false);
});

test('the glow keeps the hue and takes its brightness from the picture', () => {
  const [hex, gain] = client.feedGlow(100, 50, 0);
  assert.equal(hex, 0xff8000);
  const [, dim] = client.feedGlow(10, 5, 0);
  const [, bright] = client.feedGlow(240, 240, 240);
  assert.ok(dim < gain && gain < bright, 'darker picture, dimmer glow');
  assert.ok(bright <= 2.2, 'never brighter than the brightest idle screen');
  assert.deepEqual(client.feedGlow(0, 0, 0).length, 2, 'a black picture does not divide by zero');
  assert.equal(client.feedGlow(0, 0, 0)[0], 0);
});

console.log(`${n} passed`);
