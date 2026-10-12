// Power: wall sockets, power boards and the leads between them, the extension lead across the aisle,
// the light switch, and the glow a CRT throws when the ceiling lights are off.
// The layout is in js/power-plan.js (pure data); the rules (what loses power) are in js/party.js.
//
// buildPower(scene, out, env) adds to the room and puts on `out`:
//   out.setPower(i, on)       a PC's screen, LEDs and glow, on or off (the six club PCs; js/bench.js wraps it for the benches)
//   out.addGlow(g, mon, light) a CRT's glow, for the BYOC benches
//   out.setLead(plugged)      the extension lead: plugged into the wall, or lying on the floor with the plug out
//   out.updatePower(dt)       fades the room between lit and dark, flickers the tubes, drives the CRT glow
//   out.setLights(on, instant), out.toggleLights(), out.lightsOn
//   out.floorCables           gets a 'lead' entry, for tripping over
//   out.interactables         gets the light switch and, over the aisle stretch, the lead (when it's out)
import * as THREE from 'three';
import * as T from './textures.js';
import * as P from './power-plan.js';

const mat = (hex, o = {}) => new THREE.MeshStandardMaterial({ color: hex, roughness: 0.6, ...o });
const box = (w, h, d, m, x = 0, y = 0, z = 0) => { const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); b.position.set(x, y, z); return b; };

// tokens: --power-cord (leads), --power-plug (plugs, plates), --power-brass (pins), --power-lead (the extension lead), --power-board (power boards)
const cordMat = mat(0x151515, { roughness: 0.5 });
const plugMat = mat(0xf2f0e6);
const pinMat = mat(0xb8a060, { metalness: 0.8, roughness: 0.35 });
const yellowMat = mat(0xe8c21b, { roughness: 0.55 });
const boardMat = mat(0xe9e4d2);

function cord(pts, mat_ = cordMat, r = 0.004) {
  const curve = new THREE.CatmullRomCurve3(pts.map((p) => (p.isVector3 ? p : new THREE.Vector3(...p))), false, 'centripetal');
  return new THREE.Mesh(new THREE.TubeGeometry(curve, Math.max(24, pts.length * 14), r, 5), mat_);
}

// A mains plug: body, three pins. Local -z is the pin side, +z the cord side.
function plug(body = plugMat) {
  const g = new THREE.Group();
  g.add(box(0.032, 0.046, 0.03, body, 0, 0, 0.015));
  for (const [x, y, rz] of [[-0.011, 0.01, 0.52], [0.011, 0.01, -0.52], [0, -0.012, 0]]) {
    const pin = box(0.004, 0.016, 0.018, pinMat, x, y, -0.009);
    pin.rotation.z = rz;
    g.add(pin);
  }
  return g;
}

const plateMat = () => new THREE.MeshStandardMaterial({ map: T.wallSocket(), roughness: 0.5 });
function plate(mt) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(P.PLATE.w, P.PLATE.h), mt);
  return m;
}

export function buildPower(scene, out, env) {
  const { tableY } = env;
  const sharedPlate = plateMat();

  /* ---------- wall points not behind a PC ---------- */
  const at = (spec) => {
    const s = P.socketPose(spec);
    const p = plate(sharedPlate);
    p.position.set(s.x, s.y, s.z); p.rotation.y = s.yaw;
    scene.add(p);
    return s;
  };
  const normal = (s) => new THREE.Vector3(Math.sin(s.yaw), 0, Math.cos(s.yaw));
  const plugInWall = (s) => {
    const pl = plug();
    pl.position.set(s.x, s.y, s.z).addScaledVector(normal(s), 0.004);
    pl.rotation.y = s.yaw;
    scene.add(pl);
    return new THREE.Vector3(s.x, s.y, s.z).addScaledVector(normal(s), 0.036); // where the cord leaves it
  };
  for (const spec of P.SOCKETS.spare) at(spec);

  /* ---------- a power board: lies on the floor, its plug cord leaves one end ---------- */
  const makeBoard = (parent, x, z, tape) => {
    const g = new THREE.Group();
    g.position.set(x, P.BOARD.h / 2, z);
    const top = new THREE.MeshStandardMaterial({ map: T.powerBoardTop(tape), roughness: 0.55 });
    const b = new THREE.Mesh(new THREE.BoxGeometry(P.BOARD.len, P.BOARD.h, P.BOARD.d), [boardMat, boardMat, top, boardMat, boardMat, boardMat]);
    g.add(b);
    const led = new THREE.MeshBasicMaterial({ color: 0xff6a1a });                      // --power-neon
    g.add(box(0.012, 0.002, 0.006, led, P.BOARD.switchX, P.BOARD.h / 2 + 0.001, -0.03));
    parent.add(g);
    const socket = (k) => new THREE.Vector3(P.BOARD.sockets[k], P.BOARD.h / 2, -0.01);          // in the board's space
    const plugIn = (k) => { // a plug seated in socket k; returns where its cord leaves, in the board's space
      const pl = plug();
      pl.rotation.x = -Math.PI / 2;
      pl.position.copy(socket(k));
      g.add(pl);
      return socket(k).add(new THREE.Vector3(0, 0.036, 0));
    };
    return { group: g, led, socket, plugIn };
  };

  /* ---------- the PCs ---------- */
  const rigs = []; // [{ board, mon, tw, wallPlate }]
  const rig = (g, wallZ, mon, tw, tape, wallSocket = true) => {
    const bz = wallZ + P.BOARD_AT.gap;
    const board = makeBoard(g, P.BOARD_AT.x, bz, tape);
    // the wall point behind the board, on every station; the front row's are on the dryer's circuit and stay empty
    const wp = plate(sharedPlate);
    wp.position.set(P.BOARD_AT.x, P.SOCKET_Y, wallZ + 0.004);
    g.add(wp);
    const lay = (k, from) => { // a cord from the back of a device, down over the table's edge to socket k of this board
      const end = board.plugIn(k).add(board.group.position);                  // in the station's space
      return cord([from,
        from.clone().add(new THREE.Vector3(0, -0.04, -0.07)),
        new THREE.Vector3(from.x, tableY - 0.14, -0.43),
        new THREE.Vector3((from.x + end.x) / 2, 0.22, (-0.43 + bz) / 2),
        new THREE.Vector3(end.x + (from.x - end.x) * 0.1, 0.09, end.z - 0.03),
        end]);
    };
    g.add(lay(3, new THREE.Vector3(0.52, tableY + 0.07, -0.325)));            // the tower
    g.add(lay(0, new THREE.Vector3(0, tableY + 0.12, -0.462)));               // the monitor
    let plugRear = null;
    if (wallSocket) {
      const pl = plug();
      pl.position.set(P.BOARD_AT.x, P.SOCKET_Y, wallZ + 0.004);
      g.add(pl);
      plugRear = new THREE.Vector3(P.BOARD_AT.x, P.SOCKET_Y, wallZ + 0.036);
      const e = new THREE.Vector3(P.BOARD_AT.x + P.BOARD.len / 2, 0.012, bz);
      g.add(cord([e, new THREE.Vector3(e.x + 0.07, 0.008, bz - 0.04), new THREE.Vector3(P.BOARD_AT.x + 0.12, 0.12, wallZ + 0.07), plugRear]));
    }
    const r = { board, mon, tw };
    rigs.push(r);
    return r;
  };

  out.stations.forEach((st, i) => {
    rig(st.group, P.STATION_WALL_Z, st.monitor, st.tower, `PC-0${i + 1}`, i < 3);
  });
  for (const gp of out.gamerPcs ?? []) rig(gp.group, gp.wallZ, gp.mon, null, '', true);

  scene.updateMatrixWorld(true);

  /* ---------- the front row: three boards, chained, fed by the extension lead ---------- */
  const [b4, b5, b6] = [3, 4, 5].map((i) => rigs[i].board);
  const worldOf = (b, local) => b.group.localToWorld(local.clone());
  const hop = (from, endX, k) => { // a cord from a board's end to a socket of b5
    const start = worldOf(from, new THREE.Vector3(endX * P.BOARD.len / 2, 0, 0));
    start.y = 0.012;
    const rear = worldOf(b5, b5.plugIn(k));
    scene.add(cord([start, new THREE.Vector3(start.x + Math.sign(rear.x - start.x) * 0.2, 0.008, 4.97), new THREE.Vector3(rear.x, 0.008, 4.97), new THREE.Vector3(rear.x, 0.03, rear.z + 0.04), rear]));
    const pl = plug();                                                            // the plug on this board's end
    pl.position.copy(start).add(new THREE.Vector3(Math.sign(rear.x - start.x) * 0.02, 0.0, 0));
    pl.rotation.y = Math.sign(rear.x - start.x) > 0 ? -Math.PI / 2 : Math.PI / 2;
    scene.add(pl);
  };
  hop(b4, -1, 1); // B4's nearest end faces B5 in the room (the row is turned round)
  hop(b6, 1, 2);
  // B5 into the female end of the extension lead
  const f = P.LEAD_END;
  const block = box(f.len, 0.03, 0.05, yellowMat, f.x, f.y, f.z);
  scene.add(block);
  const b5end = worldOf(b5, new THREE.Vector3(P.BOARD.len / 2, 0, 0)); b5end.y = 0.012;
  scene.add(cord([b5end, new THREE.Vector3(f.x + 0.07, 0.01, f.z), new THREE.Vector3(f.x + 0.01, 0.02, f.z)]));

  /* ---------- the extension lead ---------- */
  const leadSocket = P.socketPose(P.SOCKETS.lead);
  at(P.SOCKETS.lead);
  const plugged = new THREE.Group(), pulled = new THREE.Group();
  scene.add(plugged, pulled);
  const R = P.LEAD_ROUTE.map((p) => new THREE.Vector3(...p));
  const wallPlug = plug(yellowMat);
  wallPlug.position.set(leadSocket.x, leadSocket.y, leadSocket.z + 0.004);
  plugged.add(wallPlug, cord(R, yellowMat, 0.006));
  const outPlug = plug(yellowMat); // lying on the floor a little way out, pins up in the air so nobody knows how it got there
  outPlug.position.set(P.LEAD_X + 0.3, 0.02, -4.62);
  outPlug.rotation.set(0.1, 2.2, Math.PI / 2);
  const R2 = [new THREE.Vector3(P.LEAD_X + 0.3, 0.012, -4.6), new THREE.Vector3(P.LEAD_X + 0.12, 0.009, -4.4), new THREE.Vector3(P.LEAD_X, 0.008, -4.1), ...R.slice(4)];
  pulled.add(outPlug, cord(R2, yellowMat, 0.006));
  out.setLead = (isIn) => { plugged.visible = isIn; pulled.visible = !isIn; };

  // the part of it you can walk over: trips, and plugs it back in once it's out
  const aisle = P.leadTripPoints().filter((p) => p.z > P.LEAD_AISLE.from && p.z < P.LEAD_AISLE.to);
  out.floorCables.push({ pc: null, kind: 'lead', pts: aisle });
  const hit = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.3, P.LEAD_AISLE.to - P.LEAD_AISLE.from), new THREE.MeshBasicMaterial({ visible: false }));
  hit.position.set(P.LEAD_X, 0.15, (P.LEAD_AISLE.to + P.LEAD_AISLE.from) / 2);
  hit.userData.interact = { kind: 'lead' };
  scene.add(hit);
  out.interactables.push(hit);

  /* ---------- the fan, the TV and the snack table ---------- */
  {
    const s = at(P.SOCKETS.fan);                                      // the fan's lead already runs to the wall; plug it in
    const rear = plugInWall(s);
    scene.add(cord([new THREE.Vector3(5.95, 0.012, s.z), new THREE.Vector3(5.88, 0.1, s.z), new THREE.Vector3(5.93, 0.2, s.z), rear]));
  }
  {
    const s = at(P.SOCKETS.tv);                                       // TV and console on a board beside the TV
    const rear = plugInWall(s);
    const b = makeBoard(scene, 5.84, -0.38, '');
    b.group.rotation.y = Math.PI / 2; b.group.updateMatrixWorld(true);
    const bEnd = b.group.localToWorld(new THREE.Vector3(-P.BOARD.len / 2, 0, 0)); bEnd.y = 0.012;
    scene.add(cord([bEnd, new THREE.Vector3(5.93, 0.008, -0.2), new THREE.Vector3(5.93, 0.15, -0.16), rear]));
    scene.add(cord([new THREE.Vector3(5.8, 0.28, -0.85), new THREE.Vector3(5.9, 0.12, -0.7), b.group.localToWorld(b.plugIn(0))]));
  }
  {
    const s = at(P.SOCKETS.snack);                                    // under the snack table: a board, and a lead up to the hub
    const rear = plugInWall(s);
    const b = makeBoard(scene, -5.86, 0.95, '');
    b.group.rotation.y = Math.PI / 2; b.group.updateMatrixWorld(true);
    const bEnd = b.group.localToWorld(new THREE.Vector3(P.BOARD.len / 2, 0, 0)); bEnd.y = 0.012;
    scene.add(cord([bEnd, new THREE.Vector3(-5.93, 0.008, 0.6), new THREE.Vector3(-5.93, 0.15, 0.48), rear]));
    const hubLead = cord([b.group.localToWorld(b.plugIn(0)), new THREE.Vector3(-5.7, 0.3, 0.98), new THREE.Vector3(-5.5, tableY - 0.05, 0.95), new THREE.Vector3(-5.36, tableY + 0.015, 0.93)]);
    scene.add(hubLead);
    const setNet = out.setNetwork;                                    // the hub's power lead only shows with the hub (and the switch)
    out.setNetwork = (tier) => { setNet(tier); hubLead.visible = tier !== 'coax'; };
    out.setNetwork(out.net ?? 'coax');
  }

  /* ---------- the switchboard (decoration, and the reason for the dryer remark) ---------- */
  {
    const g = new THREE.Group();
    g.add(box(0.44, 0.56, 0.05, mat(0x6b6b6b, { metalness: 0.5 })));
    const door = new THREE.Mesh(new THREE.PlaneGeometry(0.4, 0.525), new THREE.MeshStandardMaterial({ map: T.switchboardDoor(), roughness: 0.6 }));
    door.position.z = 0.0255;
    g.add(door);
    g.position.set(-6 + 0.025, 1.55, -3.3);
    g.rotation.y = Math.PI / 2;
    scene.add(g);
  }

  /* ---------- the light switch ---------- */
  const sw = new THREE.Group();
  sw.position.set(P.SWITCH.x, P.SWITCH.y, -5 + 0.006);
  sw.add(box(0.085, 0.125, 0.012, plugMat));
  const rocker = box(0.032, 0.06, 0.012, plugMat, 0, 0, 0.01);
  sw.add(rocker);
  const dot = new THREE.MeshBasicMaterial({ color: 0xffb040 });                          // --power-switch-glow: the little neon you find it by in the dark
  sw.add(box(0.008, 0.008, 0.004, dot, 0.0, 0.048, 0.007));
  const swHit = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.35, 0.25), new THREE.MeshBasicMaterial({ visible: false }));
  swHit.position.z = 0.1;
  sw.add(swHit);
  sw.traverse((o) => { o.userData.interact = { kind: 'switch' }; });
  scene.add(sw);
  out.interactables.push(sw);

  /* ---------- the ceiling lights, and the CRT glow ---------- */
  const ceil = out.ceiling;
  const lit = { hemi: ceil.hemi.intensity, tube: ceil.tubes.map((t) => t.light.intensity) };
  const fixtureLit = new THREE.Color(0xe9f3ff), fixtureOff = new THREE.Color(0x3d4146);  // tube white as in room.js, --power-tube-off
  const halo = T.glowHalo();
  const glows = [];
  const glowFor = (screen) => {
    const live = screen.liveGlow?.();                  // a game being played on it: the colour of the picture
    if (live) return live;
    const key = screen.crashed ? 'dos' : screen.mode;
    return P.GLOW_BY_IDLE[key] ?? P.GLOW_DEFAULT;
  };
  const addGlow = (g, mon, withLight) => {
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: halo, color: 0xaaaaaa, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false }));
    sprite.scale.setScalar(1.0);
    sprite.position.set(mon.group.position.x, tableY + 0.225, mon.group.position.z + 0.35);
    g.add(sprite);
    const spill = new THREE.Mesh(new THREE.PlaneGeometry(1.0, 0.55), new THREE.MeshBasicMaterial({ map: halo, color: 0xaaaaaa, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false }));
    spill.rotation.x = -Math.PI / 2;
    spill.position.set(mon.group.position.x, tableY + 0.006, 0.08);
    g.add(spill);
    let light = null;
    if (withLight) {
      light = new THREE.PointLight(0xaaaaaa, 0, 3.2, 2);
      light.position.set(mon.group.position.x, tableY + 0.225, mon.group.position.z + 0.45);
      g.add(light);
    }
    const o = { sprite, spill, light, on: true };
    glows.push(o);
    return o;
  };
  out.stations.forEach((st, i) => { rigs[i].glow = addGlow(st.group, st.monitor, true); });
  (out.gamerPcs ?? []).forEach((gp, k) => { gp.glow = addGlow(gp.group, gp.mon, false); gp.screen = out.gamerScreens[k]; });

  out.addGlow = addGlow;   // the BYOC benches (js/bench.js) add their own, and out.benchGlows is what updatePower drives for them
  out.setPower = (i, on) => {
    const r = rigs[i];
    if (!r) return;
    r.glow.on = on;
    r.mon.screen.material.color.setHex(on ? 0xffffff : 0x040404);
    r.mon.led?.material.color.setHex(on ? 0x3cff5a : 0x0a2a10);
    r.tw?.power.material.color.setHex(on ? 0x33ff55 : 0x0a2a10);
    r.board.led.color.setHex(on ? 0xff6a1a : 0x2a1408);
  };

  let level = 1, target = 1, flicker = 0, clock = 0;
  out.lightsOn = true;
  out.setLights = (on, instant = false) => {
    if (on === out.lightsOn && !instant) return;
    out.lightsOn = on; target = on ? 1 : 0;
    if (on) flicker = 0.45;
    if (instant) level = target;
    rocker.rotation.x = on ? 0.35 : -0.35;
    rocker.position.y = on ? 0.004 : -0.004;
    dot.color.setHex(on ? 0x6a4a20 : 0xffb040);
  };
  out.toggleLights = () => { out.setLights(!out.lightsOn); return out.lightsOn; };
  out.setLights(true, true);

  out.updatePower = (dt) => {
    clock += dt;
    level += Math.sign(target - level) * Math.min(Math.abs(target - level), dt * 6);
    // a fluorescent tube takes a few tries to catch
    let k = level;
    if (flicker > 0) { flicker -= dt; k = level * (Math.sin(clock * 90) > -0.2 && Math.sin(clock * 37) > -0.5 ? 1 : 0.1); }
    ceil.hemi.intensity = 0.07 + (lit.hemi - 0.07) * k;
    ceil.tubes.forEach((t, n) => {
      t.light.intensity = lit.tube[n] * k;
      t.fixture.material.color.copy(fixtureOff).lerp(fixtureLit, k);
    });
    const dark = 1 - level;
    const apply = (glow, screen) => {
      const [hex, gain] = glowFor(screen);
      const live = glow.on ? 1 : 0;
      glow.sprite.material.color.setHex(hex);
      glow.sprite.material.opacity = live * (0.06 + 0.5 * dark) * Math.min(1.6, gain * 0.7);
      glow.spill.material.color.setHex(hex);
      glow.spill.material.opacity = live * (0.04 + 0.4 * dark) * Math.min(1.6, gain * 0.7);
      if (glow.light) {
        glow.light.color.setHex(hex);
        glow.light.intensity = live * (0.08 + 0.9 * dark) * gain * (1 + 0.03 * Math.sin(clock * 55));
      }
    };
    out.stations.forEach((st, i) => rigs[i]?.glow && apply(rigs[i].glow, st.screen));   // the benches (6, 7) have no rig here
    (out.gamerPcs ?? []).forEach((gp) => gp.screen && apply(gp.glow, gp.screen));
    (out.benchGlows ?? []).forEach((b) => apply(b.glow, b.screen));
  };
  out.updatePower(0);
  out.setLead(true);
}
