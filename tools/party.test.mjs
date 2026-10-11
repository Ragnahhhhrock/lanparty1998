// Logic tests for js/party.js. Run: node tools/party.test.mjs
import assert from 'node:assert/strict';
import { Party, BURNER, DISCS, SEC_PER_GAME_MIN, SHOP, DAD, PC_COUNT } from '../js/party.js';

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

// ---- the network ----
const seq = (...v) => { let i = 0; return () => v[i++ % v.length]; };

test('you start on coax with every link up', () => {
  const p = new Party();
  assert.equal(p.net, 'coax');
  assert.equal(p.netDown(), false);
  for (let i = 0; i < PC_COUNT; i++) assert.ok(p.pcLinkUp(i));
});

test('coax: one loose T-connector takes every PC off the network', () => {
  const p = new Party();
  p.dropLink(2, 'loose');
  assert.equal(p.netDown(), true);
  for (let i = 0; i < PC_COUNT; i++) assert.equal(p.pcLinkUp(i), false);
  p.fixLink(2);
  assert.equal(p.netDown(), false);
});

test('coax works itself loose on its own, and only one fault at a time', () => {
  const p = new Party({ rng: seq(0.5, 0.5) });
  const faults = [];
  p.addEventListener('link-down', (e) => faults.push(e.detail.pc));
  run(p, 400);
  assert.equal(faults.length, 1, 'one fault outstanding until somebody fixes it');
  p.fixLink(faults[0]);
  run(p, 400);
  assert.equal(faults.length, 2);
});

test('the hub costs $45 and turns up ten game minutes later', () => {
  const p = new Party();
  assert.ok(p.orderHub());
  assert.equal(p.cash, 150 - SHOP.hubCost);
  assert.equal(p.orderHub(), false, 'no double orders');
  run(p, SHOP.hubDelay * SEC_PER_GAME_MIN - 5);
  assert.equal(p.net, 'coax');
  run(p, 10);
  assert.equal(p.net, 'hub');
});

test('a new hub clears the coax faults', () => {
  const p = new Party();
  p.dropLink(1, 'loose');
  p.orderHub();
  run(p, SHOP.hubDelay * SEC_PER_GAME_MIN + 1);
  assert.equal(p.netDown(), false);
  assert.ok(p.pcLinkUp(1));
});

test('hub: a dropped cable only takes out that PC', () => {
  const p = new Party();
  p.setNet('hub');
  p.dropLink(4, 'tripped');
  assert.equal(p.pcLinkUp(4), false);
  assert.equal(p.pcLinkUp(0), true);
});

test('Dazza\'s dad will not lend a switch until you have a hub', () => {
  const p = new Party();
  assert.equal(p.canBorrowSwitch(), false);
  p.setNet('hub');
  assert.ok(p.borrowSwitch());
});

test('the switch arrives twenty minutes after the call, then goes back at 6:00 AM', () => {
  const p = new Party({ startMinutes: 23 * 60 + 42 });
  const seen = [];
  p.addEventListener('net', (e) => seen.push(`${e.detail.net}:${e.detail.reason}`));
  p.addEventListener('dad-warning', () => seen.push('warning'));
  p.setNet('hub');
  p.borrowSwitch();
  run(p, DAD.delay * SEC_PER_GAME_MIN + 1);
  assert.equal(p.net, 'switch');
  while (p.clockMinutes() < 24 * 60 + DAD.returnAt + 1) p.tick(1, {});
  assert.equal(p.net, 'hub');
  assert.deepEqual(seen.slice(-3), ['switch:delivered', 'warning', 'hub:returned']);
  assert.equal(p.canBorrowSwitch(), false, 'he only lends it once');
});

test('coax faults stop once you are off coax', () => {
  const p = new Party({ rng: () => 0.5 });
  p.setNet('hub');
  run(p, 600);
  assert.equal(p.netDown(), false);
  assert.ok(p.pcs.every((x) => !x.linkDown));
});

test('tripping over a cat5 lead pulls that one PC off the network', () => {
  const p = new Party();
  p.setNet('hub');
  assert.ok(p.tripOver('cat5', 2));
  assert.equal(p.pcLinkUp(2), false);
  assert.equal(p.pcLinkUp(3), true);
  assert.equal(p.tripped, 1);
});

test('tripping over the coax pulls it off PC-06 and takes everyone down', () => {
  const p = new Party();
  assert.ok(p.tripOver('coax', null));
  assert.equal(p.pcs[PC_COUNT - 1].linkDown, true);
  assert.equal(p.netDown(), true);
});

test('a plugged-back-in lead works again', () => {
  const p = new Party();
  p.setNet('hub');
  p.tripOver('cat5', 0);
  p.fixLink(0);
  assert.ok(p.pcLinkUp(0));
});

console.log(`${n} passed`);
