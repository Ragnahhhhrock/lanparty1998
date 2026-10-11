// Tests for js/zip.js. Run: node tools/zip.test.mjs
// The zip is read back by hand (local headers and the central directory), and by `unzip -t`
// when that is installed.
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { makeZip, crc32 } from '../js/zip.js';

let n = 0;
const test = (name, fn) => { fn(); n++; console.log(`ok  ${name}`); };

test('crc32 matches the standard check value', () => {
  assert.equal(crc32(new TextEncoder().encode('123456789')), 0xcbf43926);
  assert.equal(crc32(new Uint8Array(0)), 0);
});

// read a stored zip back
function read(zip) {
  const v = new DataView(zip.buffer, zip.byteOffset, zip.byteLength);
  const end = zip.length - 22;
  assert.equal(v.getUint32(end, true), 0x06054b50, 'end of central directory');
  const count = v.getUint16(end + 10, true);
  let p = v.getUint32(end + 16, true);
  const out = {};
  for (let i = 0; i < count; i++) {
    assert.equal(v.getUint32(p, true), 0x02014b50, 'central directory entry');
    const crc = v.getUint32(p + 16, true), size = v.getUint32(p + 24, true);
    const nameLen = v.getUint16(p + 28, true), at = v.getUint32(p + 42, true);
    const name = new TextDecoder().decode(zip.subarray(p + 46, p + 46 + nameLen));
    assert.equal(v.getUint32(at, true), 0x04034b50, 'local header');
    const start = at + 30 + v.getUint16(at + 26, true) + v.getUint16(at + 28, true);
    const data = zip.subarray(start, start + size);
    assert.equal(crc32(data), crc, `crc of ${name}`);
    out[name] = data;
    p += 46 + nameLen;
  }
  return out;
}

test('files go in and come back out unchanged', () => {
  const bin = Uint8Array.from({ length: 2212 }, (_, i) => (i * 7) & 0xff);
  const zip = makeZip([{ name: 'FRAGGER.PLR', data: bin }, { name: 'DESCENT.CFG', data: 'LastPlayer=fragger\r\n' }]);
  const files = read(zip);
  assert.deepEqual(Object.keys(files), ['FRAGGER.PLR', 'DESCENT.CFG']);
  assert.deepEqual([...files['FRAGGER.PLR']], [...bin]);
  assert.equal(new TextDecoder().decode(files['DESCENT.CFG']), 'LastPlayer=fragger\r\n');
});

test('an empty zip is still a zip', () => {
  assert.deepEqual(read(makeZip([])), {});
});

test('a real unzip agrees', () => {
  const dir = mkdtempSync(join(tmpdir(), 'zip-test-'));
  try {
    const file = join(dir, 'x.zip');
    writeFileSync(file, makeZip([{ name: 'A.TXT', data: 'hello' }, { name: 'B.BIN', data: new Uint8Array([1, 2, 3]) }]));
    let out;
    try { out = execFileSync('unzip', ['-t', file], { encoding: 'utf8' }); } catch (e) {
      if (e.code === 'ENOENT') { console.log('    (unzip not installed, skipped)'); return; }
      throw e;
    }
    assert.match(out, /No errors detected/);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

console.log(`${n} passed`);
