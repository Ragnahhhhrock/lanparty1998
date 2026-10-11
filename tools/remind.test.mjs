// Logic tests for tools/remind.mjs. Run: node tools/remind.test.mjs
import assert from 'node:assert/strict';
import { parseList, buildMessage, inviteUrl, parseArgs, SITE } from './remind.mjs';

let n = 0;
const test = (name, fn) => { fn(); n++; console.log(`ok  ${name}`); };

test('parses email,name lines, skipping blanks, comments and a header', () => {
  const { people, skipped } = parseList('email,name\n# mates\nmacca@example.com,Macca\n\ndazza@example.com\n');
  assert.deepEqual(people, [
    { email: 'macca@example.com', name: 'Macca' },
    { email: 'dazza@example.com', name: '' },
  ]);
  assert.deepEqual(skipped, []);
});

test('dedupes case-insensitively and reports bad addresses', () => {
  const { people, skipped } = parseList('A@x.com,A\na@X.com,Again\nnot-an-email,Bob\n');
  assert.equal(people.length, 1);
  assert.deepEqual(skipped, ['not-an-email,Bob']);
});

test('handles CRLF and quoted fields', () => {
  const { people } = parseList('"k@x.com","K-Rad"\r\n');
  assert.deepEqual(people, [{ email: 'k@x.com', name: 'K-Rad' }]);
});

test('the invite links to the live site, or a private room', () => {
  assert.equal(inviteUrl(), `${SITE}/`);
  assert.equal(inviteUrl('friday night'), `${SITE}/?room=friday%20night`);
});

test('the message is plain text, greets by name, links the site and offers STOP', () => {
  const m = buildMessage({ email: 'm@x.com', name: 'Macca' }, { when: 'Sat 7:30 PM' });
  assert.equal(m.to, 'm@x.com');
  assert.match(m.text, /^Oi Macca,/);
  assert.ok(m.text.includes('https://lanparty1998.com/'));
  assert.ok(m.text.includes('Doors open Sat 7:30 PM.'));
  assert.match(m.text, /Reply STOP/);
  assert.ok(!/<[a-z]+/i.test(m.text), 'no HTML');
});

test('no name still reads fine', () => {
  assert.match(buildMessage({ email: 'm@x.com', name: '' }).text, /^Oi,/);
});

test('arguments: dry run by default, --send opts in, junk is rejected', () => {
  assert.equal(parseArgs([]).send, false);
  const o = parseArgs(['--send', '--list', 'a.csv', '--room', 'fri']);
  assert.deepEqual([o.send, o.list, o.room], [true, 'a.csv', 'fri']);
  assert.throws(() => parseArgs(['--nope']));
});

console.log(`\n${n} passed`);
