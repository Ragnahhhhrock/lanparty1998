// The two BYOC benches on the back table: the spots where you set up the PC you built.
//
// buildBenches(scene, out, env) is called by js/room.js after the power and the network exist. It adds a station for each
// bench to out.stations (index 6 and 7, after the six club PCs), so seating, the crowd, the screens and the party model treat
// it like any other PC once it is running. Until then it is an empty table, a chair, a power board and a wall socket.
//
// A Bench is an EventTarget. The player's own bench is `claim`ed with a build: the parts show as ghost outlines, `place`
// unpacks one, `plug` / `unplug` move the leads (rules in js/bench-plan.js), `powerOn` runs the POST. Another player's
// bench is shown assembled with `showRemote`. Events: 'change' (anything moved), 'poweron', 'booted', 'shutdown'.
import * as THREE from 'three';
import * as T from './textures.js';
import * as P from './power-plan.js';
import { BENCHES, SEAT_BASE, Setup, layoutFor } from './bench-plan.js';
import { postLines, specOf } from './build.js';
import { makeParts, ghostOf, CABLE_COLOURS, TABLE_Y } from './rig.js';

const cordMats = new Map();
const cordMat = (hex) => {
  if (!cordMats.has(hex)) cordMats.set(hex, new THREE.MeshStandardMaterial({ color: hex, roughness: 0.55 }));
  return cordMats.get(hex);
};
const V = (x, y, z) => new THREE.Vector3(x, y, z);
function cord(pts, hex = 0x151515, r = 0.004) {
  const curve = new THREE.CatmullRomCurve3(pts, false, 'centripetal');
  const mesh = new THREE.Mesh(new THREE.TubeGeometry(curve, Math.max(24, pts.length * 14), r, 5), cordMat(hex));
  mesh.userData.curve = curve;
  return mesh;
}
const plugBox = (hex, p, size = [0.02, 0.02, 0.016]) => {
  const m = new THREE.Mesh(new THREE.BoxGeometry(...size), cordMat(hex));
  m.position.copy(p);
  return m;
};
const steel = new THREE.MeshStandardMaterial({ color: 0x6b6b6b, metalness: 0.6, roughness: 0.4 });
const mainsPlug = () => {
  const g = new THREE.Group();
  g.add(new THREE.Mesh(new THREE.BoxGeometry(0.032, 0.046, 0.03), cordMat(0xf2f0e6)));
  g.children[0].position.z = 0.015;
  for (const [x, y, rz] of [[-0.011, 0.01, 0.52], [0.011, 0.01, -0.52], [0, -0.012, 0]]) {
    const pin = new THREE.Mesh(new THREE.BoxGeometry(0.004, 0.016, 0.018), cordMat(0xb8a060));
    pin.position.set(x, y, -0.009); pin.rotation.z = rz;
    g.add(pin);
  }
  return g;
};

// The ports on the back of the tower, in the tower's own space (the tower's middle at x 0.52, rear face at z -0.32)
const REAR_Z = -0.322;
const PORT = {
  vga: [0.46, 0.30], kb: [0.57, 0.37], mouse: [0.50, 0.37], audio: [0.55, 0.30], 'pw-tower': [0.58, 0.40], card: [0.48, 0.12],
};

export class Bench extends EventTarget {
  constructor(scene, out, plan, env) {
    super();
    this.scene = scene; this.out = out; this.plan = plan; this.env = env;
    this.index = SEAT_BASE + plan.id;
    this.owner = null;          // null | 'me' | 'remote'
    this.setup = null; this.build = null;
    this.parts = {}; this.ghosts = {}; this.wires = new Map();
    this.ready = false; this.post = null;

    const g = this.group = new THREE.Group();
    g.position.set(plan.x, 0, plan.z);
    scene.add(g);
    this.wireGroup = new THREE.Group();            // cables are in world space so the hub and the coax can join them
    scene.add(this.wireGroup);

    // persistent bits the rest of the game holds on to
    this.screen = new T.Screen('win98', this.index + 1);
    this.screen.pcNumber = this.index + 1;
    this.screen.setMode('off');
    this.tagTex = T.nameTag(plan.name);
    this.hddMat = new THREE.MeshBasicMaterial({ color: 0x100000 });
    this.pwrMat = new THREE.MeshBasicMaterial({ color: 0x0a2a10 });
    this.boardLed = new THREE.MeshBasicMaterial({ color: 0x2a1408 });
    this.tripPts = [];

    // the table: a chair, a power board on the floor behind it and the wall socket it plugs into
    const chair = env.chair();
    chair.position.set(0, 0, 0.82);
    chair.rotation.y = plan.id ? 0.18 : -0.12;
    g.add(chair);
    const wallZ = P.STATION_WALL_Z;
    this.boardZ = wallZ + P.BOARD_AT.gap;
    const top = new THREE.MeshStandardMaterial({ map: T.powerBoardTop(plan.name), roughness: 0.55 });
    const white = cordMat(0xe9e4d2);
    const board = new THREE.Mesh(new THREE.BoxGeometry(P.BOARD.len, P.BOARD.h, P.BOARD.d), [white, white, top, white, white, white]);
    board.position.set(P.BOARD_AT.x, P.BOARD.h / 2, this.boardZ);
    g.add(board);
    const led = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.002, 0.006), this.boardLed);
    led.position.set(P.BOARD_AT.x + P.BOARD.switchX, P.BOARD.h + 0.001, this.boardZ - 0.03);
    g.add(led);
    const plate = new THREE.Mesh(new THREE.PlaneGeometry(P.PLATE.w, P.PLATE.h), new THREE.MeshStandardMaterial({ map: T.wallSocket(), roughness: 0.5 }));
    plate.position.set(P.BOARD_AT.x, P.SOCKET_Y, wallZ + 0.004);
    g.add(plate);

    // the station the rest of the game sees
    const st = this.station = {
      index: this.index, name: plan.name, group: g, screen: this.screen, bench: this, idle: 'win98', audio: 'speakers',
      monitor: null, tower: { group: null, hdd: { material: this.hddMat }, power: { material: this.pwrMat } },
      seatTarget: new THREE.Object3D(), cableStart: new THREE.Vector3(), chair, deskPhones: null,
      setTag: (text) => T.nameTag(text, this.tagTex),
    };
    g.add(st.seatTarget);
    st.seatTarget.position.set(0, TABLE_Y + 0.225, -0.12 + 0.157 + 0.36);
    this.glow = out.addGlow(g, { group: { position: V(0, 0, -0.12) } }, true);
    this.glow.on = false;
    out.benchGlows.push({ glow: this.glow, screen: this.screen });
    this.hidePartsForNow();
  }

  get bx() { return this.plan.x; }
  get bz() { return this.plan.z; }
  world(x, y, z) { return V(this.bx + x, y, this.bz + z); }
  now() { return performance.now() / 1000; }

  /* ---------------------------------------------------------------- building the parts */

  hidePartsForNow() { this.station.monitor = { group: new THREE.Group(), screen: new THREE.Mesh(), led: null }; }

  // (re)build every part for a build, all hidden. Ghosts are made for the ones the player unpacks.
  configure(build) {
    this.clearParts();
    this.build = build;
    const { parts, mon, tw, lay } = makeParts(build, this.screen.texture, this.tagTex);
    tw.hdd.material = this.hddMat; tw.power.material = this.pwrMat;
    this.mon = mon; this.tw = tw; this.lay = lay;
    for (const [id, part] of Object.entries(parts)) {
      this.group.add(part);
      this.parts[id] = part;
      part.visible = false;
    }
    for (const [id, part] of Object.entries(parts)) {
      const ghost = ghostOf(part);
      const size = new THREE.Box3().setFromObject(ghost).getSize(V(0, 0, 0));
      if (size.y < 0.03) ghost.scale.y = 0.03 / Math.max(size.y, 0.004);
      ghost.visible = false;
      ghost.traverse((o) => { o.userData.interact = { kind: 'bench-place', bench: this.plan.id, part: id }; });
      this.group.add(ghost);
      this.ghosts[id] = ghost;
    }
    const st = this.station;
    st.monitor = { group: mon.group, screen: mon.screen, led: mon.led };
    st.tower.group = tw.group; st.tower.drive = tw.drive;
    st.audio = specOf(build).speakers ? 'speakers' : 'headphones';
    st.seatTarget.position.set(lay.seat.x, TABLE_Y + lay.seat.y, lay.seat.z);
    this.group.updateMatrixWorld(true);
    tw.group.localToWorld(st.cableStart.set(0, 0.06, -0.22));
    this.glow.sprite.position.set(0, TABLE_Y + 0.225 * lay.k, lay.monitor.z + 0.35 * lay.k);
    this.glow.light.position.set(0, TABLE_Y + 0.225 * lay.k, lay.monitor.z + 0.45 * lay.k);
    st.monitor.group.userData.benchPart = true;
  }

  clearParts() {
    for (const o of Object.values(this.parts)) this.group.remove(o);
    for (const o of Object.values(this.ghosts)) { this.group.remove(o); this.setHit(o, false); }
    for (const w of this.wires.values()) this.wireGroup.remove(w.group);
    for (const o of [this.station.monitor?.group, this.tw?.group]) if (o) this.setHit(o, false);
    this.parts = {}; this.ghosts = {}; this.wires.clear(); this.tripPts = [];
    this.removeFloorCable();
  }

  setHit(obj, on) {
    const list = this.out.interactables;
    const i = list.indexOf(obj);
    if (on && i < 0) list.push(obj);
    if (!on && i >= 0) list.splice(i, 1);
  }

  /* ---------------------------------------------------------------- claiming a bench */

  claim(build, net = 'coax') {
    this.release();
    this.owner = 'me';
    this.configure(build);
    this.setup = new Setup(build, net, this.plan);
    this.screen.postInfo = null;
    this.screen.setMode('off');
    this.sync();
  }

  // another player's bench: all of it on the table and cabled up, as they have it
  showRemote(build) {
    this.release();
    this.owner = 'remote';
    this.configure(build);
    const s = this.setup = new Setup(build, 'hub', this.plan);
    for (const p of s.parts()) s.place(p.id);
    let socket = 0;
    for (const c of s.cables()) {
      if (c.group === 'net') continue;
      if (s.plug(c.id, c.group === 'power' && c.id !== 'board' ? socket++ : null)) this.buildWire(c.id);
    }
    this.ready = true;
    this.screen.setMode(this.station.idle);
    this.sync();
  }

  release() {
    if (!this.owner) return;
    this.clearParts();
    this.owner = null; this.setup = null; this.build = null; this.ready = false; this.post = null;
    this.screen.postInfo = null;
    this.screen.setMode('off');
    this.station.monitor = { group: new THREE.Group(), screen: new THREE.Mesh(), led: null };
    this.glow.on = false;
    this.emit('change');
  }

  emit(type, detail) { this.dispatchEvent(new CustomEvent(type, { detail })); }

  /* ---------------------------------------------------------------- what the player does */

  place(id) {
    if (this.owner !== 'me' || !this.setup.place(id)) return false;
    this.sync();
    this.emit('change', { placed: id });
    return true;
  }

  plug(id, where = null) {
    if (this.owner !== 'me') return { ok: false };
    const can = this.setup.canPlug(id);
    if (!can.ok) return can;
    if (id.startsWith('pw-') && (where === null || this.socketUser(where))) return { ok: false, why: 'That socket is taken.' };
    this.setup.plug(id, where);
    this.buildWire(id);
    this.sync();
    this.emit('change', { plugged: id });
    return { ok: true };
  }

  unplug(id) {
    if (this.owner !== 'me') return [];
    const gone = this.setup.unplug(id);
    for (const g of gone) this.dropWire(g);
    this.sync();
    this.emit('change', { unplugged: gone });
    return gone;
  }

  // the tier changed (the hub came): old network leads come out
  setNet(net) {
    if (this.owner !== 'me') return [];
    const gone = this.setup.setNet(net);
    for (const g of gone) this.dropWire(g);
    this.sync();
    this.emit('change', { netChanged: gone });
    return gone;
  }

  socketUser(k) { for (const [id, where] of this.setup.plugged) if (id.startsWith('pw-') && where === k) return id; return null; }

  powerOn() {
    if (this.owner !== 'me' || !this.setup.canBoot()) return false;
    this.setup.poweredOn = true;
    const { lines, seconds } = postLines(this.build);
    this.screen.postInfo = { lines, seconds, start: this.now() };
    this.screen.setMode('post');
    this.post = { end: this.now() + seconds };
    this.sync();
    this.emit('poweron');
    this.emit('change', { powerOn: true });
    return true;
  }

  powerOff(why = 'switch') {
    if (this.owner !== 'me' || !this.setup.poweredOn) return false;
    this.setup.poweredOn = false;
    this.post = null; this.ready = false;
    this.screen.postInfo = null;
    this.screen.setMode('off');
    this.sync();
    this.emit('shutdown', { why });
    this.emit('change', { powerOn: false });
    return true;
  }

  update() {
    if (this.post && this.now() >= this.post.end) {
      this.post = null;
      this.ready = true;
      this.screen.postInfo = null;
      this.screen.setMode(this.station.idle);
      this.sync();
      this.emit('booted');
      this.emit('change', { booted: true });
    }
  }

  // Is the tower getting mains? Running with no power means the box has just died.
  running() { return this.owner === 'me' && this.setup.poweredOn && this.setup.towerPowered(); }

  /* ---------------------------------------------------------------- showing the state */

  sync() {
    const s = this.setup;
    if (this.owner === 'me' && s.poweredOn && !s.towerPowered()) { // somebody pulled the board's plug while it was running
      s.poweredOn = false; this.post = null; this.ready = false;
      this.screen.postInfo = null; this.screen.setMode('off');
      this.emit('shutdown', { why: 'power' });
    }
    const mine = this.owner === 'me', remote = this.owner === 'remote';
    for (const id of Object.keys(this.parts)) {
      const placed = remote || (mine && s.placed.has(id));
      this.parts[id].visible = placed;
      const ghost = this.ghosts[id];
      const show = mine && !placed && (id !== 'audio' || s.spec.speakers || s.placed.has('tower'));
      ghost.visible = show;
      this.setHit(ghost, show);
    }
    // the gear you can use: before it boots the tower and monitor open the back panel; afterwards they are the PC
    const kind = this.ready ? { kind: 'sit', station: this.station } : { kind: 'bench-tower', bench: this.plan.id, station: this.station };
    for (const grp of [this.station.monitor.group, this.station.tower.group]) {
      if (!grp) continue;
      const on = mine && (grp === this.station.monitor.group ? s.placed.has('monitor') : s.placed.has('tower'));
      grp.traverse((o) => { o.userData.interact = kind; });
      this.setHit(grp, on);
    }
    if (this.tw?.drive) {
      const drive = this.tw.drive;
      drive.userData.interact = this.ready ? { kind: 'burner', station: this.station } : kind;
    }
    this.applyPower();
  }

  // screen, LEDs and glow follow what is plugged in
  applyPower() {
    const s = this.setup;
    const remote = this.owner === 'remote';
    const lit = remote || (!!s && s.placed.has('monitor') && s.monitorPowered() && s.plugged.has('vga'));
    if (this.mon) {
      this.mon.screen.material.color.setHex(lit ? 0xffffff : 0x040404);
      this.mon.led.material.color.setHex(remote || (s && s.monitorPowered()) ? 0x3cff5a : 0x0a2a10);
    }
    const on = remote || (!!s && s.towerPowered() && s.poweredOn);
    this.pwrMat.color.setHex(on ? 0x33ff55 : 0x0a2a10);
    this.boardLed.color.setHex(remote || (s && s.boardInWall()) ? 0xff6a1a : 0x2a1408);
    this.glow.on = lit;
    this.updateFloorCable();
  }

  /* ---------------------------------------------------------------- the leads */

  dropWire(id) {
    const w = this.wires.get(id);
    if (!w) return;
    this.wireGroup.remove(w.group);
    this.wires.delete(id);
    if (id === 'cat5-hub' || id === 'cat5-card') this.removeFloorCable();
    if (id.startsWith('coax')) this.out.setBenchCoax?.(this.plan.id, this.coaxThrough(), this.coaxStubs());
  }

  coaxThrough() { return !!this.setup && this.setup.plugged.has('coax-l') && this.setup.plugged.has('coax-r'); }

  // the T-connector's place on the card, in the room
  tPos() { return this.world(PORT.card[0], TABLE_Y + PORT.card[1], REAR_Z - 0.01); }

  buildWire(id) {
    const s = this.setup, k = this.lay.k, L = this.lay;
    const where = s.plugged.get(id);
    const g = new THREE.Group();
    const at = (p) => this.world(p.x, p.y, p.z);
    const wp = (x, y, z) => at({ x, y, z });
    const port = (name) => wp(PORT[name][0], TABLE_Y + PORT[name][1], REAR_Z);
    const TY = TABLE_Y;
    const col = CABLE_COLOURS;
    const add = (...o) => o.forEach((m) => g.add(m));
    const bz = this.boardZ;
    const socketTop = (n) => wp(P.BOARD_AT.x + P.BOARD.sockets[n], P.BOARD.h + 0.036, bz - 0.01);
    const socketPlug = (n) => {
      const p = mainsPlug();
      p.rotation.x = -Math.PI / 2;
      p.position.copy(wp(P.BOARD_AT.x + P.BOARD.sockets[n], P.BOARD.h, bz - 0.01));
      return p;
    };
    const mains = (from, n) => { // down over the table's edge and along the floor to socket n
      const end = socketTop(n);
      const fx = from.x - this.bx;
      const ex = end.x - this.bx;
      add(cord([from, from.clone().add(V(0, -0.04, -0.07)), wp(fx, TY - 0.14, -0.43),
        wp((fx + ex) / 2, 0.22, (-0.43 + bz) / 2), wp(ex + (fx - ex) * 0.1, 0.09, bz - 0.03), end], 0x151515), socketPlug(n));
    };
    switch (id) {
      case 'vga': {
        const a = wp(0, TY + 0.08 * k, -0.462), b = port('vga');
        add(cord([a, wp(0, TY + 0.012, -0.375), wp(0.15, TY + 0.006, -0.36), wp(0.38, TY + 0.006, -0.345), wp(0.45, TY + 0.15, -0.335), b], col.vga), plugBox(col.vga, b));
        break;
      }
      case 'kb': {
        const a = wp(L.keyboard.x + 0.12, TY + 0.012, L.keyboard.z - 0.09), b = port('kb');
        add(cord([a, wp(0.3, TY + 0.006, 0.05), wp(0.40, TY + 0.006, 0.0), wp(0.40, TY + 0.006, -0.2), wp(0.42, TY + 0.006, -0.34), wp(0.52, TY + 0.2, -0.335), b], col.kb), plugBox(col.kb, b, [0.014, 0.014, 0.014]));
        break;
      }
      case 'mouse': {
        const a = wp(L.mouse.x, TY + 0.016, L.mouse.z - 0.05), b = port('mouse');
        add(cord([a, wp(0.41, TY + 0.006, 0.1), wp(0.41, TY + 0.006, -0.1), wp(0.415, TY + 0.006, -0.3), wp(0.47, TY + 0.2, -0.335), b], col.mouse), plugBox(col.mouse, b, [0.014, 0.014, 0.014]));
        break;
      }
      case 'audio': {
        const b = port('audio');
        if (s.spec.speakers) {
          const sp = L.speakers.x;
          add(cord([wp(-sp, TY + 0.15, -0.156), wp(-sp, TY + 0.006, -0.2), wp(-0.1, TY + 0.006, -0.36), wp(0.3, TY + 0.006, -0.36), wp(0.5, TY + 0.012, -0.35), wp(0.55, TY + 0.2, -0.335), b], col.audio), plugBox(col.audio, b, [0.012, 0.012, 0.012]));
          add(cord([wp(-sp, TY + 0.15, -0.156), wp(0, TY + 0.14, -0.2), wp(sp, TY + 0.15, -0.156)], col.audio));
        } else {
          add(cord([wp(0.52, TY + 0.47, -0.1), wp(0.63, TY + 0.45, -0.1), wp(0.64, TY + 0.3, -0.2), wp(0.6, TY + 0.3, -0.3), b], col.audio), plugBox(col.audio, b, [0.012, 0.012, 0.012]));
        }
        break;
      }
      case 'pw-mon': mains(wp(0, TY + 0.12 * k, -0.462), where); break;
      case 'pw-tower': mains(port('pw-tower'), where); break;
      case 'pw-spk': mains(wp(L.speakers.x, TY + 0.05, -0.156), where); break;
      case 'board': {
        const e = wp(P.BOARD_AT.x + P.BOARD.len / 2, 0.012, bz);
        const wall = wp(P.BOARD_AT.x, P.SOCKET_Y, P.STATION_WALL_Z + 0.036);
        const plug = mainsPlug();
        plug.position.copy(wp(P.BOARD_AT.x, P.SOCKET_Y, P.STATION_WALL_Z + 0.004));
        add(cord([e, wp(P.BOARD_AT.x + P.BOARD.len / 2 + 0.07, 0.008, bz - 0.04), wp(P.BOARD_AT.x + 0.12, 0.12, P.STATION_WALL_Z + 0.07), wall]), plug);
        break;
      }
      case 'coax-t': {
        const t = new THREE.Group();
        t.add(new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.022, 0.022), steel));
        const stem = new THREE.Mesh(new THREE.BoxGeometry(0.022, 0.03, 0.022), steel);
        stem.position.y = 0.02;
        t.add(stem);
        t.position.copy(this.tPos());
        add(t);
        break;
      }
      case 'coax-l':
      case 'coax-r': {
        const nb = this.out.stations[this.plan.neighbours[id === 'coax-l' ? 0 : 1]];
        const a = nb.cableStart.clone(), b = this.tPos();
        const mid = (a.x + b.x) / 2;
        const lowZ = Math.min(a.z, b.z) - 0.14;
        add(cord([a, V(a.x + Math.sign(b.x - a.x) * 0.04, a.y - 0.08, a.z - 0.1), V(mid, a.y - 0.1, lowZ), V(b.x - Math.sign(b.x - a.x) * 0.04, b.y - 0.06, b.z - 0.1), b], 0x151515, 0.006));
        g.userData.stub = true;
        break;
      }
      case 'cat5-card': {
        const a = this.tPos();
        const pts = [a, V(a.x + 0.02, a.y - 0.1, a.z - 0.08), V(a.x + 0.1, 0.012, a.z - 0.2), V(a.x + 0.25, 0.012, a.z - 0.15)];
        add(cord(pts, 0xe8c21b), plugBox(0xe8c21b, a, [0.014, 0.014, 0.014]));
        g.userData.stub = true;
        break;
      }
      case 'cat5-hub': {
        const s0 = this.tPos();
        const n = 6 + this.plan.id;
        const hubPort = V(-5.38, TABLE_Y + 0.02, 1.0);
        const pts = [s0, V(s0.x, 0.4, s0.z - 0.25), V(s0.x + 0.1, 0.012, s0.z - 0.35), V(-4.8 + n * 0.03, 0.012, s0.z * 0.55 + n * 0.04), V(-5.05, 0.012, 0.9 + n * 0.03), V(-5.12, 0.4, 0.98), hubPort];
        const lead = cord(pts, 0xd23c3c);
        add(lead, plugBox(0xd23c3c, s0, [0.014, 0.014, 0.014]));
        this.wires.get('cat5-card')?.group && (this.wires.get('cat5-card').group.visible = false);
        this.floorCable = { pc: this.index, kind: 'cat5', pts: lead.userData.curve.getPoints(120).filter((p) => p.y < 0.05), active: () => !!this.setup?.plugged.has('cat5-hub') };
        this.out.floorCables.push(this.floorCable);
        break;
      }
      default: break;
    }
    this.wireGroup.add(g);
    this.wires.set(id, { group: g });
    if (id.startsWith('coax')) this.out.setBenchCoax?.(this.plan.id, this.coaxThrough(), this.coaxStubs());
  }

  coaxStubs() { return this.setup ? { l: this.setup.plugged.has('coax-l'), r: this.setup.plugged.has('coax-r') } : { l: false, r: false }; }

  updateFloorCable() {
    const full = this.setup?.plugged.has('cat5-hub');
    const card = this.wires.get('cat5-card');
    if (card) card.group.visible = !full;
    // when the bus runs through the bench the stubs would double the cable up
    const through = this.coaxThrough();
    for (const id of ['coax-l', 'coax-r']) {
      const w = this.wires.get(id);
      if (w) w.group.visible = !through;
    }
  }

  removeFloorCable() {
    if (!this.floorCable) return;
    const i = this.out.floorCables.indexOf(this.floorCable);
    if (i >= 0) this.out.floorCables.splice(i, 1);
    this.floorCable = null;
  }

  // A lead that has been tripped out of the back of the box, or a T-connector that has come loose
  setLoose(loose) {
    const hub = this.wires.get('cat5-hub'), t = this.wires.get('coax-t');
    if (hub) hub.group.visible = !loose;
    if (t) { t.group.rotation.z = loose ? 0.9 : 0; t.group.position.y = loose ? -0.03 : 0; }
  }
}

export function buildBenches(scene, out, env) {
  out.benchGlows = [];
  out.benches = BENCHES.map((plan) => new Bench(scene, out, plan, env));
  for (const b of out.benches) {
    out.stations.push(b.station);
    out.screens.push(b.screen);
    out.hddLeds.push({ material: b.hddMat });
  }
  const baseSetPower = out.setPower, baseSetLoose = out.setLoose;
  out.setPower = (i, on) => (i < SEAT_BASE ? baseSetPower(i, on) : out.benches[i - SEAT_BASE].applyPower());
  out.setLoose = (i, loose) => (i < SEAT_BASE ? baseSetLoose(i, loose) : out.benches[i - SEAT_BASE].setLoose(loose));
  out.updateBenches = () => { for (const b of out.benches) b.update(); };
  return out.benches;
}
