// The parts of the PC you built, as three.js groups: the CRT (scaled to the tube you chose), the tower with the drives you
// fitted, the keyboard, mouse, mat and sound. js/bench.js puts them on the table. Positions come from js/bench-plan.js
// (layoutFor), so what you see is what the plan checked for overlaps. Every group's origin is the station's own space
// with y = 0 at the floor, so a part is added to the bench group and left where it is.
//
// Colours are tokens (css/tokens.css): --beige, --paper, --disk-case (black plastic), --w98-shadow, --crt-led, --floppy-*,
// --cable-ps2, --zap-lime, --mat-cloth, --poster-ember.
import * as THREE from 'three';
import * as T from './textures.js';
import { headphones } from './headphones.js';
import { specOf } from './build.js';
import { layoutFor } from './bench-plan.js';

export const TABLE_Y = 0.74;

const mat = (hex, o = {}) => new THREE.MeshStandardMaterial({ color: hex, roughness: 0.7, ...o });
const M = {
  beige: mat(0xd9cfb3), beigeDark: mat(0xbfb497, { roughness: 0.75 }), black: mat(0x151515, { roughness: 0.5 }),
  steel: mat(0x6b6b6b, { metalness: 0.6, roughness: 0.4 }), case: mat(0x26262b, { roughness: 0.55 }),
  cloth: mat(0x1c3b6e, { roughness: 0.95 }), hard: mat(0x26262b, { roughness: 0.4 }), large: mat(0x7a1a12, { roughness: 0.95 }),
  ps2: mat(0x7a3f98), vga: mat(0x2b6fd6), mouse: mat(0x3aa35a), lime: mat(0xb5d334),
};
export const CABLE_COLOURS = { vga: 0x2b6fd6, kb: 0x7a3f98, mouse: 0x3aa35a, audio: 0xb5d334 };

function box(w, h, d, m, x = 0, y = 0, z = 0) {
  const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);
  b.position.set(x, y, z);
  return b;
}

/* ---------------------------------------------------------------- the monitor */

// The 17-inch the club PCs have, grown or shrunk to the tube you picked. The back of the case always ends at the same
// place on the table, so a bigger tube grows toward you (layoutFor puts the group at z = -0.46 + 0.34k).
export function monitor(build, screenTexture, nameTagTex) {
  const lay = layoutFor(build);
  const k = lay.k;
  const crt = specOf(build).crt;
  const g = new THREE.Group();
  const inner = new THREE.Group();   // scaled by k
  inner.add(box(0.26, 0.03, 0.24, M.beigeDark, 0, 0.015, -0.02));
  inner.add(box(0.42, 0.37, 0.3, M.beige, 0, 0.215, 0));
  inner.add(box(0.32, 0.29, 0.2, M.beige, 0, 0.215, -0.24));
  inner.add(box(0.36, 0.28, 0.01, M.black, 0, 0.225, 0.151));
  const screen = new THREE.Mesh(new THREE.PlaneGeometry(0.32, 0.24), new THREE.MeshBasicMaterial({ map: screenTexture, toneMapped: false }));
  screen.position.set(0, 0.225, 0.157);
  inner.add(screen);
  const led = box(0.012, 0.012, 0.005, new THREE.MeshBasicMaterial({ color: 0x3cff5a }), 0.17, 0.055, 0.152);
  inner.add(led);
  if (nameTagTex) {
    const tag = new THREE.Mesh(new THREE.PlaneGeometry(0.16, 0.04), new THREE.MeshBasicMaterial({ map: nameTagTex }));
    tag.position.set(0, 0.39, 0.152);
    inner.add(tag);
  }
  // the 19-inch is flat-faced and sharper: a thin bevel instead of a fat bezel
  if (crt.inches >= 19) inner.add(box(0.37, 0.29, 0.004, M.case, 0, 0.225, 0.153));
  inner.scale.setScalar(k);
  g.add(inner);
  g.position.set(lay.monitor.x, TABLE_Y, lay.monitor.z);
  return { group: g, inner, screen, led, k };
}

/* ---------------------------------------------------------------- the tower */

// A mid-tower: 5.25" bays at the top (CD-R, CD-ROM), 3.5" bays under them (floppies), a badge, and the two lights.
export function tower(build) {
  const s = specOf(build);
  const g = new THREE.Group();
  g.add(box(0.19, 0.44, 0.44, M.beige, 0, 0.22, 0));
  const bays = [];
  if (s.cdr) bays.push(['cdr', `CD-R ${s.cdr.x}x`]);
  if (s.cdrom) bays.push(['cdrom', `CD-ROM ${s.cdrom.x}x`]);
  let top = 0.405;
  let driveMesh = null;
  for (let i = 0; i < 2; i++) {
    const y = top - i * 0.05;
    if (bays[i]) {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(0.15, 0.04), new THREE.MeshStandardMaterial({ map: T.cdDrive(bays[i][1]), roughness: 0.7 }));
      m.position.set(0, y, 0.2227);
      g.add(m);
      if (bays[i][0] === 'cdr') driveMesh = m;
    } else g.add(box(0.15, 0.04, 0.01, M.beigeDark, 0, y, 0.222));   // a blanking plate
  }
  for (let f = 0; f < 2; f++) {
    const y = 0.27 - f * 0.035;
    if (f < s.floppies) {
      g.add(box(0.1, 0.028, 0.01, M.beigeDark, 0, y, 0.222));
      g.add(box(0.06, 0.004, 0.004, M.black, 0, y + 0.004, 0.2275));    // the slot
    } else g.add(box(0.1, 0.028, 0.01, M.beige, 0, y, 0.222));
  }
  const badge = new THREE.Mesh(new THREE.PlaneGeometry(0.1, 0.025), new THREE.MeshBasicMaterial({ map: T.caseBadge(s.cpu.name.replace('Pentium ', 'P').replace('MMX ', 'MMX '), `${s.ram}MB`) }));
  badge.position.set(0, 0.17, 0.2227);
  g.add(badge);
  const power = box(0.015, 0.008, 0.004, new THREE.MeshBasicMaterial({ color: 0x33ff55 }), -0.04, 0.12, 0.223);
  const hdd = box(0.015, 0.008, 0.004, new THREE.MeshBasicMaterial({ color: 0x400000 }), 0.04, 0.12, 0.223);
  g.add(power, hdd);
  g.add(box(0.03, 0.02, 0.008, M.beigeDark, 0, 0.12, 0.222));            // the power button
  // the back: a fan grille and the card sockets, so the cables have something to go into
  g.add(box(0.1, 0.1, 0.004, M.steel, -0.03, 0.34, -0.222));
  g.position.set(0.52, TABLE_Y, -0.1);
  return { group: g, hdd, power, drive: driveMesh };
}

/* ---------------------------------------------------------------- keyboard, mouse, mat */

export function keyboard(build) {
  const s = specOf(build);
  const lay = layoutFor(build).keyboard;
  const g = new THREE.Group();
  const top = new THREE.MeshStandardMaterial({ map: T.keyboardTop(), roughness: 0.7 });
  const mats = [M.beige, M.beige, top, M.beige, M.beige, M.beige];
  if (s.keyboard.id === 'kbSplit') {
    for (const sx of [-1, 1]) {   // two halves, toed out
      const half = new THREE.Mesh(new THREE.BoxGeometry(0.23, 0.028, 0.17), mats);
      half.position.set(sx * 0.125, 0, 0);
      half.rotation.set(0.07, -sx * 0.18, sx * -0.04);
      g.add(half);
    }
    g.add(box(0.05, 0.02, 0.1, M.beigeDark, 0, -0.002, 0.0));
  } else {
    const kb = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.025, 0.17), mats);
    kb.rotation.x = 0.05;
    g.add(kb);
  }
  g.position.set(lay.x, TABLE_Y + 0.013, lay.z);
  return g;
}

export function mouse(build) {
  const s = specOf(build);
  const lay = layoutFor(build).mouse;
  const g = new THREE.Group();
  g.add(box(0.06, 0.03, 0.1, M.beige, 0, 0, 0));
  g.add(box(0.058, 0.004, 0.003, M.beigeDark, 0, 0.0155, -0.012));          // the gap between the buttons
  if (s.mouse.id === 'msWheel') g.add(box(0.008, 0.006, 0.014, M.black, 0, 0.017, -0.02));
  g.position.set(lay.x, TABLE_Y + 0.015 + (s.mat.id === 'matNone' ? 0 : 0.003), lay.z);
  return g;
}

export function mouseMat(build) {
  const lay = layoutFor(build).mat;
  if (!lay) return null;
  const s = specOf(build);
  const m = { matCloth: M.cloth, matHard: M.hard, matLarge: M.large }[s.mat.id];
  const g = box(lay.w, 0.004, lay.d, m, lay.x, TABLE_Y + 0.002, lay.z);
  return g;
}

/* ---------------------------------------------------------------- sound */

function speakerPair(lay, withLed) {
  const g = new THREE.Group();
  const led = new THREE.MeshBasicMaterial({ color: 0x3cff5a });
  for (const sx of [-1, 1]) {
    const sp = new THREE.Group();
    sp.position.set(sx * lay.x, 0, lay.z);
    sp.add(box(0.1, 0.2, 0.11, M.beigeDark, 0, 0.1, 0));
    const cone = (r, y) => {
      const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, 0.008, 18).rotateX(Math.PI / 2), M.black);
      m.position.set(0, y, 0.056);
      return m;
    };
    sp.add(cone(0.036, 0.075), cone(0.015, 0.16));
    if (withLed) sp.add(box(0.008, 0.008, 0.004, led, 0, 0.025, 0.056));
    g.add(sp);
  }
  g.position.y = TABLE_Y;
  return g;
}

// Speakers either side of the tube, or headphones resting on top of the tower
export function audio(build) {
  const s = specOf(build);
  const lay = layoutFor(build);
  if (s.speakers) return speakerPair(lay.speakers, true);
  const phones = headphones();
  phones.scale.setScalar(0.95);
  phones.position.set(lay.tower.x, TABLE_Y + 0.44 + 0.042 * 0.95 + 0.002, lay.tower.z);
  phones.rotation.y = Math.PI / 2 + 0.2;
  return phones;
}

/* ---------------------------------------------------------------- all of it */

// The six pieces of a build. `foot` is the box each takes on the table (for the ghost outline), `part` the group.
export function makeParts(build, screenTexture, nameTagTex) {
  const lay = layoutFor(build);
  const mon = monitor(build, screenTexture, nameTagTex);
  const tw = tower(build);
  const parts = { monitor: mon.group, tower: tw.group, keyboard: keyboard(build), mouse: mouse(build), audio: audio(build) };
  const mm = mouseMat(build);
  if (mm) parts.mat = mm;
  return { parts, mon, tw, lay };
}

// A translucent outline of a part's box, where the part is going to stand: shown until you unpack it.
const ghostFill = new THREE.MeshBasicMaterial({ color: 0xb5d334, transparent: true, opacity: 0.16, depthWrite: false });   // --zap-lime
const ghostLine = new THREE.LineBasicMaterial({ color: 0xb5d334, transparent: true, opacity: 0.9 });
export function ghostOf(part) {
  part.updateWorldMatrix(true, true);
  const inv = new THREE.Matrix4().copy(part.parent ? part.parent.matrixWorld : new THREE.Matrix4()).invert();
  const world = new THREE.Box3().setFromObject(part);
  const b = new THREE.Box3(world.min.clone().applyMatrix4(inv), world.max.clone().applyMatrix4(inv));
  const size = b.getSize(new THREE.Vector3());
  const mid = b.getCenter(new THREE.Vector3());
  const geo = new THREE.BoxGeometry(size.x, size.y, size.z);
  const ghost = new THREE.Mesh(geo, ghostFill);
  ghost.add(new THREE.LineSegments(new THREE.EdgesGeometry(geo), ghostLine));
  ghost.position.copy(mid);
  return ghost;
}
