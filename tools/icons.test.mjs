// Checks every pixel icon in js/icons.js is 16x16 and only uses palette characters.
// Run: node tools/icons.test.mjs
import assert from 'node:assert/strict';
import { ICONS, PALETTE, icon } from '../js/icons.js';

let n = 0;
for (const [name, rows] of Object.entries(ICONS)) {
  assert.equal(rows.length, 16, `${name} has ${rows.length} rows`);
  rows.forEach((row, y) => {
    assert.equal(row.length, 16, `${name} row ${y} is ${row.length} wide: ${row}`);
    for (const c of row) assert.ok(c === '.' || PALETTE[c], `${name} row ${y} uses unknown colour "${c}"`);
  });
  assert.match(icon(name), /^<svg /);
  n++;
  console.log(`ok  ${name}`);
}
assert.match(icon('nope'), /^<svg /, 'an unknown icon falls back');
console.log(`\n${n} icons checked`);
