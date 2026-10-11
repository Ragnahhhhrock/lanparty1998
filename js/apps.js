// The programs on the desktop: Internet Explorer, Minesweeper, Calculator, Notepad, Paint, an MS-DOS prompt, the
// defragmenter, Help, Run and Shut Down. The game windows (IRC, LANamp) are adopted from the page.
// Parody rule: nothing here uses a real brand's logo, and the file names are the party's own.
import { icon } from './icons.js';
import { Board, LEVELS, MARK } from './minesweeper.js';
import * as calc from './calc.js';
import { solitaire } from './app-solitaire.js';
import { downhill } from './app-ski.js';
import { ie } from './app-browser.js';
import { PAGE_LIST, parseUrl } from './web-pages.js';

const el = (tag, cls, html) => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (html != null) e.innerHTML = html;
  return e;
};
const css = getComputedStyle(document.documentElement);
const token = (name) => css.getPropertyValue(name).trim();
const about = (ctx, name, text) => ctx.desktop.message({ title: `About ${name}`, text, kind: 'info' });
const helpMenu = (name, text) => (ctx) => ({ label: 'Help', items: [{ label: `About ${name}`, run: () => about(ctx, name, text) }] });
const withExit = (ctx, items = []) => ({ label: 'File', items: [...items, ...(items.length ? [{ sep: true }] : []), { label: 'Exit', run: ctx.close }] });

/* ---------------------------------------------------------------- Minesweeper */

let mineLevel = 'beginner';
let mineQuestions = true;
const FACES = { ready: ':)', press: ':O', won: 'B)', lost: 'X(' };

const minesweeper = {
  id: 'mine', title: 'Minesweeper', icon: 'mine',
  menus: (ctx) => [
    {
      label: 'Game',
      items: [
        { label: 'New', key: 'F2', run: () => ctx.game.newGame() },
        { sep: true },
        ...Object.keys(LEVELS).map((k) => ({ label: k[0].toUpperCase() + k.slice(1), checked: () => mineLevel === k, run: () => { mineLevel = k; ctx.game.newGame(); } })),
        { sep: true },
        { label: 'Marks (?)', checked: () => mineQuestions, run: () => { mineQuestions = !mineQuestions; } },
        { sep: true },
        { label: 'Exit', run: ctx.close },
      ],
    },
    helpMenu('Minesweeper', 'Open every square that is not a mine. Right click flags a square, and the first square you open is always safe. Click a number to open around it once you have flagged that many.')(ctx),
  ],
  build(ctx) {
    const root = el('div', 'ms');
    const head = el('div', 'ms-head');
    const left = el('output', 'ms-led'), right = el('output', 'ms-led');
    left.setAttribute('aria-label', 'Mines left');
    right.setAttribute('aria-label', 'Seconds');
    const face = el('button', 'ms-face');
    face.type = 'button';
    face.setAttribute('aria-label', 'New game');
    head.append(left, face, right);
    const grid = el('div', 'ms-grid');
    grid.tabIndex = 0;
    grid.setAttribute('role', 'grid');
    grid.setAttribute('aria-label', 'Minesweeper board. Arrow keys move, Space opens, F flags.');
    root.append(head, grid);
    ctx.body.append(root);

    let board, cells = [], timer = 0, startedAt = 0, cursor = 0, pressing = false;
    const pad = (n) => (n < 0 ? `-${String(Math.min(99, -n)).padStart(2, '0')}` : String(Math.min(999, n)).padStart(3, '0'));
    const secs = () => (startedAt ? Math.min(999, Math.floor((performance.now() - startedAt) / 1000)) : 0);

    function newGame() {
      clearInterval(timer);
      timer = 0; startedAt = 0; cursor = 0;
      board = new Board(LEVELS[mineLevel]);
      grid.style.gridTemplateColumns = `repeat(${board.w}, 16px)`;
      cells = Array.from({ length: board.w * board.h }, (_, i) => { const c = el('div', 'ms-cell'); c.dataset.i = i; return c; });
      grid.replaceChildren(...cells);
      draw();
    }

    function draw() {
      const lost = board.state === 'lost';
      cells.forEach((c, i) => {
        let cls = 'ms-cell', html = '';
        if (board.open[i]) {
          cls += ' open';
          if (board.mine[i]) { html = icon('mine'); if (i === board.exploded) cls += ' boom'; }
          else if (board.count[i]) { html = String(board.count[i]); cls += ` n${board.count[i]}`; }
        } else if (lost && board.mine[i] && board.mark[i] !== MARK.FLAG) { cls += ' open'; html = icon('mine'); }
        else if (lost && board.mark[i] === MARK.FLAG && !board.mine[i]) { cls += ' open'; html = `${icon('mine')}<b class="ms-x">×</b>`; }
        else if (board.mark[i] === MARK.FLAG) html = icon('flag');
        else if (board.mark[i] === MARK.QUESTION) html = '?';
        if (i === cursor && document.activeElement === grid) cls += ' cur';
        if (c.className !== cls) c.className = cls;
        if (c._html !== html) { c.innerHTML = html; c._html = html; }
      });
      left.value = left.textContent = pad(board.minesLeft);
      right.value = right.textContent = pad(secs());
      face.textContent = board.state === 'won' ? FACES.won : lost ? FACES.lost : pressing ? FACES.press : FACES.ready;
      if (board.state === 'playing' && !timer) {
        startedAt = performance.now();
        timer = setInterval(() => { right.value = right.textContent = pad(secs()); }, 250);
      }
      if (board.over) { clearInterval(timer); timer = 0; right.value = right.textContent = pad(secs()); }
    }

    const at = (e) => { const c = e.target.closest('.ms-cell'); return c ? Number(c.dataset.i) : -1; };
    const xy = (i) => [i % board.w, Math.floor(i / board.w)];
    const act = (i, kind) => {
      const [x, y] = xy(i);
      if (kind === 'open') (board.open[i] ? board.chord(x, y) : board.reveal(x, y));
      else if (kind === 'flag') board.cycleMark(x, y, mineQuestions);
      else if (kind === 'chord') board.chord(x, y);
      cursor = i;
      draw();
    };
    grid.addEventListener('click', (e) => { const i = at(e); if (i >= 0) act(i, 'open'); });
    grid.addEventListener('contextmenu', (e) => { e.preventDefault(); const i = at(e); if (i >= 0) act(i, 'flag'); });
    grid.addEventListener('auxclick', (e) => { if (e.button === 1) { e.preventDefault(); const i = at(e); if (i >= 0) act(i, 'chord'); } });
    grid.addEventListener('pointerdown', (e) => { if (e.button === 0 && !board.over && at(e) >= 0) { pressing = true; draw(); } });
    addEventListener('pointerup', onUp);
    function onUp() { if (pressing) { pressing = false; if (board) draw(); } }
    grid.addEventListener('focus', draw);
    grid.addEventListener('blur', draw);
    grid.addEventListener('keydown', (e) => {
      const [x, y] = xy(cursor);
      const move = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[e.key];
      if (move) {
        e.preventDefault();
        cursor = Math.max(0, Math.min(board.h - 1, y + move[1])) * board.w + Math.max(0, Math.min(board.w - 1, x + move[0]));
        draw();
      } else if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); act(cursor, 'open'); }
      else if (e.key === 'f' || e.key === 'F') { e.preventDefault(); act(cursor, 'flag'); }
    });
    ctx.root.addEventListener('keydown', (e) => { if (e.key === 'F2') { e.preventDefault(); newGame(); } });
    face.addEventListener('click', newGame);

    ctx.game = { newGame };
    newGame();
    return { dispose() { clearInterval(timer); removeEventListener('pointerup', onUp); } };
  },
};

/* ------------------------------------------------------------------ Calculator */

const CALC_KEYS = [
  ['MC', 'MC', 'mem'], ['7', '7'], ['8', '8'], ['9', '9'], ['/', '/', 'op'], ['SQRT', 'sqrt', 'op'],
  ['MR', 'MR', 'mem'], ['4', '4'], ['5', '5'], ['6', '6'], ['*', '*', 'op'], ['PCT', '%', 'op'],
  ['MS', 'MS', 'mem'], ['1', '1'], ['2', '2'], ['3', '3'], ['-', '-', 'op'], ['INV', '1/x', 'op'],
  ['M+', 'M+', 'mem'], ['0', '0'], ['NEG', '+/-'], ['.', '.'], ['+', '+', 'op'], ['=', '=', 'op'],
];
const KEYMAP = { Enter: '=', '=': '=', Backspace: 'BACK', Delete: 'CE', Escape: 'C', ',': '.', '%': 'PCT', r: 'INV' };

const calculator = {
  id: 'calc', title: 'Calculator', icon: 'calc', size: [236], pos: [140, 90],
  menus: (ctx) => [
    withExit(ctx),
    { label: 'Edit', items: [{ label: 'Copy', key: 'Ctrl+C', run: () => navigator.clipboard?.writeText(ctx.calc.state.display).catch(() => {}) }] },
    helpMenu('Calculator', 'It does sums. Type with the keyboard if you like: digits, + - * /, Enter, Backspace, Esc.')(ctx),
  ],
  build(ctx) {
    ctx.body.classList.add('calc');
    const screen = el('output', 'calc-screen');
    screen.setAttribute('aria-live', 'polite');
    const mem = el('span', 'calc-mem');
    const top = el('div', 'calc-top');
    const keys = el('div', 'calc-keys');
    ctx.calc = { state: calc.initial() };
    const render = () => {
      const s = ctx.calc.state;
      screen.value = screen.textContent = s.error || s.display;
      mem.textContent = s.mem !== 0 ? 'M' : '';
    };
    const press = (k) => { ctx.calc.state = calc.press(ctx.calc.state, k); render(); };
    top.append(mem);
    for (const [k, label] of [['BACK', 'Back'], ['CE', 'CE'], ['C', 'C']]) {
      const b = el('button', 'w98-btn calc-key clr'); b.type = 'button'; b.textContent = label;
      b.addEventListener('click', () => press(k));
      top.append(b);
    }
    for (const [k, label, kind] of CALC_KEYS) {
      const b = el('button', `w98-btn calc-key ${kind ?? 'num'}`); b.type = 'button'; b.textContent = label;
      b.setAttribute('aria-label', { SQRT: 'Square root', PCT: 'Percent', INV: 'Reciprocal', NEG: 'Plus or minus' }[k] ?? label);
      b.addEventListener('click', () => press(k));
      keys.append(b);
    }
    ctx.body.append(screen, top, keys);
    ctx.root.addEventListener('keydown', (e) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const k = /^[0-9.+\-*/]$/.test(e.key) ? e.key : KEYMAP[e.key];
      if (k) { e.preventDefault(); press(k); }
    });
    ctx.root.tabIndex = -1;
    render();
  },
  onOpen: (win) => win.root.focus({ preventScroll: true }),
};

/* --------------------------------------------------------------------- Notepad */

const notepad = {
  id: 'notepad', title: 'Untitled - Notepad', icon: 'notepad', size: [420, 300], pos: [180, 110], resize: true,
  menus: (ctx) => [
    withExit(ctx, [{ label: 'New', run: () => { ctx.text.value = ''; ctx.text.focus(); } }]),
    {
      label: 'Edit',
      items: [
        { label: 'Select All', run: () => { ctx.text.focus(); ctx.text.select(); } },
        { label: 'Time/Date', key: 'F5', run: () => ctx.stamp() },
      ],
    },
    helpMenu('Notepad', 'Plain text, no formatting. Nothing is saved when you close it: this is a basement, not an office.')(ctx),
  ],
  build(ctx) {
    const text = el('textarea', 'np-text');
    text.spellcheck = false;
    text.setAttribute('aria-label', 'Text');
    text.setAttribute('data-autofocus', '');
    ctx.body.classList.add('np');
    ctx.body.append(text);
    ctx.text = text;
    ctx.stamp = () => {
      const t = ctx.desktop.gameTime?.() ?? '';
      text.setRangeText(`${t} 7/2/98`, text.selectionStart, text.selectionEnd, 'end');
      text.focus();
    };
    text.addEventListener('keydown', (e) => { if (e.key === 'F5') { e.preventDefault(); ctx.stamp(); } });
  },
};

/* ----------------------------------------------------------------------- Paint */

const PAINT_COLOURS = ['--crt-black', '--w98-light', '--w98-shadow', '--w98-face', '--volt', '--volt-yellow', '--link-led', '--neon-blue',
  '--w98-title', '--w98-desktop', '--nacho', '--neon-pink', '--neon-green', '--wood', '--floppy-blue', '--beige'];
const PAINT_TOOLS = { pen: { label: 'Pencil', size: 1 }, brush: { label: 'Brush', size: 4 }, eraser: { label: 'Eraser', size: 10 }, fill: { label: 'Fill' } };
const rgb = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));

const paint = {
  id: 'paint', title: 'untitled - Paint', icon: 'paint', size: [452], pos: [210, 70], resize: true, min: [240, 200],
  menus: (ctx) => [
    withExit(ctx, [{ label: 'New', run: () => ctx.paint.clear() }]),
    helpMenu('Paint', 'Draw something. The Fill tool paints a closed shape. Nothing is saved when you close it.')(ctx),
  ],
  build(ctx) {
    const W = 360, H = 240;
    ctx.body.classList.add('pt');
    ctx.body.innerHTML = `<div class="pt-main"><div class="pt-tools" role="radiogroup" aria-label="Tools"></div><canvas class="pt-canvas" width="${W}" height="${H}" aria-label="Drawing"></canvas></div>
      <div class="pt-bottom"><span class="pt-cur" aria-label="Current colour"></span><div class="pt-palette" role="radiogroup" aria-label="Colours"></div></div>`;
    const canvas = ctx.body.querySelector('canvas'), g = canvas.getContext('2d', { willReadFrequently: true });
    const tools = ctx.body.querySelector('.pt-tools'), palette = ctx.body.querySelector('.pt-palette'), cur = ctx.body.querySelector('.pt-cur');
    let tool = 'pen', colour = token('--crt-black');
    const white = token('--w98-light');
    const clear = () => { g.fillStyle = white; g.fillRect(0, 0, W, H); };
    clear();
    ctx.paint = { clear };

    for (const [key, t] of Object.entries(PAINT_TOOLS)) {
      const b = el('button', 'w98-btn pt-tool'); b.type = 'button'; b.textContent = t.label;
      b.setAttribute('role', 'radio'); b.setAttribute('aria-checked', String(key === tool));
      b.addEventListener('click', () => { tool = key; for (const o of tools.children) o.setAttribute('aria-checked', String(o === b)); });
      tools.append(b);
    }
    const pick = (hex, btn) => { colour = hex; cur.style.background = hex; for (const o of palette.children) o.setAttribute('aria-checked', String(o === btn)); };
    PAINT_COLOURS.forEach((name, i) => {
      const hex = token(name);
      const b = el('button', 'pt-swatch'); b.type = 'button'; b.style.background = hex;
      b.setAttribute('role', 'radio'); b.setAttribute('aria-label', name.replace('--', '').replace(/-/g, ' '));
      b.addEventListener('click', () => pick(hex, b));
      palette.append(b);
      if (i === 0) pick(hex, b);
    });

    const dab = (x, y, size, hex) => { g.fillStyle = hex; g.fillRect(x - (size >> 1), y - (size >> 1), size, size); };
    const line = (x0, y0, x1, y1, size, hex) => { // Bresenham, so the lines stay crisp
      const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
      let err = dx + dy;
      for (;;) {
        dab(x0, y0, size, hex);
        if (x0 === x1 && y0 === y1) break;
        const e2 = 2 * err;
        if (e2 >= dy) { err += dy; x0 += sx; }
        if (e2 <= dx) { err += dx; y0 += sy; }
      }
    };
    const flood = (sx, sy, hex) => {
      const img = g.getImageData(0, 0, W, H), d = img.data, to = rgb(hex);
      const at = (x, y) => (y * W + x) * 4;
      const from = d.slice(at(sx, sy), at(sx, sy) + 3);
      if (from[0] === to[0] && from[1] === to[1] && from[2] === to[2]) return;
      const same = (i) => d[i] === from[0] && d[i + 1] === from[1] && d[i + 2] === from[2];
      const stack = [[sx, sy]];
      while (stack.length) {
        const [x, y] = stack.pop();
        if (!same(at(x, y))) continue;
        let l = x, r = x;
        while (l > 0 && same(at(l - 1, y))) l--;
        while (r < W - 1 && same(at(r + 1, y))) r++;
        for (let i = l; i <= r; i++) {
          const k = at(i, y); d[k] = to[0]; d[k + 1] = to[1]; d[k + 2] = to[2];
          if (y > 0 && same(at(i, y - 1))) stack.push([i, y - 1]);
          if (y < H - 1 && same(at(i, y + 1))) stack.push([i, y + 1]);
        }
      }
      g.putImageData(img, 0, 0);
    };

    let last = null;
    const pos = (e) => {
      const r = canvas.getBoundingClientRect();
      return [Math.max(0, Math.min(W - 1, Math.floor((e.clientX - r.left) * (W / r.width)))), Math.max(0, Math.min(H - 1, Math.floor((e.clientY - r.top) * (H / r.height))))];
    };
    canvas.addEventListener('pointerdown', (e) => {
      if (e.button !== 0) return;
      const [x, y] = pos(e);
      if (tool === 'fill') { flood(x, y, colour); return; }
      canvas.setPointerCapture(e.pointerId);
      last = [x, y];
      const t = PAINT_TOOLS[tool];
      dab(x, y, t.size, tool === 'eraser' ? white : colour);
    });
    canvas.addEventListener('pointermove', (e) => {
      if (!last) return;
      const [x, y] = pos(e), t = PAINT_TOOLS[tool];
      line(last[0], last[1], x, y, t.size, tool === 'eraser' ? white : colour);
      last = [x, y];
    });
    const stop = () => { last = null; };
    canvas.addEventListener('pointerup', stop);
    canvas.addEventListener('pointercancel', stop);
  },
};

/* ------------------------------------------------------------------ MS-DOS prompt */

const DIRS = {
  'C:\\': [
    ['AUTOEXEC', 'BAT', 128, '07-02-98', '7:30p'], ['COMMAND', 'COM', 93890, '05-11-98', '9:50a'], ['CONFIG', 'SYS', 212, '07-02-98', '7:30p'],
    ['CURLZ', 'TXT', 187, '07-02-98', '8:51p'], ['DESCENT', null, '<DIR>', '07-02-98', '7:30p'], ['DOOM', null, '<DIR>', '07-02-98', '7:30p'],
    ['HERETIC', null, '<DIR>', '07-02-98', '7:30p'], ['HEXEN', null, '<DIR>', '07-02-98', '7:30p'], ['LANPARTY', 'EXE', 412160, '07-02-98', '7:30p'],
    ['NACHOZ', 'TXT', 641, '07-02-98', '8:14p'], ['QUAKE', null, '<DIR>', '07-02-98', '7:30p'], ['VOLT', 'TXT', 233, '07-02-98', '9:02p'],
  ],
  'C:\\DOOM': [
    ['DOOM', 'EXE', 709404, '12-10-94', '3:00a'], ['DOOM1', 'WAD', 4196020, '12-10-94', '3:00a'], ['IPXSETUP', 'EXE', 33124, '12-10-94', '3:00a'],
    ['SETUP', 'EXE', 88420, '12-10-94', '3:00a'],
  ],
  'C:\\HERETIC': [
    ['HERETIC', 'EXE', 728031, '06-28-95', '1:02a'], ['HERETIC1', 'WAD', 5120920, '06-28-95', '1:02a'], ['IPXSETUP', 'EXE', 17971, '12-24-94', '12:17a'],
    ['SETUP', 'EXE', 47096, '06-28-95', '1:02a'],
  ],
  'C:\\HEXEN': [
    ['HEXEN', 'EXE', 875885, '10-18-95', '12:52a'], ['HEXEN', 'WAD', 10644136, '10-18-95', '1:32a'], ['IPXSETUP', 'EXE', 18003, '10-02-95', '12:59a'],
    ['SETUP', 'EXE', 47682, '10-14-95', '1:37p'],
  ],
  'C:\\QUAKE': [
    ['CWSDPMI', 'EXE', 25920, '10-01-96', '2:30p'], ['ID1', null, '<DIR>', '07-02-98', '7:30p'], ['QUAKE', 'EXE', 404480, '09-30-96', '2:59a'],
    ['README', 'TXT', 19087, '10-01-96', '2:30p'],
  ],
  'C:\\DESCENT': [
    ['DESCENT', 'EXE', 1034693, '01-06-95', '4:16p'], ['DESCENT', 'HOG', 2339773, '01-06-95', '4:16p'], ['DESCENT', 'PIG', 2529454, '01-06-95', '4:16p'],
    ['README', 'TXT', 50047, '01-06-95', '4:16p'], ['SETUP', 'EXE', 390221, '01-06-95', '4:16p'],
  ],
};
const FILES = {
  'VOLT.TXT': ['VOLT COLA: the caffeine you are not supposed to run out of.', 'There is a crate by the snack table. It is not enough.'],
  'NACHOZ.TXT': ['NACHOZ: orange dust, sold in bags of 400g.', 'Do not touch the keyboard until you have wiped your hands.'],
  'CURLZ.TXT': ['CHEEZ CURLZ: crunchy orange fingers, sold in bags of 300g.', 'They leave a trail. Use a napkin or use the mouse, not both.'],
  'CONFIG.SYS': ['DEVICE=C:\\WINDOWS\\HIMEM.SYS', 'DEVICE=C:\\WINDOWS\\EMM386.EXE NOEMS', 'DOS=HIGH,UMB', 'FILES=40', 'BUFFERS=20'],
  'AUTOEXEC.BAT': ['@ECHO OFF', 'SET BLASTER=A220 I5 D1 T4', 'PATH C:\\;C:\\DOOM;C:\\HERETIC;C:\\HEXEN;C:\\QUAKE;C:\\DESCENT', 'LH C:\\WINDOWS\\COMMAND\\MSCDEX.EXE /D:MSCD001'],
};
const BANNER = 'LAN PARTY OS [Version 4.10.1998]\n(C)Copyright nobody 1981-1998.\n\nType HELP for a list of commands.\n';

const dosPrompt = {
  id: 'dos', title: 'MS-DOS Prompt', icon: 'dos', size: [560, 340], pos: [120, 80], resize: true, min: [240, 120],
  build(ctx) {
    ctx.body.classList.add('dos');
    ctx.body.innerHTML = '<pre class="dos-out"></pre><div class="dos-line"><span class="dos-prompt"></span><input class="dos-in" data-autofocus maxlength="80" autocomplete="off" spellcheck="false" aria-label="Command line"></div>';
    const out = ctx.body.querySelector('.dos-out'), input = ctx.body.querySelector('.dos-in'), promptEl = ctx.body.querySelector('.dos-prompt');
    let cwd = 'C:\\', history = [], h = 0;
    const print = (text = '') => { out.append(`${text}\n`); while (out.textContent.split('\n').length > 400) out.firstChild.remove(); out.scrollTop = out.scrollHeight; };
    const setPrompt = () => { promptEl.textContent = `${cwd}>`; };
    const clock = () => {
      const [t = '7:30', ap = 'PM'] = (ctx.desktop.gameTime?.() ?? '7:30 PM').split(' ');
      return { t, ap: ap[0].toLowerCase() };
    };
    const num = (n) => (typeof n === 'number' ? n.toLocaleString('en-US') : n);
    const listing = () => {
      const rows = DIRS[cwd] ?? [];
      print(' Volume in drive C has no label\n Volume Serial Number is 1998-0207\n Directory of ' + cwd + '\n');
      for (const [n, ext, size, date, time] of rows) print(`${n.padEnd(9)}${(ext ?? '').padEnd(4)}${num(size).toString().padStart(14)} ${date} ${time}`);
      const bytes = rows.reduce((a, r) => a + (typeof r[2] === 'number' ? r[2] : 0), 0);
      print(`\n   ${rows.filter((r) => r[1]).length} file(s)  ${num(bytes).padStart(14)} bytes\n   ${num(1073217536).padStart(33)} bytes free`);
    };
    const COMMANDS = {
      help: () => print('CD      Change directory\nCLS     Clear the screen\nDATE    Show the date\nDIR     List the files here\nECHO    Print a message\nEXIT    Close this window\nIPCONFIG  Show the network card\nMEM     Show memory\nPING    Try a PC on the hub\nTIME    Show the time\nTYPE    Show a text file\nVER     Show the version\nVOL     Show the disk label'),
      cls: () => { out.textContent = ''; },
      ver: () => print('LAN PARTY OS [Version 4.10.1998]'),
      vol: () => print(' Volume in drive C has no label\n Volume Serial Number is 1998-0207'),
      echo: (a) => print(a),
      date: () => print('Current date is Sat 02-07-1998'),
      time: () => { const { t, ap } = clock(); print(`Current time is ${t}:00.00${ap}`); },
      dir: listing,
      cd: (a) => {
        const to = a.trim().toUpperCase().replace(/\\$/, '');
        if (!to) print(cwd);
        else if (to === '..' || to === '\\') cwd = 'C:\\';
        else if (cwd === 'C:\\' && DIRS['C:\\' + to]) cwd = 'C:\\' + to;
        else print('Invalid directory');
        setPrompt();
      },
      type: (a) => {
        const f = a.trim().toUpperCase();
        if (!f) print('Required parameter missing');
        else if (FILES[f]) FILES[f].forEach(print);
        else print('File not found - ' + f);
      },
      mem: () => print('\n  655360 bytes total conventional memory\n  655360 bytes available to MS-DOS\n  583008 largest executable program size\n\n 16777216 bytes total contiguous extended memory\n'),
      ipconfig: () => print('\nIPX/SPX and TCP/IP on this hub:\n\n   Adapter . . . . . . . . : 10BASE-T Ethernet\n   IP Address. . . . . . . : 10.0.0.7\n   Subnet Mask . . . . . . : 255.255.255.0\n'),
      ping: (a) => {
        const host = a.trim() || '10.0.0.1';
        print(`\nPinging ${host} with 32 bytes of data:\n`);
        for (let i = 0; i < 4; i++) print(`Reply from ${host}: bytes=32 time<10ms TTL=128`);
      },
      exit: () => ctx.close(),
    };
    const run = (line) => {
      print(`${cwd}>${line}`);
      const [cmd = '', ...rest] = line.trim().split(/\s+/);
      const name = cmd.toLowerCase();
      if (!name) return;
      if (COMMANDS[name]) COMMANDS[name](rest.join(' '));
      else if (['doom', 'heretic', 'hexen', 'quake', 'descent'].includes(name) && cwd === 'C:\\' + name.toUpperCase()) print('Not enough memory.');
      else print('Bad command or file name');
    };
    print(BANNER);
    setPrompt();
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') { const v = input.value; input.value = ''; if (v.trim()) { history.push(v); h = history.length; } run(v); }
      else if (e.key === 'ArrowUp' && h > 0) { e.preventDefault(); input.value = history[--h]; }
      else if (e.key === 'ArrowDown') { e.preventDefault(); input.value = h < history.length - 1 ? history[++h] : ((h = history.length), ''); }
    });
    ctx.body.addEventListener('pointerdown', () => queueMicrotask(() => input.focus()));
  },
};

/* ------------------------------------------------------------ Disk Defragmenter */

const defrag = {
  id: 'defrag', title: 'Disk Defragmenter', icon: 'defrag', size: [372], pos: [160, 120],
  menus: (ctx) => [withExit(ctx), helpMenu('Disk Defragmenter', 'Moves every file to the front of the disk so it reads faster. There is no way to make DOOM load faster. People say there is.')(ctx)],
  build(ctx) {
    const COLS = 44, ROWS = 9, B = 8;
    ctx.body.classList.add('df');
    ctx.body.innerHTML = `<p>Drive C:</p><canvas class="df-map" width="${COLS * B}" height="${ROWS * B}" aria-hidden="true"></canvas>
      <div class="bar"><i class="df-fill"></i></div><p class="df-status" role="status">0% Complete</p>
      <div class="w98-actions"><button type="button" class="w98-btn default df-go">Start</button><button type="button" class="w98-btn df-stop" disabled>Stop</button></div>`;
    const canvas = ctx.body.querySelector('canvas'), g = canvas.getContext('2d');
    const fill = ctx.body.querySelector('.df-fill'), status = ctx.body.querySelector('.df-status');
    const go = ctx.body.querySelector('.df-go'), stop = ctx.body.querySelector('.df-stop');
    const COLOUR = [token('--w98-light'), token('--w98-title2'), token('--w98-title'), token('--volt'), token('--link-led')];
    const FREE = 0, USED = 1, DONE = 2, READ = 3, WRITE = 4;
    let cells, w, used, timer = 0, flash = [];
    const reset = () => {
      cells = Array.from({ length: COLS * ROWS }, () => (Math.random() < 0.58 ? USED : FREE));
      used = cells.filter((c) => c === USED).length;
      w = 0;
      paintAll();
    };
    const paintAll = () => {
      cells.forEach((c, i) => { g.fillStyle = COLOUR[c]; g.fillRect((i % COLS) * B, Math.floor(i / COLS) * B, B - 1, B - 1); });
      const pct = used ? Math.round((Math.min(w, used) / used) * 100) : 100;
      fill.style.width = `${pct}%`;
      status.textContent = `${pct}% Complete`;
    };
    const step = () => {
      for (const i of flash) if (cells[i] === READ || cells[i] === WRITE) cells[i] = cells[i] === WRITE ? DONE : FREE;
      flash = [];
      let r = w;
      while (r < cells.length && cells[r] !== USED) r++;
      if (r >= cells.length) { finish(); return; }
      if (r !== w) { cells[r] = READ; cells[w] = WRITE; flash = [r, w]; }
      else { cells[w] = DONE; }
      w++;
      paintAll();
    };
    const finish = () => {
      clearInterval(timer); timer = 0;
      cells = cells.map((c) => (c === READ ? FREE : c === WRITE ? DONE : c));
      paintAll();
      go.textContent = 'Start'; go.disabled = false; stop.disabled = true;
      ctx.desktop.message({ title: 'Disk Defragmenter', text: 'Defragmentation of drive C: is complete.', kind: 'info' });
      reset();
    };
    go.addEventListener('click', () => {
      if (timer) { clearInterval(timer); timer = 0; go.textContent = 'Resume'; return; }
      timer = setInterval(step, 140);
      go.textContent = 'Pause'; stop.disabled = false;
    });
    stop.addEventListener('click', () => { clearInterval(timer); timer = 0; go.textContent = 'Start'; stop.disabled = true; reset(); });
    reset();
    return { dispose() { clearInterval(timer); } };
  },
};

/* ------------------------------------------------------------------------ Help */

const help = {
  id: 'help', title: 'LAN Party Help', icon: 'help', size: [440], pos: [150, 70], resize: true, min: [240, 140],
  build(ctx) {
    ctx.body.classList.add('help');
    ctx.body.innerHTML = `<h2>Getting around</h2>
      <table class="keys">
        <tr><td><kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd></td><td>Walk, with the mouse to look</td></tr>
        <tr><td><kbd>E</kbd> <kbd>F</kbd></td><td>Use what you are looking at · open a PC's case</td></tr>
        <tr><td><kbd>T</kbd></td><td>Chat (shows up in #lanparty98)</td></tr>
        <tr><td><kbd>I</kbd> <kbd>M</kbd> <kbd>H</kbd></td><td>Show or hide the IRC window · LANamp · Internet Explorer</td></tr>
        <tr><td><kbd>Tab</kbd></td><td>Free the mouse to use the taskbar and windows</td></tr>
        <tr><td><kbd>\`</kbd></td><td>Stand up from your PC</td></tr>
      </table>
      <h2>The desktop</h2>
      <p>Drag a window by its title bar. The <b>_</b> button puts it on the taskbar and the <b>×</b> closes it. Everything on the Programs menu is a real little program. Click the 3D room to get the mouse back for walking.</p>`;
  },
};

/* ------------------------------------------------------------------- Run, Shut Down */

const RUN = {
  calc: 'calc', calculator: 'calc', notepad: 'notepad', mspaint: 'paint', paint: 'paint', winmine: 'mine', minesweeper: 'mine', sol: 'sol', solitaire: 'sol', ski: 'ski', downhill: 'ski',
  command: 'dos', 'command.com': 'dos', defrag: 'defrag', mirc: 'irc', mirc32: 'irc', lanamp: 'lanamp', help: 'help',
  iexplore: 'ie', ie: 'ie', 'internet explorer': 'ie',
};

// an address typed into Run opens in Internet Explorer: http://lanparty1998.com, www.lanparty1998.com, lanparty1998.com/news.htm
const isAddress = (s) => /^(https?:\/\/|www\.)/i.test(s) || /^[a-z0-9-]+(\.[a-z0-9-]+)+(\/|$)/i.test(s);

const run = {
  id: 'run', title: 'Run', icon: 'run', size: [370], center: true,
  build(ctx) {
    ctx.body.classList.add('run');
    ctx.body.innerHTML = `${icon('run', 32)}<p>Type the name of a program, folder or document, and LAN Party will open it for you.</p>
      <label class="run-open">Open: <input class="run-in" data-autofocus maxlength="60" autocomplete="off" spellcheck="false"></label>
      <div class="w98-actions"><button type="button" class="w98-btn default run-ok">OK</button><button type="button" class="w98-btn run-cancel">Cancel</button></div>`;
    const input = ctx.body.querySelector('.run-in');
    const go = () => {
      const typed = input.value.trim();
      if (!typed) return;
      const name = typed.toLowerCase().replace(/^"|"$/g, '').replace(/\.exe$/, '');
      const app = RUN[name];
      ctx.close();
      if (app) ctx.desktop.open(app);
      else if (isAddress(name)) ctx.desktop.open('ie', parseUrl(name).url);
      else ctx.desktop.message({ title: typed, kind: 'error', text: `Cannot find the file '${typed}' (or one of its components). Make sure the path and filename are correct and that all required libraries are available.` });
    };
    ctx.body.querySelector('.run-ok').addEventListener('click', go);
    ctx.body.querySelector('.run-cancel').addEventListener('click', ctx.close);
    input.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); go(); } else if (e.key === 'Escape') ctx.close(); });
  },
};

function powerScreen(text, done, auto) {
  const screen = el('div', 'power-screen');
  screen.tabIndex = 0;
  screen.setAttribute('role', 'alertdialog');
  screen.setAttribute('aria-label', text);
  screen.textContent = text;
  const off = () => { screen.remove(); done(); };
  document.body.append(screen);
  if (auto) setTimeout(off, auto);
  else { screen.addEventListener('click', off); screen.addEventListener('keydown', off); screen.focus(); }
}

const shutdown = {
  id: 'shutdown', title: 'Shut Down Windows', icon: 'crt', size: [340], center: true,
  build(ctx) {
    ctx.body.classList.add('run');
    ctx.body.innerHTML = `${icon('crt', 32)}<p>What do you want the computer to do?</p>
      <fieldset class="sd-opts"><legend class="sr-only">Choose one</legend>
        <label><input type="radio" name="sd" value="off" checked> Shut down the computer?</label>
        <label><input type="radio" name="sd" value="restart"> Restart the computer?</label>
        <label><input type="radio" name="sd" value="dos"> Restart the computer in MS-DOS mode?</label></fieldset>
      <div class="w98-actions"><button type="button" class="w98-btn default sd-yes" data-autofocus>Yes</button><button type="button" class="w98-btn sd-no">No</button></div>`;
    ctx.body.querySelector('.sd-no').addEventListener('click', ctx.close);
    ctx.body.querySelector('.sd-yes').addEventListener('click', () => {
      const choice = ctx.body.querySelector('input[name="sd"]:checked').value;
      const d = ctx.desktop;
      d.closeAll();
      if (choice === 'off') powerScreen("It's now safe to turn off your computer.", () => d.start());
      else if (choice === 'restart') powerScreen('Restarting the computer...', () => d.start(), 1800);
      else powerScreen('Restarting in MS-DOS mode...', () => d.open('dos'), 1800);
    });
  },
};

/* --------------------------------------------------------------- the Start menu */

const MENU = [
  {
    label: 'Programs', icon: 'programs',
    items: [
      { app: 'ie' },
      { sep: true },
      { label: 'Accessories', icon: 'folder', items: [{ app: 'calc' }, { app: 'dos' }, { app: 'notepad' }, { app: 'paint' }] },
      { label: 'Games', icon: 'folder', items: [{ app: 'mine' }, { app: 'sol' }, { app: 'ski' }] },
      { label: 'System Tools', icon: 'folder', items: [{ app: 'defrag' }] },
      { sep: true },
      { app: 'irc', label: 'mIRC' },
      { app: 'lanamp', label: 'LANamp' },
    ],
  },
  {
    label: 'Favorites', icon: 'star',
    items: PAGE_LIST.map((p) => ({ app: 'ie', arg: p.url, label: p.title, icon: 'page' })),
  },
  {
    label: 'Documents', icon: 'doc',
    // Decoys: they have no app and do nothing when clicked.
    items: [
      { label: 'definitely not homework.doc', icon: 'doc' },
      { label: 'Dazza owes me $20.txt', icon: 'doc' },
      { label: 'cheat codes (DO NOT SHARE).txt', icon: 'doc' },
      { label: 'Resume_FINAL_v7_REAL.doc', icon: 'doc' },
      { label: 'frag list - who to camp.xls', icon: 'doc' },
      { label: 'love letter to Jenny (unsent).doc', icon: 'doc' },
      { label: 'Volt Cola stash inventory.xls', icon: 'doc' },
      { label: 'Mum says be home by 10.txt', icon: 'doc' },
      { label: 'why is my modem screaming.txt', icon: 'doc' },
      { label: 'New Text Document (47).txt', icon: 'doc' },
    ],
  },
  { app: 'help', label: 'Help', icon: 'help' },
  { open: 'run', label: 'Run...', icon: 'run' },
  { sep: true },
  { open: 'shutdown', label: 'Shut Down...', icon: 'crt' },
];

export function registerApps(desktop, { irc, lanamp, gameTime }) {
  desktop.gameTime = gameTime;
  desktop.adopt('irc', irc, { title: 'mIRC32 - [#lanparty98]', icon: 'irc', resize: true, min: [260, 140] });
  desktop.adopt('lanamp', lanamp, { title: 'LANamp 2.0', icon: 'amp' });
  for (const app of [ie, minesweeper, solitaire, downhill, calculator, notepad, paint, dosPrompt, defrag, help, run, shutdown]) desktop.define(app);
  desktop.setMenu(MENU);
}
