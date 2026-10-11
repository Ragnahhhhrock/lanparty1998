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

export const DISCS = {
  MIX: { name: 'MIX CD', pays: 10 },
};

export class Party extends EventTarget {
  constructor() {
    super();
    this.now = 0;          // game minutes since the doors opened
    this.cash = 150;
    this.discs = 0;        // discs burned and handed out
    this.coasters = 0;     // discs ruined
    this.job = null;       // the burn in progress: { kind, left, total, abused }
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

  /* ---- time ---- */

  // dt in real seconds. ctx: { seatedPc } the PC the player is sitting at, or null.
  tick(dt, ctx = {}) {
    this.now += dt / SEC_PER_GAME_MIN;
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
