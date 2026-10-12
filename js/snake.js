// Snake: the game on the candy-bar phone. No DOM, so `node tools/phone.test.mjs` can test it.
// A snake crawls round a small board. Eat the food and it grows; hit a wall or yourself and it is over. Every fifth
// bit of food a bug appears for a few seconds, and the quicker you catch it the more it is worth. The board is
// 28 x 13 cells: the phone's 84 x 39 pixels, three to a cell.
export const COLS = 28;
export const ROWS = 13;
export const FOOD_POINTS = 7;
export const BONUS_EVERY = 5;   // a bug after this many bits of food
export const BONUS_TICKS = 40;  // how long it stays; each tick left is a point
const START_LEN = 3;

export const DIRS = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
};
const OPPOSITE = { up: 'down', down: 'up', left: 'right', right: 'left' };

export class Snake {
  constructor(rand = Math.random) {
    this.rand = rand;
    this.best = 0;
    this.reset();
  }

  reset() {
    const y = Math.floor(ROWS / 2);
    this.body = Array.from({ length: START_LEN }, (_, i) => ({ x: 8 - i, y })); // head first, heading right
    this.heading = 'right';
    this.queue = [];             // turns pressed since the last tick, so a quick left-up still turns twice
    this.score = 0;
    this.eaten = 0;
    this.state = 'play';         // play | over | won
    this.cause = null;           // wall | self | full
    this.bonus = null;           // { x, y, left } while a bug is out
    this.events = [];            // what just happened, for the sound; the caller drains it
    this.grow = 0;
    this.food = this.place();
  }

  // a free cell, picked at random
  place() {
    const taken = new Set(this.body.map((c) => `${c.x},${c.y}`));
    if (this.food) taken.add(`${this.food.x},${this.food.y}`);
    if (this.bonus) taken.add(`${this.bonus.x},${this.bonus.y}`);
    const free = [];
    for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) if (!taken.has(`${x},${y}`)) free.push({ x, y });
    return free.length ? free[Math.floor(this.rand() * free.length)] : null;
  }

  // Turn. The snake can't reverse into itself, and two quick turns are both kept.
  turn(dir) {
    if (this.state !== 'play' || !(dir in DIRS)) return;
    const last = this.queue.length ? this.queue[this.queue.length - 1] : this.heading;
    if (dir === last || dir === OPPOSITE[last]) return;
    if (this.queue.length < 2) this.queue.push(dir);
  }

  // How long a tick is, in ms: it gets quicker as you eat, down to a floor.
  get interval() { return Math.max(70, 150 - this.eaten * 3); }

  step() {
    if (this.state !== 'play') return;
    if (this.queue.length) this.heading = this.queue.shift();
    const d = DIRS[this.heading];
    const head = { x: this.body[0].x + d.x, y: this.body[0].y + d.y };

    if (head.x < 0 || head.y < 0 || head.x >= COLS || head.y >= ROWS) return this.end('wall');
    const eating = this.food && head.x === this.food.x && head.y === this.food.y;
    // the tail moves out of the way this tick unless the snake is growing
    const solid = this.grow > 0 || eating ? this.body : this.body.slice(0, -1);
    if (solid.some((c) => c.x === head.x && c.y === head.y)) return this.end('self');

    this.body.unshift(head);
    if (this.grow > 0) this.grow--; else if (!eating) this.body.pop();

    if (eating) {
      this.score += FOOD_POINTS;
      this.eaten++;
      this.events.push('eat');
      this.food = null;
      this.food = this.place();
      if (this.eaten % BONUS_EVERY === 0 && !this.bonus) {
        const spot = this.place();
        if (spot) this.bonus = { ...spot, left: BONUS_TICKS };
      }
      if (!this.food) return this.end('full');
    } else if (this.bonus && head.x === this.bonus.x && head.y === this.bonus.y) {
      this.score += this.bonus.left;
      this.events.push('bonus');
      this.bonus = null;
    }

    if (this.bonus && --this.bonus.left <= 0) this.bonus = null;
  }

  end(cause) {
    this.cause = cause;
    this.state = cause === 'full' ? 'won' : 'over';
    this.best = Math.max(this.best, this.score);
    this.events.push(this.state === 'won' ? 'won' : 'die');
  }

  drain() {
    const e = this.events;
    this.events = [];
    return e;
  }
}
