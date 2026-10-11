// LAN Party '98: walk the basement with everyone else who's online, grab a free PC,
// play a shareware game (DOOM, Quake, Hexen, Heretic, Descent), and start a deathmatch with whoever's sitting down.
import * as THREE from 'three';
import { buildRoom, ROOM } from './room.js';
import { DosPC } from './emulator.js';
import { GAMES, DEFAULT_GAME, MAX_PLAYERS, gameOf, nextGame, netHint, pilotName } from './games.js';
import { RoomLink, ROOM_NAME } from './net.js';
import { Crowd, spawnNpc, spawnTaped, seatFor, setEye } from './avatars.js';
import * as sfx from './sfx.js';
import * as voices from './voices.js';
import { analytics } from './analytics.js';
import { Party, PIZZA, BURNER, DISCS, NET, SHOP, PC_COUNT, OC, HEAT, RAM, NIGHT, SEC_PER_GAME_MIN, SHARE_STEPS, celsius } from './party.js';
import * as dialog from './dialog.js';
import { Banter, IrcView, REGULARS } from './irc.js';
import { Player } from './music.js';
import { initLanamp } from './lanamp.js';
import { initShare } from './share.js';
import { Desktop } from './desktop.js';
import { registerApps } from './apps.js';

const $ = (id) => document.getElementById(id);
initShare();
const ui = {
  intro: $('intro'), enter: $('enter-btn'), hud: $('hud'), prompt: $('prompt'), toast: $('toast'),
  caffeine: $('m-caffeine'), snacks: $('m-snacks'), cash: $('m-cash'), shares: $('m-shares'), clock: $('clock'), schedule: $('schedule'),
  monitor: $('monitor'), dos: $('dos'), dust: $('dust'), bsod: $('bsod'),
  seatedBar: $('seated-bar'), stand: $('stand-btn'), drink: $('drink-btn'), eat: $('eat-btn'), gameBtn: $('game-btn'), seatedStatus: $('seated-status'),
  handle: $('handle'), netstatus: $('netstatus'),
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
const link = new RoomLink();
const crowd = new Crowd(scene, room.stations);
setEye(camera.position); // speech bubbles grow with distance so they stay readable
const GAME_START = NIGHT.doors; // 7:30 PM
const party = new Party({ startMinutes: GAME_START });

// The regulars from #lanparty98 sit and play: at their own PCs on the tables, or on the couch with the console.
// Where each one sits is in buildGamers (js/room.js). Nobody else can use those PCs.
const sit = (name) => seatFor(room.seats[name]);
// Macca: off to Singapore for work, and happy to bring RAM back if you give him cash first
const macca = spawnNpc(scene, { name: 'MACCA', color: '#20b2aa', yaw: -Math.PI / 2, arch: 'surfer', seat: sit('MACCA') }); // --shirt-7
const maccaHit = new THREE.Mesh(new THREE.BoxGeometry(0.7, 1.5, 0.7), new THREE.MeshBasicMaterial({ visible: false }));
maccaHit.position.set(macca.group.position.x, 0.75, macca.group.position.z);
maccaHit.userData.interact = { kind: 'buddy' };
scene.add(maccaHit);
room.interactables.push(maccaHit);

const regulars = [
  { name: 'xX_Ghoul_Xx', color: '#9b4dca', arch: 'goth' },     // --shirt-5
  { name: 'PhatBass', color: '#d94f8a', arch: 'raver' },        // --shirt-8
  { name: 'K-Rad', color: '#2b6fd6', arch: 'hiphop' },           // --shirt-2
  { name: 'n00bslayer', color: '#3aa35a', arch: 'nerd' },       // --shirt-4
].map((r) => spawnNpc(scene, { ...r, seat: sit(r.name) }));
// who is sitting where, by IRC nick, so what they say in the channel comes out of their mouths
const speakers = new Map([macca, ...regulars].map((a) => [a.name.toLowerCase(), a]));

/* ---------- state ---------- */
let mode = 'intro'; // intro | walk | tween | seated | dialog
const keys = new Set();
const stats = { caffeine: 15, snacks: 40, dust: 0, cans: 0, handfuls: 0 };
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
ui.enter.addEventListener('click', () => {
  const name = ui.handle.value.trim().toUpperCase().slice(0, 12) || `PLAYER${Math.floor(Math.random() * 90 + 10)}`;
  try { localStorage.setItem('lan98-handle', name); } catch { /* private mode */ }
  myName = name;
  ircMe(name);
  ui.intro.hidden = true;
  ui.hud.hidden = false;
  ui.chat.hidden = false;
  desktop.start();
  mode = 'walk';
  sfx.startAudio();
  startMusic();
  lockPointer();
  analytics.enterParty();
  link.connect(name);
  refreshStations();
});
(savedHandle ? ui.enter : ui.handle).focus();

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
  if (mode !== 'walk' || document.pointerLockElement !== canvas) return;
  player.yaw -= e.movementX * 0.0022;
  player.pitch = THREE.MathUtils.clamp(player.pitch - e.movementY * 0.0022, -1.4, 1.4);
});

window.addEventListener('keydown', (e) => {
  if (e.target === ui.chatInput || e.target === ui.handle) return;
  if (e.target.closest?.('[data-owns-keys]')) return; // typing into Notepad, the DOS prompt, Minesweeper...
  if (dialog.isOpen()) return; // the message box owns the keyboard
  if (mode === 'seated') {
    if (e.code === 'Backquote') { e.preventDefault(); e.stopPropagation(); standUp(); }
    else if (!ui.bsod.hidden) { e.preventDefault(); e.stopPropagation(); recoverFromCrash(); } // any key
    return; // everything else belongs to the game
  }
  if (mode !== 'walk') return;
  if (e.code === 'KeyT') { e.preventDefault(); openChat(); return; }
  if (e.code === 'Tab' && document.pointerLockElement) { e.preventDefault(); document.exitPointerLock(); return; } // free the mouse for the desktop
  if (e.code === 'KeyI') { desktop.toggle('irc'); return; }
  if (e.code === 'KeyM') { desktop.toggle('lanamp'); return; }
  if (e.code === 'KeyH') { e.preventDefault(); desktop.toggle('ie'); return; } // preventDefault: the window focuses its address bar, which would swallow the h
  if (e.code === 'KeyN') { toast(voices.toggle() ? 'Noises on.' : 'Noises off.'); return; }
  if (amp?.keys[e.code]) { amp.keys[e.code](); return; }
  keys.add(e.code);
  if (e.code === 'KeyE' && target) interact(target);
  if (e.code === 'KeyF' && target?.station) openPcMenu(target.station);
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
  for (const hit of ray.intersectObjects(room.interactables, true)) {
    const t = hit.object.userData.interact;
    if (!t) continue;
    if (t.kind === 'buddy' && party.buddy.state === 'away') continue; // he's in Singapore
    return t;
  }
  return null;
}

const PROMPTS = {
  sit: (t) => {
    const who = link.occupant(t.station.index);
    const fiddle = party.pcs[t.station.index].linkDown ? 'F · Cable is out' : 'F · Open the case';
    return who ? `${t.station.name} · ${who.name}'s sitting here  ·  ${fiddle}` : `E · Sit down at ${t.station.name}  ·  ${fiddle}`;
  },
  buddy: () => (party.buddy.state === 'back' ? 'E · Macca is back. Ask about the RAM' : 'E · Talk to Macca'),
  fan: () => `E · Turn the fan ${party.fan.on ? 'off' : 'on'}`,
  shop: () => 'E · Read the computer shop price list',
  phone: () => 'E · Use the phone',
  pizza: (t) => (t.box.slices > 0 ? `E · Eat a slice of pepperoni pizza (${t.box.slices} left)` : 'Empty box. Just grease.'),
  taped: () => 'E · Talk to DUCTAPE',
  door: () => `E · ${room.door.open ? 'Close' : 'Open'} the door`,
  drink: () => 'E · Crack a Volt Cola',
  soda: () => 'E · Pour a Citrus Zap into a red cup',
  eat: () => 'E · Grab a handful of Nachoz or Cheez Curlz',
  burner: () => (party.job ? `E · CD-R: writing ${Math.floor(party.burnProgress() * 100)}%` : 'E · Burn a CD (2x)'),
};

function interact(t) {
  if (t.kind === 'sit') {
    const who = link.occupant(t.station.index);
    if (who) toast(`${who.name} is on that one. Find a free PC.`);
    else sitDown(t.station);
  } else if (t.kind === 'drink') drink();
  else if (t.kind === 'soda') soda();
  else if (t.kind === 'eat') eat();
  else if (t.kind === 'burner') openBurner();
  else if (t.kind === 'shop') openShop();
  else if (t.kind === 'buddy') openMacca();
  else if (t.kind === 'fan') party.setFan(!party.fan.on, 'switch');
  else if (t.kind === 'phone') openPhone();
  else if (t.kind === 'pizza') eatPizza(t.box);
  else if (t.kind === 'taped') talkToTaped();
  else if (t.kind === 'door') useDoor();
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
  if (d.toggle()) { toast(MUM[doorOpens++ % MUM.length]); banter.react('door'); }
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
        lines.push(`CPU: ${OC[pc.oc].label}. Case temperature ${celsius(pc.heat)}°C${party.fan.on ? '' : ', and the fan is off'}.`);
        if (progress === null && (pc.oc > 0 || pc.heat > 0)) progress = pc.heat / HEAT.crash;
        const next = OC[(pc.oc + 1) % OC.length];
        buttons.push({ label: pc.oc === OC.length - 1 ? `Put the jumpers back (${next.mhz}MHz)` : `Move the jumpers (${next.mhz}MHz)`, run: () => party.cycleOverclock(i), keep: true });
      }
      buttons.push({ label: 'Close' });
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

function openPhone() {
  openErrand({
    title: 'WALL PHONE',
    render: () => ({
      lines: ['The phone is on the wall by the stairs, with the pizza place magnet stuck next to it. Whose number do you want?'],
      progress: null,
      buttons: [{ label: 'Pizza place', run: () => openPizzaMenu() }, { label: 'Dazza', run: () => openDazza() }, { label: 'Hang up' }],
    }),
  });
}

function openPizzaMenu() {
  setTimeout(() => openErrand({
    title: 'PIZZAMENU.TXT',
    render: () => {
      const buttons = [{ label: 'Hang up' }];
      let lines;
      if (party.ordered('pizza')) lines = [`Pepperoni is on its way. The delivery bloke says ${clockText(party.secondsUntil('pizza'))}, and he has said that twice.`];
      else {
        lines = [
          'HOT & FRESH PIZZA. Delivered in 30 min.',
          `1. Large pepperoni, ${PIZZA.slices} slices ... $${PIZZA.cost}`,
          '2. Large pepperoni, extra pepperoni ... same pizza',
          `Cash $${party.cash}.`,
        ];
        buttons.unshift({ label: `Order a large pepperoni ($${PIZZA.cost})`, disabled: !party.canOrderPizza(), run: () => party.orderPizza(), keep: true });
      }
      return { lines, progress: null, buttons };
    },
  }), 0);
}

function openDazza() {
  setTimeout(() => openDazzaDialog(), 0);
}

function openDazzaDialog() {
  openErrand({
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
}

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
const SODA_LINES = ['Fizz. Lime. A bit of sherbet.', 'Warm already. Still good.', 'The cup is soft. It will survive.', 'It is the colour of a highlighter. You drink it anyway.'];
const EAT_LINES = ['Crunch.', 'Orange fingers acquired.', 'Nuclear cheese: confirmed.', 'You wipe your hand on your jeans. Mostly.'];

function drink() {
  stats.caffeine = Math.min(100, stats.caffeine + 32);
  stats.cans++;
  sfx.fizz();
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
let handT = -1;
const HAND = { raise: 0.5, bite: 0.6, lower: 0.4 };
function stepHandSlice(dt) {
  if (handT < 0) return;
  handT += dt;
  const total = HAND.raise + 3 * HAND.bite + HAND.lower;
  const k = Math.min(1, handT / HAND.raise, (total - handT) / HAND.lower);
  const up = Math.max(0, k), bites = Math.max(0, Math.min(3, Math.floor((handT - HAND.raise) / HAND.bite)));
  handSlice.position.set(0.14 - up * 0.12, -0.3 + up * 0.18, -0.6 + up * 0.12);
  handSlice.rotation.set(-0.5 - up * 0.4, 0.4, 0.3);
  handSlice.scale.setScalar(0.75 * (1 - bites * 0.3));
  if (handT >= total) { handT = -1; handSlice.visible = false; }
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
    if (box) box.setSlices(box.slices - 1); else kind = 'snack'; // box is empty: reach for the chips
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
    ui.monitor.hidden = false;
    ui.seatedBar.hidden = false;
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
  });
  sitDown.station = station;
  analytics.sitDown(station);
}

function standUp() {
  if (mode !== 'seated') return;
  const station = sitDown.station;
  pc.pause();
  ui.bsod.hidden = true;
  analytics.standUp(gameTitle());
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
    const gone = c.kind === 'fan' ? false : c.kind === 'coax'
      ? party.net !== 'coax' || party.pcs[PC_COUNT - 1].linkDown  // the coax across the floor is the cable to PC-06
      : party.net === 'coax' || party.pcs[c.pc].linkDown;         // an unplugged lead isn't lying there any more
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
  room.updateFan(dt, party.fan.on, party.fanSweep());
  room.updateTv(dt);
  room.door.update(dt);
  if (mode !== 'intro') for (const m of banter.tick(dt)) ircSpeak(m);
  amp?.update(dt);
  stepHandSlice(dt);
  stepEaters(dt, now);
  taped.idle(now);
  if ((tapedNext -= dt) < 0) { tapedNext = 12 + Math.random() * 10; if (taped.eatT < 0) taped.eat(); }
  if (macca.group.visible) macca.idle(now);
  for (const r of regulars) r.idle(now);
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
    for (const s of room.gamerScreens) s.draw(now);
  }

  // blinkenlights
  const playing = (mode === 'seated' && pc.running) || [...link.players.values()].some((p) => p.pc !== null);
  for (const led of room.hddLeds) if (Math.random() < 0.15) led.material.color.setHex(Math.random() < 0.4 ? 0xff2a1a : 0x400000);
  room.netLeds.forEach((led, i) => {
    const used = i < 6; // one port per PC; the rest are spare
    const up = !used || party.pcLinkUp(i);
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
    ui.shares.textContent = `${party.sharingCount()}/${PC_COUNT} · ${Math.floor(party.swapped)}MB`;
    ui.caffeine.style.width = `${stats.caffeine}%`;
    ui.snacks.style.width = `${stats.snacks}%`;
    ui.dust.style.opacity = (stats.dust * 0.9).toFixed(2);
    room.stations[BURNER.pc].screen.burn = party.job ? { pct: party.burnProgress(), secondsLeft: party.burnSecondsLeft() } : null;
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
  return `ON TONIGHT: StarCraft. ${party.starcraftBoxes()} of ${PC_COUNT} PCs have the 32MB for it`;
}

// what the cables are doing, shown on the gear and on the screens
function refreshLinks() {
  room.stations.forEach((st, i) => {
    room.setLoose(i, party.pcs[i].linkDown);
    st.screen.linkDown = !party.pcLinkUp(i);
    st.screen.crashed = party.pcs[i].crashed;
    st.screen.oc = party.pcs[i].oc;
    st.screen.ram = party.pcs[i].ram;
    st.screen.share = party.pcs[i].share === 'ok';
    st.screen.rebooting = party.rebooting(i);
    st.screen.rts = party.phase() === 'rts' ? (party.canRunStarcraft(i) ? 'starcraft' : 'nomem') : null;
  });
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
party.addEventListener('oc', (e) => { toast(`${room.stations[e.detail.pc].name}: ${OC[e.detail.level].label}.`); refreshLinks(); });
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
party.addEventListener('order', (e) => chatLine(e.detail.what === 'hub' ? 'Hub ordered. It is on its way.' : e.detail.what === 'pizza' ? `Pepperoni ordered. $${PIZZA.cost}, and "30 minutes".` : "Dazza's dad is bringing the switch round.", true));
party.addEventListener('pizza-arrive', () => {
  const box = room.addPizza();
  toast('The pizza is here. Large pepperoni, on the table.');
  chatLine('The pizza guy dumps a large pepperoni on the table and leaves before anyone can tip.', true);
  banter.react('pizza');
  box.fresh = true;
});

party.addEventListener('burn-start', () => toast('CDWRITE: writing at 2x. Hands off PC-04.'));
party.addEventListener('burn-done', (e) => {
  toast(`Disc done. Mates pay $${e.detail.pays}.`);
  chatLine(`The CD-R finally spat out a ${DISCS[e.detail.kind].name}. +$${e.detail.pays}.`, true);
});
party.addEventListener('coaster', (e) => {
  const why = { underrun: 'Buffer underrun. That one is a coaster.', crash: 'PC-04 blue screened mid-write. Coaster.', reboot: 'Windows restarted on PC-04 mid-write. Coaster.' }[e.detail.reason] ?? 'Write cancelled. That disc is a coaster now.';
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
      st.screen.setMode('mine', `${myName} · ${pc.kind === 'solo' || !pc.kind ? gameOf(pc.game ?? myGame).name : 'DEATHMATCH'}`);
    } else {
      if (st.screen.mode === 'mine') st.screen.mode = st.screen.idle;
      st.setTag(who ? who.name : st.name);
      const inMatch = who && link.match?.players.includes(who.id) && link.match.status !== 'lobby';
      st.screen.setFree(!who, who?.name, inMatch ? 'IN THE DEATHMATCH' : 'FRAGGING');
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
  ircNote(`${e.detail.name} has joined #lanparty98`); ircMe(myName); banter.react('join', e.detail.name);
  sfx.crunch();
});
link.addEventListener('leave', (e) => {
  crowd.remove(e.detail.id);
  setNetStatus();
  refreshStations();
  chatLine(`${esc(e.detail.name)} left.`, true);
  ircNote(`${e.detail.name} has left #lanparty98 (Ping timeout)`); ircMe(myName);
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
window.lan = { scene, camera, room, stats, player, sitDown, standUp, pc, link, crowd };
