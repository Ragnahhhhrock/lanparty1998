// Builds the basement: walls, tables, six PC stations, the hub, cables and the snack table.
import * as THREE from 'three';
import * as T from './textures.js';

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

function tower() {
  const g = new THREE.Group();
  g.add(box(0.19, 0.44, 0.44, beige, 0, 0.22, 0));
  for (let i = 0; i < 2; i++) g.add(box(0.15, 0.04, 0.01, beigeDark, 0, 0.38 - i * 0.05, 0.222)); // 5.25" bays
  g.add(box(0.1, 0.02, 0.01, beigeDark, 0, 0.27, 0.222));                                         // floppy
  const power = box(0.015, 0.008, 0.004, new THREE.MeshBasicMaterial({ color: 0x33ff55 }), -0.04, 0.12, 0.223);
  const hdd = box(0.015, 0.008, 0.004, new THREE.MeshBasicMaterial({ color: 0x400000 }), 0.04, 0.12, 0.223);
  g.add(power, hdd);
  return { group: g, hdd };
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

const STATIONS = [
  // row along the back wall, monitors facing the room
  { x: -2.8, z: -4.25, face: 0, name: 'DAZ', mode: 'dos' },
  { x: 0, z: -4.25, face: 0, name: 'YOU', mode: 'mine', mine: true },
  { x: 2.8, z: -4.25, face: 0, name: 'KEV', mode: 'waiting' },
  // row along the front wall
  { x: -2.8, z: 4.25, face: Math.PI, name: 'B-RAD', mode: 'win98' },
  { x: 0, z: 4.25, face: Math.PI, name: 'MOUSE', mode: 'stars3d' },
  { x: 2.8, z: 4.25, face: Math.PI, name: 'JONO', mode: 'bios' },
];

export function buildRoom(scene) {
  const out = { stations: [], interactables: [], colliders: [], screens: [], hddLeds: [], hubLeds: [] };
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
  const walls = [
    [w, 0, minZ, 0], [w, 0, maxZ, Math.PI], [d, minX, 0, Math.PI / 2], [d, maxX, 0, -Math.PI / 2],
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

    const screen = new T.Screen(s.mode, i + 1);
    out.screens.push(screen);
    const mon = crt(screen.texture);
    mon.group.position.set(0, TABLE_Y, -0.12);
    g.add(mon.group);

    const tw = tower();
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

    const tag = new THREE.Mesh(new THREE.PlaneGeometry(0.16, 0.04), new THREE.MeshBasicMaterial({ map: T.nameTag(s.name) }));
    tag.position.set(0, 0.39, 0.152);
    mon.group.add(tag);

    const chair = foldingChair();
    chair.position.set(0, 0, 0.82);
    chair.rotation.y = (i * 0.37) % 0.5 - 0.25; // nobody pushes their chair in straight
    g.add(chair);

    // every station gets a can; yours also gets a bag
    const can = voltCan(labelVolt);
    can.position.set(-0.36, TABLE_Y, 0.12);
    g.add(can);

    const station = {
      ...s, index: i, group: g, screen, monitor: mon, seatTarget: new THREE.Object3D(),
      cableStart: new THREE.Vector3(),
    };
    // where the camera goes when you sit: square in front of the tube
    station.seatTarget.position.set(0, TABLE_Y + 0.225, -0.12 + 0.157 + 0.36);
    g.add(station.seatTarget);
    g.updateMatrixWorld(true);
    tw.group.localToWorld(station.cableStart.set(0, 0.06, -0.22));

    mon.group.traverse((o) => { o.userData.interact = { kind: s.mine ? 'sit' : 'busy', station }; });
    tw.group.traverse((o) => { o.userData.interact = { kind: s.mine ? 'sit' : 'busy', station }; });
    out.interactables.push(mon.group, tw.group);

    if (s.mine) {
      can.traverse((o) => { o.userData.interact = { kind: 'drink' }; });
      out.interactables.push(can);
      const bag = chipBag(labelNachoz);
      bag.position.set(-0.6, TABLE_Y, 0.02);
      bag.rotation.y = 0.5;
      g.add(bag);
      bag.traverse((o) => { o.userData.interact = { kind: 'eat' }; });
      out.interactables.push(bag);
      out.mine = station;
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
  pizza.position.set(-5.45, TABLE_Y + 0.025, 0.75);
  pizza.rotation.y = 0.2;
  scene.add(pizza);

  // the hub: 8-port 10BASE-T, sitting on the snack table because that's where the power board reached
  const hub = new THREE.Group();
  hub.add(box(0.28, 0.045, 0.14, new THREE.MeshStandardMaterial({ color: 0x2f3542, roughness: 0.6 })));
  for (let p = 0; p < 8; p++) {
    const led = box(0.01, 0.008, 0.004, new THREE.MeshBasicMaterial({ color: 0x0a3a0a }), -0.11 + p * 0.031, 0.008, 0.071);
    hub.add(led);
    out.hubLeds.push(led);
  }
  hub.position.set(-5.3, TABLE_Y + 0.023, 1.0);
  hub.rotation.y = Math.PI / 2;
  scene.add(hub);
  const hubPort = new THREE.Vector3(-5.38, TABLE_Y + 0.02, 1.0);

  // cat5 runs from every tower to the hub, gaffer-taped across the floor
  const cableColours = [0xe8c21b, 0x2b6fd6, 0x9a9a9a, 0xd23c3c, 0xe8c21b, 0x3aa35a];
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
    const tube = new THREE.Mesh(new THREE.TubeGeometry(curve, 80, 0.004, 5), new THREE.MeshStandardMaterial({ color: cableColours[i], roughness: 0.6 }));
    scene.add(tube);
  });

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
