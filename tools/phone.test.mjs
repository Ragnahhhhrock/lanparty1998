// Logic tests for the mobile phone: js/tones.js (what a call sounds like), js/snake.js and js/handset.js.
// Run: node tools/phone.test.mjs
import assert from 'node:assert/strict';
import { dtmf, callPlan, engagedPlan, KEYS, DIAL_HZ, RING_HZ } from '../js/tones.js';
import { Snake, COLS, ROWS, FOOD_POINTS, BONUS_EVERY, BONUS_TICKS } from '../js/snake.js';
import { Handset, CONTACTS, contactFor, formatNumber, CALL_MS, ENGAGED_MS } from '../js/handset.js';

let n = 0;
const test = (label, fn) => { fn(); n++; console.log(`ok  ${label}`); };

/* ---------- tones ---------- */
test('every keypad key is one low and one high tone, and no two keys share a pair', () => {
  const seen = new Set();
  for (const k of KEYS) {
    const [lo, hi] = dtmf(k);
    assert.ok([697, 770, 852, 941].includes(lo) && [1209, 1336, 1477].includes(hi), k);
    seen.add(`${lo}/${hi}`);
  }
  assert.equal(seen.size, 12);
  assert.deepEqual(dtmf('5'), [770, 1336]);
  assert.deepEqual(dtmf('0'), [941, 1336]);
  assert.equal(dtmf('x'), null);
});

test('a call from the wall phone is a dial tone, the digits, then two rings, in that order', () => {
  const plan = callPlan('9555 0173', { dialTone: 0.5 });
  const [tone, ...rest] = plan.segments;
  assert.deepEqual(tone.freqs, [DIAL_HZ]);
  const digits = rest.filter((s) => s.freqs.length === 2 && [697, 770, 852, 941].includes(s.freqs[0]));
  assert.equal(digits.length, 8, 'the space is not dialled');
  assert.deepEqual(digits[0].freqs, dtmf('9'));
  assert.deepEqual(digits[7].freqs, dtmf('3'));
  const rings = rest.filter((s) => s.freqs[0] === RING_HZ[0]);
  assert.equal(rings.length, 4, 'two rings of two bursts');
  assert.ok(rings[0].at > digits[7].at + digits[7].dur, 'ringing starts after the last digit');
  for (let i = 1; i < plan.segments.length; i++) assert.ok(plan.segments[i].at >= plan.segments[i - 1].at, 'in order');
  assert.ok(plan.duration > rings[3].at + rings[3].dur, 'somebody picks up after the last ring');
});

test('the mobile does not play the digits or a dial tone, only the ringing', () => {
  const plan = callPlan('9555 0173', { digits: false });
  assert.ok(plan.segments.every((s) => s.freqs[0] === RING_HZ[0] && s.freqs.length === RING_HZ.length));
  assert.ok(plan.duration > 2 && plan.duration < 5);
});

test('the engaged tone is four beeps of 425 Hz', () => {
  const plan = engagedPlan();
  assert.equal(plan.segments.length, 4);
  assert.ok(plan.segments.every((s) => s.freqs.length === 1 && s.freqs[0] === DIAL_HZ));
});

/* ---------- snake ---------- */
// a snake whose food is somewhere in a corner it is not going near, unless a test puts it in the way
const calm = () => { const s = new Snake(() => 0); s.food = { x: 0, y: 0 }; return s; };
const steps = (s, k) => { for (let i = 0; i < k; i++) s.step(); };

test('the snake starts three long, heading right, with food somewhere free', () => {
  const s = new Snake(Math.random);
  assert.equal(s.body.length, 3);
  assert.equal(s.heading, 'right');
  assert.ok(s.food && !s.body.some((c) => c.x === s.food.x && c.y === s.food.y));
  assert.equal(s.state, 'play');
});

test('it moves a cell a step and keeps its length', () => {
  const s = calm();
  const head = s.body[0].x;
  steps(s, 4);
  assert.equal(s.body[0].x, head + 4);
  assert.equal(s.body.length, 3);
});

test('it cannot turn back on itself, but two quick turns both count', () => {
  const s = calm();
  s.turn('left');
  s.step();
  assert.equal(s.heading, 'right');
  s.turn('up'); s.turn('left');
  s.step(); assert.equal(s.heading, 'up');
  s.step(); assert.equal(s.heading, 'left');
});

test('eating the food scores, grows the snake and puts the food somewhere else', () => {
  const s = calm();
  s.food = { x: s.body[0].x + 1, y: s.body[0].y };
  s.step();
  assert.equal(s.score, FOOD_POINTS);
  assert.deepEqual(s.drain(), ['eat']);
  assert.notDeepEqual(s.food, { x: s.body[0].x, y: s.body[0].y });
  assert.equal(s.body.length, 4);
  s.food = { x: 0, y: 0 };
  steps(s, 2);
  assert.equal(s.body.length, 4);
});

test('a wall ends the game, and the best score is kept', () => {
  const s = calm();
  s.score = 14;
  steps(s, COLS);
  assert.equal(s.state, 'over');
  assert.equal(s.cause, 'wall');
  assert.equal(s.best, 14);
  const at = s.body[0].x;
  s.step();
  assert.equal(s.body[0].x, at, 'nothing moves once it is over');
  s.reset();
  assert.equal(s.best, 14);
  assert.equal(s.score, 0);
});

test('running into yourself ends the game', () => {
  const s = calm();
  s.body = Array.from({ length: 6 }, (_, i) => ({ x: 10 - i, y: 6 })); // a straight snake, heading right
  s.grow = 5;
  s.turn('down'); s.step();
  s.turn('left'); s.step();
  s.turn('up'); s.step();
  s.step();
  assert.equal(s.state, 'over');
  assert.equal(s.cause, 'self');
});

test('a bug turns up after every fifth bit of food, is worth what time it has left, and goes if you are slow', () => {
  const s = calm();
  const feed = () => { s.food = { x: s.body[0].x + 1, y: s.body[0].y }; s.step(); };
  for (let i = 0; i < BONUS_EVERY; i++) { feed(); if (i < BONUS_EVERY - 1) assert.equal(s.bonus, null); if (s.state !== 'play') s.reset(); }
  assert.ok(s.bonus, 'the fifth bit of food brings the bug');
  const before = s.score;
  s.bonus = { x: s.body[0].x + 1, y: s.body[0].y, left: 30 };
  s.food = { x: 0, y: 0 };
  s.step();
  assert.equal(s.score, before + 30);
  assert.equal(s.bonus, null);
  s.bonus = { x: 20, y: 2, left: 2 };
  s.step(); s.step();
  assert.equal(s.bonus, null, 'it ran off');
  assert.equal(BONUS_TICKS, 40);
});

test('the game gets quicker as you eat, down to a floor', () => {
  const s = calm();
  const a = s.interval;
  s.eaten = 10;
  assert.ok(s.interval < a);
  s.eaten = 500;
  assert.equal(s.interval, 70);
});

test('fill the board and you win', () => {
  const s = new Snake(() => 0);
  const path = [];                                   // the board, row by row, back and forth
  for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) path.push({ x: y % 2 ? COLS - 1 - x : x, y });
  const last = path.length - 1;
  s.body = path.slice(0, last).reverse();            // head next to the one free cell, tail where the path began
  s.heading = 'right';
  s.food = { ...path[last] };
  s.step();
  assert.equal(s.state, 'won');
  assert.equal(s.cause, 'full');
  assert.equal(s.body.length, COLS * ROWS);
});

/* ---------- handset ---------- */
const phone = (o) => new Handset({ rand: () => 0, ...o });
const keys = (h, ...ks) => ks.forEach((k) => h.press(k));
const types = (h) => h.drain().map((e) => e.type);

test('the phone shows the carrier and the party clock, and Menu opens the menu', () => {
  const h = phone({ clock: () => '11:42 PM' });
  assert.equal(h.view().big, '11:42 PM');
  assert.equal(h.view().soft, 'Menu');
  h.press('menu');
  assert.equal(h.view().title, 'Menu');
  assert.deepEqual(h.view().lines.map((l) => l.text), ['1 Snake', '2 Phone book']);
  h.press('clear');
  assert.equal(h.screen, 'home');
});

test('typing a number from the home screen dials it with the keypad, and C rubs it out', () => {
  const h = phone();
  keys(h, '9', '5', '5', '5', '0');
  assert.equal(h.screen, 'dial');
  assert.equal(h.view().big, '9555 0');
  h.press('clear');
  assert.equal(h.view().big, '9555');
  keys(h, 'clear', 'clear', 'clear', 'clear');
  assert.equal(h.screen, 'home');
});

test('the phone book rings the pizza place, and the wall phone shares its numbers', () => {
  assert.equal(CONTACTS.length, 3);
  assert.equal(contactFor('95550173').id, 'pizza');
  assert.equal(contactFor('9555 0199').id, 'dazza');
  assert.equal(contactFor('1234'), null);
  assert.equal(formatNumber('95550173'), '9555 0173');
  const h = phone();
  keys(h, 'menu', '2');
  assert.equal(h.screen, 'book');
  h.drain();
  h.press('menu');
  assert.equal(h.screen, 'calling');
  const ring = h.drain().find((e) => e.type === 'ring');
  assert.equal(ring.contact.id, 'pizza');
  h.tick(CALL_MS + 1);
  assert.deepEqual(types(h), ['handoff']);
});

test('a number nobody has rings, then goes engaged, then the phone hangs up', () => {
  const h = phone();
  keys(h, '1', '2', '3', '4', 'menu');
  assert.equal(h.screen, 'calling');
  h.drain();
  h.tick(CALL_MS);
  assert.equal(h.screen, 'engaged');
  assert.deepEqual(types(h), ['engaged']);
  h.tick(ENGAGED_MS + 1);
  assert.equal(h.screen, 'home');
  assert.deepEqual(types(h), ['hangup']);
});

test('Mum answers on the phone, and End hangs up', () => {
  const h = phone();
  keys(h, '9', '5', '5', '5', '0', '1', '0', '0', 'menu');
  h.tick(CALL_MS + 1);
  assert.equal(h.screen, 'talk');
  assert.ok(h.view().lines.some((l) => l.text.includes('upstairs')));
  h.drain();
  h.press('menu');
  assert.equal(h.screen, 'home');
  assert.deepEqual(types(h).filter((t) => t === 'hangup'), ['hangup']);
});

test('C hangs up while it is ringing', () => {
  const h = phone();
  keys(h, 'menu', '2', 'menu');
  h.drain();
  h.press('clear');
  assert.equal(h.screen, 'home');
  assert.ok(types(h).includes('hangup'));
});

test('Snake from the menu: press a key to start, steer with 2 4 6 8, die, try again, and C goes back', () => {
  const h = phone({ best: 21 });
  keys(h, 'menu', 'menu');
  assert.equal(h.screen, 'snake');
  assert.equal(h.view().state, 'ready');
  assert.equal(h.view().best, '0021');
  h.press('5');
  assert.equal(h.view().state, 'play');
  h.press('2'); // up
  h.tick(h.snake.interval);
  assert.equal(h.snake.heading, 'up');
  h.tick(20000);
  assert.equal(h.view().state, 'over');
  assert.deepEqual(h.view().note[0], 'GAME OVER');
  assert.ok(h.drain().some((e) => e.type === 'snake' && e.sound === 'die'));
  h.press('menu');
  assert.equal(h.view().state, 'play');
  assert.equal(h.snake.score, 0);
  h.press('clear');
  assert.equal(h.screen, 'menu');
});

test('Menu pauses the game and the snake stops', () => {
  const h = phone();
  keys(h, 'menu', '1');
  h.press('5');
  h.press('menu');
  assert.equal(h.view().state, 'paused');
  const x = h.snake.body[0].x;
  h.tick(5000);
  assert.equal(h.snake.body[0].x, x);
  h.press('menu');
  h.tick(h.snake.interval);
  assert.notEqual(h.snake.body[0].x, x);
});

console.log(`\n${n} passed`);
