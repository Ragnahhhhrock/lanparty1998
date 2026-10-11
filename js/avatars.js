// Other people in the basement: blocky LAN-party regulars in band tees and jeans,
// with their handle floating overhead. They glide toward the latest position the
// server sent and drop into the chair when they sit at a PC.
import * as THREE from 'three';

// colours are tokens from css/tokens.css (--skin, --denim, --shoe, --hair, --shirt-N)
const skin = new THREE.MeshStandardMaterial({ color: 0xe0b48f, roughness: 0.8 });
const denim = new THREE.MeshStandardMaterial({ color: 0x2c3e66, roughness: 0.9 });
const shoe = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.7 });
const hair = new THREE.MeshStandardMaterial({ color: 0x3b2716, roughness: 1 });
const shades = new THREE.MeshBasicMaterial({ color: 0x0a0a0a }); // --w98-dark

function box(w, h, d, mat, x, y, z) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.position.set(x, y, z);
  return m;
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

class Avatar {
  constructor(player) {
    this.id = player.id;
    this.group = new THREE.Group();
    const shirt = new THREE.MeshStandardMaterial({ color: new THREE.Color(player.color), roughness: 0.85 });

    // legs pivot at the hip so sitting just swings them forward
    this.legs = [];
    for (const sx of [-1, 1]) {
      const hip = new THREE.Group();
      hip.position.set(sx * 0.1, 0.84, 0);
      hip.add(box(0.15, 0.8, 0.17, denim, 0, -0.4, 0));
      hip.add(box(0.15, 0.07, 0.26, shoe, 0, -0.81, -0.05));
      this.group.add(hip);
      this.legs.push(hip);
    }
    this.torso = new THREE.Group();
    this.torso.position.y = 0.84;
    this.torso.add(box(0.42, 0.56, 0.22, shirt, 0, 0.28, 0));
    for (const sx of [-1, 1]) this.torso.add(box(0.11, 0.5, 0.12, shirt, sx * 0.27, 0.27, 0));
    this.torso.add(box(0.22, 0.24, 0.22, skin, 0, 0.7, 0));
    this.torso.add(box(0.24, 0.07, 0.24, hair, 0, 0.84, 0.01));
    this.torso.add(box(0.2, 0.03, 0.01, shades, 0, 0.72, -0.112)); // shades, obviously
    this.group.add(this.torso);
    this.tag = label(player.name, player.color);
    this.tag.position.y = 2.0;
    this.group.add(this.tag);

    this.target = new THREE.Vector3(player.x ?? 0, 0, player.z ?? 1.2);
    this.group.position.copy(this.target);
    this.yaw = player.yaw ?? 0;
    this.group.rotation.y = this.yaw;
    this.seat = null;
    this.walkT = 0;
  }

  setSeat(seat) {
    this.seat = seat; // { pos: Vector3 (chair, floor level), yaw } or null
    const sitting = !!seat;
    for (const leg of this.legs) leg.rotation.x = sitting ? Math.PI / 2 : 0;
    this.torso.position.y = sitting ? 0.5 : 0.84;
    for (const leg of this.legs) leg.position.y = sitting ? 0.5 : 0.84;
    this.tag.position.y = sitting ? 1.65 : 2.0;
    if (seat) { this.group.position.copy(seat.pos); this.group.rotation.y = seat.yaw; }
  }

  update(dt, player) {
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
export function spawnNpc(scene, { name, color, x, z, yaw }) {
  const a = new Avatar({ id: `npc-${name}`, name, color, x, z, yaw });
  scene.add(a.group);
  a.rest = yaw;
  a.idle = (t) => { a.group.rotation.y = a.rest + Math.sin(t * 0.7) * 0.08; };
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
