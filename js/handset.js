// The candy-bar mobile on the desk at PC-02, with no DOM so `node tools/phone.test.mjs` can test it.
// A Handset is the phone's brain: which screen it is on, what each key does there, and what it wants played.
// js/phone.js is the plastic around it (the keys, the LCD, the keyboard) and plays the sounds it asks for.
//
// Keys, as press(key): '0'..'9', '*', '#', 'menu' (the big left key: Menu, Select, Call, End), 'up', 'down',
// 'left', 'right' and 'clear' (the C key: back, backspace, hang up).
// Events, as drain(): { type: 'key' | 'ring' | 'engaged' | 'hangup' | 'handoff' | 'snake', ... }.
import { Snake } from './snake.js';
import { callPlan, engagedPlan } from './tones.js';

// Everybody the basement can ring. The wall phone and the mobile share this book.
export const CONTACTS = [
  { id: 'pizza', name: 'Pizza Shack', number: '9555 0173' },
  { id: 'dazza', name: 'Dazza', number: '9555 0199' },
  { id: 'mum', name: 'Mum', number: '9555 0100' },
];
const digitsOf = (s) => String(s).replace(/\D/g, '');
export const contactFor = (number) => CONTACTS.find((c) => digitsOf(c.number) === digitsOf(number)) ?? null;
export const formatNumber = (digits) => {
  const d = digitsOf(digits);
  return d.length > 4 ? `${d.slice(0, 4)} ${d.slice(4)}` : d;
};

export const MAX_DIGITS = 12;
export const CARRIER = 'CROSSFONE';
export const MENU = ['Snake', 'Phone book'];
export const CALL_MS = callPlan('', { digits: false }).duration * 1000;   // ringing, then somebody answers
export const ENGAGED_MS = engagedPlan().duration * 1000;
const MUM_SAYS = ['Mum: "Why are you', 'ringing me? I am', 'upstairs. Is that', 'the phone I hear?"'];
const SNAKE_KEYS = { up: 'up', down: 'down', left: 'left', right: 'right', 2: 'up', 8: 'down', 4: 'left', 6: 'right' };

export class Handset {
  constructor({ clock = () => '11:42 PM', rand = Math.random, best = 0 } = {}) {
    this.clock = clock;
    this.snake = new Snake(rand);
    this.snake.best = best;
    this.events = [];
    this.go('home');
  }

  go(screen) {
    this.screen = screen;
    if (screen === 'home') { this.number = ''; this.contact = null; }
    if (screen === 'menu') this.menuAt = this.menuAt ?? 0;
    if (screen === 'book') this.bookAt = this.bookAt ?? 0;
    if (screen === 'snake') { this.snake.reset(); this.snakeState = 'ready'; this.acc = 0; }
  }

  // ---- keys
  press(key) {
    const k = String(key);
    this.emit({ type: 'key', key: k });
    switch (this.screen) {
      case 'home': return this.onHome(k);
      case 'menu': return this.onMenu(k);
      case 'book': return this.onBook(k);
      case 'dial': return this.onDial(k);
      case 'calling': case 'talk': return k === 'menu' || k === 'clear' ? this.hangUp() : undefined;
      case 'engaged': return this.hangUp();
      case 'snake': return this.onSnake(k);
    }
  }

  onHome(k) {
    if (k === 'menu') this.go('menu');
    else if (/^[0-9*#]$/.test(k)) { this.number = k; this.screen = 'dial'; }
  }

  onMenu(k) {
    if (k === 'up') this.menuAt = (this.menuAt + MENU.length - 1) % MENU.length;
    else if (k === 'down') this.menuAt = (this.menuAt + 1) % MENU.length;
    else if (k === 'clear') this.go('home');
    else if (k === 'menu') this.go(this.menuAt === 0 ? 'snake' : 'book');
    else if (k === '1') { this.menuAt = 0; this.go('snake'); }
    else if (k === '2') { this.menuAt = 1; this.go('book'); }
  }

  onBook(k) {
    if (k === 'up') this.bookAt = (this.bookAt + CONTACTS.length - 1) % CONTACTS.length;
    else if (k === 'down') this.bookAt = (this.bookAt + 1) % CONTACTS.length;
    else if (k === 'clear') this.go('menu');
    else if (k === 'menu') this.call(CONTACTS[this.bookAt].number);
  }

  onDial(k) {
    if (k === 'clear') {
      this.number = this.number.slice(0, -1);
      if (!this.number) this.go('home');
    } else if (k === 'menu') {
      if (this.number) this.call(this.number);
    } else if (/^[0-9*#]$/.test(k) && this.number.length < MAX_DIGITS) this.number += k;
  }

  onSnake(k) {
    const s = this.snake;
    if (this.snakeState === 'ready') {
      if (k === 'clear') this.go('menu');
      else if (k === 'menu' || k === '5') this.startSnake();
      else if (SNAKE_KEYS[k]) { this.startSnake(); s.turn(SNAKE_KEYS[k]); }
    } else if (this.snakeState === 'play' || this.snakeState === 'paused') {
      if (k === 'clear') this.go('menu');
      else if (k === 'menu' || k === '5') this.snakeState = this.snakeState === 'play' ? 'paused' : 'play';
      else if (SNAKE_KEYS[k]) { this.snakeState = 'play'; s.turn(SNAKE_KEYS[k]); }
    } else if (k === 'clear') this.go('menu');
    else if (k === 'menu' || k === '5') this.startSnake();
  }

  startSnake() {
    this.snake.reset();
    this.snakeState = 'play';
    this.acc = 0;
    this.emit({ type: 'snake', sound: 'start' });
  }

  // ---- calls
  call(number) {
    this.number = digitsOf(number);
    this.contact = contactFor(number);
    this.screen = 'calling';
    this.left = this.contact ? CALL_MS : CALL_MS * 0.6; // a number nobody has rings a little, then gives up
    this.emit({ type: 'ring', number: this.number, contact: this.contact });
  }

  hangUp() {
    this.emit({ type: 'hangup' });
    this.go('home');
  }

  // ---- time: dt in milliseconds
  tick(dt) {
    if (this.screen === 'snake' && this.snakeState === 'play') {
      const s = this.snake;
      this.acc += dt;
      while (this.acc >= s.interval && s.state === 'play') {
        this.acc -= s.interval;
        s.step();
      }
      for (const name of s.drain()) this.emit({ type: 'snake', sound: name, score: s.score });
      if (s.state !== 'play') this.snakeState = 'over';
    } else if (this.screen === 'calling') {
      this.left -= dt;
      if (this.left <= 0) {
        if (!this.contact) { this.screen = 'engaged'; this.left = ENGAGED_MS; this.emit({ type: 'engaged' }); }
        else if (this.contact.id === 'mum') { this.screen = 'talk'; this.emit({ type: 'answered', contact: this.contact }); }
        else this.emit({ type: 'handoff', contact: this.contact });
      }
    } else if (this.screen === 'engaged') {
      this.left -= dt;
      if (this.left <= 0) this.hangUp();
    }
  }

  emit(e) { this.events.push(e); }

  drain() {
    const e = this.events;
    this.events = [];
    return e;
  }

  // ---- what the LCD shows: { kind: 'text', title, lines: [{ text, on }], soft } or { kind: 'snake', ... }
  view() {
    const pick = (items, at, max = 3) => { // a window of a list that keeps the chosen row on screen
      const from = Math.min(Math.max(0, at - (max - 1)), Math.max(0, items.length - max));
      return items.slice(from, from + max).map((text, i) => ({ text, on: from + i === at }));
    };
    switch (this.screen) {
      case 'home': return { kind: 'text', title: CARRIER, big: this.clock(), lines: [], soft: 'Menu' };
      case 'menu': return { kind: 'text', title: 'Menu', lines: pick(MENU.map((m, i) => `${i + 1} ${m}`), this.menuAt), soft: 'Select' };
      case 'book': return { kind: 'text', title: 'Phone book', lines: pick(CONTACTS.map((c) => c.name), this.bookAt), soft: 'Call' };
      case 'dial': return { kind: 'text', title: 'Number', big: formatNumber(this.number), lines: [], soft: 'Call' };
      case 'calling': return { kind: 'text', title: this.contact?.name ?? formatNumber(this.number), lines: [{ text: 'Calling...' }], soft: 'End' };
      case 'engaged': return { kind: 'text', title: formatNumber(this.number), lines: [{ text: 'Engaged' }], soft: 'End' };
      case 'talk': return { kind: 'text', title: this.contact.name, lines: MUM_SAYS.map((text) => ({ text })), soft: 'End' };
      case 'snake': {
        const s = this.snake;
        const score = String(s.score).padStart(4, '0');
        const over = this.snakeState === 'over';
        return {
          kind: 'snake', score, best: String(s.best).padStart(4, '0'), state: this.snakeState,
          note: this.snakeState === 'ready' ? ['SNAKE', 'Press 5'] : this.snakeState === 'paused' ? ['PAUSED'] : over ? [s.state === 'won' ? 'YOU WIN' : 'GAME OVER', `SCORE ${score}`, s.score >= s.best && s.score > 0 ? 'NEW BEST' : `BEST ${String(s.best).padStart(4, '0')}`] : null,
        };
      }
    }
  }
}
