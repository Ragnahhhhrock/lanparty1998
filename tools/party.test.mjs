// Logic tests for js/party.js. Run: node tools/party.test.mjs
import assert from 'node:assert/strict';
import { Party, BURNER, DISCS, SEC_PER_GAME_MIN } from '../js/party.js';

const run = (p, seconds, ctx = {}) => { for (let i = 0; i < seconds * 10; i++) p.tick(0.1, ctx); };
let n = 0;
const test = (name, fn) => { fn(); n++; console.log(`ok  ${name}`); };

test('a 74 minute disc at 2x is a 37 minute write', () => {
  assert.equal(new Party().burnMinutes(), 37);
});

test('a burn costs a blank, takes 370 real seconds, then pays the mates', () => {
  const p = new Party();
  assert.ok(p.startBurn('MIX'));
  assert.equal(p.cash, 150 - BURNER.blankCost);
  run(p, 300);
  assert.ok(p.job, 'still writing at 300s');
  run(p, 80);
  assert.equal(p.job, null);
  assert.equal(p.discs, 1);
  assert.equal(p.cash, 150 - BURNER.blankCost + DISCS.MIX.pays);
});

test('only one burn at a time: there is one burner', () => {
  const p = new Party();
  assert.ok(p.startBurn());
  assert.equal(p.startBurn(), false);
});

test('cannot burn without the price of a blank', () => {
  const p = new Party();
  p.cash = BURNER.blankCost - 1;
  assert.equal(p.canBurn(), false);
});

test('sitting at the burner mid-write makes a coaster', () => {
  const p = new Party();
  p.startBurn();
  run(p, BURNER.underrunSeconds + 2, { seatedPc: BURNER.pc });
  assert.equal(p.job, null);
  assert.equal(p.coasters, 1);
  assert.equal(p.discs, 0);
});

test('sitting at a different PC is fine', () => {
  const p = new Party();
  p.startBurn();
  run(p, 60, { seatedPc: 0 });
  assert.ok(p.job);
});

test('cancelling is a coaster', () => {
  const p = new Party();
  p.startBurn();
  p.cancelBurn();
  assert.equal(p.coasters, 1);
});

test('game time runs at one minute per ten seconds', () => {
  const p = new Party();
  run(p, 60);
  assert.ok(Math.abs(p.now - 60 / SEC_PER_GAME_MIN) < 1e-9);
});

console.log(`${n} passed`);
