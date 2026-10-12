// Builds the basement: walls, tables, six PC stations (and two empty benches for the PC you build), the hub, cables and the snack table.
import * as THREE from 'three';
import * as T from './textures.js';
import { buildPower } from './power.js';
import { buildBenches } from './bench.js';
import { BURNER } from './party.js';
import { headphones } from './headphones.js';
import { GAME_IDS } from './games.js';

export const ROOM = { minX: -6, maxX: 6, minZ: -5, maxZ: 5, height: 2.8 };
const TABLE_Y = 0.74;
const DESK_WALL_Z = -0.55;   // the desks pushed against the side walls: the wall is 0.55 m behind a PC's middle (js/power-plan.js)

const beige = new THREE.MeshStandardMaterial({ color: 0xd9cfb3, roughness: 0.7 });
const beigeDark = new THREE.MeshStandardMaterial({ color: 0xbfb497, roughness: 0.75 });
const black = new THREE.MeshStandardMaterial({ color: 0x151515, roughness: 0.5 });
const steel = new THREE.MeshStandardMaterial({ color: 0x6b6b6b, metalness: 0.6, roughness: 0.4 });

function box(w, h, d, mat, x = 0, y = 0, z = 0) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.position.set(x, y, z);
  return m;
}

// 6 ft fold-in-half trestle table: 183.8 x 76.2 cm, 73.7 cm high, almond top with a centre seam, brown steel legs.
const TABLE_LEN = 1.838, TABLE_DEPTH = 0.762;
const tableTopMat = new THREE.MeshStandardMaterial({ color: 0xe6dcc3, roughness: 0.85 });
const tableSeamMat = new THREE.MeshStandardMaterial({ color: 0xa89f88, roughness: 0.9 });
const tableLegMat = new THREE.MeshStandardMaterial({ color: 0x4b3a2a, metalness: 0.4, roughness: 0.55 });

function tube(a, b, r, mat) {
  const dir = new THREE.Vector3().subVectors(b, a);
  const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, dir.length(), 8), mat);
  m.position.copy(a).addScaledVector(dir, 0.5);
  m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize());
  return m;
}

// segments = how many tables are pushed end to end along x
function foldingTable(segments = 1) {
  const g = new THREE.Group();
  const total = segments * TABLE_LEN;
  for (let s = 0; s < segments; s++) {
    const cx = -total / 2 + TABLE_LEN * (s + 0.5);
    const seg = new THREE.Group();
    seg.position.x = cx;
    seg.add(box(TABLE_LEN - 0.004, 0.04, TABLE_DEPTH, tableTopMat, 0, TABLE_Y - 0.02, 0));
    seg.add(box(0.006, 0.002, TABLE_DEPTH, tableSeamMat, 0, TABLE_Y + 0.0005, 0)); // fold seam
    const top = TABLE_Y - 0.04;
    for (const sx of [-1, 1]) {
      const x = sx * (TABLE_LEN / 2 - 0.2);
      for (const sz of [-1, 1]) {
        const z = sz * (TABLE_DEPTH / 2 - 0.1);
        seg.add(tube(new THREE.Vector3(x, top, z), new THREE.Vector3(x + sx * 0.05, 0.01, z), 0.014, tableLegMat));
      }
      // low cross brace between the two legs of each frame
      seg.add(tube(new THREE.Vector3(x + sx * 0.03, 0.2, -(TABLE_DEPTH / 2 - 0.1)), new THREE.Vector3(x + sx * 0.03, 0.2, TABLE_DEPTH / 2 - 0.1), 0.01, tableLegMat));
    }
    // folding side braces under the top, hinged near the seam
    for (const sz of [-1, 1]) {
      const z = sz * (TABLE_DEPTH / 2 - 0.1);
      seg.add(tube(new THREE.Vector3(-(TABLE_LEN / 2 - 0.2), top - 0.01, z), new THREE.Vector3(TABLE_LEN / 2 - 0.2, top - 0.01, z), 0.008, tableLegMat));
    }
    g.add(seg);
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
  return { group: g, screen, led };
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
  return { group: g, hdd, drive, power };
}

// A pair of desktop speakers, one each side of the monitor, the way every PC with a sound card had them.
function speakerPair() {
  const g = new THREE.Group();
  const led = new THREE.MeshBasicMaterial({ color: 0x3cff5a });
  for (const sx of [-1, 1]) {
    const sp = new THREE.Group();
    sp.position.set(sx * 0.29, 0, -0.1);
    sp.add(box(0.1, 0.2, 0.11, beigeDark, 0, 0.1, 0));
    const cone = (r, y) => {
      const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, 0.008, 18).rotateX(Math.PI / 2), black);
      m.position.set(0, y, 0.056);
      return m;
    };
    sp.add(cone(0.036, 0.075), cone(0.015, 0.16));   // woofer, tweeter
    sp.add(box(0.008, 0.008, 0.004, led, 0, 0.025, 0.056));
    g.add(sp);
  }
  g.position.y = TABLE_Y;
  return g;
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

// A 2 L soda: clear PET, a label band, a cap. `level` is how full it is (0 to 1).
// Colours: --case-clear (plastic), --zap-green (the drink), --zap-dark (cap).
function twoLitre(label, level = 1) {
  const g = new THREE.Group();
  const pet = new THREE.MeshStandardMaterial({ color: 0xdfe6ea, roughness: 0.2, transparent: true, opacity: 0.35, depthWrite: false });
  g.add(new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.3, 20), pet).translateY(0.15));
  if (level > 0) {
    const h = 0.27 * level;
    g.add(new THREE.Mesh(new THREE.CylinderGeometry(0.048, 0.048, h, 20), new THREE.MeshStandardMaterial({ color: 0x4aa52a, roughness: 0.3 })).translateY(0.015 + h / 2));
  }
  const band = new THREE.Mesh(new THREE.CylinderGeometry(0.052, 0.052, 0.1, 20, 1, true), new THREE.MeshStandardMaterial({ map: label, roughness: 0.4, side: THREE.DoubleSide }));
  band.position.y = 0.12;
  g.add(band);
  g.add(new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.026, 0.05, 12), pet).translateY(0.325));
  g.add(new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.025, 12), new THREE.MeshStandardMaterial({ color: 0x1c5a1e, roughness: 0.4 })).translateY(0.36));
  return g;
}

// A red disposable party cup (--cup-red), open at the top. `fill` 0 to 1 of Citrus Zap (--zap-green).
const CUP = { h: 0.115, rTop: 0.042, rBot: 0.029 };
function redCup(fill = 0) {
  const g = new THREE.Group();
  const red = new THREE.MeshStandardMaterial({ color: 0xd42b22, roughness: 0.55, side: THREE.DoubleSide });
  g.add(new THREE.Mesh(new THREE.CylinderGeometry(CUP.rTop, CUP.rBot, CUP.h, 18, 1, true), red).translateY(CUP.h / 2));
  const base = new THREE.Mesh(new THREE.CircleGeometry(CUP.rBot, 18), red);
  base.rotation.x = -Math.PI / 2; base.position.y = 0.002; g.add(base);
  const rim = new THREE.Mesh(new THREE.TorusGeometry(CUP.rTop, 0.0028, 6, 18), red);
  rim.rotation.x = Math.PI / 2; rim.position.y = CUP.h; g.add(rim);
  if (fill > 0) {
    const y = 0.008 + (CUP.h - 0.03) * fill, r = CUP.rBot + (CUP.rTop - CUP.rBot) * (y / CUP.h) - 0.002;
    const top = new THREE.Mesh(new THREE.CircleGeometry(r, 18), new THREE.MeshStandardMaterial({ color: 0x4aa52a, roughness: 0.25 }));
    top.rotation.x = -Math.PI / 2; top.position.y = y; g.add(top);
  }
  return g;
}

// A sleeve of cups nested one in another, standing on end: only the rims and the top one show.
function cupSleeve(n = 10) {
  const g = new THREE.Group();
  const red = new THREE.MeshStandardMaterial({ color: 0xd42b22, roughness: 0.55, side: THREE.DoubleSide });
  const step = 0.011;
  g.add(new THREE.Mesh(new THREE.CylinderGeometry(CUP.rTop, CUP.rBot, CUP.h, 18, 1, true), red).translateY(CUP.h / 2));
  for (let i = 1; i < n; i++) {
    const y = CUP.h + (i - 1) * step;
    const ring = new THREE.Mesh(new THREE.TorusGeometry(CUP.rTop, 0.0028, 6, 18), red);
    ring.rotation.x = Math.PI / 2; ring.position.y = y + step; g.add(ring);
    g.add(new THREE.Mesh(new THREE.CylinderGeometry(CUP.rTop, CUP.rTop - 0.0015, step, 18, 1, true), red).translateY(y + step / 2));
  }
  return g;
}

// One PC on a table, in the table's own space (the monitor faces -z, the chair is at +z): monitor, tower, keyboard,
// mouse and pad, a name tag on the tube, and a folding chair. Returns the pieces the caller wires up.
function pcSetup(g, screen, tagText, chairYaw, burner = false, audio = 'speakers') {
  const mon = crt(screen.texture);
  mon.group.position.set(0, TABLE_Y, -0.12);
  g.add(mon.group);

  const tw = tower(burner);
  tw.group.position.set(0.52, TABLE_Y, -0.1);
  g.add(tw.group);

  const kb = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.025, 0.17), [beige, beige,
    new THREE.MeshStandardMaterial({ map: T.keyboardTop(), roughness: 0.7 }), beige, beige, beige]);
  kb.position.set(-0.02, TABLE_Y + 0.013, 0.24);
  kb.rotation.x = 0.05;
  g.add(kb);
  g.add(box(0.06, 0.03, 0.1, beige, 0.33, TABLE_Y + 0.015, 0.26)); // mouse
  g.add(box(0.2, 0.004, 0.18, new THREE.MeshStandardMaterial({ color: 0x1c3b6e }), 0.34, TABLE_Y + 0.002, 0.25)); // mousepad

  // sound: speakers either side of the monitor, or a pair of headphones resting on top of the tower
  let phones = null;
  if (audio === 'speakers') g.add(speakerPair());
  else {
    phones = headphones();
    phones.scale.setScalar(0.95);
    phones.position.set(0.52, TABLE_Y + 0.44 + 0.042 * 0.95 + 0.002, -0.1);
    phones.rotation.y = Math.PI / 2 + 0.2;
    g.add(phones);
  }

  const tagTex = T.nameTag(tagText);
  const tag = new THREE.Mesh(new THREE.PlaneGeometry(0.16, 0.04), new THREE.MeshBasicMaterial({ map: tagTex }));
  tag.position.set(0, 0.39, 0.152);
  mon.group.add(tag);

  const chair = foldingChair();
  chair.position.set(0, 0, 0.82);
  chair.rotation.y = chairYaw;
  g.add(chair);
  return { mon, tw, tagTex, chair, phones };
}

// Six PCs. Nobody owns one any more: whoever sits down first gets it. The idle screens are
// whatever the last person left running.
const STATIONS = [
  // row along the back wall, monitors facing the room
  // audio: 'speakers' (the room can hear what's on the screen) or 'headphones' (only you can)
  { x: -2.8, z: -4.25, face: 0, idle: 'defrag', audio: 'speakers' },
  { x: 0, z: -4.25, face: 0, idle: 'dos', audio: 'headphones' },
  { x: 2.8, z: -4.25, face: 0, idle: 'waiting', audio: 'speakers' },
  // row along the front wall
  { x: -2.8, z: 4.25, face: Math.PI, idle: 'win98', audio: 'headphones' },
  { x: 0, z: 4.25, face: Math.PI, idle: 'bios', audio: 'speakers' },
  { x: 2.8, z: 4.25, face: Math.PI, idle: 'solitaire', audio: 'headphones' },
];

// The network, in three generations. Only one is visible at a time (out.setNetwork).
//  coax:   a single black cable under the tables, a T-connector at each tower, terminators at both ends
//  hub:    8-port 10BASE-T hub on the snack table, a cat5 lead from every tower
//  switch: a borrowed 16-port switch in the hub's spot, same leads
// out.floorCables lists the bits of cable lying across the floor, for tripping over.
const BENCH_X = [-1.4, 1.4];   // js/bench-plan.js BENCHES
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
  // The bus, with the BYOC benches spliced in when both of their coax leads are fitted (js/bench.js out.setBenchCoax).
  const busAround = (via) => [under(0), ...(via[0] ? [via[0]] : []), under(1), ...(via[1] ? [via[1]] : []), under(2), new THREE.Vector3(4.55, 0.3, under(2).z), new THREE.Vector3(4.6, 0.012, -3.9),
    new THREE.Vector3(4.6, 0.012, 3.9), new THREE.Vector3(4.55, 0.3, under(5).z), under(5), under(4), under(3)];
  let busMesh = tube(busAround([null, null]), 0.006, coaxMat);
  gear.coax.add(busMesh);
  const benchBus = [null, null], benchDrops = [null, null];
  out.setBenchCoax = (id, through, stubs) => {
    const x = BENCH_X[id];
    benchBus[id] = through ? new THREE.Vector3(x + 0.52, 0.3, -4.25 - 0.32) : null;
    gear.coax.remove(busMesh);
    busMesh = tube(busAround(benchBus), 0.006, coaxMat);
    gear.coax.add(busMesh);
    if (benchDrops[id]) { gear.coax.remove(benchDrops[id]); benchDrops[id] = null; }
    if (through) {
      const st = out.stations[6 + id];
      benchDrops[id] = tube([st.cableStart.clone(), benchBus[id]], 0.005, coaxMat);
      gear.coax.add(benchDrops[id]);
    }
  };
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
  phone.position.set(ROOM.minX + 0.05, 1.3, -2.815);                  // midway between the switchboard (power.js, edge z -3.08) and the Volt Cola poster (edge z -2.55)
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

// The lounge corner, against the right wall: a plaid couch, a big CRT TV on a stand with a four-player
// console under it, and a coffee table somebody has been living off. Nothing here is a trip hazard:
// the pad leads are decoration. Colours are tokens: --couch*, --beanbag*, --oak, --tv-case, --console-*, --wood-dark.
const COUCH = { x: 2.9, z: -1.0, w: 2.0, d: 0.9 };                       // faces +x, toward the TV
const COFFEE = { x: 4.15, z: -1.0, top: 0.44, w: 0.62, l: 1.3 };          // long side along z
const TV = { x: 5.7, z: -1.0, stand: 0.42 };                              // against the wall, faces -x

// a pad lies with its player edge toward +z and its lead leaving the far edge (-z)
function gamePad(color) {
  const g = new THREE.Group();
  const shell = new THREE.MeshStandardMaterial({ color, roughness: 0.55 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x44474b, roughness: 0.6 });  // --console-dark
  g.add(box(0.1, 0.022, 0.058, shell, 0, 0.011, 0));
  for (const sx of [-1, 1]) {
    const grip = box(0.034, 0.022, 0.076, shell, sx * 0.05, 0.011, 0.04);
    grip.rotation.y = -sx * 0.22;
    g.add(grip);
  }
  g.add(box(0.026, 0.004, 0.008, dark, -0.034, 0.024, -0.004), box(0.008, 0.004, 0.026, dark, -0.034, 0.024, -0.004)); // d-pad
  const btn = (x, z, c) => { const b = new THREE.Mesh(new THREE.CylinderGeometry(0.0065, 0.0065, 0.005, 10), new THREE.MeshStandardMaterial({ color: c, roughness: 0.5 })); b.position.set(x, 0.024, z); g.add(b); };
  btn(0.046, -0.01, 0xc4161c); btn(0.034, 0.004, 0xffd400); btn(0.058, 0.004, 0x44474b); btn(0.046, 0.018, 0x44474b); // --volt-can, --volt-yellow, --console-dark
  g.add(box(0.014, 0.006, 0.006, dark, 0, 0.024, 0.004));                                                              // start
  return g;
}

// A bean bag slumped in the back-left corner, dented where somebody has been sitting in it. Six vinyl panels
// alternate between --beanbag and --beanbag-dark, with a carry handle at the back. Colours are tokens.
const BEAN = { x: -5.1, z: -3.35, r: 0.45 };
function beanBag() {
  const R = BEAN.r;
  const geo = new THREE.SphereGeometry(R, 28, 18);
  const pos = geo.attributes.position;
  const hash = (a, b) => { const v = Math.sin(a * 127.1 + b * 311.7) * 43758.5453; return v - Math.floor(v); };
  for (let i = 0; i < pos.count; i++) {
    let x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
    const up = y > 0;
    y *= up ? 0.85 : 0.32;                                   // squashed: a flat-ish bottom, a domed top
    if (up) {
      y += 0.14 * Math.max(0, -z / R) * (y / R);              // the back slumps higher than the front
      y -= 0.17 * Math.exp(-((x * x) + (z - 0.1) * (z - 0.1)) / 0.05); // the seat dent
    }
    const lump = 1 + (hash(Math.round(x * 40), Math.round(z * 40)) - 0.5) * 0.04;
    pos.setXYZ(i, x * lump, y * lump, z * lump);
  }
  let minY = Infinity;
  for (let i = 0; i < pos.count; i++) minY = Math.min(minY, pos.getY(i));
  for (let i = 0; i < pos.count; i++) pos.setY(i, pos.getY(i) - minY);
  geo.computeVertexNormals();
  const flat = geo.toNonIndexed();                            // keep the smooth normals, colour each face by panel
  const fp = flat.attributes.position;
  const light = new THREE.Color(0x2f5d6e), dark = new THREE.Color(0x204452);   // --beanbag, --beanbag-dark
  const colours = new Float32Array(fp.count * 3);
  for (let t = 0; t < fp.count; t += 3) {
    const cx = (fp.getX(t) + fp.getX(t + 1) + fp.getX(t + 2)) / 3, cz = (fp.getZ(t) + fp.getZ(t + 1) + fp.getZ(t + 2)) / 3;
    const panel = Math.floor(((Math.atan2(cz, cx) + Math.PI) / (Math.PI * 2)) * 6) % 6;
    const c = panel % 2 ? dark : light;
    for (let k = 0; k < 3; k++) colours.set([c.r, c.g, c.b], (t + k) * 3);
  }
  flat.setAttribute('color', new THREE.BufferAttribute(colours, 3));
  const g = new THREE.Group();
  g.add(new THREE.Mesh(flat, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.4, metalness: 0.05 }))); // vinyl
  const handle = new THREE.Mesh(new THREE.TorusGeometry(0.07, 0.012, 6, 14, Math.PI), new THREE.MeshStandardMaterial({ color: 0x204452, roughness: 0.5 }));
  handle.position.set(0, 0.36, -R * 0.78);
  handle.rotation.set(0.4, 0, 0);
  g.add(handle);
  return g;
}

function buildLounge(scene, out, labelVolt, labelNachoz, labelCurlz) {
  const rnd = (() => { let s = 1999; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); })();
  const std = (color, o = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.7, ...o });
  const woodDark = std(0x24150b, { roughness: 0.85 });   // --wood-dark
  const oak = std(0x8a5a2e, { roughness: 0.6 });         // --oak
  const place = (obj, x, y, z, yaw = 0) => { obj.position.set(x, y, z); obj.rotation.y = yaw; scene.add(obj); return obj; };
  const use = (obj, kind) => { obj.traverse((o) => { o.userData.interact = { kind }; }); out.interactables.push(obj); };

  // ---- couch: faces +x, so local +z is the front and local x runs along the wall (world -z)
  const couch = new THREE.Group();
  const cloth = T.couchFabric();
  const fabric = (rx, ry) => { const t = cloth.clone(); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rx, ry); t.needsUpdate = true; return std(0xffffff, { map: t, roughness: 0.95 }); };
  const seatMat = fabric(1.7, 2.2), armMat = fabric(3, 1.7), backMat = fabric(5.4, 1.8), cushionMat = fabric(1.7, 1.4); // one plaid tile is about 30 cm
  const baseMat = std(0x3f4f38, { roughness: 0.95 }); // --couch-dark
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) couch.add(box(0.06, 0.05, 0.06, woodDark, sx * 0.9, 0.025, sz * 0.38));
  couch.add(box(1.96, 0.2, 0.86, baseMat, 0, 0.15, 0));
  for (const sx of [-1, 1]) {
    couch.add(box(0.2, 0.5, 0.9, armMat, sx * 0.9, 0.3, 0));
    const roll = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.9, 14), armMat);
    roll.rotation.x = Math.PI / 2; roll.position.set(sx * 0.9, 0.55, 0);
    couch.add(roll);
  }
  couch.add(box(1.62, 0.55, 0.2, backMat, 0, 0.525, -0.33));
  for (const x of [-0.54, 0, 0.54]) {
    couch.add(box(0.52, 0.16, 0.66, seatMat, x, 0.33, 0.1));
    const back = box(0.52, 0.4, 0.16, cushionMat, x, 0.61, -0.17);
    back.rotation.x = -0.18;
    couch.add(back);
  }
  const pillow = box(0.3, 0.3, 0.1, std(0xa3483b, { roughness: 0.9 }), -0.66, 0.6, -0.04); // --couch-line
  pillow.rotation.set(-0.35, 0.3, 0.25);
  couch.add(pillow);
  place(couch, COUCH.x, 0, COUCH.z, Math.PI / 2);
  out.colliders.push({ minX: COUCH.x - COUCH.d / 2, maxX: COUCH.x + COUCH.d / 2, minZ: COUCH.z - COUCH.w / 2, maxZ: COUCH.z + COUCH.w / 2 });

  // ---- bean bag in the back-left corner, dent toward the room
  place(beanBag(), BEAN.x, 0, BEAN.z, Math.PI / 2 + 0.3);
  out.colliders.push({ minX: BEAN.x - BEAN.r * 0.9, maxX: BEAN.x + BEAN.r * 0.9, minZ: BEAN.z - BEAN.r * 0.9, maxZ: BEAN.z + BEAN.r * 0.9 });

  // ---- TV stand, TV and console: one group, front toward -x
  const set = new THREE.Group();
  const tvCase = std(0x2b2b2f, { roughness: 0.5 });    // --tv-case
  const consoleBody = std(0x9a9da1, { roughness: 0.55 }); // --console-body
  const consoleDark = std(0x44474b, { roughness: 0.6 }); // --console-dark
  set.add(box(1.15, 0.03, 0.55, woodDark, 0, TV.stand - 0.015, 0));         // top
  for (const sx of [-1, 1]) set.add(box(0.03, TV.stand - 0.03, 0.55, woodDark, sx * 0.56, (TV.stand - 0.03) / 2, 0));
  set.add(box(1.09, 0.025, 0.5, woodDark, 0, 0.17, -0.01));                  // console shelf
  set.add(box(1.09, TV.stand - 0.03, 0.012, woodDark, 0, (TV.stand - 0.03) / 2, -0.268)); // back

  const gameScreen = new T.ConsoleScreen();
  const tvY = TV.stand + 0.32;
  set.add(box(0.78, 0.64, 0.28, tvCase, 0, tvY, 0.1));                       // front shell
  set.add(box(0.54, 0.46, 0.24, tvCase, 0, tvY, -0.15));                     // tube bulge
  set.add(box(0.7, 0.54, 0.01, black, 0, tvY + 0.03, 0.241));                // bezel recess
  const glass = new THREE.Mesh(new THREE.PlaneGeometry(0.62, 0.465), new THREE.MeshBasicMaterial({ map: gameScreen.texture, toneMapped: false }));
  glass.position.set(0, tvY + 0.03, 0.247);
  set.add(glass);
  for (let k = 0; k < 4; k++) set.add(box(0.04, 0.012, 0.006, black, -0.3 + k * 0.05, TV.stand + 0.045, 0.242)); // buttons
  for (let k = 0; k < 5; k++) set.add(box(0.2, 0.004, 0.004, black, 0.2, TV.stand + 0.03 + k * 0.009, 0.242));  // speaker slots
  set.add(box(0.012, 0.012, 0.005, new THREE.MeshBasicMaterial({ color: 0x3cff5a }), 0.34, TV.stand + 0.045, 0.242));

  set.add(box(0.3, 0.07, 0.24, consoleBody, 0, 0.2175, 0.0));                // console
  set.add(box(0.12, 0.01, 0.1, consoleDark, 0, 0.2575, -0.03));              // cartridge slot
  set.add(box(0.1, 0.06, 0.02, consoleDark, 0, 0.29, -0.03));                // cartridge
  set.add(box(0.07, 0.034, 0.004, std(0xe8e1cc, { roughness: 0.8 }), 0, 0.292, -0.018)); // its label (--paper)
  const portZ = 0.12, portX = [-0.105, -0.035, 0.035, 0.105];
  for (const x of portX) set.add(box(0.04, 0.026, 0.012, consoleDark, x, 0.2275, portZ + 0.003));
  set.add(box(0.012, 0.012, 0.004, new THREE.MeshBasicMaterial({ color: 0xe2231a }), -0.14, 0.245, portZ + 0.002)); // power light (--volt)
  place(set, TV.x, 0, TV.z, -Math.PI / 2);
  use(set, 'console');                                                       // E at the TV or the console: sit down and play (js/n64.js)
  out.colliders.push({ minX: TV.x - 0.275, maxX: TV.x + 0.275, minZ: TV.z - 0.575, maxZ: TV.z + 0.575 });
  const glow = new THREE.PointLight(0x9fb8ff, 2.4, 4.2, 2);
  glow.position.set(TV.x - 0.7, 0.8, TV.z);
  scene.add(glow);
  out.updateTv = (dt) => { gameScreen.update(dt); glow.intensity = 2.2 + Math.sin(gameScreen.clock * 9) * 0.25 + Math.sin(gameScreen.clock * 2.3) * 0.2; };

  // What is on the glass: the four-player loop until somebody is at the console (js/n64.js), then the console's own
  // picture (its terminal, or the game) with scanlines laid over it. view is where you sit on the carpet, look is the glass.
  const scan = new THREE.Mesh(new THREE.PlaneGeometry(0.62, 0.465), new THREE.MeshBasicMaterial({ map: T.crtScanlines(), transparent: true, depthWrite: false, toneMapped: false }));
  scan.position.set(0, tvY + 0.03, 0.2475);
  scan.visible = false;
  set.add(scan);
  const glassMat = glass.material;
  out.tv = {
    view: new THREE.Vector3(TV.x - 0.8, 0.88, TV.z),
    look: new THREE.Vector3(TV.x - 0.247, tvY + 0.03, TV.z),
    show(kind, texture) {
      const map = texture ?? gameScreen.texture;
      if (glassMat.map === map && scan.visible === (kind !== 'idle')) return;
      glassMat.map = map;
      glassMat.needsUpdate = true;
      scan.visible = kind !== 'idle';
    },
  };

  // ---- coffee table
  const table = new THREE.Group();
  table.add(box(COFFEE.w, 0.04, COFFEE.l, oak, 0, COFFEE.top - 0.02, 0));
  table.add(box(COFFEE.w - 0.12, 0.02, COFFEE.l - 0.12, woodDark, 0, 0.12, 0));
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) table.add(box(0.05, COFFEE.top - 0.04, 0.05, woodDark, sx * (COFFEE.w / 2 - 0.04), (COFFEE.top - 0.04) / 2, sz * (COFFEE.l / 2 - 0.04)));
  place(table, COFFEE.x, 0, COFFEE.z);
  out.colliders.push({ minX: COFFEE.x - COFFEE.w / 2, maxX: COFFEE.x + COFFEE.w / 2, minZ: COFFEE.z - COFFEE.l / 2, maxZ: COFFEE.z + COFFEE.l / 2 });
  const T0 = COFFEE.top;

  // wet rings where cans have stood
  const ring = std(0x24150b, { roughness: 0.9, transparent: true, opacity: 0.4, depthWrite: false });
  for (const [x, z] of [[4.4, -1.45], [4.17, -0.7], [4.0, -1.3]]) {
    const r = new THREE.Mesh(new THREE.RingGeometry(0.03, 0.036, 20), ring);
    r.rotation.x = -Math.PI / 2; r.position.set(x, T0 + 0.0006, z);
    scene.add(r);
  }

  // a candy-bar mobile phone somebody left on the desk at PC-02, to the right of the mouse mat: slate shell, green
  // screen, grey keys. It lies face up with its top end toward the monitor. Colours are tokens: --phone-body,
  // --phone-body-light, --lcd, --disk-metal.
  const mobile = new THREE.Group();
  const shell = std(0x2d3a44, { roughness: 0.55 });            // --phone-body
  const bezel = std(0x4a5a66, { roughness: 0.5 });             // --phone-body-light
  const lcdMat = new THREE.MeshBasicMaterial({ color: 0xa3b88f }); // --lcd
  const keyMat = std(0xb9bdc2, { roughness: 0.5 });            // --disk-metal
  mobile.add(box(0.052, 0.022, 0.134, shell, 0, 0.011, 0));    // the body
  mobile.add(box(0.01, 0.016, 0.01, shell, 0.018, 0.028, -0.062)); // the stub of an aerial
  mobile.add(box(0.042, 0.001, 0.032, bezel, 0, 0.0225, -0.038));
  mobile.add(box(0.034, 0.001, 0.024, lcdMat, 0, 0.0235, -0.038)); // the screen
  mobile.add(box(0.026, 0.002, 0.008, keyMat, 0, 0.023, -0.008));  // the big menu key
  for (let r = 0; r < 4; r++) for (let c = -1; c <= 1; c++) mobile.add(box(0.012, 0.002, 0.011, keyMat, c * 0.014, 0.023, 0.007 + r * 0.017));
  const mobileHit = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.08, 0.17), new THREE.MeshBasicMaterial({ visible: false }));
  mobileHit.position.y = 0.04;
  mobile.add(mobileHit);
  { // PC-02's own space: x 0.6 is right of the mouse mat (which ends at 0.44) and clear of the tower (which ends at 0.615 but only reaches z 0.12); z 0.27 is near the front edge, where you can see it
    const s = STATIONS[1], lx = 0.6, lz = 0.27, c = Math.cos(s.face), n = Math.sin(s.face);
    place(mobile, s.x + lx * c + lz * n, TABLE_Y, s.z - lx * n + lz * c, s.face + 0.35);
  }
  use(mobile, 'mobile');

  // drinks: standing, tipped over, and a flat two-litre on the carpet
  const can = (x, y, z, yaw = 0, tip = 0) => { const c = voltCan(labelVolt); c.position.set(x, y, z); c.rotation.set(0, yaw, tip); scene.add(c); use(c, 'drink'); return c; };
  can(4.4, T0, -1.45); can(4.17, T0, -0.7);
  can(4.06, T0 + 0.034, -1.3, 0, Math.PI / 2);                // on its side, base toward +x
  can(4.7, 0.034, -1.62, 0.2, Math.PI / 2 - 0.1);             // one on the carpet
  const bottle = new THREE.Group();                            // 2 L Volt Cola, a third left
  const pet = new THREE.MeshStandardMaterial({ color: 0xdfe6ea, roughness: 0.2, transparent: true, opacity: 0.35, depthWrite: false }); // --case-clear
  const label = new THREE.Mesh(new THREE.CylinderGeometry(0.052, 0.052, 0.1, 20, 1, true), new THREE.MeshStandardMaterial({ map: labelVolt, roughness: 0.4, side: THREE.DoubleSide }));
  label.position.y = 0.12;
  bottle.add(new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.3, 20), pet).translateY(0.15));
  bottle.add(new THREE.Mesh(new THREE.CylinderGeometry(0.048, 0.048, 0.1, 20), std(0x3b1a12, { roughness: 0.3 })).translateY(0.05)); // what's left (colour is --wood-dark)
  bottle.add(label);
  bottle.add(new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.026, 0.05, 12), pet).translateY(0.325));
  bottle.add(new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.025, 12), std(0xc4161c, { roughness: 0.4 })).translateY(0.36)); // cap (--volt-can)
  place(bottle, 4.62, 0, -1.78, 0);
  use(bottle, 'drink');

  // food: a bowl of Nachoz, a bag, and the odd one on the table
  const bowl = new THREE.Group();
  const bowlMat = std(0xebe4cf, { roughness: 0.45 });   // --beige-light
  bowlMat.side = THREE.DoubleSide;
  const shellBowl = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.065, 0.07, 24, 1, true), bowlMat);
  shellBowl.position.y = 0.035; bowl.add(shellBowl);
  const bottomBowl = new THREE.Mesh(new THREE.CircleGeometry(0.065, 24), bowlMat);
  bottomBowl.rotation.x = -Math.PI / 2; bottomBowl.position.y = 0.002; bowl.add(bottomBowl);
  const puff = std(0xf28a1c, { roughness: 0.8 });       // --nacho
  const puffGeo = new THREE.SphereGeometry(0.017, 8, 6);
  for (let k = 0; k < 26; k++) {
    const a = rnd() * Math.PI * 2, rad = Math.sqrt(rnd()) * 0.075;
    const m = new THREE.Mesh(puffGeo, puff);
    m.position.set(Math.cos(a) * rad, 0.05 + (0.075 - rad) * 0.45 + rnd() * 0.012, Math.sin(a) * rad);
    m.scale.set(1, 0.7 + rnd() * 0.5, 1);
    bowl.add(m);
  }
  place(bowl, 3.99, T0, -0.55, 0);
  for (const [x, z] of [[3.88, -0.8], [4.2, -0.42], [4.43, -0.64]]) { // strays
    const m = new THREE.Mesh(puffGeo, puff); m.position.set(x, T0 + 0.012, z); m.scale.set(1, 0.7, 1); scene.add(m);
  }
  use(bowl, 'eat');
  const bag = chipBag(labelNachoz);
  place(bag, 4.34, T0, -0.5, 1.1);
  use(bag, 'eat');
  const bag2 = chipBag(labelNachoz);   // empty and crushed on the carpet
  bag2.scale.set(1, 0.4, 1);
  place(bag2, 3.62, 0.0, -0.3, 2.4);
  const bag3 = chipBag(labelCurlz);    // a bag of Cheez Curlz open on the table, orange fingers everywhere
  place(bag3, 3.6, 0, -1.05, -0.7);   // on the carpet beside the table, off the pizza's end
  use(bag3, 'eat');

  // ---- four pads, wired to the console: three on the cushions, one on the carpet
  const pads = [
    { color: 0x2b6fd6, x: 3.05, y: 0.41, z: -0.46, yaw: -Math.PI / 2 + 0.3 },     // --floppy-blue
    { color: 0xc0392b, x: 3.12, y: 0.41, z: -1.0, yaw: -Math.PI / 2 - 0.15 },     // --floppy-red
    { color: 0xe8c21b, x: 3.05, y: 0.41, z: -1.54, yaw: -Math.PI / 2 + 0.1 },     // --floppy-yellow
    { color: 0x3aa35a, x: 3.55, y: 0.0, z: -1.85, yaw: -Math.PI / 2 + 0.7 },      // --floppy-green
  ];
  set.updateMatrixWorld(true);
  const wire = new THREE.MeshStandardMaterial({ color: 0x44474b, roughness: 0.7 }); // --console-dark
  out.lyingPads = [];
  out.padColors = pads.map((P) => P.color);
  pads.forEach((P, i) => {
    const g = gamePad(P.color);
    out.lyingPads.push(g);
    place(g, P.x, P.y, P.z, P.yaw);
    g.updateMatrixWorld(true);
    const exit = g.localToWorld(new THREE.Vector3(0, 0.012, -0.03));
    const port = set.localToWorld(new THREE.Vector3(portX[i], 0.2275, portZ + 0.01));
    const lip = port.z + (i - 1.5) * 0.05;
    const pts = [
      port,
      new THREE.Vector3(port.x - 0.03, 0.19, port.z + (i - 1.5) * 0.01),
      new THREE.Vector3(TV.x - 0.3, 0.19, lip),                       // over the lip of the shelf
      new THREE.Vector3(TV.x - 0.42, 0.012, lip + (i - 1.5) * 0.04),   // down to the carpet
      new THREE.Vector3(4.7, 0.012, lip * 0.5 + exit.z * 0.5),
      new THREE.Vector3(3.95, 0.012, exit.z + (rnd() - 0.5) * 0.12),
    ];
    if (P.y > 0) pts.push(new THREE.Vector3(3.5, 0.012, exit.z), new THREE.Vector3(3.36, 0.2, exit.z), new THREE.Vector3(3.33, 0.42, exit.z), new THREE.Vector3(exit.x + 0.04, P.y + 0.02, exit.z));
    else pts.push(new THREE.Vector3((3.95 + exit.x) / 2, 0.012, exit.z + 0.05));
    pts.push(exit);
    scene.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts, false, 'catmullrom', 0.3), 70, 0.0035, 5), wire));
  });
}

// Where the regulars sit. They don't wander: each has a PC of their own or a cushion on the couch, and plays all
// night. The desks are scenery: not in out.stations, nothing on them can be used (no sit prompt, no cans to
// drink), so only the six real PCs are for visitors. Each runs a game of its own on its screen.
//   out.seats[name]     where that regular sits (see seatFor in avatars.js), and whether their PC has speakers or headphones
//   out.gamerScreens    the screens to redraw each frame, with out.screens
const GAMER_DESKS = [
  // right wall, two PCs facing the wall. Players face +x.
  { x: 5.45, z: 2.0, segments: 2, yaw: -Math.PI / 2, pcs: [['K-Rad', 1.25, 'DEATHMATCH', 'speakers'], ['n00bslayer', 2.75, 'FRAGGING', 'speakers']] },
  // front-left corner, where the snack table leaves off. Players face -x.
  { x: -5.45, z: 1.838 + TABLE_LEN / 2, segments: 1, yaw: Math.PI / 2, pcs: [['xX_Ghoul_Xx', 1.838 + TABLE_LEN / 2, 'DEATHMATCH', 'headphones']] },
];
const COUCH_SEATS = [['MACCA', 0], ['PhatBass', 2]]; // [who, cushion]: 0 is the near end, 1 the middle, 2 the far end

function buildGamers(scene, out, labelVolt) {
  out.seats = {};
  out.gamerScreens = [];
  GAMER_DESKS.forEach((d, di) => {
    const t = foldingTable(d.segments);
    t.rotation.y = Math.PI / 2;
    t.position.set(d.x, 0, d.z);
    scene.add(t);
    const half = (d.segments * TABLE_LEN) / 2;
    out.colliders.push({ minX: d.x - TABLE_DEPTH / 2, maxX: d.x + TABLE_DEPTH / 2, minZ: d.z - half, maxZ: d.z + half });

    d.pcs.forEach(([who, z, what, audio], pi) => {
      const g = new THREE.Group();
      g.position.set(d.x, 0, z);
      g.rotation.y = d.yaw;
      scene.add(g);
      const screen = new T.Screen('remote', 20 + di * 3 + pi);
      screen.setFree(false, who.toUpperCase(), what);
      out.gamerScreens.push(screen);
      const { chair, phones, mon } = pcSetup(g, screen, who.toUpperCase(), 0.1 * (pi + 1) - 0.15, false, audio);
      (out.gamerPcs ??= []).push({ group: g, wallZ: DESK_WALL_Z, mon });
      if (phones) phones.visible = false; // they're wearing them
      const can = voltCan(labelVolt);
      can.position.set(-0.36, TABLE_Y, 0.12);
      g.add(can);
      g.updateMatrixWorld(true);
      out.seats[who] = { chair, group: g, audio };
      const at = chair.getWorldPosition(new THREE.Vector3());
      out.colliders.push({ minX: at.x - 0.25, maxX: at.x + 0.25, minZ: at.z - 0.25, maxZ: at.z + 0.25 });
    });
  });

  // the couch: two of the three cushions are taken. A taken cushion's pad is in its player's hands, so the one that was
  // lying there goes (its lead still runs to the console, which is where it would end up anyway).
  for (const [who, cushion] of COUCH_SEATS) {
    const z = COUCH.z + 0.54 - cushion * 0.54;
    out.lyingPads[cushion].visible = false;
    out.seats[who] = { pose: 'couch', x: COUCH.x + 0.05, z, yaw: -Math.PI / 2, pad: gamePad(out.padColors[cushion]) };
    out.colliders.push({ minX: COUCH.x + 0.4, maxX: COUCH.x + 0.8, minZ: z - 0.16, maxZ: z + 0.16 }); // their legs
  }
}

// The Pizza Shack box: plain cardboard, red print on the walls and the lid. Shared by every box, including the one the driver carries.
// Colours are tokens: --cardboard, and the print in js/textures.js (--pepperoni, --paper, --pizza-cheese).
let shackMats = null;
export function shackBoxMats() {
  return shackMats ??= (() => {
    const card = new THREE.MeshStandardMaterial({ color: 0xb8935a, roughness: 0.95 });         // --cardboard
    const wall = new THREE.MeshStandardMaterial({ map: T.shackBoxSide(), roughness: 0.9 });
    const lidIn = new THREE.MeshStandardMaterial({ map: T.shackLid(true), roughness: 0.95 });  // the face that shows when it is propped open
    const lidOut = new THREE.MeshStandardMaterial({ map: T.shackLid(), roughness: 0.95 });
    return {
      base: [wall, wall, card, card, wall, wall],  // +x, -x, +y, -y, +z, -z
      lid: [card, card, lidIn, lidOut, card, card],
      closed: [wall, wall, lidIn, card, wall, wall],  // a closed box, the one the driver holds out: the print faces the person he is handing it to
    };
  })();
}

// A pizza box with a pepperoni pizza cut in eight. setSlices(n) leaves n slices in the box.
// Colours are tokens: --cardboard, --pizza-crust, --pizza-cheese, --pepperoni.
const LID_OPEN = -1.9, LID_SHUT = -Math.PI;   // the lid's hinge angle: propped open, and flat on top of the box
function pizzaBox(slices = 8, open = true) {
  const g = new THREE.Group();
  const mats = shackBoxMats();
  const crust = new THREE.MeshStandardMaterial({ color: 0xd9a04a, roughness: 0.8 });
  const cheese = new THREE.MeshStandardMaterial({ color: 0xf2c14e, roughness: 0.55 });
  const pep = new THREE.MeshStandardMaterial({ color: 0xb22a1e, roughness: 0.6 });
  g.add(box(0.44, 0.045, 0.44, mats.base, 0, 0.0225, 0));
  // the lid hinges on the back edge. Its panel sits 4 cm off the hinge line so that, shut, it clears the pizza, and its
  // four lips (plain cardboard) hang down over the sides of the box when it is shut
  const lid = new THREE.Group();
  lid.position.set(0, 0.045, 0.22);
  lid.add(box(0.44, 0.012, 0.44, mats.lid, 0, -0.04, 0.22));
  const card = mats.base[2];
  for (const x of [-0.218, 0.218]) lid.add(box(0.004, 0.04, 0.44, card, x, -0.02, 0.22));
  for (const z of [0.002, 0.438]) lid.add(box(0.44, 0.04, 0.004, card, 0, -0.02, z));
  g.add(lid);
  const slicesList = [];
  for (let i = 0; i < 8; i++) {
    const sl = new THREE.Group();
    const a0 = (i * Math.PI) / 4;
    // each slice is one eighth of a round pizza: a narrow arc of a cylinder
    const arc = (r, h, m) => new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, 24, 1, false, a0, Math.PI / 4 - 0.03), m);
    const c = arc(0.2, 0.02, crust); c.position.y = 0.055;
    const ch = arc(0.17, 0.026, cheese); ch.position.y = 0.058;
    const p = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.03, 10), pep);
    p.position.set(Math.sin(a0 + Math.PI / 8) * 0.1, 0.062, Math.cos(a0 + Math.PI / 8) * 0.1);
    sl.add(c, ch, p);
    g.add(sl);
    slicesList.push(sl);
  }
  const out = { group: g, slices, max: 8, open, lid, t: open ? 1 : 0 };   // t: 0 shut .. 1 open, eased toward `open` by step()
  out.setSlices = (n) => {
    out.slices = n;
    slicesList.forEach((sl, i) => { sl.visible = i < n; });
  };
  const pose = () => { const e = out.t * out.t * (3 - 2 * out.t); lid.rotation.x = LID_SHUT + (LID_OPEN - LID_SHUT) * e; };
  out.setOpen = (on, snap = false) => { out.open = on; if (snap) out.t = on ? 1 : 0; pose(); };
  out.toggle = () => { out.setOpen(!out.open); return out.open; };
  out.step = (dt) => { // the lid swings over a quarter of a second
    const goal = out.open ? 1 : 0;
    if (out.t === goal) return;
    out.t = goal > out.t ? Math.min(goal, out.t + dt * 4) : Math.max(goal, out.t - dt * 4);
    pose();
  };
  out.setSlices(slices);
  pose();
  return out;
}

// Half-eaten pizzas lying about, and the ones that get delivered. out.pizzaBoxes holds them all.
// Every spot keeps a 0.44 m square clear of cans, bags, disks, game boxes and the PC towers (checked by tools/room.test.mjs),
// and a box that spawns gets its lid open or shut at random, so the party is a mix.
const PIZZA_SPOTS = [ // where deliveries are put down: x, y, z, yaw
  [1.4, 0, 4.25, 0.3], [4.0, 0, 4.25, 3.3], [-3.9, 0, -4.25, 0.1],   // gaps in the tables, not the back table's middle: that is where the BYOC benches are
];
function buildPizza(scene, out) {
  out.pizzaBoxes = [];
  let delivered = 0;
  const place = (x, y, z, yaw, slices, open = true) => {
    const b = pizzaBox(slices, open);
    b.group.position.set(x, y, z); b.group.rotation.y = yaw;
    scene.add(b.group);
    b.group.traverse((o) => { o.userData.interact = { kind: 'pizza', box: b }; });
    out.interactables.push(b.group);
    out.pizzaBoxes.push(b);
    return b;
  };
  // already on the go when you walk in: some with the lid propped open, some shut
  place(-5.45, TABLE_Y, -1.5, 0.2, 3, true);    // the snack table, at the quiet end
  place(-1.4, TABLE_Y, 4.25, 0.5, 4, false);    // between PC-04 and PC-05
  place(1.7, 0, 1.9, 2.9, 2, false);            // on the carpet, where somebody put it down
  place(-3.6, 0, -2.4, 0.9, 1, true);           // on the carpet by the back table
  place(COFFEE.x, COFFEE.top, COFFEE.z, Math.PI / 2 + 0.1, 5, true); // the coffee table, lid toward the TV
  out.addPizza = () => {
    const [x, y, z, yaw] = PIZZA_SPOTS[delivered % PIZZA_SPOTS.length];
    const stack = Math.floor(delivered / PIZZA_SPOTS.length);
    delivered++;
    if (stack > 0) { // the spot is taken: this one goes on top, so the box underneath has to be shut
      const below = out.pizzaBoxes.filter((b) => Math.abs(b.group.position.x - x) < 0.01 && Math.abs(b.group.position.z - z) < 0.01).pop();
      below?.setOpen(false, true);
    }
    return place(x, TABLE_Y + stack * 0.09, z, yaw, 8, Math.random() < 0.5 && stack === 0);
  };
  out.updatePizza = (dt) => { for (const b of out.pizzaBoxes) b.step(dt); };
}

// The man taped to the ceiling. The duct and the tape are built here; main.js puts the man in.
function buildCeilingGamer(scene, out) {
  const duct = new THREE.MeshStandardMaterial({ color: 0x9aa0a6, roughness: 0.4, metalness: 0.7 }); // --duct-silver
  const tape = new THREE.MeshStandardMaterial({ color: 0x5c6166, roughness: 0.35, metalness: 0.5 }); // --duct-tape
  const at = { x: -2.6, y: 2.12, z: 3.0 };   // his feet; he lies with his head toward -z
  // a run of ceiling duct along x, behind his feet
  scene.add(box(5.4, 0.4, 0.5, duct, at.x, 2.6, at.z + 0.1));
  for (let i = 0; i < 9; i++) scene.add(box(0.03, 0.42, 0.52, tape, at.x - 2.4 + i * 0.6, 2.6, at.z + 0.1)); // duct bands
  // gaffer tape holding him to it: bands round his legs and chest, and straps up to the duct
  for (const dz of [0.15, -0.3, -0.75, -1.15]) scene.add(box(0.5, 0.36, 0.06, tape, at.x, at.y, at.z + dz));
  for (const dx of [-0.16, 0.16]) scene.add(box(0.07, 0.3, 0.01, tape, at.x + dx, at.y + 0.28, at.z - 0.3));
  const hit = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.5, 1.8), new THREE.MeshBasicMaterial({ visible: false }));
  hit.position.set(at.x, at.y, at.z - 0.8);
  hit.userData.interact = { kind: 'taped' };
  scene.add(hit);
  out.interactables.push(hit);
  out.taped = at;
}

// Floppies, CDs and the boxes they live in, scattered over the tables, the PC cases and the carpet.
// Colours are tokens: --floppy-*, --disk-*, --disc-*, --case-clear. It is all decoration: nothing here is
// interactive, so geometry and materials are shared.
const FL = { w: 0.09, t: 0.0034, d: 0.094 }; // a 3.5" disk, in metres
function buildMedia(scene, out) {
  const rnd = (() => { let s = 1998; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); })();
  const std = (color, o = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.6, ...o });
  const clear = (color, opacity) => new THREE.MeshStandardMaterial({ color, roughness: 0.2, transparent: true, opacity, depthWrite: false });
  const put = (parent, obj, x, y, z, yaw = 0, tx = 0, tz = 0) => { obj.position.set(x, y, z); obj.rotation.set(tx, yaw, tz); parent.add(obj); return obj; };

  const caseDark = std(0x26262b, { roughness: 0.4 });                 // --disk-case
  const smoke = clear(0x3a3d42, 0.55);                                // --disk-smoke
  const jewelClear = clear(0xdfe6ea, 0.28);                           // --case-clear
  const metal = std(0xb9bdc2, { metalness: 0.8, roughness: 0.35 });   // --disk-metal
  const cardboard = std(0xb8935a, { roughness: 0.95 });               // --cardboard

  // ---- 3.5" floppies: black mostly, the odd coloured one, each with a scribbled label
  const shells = [0x1c1c1f, 0x2b6fd6, 0xc0392b, 0xe8c21b, 0x3aa35a, 0x8a8d92].map((c) => std(c, { roughness: 0.5 })); // --floppy-*
  const STRIPE = ['#e2231a', '#2b6fd6', '#e8c21b', '#3aa35a', '#f28a1c'];
  const LABELS = ['DOOM2.WAD', 'QUAKE', 'NETFRAG', 'AUTOEXEC', 'MP3 TUNES', 'WIN98 BOOT', 'KEEN SAVES', 'DRIVERS', 'GAMES 1', 'WARP.EXE', 'IPX FIX', 'DO NOT ERASE']
    .map((text, i) => std(0xffffff, { map: T.floppyLabel(text, STRIPE[i % STRIPE.length], i + 1), roughness: 0.8 }));
  const bodyGeo = new THREE.BoxGeometry(FL.w, FL.t, FL.d);
  const shutGeo = new THREE.BoxGeometry(0.036, FL.t + 0.0008, 0.021);
  const labGeo = new THREE.PlaneGeometry(0.058, 0.04);
  const floppy = (shell, label) => { // lies flat, label up, the metal shutter toward -z
    const g = new THREE.Group();
    g.add(new THREE.Mesh(bodyGeo, shells[shell % shells.length]));
    g.add(put(g, new THREE.Mesh(shutGeo, metal), 0.012, 0, -0.0335));
    g.add(put(g, new THREE.Mesh(labGeo, LABELS[label % LABELS.length]), 0, FL.t / 2 + 0.0002, 0.027, 0, -Math.PI / 2));
    return g;
  };
  const pick = () => [0, 0, 0, 1, 2, 3, 4, 5][Math.floor(rnd() * 8)];
  const loose = (parent, x, y, z, yaw) => put(parent, floppy(pick(), Math.floor(rnd() * LABELS.length)), x, y + FL.t / 2, z, yaw);
  const stack = (parent, x, y, z, n, yaw) => {
    for (let k = 0; k < n; k++) put(parent, floppy(pick(), Math.floor(rnd() * LABELS.length)), x + (rnd() - 0.5) * 0.012, y + FL.t / 2 + k * FL.t, z + (rnd() - 0.5) * 0.012, yaw + (rnd() - 0.5) * 0.7);
    return y + n * FL.t;
  };

  // ---- CDs
  const ringGeo = new THREE.RingGeometry(0.0075, 0.06, 40);
  const faces = {
    silver: T.discFace('silver'), cdr: T.discFace('cdr'), burnt: T.discFace('burnt', 'MIX CD'),
    burnt2: T.discFace('burnt', 'DOOM LVLS'), printed: T.discFace('printed', 'NETFRAG'),
  };
  const discMats = Object.fromEntries(Object.entries(faces).map(([k, map]) => [k, new THREE.MeshStandardMaterial({ map, side: THREE.DoubleSide, roughness: 0.3, metalness: 0.5 })]));
  const disc = (kind) => { const m = new THREE.Mesh(ringGeo, discMats[kind]); m.rotation.x = -Math.PI / 2; return m; };
  const cd = (parent, kind, x, y, z, yaw) => { const g = new THREE.Group(); g.add(disc(kind)); return put(parent, g, x, y + 0.0008, z, yaw); };

  // a jewel case, lying flat: black tray, paper insert, a disc, clear lid
  const INSERTS = [['NETFRAG 98', '#000080'], ['MIX CD 4', '#e2231a'], ['SOUNDS OF', '#3aa35a'], ['GAME PACK', '#2b6fd6']];
  const jewel = (n, kind = 'silver') => {
    const [title, band] = INSERTS[n % INSERTS.length];
    const g = new THREE.Group();
    g.add(box(0.14, 0.002, 0.124, caseDark, 0, 0.001, 0));
    g.add(put(g, new THREE.Mesh(new THREE.PlaneGeometry(0.138, 0.12), new THREE.MeshStandardMaterial({ map: T.jewelInsert(title, band), roughness: 0.8 })), 0, 0.0022, 0, 0, -Math.PI / 2));
    const d = new THREE.Group(); d.add(disc(kind)); put(g, d, 0, 0.0045, 0.002, 0.6);
    g.add(box(0.142, 0.0035, 0.125, jewelClear, 0, 0.0075, 0));
    return g;
  };

  // a 10-disk library case: black base, smoked lid on a hinge, disks lying in it
  const diskCase = (open, n) => {
    const g = new THREE.Group();
    const W = 0.102, D = 0.106, H = 0.03, wl = 0.004;
    g.add(box(W, wl, D, caseDark, 0, wl / 2, 0));
    g.add(box(wl, H, D, caseDark, -W / 2 + wl / 2, H / 2, 0), box(wl, H, D, caseDark, W / 2 - wl / 2, H / 2, 0));
    g.add(box(W - 2 * wl, H, wl, caseDark, 0, H / 2, -D / 2 + wl / 2), box(W - 2 * wl, H, wl, caseDark, 0, H / 2, D / 2 - wl / 2));
    stack(g, 0, wl, 0, n, 0);
    const hinge = new THREE.Group();
    hinge.position.set(0, H, D / 2);
    hinge.rotation.x = open ? 1.8 : 0;
    hinge.add(box(W, 0.004, D, smoke, 0, 0, -D / 2));
    hinge.add(put(hinge, new THREE.Mesh(new THREE.PlaneGeometry(0.07, 0.03), LABELS[8]), 0, 0.0025, -0.03, 0, -Math.PI / 2));
    g.add(hinge);
    return g;
  };

  // a cardboard ten-pack of blank disks
  const packLabel = std(0xffffff, { map: T.floppyLabel('10 x HD', '#2b6fd6', 40), roughness: 0.8 });
  const pack = () => {
    const g = new THREE.Group();
    const m = new THREE.Mesh(new THREE.BoxGeometry(0.097, 0.035, 0.097), [cardboard, cardboard, packLabel, cardboard, cardboard, cardboard]);
    m.position.y = 0.0175; g.add(m);
    return g;
  };

  // a flip-top tub: forty disks stood on end under a smoked lid
  const tub = () => {
    const g = new THREE.Group();
    const W = 0.19, D = 0.145;
    g.add(box(W, 0.045, D, caseDark, 0, 0.0225, 0));
    for (let k = 0; k < 14; k++) {
      const f = floppy(pick(), k);
      put(g, f, -W / 2 + 0.014 + k * 0.0122, 0.065, (rnd() - 0.5) * 0.006, 0, 0, Math.PI / 2 + (rnd() - 0.5) * 0.1);
    }
    g.add(box(W, 0.07, D, smoke, 0, 0.08, 0));
    g.add(box(0.03, 0.012, 0.01, caseDark, 0, 0.045, -D / 2 - 0.004));
    g.add(put(g, new THREE.Mesh(new THREE.PlaneGeometry(0.09, 0.04), LABELS[10]), 0, 0.022, -D / 2 - 0.0006, Math.PI, 0));
    return g;
  };

  // a CD spindle: a stack on a post under a clear dome
  const spindle = () => {
    const g = new THREE.Group();
    const part = (geo, mat, y) => { const m = new THREE.Mesh(geo, mat); m.position.y = y; g.add(m); return m; };
    part(new THREE.CylinderGeometry(0.066, 0.066, 0.006, 24), caseDark, 0.003);
    part(new THREE.CylinderGeometry(0.06, 0.06, 0.03, 32), [std(0x8f949a, { metalness: 0.5 }), discMats.printed, std(0x8f949a)], 0.021); // --disc-edge
    part(new THREE.CylinderGeometry(0.0055, 0.0055, 0.05, 8), caseDark, 0.031);
    part(new THREE.CylinderGeometry(0.064, 0.064, 0.05, 28), jewelClear, 0.031);
    return g;
  };

  // ---- the PC stations: tower tops, the table round the keyboard, a drive tray left out, the carpet and the chair
  // spots are in the station's own space (+z toward the person sitting)
  const TOWER_TOP = TABLE_Y + 0.44;
  const PLAN = [
    { stack: 3, tray: true, floppies: [[0.31, 0.03, 0.4]], cds: [[0.52, 0.27, 'silver', 1.1]], floor: [['f', 0.86, 0.64, 1.1]] },
    { stack: 1, topCd: 'burnt', floppies: [[-0.33, -0.2, 2.0]], jewel: [-0.44, 0.27, 0.25, 1], seat: 'f' },
    { stack: 4, tray: true, floppies: [[0.31, 0.03, 2.7], [-0.4, -0.34, 0.9]], floor: [['cd', -0.52, 0.58, 0.4, 'cdr']] },
    { stack: 2, topCd: 'burnt2', floppies: [[0.31, 0.04, 5.2]], jewel: [-0.44, 0.27, -0.2, 0], cds: [[0.52, 0.27, 'burnt', 2.2]], floor: [['f', -0.3, 0.7, 0.2]] },
    { stack: 0, tray: true, floppies: [[0.31, 0.03, 1.4], [-0.32, -0.2, 3.9]], onKeys: 'printed', seat: 'cd' },
    { stack: 2, floppies: [[-0.4, -0.34, 4.4]], jewel: [-0.44, 0.27, 0.5, 2], cds: [[0.52, 0.27, 'printed', 0.7]], floor: [['cd', 0.7, 0.5, 2.1, 'silver']] },
  ];
  out.stations.forEach((st, i) => {
    const g = st.group, P = PLAN[i];
    if (P.stack) {
      const top = stack(g, 0.52, TOWER_TOP, -0.1, P.stack, 0.3 + i);
      if (P.topCd) cd(g, P.topCd, 0.5, top, -0.1, 0.9);
    } else cd(g, 'cdr', 0.52, TOWER_TOP, -0.1, 0.4);
    if (P.tray && i !== BURNER.pc) { // the CD-ROM tray left sticking out of the front, with a disc in it
      g.add(box(0.12, 0.003, 0.12, beigeDark, 0.52, TABLE_Y + 0.376, 0.18));
      cd(g, 'silver', 0.52, TABLE_Y + 0.378, 0.19, 0.3 + i);
    }
    for (const [x, z, yaw] of P.floppies ?? []) loose(g, x, TABLE_Y, z, yaw);
    for (const [x, z, kind, yaw] of P.cds ?? []) cd(g, kind, x, TABLE_Y, z, yaw);
    if (P.jewel) put(g, jewel(P.jewel[3], i % 2 ? 'cdr' : 'silver'), P.jewel[0], TABLE_Y, P.jewel[1], P.jewel[2]);
    if (P.onKeys) cd(g, P.onKeys, -0.02, TABLE_Y + 0.0265, 0.24, 0.8); // on the keyboard, naturally
    for (const [type, x, z, yaw, kind] of P.floor ?? []) {
      if (type === 'f') loose(g, x, 0.003, z, yaw); else cd(g, kind, x, 0.003, z, yaw);
    }
    if (P.seat === 'f') put(st.chair, floppy(0, 5), 0.05, 0.465 + FL.t / 2 + 0.0004, 0.0, 0.4);
    if (P.seat === 'cd') cd(st.chair, 'cdr', -0.03, 0.465, -0.02, 0.7);
  });

  // ---- between the machines, in the gaps the pizza boxes leave
  put(scene, diskCase(true, 7), 0.95, TABLE_Y, -4.56, 0.12);
  put(scene, diskCase(false, 5), -2.0, TABLE_Y, -4.56, -0.1);
  put(scene, pack(), -2.3, TABLE_Y, 4.56, 0.3);
  put(scene, diskCase(false, 8), 0.95, TABLE_Y, 4.56, 0.2);
  put(scene, diskCase(true, 4), 2.0, TABLE_Y, 4.56, 3.0);
  put(scene, jewel(3, 'cdr'), -0.85, TABLE_Y, 4.56, 3.3);
  put(scene, tub(), 3.85, TABLE_Y, -4.25, 0.05);            // the back table's far end
  put(scene, spindle(), -3.85, TABLE_Y, 4.25, 0);           // the front table's far end
  loose(scene, 2.2, TABLE_Y, -4.0, 0.9); loose(scene, -2.05, TABLE_Y, 4.0, 2.3);

  // ---- the snack table: a spindle, a case and a couple of loose disks round the Nachoz
  put(scene, spindle(), -5.4, TABLE_Y, -0.46, 0);
  put(scene, diskCase(true, 6), -5.3, TABLE_Y, -1.02, Math.PI / 2 + 0.15);
  loose(scene, -5.25, TABLE_Y, 0.04, 0.7); loose(scene, -5.22, TABLE_Y + FL.t, 0.04, 0.2);
  cd(scene, 'burnt', -5.28, TABLE_Y, 0.2, 1.9);

  // ---- the coffee table and the carpet round the couch
  put(scene, spindle(), 3.97, COFFEE.top, -1.46, 0);
  put(scene, jewel(1, 'cdr'), 4.22, COFFEE.top, -1.52, 0.3);
  cd(scene, 'burnt', 4.3, COFFEE.top, -0.72, 1.2);
  loose(scene, 3.9, COFFEE.top, -0.7, 0.6);
  put(scene, diskCase(true, 6), 4.15, 0.13, -1.0, 0.2);          // on the lower shelf
  cd(scene, 'silver', 4.7, 0.003, -1.3, 0.4); cd(scene, 'printed', 3.6, 0.003, -0.15, 1.7);
  put(scene, jewel(2, 'silver'), 4.62, 0.005, -0.6, 0.9);
  loose(scene, 3.7, 0.003, -1.3, 1.2);

  // ---- on the carpet: dropped, kicked, stood on
  loose(scene, -1.0, 0.003, 0.8, 0.4); loose(scene, 2.3, 0.003, -1.1, 2.0); loose(scene, -3.3, 0.003, -2.9, 5.5);
  cd(scene, 'silver', 0.4, 0.003, 1.6, 1.0); cd(scene, 'burnt2', 3.3, 0.003, 2.3, 0.2); cd(scene, 'cdr', -2.2, 0.003, -1.6, 2.7);
  put(scene, jewel(0), 3.6, 0.005, 1.0, 0.5, 0, 0.0);
  put(scene, pack(), -4.4, 0, 2.7, 0.8);
}

// The games the PCs can run, boxed, on a shelf on the left wall by the front corner: one big box per game in
// js/games.js, in the same order. The box art is invented (see textures.js gameBoxFront). Decoration only.
// Colours are tokens: --wood and --wood-dark for the shelf.
const BOX = { w: 0.2, h: 0.28, d: 0.05 };
const boxMatCache = {};
function gameBoxMats(id) { // +x, -x, +y, -y, +z, -z: spine and the other side, top, bottom, front, back
  return boxMatCache[id] ??= (() => {
    const cardboard = new THREE.MeshStandardMaterial({ color: 0xb8935a, roughness: 0.95 }); // --cardboard
    return [
      new THREE.MeshStandardMaterial({ map: T.gameBoxSpine(id), roughness: 0.7 }),
      cardboard, cardboard, cardboard,
      new THREE.MeshStandardMaterial({ map: T.gameBoxFront(id), roughness: 0.55 }),
      new THREE.MeshStandardMaterial({ map: T.gameBoxBack(id), roughness: 0.7 }),
    ];
  })();
}
function buildGameShelf(scene) {
  const { minX } = ROOM;
  const wood = new THREE.MeshStandardMaterial({ color: 0x4a2c17, roughness: 0.8 });       // --wood
  const woodDark = new THREE.MeshStandardMaterial({ color: 0x24150b, roughness: 0.85 });  // --wood-dark
  const SHELF_Y = 1.05, GAP = 0.07, n = GAME_IDS.length;
  const len = n * BOX.w + (n + 1) * GAP, z0 = 4.15 - len / 2;
  scene.add(box(0.16, 0.03, len, wood, minX + 0.08, SHELF_Y - 0.015, z0 + len / 2));
  scene.add(box(0.16, 0.012, 0.03, woodDark, minX + 0.08, SHELF_Y - 0.036, z0 + 0.015));   // front lip is a rail under the plank
  for (const z of [z0 + 0.12, z0 + len / 2, z0 + len - 0.12]) { // L brackets
    scene.add(box(0.02, 0.14, 0.03, woodDark, minX + 0.01, SHELF_Y - 0.1, z));
    scene.add(box(0.14, 0.02, 0.03, woodDark, minX + 0.08, SHELF_Y - 0.04, z));
  }
  GAME_IDS.forEach((id, i) => {
    const g = new THREE.Group(); // origin: the box's bottom back edge, facing +x into the room
    g.position.set(minX + 0.03, SHELF_Y, z0 + GAP + BOX.w / 2 + i * (BOX.w + GAP));
    g.rotation.y = Math.PI / 2;
    const lean = new THREE.Group();
    lean.rotation.x = -0.08 - (i % 2) * 0.02; // leaning back on the wall, not quite in a line
    lean.add(box(BOX.w, BOX.h, BOX.d, gameBoxMats(id), 0, BOX.h / 2, BOX.d / 2));
    g.add(lean);
    scene.add(g);
  });
}

// The rest of the boxes, left where people put them down: on the tables, a chair, the carpet and the couch, some
// stacked, all flat with the picture up. [game, x, y, z, yaw]; the surface heights are the tables' and the seats'.
// Decoration only, so nothing is interactive. The spots keep clear of the pizza boxes, cans, bags and disks.
const BOX_SPOTS = [
  // the back table
  ['quake', -4.42, TABLE_Y, -4.2, 0.5], ['hexen', -2.0, TABLE_Y, -4.0, -0.4], ['doom', 4.35, TABLE_Y, -4.2, 2.3],
  ['descent', 4.35, TABLE_Y + BOX.d, -4.2, 2.9],                                    // on top of that one
  // the front table
  ['heretic', -4.42, TABLE_Y, 4.15, 3.4], ['doom', 4.42, TABLE_Y, 4.2, 5.9], ['quake', 2.1, TABLE_Y, 4.0, 0.2],
  // the snack table and the couch
  ['hexen', -4.4, 0.003, -1.0, 1.3], ['descent', 3.05, 0.41, -1.0, 0.7],
  // the carpet
  ['heretic', -2.3, 0.003, 0.3, 2.1], ['doom', 1.6, 0.003, -1.7, 4.4], ['quake', 1.45, 0.003 + BOX.d, -1.62, 4.9], // a pair, one on the other
  ['descent', -4.6, 0.003, -1.9, 0.3], ['hexen', 1.0, 0.003, 2.7, 3.7], ['doom', -0.6, 0.003, -2.6, 1.1],
];
function buildLooseBoxes(scene, out) {
  const flat = (id, x, y, z, yaw) => { // the picture faces up; local +z of the box becomes +y
    const g = new THREE.Group();
    g.position.set(x, y, z); g.rotation.y = yaw;
    const m = box(BOX.w, BOX.h, BOX.d, gameBoxMats(id), 0, BOX.d / 2, 0);
    m.rotation.x = -Math.PI / 2;
    g.add(m);
    scene.add(g);
    return g;
  };
  for (const [id, x, y, z, yaw] of BOX_SPOTS) flat(id, x, y, z, yaw);
  const seat = out.stations[0]?.chair; // PC-01's chair, a box left on the seat
  if (seat) {
    const g = flat('quake', 0.02, 0.465, 0.0, 0.3);
    seat.add(g);
  }
}

// Nachoz and Cheez Curlz, spilled everywhere: triangle chips, curls and cheese-dust crumbs lying on the desks, keyboards,
// chair seats, the snack table, the coffee table and the carpet. Colours are tokens: --nacho (chips), --curlz (curls),
// --cheese (dust). It is all decoration, so nothing here is interactive and each kind is one instanced mesh per surface.
function buildChips(scene, out) {
  const rnd = (() => { let s = 1337; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); })();
  const mat = (color) => new THREE.MeshStandardMaterial({ color, roughness: 0.85 });
  const KINDS = {
    nacho: { geo: new THREE.CylinderGeometry(0.019, 0.019, 0.003, 3), mat: mat(0xf28a1c), lift: 0.0015 },   // --nacho
    curl: { geo: new THREE.TorusGeometry(0.011, 0.0055, 6, 12, Math.PI * 1.6).rotateX(-Math.PI / 2), mat: mat(0xffa51f), lift: 0.0055 }, // --curlz
    crumb: { geo: new THREE.BoxGeometry(0.006, 0.003, 0.005), mat: mat(0xffcc00), lift: 0.0015 },           // --cheese
  };
  const dummy = new THREE.Object3D();

  // Lay `counts` ({nacho, curl, crumb}) over a rectangle at height y, skipping any circle in `avoid` ([x, z, r]).
  // Most pieces lie flat; the odd chip leans on its neighbour.
  const pizzaAvoid = out.pizzaBoxes.map((b) => [b.group.position.x, b.group.position.z, 0.31]); // nothing is spilled under a pizza box
  const spill = (parent, rect, y, counts, avoid = []) => {
    if (parent === scene) avoid = [...avoid, ...pizzaAvoid];
    const [x0, x1, z0, z1] = rect;
    for (const [kind, n] of Object.entries(counts)) {
      if (!n) continue;
      const K = KINDS[kind];
      const mesh = new THREE.InstancedMesh(K.geo, K.mat, n);
      mesh.frustumCulled = false;
      let placed = 0;
      for (let tries = 0; placed < n && tries < n * 40; tries++) {
        const x = x0 + rnd() * (x1 - x0), z = z0 + rnd() * (z1 - z0);
        if (avoid.some(([ax, az, r]) => (x - ax) ** 2 + (z - az) ** 2 < r * r)) continue;
        const lean = kind !== 'crumb' && rnd() < 0.18;
        dummy.position.set(x, y + K.lift + (lean ? 0.004 : 0), z);
        dummy.rotation.set(lean ? (rnd() - 0.5) * 0.7 : 0, rnd() * Math.PI * 2, lean ? (rnd() - 0.5) * 0.7 : 0);
        dummy.updateMatrix();
        mesh.setMatrixAt(placed++, dummy.matrix);
      }
      mesh.count = placed;
      parent.add(mesh);
    }
  };

  // ---- each desk, in the station's own space: left of the keyboard, on the keyboard, on the mousepad, under the chair
  out.stations.forEach((st, i) => {
    const g = st.group;
    spill(g, [-0.64, -0.3, 0.2, 0.37], TABLE_Y, { nacho: 2 + (i % 2), curl: 1 + (i % 3 === 0 ? 1 : 0), crumb: 6 }, [[-0.36, 0.12, 0.06]]);
    spill(g, [-0.2, 0.18, 0.17, 0.31], TABLE_Y + 0.026, { crumb: 4 + (i % 3) });                    // between the keys
    spill(g, [0.2, 0.46, 0.17, 0.33], TABLE_Y + 0.004, { nacho: i % 2 ? 0 : 1, curl: i % 2, crumb: 4 }, [[0.33, 0.26, 0.05]]);
    spill(g, [-0.5, 0.5, 0.5, 1.3], 0.003, { nacho: 3, curl: 2, crumb: 9 });                          // the carpet round the chair
    spill(st.chair, [-0.1, 0.1, -0.1, 0.1], 0.468, { nacho: i % 2, crumb: 3 });                        // sat on
  });

  // ---- the snack table: everything is open and nobody has used a bowl
  spill(scene, [-5.78, -5.12, -1.78, 1.78], TABLE_Y, { nacho: 16, curl: 9, crumb: 42 }, [
    [-5.56, -0.75, 0.22],                                                  // the Volt Cola crate
    [-5.5, -0.2, 0.13], [-5.5, 0.04, 0.13], [-5.5, 0.28, 0.13],            // Nachoz bags
    [-5.5, 0.55, 0.13], [-5.5, 0.79, 0.13],                                // Cheez Curlz bags
    [-5.62, 0.98, 0.08], [-5.62, 1.22, 0.08], [-5.62, 1.46, 0.08],         // Citrus Zap two-litres
    [-5.28, 1.05, 0.07], [-5.2, 1.32, 0.07], [-5.38, 1.6, 0.07], [-5.15, 1.68, 0.07], [-5.3, 1.78, 0.07], // cups
    [-5.4, -0.46, 0.08], [-5.3, -1.02, 0.1], [-5.25, 0.04, 0.07], [-5.28, 0.2, 0.07], // spindle, case, disks
  ]);
  spill(scene, [-5.0, -4.2, -1.8, 1.8], 0.003, { nacho: 6, curl: 4, crumb: 16 });                       // trodden into the carpet in front

  // ---- the lounge: the coffee table (round the bowl and the open bag) and the carpet by the couch
  spill(scene, [3.88, 4.42, -1.6, -0.4], COFFEE.top, { nacho: 5, curl: 5, crumb: 14 }, [
    [3.99, -0.55, 0.12], [4.34, -0.5, 0.12], [4.3, -0.95, 0.12], [3.97, -1.46, 0.09], [4.22, -1.52, 0.1],
    [4.3, -0.72, 0.07], [3.9, -0.7, 0.07],
  ]);
  spill(scene, [3.2, 5.0, -2.0, 0.8], 0.003, { nacho: 6, curl: 4, crumb: 18 });
  spill(scene, [3.4, 3.85, -0.5, -0.1], 0.003, { nacho: 2, crumb: 8 });                                // round the crushed bag
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
  const hemi = new THREE.HemisphereLight(0xfff1d6, 0x3a2a1e, 1.5);
  scene.add(hemi);
  out.ceiling = { hemi, tubes: [] };   // the light switch (js/power.js) dims these
  for (const x of [-2.8, 2.8]) {
    const fixture = box(1.3, 0.04, 0.3, new THREE.MeshBasicMaterial({ color: 0xe9f3ff }), x, height - 0.02, 0);
    scene.add(fixture);
    const light = new THREE.PointLight(0xdfeaff, 22, 12, 1.4);
    light.position.set(x, height - 0.3, 0);
    scene.add(light);
    out.ceiling.tubes.push({ fixture, light });
  }

  // stations
  const labelVolt = T.voltLabel(), labelNachoz = T.nachozBag(), labelCurlz = T.curlzBag();
  const table = (z) => {
    const t = foldingTable(5);   // five 6 ft tables end to end
    t.position.set(0, 0, z);
    scene.add(t);
    const half = (5 * TABLE_LEN) / 2;
    out.colliders.push({ minX: -half, maxX: half, minZ: z - TABLE_DEPTH / 2, maxZ: z + TABLE_DEPTH / 2 });
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

    const { mon, tw, tagTex, chair, phones } = pcSetup(g, screen, `PC-0${i + 1}`, (i * 0.37) % 0.5 - 0.25, i === BURNER.pc, s.audio); // nobody pushes their chair in straight
    out.hddLeds.push(tw.hdd);

    // every station gets a can, every other one a bag of Nachoz
    const can = voltCan(labelVolt);
    can.position.set(-0.36, TABLE_Y, 0.12);
    g.add(can);

    const station = {
      ...s, index: i, name: `PC-0${i + 1}`, group: g, screen, monitor: mon, seatTarget: new THREE.Object3D(),
      tower: tw, cableStart: new THREE.Vector3(), chair, deskPhones: phones, // deskPhones: on the tower while nobody is wearing them
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
    if (i % 2 === 1 || i % 4 === 0) {
      const bag = chipBag(i % 2 === 1 ? labelNachoz : labelCurlz);   // Nachoz on the odd desks, Cheez Curlz on PC-01 and PC-05
      bag.position.set(-0.6, TABLE_Y, 0.02);
      bag.rotation.y = 0.5;
      g.add(bag);
      bag.traverse((o) => { o.userData.interact = { kind: 'eat' }; });
      out.interactables.push(bag);
    }
    out.stations.push(station);
  });

  // snack table along the left wall
  const snacks = foldingTable(2);   // two 6 ft tables end to end
  snacks.rotation.y = Math.PI / 2;
  snacks.position.set(-5.45, 0, 0);
  scene.add(snacks);
  out.colliders.push({ minX: -5.45 - TABLE_DEPTH / 2, maxX: -5.45 + TABLE_DEPTH / 2, minZ: -TABLE_LEN, maxZ: TABLE_LEN });

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

  for (let k = 0; k < 2; k++) {   // Cheez Curlz share the snack table
    const bag = chipBag(labelCurlz);
    bag.position.set(-5.5, TABLE_Y, 0.55 + k * 0.24);
    bag.rotation.y = Math.PI / 2 + (k - 0.5) * 0.3;
    bag.traverse((o) => { o.userData.interact = { kind: 'eat' }; });
    scene.add(bag);
    out.interactables.push(bag);
  }
  // Citrus Zap two-litres and red party cups: the far end of the snack table, and the lounge
  const labelZap = T.zapLabel();
  const pourable = (obj, x, y, z, yaw = 0, tipX = 0, tipZ = 0) => {
    obj.position.set(x, y, z); obj.rotation.set(tipX, yaw, tipZ);
    obj.traverse((o) => { o.userData.interact = { kind: 'soda' }; });
    scene.add(obj); out.interactables.push(obj); return obj;
  };
  pourable(twoLitre(labelZap, 1), -5.62, TABLE_Y, 0.98);
  pourable(twoLitre(labelZap, 0.9), -5.62, TABLE_Y, 1.22, 0.8);
  pourable(twoLitre(labelZap, 0.35), -5.62, TABLE_Y, 1.46, 2.1);
  pourable(cupSleeve(12), -5.28, TABLE_Y, 1.05, 0);
  pourable(redCup(0.7), -5.2, TABLE_Y, 1.32, 0);
  pourable(redCup(0), -5.38, TABLE_Y, 1.6, 0);
  pourable(redCup(0.3), -5.15, TABLE_Y, 1.68, 0);
  pourable(redCup(0), -5.3, TABLE_Y + CUP.rTop, 1.78, 0, 0, Math.PI / 2);   // knocked over at the end of the table
  // the lounge, on the carpet between the coffee table and the TV: an open two-litre and a few cups
  pourable(twoLitre(labelZap, 0.6), 4.82, 0, -1.0, 0.4);
  pourable(redCup(0.5), 4.7, 0, -0.85, 0);
  pourable(redCup(0), 3.55, 0, -0.55, 0);
  pourable(redCup(0), 4.95, CUP.rTop, -0.3, 0.5, 0, Math.PI / 2);           // on its side
  pourable(redCup(0), 3.4, 0, -1.9, 0);

  buildNetwork(scene, out);
  buildErrands(scene, out);
  buildFan(scene, out);
  buildDoor(scene, out, wallMat.map);
  buildLounge(scene, out, labelVolt, labelNachoz, labelCurlz);
  buildGamers(scene, out, labelVolt);
  buildPizza(scene, out);
  buildCeilingGamer(scene, out);
  buildMedia(scene, out);
  buildGameShelf(scene);
  buildLooseBoxes(scene, out);
  buildChips(scene, out);
  buildPower(scene, out, { tableY: TABLE_Y });
  buildBenches(scene, out, { chair: foldingChair });

  // posters and the scoreboard
  const posterMat = (t) => new THREE.MeshStandardMaterial({ map: t, roughness: 0.9 });
  const p1 = new THREE.Mesh(new THREE.PlaneGeometry(0.7, 0.98), posterMat(T.poster('LAN OR\nDIE', 'BYOC · 6 PCs · 1 HUB\nSAT 14 NOV 1998', 350)));
  p1.position.set(maxX - 0.01, 1.6, -1.2); p1.rotation.y = -Math.PI / 2; scene.add(p1);
  const p2 = new THREE.Mesh(new THREE.PlaneGeometry(0.7, 0.98), posterMat(T.poster('FRAG\nFEST', 'NO CAMPING\nNO UNPLUGGING THE HUB', 200)));
  p2.position.set(maxX - 0.01, 1.6, 1.2); p2.rotation.y = -Math.PI / 2; scene.add(p2);
  const p3 = new THREE.Mesh(new THREE.PlaneGeometry(0.7, 0.98), posterMat(T.poster('VOLT\nCOLA', 'NOW WITH\nEVEN MORE VOLTS', 5)));
  p3.position.set(minX + 0.01, 1.7, -2.2); p3.rotation.y = Math.PI / 2; scene.add(p3);
  // 90s nostalgia. Games are named in text only, never with their art or characters.
  const nostalgia = [
    [-4.6, minZ + 0.01, 0, T.poster('DUKE\nNUKEM 3D', 'SHOOTERS FIRST\nFRAG LIMIT 20', 40)],
    [-1.4, minZ + 0.01, 0, T.poster('Y2K', '13 MONTHS TO GO\nIS YOUR BIOS READY?', 120)],
    [1.4, minZ + 0.01, 0, T.poster('56K', "DON'T PICK UP\nTHE PHONE", 280)],
    [-1.4, maxZ - 0.01, Math.PI, T.pixelAdventure()],
    // gig posters for invented bands (see textures.js bandPoster)
    [-4.4, maxZ - 0.01, Math.PI, T.bandPoster('grunge')],
    [1.4, maxZ - 0.01, Math.PI, T.bandPoster('industrial')],
    [4.2, maxZ - 0.01, Math.PI, T.bandPoster('hairmetal')],
    [minX + 0.01, 2.8, Math.PI / 2, T.bandPoster('dance')],
    // invented game boxes and film one-sheets in the style of the era (see textures.js gamePoster, moviePoster)
    [-2.9, maxZ - 0.01, Math.PI, T.gamePoster('corridor')],
    [0, maxZ - 0.01, Math.PI, T.gamePoster('hero')],
    [2.8, maxZ - 0.01, Math.PI, T.gamePoster('space')],
    [minX + 0.01, -0.9, Math.PI / 2, T.moviePoster('asteroid')],
    [minX + 0.01, 0.4, Math.PI / 2, T.moviePoster('machine')],
    [minX + 0.01, 1.6, Math.PI / 2, T.moviePoster('kids')],
  ];
  for (const [x, z, ry, tex] of nostalgia) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(0.7, 0.98), posterMat(tex));
    m.position.set(x, 1.75, z); m.rotation.y = ry; scene.add(m);
  }

  return out;
}
