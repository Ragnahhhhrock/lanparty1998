// Checks the power layout (js/power-plan.js): the extension lead is somewhere a player can trip on it and
// nothing is out of the room or on top of anything else.
import test from 'node:test';
import assert from 'node:assert/strict';
import * as P from '../js/power-plan.js';
import { LEAD } from '../js/party.js';

const ROOM = { minX: -6, maxX: 6, minZ: -5, maxZ: 5 };
const inRoom = (x, z, m = 0) => x >= ROOM.minX + m && x <= ROOM.maxX - m && z >= ROOM.minZ + m && z <= ROOM.maxZ - m;

test('the lead runs inside the room, from the back wall to the front', () => {
  for (const [x, y, z] of P.LEAD_ROUTE) { assert.ok(inRoom(x, z), `${x},${z}`); assert.ok(y >= 0 && y <= P.SOCKET_Y + 0.01); }
  assert.equal(P.LEAD_ROUTE[0][2] < -4.9, true);
  assert.equal(P.LEAD_ROUTE.at(-1)[2] > 4.5, true);
});
test('the lead crosses the aisle where you can walk, and has points to trip on', () => {
  const pts = P.leadTripPoints().filter((p) => p.z > P.LEAD_AISLE.from && p.z < P.LEAD_AISLE.to);
  assert.ok(pts.length > 100);
  assert.ok(pts.every((p) => Math.abs(p.x - P.LEAD_X) < 0.01 && p.y < 0.05));
});
test('the lead stays clear of the middle PC of each row (their chairs)', () => {
  for (const sx of [-2.8, 0, 2.8]) assert.ok(Math.abs(P.LEAD_X - sx) > 0.9, `${sx}`);
});
test('the lead feeds the front row, which is the PCs the party loses', () => {
  assert.deepEqual(LEAD.pcs, [3, 4, 5]);
});
test('every wall socket is on a wall and none overlap', () => {
  const all = [P.SOCKETS.lead, P.SOCKETS.fan, P.SOCKETS.tv, P.SOCKETS.snack, ...P.SOCKETS.spare].map(P.socketPose);
  for (const s of all) assert.ok(Math.abs(s.x) > 5.9 || Math.abs(s.z) > 4.9, `${s.x},${s.z}`);
  for (let i = 0; i < all.length; i++) for (let j = i + 1; j < all.length; j++) {
    const d = Math.hypot(all[i].x - all[j].x, all[i].z - all[j].z);
    assert.ok(d > P.PLATE.w, `${i} and ${j}`);
  }
});
test('the switch is on the back wall inside the room, off the door', () => {
  assert.ok(P.SWITCH.x > -6 && P.SWITCH.x < 4.7);
  assert.ok(P.SWITCH.y > 1 && P.SWITCH.y < 1.5);
});
test('a board is long enough for its four sockets', () => {
  for (const x of P.BOARD.sockets) assert.ok(Math.abs(x) < P.BOARD.len / 2 - 0.03);
});
