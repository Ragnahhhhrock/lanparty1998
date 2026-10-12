// The logistics of a 1998 LAN: cash, the one CD burner, and (as the night goes on) the
// network, the heat, the RAM and the file sharing. DOM-free on purpose: main.js feeds it
// time and reads state back, so it can be tested in plain node.
export const SEC_PER_GAME_MIN = 10;   // one in-game minute is ten real seconds
export const PC_COUNT = 6;          // the club's PCs
export const BENCH_COUNT = 2;       // and the two benches for the PC you built (js/bench-plan.js): PC-07 and PC-08, seats 6 and 7
export const PC_TOTAL = PC_COUNT + BENCH_COUNT;

export const BURNER = {
  pc: 3,                 // PC-04 is the only box with a CD-R drive
  speed: 2,              // and it's a 2x
  discMinutes: 74,       // a 650MB disc is 74 minutes of audio
  blankCost: 4,          // a blank CD-R
  underrunSeconds: 20,   // play DOOM on the burner for this long mid-write and you've made a coaster
};

// The network, in the order you'll live through it
export const NET = {
  coax:   { label: '10BASE2 coax', short: 'COAX',   speed: 1 },   // one cable, one dodgy T-connector
  hub:    { label: '10BASE-T hub', short: 'HUB',    speed: 3 },
  switch: { label: '16-port switch', short: 'SWITCH', speed: 10 },
};
export const SHOP = { hubCost: 45, hubDelay: 10 };            // the hub: shop price, game minutes until it turns up
export const PIZZA = { cost: 16, delay: 25, slices: 8 };         // a large pepperoni: price, game minutes from hanging up until the driver knocks, slices in the box
export const DAD = { delay: 20, warnAt: 5 * 60 + 30, returnAt: 6 * 60 }; // the switch is on loan until 6:00 AM
export const COAX_FAULT_EVERY = [6, 12];                      // game minutes between dodgy T-connectors

// Overclocking: more MHz, more heat. A stock box cools down on its own; the others need the fan.
export const OC = [
  { label: 'Pentium II 300', mhz: 300, heat: -0.6 },
  { label: 'Pentium II 300 at 450 (100MHz bus)', mhz: 450, heat: 0.35 },
  { label: 'Pentium II 300 at 504 (112MHz bus, extra volts)', mhz: 504, heat: 0.8 },
];
export const FAN = { cool: 1.4, period: 14, knockEvery: [9, 16] }; // heat/s at best, seconds per sweep, game minutes between knocks

// Power. The sockets along the front wall are on the dryer's circuit and trip the safety switch, so the front row
// (PC-04, PC-05, PC-06) runs off one chain of boards, and the lead for it comes across the room from the back wall.
// Trip over that lead and the plug comes out of the board: all three go dark until somebody plugs it back in.
export const LEAD = { pcs: [3, 4, 5], bootSeconds: 6 }; // the PCs on the lead, and how long a box spends in its POST after the power returns
export const HEAT = { crash: 100, warn: 75, ok: 60, afterReboot: 70 };
export const celsius = (heat) => Math.round(28 + heat * 0.5);

// RAM: 72-pin SIMMs. Macca is off to Singapore, where it's a lot cheaper than the shop here.
export const RAM = { start: 16, stick: 16, max: 64, shopPrice: 75, sgPrice: 35, maxOrder: 4, tripMinutes: 90, starcraft: 32 }; // StarCraft wants 32MB

// The night. The doors open at 7:30 PM and the room wants first-person shooters. At midnight somebody
// kicks off a StarCraft game, and only the PCs with enough memory can join it.
export const NIGHT = { doors: 19 * 60 + 30, midnight: 24 * 60 };
export const ANNOUNCEMENTS = [
  { id: 'doors', at: NIGHT.doors },
  { id: 'fps', at: 20 * 60 + 30 },
  { id: 'soon', at: NIGHT.midnight - 15 },
  { id: 'midnight', at: NIGHT.midnight },
  { id: 'late', at: NIGHT.midnight + 2 * 60 },
];

// File sharing. You are the one who has to go round every machine and get Windows to share a folder.
// It is fiddly, it fails, it needs a reboot, and it comes undone again.
export const SHARE_STEPS = [
  { text: 'Installing Client for Microsoft Networks', secs: 3 },
  { text: 'Adding the IPX/SPX-compatible protocol', secs: 3 },
  { text: 'Turning on File and Printer Sharing', secs: 3 },
  { text: 'Setting the workgroup to WORKGROUP', secs: 2 },
  { text: 'Restarting Windows', secs: 6, reboot: true },
  { text: 'Sharing C:\\WAREZ', secs: 2 },
];
export const SHARE_ERRORS = [
  'The password is incorrect for the WAREZ share.',
  'The network path was not found. Did somebody rename the workgroup?',
  'Windows was unable to complete the network installation. NDIS.VXD could not be loaded.',
  'Unable to browse network. Is IPX/SPX installed?',
  'A computer with the same name already exists on the network.',
  'The network adapter is not responding. Check that the cable is connected.',
];
export const SHARE_FAIL = { coax: 0.45, hub: 0.3, switch: 0.2 }; // chance an attempt falls over, by network
export const SHARE_BREAKS = ['Somebody installed a mouse driver.', 'The workgroup changed itself to MSHOME.', 'Windows forgot the network password.', 'Somebody renamed the computer.'];
export const SHARE_BREAK_EVERY = [4, 8];   // game minutes between shares coming undone somewhere
export const SWAP_MB_PER_SEC = 0.08;       // per pair of PCs sharing, per unit of network speed
export const WAREZ = [                      // the library fills up as files go round
  { mb: 50, name: 'FRAGPACK.ZIP' },
  { mb: 150, name: 'MAPS98.ZIP' },
  { mb: 300, name: 'MODS.ZIP' },
  { mb: 650, name: 'A WHOLE CD OF STUFF' },
];

export const DISCS = {
  MIX: { name: 'MIX CD', pays: 10 },
};

export class Party extends EventTarget {
  // startMinutes: the wall-clock minute (since midnight) the doors open. rng is injectable for tests.
  constructor({ startMinutes = NIGHT.doors, rng = Math.random } = {}) {
    super();
    this.start = startMinutes;
    this.rng = rng;
    this.now = 0;          // game minutes since the doors opened
    this.cash = 150;
    this.discs = 0;        // discs burned and handed out
    this.coasters = 0;     // discs ruined
    this.job = null;       // the burn in progress: { kind, left, total, abused }

    this.net = 'coax';     // coax -> hub -> (borrowed) switch
    this.pcs = Array.from({ length: PC_TOTAL }, (_, i) => (i < PC_COUNT
      ? { linkDown: false, oc: 0, heat: 0, crashed: false, hot: false, ram: RAM.start, share: 'broken', boot: 0 }
      // a bench: nothing there until somebody's PC is switched on. on: running; cabled: the network lead is fitted;
      // ocTable: the overclock steps for the CPU in it; burnSpeed: its CD-R, 0 for none
      : { linkDown: false, oc: 0, heat: 0, crashed: false, hot: false, ram: 0, share: 'broken', boot: 0, bench: true, on: false, cabled: false, ocTable: null, burnSpeed: 0 }));
    this.leadIn = true;    // the extension lead is plugged into the front row's board
    this.fixes = new Map(); // pc -> the file sharing job in progress
    this.swapped = 0;       // MB that have gone round the network
    this.library = 0;       // milestones reached
    this.nextBreak = this.now + this.breakGap();
    this.buddy = { state: 'home', sticks: 0, back: 0 }; // home -> away (in Singapore) -> back (with the RAM) -> home
    this.sticks = 0;       // SIMMs in your pocket
    this.fan = { on: true, phase: 0 };
    this.nextKnock = this.now + this.knockGap();
    this.pizzas = 0;       // pizzas that have turned up
    this.orders = [];      // things on their way: { what: 'hub' | 'switch', at }
    this.dadLent = false;  // the switch only goes on loan once
    this.warned = false;
    this.said = new Set(ANNOUNCEMENTS.filter((a) => a.at < startMinutes).map((a) => a.id)); // announcements already made (or already missed)
    this.tripped = 0;      // times somebody has gone over a cable
    this.nextFault = this.now + this.faultGap();
  }

  // 'fps' until midnight, then 'rts'
  phase() { return this.clockMinutes() < NIGHT.midnight ? 'fps' : 'rts'; }

  // PCs with the memory to run StarCraft
  canRunStarcraft(i) { return this.pcs[i].ram >= RAM.starcraft; }
  starcraftBoxes() { return this.pcs.filter((pc) => pc.ram >= RAM.starcraft).length; }
  // PCs in the room: the club's six and whichever benches are running
  pcCount() { return PC_COUNT + this.pcs.filter((pc) => pc.bench && pc.on).length; }
  isBench(i) { return !!this.pcs[i]?.bench; }
  ocTable(i) { return this.pcs[i].ocTable ?? OC; }

  tickNight() {
    for (const a of ANNOUNCEMENTS) {
      if (this.said.has(a.id) || this.clockMinutes() < a.at) continue;
      this.said.add(a.id);
      this.emit('announce', { id: a.id });
    }
  }

  // minutes since midnight of the party day, continuing past 24:00
  clockMinutes() { return this.start + this.now; }

  breakGap() { const [a, b] = SHARE_BREAK_EVERY; return a + this.rng() * (b - a); }

  /* ---- file sharing: the guy who goes around ---- */

  sharingCount() { return this.pcs.filter((pc) => pc.share === 'ok').length; }
  // a PC that is both sharing and reachable, which is what counts for swapping files
  sharing(i) { const pc = this.pcs[i]; return pc.share === 'ok' && !pc.crashed && this.pcPowered(i) && this.pcLinkUp(i); }
  swapRate() { // MB per second across the whole room
    const n = this.pcs.filter((_, i) => this.sharing(i)).length;
    return (n * (n - 1) / 2) * SWAP_MB_PER_SEC * NET[this.net].speed;
  }

  canFixShare(i) { const pc = this.pcs[i]; return pc.share === 'broken' && !pc.crashed && this.pcPowered(i) && this.pcLinkUp(i) && !this.fixes.has(i); }

  startFix(i) {
    if (!this.canFixShare(i)) return false;
    const failAt = this.rng() < SHARE_FAIL[this.net] ? Math.floor(this.rng() * SHARE_STEPS.length) : -1;
    this.fixes.set(i, { step: 0, t: 0, failAt, error: null, rebooted: false });
    this.emit('fix-start', { pc: i });
    return true;
  }

  fixProgress(i) {
    const f = this.fixes.get(i);
    return f ? (f.step + f.t / SHARE_STEPS[Math.min(f.step, SHARE_STEPS.length - 1)].secs) / SHARE_STEPS.length : 0;
  }
  rebooting(i) { const f = this.fixes.get(i); return !!f && !f.error && !!SHARE_STEPS[f.step]?.reboot; }
  dismissFix(i) { return this.fixes.delete(i); }

  breakShare(i, why) {
    const pc = this.pcs[i];
    if (pc.share !== 'ok') return false;
    pc.share = 'broken';
    this.emit('share-broken', { pc: i, why });
    return true;
  }

  tickShares(dt) {
    for (const [i, f] of [...this.fixes]) {
      if (f.error) continue;
      if (!this.pcLinkUp(i)) { f.error = SHARE_ERRORS[5]; this.emit('fix-failed', { pc: i, error: f.error }); continue; }
      const step = SHARE_STEPS[f.step];
      if (step.reboot && !f.rebooted) { // the PC goes down for a restart, burner or not
        f.rebooted = true;
        this.emit('pc-reboot', { pc: i });
        if (this.job?.pc === i) {
          this.job = null;
          this.coasters++;
          this.emit('coaster', { reason: 'reboot' });
        }
      }
      f.t += dt;
      if (f.step === f.failAt && f.t >= step.secs * 0.5) {
        f.error = SHARE_ERRORS[Math.floor(this.rng() * (SHARE_ERRORS.length - 1))];
        this.emit('fix-failed', { pc: i, error: f.error });
        continue;
      }
      if (f.t >= step.secs) {
        f.step++; f.t = 0; f.rebooted = false;
        if (f.step >= SHARE_STEPS.length) {
          this.pcs[i].share = 'ok';
          this.fixes.delete(i);
          this.emit('share-ok', { pc: i });
        }
      }
    }
    // shares come undone on their own
    if (this.now >= this.nextBreak) {
      const ok = this.pcs.map((pc, i) => i).filter((i) => this.pcs[i].share === 'ok');
      if (ok.length) this.breakShare(ok[Math.floor(this.rng() * ok.length)], SHARE_BREAKS[Math.floor(this.rng() * SHARE_BREAKS.length)]);
      this.nextBreak = this.now + this.breakGap();
    }
    // and while enough of them work, files go round
    this.swapped += this.swapRate() * dt;
    while (this.library < WAREZ.length && this.swapped >= WAREZ[this.library].mb) {
      this.emit('warez', { ...WAREZ[this.library], total: this.swapped });
      this.library++;
    }
  }

  knockGap() { const [a, b] = FAN.knockEvery; return a + this.rng() * (b - a); }

  /* ---- RAM from Singapore ---- */

  ramCost(n) { return n * RAM.sgPrice; }
  canSendBuddy(n = 1) { return this.buddy.state === 'home' && n >= 1 && n <= RAM.maxOrder && this.cash >= this.ramCost(n); }
  sendBuddy(n = 1) {
    if (!this.canSendBuddy(n)) return false;
    this.spend(this.ramCost(n));
    this.buddy = { state: 'away', sticks: n, back: this.now + RAM.tripMinutes };
    this.emit('buddy-away', { sticks: n });
    return true;
  }
  buddySecondsLeft() { return this.buddy.state === 'away' ? Math.max(0, (this.buddy.back - this.now) * SEC_PER_GAME_MIN) : 0; }

  collectRam() {
    if (this.buddy.state !== 'back') return false;
    this.sticks += this.buddy.sticks;
    const got = this.buddy.sticks;
    this.buddy = { state: 'home', sticks: 0, back: 0 };
    this.emit('ram-collected', { sticks: got });
    return true;
  }

  canFitRam(i) { return this.sticks > 0 && this.pcs[i].ram > 0 && this.pcs[i].ram + RAM.stick <= RAM.max; }
  fitRam(i) {
    if (!this.canFitRam(i)) return false;
    this.sticks--;
    this.pcs[i].ram += RAM.stick;
    this.emit('ram', { pc: i, mb: this.pcs[i].ram });
    return true;
  }

  /* ---- heat, the fan and the blue screen ---- */

  // -1 (fan facing the back row, PCs 1-3) to +1 (fan facing the front row, PCs 4-6)
  fanSweep() { return Math.sin(this.fan.phase); }

  // how much of the fan's blast PC i is getting right now. It sweeps, so never none and never all.
  fanFactor(i) {
    const side = LEAD.pcs.includes(i) ? 1 : -1;   // the benches are on the back table
    return 0.45 + 0.55 * Math.max(0, side * this.fanSweep());
  }

  setFan(on, why = 'switch') {
    if (this.fan.on === on) return false;
    this.fan.on = on;
    this.emit(on ? 'fan-on' : 'fan-off', { why });
    return true;
  }

  setOverclock(i, level) {
    const pc = this.pcs[i];
    pc.oc = Math.max(0, Math.min(this.ocTable(i).length - 1, level));
    this.emit('oc', { pc: i, level: pc.oc });
  }
  cycleOverclock(i) { this.setOverclock(i, (this.pcs[i].oc + 1) % this.ocTable(i).length); }

  reboot(i) {
    const pc = this.pcs[i];
    if (!pc.crashed) return false;
    pc.crashed = false;
    pc.heat = HEAT.afterReboot; // the case is still hot
    this.emit('reboot', { pc: i });
    return true;
  }

  tickHeat(dt) {
    if (this.fan.on) this.fan.phase += (dt * 2 * Math.PI) / FAN.period;
    this.pcs.forEach((pc, i) => {
      if (pc.boot > 0) pc.boot = Math.max(0, pc.boot - dt);
      if (!this.pcPowered(i)) { // no power: the case just cools, and nothing can crash
        pc.heat = Math.max(0, pc.heat - 0.5 * dt);
        pc.hot = false;
        return;
      }
      if (pc.crashed) return;
      let rate = this.ocTable(i)[pc.oc].heat;
      if (this.fan.on) rate -= FAN.cool * this.fanFactor(i);
      pc.heat = Math.max(0, Math.min(HEAT.crash, pc.heat + rate * dt));
      if (!pc.hot && pc.heat >= HEAT.warn) { pc.hot = true; this.emit('hot', { pc: i }); }
      if (pc.hot && pc.heat < HEAT.ok) pc.hot = false;
      if (pc.heat >= HEAT.crash) {
        pc.crashed = true;
        pc.hot = false;
        this.emit('crash', { pc: i });
        this.breakShare(i, 'crash');
        if (this.job?.pc === i) { // blue screen in the middle of a write
          this.job = null;
          this.coasters++;
          this.emit('coaster', { reason: 'crash' });
        }
      }
    });
    // somebody kicks the fan's plug out. Only worth a mention once someone's overclocked.
    if (this.now >= this.nextKnock) {
      if (this.fan.on && this.pcs.some((pc) => pc.oc > 0)) this.setFan(false, 'knocked');
      this.nextKnock = this.now + this.knockGap();
    }
  }

  faultGap() { const [a, b] = COAX_FAULT_EVERY; return a + this.rng() * (b - a); }

  /* ---- the network ---- */

  // coax is one shared cable: a single loose T-connector takes the whole segment down
  netDown() { return this.net === 'coax' && this.pcs.some((p) => p.linkDown); }
  pcLinkUp(i) {
    const pc = this.pcs[i];
    if (pc.bench && !pc.cabled) return false;   // no network lead fitted: it is on its own
    return this.net === 'coax' ? !this.netDown() : !pc.linkDown;
  }

  dropLink(i, why) {
    if (this.pcs[i].linkDown) return false;
    this.pcs[i].linkDown = true;
    this.emit('link-down', { pc: i, why });
    return true;
  }

  fixLink(i) {
    if (!this.pcs[i].linkDown) return false;
    this.pcs[i].linkDown = false;
    this.emit('link-up', { pc: i });
    return true;
  }

  /* ---- power: the extension lead to the front row ---- */

  pcPowered(i) { const pc = this.pcs[i]; return pc.bench ? pc.on : this.leadIn || !LEAD.pcs.includes(i); }
  pcBooting(i) { return this.pcs[i].boot > 0; }
  // the PCs that are dark right now
  deadPcs() { return LEAD.pcs.filter((i) => !this.pcPowered(i)); }

  // The plug comes out of the board. Everything on it loses power, and nothing it was doing survives: shares
  // are gone, a file sharing fix is cancelled, and a disc being written is a coaster.
  pullLead(why) {
    if (!this.leadIn) return false;
    this.leadIn = false;
    for (const i of LEAD.pcs) {
      const pc = this.pcs[i];
      pc.boot = 0;
      pc.hot = false;
      if (pc.share === 'ok') pc.share = 'broken';
      this.fixes.delete(i);
    }
    if (this.job && !this.pcPowered(this.job.pc)) {
      this.job = null;
      this.coasters++;
      this.emit('coaster', { reason: 'power' });
    }
    this.emit('power-down', { pcs: [...LEAD.pcs], why });
    return true;
  }

  // Back in the board: every box goes through its POST, and comes up cold and with a clean slate.
  plugLead() {
    if (this.leadIn) return false;
    this.leadIn = true;
    for (const i of LEAD.pcs) {
      const pc = this.pcs[i];
      pc.boot = LEAD.bootSeconds;
      pc.crashed = false;
      pc.heat = 0;
    }
    this.emit('power-up', { pcs: [...LEAD.pcs] });
    return true;
  }

  /* ---- the PC you built ---- */

  // Switched on and past its POST. ocTable: js/build.js ocFor(cpu); burnSpeed: the CD-R's write speed, 0 for none.
  benchOn(i, { ram, ocTable, burnSpeed = 0 }) {
    const pc = this.pcs[i];
    if (!pc?.bench || pc.on) return false;
    Object.assign(pc, { on: true, ram, ocTable, burnSpeed, oc: 0, heat: 0, crashed: false, hot: false, linkDown: false, share: 'broken', boot: 0 });
    this.emit('bench-on', { pc: i });
    return true;
  }

  // The plug came out, or somebody pressed the button: nothing it was doing survives
  benchOff(i, why = 'switch') {
    const pc = this.pcs[i];
    if (!pc?.bench || !pc.on) return false;
    pc.on = false; pc.hot = false; pc.crashed = false;
    if (pc.share === 'ok') pc.share = 'broken';
    this.fixes.delete(i);
    if (this.job?.pc === i) {
      this.job = null;
      this.coasters++;
      this.emit('coaster', { reason: 'power' });
    }
    this.emit('bench-off', { pc: i, why });
    return true;
  }

  // The network lead went in or came out
  benchCabled(i, cabled) {
    const pc = this.pcs[i];
    if (!pc?.bench || pc.cabled === cabled) return false;
    pc.cabled = cabled;
    pc.linkDown = false;
    if (!cabled && pc.share === 'ok') pc.share = 'broken';
    this.emit('bench-cable', { pc: i, cabled });
    return true;
  }

  // Someone has tripped on a cable lying across the floor. On a hub or switch that is one lead
  // out of one PC. On coax it is the cable to PC-06, the end that runs across the floor, and
  // that takes the whole segment down.
  tripOver(kind, pc) {
    if (kind === 'lead') { // the extension lead, across the aisle
      this.tripped++;
      const dropped = this.pullLead('tripped');
      this.emit('trip', { kind, pc: null, dropped });
      return dropped;
    }
    if (kind === 'fan') { // the fan's lead runs across the floor too
      this.tripped++;
      const dropped = this.setFan(false, 'tripped');
      this.emit('trip', { kind, pc: null, dropped });
      return dropped;
    }
    const i = kind === 'coax' ? PC_COUNT - 1 : pc;
    this.tripped++;
    const dropped = this.dropLink(i, 'tripped');
    this.emit('trip', { kind, pc: i, dropped });
    return dropped;
  }

  ordered(what) { return this.orders.some((o) => o.what === what); }
  secondsUntil(what) { const o = this.orders.find((x) => x.what === what); return !o ? 0 : o.at === Infinity ? PIZZA.delay * SEC_PER_GAME_MIN : Math.max(0, (o.at - this.now) * SEC_PER_GAME_MIN); }

  canOrderHub() { return this.net === 'coax' && !this.ordered('hub') && this.cash >= SHOP.hubCost; }
  orderHub() {
    if (!this.canOrderHub()) return false;
    this.spend(SHOP.hubCost);
    this.orders.push({ what: 'hub', at: this.now + SHOP.hubDelay });
    this.emit('order', { what: 'hub' });
    return true;
  }

  // the pizza place: one large pepperoni at a time
  canOrderPizza() { return !this.ordered('pizza') && this.cash >= PIZZA.cost; }
  orderPizza() {
    if (!this.canOrderPizza()) return false;
    this.spend(PIZZA.cost);
    this.orders.push({ what: 'pizza', at: Infinity }); // the oven starts when you hang up: see pizzaHungUp()
    this.emit('order', { what: 'pizza' });
    return true;
  }
  // the receiver goes down: now the Pizza Shack starts on it
  pizzaHungUp() {
    const o = this.orders.find((x) => x.what === 'pizza' && x.at === Infinity);
    if (o) o.at = this.now + PIZZA.delay;
  }

  // Dazza's dad works in IT for the government. He won't put a switch on a coax mess.
  canBorrowSwitch() { return this.net === 'hub' && !this.dadLent && !this.ordered('switch'); }
  borrowSwitch() {
    if (!this.canBorrowSwitch()) return false;
    this.orders.push({ what: 'switch', at: this.now + DAD.delay });
    this.emit('order', { what: 'switch' });
    return true;
  }

  setNet(net, reason) {
    this.net = net;
    for (const p of this.pcs) p.linkDown = false; // new gear, new cables
    this.emit('net', { net, reason });
  }

  emit(type, detail) { this.dispatchEvent(new CustomEvent(type, { detail })); }

  spend(amount) {
    if (this.cash < amount) return false;
    this.cash -= amount;
    this.emit('cash', this.cash);
    return true;
  }

  earn(amount) {
    this.cash += amount;
    this.emit('cash', this.cash);
  }

  /* ---- the CD burner ---- */

  // game minutes a burn takes: 74 minutes of disc at 2x is 37 minutes of waiting
  burnMinutes(speed = BURNER.speed) { return BURNER.discMinutes / speed; }

  // pc: the box with the burner in it, PC-04 or a bench with a CD-R of its own
  canBurn(pc = BURNER.pc) { return !this.job && this.cash >= BURNER.blankCost && this.pcPowered(pc) && this.burnSpeedOf(pc) > 0; }
  burnSpeedOf(pc = BURNER.pc) { return pc === BURNER.pc ? BURNER.speed : this.pcs[pc]?.burnSpeed ?? 0; }

  startBurn(kind = 'MIX', pc = BURNER.pc) {
    if (!DISCS[kind] || !this.canBurn(pc)) return false;
    this.spend(BURNER.blankCost);
    const mins = this.burnMinutes(this.burnSpeedOf(pc));
    this.job = { kind, left: mins, total: mins, abused: 0, pc, speed: this.burnSpeedOf(pc) };
    this.emit('burn-start', this.job);
    return true;
  }

  cancelBurn() {
    if (!this.job) return;
    this.job = null;
    this.coasters++;
    this.emit('coaster', { reason: 'cancelled' });
  }

  burnProgress() { return this.job ? 1 - this.job.left / this.job.total : 0; }

  // real seconds to go
  burnSecondsLeft() { return this.job ? this.job.left * SEC_PER_GAME_MIN : 0; }

  tickNetwork() {
    for (const o of [...this.orders]) {
      if (this.now < o.at) continue;
      this.orders.splice(this.orders.indexOf(o), 1);
      if (o.what === 'hub') this.setNet('hub', 'delivered');
      else if (o.what === 'pizza') { this.pizzas++; this.emit('pizza-arrive', { n: this.pizzas }); }
      else { this.dadLent = true; this.setNet('switch', 'delivered'); }
    }
    // coax: every so often a T-connector works itself loose somewhere along the cable
    if (this.net === 'coax' && this.now >= this.nextFault) {
      if (!this.netDown()) this.dropLink(Math.floor(this.rng() * PC_COUNT), 'loose');
      this.nextFault = this.now + this.faultGap();
    }
    // the switch goes back at 6:00 AM
    const clock = this.clockMinutes(); // keeps counting past midnight, so 6:00 AM is 24*60 + 360
    if (this.net === 'switch' && !this.warned && clock >= 24 * 60 + DAD.warnAt) { this.warned = true; this.emit('dad-warning'); }
    if (this.net === 'switch' && clock >= 24 * 60 + DAD.returnAt) this.setNet('hub', 'returned');
  }

  /* ---- time ---- */

  // dt in real seconds. ctx: { seatedPc } the PC the player is sitting at, or null.
  tick(dt, ctx = {}) {
    this.now += dt / SEC_PER_GAME_MIN;
    this.tickShares(dt);
    this.tickNight();
    this.tickNetwork();
    this.tickHeat(dt);
    if (this.buddy.state === 'away' && this.now >= this.buddy.back) {
      this.buddy.state = 'back';
      this.emit('buddy-back', { sticks: this.buddy.sticks });
    }
    if (this.job) {
      // sitting at the burner and playing DOOM starves the write buffer
      if (ctx.seatedPc === this.job.pc) {
        this.job.abused += dt;
        if (this.job.abused > BURNER.underrunSeconds) {
          this.job = null;
          this.coasters++;
          this.emit('coaster', { reason: 'underrun' });
          return;
        }
      }
      this.job.left -= dt / SEC_PER_GAME_MIN;
      if (this.job.left <= 0) {
        const kind = this.job.kind;
        this.job = null;
        this.discs++;
        this.earn(DISCS[kind].pays);
        this.emit('burn-done', { kind, pays: DISCS[kind].pays });
      }
    }
  }
}
