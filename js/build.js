// BUILDPC.EXE's parts shelf: every part you can put in your PC, what it costs, and what it does once it is
// plugged in. No DOM and no three.js, so tools/build.test.mjs can check it in plain node.
//
// Prices are 1998 US dollars at the computer shop, and RAM is priced the way the shop's price list in the room
// has it ($75 for 16MB). Names are plain descriptions of the part ("17-inch SVGA monitor", "32MB 168-pin DIMM"),
// never a real maker's brand. CPUs carry the family and speed they were sold as, because that is how the
// BIOS screen reads them out (the same labels the overclocking dialog already uses).
//
// A build is a plain object of part ids, so it survives localStorage and can be checked with `validate`:
//   { crt, cpu, ram, hdd: [id, id|null, id|null], floppy: 0-2, cdrom: id|null, cdr: id|null, nic, audio, keyboard, mouse, mat }

export const BUDGET = 1500;             // what is in the account before the first part goes in the basket
export const IDE_DEVICES = 4;           // two IDE channels, a master and a slave on each: hard disks and CD drives share them
export const MAX_HDD = 3;
export const MAX_FLOPPY = 2;
export const FLOPPY_PRICE = 20;         // a 3.5" 1.44MB drive

const by = (list) => Object.fromEntries(list.map((p) => [p.id, p]));

/* ---------------------------------------------------------------- monitors */

// glass: the picture tube's visible area in metres [w, h] (4:3). fx: how the picture looks on your CRT in the
// seated view (js/main.js sets it on #monitor): blur in px, brightness, and whether a 60Hz tube visibly flickers.
export const CRT = [
  { id: 'crt14', inches: 14, name: '14-inch SVGA monitor', price: 120, viewable: 13.0, glass: [0.264, 0.198], dot: 0.28, modes: '800x600 at 56Hz, 640x480 at 72Hz',
    note: 'Small, soft and a bit flickery. It fits anywhere, which is the best you can say for it.', fx: { blur: 0.7, bright: 0.9, flicker: true } },
  { id: 'crt15', inches: 15, name: '15-inch SVGA monitor', price: 170, viewable: 13.8, glass: [0.284, 0.213], dot: 0.28, modes: '1024x768 at 60Hz, 800x600 at 75Hz',
    note: 'What most people had. Fine for DOOM, a little tired by the end of the night.', fx: { blur: 0.4, bright: 0.95, flicker: true } },
  { id: 'crt17', inches: 17, name: '17-inch SVGA monitor', price: 330, viewable: 15.7, glass: [0.32, 0.24], dot: 0.26, modes: '1024x768 at 85Hz, 1280x1024 at 60Hz',
    note: 'The sensible one. It is the same size as the club PCs.', fx: { blur: 0, bright: 1, flicker: false } },
  { id: 'crt19', inches: 19, name: '19-inch flat-faced monitor', price: 620, viewable: 17.8, glass: [0.362, 0.272], dot: 0.25, modes: '1280x1024 at 85Hz, 1600x1200 at 75Hz',
    note: 'Enormous, sharp and heavier than the table. Everybody will come and look at your screen.', fx: { blur: 0, bright: 1.08, flicker: false } },
];

/* ---------------------------------------------------------------- processors */

// bus and mult: the stock front side bus (MHz) and the multiplier, which is locked, so the clock is bus x mult.
// ocBus: the two bus speeds the jumpers offer for overclocking (the second one with the voltage bumped).
// warm: how much hotter than the club's Pentium II 300 it runs at stock, in js/party.js heat units per second.
export const CPU = [
  { id: 'p233', name: 'Pentium MMX 233', family: 'Socket 7', mhz: 233, bus: 66, mult: 3.5, ocBus: [75, 83], warm: -0.12, price: 95,
    note: 'Socket 7, the old platform. Cool and cheap. StarCraft is happy with it, and not much else is.' },
  { id: 'p266', name: 'Pentium II 266', family: 'Slot 1', mhz: 266, bus: 66, mult: 4, ocBus: [100, 112], warm: -0.07, price: 140,
    note: 'The cheapest way into Slot 1. It overclocks better than it should.' },
  { id: 'p300', name: 'Pentium II 300', family: 'Slot 1', mhz: 300, bus: 66, mult: 4.5, ocBus: [100, 112], warm: 0, price: 190,
    note: 'What the club PCs have. At a 100MHz bus it is a 450.' },
  { id: 'p350', name: 'Pentium II 350', family: 'Slot 1', mhz: 350, bus: 100, mult: 3.5, ocBus: [112, 124], warm: 0.1, price: 290,
    note: '100MHz bus out of the box. It runs warm and has little headroom.' },
  { id: 'p450', name: 'Pentium II 450', family: 'Slot 1', mhz: 450, bus: 100, mult: 4.5, ocBus: [112, 124], warm: 0.3, price: 520,
    note: 'The fastest thing in the shop. It costs what a used car does.' },
];

// How a stock heat rate and the two overclock steps work out: stock cools by itself, the first step runs warmer than
// the room can lose, the second (extra volts) a lot warmer. Numbers are the club PC's, scaled by how far the clock moves.
const OC_HEAT = [-0.6, 0.35, 0.8];       // the Pentium II 300 at stock, at a 100MHz bus, at 112MHz with extra volts
const OC_REF_RATIO = [1, 1.5, 1.68];     // 300 -> 300, 450, 504

// The three speeds a CPU runs at (stock and the two overclocks), with what they are called and how hot they get.
export function ocFor(cpu) {
  const stockMhz = cpu.mhz;
  return [0, 1, 2].map((level) => {
    const bus = level === 0 ? cpu.bus : cpu.ocBus[level - 1];
    const mhz = level === 0 ? cpu.mhz : Math.round(bus * cpu.mult);
    const k = level === 0 ? 0 : ((mhz / stockMhz - 1) / (OC_REF_RATIO[level] - 1));
    const heat = Math.round((OC_HEAT[0] + cpu.warm + (OC_HEAT[level] - OC_HEAT[0]) * k) * 100) / 100;
    const label = level === 0 ? cpu.name : `${cpu.name} at ${mhz} (${bus}MHz bus${level === 2 ? ', extra volts' : ''})`;
    return { label, mhz, heat };
  });
}

/* ---------------------------------------------------------------- memory */

export const RAM = [
  { id: 'ram16', mb: 16, name: '16MB of memory', price: 75, note: 'One stick. Windows 98 runs in it the way a man runs with a piano on his back.' },
  { id: 'ram32', mb: 32, name: '32MB of memory', price: 140, note: 'Enough for StarCraft at midnight, with room for a game of DOOM.' },
  { id: 'ram64', mb: 64, name: '64MB of memory', price: 260, note: 'More than any game here will use. The slots are nearly full.' },
  { id: 'ram128', mb: 128, name: '128MB of memory', price: 480, note: 'Nobody needs this in 1998. Everybody will ask how much you paid.' },
];

/* ---------------------------------------------------------------- drives */

export const HDD = [
  { id: 'h21', gb: 2.1, name: '2.1GB IDE hard disk', price: 85, note: 'A tidy size if you do not download anything.' },
  { id: 'h43', gb: 4.3, name: '4.3GB IDE hard disk', price: 130, note: 'Room for Windows, three games and a lot of MP3s.' },
  { id: 'h64', gb: 6.4, name: '6.4GB UDMA hard disk', price: 170, note: 'Fast enough that the light barely flickers.' },
  { id: 'h84', gb: 8.4, name: '8.4GB UDMA hard disk', price: 220, note: 'More space than the whole LAN has MP3s.' },
  { id: 'h10', gb: 10.1, name: '10.1GB UDMA hard disk', price: 290, note: 'Just out. It is bigger than your last PC and your last three put together.' },
];

export const CDROM = [
  { id: 'cd24', x: 24, name: '24x CD-ROM drive', price: 45, note: 'Reads discs. Cannot write them, so do not ask it.' },
  { id: 'cd32', x: 32, name: '32x CD-ROM drive', price: 65, note: 'Reads faster and rattles louder.' },
];

// speed is the write speed, and sets how long a MIX CD takes (a 74 minute disc at 2x is a 37 minute write).
export const CDR = [
  { id: 'cdr2', x: 2, speed: 2, name: '2x CD-R burner (6x read)', price: 200, note: 'Same as the one in PC-04. A blank is $4 and a bad write makes a coaster.' },
  { id: 'cdr4', x: 4, speed: 4, name: '4x CD-R burner (12x read)', price: 290, note: 'Burns a disc in about twenty minutes. The blanks are still $4.' },
];

/* ---------------------------------------------------------------- network card */

// ports: what the card plugs into. The LAN is 10BASE2 coax (BNC) tonight and goes to RJ45 once somebody buys a hub.
// speed: on the room's own scale (coax 1, hub 3, switch 10), the fastest it can swap files.
export const NIC = [
  { id: 'nicBnc', name: '10Mbps ISA network card (BNC)', ports: ['bnc'], speed: 1, price: 15, note: 'Coax only. When the hub turns up, this card has nowhere to plug it in.' },
  { id: 'nicCombo', name: '10Mbps ISA combo card (BNC and RJ45)', ports: ['bnc', 'rj45'], speed: 3, price: 25, note: 'Both sockets. Works on the coax tonight and the hub later. Gets nothing out of a switch.' },
  { id: 'nicFast', name: '10/100 PCI network card (RJ45)', ports: ['rj45'], speed: 10, price: 39, note: 'RJ45 only: no coax until the hub arrives. Makes the most of a switch.' },
];

/* ---------------------------------------------------------------- sound and the desk */

export const AUDIO = [
  { id: 'spk', kind: 'speakers', name: 'Desktop speakers (powered pair)', price: 40, note: 'The room hears what you are playing. They need a socket on the power board.' },
  { id: 'phones', kind: 'headphones', name: 'Headphones', price: 25, note: 'Only you hear it. Nothing to plug into the mains.' },
];

export const KEYBOARD = [
  { id: 'kbBasic', name: '101-key keyboard', price: 12, note: 'Clicky. Does what it is told.' },
  { id: 'kbSplit', name: 'Split ergonomic keyboard', price: 45, note: 'Looks like it is being pulled apart. Your wrists will last longer than the game.' },
];

export const MOUSE = [
  { id: 'msBall', name: 'Two-button ball mouse', price: 8, note: 'Pick the fluff out of the ball every hour or so.' },
  { id: 'msWheel', name: 'Three-button wheel mouse', price: 22, note: 'The wheel does nothing in DOOM. It feels like it should.' },
];

export const MAT = [
  { id: 'matNone', name: 'No mouse mat', price: 0, note: 'The table, which is fine, apart from the ball.' },
  { id: 'matCloth', name: 'Cloth mouse mat', price: 5, note: 'Foam-backed, the size of a coaster with ambitions.' },
  { id: 'matHard', name: 'Hard plastic mouse mat', price: 18, note: 'Slick, and it slides about the table.' },
  { id: 'matLarge', name: 'Large cloth mat', price: 15, note: 'Room to flick your wrist. It takes half the desk.' },
];

export const PARTS = {
  crt: by(CRT), cpu: by(CPU), ram: by(RAM), hdd: by(HDD), cdrom: by(CDROM), cdr: by(CDR),
  nic: by(NIC), audio: by(AUDIO), keyboard: by(KEYBOARD), mouse: by(MOUSE), mat: by(MAT),
};

/* ---------------------------------------------------------------- builds */

// What a sensible person buys with the money: a 17-inch monitor, the club's own processor, 32MB, one disk and a
// CD-ROM, a card that works on the coax tonight and the hub later. About $960, so the burner is affordable.
export function defaultBuild() {
  return {
    crt: 'crt17', cpu: 'p300', ram: 'ram32', hdd: ['h43', null, null], floppy: 1, cdrom: 'cd24', cdr: null,
    nic: 'nicCombo', audio: 'spk', keyboard: 'kbBasic', mouse: 'msWheel', mat: 'matCloth',
  };
}

const hdds = (b) => b.hdd.filter(Boolean);

// How many of the four IDE slots the drives use
export function ideUsed(b) { return hdds(b).length + (b.cdrom ? 1 : 0) + (b.cdr ? 1 : 0); }

// Every line of the receipt: [what it is, what it costs]
export function lines(b) {
  const out = [];
  const add = (group, id, qty = 1) => { const p = PARTS[group][id]; if (p) out.push({ group, id, name: p.name, qty, price: p.price * qty }); };
  add('crt', b.crt); add('cpu', b.cpu); add('ram', b.ram);
  const count = {};
  for (const id of hdds(b)) count[id] = (count[id] ?? 0) + 1;
  for (const [id, n] of Object.entries(count)) add('hdd', id, n);
  if (b.floppy > 0) out.push({ group: 'floppy', id: 'floppy', name: '3.5" 1.44MB floppy drive', qty: b.floppy, price: FLOPPY_PRICE * b.floppy });
  if (b.cdrom) add('cdrom', b.cdrom);
  if (b.cdr) add('cdr', b.cdr);
  add('nic', b.nic); add('audio', b.audio); add('keyboard', b.keyboard); add('mouse', b.mouse); add('mat', b.mat);
  return out;
}

export function price(b) { return lines(b).reduce((sum, l) => sum + l.price, 0); }
export function remaining(b) { return BUDGET - price(b); }

// What is wrong with a build, as sentences in the voice of the program. Empty means it can be bought.
export function validate(b) {
  const bad = [];
  for (const k of ['crt', 'cpu', 'ram', 'nic', 'audio', 'keyboard', 'mouse', 'mat']) if (!PARTS[k][b[k]]) bad.push(`No ${k === 'crt' ? 'monitor' : k === 'nic' ? 'network card' : k} chosen.`);
  if (!Array.isArray(b.hdd) || b.hdd.length > MAX_HDD || hdds(b).some((id) => !PARTS.hdd[id])) bad.push('Pick the hard disks from the list.');
  else if (!hdds(b).length || !b.hdd[0]) bad.push('There is nothing to boot from. Fit at least one hard disk.');
  if (!Number.isInteger(b.floppy) || b.floppy < 0 || b.floppy > MAX_FLOPPY) bad.push('A PC takes up to two floppy drives.');
  if (b.cdrom && !PARTS.cdrom[b.cdrom]) bad.push('Pick the CD-ROM drive from the list.');
  if (b.cdr && !PARTS.cdr[b.cdr]) bad.push('Pick the CD-R burner from the list.');
  if (Array.isArray(b.hdd) && ideUsed(b) > IDE_DEVICES) bad.push(`The motherboard has ${IDE_DEVICES} IDE connectors and you have used ${ideUsed(b)}. Drop a drive.`);
  if (price(b) > BUDGET) bad.push(`That is $${price(b) - BUDGET} over the $${BUDGET} in the account.`);
  return bad;
}

export const canBuy = (b) => validate(b).length === 0;

// A saved or typed-in build is not to be trusted: keep what is on the shelf and fill the rest from the default.
export function sanitize(raw) {
  const d = defaultBuild();
  if (!raw || typeof raw !== 'object') return d;
  const pick = (group, id, fallback) => (Object.hasOwn(PARTS[group], id) ? id : fallback);
  const hdd = Array.isArray(raw.hdd) ? raw.hdd.slice(0, MAX_HDD).map((id) => (Object.hasOwn(PARTS.hdd, id) ? id : null)) : d.hdd;
  while (hdd.length < MAX_HDD) hdd.push(null);
  if (!hdd[0]) { const first = hdd.find(Boolean); hdd.fill(null); hdd[0] = first ?? d.hdd[0]; }
  return {
    crt: pick('crt', raw.crt, d.crt), cpu: pick('cpu', raw.cpu, d.cpu), ram: pick('ram', raw.ram, d.ram),
    hdd, floppy: Number.isInteger(raw.floppy) ? Math.max(0, Math.min(MAX_FLOPPY, raw.floppy)) : d.floppy,
    cdrom: raw.cdrom == null ? null : pick('cdrom', raw.cdrom, null), cdr: raw.cdr == null ? null : pick('cdr', raw.cdr, null),
    nic: pick('nic', raw.nic, d.nic), audio: pick('audio', raw.audio, d.audio),
    keyboard: pick('keyboard', raw.keyboard, d.keyboard), mouse: pick('mouse', raw.mouse, d.mouse), mat: pick('mat', raw.mat, d.mat),
  };
}

/* ---------------------------------------------------------------- what a build adds up to */

// Everything the rest of the game wants to know about a build, with the ids already looked up.
export function specOf(b) {
  const crt = PARTS.crt[b.crt], cpu = PARTS.cpu[b.cpu], ram = PARTS.ram[b.ram], nic = PARTS.nic[b.nic];
  const disks = hdds(b).map((id) => PARTS.hdd[id]);
  const cdr = b.cdr ? PARTS.cdr[b.cdr] : null;
  return {
    crt, cpu, ram: ram.mb, nic, audio: PARTS.audio[b.audio], keyboard: PARTS.keyboard[b.keyboard], mouse: PARTS.mouse[b.mouse], mat: PARTS.mat[b.mat],
    disks, diskGb: Math.round(disks.reduce((s, d) => s + d.gb, 0) * 10) / 10, floppies: b.floppy,
    cdrom: b.cdrom ? PARTS.cdrom[b.cdrom] : null, cdr, burnSpeed: cdr ? cdr.speed : 0,
    speakers: PARTS.audio[b.audio].kind === 'speakers',
    oc: ocFor(cpu),
  };
}

// A network card and the LAN: can this card plug into what the room has right now? `net` is a party.js tier.
export function nicWorksOn(nic, net) { return nic.ports.includes(net === 'coax' ? 'bnc' : 'rj45'); }
// How fast a card can swap files on a tier (the room's own scale)
export function nicSpeed(nic, net, tierSpeed) { return nicWorksOn(nic, net) ? Math.min(nic.speed, tierSpeed) : 0; }

/* ---------------------------------------------------------------- the BIOS screen */

const gbText = (gb) => `${gb.toFixed(1)}GB`;

// The IDE connectors in the order the BIOS lists them, with what is on each
export function ideList(b) {
  const devices = [...hdds(b).map((id) => `${gbText(PARTS.hdd[id].gb)} hard disk`), ...(b.cdr ? [`${PARTS.cdr[b.cdr].x}x CD-R`] : []), ...(b.cdrom ? [`${PARTS.cdrom[b.cdrom].x}x CD-ROM`] : [])];
  const slots = ['Primary Master', 'Primary Slave', 'Secondary Master', 'Secondary Slave'];
  return slots.map((slot, i) => ({ slot, device: devices[i] ?? null }));
}

// The text the power-on self test prints, line by line. `memK` is the memory the counter climbs to.
export function postLines(b) {
  const s = specOf(b);
  const lines = [
    { text: 'Award Modular BIOS v4.51PG, An Energy Star Ally', at: 0.0 },
    { text: 'Copyright (C) 1984-98, Award Software, Inc.', at: 0.0 },
    { text: '', at: 0.2 },
    { text: `${s.cpu.name} CPU at ${s.cpu.mhz}MHz`, at: 0.4 },
    { text: `Memory Test : ${s.ram * 1024}K OK`, at: 0.7, counter: s.ram * 1024 },
    { text: '', at: 2.2 },
    { text: 'Award Plug and Play BIOS Extension v1.0A', at: 2.3 },
    { text: `Detecting IDE devices on ${IDE_DEVICES} connectors...`, at: 2.6 },
  ];
  let t = 3.0;
  for (const { slot, device } of ideList(b)) {
    lines.push({ text: `${slot.padEnd(17)}: ${device ?? 'None'}`, at: t });
    t += device ? 0.5 : 0.2;
  }
  lines.push({ text: `Floppy drives     : ${s.floppies === 0 ? 'None' : s.floppies === 1 ? '1.44M, 3.5 in.' : '1.44M, 3.5 in. x2'}`, at: t });
  lines.push({ text: `Keyboard          : ${s.keyboard.name}`, at: t + 0.3 });
  lines.push({ text: `Pointing device   : ${s.mouse.name}`, at: t + 0.5 });
  lines.push({ text: `Display adapter   : SVGA, ${s.crt.inches}-inch monitor`, at: t + 0.7 });
  lines.push({ text: `Network adapter   : ${s.nic.name}`, at: t + 0.9 });
  lines.push({ text: '', at: t + 1.2 });
  lines.push({ text: 'Press DEL to enter SETUP', at: t + 1.3 });
  return { lines, seconds: t + 2.2 };
}

export const postSeconds = (b) => postLines(b).seconds;

// The sums for the wizard's receipt, as a short readable list
export function summary(b) {
  const s = specOf(b);
  return [
    ['Monitor', `${s.crt.inches}" (${s.crt.viewable}" viewable), ${s.crt.modes}`],
    ['Processor', `${s.cpu.name} (${s.cpu.family})`],
    ['Memory', `${s.ram}MB`],
    ['Hard disks', s.disks.map((d) => gbText(d.gb)).join(' + ') + ` (${gbText(s.diskGb)})`],
    ['Floppy drives', s.floppies === 0 ? 'None' : String(s.floppies)],
    ['CD drives', [s.cdrom ? `${s.cdrom.x}x CD-ROM` : null, s.cdr ? `${s.cdr.x}x CD-R burner` : null].filter(Boolean).join(' and ') || 'None'],
    ['Network card', s.nic.name],
    ['Sound', s.audio.name],
    ['Desk', `${s.keyboard.name}, ${s.mouse.name}, ${s.mat.name.toLowerCase()}`],
  ];
}

// The worries worth telling somebody about before they spend the money. Warnings, not errors: you can still buy it.
export function warnings(b, net = 'coax') {
  const s = specOf(b);
  const out = [];
  if (!nicWorksOn(s.nic, net)) out.push(`The ${s.nic.name} has no BNC socket and the LAN is on coax tonight. You are off the network until somebody buys a hub.`);
  else if (!s.nic.ports.includes('rj45')) out.push('That card has no RJ45 socket. When the hub arrives your PC cannot be plugged into it.');
  if (s.ram < 32) out.push('StarCraft wants 32MB and it gets started at midnight. You will be watching.');
  if (s.speakers) out.push('Speakers will keep Mum awake. Headphones will not.');
  return out;
}
