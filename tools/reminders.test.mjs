// Logic tests for the party reminders (server/src/reminders-logic.js). Run: node tools/reminders.test.mjs
import assert from 'node:assert/strict';
import { cleanEmail, cleanToken, newToken, safeEqual, cleanRoom, cleanText, confirmMessage, reminderMessage, inviteUrl, page } from '../server/src/reminders-logic.js';

let n = 0;
const test = (name, fn) => { fn(); n++; console.log(`ok  ${name}`); };

test('emails are lower-cased, trimmed and checked', () => {
  assert.equal(cleanEmail('  Macca@Example.COM '), 'macca@example.com');
  for (const bad of ['', 'nope', 'a@b', 'a b@c.com', 'a@b.com, c@d.com', '<x@y.com>', 'a@b.c', null, undefined, 'x'.repeat(250) + '@a.com']) assert.equal(cleanEmail(bad), null, String(bad));
});

test('tokens are 32 hex characters and different each time', () => {
  const a = newToken(), b = newToken();
  assert.match(a, /^[a-f0-9]{32}$/);
  assert.notEqual(a, b);
  assert.equal(cleanToken(a), a);
  for (const bad of ['', 'abc', a + 'a', a.toUpperCase(), `${a.slice(1)}'`, null]) assert.equal(cleanToken(bad), null);
});

test('safeEqual matches only identical strings', () => {
  assert.ok(safeEqual('hunter2', 'hunter2'));
  assert.ok(!safeEqual('hunter2', 'hunter3'));
  assert.ok(!safeEqual('hunter2', 'hunter22'));
  assert.ok(!safeEqual('', 'x'));
  assert.ok(!safeEqual(undefined, 'x'));
});

test('rooms and free text are cleaned the way the game does it', () => {
  assert.equal(cleanRoom('Friday Night!'), 'fridaynight');
  assert.equal(cleanRoom('x'.repeat(50)).length, 32);
  assert.equal(cleanText('<b>Sat</b>\n7:30', 120), 'bSat/b7:30');
  assert.equal(cleanText('a'.repeat(300), 120).length, 120);
});

test('the invite goes to the live site, or a private room', () => {
  assert.equal(inviteUrl(''), 'https://lanparty1998.com/');
  assert.equal(inviteUrl('friday'), 'https://lanparty1998.com/?room=friday');
});

test('the confirmation email carries one confirm link and nothing else to click', () => {
  const t = newToken();
  const m = confirmMessage('a@b.com', t);
  assert.equal(m.to, 'a@b.com');
  assert.ok(m.text.includes(`https://room.lanparty1998.com/reminders/confirm?t=${t}`));
  assert.match(m.text, /ignore this/);
  assert.ok(!/<[a-z]+/i.test(m.text));
});

test('the reminder links the room, the time, and a working unsubscribe (also as a header)', () => {
  const t = newToken();
  const m = reminderMessage('a@b.com', t, { when: 'Sat 7:30 PM', room: 'friday' });
  assert.ok(m.text.includes('Doors open Sat 7:30 PM.'));
  assert.ok(m.text.includes('https://lanparty1998.com/?room=friday'));
  const unsub = `https://room.lanparty1998.com/reminders/unsubscribe?t=${t}`;
  assert.ok(m.text.includes(unsub));
  assert.equal(m.headers['List-Unsubscribe'], `<${unsub}>`);
  assert.equal(m.headers['List-Unsubscribe-Post'], 'List-Unsubscribe=One-Click');
  assert.ok(!/Doors open/.test(reminderMessage('a@b.com', t).text), 'no time given, none shown');
});

test('the web pages use the site tokens, not colours of their own', () => {
  const html = page('Hello', '<p>x</p>');
  assert.match(html, /css\/tokens\.css/);
  assert.match(html, /noindex/);
  assert.ok(!/#[0-9a-f]{3,8}\b/i.test(html), 'no raw hex colour');
});

console.log(`\n${n} passed`);
