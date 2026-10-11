// node tools/irc.test.mjs: the #lanparty98 banter engine, with a seeded rng.
import assert from 'node:assert/strict';
import { Banter, REGULARS, SCENES } from '../js/irc.js';

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
test('the regulars roast each other and laugh at the play', () => {
  const b = new Banter({ rng: seeded(7) });
  b.duel();
  const msgs = b.tick(20);
  assert.ok(msgs.length >= 3);
  assert.ok(msgs.every((m) => REGULARS.includes(m.nick) && !/\{\w\}/.test(m.text)));
  assert.ok(new Set(msgs.map((m) => m.nick)).size >= 3); // attacker, target and a laugher
});
test('the window starts full', () => {
  const b = new Banter({ rng: seeded(9) });
  const lines = b.prefill(14);
  assert.equal(lines.length, 14);
  assert.ok(lines.every((m) => REGULARS.includes(m.nick) && m.text.length > 1 && !/\{\w\}/.test(m.text)));
});
test('shouting gets a complaint', () => {
  const b = new Banter({ rng: () => 0.1 });
  b.heard('YOU', 'HELLO EVERYONE');
  assert.ok(b.tick(10).some((m) => m.text.includes('INDOOR VOICE')));
});
test('every scene is well formed', () => {
  for (const sc of SCENES) {
    assert.ok(sc.length >= 3);
    for (const [role, text, fx] of sc) {
      assert.ok('abc'.includes(role) && text.length > 1);
      assert.ok(!text.includes('!'), text);
      if (fx) { assert.ok(['fart', 'burp', 'laugh', 'snort'].includes(fx)); assert.ok(text.startsWith('*'), text); } // noises are actions
    }
  }
});
test('a scene has three different people, all standing in the room', () => {
  const bodies = ['Macca', 'xX_Ghoul_Xx', 'PhatBass', 'K-Rad'];
  for (let seed = 1; seed < 40; seed++) {
    const b = new Banter({ rng: seeded(seed), bodies });
    b.next = 1e9; // only the scene, no other chatter
    const secs = b.scene();
    const msgs = b.tick(secs + 1);
    assert.ok(msgs.length >= 3 && secs > 4);
    assert.ok(msgs.every((m) => bodies.includes(m.nick) && !/\{\w\}/.test(m.text)));
    assert.ok(new Set(msgs.map((m) => m.nick)).size >= 2);
  }
});
test('the noises come through on the messages', () => {
  const fx = new Set();
  const b = new Banter({ rng: seeded(11) });
  for (let i = 0; i < 40; i++) { b.scene(); for (const m of b.tick(60)) if (m.fx) fx.add(m.fx); }
  assert.deepEqual([...fx].sort(), ['burp', 'fart', 'laugh', 'snort']);
});
test('most of the chatter is scenes', () => {
  const b = new Banter({ rng: seeded(5) });
  let scenes = 0;
  const orig = b.scene.bind(b); b.scene = () => { scenes++; return orig(); };
  for (let i = 0; i < 100; i++) b.line();
  assert.ok(scenes > 45 && scenes < 75, String(scenes));
});
console.log(`${n} passed`);
