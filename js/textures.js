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

export class Screen {
  constructor(mode, seed = 1) {
    [this.canvas, this.g] = canvas(W, H);
    this.texture = tex(this.canvas);
    this.mode = mode;
    this.idle = mode;
    this.free = true;
    this.t0 = seed * 3.7;
    this.stars = Array.from({ length: 90 }, (_, i) => { const r = rand(seed * 100 + i); return [r() - 0.5, r() - 0.5, r()]; });
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
    // the burner PC shows its write progress while nobody is sitting at it
    this[this.burn && this.free ? 'burning' : this.mode]?.(g, t);
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
    g.font = '11px Tahoma, sans-serif'; g.fillText('11:42 PM', W - 52, H - 7);
    // a dialog that never stops appearing
    if ((t % 8) > 3) {
      g.fillStyle = '#c0c0c0'; g.fillRect(70, 80, 190, 70);
      g.fillStyle = '#000080'; g.fillRect(72, 82, 186, 14);
      g.font = 'bold 10px Tahoma, sans-serif'; g.fillStyle = '#fff'; g.fillText('Network Neighborhood', 76, 93);
      g.font = '10px Tahoma, sans-serif'; g.fillStyle = '#000'; g.fillText('Unable to browse network.', 82, 116); g.fillText('Is IPX/SPX installed?', 82, 130);
    }
  }

  stars3d(g, t) {
    g.fillStyle = 'rgba(0,0,0,.35)'; g.fillRect(0, 0, W, H);
    for (const s of this.stars) {
      const z = 1 - ((s[2] + t * 0.25) % 1);
      const x = W / 2 + (s[0] / z) * 140, y = H / 2 + (s[1] / z) * 140;
      const sz = (1 - z) * 3;
      g.fillStyle = '#fff'; g.fillRect(x, y, sz, sz);
    }
  }

  bios(g, t) {
    g.fillStyle = '#000'; g.fillRect(0, 0, W, H);
    this.text(g, 'Award Modular BIOS v4.51PG', 8, 20);
    this.text(g, 'Pentium II-MMX CPU at 300MHz', 8, 46);
    const mem = Math.min(65536, Math.floor((t % 9) * 16000));
    this.text(g, `Memory Test : ${mem}K ${mem >= 65536 ? 'OK' : ''}`, 8, 64);
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
