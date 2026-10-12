// The mobile phone from the desk at PC-02, held up in front of you: a candy-bar handset with a green LCD, a navigation
// row and a keypad. What it does is in js/handset.js (and Snake in js/snake.js); this is the plastic and the sound.
// Keyboard: 0-9 * # work as the keypad, arrows or W A S D move, Enter or Space is the big left key, Backspace is C,
// Esc backs out (and puts the phone down from the home screen). 2 4 6 8 steer the snake as well.
import { Handset, CONTACTS } from './handset.js';
import { KEYS } from './tones.js';
import { COLS, ROWS } from './snake.js';
import * as sfx from './sfx.js';

export { CONTACTS };
const BEST_KEY = 'lan98.snake';
const readBest = () => { try { return Number(localStorage.getItem(BEST_KEY)) || 0; } catch { return 0; } };
const saveBest = (n) => { try { localStorage.setItem(BEST_KEY, String(n)); } catch { /* private window */ } };

const LETTERS = { 2: 'ABC', 3: 'DEF', 4: 'GHI', 5: 'JKL', 6: 'MNO', 7: 'PQRS', 8: 'TUV', 9: 'WXYZ' };
const CELL = 3;                                  // LCD pixels per snake cell
const PAD = 1;                                   // the frame round the board
const BOARD_W = COLS * CELL + PAD * 2, BOARD_H = ROWS * CELL + PAD * 2;

const root = document.getElementById('phone');
let handset = null, opts = null, raf = 0, last = 0, ring = null, shown = '', el = null, ink = '', paper = '';

export const isOpen = () => handset !== null;

function build() {
  root.innerHTML = `
    <div class="phone-wrap">
      <div class="phone-shell" role="dialog" aria-label="Nokka 51 mobile phone">
        <div class="phone-brand">NOKKA</div>
        <div class="phone-lcd">
          <div class="lcd-bar"><span class="lcd-title"></span><span class="lcd-signal" aria-hidden="true"><i></i><i></i><i></i><i></i></span></div>
          <div class="lcd-big"></div>
          <div class="lcd-lines"></div>
          <canvas class="lcd-board" width="${BOARD_W}" height="${BOARD_H}" hidden></canvas>
          <div class="lcd-note" hidden></div>
          <div class="lcd-soft"></div>
        </div>
        <div class="phone-nav">
          <button type="button" class="phone-key phone-menu" data-key="menu">Menu</button>
          <button type="button" class="phone-key" data-key="up" aria-label="Up">&#9650;</button>
          <button type="button" class="phone-key" data-key="down" aria-label="Down">&#9660;</button>
          <button type="button" class="phone-key" data-key="clear" aria-label="Clear">C</button>
        </div>
        <div class="phone-pad">${KEYS.map((k) => `<button type="button" class="phone-key phone-digit" data-key="${k}"><b>${k}</b><small>${LETTERS[k] ?? ''}</small></button>`).join('')}</div>
      </div>
      <button type="button" class="w98-btn default phone-down">Put it down <kbd>Esc</kbd></button>
    </div>`;
  const q = (s) => root.querySelector(s);
  el = {
    title: q('.lcd-title'), big: q('.lcd-big'), lines: q('.lcd-lines'), board: q('.lcd-board'), note: q('.lcd-note'), soft: q('.lcd-soft'),
    ctx: q('.lcd-board').getContext('2d'), lcd: q('.phone-lcd'),
  };
  root.querySelectorAll('[data-key]').forEach((b) => b.addEventListener('click', () => press(b.dataset.key)));
  q('.phone-down').addEventListener('click', () => close());
}

export function open(options = {}) {
  if (handset) return;
  opts = options;
  if (!el) build();
  handset = new Handset({ clock: opts.clock, best: readBest() });
  const css = getComputedStyle(root);
  ink = css.getPropertyValue('--lcd-ink').trim();
  paper = css.getPropertyValue('--lcd').trim();
  root.hidden = false;
  shown = '';
  render();
  last = performance.now();
  raf = requestAnimationFrame(frame);
  root.querySelector('.phone-menu').focus({ preventScroll: true });
}

// result is passed to done: nothing, or { call: contact } when a call connected to somebody who is not on the phone
export function close(result) {
  if (!handset) return;
  stopRing();
  cancelAnimationFrame(raf);
  handset = null;
  root.hidden = true;
  const done = opts?.done;
  opts = null;
  done?.(result);
}

function press(key) {
  if (!handset) return;
  handset.press(key);
  handle();
  if (handset) render();
}

function stopRing() { ring?.stop(); ring = null; }

// play what the handset asked for
function handle() {
  for (const e of handset.drain()) {
    if (e.type === 'key') {
      if (/^[0-9*#]$/.test(e.key)) sfx.phoneKey(e.key); else sfx.phoneBlip(620, 0.03, 0.1);
    } else if (e.type === 'ring') {
      stopRing();
      ring = sfx.dialCall(e.number, { digits: false });
      opts?.onEvent?.(e);
    } else if (e.type === 'engaged') {
      stopRing();
      ring = sfx.engaged();
    } else if (e.type === 'answered') {
      stopRing();
      sfx.receiverClick();
    } else if (e.type === 'hangup') {
      stopRing();
      sfx.receiverClick();
    } else if (e.type === 'handoff') {
      stopRing();
      sfx.receiverClick();
      close({ call: e.contact });
      return;
    } else if (e.type === 'snake') {
      if (e.sound === 'eat') sfx.snakeEat();
      else if (e.sound === 'bonus') sfx.snakeBonus();
      else if (e.sound === 'start') sfx.snakeStart();
      else if (e.sound === 'die' || e.sound === 'won') {
        sfx.snakeDie();
        saveBest(handset.snake.best);
        opts?.onEvent?.({ ...e, eaten: handset.snake.eaten });
      }
    }
  }
}

function frame(now) {
  if (!handset) return;
  const dt = Math.min(now - last, 100);
  last = now;
  handset.tick(dt);
  handle();
  if (!handset) return; // a call went through and closed the phone
  render();
  raf = requestAnimationFrame(frame);
}

function render() {
  const v = handset.view();
  const text = v.kind === 'text';
  const sig = JSON.stringify(text ? v : [v.kind, v.score, v.best, v.state, v.note]);
  if (text && sig === shown) return;
  shown = text ? sig : '';
  el.lcd.dataset.mode = v.kind;
  el.board.hidden = text;
  el.big.hidden = !(text && v.big);
  el.lines.hidden = !text;
  el.soft.hidden = !text;
  if (text) {
    el.title.textContent = v.title;
    el.big.textContent = v.big ?? '';
    el.lines.replaceChildren(...v.lines.map((l) => {
      const d = document.createElement('div');
      d.textContent = l.text;
      if (l.on) d.className = 'on';
      return d;
    }));
    el.soft.textContent = v.soft;
    el.note.hidden = true;
    return;
  }
  el.title.textContent = `${v.score}  BEST ${v.best}`;
  el.note.hidden = !v.note;
  el.note.replaceChildren(...(v.note ?? []).map((t) => { const d = document.createElement('div'); d.textContent = t; return d; }));
  drawBoard();
}

// the board, a snake cell at a time (CELL x CELL LCD pixels); the ink colour is the --lcd-ink token
function drawBoard() {
  const { ctx } = el;
  const s = handset.snake;
  ctx.clearRect(0, 0, BOARD_W, BOARD_H);
  ctx.fillStyle = ink;
  ctx.fillRect(0, 0, BOARD_W, 1); ctx.fillRect(0, BOARD_H - 1, BOARD_W, 1);
  ctx.fillRect(0, 0, 1, BOARD_H); ctx.fillRect(BOARD_W - 1, 0, 1, BOARD_H);
  const cell = (x, y) => ctx.fillRect(PAD + x * CELL, PAD + y * CELL, CELL, CELL);
  const dots = (x, y) => { // food: a plus sign
    const px = PAD + x * CELL, py = PAD + y * CELL;
    ctx.fillRect(px + 1, py, 1, CELL); ctx.fillRect(px, py + 1, CELL, 1);
  };
  s.body.forEach((c, i) => {
    cell(c.x, c.y);
    if (i === 0) { // the head has an eye
      ctx.fillStyle = paper;
      ctx.fillRect(PAD + c.x * CELL + 1, PAD + c.y * CELL + 1, 1, 1);
      ctx.fillStyle = ink;
    }
  });
  if (s.food) dots(s.food.x, s.food.y);
  if (s.bonus && (s.bonus.left > 12 || Math.floor(performance.now() / 160) % 2 === 0)) {
    cell(s.bonus.x, s.bonus.y); // the bug is a block with a hole in it, blinking as it runs out of time
    ctx.clearRect(PAD + s.bonus.x * CELL + 1, PAD + s.bonus.y * CELL + 1, 1, 1);
  }
}

const KEYMAP = {
  ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right',
  w: 'up', s: 'down', a: 'left', d: 'right', W: 'up', S: 'down', A: 'left', D: 'right',
  Enter: 'menu', ' ': 'menu', Backspace: 'clear', c: 'clear', C: 'clear',
};
window.addEventListener('keydown', (e) => {
  if (!handset) return;
  if (e.ctrlKey || e.metaKey || e.altKey) return;
  if (e.key === 'Escape') {
    e.preventDefault(); e.stopImmediatePropagation();
    if (handset.screen === 'home') close(); else press('clear');
    return;
  }
  if (e.key === 'Tab') return; // keep the keyboard way round the buttons
  const key = KEYMAP[e.key] ?? (KEYS.includes(e.key) ? e.key : null);
  if (!key) return;
  e.preventDefault(); e.stopImmediatePropagation();
  if (e.repeat && !['up', 'down', 'left', 'right'].includes(key)) return;
  press(key);
}, true);
