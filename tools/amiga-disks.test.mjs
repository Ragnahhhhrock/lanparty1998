// Tests for the Amiga's disk box: js/amiga-disks.js. Run: node tools/amiga-disks.test.mjs
import assert from 'node:assert/strict';
import { kindOf, labelOf, makeDisk, mergeDisks, fromFileList, walkDirectory, walkEntry, HOUSE_DISKS, cleanConfig, DEFAULT_CONFIG,
  drivesOf, coreOptions, playlist, bundle, MODEL_IDS } from '../js/amiga-disks.js';

let n = 0;
const test = (name, fn) => { fn(); n++; console.log(`ok  ${name}`); };
const f = (name, size = 901120) => ({ name, size });

test('floppies, hard disks and CDs are told apart by their extension', () => {
  for (const [name, kind] of [['a.adf', 'floppy'], ['A.ADF', 'floppy'], ['a.adz', 'floppy'], ['a.dms', 'floppy'], ['d.hdf', 'hd'], ['c.iso', 'cd'], ['c.chd', 'cd'], ['readme.txt', null], ['a.adf.bak', null]]) {
    assert.equal(kindOf(name), kind, name);
  }
});

test('a label drops the extension and the underscores', () => {
  assert.equal(labelOf('Workbench_3.1 (Disk 1 of 2).adf'), 'Workbench 3.1 (Disk 1 of 2)');
});

test('loose files: only usable disk images come through, with their folder path when there is one', () => {
  const list = [f('a.adf'), f('empty.adf', 0), f('notes.txt'), { ...f('b.adf'), webkitRelativePath: 'Amiga/games/b.adf' }, f('huge.adf', 50 * 1048576)];
  const found = fromFileList(list);
  assert.deepEqual(found.map((x) => x.path), ['a.adf', 'Amiga/games/b.adf']);
});

test('a disk has a stable id and a merge keeps each once', () => {
  const a = makeDisk({ file: f('a.adf'), path: 'x/a.adf' }), a2 = makeDisk({ file: f('a.adf'), path: 'x/a.adf' }), b = makeDisk({ file: f('a.adf'), path: 'y/a.adf' });
  assert.equal(a.id, a2.id);
  assert.notEqual(a.id, b.id);
  assert.equal(mergeDisks([a], [a2, b]).length, 2);
});

test('walking a directory finds disk images in folders below it and skips the junk', async () => {
  const file = (name, size = 901120) => ({ kind: 'file', name, getFile: async () => ({ name, size }) });
  const dir = (name, kids) => ({ kind: 'directory', name, async *values() { for (const k of kids) yield k; } });
  const root = dir('Amiga', [file('top.adf'), file('x.txt'), dir('Games', [file('g1.adf'), dir('deep', [file('g2.dms')])]), dir('.git', [file('hidden.adf')]), dir('node_modules', [file('n.adf')])]);
  const found = await walkDirectory(root);
  assert.deepEqual(found.map((x) => x.path).sort(), ['Amiga/Games/deep/g2.dms', 'Amiga/Games/g1.adf', 'Amiga/top.adf']);
});

test('walking dropped entries does the same', async () => {
  const fileEntry = (name, size = 901120) => ({ isFile: true, name, file: (ok) => ok({ name, size }) });
  const dirEntry = (name, kids) => ({ isDirectory: true, name, createReader() { let done = false; return { readEntries: (ok) => { ok(done ? [] : kids); done = true; } }; } });
  const found = await walkEntry(dirEntry('Disks', [fileEntry('a.adf'), fileEntry('b.zip'), dirEntry('more', [fileEntry('c.adf')])]));
  assert.deepEqual(found.map((x) => x.path), ['Disks/a.adf', 'Disks/more/c.adf']);
});

test('the house disks are in the box and are floppies', () => {
  assert.equal(HOUSE_DISKS.length, 2);
  for (const d of HOUSE_DISKS) assert.equal(kindOf(d.name), 'floppy');
});

test('a saved config is cleaned: unknown models, junk and missing parts fall back to the defaults', () => {
  assert.deepEqual(cleanConfig(undefined), DEFAULT_CONFIG);
  assert.deepEqual(cleanConfig('nonsense'), DEFAULT_CONFIG);
  const c = cleanConfig({ model: 'C64', df1: 'yes', hd: true, inserted: { df0: null, df1: 7, hd: 'a|1' } });
  assert.equal(c.model, 'A500');
  assert.equal(c.df1, false);
  assert.equal(c.hd, true);
  assert.equal(c.inserted.df0, null);
  assert.equal(c.inserted.df1, null);
  assert.equal(c.inserted.hd, 'a|1');
  assert.ok(MODEL_IDS.every((m) => cleanConfig({ model: m }).model === m));
});

test('only the drives that are fitted count, and the model picks the core option', () => {
  const c = cleanConfig({ model: 'A1200', df1: true, hd: true, inserted: { df0: 'a', df1: 'b', df2: 'c', hd: 'h', cd: 'k' } });
  assert.deepEqual(Object.keys(drivesOf(c)), ['df0', 'df1', 'hd']);
  assert.deepEqual(coreOptions(c), { puae_model: 'A1200' });
  assert.equal(coreOptions(cleanConfig({ model: 'A2000' })).puae_model, 'A2000');
});

const bytes = (...ids) => Object.fromEntries(ids.map((id) => [id, { data: new Uint8Array([id.length]), ext: id.startsWith('z') ? 'dms' : 'adf' }]));

test('the playlist puts floppies in DF0, DF1, DF2 order and the hard disk last', () => {
  const c = cleanConfig({ df1: true, df2: true, hd: true, inserted: { df0: 'a', df1: 'bb', df2: 'z3', hd: 'h' } });
  const p = playlist(c, { ...bytes('a', 'bb', 'z3'), h: { data: new Uint8Array(4), ext: 'hdf' } });
  assert.equal(p.m3u, 'df0.adf\ndf1.adf\ndf2.dms\nhd.hdf\n');
  assert.deepEqual(p.entries.map((e) => e.name), ['df0.adf', 'df1.adf', 'df2.dms', 'hd.hdf', 'machine.m3u']);
});

test('an empty drive below a full one gets a blank disk, and empty drives at the end are left out', () => {
  const c = cleanConfig({ df1: true, df2: true, inserted: { df0: 'a', df1: null, df2: 'cc' } });
  const p = playlist(c, bytes('a', 'cc'));
  assert.equal(p.m3u, 'df0.adf\ndf1.adf\ndf2.adf\n');
  assert.equal(p.entries[1].data.length, 901120);
  assert.equal(p.entries[1].data.every((b) => b === 0), true);
  const q = playlist(cleanConfig({ df1: true, df2: true, inserted: { df0: 'a', df1: 'bb', df2: null } }), bytes('a', 'bb'));
  assert.equal(q.m3u, 'df0.adf\ndf1.adf\n');
});

test('with nothing in DF0 there is still a DF0 (a blank disk), and a hard disk never goes first', () => {
  const p = playlist(cleanConfig({ hd: true, inserted: { df0: null, hd: 'h' } }), { h: { data: new Uint8Array(4), ext: 'hdf' } });
  assert.equal(p.m3u, 'df0.adf\nhd.hdf\n');
  assert.equal(playlist(cleanConfig({ inserted: { df0: null } }), {}).m3u, 'df0.adf\n');
});

test('a CD goes in on its own', () => {
  const p = playlist(cleanConfig({ cd: true, inserted: { df0: 'a', cd: 'k' } }), { a: { data: new Uint8Array(2), ext: 'adf' }, k: { data: new Uint8Array(9), ext: 'iso' } });
  assert.equal(p.cd, true);
  assert.deepEqual(p.entries.map((e) => e.name), ['cd.iso']);
});

test('a bundle is a real zip with the playlist in it', () => {
  const z = bundle(cleanConfig({ inserted: { df0: 'a' } }), bytes('a'));
  const v = new DataView(z.buffer, z.byteOffset, z.byteLength);
  assert.equal(v.getUint32(0, true), 0x04034b50);
  assert.equal(v.getUint16(z.length - 22 + 10, true), 2);
  assert.ok(Buffer.from(z).includes(Buffer.from('machine.m3u')));
});

console.log(`\n${n} passed`);
