// Logic tests for js/build.js. Run: node tools/build.test.mjs
import assert from 'node:assert/strict';
import { OC } from '../js/party.js';
import * as B from '../js/build.js';

let n = 0;
const test = (name, fn) => { fn(); n++; console.log(`ok  ${name}`); };

test('the catalogue spans a small 14-inch to a 19-inch monitor, cheapest first', () => {
  assert.equal(B.CRT[0].inches, 14);
  assert.equal(B.CRT.at(-1).inches, 19);
  for (let i = 1; i < B.CRT.length; i++) {
    assert.ok(B.CRT[i].price > B.CRT[i - 1].price);
    assert.ok(B.CRT[i].glass[0] > B.CRT[i - 1].glass[0]);
  }
});

test('every part has a unique id and a price', () => {
  for (const [group, parts] of Object.entries(B.PARTS)) {
    for (const [id, p] of Object.entries(parts)) {
      assert.equal(p.id, id, group);
      assert.ok(Number.isFinite(p.price) && p.price >= 0, id);
      assert.ok(p.name && p.name.length > 2, id);
    }
  }
  const ids = Object.values(B.PARTS).flatMap((g) => Object.keys(g));
  assert.equal(new Set(ids).size, ids.length);
});

test('the Pentium II 300 overclock table matches the club PCs', () => {
  const oc = B.ocFor(B.PARTS.cpu.p300);
  assert.deepEqual(oc, OC);
});

test('faster clocks run hotter, and every CPU has three steps', () => {
  for (const cpu of B.CPU) {
    const oc = B.ocFor(cpu);
    assert.equal(oc.length, 3);
    assert.ok(oc[0].mhz < oc[1].mhz && oc[1].mhz < oc[2].mhz, cpu.id);
    assert.ok(oc[0].heat < 0 && oc[0].heat < oc[1].heat && oc[1].heat < oc[2].heat, cpu.id);
  }
});

test('the default build can be bought and leaves room for a burner', () => {
  const d = B.defaultBuild();
  assert.deepEqual(B.validate(d), []);
  assert.ok(B.price(d) < 1000);
  assert.ok(B.canBuy({ ...d, cdr: 'cdr2' }));
  assert.equal(B.remaining(d), B.BUDGET - B.price(d));
});

test('a build needs a boot disk', () => {
  const d = { ...B.defaultBuild(), hdd: [null, null, null] };
  assert.ok(B.validate(d).some((s) => /boot/.test(s)));
});

test('the IDE connectors hold four drives', () => {
  const d = { ...B.defaultBuild(), hdd: ['h21', 'h21', 'h21'], cdrom: 'cd24', cdr: null };
  assert.equal(B.ideUsed(d), 4);
  assert.deepEqual(B.validate(d), []);
  assert.ok(B.validate({ ...d, cdr: 'cdr2' }).some((s) => /IDE/.test(s)));
});

test('the budget is a hard limit', () => {
  const d = { ...B.defaultBuild(), crt: 'crt19', cpu: 'p450', ram: 'ram128', hdd: ['h10', 'h10', null], cdr: 'cdr4' };
  assert.ok(B.price(d) > B.BUDGET);
  assert.ok(B.validate(d).some((s) => /over/.test(s)));
});

test('price adds floppies and repeated disks', () => {
  const d = { ...B.defaultBuild(), floppy: 2, hdd: ['h43', 'h43', null] };
  const base = B.price(B.defaultBuild());
  assert.equal(B.price(d), base + B.FLOPPY_PRICE + B.PARTS.hdd.h43.price);
  assert.equal(B.lines(d).find((l) => l.group === 'hdd').qty, 2);
});

test('sanitize repairs junk and keeps good builds', () => {
  assert.deepEqual(B.sanitize(null), B.defaultBuild());
  assert.deepEqual(B.sanitize('x'), B.defaultBuild());
  const good = { ...B.defaultBuild(), crt: 'crt19', cdr: 'cdr2', floppy: 2 };
  assert.deepEqual(B.sanitize(good), good);
  const junk = B.sanitize({ crt: 'nope', cpu: '__proto__', hdd: [null, 'h84', 'x', 'h21'], floppy: 9, cdrom: 'zz', nic: 5 });
  assert.equal(junk.crt, 'crt17');
  assert.equal(junk.cpu, 'p300');
  assert.deepEqual(junk.hdd, ['h84', null, null]);
  assert.equal(junk.floppy, 2);
  assert.equal(junk.cdrom, null);
  assert.equal(junk.nic, 'nicCombo');
});

test('specOf adds up disks, burn speed and speakers', () => {
  const s = B.specOf({ ...B.defaultBuild(), hdd: ['h43', 'h21', null], cdr: 'cdr4', audio: 'phones' });
  assert.equal(s.diskGb, 6.4);
  assert.equal(s.burnSpeed, 4);
  assert.equal(s.speakers, false);
  assert.equal(B.specOf(B.defaultBuild()).burnSpeed, 0);
});

test('network cards: BNC on the coax, RJ45 on the hub, speed capped by both', () => {
  const { nicBnc, nicCombo, nicFast } = B.PARTS.nic;
  assert.ok(B.nicWorksOn(nicBnc, 'coax') && !B.nicWorksOn(nicBnc, 'hub'));
  assert.ok(B.nicWorksOn(nicCombo, 'coax') && B.nicWorksOn(nicCombo, 'hub'));
  assert.ok(!B.nicWorksOn(nicFast, 'coax') && B.nicWorksOn(nicFast, 'switch'));
  assert.equal(B.nicSpeed(nicFast, 'coax', 1), 0);
  assert.equal(B.nicSpeed(nicCombo, 'switch', 10), 3);
  assert.equal(B.nicSpeed(nicFast, 'switch', 10), 10);
  assert.equal(B.nicSpeed(nicFast, 'hub', 3), 3);
});

test('warnings flag a card that cannot reach the coax', () => {
  assert.equal(B.warnings(B.defaultBuild(), 'coax').length, 1); // the speakers line only
  assert.ok(B.warnings({ ...B.defaultBuild(), nic: 'nicFast' }, 'coax').some((s) => /no BNC/.test(s)));
});

test('POST lines come in order, the memory counter matches the RAM, and the drives are listed', () => {
  const d = { ...B.defaultBuild(), hdd: ['h43', 'h21', null], cdr: 'cdr2', ram: 'ram64' };
  const { lines, seconds } = B.postLines(d);
  for (let i = 1; i < lines.length; i++) assert.ok(lines[i].at >= lines[i - 1].at, `line ${i}`);
  assert.equal(lines.find((l) => l.counter).counter, 64 * 1024);
  assert.ok(lines.some((l) => /Primary Master\s*: 4.3GB hard disk/.test(l.text)));
  assert.ok(lines.some((l) => /2x CD-R/.test(l.text)));
  assert.ok(lines.some((l) => /Secondary Slave\s*: 24x CD-ROM/.test(l.text)));
  assert.ok(seconds > lines.at(-1).at);
  assert.equal(B.postSeconds(d), seconds);
});

test('summary has a row for every part group', () => {
  assert.equal(B.summary(B.defaultBuild()).length, 9);
});

console.log(`${n} passed`);
