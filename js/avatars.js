// Other people in the basement: LAN-party regulars dressed as 90s teens (goths, surfers,
// hip hop kids, ravers, grunge kids and nerds), each with their own height, hair and face
// (eyes that blink, brows, nose, lips, ears), rounded limbs and hands,
// with their handle floating overhead. They glide toward the latest position the
// server sent and drop into the chair when they sit at a PC. The regulars don't walk:
// they sit at their own PCs or on the couch, playing.
import * as THREE from 'three';
import { headphones } from './headphones.js';

// colours are tokens from css/tokens.css (--skin-N, --hair-*, --eye-white, --iris-*, --lip, --clothes-*, --neon-*, --denim, --shoe, --shirt-N)
const mats = new Map();
const mat = (hex, opts = {}) => {
  const key = hex + JSON.stringify(opts);
  if (!mats.has(key)) mats.set(key, opts.basic ? new THREE.MeshBasicMaterial({ color: hex, ...opts.mat }) : new THREE.MeshStandardMaterial({ color: hex, roughness: 0.85, ...opts.mat }));
  return mats.get(key);
};
const C = {
  skin: [0xe0b48f, 0xc68a5e, 0x8d5a3b, 0xf0d9c8, 0x5a3825], // --skin, --skin-2..5
  hair: { brown: 0x3b2716, black: 0x121212, blond: 0xe3c45a, red: 0xa8431f },
  black: 0x141414, khaki: 0xb5a47a, denim: 0x2c3e66, denimLight: 0x5b7db5, white: 0xececec,
  shoe: 0x1a1a1a, amber: 0xffcc00, dark: 0x0a0a0a,
  eyeWhite: 0xf4efe6, iris: [0x4a2e1a, 0x3c6ea8, 0x4e7a52], lip: 0xa8493f, // --eye-white, --iris-brown/blue/green, --lip
  neon: [0x39ff14, 0xff2d95, 0x19d3ff],
  shirts: [0xe2231a, 0x2b6fd6, 0xe8c21b, 0x3aa35a, 0x9b4dca, 0xf28a1c, 0x20b2aa, 0xd94f8a], // --shirt-1..8
};

// colour helpers: everything is derived from the token colours (skin, hair…), never invented
const shade = (hex, k) => new THREE.Color(hex).multiplyScalar(k).getHex();
const blend = (a, b, t) => new THREE.Color(a).lerp(new THREE.Color(b), t).getHex();
const lerp = (a, b, t) => a + (b - a) * t;

// Every static piece of a person is a small rounded primitive. Pieces that share a parent and a
// material are welded into one mesh, so a whole person costs a handful of draw calls.
const _m4 = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _v = new THREE.Vector3(), _s = new THREE.Vector3();
function weld(geoms) {
  let nv = 0, ni = 0;
  for (const g of geoms) { nv += g.attributes.position.count; ni += g.index.count; }
  const pos = new Float32Array(nv * 3), nor = new Float32Array(nv * 3), idx = new Uint32Array(ni);
  let vo = 0, io = 0;
  for (const g of geoms) {
    pos.set(g.attributes.position.array, vo * 3); nor.set(g.attributes.normal.array, vo * 3);
    for (let i = 0; i < g.index.count; i++) idx[io + i] = g.index.array[i] + vo;
    vo += g.attributes.position.count; io += g.index.count; g.dispose();
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  out.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
  out.setIndex(new THREE.BufferAttribute(idx, 1));
  return out;
}
class Parts {
  constructor() { this.buckets = new Map(); }
  put(group, geom, m, pos, scl = [1, 1, 1], rot = [0, 0, 0]) {
    _m4.compose(_v.set(pos[0], pos[1], pos[2]), _q.setFromEuler(_e.set(rot[0], rot[1], rot[2])), _s.set(scl[0], scl[1], scl[2]));
    geom.applyMatrix4(_m4);
    if (!this.buckets.has(group)) this.buckets.set(group, new Map());
    const b = this.buckets.get(group);
    if (!b.has(m)) b.set(m, []);
    b.get(m).push(geom);
  }
  // ellipsoid with radii r = [rx, ry, rz]
  ell(group, m, pos, r, rot, seg = 10) { this.put(group, new THREE.SphereGeometry(1, seg, Math.max(6, Math.round(seg * 0.7))), m, pos, r, rot); }
  // part of an ellipsoid: phi sweeps round the head (front is 1.5pi), theta runs from the crown (0) down
  cap(group, m, pos, r, theta, phiStart = 0, phiLen = Math.PI * 2, seg = 16) {
    this.put(group, new THREE.SphereGeometry(1, seg, 10, phiStart, phiLen, 0, theta), m, pos, r);
  }
  // tapered round limb or body: radius rt at the top, rb at the bottom, optional z squash
  cyl(group, m, pos, rt, rb, h, { seg = 10, sz = 1, rot, open = false } = {}) {
    this.put(group, new THREE.CylinderGeometry(rt, rb, h, seg, 1, open), m, pos, [1, 1, sz], rot);
  }
  cone(group, m, pos, r, h, rot, seg = 5) { this.put(group, new THREE.ConeGeometry(r, h, seg), m, pos, [1, 1, 1], rot); }
  torus(group, m, pos, r, tube, rot, scl, seg = 16) { this.put(group, new THREE.TorusGeometry(r, tube, 6, seg), m, pos, scl, rot); }
  box(group, m, pos, size, rot) { this.put(group, new THREE.BoxGeometry(size[0], size[1], size[2]), m, pos, [1, 1, 1], rot); }
  finish() {
    for (const [group, b] of this.buckets) for (const [m, geoms] of b) group.add(new THREE.Mesh(weld(geoms), m));
    this.buckets.clear();
  }
}

// a unit sphere mesh for the pieces that move (eyelids, mouth)
function blob(m, pos, r) {
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(1, 10, 7), m);
  mesh.position.set(pos[0], pos[1], pos[2]); mesh.scale.set(r[0], r[1], r[2]);
  return mesh;
}

// ---- who someone is: a look is picked from their id, so everybody looks the same to everybody ----
function hashRng(str) {
  let h = 2166136261;
  for (const ch of String(str)) h = Math.imul(h ^ ch.charCodeAt(0), 16777619) >>> 0;
  return () => ((h = (Math.imul(h, 1664525) + 1013904223) >>> 0) / 4294967296);
}

export const ARCHETYPES = ['goth', 'surfer', 'hiphop', 'raver', 'grunge', 'nerd'];

// Deterministic look for a seed. `force` pins the archetype (the NPCs); `shirt` is the player's colour.
export function lookFor(seed, { force, shirt } = {}) {
  const r = hashRng(seed);
  const pick = (a) => a[Math.floor(r() * a.length)];
  const chance = (p) => r() < p;
  const arch = force ?? pick(ARCHETYPES);
  const shirtHex = shirt ? parseInt(String(shirt).replace('#', ''), 16) : pick(C.shirts);
  const L = {
    arch, height: 0.9 + r() * 0.22, build: 0.9 + r() * 0.22,
    skin: pick(C.skin), hair: { style: 'short', color: C.hair.brown }, facial: 'none', glasses: 'none', hat: null,
    top: { color: shirtHex, sleeves: 0.5, length: 0.56, width: 1 }, coat: false,
    legs: { color: C.denim, width: 1, short: false }, shoes: { kind: 'sneaker', color: C.white },
    chain: false, beads: false, glow: false, backpack: false, wallet: false,
  };
  L.face = faceFor(seed, arch, L); // set again below once the archetype has picked a skin tone
  if (arch === 'goth') {
    L.skin = pick([C.skin[3], C.skin[3], C.skin[0], C.skin[4]]);
    L.hair = { style: pick(['long', 'curtains', 'spiky', 'mohawk']), color: pick([C.hair.black, C.hair.black, C.hair.red]) };
    L.top.color = C.black; L.top.sleeves = 0.5;
    L.coat = chance(0.8);
    L.legs = { color: C.black, width: 1.05, short: false };
    L.shoes = { kind: 'boot', color: C.shoe };
    L.facial = pick(['none', 'none', 'goatee', 'goatee', 'moustache']);
    L.chain = chance(0.7); L.wallet = chance(0.6);
    if (chance(0.3)) L.glasses = 'shades';
  } else if (arch === 'surfer') {
    L.skin = pick([C.skin[1], C.skin[1], C.skin[0]]);
    L.hair = { style: pick(['shaggy', 'shaggy', 'long']), color: pick([C.hair.blond, C.hair.blond, C.hair.brown]) };
    L.top.sleeves = chance(0.5) ? 0.2 : 0;                       // tee or singlet
    L.legs = { color: pick([C.shirts[6], C.shirts[1], C.shirts[5], C.khaki]), width: 1.15, short: true };
    L.shoes = { kind: pick(['sandal', 'bare']), color: C.shoe };
    L.beads = chance(0.7);
    L.facial = pick(['none', 'stubble', 'stubble', 'soulpatch']);
    if (chance(0.4)) L.glasses = 'shades';
  } else if (arch === 'hiphop') {
    L.skin = pick([C.skin[2], C.skin[4], C.skin[1], C.skin[2]]);
    L.hair = { style: 'buzz', color: C.hair.black };
    L.hat = chance(0.7) ? { kind: 'cap', color: pick([C.black, C.shirts[0], C.shirts[1], C.white]) } : null;
    L.top = { color: shirtHex, sleeves: 0.28, length: 0.78, width: 1.35 };   // oversized jersey
    L.legs = { color: pick([C.denim, C.denimLight, C.black]), width: 1.55, short: false };
    L.shoes = { kind: 'sneaker', color: C.white };
    L.chain = true;
    L.facial = pick(['none', 'goatee', 'moustache', 'stubble']);
    if (chance(0.35)) L.glasses = 'shades';
  } else if (arch === 'raver') {
    L.skin = pick(C.skin);
    L.hair = chance(0.55) ? { style: 'spiky', color: pick(C.neon) } : { style: 'short', color: C.hair.blond };
    L.hat = chance(0.4) ? { kind: 'bucket', color: pick(C.neon) } : null;
    L.top = { color: pick([...C.neon, C.white]), sleeves: 0.22, length: 0.56, width: 1.05 };
    L.legs = { color: pick([C.black, C.shirts[4], C.neon[1]]), width: 1.9, short: false };  // phat pants
    L.shoes = { kind: 'chunky', color: C.white };
    L.glow = true; L.beads = true; L.backpack = chance(0.5);
    if (chance(0.4)) L.glasses = 'shades';
    L.facial = chance(0.2) ? 'soulpatch' : 'none';
  } else if (arch === 'grunge') {
    L.hair = { style: pick(['long', 'shaggy', 'curtains']), color: pick([C.hair.brown, C.hair.black, C.hair.red]) };
    L.hat = chance(0.4) ? { kind: 'beanie', color: pick([C.black, C.shirts[3], C.shirts[0]]) } : null;
    L.top = { color: pick([C.shirts[0], C.shirts[3], C.shirts[1]]), sleeves: 0.5, length: 0.6, width: 1.1 }; // flannel
    L.legs = { color: pick([C.denim, C.denimLight]), width: 1.2, short: false };
    L.shoes = { kind: 'boot', color: C.shoe };
    L.facial = pick(['stubble', 'beard', 'goatee', 'none']);
    L.wallet = chance(0.5);
  } else { // nerd
    L.hair = { style: pick(['short', 'curtains', 'bald']), color: pick([C.hair.brown, C.hair.black]) };
    L.top = { color: pick([C.white, shirtHex, C.denimLight]), sleeves: 0.2, length: 0.56, width: 1 };
    L.legs = { color: pick([C.khaki, C.denim]), width: 1, short: false };
    L.shoes = { kind: 'sneaker', color: C.white };
    L.glasses = pick(['round', 'round', 'round', 'none']);
    L.backpack = chance(0.5);
    L.facial = chance(0.2) ? 'stubble' : 'none';
  }
  L.face = faceFor(seed, arch, L);
  L.headphones = hashRng(`${seed}~cans`)() < CANS[arch]; // its own stream too, so nobody's clothes or hair change
  return L;
}

// How many of each crowd wear headphones: the ones who'd rather not hear the room.
const CANS = { nerd: 0.45, raver: 0.4, goth: 0.35, grunge: 0.3, hiphop: 0.25, surfer: 0.15 };

// The face is rolled from its own stream so adding features never reshuffles anybody's clothes or hair.
function faceFor(seed, arch, L) {
  const r = hashRng(`${seed}~face`);
  const pick = (a) => a[Math.floor(r() * a.length)];
  const dark = L.skin === C.skin[2] || L.skin === C.skin[4];
  const iris = dark ? pick([C.iris[0], C.iris[0], C.iris[0], C.iris[2]]) : pick([C.iris[0], C.iris[0], C.iris[1], C.iris[1], C.iris[2]]);
  return {
    iris,
    jaw: 0.94 + r() * 0.14,      // face width
    nose: 0.85 + r() * 0.35,     // nose size
    lip: 0.8 + r() * 0.5,        // lip fullness
    brow: 0.8 + r() * 0.5,       // brow thickness
    ears: 0.9 + r() * 0.25,
    freckles: arch === 'surfer' ? r() < 0.7 : r() < 0.12,
    stud: ['goth', 'raver', 'hiphop'].includes(arch) && r() < 0.6,
    lipstick: arch === 'goth' && r() < 0.6,
    liner: arch === 'goth' || (arch === 'raver' && r() < 0.3),
    mood: { goth: 'stern', surfer: 'smile', hiphop: 'smirk', raver: 'smile', grunge: 'flat', nerd: 'smile' }[arch],
  };
}

// How far forward the front of the cranium is at a point on the face (so freckles and blush sit on the skin).
const frontZ = (x, dy) => -0.115 * Math.sqrt(Math.max(0.05, 1 - (x / 0.106) ** 2 - (dy / 0.122) ** 2));

// Builds a rounded body from a look. Returns the pieces the Avatar animates.
function buildBody(look) {
  const body = new THREE.Group();
  body.scale.set(look.build, look.height, look.build);
  const P = new Parts();
  const F = look.face;
  const skin = mat(look.skin);
  const skinDeep = mat(shade(look.skin, 0.86));
  const topM = mat(look.top.color);
  const topDark = mat(shade(look.top.color, 0.85));
  const legM = mat(look.legs.color);
  const legs = [];

  // ---- legs: round, tapered, pivoting at the hip so sitting just swings them forward ----
  const lw = 0.15 * look.legs.width;
  const baggy = look.legs.width > 1.3;
  const rTop = lw * 0.56, rHem = lw * (baggy ? 0.62 : 0.4);
  const sh = look.shoes;
  const shoeM = mat(sh.color), soleM = mat(shade(sh.color, sh.color === C.white ? 0.78 : 1.6));
  for (const sx of [-1, 1]) {
    const hip = new THREE.Group();
    hip.position.set(sx * (0.06 + lw / 2 + 0.01), 0.84, 0);
    P.ell(hip, legM, [0, -0.045, 0], [rTop, rTop * 0.55, rTop * 1.05]); // hip joint
    if (look.legs.short) {
      P.cyl(hip, legM, [0, -0.21, 0], rTop, rTop * 0.92, 0.42, { seg: 12, sz: 1.05 });
      P.cyl(hip, legM, [0, -0.42, 0], rTop * 0.95, rTop * 0.95, 0.03, { seg: 12, sz: 1.05 }); // hem
      P.cyl(hip, skin, [0, -0.62, 0], 0.046, 0.032, 0.4, { seg: 10 });                         // shin
      P.ell(hip, skin, [0, -0.5, -0.012], [0.05, 0.07, 0.05]);                                  // knee and calf
      P.ell(hip, skin, [0, -0.52, 0.016], [0.044, 0.085, 0.04]);                                // calf
    } else {
      const len = sh.kind === 'boot' ? 0.74 : 0.8;
      P.cyl(hip, legM, [0, -len / 2, 0], rTop, rHem, len, { seg: 12, sz: 1.05 });
      P.ell(hip, legM, [0, -0.4, -0.012], [rTop * 0.78, 0.07, rTop * 0.7]);                      // knee
    }
    // feet (floor is at hip height 0.84, so soles sit at y = -0.84)
    if (sh.kind === 'bare') {
      P.ell(hip, skin, [0, -0.82, -0.05], [0.055, 0.025, 0.12]);
      P.ell(hip, skin, [0, -0.795, 0.02], [0.04, 0.04, 0.045]);                                   // heel and ankle
      for (let i = 0; i < 5; i++) P.ell(hip, skin, [(i - 2) * 0.019, -0.828, -0.162 + (i === 0 ? 0.01 : 0) + Math.abs(i - 1.5) * 0.004], [0.011, 0.011, 0.014], undefined, 6);
    } else if (sh.kind === 'sandal') {
      P.ell(hip, soleM, [0, -0.833, -0.05], [0.062, 0.008, 0.135]);
      P.ell(hip, skin, [0, -0.815, -0.05], [0.052, 0.02, 0.115]);
      P.ell(hip, skin, [0, -0.79, 0.015], [0.04, 0.04, 0.04]);
      P.ell(hip, shoeM, [0, -0.805, -0.07], [0.056, 0.012, 0.012]);                               // strap
    } else if (sh.kind === 'boot') {
      P.cyl(hip, shoeM, [0, -0.73, 0.003], 0.073, 0.077, 0.2, { seg: 12, sz: 1.05 });             // shaft
      P.ell(hip, shoeM, [0, -0.795, -0.06], [0.07, 0.045, 0.125]);
      P.ell(hip, soleM, [0, -0.832, -0.055], [0.075, 0.012, 0.14]);
      P.ell(hip, soleM, [0, -0.828, 0.035], [0.074, 0.014, 0.04]);                                 // heel
    } else if (sh.kind === 'chunky') {
      P.ell(hip, shoeM, [0, -0.785, -0.06], [0.085, 0.055, 0.14]);
      P.ell(hip, soleM, [0, -0.826, -0.06], [0.092, 0.018, 0.155]);
      P.ell(hip, shoeM, [0, -0.775, 0.012], [0.07, 0.06, 0.06]);
    } else { // sneaker
      P.ell(hip, soleM, [0, -0.83, -0.055], [Math.max(0.072, lw * 0.5), 0.011, 0.14]);
      P.ell(hip, shoeM, [0, -0.806, -0.045], [Math.max(0.065, lw * 0.44), 0.036, 0.12]);
      P.ell(hip, shoeM, [0, -0.795, -0.115], [0.058, 0.033, 0.06]);                                // toe cap
      P.ell(hip, soleM, [0, -0.775, -0.09], [0.04, 0.008, 0.05]);                                  // laces
    }
    body.add(hip);
    legs.push(hip);
  }

  // ---- torso ----
  const torso = new THREE.Group();
  torso.position.y = 0.84;
  const tw = 0.42 * look.top.width, th = 0.56; // th: shoulder height above the hip; top.length: how far the shirt hangs
  const half = tw / 2, len = look.top.length;
  const bare = look.top.sleeves < 0.05;
  P.ell(torso, legM, [0, -0.015, 0], [half * 0.98, 0.075, 0.118]);                                    // pelvis under the hem
  P.cyl(torso, topM, [0, th - len / 2 - 0.02, 0], half * 0.99, half * (look.top.width > 1.2 ? 1.0 : 0.9), len - 0.04, { seg: 18, sz: 0.118 / half });
  P.ell(torso, topM, [0, th - 0.045, 0], [half + (bare ? -0.01 : 0.012), 0.08, 0.118], undefined, 14); // chest and shoulder line
  P.ell(torso, topM, [0, th - len + 0.01, 0], [half * (look.top.width > 1.2 ? 1.0 : 0.9), 0.02, 0.118], undefined, 14); // hem
  // neck and collar
  P.cyl(torso, skin, [0, th + 0.035, 0], 0.046, 0.05, 0.12, { seg: 10 });
  P.torus(torso, topDark, [0, th + 0.002, 0], 0.062, 0.013, [Math.PI / 2, 0, 0], [1, 1.1, 1]);
  if (bare) { // singlet: bare shoulders and collarbones
    P.ell(torso, skin, [0, th - 0.012, -0.03], [half * 0.7, 0.04, 0.09]);
  }

  // ---- arms: shoulder, elbow, wrist, hand. They hang from the shoulder with an elbow so they can lift a slice of pizza to the mouth.
  // sleeves is the sleeve length down from the shoulder; the rest of the arm is bare.
  const armR = (d) => (d < 0.25 ? lerp(0.058, 0.046, d / 0.25) : lerp(0.046, 0.033, (d - 0.25) / 0.25));
  const arms = [];
  const sl = look.top.sleeves;
  const sleeveM = look.coat ? mat(C.black) : topM;
  const sleeveHem = look.coat ? mat(shade(C.black, 2)) : topDark;
  const fat = look.top.width > 1.2 ? 0.014 : 0.004;
  for (const sx of [-1, 1]) {
    const ax = sx * (tw / 2 + 0.065);
    const upper = new THREE.Group(); upper.position.set(ax, 0.52, 0);
    const fore = new THREE.Group(); fore.position.y = -0.25; upper.add(fore);
    const seg = [[0, 0.25, upper, 0], [0.25, 0.5, fore, 0.25]];
    const limb = (from, to, m, extra) => {
      for (const [s0, s1, parent, off] of seg) {
        const a0 = Math.max(from, s0), a1 = Math.min(to, s1);
        if (a1 - a0 > 0.001) P.cyl(parent, m, [0, -((a0 + a1) / 2 - off), 0], armR(a0) + extra, armR(a1) + extra, a1 - a0, { seg: 10 });
      }
    };
    limb(0, sl, sleeveM, fat); limb(sl, 0.5, skin, 0);
    P.ell(upper, sl > 0.02 ? sleeveM : skin, [0, -0.005, 0], [0.066 + (sl > 0.02 ? fat : 0), 0.066, 0.066]);        // shoulder
    P.ell(fore, sl > 0.25 ? sleeveM : skin, [0, 0, 0], [0.05 + (sl > 0.25 ? fat : 0), 0.05, 0.05]);                   // elbow
    if (sl > 0.02 && sl < 0.5) { // sleeve hem
      const par = sl < 0.25 ? upper : fore, off = sl < 0.25 ? 0 : 0.25;
      P.cyl(par, sleeveHem, [0, -(sl - off), 0], armR(sl) + fat + 0.007, armR(sl) + fat + 0.007, 0.014, { seg: 10 });
    }
    // hand: palm, curled fingers, thumb (thumb on the inside)
    P.ell(fore, skin, [0, -0.285, 0], [0.035, 0.045, 0.02]);
    P.ell(fore, skin, [0, -0.335, -0.012], [0.03, 0.035, 0.016]);
    P.ell(fore, skin, [-sx * 0.03, -0.29, -0.012], [0.011, 0.03, 0.012], [0, 0, sx * 0.35], 6);
    P.ell(fore, skin, [0, -0.245, 0], [0.036, 0.03, 0.036]);                                                         // wrist
    if (look.glow) { // rave glow bracelets
      for (const [k, y] of [[sx > 0 ? 1 : 0, -0.21], [sx > 0 ? 2 : 1, -0.185]]) {
        const ring = new THREE.Mesh(new THREE.TorusGeometry(0.043, 0.011, 6, 14), mat(C.neon[k], { basic: true }));
        ring.rotation.x = Math.PI / 2; ring.position.y = y; fore.add(ring);
      }
    }
    torso.add(upper);
    arms.push({ upper, fore });
  }

  if (look.coat) { // trench coat: long, open at the front, collar up
    const coat = mat(C.black);
    P.cyl(torso, coat, [0, th / 2 - 0.1, 0], half + 0.04, half + 0.05, th + 0.18, { seg: 18, sz: 0.145 / (half + 0.04) });
    P.cyl(torso, coat, [0, -0.3, 0], half + 0.05, half + 0.14, 0.4, { seg: 18, sz: 0.14 / (half + 0.1) });
    P.box(torso, topM, [0, th / 2 - 0.06, -0.152], [0.1, th + 0.2, 0.012]);                       // the band tee showing in the gap
    P.ell(torso, coat, [-0.07, th + 0.045, 0.01], [0.05, 0.07, 0.085], [0, 0, 0.3]);               // collar, up
    P.ell(torso, coat, [0.07, th + 0.045, 0.01], [0.05, 0.07, 0.085], [0, 0, -0.3]);
    P.ell(torso, coat, [0, th + 0.045, 0.085], [0.1, 0.07, 0.04]);
  }
  if (look.chain) { // gold chain with a pendant
    P.torus(torso, mat(C.amber), [0, th - 0.06, -0.01], 0.092, 0.006, [Math.PI / 2 - 0.5, 0, 0], [1, 1.25, 1], 20);
    P.ell(torso, mat(C.amber), [0, th - 0.15, -0.127], [0.028, 0.034, 0.01], undefined, 8);
  }
  if (look.beads) P.torus(torso, mat(C.white), [0, th - 0.012, 0], 0.07, 0.011, [Math.PI / 2, 0, 0], [1, 1.05, 1]);
  if (look.wallet) { // wallet chain from the belt loop
    P.cyl(torso, mat(C.amber), [half + 0.012, -0.08, -0.07], 0.006, 0.006, 0.26, { seg: 5 });
    P.ell(torso, mat(C.amber), [half + 0.012, -0.21, -0.07], [0.016, 0.016, 0.016], undefined, 6);
  }
  if (look.backpack) {
    const bp = mat(look.arch === 'raver' ? C.neon[0] : C.shirts[1]);
    P.ell(torso, bp, [0, 0.3, 0.19], [0.15, 0.19, 0.075], undefined, 12);
    P.ell(torso, mat(shade(look.arch === 'raver' ? C.neon[0] : C.shirts[1], 0.8)), [0, 0.2, 0.245], [0.1, 0.07, 0.03], undefined, 8);
    for (const sx of [-1, 1]) { // straps over the shoulders
      P.cyl(torso, mat(shade(C.shirts[1], 0.6)), [sx * 0.1, th - 0.07, -0.12], 0.016, 0.016, 0.36, { seg: 6, sz: 0.5, rot: [0, 0, 0] });
      P.box(torso, mat(shade(C.shirts[1], 0.6)), [sx * 0.1, th + 0.012, 0.03], [0.034, 0.012, 0.28]);
    }
  }

  // ---- head ----
  const headY = th + 0.14;
  const C0 = headY + 0.012;                       // centre of the cranium
  const jw = F.jaw;
  P.ell(torso, skin, [0, C0, 0], [0.106 * jw, 0.122, 0.115], undefined, 20);       // cranium
  P.ell(torso, skin, [0, headY - 0.065, -0.012], [0.088 * jw, 0.075, 0.092], undefined, 16); // jaw
  P.ell(torso, skin, [0, headY - 0.118, -0.055], [0.04 * jw, 0.03, 0.04], undefined, 10);    // chin
  for (const sx of [-1, 1]) {
    P.ell(torso, skin, [sx * 0.108 * jw, headY - 0.005, 0.0], [0.012 * F.ears, 0.034 * F.ears, 0.022], undefined, 8); // ears
    P.ell(torso, skinDeep, [sx * 0.11 * jw, headY - 0.005, -0.001], [0.007, 0.02, 0.013], undefined, 6);
    if (F.stud && sx === -1) P.ell(torso, mat(C.amber), [sx * 0.112 * jw, headY - 0.03, -0.004], [0.006, 0.006, 0.006], undefined, 6);
  }
  // brow ridge, nose
  P.ell(torso, skin, [0, headY + 0.05, -0.1], [0.062, 0.011, 0.014], undefined, 8);
  const n = F.nose;
  P.ell(torso, skin, [0, headY - 0.008, -0.102], [0.013 * n, 0.034, 0.016], [-0.2, 0, 0], 8);                              // bridge
  P.ell(torso, skin, [0, headY - 0.038, -0.113], [0.019 * n, 0.017 * n, 0.018 * n], undefined, 10);                         // tip
  for (const sx of [-1, 1]) {
    P.ell(torso, skin, [sx * 0.0125 * n, headY - 0.044, -0.107], [0.0085 * n, 0.0085 * n, 0.009 * n], undefined, 8);        // nostril wings
    P.ell(torso, mat(C.dark, { basic: true }), [sx * 0.009, headY - 0.05, -0.118], [0.0045, 0.0035, 0.004], undefined, 5); // nostrils
  }
  if (F.freckles) {
    const fk = mat(shade(look.skin, 0.72));
    const spots = [[-0.03, -0.028], [-0.045, -0.034], [-0.058, -0.022], [-0.04, -0.045], [-0.012, -0.012], [0.03, -0.028], [0.045, -0.034], [0.058, -0.022], [0.04, -0.045], [0.012, -0.012], [-0.065, -0.04], [0.065, -0.04]];
    for (const [x, dy] of spots) P.ell(torso, fk, [x, headY + dy + 0.012, frontZ(x, dy) + 0.0005], [0.0032, 0.0032, 0.002], undefined, 5);
  }

  // eyes: socket, white, iris and pupil (which drift about), brow, liner. Lids are separate so they can blink.
  const eyeWhite = mat(C.eyeWhite, { mat: { roughness: 0.3 } });
  const irisM = mat(F.iris, { mat: { roughness: 0.4 } });
  const dark = mat(C.dark, { basic: true });
  const hairM = mat(look.hair.color);
  const browM = mat(look.hair.color === C.hair.blond ? shade(C.hair.blond, 0.7) : look.hair.color);
  const tilt = { stern: 0.3, smile: -0.06, smirk: 0.12, flat: 0.05 }[F.mood];
  const eyes = [];
  for (const sx of [-1, 1]) {
    const ex = sx * 0.04 * jw, ey = headY + 0.022, ez = -0.0985;
    P.ell(torso, mat(shade(look.skin, 0.93)), [ex, ey, ez + 0.005], [0.028, 0.018, 0.013], undefined, 8);                               // socket
    P.ell(torso, eyeWhite, [ex, ey, ez], [0.0215, 0.0125, 0.011], undefined, 10);
    const gaze = new THREE.Group(); gaze.position.set(ex, ey, ez); torso.add(gaze);
    P.ell(gaze, irisM, [0, 0, -0.0035], [0.0105, 0.0105, 0.0075], undefined, 10);
    P.ell(gaze, dark, [0, 0, -0.0095], [0.0048, 0.0048, 0.0035], undefined, 6);
    P.ell(torso, F.liner ? dark : mat(shade(look.hair.color, 0.55)), [ex, ey + 0.0115, ez - 0.0005], [0.0245, F.liner ? 0.005 : 0.0028, 0.0115], [0, 0, sx * -0.08], 8); // lash line
    P.ell(torso, browM, [ex + sx * 0.002, headY + 0.047, -0.097], [0.028 * F.brow, 0.0065 * F.brow, 0.008], [0, 0, sx * tilt], 8); // eyebrow
    const lid = blob(skin, [ex, ey, ez - 0.0005], [0.0235, 0.0135, 0.0122]); lid.visible = false; torso.add(lid);
    eyes.push({ gaze, lid });
  }

  // mouth: lips (in halves so they can curve into a smile), a dark seam, and teeth that show when it opens
  const lipC = F.lipstick ? blend(look.skin, C.black, 0.6) : blend(look.skin, C.lip, look.skin === C.skin[3] ? 0.5 : look.skin === C.skin[0] ? 0.45 : 0.35);
  const lipM = mat(lipC, { mat: { roughness: 0.5 } });
  const mouth = new THREE.Group(); mouth.position.set(0, headY - 0.0795, -0.099); torso.add(mouth);
  const lower = new THREE.Group(); mouth.add(lower);
  const curve = { smile: [0.2, 0.2], smirk: [0.08, 0.28], stern: [-0.06, -0.06], flat: [0, 0] }[F.mood];
  for (const [i, sx] of [[0, -1], [1, 1]]) {
    const c = curve[i];
    P.ell(mouth, lipM, [sx * 0.0125, 0.0058 + sx * 0 + Math.max(0, c) * 0.01, 0.0], [0.0165 * F.lip, 0.0068 * F.lip, 0.011], [0, 0, sx * c], 8);
    P.ell(lower, lipM, [sx * 0.011, -0.0078 + Math.max(0, c) * 0.008, 0.0], [0.0155 * F.lip, 0.0085 * F.lip, 0.011], [0, 0, sx * c * 0.8], 8);
  }
  const inner = blob(mat(shade(C.lip, 0.35), { basic: true }), [0, -0.001, -0.004], [0.021, 0.0055, 0.006]); inner.visible = false; mouth.add(inner);
  const teeth = new THREE.Mesh(new THREE.BoxGeometry(0.034, 0.0045, 0.003), eyeWhite); teeth.position.set(0, 0.0015, -0.0075); teeth.visible = false; mouth.add(teeth);
  P.box(mouth, dark, [0, 0, -0.0075], [0.05, 0.0022, 0.004]);                                                      // the seam

  // hair and hats
  const h = look.hair, hs = h.style;
  const FRONT = Math.PI * 1.5, GAP = Math.PI * 0.42;           // keep the face clear: cover phi from FRONT+GAP round the back to FRONT-GAP
  const around = (theta, s, y = 0, off = [0, 0, 0.004]) => {      // a skullcap of hair, then the back and sides below the hairline
    P.cap(torso, hairM, [off[0], C0 + y, off[2]], [0.111 * s * jw, 0.126 * s, 0.12 * s], theta);
  };
  const sides = (from, to, s, gap = GAP) => {
    // a ring segment between two angles down the head, open at the front
    const geo = new THREE.SphereGeometry(1, 16, 8, FRONT + gap, Math.PI * 2 - gap * 2, from, to - from);
    P.put(torso, geo, hairM, [0, C0, 0.004], [0.111 * s * jw, 0.126 * s, 0.12 * s]);
  };
  const showsHair = !look.hat || look.hat.kind === 'cap';
  if (showsHair) {
    if (hs === 'short') { around(Math.PI * 0.36, 1.07); sides(Math.PI * 0.36, Math.PI * 0.45, 1.07); P.ell(torso, hairM, [0, C0 + 0.07, -0.085], [0.07, 0.04, 0.045], [0.35, 0, 0], 8); sides(Math.PI * 0.45, Math.PI * 0.62, 1.04, Math.PI * 0.8); }
    if (hs === 'buzz') { around(Math.PI * 0.33, 1.025); sides(Math.PI * 0.33, Math.PI * 0.43, 1.025); }
    if (hs === 'spiky' || hs === 'mohawk') {
      around(Math.PI * 0.32, 1.03); sides(Math.PI * 0.32, Math.PI * 0.4, 1.03);
      const spike = (az, el, hh, rr) => { // az: round the head, el: angle from vertical
        const nrm = new THREE.Vector3(Math.sin(el) * Math.cos(az), Math.cos(el), Math.sin(el) * Math.sin(az));
        const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), nrm);
        const e = new THREE.Euler().setFromQuaternion(q);
        P.cone(torso, hairM, [nrm.x * 0.125 * jw, C0 + nrm.y * 0.13 + hh * 0.4 * nrm.y, nrm.z * 0.12 + 0.004], rr, hh, [e.x, e.y, e.z]);
      };
      if (hs === 'spiky') {
        spike(0, 0, 0.14, 0.032);
        for (let i = 0; i < 7; i++) spike(i / 7 * Math.PI * 2, 0.5 + (i % 2) * 0.12, 0.1 + (i % 3) * 0.03, 0.028);
        for (let i = 0; i < 9; i++) spike(i / 9 * Math.PI * 2 + 0.3, 0.98, 0.08 + (i % 2) * 0.03, 0.026);
      } else {
        for (let i = -3; i <= 3; i++) { const a = i * 0.27; P.cone(torso, hairM, [0, C0 + Math.cos(a) * 0.14 + 0.03, Math.sin(a) * 0.13 + 0.004], 0.03, 0.15 - Math.abs(i) * 0.012, [a, 0, 0]); }
      }
    }
    if (hs === 'long' || hs === 'curtains' || hs === 'shaggy') {
      around(Math.PI * 0.3, hs === 'shaggy' ? 1.1 : 1.07);
      sides(Math.PI * 0.3, Math.PI * 0.5, hs === 'shaggy' ? 1.1 : 1.07, Math.PI * 0.33);
      if (hs === 'long') {
        P.ell(torso, hairM, [0, C0 - 0.16, 0.098], [0.123 * jw, 0.2, 0.052], undefined, 12);                             // down the back
        for (const sx of [-1, 1]) P.ell(torso, hairM, [sx * 0.112 * jw, C0 - 0.1, 0.03], [0.02, 0.17, 0.08], [0, 0, sx * 0.04], 8); // over the ears
      }
      if (hs === 'curtains') {
        for (const sx of [-1, 1]) {
          P.ell(torso, hairM, [sx * 0.045 * jw, C0 + 0.05, -0.1], [0.058, 0.05, 0.04], [0.15, 0, -sx * 0.5], 8);
          P.ell(torso, hairM, [sx * 0.112 * jw, C0 - 0.035, 0.0], [0.022, 0.085, 0.085], undefined, 8);
        }
        P.ell(torso, hairM, [0, C0 - 0.07, 0.1], [0.11 * jw, 0.075, 0.04], undefined, 10);                                // nape
      }
      if (hs === 'shaggy') {
        P.ell(torso, hairM, [0, C0 + 0.06, -0.1], [0.105, 0.04, 0.045], [0.25, 0, 0], 8);                                  // fringe
        P.ell(torso, hairM, [0, C0 - 0.1, 0.095], [0.12 * jw, 0.13, 0.05], undefined, 10);
        for (const [x, y, z, r] of [[-0.09, 0.08, -0.04, 0.035], [0.08, 0.09, 0.0, 0.04], [0.0, 0.12, 0.05, 0.045], [-0.07, 0.02, 0.1, 0.04], [0.1, -0.02, 0.07, 0.04], [-0.12, -0.04, 0.0, 0.03], [0.12, -0.06, -0.02, 0.028]]) P.ell(torso, hairM, [x, C0 + y, z], [r, r * 1.2, r], undefined, 6); // tufts
      }
    }
  }
  if (look.hat && !look.headphones) {
    const hm = mat(look.hat.color);
    if (look.hat.kind === 'cap') { // worn backwards
      P.cap(torso, hm, [0, C0 + 0.008, 0.004], [0.116 * jw, 0.131, 0.125], Math.PI * 0.38);
      P.ell(torso, hm, [0, C0 + 0.045, 0.165], [0.082, 0.007, 0.07], [0.22, 0, 0], 12);                                  // brim, at the back
      P.box(torso, mat(shade(look.hat.color, 0.8)), [0, C0 + 0.058, -0.127], [0.05, 0.012, 0.012]);                      // adjuster strap
    }
    if (look.hat.kind === 'bucket') {
      P.cap(torso, hm, [0, C0 + 0.02, 0.004], [0.117 * jw, 0.135, 0.125], Math.PI * 0.46);
      P.cyl(torso, mat(look.hat.color, { mat: { side: THREE.DoubleSide } }), [0, C0 + 0.05, 0.004], 0.135, 0.2, 0.05, { seg: 20, open: true });
    }
    if (look.hat.kind === 'beanie') {
      P.cap(torso, hm, [0, C0 + 0.02, 0.004], [0.118 * jw, 0.133, 0.126], Math.PI * 0.43);
      P.cyl(torso, mat(shade(look.hat.color, 0.8)), [0, C0 + 0.058, 0.004], 0.123 * jw, 0.123 * jw, 0.04, { seg: 18, sz: 1.05 });
      P.ell(torso, hm, [0, C0 + 0.152, 0.004], [0.022, 0.022, 0.022], undefined, 6);                                      // bobble
    }
  }

  // facial hair and glasses
  const fh = mat(look.hair.color);
  const fx = look.facial;
  if (fx === 'stubble') P.ell(torso, mat(look.hair.color, { mat: { transparent: true, opacity: 0.4 } }), [0, headY - 0.07, -0.012], [0.091 * jw, 0.073, 0.095], undefined, 14);
  if (fx === 'goatee' || fx === 'beard') P.ell(torso, fh, [0, headY - 0.108, -0.06], [0.034, 0.036, 0.03], undefined, 8);
  if (fx === 'goatee' || fx === 'moustache' || fx === 'beard') for (const sx of [-1, 1]) P.ell(torso, fh, [sx * 0.02, headY - 0.0565, -0.104], [0.022, 0.009, 0.014], [0, 0, -sx * 0.2], 8);
  if (fx === 'goatee') for (const sx of [-1, 1]) P.ell(torso, fh, [sx * 0.026, headY - 0.092, -0.093], [0.01, 0.025, 0.012], undefined, 6);
  if (fx === 'soulpatch') P.ell(torso, fh, [0, headY - 0.1, -0.082], [0.011, 0.014, 0.009], undefined, 6);
  if (fx === 'beard') {
    P.cap(torso, fh, [0, headY - 0.07, -0.012], [0.094 * jw, 0.078, 0.097], Math.PI * 0.99, Math.PI * 0.48, Math.PI * 1.04, 14);
    P.ell(torso, fh, [0, headY - 0.1, -0.075], [0.074 * jw, 0.045, 0.045], undefined, 10);
  }
  if (look.glasses === 'shades') {
    for (const sx of [-1, 1]) P.ell(torso, dark, [sx * 0.042 * jw, headY + 0.022, -0.118], [0.032, 0.0185, 0.006], [0, 0, sx * -0.08], 10);
    P.box(torso, dark, [0, headY + 0.03, -0.12], [0.02, 0.006, 0.006]);
    for (const sx of [-1, 1]) P.box(torso, dark, [sx * 0.1075 * jw, headY + 0.028, -0.056], [0.005, 0.006, 0.124]);
  }
  if (look.glasses === 'round') {
    for (const sx of [-1, 1]) {
      P.torus(torso, dark, [sx * 0.042 * jw, headY + 0.022, -0.116], 0.0315, 0.0035, undefined, [1, 1, 1], 18);
      P.put(torso, new THREE.CircleGeometry(0.031, 14), mat(C.white, { basic: true, mat: { transparent: true, opacity: 0.14, side: THREE.DoubleSide } }), [sx * 0.042 * jw, headY + 0.022, -0.1165]);
      P.box(torso, dark, [sx * 0.1075 * jw, headY + 0.026, -0.056], [0.005, 0.005, 0.124]);
    }
    P.box(torso, dark, [0, headY + 0.03, -0.116], [0.018, 0.005, 0.005]);
  }

  // headphones: one pair for everybody, shown or hidden (they go on when you sit at a PC that has them, see wearsPhones)
  const phones = headphones();
  phones.position.set(0, headY - 0.005, 0);
  phones.scale.x = jw;
  phones.visible = false;
  torso.add(phones);

  P.finish();
  body.add(torso);
  return { body, legs, torso, arms, eyes, mouth: { group: mouth, lower, inner, teeth }, phones, headTop: (0.84 + headY + 0.2) * look.height };
}

function label(name, color) {
  const c = document.createElement('canvas');
  c.width = 256; c.height = 64;
  const g = c.getContext('2d');
  g.font = '40px "VT323", monospace';
  const w = Math.min(248, g.measureText(name).width + 24);
  g.fillStyle = 'rgba(0,0,0,.7)'; // --hud-bg
  g.fillRect((256 - w) / 2, 8, w, 48);
  g.fillStyle = color;
  g.fillRect((256 - w) / 2, 52, w, 4);
  g.fillStyle = '#e8e1cc'; // --paper
  g.textAlign = 'center';
  g.fillText(name, 128, 44);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, depthTest: false, transparent: true }));
  s.scale.set(0.6, 0.15, 1);
  s.renderOrder = 10;
  return s;
}

/* ---------- speech bubbles ----------
   A Win98 balloon above the name tag: grey face, bevel, black VT323 text, a stepped tail pointing down.
   Drawn at 2x so it stays sharp up close. Colours are tokens (--w98-face/-light/-hilite/-shadow/-dark/-text). */
const BUB = { S: 2, font: 20, line: 17, pad: 6, maxW: 176, tail: 6, maxLines: 5, perM: 190 }; // perM: logical px per metre
let eye = null; // the camera's position, so far-off bubbles can grow to stay readable
export const setEye = (v) => { eye = v; };

function wrapText(g, text, maxW, maxLines) {
  const lines = [];
  let cur = '';
  for (let word of text.split(/\s+/)) {
    while (g.measureText(word).width > maxW) { // a word wider than the bubble: break it
      let n = word.length - 1;
      while (n > 1 && g.measureText(word.slice(0, n)).width > maxW) n--;
      if (cur) { lines.push(cur); cur = ''; }
      lines.push(word.slice(0, n)); word = word.slice(n);
    }
    const next = cur ? `${cur} ${word}` : word;
    if (g.measureText(next).width > maxW && cur) { lines.push(cur); cur = word; } else cur = next;
  }
  if (cur) lines.push(cur);
  if (lines.length > maxLines) { lines.length = maxLines; lines[maxLines - 1] = lines[maxLines - 1].replace(/.{0,2}$/, '..'); }
  return lines;
}

function bubbleCanvas(text) {
  const { S, font, line, pad, maxW, tail, maxLines } = BUB;
  const c = document.createElement('canvas');
  let g = c.getContext('2d');
  g.font = `${font * S}px "VT323", monospace`;
  const lines = wrapText(g, text, maxW * S, maxLines);
  const textW = Math.max(...lines.map((l) => g.measureText(l).width)) / S;
  const w = Math.ceil(textW) + pad * 2 + 4, h = lines.length * line + pad * 2 + 2;
  c.width = w * S; c.height = (h + tail) * S;
  g = c.getContext('2d');
  g.scale(S, S);
  const r = (col, x, y, rw, rh) => { g.fillStyle = col; g.fillRect(x, y, rw, rh); };
  r('#0a0a0a', 0, 0, w, h);          // --w98-dark
  r('#ffffff', 0, 0, w - 1, h - 1);  // --w98-light
  r('#808080', 1, 1, w - 2, h - 2);  // --w98-shadow
  r('#dfdfdf', 1, 1, w - 3, h - 3);  // --w98-hilite
  r('#c0c0c0', 2, 2, w - 4, h - 4);  // --w98-face
  const cx = Math.floor(w / 2);
  for (let i = 0; i < tail; i++) {   // the tail: dark steps with a grey middle
    r('#0a0a0a', cx - tail + i, h - 1 + i, (tail - i) * 2, 1);
    if (i === 0) r('#c0c0c0', cx - tail + 1, h - 1, (tail - 1) * 2, 1);
    else if (tail - i > 1) r('#c0c0c0', cx - tail + i + 1, h - 1 + i, (tail - i) * 2 - 2, 1);
  }
  g.font = `${font}px "VT323", monospace`;
  g.textBaseline = 'alphabetic';
  g.fillStyle = '#000000';           // --w98-text
  lines.forEach((l, i) => g.fillText(l, 2 + pad, 2 + pad + (i + 1) * line - 4));
  return { canvas: c, w, h: h + tail };
}

// What a hand can do at the mouth: lift it, then n bites or sips, then lower it. Pizza and snacks are
// bites (the item shrinks); a can is sips (the head tips back and the can tilts).
const HAND_ACTS = {
  pizza: { raise: 0.8, n: 3, bite: 0.7, lower: 0.7 },
  snack: { raise: 0.6, n: 3, bite: 0.5, lower: 0.6 },
  curl: { raise: 0.6, n: 3, bite: 0.5, lower: 0.6 },
  drink: { raise: 0.8, n: 2, bite: 1.1, lower: 0.7 },
};
const actLength = (a) => a.raise + a.n * a.bite + a.lower;
// a slice of pepperoni pizza in the hand: crust, cheese and a pepperoni, all token colours
function sliceMesh() {
  const g = new THREE.Group();
  const wedge = (r, h, y, m) => {
    const w = new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, 3, 1, false, 0, Math.PI * 2 / 3), m);
    w.position.y = y; return w;
  };
  const pizza = new THREE.Group();
  pizza.add(wedge(0.12, 0.012, 0, mat(0xd9a04a)));        // --pizza-crust
  pizza.add(wedge(0.105, 0.016, 0.005, mat(0xf2c14e)));   // --pizza-cheese
  const pep = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.018, 8), mat(0xb22a1e)); // --pepperoni
  pep.position.set(0.04, 0.008, 0.02);
  pizza.add(pep);
  pizza.rotation.set(0, 1.0, 0);
  g.add(pizza);
  return g;
}
// a fistful of Nachoz: three triangle chips, one gets eaten per bite
function snackMesh() {
  const g = new THREE.Group();
  const chips = new THREE.Group();
  for (const [x, y, z, r] of [[0, 0, 0, 0.2], [0.012, 0.009, 0.01, 1.4], [-0.01, 0.018, -0.006, 2.5]]) {
    const c = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.007, 3), mat(y > 0.01 ? 0xf5a54a : 0xf28a1c)); // --nacho
    c.position.set(x, y, z); c.rotation.y = r; chips.add(c);
  }
  g.add(chips);
  g.userData.chips = chips.children;
  return g;
}
// a can of Volt Cola held in the fist, lid toward the mouth
function canMesh() {
  const g = new THREE.Group();
  const inner = new THREE.Group();
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.033, 0.033, 0.12, 14), mat(0xc4161c, { mat: { metalness: 0.4, roughness: 0.4 } })); // --volt-can
  const band = new THREE.Mesh(new THREE.CylinderGeometry(0.0335, 0.0335, 0.028, 14), mat(0xffd400)); // --volt-yellow
  band.position.y = 0.005;
  const lid = new THREE.Mesh(new THREE.CylinderGeometry(0.029, 0.033, 0.008, 14), mat(0xcfd3d8, { mat: { metalness: 0.8, roughness: 0.3 } })); // --disc-silver
  lid.position.y = 0.064;
  inner.add(body, band, lid);
  g.add(inner);
  g.scale.setScalar(1.3); // a little oversized so it reads from across the room
  return g;
}
// a fistful of Cheez Curlz: three little curls, one gets eaten per bite
function curlMesh() {
  const g = new THREE.Group();
  const chips = new THREE.Group();
  for (const [x, y, z, r] of [[0, 0, 0, 0.3], [0.014, 0.012, 0.008, 1.8], [-0.012, 0.024, -0.006, 3.4]]) {
    const c = new THREE.Mesh(new THREE.TorusGeometry(0.016, 0.0085, 6, 10, Math.PI * 1.5), mat(0xffa51f)); // --curlz
    c.position.set(x, y, z); c.rotation.set(Math.PI / 2, 0, r); chips.add(c);
  }
  g.add(chips);
  g.userData.chips = chips.children;
  return g;
}
const ITEMS = { pizza: sliceMesh, snack: snackMesh, curl: curlMesh, drink: canMesh };

// How a seated body holds itself. lean tips the torso (negative is forward, toward the screen); lock is how much
// further forward they go when they lock in on a fight. legs is how far the legs swing forward (PI/2 is straight
// out under a desk; less puts the feet on the floor, for the couch). arms are [left, right] as the shoulder swing
// a, the shoulder's sideways angle z and the elbow b, solved so the hands land on the keyboard and the mouse
// (desk) or on a pad held in the lap (couch).
const POSES = {
  desk: { lean: -0.14, lock: 0.07, legs: Math.PI / 2, arms: [{ a: 0.603, z: 0.393, b: 1.046 }, { a: 0.456, z: 0.073, b: 1.261 }] },
  couch: { lean: 0.1, lock: 0.1, legs: 0.95, arms: [{ a: 0.185, z: 0.442, b: 0.737 }, { a: 0.185, z: -0.442, b: 0.737 }] },
};

class Avatar extends EventTarget {
  constructor(player, force, override) {
    super();
    this.id = player.id;
    this.name = player.name;
    this.bubble = null; // { sprite, mat, tex, w, h, t, life } while they're talking
    this.group = new THREE.Group();
    this.look = Object.assign(lookFor(player.id ?? player.name, { force, shirt: player.color }), override);
    const b = buildBody(this.look);
    this.group.add(b.body);
    this.legs = b.legs;
    this.torso = b.torso;
    this.arms = b.arms;
    this.eyes = b.eyes;
    this.mouth = b.mouth;
    this.phones = b.phones;
    this.faceT = 0;
    this.blinkIn = 1.5 + Math.random() * 3; // seconds until the next blink
    this.blinkT = -1;
    this.gazeSeed = Math.random() * 10;
    this.eatT = -1; // seconds into eating/drinking, or -1
    this.eatKind = 'pizza';
    this.items = {};
    this.lean = 0;   // extra tip of the torso (head back for a swig)
    this.pose = null; // POSES entry while sitting down
    this.armRest = [{ u: 0, z: 0, f: 0 }, { u: 0, z: 0, f: 0 }]; // where each arm settles: shoulder swing, shoulder sideways, elbow
    this.focusT = 0; this.focusGoal = 0; this.focusK = 0; // gaming: 0 slouched and casual, 1 locked in on the screen
    this.tagY = b.headTop + 0.25;
    this.tag = label(player.name, player.color);
    this.tag.position.y = this.tagY;
    this.group.add(this.tag);

    this.target = new THREE.Vector3(player.x ?? 0, 0, player.z ?? 1.2);
    this.group.position.copy(this.target);
    this.yaw = player.yaw ?? 0;
    this.group.rotation.y = this.yaw;
    this.seat = null;
    this.walkT = 0;
    this.armBase = 0;
    this.syncPhones();
  }

  // Headphones on: if they came wearing them, or they're sitting at a PC that has a pair (unless there's a hat in the way).
  wearsPhones() { return !!this.look.headphones || (this.seat?.audio === 'headphones' && !this.look.hat); }
  syncPhones() { this.phones.visible = this.wearsPhones(); }

  // Eat or drink something: lift it to the mouth, take a few bites or sips, lower the hand.
  // kind: 'pizza' (a slice), 'snack' (a handful of Nachoz), 'curl' (Cheez Curlz) or 'drink' (a can of Volt Cola)
  eat(kind = 'pizza') {
    if (this.eatT >= 0) return;
    this.eatT = 0;
    this.eatKind = HAND_ACTS[kind] ? kind : 'pizza';
    for (const [k, it] of Object.entries(this.items)) it.visible = k === this.eatKind;
    if (!this.items[this.eatKind]) {
      const it = ITEMS[this.eatKind]();
      it.position.set(0, -0.3, -0.04);
      this.arms[1].fore.add(it);
      this.items[this.eatKind] = it;
    }
    const it = this.items[this.eatKind];
    it.visible = true; it.scale.setScalar(1);
    it.userData.chips?.forEach((c) => { c.visible = true; });
    if (this.eatKind === 'drink') it.rotation.set(0, 0, Math.PI / 2);
  }
  // Eyes blink every few seconds and wander a little; the mouth opens for each bite.
  stepFace(dt) {
    this.faceT += dt;
    this.blinkIn -= dt;
    if (this.blinkIn <= 0 && this.blinkT < 0) this.blinkT = 0;
    let closed = 0;
    if (this.blinkT >= 0) {
      this.blinkT += dt;
      const k = this.blinkT / 0.16;
      closed = k >= 1 ? 0 : Math.sin(k * Math.PI);
      if (k >= 1) { this.blinkT = -1; this.blinkIn = 1.8 + Math.random() * 4.5; if (Math.random() < 0.15) this.blinkIn = 0.25; }
    }
    const t = this.faceT + this.gazeSeed;
    const gx = Math.sin(t * 0.9) * Math.sin(t * 0.37) * 0.0045, gy = Math.sin(t * 0.6 + 1) * 0.002;
    for (const e of this.eyes) {
      e.lid.visible = closed > 0.04;
      e.lid.scale.y = 0.0135 * Math.max(0.1, closed);
      e.lid.position.y = e.gaze.position.y + 0.0135 * (1 - Math.max(0.1, closed));
      e.gaze.children.forEach((c) => c.position.set(gx, gy, c.position.z));
    }
  }
  setMouth(open) {
    const m = this.mouth;
    m.lower.position.y = -open * 0.011;
    m.inner.visible = m.teeth.visible = open > 0.04;
    m.inner.scale.y = 0.0015 + open * 0.0085;
    m.inner.position.y = -open * 0.004;
  }
  stepEat(dt) {
    if (this.eatT < 0) return;
    this.eatT += dt;
    const A = HAND_ACTS[this.eatKind], D = actLength(A), T = this.eatT, item = this.items[this.eatKind];
    const lift = Math.max(0, Math.min(1, T / A.raise, (D - T) / A.lower));
    const into = T - A.raise;
    const bites = Math.max(0, Math.min(A.n, Math.floor(into / A.bite)));
    const eating = into > 0 && T < D - A.lower;
    const pulse = eating ? Math.sin((into % A.bite) / A.bite * Math.PI) : 0; // 0..1 and back, once per bite or sip
    const { upper, fore } = this.arms[1];
    // the hand comes in across the chest to the mouth: forward and in at the shoulder, folded up at the elbow
    // (the man taped to the ceiling keeps his arm out: armBase is not 0 for him)
    const reach = this.armBase === 0;
    const swing = reach ? 0.9 : 1.0, fold = reach ? 1.9 : 3.3, across = reach ? 1.3 * upper.position.x : 0, wrist = reach ? 0.9 : 0;
    const rest = this.armRest[1], u0 = this.armBase + rest.u, f0 = rest.f, z0 = rest.z; // the arm leaves its rest pose (on the mouse, say) and comes back to it
    upper.rotation.set(u0 + (swing - u0) * lift, 0, z0 + (-across - z0) * lift);
    if (this.eatKind === 'drink') {
      fore.rotation.set(f0 + (fold - f0) * lift, 0, -wrist * lift);
      item.rotation.x = pulse * 0.9;       // tip the can up
      this.lean = pulse * 0.16;            // and the head back
      this.setMouth(pulse * 0.25);
    } else {
      const nibble = pulse * 0.12;
      fore.rotation.set(f0 + (fold - f0) * lift - nibble, 0, -wrist * lift);
      this.setMouth(nibble > 0 ? Math.min(1, nibble / 0.1) : 0);
      if (this.eatKind === 'snack' || this.eatKind === 'curl') item.userData.chips.forEach((c, i) => { c.visible = i >= bites; });
      else item.scale.setScalar(1 - bites * 0.3);
    }
    if (T >= D) { this.eatT = -1; this.lean = 0; upper.rotation.set(u0, 0, z0); fore.rotation.set(f0, 0, 0); item.visible = false; this.setMouth(0); this.dispatchEvent?.(new Event('ate')); }
  }

  // What the body does between things: nods along as they talk, and when they're sat down playing, tips toward
  // the screen and works the keys and the mouse (or the pad) a little, harder when something kicks off. The arm
  // that is eating or drinking is left alone.
  stepPose(t, dt) {
    const talk = this.bubble ? Math.sin(t * 11 + (this.phase ?? 0)) * 0.05 : 0; // nods along as they talk
    const P = this.pose;
    if (!P) { this.torso.rotation.x = talk + this.lean; return; }
    if ((this.focusT -= dt) <= 0) { this.focusT = 2 + Math.random() * 6; this.focusGoal = Math.random() < 0.4 ? 1 : 0; }
    this.focusK += (this.focusGoal - this.focusK) * Math.min(1, dt * 4);
    const f = this.focusK, w = t + (this.phase ?? 0), couch = P === POSES.couch;
    this.torso.rotation.x = talk + this.lean + P.lean - f * P.lock + Math.sin(w * 0.5) * 0.01;
    this.torso.rotation.z = Math.sin(w * 0.37) * 0.012 + (couch ? f * Math.sin(w * 1.7) * 0.05 : 0); // on the couch they lean into the turns
    for (let i = 0; i < 2; i++) {
      if (i === 1 && this.eatT >= 0) continue;
      const R = P.arms[i], { upper, fore } = this.arms[i], k = 0.012 + 0.04 * f;
      if (couch) { // thumbs and wrists on the pad
        upper.rotation.set(R.a + Math.sin(w * 9 + i * 2) * k * 0.4, 0, R.z);
        fore.rotation.set(R.b + Math.sin(w * 13 + i) * k, 0, 0);
      } else if (i === 0) { // left hand on the keys
        upper.rotation.set(R.a, 0, R.z);
        fore.rotation.set(R.b + Math.sin(w * 11) * Math.sin(w * 3.1) * k, 0, 0);
      } else { // right hand pushes the mouse about
        upper.rotation.set(R.a + Math.sin(w * 1.9) * 0.02 * (1 + f * 2), 0, R.z + Math.sin(w * 1.3 + 1) * 0.03 * (1 + f * 2));
        fore.rotation.set(R.b + Math.sin(w * 6) * k * 0.5, 0, 0);
      }
    }
  }

  // Say something out loud: a speech bubble over the name tag for a few seconds.
  say(text) {
    this.clearBubble();
    const { canvas, w, h } = bubbleCanvas(text);
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.generateMipmaps = false; tex.minFilter = THREE.LinearFilter;
    const mat = new THREE.SpriteMaterial({ map: tex, depthTest: false, transparent: true });
    const sprite = new THREE.Sprite(mat);
    sprite.center.set(0.5, 0); // the tail's tip sits on the point we position
    sprite.renderOrder = 11;
    this.group.add(sprite);
    this.bubble = { sprite, mat, tex, w, h, t: 0, life: Math.min(7, 2.6 + text.length * 0.05) };
    this.stepBubble(0);
  }
  clearBubble() {
    const b = this.bubble;
    if (!b) return;
    this.group.remove(b.sprite);
    b.tex.dispose(); b.mat.dispose();
    this.bubble = null;
    if (this.eatT < 0) this.setMouth(0);
  }
  stepBubble(dt) {
    const b = this.bubble;
    if (!b) return;
    if ((b.t += dt) >= b.life) { this.clearBubble(); return; }
    // the mouth flaps while they talk (the bite animation owns it while they eat)
    if (this.eatT < 0) this.setMouth(0.1 + Math.abs(Math.sin(b.t * 13 + this.name.length)) * Math.abs(Math.sin(b.t * 5.3)) * 0.8);
    // natural size up close; beyond 3m it grows with distance (up to 2.2x) so the text stays readable
    const k = eye ? Math.min(2.2, Math.max(1, eye.distanceTo(this.group.position) / 3)) : 1;
    b.sprite.scale.set(b.w / BUB.perM * k, b.h / BUB.perM * k, 1);
    b.sprite.position.y = this.tag.position.y + 0.1;
    b.mat.opacity = Math.min(1, (b.life - b.t) / 0.4);
  }

  // seat: { pos: Vector3 (on the floor, under the hips), yaw, pose: 'desk' | 'couch', audio?: 'speakers' | 'headphones', pad?: Object3D to hold } or null to stand
  setSeat(seat) {
    this.seat = seat;
    const P = seat ? POSES[seat.pose ?? 'desk'] : null;
    this.pose = P;
    for (const leg of this.legs) { leg.rotation.x = P ? P.legs : 0; leg.position.y = P ? 0.5 : 0.84; }
    this.torso.position.y = P ? 0.5 : 0.84;
    this.torso.rotation.set(0, 0, 0);
    this.tag.position.y = P ? this.tagY - 0.35 : this.tagY;
    this.armRest = [0, 1].map((i) => (P ? { u: P.arms[i].a, z: P.arms[i].z, f: P.arms[i].b } : { u: 0, z: 0, f: 0 }));
    this.arms.forEach(({ upper, fore }, i) => {
      if (i === 1 && this.eatT >= 0) return;
      upper.rotation.set(this.armBase + this.armRest[i].u, 0, this.armRest[i].z); fore.rotation.set(this.armRest[i].f, 0, 0);
    });
    if (this.pad) { this.group.remove(this.pad); this.pad = null; }
    if (seat?.pad) { this.pad = seat.pad; this.pad.position.set(0, 0.7, -0.25); this.pad.rotation.set(-0.25, 0, 0); this.group.add(this.pad); } // held in both hands
    if (seat) { this.group.position.copy(seat.pos); this.group.rotation.y = seat.yaw; }
    this.syncPhones();
  }

  update(dt, player, t = 0) {
    this.stepEat(dt);
    this.stepFace(dt);
    this.stepBubble(dt);
    this.stepPose(t, dt);
    if (this.seat) return;
    this.target.set(player.x, 0, player.z);
    const before = this.group.position.clone();
    this.group.position.lerp(this.target, Math.min(1, dt * 10));
    // shortest way round to the new heading
    let d = (player.yaw - this.group.rotation.y) % (Math.PI * 2);
    if (d > Math.PI) d -= Math.PI * 2;
    if (d < -Math.PI) d += Math.PI * 2;
    this.group.rotation.y += d * Math.min(1, dt * 10);
    const speed = before.distanceTo(this.group.position) / Math.max(dt, 1e-3);
    if (speed > 0.2) this.walkT += dt * 9; else this.walkT *= 0.8;
    const swing = Math.sin(this.walkT) * Math.min(1, speed / 1.5) * 0.5;
    this.legs[0].rotation.x = swing;
    this.legs[1].rotation.x = -swing;
  }
}

// Where a seated body goes. A desk seat is a station (or anything with a chair and a group): the hips sit a little
// forward of the chair's middle, toward the keyboard. A couch seat is { pose: 'couch', x, z, yaw, pad }.
export function seatFor(spot) {
  if (spot.pose === 'couch') return { pos: new THREE.Vector3(spot.x, 0, spot.z), yaw: spot.yaw, pose: 'couch', pad: spot.pad };
  const pos = spot.chair.getWorldPosition(new THREE.Vector3());
  const yaw = spot.group.rotation.y;
  // the chair faces the desk; the avatar's front is -z, the station's front (toward the chair) is +z
  pos.x -= Math.sin(yaw) * 0.1; pos.z -= Math.cos(yaw) * 0.1;
  return { pos, yaw, pose: 'desk', audio: spot.audio };
}

// A regular who isn't another player: sits where you put him (at a PC or on the couch), plays, and eats and drinks.
const t0 = () => performance.now() / 1000;
export function spawnNpc(scene, { name, color, x, z, yaw, arch, look, seat }) {
  const a = new Avatar({ id: `npc-${name}`, name, color, x, z, yaw }, arch, look);
  scene.add(a.group);
  a.rest = yaw;
  a.phase = (name.length * 1.7) % 6;
  if (seat) a.setSeat(seat);
  let lastT = t0();
  a.idle = (t) => {
    const dt = Math.min(0.1, Math.max(0, t - lastT)); lastT = t;
    a.stepEat(dt); a.stepFace(dt); a.stepBubble(dt);
    if (!a.seat) a.group.rotation.y = a.rest + Math.sin(t * 0.7 + a.phase) * 0.08;
    a.stepPose(t, dt);
  };
  return a;
}

export class Crowd {
  constructor(scene, stations) {
    this.scene = scene;
    this.stations = stations;
    this.avatars = new Map();
  }

  add(player) {
    if (this.avatars.has(player.id)) return;
    const a = new Avatar(player);
    this.avatars.set(player.id, a);
    this.scene.add(a.group);
    this.seat(player);
  }

  say(id, text) { this.avatars.get(id)?.say(text); }

  remove(id) {
    const a = this.avatars.get(id);
    if (!a) return;
    a.clearBubble();
    this.scene.remove(a.group);
    a.group.traverse((o) => { o.geometry?.dispose(); if (o.material?.map) o.material.map.dispose(); });
    this.avatars.delete(id);
  }

  clear() { for (const id of [...this.avatars.keys()]) this.remove(id); }

  seat(player) {
    const a = this.avatars.get(player.id);
    if (!a) return;
    if (player.pc === null || player.pc === undefined) { a.setSeat(null); return; }
    a.setSeat(seatFor(this.stations[player.pc]));
  }

  update(dt, players, t = 0) {
    for (const [id, a] of this.avatars) {
      const p = players.get(id);
      if (p) a.update(dt, p, t);
    }
  }
}

// The man taped to the ceiling: lies face down at the end of the duct, one arm out holding his pizza.
export function spawnTaped(scene, { name, color, x, y, z }) {
  const a = new Avatar({ id: `npc-${name}`, name, color, x, z, yaw: 0 }, 'nerd', {
    hat: { kind: 'cap', color: C.white }, hair: { style: 'short', color: C.hair.brown }, glasses: 'none', facial: 'none', backpack: false,
    top: { color: C.black, sleeves: 0.22, length: 0.56, width: 1.05 }, legs: { color: C.denim, width: 1, short: false }, height: 1.04, build: 1,
  });
  a.group.position.set(x, y, z);
  a.group.rotation.x = -Math.PI / 2; // head toward -z, face to the floor
  a.armBase = 1.35;
  a.arms[0].upper.rotation.x = 1.2;
  a.arms[1].upper.rotation.x = a.armBase;
  a.tag.position.set(0, 0.5, 0.6); // above the body (the group is rotated)
  a.tag.scale.set(0.6 / 1, 0.15, 1);
  a.rest = 0;
  a.phase = 0;
  a.idle = (t) => { const dt = Math.min(0.1, Math.max(0, t - (a.lastT ?? t))); a.stepEat(dt); a.stepFace(dt); a.lastT = t; a.torso.position.y = 0.84 + Math.sin(t * 1.4) * 0.006; };
  scene.add(a.group);
  return a;
}
