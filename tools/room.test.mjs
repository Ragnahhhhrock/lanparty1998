// Builds the basement without a browser and checks the pizza boxes: none overlaps anything else in the room, delivered boxes
// stay clear too, and the lids toggle and spawn as a mix of open and shut.
// Run: node tools/room.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { register } from 'node:module';
import { pathToFileURL } from 'node:url';

// the page maps 'three' with an import map; here a resolver hook does the same job
const three = pathToFileURL(new URL('../vendor/three/three.module.min.js', import.meta.url).pathname).href;
register('data:text/javascript,' + encodeURIComponent(`export async function resolve(s, c, next) { return s === 'three' ? { url: ${JSON.stringify(three)}, shortCircuit: true } : next(s, c); }`));

// a canvas that accepts everything: the textures are drawn into it and never looked at
const any = () => new Proxy(function () {}, { get: (t, k) => (k === 'width' || k === 'height' ? 256 : k === Symbol.toPrimitive ? () => 0 : any()), apply: () => any(), set: () => true, construct: () => any() });
globalThis.document = { createElement: () => ({ getContext: () => any(), width: 256, height: 256, style: {} }) };
globalThis.Image = class {};

const THREE = await import('three');
const { buildRoom } = await import('../js/room.js');

const build = (extra = 0) => {
  const scene = new THREE.Scene();
  const room = buildRoom(scene);
  for (let i = 0; i < extra; i++) room.addPizza();
  scene.updateMatrixWorld(true);
  return { scene, room };
};

// every other mesh in the room as a world box (instanced chips one by one), skipping long meshes such as cables
function obstacles(scene, room) {
  const mine = new Set(room.pizzaBoxes.map((b) => b.group));
  const inPizza = (o) => { for (let p = o; p; p = p.parent) if (mine.has(p)) return true; return false; };
  const items = [], m4 = new THREE.Matrix4();
  scene.traverse((o) => {
    if (!o.isMesh || inPizza(o) || o.material?.visible === false) return;
    if (!o.geometry.boundingBox) o.geometry.computeBoundingBox();
    const whole = o.geometry.boundingBox.clone().applyMatrix4(o.matrixWorld).getSize(new THREE.Vector3());
    if (!o.isInstancedMesh && Math.max(whole.x, whole.z) > 1.4) return;
    if (o.isInstancedMesh) {
      for (let i = 0; i < o.count; i++) { o.getMatrixAt(i, m4); items.push({ o, b: o.geometry.boundingBox.clone().applyMatrix4(m4.premultiply(o.matrixWorld)) }); }
    } else items.push({ o, b: o.geometry.boundingBox.clone().applyMatrix4(o.matrixWorld) });
  });
  return items;
}

// does the box's footprint (0.45 m square, turned by its yaw) and height touch this world box? Separating-axis test in x/z.
function touches(b, aabb, tall) {
  const pos = b.group.position, yaw = b.group.rotation.y, h = 0.225;
  if (aabb.max.y <= pos.y + 0.004 || aabb.min.y >= pos.y + (tall ? 0.5 : 0.09)) return false;
  const dx = (aabb.min.x + aabb.max.x) / 2 - pos.x, dz = (aabb.min.z + aabb.max.z) / 2 - pos.z;
  const hx = (aabb.max.x - aabb.min.x) / 2, hz = (aabb.max.z - aabb.min.z) / 2;
  const c = Math.cos(yaw), s = Math.sin(yaw);
  for (const [ux, uz] of [[c, -s], [s, c], [1, 0], [0, 1]]) {
    const rA = h * (Math.abs(c * ux - s * uz) + Math.abs(s * ux + c * uz));
    if (Math.abs(dx * ux + dz * uz) > rA + hx * Math.abs(ux) + hz * Math.abs(uz)) return false;
  }
  return true;
}

const describe = (o) => { const n = []; for (let p = o; p && n.length < 3; p = p.parent) n.push(p.userData?.interact?.kind || p.name || p.type); return n.join('<'); };

test('no pizza box overlaps a can, bag, disk, game box, PC tower or anything else', () => {
  const { scene, room } = build();
  const items = obstacles(scene, room);
  assert.equal(room.pizzaBoxes.length, 5);
  for (const b of room.pizzaBoxes) {
    const hit = items.find((it) => touches(b, it.b, true));
    assert.ok(!hit, `box at ${b.group.position.x}, ${b.group.position.z} touches ${hit && describe(hit.o)}`);
  }
});

test('delivered boxes land clear of everything and of each other, and a second round stacks on a shut box', () => {
  const { scene, room } = build(3);
  const items = obstacles(scene, room);
  for (const b of room.pizzaBoxes.slice(5)) {
    const hit = items.find((it) => touches(b, it.b, true));
    assert.ok(!hit, `delivered box at ${b.group.position.x}, ${b.group.position.z} touches ${hit && describe(hit.o)}`);
  }
  const all = room.pizzaBoxes.map((b) => b.group.position);
  all.forEach((p, i) => all.forEach((q, j) => { if (j > i) assert.ok(Math.hypot(p.x - q.x, p.z - q.z) > 0.5 || Math.abs(p.y - q.y) > 0.05, `boxes ${i} and ${j} share a spot`); }));

  const again = build(4).room.pizzaBoxes;  // the fourth delivery goes on top of the first
  const [first, fourth] = [again[5], again[8]];
  assert.equal(first.open, false, 'the box under a stack is shut');
  assert.ok(fourth.group.position.y > first.group.position.y + 0.08, 'and the new one sits above it');
  assert.equal(fourth.open, false, 'a stacked box is shut');
});

test('some boxes start with the lid open and some shut', () => {
  const { room } = build();
  const open = room.pizzaBoxes.filter((b) => b.open).length;
  assert.ok(open > 0 && open < room.pizzaBoxes.length, `${open} of ${room.pizzaBoxes.length} open`);
  let seen = new Set();
  for (let i = 0; i < 40; i++) seen.add(build(1).room.pizzaBoxes[5].open);
  assert.equal(seen.size, 2, 'a delivery spawns open or shut at random');
});

test('toggling a lid swings it between propped open and flat on top of the box', () => {
  const { room } = build();
  const b = room.pizzaBoxes.find((x) => !x.open);
  const shut = b.lid.rotation.x;
  assert.equal(b.toggle(), true);
  for (let i = 0; i < 30; i++) b.step(0.016);
  assert.ok(Math.abs(b.lid.rotation.x - -1.9) < 1e-9, 'open at -1.9 rad');
  assert.ok(Math.abs(shut - -Math.PI) < 1e-9, 'shut at -pi');
  assert.equal(b.toggle(), false);
  b.step(0.05);
  assert.ok(b.lid.rotation.x < -1.9 && b.lid.rotation.x > -Math.PI, 'partway while it swings');
  for (let i = 0; i < 30; i++) b.step(0.016);
  assert.equal(b.lid.rotation.x, -Math.PI);
  // shut, the lid panel lies above the slices, not through them
  b.group.rotation.y = 0;   // measure square to the axes
  b.group.updateMatrixWorld(true);
  const top = new THREE.Box3().setFromObject(b.lid.children[0]);   // the panel; the lips hang below it
  assert.ok(top.min.y - b.group.position.y >= 0.071, 'lid clears the cheese');
  assert.ok(top.max.x - top.min.x < 0.46 && top.max.z - top.min.z < 0.46, 'and covers no more than the box');
});
