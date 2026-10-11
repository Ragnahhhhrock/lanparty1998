// The logistics of a 1998 LAN: cash, the one CD burner, and (as the night goes on) the
// network, the heat, the RAM and the file sharing. DOM-free on purpose: main.js feeds it
// time and reads state back, so it can be tested in plain node.
export const SEC_PER_GAME_MIN = 10;   // one in-game minute is ten real seconds
export const PC_COUNT = 6;

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
export const DAD = { delay: 20, warnAt: 5 * 60 + 30, returnAt: 6 * 60 }; // the switch is on loan until 6:00 AM
export const COAX_FAULT_EVERY = [6, 12];                      // game minutes between dodgy T-connectors

// Overclocking: more MHz, more heat. A stock box cools down on its own; the others need the fan.
export const OC = [
  { label: 'Pentium II 300', mhz: 300, heat: -0.6 },
  { label: 'Pentium II 300 at 450 (100MHz bus)', mhz: 450, heat: 0.35 },
  { label: 'Pentium II 300 at 504 (112MHz bus, extra volts)', mhz: 504, heat: 0.8 },
];
export const FAN = { cool: 1.4, period: 14, knockEvery: [9, 16] }; // heat/s at best, seconds per sweep, game minutes between knocks
export const HEAT = { crash: 100, warn: 75, ok: 60, afterReboot: 70 };
export const celsius = (heat) => Math.round(28 + heat * 0.5);

export const DISCS = {
  MIX: { name: 'MIX CD', pays: 10 },
};

export class Party extends EventTarget {
  // startMinutes: the wall-clock minute (since midnight) the doors open. rng is injectable for tests.
  constructor({ startMinutes = 23 * 60 + 42, rng = Math.random } = {}) {
    super();
    this.start = startMinutes;
    this.rng = rng;
    this.now = 0;          // game minutes since the doors opened
    this.cash = 150;
    this.discs = 0;        // discs burned and handed out
    this.coasters = 0;     // discs ruined
    this.job = null;       // the burn in progress: { kind, left, total, abused }

    this.net = 'coax';     // coax -> hub -> (borrowed) switch
    this.pcs = Array.from({ length: PC_COUNT }, () => ({ linkDown: false, oc: 0, heat: 0, crashed: false, hot: false }));
    this.fan = { on: true, phase: 0 };
    this.nextKnock = this.now + this.knockGap();
    this.orders = [];      // things on their way: { what: 'hub' | 'switch', at }
    this.dadLent = false;  // the switch only goes on loan once
    this.warned = false;
    this.tripped = 0;      // times somebody has gone over a cable
    this.nextFault = this.now + this.faultGap();
  }

  // minutes since midnight of the party day, continuing past 24:00
  clockMinutes() { return this.start + this.now; }

  knockGap() { const [a, b] = FAN.knockEvery; return a + this.rng() * (b - a); }

  /* ---- heat, the fan and the blue screen ---- */

  // -1 (fan facing the back row, PCs 1-3) to +1 (fan facing the front row, PCs 4-6)
  fanSweep() { return Math.sin(this.fan.phase); }

  // how much of the fan's blast PC i is getting right now. It sweeps, so never none and never all.
  fanFactor(i) {
    const side = i < PC_COUNT / 2 ? -1 : 1;
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
    pc.oc = Math.max(0, Math.min(OC.length - 1, level));
    this.emit('oc', { pc: i, level: pc.oc });
  }
  cycleOverclock(i) { this.setOverclock(i, (this.pcs[i].oc + 1) % OC.length); }

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
      if (pc.crashed) return;
      let rate = OC[pc.oc].heat;
      if (this.fan.on) rate -= FAN.cool * this.fanFactor(i);
      pc.heat = Math.max(0, Math.min(HEAT.crash, pc.heat + rate * dt));
      if (!pc.hot && pc.heat >= HEAT.warn) { pc.hot = true; this.emit('hot', { pc: i }); }
      if (pc.hot && pc.heat < HEAT.ok) pc.hot = false;
      if (pc.heat >= HEAT.crash) {
        pc.crashed = true;
        pc.hot = false;
        this.emit('crash', { pc: i });
        if (i === BURNER.pc && this.job) { // blue screen in the middle of a write
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
  pcLinkUp(i) { return this.net === 'coax' ? !this.netDown() : !this.pcs[i].linkDown; }

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

  // Someone has tripped on a cable lying across the floor. On a hub or switch that is one lead
  // out of one PC. On coax it is the cable to PC-06, the end that runs across the floor, and
  // that takes the whole segment down.
  tripOver(kind, pc) {
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
  secondsUntil(what) { const o = this.orders.find((x) => x.what === what); return o ? Math.max(0, (o.at - this.now) * SEC_PER_GAME_MIN) : 0; }

  canOrderHub() { return this.net === 'coax' && !this.ordered('hub') && this.cash >= SHOP.hubCost; }
  orderHub() {
    if (!this.canOrderHub()) return false;
    this.spend(SHOP.hubCost);
    this.orders.push({ what: 'hub', at: this.now + SHOP.hubDelay });
    this.emit('order', { what: 'hub' });
    return true;
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
  burnMinutes() { return BURNER.discMinutes / BURNER.speed; }

  canBurn() { return !this.job && this.cash >= BURNER.blankCost; }

  startBurn(kind = 'MIX') {
    if (!DISCS[kind] || !this.canBurn()) return false;
    this.spend(BURNER.blankCost);
    this.job = { kind, left: this.burnMinutes(), total: this.burnMinutes(), abused: 0 };
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
    this.tickNetwork();
    this.tickHeat(dt);
    if (this.job) {
      // sitting at the burner and playing DOOM starves the write buffer
      if (ctx.seatedPc === BURNER.pc) {
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
