// Builds the basement: walls, tables, six PC stations, the hub, cables and the snack table.
import * as THREE from 'three';
import * as T from './textures.js';
import { BURNER } from './party.js';

export const ROOM = { minX: -6, maxX: 6, minZ: -5, maxZ: 5, height: 2.8 };
const TABLE_Y = 0.74;

const beige = new THREE.MeshStandardMaterial({ color: 0xd9cfb3, roughness: 0.7 });
const beigeDark = new THREE.MeshStandardMaterial({ color: 0xbfb497, roughness: 0.75 });
const black = new THREE.MeshStandardMaterial({ color: 0x151515, roughness: 0.5 });
const steel = new THREE.MeshStandardMaterial({ color: 0x6b6b6b, metalness: 0.6, roughness: 0.4 });

function box(w, h, d, mat, x = 0, y = 0, z = 0) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.position.set(x, y, z);
  return m;
}

function foldingTable(length, depth) {
  const g = new THREE.Group();
  const top = box(length, 0.04, depth, new THREE.MeshStandardMaterial({ color: 0xe8e2d2, roughness: 0.85 }), 0, TABLE_Y - 0.02, 0);
  g.add(top);
  const legMat = new THREE.MeshStandardMaterial({ color: 0x2b2b2b, metalness: 0.5, roughness: 0.5 });
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, TABLE_Y - 0.04), legMat);
    leg.position.set(sx * (length / 2 - 0.08), (TABLE_Y - 0.04) / 2, sz * (depth / 2 - 0.08));
    g.add(leg);
  }
  return g;
}

function foldingChair() {
  const g = new THREE.Group();
  const seatMat = new THREE.MeshStandardMaterial({ color: 0x4a4f57, metalness: 0.3, roughness: 0.6 });
  g.add(box(0.42, 0.03, 0.4, seatMat, 0, 0.45, 0));
  g.add(box(0.42, 0.28, 0.025, seatMat, 0, 0.78, 0.2));
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, sz > 0 ? 0.9 : 0.45), steel);
      leg.position.set(sx * 0.19, sz > 0 ? 0.45 : 0.225, sz * 0.19);
      g.add(leg);
    }
  }
  return g;
}

function crt(screenTexture) {
  const g = new THREE.Group();
  g.add(box(0.26, 0.03, 0.24, beigeDark, 0, 0.015, -0.02)); // swivel base
  g.add(box(0.42, 0.37, 0.3, beige, 0, 0.215, 0));          // front shell
  g.add(box(0.32, 0.29, 0.2, beige, 0, 0.215, -0.24));      // tube bulge
  g.add(box(0.36, 0.28, 0.01, black, 0, 0.225, 0.151));     // bezel recess
  const screen = new THREE.Mesh(
    new THREE.PlaneGeometry(0.32, 0.24),
    new THREE.MeshBasicMaterial({ map: screenTexture, toneMapped: false }),
  );
  screen.position.set(0, 0.225, 0.157);
  g.add(screen);
  const led = box(0.012, 0.012, 0.005, new THREE.MeshBasicMaterial({ color: 0x3cff5a }), 0.17, 0.055, 0.152);
  g.add(led);
  return { group: g, screen };
}

function tower(burner = false) {
  const g = new THREE.Group();
  g.add(box(0.19, 0.44, 0.44, beige, 0, 0.22, 0));
  for (let i = 0; i < 2; i++) {
    if (i === 0 && burner) continue; // the top bay is the CD-R drive, below
    g.add(box(0.15, 0.04, 0.01, beigeDark, 0, 0.38 - i * 0.05, 0.222)); // 5.25" bays
  }
  let drive = null;
  if (burner) {
    drive = new THREE.Mesh(new THREE.PlaneGeometry(0.15, 0.04), new THREE.MeshStandardMaterial({ map: T.cdrDrive(), roughness: 0.7 }));
    drive.position.set(0, 0.38, 0.2275);
    g.add(drive);
  }
  g.add(box(0.1, 0.02, 0.01, beigeDark, 0, 0.27, 0.222));                                         // floppy
  const power = box(0.015, 0.008, 0.004, new THREE.MeshBasicMaterial({ color: 0x33ff55 }), -0.04, 0.12, 0.223);
  const hdd = box(0.015, 0.008, 0.004, new THREE.MeshBasicMaterial({ color: 0x400000 }), 0.04, 0.12, 0.223);
  g.add(power, hdd);
  return { group: g, hdd, drive };
}

function voltCan(label) {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.033, 0.033, 0.12, 20, 1, true),
    new THREE.MeshStandardMaterial({ map: label, metalness: 0.4, roughness: 0.35 }));
  body.position.y = 0.06;
  const lid = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.033, 0.008, 20), new THREE.MeshStandardMaterial({ color: 0xc8c8c8, metalness: 0.9, roughness: 0.3 }));
  lid.position.y = 0.124;
  g.add(body, lid);
  return g;
}

function chipBag(label) {
  const g = new THREE.Group();
  const bag = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.27, 0.07), [
    beige, beige, beige, beige,
    new THREE.MeshStandardMaterial({ map: label, roughness: 0.35, metalness: 0.2 }),
    new THREE.MeshStandardMaterial({ map: label, roughness: 0.35, metalness: 0.2 }),
  ]);
  bag.scale.set(1, 1, 0.8);
  bag.position.y = 0.135;
  bag.rotation.x = -0.15;
  g.add(bag);
  return g;
}

// Six PCs. Nobody owns one any more: whoever sits down first gets it. The idle screens are
// whatever the last person left running.
const STATIONS = [
  // row along the back wall, monitors facing the room
  { x: -2.8, z: -4.25, face: 0, idle: 'dos' },
  { x: 0, z: -4.25, face: 0, idle: 'stars3d' },
  { x: 2.8, z: -4.25, face: 0, idle: 'waiting' },
  // row along the front wall
  { x: -2.8, z: 4.25, face: Math.PI, idle: 'win98' },
  { x: 0, z: 4.25, face: Math.PI, idle: 'bios' },
  { x: 2.8, z: 4.25, face: Math.PI, idle: 'dos' },
];

// The network, in three generations. Only one is visible at a time (out.setNetwork).
//  coax:   a single black cable under the tables, a T-connector at each tower, terminators at both ends
//  hub:    8-port 10BASE-T hub on the snack table, a cat5 lead from every tower
//  switch: a borrowed 16-port switch in the hub's spot, same leads
// out.floorCables lists the bits of cable lying across the floor, for tripping over.
function buildNetwork(scene, out) {
  const tube = (pts, radius, mat) => {
    const path = new THREE.CurvePath();
    for (let i = 1; i < pts.length; i++) path.add(new THREE.LineCurve3(pts[i - 1], pts[i]));
    return new THREE.Mesh(new THREE.TubeGeometry(path, pts.length * 12, radius, 5), mat);
  };
  const gear = { coax: new THREE.Group(), hub: new THREE.Group(), switch: new THREE.Group(), lan: new THREE.Group() };
  for (const g of Object.values(gear)) scene.add(g);
  out.floorCables = [];
  out.netLeds = [];
  const leds = { hub: [], switch: [], coax: [] };
  const panelMat = new THREE.MeshStandardMaterial({ color: 0x2f3542, roughness: 0.6 });
  const ledMat = () => new THREE.MeshBasicMaterial({ color: 0x0a3a0a });

  // the hub: 8-port 10BASE-T, sitting on the snack table because that's where the power board reached
  const hub = new THREE.Group();
  hub.add(box(0.28, 0.045, 0.14, panelMat));
  for (let p = 0; p < 8; p++) {
    const led = box(0.01, 0.008, 0.004, ledMat(), -0.11 + p * 0.031, 0.008, 0.071);
    hub.add(led);
    leds.hub.push(led);
  }
  hub.position.set(-5.3, TABLE_Y + 0.023, 1.0);
  hub.rotation.y = Math.PI / 2;
  gear.hub.add(hub);

  // the switch: borrowed, 16 ports, and it has a sticker on it
  const sw = new THREE.Group();
  sw.add(box(0.38, 0.05, 0.16, panelMat));
  for (let row = 0; row < 2; row++) for (let p = 0; p < 8; p++) {
    const led = box(0.01, 0.008, 0.004, ledMat(), -0.15 + p * 0.043, 0.012 - row * 0.02, 0.081);
    sw.add(led);
    leds.switch.push(led);
  }
  const sticker = new THREE.Mesh(new THREE.PlaneGeometry(0.14, 0.058), new THREE.MeshStandardMaterial({ map: T.assetTag(), roughness: 0.6 }));
  sticker.rotation.x = -Math.PI / 2;
  sticker.position.set(0.04, 0.0255, 0);
  sw.add(sticker);
  sw.position.set(-5.3, TABLE_Y + 0.026, 1.0);
  sw.rotation.y = Math.PI / 2;
  gear.switch.add(sw);

  // cat5 runs from every tower to the hub (or switch), gaffer-taped across the floor
  const hubPort = new THREE.Vector3(-5.38, TABLE_Y + 0.02, 1.0);
  const cableColours = [0xe8c21b, 0x2b6fd6, 0x9a9a9a, 0xd23c3c, 0xe8c21b, 0x3aa35a];
  out.cat5 = [];
  out.stations.forEach((st, i) => {
    const s = st.cableStart;
    const dir = Math.sign(s.z);
    const pts = [
      s.clone(),
      new THREE.Vector3(s.x, 0.4, s.z + dir * 0.25),
      new THREE.Vector3(s.x + 0.1, 0.012, s.z + dir * 0.35),
      new THREE.Vector3(-4.8 + i * 0.03, 0.012, s.z * 0.55 + i * 0.04),
      new THREE.Vector3(-5.05, 0.012, 0.9 + i * 0.03),
      new THREE.Vector3(-5.12, 0.4, 0.98),
      hubPort.clone(),
    ];
    const curve = new THREE.CatmullRomCurve3(pts);
    const lead = new THREE.Mesh(new THREE.TubeGeometry(curve, 80, 0.004, 5), new THREE.MeshStandardMaterial({ color: cableColours[i], roughness: 0.6 }));
    gear.lan.add(lead);
    out.cat5.push(lead);
    out.floorCables.push({ pc: i, kind: 'cat5', pts: curve.getPoints(120).filter((p) => p.y < 0.05) });
  });

  // coax: the bus runs under the tables, down the right-hand side across the floor, and back along the other row
  const coaxMat = new THREE.MeshStandardMaterial({ color: 0x151515, roughness: 0.5 });
  const steelMat = new THREE.MeshStandardMaterial({ color: 0x6b6b6b, metalness: 0.6, roughness: 0.4 });
  const under = (i) => new THREE.Vector3(out.stations[i].cableStart.x, 0.3, out.stations[i].cableStart.z);
  const bus = [under(0), under(1), under(2), new THREE.Vector3(4.55, 0.3, under(2).z), new THREE.Vector3(4.6, 0.012, -3.9),
    new THREE.Vector3(4.6, 0.012, 3.9), new THREE.Vector3(4.55, 0.3, under(5).z), under(5), under(4), under(3)];
  gear.coax.add(tube(bus, 0.006, coaxMat));
  out.floorCables.push({ pc: null, kind: 'coax', pts: Array.from({ length: 40 }, (_, k) => new THREE.Vector3(4.6, 0.012, -3.9 + (7.8 * k) / 39)) });
  out.tConns = [];
  out.stations.forEach((st, i) => {
    const t = new THREE.Group();
    t.add(box(0.05, 0.022, 0.022, steelMat));
    t.add(box(0.022, 0.03, 0.022, steelMat, 0, 0.02, 0));
    t.position.copy(st.cableStart);
    gear.coax.add(t);
    out.tConns.push(t);
    gear.coax.add(tube([st.cableStart.clone(), under(i)], 0.005, coaxMat)); // the drop from the T down to the bus
  });
  for (const i of [0, 3]) { // 50 ohm terminators on the two ends of the bus
    const term = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.05, 8), steelMat);
    term.rotation.z = Math.PI / 2;
    term.position.copy(under(i)).add(new THREE.Vector3(-0.05, 0, 0));
    gear.coax.add(term);
  }

  out.setNetwork = (tier) => {
    gear.coax.visible = tier === 'coax';
    gear.lan.visible = tier !== 'coax';
    gear.hub.visible = tier === 'hub';
    gear.switch.visible = tier === 'switch';
    out.netLeds = leds[tier] ?? [];
  };
  out.setNetwork('coax');

  // a lead that's been yanked out, or a T-connector that's come loose
  out.setLoose = (i, loose) => {
    out.cat5[i].visible = !loose;
    out.tConns[i].rotation.z = loose ? 0.9 : 0;
    out.tConns[i].position.y = out.stations[i].cableStart.y - (loose ? 0.03 : 0);
  };
}

// The pedestal fan: it sweeps between the two rows of PCs, and it plugs in across the floor.
// Its head angle follows party.fanSweep(): -1 faces the back row, +1 the front row.
function buildFan(scene, out) {
  const FAN_AT = new THREE.Vector3(3.9, 0, 0.3);
  const g = new THREE.Group();
  g.position.copy(FAN_AT);
  const cyl = (rt, rb, h, mat, y) => { const m = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, 16), mat); m.position.y = y; return m; };
  g.add(cyl(0.2, 0.22, 0.04, black, 0.02));
  g.add(cyl(0.016, 0.016, 1.0, steel, 0.52));
  const head = new THREE.Group();
  head.position.y = 1.08;
  head.add(box(0.13, 0.13, 0.16, beige, 0, 0, -0.04));
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.21, 0.006, 6, 32), steel);
  ring.position.z = 0.08;
  head.add(ring);
  const back = new THREE.Mesh(new THREE.TorusGeometry(0.21, 0.006, 6, 32), steel);
  back.position.z = -0.04;
  head.add(back);
  for (let k = 0; k < 6; k++) { // the cage wires
    const a = (k / 6) * Math.PI;
    const wire = new THREE.Mesh(new THREE.CylinderGeometry(0.0025, 0.0025, 0.42, 4), steel);
    wire.rotation.z = a; wire.position.z = 0.08;
    head.add(wire);
  }
  const blades = new THREE.Group();
  blades.position.z = 0.04;
  for (let k = 0; k < 3; k++) {
    const blade = box(0.17, 0.05, 0.004, beigeDark, 0.09, 0, 0);
    const arm = new THREE.Group();
    arm.rotation.z = (k * Math.PI * 2) / 3;
    arm.add(blade);
    blades.add(arm);
  }
  head.add(blades);
  g.add(head);
  scene.add(g);

  // the lead, across the floor to a wall socket on the right
  const lead = [new THREE.Vector3(FAN_AT.x, 0.03, FAN_AT.z), new THREE.Vector3(FAN_AT.x + 0.2, 0.012, FAN_AT.z), new THREE.Vector3(5.95, 0.012, FAN_AT.z)];
  const path = new THREE.CurvePath();
  for (let i = 1; i < lead.length; i++) path.add(new THREE.LineCurve3(lead[i - 1], lead[i]));
  scene.add(new THREE.Mesh(new THREE.TubeGeometry(path, 24, 0.005, 5), new THREE.MeshStandardMaterial({ color: 0x151515, roughness: 0.5 })));
  out.floorCables.push({ pc: null, kind: 'fan', pts: Array.from({ length: 24 }, (_, k) => new THREE.Vector3(FAN_AT.x + 0.2 + (5.95 - FAN_AT.x - 0.2) * (k / 23), 0.012, FAN_AT.z)) });

  g.traverse((o) => { o.userData.interact = { kind: 'fan' }; });
  const hit = new THREE.Mesh(new THREE.BoxGeometry(0.5, 1.3, 0.5), new THREE.MeshBasicMaterial({ visible: false }));
  hit.position.set(FAN_AT.x, 0.65, FAN_AT.z);
  hit.userData.interact = { kind: 'fan' };
  scene.add(hit);
  out.interactables.push(g, hit);
  out.colliders.push({ minX: FAN_AT.x - 0.22, maxX: FAN_AT.x + 0.22, minZ: FAN_AT.z - 0.22, maxZ: FAN_AT.z + 0.22 });

  // sweep: the head turns toward whichever row it is cooling; the blades spin when it's plugged in
  out.updateFan = (dt, on, sweep) => {
    head.rotation.y = -Math.PI / 2 + sweep * (Math.PI / 2) * 0.9;
    if (on) blades.rotation.z -= dt * 24;
  };
}

// the things on the snack table and the wall you use to get stuff done
function buildErrands(scene, out) {
  // the computer shop's price list, to order from
  const flyer = new THREE.Mesh(new THREE.PlaneGeometry(0.2, 0.26), new THREE.MeshStandardMaterial({ map: T.priceList(), roughness: 0.9 }));
  flyer.rotation.x = -Math.PI / 2; flyer.rotation.z = 0.35;
  flyer.position.set(-5.3, TABLE_Y + 0.004, 0.18);
  scene.add(flyer);
  const flyerHit = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.12, 0.34), new THREE.MeshBasicMaterial({ visible: false }));
  flyerHit.position.set(-5.3, TABLE_Y + 0.05, 0.18);
  scene.add(flyerHit);
  for (const o of [flyer, flyerHit]) o.userData.interact = { kind: 'shop' };
  out.interactables.push(flyer, flyerHit);

  // the wall phone, beige, with a curly cord
  const phone = new THREE.Group();
  phone.add(box(0.07, 0.24, 0.1, beige, 0, 0, 0));
  phone.add(box(0.06, 0.05, 0.05, beigeDark, 0, 0.02, 0.07));
  phone.add(box(0.045, 0.05, 0.012, black, 0, 0.06, 0.056));
  phone.position.set(ROOM.minX + 0.05, 1.3, -3.2);
  scene.add(phone);
  const phoneHit = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.4, 0.4), new THREE.MeshBasicMaterial({ visible: false }));
  phoneHit.position.copy(phone.position).add(new THREE.Vector3(0.15, 0, 0));
  scene.add(phoneHit);
  for (const o of [...phone.children, phoneHit]) o.userData.interact = { kind: 'phone' };
  out.interactables.push(phone, phoneHit);
}

// The way out: a doorway in the back wall, a landing and a staircase up to the rest of the house.
// The wall is three pieces (left, right, lintel) so the opening is real. out.door drives it.
const DOOR = { minX: 4.7, maxX: 5.6, height: 2.1, landing: 0.9, steps: 10, rise: 0.2, run: 0.28 };
function buildDoor(scene, out, wallTex) {
  const { minX, minZ, maxX, height } = ROOM;
  const cx = (DOOR.minX + DOOR.maxX) / 2, dw = DOOR.maxX - DOOR.minX;
  const dark = new THREE.MeshStandardMaterial({ color: 0x24170e, roughness: 0.9 }); // --wood-dark

  // back wall, continuing the panelling's grain across the gap
  const piece = (x0, x1, y0, y1) => {
    const t = wallTex.clone();
    t.repeat.set((x1 - x0) / 3, (y1 - y0) / height);
    t.offset.set((x0 - minX) / 3, y0 / height);
    t.needsUpdate = true;
    const m = new THREE.Mesh(new THREE.PlaneGeometry(x1 - x0, y1 - y0), new THREE.MeshStandardMaterial({ map: t, roughness: 0.8 }));
    m.position.set((x0 + x1) / 2, (y0 + y1) / 2, minZ);
    scene.add(m);
    if (y0 === 0) scene.add(box(x1 - x0, 0.1, 0.02, dark, (x0 + x1) / 2, 0.05, minZ + 0.01));
  };
  piece(minX, DOOR.minX, 0, height);
  piece(DOOR.maxX, ROOM.maxX, 0, height);
  piece(DOOR.minX, DOOR.maxX, DOOR.height, height);

  // frame
  scene.add(box(0.06, DOOR.height, 0.1, dark, DOOR.minX - 0.03, DOOR.height / 2, minZ + 0.03));
  scene.add(box(0.06, DOOR.height, 0.1, dark, DOOR.maxX + 0.03, DOOR.height / 2, minZ + 0.03));
  scene.add(box(dw + 0.12, 0.06, 0.1, dark, cx, DOOR.height + 0.03, minZ + 0.03));

  // the stairwell behind it
  const g = new THREE.Group();
  const carpet = new THREE.MeshStandardMaterial({ color: 0x3b2f2a, roughness: 1 }); // --carpet
  const run = DOOR.steps * DOOR.run, top = DOOR.steps * DOOR.rise;
  const z0 = minZ - DOOR.landing, zEnd = z0 - run, slope = DOOR.rise / DOOR.run;
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(dw, DOOR.landing), carpet);
  floor.rotation.x = -Math.PI / 2; floor.position.set(cx, 0.001, minZ - DOOR.landing / 2);
  g.add(floor);
  for (let k = 0; k < DOOR.steps; k++) {
    g.add(box(dw, (k + 1) * DOOR.rise, DOOR.run, carpet, cx, (k + 1) * DOOR.rise / 2, z0 - (k + 0.5) * DOOR.run));
  }
  const len = DOOR.landing + run, mid = minZ - len / 2;
  g.add(box(0.04, top + 2.4, len, dark, DOOR.minX - 0.02, (top + 2.4) / 2, mid));
  g.add(box(0.04, top + 2.4, len, dark, DOOR.maxX + 0.02, (top + 2.4) / 2, mid));
  g.add(box(dw, top + 2.4, 0.04, dark, cx, (top + 2.4) / 2, zEnd - 0.02));
  const lid = new THREE.Mesh(new THREE.PlaneGeometry(dw, DOOR.landing), dark);
  lid.rotation.x = Math.PI / 2; lid.position.set(cx, DOOR.height, minZ - DOOR.landing / 2);
  g.add(lid);
  const ramp = new THREE.BufferGeometry();
  const x0 = DOOR.minX, x1 = DOOR.maxX, yTop = DOOR.height + run * slope;
  ramp.setAttribute('position', new THREE.Float32BufferAttribute([x0, DOOR.height, z0, x1, DOOR.height, z0, x1, yTop, zEnd, x0, yTop, zEnd], 3));
  ramp.setIndex([0, 1, 2, 0, 2, 3]); ramp.computeVertexNormals();
  g.add(new THREE.Mesh(ramp, new THREE.MeshStandardMaterial({ color: 0x24170e, roughness: 1, side: THREE.DoubleSide })));
  // light from the hall at the top of the stairs
  const glow = new THREE.Mesh(new THREE.PlaneGeometry(dw - 0.1, 1.6), new THREE.MeshBasicMaterial({ color: 0xe8e1cc })); // --paper
  glow.position.set(cx, top + 1.1, zEnd + 0.01);
  g.add(glow);
  const lamp = new THREE.PointLight(0xffe0a8, 5, 7, 1.6);
  lamp.position.set(cx, top + 0.6, zEnd + 0.8);
  g.add(lamp);
  scene.add(g);

  // the door itself, hinged at the right-hand jamb and swinging into the room
  const pivot = new THREE.Group();
  pivot.position.set(DOOR.maxX - 0.02, 0, minZ + 0.03);
  const slab = new THREE.Mesh(new THREE.BoxGeometry(dw - 0.04, DOOR.height - 0.04, 0.04), new THREE.MeshStandardMaterial({ map: T.door(), roughness: 0.85 }));
  slab.position.set(-(dw - 0.04) / 2, (DOOR.height - 0.04) / 2, 0);
  pivot.add(slab);
  const brass = new THREE.MeshStandardMaterial({ color: 0xffcc00, roughness: 0.35, metalness: 0.6 }); // --amber
  for (const sz of [-1, 1]) {
    const knob = new THREE.Mesh(new THREE.SphereGeometry(0.035, 10, 8), brass);
    knob.position.set(-(dw - 0.04) + 0.09, 1.0, sz * 0.045);
    pivot.add(knob);
  }
  scene.add(pivot);
  const hit = new THREE.Mesh(new THREE.BoxGeometry(dw, DOOR.height, 0.2), new THREE.MeshBasicMaterial({ visible: false }));
  hit.position.set(cx, DOOR.height / 2, minZ + 0.1);
  scene.add(hit);
  for (const o of [slab, hit]) o.userData.interact = { kind: 'door' };
  out.interactables.push(slab, hit);

  const OPEN_ANGLE = 1.55;
  const door = {
    minX: DOOR.minX, maxX: DOOR.maxX, depth: DOOR.landing,
    open: false, t: 0,
    toggle() { door.open = !door.open; return door.open; },
    update(dt) {
      const goal = door.open ? 1 : 0;
      door.t += Math.sign(goal - door.t) * Math.min(Math.abs(goal - door.t), dt * 1.6);
      const e = door.t * door.t * (3 - 2 * door.t);
      pivot.rotation.y = e * OPEN_ANGLE;
      lamp.visible = glow.visible = door.t > 0.02;
    },
  };
  door.update(0);
  out.door = door;
}

export function buildRoom(scene) {
  const out = { stations: [], interactables: [], colliders: [], screens: [], hddLeds: [] };
  const { minX, maxX, minZ, maxZ, height } = ROOM;
  const w = maxX - minX, d = maxZ - minZ;

  // shell
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(w, d), new THREE.MeshStandardMaterial({ map: T.carpet(), roughness: 1 }));
  floor.rotation.x = -Math.PI / 2;
  scene.add(floor);
  const ceil = new THREE.Mesh(new THREE.PlaneGeometry(w, d), new THREE.MeshStandardMaterial({ map: T.ceilingTile(), roughness: 1 }));
  ceil.rotation.x = Math.PI / 2; ceil.position.y = height;
  scene.add(ceil);
  const wallMat = new THREE.MeshStandardMaterial({ map: T.woodPanel(), roughness: 0.8 });
  const walls = [ // the back wall (z = minZ) is built around the door, in buildDoor
    [w, 0, maxZ, Math.PI], [d, minX, 0, Math.PI / 2], [d, maxX, 0, -Math.PI / 2],
  ];
  for (const [len, x, z, ry] of walls) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(len, height), wallMat);
    m.position.set(x, height / 2, z); m.rotation.y = ry;
    scene.add(m);
    const skirt = box(len, 0.1, 0.02, new THREE.MeshStandardMaterial({ color: 0x24170e }), 0, 0.05, 0.01);
    skirt.rotation.y = ry; skirt.position.set(x, 0.05, z); skirt.translateZ(0.01);
    scene.add(skirt);
  }

  // fluorescent tubes and lights
  scene.add(new THREE.HemisphereLight(0xfff1d6, 0x3a2a1e, 1.5));
  for (const x of [-2.8, 2.8]) {
    const fixture = box(1.3, 0.04, 0.3, new THREE.MeshBasicMaterial({ color: 0xe9f3ff }), x, height - 0.02, 0);
    scene.add(fixture);
    const light = new THREE.PointLight(0xdfeaff, 22, 12, 1.4);
    light.position.set(x, height - 0.3, 0);
    scene.add(light);
  }

  // stations
  const labelVolt = T.voltLabel(), labelNachoz = T.nachozBag();
  const table = (z) => {
    const t = foldingTable(8.6, 0.8);
    t.position.set(0, 0, z);
    scene.add(t);
    out.colliders.push({ minX: -4.3, maxX: 4.3, minZ: z - 0.4, maxZ: z + 0.4 });
  };
  table(-4.25); table(4.25);

  STATIONS.forEach((s, i) => {
    const g = new THREE.Group();
    g.position.set(s.x, 0, s.z);
    g.rotation.y = s.face;
    scene.add(g);

    const screen = new T.Screen(s.idle, i + 1);
    screen.pcNumber = i + 1;
    out.screens.push(screen);
    const mon = crt(screen.texture);
    mon.group.position.set(0, TABLE_Y, -0.12);
    g.add(mon.group);

    const tw = tower(i === BURNER.pc);
    tw.group.position.set(0.52, TABLE_Y, -0.1);
    g.add(tw.group);
    out.hddLeds.push(tw.hdd);

    const kb = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.025, 0.17), [beige, beige,
      new THREE.MeshStandardMaterial({ map: T.keyboardTop(), roughness: 0.7 }), beige, beige, beige]);
    kb.position.set(-0.02, TABLE_Y + 0.013, 0.24);
    kb.rotation.x = 0.05;
    g.add(kb);
    g.add(box(0.06, 0.03, 0.1, beige, 0.33, TABLE_Y + 0.015, 0.26)); // mouse
    g.add(box(0.2, 0.004, 0.18, new THREE.MeshStandardMaterial({ color: 0x1c3b6e }), 0.34, TABLE_Y + 0.002, 0.25)); // mousepad

    const tagTex = T.nameTag(`PC-0${i + 1}`);
    const tag = new THREE.Mesh(new THREE.PlaneGeometry(0.16, 0.04), new THREE.MeshBasicMaterial({ map: tagTex }));
    tag.position.set(0, 0.39, 0.152);
    mon.group.add(tag);

    const chair = foldingChair();
    chair.position.set(0, 0, 0.82);
    chair.rotation.y = (i * 0.37) % 0.5 - 0.25; // nobody pushes their chair in straight
    g.add(chair);

    // every station gets a can, every other one a bag of Nachoz
    const can = voltCan(labelVolt);
    can.position.set(-0.36, TABLE_Y, 0.12);
    g.add(can);

    const station = {
      ...s, index: i, name: `PC-0${i + 1}`, group: g, screen, monitor: mon, seatTarget: new THREE.Object3D(),
      cableStart: new THREE.Vector3(), chair,
      setTag: (text) => T.nameTag(text, tagTex),
    };
    // where the camera goes when you sit: square in front of the tube
    station.seatTarget.position.set(0, TABLE_Y + 0.225, -0.12 + 0.157 + 0.36);
    g.add(station.seatTarget);
    g.updateMatrixWorld(true);
    tw.group.localToWorld(station.cableStart.set(0, 0.06, -0.22));

    mon.group.traverse((o) => { o.userData.interact = { kind: 'sit', station }; });
    tw.group.traverse((o) => { o.userData.interact = { kind: 'sit', station }; });
    out.interactables.push(mon.group, tw.group);
    if (tw.drive) {
      // a slightly fatter invisible target over the drive, so you can actually aim at it
      const hit = new THREE.Mesh(new THREE.BoxGeometry(0.19, 0.08, 0.06), new THREE.MeshBasicMaterial({ visible: false }));
      hit.position.set(0, 0.38, 0.235);
      tw.group.add(hit);
      for (const o of [tw.drive, hit]) o.userData.interact = { kind: 'burner', station };
      station.burner = true;
    }

    can.traverse((o) => { o.userData.interact = { kind: 'drink' }; });
    out.interactables.push(can);
    if (i % 2 === 1) {
      const bag = chipBag(labelNachoz);
      bag.position.set(-0.6, TABLE_Y, 0.02);
      bag.rotation.y = 0.5;
      g.add(bag);
      bag.traverse((o) => { o.userData.interact = { kind: 'eat' }; });
      out.interactables.push(bag);
    }
    out.stations.push(station);
  });

  // snack table along the left wall
  const snacks = foldingTable(2.4, 0.7);
  snacks.rotation.y = Math.PI / 2;
  snacks.position.set(-5.45, 0, 0);
  scene.add(snacks);
  out.colliders.push({ minX: -5.8, maxX: -5.1, minZ: -1.2, maxZ: 1.2 });

  const crate = new THREE.Group();
  for (let r = 0; r < 2; r++) for (let c = 0; c < 4; c++) {
    const can = voltCan(labelVolt);
    can.position.set(-5.6 + r * 0.08, TABLE_Y, -0.9 + c * 0.075);
    crate.add(can);
  }
  crate.traverse((o) => { o.userData.interact = { kind: 'drink' }; });
  scene.add(crate);
  out.interactables.push(crate);

  for (let k = 0; k < 3; k++) {
    const bag = chipBag(labelNachoz);
    bag.position.set(-5.5, TABLE_Y, -0.2 + k * 0.24);
    bag.rotation.y = Math.PI / 2 + (k - 1) * 0.25;
    bag.traverse((o) => { o.userData.interact = { kind: 'eat' }; });
    scene.add(bag);
    out.interactables.push(bag);
  }

  const pizza = box(0.42, 0.05, 0.42, [beigeDark, beigeDark, new THREE.MeshStandardMaterial({ map: T.pizzaLid() }), beigeDark, beigeDark, beigeDark]);
  pizza.position.set(-5.45, TABLE_Y + 0.025, 0.58);
  pizza.rotation.y = 0.2;
  scene.add(pizza);

  buildNetwork(scene, out);
  buildErrands(scene, out);
  buildFan(scene, out);
  buildDoor(scene, out, wallMat.map);

  // posters and the scoreboard
  const posterMat = (t) => new THREE.MeshStandardMaterial({ map: t, roughness: 0.9 });
  const p1 = new THREE.Mesh(new THREE.PlaneGeometry(0.7, 0.98), posterMat(T.poster('LAN OR\nDIE', 'BYOC · 6 PCs · 1 HUB\nSAT 14 NOV 1998', 350)));
  p1.position.set(maxX - 0.01, 1.6, -1.2); p1.rotation.y = -Math.PI / 2; scene.add(p1);
  const p2 = new THREE.Mesh(new THREE.PlaneGeometry(0.7, 0.98), posterMat(T.poster('FRAG\nFEST', 'NO CAMPING\nNO UNPLUGGING THE HUB', 200)));
  p2.position.set(maxX - 0.01, 1.6, 1.2); p2.rotation.y = -Math.PI / 2; scene.add(p2);
  const p3 = new THREE.Mesh(new THREE.PlaneGeometry(0.7, 0.98), posterMat(T.poster('VOLT\nCOLA', 'NOW WITH\nEVEN MORE VOLTS', 5)));
  p3.position.set(minX + 0.01, 1.7, -2.2); p3.rotation.y = Math.PI / 2; scene.add(p3);

  return out;
}
