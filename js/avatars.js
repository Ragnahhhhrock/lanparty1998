// Other people in the basement: blocky LAN-party regulars dressed as 90s teens (goths, surfers,
// hip hop kids, ravers, grunge kids and nerds), each with their own height, hair and face,
// with their handle floating overhead. They glide toward the latest position the
// server sent and drop into the chair when they sit at a PC.
import * as THREE from 'three';

// colours are tokens from css/tokens.css (--skin-N, --hair-*, --clothes-*, --neon-*, --denim, --shoe, --shirt-N)
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
  neon: [0x39ff14, 0xff2d95, 0x19d3ff],
  shirts: [0xe2231a, 0x2b6fd6, 0xe8c21b, 0x3aa35a, 0x9b4dca, 0xf28a1c, 0x20b2aa, 0xd94f8a], // --shirt-1..8
};

function box(w, h, d, m, x, y, z) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);
  mesh.position.set(x, y, z);
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
  return L;
}

// Builds the blocky body from a look. Returns the pieces the Avatar animates.
function buildBody(look) {
  const body = new THREE.Group();
  body.scale.set(look.build, look.height, look.build);
  const skin = mat(look.skin);
  const topM = mat(look.top.color);
  const legM = mat(look.legs.color);
  const legs = [];

  // legs pivot at the hip so sitting just swings them forward
  const lw = 0.15 * look.legs.width;
  for (const sx of [-1, 1]) {
    const hip = new THREE.Group();
    hip.position.set(sx * (0.06 + lw / 2 + 0.01), 0.84, 0);
    if (look.legs.short) {
      hip.add(box(lw, 0.42, lw + 0.02, legM, 0, -0.21, 0));
      hip.add(box(0.12, 0.38, 0.13, skin, 0, -0.61, 0));
    } else hip.add(box(lw, 0.8, lw + 0.02, legM, 0, -0.4, 0));
    const sh = look.shoes;
    if (sh.kind === 'bare') hip.add(box(0.12, 0.05, 0.22, skin, 0, -0.815, -0.05));
    else if (sh.kind === 'sandal') { hip.add(box(0.12, 0.03, 0.24, mat(C.shoe), 0, -0.825, -0.05)); hip.add(box(0.12, 0.03, 0.12, skin, 0, -0.8, -0.05)); }
    else if (sh.kind === 'boot') { hip.add(box(0.15, 0.18, 0.27, mat(sh.color), 0, -0.73, -0.05)); }
    else if (sh.kind === 'chunky') hip.add(box(0.17, 0.12, 0.3, mat(sh.color), 0, -0.76, -0.06));
    else hip.add(box(Math.max(0.15, lw * 0.8), 0.07, 0.26, mat(sh.color), 0, -0.81, -0.05));
    body.add(hip);
    legs.push(hip);
  }

  const torso = new THREE.Group();
  torso.position.y = 0.84;
  const tw = 0.42 * look.top.width, th = 0.56; // th: shoulder height above the hip; top.length: how far the shirt hangs
  torso.add(box(tw, look.top.length, 0.22, topM, 0, th - look.top.length / 2, 0));
  // arms hang from the shoulder with an elbow, so they can lift a slice of pizza to the mouth.
  // sleeves is the sleeve length down from the shoulder; the rest of the arm is bare.
  const arms = [];
  for (const sx of [-1, 1]) {
    const sl = look.top.sleeves, ax = sx * (tw / 2 + 0.065);
    const upper = new THREE.Group(); upper.position.set(ax, 0.52, 0);
    const fore = new THREE.Group(); fore.position.y = -0.25; upper.add(fore);
    const limb = (from, to, m, w) => { // from/to: distance down the arm
      for (const [seg, parent, off] of [[[0, 0.25], upper, 0], [[0.25, 0.5], fore, 0.25]]) {
        const a0 = Math.max(from, seg[0]), a1 = Math.min(to, seg[1]);
        if (a1 - a0 > 0.001) parent.add(box(w, a1 - a0, w + 0.02, m, 0, -((a0 + a1) / 2 - off), 0));
      }
    };
    const sleeveM = look.coat ? mat(C.black) : topM;
    limb(0, sl, sleeveM, 0.12); limb(sl, 0.5, skin, 0.1);
    if (look.glow) fore.add(box(0.035, 0.2, 0.035, mat(C.neon[sx > 0 ? 1 : 0], { basic: true }), 0, -0.2, -0.09));
    torso.add(upper);
    arms.push({ upper, fore });
  }
  if (look.coat) { // trench coat: long, open at the front, collar up
    const coat = mat(C.black);
    torso.add(box(tw + 0.06, th + 0.2, 0.3, coat, 0, th / 2 - 0.12, 0.02));
    torso.add(box(tw + 0.2, 0.34, 0.28, coat, 0, -0.3, 0.02));
    torso.add(box(0.12, th + 0.3, 0.02, topM, 0, th / 2 - 0.1, -0.15)); // the band tee showing in the gap
    torso.add(box(tw + 0.1, 0.1, 0.28, coat, 0, th + 0.01, 0));        // collar
  }
  if (look.chain) {
    torso.add(box(0.2, 0.025, 0.02, mat(C.amber), 0, th - 0.1, -0.125));
    torso.add(box(0.05, 0.06, 0.02, mat(C.amber), 0, th - 0.17, -0.13));
  }
  if (look.beads) torso.add(box(0.2, 0.025, 0.2, mat(C.white), 0, th + 0.02, 0));
  if (look.wallet) torso.add(box(0.02, 0.2, 0.02, mat(C.amber), tw / 2 + 0.005, -0.05, -0.1));
  if (look.backpack) torso.add(box(0.28, 0.34, 0.12, mat(look.arch === 'raver' ? C.neon[0] : C.shirts[1]), 0, 0.3, 0.17));

  // head
  const headY = th + 0.14;
  torso.add(box(0.22, 0.24, 0.22, skin, 0, headY, 0));
  for (const sx of [-1, 1]) torso.add(box(0.03, 0.03, 0.01, mat(C.dark, { basic: true }), sx * 0.05, headY + 0.02, -0.112));
  const hairM = mat(look.hair.color);
  const hy = headY + 0.12;
  const h = look.hair;
  if (!look.hat || look.hat.kind === 'cap') {
    if (h.style === 'short') torso.add(box(0.24, 0.07, 0.24, hairM, 0, hy, 0.01));
    if (h.style === 'buzz') torso.add(box(0.23, 0.03, 0.23, hairM, 0, hy - 0.01, 0));
    if (h.style === 'spiky') for (let i = -2; i <= 2; i++) for (const z of [-0.05, 0.05]) torso.add(box(0.05, 0.12 + ((i + 4) % 3) * 0.04, 0.05, hairM, i * 0.045, hy + 0.04, z));
    if (h.style === 'mohawk') torso.add(box(0.05, 0.16, 0.24, hairM, 0, hy + 0.06, 0));
    if (h.style === 'long' || h.style === 'curtains' || h.style === 'shaggy') {
      torso.add(box(0.25, 0.07, 0.25, hairM, 0, hy, 0.01));
      torso.add(box(0.25, h.style === 'long' ? 0.36 : 0.2, 0.05, hairM, 0, headY + (h.style === 'long' ? -0.02 : 0.04), 0.125));
      for (const sx of [-1, 1]) torso.add(box(0.03, h.style === 'long' ? 0.3 : 0.18, 0.2, hairM, sx * 0.12, headY + (h.style === 'long' ? 0.0 : 0.05), 0.01));
      if (h.style === 'curtains' || h.style === 'shaggy') torso.add(box(0.24, 0.05, 0.03, hairM, 0, hy - 0.03, -0.12)); // fringe
    }
  }
  if (look.hat) {
    const hm = mat(look.hat.color);
    if (look.hat.kind === 'cap') { torso.add(box(0.25, 0.07, 0.25, hm, 0, hy + 0.02, 0)); torso.add(box(0.2, 0.015, 0.1, hm, 0, hy - 0.01, 0.17)); } // worn backwards
    if (look.hat.kind === 'bucket') { torso.add(box(0.25, 0.1, 0.25, hm, 0, hy + 0.03, 0)); torso.add(box(0.34, 0.015, 0.34, hm, 0, hy - 0.02, 0)); }
    if (look.hat.kind === 'beanie') torso.add(box(0.25, 0.1, 0.25, hm, 0, hy + 0.02, 0));
  }
  // facial hair and glasses
  const fh = mat(look.hair.color);
  const f = look.facial;
  if (f === 'stubble') torso.add(box(0.225, 0.08, 0.005, mat(look.hair.color, { mat: { transparent: true, opacity: 0.45 } }), 0, headY - 0.07, -0.113));
  if (f === 'goatee') torso.add(box(0.07, 0.07, 0.02, fh, 0, headY - 0.09, -0.115));
  if (f === 'soulpatch') torso.add(box(0.03, 0.03, 0.02, fh, 0, headY - 0.075, -0.115));
  if (f === 'moustache') torso.add(box(0.11, 0.025, 0.02, fh, 0, headY - 0.045, -0.115));
  if (f === 'beard') { torso.add(box(0.23, 0.11, 0.04, fh, 0, headY - 0.09, -0.105)); for (const sx of [-1, 1]) torso.add(box(0.02, 0.12, 0.16, fh, sx * 0.115, headY - 0.06, -0.03)); }
  if (look.glasses === 'shades') torso.add(box(0.2, 0.04, 0.012, mat(C.dark, { basic: true }), 0, headY + 0.02, -0.116));
  if (look.glasses === 'round') for (const sx of [-1, 1]) torso.add(box(0.07, 0.07, 0.012, mat(C.dark, { basic: true, mat: { wireframe: true } }), sx * 0.05, headY + 0.02, -0.116));

  body.add(torso);
  return { body, legs, torso, arms, headTop: (0.84 + headY + 0.2) * look.height };
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

const EAT = { raise: 0.8, bite: 0.7, lower: 0.7, total: 0.8 + 3 * 0.7 + 0.7 };
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

class Avatar extends EventTarget {
  constructor(player, force, override) {
    super();
    this.id = player.id;
    this.group = new THREE.Group();
    this.look = Object.assign(lookFor(player.id ?? player.name, { force, shirt: player.color }), override);
    const b = buildBody(this.look);
    this.group.add(b.body);
    this.legs = b.legs;
    this.torso = b.torso;
    this.arms = b.arms;
    this.eatT = -1; // seconds into eating a slice, or -1
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
  }

  // Eat a slice of pizza: lift it to the mouth, take three bites, lower the hand.
  eat() {
    if (this.eatT >= 0) return;
    this.eatT = 0;
    if (!this.slice) {
      this.slice = sliceMesh();
      this.slice.position.set(0, -0.27, -0.03);
      this.arms[1].fore.add(this.slice);
    }
    this.slice.visible = true; this.slice.scale.setScalar(1);
  }
  stepEat(dt) {
    if (this.eatT < 0) return;
    this.eatT += dt;
    const T = this.eatT, D = EAT.total, k = Math.min(1, T / EAT.raise, (D - T) / EAT.lower + 0.0001);
    const lift = Math.max(0, Math.min(1, k));
    const bites = Math.max(0, Math.min(3, Math.floor((T - EAT.raise) / EAT.bite)));
    const nibble = T > EAT.raise && T < D - EAT.lower ? Math.sin(((T - EAT.raise) % EAT.bite) / EAT.bite * Math.PI) * 0.12 : 0;
    const { upper, fore } = this.arms[1];
    upper.rotation.x = this.armBase + (1.0 - this.armBase) * lift;
    fore.rotation.x = 3.3 * lift - nibble;
    this.slice.scale.setScalar(1 - bites * 0.3);
    if (T >= D) { this.eatT = -1; upper.rotation.x = this.armBase; fore.rotation.x = 0; this.slice.visible = false; this.dispatchEvent?.(new Event('ate')); }
  }

  setSeat(seat) {
    this.seat = seat; // { pos: Vector3 (chair, floor level), yaw } or null
    const sitting = !!seat;
    for (const leg of this.legs) leg.rotation.x = sitting ? Math.PI / 2 : 0;
    this.torso.position.y = sitting ? 0.5 : 0.84;
    for (const leg of this.legs) leg.position.y = sitting ? 0.5 : 0.84;
    this.tag.position.y = sitting ? this.tagY - 0.35 : this.tagY;
    if (seat) { this.group.position.copy(seat.pos); this.group.rotation.y = seat.yaw; }
  }

  update(dt, player) {
    this.stepEat(dt);
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

// A regular who isn't another player: stands where you put him and rocks gently on his heels.
const t0 = () => performance.now() / 1000;
export function spawnNpc(scene, { name, color, x, z, yaw, arch, look }) {
  const a = new Avatar({ id: `npc-${name}`, name, color, x, z, yaw }, arch, look);
  scene.add(a.group);
  a.rest = yaw;
  a.phase = (name.length * 1.7) % 6;
  const dance = { raver: 1.7, hiphop: 1.2, surfer: 1, grunge: 0.8, nerd: 0.5, goth: 0.4 }[a.look.arch];
  // groove is 0..1 loudness from the music, bpm the tempo: everyone nods along, ravers more than goths
  let lastT = t0();
  a.idle = (t, groove = 0, bpm = 120) => {
    a.stepEat(Math.min(0.1, Math.max(0, t - lastT))); lastT = t;
    a.group.rotation.y = a.rest + Math.sin(t * 0.7 + a.phase) * 0.08;
    const beat = Math.abs(Math.sin(t * Math.PI * bpm / 120 + a.phase));
    a.torso.position.y = 0.84 + beat * groove * dance * 0.025;
    a.torso.rotation.z = Math.sin(t * Math.PI * bpm / 240 + a.phase) * groove * dance * 0.08;
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

  remove(id) {
    const a = this.avatars.get(id);
    if (!a) return;
    this.scene.remove(a.group);
    a.group.traverse((o) => { o.geometry?.dispose(); if (o.material?.map) o.material.map.dispose(); });
    this.avatars.delete(id);
  }

  clear() { for (const id of [...this.avatars.keys()]) this.remove(id); }

  seat(player) {
    const a = this.avatars.get(player.id);
    if (!a) return;
    if (player.pc === null || player.pc === undefined) { a.setSeat(null); return; }
    const st = this.stations[player.pc];
    const pos = st.chair.getWorldPosition(new THREE.Vector3());
    // chairs face the desk; the avatar's front is -z, the station's front (toward the chair) is +z
    a.setSeat({ pos, yaw: st.group.rotation.y });
  }

  update(dt, players) {
    for (const [id, a] of this.avatars) {
      const p = players.get(id);
      if (p) a.update(dt, p);
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
  a.idle = (t) => { a.stepEat(Math.min(0.1, Math.max(0, t - (a.lastT ?? t)))); a.lastT = t; a.torso.position.y = 0.84 + Math.sin(t * 1.4) * 0.006; };
  scene.add(a.group);
  return a;
}
