// LAN Party '98: walk the basement with everyone else who's online, grab a free PC,
// play a shareware game (DOOM, Quake, Hexen, Heretic, Descent), and start a deathmatch with whoever's sitting down.
import { setupAmigaPanel } from './amiga-panel.js';
import * as THREE from 'three';
import { buildRoom, ROOM, shackBoxMats } from './room.js';
import { DosPC } from './emulator.js';
import { N64Console } from './n64.js';
import { GAMES, DEFAULT_GAME, MAX_PLAYERS, gameOf, nextGame, netHint, pilotName } from './games.js';
import { RoomLink, ROOM_NAME } from './net.js';
import { FeedSender } from './feed.js';
import { Voice } from './voice.js';
import { statusLine, buttonLabel } from './voice-logic.js';
import { Crowd, spawnNpc, spawnTaped, seatFor, setEye } from './avatars.js';
import * as sfx from './sfx.js';
import * as voices from './voices.js';
import { GameNoise } from './gaming.js';
import { analytics } from './analytics.js';
import { Party, PIZZA, BURNER, DISCS, NET, SHOP, PC_COUNT, PC_TOTAL, OC, HEAT, RAM, NIGHT, SEC_PER_GAME_MIN, SHARE_STEPS, celsius } from './party.js';
import * as dialog from './dialog.js';
import * as phone from './phone.js';
import { CONTACTS } from './handset.js';
import { Banter, IrcView, REGULARS } from './irc.js';
import { Player } from './music.js';
import { initLanamp } from './lanamp.js';
import { initShare } from './share.js';
import { Desktop } from './desktop.js';
import { registerApps } from './apps.js';
import { Wizard } from './wizard.js';
import * as BUILD from './build.js';
import { RearPanel } from './rear.js';
import { SEAT_BASE, benchOfSeat } from './bench-plan.js';

const $ = (id) => document.getElementById(id);
initShare();
const ui = {
  intro: $('intro'), enter: $('enter-btn'), build: $('build-btn'), hud: $('hud'), prompt: $('prompt'), toast: $('toast'),
  caffeine: $('m-caffeine'), snacks: $('m-snacks'), cash: $('m-cash'), shares: $('m-shares'), clock: $('clock'), schedule: $('schedule'),
  monitor: $('monitor'), dos: $('dos'), dust: $('dust'), bsod: $('bsod'),
  consoleBar: $('console-bar'), consoleStatus: $('console-status'),
  amigaBar: $('amiga-bar'), amigaStatus: $('amiga-status'),
  seatedBar: $('seated-bar'), stand: $('stand-btn'), drink: $('drink-btn'), eat: $('eat-btn'), gameBtn: $('game-btn'), seatedStatus: $('seated-status'),
  handle: $('handle'), netstatus: $('netstatus'), voiceStatus: $('voice-status'), mic: $('mic-btn'),
  chat: $('chat'), chatLog: $('chat-log'), chatForm: $('chat-form'), chatInput: $('chat-input'),
  dm: $('dm'), dmText: $('dm-text'), dmBtn: $('dm-btn'), dmBtn2: $('dm-btn2'),
};

/* ---------- the desktop: taskbar, Start menu and windows over the room ---------- */
const desktop = new Desktop();
registerApps(desktop, { irc: $('irc'), lanamp: $('lanamp'), gameTime: () => ui.clock.textContent });

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
const n64 = new N64Console(); // the console under the TV: a terminal that runs N64 ROMs from the player's own drive
const link = new RoomLink();
// What I am playing goes to everyone else's copy of my PC's CRT (js/feed.js), but only while there is somebody to show it to.
const feed = new FeedSender({
  host: ui.dos,
  shouldSend: () => mode === 'seated' && !!seatedAt && pc.running && ui.bsod.hidden && !ui.monitor.hidden && link.online && link.players.size > 0,
  send: (buf) => link.sendFrame(buf),
});
const crowd = new Crowd(scene, room.stations);
// Proximity voice chat (js/voice.js): joined with Y, heard by whoever is within a few metres of where you are
const voice = new Voice({ link, audioContext: () => sfx.audioContext(), positionOf: (id) => crowd.avatars.get(id)?.group.position ?? null });
setEye(camera.position); // speech bubbles grow with distance so they stay readable
const GAME_START = NIGHT.doors; // 7:30 PM
const party = new Party({ startMinutes: GAME_START });

// The regulars from #lanparty98 sit and play: at their own PCs on the tables, or on the couch with the console.
// Where each one sits is in buildGamers (js/room.js). Nobody else can use those PCs.
const sit = (name) => (room.seats[name] ? seatFor(room.seats[name]) : undefined);   // Ghoul has no seat of his own: he is given PC-04's below
// Macca: off to Singapore for work, and happy to bring RAM back if you give him cash first
const macca = spawnNpc(scene, { name: 'MACCA', color: '#20b2aa', yaw: -Math.PI / 2, arch: 'surfer', seat: sit('MACCA'), look: { headphones: false } }); // --shirt-7
const maccaHit = new THREE.Mesh(new THREE.BoxGeometry(0.7, 1.5, 0.7), new THREE.MeshBasicMaterial({ visible: false }));
maccaHit.position.set(macca.group.position.x, 0.75, macca.group.position.z);
maccaHit.userData.interact = { kind: 'buddy' };
scene.add(maccaHit);
room.interactables.push(maccaHit);

// xX_Ghoul_Xx plays Descent at PC-04 (front left, headphones) until somebody else sits down at it; the Amiga is free for everyone
const GHOUL_PC = 3;
const ghoulAtPc = () => seatedAt !== room.stations[GHOUL_PC] && !link.occupant(GHOUL_PC);
const regulars = [
  // headphones: the PCs with speakers (K-Rad, n00bslayer) are the ones the room can hear; PC-04 has headphones, so Ghoul wears them
  { name: 'xX_Ghoul_Xx', color: '#9b4dca', arch: 'goth', look: { headphones: true }, seat: seatFor(room.stations[GHOUL_PC]) },      // --shirt-5
  { name: 'PhatBass', color: '#d94f8a', arch: 'raver', look: { headphones: false } },       // --shirt-8
  { name: 'K-Rad', color: '#2b6fd6', arch: 'hiphop', look: { headphones: false } },         // --shirt-2
  { name: 'n00bslayer', color: '#3aa35a', arch: 'nerd', look: { headphones: false } },      // --shirt-4
].map((r) => spawnNpc(scene, { seat: sit(r.name), ...r }));
// who is sitting where, by IRC nick, so what they say in the channel comes out of their mouths
const speakers = new Map([macca, ...regulars].map((a) => [a.name.toLowerCase(), a]));

// The pizza driver. He stands on the landing outside the door, facing in, and is only there while he is waiting to be let in.
const driver = spawnNpc(scene, { name: 'DRIVER', color: '#b22a1e', yaw: Math.PI, arch: 'grunge', x: (room.door.minX + room.door.maxX) / 2, z: ROOM.minZ - 0.5,
  look: { headphones: false, top: { color: 0xb22a1e, sleeves: 0.2, length: 0.6, width: 1.1 }, print: 'shack' } }); // a red Pizza Shack tee: --pepperoni, with the roof printed on the chest
driver.group.visible = false;

/* ---------- state ---------- */
let mode = 'intro'; // intro | walk | tween | seated | console | amiga | bean | dialog
const keys = new Set();
const stats = { caffeine: 15, snacks: 40, dust: 0, cans: 0, handfuls: 0 };
const held = { garlic: false };                                   // the garlic bread in foil you are carrying
const delivery = { waiting: false, knockIn: 0, knocks: 0, leaveIn: 0 }; // the pizza driver on the landing
let target = null;
let tween = null;
let myName = 'YOU';
let seatHintShown = false;
let seatedAt = null; // station I'm sitting at (or walking to sit at)

/* ---------- input ---------- */
const canvas = renderer.domElement;
const savedHandle = (() => { try { return localStorage.getItem('lan98-handle') || ''; } catch { return ''; } })();
ui.handle.value = savedHandle;
ui.handle.addEventListener('keydown', (e) => { if (e.key === 'Enter') ui.enter.click(); });
/* ---------- the PC you build: BUILDPC.EXE comes between the intro and the basement ---------- */
const wizard = new Wizard($('wizard'));
const savedBuild = () => { try { return JSON.parse(localStorage.getItem('lan98-build')); } catch { return null; } };
let myBuild = BUILD.sanitize(savedBuild());

// Building a PC is optional. "Walk in" goes straight to the basement and you sit at a club PC; "Build a PC first" runs
// BUILDPC.EXE and then gives you a bench on the back table (wantsBench).
let wantsBench = false;

function startParty() {
  const name = ui.handle.value.trim().toUpperCase().slice(0, 12) || `PLAYER${Math.floor(Math.random() * 90 + 10)}`;
  try { localStorage.setItem('lan98-handle', name); } catch { /* private mode */ }
  myName = name;
  ircMe(name);
  ui.intro.hidden = true;
}

ui.enter.addEventListener('click', () => {
  startParty();
  walkIn();
});

ui.build.addEventListener('click', () => {
  startParty();
  wizard.open({
    build: savedBuild(),
    net: party.net,
    onDone: (build) => {
      myBuild = build;
      wantsBench = true;
      try { localStorage.setItem('lan98-build', JSON.stringify(build)); } catch { /* private mode */ }
      walkIn();
    },
  });
});

function walkIn() {
  ui.hud.hidden = false;
  ui.chat.hidden = false;
  desktop.start();
  mode = 'walk';
  sfx.startAudio();
  startMusic();
  lockPointer();
  analytics.enterParty();
  link.connect(myName);
  refreshStations();
  startBench();
}
(savedHandle ? ui.enter : ui.handle).focus();

/* ---------- the PC you built: your bench on the back table ---------- */
// The server hands out PC-07 or PC-08. You carry the parts to the table (ghost outlines show where), plug everything in
// from behind the tower (js/rear.js), press the button, watch the POST, and sit down at a PC that is on the LAN.
// Rules are js/bench-plan.js, the table is js/bench.js, and what the box does once it is running is the same party.js as
// every other PC in the room.
const rear = new RearPanel($('rear'));
const setupBox = { root: $('setup'), where: $('setup-where'), bar: $('setup-bar'), list: $('setup-list') };
let myBench = null;
let benchFallback = null;
const lcFirst = (l) => (/^[A-Z][a-z]/.test(l) ? l[0].toLowerCase() + l.slice(1) : l);
const benchPartName = (t) => lcFirst(room.benches[t.bench].setup.parts().find((p) => p.id === t.part)?.label ?? 'part');

function startBench() {
  clearTimeout(benchFallback);
  if (!wantsBench) return;   // no PC built: you sit at a club PC, and both benches stay free for others
  if (link.online) link.send({ t: 'bench', build: myBuild, up: !!myBench?.ready });
  // no room server (or an old one that has never heard of benches): the first bench is yours
  benchFallback = setTimeout(() => { if (!myBench) takeBench(0); }, 2500);
}

function releaseBench() {
  if (!myBench) return;
  if (seatedAt === myBench.station && mode === 'seated') standUp();
  party.benchOff(myBench.index, 'moved');
  party.benchCabled(myBench.index, false);
  myBench.release();
  myBench = null;
}

function takeBench(i) {
  if (i === null || i === undefined) {
    releaseBench();
    toast('Both benches are taken. Find a free PC.');
    renderSetup();
    return;
  }
  if (myBench?.plan.id === i) return;
  releaseBench();
  const b = room.benches[i];
  myBench = b;
  b.claim(myBuild, party.net);
  syncBenchParty();
  renderSetup();
  refreshStations();
  toast(`Your table is ${b.station.name}, on the back table. Carry your gear over.`);
}

// other players' benches: shown assembled once they have finished their POST
function syncRemoteBenches() {
  for (const b of room.benches) {
    if (b === myBench) continue;
    const p = [...link.players.values()].find((o) => o.bench === b.plan.id && o.up && o.build);
    if (!p) { if (b.owner === 'remote') b.release(); continue; }
    const build = BUILD.sanitize(p.build);
    if (b.owner !== 'remote' || JSON.stringify(b.build) !== JSON.stringify(build)) b.showRemote(build);
  }
  refreshStations();
}

function syncBenchParty() {
  if (!myBench) return;
  party.benchCabled(myBench.index, myBench.setup.netCabled());
  refreshLinks();
}

function openRear(b) {
  if (b !== myBench || mode !== 'walk') return;
  if (document.pointerLockElement) document.exitPointerLock();
  ui.prompt.hidden = true;
  mode = 'dialog';
  rear.open(b, () => { if (mode === 'dialog') { mode = 'walk'; lockPointer(); } });
}

// the SETUP.EXE list in the corner: what is left to do
function renderSetup() {
  const b = myBench;
  const show = !!b && !b.ready && mode !== 'intro';
  setupBox.root.hidden = !show;
  if (!show) return;
  const s = b.setup;
  setupBox.where.textContent = s.poweredOn
    ? `${b.station.name} is starting up.`
    : `Your table: ${b.station.name}, back table, between ${b.plan.between[0]} and ${b.plan.between[1]}. Look at an outline and press E.`;
  const { done, total } = s.progress();
  setupBox.bar.style.width = `${Math.round((done / total) * 100)}%`;
  setupBox.list.replaceChildren(...s.checklist().map((it) => {
    const li = document.createElement('li');
    li.textContent = it.text + (it.optional ? ' (optional)' : '');
    if (it.done) li.className = 'done';
    else if (it.optional) li.className = 'opt';
    return li;
  }));
}

for (const b of room.benches) {
  b.addEventListener('change', () => {
    if (b !== myBench) return;
    syncBenchParty();
    renderSetup();
  });
  b.addEventListener('poweron', () => {
    if (b !== myBench) return;
    sfx.postBeep();
    toast(`${b.station.name}: power on self test...`);
    setTimeout(() => { if (mode === 'walk') sitDown(b.station); }, 0);   // the rear panel is closing; take the seat and watch it start
  });
  b.addEventListener('booted', () => {
    if (b !== myBench) return;
    const spec = BUILD.specOf(b.build);
    party.benchOn(b.index, { ram: spec.ram, ocTable: spec.oc, burnSpeed: spec.burnSpeed });
    link.send({ t: 'bench', build: myBuild, up: true });
    refreshStations();
    refreshLinks();
    renderSetup();
    if (seatedAt === b.station && mode === 'seated') startSeat(b.station);
    else toast(`${b.station.name} is up. Press E to sit down.`);
    chatLine(`${esc(myName)}'s PC-0${b.index + 1} ${party.pcs[b.index].cabled ? 'is on the network' : 'is up, with no network cable'}.`, true);
  });
  b.addEventListener('shutdown', (e) => {
    if (b !== myBench) return;
    party.benchOff(b.index, e.detail.why);
    link.send({ t: 'bench', build: myBuild, up: false });
    if (seatedAt === b.station && mode === 'seated') { toast(e.detail.why === 'power' ? `${b.station.name} goes black.` : `${b.station.name} is switched off.`); standUp(); }
    if (e.detail.why === 'power') sfx.powerCut();
    refreshLinks();
    renderSetup();
  });
}
party.addEventListener('bench-cable', (e) => {
  sfx.plug(e.detail.cabled);
  refreshLinks();
  if (seatedAt?.index === e.detail.pc) updateDM();
});


function lockPointer() {
  if (document.activeElement?.closest?.('#desktop, #taskbar')) document.activeElement.blur(); // the keyboard goes back to the room
  const p = canvas.requestPointerLock?.();
  if (p && p.catch) p.catch(() => {}); // pointer lock is optional; clicking again retries
}
// the taskbar says how to get the mouse back for the desktop (it's hidden while you're seated)
const trayHint = $('tray-hint');
function updateTrayHint() {
  const want = mode !== 'walk' ? '' : document.pointerLockElement ? 'Tab: use the desktop' : 'Click the room to walk';
  if (trayHint.textContent !== want) trayHint.textContent = want;
}
canvas.addEventListener('click', () => { if (mode === 'walk' && document.pointerLockElement !== canvas) lockPointer(); });

document.addEventListener('mousemove', (e) => {
  if ((mode !== 'walk' && mode !== 'bean') || document.pointerLockElement !== canvas) return;
  player.yaw -= e.movementX * 0.0022;
  player.pitch = THREE.MathUtils.clamp(player.pitch - e.movementY * 0.0022, mode === 'bean' ? -0.9 : -1.4, mode === 'bean' ? 0.6 : 1.4);
});

window.addEventListener('keydown', (e) => {
  if (e.target === ui.chatInput || e.target === ui.handle) return;
  if (e.target.closest?.('[data-owns-keys]')) return; // typing into Notepad, the DOS prompt, Minesweeper...
  if (dialog.isOpen() || phone.isOpen()) return; // the message box and the phone own the keyboard
  if (mode === 'console') { // sitting in front of the TV: keys go to the terminal or the game; backtick stands up
    if (e.code === 'Backquote') { e.preventDefault(); e.stopPropagation(); leaveConsole(); }
    else if (n64.key(e)) e.stopPropagation();
    return;
  }
  if (mode === 'amiga') { // leaning in at the Amiga: every key goes to it; backtick stands up
    if (e.code === 'Backquote') { e.preventDefault(); e.stopPropagation(); leaveAmiga(); }
    else if (room.amiga.key(e)) e.stopPropagation();
    return;
  }
  if (mode === 'seated') {
    if (e.code === 'Backquote') { e.preventDefault(); e.stopPropagation(); standUp(); }
    else if (!ui.bsod.hidden) { e.preventDefault(); e.stopPropagation(); recoverFromCrash(); } // any key
    return; // everything else belongs to the game
  }
  if (mode === 'bean' && (BEAN_UP_KEYS.has(e.code))) { e.preventDefault(); getUpFromBean(); return; } // any move key, E or Space
  if (mode !== 'walk' && mode !== 'bean') return;
  if (e.code === 'KeyT') { e.preventDefault(); openChat(); return; }
  if (e.code === 'Tab' && document.pointerLockElement) { e.preventDefault(); document.exitPointerLock(); return; } // free the mouse for the desktop
  if (e.code === 'KeyI') { desktop.toggle('irc'); return; }
  if (e.code === 'KeyM') { desktop.toggle('lanamp'); return; }
  if (e.code === 'KeyH') { e.preventDefault(); desktop.toggle('ie'); return; } // preventDefault: the window focuses its address bar, which would swallow the h
  if (e.code === 'KeyN') { toast(voices.toggle() ? 'Noises on.' : 'Noises off.'); return; }
  if (e.code === 'KeyG') { eatGarlic(); return; }
  if (e.code === 'KeyY') { e.preventDefault(); if (e.repeat) return; if (e.shiftKey) voice.leave(); else voice.toggleMic(); return; }
  if (amp?.keys[e.code]) { amp.keys[e.code](); return; }
  keys.add(e.code);
  if (e.code === 'KeyE' && target) interact(target);
  if (e.code === 'KeyF' && target?.kind === 'pizza') flipLid(target.box);
  if (e.code === 'KeyF' && target?.station) {
    const b = target.station.bench;
    if (b && !b.ready) openRear(b); else openPcMenu(target.station);
  }
}, true);
window.addEventListener('keyup', (e) => {
  keys.delete(e.code);
  if (mode === 'console' && n64.key(e)) e.stopPropagation();
  if (mode === 'amiga' && room.amiga.key(e)) e.stopPropagation();
}, true);
window.addEventListener('blur', () => keys.clear());

ui.stand.addEventListener('click', standUp);
ui.mic.addEventListener('click', () => { voice.toggleMic(); ui.mic.blur(); });
ui.drink.addEventListener('click', drink);
ui.eat.addEventListener('click', eat);

/* ---------- interactions ---------- */
const ray = new THREE.Raycaster(undefined, undefined, 0, 1.9);
const centre = new THREE.Vector2(0, 0);

function findTarget() {
  ray.setFromCamera(centre, camera);
  for (const hit of ray.intersectObjects(room.interactables, true)) {
    const t = hit.object.userData.interact;
    if (!t) continue;
    if (t.kind === 'buddy' && party.buddy.state === 'away') continue; // he's in Singapore
    if (t.kind === 'lead' && party.leadIn) continue;                   // the lead only needs you when its plug is out
    return t;
  }
  return null;
}

const PROMPTS = {
  sit: (t) => {
    const who = link.occupant(t.station.index);
    if (t.station.bench) return `E · Sit down at ${t.station.name}  ·  F · Open the case`;
    if (!party.pcPowered(t.station.index)) return `${t.station.name} · No power  ·  F · Open the case`;
    const fiddle = party.pcs[t.station.index].linkDown ? 'F · Cable is out' : 'F · Open the case';
    return who ? `${t.station.name} · ${who.name}'s sitting here  ·  ${fiddle}` : `E · Sit down at ${t.station.name}  ·  ${fiddle}`;
  },
  'bench-place': (t) => `E · Unpack the ${benchPartName(t)}`,
  'bench-tower': (t) => {
    const b = room.benches[t.bench];
    const left = b.setup.missing().length;
    return b.setup.poweredOn ? `${t.station.name} · Starting up...` : `E · Behind the PC: plug things in  ·  ${left ? `${left} thing${left > 1 ? 's' : ''} to sort` : 'ready to switch on'}`;
  },
  buddy: () => (party.buddy.state === 'back' ? 'E · Macca is back. Ask about the RAM' : 'E · Talk to Macca'),
  switch: () => `E · Turn the lights ${room.lightsOn ? 'off' : 'on'}`,
  lead: () => 'E · Plug the extension lead back in',
  fan: () => `E · Turn the fan ${party.fan.on ? 'off' : 'on'}`,
  shop: () => 'E · Read the computer shop price list',
  phone: () => 'E · Use the phone',
  mobile: () => 'E · Pick up the mobile',
  pizza: (t) => (!t.box.open ? 'E · Open the pizza box' : `${t.box.slices > 0 ? `E · Eat a slice of pepperoni pizza (${t.box.slices} left)` : 'Empty box. Just grease.'}  ·  F · Close the lid`),
  taped: () => 'E · Talk to DUCTAPE',
  door: () => `E · ${room.door.open ? 'Close' : 'Open'} the door${delivery.waiting && !room.door.open ? '  ·  Somebody is knocking' : ''}`,
  drink: () => 'E · Crack a Volt Cola',
  soda: () => 'E · Pour a Citrus Zap into a red cup',
  eat: () => 'E · Grab a handful of Nachoz or Cheez Curlz',
  amiga: () => 'E · Use the Amiga',
  console: () => 'E · Play the console (it runs N64 ROMs from your own drive)',
  beanbag: () => 'E · Sit in the bean bag',
  eject: (t) => `E · ${t.station.tower.cdrom?.open ? 'Close' : 'Open'} the CD-ROM tray`,
  burner: (t) => (party.job ? `E · CD-R: writing ${Math.floor(party.burnProgress() * 100)}%` : `E · Burn a CD (${party.burnSpeedOf(t.station.index)}x)`),
};

function interact(t) {
  if (t.kind === 'bench-place') {
    const b = room.benches[t.bench];
    if (b.place(t.part)) sfx.plug(true);
  } else if (t.kind === 'bench-tower') openRear(room.benches[t.bench]);
  else if (t.kind === 'sit') {
    const who = link.occupant(t.station.index);
    if (!party.pcPowered(t.station.index)) toast(t.station.bench ? `${t.station.name} is switched off.` : `${t.station.name} has no power. Somebody should look at the extension lead.`);
    else if (who) toast(`${who.name} is on that one. Find a free PC.`);
    else sitDown(t.station);
  } else if (t.kind === 'console') playConsole();
  else if (t.kind === 'amiga') useAmiga();
  else if (t.kind === 'beanbag') sitInBean();
  else if (t.kind === 'drink') drink();
  else if (t.kind === 'soda') soda();
  else if (t.kind === 'eat') eat();
  else if (t.kind === 'eject') { const open = t.station.tower.cdrom.toggle(); sfx.tray(open); }
  else if (t.kind === 'burner') openBurner(t.station.index);
  else if (t.kind === 'shop') openShop();
  else if (t.kind === 'buddy') openMacca();
  else if (t.kind === 'switch') flipLights();
  else if (t.kind === 'lead') party.plugLead();
  else if (t.kind === 'fan') party.setFan(!party.fan.on, 'switch');
  else if (t.kind === 'phone') openPhone();
  else if (t.kind === 'mobile') openMobile();
  else if (t.kind === 'pizza') { if (t.box.open) eatPizza(t.box); else flipLid(t.box); }
  else if (t.kind === 'taped') talkToTaped();
  else if (t.kind === 'door') useDoor();
}

// The light switch by the stairs door. In the dark the CRTs are most of the light in the room.
function flipLights() {
  const on = room.toggleLights();
  sfx.lightSwitch(on);
  analytics.lightSwitch(on);
  banter.react('lights', myName);
  chatLine(on ? 'The lights are back on.' : 'The lights are off. The monitors are the only light in the room.', true);
}

// The door to the stairs. Mum is upstairs, and she can hear everything.
const MUM = [
  'Mum, from upstairs: "Keep it down, we can hear the explosions."',
  'Mum, from upstairs: "Is anybody on the phone? I\'m expecting a call."',
  'Mum, from upstairs: "Do your friends want toasties?"',
  'Mum, from upstairs: "Whose car is that across the driveway?"',
];
let doorOpens = 0;
function useDoor() {
  const d = room.door;
  if (d.open && player.pos.z < ROOM.minZ + 0.3) { toast("You're standing in the doorway."); return; }
  sfx.door();
  if (d.toggle() && !delivery.waiting) { toast(MUM[doorOpens++ % MUM.length]); banter.react('door'); }
}

/* ---------- errands: little message boxes ---------- */
function openErrand(spec, onClosed) {
  if (mode !== 'walk') return;
  if (document.pointerLockElement) document.exitPointerLock();
  keys.clear();
  ui.prompt.hidden = true;
  mode = 'dialog';
  dialog.open(spec, () => { onClosed?.(); if (mode === 'dialog') { mode = 'walk'; lockPointer(); } });
}

// swap what the open message box says (a call connecting) without giving the mouse back in between
function swapErrand(spec, onClosed) {
  if (mode !== 'dialog') return;
  dialog.open(spec, () => { onClosed?.(); if (mode === 'dialog') { mode = 'walk'; lockPointer(); } });
}

const clockText = (secs) => `${Math.floor(secs / 60)}:${String(Math.floor(secs % 60)).padStart(2, '0')}`;

// F at a PC: the case comes off. Cable, RAM, CPU, and the file sharing you keep having to fix.
function openPcMenu(station) {
  const i = station.index;
  openErrand({
    title: `${station.name}.SYS`,
    render: () => {
      const buttons = [];
      const lines = [];
      const pc = party.pcs[i];
      const who = link.occupant(i);
      if (who) return { lines: [`${who.name} is sitting at this PC. Leave the case alone.`], progress: null, buttons: [{ label: 'Close' }] };
      const behind = station.bench ? [{ label: 'Behind the PC', run: () => setTimeout(() => openRear(station.bench), 0) }] : [];
      if (station.bench && !party.pcPowered(i)) return { lines: ['This PC is switched off.'], progress: null, buttons: [...behind, { label: 'Close' }] };
      if (!party.pcPowered(i)) { // the extension lead's out of the wall
        return {
          lines: [party.leadIn ? 'No power yet. It is going through POST.' : 'Dead. The power board behind this table is not getting anything. The extension lead has come out of the wall.'],
          progress: null,
          buttons: party.leadIn ? [{ label: 'Close' }] : [{ label: 'Plug the lead back in', run: () => party.plugLead() }, { label: 'Close' }],
        };
      }

      // the cable
      if (pc.linkDown) {
        lines.push(party.net === 'coax' ? 'The T-connector on the back of this box has come loose.' : 'The network lead has been pulled out of the back of this box.');
        buttons.push({ label: party.net === 'coax' ? 'Re-seat the T-connector' : 'Plug the lead back in', run: () => party.fixLink(i), keep: true });
      } else if (!party.pcLinkUp(i)) {
        lines.push('No link light. On coax the whole cable goes down when one T-connector comes loose. Check the back of each tower.');
      } else {
        lines.push(`${NET[party.net].label}: link light is on.`);
      }

      // file sharing: the job that never ends
      const fix = party.fixes.get(i);
      let progress = null;
      if (pc.share === 'ok') lines.push('File sharing: C:\\WAREZ is shared.');
      else if (fix?.error) {
        lines.push(`NETWORK.CPL: ${fix.error}`);
        buttons.push({ label: 'Try again', run: () => { party.dismissFix(i); party.startFix(i); }, keep: true });
      } else if (fix) {
        lines.push(`NETWORK.CPL: ${SHARE_STEPS[fix.step].text}...`);
        progress = party.fixProgress(i);
      } else {
        lines.push('File sharing: off. Network Neighborhood says "Unable to browse network."');
        buttons.push({ label: 'Fix file sharing', disabled: !party.canFixShare(i), run: () => party.startFix(i), keep: true });
      }

      // memory
      lines.push(`RAM: ${pc.ram}MB.${pc.ram >= RAM.max ? ' Every slot is full.' : ''}`);
      if (party.canFitRam(i)) buttons.push({ label: `Fit a ${RAM.stick}MB SIMM (${party.sticks} in your pocket)`, run: () => party.fitRam(i), keep: true });
      else if (pc.ram < RAM.max && party.buddy.state === 'away') lines.push(`Macca's RAM lands in about ${clockText(party.buddySecondsLeft())}.`);

      // processor and heat
      if (pc.crashed) lines.push('This box has blue screened. Sit down and press a key.');
      else {
        const table = party.ocTable(i);
        lines.push(`CPU: ${table[pc.oc].label}. Case temperature ${celsius(pc.heat)}°C${party.fan.on ? '' : ', and the fan is off'}.`);
        if (progress === null && (pc.oc > 0 || pc.heat > 0)) progress = pc.heat / HEAT.crash;
        const next = table[(pc.oc + 1) % table.length];
        buttons.push({ label: pc.oc === table.length - 1 ? `Put the jumpers back (${next.mhz}MHz)` : `Move the jumpers (${next.mhz}MHz)`, run: () => party.cycleOverclock(i), keep: true });
      }
      buttons.push(...behind, { label: 'Close' });
      return { lines, progress, buttons };
    },
  });
}

function openMacca() {
  openErrand({
    title: 'MACCA.EXE',
    render: () => {
      const b = party.buddy;
      if (b.state === 'back') {
        return {
          lines: [`Macca is back from Singapore, a bit jet-lagged. He has ${b.sticks} SIMM${b.sticks > 1 ? 's' : ''} in a sock.`],
          progress: null,
          buttons: [{ label: `Take the RAM (${b.sticks})`, run: () => party.collectRam() }, { label: 'Later' }],
        };
      }
      return {
        lines: [
          'Macca is off to Singapore for work. He says RAM is dirt cheap over there.',
          `The shop here wants $${RAM.shopPrice} for a ${RAM.stick}MB SIMM. Macca will get you one for $${RAM.sgPrice}, cash up front. He is back in about ${Math.round((RAM.tripMinutes * SEC_PER_GAME_MIN) / 60)} minutes.`,
          `Cash $${party.cash}. SIMMs in your pocket: ${party.sticks}.`,
        ],
        progress: null,
        buttons: [
          { label: `Give him $${party.ramCost(1)} (1 SIMM)`, disabled: !party.canSendBuddy(1), run: () => party.sendBuddy(1) },
          { label: `Give him $${party.ramCost(2)} (2 SIMMs)`, disabled: !party.canSendBuddy(2), run: () => party.sendBuddy(2) },
          { label: 'Nah' },
        ],
      };
    },
  });
}

function openShop() {
  openErrand({
    title: 'PRICELIST.TXT',
    render: () => {
      const buttons = [{ label: 'Close' }];
      let lines;
      if (party.net !== 'coax') lines = ['COMPUTER SHOP, NOV 98.', 'You already bought the hub. Everything else on the list is dearer than the Volt.'];
      else if (party.ordered('hub')) {
        lines = [`Hub on order. Somebody's mum is driving it over: ${clockText(party.secondsUntil('hub'))}.`];
      } else {
        lines = [
          'COMPUTER SHOP, NOV 98. 8-port 10BASE-T hub, $' + SHOP.hubCost + '.',
          'Coax is one cable and one loose T-connector away from everybody losing their game. A hub fixes that.',
          `Cash $${party.cash}.`,
        ];
        buttons.unshift({ label: `Order the hub ($${SHOP.hubCost})`, disabled: !party.canOrderHub(), run: () => party.orderHub(), keep: true });
      }
      return { lines, progress: null, buttons };
    },
  });
}

// The wall phone. Picking it up gives you a dial tone, and the dial tone goes on until you choose a number or hang up.
// Choosing one dials it (the keypad tones), and the line rings until somebody answers. The numbers are in js/handset.js.
const pizzaSpec = () => ({
  title: 'SHACK.TXT',
  render: () => {
    const buttons = [{ label: 'Hang up' }];
    let lines;
    if (party.ordered('pizza')) lines = ['Pepperoni, done. Hang up and he will be at the door.'];
    else {
      lines = [
        'PIZZA SHACK. Hot & fresh, delivered in 30 min.',
        `1. Large pepperoni, ${PIZZA.slices} slices ... $${PIZZA.cost}`,
        '2. Large pepperoni, extra pepperoni ... same pizza',
        `Cash $${party.cash}.`,
      ];
      buttons.unshift({ label: `Order a large pepperoni ($${PIZZA.cost})`, disabled: !party.canOrderPizza(), run: () => party.orderPizza(), keep: true });
    }
    return { lines, progress: null, buttons };
  },
});

const dazzaSpec = () => ({
  title: 'DAZZA.TEL',
  render: () => {
    const buttons = [{ label: 'Hang up' }];
    let lines;
    if (party.net === 'switch') {
      lines = ["Dazza's dad works in IT for the government. The switch has a sticker on it.", 'He wants it back before 6:00 AM, in the same condition. Do not spill Volt on it.'];
    } else if (party.dadLent) {
      lines = ["Dazza's dad took his switch back. He is not lending it twice."];
    } else if (party.ordered('switch')) {
      lines = [`Dazza's dad is driving the switch over: ${clockText(party.secondsUntil('switch'))}.`];
    } else if (party.net === 'coax') {
      lines = ["Dazza's dad works in IT for the government. He has a 16-port switch in the boot of his car.", '"Get a hub in first. I am not plugging it into a coax mess."'];
    } else {
      lines = ["Dazza's dad works in IT for the government. He has a 16-port switch he is not supposed to take home.", 'He will lend it for the night, and he wants it back by 6:00 AM.'];
      buttons.unshift({ label: 'Ask Dazza to borrow it', disabled: !party.canBorrowSwitch(), run: () => party.borrowSwitch(), keep: true });
    }
    return { lines, progress: null, buttons };
  },
});

const SPECS = { pizza: pizzaSpec, dazza: dazzaSpec };
// what happens when the receiver goes down on a call: the pizza clock only starts once you have hung up
const HUNG_UP = { pizza: () => party.pizzaHungUp() };

function openPhone() {
  let tone = null;
  const hangUp = () => { tone?.stop(); tone = null; };
  openErrand({
    title: 'WALL PHONE',
    render: () => ({
      lines: ['The phone is on the wall by the stairs, with the Pizza Shack magnet stuck next to it. Whose number do you want?'],
      progress: null,
      buttons: [
        { label: 'Pizza Shack', run: () => setTimeout(() => dialWall(CONTACTS[0]), 0) },
        { label: 'Dazza', run: () => setTimeout(() => dialWall(CONTACTS[1]), 0) },
        { label: 'Hang up', run: () => sfx.receiverClick() },
      ],
    }),
  }, hangUp);
  if (mode === 'dialog') tone = sfx.dialTone();
}

// dial a contact on the wall phone: the keypad tones, then ringing, then the call connects to their dialog
function dialWall(contact) {
  const call = sfx.dialCall(contact.number, { digits: true });
  let timer = 0;
  const stop = () => { clearTimeout(timer); call.stop(); };
  analytics.phoneCall(contact.id, 'wall');
  openErrand({
    title: 'WALL PHONE',
    render: () => ({ lines: [`Dialling ${contact.number}...`], progress: null, buttons: [{ label: 'Hang up', run: () => sfx.receiverClick() }] }),
  }, stop);
  timer = setTimeout(() => { sfx.receiverClick(); swapErrand(SPECS[contact.id](), HUNG_UP[contact.id]); }, call.duration * 1000);
}

// The mobile on the desk at PC-02: Snake, the phone book, and calls to the same numbers as the wall phone.
function openMobile() {
  if (mode !== 'walk') return;
  if (document.pointerLockElement) document.exitPointerLock();
  keys.clear();
  ui.prompt.hidden = true;
  mode = 'dialog';
  phone.open({
    clock: () => ui.clock.textContent,
    onEvent: (e) => {
      if (e.type === 'ring') analytics.phoneCall(e.contact?.id ?? 'unknown', 'mobile');
      else if (e.type === 'snake') analytics.snakeOver(e.score, e.eaten);
    },
    done: (result) => {
      mode = 'walk';
      if (result?.call) openErrand(SPECS[result.call.id](), HUNG_UP[result.call.id]);
      else lockPointer();
    },
  });
}

function openBurner(pcIndex = BURNER.pc) {
  const name = room.stations[pcIndex].name, speed = party.burnSpeedOf(pcIndex), own = pcIndex !== BURNER.pc;
  openErrand({
    title: 'CDWRITE.EXE',
    render: () => {
      const job = party.job;
      if (!party.pcPowered(pcIndex)) return { lines: [`${name} has no power. The drive is dead and so is the write.`], progress: null, buttons: [{ label: 'Close' }] };
      if (job) {
        const at = room.stations[job.pc].name;
        return {
          lines: [
            `Writing ${DISCS[job.kind].name} at ${job.speed}x on ${at}. ${Math.floor(party.burnProgress() * 100)}% done, ${clockText(party.burnSecondsLeft())} to go.`,
            `Keep off ${at} while it writes. One game of DOOM and it is a coaster.`,
          ],
          progress: party.burnProgress(),
          buttons: [{ label: 'Close' }, { label: 'Cancel write', run: () => party.cancelBurn() }],
        };
      }
      return {
        lines: [
          own ? `CD-R drive, ${speed}x. Yours: the other burner is in PC-04, and there is one blank on the go at a time.` : `CD-R drive, ${speed}x. The only burner in the basement, and it is in PC-04.`,
          `A blank is $${BURNER.blankCost}. A ${party.burnMinutes(speed)}-minute write. Mates pay $${DISCS.MIX.pays} for a MIX CD.`,
          `Cash $${party.cash}. Discs burned: ${party.discs}. Coasters: ${party.coasters}.`,
        ],
        progress: null,
        buttons: [
          { label: 'Burn a MIX CD', disabled: !party.canBurn(pcIndex), run: () => party.startBurn('MIX', pcIndex), keep: true },
          { label: 'Close' },
        ],
      };
    },
  });
}

const DRINK_LINES = ['*psssht*', 'Tastes like a battery. Excellent.', 'You can hear the hub blinking.', 'Your aim feels... faster.'];
const SODA_LINES = ['Fizz. Lime. A bit of sherbet.', 'Warm already. Still good.', 'The cup is soft. It will survive.', 'It is the colour of a highlighter. You drink it anyway.'];
const EAT_LINES = ['Crunch.', 'Orange fingers acquired.', 'Nuclear cheese: confirmed.', 'You wipe your hand on your jeans. Mostly.'];

function drink() {
  stats.caffeine = Math.min(100, stats.caffeine + 32);
  stats.cans++;
  sfx.canOpen();
  sfx.gulp(2, 0.95);
  analytics.drinkCola(stats.caffeine);
  toast(stats.caffeine > 85 ? 'You can hear colours. Maybe slow down.' : DRINK_LINES[stats.cans % DRINK_LINES.length]);
}

let sodas = 0;
function soda() {
  stats.caffeine = Math.min(100, stats.caffeine + 18);
  sfx.fizz();
  toast(SODA_LINES[sodas++ % SODA_LINES.length]);
}

/* ---------- pizza: boxes, slices, and who is eating what ---------- */
const handSlice = (() => { // the slice you hold up in front of the camera
  const g = new THREE.Group();
  const w = (r, h, y, hex) => { const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, 3, 1, false, 0, Math.PI * 2 / 3), new THREE.MeshStandardMaterial({ color: hex, roughness: 0.7 })); m.position.y = y; return m; };
  g.add(w(0.12, 0.012, 0, 0xd9a04a), w(0.105, 0.016, 0.005, 0xf2c14e)); // --pizza-crust, --pizza-cheese
  const pep = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.018, 8), new THREE.MeshStandardMaterial({ color: 0xb22a1e })); // --pepperoni
  pep.position.set(0.04, 0.008, 0.02); g.add(pep);
  g.visible = false; scene.add(camera); camera.add(g);
  return g;
})();
// garlic bread: a foil-wrapped bundle (what you carry) and the loaf on its foil tray (what you eat)
const foilMat = new THREE.MeshStandardMaterial({ color: 0xc9ced4, roughness: 0.35, metalness: 0.7 }); // --foil
function foilBundle() {
  const g = new THREE.Group();
  g.add(new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.06, 0.09), foilMat));
  const ridge = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.012, 0.025), foilMat); ridge.position.y = 0.036; g.add(ridge);
  for (const sx of [-1, 1]) { const t = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.04, 0.05), foilMat); t.position.x = sx * 0.16; t.rotation.set(0.5, 0.3, 0.2); g.add(t); }
  return g;
}
const handFoil = foilBundle();
handFoil.visible = false; camera.add(handFoil);
const handBread = (() => {
  const g = new THREE.Group();
  const std = (hex) => new THREE.MeshStandardMaterial({ color: hex, roughness: 0.7 });
  g.add(new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.008, 0.11), foilMat));                       // the peeled foil under it
  const loaf = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.04, 0.08), std(0xd9a04a)); loaf.position.y = 0.024; g.add(loaf);   // --pizza-crust
  const butter = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.01, 0.05), std(0xf2c14e)); butter.position.y = 0.047; g.add(butter); // --pizza-cheese
  g.visible = false; camera.add(g);
  return g;
})();
let handT = -1, handMesh = handSlice, handBase = 0.75;
const HAND = { raise: 0.5, bite: 0.6, lower: 0.4 };
function stepHandSlice(dt) {
  handFoil.visible = held.garlic && handT < 0 && mode === 'walk';
  handFoil.position.set(0.2, -0.3, -0.55);
  handFoil.rotation.set(-0.35, 0.5, 0.15);
  if (handT < 0) return;
  handT += dt;
  const total = HAND.raise + 3 * HAND.bite + HAND.lower;
  const k = Math.min(1, handT / HAND.raise, (total - handT) / HAND.lower);
  const up = Math.max(0, k), bites = Math.max(0, Math.min(3, Math.floor((handT - HAND.raise) / HAND.bite)));
  handMesh.position.set(0.14 - up * 0.12, -0.3 + up * 0.18, -0.6 + up * 0.12);
  handMesh.rotation.set(-0.5 - up * 0.4, 0.4, 0.3);
  handMesh.scale.setScalar(handBase * (1 - bites * 0.3));
  if (handT >= total) { handT = -1; handMesh.visible = false; handMesh = handSlice; handBase = 0.75; }
}
// the lid of a Pizza Shack box: F flips it either way, and E on a shut box opens it
function flipLid(box) {
  const open = box.toggle();
  if (open) sfx.foil(); else sfx.thud();
}
function eatPizza(box) {
  if (box.slices <= 0) { toast('Empty box. Just grease and one crust.'); return; }
  if (handT >= 0) return;
  box.setSlices(box.slices - 1);
  handT = 0; handSlice.visible = true;
  stats.snacks = Math.min(100, stats.snacks + 20);
  stats.handfuls++;
  sfx.crunch();
  analytics.eatSnack(stats.snacks);
  toast(PIZZA_LINES[stats.pizzaSlices++ % PIZZA_LINES.length]);
}
const PIZZA_LINES = ['Cold pepperoni. Still good.', 'A string of cheese reaches the box. You follow it.', 'Grease, salt and regret.', 'You eat the pizza like a man with a frag limit.'];
stats.pizzaSlices = 0;

// G: unwrap the garlic bread the driver gave you and eat it
const GARLIC_LINES = ['Butter, garlic and a bit of foil. Worth the wait.', 'Still hot. The roof of your mouth objects.', 'You will smell of garlic until Tuesday.'];
stats.garlic = 0;
function eatGarlic() {
  if (!held.garlic) { toast('You are not holding any garlic bread.'); return; }
  if (handT >= 0) return;
  held.garlic = false;
  handMesh = handBread; handBase = 1; handT = 0; handBread.visible = true;
  stats.snacks = Math.min(100, stats.snacks + 30);
  stats.handfuls++;
  sfx.foil();
  setTimeout(() => sfx.crunch(), 450);
  analytics.eatSnack(stats.snacks);
  toast(GARLIC_LINES[stats.garlic++ % GARLIC_LINES.length]);
}

/* ---------- the pizza driver: knocks, waits on the landing, and hands it all over when the door opens ---------- */
const driverLoad = (() => { // what he is holding out: the box, with a can and the foil bundle on top
  const g = new THREE.Group();
  const std = (hex, o = {}) => new THREE.MeshStandardMaterial({ color: hex, roughness: 0.7, ...o });
  g.add(new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.05, 0.42), shackBoxMats().closed)); // the Pizza Shack box, shut
  const bundle = foilBundle(); bundle.position.set(-0.07, 0.06, 0.05); g.add(bundle);
  const can = new THREE.Mesh(new THREE.CylinderGeometry(0.033, 0.033, 0.12, 14), std(0xc4161c, { metalness: 0.4, roughness: 0.4 })); // --volt-can
  can.position.set(0.12, 0.085, -0.06); g.add(can);
  g.position.set(0, 1.05, -0.4); // his front is -z
  driver.group.add(g);
  return g;
})();
const KNOCKS = [
  'Three knocks on the basement door. That will be the pizza.',
  'Three more knocks. He is not going away.',
  'More knocking. Somebody open the door.',
];
function stepDelivery(dt) {
  if (delivery.leaveIn > 0 && (delivery.leaveIn -= dt) <= 0) driver.group.visible = false;
  if (!delivery.waiting) return;
  const d = room.door;
  if (d.open) { if (d.t > 0.7) handOver(); return; }
  if ((delivery.knockIn -= dt) > 0) return;
  delivery.knockIn = 9;
  sfx.knock();
  toast(KNOCKS[delivery.knocks % KNOCKS.length]);
  if (delivery.knocks++ === 0) chatLine('Somebody is knocking on the basement door. Nobody is expecting anyone except the pizza.', true);
}
// the door is open and he is standing there: the pizza goes on a table, the Volt gets cracked, and the garlic bread is yours
function handOver() {
  delivery.waiting = false; delivery.leaveIn = 5;
  driverLoad.visible = false;
  const box = room.addPizza();
  box.fresh = true;
  held.garlic = true;
  sfx.foil();
  drink();
  toast('He hands you the pizza, a Volt Cola and garlic bread in foil. G to unwrap it.');
  chatLine('The driver hands over a large pepperoni, a can of Volt Cola and a garlic bread in foil. "The garlic bread is a mistake on the docket. Keep it." Press G to unwrap it.', true);
  banter.react('pizza');
}

// the regulars eat and drink too: pizza from whichever box has a slice left, handfuls of Nachoz or Cheez Curlz, cans of Volt.
// The man on the ceiling has his own pizza.
const eaters = [macca, ...regulars];
const SNACKING = ['pizza', 'snack', 'drink', 'curl', 'drink']; // cans and chips come round more often than pizza
let nextEat = 5;
function stepEaters(dt, now) {
  nextEat -= dt;
  if (nextEat > 0) return;
  nextEat = 8 + Math.random() * 12;
  const who = eaters[Math.floor(Math.random() * eaters.length)];
  if (!who.group.visible || who.eatT >= 0) return;
  let kind = SNACKING[Math.floor(Math.random() * SNACKING.length)];
  if (kind === 'pizza') {
    const box = room.pizzaBoxes.find((b) => b.slices > 0 && Math.random() < 0.6) ?? room.pizzaBoxes.find((b) => b.slices > 0);
    if (box) { box.setOpen(true); box.setSlices(box.slices - 1); } else kind = 'snack'; // box is empty: reach for the chips; a shut box gets its lid lifted first
  }
  who.eat(kind);
}

const TAPED_LINES = [
  "DUCTAPE: Don't ask how I got up here. Ask how I get down.",
  'DUCTAPE: Best seat in the house. Nobody can camp me.',
  'DUCTAPE: Could you pass up a slice? I can only reach the duct.',
  'DUCTAPE: I lost a bet. It was not even a good bet.',
  'DUCTAPE: The tape is the only thing holding this LAN together. Same as the cables.',
  'DUCTAPE: Quick, tell my mum I am studying.',
];
let tapedLine = 0;
function talkToTaped() {
  toast(TAPED_LINES[tapedLine++ % TAPED_LINES.length]);
  if (tapedLine % 3 === 0) { if (taped.eatT < 0) taped.eat(); }
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
  return netHint(pc.game, pc.kind);
}

/* ---------- which game this PC runs ---------- */
// The game you get when you sit down, remembered between visits. In a deathmatch the PC runs
// the match's game instead, whatever this says.
let myGame = DEFAULT_GAME;
try { myGame = gameOf(localStorage.getItem('lan98.game')).id; } catch { /* storage can be blocked */ }

const gameTitle = () => `${gameOf(pc.game ?? myGame).name}${pc.kind && pc.kind !== 'solo' ? ' deathmatch' : ''}`;

function updateGameBtn() {
  const locked = inMatch(); // the match picks the game
  const g = gameOf(locked ? link.match.game : myGame);
  banter.game = g.id; // the regulars talk about what you are playing
  ui.gameBtn.textContent = `Game: ${g.name}`;
  ui.gameBtn.disabled = locked;
  ui.gameBtn.title = locked ? 'The deathmatch decides the game' : 'Reboot into another game';
  ui.gameBtn.onmouseup = () => ui.gameBtn.blur(); // or Space and Enter in the game would click it
}

ui.gameBtn.addEventListener('click', () => {
  if (mode !== 'seated' || inMatch()) return;
  myGame = nextGame(myGame);
  try { localStorage.setItem('lan98.game', myGame); } catch { /* fine, it just won't be remembered */ }
  updateGameBtn();
  toast(`Rebooting into ${gameOf(myGame).name}...`);
  if (ui.bsod.hidden) bootForMatch();
});

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
    ui.seatedBar.hidden = false;
    if (station.bench && !station.bench.ready) { // still in its POST: watch the screen until it gets to Windows
      ui.monitor.hidden = true;
      ui.seatedStatus.textContent = 'Starting up...';
      return;
    }
    startSeat(station);
  });
  sitDown.station = station;
  analytics.sitDown(station);
}

// the PC is up and you are in front of it: the game's canvas goes over the glass and the machine boots
function startSeat(station) {
  {
    applyCrtLook(station);
    ui.monitor.hidden = false;
    pc.onReady = () => {
      analytics.gameStart(gameTitle());
      if (mode === 'seated') ui.seatedStatus.textContent = seatedStatusText();
    };
    updateGameBtn();
    if (party.phase() === 'rts' && !seatHintShown) { // the room moved on to StarCraft; this box still runs what it runs
      seatHintShown = true;
      toast(`StarCraft is on across the room. This box has ${gameOf(myGame).name}.`);
    }
    if (party.pcs[station.index].crashed) showCrash(); // somebody left it blue screened
    else {
      bootForMatch();
      ui.seatedStatus.textContent = seatedStatusText();
    }
    updateDM();
  }
}

// the tube you chose: a small one is soft and a bit dim, a 19-inch is sharp. Club PCs are all 17-inch.
function applyCrtLook(station) {
  const fx = station.bench?.build ? BUILD.specOf(station.bench.build).crt.fx : { blur: 0, bright: 1, flicker: false };
  ui.monitor.style.filter = fx.blur || fx.bright !== 1 ? `blur(${fx.blur}px) brightness(${fx.bright})` : '';
  ui.monitor.classList.toggle('flicker', !!fx.flicker);
}

function standUp() {
  if (mode !== 'seated') return;
  const station = sitDown.station;
  pc.pause();
  ui.bsod.hidden = true;
  analytics.standUp(gameTitle());
  banter.game = null;
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

/* ---------- the bean bag ---------- */
// E at the bean bag: drop into the dent. The whump plays as you land; you can look around from down there.
// Any move key, E or Space gets you out again (it takes a second).
const BEAN_UP_KEYS = new Set(['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'KeyE', 'Space']);
const bean = { sinkT: 1 }; // 0 just landed .. 1 settled into the vinyl

function sitInBean() {
  if (mode !== 'walk' || !room.bean) return;
  ui.prompt.hidden = true;
  keys.clear();
  target = null;
  const { seat } = room.bean;
  // face back across the room, toward the middle of the floor
  const yaw = Math.atan2(-(0 - seat.x), -(0 - seat.z));
  const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(-0.12, yaw, 0, 'YXZ'));
  startTween(seat.clone(), q, 0.6, () => {
    player.yaw = yaw; player.pitch = -0.12;
    bean.sinkT = 0;
    mode = 'bean';
    sfx.beanBag(true);
    ui.prompt.textContent = 'E · Get up';
    ui.prompt.hidden = false;
  });
}

function getUpFromBean() {
  if (mode !== 'bean') return;
  sfx.beanBag(false);
  ui.prompt.hidden = true;
  const { seat } = room.bean;
  // step out the front of the bag, toward the middle of the room (the back is two walls)
  const out = new THREE.Vector3(-seat.x, 0, -seat.z).normalize().multiplyScalar(0.85);
  const pos = new THREE.Vector3(seat.x + out.x, EYE, seat.z + out.z);
  const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(player.pitch, player.yaw, 0, 'YXZ'));
  startTween(pos, q, 0.6, () => {
    player.pos.copy(pos);
    mode = 'walk';
    ui.hud.hidden = false;
    lockPointer();
  });
}

/* ---------- the console under the TV ---------- */
// E at the TV: drop onto the carpet in front of it. The TV shows the console's terminal, then the game.
function playConsole() {
  if (document.pointerLockElement) document.exitPointerLock();
  ui.prompt.hidden = true;
  keys.clear();
  const { view, look } = room.tv;
  const aim = look.clone(); aim.y -= 0.07; // aim a little below the glass so it sits high and the bar below never covers the prompt
  startTween(view.clone(), cameraPoseLookingAt(view, aim), 0.9, () => {
    mode = 'console';
    ui.hud.hidden = true;
    ui.consoleBar.hidden = false;
    n64.enter();
    refreshConsoleBar(true);
  });
}

function leaveConsole() {
  if (mode !== 'console') return;
  n64.leave();
  ui.consoleBar.hidden = true;
  const { view, look } = room.tv;
  const pos = new THREE.Vector3(view.x, EYE, view.z);
  const q = cameraPoseLookingAt(pos, look);
  startTween(pos, q, 0.7, () => {
    const e = new THREE.Euler().setFromQuaternion(q, 'YXZ');
    player.pos.copy(pos); player.yaw = e.y; player.pitch = e.x;
    mode = 'walk';
    ui.hud.hidden = false;
    lockPointer();
  });
}
/* ---------- the Amiga 500 ---------- */
// E at the Amiga (front-left desk): nobody owns it, so you lean in. Keys go to the emulator (js/amiga.js).
function useAmiga() {
  const desk = room.amigaDesk;
  if (document.pointerLockElement) document.exitPointerLock();
  ui.prompt.hidden = true;
  keys.clear();
  startTween(desk.view.clone(), cameraPoseLookingAt(desk.view, desk.look), 0.9, () => {
    mode = 'amiga';
    ui.hud.hidden = true;
    ui.amigaBar.hidden = false;
    room.amiga.enter();
  });
}

function leaveAmiga() {
  if (mode !== 'amiga') return;
  room.amiga.leave();
  ui.amigaBar.hidden = true;
  amigaPanel?.close();
  const { look } = room.amigaDesk;
  const pos = new THREE.Vector3(look.x + 1.3, EYE, look.z);
  const q = cameraPoseLookingAt(pos, look);
  startTween(pos, q, 0.7, () => {
    const e = new THREE.Euler().setFromQuaternion(q, 'YXZ');
    player.pos.copy(pos); player.yaw = e.y; player.pitch = e.x;
    mode = 'walk';
    ui.hud.hidden = false;
    lockPointer();
  });
}
let amigaPanel = null;
$('ami-stand').addEventListener('click', leaveAmiga);
$('ami-setup').addEventListener('click', () => { amigaPanel ??= setupAmigaPanel(room.amiga); amigaPanel.toggle(); $('ami-setup').blur(); });
$('ami-reset').addEventListener('click', () => { room.amiga.reset(); $('ami-reset').blur(); });

n64.onstand = leaveConsole;
n64.onplay = () => analytics.consoleStart();

// the bar under the picture: buttons that do what the commands do, and what the console is up to
const conBtn = (id, fn) => { const b = $(id); b.addEventListener('click', () => { fn(); b.blur(); }); return b; }; // blur: or Enter in the game would click it
conBtn('con-stand', leaveConsole);
conBtn('con-open', () => n64.run({ type: 'open-folder' }));
conBtn('con-add', () => n64.run({ type: 'open-files' }));
const conMenu = conBtn('con-menu', () => { if (n64.menu) n64.closeMenu(); else if (n64.running) n64.openMenu(); });
const conReset = conBtn('con-reset', () => n64.run({ type: 'reset' }));
const conSave = conBtn('con-save', () => n64.run({ type: 'save' }));
const conLoad = conBtn('con-load', () => n64.run({ type: 'restore' }));
let conShown = '';
function refreshConsoleBar(force = false) {
  const key = `${n64.status}|${n64.running}|${n64.menu}`;
  if (!force && key === conShown) return;
  conShown = key;
  ui.consoleStatus.textContent = n64.status;
  conMenu.disabled = !n64.running;
  conReset.disabled = conSave.disabled = conLoad.disabled = !n64.running;
}
// ROM files and folders can be dropped on the page while you are at the console
addEventListener('dragover', (e) => { if (mode === 'console' && e.dataTransfer?.types.includes('Files')) e.preventDefault(); });
addEventListener('drop', (e) => { if (mode !== 'console') return; e.preventDefault(); n64.dropped(e.dataTransfer); });

// A blue screen over your DOS window. Any key (or a click) restarts the game, with the case still hot.
function showCrash() {
  ui.bsod.hidden = false;
  pc.pause();
  ui.seatedStatus.textContent = 'Press any key to continue';
}

async function recoverFromCrash() {
  if (!seatedAt || ui.bsod.hidden) return;
  ui.bsod.hidden = true;
  party.reboot(seatedAt.index);
  ui.seatedStatus.textContent = 'Rebooting...';
  await pc.shutdown();
  if (mode === 'seated') bootForMatch();
}
ui.bsod.addEventListener('click', recoverFromCrash);

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
  const dr = room.door;
  p.x = THREE.MathUtils.clamp(p.x, ROOM.minX + RADIUS, ROOM.maxX - RADIUS);
  // through the open door and onto the landing, but only lined up with the doorway
  const through = dr.open && p.x > dr.minX + 0.15 && p.x < dr.maxX - 0.15;
  p.z = THREE.MathUtils.clamp(p.z, through ? ROOM.minZ - dr.depth + 0.2 : ROOM.minZ + RADIUS, ROOM.maxZ - RADIUS);
  if (p.z < ROOM.minZ + RADIUS) p.x = THREE.MathUtils.clamp(p.x, dr.minX + 0.15, dr.maxX - 0.15);
  for (const c of room.colliders) {
    const minX = c.minX - RADIUS, maxX = c.maxX + RADIUS, minZ = c.minZ - RADIUS, maxZ = c.maxZ + RADIUS;
    if (p.x > minX && p.x < maxX && p.z > minZ && p.z < maxZ) {
      const push = [[p.x - minX, 'x', minX], [maxX - p.x, 'x', maxX], [p.z - minZ, 'z', minZ], [maxZ - p.z, 'z', maxZ]]
        .sort((a, b) => a[0] - b[0])[0];
      p[push[1]] = push[2];
    }
  }
}

// Cables on the floor: walk over one and you go down, and the lead comes out of the back of the PC.
const TRIP = { seconds: 0.9, radius: 0.09, cooldown: 3.5, chance: 0.3 };
const trip = { t: 0, cool: 0, on: false, dir: new THREE.Vector3() };

function cableUnderfoot() {
  for (const c of room.floorCables) {
    if (c.active && !c.active()) continue;   // a bench's lead that is not fitted
    const gone = c.kind === 'fan' || c.kind === 'lead' ? false : c.kind === 'coax'
      ? party.net !== 'coax' || party.pcs[PC_COUNT - 1].linkDown  // the coax across the floor is the cable to PC-06
      : party.net === 'coax' || party.pcs[c.pc].linkDown || (c.pc >= PC_COUNT && !party.pcs[c.pc].cabled);   // an unplugged lead isn't lying there any more
    if (gone) continue;
    for (const p of c.pts) if (Math.hypot(p.x - player.pos.x, p.z - player.pos.z) < TRIP.radius) return c;
  }
  return null;
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
  const speed = 2.1 * (1 + stats.caffeine / 250) * (trip.t > 0 ? 0.35 : 1);
  trip.cool = Math.max(0, trip.cool - dt);
  if (move.lengthSq()) {
    player.pos.addScaledVector(move.normalize(), speed * dt);
    // the cables are gaffer-taped, so most crossings are fine; each time you step onto one it's a roll,
    // and a few cans of Volt make you clumsier
    const cable = cableUnderfoot();
    const stepOn = cable && !trip.on;
    trip.on = !!cable;
    if (stepOn && trip.cool === 0 && Math.random() < TRIP.chance + stats.caffeine / 250) {
      trip.t = TRIP.seconds; trip.cool = TRIP.cooldown; trip.dir.copy(move);
      sfx.thud();
      party.tripOver(cable.kind, cable.pc);
    }
  } else trip.on = !!cableUnderfoot();
  if (trip.t > 0) { // stagger on a few steps in the direction you were going
    trip.t = Math.max(0, trip.t - dt);
    player.pos.addScaledVector(trip.dir, 1.3 * (trip.t / TRIP.seconds) * dt);
  }
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
  if (trip.t > 0) { // the camera pitches forward and rolls, then you pick yourself up
    const k = Math.sin(Math.PI * (1 - trip.t / TRIP.seconds));
    camera.rotation.x -= k * 0.35;
    camera.rotation.z = k * 0.14;
    camera.position.y -= k * 0.3;
  }
}

const taped = spawnTaped(scene, { name: 'DUCTAPE', color: '#e8c21b', ...room.taped });
let tapedNext = 6;

/* ---------- speaker PCs: the noise of the games ---------- */
const gameNoise = new GameNoise();
// The PCs with speakers that somebody is playing on: the regulars at theirs, and anyone else sat at one. Headphones
// on (or a PC with headphones) and nobody else can hear it.
function speakerPcs() {
  if (!voices.isOn()) return []; // N turns the room's noises off, these included
  const out = [];
  for (const a of [...regulars, ...crowd.avatars.values()]) {
    if (a.seat?.audio === 'speakers' && !a.wearsPhones()) out.push({ id: a.id, x: a.group.position.x, z: a.group.position.z });
  }
  return out;
}

/* ---------- LANamp: the room's music ---------- */
let music = null, amp = null;
function startMusic() {
  const ctx = sfx.audioContext();
  if (music || !ctx) return;
  music = new Player(ctx);
  amp = initLanamp($('lanamp'), music);
  music.play(Math.floor(Math.random() * 8)); // the Walk in click counts as the user gesture
}

/* ---------- #lanparty98: the group's IRC channel ---------- */
const ircBox = $('irc');
const irc = new IrcView(ircBox, [...REGULARS, 'YOU']);
const banter = new Banter({ me: 'YOU', bodies: [...speakers.values()].map((a) => a.name) });
const ircStamp = () => { const t = ui.clock.textContent.split(' ')[0]; return t; };
const ircSay = (nick, text) => irc.add(nick, text, ircStamp());
const ircNote = (text) => irc.note(text, ircStamp());
// a regular says something: it goes in the channel, in a bubble over their head, and sometimes out loud
function ircSpeak({ nick, text, fx }) {
  ircSay(nick, text);
  const a = speakers.get(nick.toLowerCase());
  if (!a || !a.group.visible) return; // Dazza is on the phone and Macca is in Singapore: channel only
  a.say(text);
  voices.hear(nick, text, fx, player.pos.distanceTo(a.group.position));
}
ircNote('Now talking in #lanparty98');
for (const m of banter.prefill(14)) ircSay(m.nick, m.text); // the window starts full, mid-argument
function ircMe(name) { // you picked a handle: you're in the channel too
  banter.me = name;
  irc.setNicks([...REGULARS, ...[...link.players.values()].map((p) => p.name), name]);
}

/* ---------- loop ---------- */
const clock = new THREE.Clock();
let screenTimer = 0, statTimer = 0, sendTimer = 0;

function frame() {
  const dt = Math.min(clock.getDelta(), 0.05);
  updateTrayHint();
  const now = performance.now() / 1000;

  crowd.update(dt, link.players, now);
  if (mode !== 'intro') voice.update(camera, dt);
  room.updateFan(dt, party.fan.on, party.fanSweep());
  room.updatePower(dt);
  room.spectator.update(dt, Math.hypot(player.pos.x - room.spectatorDesk.x, player.pos.z - room.spectatorDesk.z),
    mode === 'intro' || document.hidden || (mode === 'seated' && pc.running));
  room.amiga.update(dt, Math.hypot(player.pos.x - room.amigaDesk.x, player.pos.z - room.amigaDesk.z),
    mode === 'intro' || document.hidden || (mode === 'seated' && pc.running));
  regulars[0].group.visible = ghoulAtPc();   // Ghoul gets up when somebody else wants PC-04
  ui.amigaStatus.textContent = room.amiga.status;
  room.updatePizza(dt);
  room.updateTrays(dt);
  room.updateBenches();
  room.stations.forEach((st, i) => { st.screen.rebooting = party.rebooting(i) || party.pcBooting(i); });
  room.updateTv(dt);
  n64.update(dt);
  const picture = n64.picture();
  room.tv.show(picture.kind, picture.texture);
  if (mode === 'console') refreshConsoleBar();
  room.door.update(dt);
  if (mode !== 'intro') for (const m of banter.tick(dt)) ircSpeak(m);
  amp?.update(dt);
  stepHandSlice(dt);
  stepDelivery(dt);
  stepEaters(dt, now);
  taped.idle(now);
  if ((tapedNext -= dt) < 0) { tapedNext = 12 + Math.random() * 10; if (taped.eatT < 0) taped.eat(); }
  if (macca.group.visible) macca.idle(now);
  for (const r of regulars) r.idle(now);
  if (driver.group.visible) driver.idle(now);
  if (mode !== 'intro') gameNoise.tick(dt, speakerPcs(), { x: player.pos.x, z: player.pos.z, yaw: player.yaw, seated: mode === 'seated' });
  if (mode !== 'intro') party.tick(dt, { seatedPc: seatedAt?.index ?? null });
  if (link.online && mode === 'walk' && (sendTimer += dt) > 0.1) { sendTimer = 0; link.pos(player.pos.x, player.pos.z, player.yaw); }

  if (mode === 'walk') {
    walk(dt);
    target = findTarget();
    ui.prompt.hidden = !target;
    if (target) ui.prompt.textContent = PROMPTS[target.kind](target);
  } else if (mode === 'bean') {
    // you sink into the vinyl for a moment after landing, then it holds you
    bean.sinkT = Math.min(1, bean.sinkT + dt / 0.45);
    const sink = room.bean.sink * Math.sin(bean.sinkT * Math.PI / 2);
    camera.position.set(room.bean.seat.x, room.bean.seat.y - sink, room.bean.seat.z);
    camera.rotation.set(player.pitch, player.yaw, 0, 'YXZ');
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
    for (const s of room.gamerScreens) s.draw(now);
  }

  // blinkenlights
  const playing = (mode === 'seated' && pc.running) || [...link.players.values()].some((p) => p.pc !== null);
  room.hddLeds.forEach((led, i) => { if (!party.pcPowered(i)) led.material.color.setHex(0x100000); else if (Math.random() < 0.15) led.material.color.setHex(Math.random() < 0.4 ? 0xff2a1a : 0x400000); });
  room.netLeds.forEach((led, i) => {
    const used = i < PC_COUNT || !!party.pcs[i]?.cabled; // one port per PC; the rest are spare
    const up = !used || (party.pcLinkUp(i) && party.pcPowered(i));
    const busy = used && up && Math.random() < (playing ? 0.5 : 0.12);
    led.material.color.setHex(busy ? 0x4dff5a : (used && up ? 0x1b6e1b : 0x0a2a0a));
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
    for (const s of room.screens) s.clock = ui.clock.textContent;
    ui.schedule.textContent = scheduleText();
    ui.shares.textContent = `${party.sharingCount()}/${party.pcCount()} · ${Math.floor(party.swapped)}MB`;
    ui.caffeine.style.width = `${stats.caffeine}%`;
    ui.snacks.style.width = `${stats.snacks}%`;
    ui.dust.style.opacity = (stats.dust * 0.9).toFixed(2);
    room.stations.forEach((st, i) => { st.screen.burn = party.job?.pc === i ? { pct: party.burnProgress(), secondsLeft: party.burnSecondsLeft() } : null; });
    refreshLinks();
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
room.setNetwork(party.net);
party.addEventListener('cash', (e) => { ui.cash.textContent = `$${e.detail}`; });
// shooters until midnight, then StarCraft, which wants memory
function scheduleText() {
  if (party.phase() === 'fps') return 'ON TONIGHT: shooters now, StarCraft at midnight';
  return `ON TONIGHT: StarCraft. ${party.starcraftBoxes()} of ${party.pcCount()} PCs have the 32MB for it`;
}

// what the cables are doing, shown on the gear and on the screens
function refreshLinks() {
  room.stations.forEach((st, i) => {
    room.setLoose(i, party.pcs[i].linkDown);
    room.setPower(i, party.pcPowered(i));
    if (st.bench && (st.bench.owner !== 'me' || !st.bench.ready)) { st.screen.linkDown = false; st.screen.crashed = false; st.screen.rts = null; st.screen.rebooting = false; return; } // off or in POST: its own screen
    st.screen.linkDown = !party.pcLinkUp(i);
    st.screen.crashed = party.pcs[i].crashed;
    st.screen.oc = party.pcs[i].oc;
    st.screen.ram = party.pcs[i].ram;
    st.screen.share = party.pcs[i].share === 'ok';
    st.screen.rebooting = party.rebooting(i) || party.pcBooting(i);
    st.screen.rts = party.phase() === 'rts' ? (party.canRunStarcraft(i) ? 'starcraft' : 'nomem') : null;
  });
  room.setLead(party.leadIn);
  setNetStatus();
}

// a dead link ends your deathmatch: the IPX packets have nowhere to go
function linkChanged() {
  refreshLinks();
  if (seatedAt && !party.pcLinkUp(seatedAt.index) && inMatch()) link.send({ t: isHost() ? 'dm_end' : 'dm_leave' });
  updateDM();
}

party.addEventListener('net', (e) => {
  room.setNetwork(e.detail.net);
  const lines = {
    hub: "The hub's here. Goodbye, coax.",
    switch: "Dazza's dad dropped round the switch. Sixteen ports, one government sticker.",
  };
  if (e.detail.reason === 'returned') { toast("Dazza's dad took his switch back. Hub it is."); chatLine("Dazza's dad took his switch back. Hub it is.", true); }
  else { toast(lines[e.detail.net]); chatLine(lines[e.detail.net], true); }
  if (myBench) {   // the leads that were fitted for the old network come out
    const gone = myBench.setNet(e.detail.net);
    if (gone.length) { toast(`Your network lead is no good now. ${BUILD.PARTS.nic[myBuild.nic].ports.includes(e.detail.net === 'coax' ? 'bnc' : 'rj45') ? 'Plug the new one in.' : 'Your card has no socket for it.'}`); sfx.plug(false); }
    syncBenchParty();
  }
  linkChanged();
});
party.addEventListener('crash', (e) => {
  const st = room.stations[e.detail.pc];
  const msg = `${st.name}: a fatal exception 0E has occurred.`;
  banter.react('crash', link.occupant(e.detail.pc)?.name ?? (seatedAt?.index === e.detail.pc ? myName : st.name));
  toast(msg); chatLine(msg, true);
  refreshLinks();
  if (seatedAt?.index === e.detail.pc) {
    if (inMatch()) link.send({ t: isHost() ? 'dm_end' : 'dm_leave' }); // IPX does not survive a blue screen
    if (mode === 'seated') showCrash();
  }
});
party.addEventListener('reboot', refreshLinks);
party.addEventListener('hot', (e) => banter.react('hot', room.stations[e.detail.pc].name));
party.addEventListener('hot', (e) => chatLine(`${room.stations[e.detail.pc].name} is running hot. Is the fan on?`, true));
party.addEventListener('oc', (e) => { toast(`${room.stations[e.detail.pc].name}: ${party.ocTable(e.detail.pc)[e.detail.level].label}.`); refreshLinks(); });
party.addEventListener('fan-on', () => { toast('Fan on.'); chatLine('The pedestal fan is spinning again.', true); });
party.addEventListener('fan-off', (e) => {
  if (e.detail.why === 'tripped') { chatLine('The fan has lost its power.', true); return; }
  const msg = e.detail.why === 'knocked' ? "Somebody kicked the fan's plug out." : 'Fan off.';
  toast(msg); chatLine(msg, true);
});
const ANNOUNCE_LINES = {
  doors: 'Doors open, 7:30 PM. Everyone wants shooters first.',
  fps: "8:30 PM. Shooters only. Everybody wants a deathmatch.",
  soon: 'Quarter to midnight. Somebody is hunting through a CD case for StarCraft.',
  midnight: "Midnight. Somebody's kicking off a StarCraft game.",
  late: '2:00 AM. The StarCraft game is still going. Somebody has built a second base.',
};
party.addEventListener('announce', (e) => {
  chatLine(ANNOUNCE_LINES[e.detail.id], true);
  if (e.detail.id === 'midnight') {
    banter.react('midnight');
    const n = party.starcraftBoxes();
    toast(n ? `StarCraft is on. ${n} PC${n > 1 ? 's have' : ' has'} the memory.` : 'StarCraft is on. Nobody has the 32MB for it.');
    refreshLinks();
  }
});
const SHARE_FAIL_QUIPS = ['Again.', 'Of course.', 'It worked on the other one.'];
party.addEventListener('share-ok', (e) => {
  const n = party.sharingCount();
  const msg = `${room.stations[e.detail.pc].name}: C:\\WAREZ is shared. ${n} of ${PC_COUNT} PCs on the network.`;
  toast(msg); chatLine(msg, true);
  refreshLinks();
});
party.addEventListener('share-broken', (e) => { chatLine(`${room.stations[e.detail.pc].name} lost its share. ${e.detail.why === 'crash' ? 'The blue screen took it.' : e.detail.why}`, true); refreshLinks(); });
party.addEventListener('fix-start', refreshLinks);
party.addEventListener('pc-reboot', refreshLinks);
party.addEventListener('fix-failed', (e) => {
  if (dialog.isOpen()) { refreshLinks(); return; } // you can see it
  chatLine(`${room.stations[e.detail.pc].name}: ${e.detail.error} ${SHARE_FAIL_QUIPS[party.tripped % SHARE_FAIL_QUIPS.length]}`, true);
});
party.addEventListener('warez', (e) => chatLine(`${e.detail.name}: ${Math.floor(e.detail.total)}MB has gone round the network.`, true));
party.addEventListener('buddy-away', (e) => {
  macca.group.visible = false;
  toast("Macca's off to Singapore.");
  chatLine(`Macca took $${party.ramCost(e.detail.sticks)} and went to Singapore. He'll be back with the RAM.`, true);
});
party.addEventListener('buddy-back', () => {
  macca.group.visible = true;
  toast("Macca's back from Singapore.");
  chatLine('Macca is back from Singapore with a sock full of SIMMs.', true);
});
party.addEventListener('ram-collected', (e) => chatLine(`You pocket ${e.detail.sticks} SIMM${e.detail.sticks > 1 ? 's' : ''}. Cheap.`, true));
party.addEventListener('ram', (e) => { toast(`${room.stations[e.detail.pc].name}: ${e.detail.mb}MB.`); refreshLinks(); });
party.addEventListener('dad-warning', () => chatLine("Dazza's dad: \"I need that switch back by six.\"", true));
const TRIP_LINES = ['You trip over the cat5.', 'Your foot finds the cable. Of course it does.', 'Cable. Floor. Face.'];
party.addEventListener('trip', (e) => {
  const st = room.stations[e.detail.pc ?? 0];
  if (e.detail.kind === 'lead') {
    const line = e.detail.dropped ? 'You trip over the yellow extension lead. The plug comes out of the wall and PC-04, PC-05 and PC-06 go dark.' : 'You trip over the yellow extension lead again. It is already out of the wall.';
    banter.react(e.detail.dropped ? 'power' : 'trip', myName);
    toast(line); chatLine(line, true);
    analytics.tripCable('lead', party.tripped);
    return;
  }
  const out = e.detail.kind === 'fan' ? "The fan's plug comes out of the wall." : e.detail.kind === 'coax' ? `The coax pops off ${st.name}. Everybody is offline.` : `${st.name} has lost its link.`;
  const line = `${TRIP_LINES[party.tripped % TRIP_LINES.length]} ${out}`;
  banter.react('trip', myName);
  toast(line); chatLine(line, true);
  analytics.tripCable(e.detail.kind, party.tripped);
});
party.addEventListener('link-down', (e) => {
  if (e.detail.why === 'tripped') { linkChanged(); return; } // the trip handler already said so
  const msg = party.net === 'coax' ? `A T-connector on ${room.stations[e.detail.pc].name} has come loose. The whole network is down.` : `${room.stations[e.detail.pc].name} has lost its network lead.`;
  toast(msg); chatLine(msg, true);
  linkChanged();
});
party.addEventListener('link-up', () => { chatLine('Link light is back on.', true); linkChanged(); });
party.addEventListener('order', (e) => chatLine(e.detail.what === 'hub' ? 'Hub ordered. It is on its way.' : e.detail.what === 'pizza' ? `Pizza Shack: pepperoni ordered. $${PIZZA.cost}. Hang up and listen for the door.` : "Dazza's dad is bringing the switch round.", true));
party.addEventListener('pizza-arrive', () => { // the driver is at the door; the pizza reaches a table when you open it (handOver)
  delivery.waiting = true; delivery.knockIn = 0; delivery.knocks = 0; delivery.leaveIn = 0;
  driverLoad.visible = true; driver.group.visible = true;
});

party.addEventListener('power-down', () => {
  sfx.powerCut();
  if (seatedAt && !party.pcPowered(seatedAt.index)) { toast(`${seatedAt.name} goes black.`); standUp(); }
  refreshLinks();
  if (!party.leadIn && mode !== 'seated') chatLine('PC-04, PC-05 and PC-06 have lost power. The extension lead is out of the wall, somewhere across the aisle.', true);
});
party.addEventListener('power-up', () => {
  sfx.postBeep();
  toast('Power is back. PC-04 to PC-06 are in POST.');
  chatLine('The extension lead is back in. The three boxes are running memory tests. Shares will need fixing again.', true);
  refreshLinks();
});
party.addEventListener('burn-start', (e) => toast(`CDWRITE: writing at ${e.detail.speed}x. Hands off ${room.stations[e.detail.pc].name}.`));
party.addEventListener('burn-done', (e) => {
  toast(`Disc done. Mates pay $${e.detail.pays}.`);
  chatLine(`The CD-R finally spat out a ${DISCS[e.detail.kind].name}. +$${e.detail.pays}.`, true);
});
party.addEventListener('coaster', (e) => {
  const why = { underrun: 'Buffer underrun. That one is a coaster.', crash: 'The burner PC blue screened mid-write. Coaster.', reboot: 'Windows restarted on the burner PC mid-write. Coaster.', power: 'The burner PC lost power mid-write. Coaster.' }[e.detail.reason] ?? 'Write cancelled. That disc is a coaster now.';
  toast(why);
  chatLine(why, true);
});

/* ---------- the room: other people, seats, deathmatch ---------- */

// keep name tags and idle screens in step with who's sitting where
function refreshStations() {
  for (const st of room.stations) {
    if (st.bench && !st.bench.ready) continue;   // an empty or half-built bench: bench.js keeps its screen
    const mine = seatedAt === st;
    const who = mine ? null : link.occupant(st.index);
    const ghoul = st.index === GHOUL_PC && !mine && !who;   // xX_Ghoul_Xx is on it
    if (st.deskPhones) st.deskPhones.visible = !mine && !who && !ghoul; // somebody sitting there has them on
    if (mine) {
      st.setTag(myName);
      st.screen.free = false;
      st.screen.setMode('mine', `${myName} · ${pc.kind === 'solo' || !pc.kind ? gameOf(pc.game ?? myGame).name : 'DEATHMATCH'}`);
    } else {
      if (st.screen.mode === 'mine') st.screen.mode = st.screen.idle;
      st.setTag(who ? who.name : ghoul ? 'XX_GHOUL_XX' : st.name);
      const inMatch = who && link.match?.players.includes(who.id) && link.match.status !== 'lobby';
      st.screen.setFree(!who && !ghoul, who?.name ?? (ghoul ? 'XX_GHOUL_XX' : undefined), ghoul ? 'DESCENT' : inMatch ? 'IN THE DEATHMATCH' : 'FRAGGING');
    }
  }
}

refreshStations();   // Ghoul is already at PC-04 when the room opens

function setNetStatus() {
  if (!link.online) {
    ui.netstatus.textContent = myName === 'YOU' ? '' : 'Hub unplugged · solo mode';
    ui.netstatus.classList.remove('online');
    return;
  }
  const n = link.players.size + 1;
  ui.netstatus.textContent = `${n} in the room${ROOM_NAME !== 'basement' ? ` · ${ROOM_NAME}` : ''} · ${NET[party.net].short}${party.netDown() ? ' · CABLE FAULT' : ''}`;
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
  if (mode !== 'walk') return;
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
  if (text) {
    if (link.online) link.send({ t: 'chat', text });
    else { ircSay(myName, text); chatLine(`<b>${esc(myName)}:</b> ${esc(text)}`); banter.heard(myName, text); }
  }
  closeChat();
});
ui.chatInput.addEventListener('keydown', (e) => { if (e.key === 'Escape') { e.preventDefault(); closeChat(); } });

/* ---------- voice chat: the words on the HUD and the mic button ---------- */
function showVoice() {
  const talking = voice.talking();
  ui.voiceStatus.textContent = voice.on ? `${statusLine(voice.state, talking)} · Y ${voice.state === 'live' ? 'mutes' : 'opens the mic'}` : link.online ? 'Voice off · press Y to join' : '';
  ui.voiceStatus.className = voice.state === 'off' ? '' : voice.state;
  ui.mic.textContent = buttonLabel(voice.state);
  ui.mic.className = `w98-btn${voice.state === 'off' ? '' : ` ${voice.state}`}`;
  ui.mic.title = voice.on ? 'Mute or unmute your microphone (Y)' : 'Voice chat: people nearby hear you, and you hear them';
}
voice.addEventListener('state', (e) => {
  showVoice();
  if (e.detail === 'live' && !voice.wasLive) toast(`Voice on. Anyone within a few metres hears you. ${link.players.size ? '' : 'Nobody else is here yet.'}`.trim());
  voice.wasLive = e.detail === 'live';
});
voice.addEventListener('talking', showVoice);
voice.addEventListener('problem', (e) => toast(e.detail));
link.addEventListener('online', showVoice);
link.addEventListener('offline', showVoice);

link.addEventListener('bench', (e) => {
  if (e.detail.id === link.me?.id) takeBench(e.detail.bench);
  else syncRemoteBenches();
});
link.addEventListener('online', () => {
  crowd.clear();
  for (const p of link.players.values()) crowd.add(p);
  if (mode !== 'intro') startBench();
  syncRemoteBenches();
  if (seatedAt) link.send({ t: 'sit', pc: seatedAt.index });
  setNetStatus();
  refreshStations();
  updateDM();
  chatLine(`Plugged into the hub. ${link.players.size ? `${link.players.size} other${link.players.size > 1 ? 's' : ''} here.` : "You're the first one here."}`, true);
});
link.addEventListener('offline', () => {
  crowd.clear();
  syncRemoteBenches();
  setNetStatus();
  refreshStations();
  updateDM();
  chatLine('Lost the hub. Reconnecting...', true);
});
link.addEventListener('join', (e) => {
  crowd.add(e.detail);
  setNetStatus();
  chatLine(`${esc(e.detail.name)} walked in.`, true);
  ircNote(`${e.detail.name} has joined #lanparty98`); ircMe(myName); banter.react('join', e.detail.name);
  sfx.crunch();
});
link.addEventListener('leave', (e) => {
  crowd.remove(e.detail.id);
  syncRemoteBenches();
  setNetStatus();
  refreshStations();
  chatLine(`${esc(e.detail.name)} left.`, true);
  ircNote(`${e.detail.name} has left #lanparty98 (Ping timeout)`); ircMe(myName);
});
link.addEventListener('seat', (e) => {
  if (e.detail.id !== link.me?.id) crowd.seat(e.detail);
  refreshStations();
});
link.addEventListener('frame', (e) => {   // somebody else's game, as they see it, for the CRT on their desk
  const st = room.stations[e.detail.pc];
  if (st && st !== seatedAt) st.screen.pushFeed(e.detail.jpeg);
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
  ircSay(e.detail.name, e.detail.text);
  crowd.say(e.detail.id, e.detail.text); // their bubble, for everyone else in the room
  banter.heard(e.detail.name, e.detail.text);
});

let lastMatch = null;
let hostingGame = null; // what I asked for when I hit Host, to notice a room server that hasn't heard of it
link.addEventListener('match', (e) => {
  const m = e.detail, was = lastMatch;
  lastMatch = m;
  if (m && !was && hostingGame && link.me && m.host === link.me.id && hostingGame !== gameOf(m.game).id) {
    // an old room server doesn't know about the other games and starts a DOOM match whatever you asked for
    toast(`The hub only knows DOOM so far. This one is ${gameOf(m.game).name}.`);
  }
  if (m) hostingGame = null;
  if (m && !was) chatLine(`${esc(link.nameOf(m.host))} is hosting a ${gameOf(m.game).name} deathmatch. Sit at a free PC to join.`, true);
  if (!m && was) chatLine('Deathmatch over.', true);
  if (m?.status === 'starting' && was?.status === 'lobby') chatLine(`Deathmatch starting: ${m.players.map((id) => esc(link.nameOf(id))).join(' vs ')}`, true);
  refreshStations();
  updateDM();
  if (mode === 'seated') bootForMatch();
});

const inMatch = () => !!(link.match && link.me && link.match.players.includes(link.me.id));
const isHost = () => !!(link.match && link.me && link.match.host === link.me.id);

// Make the PC run whatever it should right now: your game solo, or this match's game on the IPX network.
// Once you are in a match (even while it is still a lobby) the PC runs the match's game.
let announcing = null;
function bootForMatch() {
  const m = link.match;
  const mine = inMatch();
  const game = mine ? gameOf(m.game).id : myGame;
  // Descent needs a pilot before its menu: one named after you, kept apart from anyone with the same handle
  const others = mine ? m.players.filter((id) => id !== link.me.id).map((id) => link.nameOf(id)) : [];
  const extra = GAMES[game].pilot ? { pilot: pilotName(myName, others, seatedAt?.index ?? 0) } : {};
  let opts = { kind: 'solo', game, ...extra };
  if (mine && m.status !== 'lobby') {
    if (isHost()) opts = { kind: 'host', game, nodes: m.nodes, match: m.id, ...extra };
    else if (m.peerId) opts = { kind: 'join', game, nodes: m.nodes, peerId: m.peerId, match: m.id, ...extra };
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
  updateGameBtn();
  if (!link.online || mode !== 'seated') { ui.dm.hidden = true; return; }
  if (seatedAt && !party.pcLinkUp(seatedAt.index)) {
    ui.dm.hidden = false; ui.dmBtn.hidden = true; ui.dmBtn2.hidden = true;
    ui.dmText.textContent = 'Network cable disconnected.';
    return;
  }
  ui.dm.hidden = false;
  ui.dmBtn2.hidden = true;
  ui.dmBtn.hidden = false;
  ui.dmBtn.disabled = false;
  const names = m ? m.players.map((id) => link.nameOf(id)).join(', ') : '';
  if (!m) {
    ui.dmText.textContent = '';
    ui.dmBtn.textContent = `Host a ${gameOf(myGame).name} deathmatch`;
    ui.dmBtn.onclick = () => { hostingGame = myGame; link.send({ t: 'dm_host', game: myGame }); };
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
      ui.dmText.textContent = `${link.nameOf(m.host)} is hosting ${gameOf(m.game).name} (${m.players.length}/${MAX_PLAYERS})`;
      ui.dmBtn.textContent = `Join ${gameOf(m.game).name}`;
      ui.dmBtn.disabled = m.players.length >= MAX_PLAYERS;
      ui.dmBtn.onclick = () => link.send({ t: 'dm_join' });
    }
  } else if (inMatch()) {
    ui.dmText.textContent = `${gameOf(m.game).name} DEATHMATCH: ${names}`;
    ui.dmBtn.textContent = isHost() ? 'End match' : 'Leave match';
    ui.dmBtn.onclick = () => link.send({ t: isHost() ? 'dm_end' : 'dm_leave' });
  } else {
    ui.dmText.textContent = `${gameOf(m.game).name} deathmatch on: ${names}`;
    ui.dmBtn.hidden = true;
  }
  // buttons shouldn't keep keyboard focus, or Space/Enter in the game would click them
  for (const b of [ui.dmBtn, ui.dmBtn2]) b.onmouseup = () => b.blur();
}

// handy for debugging from the console
window.lan = { scene, camera, room, stats, player, sitDown, standUp, pc, link, crowd, n64 };
