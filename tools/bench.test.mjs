// Logic tests for js/bench-plan.js: where the benches are, what gets unpacked and plugged in, and what stops a box starting.
// Run: node tools/bench.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import * as B from '../js/build.js';
import * as P from '../js/bench-plan.js';

const unpackAll = (s) => { for (const p of s.parts()) s.place(p.id); return s; };
const plugRequired = (s) => { for (const c of s.cables()) if (c.required) s.plug(c.id); return s; };
const ready = (build = B.defaultBuild(), net = 'coax') => plugRequired(unpackAll(new P.Setup(build, net)));

test('both benches sit on the back table, clear of the club PCs and of each other', () => {
  assert.equal(P.BENCHES.length, P.BENCH_COUNT);
  for (const b of P.BENCHES) {
    const l = b.x + P.RIG_SPAN.left, r = b.x + P.RIG_SPAN.right;
    assert.ok(l > -P.TABLE_HALF && r < P.TABLE_HALF, `bench ${b.id} is on the table`);
    for (const x of P.CLUB_X) assert.ok(r < x + P.RIG_SPAN.left || l > x + P.RIG_SPAN.right, `bench ${b.id} against the PC at ${x}`);
    assert.equal(b.z, -4.25);
    assert.equal(b.face, 0);
  }
  const [a, b] = P.BENCHES;
  assert.ok(a.x + P.RIG_SPAN.right < b.x + P.RIG_SPAN.left);
});

test('bench seats follow the six club PCs', () => {
  assert.equal(P.SEAT_BASE, 6);
  assert.equal(P.benchOfSeat(5), null);
  assert.equal(P.benchOfSeat(6), 0);
  assert.equal(P.benchOfSeat(7), 1);
  assert.equal(P.benchOfSeat(8), null);
  assert.equal(P.benchOfSeat('x'), null);
});

test('each bench names the two club PCs it sits between, and those are its neighbours on the coax', () => {
  assert.deepEqual(P.BENCHES.map((b) => b.between), [['PC-01', 'PC-02'], ['PC-02', 'PC-03']]);
  assert.deepEqual(P.BENCHES.map((b) => b.neighbours), [[0, 1], [1, 2]]);
});

test('the parts to unpack depend on the build: no mat, no mat on the table', () => {
  const ids = (b) => P.partsFor(b).map((p) => p.id);
  assert.deepEqual(ids(B.defaultBuild()), ['mat', 'monitor', 'tower', 'keyboard', 'mouse', 'audio']);
  assert.deepEqual(ids({ ...B.defaultBuild(), mat: 'matNone' }), ['monitor', 'tower', 'keyboard', 'mouse', 'audio']);
});

test('speakers need a socket on the power board, headphones do not', () => {
  const spk = P.cablesFor(B.defaultBuild()).map((c) => c.id);
  const cans = P.cablesFor({ ...B.defaultBuild(), audio: 'phones' }).map((c) => c.id);
  assert.ok(spk.includes('pw-spk') && !cans.includes('pw-spk'));
  assert.equal(P.cablesFor({ ...B.defaultBuild(), audio: 'phones' }).find((c) => c.id === 'audio').label, 'Headphone lead');
});

test('the network cables change with the tier and the card', () => {
  const net = (b, tier) => P.cablesFor(b, tier).filter((c) => c.group === 'net').map((c) => c.id);
  const combo = B.defaultBuild();
  assert.deepEqual(net(combo, 'coax'), ['coax-t', 'coax-l', 'coax-r']);
  assert.deepEqual(net(combo, 'hub'), ['cat5-card', 'cat5-hub']);
  assert.deepEqual(net(combo, 'switch'), ['cat5-card', 'cat5-hub']);
  assert.deepEqual(net({ ...combo, nic: 'nicFast' }, 'coax'), []);
  assert.deepEqual(net({ ...combo, nic: 'nicBnc' }, 'hub'), []);
  assert.match(P.netProblem({ ...combo, nic: 'nicFast' }, 'coax'), /no BNC/);
  assert.match(P.netProblem({ ...combo, nic: 'nicBnc' }, 'hub'), /no RJ45/);
  assert.equal(P.netProblem(combo, 'coax'), null);
});

test('the coax runs to the benches own neighbours', () => {
  const labels = P.cablesFor(B.defaultBuild(), 'coax', P.BENCHES[1]).filter((c) => c.group === 'net').map((c) => c.label);
  assert.ok(labels.some((l) => l.includes('PC-02')) && labels.some((l) => l.includes('PC-03')));
});

test('nothing can be plugged in before the part it goes to is on the table', () => {
  const s = new P.Setup(B.defaultBuild());
  assert.equal(s.canPlug('vga').ok, false);
  assert.match(s.canPlug('vga').why, /not on the table/);
  assert.equal(s.canPlug('board').ok, true, 'the board only needs a wall');
  assert.equal(s.canPlug('nope').ok, false);
  s.place('monitor');
  assert.equal(s.canPlug('pw-mon').ok, true);
  assert.equal(s.canPlug('vga').ok, false, 'still no tower');
  s.place('tower');
  assert.equal(s.canPlug('vga').ok, true);
  assert.equal(s.plug('vga'), true);
  assert.equal(s.plug('vga'), false, 'already in');
});

test('placing is once only, and only for parts in the build', () => {
  const s = new P.Setup({ ...B.defaultBuild(), mat: 'matNone' });
  assert.equal(s.place('mat'), false);
  assert.equal(s.place('monitor'), true);
  assert.equal(s.place('monitor'), false);
  assert.equal(s.allPlaced(), false);
  unpackAll(s);
  assert.equal(s.allPlaced(), true);
});

test('the coax and the cat5 go on in order', () => {
  const s = unpackAll(new P.Setup(B.defaultBuild(), 'coax'));
  assert.equal(s.canPlug('coax-l').ok, false);
  assert.match(s.canPlug('coax-l').why, /T-connector first/);
  s.plug('coax-t'); s.plug('coax-l');
  assert.equal(s.netCabled(), false, 'one side is not a bus');
  s.plug('coax-r');
  assert.equal(s.netCabled(), true);
  const gone = s.unplug('coax-t');
  assert.deepEqual(gone.sort(), ['coax-l', 'coax-r', 'coax-t']);
  assert.equal(s.netCabled(), false);
});

test('a box will not start until it has a picture, a keyboard, a mouse and power', () => {
  const s = new P.Setup(B.defaultBuild());
  assert.equal(s.canBoot(), false);
  assert.equal(s.missing().length > 0, true);
  unpackAll(s);
  const need = s.missing();
  for (const re of [/monitor is not plugged/, /keyboard/, /mouse/, /monitor has no power/, /tower has no power/, /wall/]) assert.ok(need.some((t) => re.test(t)), String(re));
  plugRequired(s);
  assert.deepEqual(s.missing(), []);
  assert.equal(s.canBoot(), true);
});

test('what you have not unpacked is not also reported as unplugged', () => {
  const s = new P.Setup(B.defaultBuild());
  assert.equal(s.missing().filter((t) => /not on the table/.test(t)).length, 4);
  assert.equal(s.missing().some((t) => /not plugged into the tower/.test(t)), false);
});

test('power: the tower and the monitor only have it with the board in the wall', () => {
  const s = unpackAll(new P.Setup(B.defaultBuild()));
  s.plug('pw-tower'); s.plug('pw-mon');
  assert.equal(s.towerPowered(), false);
  assert.equal(s.monitorPowered(), false);
  s.plug('board');
  assert.equal(s.towerPowered(), true);
  assert.equal(s.monitorPowered(), true);
  assert.equal(s.speakersPowered(), false);
  s.plug('pw-spk');
  assert.equal(s.speakersPowered(), true);
});

test('cautions: no sound, no speaker power, no network, a card that does not fit', () => {
  const s = ready();
  const c = s.cautions();
  assert.ok(c.some((t) => /jack/.test(t)));
  assert.ok(c.some((t) => /speakers have no power/.test(t)));
  assert.ok(c.some((t) => /No network cable/.test(t)));
  for (const id of ['audio', 'pw-spk', 'coax-t', 'coax-l', 'coax-r']) s.plug(id);
  assert.deepEqual(s.cautions(), []);
  assert.ok(ready({ ...B.defaultBuild(), nic: 'nicFast' }).cautions().some((t) => /no BNC/.test(t)));
});

test('when the hub turns up the coax comes off and the card has to be plugged in again', () => {
  const s = ready();
  for (const id of ['coax-t', 'coax-l', 'coax-r']) s.plug(id);
  assert.equal(s.netCabled(), true);
  const gone = s.setNet('hub');
  assert.deepEqual(gone.sort(), ['coax-l', 'coax-r', 'coax-t']);
  assert.equal(s.netCabled(), false);
  assert.equal(s.plugged.has('vga'), true, 'the rest stays plugged in');
  s.plug('cat5-card'); s.plug('cat5-hub');
  assert.equal(s.netCabled(), true);
  assert.deepEqual(s.setNet('hub'), []);
  assert.equal(s.netCabled(), true);
});

test('a BNC-only card stays off the network once the hub is in', () => {
  const s = ready({ ...B.defaultBuild(), nic: 'nicBnc' });
  for (const id of ['coax-t', 'coax-l', 'coax-r']) s.plug(id);
  assert.equal(s.netCabled(), true);
  s.setNet('hub');
  assert.equal(s.netCabled(), false);
  assert.equal(s.cables().some((c) => c.group === 'net'), false);
  assert.ok(s.nicProblem());
});

test('the checklist counts only what you must do, and finishes at the same time as canBoot', () => {
  const s = new P.Setup(B.defaultBuild());
  const total = s.progress().total;
  assert.ok(total >= 9);
  assert.equal(s.progress().done, 0);
  unpackAll(s); plugRequired(s);
  assert.equal(s.progress().done > 0, true);
  assert.equal(s.canBoot(), true);
  assert.equal(s.checklist().filter((i) => !i.optional && !i.done).length, 0);
  assert.ok(s.checklist().some((i) => i.optional && !i.done), 'the optional bits are still open');
});

test('once on, a box cannot be started again', () => {
  const s = ready();
  s.poweredOn = true;
  assert.equal(s.canBoot(), false);
});

test('every part of every build fits on its bench and nothing sits on anything else', () => {
  const overlaps = (a, b) => a[0] < b[1] && b[0] < a[1] && a[2] < b[3] && b[2] < a[3];
  for (const crt of B.CRT) for (const mat of B.MAT) for (const kb of B.KEYBOARD) for (const audio of B.AUDIO) {
    const L = P.layoutFor({ ...B.defaultBuild(), crt: crt.id, mat: mat.id, keyboard: kb.id, audio: audio.id });
    const name = `${crt.id} ${mat.id} ${kb.id} ${audio.id}`;
    const feet = { monitor: L.monitor.foot, tower: L.tower.foot, keyboard: L.keyboard.foot, mouse: L.mouse.foot, ...(L.speakers ? { speakerL: L.speakers.feet[0], speakerR: L.speakers.feet[1] } : {}) };
    for (const [part, f] of Object.entries(feet)) {
      assert.ok(f[0] >= P.RIG_SPAN.left - 1e-9 && f[1] <= P.RIG_SPAN.right + 1e-9, `${name}: ${part} is inside the span`);
      assert.ok(f[3] <= P.TABLE_DEPTH / 2, `${name}: ${part} is not off the front of the table`);
    }
    const names = Object.keys(feet);
    for (let i = 0; i < names.length; i++) for (let j = i + 1; j < names.length; j++) {
      assert.equal(overlaps(feet[names[i]], feet[names[j]]), false, `${name}: ${names[i]} on ${names[j]}`);
    }
    if (L.mat) assert.equal(overlaps(L.mat.foot, L.keyboard.foot), false, `${name}: mat on keyboard`);
    if (L.mat) assert.equal(overlaps(L.mat.foot, L.tower.foot), false, `${name}: mat on tower`);
  }
});

test('a bigger tube is a bigger piece of glass and the seat keeps the same distance from it', () => {
  const ks = B.CRT.map((c) => P.layoutFor({ ...B.defaultBuild(), crt: c.id }));
  for (let i = 1; i < ks.length; i++) assert.ok(ks[i].k > ks[i - 1].k);
  assert.ok(Math.abs(ks[2].k - 1) < 1e-9, 'the 17-inch is the club size');
  for (const L of ks) {
    const glassZ = L.monitor.z + 0.157 * L.k;
    assert.ok(Math.abs(L.seat.z - glassZ - 0.36) < 1e-9);
    assert.ok(Math.abs(L.monitor.z - 0.34 * L.k - -0.46) < 1e-9, 'the back is always in the same place');
  }
});

test('the club PCs layout is what the 17-inch default gives', () => {
  const L = P.layoutFor(B.defaultBuild());
  assert.equal(L.monitor.z.toFixed(3), '-0.120');
  assert.equal(L.tower.x, 0.52);
  assert.equal(L.keyboard.z, 0.24);
});
