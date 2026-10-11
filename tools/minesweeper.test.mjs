// Logic tests for js/minesweeper.js. Run: node tools/minesweeper.test.mjs
import assert from 'node:assert/strict';
import { Board, LEVELS, MARK } from '../js/minesweeper.js';

let n = 0;
const test = (name, fn) => { fn(); n++; console.log(`ok  ${name}`); };
const seeded = (seed) => () => { // mulberry32
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
const mineCount = (b) => b.mine.reduce((a, m) => a + m, 0);

test('the three levels are the classic ones', () => {
  assert.deepEqual(LEVELS.beginner, { w: 9, h: 9, mines: 10 });
  assert.deepEqual(LEVELS.intermediate, { w: 16, h: 16, mines: 40 });
  assert.deepEqual(LEVELS.expert, { w: 30, h: 16, mines: 99 });
});

test('mines are laid on the first click, and never under it', () => {
  for (let seed = 1; seed <= 200; seed++) {
    const b = new Board(LEVELS.beginner, seeded(seed));
    assert.equal(mineCount(b), 0);
    b.reveal(4, 4);
    assert.equal(mineCount(b), 10);
    assert.equal(b.mine[b.idx(4, 4)], 0);
    assert.notEqual(b.state, 'lost');
  }
});

test('the counts match the neighbouring mines', () => {
  const b = new Board(LEVELS.intermediate, seeded(7));
  b.reveal(0, 0);
  for (let i = 0; i < b.mine.length; i++) {
    assert.equal(b.count[i], b.neighbours(i).filter((j) => b.mine[j]).length);
  }
});

test('a blank square opens its neighbours, but never a mine', () => {
  const b = new Board({ w: 9, h: 9, mines: 1 }, seeded(3));
  b.reveal(0, 0);
  assert.ok(b.opened > 40, 'one mine on a 9x9 board opens most of it');
  for (let i = 0; i < b.mine.length; i++) if (b.open[i]) assert.equal(b.mine[i], 0);
});

test('opening a mine loses and records which one', () => {
  const b = new Board(LEVELS.beginner, seeded(11));
  b.reveal(4, 4);
  const m = b.mine.findIndex((v) => v === 1);
  b.reveal(m % 9, Math.floor(m / 9));
  assert.equal(b.state, 'lost');
  assert.equal(b.exploded, m);
});

test('opening every safe square wins and flags the mines', () => {
  const b = new Board(LEVELS.beginner, seeded(5));
  b.reveal(4, 4);
  for (let i = 0; i < b.mine.length; i++) if (!b.mine[i]) b.reveal(i % 9, Math.floor(i / 9));
  assert.equal(b.state, 'won');
  assert.equal(b.flags, 10);
  assert.equal(b.minesLeft, 0);
});

test('right click goes flag, question mark, nothing; flags block opening', () => {
  const b = new Board(LEVELS.beginner, seeded(2));
  b.cycleMark(1, 1);
  assert.equal(b.mark[b.idx(1, 1)], MARK.FLAG);
  assert.equal(b.minesLeft, 9);
  b.reveal(1, 1);
  assert.equal(b.state, 'ready', 'a flagged square will not open');
  b.cycleMark(1, 1);
  assert.equal(b.mark[b.idx(1, 1)], MARK.QUESTION);
  b.cycleMark(1, 1);
  assert.equal(b.mark[b.idx(1, 1)], MARK.NONE);
  b.cycleMark(1, 1, false);
  b.cycleMark(1, 1, false);
  assert.equal(b.mark[b.idx(1, 1)], MARK.NONE, 'question marks can be turned off');
});

test('chording opens the rest around a satisfied number', () => {
  const b = new Board(LEVELS.beginner, seeded(9));
  b.reveal(4, 4);
  // find an opened number and flag exactly its mines
  const i = [...b.open.keys()].find((k) => b.open[k] && b.count[k] > 0);
  assert.ok(i !== undefined);
  const around = b.neighbours(i);
  for (const j of around) if (b.mine[j]) b.cycleMark(j % 9, Math.floor(j / 9));
  b.chord(i % 9, Math.floor(i / 9));
  for (const j of around) if (!b.mine[j]) assert.equal(b.open[j], 1);
  assert.notEqual(b.state, 'lost');
});

test('chording with the wrong flags does nothing', () => {
  const b = new Board(LEVELS.beginner, seeded(9));
  b.reveal(4, 4);
  const i = [...b.open.keys()].find((k) => b.open[k] && b.count[k] > 0);
  const before = b.opened;
  b.chord(i % 9, Math.floor(i / 9));
  assert.equal(b.opened, before);
});

test('nothing moves after the game is over', () => {
  const b = new Board(LEVELS.beginner, seeded(11));
  b.reveal(4, 4);
  const m = b.mine.findIndex((v) => v === 1);
  b.reveal(m % 9, Math.floor(m / 9));
  const open = b.opened;
  b.reveal(0, 0); b.cycleMark(0, 0);
  assert.equal(b.opened, open);
  assert.equal(b.flags, 0);
});

console.log(`\n${n} tests passed`);
