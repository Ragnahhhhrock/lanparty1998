// Logic tests for js/solitaire.js. Run: node tools/solitaire.test.mjs
import assert from 'node:assert/strict';
import { deal, drawStock, move, lift, autoFoundation, fitsColumn, fitsFoundation, foundationFor, canFinish, finishStep, won, clone, isRed, name } from '../js/solitaire.js';

let n = 0;
const test = (label, fn) => { fn(); n++; console.log(`ok  ${label}`); };
const seeded = (seed) => () => { // mulberry32
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
const card = (suit, rank, up = true) => ({ suit, rank, up });
const empty = (draw = 1) => ({ stock: [], waste: [], found: [[], [], [], []], tab: [[], [], [], [], [], [], []], draw, score: 0, moves: 0, recycles: 0 });
const every = (g) => [...g.stock, ...g.waste, ...g.found.flat(), ...g.tab.flat()];

test('a deal uses all 52 cards once and lays out 1 to 7 columns', () => {
  for (let seed = 1; seed <= 50; seed++) {
    const g = deal(seeded(seed));
    assert.equal(every(g).length, 52);
    assert.equal(new Set(every(g).map(name)).size, 52);
    assert.equal(g.stock.length, 24);
    g.tab.forEach((col, i) => {
      assert.equal(col.length, i + 1);
      col.forEach((c, k) => assert.equal(c.up, k === i, 'only the last card of a column starts face up'));
    });
    assert.ok(g.stock.every((c) => !c.up));
  }
});

test('the same seed deals the same game', () => {
  assert.deepEqual(deal(seeded(9)), deal(seeded(9)));
  assert.notDeepEqual(deal(seeded(9)), deal(seeded(10)));
});

test('columns build down in alternating colours, and a king goes on an empty column', () => {
  assert.ok(fitsColumn(card('S', 6), [card('H', 7)]));
  assert.ok(!fitsColumn(card('S', 6), [card('C', 7)]), 'same colour');
  assert.ok(!fitsColumn(card('S', 6), [card('H', 8)]), 'not one lower');
  assert.ok(!fitsColumn(card('S', 6), [card('H', 7, false)]), 'a face-down card takes nothing');
  assert.ok(fitsColumn(card('D', 13), []));
  assert.ok(!fitsColumn(card('D', 12), []));
});

test('foundations build up in one suit from the ace', () => {
  assert.ok(fitsFoundation(card('H', 1), []));
  assert.ok(!fitsFoundation(card('H', 2), []));
  assert.ok(fitsFoundation(card('H', 2), [card('H', 1)]));
  assert.ok(!fitsFoundation(card('S', 2), [card('H', 1)]));
  assert.ok(!fitsFoundation(card('H', 3), [card('H', 1)]));
});

test('draw one turns a card; an empty stock turns the waste back over', () => {
  const g = deal(seeded(3));
  assert.ok(drawStock(g));
  assert.equal(g.waste.length, 1);
  assert.ok(g.waste[0].up);
  assert.equal(g.stock.length, 23);
  while (g.stock.length) drawStock(g);
  assert.equal(g.waste.length, 24);
  g.score = 250;
  assert.ok(drawStock(g), 'recycle');
  assert.equal(g.stock.length, 24);
  assert.equal(g.waste.length, 0);
  assert.ok(g.stock.every((c) => !c.up));
  assert.equal(g.score, 150, 'turning it over again costs 100 in draw one');
  assert.equal(g.recycles, 1);
});

test('draw three turns three, and the last turn can be fewer', () => {
  const g = deal(seeded(4), 3);
  drawStock(g);
  assert.equal(g.waste.length, 3);
  for (let i = 0; i < 7; i++) drawStock(g);
  assert.equal(g.waste.length, 24);
  assert.equal(g.stock.length, 0);
});

test('nothing to draw when both piles are empty', () => {
  const g = empty();
  assert.equal(drawStock(g), false);
});

test('a run moves as one, and the column under it turns over (+5)', () => {
  const g = empty();
  g.tab[0] = [card('C', 9, false), card('H', 7), card('S', 6), card('D', 5)];
  g.tab[1] = [card('S', 8)];
  assert.ok(move(g, { from: 'tab', i: 0, at: 1 }, { to: 'tab', i: 1 }));
  assert.deepEqual(g.tab[1].map(name), ['8S', '7H', '6S', '5D']);
  assert.deepEqual(g.tab[0].map(name), ['9C']);
  assert.ok(g.tab[0][0].up);
  assert.equal(g.score, 5);
  assert.equal(g.moves, 1);
});

test('an illegal move changes nothing', () => {
  const g = empty();
  g.tab[0] = [card('H', 7)];
  g.tab[1] = [card('S', 9)];
  const before = clone(g);
  assert.equal(move(g, { from: 'tab', i: 0, at: 0 }, { to: 'tab', i: 1 }), false);
  assert.deepEqual(g, before);
});

test('a face-down card cannot be lifted, and a run cannot go to a foundation', () => {
  const g = empty();
  g.tab[0] = [card('H', 1, false), card('S', 2)];
  assert.equal(lift(g, { from: 'tab', i: 0, at: 0 }), null);
  g.tab[1] = [card('S', 9), card('H', 8), card('S', 7)];
  assert.equal(move(g, { from: 'tab', i: 1, at: 1 }, { to: 'found', i: 0 }), false);
});

test('a column cannot be moved onto itself', () => {
  const g = empty();
  g.tab[0] = [card('H', 7), card('S', 6)];
  assert.equal(move(g, { from: 'tab', i: 0, at: 1 }, { to: 'tab', i: 0 }), false);
});

test('waste to a column is +5, to a foundation is +10', () => {
  const g = empty();
  g.tab[0] = [card('S', 9)];
  g.waste = [card('H', 1), card('H', 8)];
  assert.ok(move(g, { from: 'waste' }, { to: 'tab', i: 0 }));
  assert.equal(g.score, 5);
  g.waste = [card('H', 1)];
  assert.ok(move(g, { from: 'waste' }, { to: 'found', i: 2 }));
  assert.equal(g.score, 15);
  assert.equal(g.found[2].length, 1);
});

test('taking a card back off a foundation costs 15 and never goes below zero', () => {
  const g = empty();
  g.found[0] = [card('S', 1), card('S', 2), card('S', 3)];
  g.tab[0] = [card('H', 4)];
  g.score = 10;
  assert.ok(move(g, { from: 'found', i: 0 }, { to: 'tab', i: 0 }));
  assert.equal(g.score, 0);
  assert.equal(g.found[0].length, 2);
});

test('aces go to the first empty foundation; a suit stays in its pile', () => {
  const g = empty();
  g.found[0] = [card('S', 1)];
  assert.equal(foundationFor(g, card('H', 1)), 1);
  assert.equal(foundationFor(g, card('S', 2)), 0);
  assert.equal(foundationFor(g, card('H', 2)), -1);
  g.found[1] = [card('H', 1)];
  assert.equal(foundationFor(g, card('H', 2)), 1);
});

test('double click sends the top card to a foundation, but not from the middle of a run', () => {
  const g = empty();
  g.tab[0] = [card('C', 5, false), card('D', 1)];
  assert.ok(autoFoundation(g, { from: 'tab', i: 0, at: 1 }));
  assert.ok(g.tab[0][0].up, 'and it turns the card under it');
  g.tab[1] = [card('S', 4), card('H', 2)];
  assert.equal(autoFoundation(g, { from: 'tab', i: 1, at: 0 }), false);
});

test('the colours are right', () => {
  assert.ok(isRed(card('H', 1)) && isRed(card('D', 1)));
  assert.ok(!isRed(card('S', 1)) && !isRed(card('C', 1)));
});

test('once everything is face up the game can finish itself, and then it is won', () => {
  const g = empty();
  g.tab[0] = [card('S', 3), card('S', 2)];
  g.tab[1] = [card('S', 1)];
  assert.ok(canFinish(g));
  let steps = 0;
  while (finishStep(g)) steps++;
  assert.equal(steps, 3);
  assert.equal(g.found.flat().length, 3);
  assert.equal(canFinish(deal(seeded(1))), false);
});

test('a full set of foundations is a win', () => {
  const g = empty();
  assert.equal(won(g), false);
  g.found = ['S', 'H', 'D', 'C'].map((s) => Array.from({ length: 13 }, (_, i) => card(s, i + 1)));
  assert.ok(won(g));
});

test('playing 200 random games for 300 moves never loses or duplicates a card', () => {
  for (let seed = 1; seed <= 200; seed++) {
    const rng = seeded(seed);
    const g = deal(rng, seed % 2 ? 1 : 3);
    for (let k = 0; k < 300; k++) {
      const r = rng();
      if (r < 0.3) drawStock(g);
      else {
        const src = r < 0.5 ? { from: 'waste' } : { from: 'tab', i: Math.floor(rng() * 7), at: Math.floor(rng() * 4) };
        const dst = rng() < 0.4 ? { to: 'found', i: Math.floor(rng() * 4) } : { to: 'tab', i: Math.floor(rng() * 7) };
        if (!move(g, src, dst)) autoFoundation(g, src);
      }
      assert.equal(every(g).length, 52);
    }
    assert.equal(new Set(every(g).map(name)).size, 52);
    for (const col of g.tab) if (col.length) assert.ok(col[col.length - 1].up, 'the top card of a column is always face up');
    for (const p of g.found) p.forEach((c, i) => { assert.equal(c.rank, i + 1); assert.equal(c.suit, p[0].suit); });
  }
});

console.log(`\n${n} tests passed`);
