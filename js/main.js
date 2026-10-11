// LAN Party '98: walk the basement with everyone else who's online, grab a free PC,
// play DOOM shareware, and start a deathmatch with whoever's sitting down.
import * as THREE from 'three';
import { buildRoom, ROOM } from './room.js';
import { DosPC } from './emulator.js';
import { RoomLink, ROOM_NAME } from './net.js';
import { Crowd } from './avatars.js';
import * as sfx from './sfx.js';
import { analytics } from './analytics.js';
import { Party, BURNER, DISCS } from './party.js';
import * as dialog from './dialog.js';

const $ = (id) => document.getElementById(id);
const ui = {
  intro: $('intro'), enter: $('enter-btn'), hud: $('hud'), prompt: $('prompt'), toast: $('toast'),
  caffeine: $('m-caffeine'), snacks: $('m-snacks'), cash: $('m-cash'), clock: $('clock'),
  monitor: $('monitor'), dos: $('dos'), dust: $('dust'),
  seatedBar: $('seated-bar'), stand: $('stand-btn'), drink: $('drink-btn'), eat: $('eat-btn'), seatedStatus: $('seated-status'),
  handle: $('handle'), netstatus: $('netstatus'),
  chat: $('chat'), chatLog: $('chat-log'), chatForm: $('chat-form'), chatInput: $('chat-input'),
  dm: $('dm'), dmText: $('dm-text'), dmBtn: $('dm-btn'), dmBtn2: $('dm-btn2'),
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
const link = new RoomLink();
const crowd = new Crowd(scene, room.stations);
const party = new Party();

/* ---------- state ---------- */
let mode = 'intro'; // intro | walk | tween | seated | dialog
const keys = new Set();
const stats = { caffeine: 15, snacks: 40, dust: 0, cans: 0, handfuls: 0 };
const GAME_START = 23 * 60 + 42; // the clock when the doors open
let target = null;
let tween = null;
let myName = 'YOU';
let seatedAt = null; // station I'm sitting at (or walking to sit at)

/* ---------- input ---------- */
const canvas = renderer.domElement;
const savedHandle = (() => { try { return localStorage.getItem('lan98-handle') || ''; } catch { return ''; } })();
ui.handle.value = savedHandle;
ui.handle.addEventListener('keydown', (e) => { if (e.key === 'Enter') ui.enter.click(); });
ui.enter.addEventListener('click', () => {
  const name = ui.handle.value.trim().toUpperCase().slice(0, 12) || `PLAYER${Math.floor(Math.random() * 90 + 10)}`;
  try { localStorage.setItem('lan98-handle', name); } catch { /* private mode */ }
  myName = name;
  ui.intro.hidden = true;
  ui.hud.hidden = false;
  ui.chat.hidden = false;
  mode = 'walk';
  sfx.startAudio();
  lockPointer();
  analytics.enterParty();
  link.connect(name);
  refreshStations();
});
(savedHandle ? ui.enter : ui.handle).focus();

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
  if (e.target === ui.chatInput || e.target === ui.handle) return;
  if (dialog.isOpen()) return; // the message box owns the keyboard
  if (mode === 'seated') {
    if (e.code === 'Backquote') { e.preventDefault(); e.stopPropagation(); standUp(); }
    return; // everything else belongs to DOOM
  }
  if (mode !== 'walk') return;
  if (e.code === 'KeyT' && link.online) { e.preventDefault(); openChat(); return; }
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
  sit: (t) => {
    const who = link.occupant(t.station.index);
    return who ? `${t.station.name} · ${who.name}'s sitting here` : `E · Sit down at ${t.station.name}`;
  },
  drink: () => 'E · Crack a Volt Cola',
  eat: () => 'E · Grab a handful of Nachoz',
  burner: () => (party.job ? `E · CD-R: writing ${Math.floor(party.burnProgress() * 100)}%` : 'E · Burn a CD (2x)'),
};

function interact(t) {
  if (t.kind === 'sit') {
    const who = link.occupant(t.station.index);
    if (who) toast(`${who.name} is on that one. Find a free PC.`);
    else sitDown(t.station);
  } else if (t.kind === 'drink') drink();
  else if (t.kind === 'eat') eat();
  else if (t.kind === 'burner') openBurner();
}

/* ---------- errands: little message boxes ---------- */
function openErrand(spec) {
  if (mode !== 'walk') return;
  if (document.pointerLockElement) document.exitPointerLock();
  keys.clear();
  ui.prompt.hidden = true;
  mode = 'dialog';
  dialog.open(spec, () => { if (mode === 'dialog') { mode = 'walk'; lockPointer(); } });
}

const clockText = (secs) => `${Math.floor(secs / 60)}:${String(Math.floor(secs % 60)).padStart(2, '0')}`;

function openBurner() {
  openErrand({
    title: 'CDWRITE.EXE',
    render: () => {
      const job = party.job;
      if (job) {
        return {
          lines: [
            `Writing ${DISCS[job.kind].name} at ${BURNER.speed}x. ${Math.floor(party.burnProgress() * 100)}% done, ${clockText(party.burnSecondsLeft())} to go.`,
            'Keep off PC-04 while it writes. One game of DOOM and it is a coaster.',
          ],
          progress: party.burnProgress(),
          buttons: [{ label: 'Close' }, { label: 'Cancel write', run: () => party.cancelBurn() }],
        };
      }
      return {
        lines: [
          `CD-R drive, ${BURNER.speed}x. The only burner in the basement, and it is in PC-04.`,
          `A blank is $${BURNER.blankCost}. A ${party.burnMinutes()}-minute write. Mates pay $${DISCS.MIX.pays} for a MIX CD.`,
          `Cash $${party.cash}. Discs burned: ${party.discs}. Coasters: ${party.coasters}.`,
        ],
        progress: null,
        buttons: [
          { label: 'Burn a MIX CD', disabled: !party.canBurn(), run: () => party.startBurn('MIX'), keep: true },
          { label: 'Close' },
        ],
      };
    },
  });
}

const DRINK_LINES = ['*psssht*', 'Tastes like a battery. Excellent.', 'You can hear the hub blinking.', 'Your aim feels... faster.'];
const EAT_LINES = ['Crunch.', 'Orange fingers acquired.', 'Nuclear cheese: confirmed.', 'You wipe your hand on your jeans. Mostly.'];

function drink() {
  stats.caffeine = Math.min(100, stats.caffeine + 32);
  stats.cans++;
  sfx.fizz();
  analytics.drinkCola(stats.caffeine);
  toast(stats.caffeine > 85 ? 'You can hear colours. Maybe slow down.' : DRINK_LINES[stats.cans % DRINK_LINES.length]);
}

function eat() {
  stats.snacks = Math.min(100, stats.snacks + 25);
  stats.dust = 1;
  stats.handfuls++;
  sfx.crunch();
  analytics.eatSnack(stats.snacks);
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
    else el.textContent = seatedStatusText();
  }, 2600);
}

function seatedStatusText() {
  if (!pc.running) return 'Booting...';
  if (pc.kind === 'solo') return 'Click the screen to play';
  return 'Deathmatch on. Click the screen. Esc aborts setup.';
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
  seatedAt = station;
  link.send({ t: 'sit', pc: station.index });
  refreshStations();
  const seat = station.seatTarget.getWorldPosition(new THREE.Vector3());
  const screenPos = station.monitor.screen.getWorldPosition(new THREE.Vector3());
  startTween(seat, cameraPoseLookingAt(seat, screenPos), 0.9, () => {
    mode = 'seated';
    ui.hud.hidden = true;
    placeMonitorOverlay(station);
    ui.monitor.hidden = false;
    ui.seatedBar.hidden = false;
    pc.onReady = () => {
      analytics.gameStart(pc.kind === 'solo' ? 'DOOM' : 'DOOM deathmatch');
      if (mode === 'seated') ui.seatedStatus.textContent = seatedStatusText();
    };
    bootForMatch();
    ui.seatedStatus.textContent = seatedStatusText();
    updateDM();
  });
  sitDown.station = station;
  analytics.sitDown(station);
}

function standUp() {
  if (mode !== 'seated') return;
  const station = sitDown.station;
  pc.pause();
  analytics.standUp(pc.kind === 'join' || pc.kind === 'host' ? 'DOOM deathmatch' : 'DOOM');
  if (document.pointerLockElement) document.exitPointerLock();
  ui.monitor.hidden = true;
  ui.seatedBar.hidden = true;
  seatedAt = null;
  link.send({ t: 'stand' });
  refreshStations();
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
let screenTimer = 0, statTimer = 0, sendTimer = 0;

function frame() {
  const dt = Math.min(clock.getDelta(), 0.05);
  const now = performance.now() / 1000;

  crowd.update(dt, link.players);
  if (mode !== 'intro') party.tick(dt, { seatedPc: seatedAt?.index ?? null });
  if (link.online && mode === 'walk' && (sendTimer += dt) > 0.1) { sendTimer = 0; link.pos(player.pos.x, player.pos.z, player.yaw); }

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
  const playing = (mode === 'seated' && pc.running) || [...link.players.values()].some((p) => p.pc !== null);
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
    const gameMinutes = GAME_START + party.now;
    const h = Math.floor(gameMinutes / 60) % 24, m = Math.floor(gameMinutes % 60);
    ui.clock.textContent = `${((h + 11) % 12) + 1}:${String(m).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`;
    ui.caffeine.style.width = `${stats.caffeine}%`;
    ui.snacks.style.width = `${stats.snacks}%`;
    ui.dust.style.opacity = (stats.dust * 0.9).toFixed(2);
    room.stations[BURNER.pc].screen.burn = party.job ? { pct: party.burnProgress(), secondsLeft: party.burnSecondsLeft() } : null;
    dialog.refresh();
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

/* ---------- the night's logistics ---------- */
ui.cash.textContent = `$${party.cash}`;
party.addEventListener('cash', (e) => { ui.cash.textContent = `$${e.detail}`; });
party.addEventListener('burn-start', () => toast('CDWRITE: writing at 2x. Hands off PC-04.'));
party.addEventListener('burn-done', (e) => {
  toast(`Disc done. Mates pay $${e.detail.pays}.`);
  chatLine(`The CD-R finally spat out a ${DISCS[e.detail.kind].name}. +$${e.detail.pays}.`, true);
});
party.addEventListener('coaster', (e) => {
  const why = e.detail.reason === 'underrun' ? 'Buffer underrun. That one is a coaster.' : 'Write cancelled. That disc is a coaster now.';
  toast(why);
  chatLine(why, true);
});

/* ---------- the room: other people, seats, deathmatch ---------- */

// keep name tags and idle screens in step with who's sitting where
function refreshStations() {
  for (const st of room.stations) {
    const mine = seatedAt === st;
    const who = mine ? null : link.occupant(st.index);
    if (mine) {
      st.setTag(myName);
      st.screen.free = false;
      st.screen.setMode('mine', `${myName} · ${pc.kind === 'solo' || !pc.kind ? 'DOOM' : 'DEATHMATCH'}`);
    } else {
      if (st.screen.mode === 'mine') st.screen.mode = st.screen.idle;
      st.setTag(who ? who.name : st.name);
      const inMatch = who && link.match?.players.includes(who.id) && link.match.status !== 'lobby';
      st.screen.setFree(!who, who?.name, inMatch ? 'IN THE DEATHMATCH' : 'PLAYING DOOM');
    }
  }
}

function setNetStatus() {
  if (!link.online) {
    ui.netstatus.textContent = myName === 'YOU' ? '' : 'Hub unplugged · solo mode';
    ui.netstatus.classList.remove('online');
    return;
  }
  const n = link.players.size + 1;
  ui.netstatus.textContent = `${n} in the room${ROOM_NAME !== 'basement' ? ` · ${ROOM_NAME}` : ''}`;
  ui.netstatus.classList.add('online');
}

function chatLine(html, sys = false) {
  const div = document.createElement('div');
  if (sys) div.className = 'sys';
  div.innerHTML = html;
  ui.chatLog.append(div);
  while (ui.chatLog.children.length > 7) ui.chatLog.firstChild.remove();
  setTimeout(() => div.classList.add('old'), 12000);
}
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

function openChat() {
  keys.clear();
  if (document.pointerLockElement) document.exitPointerLock();
  ui.chatForm.hidden = false;
  ui.chatInput.value = '';
  ui.chatInput.focus();
  for (const d of ui.chatLog.children) d.classList.remove('old');
}
function closeChat() {
  ui.chatForm.hidden = true;
  ui.chatInput.blur();
  if (mode === 'walk') lockPointer();
}
ui.chatForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const text = ui.chatInput.value.trim();
  if (text) link.send({ t: 'chat', text });
  closeChat();
});
ui.chatInput.addEventListener('keydown', (e) => { if (e.key === 'Escape') { e.preventDefault(); closeChat(); } });

link.addEventListener('online', () => {
  crowd.clear();
  for (const p of link.players.values()) crowd.add(p);
  if (seatedAt) link.send({ t: 'sit', pc: seatedAt.index });
  setNetStatus();
  refreshStations();
  updateDM();
  chatLine(`Plugged into the hub. ${link.players.size ? `${link.players.size} other${link.players.size > 1 ? 's' : ''} here.` : "You're the first one here."}`, true);
});
link.addEventListener('offline', () => {
  crowd.clear();
  setNetStatus();
  refreshStations();
  updateDM();
  chatLine('Lost the hub. Reconnecting...', true);
});
link.addEventListener('join', (e) => {
  crowd.add(e.detail);
  setNetStatus();
  chatLine(`${esc(e.detail.name)} walked in.`, true);
  sfx.crunch();
});
link.addEventListener('leave', (e) => {
  crowd.remove(e.detail.id);
  setNetStatus();
  refreshStations();
  chatLine(`${esc(e.detail.name)} left.`, true);
});
link.addEventListener('seat', (e) => {
  if (e.detail.id !== link.me?.id) crowd.seat(e.detail);
  refreshStations();
});
link.addEventListener('denied', (e) => {
  if (seatedAt?.index !== e.detail.pc) return;
  const st = seatedAt;
  if (mode === 'seated') standUp();
  else { seatedAt = null; refreshStations(); }
  toast(`${e.detail.by} beat you to ${st.name}.`);
});
link.addEventListener('chat', (e) => {
  const p = e.detail.id === link.me?.id ? link.me : link.players.get(e.detail.id);
  chatLine(`<b style="color:${esc(p?.color ?? '#fff')}">${esc(e.detail.name)}:</b> ${esc(e.detail.text)}`);
});

let lastMatch = null;
link.addEventListener('match', (e) => {
  const m = e.detail, was = lastMatch;
  lastMatch = m;
  if (m && !was) chatLine(`${esc(link.nameOf(m.host))} is hosting a DOOM deathmatch. Sit at a free PC to join.`, true);
  if (!m && was) chatLine('Deathmatch over.', true);
  if (m?.status === 'starting' && was?.status === 'lobby') chatLine(`Deathmatch starting: ${m.players.map((id) => esc(link.nameOf(id))).join(' vs ')}`, true);
  refreshStations();
  updateDM();
  if (mode === 'seated') bootForMatch();
});

const inMatch = () => !!(link.match && link.me && link.match.players.includes(link.me.id));
const isHost = () => !!(link.match && link.me && link.match.host === link.me.id);

// Make the PC run whatever it should right now: solo DOOM, or this match's IPX setup.
let announcing = null;
function bootForMatch() {
  const m = link.match;
  let opts = { kind: 'solo' };
  if (inMatch() && m.status !== 'lobby') {
    if (isHost()) opts = { kind: 'host', nodes: m.nodes, match: m.id };
    else if (m.peerId) opts = { kind: 'join', nodes: m.nodes, peerId: m.peerId, match: m.id };
    else { ui.seatedStatus.textContent = 'Host is setting up the network...'; return; }
  }
  const booting = pc.boot(opts);
  ui.seatedStatus.textContent = seatedStatusText();
  booting.then(() => {
    refreshStations();
    ui.seatedStatus.textContent = seatedStatusText();
    if (opts.kind === 'host' && m.status === 'starting' && announcing !== m.id) {
      announcing = m.id;
      pc.peerId().then((peerId) => {
        // give DOSBox a moment to bring its IPX server up before others connect
        setTimeout(() => link.send({ t: 'dm_peer', peerId }), 1500);
      }).catch(() => { toast("Couldn't reach the network. Deathmatch cancelled."); link.send({ t: 'dm_end' }); });
    }
  }).catch((err) => { ui.seatedStatus.textContent = `Couldn't start DOS: ${err.message}`; });
}

function updateDM() {
  const m = link.match;
  if (!link.online || mode !== 'seated') { ui.dm.hidden = true; return; }
  ui.dm.hidden = false;
  ui.dmBtn2.hidden = true;
  ui.dmBtn.hidden = false;
  ui.dmBtn.disabled = false;
  const names = m ? m.players.map((id) => link.nameOf(id)).join(', ') : '';
  if (!m) {
    ui.dmText.textContent = '';
    ui.dmBtn.textContent = 'Host a deathmatch';
    ui.dmBtn.onclick = () => link.send({ t: 'dm_host' });
  } else if (m.status === 'lobby') {
    if (isHost()) {
      ui.dmText.textContent = m.players.length < 2 ? 'Waiting for players to join...' : `In: ${names}`;
      ui.dmBtn.textContent = `Start (${m.players.length})`;
      ui.dmBtn.disabled = m.players.length < 2;
      ui.dmBtn.onclick = () => link.send({ t: 'dm_start' });
      ui.dmBtn2.hidden = false;
      ui.dmBtn2.textContent = 'Cancel';
      ui.dmBtn2.onclick = () => link.send({ t: 'dm_end' });
    } else if (inMatch()) {
      ui.dmText.textContent = `Waiting for ${link.nameOf(m.host)} to start (${m.players.length} in)`;
      ui.dmBtn.textContent = 'Leave';
      ui.dmBtn.onclick = () => link.send({ t: 'dm_leave' });
    } else {
      ui.dmText.textContent = `${link.nameOf(m.host)} is hosting (${m.players.length}/4)`;
      ui.dmBtn.textContent = 'Join deathmatch';
      ui.dmBtn.disabled = m.players.length >= 4;
      ui.dmBtn.onclick = () => link.send({ t: 'dm_join' });
    }
  } else if (inMatch()) {
    ui.dmText.textContent = `DEATHMATCH: ${names}`;
    ui.dmBtn.textContent = isHost() ? 'End match' : 'Leave match';
    ui.dmBtn.onclick = () => link.send({ t: isHost() ? 'dm_end' : 'dm_leave' });
  } else {
    ui.dmText.textContent = `Deathmatch on: ${names}`;
    ui.dmBtn.hidden = true;
  }
  // buttons shouldn't keep keyboard focus, or Space/Enter in DOOM would click them
  for (const b of [ui.dmBtn, ui.dmBtn2]) b.onmouseup = () => b.blur();
}

// handy for debugging from the console
window.lan = { scene, camera, room, stats, player, sitDown, standUp, pc, link, crowd };
