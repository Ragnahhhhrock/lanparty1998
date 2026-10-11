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
    // a suggestion of DOOM: grey walls, a brown floor, the status bar (token colours only)
    g.fillStyle = '#808080'; g.fillRect(0, 0, W, 90);       // --w98-shadow
    g.fillStyle = '#4a2c17'; g.fillRect(0, 90, W, 100);     // --wood
    const sway = Math.sin(t * 1.7) * 30;
    g.fillStyle = '#aaaaaa'; g.fillRect(40 + sway, 30, 60, 120); g.fillRect(220 + sway, 40, 50, 110); // --dos-grey
    if (Math.floor(t * 3) % 4 === 0) { g.fillStyle = '#ffcc00'; g.fillRect(150, 130, 20, 14); } // --amber muzzle flash
    g.fillStyle = '#24150b'; g.fillRect(0, 190, W, 50);     // --wood-dark
    this.text(g, this.who || 'SOMEONE', 10, 214, '#ffcc00', 22);
    this.text(g, this.what || 'PLAYING DOOM', 10, 234, '#aaaaaa', 18);
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
