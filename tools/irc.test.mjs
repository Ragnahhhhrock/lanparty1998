// node tools/irc.test.mjs: the #lanparty98 banter engine, with a seeded rng.
import assert from 'node:assert/strict';
import { Banter, REGULARS } from '../js/irc.js';

const seeded = (seed) => () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);
let n = 0;
const test = (name, fn) => { fn(); n++; console.log('ok ', name); };

test('the regulars chat on their own', () => {
  const b = new Banter({ rng: seeded(1) });
  let msgs = [];
  for (let i = 0; i < 600; i++) msgs = msgs.concat(b.tick(0.5)); // five minutes
  assert.ok(msgs.length > 10);
  assert.ok(msgs.every((m) => REGULARS.includes(m.nick) && m.text.length > 1 && !/\{\w\}/.test(m.text)));
});
test('events get a reaction that names the person', () => {
  const b = new Banter({ rng: seeded(3), me: 'FRAGMASTER' });
  b.react('trip', 'FRAGMASTER');
  const msgs = b.tick(10);
  assert.ok(msgs.length >= 1);
  assert.ok(msgs.some((m) => m.text.includes('FRAGMASTER')));
});
test('every reaction kind fills its template', () => {
  for (const kind of ['crash', 'trip', 'hot', 'midnight', 'join', 'door', 'pizza']) {
    const b = new Banter({ rng: seeded(4) });
    b.react(kind, 'PC-03');
    assert.ok(b.tick(10).every((m) => !/\{\w\}/.test(m.text)), kind);
  }
});
test('shouting gets a complaint', () => {
  const b = new Banter({ rng: () => 0.1 });
  b.heard('YOU', 'HELLO EVERYONE');
  assert.ok(b.tick(10).some((m) => m.text.includes('INDOOR VOICE')));
});
console.log(`${n} passed`);
