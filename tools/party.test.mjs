// Logic tests for js/party.js. Run: node tools/party.test.mjs
import assert from 'node:assert/strict';
import { Party, BURNER, DISCS, SEC_PER_GAME_MIN, SHOP, DAD, PC_COUNT, OC, HEAT, FAN, RAM } from '../js/party.js';

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

// ---- heat, the fan and the blue screen ----
test('a stock PC never gets hot, with the fan on or off', () => {
  for (const on of [true, false]) {
    const p = new Party({ rng: () => 0.99 });
    p.setFan(on);
    run(p, 600);
    assert.equal(p.pcs[0].heat, 0);
    assert.equal(p.pcs[0].crashed, false);
  }
});

test('an overclocked PC is fine as long as the fan keeps turning', () => {
  for (const level of [1, 2]) {
    const p = new Party({ rng: () => 0.99 });
    p.nextKnock = Infinity; // nobody kicks the plug in this one
    p.setOverclock(2, level);
    p.setOverclock(4, level);
    run(p, 900);
    assert.equal(p.pcs[2].crashed, false, `back row, level ${level}`);
    assert.equal(p.pcs[4].crashed, false, `front row, level ${level}`);
  }
});

test('turn the fan off and the overclocked PC blue screens', () => {
  const p = new Party({ rng: () => 0.99 });
  p.setOverclock(1, 1);
  p.setFan(false);
  const seen = [];
  p.addEventListener('hot', () => seen.push('hot'));
  p.addEventListener('crash', (e) => seen.push(`crash:${e.detail.pc}`));
  run(p, 200);
  assert.equal(p.pcs[1].crashed, false, 'a modest overclock lasts a few minutes');
  run(p, 150);
  assert.equal(p.pcs[1].crashed, true);
  assert.deepEqual(seen, ['hot', 'crash:1']);
});

test('the heavy overclock goes in about two minutes without the fan', () => {
  const p = new Party({ rng: () => 0.99 });
  p.setOverclock(0, 2);
  p.setFan(false);
  run(p, 100);
  assert.equal(p.pcs[0].crashed, false);
  run(p, 40);
  assert.equal(p.pcs[0].crashed, true);
});

test('rebooting leaves the case hot, so a PC with no fan crashes again soon', () => {
  const p = new Party({ rng: () => 0.99 });
  p.setOverclock(0, 2);
  p.setFan(false);
  run(p, 150);
  assert.ok(p.reboot(0));
  assert.equal(p.pcs[0].heat, HEAT.afterReboot);
  run(p, 60);
  assert.equal(p.pcs[0].crashed, true);
});

test('a crashed PC stops cooling or heating, and reboot only works on a crashed PC', () => {
  const p = new Party({ rng: () => 0.99 });
  assert.equal(p.reboot(3), false);
});

test('the fan gets knocked out, but only once somebody has overclocked', () => {
  const quiet = new Party({ rng: () => 0.5 });
  run(quiet, 1200);
  assert.equal(quiet.fan.on, true);
  const p = new Party({ rng: () => 0.5 });
  p.setOverclock(0, 1);
  const why = [];
  p.addEventListener('fan-off', (e) => why.push(e.detail.why));
  run(p, 1200);
  assert.equal(p.fan.on, false);
  assert.deepEqual(why, ['knocked']);
});

test('tripping over the fan lead pulls the plug', () => {
  const p = new Party();
  assert.ok(p.tripOver('fan', null));
  assert.equal(p.fan.on, false);
  assert.equal(p.netDown(), false, 'the network is fine');
});

test('the fan only sweeps while it is on', () => {
  const p = new Party({ rng: () => 0.99 });
  p.setFan(false);
  const phase = p.fan.phase;
  run(p, 30);
  assert.equal(p.fan.phase, phase);
  p.setFan(true);
  run(p, FAN.period / 4);
  assert.ok(Math.abs(p.fanSweep() - 1) < 0.01, 'a quarter of the way round it faces the front row');
});

test('the back row is cooled when the fan faces back, and the front row when it faces front', () => {
  const p = new Party({ rng: () => 0.99 });
  run(p, FAN.period / 4);           // facing the front row
  assert.ok(p.fanFactor(4) > p.fanFactor(1));
  run(p, FAN.period / 2);           // now facing the back row
  assert.ok(p.fanFactor(1) > p.fanFactor(4));
});

test('overclock levels cycle round to stock', () => {
  const p = new Party();
  p.cycleOverclock(0); p.cycleOverclock(0); p.cycleOverclock(0);
  assert.equal(p.pcs[0].oc, 0);
  assert.equal(OC.length, 3);
});

test('the burner PC blue screening mid-write makes a coaster', () => {
  const p = new Party({ rng: () => 0.99 });
  p.nextKnock = Infinity;
  p.setOverclock(BURNER.pc, 2);
  p.setFan(false);
  p.startBurn();
  run(p, 140);
  assert.equal(p.pcs[BURNER.pc].crashed, true);
  assert.equal(p.job, null);
  assert.equal(p.coasters, 1);
});

// ---- RAM from Singapore ----
test('every PC starts on 16MB', () => {
  assert.ok(new Party().pcs.every((pc) => pc.ram === 16));
});

test('Singapore RAM is a lot cheaper than the shop', () => {
  assert.ok(RAM.sgPrice < RAM.shopPrice / 2);
});

test('cash buys sticks: Macca goes away and comes back ninety game minutes later', () => {
  const p = new Party({ rng: () => 0.99 });
  assert.ok(p.sendBuddy(2));
  assert.equal(p.cash, 150 - 2 * RAM.sgPrice);
  assert.equal(p.buddy.state, 'away');
  assert.equal(p.sendBuddy(1), false, 'he is already on the plane');
  run(p, RAM.tripMinutes * SEC_PER_GAME_MIN - 5);
  assert.equal(p.buddy.state, 'away');
  run(p, 10);
  assert.equal(p.buddy.state, 'back');
  assert.equal(p.sticks, 0, 'still in his bag until you ask');
  assert.ok(p.collectRam());
  assert.equal(p.sticks, 2);
  assert.equal(p.buddy.state, 'home');
});

test('you cannot send him with money you do not have', () => {
  const p = new Party();
  p.cash = RAM.sgPrice - 1;
  assert.equal(p.canSendBuddy(1), false);
  p.cash = 1000;
  assert.equal(p.canSendBuddy(RAM.maxOrder + 1), false);
});

test('fitting a stick takes one from your pocket and adds 16MB, up to 64MB', () => {
  const p = new Party();
  p.sticks = 5;
  for (let k = 0; k < 3; k++) assert.ok(p.fitRam(0));
  assert.equal(p.pcs[0].ram, 64);
  assert.equal(p.sticks, 2);
  assert.equal(p.fitRam(0), false, 'no more slots');
  assert.equal(p.fitRam(1), true);
});

test('no sticks, no upgrade', () => {
  assert.equal(new Party().fitRam(0), false);
});

console.log(`${n} passed`);
