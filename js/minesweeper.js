// Minesweeper rules, with no DOM so `node tools/minesweeper.test.mjs` can test them.
// Like the original, the first square you open is never a mine, and the mines are laid after it.
export const LEVELS = {
  beginner: { w: 9, h: 9, mines: 10 },
  intermediate: { w: 16, h: 16, mines: 40 },
  expert: { w: 30, h: 16, mines: 99 },
};
export const MARK = { NONE: 0, FLAG: 1, QUESTION: 2 };

export class Board {
  constructor({ w, h, mines }, rng = Math.random) {
    this.w = w; this.h = h; this.mines = mines; this.rng = rng;
    this.reset();
  }

  reset() {
    const n = this.w * this.h;
    this.mine = new Uint8Array(n);
    this.count = new Uint8Array(n); // mines touching each square
    this.open = new Uint8Array(n);
    this.mark = new Uint8Array(n);
    this.state = 'ready'; // ready | playing | won | lost
    this.opened = 0;
    this.exploded = -1;
  }

  idx(x, y) { return y * this.w + x; }

  neighbours(i) {
    const x = i % this.w, y = (i - x) / this.w, out = [];
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      const nx = x + dx, ny = y + dy;
      if ((dx || dy) && nx >= 0 && ny >= 0 && nx < this.w && ny < this.h) out.push(this.idx(nx, ny));
    }
    return out;
  }

  get flags() { let n = 0; for (const m of this.mark) if (m === MARK.FLAG) n++; return n; }
  get minesLeft() { return this.mines - this.flags; }
  get over() { return this.state === 'won' || this.state === 'lost'; }

  layMines(safe) {
    const spots = [];
    for (let i = 0; i < this.mine.length; i++) if (i !== safe) spots.push(i);
    for (let k = 0; k < this.mines; k++) { // partial shuffle: the first `mines` entries are the mines
      const j = k + Math.floor(this.rng() * (spots.length - k));
      [spots[k], spots[j]] = [spots[j], spots[k]];
      this.mine[spots[k]] = 1;
    }
    for (let i = 0; i < this.mine.length; i++) {
      this.count[i] = this.neighbours(i).reduce((n, j) => n + this.mine[j], 0);
    }
  }

  reveal(x, y) {
    if (this.over) return;
    const start = this.idx(x, y);
    if (this.open[start] || this.mark[start] === MARK.FLAG) return;
    if (this.state === 'ready') { this.layMines(start); this.state = 'playing'; }
    if (this.mine[start]) {
      this.open[start] = 1; this.exploded = start; this.state = 'lost';
      return;
    }
    const queue = [start];
    while (queue.length) {
      const i = queue.pop();
      if (this.open[i] || this.mark[i] === MARK.FLAG || this.mine[i]) continue;
      this.open[i] = 1; this.mark[i] = MARK.NONE; this.opened++;
      if (this.count[i] === 0) queue.push(...this.neighbours(i));
    }
    if (this.opened === this.mine.length - this.mines) { // every safe square is open
      this.state = 'won';
      for (let i = 0; i < this.mine.length; i++) if (this.mine[i]) this.mark[i] = MARK.FLAG;
    }
  }

  // right click: nothing -> flag -> question mark -> nothing
  cycleMark(x, y, questions = true) {
    if (this.over) return;
    const i = this.idx(x, y);
    if (this.open[i]) return;
    const next = { [MARK.NONE]: MARK.FLAG, [MARK.FLAG]: questions ? MARK.QUESTION : MARK.NONE, [MARK.QUESTION]: MARK.NONE };
    this.mark[i] = next[this.mark[i]];
  }

  // click an opened number whose flags add up: open every other square around it
  chord(x, y) {
    if (this.state !== 'playing') return;
    const i = this.idx(x, y);
    if (!this.open[i] || this.count[i] === 0) return;
    const around = this.neighbours(i);
    if (around.filter((j) => this.mark[j] === MARK.FLAG).length !== this.count[i]) return;
    for (const j of around) this.reveal(j % this.w, Math.floor(j / this.w));
  }
}
