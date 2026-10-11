// Logic tests for js/calc.js. Run: node tools/calc.test.mjs
import assert from 'node:assert/strict';
import { initial, press } from '../js/calc.js';

let n = 0;
const test = (name, fn) => { fn(); n++; console.log(`ok  ${name}`); };
const keys = (...ks) => ks.reduce((s, k) => press(s, k), initial());
const show = (...ks) => keys(...ks).display;

test('digits build a number, with no leading zeros', () => {
  assert.equal(show('0', '0', '7', '3'), '73');
  assert.equal(show('1', '.', '5'), '1.5');
  assert.equal(show('.', '5'), '0.5');
  assert.equal(show('1', '.', '5', '.', '2'), '1.52');
});

test('the four operations', () => {
  assert.equal(show('1', '2', '+', '3', '='), '15');
  assert.equal(show('9', '-', '4', '='), '5');
  assert.equal(show('6', '*', '7', '='), '42');
  assert.equal(show('8', '/', '4', '='), '2');
});

test('chained operations run left to right, like the real one', () => {
  assert.equal(show('2', '+', '3', '*', '4', '='), '20');
});

test('changing your mind about the operator', () => {
  assert.equal(show('5', '+', '-', '2', '='), '3');
});

test('0.1 + 0.2 is 0.3, not 0.30000000000000004', () => {
  assert.equal(show('0', '.', '1', '+', '0', '.', '2', '='), '0.3');
});

test('dividing by zero is an error, then C clears it', () => {
  const s = keys('5', '/', '0', '=');
  assert.equal(s.error, 'Cannot divide by zero.');
  assert.equal(s.display, '0');
  assert.equal(press(s, 'C').error, '');
  assert.equal(keys('0', 'INV').error, 'Cannot divide by zero.');
});

test('square root, reciprocal, negate, percent', () => {
  assert.equal(show('8', '1', 'SQRT'), '9');
  assert.equal(keys('NEG', 'SQRT').display, '0');
  assert.equal(show('4', 'INV'), '0.25');
  assert.equal(show('5', 'NEG'), '-5');
  assert.equal(show('5', 'NEG', 'NEG'), '5');
  assert.equal(show('2', '0', '0', '*', '1', '5', 'PCT'), '30');
  assert.equal(keys('9', 'NEG', 'SQRT').error, 'Invalid input for function.');
});

test('backspace and CE', () => {
  assert.equal(show('1', '2', '3', 'BACK'), '12');
  assert.equal(show('7', 'BACK'), '0');
  assert.equal(show('1', '2', '+', '9', '9', 'CE', '1', '='), '13');
});

test('memory keys', () => {
  assert.equal(keys('5', 'MS', 'C', 'MR').display, '5');
  assert.equal(keys('5', 'MS', '3', 'M+', 'C', 'MR').display, '8');
  assert.equal(keys('5', 'MS', 'MC', 'MR').display, '0');
  assert.equal(press(keys('4', 'MS'), 'C').mem, 4, 'C leaves the memory alone');
});

test('equals twice does not run away', () => {
  assert.equal(show('2', '+', '3', '=', '='), '5');
});

console.log(`\n${n} tests passed`);
