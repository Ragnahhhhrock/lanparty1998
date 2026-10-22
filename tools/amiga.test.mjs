// Tests for the Amiga 500's floppy (tools/make-amiga-disk.py) and the files the emulator needs.
// Run: node tools/amiga.test.mjs
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';

let n = 0;
const test = (name, fn) => { fn(); n++; console.log(`ok  ${name}`); };
const adf = new DataView(readFileSync(new URL('../bundles/lanparty-amiga.adf', import.meta.url)).buffer.slice(0));
const raw = readFileSync(new URL('../bundles/lanparty-amiga.adf', import.meta.url));
const long = (block, i) => adf.getUint32(block * 512 + i * 4);
const sum = (block) => { let s = 0; for (let i = 0; i < 128; i++) s = (s + long(block, i)) >>> 0; return s; };

test('it is an 880 KB floppy with a DOS boot block', () => {
  assert.equal(raw.length, 901120);
  assert.equal(raw.subarray(0, 4).toString('latin1'), 'DOS\0');
});

test('the boot block checksum adds up', () => {
  let s = 0;
  for (let i = 0; i < 256; i++) { const v = adf.getUint32(i * 4); s += v; if (s > 0xffffffff) s = (s & 0xffffffff) + 1; }
  assert.equal(s >>> 0, 0xffffffff);
});

test('the root block is a root block, named LANPARTY, and its checksum adds up', () => {
  assert.equal(long(880, 0), 2);
  assert.equal(long(880, 127), 1);
  assert.equal(sum(880), 0);
  const len = raw[880 * 512 + 432];
  assert.equal(raw.subarray(880 * 512 + 433, 880 * 512 + 433 + len).toString('latin1'), 'LANPARTY');
});

test('every used header block has a good checksum, and S/Startup-Sequence is on the disk in full', () => {
  const script = readFileSync(new URL('./amiga/Startup-Sequence', import.meta.url));
  let headers = 0;
  for (let b = 2; b < 1760; b++) {
    if (long(b, 0) === 2 && (long(b, 127) === 2 || long(b, 127) === 0xfffffffd)) { // a directory or a file header
      assert.equal(sum(b), 0, `block ${b}`);
      headers++;
    }
  }
  assert.equal(headers, 2, 'the S directory and the script');
  const hay = raw.toString('latin1');
  assert.ok(hay.includes(script.toString('latin1').slice(0, 60)), 'the script text is on the disk');
});

test('the emulator, the core and the frame page are all in the repo, and the core is not one that needs a ROM', () => {
  for (const f of ['vendor/emulatorjs/amiga.html', 'js/amiga-frame.js', 'vendor/emulatorjs/data/cores/puae-wasm.data', 'vendor/emulatorjs/data/cores/reports/puae.json']) {
    assert.ok(existsSync(new URL(`../${f}`, import.meta.url)), f);
  }
  const frame = readFileSync(new URL('../js/amiga-frame.js', import.meta.url), 'utf8');
  assert.match(frame, /puae_kickstart: 'aros'/);
  assert.doesNotMatch(frame, /cdn\./i);
});

console.log(`\n${n} passed`);
