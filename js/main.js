// LAN Party '98 — phase 1: walk the room, sit at your PC, play DOOM shareware.
import * as THREE from 'three';
import { buildRoom, ROOM } from './room.js';
import { DosPC } from './emulator.js';
import * as sfx from './sfx.js';

const $ = (id) => document.getElementById(id);
const ui = {
  intro: $('intro'), enter: $('enter-btn'), hud: $('hud'), prompt: $('prompt'), toast: $('toast'),
  caffeine: $('m-caffeine'), snacks: $('m-snacks'), clock: $('clock'),
  monitor: $('monitor'), dos: $('dos'), dust: $('dust'),
  seatedBar: $('seated-bar'), stand: $('stand-btn'), drink: $('drink-btn'), eat: $('eat-btn'), seatedStatus: $('seated-status'),
};

/* ---------- renderer, scene, camera ---------- */
const renderer = new THREE.WebGLRenderer({ canvas: $('scene'), antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0b0906);
scene.fog = new THREE.Fog(0x120d09, 9, 20);

const camera = new THREE.PerspectiveCamera(60, innerWidth / innerHeight, 0.05, 50);
const EYE = 1.6;
const player = { pos: new THREE.Vector3(0, EYE, 1.2), yaw: 0, pitch: -0.08 };

// wait for the CRT font so screen textures draw in VT323 rather than a fallback
await Promise.race([document.fonts.load('20px "VT323"'), new Promise((r) => setTimeout(r, 1500))]);
const room = buildRoom(scene);
const pc = new DosPC(ui.dos);

/* ---------- state ---------- */
let mode = 'intro'; // intro | walk | tween | seated
const keys = new Set();
const stats = { caffeine: 15, snacks: 40, dust: 0, cans: 0, handfuls: 0 };
let gameMinutes = 23 * 60 + 42;
let target = null;
let tween = null;

/* ---------- input ---------- */
const canvas = renderer.domElement;
ui.enter.addEventListener('click', () => {
  ui.intro.hidden = true;
  ui.hud.hidden = false;
  mode = 'walk';
  sfx.startAudio();
  lockPointer();
});
ui.enter.focus();

function lockPointer() {
  const p = canvas.requestPointerLock?.();
  if (p && p.catch) p.catch(() => {}); // pointer lock is optional; clicking again retries
}
canvas.addEventListener('click', () => { if (mode === 'walk' && document.pointerLockElement !== canvas) lockPointer(); });

document.addEventListener('mousemove', (e) => {
  if (mode !== 'walk' || document.pointerLockElement !== canvas) return;
  player.yaw -= e.movementX * 0.0022;
  player.pitch = THREE.MathUtils.clamp(player.pitch - e.movementY * 0.0022, -1.4, 1.4);
});

window.addEventListener('keydown', (e) => {
  if (mode === 'seated') {
    if (e.code === 'Backquote') { e.preventDefault(); e.stopPropagation(); standUp(); }
    return; // everything else belongs to DOOM
  }
  if (mode !== 'walk') return;
  keys.add(e.code);
  if (e.code === 'KeyE' && target) interact(target);
}, true);
window.addEventListener('keyup', (e) => keys.delete(e.code), true);
window.addEventListener('blur', () => keys.clear());

ui.stand.addEventListener('click', standUp);
ui.drink.addEventListener('click', drink);
ui.eat.addEventListener('click', eat);

/* ---------- interactions ---------- */
const ray = new THREE.Raycaster(undefined, undefined, 0, 1.9);
const centre = new THREE.Vector2(0, 0);

function findTarget() {
  ray.setFromCamera(centre, camera);
  const hit = ray.intersectObjects(room.interactables, true)[0];
  return hit?.object.userData.interact ?? null;
}

const PROMPTS = {
  sit: () => 'E · Sit down at your PC',
  busy: (t) => `${t.station.name}'s PC · seat's taken`,
  drink: () => 'E · Crack a Volt Cola',
  eat: () => 'E · Grab a handful of Nachoz',
};

function interact(t) {
  if (t.kind === 'sit') sitDown(t.station);
  else if (t.kind === 'drink') drink();
  else if (t.kind === 'eat') eat();
  else toast(`${t.station.name} is "just grabbing a slice". Back in 5.`);
}

const DRINK_LINES = ['*psssht*', 'Tastes like a battery. Excellent.', 'You can hear the hub blinking.', 'Your aim feels... faster.'];
const EAT_LINES = ['Crunch.', 'Orange fingers acquired.', 'Nuclear cheese: confirmed.', 'You wipe your hand on your jeans. Mostly.'];

function drink() {
  stats.caffeine = Math.min(100, stats.caffeine + 32);
  stats.cans++;
  sfx.fizz();
  toast(stats.caffeine > 85 ? 'You can hear colours. Maybe slow down.' : DRINK_LINES[stats.cans % DRINK_LINES.length]);
}

function eat() {
  stats.snacks = Math.min(100, stats.snacks + 25);
  stats.dust = 1;
  stats.handfuls++;
  sfx.crunch();
  toast(EAT_LINES[stats.handfuls % EAT_LINES.length]);
}

let toastTimer;
function toast(text) {
  const el = mode === 'seated' ? ui.seatedStatus : ui.toast;
  el.textContent = text;
  el.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    if (el === ui.toast) el.hidden = true;
    else el.textContent = pc.running ? 'Click the screen to play' : 'Booting...';
  }, 2600);
}

/* ---------- sitting and standing ---------- */
const tmpV = new THREE.Vector3(), tmpQ = new THREE.Quaternion();

function cameraPoseLookingAt(pos, lookAt) {
  const m = new THREE.Matrix4().lookAt(pos, lookAt, new THREE.Vector3(0, 1, 0));
  return new THREE.Quaternion().setFromRotationMatrix(m);
}

function startTween(toPos, toQuat, seconds, done) {
  tween = { fromPos: camera.position.clone(), fromQuat: camera.quaternion.clone(), toPos, toQuat, t: 0, seconds, done };
  mode = 'tween';
}

function sitDown(station) {
  if (document.pointerLockElement) document.exitPointerLock();
  ui.prompt.hidden = true;
  const seat = station.seatTarget.getWorldPosition(new THREE.Vector3());
  const screenPos = station.monitor.screen.getWorldPosition(new THREE.Vector3());
  startTween(seat, cameraPoseLookingAt(seat, screenPos), 0.9, () => {
    mode = 'seated';
    ui.hud.hidden = true;
    placeMonitorOverlay(station);
    ui.monitor.hidden = false;
    ui.seatedBar.hidden = false;
    ui.seatedStatus.textContent = pc.running ? 'Click the screen to play' : 'Booting...';
    pc.onReady = () => { if (mode === 'seated') ui.seatedStatus.textContent = 'Click the screen to play'; };
    pc.boot().catch((err) => { ui.seatedStatus.textContent = `Couldn't start DOS: ${err.message}`; });
    station.screen.setMode('mine', 'DOOM · RUNNING');
  });
  sitDown.station = station;
}

function standUp() {
  if (mode !== 'seated') return;
  const station = sitDown.station;
  pc.pause();
  if (document.pointerLockElement) document.exitPointerLock();
  ui.monitor.hidden = true;
  ui.seatedBar.hidden = true;
  station.screen.setMode('mine', 'DOOM · PAUSED');
  // step back from the desk, facing the monitor
  const back = new THREE.Vector3(0, 0, 1).applyQuaternion(station.group.quaternion);
  const pos = station.seatTarget.getWorldPosition(new THREE.Vector3()).addScaledVector(back, 0.75);
  pos.y = EYE;
  const look = station.monitor.screen.getWorldPosition(new THREE.Vector3());
  const q = cameraPoseLookingAt(pos, look);
  startTween(pos, q, 0.7, () => {
    const e = new THREE.Euler().setFromQuaternion(q, 'YXZ');
    player.pos.copy(pos); player.yaw = e.y; player.pitch = e.x;
    mode = 'walk';
    ui.hud.hidden = false;
    lockPointer();
  });
}

function placeMonitorOverlay(station) {
  // project the four corners of the CRT glass and lay the DOS canvas over them
  const scr = station.monitor.screen;
  scr.updateWorldMatrix(true, false);
  camera.updateMatrixWorld();
  const xs = [], ys = [];
  for (const [x, y] of [[-0.16, -0.12], [0.16, -0.12], [-0.16, 0.12], [0.16, 0.12]]) {
    tmpV.set(x, y, 0).applyMatrix4(scr.matrixWorld).project(camera);
    xs.push((tmpV.x + 1) / 2 * innerWidth);
    ys.push((1 - tmpV.y) / 2 * innerHeight);
  }
  const left = Math.min(...xs), top = Math.min(...ys);
  Object.assign(ui.monitor.style, {
    left: `${left}px`, top: `${top}px`,
    width: `${Math.max(...xs) - left}px`, height: `${Math.max(...ys) - top}px`,
  });
}

/* ---------- movement ---------- */
const RADIUS = 0.28;
function collide(p) {
  p.x = THREE.MathUtils.clamp(p.x, ROOM.minX + RADIUS, ROOM.maxX - RADIUS);
  p.z = THREE.MathUtils.clamp(p.z, ROOM.minZ + RADIUS, ROOM.maxZ - RADIUS);
  for (const c of room.colliders) {
    const minX = c.minX - RADIUS, maxX = c.maxX + RADIUS, minZ = c.minZ - RADIUS, maxZ = c.maxZ + RADIUS;
    if (p.x > minX && p.x < maxX && p.z > minZ && p.z < maxZ) {
      const push = [[p.x - minX, 'x', minX], [maxX - p.x, 'x', maxX], [p.z - minZ, 'z', minZ], [maxZ - p.z, 'z', maxZ]]
        .sort((a, b) => a[0] - b[0])[0];
      p[push[1]] = push[2];
    }
  }
}

const fwd = new THREE.Vector3(), side = new THREE.Vector3(), move = new THREE.Vector3();
function walk(dt) {
  fwd.set(-Math.sin(player.yaw), 0, -Math.cos(player.yaw));
  side.set(-fwd.z, 0, fwd.x);
  move.set(0, 0, 0);
  if (keys.has('KeyW') || keys.has('ArrowUp')) move.add(fwd);
  if (keys.has('KeyS') || keys.has('ArrowDown')) move.sub(fwd);
  if (keys.has('KeyD') || keys.has('ArrowRight')) move.add(side);
  if (keys.has('KeyA') || keys.has('ArrowLeft')) move.sub(side);
  const speed = 2.1 * (1 + stats.caffeine / 250);
  if (move.lengthSq()) player.pos.addScaledVector(move.normalize(), speed * dt);
  collide(player.pos);

  camera.position.copy(player.pos);
  // walking bob, and the jitters once you're past four cans
  const moving = move.lengthSq() > 0;
  const t = performance.now() / 1000;
  if (moving) camera.position.y += Math.sin(t * 9) * 0.025;
  const jit = Math.max(0, stats.caffeine - 60) / 40 * 0.004;
  camera.position.x += (Math.random() - 0.5) * jit;
  camera.position.y += (Math.random() - 0.5) * jit;
  camera.rotation.set(player.pitch, player.yaw, 0, 'YXZ');
}

/* ---------- loop ---------- */
const clock = new THREE.Clock();
let screenTimer = 0, statTimer = 0;

function frame() {
  const dt = Math.min(clock.getDelta(), 0.05);
  const now = performance.now() / 1000;

  if (mode === 'walk') {
    walk(dt);
    target = findTarget();
    ui.prompt.hidden = !target;
    if (target) ui.prompt.textContent = PROMPTS[target.kind](target);
  } else if (mode === 'tween' && tween) {
    tween.t = Math.min(1, tween.t + dt / tween.seconds);
    const k = tween.t < 0.5 ? 4 * tween.t ** 3 : 1 - (-2 * tween.t + 2) ** 3 / 2;
    camera.position.lerpVectors(tween.fromPos, tween.toPos, k);
    tmpQ.slerpQuaternions(tween.fromQuat, tween.toQuat, k);
    camera.quaternion.copy(tmpQ);
    if (tween.t >= 1) { const done = tween.done; tween = null; done(); }
  }

  // CRTs redraw at ~12fps, which is about what these boxes managed anyway
  screenTimer += dt;
  if (screenTimer > 0.08) {
    screenTimer = 0;
    for (const s of room.screens) s.draw(now);
  }

  // blinkenlights
  const playing = mode === 'seated' && pc.running;
  for (const led of room.hddLeds) if (Math.random() < 0.15) led.material.color.setHex(Math.random() < 0.4 ? 0xff2a1a : 0x400000);
  room.hubLeds.forEach((led, i) => {
    const busy = i < 6 && Math.random() < (playing ? 0.5 : 0.12);
    led.material.color.setHex(busy ? 0x4dff5a : (i < 6 ? 0x1b6e1b : 0x0a2a0a));
  });

  // stats tick once a second
  statTimer += dt;
  if (statTimer > 1) {
    statTimer = 0;
    stats.caffeine = Math.max(0, stats.caffeine - 0.7);
    stats.snacks = Math.max(0, stats.snacks - 0.35);
    stats.dust = Math.max(0, stats.dust - 0.02);
    gameMinutes += 0.1;
    const h = Math.floor(gameMinutes / 60) % 24, m = Math.floor(gameMinutes % 60);
    ui.clock.textContent = `${((h + 11) % 12) + 1}:${String(m).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`;
    ui.caffeine.style.width = `${stats.caffeine}%`;
    ui.snacks.style.width = `${stats.snacks}%`;
    ui.dust.style.opacity = (stats.dust * 0.9).toFixed(2);
  }

  renderer.render(scene, camera);
  requestAnimationFrame(frame);
}

addEventListener('resize', () => {
  renderer.setSize(innerWidth, innerHeight);
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  if (mode === 'seated') { renderer.render(scene, camera); placeMonitorOverlay(sitDown.station); }
});

camera.position.copy(player.pos);
camera.rotation.set(player.pitch, player.yaw, 0, 'YXZ');
ui.caffeine.style.width = `${stats.caffeine}%`;
ui.snacks.style.width = `${stats.snacks}%`;
frame();

// handy for debugging from the console
window.lan = { scene, camera, room, stats, player, sitDown, standUp, pc };
