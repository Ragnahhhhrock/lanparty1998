// Procedural canvas textures: everything in the room is drawn here, no image files.
import * as THREE from 'three';

const CRT_FONT = '"VT323", "Lucida Console", monospace';

function canvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  return [c, c.getContext('2d')];
}

function tex(c, repeat) {
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  if (repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(repeat[0], repeat[1]); }
  return t;
}

function rand(seed) { // small deterministic PRNG so the room looks the same every visit
  let s = seed >>> 0;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
}

export function woodPanel() {
  const [c, g] = canvas(512, 512);
  const r = rand(7);
  const boards = 8, bw = 512 / boards;
  for (let i = 0; i < boards; i++) {
    const base = 70 + r() * 25;
    g.fillStyle = `hsl(26 ${45 + r() * 10}% ${base / 4}%)`;
    g.fillRect(i * bw, 0, bw, 512);
    for (let k = 0; k < 40; k++) { // grain
      g.strokeStyle = `hsla(24, 50%, ${10 + r() * 14}%, ${0.15 + r() * 0.25})`;
      g.lineWidth = 0.5 + r() * 1.5;
      const x = i * bw + r() * bw;
      g.beginPath(); g.moveTo(x, 0);
      g.bezierCurveTo(x + r() * 6 - 3, 170, x + r() * 6 - 3, 340, x + r() * 4 - 2, 512);
      g.stroke();
    }
    g.fillStyle = 'rgba(0,0,0,.55)'; g.fillRect(i * bw, 0, 2, 512); // board groove
  }
  return tex(c, [4, 1]);
}

// a six-panel interior door, painted wood-brown
export function door() {
  const [c, g] = canvas(256, 512);
  const r = rand(23);
  g.fillStyle = '#4a2c17'; g.fillRect(0, 0, 256, 512); // --wood
  for (let i = 0; i < 60; i++) {
    g.strokeStyle = `rgba(36,21,11,${0.1 + r() * 0.2})`; // --wood-dark
    g.lineWidth = 0.5 + r() * 1.2;
    const x = r() * 256;
    g.beginPath(); g.moveTo(x, 0); g.bezierCurveTo(x + 4, 170, x - 4, 340, x + 2, 512); g.stroke();
  }
  const panel = (x, y, w, h) => {
    g.fillStyle = '#24150b'; g.fillRect(x, y, w, h);
    g.fillStyle = '#4a2c17'; g.fillRect(x + 4, y + 4, w - 8, h - 8);
    g.fillStyle = 'rgba(255,255,255,.07)'; g.fillRect(x + 4, y + 4, w - 8, 3); g.fillRect(x + 4, y + 4, 3, h - 8);
  };
  for (const x of [28, 136]) { panel(x, 28, 92, 150); panel(x, 196, 92, 110); panel(x, 324, 92, 160); }
  return tex(c);
}

export function carpet() {
  const [c, g] = canvas(256, 256);
  const r = rand(11);
  g.fillStyle = '#3b2f2a'; g.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 9000; i++) {
    const v = r();
    g.fillStyle = v < 0.5 ? 'rgba(20,14,12,.5)' : v < 0.85 ? 'rgba(90,70,58,.45)' : 'rgba(120,40,40,.35)';
    g.fillRect(r() * 256, r() * 256, 1 + r() * 2, 1 + r() * 2);
  }
  return tex(c, [10, 10]);
}

export function ceilingTile() {
  const [c, g] = canvas(256, 256);
  const r = rand(3);
  g.fillStyle = '#d9d4c7'; g.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 2500; i++) { g.fillStyle = `rgba(80,70,60,${r() * 0.25})`; g.fillRect(r() * 256, r() * 256, 1.5, 1.5); }
  g.strokeStyle = '#9b958a'; g.lineWidth = 6; g.strokeRect(0, 0, 256, 256);
  g.fillStyle = 'rgba(150,110,40,.18)'; // one water stain, every basement has one
  g.beginPath(); g.ellipse(180, 90, 36, 22, 0.4, 0, Math.PI * 2); g.fill();
  return tex(c, [8, 7]);
}

export function keyboardTop() {
  const [c, g] = canvas(256, 96);
  g.fillStyle = '#d6cdb4'; g.fillRect(0, 0, 256, 96);
  const rows = [15, 14, 13, 12];
  rows.forEach((n, ri) => {
    for (let k = 0; k < n; k++) {
      const x = 8 + k * 12.5 + ri * 3, y = 10 + ri * 19;
      g.fillStyle = '#ebe4cf'; g.fillRect(x, y, 10, 15);
      g.fillStyle = '#b8ae94'; g.fillRect(x, y + 13, 10, 2);
    }
  });
  g.fillStyle = '#ebe4cf'; g.fillRect(50, 82, 110, 10); // space bar
  return tex(c);
}

// the front of a 5.25" CD-R drive: tray slot, activity LED, and the speed it writes at
export function cdrDrive() {
  const [c, g] = canvas(150, 40);
  g.fillStyle = '#d6cdb4'; g.fillRect(0, 0, 150, 40);                    // --beige
  g.fillStyle = '#0a0a0a'; g.fillRect(8, 10, 134, 4);                    // --w98-dark: tray slot
  g.fillStyle = '#808080'; g.fillRect(8, 15, 134, 1);                    // --w98-shadow
  g.font = `bold 13px Tahoma, sans-serif`; g.fillStyle = '#0a0a0a'; g.fillText('CD-R  2x', 8, 33);
  g.fillStyle = '#3cff5a'; g.fillRect(126, 26, 12, 6);                   // activity LED
  return tex(c);
}

// the computer shop's price list, left on the snack table
export function priceList() {
  const [c, g] = canvas(192, 256);
  g.fillStyle = '#e8e1cc'; g.fillRect(0, 0, 192, 256);                    // --paper
  g.fillStyle = '#000080'; g.fillRect(0, 0, 192, 34);                     // --w98-title
  g.font = `24px ${CRT_FONT}`; g.fillStyle = '#ffffff'; g.fillText('COMPUTER SHOP', 10, 24);
  g.font = '11px Tahoma, sans-serif'; g.fillStyle = '#000000';
  const rows = [['PRICE LIST', 'NOV 98'], ['8-port 10BASE-T hub', '$45'], ['16MB SIMM, 72-pin', '$75'], ['CD-R blank, each', '$4'], ['Cat5 patch lead', '$6'], ['BNC T-connector', '$8']];
  rows.forEach(([a, b], i) => { g.fillText(a, 10, 62 + i * 24); g.fillText(b, 148, 62 + i * 24); });
  g.fillStyle = '#808080'; for (let i = 0; i < 6; i++) g.fillRect(10, 68 + i * 24, 172, 1); // --w98-shadow
  g.font = '11px Tahoma, sans-serif'; g.fillStyle = '#000000'; g.fillText('No refunds on opened RAM.', 10, 222);
  return tex(c);
}

// the sticker on a 3.5" disk: marker pen on paper, with a coloured stripe along the top
export function floppyLabel(text, stripe = '#e2231a', seed = 1) {
  const [c, g] = canvas(128, 88);
  const r = rand(seed);
  g.fillStyle = '#e8e1cc'; g.fillRect(0, 0, 128, 88);                    // --paper
  g.fillStyle = stripe; g.fillRect(0, 0, 128, 14);
  g.fillStyle = '#808080'; for (let y = 44; y < 88; y += 16) g.fillRect(4, y, 120, 1); // --w98-shadow: ruled lines
  g.font = `34px ${CRT_FONT}`;
  const k = Math.min(1, 112 / Math.max(1, g.measureText(text).width));
  g.font = `${Math.round(34 * k)}px ${CRT_FONT}`;
  g.save(); g.translate(8, 42); g.rotate((r() - 0.5) * 0.08);
  g.fillStyle = '#000080'; g.fillText(text, 0, 0);                       // --w98-title: blue biro
  g.restore();
  return tex(c);
}

// one side of a CD, drawn on a circle that maps onto a RingGeometry (or a cylinder cap).
//   silver: pressed data side   cdr: burnt data side   burnt: marker pen on the label side
//   printed: a pressed game disc, label side up
export function discFace(kind = 'silver', text = '') {
  const [c, g] = canvas(128, 128);
  const disc = { silver: '#cfd3d8', cdr: '#7f9f8a', burnt: '#e8e1cc', printed: '#cfd3d8' }[kind]; // --disc-silver, --disc-cdr, --paper
  g.beginPath(); g.arc(64, 64, 64, 0, Math.PI * 2); g.fillStyle = disc; g.fill();
  if (kind === 'silver' || kind === 'cdr') {
    g.lineWidth = 3; g.strokeStyle = 'rgba(255,255,255,.28)';
    for (let r = 26; r < 62; r += 8) { g.beginPath(); g.arc(64, 64, r, 0, Math.PI * 2); g.stroke(); }
  }
  if (kind === 'printed') {
    g.fillStyle = '#000080'; g.beginPath(); g.arc(64, 64, 46, 0.2, Math.PI - 0.2); g.fill(); // --w98-title band
    g.fillStyle = '#e2231a'; g.beginPath(); g.arc(64, 64, 46, Math.PI + 0.2, -0.2); g.fill(); // --volt
  }
  if (text) {
    g.save(); g.translate(64, 64); g.rotate(-0.45);
    g.font = `30px ${CRT_FONT}`; g.textAlign = 'center';
    g.fillStyle = kind === 'printed' ? '#ffffff' : '#000080'; g.fillText(text, 0, 8);
    g.restore();
  }
  g.beginPath(); g.arc(64, 64, 18, 0, Math.PI * 2); g.fillStyle = '#e8e8e8'; g.fill(); // --w98-key: clear hub ring
  g.beginPath(); g.arc(64, 64, 63, 0, Math.PI * 2); g.lineWidth = 2; g.strokeStyle = '#8f949a'; g.stroke(); // --disc-edge
  return tex(c);
}

// the paper insert in a jewel case: a coloured band with the title in it
export function jewelInsert(title, band = '#000080') {
  const [c, g] = canvas(142, 124);
  g.fillStyle = '#e8e1cc'; g.fillRect(0, 0, 142, 124);                   // --paper
  g.fillStyle = band; g.fillRect(0, 0, 142, 44);
  g.font = `30px ${CRT_FONT}`;
  const k = Math.min(1, 126 / Math.max(1, g.measureText(title).width));
  g.font = `${Math.round(30 * k)}px ${CRT_FONT}`;
  g.fillStyle = '#ffffff'; g.fillText(title, 8, 32);
  g.fillStyle = '#808080'; for (let y = 64; y < 124; y += 18) g.fillRect(8, y, 126, 1); // --w98-shadow
  return tex(c);
}

// a government asset sticker on the borrowed switch
export function assetTag() {
  const [c, g] = canvas(192, 80);
  g.fillStyle = '#ffffff'; g.fillRect(0, 0, 192, 80);
  g.fillStyle = '#0a0a0a'; g.fillRect(0, 0, 192, 4); g.fillRect(0, 76, 192, 4);
  g.font = 'bold 15px Tahoma, sans-serif'; g.fillText('GOVT PROPERTY', 8, 26);
  g.font = '13px Tahoma, sans-serif'; g.fillText('ASSET 004417 · IT BRANCH', 8, 46);
  g.fillText('NOT FOR PRIVATE USE', 8, 64);
  return tex(c);
}

// An Australian double power point: a plate with a rocker switch above each socket, and the three flat slots
// (two angled, one upright) every plug in the room goes into. Colours: --beige-light, --beige, --w98-hilite, --w98-shadow, --w98-dark.
export function wallSocket() {
  const [c, g] = canvas(160, 240);
  g.fillStyle = '#ebe4cf'; g.fillRect(0, 0, 160, 240);                      // --beige-light: yellowed white plastic
  g.fillStyle = '#d6cdb4'; g.fillRect(0, 0, 160, 3); g.fillRect(0, 237, 160, 3); g.fillRect(0, 0, 3, 240); g.fillRect(157, 0, 3, 240); // --beige
  for (const y0 of [0, 120]) {
    g.fillStyle = '#dfdfdf'; g.fillRect(58, y0 + 12, 44, 18);               // --w98-hilite: the rocker
    g.fillStyle = '#808080'; g.fillRect(58, y0 + 29, 44, 2); g.fillRect(101, y0 + 12, 2, 18); // --w98-shadow
    g.fillStyle = '#d6cdb4'; g.fillRect(26, y0 + 38, 108, 72);              // the socket face, sunk a little
    g.fillStyle = '#808080'; g.fillRect(26, y0 + 38, 108, 2); g.fillRect(26, y0 + 38, 2, 72);
    g.fillStyle = '#0a0a0a';                                                // --w98-dark: the slots
    for (const [x, y, a] of [[60, 62, -0.5], [100, 62, 0.5], [80, 92, 0]]) {
      g.save(); g.translate(x, y0 + y); g.rotate(a); g.fillRect(-4, -11, 8, 22); g.restore();
    }
  }
  g.fillStyle = '#808080'; g.beginPath(); g.arc(80, 120, 3, 0, Math.PI * 2); g.fill(); // the screw between them
  return tex(c);
}

// The top of a power board: four sockets, a mains switch on the right and, if asked, a strip of masking tape on
// the front edge in blue biro. The switch lamp is a separate mesh, so it can go out. 0.40 x 0.09 m.
export function powerBoardTop(tape = '') {
  const [c, g] = canvas(512, 116);
  g.fillStyle = '#ebe4cf'; g.fillRect(0, 0, 512, 116);                      // --beige-light
  g.fillStyle = '#d6cdb4'; g.fillRect(0, 0, 512, 3); g.fillRect(0, 113, 512, 3); // --beige
  for (const x of [77, 179, 282, 384]) {
    g.fillStyle = '#d6cdb4'; g.fillRect(x - 40, 10, 80, 68);
    g.fillStyle = '#808080'; g.fillRect(x - 40, 10, 80, 2); g.fillRect(x - 40, 10, 2, 68); // --w98-shadow
    g.fillStyle = '#0a0a0a';                                                // --w98-dark
    for (const [dx, dy, a] of [[-14, 30, -0.5], [14, 30, 0.5], [0, 56, 0]]) {
      g.save(); g.translate(x + dx, dy + 6); g.rotate(a); g.fillRect(-4, -10, 8, 20); g.restore();
    }
  }
  g.fillStyle = '#dfdfdf'; g.fillRect(447, 18, 40, 56);                     // --w98-hilite: the rocker
  g.fillStyle = '#808080'; g.fillRect(447, 72, 40, 3); g.fillRect(485, 18, 3, 56);
  g.font = `16px ${CRT_FONT}`; g.fillStyle = '#0a0a0a'; g.fillText('I', 462, 40); g.fillText('O', 462, 66);
  if (tape) { // on the edge nearest the person, so it reads the right way up from the room
    g.fillStyle = '#e8e1cc'; g.fillRect(14, 88, 200, 22);                   // --paper: masking tape
    g.font = `22px ${CRT_FONT}`; g.fillStyle = '#000080'; g.fillText(tape, 20, 106); // --w98-title: biro
  }
  return tex(c);
}

// The cover of the switchboard on the wall: grey steel, a row of breakers and a strip of paper under each in
// biro. The sockets along the front wall are on the dryer's circuit. 0.28 x 0.36 m.
export function switchboardDoor() {
  const [c, g] = canvas(256, 336);
  g.fillStyle = '#8a8d92'; g.fillRect(0, 0, 256, 336);                      // --floppy-grey
  g.fillStyle = '#44474b'; g.fillRect(0, 0, 256, 6); g.fillRect(0, 330, 256, 6); g.fillRect(0, 0, 6, 336); g.fillRect(250, 0, 6, 336); // --console-dark
  g.font = `24px ${CRT_FONT}`; g.fillStyle = '#0a0a0a'; g.fillText('MAIN SWITCHBOARD', 24, 34);
  g.fillStyle = '#e2231a'; g.fillRect(24, 44, 208, 6);                      // --volt
  const rows = [['LIGHTS', 'POWER 1', 'POWER 2', 'STOVE'], ['HOT WATER', 'DRYER+FRONT', 'SPARE', 'MAIN']];
  rows.forEach((row, ri) => row.forEach((name, ci) => {
    const x = 18 + ci * 58, y = 70 + ri * 124;
    g.fillStyle = '#26262b'; g.fillRect(x, y, 48, 70);                      // --disk-case: the breaker housing
    g.fillStyle = '#0a0a0a'; g.fillRect(x + 8, y + 8, 32, 54);
    const on = name !== 'DRYER+FRONT';
    g.fillStyle = name === 'MAIN' ? '#e2231a' : '#dfdfdf';                  // --volt main, --w98-hilite toggles
    g.fillRect(x + 12, y + (on ? 12 : 36), 24, 22);
    g.fillStyle = '#e8e1cc'; g.fillRect(x - 2, y + 78, 52, 24);             // --paper
    g.font = `15px ${CRT_FONT}`; g.fillStyle = '#000080';
    g.fillText(name, x + 1, y + 95, 46);
  }));
  return tex(c);
}

// A soft round glow for the light a CRT throws. Drawn white: the material tints it and adds it to what is behind.
export function glowHalo() {
  const [c, g] = canvas(128, 128);
  const grad = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  grad.addColorStop(0, 'rgba(255,255,255,1)');
  grad.addColorStop(0.3, 'rgba(255,255,255,0.5)');
  grad.addColorStop(0.65, 'rgba(255,255,255,0.14)');
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grad; g.fillRect(0, 0, 128, 128);
  return tex(c);
}

export function voltLabel() {
  const [c, g] = canvas(256, 128);
  g.fillStyle = '#c4161c'; g.fillRect(0, 0, 256, 128);
  g.fillStyle = '#111'; g.fillRect(0, 0, 256, 18); g.fillRect(0, 110, 256, 18);
  g.fillStyle = '#ffd400';
  g.beginPath(); g.moveTo(40, 20); g.lineTo(18, 70); g.lineTo(34, 70); g.lineTo(22, 108); g.lineTo(58, 52); g.lineTo(42, 52); g.lineTo(56, 20); g.fill();
  g.font = `bold 44px Impact, "Arial Black", sans-serif`; g.fillStyle = '#fff';
  g.fillText('VOLT', 72, 68);
  g.font = `bold 18px Arial, sans-serif`; g.fillStyle = '#ffd400'; g.fillText('COLA', 74, 94);
  g.font = `11px Arial, sans-serif`; g.fillStyle = '#fff'; g.fillText('ALL THE SUGAR · TWICE THE CAFFEINE', 70, 107);
  return tex(c);
}

// Citrus Zap, the green two-litre: a parody brand, drawn only in --zap-*, --volt-yellow and --volt-can
export function zapLabel() {
  const [c, g] = canvas(256, 128);
  g.fillStyle = '#4aa52a'; g.fillRect(0, 0, 256, 128);                       // --zap-green
  g.fillStyle = '#1c5a1e'; g.fillRect(0, 0, 256, 16); g.fillRect(0, 112, 256, 16); // --zap-dark
  g.fillStyle = '#b5d334';                                                   // --zap-lime splash
  g.beginPath(); g.arc(46, 64, 30, 0, Math.PI * 2); g.fill();
  g.fillStyle = '#4aa52a';
  for (let a = 0; a < 6; a++) { g.save(); g.translate(46, 64); g.rotate(a * Math.PI / 3); g.fillRect(-1.5, -28, 3, 56); g.restore(); } // citrus segments
  g.fillStyle = '#c4161c'; g.fillRect(84, 22, 160, 6);                      // --volt-can stripe
  g.textAlign = 'left';
  g.font = 'bold 20px Arial, sans-serif'; g.fillStyle = '#b5d334'; g.fillText('CITRUS', 86, 50);
  g.font = 'bold 50px Impact, "Arial Black", sans-serif';
  g.fillStyle = '#0a0a0a'; g.fillText('ZAP', 89, 94); g.fillStyle = '#ffd400'; g.fillText('ZAP', 86, 91); // --volt-yellow
  g.font = '11px Arial, sans-serif'; g.fillStyle = '#fff'; g.fillText('GREEN. LOUD. COLD.', 140, 106);
  return tex(c);
}

export function nachozBag() {
  const [c, g] = canvas(192, 256);
  const grad = g.createLinearGradient(0, 0, 0, 256);
  grad.addColorStop(0, '#1d1a5c'); grad.addColorStop(1, '#0d0b33');
  g.fillStyle = grad; g.fillRect(0, 0, 192, 256);
  g.fillStyle = '#f28a1c';
  g.beginPath(); g.moveTo(96, 96); g.lineTo(40, 200); g.lineTo(152, 200); g.closePath(); g.fill();
  g.fillStyle = '#c7621a'; for (let i = 0; i < 18; i++) g.fillRect(60 + (i * 37) % 80, 130 + (i * 23) % 60, 3, 3);
  g.save(); g.translate(96, 66); g.rotate(-0.12);
  g.font = 'bold 46px Impact, "Arial Black", sans-serif'; g.textAlign = 'center';
  g.fillStyle = '#000'; g.fillText('NACHOZ', 3, 3); g.fillStyle = '#ffcc00'; g.fillText('NACHOZ', 0, 0);
  g.restore();
  g.font = 'bold 15px Arial, sans-serif'; g.fillStyle = '#fff'; g.textAlign = 'center';
  g.fillText('NUCLEAR CHEESE', 96, 232);
  return tex(c);
}

export function curlzBag() {
  const [c, g] = canvas(192, 256);
  const grad = g.createLinearGradient(0, 0, 0, 256);
  grad.addColorStop(0, '#1f7a4d'); grad.addColorStop(1, '#14522f');
  g.fillStyle = grad; g.fillRect(0, 0, 192, 256);
  g.strokeStyle = '#ffa51f'; g.lineWidth = 14; g.lineCap = 'round';   // three fat curls
  for (const [x, y, r] of [[64, 150, 22], [112, 138, 26], [92, 190, 20]]) {
    g.beginPath(); g.arc(x, y, r, 0.4, Math.PI * 1.7); g.stroke();
  }
  g.save(); g.translate(96, 64); g.rotate(0.08);
  g.font = 'bold 40px Impact, "Arial Black", sans-serif'; g.textAlign = 'center';
  g.fillStyle = '#000'; g.fillText('CHEEZ', 3, 3); g.fillStyle = '#ffcc00'; g.fillText('CHEEZ', 0, 0);
  g.fillStyle = '#000'; g.fillText('CURLZ', 3, 43); g.fillStyle = '#ffa51f'; g.fillText('CURLZ', 0, 40);
  g.restore();
  g.font = 'bold 14px Arial, sans-serif'; g.fillStyle = '#fff'; g.textAlign = 'center';
  g.fillText('CRUNCHY ORANGE FINGERS', 96, 240);
  return tex(c);
}

export function pizzaLid() {
  const [c, g] = canvas(256, 256);
  g.fillStyle = '#cfb48a'; g.fillRect(0, 0, 256, 256);
  g.strokeStyle = '#b9154a'; g.lineWidth = 6; g.strokeRect(14, 14, 228, 228);
  g.font = 'bold 30px Georgia, serif'; g.fillStyle = '#b9154a'; g.textAlign = 'center';
  g.fillText('HOT & FRESH', 128, 120); g.font = 'italic 20px Georgia, serif'; g.fillText('Delivered in 30 min', 128, 152);
  g.fillStyle = 'rgba(120,70,20,.25)'; g.beginPath(); g.arc(190, 190, 26, 0, Math.PI * 2); g.fill(); // grease ring
  return tex(c);
}

export function poster(title, sub, hue) {
  const [c, g] = canvas(256, 360);
  g.fillStyle = `hsl(${hue} 70% 12%)`; g.fillRect(0, 0, 256, 360);
  for (let i = 0; i < 14; i++) { g.fillStyle = `hsla(${hue + i * 6} 90% 55% / ${0.06 + i * 0.012})`; g.fillRect(0, 360 - i * 22, 256, 11); }
  g.textAlign = 'center';
  g.font = `bold 52px Impact, "Arial Black", sans-serif`;
  title.split('\n').forEach((ln, i) => {
    g.fillStyle = '#000'; g.fillText(ln, 131, 104 + i * 56);
    g.fillStyle = `hsl(${hue + 30} 95% 62%)`; g.fillText(ln, 128, 100 + i * 56);
  });
  g.font = `22px ${CRT_FONT}`; g.fillStyle = '#eee';
  sub.split('\n').forEach((ln, i) => g.fillText(ln, 128, 290 + i * 22));
  return tex(c);
}

// Gig posters for invented 1990s bands (grunge, industrial, hair metal, dance).
// Every name, venue and graphic is made up. Flat, hard-edged, VT323 only; colours are tokens.
const BAND_SIZES = [96, 40, 26, 24, 20, 18]; // VT323 sizes from STYLEGUIDE.md

function fitSize(g, lines, maxW, sizes = BAND_SIZES) {
  for (const s of sizes) {
    g.font = `${s}px ${CRT_FONT}`;
    if (lines.every((ln) => g.measureText(ln).width <= maxW)) return s;
  }
  return sizes[sizes.length - 1];
}

function bandText(g, lines, cx, y, maxW, fill, shadow, sizes) {
  const s = fitSize(g, lines, maxW, sizes);
  g.font = `${s}px ${CRT_FONT}`; g.textAlign = 'center';
  lines.forEach((ln, i) => {
    const ly = y + i * Math.round(s * 0.9);
    if (shadow) { g.fillStyle = shadow; g.fillText(ln, cx + 2, ly + 2); } // --text-shadow-hard
    g.fillStyle = fill; g.fillText(ln, cx, ly);
  });
  return y + lines.length * Math.round(s * 0.9);
}

export function bandPoster(kind) {
  const [c, g] = canvas(256, 360);
  const r = rand(kind.length * 977 + kind.charCodeAt(0));
  const paper = '#e8e1cc', black = '#141414', crt = '#000000', volt = '#e2231a'; // --paper --clothes-black --crt-black --volt
  const amber = '#ffcc00', navy = '#1d1a5c', phos = '#9dff7a', grey = '#aaaaaa'; // --amber --nacho-navy --phosphor --dos-grey
  const duct = '#9aa0a6', tape = '#5c6166', nacho = '#f28a1c'; // --duct-silver --duct-tape --nacho
  const rect = (col, x, y, w, h) => { g.fillStyle = col; g.fillRect(x, y, w, h); };

  if (kind === 'grunge') { // WET CEMENT: photocopied flyer, black slab, drips
    rect(paper, 0, 0, 256, 360);
    rect(black, 16, 16, 224, 184);
    for (let i = 0; i < 140; i++) rect(paper, 16 + ((r() * 112) | 0) * 2, 16 + ((r() * 92) | 0) * 2, 2, 2); // toner dropout
    for (let i = 0; i < 90; i++) rect(black, 2 * ((r() * 128) | 0), 208 + 2 * ((r() * 70) | 0), 2, 2); // stray specks
    for (let i = 0; i < 12; i++) rect(black, 24 + i * 18, 200, 8, 8 + ((r() * 5) | 0) * 8); // drips
    rect(volt, 200, 24, 32, 16); // LIVE stamp
    g.font = `18px ${CRT_FONT}`; g.textAlign = 'center'; g.fillStyle = paper; g.fillText('LIVE', 216, 38);
    bandText(g, ['WET', 'CEMENT'], 128, 112, 192, paper);
    bandText(g, ['LIVE AT THE CRAWLSPACE'], 128, 278, 224, black, null, [24, 20, 18]);
    bandText(g, ['FRI 20 NOV 1998', 'ALL AGES · $6 AT THE DOOR'], 128, 308, 224, black, null, [20, 18]);
  } else if (kind === 'industrial') { // COLD FURNACE: pipes, rivets, a pixel flame
    rect(crt, 0, 0, 256, 360);
    for (let i = 0; i < 3; i++) { // horizontal pipes
      rect(tape, 0, 16 + i * 24, 256, 16); rect(duct, 0, 16 + i * 24, 256, 4);
      for (let x = 12; x < 256; x += 32) rect(black, x, 22 + i * 24, 4, 4);
    }
    rect(tape, 24, 88, 16, 120); rect(tape, 216, 88, 16, 120); // risers
    rect(duct, 24, 88, 4, 120); rect(duct, 216, 88, 4, 120);
    const flame = [
      '.....11.....', '....111.....', '....1111....', '...111111...', '..11122111..', '..11222211..',
      '.111223322111', '.11223333221.', '.11223333221.', '.11223333221.', '..122333321..', '...1222221...',
    ];
    const fc = { 1: volt, 2: nacho, 3: amber }; // --volt --nacho --amber
    flame.forEach((row, y) => [...row].forEach((ch, x) => { if (ch !== '.') rect(fc[ch], 80 + x * 8, 96 + y * 8, 8, 8); }));
    bandText(g, ['COLD', 'FURNACE'], 128, 248, 224, paper);
    bandText(g, ['THE BOILER ROOM TOUR'], 128, 306, 224, amber, null, [24, 20, 18]);
    bandText(g, ['SAT 21 NOV 1998 · EARPLUGS $1'], 128, 336, 240, grey, null, [18]);
  } else if (kind === 'hairmetal') { // DIAMOND FANG: navy, stripes, an amber bolt with a hard shadow
    rect(navy, 0, 0, 256, 360);
    for (let i = 0; i < 6; i++) rect(volt, 0, 24 + i * 16, 256, i % 2 ? 4 : 8); // stage-light stripes
    const bolt = [
      '......1111..', '.....1111...', '....1111....', '...111111...', '....11111...', '.....1111...',
      '....11111...', '...11111....', '..1111......', '.111........', '.11.........',
    ];
    const drawBolt = (col, ox, oy) => bolt.forEach((row, y) => [...row].forEach((ch, x) => { if (ch !== '.') rect(col, ox + x * 12, oy + y * 12, 12, 12); }));
    drawBolt(crt, 80 + 8, 88 + 8); drawBolt(amber, 80, 88);
    bandText(g, ['DIAMOND', 'FANG'], 128, 244, 224, amber, crt);
    bandText(g, ['THE LAST HAIRSPRAY TOUR'], 128, 308, 224, paper, null, [24, 20, 18]);
    bandText(g, ['SUN 22 NOV 1998 · ONE NIGHT ONLY'], 128, 336, 240, paper, null, [18]);
    rect(volt, 0, 344, 256, 16);
  } else { // BASS CADET: equaliser bars on black glass
    rect(crt, 0, 0, 256, 360);
    for (let i = 0; i < 16; i++) {
      const h = 3 + ((r() * 7) | 0); // bars of 8px blocks, hot tip on top
      for (let k = 0; k < h; k++) rect(k === h - 1 ? amber : phos, 16 + i * 14, 256 - k * 8, 10, 6);
    }
    rect(grey, 16, 264, 224, 2);
    bandText(g, ['BASS', 'CADET'], 128, 72, 224, phos);
    bandText(g, ['LIVE PA'], 128, 296, 224, paper, null, [26, 24, 20]);
    bandText(g, ['FRI 27 NOV 1998', 'DOORS 11 PM · 18+'], 128, 320, 224, grey, null, [20, 18]);
  }
  return tex(c);
}

// Box art and one-sheets for invented 1990s games and films, in the spirit of the era's shooters,
// space strategy and blockbusters. Every title, character and picture is made up: nothing here copies
// a real cover or poster. Flat, hard-edged, pixel-aligned; colours are tokens (hex in comments).
function disc(g, cx, cy, r, col, step = 4) { // blocky circle: stacked 4px rows
  g.fillStyle = col;
  for (let y = -r; y < r; y += step) {
    const half = Math.round(Math.sqrt(r * r - (y + step / 2) * (y + step / 2)) / step) * step;
    g.fillRect(cx - half, cy + y, half * 2, step);
  }
}

export function gamePoster(kind) {
  const [c, g] = canvas(256, 360);
  const r = rand(kind.length * 3301 + kind.charCodeAt(1));
  const rect = (col, x, y, w, h) => { g.fillStyle = col; g.fillRect(x, y, w, h); };
  const crt = '#000000', paper = '#e8e1cc', amber = '#ffcc00', volt = '#e2231a', nacho = '#f28a1c'; // --crt-black --paper --amber --volt --nacho
  const ember = '#7a1a12', steel = '#46697a', steelHi = '#8fb1c0', space = '#0b1033'; // --poster-ember --poster-steel --poster-steel-light --poster-space
  const nebula = '#5b2f86', planet = '#b4532a', chrome = '#c9d5dd', chromeDk = '#5e6c76'; // --poster-nebula --poster-planet --poster-chrome --poster-chrome-dark
  const phos = '#9dff7a', grey = '#aaaaaa', black = '#141414'; // --phosphor --dos-grey --clothes-black

  if (kind === 'corridor') { // IRON HYMN: a stone corridor, a one-eyed floater, a helmeted soldier from behind
    rect(crt, 0, 0, 256, 360);
    for (let i = 0; i < 6; i++) { // the tunnel: nested frames toward the vanishing point
      const inset = 8 + i * 18, col = i % 2 ? ember : black;
      rect(col, inset, inset + 40, 256 - inset * 2, 280 - inset * 2);
    }
    rect(nacho, 100, 150, 56, 56); rect(amber, 112, 162, 32, 32); rect(paper, 124, 174, 8, 8); // the light at the end
    const orb = [ // 1 body, 2 eye white, 3 iris, 4 pupil, 5 tentacle
      '......1111......', '....11111111....', '...1111111111...', '..111122221111..', '..111223322111..', '.11112334332111.',
      '.11112334332111.', '..111223322111..', '..111122221111..', '...1111111111...', '....11111111....', '...5.5.55.5.5...', '...5.5....5.5...', '..5...5..5...5..',
    ];
    const oc = { 1: volt, 2: paper, 3: amber, 4: crt, 5: ember };
    orb.forEach((row, y) => [...row].forEach((ch, x) => { if (ch !== '.') rect(oc[ch], 64 + x * 8, 130 + y * 8, 8, 8); }));
    rect(steel, 104, 244, 48, 12); rect(steel, 96, 256, 64, 36); rect(steelHi, 104, 244, 48, 4); rect(steelHi, 96, 256, 8, 36); // helmet dome
    rect(steel, 88, 292, 80, 28); rect(steel, 56, 284, 40, 36); rect(steel, 160, 284, 40, 36); // back and pauldrons
    rect(steelHi, 56, 284, 40, 4); rect(steelHi, 160, 284, 40, 4); rect(steelHi, 88, 292, 80, 4);
    rect(chromeDk, 168, 190, 16, 104); rect(chrome, 168, 190, 4, 104); rect(black, 168, 182, 16, 8); // gun barrel
    bandText(g, ['IRON HYMN'], 128, 56, 232, amber, crt, [40]);
    rect(crt, 0, 320, 256, 40);
    bandText(g, ['27 LEVELS · 8 PLAYER IPX'], 128, 344, 240, phos, null, [18]);
  } else if (kind === 'hero') { // RICO RAMPAGE 3D: sunset city, a mohawked action hero in shades
    [nacho, volt, ember, ember, ember].forEach((col, i) => rect(col, 0, i * 56, 256, 56)); // sunset stripes
    rect(amber, 96, 232, 64, 8); rect(amber, 72, 240, 112, 8); // low sun, hard-edged
    for (let x = 0; x < 256; x += 24) { // skyline
      const h = 40 + ((r() * 7) | 0) * 12;
      rect(black, x, 312 - h, 24, h + 48);
      for (let wy = 312 - h + 8; wy < 340; wy += 16) if (r() > 0.55) rect(amber, x + 8, wy, 8, 8);
    }
    rect(black, 0, 340, 256, 20);
    // hero
    rect(volt, 124, 112, 8, 12); rect(volt, 120, 124, 16, 12); rect(volt, 124, 136, 8, 12); // mohawk
    rect('#e0b48f', 104, 144, 48, 60); // --skin
    rect('#3b2716', 104, 192, 48, 12); // --hair: stubble
    rect(black, 100, 160, 56, 14); rect(chrome, 108, 162, 10, 4); rect(chrome, 134, 162, 10, 4); // shades
    rect('#f4efe6', 116, 186, 24, 6); rect('#a8493f', 116, 192, 24, 4); // --eye-white grin, --lip
    rect('#e0b48f', 116, 204, 24, 10); // neck
    rect('#ececec', 80, 214, 96, 86); rect(black, 100, 214, 8, 20); rect(black, 148, 214, 8, 20); // tank top, straps
    rect('#e0b48f', 52, 214, 28, 72); rect('#e0b48f', 176, 214, 28, 72); // arms
    rect('#44474b', 164, 244, 72, 20); rect(chromeDk, 164, 244, 72, 6); rect('#44474b', 160, 256, 28, 36); // gun --console-dark
    rect(amber, 236, 240, 12, 28); rect(volt, 240, 248, 8, 12); // muzzle flash
    rect(black, 80, 300, 96, 12); rect(amber, 120, 300, 16, 12); // belt
    bandText(g, ['RICO', 'RAMPAGE 3D'], 128, 44, 232, paper, black, [40]);
    bandText(g, ['FRAG LIMIT 20 · 8 PLAYERS'], 128, 354, 240, amber, null, [18]);
  } else { // VOID HARVEST: real-time strategy, a crescent planet and a fleet
    rect(space, 0, 0, 256, 360);
    for (let i = 0; i < 6; i++) disc(g, 40 + ((r() * 176) | 0), 40 + ((r() * 200) | 0), 24 + ((r() * 3) | 0) * 8, nebula); // gas clouds
    for (let i = 0; i < 70; i++) rect(r() > 0.8 ? amber : paper, 4 * ((r() * 64) | 0), 4 * ((r() * 90) | 0), 4, 4); // stars
    disc(g, 176, 232, 72, planet); disc(g, 152, 216, 68, space); // crescent: the dark disc bites the light one
    for (let i = 0; i < 6; i++) disc(g, 40 + ((r() * 176) | 0), 40 + ((r() * 200) | 0), 4, space); // keeps stars off the dark limb
    const ship = [ // 1 hull, 2 shade, 3 engine
      '....1111....', '...111111...', '..11111111..', '.1111221111.', '111112211111', '111122221111', '.1111111111.', '..33.33.33..',
    ];
    const sc = { 1: chrome, 2: chromeDk, 3: amber };
    ship.forEach((row, y) => [...row].forEach((ch, x) => { if (ch !== '.') rect(sc[ch], 36 + x * 12, 104 + y * 12, 12, 12); }));
    for (let i = 0; i < 3; i++) { // escort fighters
      const fx = 148 + i * 28, fy = 144 + i * 16;
      rect(chrome, fx + 8, fy, 8, 24); rect(chromeDk, fx, fy + 16, 24, 8); rect(amber, fx + 8, fy + 24, 8, 8);
    }
    bandText(g, ['VOID', 'HARVEST'], 128, 48, 224, amber, crt, [96, 40]);
    bandText(g, ['REAL-TIME STRATEGY · 3 RACES'], 128, 322, 240, paper, null, [18]);
    bandText(g, ['256 COLOURS · IPX · MODEM'], 128, 344, 240, grey, null, [18]);
  }
  return tex(c);
}

export function moviePoster(kind) {
  const [c, g] = canvas(256, 360);
  const r = rand(kind.length * 4157 + kind.charCodeAt(2));
  const rect = (col, x, y, w, h) => { g.fillStyle = col; g.fillRect(x, y, w, h); };
  const crt = '#000000', paper = '#e8e1cc', amber = '#ffcc00', volt = '#e2231a', nacho = '#f28a1c'; // --crt-black --paper --amber --volt --nacho
  const ember = '#7a1a12', rock = '#6e6055', rockDk = '#3d352f', chrome = '#c9d5dd', chromeDk = '#5e6c76'; // --poster-ember --poster-rock --poster-rock-dark --poster-chrome --poster-chrome-dark
  const sky = '#7fb4dc', black = '#141414', space = '#0b1033', yellow = '#ffd400'; // --poster-sky --clothes-black --poster-space --volt-yellow
  const skin = '#e0b48f', snow = '#f4f8ff', snowShade = '#c3d0e4', eyeW = '#f4efe6'; // --skin --snow --snow-shade --eye-white

  if (kind === 'asteroid') { // DEEP CORE: a rock the size of a state, six miners walking toward camera
    [volt, nacho, amber, nacho, volt].forEach((col, i) => rect(col, 0, i * 40, 256, 40)); // dusk bands
    for (let i = 0; i < 40; i++) rect(paper, 4 * ((r() * 64) | 0), 4 * ((r() * 50) | 0), 4, 4); // stars through the haze
    disc(g, 128, 270, 132, rock);
    [[80, 190, 20], [168, 200, 28], [120, 150, 12], [208, 160, 12], [44, 220, 16]].forEach(([x, y, rr]) => { disc(g, x, y, rr, rockDk); disc(g, x - 4, y - 4, rr - 8, rock); });
    rect(black, 24, 108, 40, 12); rect(black, 36, 100, 12, 8); rect(volt, 56, 112, 4, 4); // shuttle, running lights
    for (let i = 0; i < 6; i++) { // the crew
      const x = 22 + i * 38, y = 268 + (i % 2) * 6;
      rect(black, x, y, 22, 16); rect(amber, x + 2, y - 8, 18, 10); rect(amber, x - 2, y, 26, 4); // hard hat
      rect(black, x + 2, y + 16, 18, 36); rect(black, x + 2, y + 52, 8, 24); rect(black, x + 12, y + 52, 8, 24);
    }
    bandText(g, ['DEEP CORE'], 128, 58, 232, paper, black, [40]);
    rect(black, 0, 336, 256, 24);
    bandText(g, ['11 DAYS · 1 ROCK · 6 MINERS'], 128, 354, 240, amber, null, [18]);
  } else if (kind === 'machine') { // CHROME SHIFT 2: a chrome android head, one red visor, firelit
    rect(space, 0, 0, 256, 360);
    for (let i = 0; i < 5; i++) rect(i % 2 ? black : space, 0, 120 + i * 48, 256, 48); // cold slats behind
    rect(chromeDk, 88, 108, 80, 128); rect(chrome, 88, 108, 40, 128); rect(chrome, 96, 100, 64, 8); rect(chromeDk, 96, 236, 64, 12); // head: lit left, shaded right
    rect(black, 96, 136, 64, 20); rect(volt, 100, 140, 56, 12); rect(paper, 124, 144, 8, 4); // visor, a hot centre
    rect(black, 112, 196, 32, 24); for (let x = 116; x < 144; x += 8) rect(chromeDk, x, 198, 4, 20); // grille
    rect(black, 76, 156, 12, 28); rect(black, 168, 156, 12, 28); // ear bolts
    rect(chromeDk, 108, 248, 40, 24); rect(black, 116, 252, 8, 20); rect(black, 132, 252, 8, 20); // neck cables
    [volt, nacho, amber, nacho, volt].forEach((col, i) => rect(col, 0, 296 + i * 8, 256, 8)); // fire along the bottom
    for (let x = 0; x < 256; x += 32) rect(black, x, 280 + ((r() * 3) | 0) * 8, 32, 16); // wreckage silhouettes
    bandText(g, ['CHROME', 'SHIFT 2'], 128, 52, 224, chrome, black, [96, 40]);
    rect(black, 0, 336, 256, 24);
    bandText(g, ['RESET DAY · COMING SOON'], 128, 354, 240, paper, null, [18]);
  } else { // BUS STOP BANDITS: three cut-out cartoon kids in the snow
    rect(sky, 0, 0, 256, 360); rect(snow, 0, 236, 256, 124);
    for (let i = 0; i < 8; i++) rect(snowShade, 8 + ((r() * 30) | 0) * 8, 248 + ((r() * 12) | 0) * 8, 16, 4); // footprints
    rect(chromeDk, 20, 136, 6, 104); rect(volt, 6, 120, 34, 22); rect(paper, 14, 126, 18, 4); // bus stop sign
    const kid = (cx, body, trim, hat, big) => { // cut-out kid: round head, tiny body, mitts
      const hr = big ? 28 : 24;
      rect(body, cx - 18, 196, 36, 44); for (let y = 200; y < 240; y += 12) rect(trim, cx - 18, y, 36, 4); // striped top
      rect(black, cx - 14, 240, 10, 12); rect(black, cx + 4, 240, 10, 12); // boots
      rect(trim, cx - 28, 204, 10, 14); rect(trim, cx + 18, 204, 10, 14); // mittens
      disc(g, cx, 164, hr, skin); rect(black, cx - hr, 156, 4, 12); // head
      rect(eyeW, cx - 14, 152, 12, 16); rect(eyeW, cx + 2, 152, 12, 16); rect(black, cx - 8, 160, 4, 4); rect(black, cx + 4, 160, 4, 4);
      rect(black, cx - 8, 180, 16, 4); // mouth
      hat(cx, hr);
    };
    kid(76, '#3aa35a', paper, (cx, hr) => { rect('#f28a1c', cx - hr + 2, 132, hr * 2 - 4, 16); rect('#f28a1c', cx - 4, 124, 8, 8); }, false); // green top, orange beanie with a pom (--shirt-4, --nacho)
    kid(128, '#2b6fd6', yellow, (cx, hr) => { rect(black, cx - hr + 2, 134, hr * 2 - 4, 12); rect(black, cx + 8, 146, 24, 6); }, true); // blue top, black cap (--shirt-2)
    kid(180, '#9b4dca', paper, (cx, hr) => { rect(volt, cx - hr, 144, hr * 2, 8); rect(volt, cx - hr - 8, 152, 8, 12); }, false); // purple top, red headband (--shirt-5)
    bandText(g, ['BUS STOP', 'BANDITS'], 128, 44, 232, yellow, black, [40]);
    bandText(g, ['THE MOVIE'], 128, 112, 224, paper, black, [26]);
    rect(black, 0, 320, 256, 40);
    bandText(g, ['RATED R FOR RUDE'], 128, 346, 240, amber, null, [24]);
  }
  return tex(c);
}

// Big boxes for the games the PCs can run (js/games.js), the way they stood on a shop shelf in 1998.
// The title is plain VT323 text, which is as far as STYLEGUIDE.md goes with real names: the pictures are
// invented, one generic scene per game, and not a copy of any real cover or logo. Flat, hard-edged,
// pixel-aligned; colours are tokens (hex in comments). To box a new game, add its id to BOXES.
function octagon(g, cx, cy, r, col) { // blocky octagon: a plus sign with the corners cut off
  const cut = Math.round(r * 0.4 / 4) * 4;
  g.fillStyle = col;
  g.fillRect(cx - r, cy - r + cut, r * 2, r * 2 - cut * 2);
  g.fillRect(cx - r + cut, cy - r, r * 2 - cut * 2, r * 2);
}

const BOXES = {
  doom: { spine: '#7a1a12', title: 'DOOM', tag: ['SHAREWARE · 4 PLAYER IPX', 'DEATHMATCH ON THE LAN'] }, // --poster-ember
  heretic: { spine: '#0b1033', title: 'HERETIC', tag: ['SHAREWARE · 4 PLAYER IPX', 'SWORD, SORCERY, SCROLL LOCK'] }, // --poster-space
  hexen: { spine: '#5b2f86', title: 'HEXEN', tag: ['4 LEVEL DEMO · IPX', 'THREE STONES, ONE BLADE'] }, // --poster-nebula
  quake: { spine: '#3d352f', title: 'QUAKE', tag: ['SHAREWARE · IPX LOBBY', 'FULL 3D · PENTIUM RECOMMENDED'] }, // --poster-rock-dark
  descent: { spine: '#46697a', title: 'DESCENT', tag: ['SHAREWARE · IPX LOBBY', 'SIX WAYS OUT OF THE MINE'] }, // --poster-steel
  duke: { spine: '#b4532a', title: 'DUKE NUKEM 3D', tag: ['SHAREWARE · IPX LOBBY', 'SHOOT FIRST, PARK LATER'] }, // --poster-planet
};

export const BOX_IDS = Object.keys(BOXES);

export function gameBoxFront(id) {
  const [c, g] = canvas(256, 360);
  const b = BOXES[id] ?? { spine: '#3d352f', title: String(id).toUpperCase(), tag: ['SHAREWARE'] };
  const r = rand(String(id).length * 2711 + String(id).charCodeAt(0));
  const rect = (col, x, y, w, h) => { g.fillStyle = col; g.fillRect(x, y, w, h); };
  const crt = '#000000', paper = '#e8e1cc', amber = '#ffcc00', volt = '#e2231a', nacho = '#f28a1c'; // --crt-black --paper --amber --volt --nacho
  const ember = '#7a1a12', steel = '#46697a', steelHi = '#8fb1c0', space = '#0b1033'; // --poster-ember --poster-steel --poster-steel-light --poster-space
  const nebula = '#5b2f86', planet = '#b4532a', chrome = '#c9d5dd', chromeDk = '#5e6c76'; // --poster-nebula --poster-planet --poster-chrome --poster-chrome-dark
  const rock = '#6e6055', rockDk = '#3d352f', phos = '#9dff7a', grey = '#aaaaaa', black = '#141414'; // --poster-rock --poster-rock-dark --phosphor --dos-grey --clothes-black
  const sprite = (rows, pal, ox, oy, px) => rows.forEach((row, y) => [...row].forEach((ch, x) => { if (ch !== '.') rect(pal[ch], ox + x * px, oy + y * px, px, px); }));

  if (id === 'doom') { // a blast door on a dark base, red light leaking through the gap, a crosshair
    rect(rockDk, 0, 0, 256, 360);
    for (let y = 96; y < 320; y += 16) for (let x = (y / 16) % 2 ? 0 : 16; x < 256; x += 32) rect(black, x, y, 16, 4); // wall plating seams
    rect(chromeDk, 40, 104, 176, 192); rect(steel, 56, 120, 144, 176);
    rect(steelHi, 56, 120, 144, 4); rect(steelHi, 56, 120, 4, 176);
    for (let x = 56; x < 200; x += 32) { rect(amber, x, 128, 16, 12); rect(black, x + 16, 128, 16, 12); } // hazard stripes
    rect(black, 120, 120, 16, 176); rect(volt, 124, 120, 8, 176); rect(amber, 127, 120, 2, 176); // the gap, lit from inside
    for (let y = 148; y < 290; y += 40) { rect(black, 64, y, 8, 8); rect(black, 184, y, 8, 8); } // bolts
    disc(g, 56, 100, 12, volt); disc(g, 200, 100, 12, volt); rect(paper, 52, 92, 4, 4); rect(paper, 196, 92, 4, 4); // warning lamps
    for (let i = 0; i < 6; i++) rect(i % 2 ? ember : volt, 40 + i * 8, 296 + i * 4, 176 - i * 16, 4); // light spilling on the floor
    rect(phos, 96, 206, 20, 4); rect(phos, 140, 206, 20, 4); rect(phos, 126, 180, 4, 20); rect(phos, 126, 216, 4, 20); // crosshair
    bandText(g, ['DOOM'], 128, 84, 232, amber, ember, [96]);
  } else if (id === 'heretic') { // a night graveyard, a raven on a gothic window
    rect(space, 0, 0, 256, 360);
    for (let i = 0; i < 50; i++) rect(r() > 0.8 ? amber : paper, 4 * ((r() * 64) | 0), 4 * ((r() * 44) | 0) + 60, 4, 4); // stars
    disc(g, 208, 100, 24, paper); disc(g, 216, 92, 22, space); // crescent moon
    rect(rockDk, 48, 190, 160, 130); disc(g, 128, 190, 80, rockDk); // window frame
    rect(nebula, 72, 190, 112, 130); disc(g, 128, 190, 56, nebula); // the opening
    [volt, amber, planet, ember].forEach((col, k) => { for (let y = 200 + (k % 2) * 16; y < 320; y += 32) for (let x = 80 + (k >> 1) * 16; x < 176; x += 32) rect(col, x, y, 12, 12); }); // stained glass panes
    rect(rockDk, 124, 136, 8, 184); rect(rockDk, 72, 248, 112, 8); // mullion and transom, over the glass
    sprite(['..11.........', '.1111........', '21111111.....', '..11111111...', '...1111111111', '...11111111..', '....111111...', '.....1.1.....'],
      { 1: black, 2: amber }, 78, 62, 6); // the raven, on its perch
    for (const x of [16, 224]) { rect(black, x, 280, 8, 40); rect(black, x - 8, 288, 24, 8); } // crosses
    bandText(g, ['HERETIC'], 128, 56, 232, paper, black, [40]);
  } else if (id === 'hexen') { // three standing stones at dusk, a sword in the turf
    rect(space, 0, 0, 256, 360);
    [nebula, nebula, ember, volt, planet, nacho].forEach((col, i) => rect(col, 0, 80 + i * 40, 256, 40)); // dusk bands
    for (let i = 0; i < 24; i++) rect(paper, 4 * ((r() * 64) | 0), 100 + 4 * ((r() * 20) | 0), 4, 4);
    rect(rockDk, 0, 288, 256, 72);
    const stone = (x, y, w, h) => { rect(rock, x, y, w, h); rect(rockDk, x + w - 12, y, 12, h); rect(chrome, x, y, 4, h); rect(rockDk, x, y - 8, w, 8); };
    stone(40, 140, 48, 164); stone(104, 108, 48, 196); stone(168, 140, 48, 164);
    const rune = (x, y, k) => { // three invented glyphs: a fork, a hook and a ladder
      if (k === 0) { rect(phos, x + 6, y, 4, 24); rect(phos, x, y, 4, 8); rect(phos, x + 12, y, 4, 8); rect(phos, x, y + 8, 16, 4); }
      else if (k === 1) { rect(phos, x, y, 4, 24); rect(phos, x + 4, y + 4, 8, 4); rect(phos, x + 12, y + 8, 4, 8); rect(phos, x + 4, y + 16, 8, 4); }
      else { rect(phos, x + 6, y, 4, 24); rect(phos, x, y + 4, 16, 4); rect(phos, x, y + 12, 16, 4); rect(phos, x, y + 20, 16, 4); }
    };
    rune(56, 168, 0); rune(120, 140, 1); rune(184, 168, 2); rune(56, 224, 1); rune(184, 224, 0);
    rect(amber, 124, 204, 8, 8); rect(black, 124, 212, 8, 16); rect(amber, 108, 228, 40, 8); // pommel, grip, crossguard
    rect(chrome, 122, 236, 12, 76); rect(chromeDk, 128, 236, 6, 76); rect(chrome, 124, 312, 8, 4); // blade
    for (let x = 100; x < 160; x += 8) rect(black, x, 312 + (x % 16 ? 0 : 4), 4, 4); // turf
    bandText(g, ['HEXEN'], 128, 84, 232, paper, black, [96]);
  } else if (id === 'quake') { // a brick hall, lightning into a glowing archway
    rect(rock, 0, 0, 256, 360);
    for (let y = 0; y < 320; y += 16) for (let x = (y / 16) % 2 ? -16 : 0; x < 256; x += 32) { rect(rockDk, x, y, 32, 4); rect(rockDk, x + 28, y, 4, 16); }
    rect(black, 72, 112, 112, 104); rect(black, 88, 96, 80, 16); rect(black, 104, 88, 48, 8); // the arch, stepped
    rect(steel, 84, 124, 88, 92); rect(steel, 96, 112, 64, 12); rect(steelHi, 100, 136, 56, 80); rect(paper, 116, 152, 24, 64); // portal glow
    sprite(['.....11111..', '....11111...', '...11111....', '..11111111..', '....111111..', '...11111....', '..1111......', '.111........', '.11.........'],
      { 1: crt }, 84, 12, 8); sprite(['.....11111..', '....11111...', '...11111....', '..11111111..', '....111111..', '...11111....', '..1111......', '.111........', '.11.........'],
      { 1: amber }, 80, 8, 8); // the bolt, with a hard shadow
    rect(rockDk, 56, 216, 144, 20); rect(rock, 56, 216, 144, 4); // threshold
    bandText(g, ['QUAKE'], 128, 310, 232, paper, black, [96]);
  } else if (id === 'descent') { // down a mine shaft: nested octagons, a sensor eye, a ship from behind
    rect(crt, 0, 0, 256, 360);
    [[120, ember], [100, black], [80, planet], [60, black], [40, nacho], [24, black], [12, amber]].forEach(([rr, col]) => octagon(g, 128, 190, rr, col));
    rect(volt, 120, 176, 16, 16); rect(paper, 124, 180, 4, 4); // a sensor, watching
    sprite(['....11....', '...1221...', '..122221..', '.11111111.', '1111111111', '3.33..33.3'], { 1: chrome, 2: chromeDk, 3: amber }, 88, 252, 8); // the ship
    rect(chromeDk, 120, 236, 16, 16); rect(chrome, 124, 228, 8, 12);
    bandText(g, ['DESCENT'], 128, 52, 232, amber, ember, [40]);
  } else if (id === 'duke') { // a city at dusk: skyline, a lit-up marquee, a searchlight, nobody in shot
    rect(space, 0, 0, 256, 360);
    [nebula, ember, volt, planet, nacho].forEach((col, i) => rect(col, 0, 40 + i * 36, 256, 36)); // dusk bands
    for (let i = 0; i < 20; i++) rect(paper, 4 * ((r() * 64) | 0), 44 + 4 * ((r() * 12) | 0), 4, 4); // first stars
    for (let i = 0; i < 6; i++) rect(amber, 128 + i * 12, 40 + i * 24, 8, 24); // a searchlight beam, stepped
    [[8, 150, 44], [56, 118, 40], [100, 170, 52], [156, 130, 44], [204, 160, 48]].forEach(([x, y, w]) => { // towers
      rect(black, x, y, w, 290 - y);
      for (let wy = y + 12; wy < 280; wy += 16) for (let wx = x + 8; wx < x + w - 8; wx += 12) if (r() > 0.45) rect(amber, wx, wy, 4, 8);
    });
    rect(rockDk, 0, 290, 256, 30); rect(chromeDk, 0, 290, 256, 4); // the street
    rect(black, 40, 214, 176, 68); rect(volt, 44, 218, 168, 60); // a cinema marquee, hard-edged
    for (let x = 44; x < 212; x += 12) { rect(amber, x, 218, 4, 4); rect(amber, x, 274, 4, 4); } // chaser bulbs
    rect(paper, 56, 230, 144, 28); rect(black, 60, 234, 136, 20); // the board
    bandText(g, ['NOW SHOWING'], 128, 246, 128, phos, null, [16]);
    bandText(g, ['DUKE NUKEM 3D'], 128, 52, 232, amber, ember, [40]);
  } else { // a game with no box art of its own yet
    rect(rockDk, 0, 0, 256, 360); rect(black, 16, 16, 224, 288);
    bandText(g, [b.title], 128, 180, 224, paper, null, [96, 40]);
  }
  rect(crt, 0, 320, 256, 40);
  b.tag.forEach((ln, i) => bandText(g, [ln], 128, 334 + i * 16, 240, i ? grey : phos, null, [18]));
  rect(volt, 0, 0, 256, 4); rect(volt, 0, 356, 256, 4); // the stripe every box had
  return tex(c);
}

export function gameBoxSpine(id) {
  const [c, g] = canvas(64, 360);
  const b = BOXES[id] ?? { spine: '#3d352f', title: String(id).toUpperCase() };
  g.fillStyle = b.spine; g.fillRect(0, 0, 64, 360);
  g.fillStyle = '#e2231a'; g.fillRect(0, 0, 64, 4); g.fillRect(0, 356, 64, 4); // --volt
  g.fillStyle = '#000000'; g.fillRect(0, 300, 64, 56); // --crt-black
  g.save(); g.translate(40, 150); g.rotate(Math.PI / 2);
  g.font = `40px ${CRT_FONT}`; g.textAlign = 'center';
  g.fillStyle = '#000000'; g.fillText(b.title, 2, 2); g.fillStyle = '#e8e1cc'; g.fillText(b.title, 0, 0); // --crt-black, --paper
  g.restore();
  g.font = `18px ${CRT_FONT}`; g.textAlign = 'center'; g.fillStyle = '#9dff7a'; g.fillText('PC CD-ROM', 32, 332); // --phosphor
  return tex(c);
}

export function gameBoxBack(id) {
  const [c, g] = canvas(256, 360);
  const b = BOXES[id] ?? { spine: '#3d352f', title: String(id).toUpperCase() };
  g.fillStyle = b.spine; g.fillRect(0, 0, 256, 360);
  g.fillStyle = '#000000'; g.fillRect(16, 16, 224, 328); // --crt-black
  g.textAlign = 'center';
  bandText(g, [b.title], 128, 60, 208, '#ffcc00', null, [40]); // --amber
  bandText(g, ['SYSTEM REQUIREMENTS'], 128, 100, 208, '#e8e1cc', null, [24]); // --paper
  ['486 DX2/66 OR BETTER', 'MS-DOS 6.0 OR WINDOWS 95', '8 MB RAM', 'VGA · SOUND BLASTER', 'IPX NETWORK FOR LAN PLAY'].forEach((ln, i) => bandText(g, [ln], 128, 140 + i * 24, 208, '#aaaaaa', null, [20])); // --dos-grey
  bandText(g, ['COPY FREELY · SEE README'], 128, 300, 208, '#9dff7a', null, [20]); // --phosphor
  g.fillStyle = '#e2231a'; g.fillRect(0, 0, 256, 4); g.fillRect(0, 356, 256, 4); // --volt
  return tex(c);
}

// An invented 1990s point-and-click adventure: a pixel treasure chest and a text parser.
export function pixelAdventure() {
  const [c, g] = canvas(256, 360);
  g.fillStyle = '#000080'; g.fillRect(0, 0, 256, 360); // --w98-title
  g.fillStyle = '#000'; g.fillRect(16, 16, 224, 200); // --crt-black
  const px = 8, ox = 56, oy = 72;
  const sprite = [ // 1 = lid, 2 = body, 3 = gold, 4 = outline
    '..444444444444..',
    '.41111111111114.',
    '4111111111111114',
    '4111111111111114',
    '4444444444444444',
    '4222223322322224',
    '4222223333322224',
    '4222222332222224',
    '4222222222222224',
    '4222222222222224',
    '.44444444444444.',
  ];
  const cols = { 1: '#4a2c17', 2: '#4a2c17', 3: '#ffcc00', 4: '#f28a1c' }; // --wood, --amber, --nacho
  sprite.forEach((row, y) => [...row].forEach((ch, x) => {
    if (ch === '.') return;
    g.fillStyle = cols[ch]; g.fillRect(ox + x * px, oy + y * px, px, px);
  }));
  g.fillStyle = '#24150b'; for (let x = 1; x < 15; x += 2) g.fillRect(ox + x * px, oy + px, px, px); // --wood-dark
  g.textAlign = 'center';
  g.font = `bold 40px Impact, "Arial Black", sans-serif`;
  g.fillStyle = '#ffcc00'; g.fillText('THE LOST', 128, 262);
  g.fillText('TREASURE', 128, 300);
  g.textAlign = 'left';
  g.font = `22px ${CRT_FONT}`; g.fillStyle = '#9dff7a'; // --phosphor
  g.fillText('> OPEN CHEST', 24, 44);
  g.fillStyle = '#aaaaaa'; g.fillText('It is locked.', 24, 66);
  g.fillStyle = '#9dff7a'; g.fillText('> _', 24, 200);
  g.textAlign = 'center'; g.fillStyle = '#e8e1cc'; g.font = `18px ${CRT_FONT}`; // --paper
  g.fillText('ON 3 FLOPPY DISKS · VGA', 128, 340);
  return tex(c);
}

export function nameTag(name, existing) {
  const [c, g] = existing ? [existing.image, existing.image.getContext('2d')] : canvas(256, 64);
  g.fillStyle = '#f5f0dc'; g.fillRect(0, 0, 256, 64);
  g.fillStyle = 'rgba(255,255,255,.5)'; g.fillRect(0, 0, 256, 10);
  g.font = 'bold 40px "Comic Sans MS", "Marker Felt", cursive'; g.fillStyle = '#1b2a8a';
  g.textAlign = 'center'; g.fillText(name, 128, 48, 240);
  if (existing) { existing.needsUpdate = true; return existing; }
  return tex(c);
}

/* ------------------------------------------------------------------ */
/* Animated CRT screens for the PCs you aren't sitting at.             */
/* ------------------------------------------------------------------ */

const W = 320, H = 240;
const SCRIPT = [
  'C:\\>cd \\GAMES\\NETFRAG',
  'C:\\GAMES\\NETFRAG>ipxsetup -nodes 4 -deathmatch',
  'IPX network setup',
  'Looking for a node...',
  'Found node [00:A0:24:3F:11:9C]',
  'Found node [00:60:08:B2:4E:07]',
  'Waiting for 1 more player...',
];

// a free PC nobody has touched for this long (seconds) starts its screen saver
export const SAVER_AFTER = 5 * 60;

// 7x7 pixel suits for the solitaire cards: drawn, so no font has to supply them
const SUITS = {
  H: ['.##.##.', '#######', '#######', '.#####.', '..###..', '...#...', '.......'],
  D: ['...#...', '..###..', '.#####.', '#######', '.#####.', '..###..', '...#...'],
  S: ['...#...', '..###..', '.#####.', '#######', '#######', '...#...', '..###..'],
  C: ['..###..', '..###..', '#######', '#######', '#.###.#', '...#...', '..###..'],
};
const CARD = { w: 34, h: 44 };
// the game on the solitaire PC, some way in: [face-down cards, face-up run] per column
const KLONDIKE = [
  [0, ['KD']],
  [1, ['9S', '8H']],
  [2, ['QC', 'JH', '10S', '9D', '8C']],
  [2, ['5D']],
  [3, ['7C', '6D']],
  [1, ['3H']],
  [4, ['JS']],
];
const colX = (i) => 13 + i * 43;
const TABLEAU_Y = 84, DOWN_STEP = 3, UP_STEP = 11;

let backSprite;
function cardBack() { // drawn once and shared
  if (!backSprite) {
    const [c, g] = canvas(CARD.w, CARD.h);
    g.fillStyle = '#0a0a0a'; g.fillRect(0, 0, CARD.w, CARD.h);               // --w98-dark
    g.fillStyle = '#ffffff'; g.fillRect(1, 1, CARD.w - 2, CARD.h - 2);       // --w98-light
    g.fillStyle = '#000080'; g.fillRect(3, 3, CARD.w - 6, CARD.h - 6);       // --w98-title
    g.fillStyle = '#1084d0';                                                  // --w98-title2: the lattice
    for (let y = 4; y < CARD.h - 5; y += 4) for (let x = 4 + ((y / 4) % 2) * 2; x < CARD.w - 5; x += 4) g.fillRect(x, y, 2, 2);
    backSprite = c;
  }
  return backSprite;
}

export class Screen {
  constructor(mode, seed = 1) {
    [this.canvas, this.g] = canvas(W, H);
    this.texture = tex(this.canvas);
    this.mode = mode;
    this.idle = mode;
    this.free = true;
    this.lastUsed = performance.now() / 1000; // the screen saver counts from here
    this.t0 = seed * 3.7;
    this.message = '';
    this.draw(0);
  }

  setMode(mode, message = '') { this.mode = mode; this.message = message; this.draw(performance.now() / 1000); }

  // free: the attract screen plus a sign saying so; taken: someone else's game
  setFree(free, who = '', what = '') {
    this.free = free; this.who = who; this.what = what;
    if (this.mode !== 'mine') this.mode = free ? this.idle : 'remote';
  }

  draw(time) {
    const g = this.g, t = time + this.t0;
    g.save();
    // somebody sitting here (you or another player) counts as use; the clock starts when they stand up
    if (!this.free || this.mode === 'mine') this.lastUsed = time;
    const asleep = this.free && this.mode === this.idle && time - this.lastUsed > SAVER_AFTER;
    // the burner PC shows its write progress while nobody is sitting at it
    this[this.crashed ? 'bsod' : this.burn && this.free ? 'burning' : this.rts && this.free ? this.rts : this.rebooting ? 'bios' : asleep ? 'saver' : this.mode]?.(g, t);
    if (this.linkDown) { // the Win98 tray balloon, big enough to read from across the room
      g.fillStyle = '#ffcc00'; g.fillRect(0, 0, W, 26);                      // --amber
      this.text(g, 'NETWORK CABLE DISCONNECTED', 8, 20, '#000000', 20);
    }
    if (this.free && this.mode === this.idle) {
      g.fillStyle = '#000080'; g.fillRect(0, H - 34, W, 34); // --w98-title
      this.text(g, `PC-${String(this.pcNumber ?? 0).padStart(2, '0')} FREE · Press E to sit`, 10, H - 11, '#ffffff', 20);
    }
    g.restore();
    this.texture.needsUpdate = true;
  }

  text(g, s, x, y, color = '#c0c0c0', size = 18) { g.font = `${size}px ${CRT_FONT}`; g.fillStyle = color; g.fillText(s, x, y); }

  dos(g, t) {
    g.fillStyle = '#000'; g.fillRect(0, 0, W, H);
    const cycle = (t * 3.2) % (SCRIPT.length + 6);
    const lines = Math.min(SCRIPT.length, Math.floor(cycle));
    for (let i = 0; i < lines; i++) this.text(g, SCRIPT[i], 8, 20 + i * 17);
    if (Math.floor(t * 2) % 2) this.text(g, '_', 8, 20 + lines * 17);
  }

  win98(g, t) {
    g.fillStyle = '#008080'; g.fillRect(0, 0, W, H);
    const icons = ['My Computer', 'Network', 'Recycle Bin', 'NETFRAG'];
    icons.forEach((n, i) => {
      g.fillStyle = i === 3 ? '#a33' : '#ddd'; g.fillRect(16, 12 + i * 46, 22, 20);
      g.font = '10px Tahoma, sans-serif'; g.fillStyle = '#fff'; g.fillText(n, 4, 44 + i * 46);
    });
    g.fillStyle = '#c0c0c0'; g.fillRect(0, H - 22, W, 22);
    g.fillStyle = '#fff'; g.fillRect(0, H - 22, W, 1);
    g.fillStyle = '#c0c0c0'; g.fillRect(3, H - 19, 48, 16);
    g.font = 'bold 11px Tahoma, sans-serif'; g.fillStyle = '#000'; g.fillText('Start', 12, H - 7);
    g.font = '11px Tahoma, sans-serif'; g.fillText(this.clock || '11:42 PM', W - 52, H - 7);
    if (this.share) { // somebody got file sharing working on this one
      g.fillStyle = '#ffcc00'; g.fillRect(16, 12 + 4 * 46, 22, 20);
      g.font = '10px Tahoma, sans-serif'; g.fillStyle = '#fff'; g.fillText('WAREZ (shared)', 4, 44 + 4 * 46);
    }
    // a dialog that never stops appearing, until somebody fixes it
    if (!this.share && (t % 8) > 3) {
      g.fillStyle = '#c0c0c0'; g.fillRect(70, 80, 190, 70);
      g.fillStyle = '#000080'; g.fillRect(72, 82, 186, 14);
      g.font = 'bold 10px Tahoma, sans-serif'; g.fillStyle = '#fff'; g.fillText('Network Neighborhood', 76, 93);
      g.font = '10px Tahoma, sans-serif'; g.fillStyle = '#000'; g.fillText('Unable to browse network.', 82, 116); g.fillText('Is IPX/SPX installed?', 82, 130);
    }
  }

  // the Win98 taskbar along the bottom of a desktop screen, with one pressed button for the open window
  taskbar(g, label) {
    g.fillStyle = '#c0c0c0'; g.fillRect(0, H - 22, W, 22);                       // --w98-face
    g.fillStyle = '#ffffff'; g.fillRect(0, H - 22, W, 1);                        // --w98-light
    g.fillStyle = '#c0c0c0'; g.fillRect(3, H - 19, 48, 16);
    g.font = 'bold 11px Tahoma, sans-serif'; g.fillStyle = '#000000'; g.fillText('Start', 12, H - 7);
    g.fillStyle = '#dfdfdf'; g.fillRect(56, H - 19, 130, 16);                    // --w98-hilite: pressed
    g.fillStyle = '#808080'; g.fillRect(56, H - 19, 130, 1); g.fillRect(56, H - 19, 1, 16); // --w98-shadow
    g.fillStyle = '#ffffff'; g.fillRect(56, H - 4, 130, 1); g.fillRect(185, H - 19, 1, 16);
    g.font = 'bold 10px Tahoma, sans-serif'; g.fillStyle = '#000000'; g.fillText(label, 62, H - 8, 118);
    g.font = '11px Tahoma, sans-serif'; g.fillText(this.clock || '11:42 PM', W - 52, H - 7);
  }

  // a raised or sunken Win98 face from x,y: white and grey edges, nothing blurred. Sunken ones are white fields.
  bevel(g, x, y, w, h, sunken = false) {
    const [outerTL, outerBR, innerTL, innerBR] = sunken
      ? ['#808080', '#ffffff', '#0a0a0a', '#dfdfdf']                              // --w98-shadow, light, dark, hilite
      : ['#ffffff', '#0a0a0a', '#dfdfdf', '#808080'];                             // --w98-light, dark, hilite, shadow
    g.fillStyle = outerBR; g.fillRect(x, y, w, h);
    g.fillStyle = outerTL; g.fillRect(x, y, w - 1, h - 1);
    g.fillStyle = innerBR; g.fillRect(x + 1, y + 1, w - 2, h - 2);
    g.fillStyle = innerTL; g.fillRect(x + 1, y + 1, w - 3, h - 3);
    g.fillStyle = sunken ? '#ffffff' : '#c0c0c0'; g.fillRect(x + 2, y + 2, w - 4, h - 4); // --w98-light field, --w98-face
  }

  // Disk Defragmenter's progress window: the bar, the percentage and the block map, sweeping the whole disk and starting again
  defrag(g, t) {
    g.fillStyle = '#008080'; g.fillRect(0, 0, W, H);                              // --w98-desktop
    const COLS = 44, ROWS = 9, N = COLS * ROWS;
    this.dfUsed ??= (() => { const r = rand(41 + Math.floor(this.t0)); return Array.from({ length: N }, () => r() > 0.42); })();
    const p = (t * 0.0035) % 1, pct = Math.floor(p * 100), cur = Math.floor(p * N);

    this.bevel(g, 14, 14, 292, 178);
    g.fillStyle = '#000080'; g.fillRect(17, 17, 286, 14);                         // --w98-title
    g.font = 'bold 10px Tahoma, sans-serif'; g.fillStyle = '#ffffff'; g.fillText('Defragmenting Drive C', 22, 28);
    g.fillStyle = '#c0c0c0'; g.fillRect(288, 19, 12, 10);                         // the close box, nothing on it
    g.font = '11px Tahoma, sans-serif'; g.fillStyle = '#000000'; g.fillText('Moving files to the front of the disk.', 24, 48);

    this.bevel(g, 24, 54, 272, 16, true);
    g.fillStyle = '#000080';
    for (let x = 27; x < 27 + 266 * p; x += 10) g.fillRect(x, 57, 8, 10);         // the blue progress blocks
    g.font = '11px Tahoma, sans-serif'; g.fillStyle = '#000000'; g.textAlign = 'center';
    g.fillText(`${pct}% Complete`, W / 2, 88);
    g.textAlign = 'left';
    [['Stop', 52], ['Pause', 118], ['Hide Details', 184]].forEach(([label, x]) => {
      this.bevel(g, x, 96, label === 'Hide Details' ? 84 : 60, 18);
      g.font = '11px Tahoma, sans-serif'; g.fillStyle = '#000000'; g.textAlign = 'center';
      g.fillText(label, x + (label === 'Hide Details' ? 42 : 30), 109);
      g.textAlign = 'left';
    });

    this.bevel(g, 24, 122, 272, 62, true);
    const flick = Math.floor(t * 9);
    for (let k = 0; k < N; k++) {
      let c;
      if (k < cur) c = '#000080';                                                 // --w98-title: already in place
      else if (k < cur + 3) c = (flick + k) % 3 === 0 ? '#e2231a' : '#1fbf3a';    // --volt reading, --link-led writing
      else c = this.dfUsed[k] ? '#1084d0' : '#ffffff';                            // --w98-title2: still fragmented; --w98-light: free
      g.fillStyle = c;
      g.fillRect(27 + (k % COLS) * 6, 125 + Math.floor(k / COLS) * 6, 5, 5);
    }
    this.taskbar(g, 'Defragmenting Drive C');
  }

  // everything about the solitaire window that never moves, drawn once and kept
  solitaireStatic() {
    const [c, g] = canvas(W, H);
    g.fillStyle = '#008080'; g.fillRect(0, 0, W, H);                              // --w98-desktop
    this.bevel(g, 2, 2, 316, 202);
    g.fillStyle = '#000080'; g.fillRect(5, 5, 310, 14);                           // --w98-title
    g.font = 'bold 10px Tahoma, sans-serif'; g.fillStyle = '#ffffff'; g.fillText('Solitaire', 22, 16);
    g.fillStyle = '#ffffff'; g.fillRect(8, 7, 8, 10);                             // the little card in the title bar
    g.fillStyle = '#c4161c'; g.fillRect(10, 9, 3, 3);                             // --card-red
    for (const x of [270, 284, 298]) { g.fillStyle = '#c0c0c0'; g.fillRect(x, 7, 12, 10); }
    g.font = '10px Tahoma, sans-serif'; g.fillStyle = '#000000';
    g.fillText('Game', 8, 29); g.fillText('Help', 42, 29);
    g.fillStyle = '#008000'; g.fillRect(5, 32, 310, 156);                         // --felt
    this.bevel(g, 5, 189, 310, 13, true);
    g.fillStyle = '#c0c0c0'; g.fillRect(7, 191, 306, 9);

    const slot = (x, y) => { g.strokeStyle = '#005000'; g.lineWidth = 1; g.strokeRect(x + 0.5, y + 0.5, CARD.w - 1, CARD.h - 1); }; // --mine-2: a darker felt
    const top = 36;
    g.drawImage(cardBack(), colX(0), top);                                        // the stock
    this.card(g, colX(1), top, '9', 'C');                                         // under the waste pile's top card
    [['2', 'H'], ['A', 'S'], ['A', 'D'], null].forEach((f, i) => (f ? this.card(g, colX(3 + i), top, f[0], f[1]) : slot(colX(3 + i), top)));
    this.solTops = KLONDIKE.map(([down, up], i) => {
      let y = TABLEAU_Y;
      for (let k = 0; k < down; k++) { g.drawImage(cardBack(), colX(i), y); y += DOWN_STEP; }
      up.forEach((r, k) => { this.card(g, colX(i), y, r.slice(0, -1), r.slice(-1), k === up.length - 1); y += UP_STEP; });
      return y; // where a card dropped on this column would sit
    });
    return c;
  }

  suit(g, s, x, y, px = 1) {
    g.fillStyle = s === 'H' || s === 'D' ? '#c4161c' : '#000000';                // --card-red, --w98-text
    SUITS[s].forEach((row, j) => { for (let i = 0; i < 7; i++) if (row[i] === '#') g.fillRect(x + i * px, y + j * px, px, px); });
  }

  // one card face; `full` also draws the big suit in the middle (a covered card shows only its corner)
  card(g, x, y, rank, s, full = true) {
    g.fillStyle = '#0a0a0a'; g.fillRect(x, y, CARD.w, CARD.h);                   // --w98-dark
    g.fillStyle = '#ffffff'; g.fillRect(x + 1, y + 1, CARD.w - 2, CARD.h - 2);    // --w98-light
    g.font = 'bold 10px Tahoma, sans-serif';
    g.fillStyle = s === 'H' || s === 'D' ? '#c4161c' : '#000000';
    g.fillText(rank, x + 3, y + 10);
    this.suit(g, s, x + (rank.length > 1 ? 16 : 12), y + 3);
    if (full) this.suit(g, s, x + 10, y + 22, 2);
  }

  // Solitaire in a window on the Win98 desktop. A card gets picked up from the waste pile, dragged over a column,
  // isn't allowed there and slides back; the clock in the status bar runs.
  solitaire(g, t) {
    this.solStatic ??= this.solitaireStatic();
    g.drawImage(this.solStatic, 0, 0);
    g.font = '10px Tahoma, sans-serif'; g.fillStyle = '#000000';
    g.fillText('Score: 285', 10, 198);
    g.textAlign = 'right'; g.fillText(`Time: ${Math.floor(t) % 1000}`, 312, 198); g.textAlign = 'left';

    const CYCLE = 7, u = t % CYCLE, n = Math.floor(t / CYCLE);
    const col = 2 + (n % 4);
    const fx = colX(1), fy = 36, tx = colX(col), ty = this.solTops[col];
    const ease = (k) => (k < 0.5 ? 2 * k * k : 1 - 2 * (1 - k) * (1 - k));
    const k = u < 2 ? 0 : u < 3.2 ? ease((u - 2) / 1.2) : u < 4.4 ? 1 : u < 5.6 ? 1 - ease((u - 4.4) / 1.2) : 0;
    const x = fx + (tx - fx) * k, y = fy + (ty - fy) * k;
    this.card(g, x, y, '4', 'S');
    if (u > 1.5 && u < 6) { // the pointer, holding the card
      const px = x + 20, py = y + 26;
      g.beginPath();
      [[0, 0], [0, 12], [3, 9], [5, 13], [7, 12], [5, 8], [9, 8]].forEach(([a, b], i) => (i ? g.lineTo(px + a, py + b) : g.moveTo(px + a, py + b)));
      g.closePath();
      g.fillStyle = '#ffffff'; g.fill();                                          // --w98-light
      g.strokeStyle = '#000000'; g.lineWidth = 1; g.stroke();
    }
    this.taskbar(g, 'Solitaire');
  }

  // the starfield: what a free PC does once nobody has touched it for SAVER_AFTER seconds
  saver(g, t) {
    g.fillStyle = '#000000'; g.fillRect(0, 0, W, H);
    this.saverStars ??= (() => { const r = rand(97 + Math.floor(this.t0)); return Array.from({ length: 160 }, () => [r() - 0.5, r() - 0.5, r()]); })();
    for (const s of this.saverStars) {
      const z = 1 - ((s[2] + t * 0.1) % 1);                                       // 1 far away, 0 flying past
      const x = W / 2 + (s[0] / z) * 70, y = H / 2 + (s[1] / z) * 70;
      if (x < 0 || x > W || y < 0 || y > H) continue;
      const size = z < 0.25 ? 3 : z < 0.55 ? 2 : 1;
      g.fillStyle = z < 0.25 ? '#ffffff' : z < 0.55 ? '#dfdfdf' : '#808080';      // --w98-light, --w98-hilite, --w98-shadow
      g.fillRect(Math.round(x), Math.round(y), size, size);
    }
  }

  bios(g, t) {
    g.fillStyle = '#000'; g.fillRect(0, 0, W, H);
    this.text(g, 'Award Modular BIOS v4.51PG', 8, 20);
    this.text(g, `Pentium II-MMX CPU at ${[300, 450, 504][this.oc | 0]}MHz`, 8, 46);
    const total = (this.ram || 16) * 1024;
    const mem = Math.min(total, Math.floor((t % 9) * (total / 4)));
    this.text(g, `Memory Test : ${mem}K ${mem >= total ? 'OK' : ''}`, 8, 64);
    if (t % 9 > 5) this.text(g, 'Starting Windows 98...', 8, 110);
    this.text(g, 'Press DEL to enter SETUP', 8, H - 12);
  }

  waiting(g, t) {
    g.fillStyle = '#000'; g.fillRect(0, 0, W, H);
    g.fillStyle = '#5a0000'; g.fillRect(0, 0, W, 30);
    this.text(g, 'NETFRAG  ·  IPX NETWORK GAME', 10, 22, '#ffcc00', 20);
    this.text(g, 'Players found: 3 of 4', 10, 70, '#c0c0c0', 22);
    const dots = '.'.repeat(1 + Math.floor(t * 2) % 3);
    this.text(g, 'Waiting' + dots, 10, 100, '#9dff7a', 22);
    this.text(g, 'Press ESC to abort', 10, H - 14, '#777', 16);
  }

  remote(g, t) { // somebody else's game, seen over their shoulder
    g.fillStyle = '#000000'; g.fillRect(0, 0, W, H);
    // a suggestion of a 90s shooter: grey walls, a brown floor, the status bar (token colours only)
    g.fillStyle = '#808080'; g.fillRect(0, 0, W, 90);       // --w98-shadow
    g.fillStyle = '#4a2c17'; g.fillRect(0, 90, W, 100);     // --wood
    const sway = Math.sin(t * 1.7) * 30;
    g.fillStyle = '#aaaaaa'; g.fillRect(40 + sway, 30, 60, 120); g.fillRect(220 + sway, 40, 50, 110); // --dos-grey
    if (Math.floor(t * 3) % 4 === 0) { g.fillStyle = '#ffcc00'; g.fillRect(150, 130, 20, 14); } // --amber muzzle flash
    g.fillStyle = '#24150b'; g.fillRect(0, 190, W, 50);     // --wood-dark
    this.text(g, this.who || 'SOMEONE', 10, 214, '#ffcc00', 22);
    this.text(g, this.what || 'FRAGGING', 10, 234, '#aaaaaa', 18);
  }

  burning(g, t) {
    const b = this.burn; // { pct, secondsLeft }
    g.fillStyle = '#000000'; g.fillRect(0, 0, W, H);
    g.fillStyle = '#5a0000'; g.fillRect(0, 0, W, 30);
    this.text(g, 'CDWRITE  ·  CD-R 2x', 10, 22, '#ffcc00', 20);
    this.text(g, 'Writing disc...', 10, 62, '#c0c0c0', 22);
    g.strokeStyle = '#aaaaaa'; g.lineWidth = 2; g.strokeRect(10, 78, W - 20, 22);
    g.fillStyle = '#9dff7a'; g.fillRect(13, 81, Math.max(0, (W - 26) * b.pct), 16);
    this.text(g, `${Math.floor(b.pct * 100)}%  ·  ${Math.floor(b.secondsLeft / 60)}:${String(Math.floor(b.secondsLeft % 60)).padStart(2, '0')} left`, 10, 128, '#9dff7a', 22);
    if (Math.floor(t * 1.5) % 2) this.text(g, 'DO NOT USE THIS PC WHILE WRITING', 10, 170, '#ffcc00', 20);
    this.text(g, 'Buffer: OK', 10, H - 14, '#777777', 16);
  }

  // After midnight a free PC is somebody's StarCraft game, if it has the memory for it. Flat and generic on
  // purpose: a game being played, not the game's artwork.
  starcraft(g, t) {
    g.fillStyle = '#000000'; g.fillRect(0, 0, W, H);
    g.fillStyle = '#24150b'; g.fillRect(0, 0, W, 190);                         // --wood-dark: the map
    g.fillStyle = '#4a2c17';                                                    // --wood: high ground
    for (let i = 0; i < 9; i++) g.fillRect((i * 83) % W, 20 + ((i * 47) % 130), 56, 24);
    g.fillStyle = '#20b2aa';                                                    // --shirt-7: mineral field
    for (let i = 0; i < 5; i++) g.fillRect(36 + i * 9, 44 + (i % 2) * 7, 6, 6);
    g.fillStyle = '#e8e1cc'; g.fillRect(24, 70, 30, 22);                        // --paper: a base
    g.fillStyle = '#f28a1c'; g.fillRect(250, 120, 30, 22);                      // --nacho: the other base
    for (let i = 0; i < 7; i++) { // units walking between them
      const k = (t * 0.12 + i * 0.13) % 1;
      g.fillStyle = i % 3 ? '#9dff7a' : '#e2231a';                              // --phosphor, --volt
      g.fillRect(60 + k * 190 + Math.sin(t + i) * 4, 92 + k * 30 + Math.cos(t * 1.3 + i) * 6, 5, 5);
    }
    g.fillStyle = '#808080'; g.fillRect(0, 190, W, 50);                         // --w98-shadow: the command panel
    g.fillStyle = '#000000'; g.fillRect(6, 196, 54, 38);
    this.text(g, 'MINERALS 450   GAS 120   SUPPLY 12/18', 70, 214, '#ffcc00', 18);
    this.text(g, 'STARCRAFT  ·  MIDNITE', 70, 232, '#ffffff', 18);
  }

  // not enough memory to join: a DOS error, as it would have been
  nomem(g, t) {
    g.fillStyle = '#000000'; g.fillRect(0, 0, W, H);
    this.text(g, 'C:\\>cd \\STARCRFT', 8, 20);
    this.text(g, 'C:\\STARCRFT>STARCRFT.EXE', 8, 38);
    this.text(g, 'Not enough memory.', 8, 66, '#ffcc00', 20);
    this.text(g, `StarCraft needs 32MB.`, 8, 86);
    this.text(g, `This PC has ${this.ram || 16}MB.`, 8, 104);
    this.text(g, 'C:\\STARCRFT>', 8, 134);
    if (Math.floor(t * 2) % 2) this.text(g, '_', 118, 134);
  }

  bsod(g, t) {
    g.fillStyle = '#0000aa'; g.fillRect(0, 0, W, H);                       // --bsod
    g.fillStyle = '#c0c0c0'; g.fillRect(W / 2 - 34, 22, 68, 18);           // --w98-face
    this.text(g, 'Windows', W / 2 - 28, 37, '#0000aa', 18);
    const lines = ['A fatal exception 0E has', 'occurred at 0028:C0011E36 in', 'VXD VMM(01) + 00010E36. The', 'current application will be', 'terminated.', '', '*  Press any key to terminate', '   the current application.', '*  Press CTRL+ALT+DEL again to', '   restart your computer.'];
    lines.forEach((ln, i) => this.text(g, ln, 12, 66 + i * 15, '#ffffff', 16));
    if (Math.floor(t * 2) % 2) this.text(g, 'Press any key to continue _', 12, H - 14, '#ffffff', 16);
  }

  mine(g, t) { // your PC while you're standing
    g.fillStyle = '#000'; g.fillRect(0, 0, W, H);
    this.text(g, 'C:\\>cd \\DOOM', 8, 22);
    this.text(g, 'C:\\DOOM>', 8, 40);
    if (Math.floor(t * 2) % 2) this.text(g, '_', 70, 40);
    g.fillStyle = '#5a0000'; g.fillRect(0, H - 52, W, 52);
    this.text(g, this.message || 'PC-01 · YOURS', 10, H - 30, '#ffcc00', 22);
    this.text(g, 'Walk up and press E to sit down', 10, H - 10, '#e0e0e0', 16);
  }
}

/* ------------------------------------------------------------------ */
/* The lounge corner: couch cloth and the big TV's game.               */
/* ------------------------------------------------------------------ */

// Faded sage plaid with a rust stripe, a bit worn. Colours: --couch, --couch-dark, --couch-line.
export function couchFabric() {
  const [c, g] = canvas(128, 128);
  g.fillStyle = '#5b7050'; g.fillRect(0, 0, 128, 128);
  g.fillStyle = '#3f4f38';
  for (const p of [16, 80]) { g.fillRect(p, 0, 16, 128); g.fillRect(0, p, 128, 16); }
  g.fillStyle = '#a3483b';
  for (const p of [47, 111]) { g.fillRect(p, 0, 3, 128); g.fillRect(0, p, 128, 3); }
  const r = rand(98);
  g.fillStyle = 'rgba(0,0,0,.08)';
  for (let i = 0; i < 260; i++) g.fillRect(Math.floor(r() * 128), Math.floor(r() * 128), 1, 2); // weave
  return tex(c, [1, 1]);
}

// What the four of them are playing on the TV: a four-player arena brawl, drawn flat.
// Parody and generic on purpose: no real game, character or console. Colours are the four
// pad colours (--floppy-red, --floppy-blue, --floppy-yellow, --floppy-green) on --nacho-navy.
const BRAWL = { w: 256, h: 192 };
export class ConsoleScreen {
  constructor() {
    const [c, g] = canvas(BRAWL.w, BRAWL.h);
    this.g = g;
    this.texture = tex(c);
    this.clock = 0; this.last = -1;
    this.draw(0);
  }
  draw(t) {
    const g = this.g, { w, h } = BRAWL;
    g.fillStyle = '#1d1a5c'; g.fillRect(0, 0, w, h);
    g.fillStyle = 'rgba(255,255,255,.06)';
    for (let y = 24; y < h; y += 24) for (let x = ((y / 24) % 2) * 24; x < w; x += 48) g.fillRect(x, y, 24, 24); // floor tiles
    g.fillStyle = '#0a0a0a'; g.fillRect(0, 0, w, 20);
    const P = ['#c0392b', '#2b6fd6', '#e8c21b', '#3aa35a'];
    const score = [3, 1, 2, Math.floor(t / 9) % 4];
    g.font = `18px ${CRT_FONT}`; g.textBaseline = 'middle';
    P.forEach((col, i) => { g.fillStyle = col; g.fillRect(6 + i * 62, 6, 8, 8); g.fillStyle = '#e8e1cc'; g.fillText(`P${i + 1} 0${score[i]}`, 18 + i * 62, 11, 40); });
    // four fighters running laps round the arena, each at their own speed
    P.forEach((col, i) => {
      const a = t * (0.8 + i * 0.27) + i * 1.6;
      const x = w / 2 + Math.cos(a) * (60 + i * 14) - 9, y = 110 + Math.sin(a * 1.3) * (38 + i * 5) - 9;
      g.fillStyle = 'rgba(0,0,0,.45)'; g.fillRect(x + 2, y + 16, 16, 4);
      g.fillStyle = col; g.fillRect(x, y - (Math.sin(a * 6) > 0.6 ? 4 : 0), 18, 18);
      g.fillStyle = '#e8e1cc'; g.fillRect(x + 3, y + 5, 4, 5); g.fillRect(x + 11, y + 5, 4, 5);
    });
    g.fillStyle = '#ffcc00'; g.textAlign = 'center'; g.font = `26px ${CRT_FONT}`;
    g.fillText(`ROUND ${1 + Math.floor(t / 30) % 9}`, w / 2, 36);
    if (Math.floor(t * 2) % 2) g.fillText('LAST ONE STANDING', w / 2, h - 14);
    g.textAlign = 'left';
    g.fillStyle = 'rgba(0,0,0,.22)';
    for (let y = 0; y < h; y += 2) g.fillRect(0, y, w, 1); // scanlines
    this.texture.needsUpdate = true;
  }
  update(dt) { this.clock += dt; if (this.clock - this.last > 0.12) { this.last = this.clock; this.draw(this.clock); } }
}
