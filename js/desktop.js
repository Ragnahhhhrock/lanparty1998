// The desktop around the room: a Win95-style taskbar and Start menu, and windows you can
// drag, minimise, close and open again. The IRC channel and LANamp are windows on it, and so
// are the little programs in apps.js.
//
// An app is { id, title, icon, size: [w, h?], pos: [x, y]?, center?, build(ctx), menus(ctx)?, keep? }.
// build() fills ctx.body and may return { dispose() }. Apps are destroyed when closed unless
// `keep` is set; windows adopted from the page (IRC, LANamp) are only hidden.
import { icon } from './icons.js';

const $ = (id) => document.getElementById(id);
const make = (tag, cls, html) => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (html != null) e.innerHTML = html;
  return e;
};
const clamp = (v, lo, hi) => Math.min(Math.max(v, lo), hi);

const TITLE_BUTTONS = `<span class="w98-tbtns">
  <button type="button" class="w98-tbtn" data-act="min" aria-label="Minimise"><span class="tb-min"></span></button>
  <button type="button" class="w98-tbtn" data-act="close" aria-label="Close">×</button></span>`;

// A row of drop-down menus under a title bar: [{ label, items: [{ label, key?, run?, checked?(), disabled? } | { sep: true }] }]
export function menuBar(defs) {
  const bar = make('div', 'w98-menubar');
  bar.setAttribute('role', 'menubar');
  let current = -1;
  const away = (e) => { if (!bar.contains(e.target)) close(); };

  const menus = defs.map((def, i) => {
    const wrap = make('div', 'mb-top');
    const btn = make('button', 'mb-btn');
    btn.type = 'button';
    btn.textContent = def.label;
    btn.setAttribute('aria-haspopup', 'true');
    btn.setAttribute('aria-expanded', 'false');
    const list = make('ul', 'w98-popup');
    list.setAttribute('role', 'menu');
    list.hidden = true;
    const rows = def.items.map((it) => {
      const li = make('li');
      if (it.sep) { li.className = 'sm-sep'; li.setAttribute('role', 'separator'); list.append(li); return null; }
      const b = make('button', 'sm-item', `<span class="sm-check"></span><span class="sm-label"></span><span class="sm-key"></span>`);
      b.type = 'button';
      b.setAttribute('role', it.checked ? 'menuitemcheckbox' : 'menuitem');
      b.disabled = !!it.disabled;
      b.querySelector('.sm-label').textContent = it.label;
      b.querySelector('.sm-key').textContent = it.key ?? '';
      b.addEventListener('click', () => { close(); it.run?.(); });
      li.append(b);
      list.append(li);
      return { it, b };
    }).filter(Boolean);
    wrap.append(btn, list);
    btn.addEventListener('click', () => (current === i ? close() : show(i)));
    btn.addEventListener('mouseenter', () => { if (current >= 0 && current !== i) show(i); });
    bar.append(wrap);
    return { btn, list, rows };
  });

  function show(i) {
    close();
    current = i;
    const m = menus[i];
    for (const { it, b } of m.rows) {
      const on = !!it.checked?.();
      b.classList.toggle('on', on);
      if (it.checked) b.setAttribute('aria-checked', String(on));
    }
    m.list.hidden = false;
    m.btn.setAttribute('aria-expanded', 'true');
    m.btn.classList.add('open');
    document.addEventListener('pointerdown', away, true);
  }
  function close() {
    if (current < 0) return;
    const m = menus[current];
    m.list.hidden = true;
    m.btn.setAttribute('aria-expanded', 'false');
    m.btn.classList.remove('open');
    current = -1;
    document.removeEventListener('pointerdown', away, true);
  }
  bar.addEventListener('keydown', (e) => { if (e.key === 'Escape' && current >= 0) { e.stopPropagation(); close(); } });
  return { el: bar, close };
}

export class Desktop {
  constructor() {
    this.layer = $('desktop');
    this.tasks = $('tasks');
    this.startBtn = $('start-btn');
    this.menu = $('startmenu');
    this.apps = new Map();
    this.wins = new Map();
    this.zTop = 0;
    this.activeId = null;
    this.cascade = 0;
    this.msgCount = 0;
    this.onStart = () => {};

    this.startBtn.querySelector('.start-icon').innerHTML = icon('crt');
    this.startBtn.addEventListener('click', () => (this.menu.hidden ? this.openMenu() : this.closeMenu()));
    document.addEventListener('pointerdown', (e) => {
      if (!this.menu.hidden && !this.menu.contains(e.target) && !this.startBtn.contains(e.target)) this.closeMenu();
    }, true);
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && !this.menu.hidden) { e.stopPropagation(); this.closeMenu(); this.startBtn.focus(); }
    }, true);
    const speaker = $('tray-amp');
    if (speaker) {
      speaker.innerHTML = icon('speaker');
      speaker.addEventListener('click', () => this.toggle('lanamp'));
    }
    addEventListener('resize', () => this.clampAll());
  }

  /* ---------- apps and windows ---------- */

  // the windows that are open when you walk in (or switch the computer back on)
  start() {
    this.closeAll();
    if (innerWidth < 700) return; // not enough room beside the 3D view
    this.open('irc');
    this.open('lanamp');
  }

  define(app) { this.apps.set(app.id, app); return this; }

  // a window that is already in the page (the IRC channel, LANamp)
  adopt(id, root, app) {
    this.apps.set(id, { ...app, id, keep: true });
    const title = root.querySelector('.w98-title');
    title.insertAdjacentHTML('afterbegin', `<span class="w98-ticon">${icon(app.icon)}</span>`);
    title.insertAdjacentHTML('beforeend', TITLE_BUTTONS);
    root.classList.add('dwin', 'off');
    root.dataset.app = id;
    this.register(id, root);
    return this;
  }

  create(app) {
    const root = make('section', 'w98-window dwin off');
    root.dataset.app = app.id;
    root.dataset.ownsKeys = ''; // typing in here must not walk the player around
    root.setAttribute('role', 'group');
    root.setAttribute('aria-label', app.title);
    root.innerHTML = `<div class="w98-title"><span class="w98-ticon">${icon(app.icon)}</span><span class="w98-ttext"></span>${TITLE_BUTTONS}</div>`;
    root.querySelector('.w98-ttext').textContent = app.title;
    const body = make('div', 'dwin-body');
    const win = { menus: null };
    const ctx = {
      desktop: this, body, root,
      setTitle: (t) => { root.querySelector('.w98-ttext').textContent = t; win.task?.querySelector('.task-text').replaceChildren(t); },
      close: () => this.close(app.id),
      focus: () => this.focus(app.id),
    };
    const menus = app.menus?.(ctx);
    if (menus) { win.menus = menuBar(menus); root.append(win.menus.el); }
    root.append(body);
    if (app.size) { root.style.width = `${app.size[0]}px`; if (app.size[1]) root.style.height = `${app.size[1]}px`; }
    this.layer.append(root);
    win.dispose = app.build(ctx)?.dispose;
    return { root, win };
  }

  register(id, root, win = {}) {
    Object.assign(win, { id, root, state: 'closed', task: null });
    win.title = root.querySelector('.w98-title');
    win.title.addEventListener('pointerdown', (e) => this.startDrag(win, e));
    root.addEventListener('pointerdown', () => this.focus(id), true);
    root.querySelector('[data-act="min"]').addEventListener('click', () => this.minimise(id));
    root.querySelector('[data-act="close"]').addEventListener('click', () => this.close(id));
    this.wins.set(id, win);
    return win;
  }

  open(id) {
    const app = this.apps.get(id);
    if (!app) return;
    let win = this.wins.get(id);
    if (!win) {
      const made = this.create(app);
      win = this.register(id, made.root, made.win);
    }
    win.state = 'open';
    win.root.classList.remove('off');
    if (!win.task) win.task = this.addTask(win, app);
    this.focus(id);
    if (!win.placed) this.position(win, app);
    win.root.querySelector('[data-autofocus]')?.focus();
    app.onOpen?.(win);
  }

  position(win, app) {
    const r = win.root.getBoundingClientRect();
    if (!r.width) return; // still hidden: place it when it opens
    win.placed = true;
    if (app.center) {
      this.place(win, (innerWidth - r.width) / 2, (innerHeight - $('taskbar').offsetHeight - r.height) / 2);
    } else if (app.pos) {
      this.place(win, app.pos[0], app.pos[1]);
    } else if (!win.root.style.left && !win.root.style.top && getComputedStyle(win.root).position === 'absolute' && !app.keep) {
      const n = this.cascade++ % 8;
      this.place(win, 96 + n * 26, 64 + n * 26);
    } else {
      win.placed = true;
    }
  }

  close(id) {
    const win = this.wins.get(id);
    if (!win || win.state === 'closed') return;
    const app = this.apps.get(id);
    win.state = 'closed';
    win.root.classList.add('off');
    win.task?.remove();
    win.task = null;
    app.onClose?.(win);
    if (!app.keep) { win.dispose?.(); win.root.remove(); this.wins.delete(id); }
    if (app.transient) this.apps.delete(id);
    if (this.activeId === id) { this.activeId = null; this.focusTopmost(); }
    this.paint();
  }

  minimise(id) {
    const win = this.wins.get(id);
    if (!win || win.state !== 'open') return;
    win.state = 'min';
    win.root.classList.add('off');
    if (this.activeId === id) { this.activeId = null; this.focusTopmost(); }
    this.paint();
  }

  toggle(id) { // the I and M keys: show it, or put it away
    const win = this.wins.get(id);
    if (win?.state === 'open') this.close(id); else this.open(id);
  }

  isOpen(id) { return this.wins.get(id)?.state === 'open'; }

  closeAll() { for (const id of [...this.wins.keys()]) this.close(id); }

  focus(id) {
    const win = this.wins.get(id);
    if (!win || win.state === 'closed') return;
    if (win.state === 'min') { win.state = 'open'; win.root.classList.remove('off'); }
    win.root.style.zIndex = ++this.zTop;
    this.activeId = id;
    this.paint();
  }

  focusTopmost() {
    let best = null;
    for (const w of this.wins.values()) {
      if (w.state === 'open' && (!best || Number(w.root.style.zIndex) > Number(best.root.style.zIndex))) best = w;
    }
    if (best) { this.activeId = best.id; }
  }

  paint() {
    for (const w of this.wins.values()) {
      w.root.classList.toggle('active', w.id === this.activeId && w.state === 'open');
      w.task?.setAttribute('aria-pressed', String(w.id === this.activeId && w.state === 'open'));
    }
  }

  addTask(win, app) {
    const b = make('button', 'w98-task', `${icon(app.icon)}<span class="task-text"></span>`);
    b.type = 'button';
    b.querySelector('.task-text').textContent = win.root.querySelector('.w98-ttext')?.textContent ?? app.title;
    b.addEventListener('click', () => {
      if (win.state === 'min' || this.activeId !== win.id) this.focus(win.id);
      else this.minimise(win.id);
    });
    this.tasks.append(b);
    return b;
  }

  /* ---------- moving windows around ---------- */

  place(win, x, y) {
    const r = win.root.getBoundingClientRect();
    const maxY = innerHeight - $('taskbar').offsetHeight - 24;
    const s = win.root.style;
    s.left = `${Math.round(clamp(x, 96 - r.width, innerWidth - 96))}px`;
    s.top = `${Math.round(clamp(y, 0, maxY))}px`;
    s.right = 'auto';
    s.bottom = 'auto';
  }

  startDrag(win, e) {
    if (e.button !== 0 || e.target.closest('.w98-tbtns')) return;
    const r = win.root.getBoundingClientRect();
    const dx = e.clientX - r.left, dy = e.clientY - r.top;
    this.place(win, r.left, r.top); // pin it with left/top, whatever it was anchored to
    win.title.setPointerCapture(e.pointerId);
    win.root.classList.add('moving');
    const move = (ev) => this.place(win, ev.clientX - dx, ev.clientY - dy);
    const up = () => {
      win.root.classList.remove('moving');
      win.title.removeEventListener('pointermove', move);
      win.title.removeEventListener('pointerup', up);
      win.title.removeEventListener('pointercancel', up);
    };
    win.title.addEventListener('pointermove', move);
    win.title.addEventListener('pointerup', up);
    win.title.addEventListener('pointercancel', up);
    e.preventDefault();
  }

  clampAll() {
    for (const w of this.wins.values()) {
      if (w.state !== 'open' || !w.root.style.left) continue;
      const r = w.root.getBoundingClientRect();
      this.place(w, r.left, r.top);
    }
  }

  /* ---------- Start menu ---------- */

  // [{ app } | { label, icon, items } | { label, icon, open } | { sep: true } | { label, disabled }]
  setMenu(defs) {
    const banner = make('div', 'sm-banner', '<span><b>LAN Party</b> 98</span>');
    this.menu.replaceChildren(banner, this.buildList(defs, true));
  }

  buildList(defs, top = false) {
    const ul = make('ul', top ? 'sm-list sm-top' : 'sm-list sm-sub');
    ul.setAttribute('role', 'menu');
    for (const d of defs) {
      const li = make('li');
      if (d.sep) { li.className = 'sm-sep'; li.setAttribute('role', 'separator'); ul.append(li); continue; }
      const app = d.app ? this.apps.get(d.app) : null;
      const label = d.label ?? app?.title;
      const b = make('button', 'sm-item', `${d.disabled ? '<span class="sm-gap"></span>' : icon(d.icon ?? app?.icon, top ? 32 : 16)}<span class="sm-label"></span>`);
      b.type = 'button';
      b.setAttribute('role', 'menuitem');
      b.querySelector('.sm-label').textContent = label;
      b.disabled = !!d.disabled;
      if (d.items) {
        b.classList.add('has-sub');
        b.setAttribute('aria-haspopup', 'true');
        li.append(b, this.buildList(d.items));
      } else {
        li.append(b);
        b.addEventListener('click', () => { this.closeMenu(); this.open(d.app ?? d.open); });
      }
      ul.append(li);
    }
    return ul;
  }

  openMenu() {
    this.menu.hidden = false;
    this.startBtn.setAttribute('aria-expanded', 'true');
  }

  closeMenu() {
    this.menu.hidden = true;
    this.startBtn.setAttribute('aria-expanded', 'false');
  }

  /* ---------- the desktop's own message box ---------- */

  message({ title, text, kind = 'info', buttons = ['OK'], onChoose }) {
    const id = `message-${++this.msgCount}`;
    this.define({
      id, title, icon: kind, center: true, size: [340], transient: true,
      build: (ctx) => {
        ctx.body.classList.add('msg');
        ctx.body.innerHTML = `${icon(kind, 32)}<p></p><div class="w98-actions"></div>`;
        ctx.body.querySelector('p').textContent = text;
        const row = ctx.body.querySelector('.w98-actions');
        buttons.forEach((label, i) => {
          const btn = make('button', `w98-btn${i === 0 ? ' default' : ''}`);
          btn.type = 'button';
          btn.textContent = label;
          btn.addEventListener('click', () => { ctx.close(); onChoose?.(label); });
          row.append(btn);
        });
        setTimeout(() => row.querySelector('button')?.focus(), 60); // not at once: the Enter that opened this would press OK
      },
    });
    this.open(id);
  }
}
