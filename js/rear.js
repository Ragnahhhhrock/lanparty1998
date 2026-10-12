// "Behind the PC": the panel that opens when you look at the back of your tower. Every lead on the list is plugged in
// here: the video lead, keyboard, mouse, sound, the three power leads into the power board, the board into the wall, and
// the network. The rules are js/bench-plan.js; the 3D cables are js/bench.js. This is only the buttons.
const GROUPS = [
  ['video', 'Video'], ['input', 'Keyboard and mouse'], ['audio', 'Sound'], ['power', 'Power'], ['net', 'Network'],
];

const el = (tag, cls, text) => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text !== undefined) e.textContent = text;
  return e;
};

export class RearPanel {
  constructor(root) {
    this.root = root;
    this.bench = null;
    this.onClose = null;
    this.body = root.querySelector('#rear-body');
    this.status = root.querySelector('#rear-status');
    this.go = root.querySelector('#rear-go');
    this.close = root.querySelector('#rear-close');
    this.go.addEventListener('click', () => this.press());
    this.close.addEventListener('click', () => this.shut());
    root.querySelector('#rear-x').addEventListener('click', () => this.shut());
    root.addEventListener('keydown', (e) => { if (e.code === 'Escape') { e.preventDefault(); e.stopPropagation(); this.shut(); } }, true);
    this.keep = new Map();   // the socket picked for each power lead, kept across redraws
  }

  isOpen() { return !this.root.hidden; }

  open(bench, onClose) {
    this.bench = bench;
    this.onClose = onClose;
    this.listener = () => this.refresh();
    bench.addEventListener('change', this.listener);
    this.root.hidden = false;
    this.draw();
    this.go.focus();
  }

  shut() {
    if (this.bench) this.bench.removeEventListener('change', this.listener);
    this.root.hidden = true;
    this.bench = null;
    const done = this.onClose;
    this.onClose = null;
    done?.();
  }

  press() {
    const b = this.bench;
    if (!b) return;
    if (b.setup.poweredOn) b.powerOff();
    else if (b.powerOn()) this.shut();
    this.refresh();
  }

  refresh() { if (this.isOpen()) this.draw(); }

  draw() {
    const b = this.bench, s = b.setup;
    const focus = document.activeElement?.dataset?.cable;
    this.body.replaceChildren();
    const cables = s.cables();
    for (const [group, title] of GROUPS) {
      const list = cables.filter((c) => c.group === group);
      if (group === 'net' && !list.length) {
        const f = el('fieldset', 'rear-set');
        f.append(el('legend', '', title));
        f.append(el('p', 'rear-stop', s.nicProblem() ?? 'Nothing to plug in.'));
        this.body.append(f);
        continue;
      }
      if (!list.length) continue;
      const f = el('fieldset', 'rear-set');
      f.append(el('legend', '', title));
      for (const c of list) f.append(this.row(c));
      this.body.append(f);
    }
    if (focus) this.body.querySelector(`[data-cable="${focus}"]`)?.focus();

    // what is stopping the button, and what is worth knowing
    this.status.replaceChildren();
    const lines = s.poweredOn ? ['The PC is switched on.'] : s.missing();
    for (const t of lines) this.status.append(el('li', s.poweredOn ? 'ok' : 'err', t));
    if (!s.poweredOn && !lines.length) this.status.append(el('li', 'ok', 'Everything it needs is plugged in.'));
    for (const t of s.cautions()) this.status.append(el('li', 'warn', t));
    this.go.textContent = s.poweredOn ? 'Switch off' : 'Press the power button';
    this.go.disabled = !s.poweredOn && !s.canBoot();
  }

  row(c) {
    const b = this.bench, s = b.setup;
    const plugged = s.plugged.has(c.id);
    const row = el('div', `rear-row${plugged ? ' in' : ''}`);
    const sw = el('span', `rear-sw ${c.id.startsWith('pw-') || c.id === 'board' ? 'mains' : c.id.split('-')[0]}`);
    sw.setAttribute('aria-hidden', 'true');
    const main = el('div', 'rear-main');
    main.append(el('span', 'rear-l', c.label), el('span', 'rear-h', plugged ? this.where(c, s.plugged.get(c.id)) : c.hint));
    row.append(sw, main);

    const can = s.canPlug(c.id);
    const act = el('div', 'rear-act');
    if (plugged) {
      const out = el('button', 'w98-btn', 'Unplug');
      out.type = 'button'; out.dataset.cable = c.id;
      out.addEventListener('click', () => b.unplug(c.id));
      act.append(out);
    } else {
      let socket = null;
      if (c.id.startsWith('pw-')) {
        socket = el('select', 'wiz-select');
        socket.setAttribute('aria-label', `${c.label}: board socket`);
        const free = [0, 1, 2, 3].filter((k) => !b.socketUser(k));
        for (const k of [0, 1, 2, 3]) {
          const o = el('option', '', `Board socket ${k + 1}${free.includes(k) ? '' : ' (used)'}`);
          o.value = String(k); o.disabled = !free.includes(k);
          socket.append(o);
        }
        const keep = this.keep.get(c.id);
        socket.value = String(free.includes(keep) ? keep : free[0] ?? 0);
        socket.addEventListener('change', () => this.keep.set(c.id, Number(socket.value)));
        act.append(socket);
      }
      const inn = el('button', 'w98-btn', 'Plug in');
      inn.type = 'button'; inn.dataset.cable = c.id;
      inn.disabled = !can.ok;
      if (!can.ok) inn.title = can.why;
      inn.addEventListener('click', () => b.plug(c.id, socket ? Number(socket.value) : null));
      act.append(inn);
      if (!can.ok) main.append(el('span', 'rear-why', can.why));
    }
    row.append(act);
    return row;
  }

  where(c, at) {
    if (c.id.startsWith('pw-')) return `Board socket ${at + 1}`;
    if (c.id === 'board') return 'In the wall';
    return 'Plugged in';
  }
}
