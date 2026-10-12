// The BYOC bench: the two empty spots on the back table where you set up the PC you built, what you have to unpack,
// and what has to be plugged in before the box will start. Pure data and rules with no three.js and no DOM, so
// tools/bench.test.mjs can check them in plain node. js/bench.js puts them in the room; js/rear.js is the panel
// round the back of the tower where the cables go.
//
// Coordinates are the station's own space, the same one js/room.js uses for the club PCs: the table's middle is the
// origin, +z is toward the chair and the room, -z is toward the wall, +x is the tower's side.
import { specOf, nicWorksOn } from './build.js';

export const SEAT_BASE = 6;      // station and seat index of bench 0: the six club PCs come first (js/party.js PC_COUNT)
export const BENCH_COUNT = 2;

// Where the benches are. Both sit on the back table, in the gaps between PC-01 / PC-02 and PC-02 / PC-03, because the
// back wall's sockets are on the good circuit. `between` names the two club PCs the coax runs from and to.
export const BENCHES = [
  { id: 0, x: -1.4, z: -4.25, face: 0, name: 'PC-07', between: ['PC-01', 'PC-02'], neighbours: [0, 1] },
  { id: 1, x: 1.4, z: -4.25, face: 0, name: 'PC-08', between: ['PC-02', 'PC-03'], neighbours: [1, 2] },
];
export const benchOfSeat = (pc) => (Number.isInteger(pc) && pc >= SEAT_BASE && pc < SEAT_BASE + BENCH_COUNT ? pc - SEAT_BASE : null);

// What a rig takes up on the table, either side of the bench's x (speakers and the mouse at the left, the tower at the right).
// Checked against the club PCs in the tests so nothing overlaps.
export const RIG_SPAN = { left: -0.40, right: 0.64 };
export const CLUB_X = [-2.8, 0, 2.8];
export const TABLE_HALF = (5 * 1.838) / 2;            // five 6 ft tables end to end (js/room.js)

/* ---------------------------------------------------------------- what gets unpacked */

// "Two-button ball mouse" in the middle of a sentence, but "17-inch SVGA monitor" and "PC tower" as they are
const lc = (label) => (/^[A-Z][a-z]/.test(label) ? label[0].toLowerCase() + label.slice(1) : label);

// The pieces you carry to the table, in the order they are listed. `at` is where each one sits.
export function partsFor(build) {
  const s = specOf(build);
  const list = [];
  if (s.mat.id !== 'matNone') list.push({ id: 'mat', label: s.mat.name });
  list.push(
    { id: 'monitor', label: s.crt.name },
    { id: 'tower', label: 'PC tower' },
    { id: 'keyboard', label: s.keyboard.name },
    { id: 'mouse', label: s.mouse.name },
    { id: 'audio', label: s.audio.name },
  );
  return list;
}

/* ---------------------------------------------------------------- where everything sits */

export const TABLE_DEPTH = 0.762;
export const CRT_BASE_W = 0.32;    // the 17-inch tube the club PCs have: everything else is scaled from its glass

// Where each part of a build goes on its bench, in the station's space, with the box it takes up ([x0, x1, z0, z1])
// so the tests can check nothing overlaps. The monitor's back always ends at the same place, so a bigger tube grows
// toward you. `seat` is where your eye goes when you sit: always the same distance from the glass, so a small
// monitor looks small.
export function layoutFor(build) {
  const s = specOf(build);
  const k = s.crt.glass[0] / CRT_BASE_W;
  const monZ = -0.46 + 0.34 * k;
  const split = s.keyboard.id === 'kbSplit';
  const kbW = split ? 0.5 : 0.46;
  const mat = { matNone: null, matCloth: { w: 0.2, d: 0.18 }, matHard: { w: 0.22, d: 0.2 }, matLarge: { w: 0.34, d: 0.26 } }[s.mat.id];
  const matX = s.mat.id === 'matLarge' ? 0.4 : 0.34;
  const mouseX = s.mat.id === 'matLarge' ? 0.4 : 0.33;
  const spk = 0.16 * k + 0.15;
  const box = (x, z, w, d) => [x - w / 2, x + w / 2, z - d / 2, z + d / 2];
  return {
    k,
    monitor: { x: 0, z: monZ, k, foot: [-0.21 * k, 0.21 * k, monZ - 0.34 * k, monZ + 0.15 * k] },
    tower: { x: 0.52, z: -0.1, foot: box(0.52, -0.1, 0.19, 0.44) },
    keyboard: { x: -0.02, z: 0.24, w: kbW, foot: box(-0.02, 0.24, kbW, 0.17) },
    mouse: { x: mouseX, z: 0.26, foot: box(mouseX, 0.26, 0.06, 0.1) },
    mat: mat ? { x: matX, z: 0.25, ...mat, foot: box(matX, 0.25, mat.w, mat.d) } : null,
    speakers: s.speakers ? { x: spk, z: -0.1, feet: [[-spk - 0.05, -spk + 0.05, -0.155, -0.045], [spk - 0.05, spk + 0.05, -0.155, -0.045]] } : null,
    seat: { x: 0, y: 0.225 * k, z: monZ + 0.157 * k + 0.36 },
  };
}

/* ---------------------------------------------------------------- what gets plugged in */

// group: video | input | audio | power | net. required: the box will not start without it. needs: another cable that goes first.
export function cablesFor(build, net = 'coax', bench = BENCHES[0]) {
  const s = specOf(build);
  const out = [
    { id: 'vga', group: 'video', label: 'Monitor video cable', hint: 'blue, 15-pin', required: true },
    { id: 'kb', group: 'input', label: 'Keyboard lead', hint: 'purple, round', required: true },
    { id: 'mouse', group: 'input', label: 'Mouse lead', hint: 'green, round', required: true },
    { id: 'audio', group: 'audio', label: s.speakers ? 'Speaker lead' : 'Headphone lead', hint: 'lime green jack', required: false },
    { id: 'pw-mon', group: 'power', label: 'Monitor power lead', hint: 'into the power board', required: true },
    { id: 'pw-tower', group: 'power', label: 'Tower power lead', hint: 'into the power board', required: true },
  ];
  if (s.speakers) out.push({ id: 'pw-spk', group: 'power', label: 'Speaker power pack', hint: 'into the power board', required: false });
  out.push({ id: 'board', group: 'power', label: 'Power board plug', hint: 'into the wall socket', required: true });
  if (net === 'coax') {
    if (nicWorksOn(s.nic, 'coax')) {
      out.push(
        { id: 'coax-t', group: 'net', label: 'BNC T-connector', hint: 'onto the BNC socket on the card', required: false },
        { id: 'coax-l', group: 'net', label: `Coax from ${bench.between[0]}`, hint: 'to one side of the T', required: false, needs: 'coax-t' },
        { id: 'coax-r', group: 'net', label: `Coax on to ${bench.between[1]}`, hint: 'to the other side of the T', required: false, needs: 'coax-t' },
      );
    }
  } else if (nicWorksOn(s.nic, net)) {
    out.push(
      { id: 'cat5-card', group: 'net', label: 'Cat5 network lead', hint: 'into the RJ45 socket on the card', required: false },
      { id: 'cat5-hub', group: 'net', label: `Other end of the cat5`, hint: `into a free port on the ${net === 'switch' ? 'switch' : 'hub'}`, required: false, needs: 'cat5-card' },
    );
  }
  return out;
}

// Why a card cannot join the LAN as it stands, or null if it can.
export function netProblem(build, net) {
  const s = specOf(build);
  if (nicWorksOn(s.nic, net)) return null;
  return net === 'coax'
    ? `The ${s.nic.name} has no BNC socket, and the LAN is on coax tonight. There is nothing to plug the T-connector into.`
    : `The ${s.nic.name} has no RJ45 socket, and the LAN is on ${net === 'switch' ? 'the switch' : 'the hub'} now. There is nothing to plug the cat5 into.`;
}

/* ---------------------------------------------------------------- the setup itself */

const REQUIRED_PARTS = ['monitor', 'tower', 'keyboard', 'mouse'];

// The pieces that have to be on the table before a lead can reach them
const CABLE_PARTS = {
  vga: ['monitor', 'tower'], kb: ['keyboard', 'tower'], mouse: ['mouse', 'tower'], audio: ['audio', 'tower'],
  'pw-mon': ['monitor'], 'pw-tower': ['tower'], 'pw-spk': ['audio'], board: [],
  'coax-t': ['tower'], 'cat5-card': ['tower'],
};

export class Setup {
  constructor(build, net = 'coax', bench = BENCHES[0]) {
    this.build = build;
    this.spec = specOf(build);
    this.bench = bench;
    this.net = net;
    this.placed = new Set();
    this.plugged = new Map();   // cable id -> where it went (a board socket number, for the power leads)
    this.poweredOn = false;
  }

  parts() { return partsFor(this.build); }
  cables() { return cablesFor(this.build, this.net, this.bench); }
  cable(id) { return this.cables().find((c) => c.id === id) ?? null; }

  place(id) {
    if (!this.parts().some((p) => p.id === id) || this.placed.has(id)) return false;
    this.placed.add(id);
    return true;
  }

  allPlaced() { return this.parts().every((p) => this.placed.has(p.id)); }

  canPlug(id) {
    const c = this.cable(id);
    if (!c) return { ok: false, why: 'That cable is not in the box.' };
    if (this.plugged.has(id)) return { ok: false, why: 'Already plugged in.' };
    for (const part of CABLE_PARTS[id] ?? []) {
      if (!this.placed.has(part)) return { ok: false, why: `The ${lc(this.parts().find((p) => p.id === part)?.label ?? part)} is not on the table yet.` };
    }
    if (c.needs && !this.plugged.has(c.needs)) return { ok: false, why: `Fit the ${lc(this.cable(c.needs).label)} first.` };
    return { ok: true };
  }

  plug(id, where = null) {
    if (!this.canPlug(id).ok) return false;
    this.plugged.set(id, where);
    return true;
  }

  // Pulling a lead out takes anything that hangs off it with it (the coax from a T, the far end of a cat5)
  unplug(id) {
    if (!this.plugged.has(id)) return [];
    const gone = [id];
    this.plugged.delete(id);
    for (const c of this.cables()) if (c.needs === id && this.plugged.has(c.id)) { this.plugged.delete(c.id); gone.push(c.id); }
    return gone;
  }

  // The hub has arrived (or the switch has gone back): the old cables are no good. Returns what came out.
  setNet(net) {
    if (net === this.net) return [];
    const gone = [...this.plugged.keys()].filter((id) => this.cable(id)?.group === 'net');
    this.net = net;
    for (const id of gone) this.plugged.delete(id);
    return gone;
  }

  // power
  boardInWall() { return this.plugged.has('board'); }
  towerPowered() { return this.boardInWall() && this.plugged.has('pw-tower'); }
  monitorPowered() { return this.boardInWall() && this.plugged.has('pw-mon'); }
  speakersPowered() { return this.spec.speakers ? this.boardInWall() && this.plugged.has('pw-spk') : false; }

  // The LAN: every net cable that this tier needs is in. A card that cannot reach the tier is never connected.
  netCabled() {
    const net = this.cables().filter((c) => c.group === 'net');
    return net.length > 0 && net.every((c) => this.plugged.has(c.id));
  }
  nicProblem() { return netProblem(this.build, this.net); }

  // What is still in the way of pressing the button, as sentences in the voice of the program
  missing() {
    const out = [];
    for (const id of REQUIRED_PARTS) if (!this.placed.has(id)) out.push(`The ${lc(this.parts().find((p) => p.id === id).label)} is not on the table.`);
    const words = {
      vga: 'The monitor is not plugged into the tower.',
      kb: 'No keyboard is plugged in.',
      mouse: 'No mouse is plugged in.',
      'pw-mon': 'The monitor has no power.',
      'pw-tower': 'The tower has no power.',
      board: 'The power board is not plugged into the wall.',
    };
    for (const c of this.cables()) {
      if (!c.required || this.plugged.has(c.id)) continue;
      if ((CABLE_PARTS[c.id] ?? []).every((part) => this.placed.has(part))) out.push(words[c.id]);
    }
    return out;
  }
  canBoot() { return !this.poweredOn && this.missing().length === 0; }

  // Things worth knowing that do not stop you: no sound, no network
  cautions() {
    const out = [];
    if (this.placed.has('audio') && !this.plugged.has('audio')) out.push(`The ${lc(this.spec.audio.name)} lead is not in the jack. You will not hear anything.`);
    if (this.spec.speakers && this.placed.has('audio') && !this.plugged.has('pw-spk')) out.push('The speakers have no power.');
    const problem = this.nicProblem();
    if (problem) out.push(problem);
    else if (!this.netCabled()) out.push('No network cable. You will be on your own.');
    return out;
  }

  // The list the HUD shows while you set up: each thing, and whether it is done
  checklist() {
    const items = this.parts().map((p) => ({ id: p.id, kind: 'part', text: `Unpack the ${lc(p.label)}`, done: this.placed.has(p.id), optional: p.id === 'mat' || p.id === 'audio' }));
    for (const c of this.cables()) items.push({ id: c.id, kind: 'cable', text: `${c.label}: ${c.hint}`, done: this.plugged.has(c.id), optional: !c.required });
    return items;
  }

  progress() {
    const list = this.checklist().filter((i) => !i.optional);
    return { done: list.filter((i) => i.done).length, total: list.length };
  }
}
