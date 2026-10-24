// BUILDPC.EXE: the shop wizard you go through before you walk into the basement. Pick a monitor, processor, memory,
// drives, network card, sound and a desk's worth of keyboard, mouse and mat out of the account's $1500, then carry
// the boxes to your table. The parts, prices and rules are in js/build.js; this is only the window.
//
// new Wizard(root).open({ build, net, onDone(build), onCancel() })
import * as B from './build.js';

const money = (n) => `$${n}`;
const el = (tag, props = {}, ...kids) => {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(props)) {
    if (k === 'class') e.className = v;
    else if (k === 'text') e.textContent = v;
    else if (k.startsWith('on')) e.addEventListener(k.slice(2), v);
    else if (v === true) e.setAttribute(k, '');
    else if (v !== false && v != null) e.setAttribute(k, v);
  }
  for (const kid of kids.flat()) if (kid != null) e.append(kid);
  return e;
};

const STEPS = [
  { id: 'crt', title: 'Monitor', head: 'Pick a monitor', intro: 'It is a tube, so it is the biggest and heaviest thing you will carry to the table. A bigger one shows more, flickers less and costs a lot more.' },
  { id: 'cpu', title: 'Processor', head: 'Pick a processor', intro: 'The clock is locked, so the jumpers on the board are how you get more out of it later. Faster chips run hotter.' },
  { id: 'ram', title: 'Memory', head: 'How much memory?', intro: 'Windows 98 wants 16MB to start and 32MB to be comfortable. StarCraft will not start in less than 32MB.' },
  { id: 'drives', title: 'Drives', head: 'Hard disks, floppies and CDs', intro: 'The board has four IDE connectors: the hard disks and the CD drives all share them. You need a hard disk to boot from.' },
  { id: 'nic', title: 'Network card', head: 'Pick a network card', intro: 'Tonight the room is on coax, cable with BNC plugs. Somebody is bound to buy a hub later, and that is RJ45.' },
  { id: 'audio', title: 'Sound', head: 'Speakers or headphones?', intro: 'Speakers let the whole room hear your game. Headphones keep it to you.' },
  { id: 'desk', title: 'Keyboard and mouse', head: 'Your desk', intro: 'A keyboard, a mouse, and something for the mouse to run on.' },
  { id: 'receipt', title: 'Receipt', head: 'The receipt', intro: 'Check it over. The shop does not do refunds.' },
];

export class Wizard {
  constructor(root) {
    this.root = root;
    this.q = (sel) => root.querySelector(sel);
    this.step = 0;
    this.build = B.defaultBuild();
    this.net = 'coax';
    this.onDone = null;
    this.onCancel = null;
    this.q('#wiz-cancel').addEventListener('click', () => { const cancel = this.onCancel; this.close(); cancel?.(); });
    this.q('#wiz-back').addEventListener('click', () => this.go(this.step - 1));
    this.q('#wiz-next').addEventListener('click', () => (this.step === STEPS.length - 1 ? this.finish() : this.go(this.step + 1)));
    this.q('#wiz-std').addEventListener('click', () => { this.build = B.defaultBuild(); this.go(STEPS.length - 1); });
  }

  open({ build, net = 'coax', onDone, onCancel }) {
    this.build = B.sanitize(build);
    this.net = net;
    this.onDone = onDone;
    this.onCancel = onCancel;
    this.root.hidden = false;
    this.go(0);
    this.q('#wiz-next').focus();
  }

  close() { this.root.hidden = true; }

  finish() {
    if (!B.canBuy(this.build)) return;
    const done = this.onDone;
    this.close();
    done?.(B.sanitize(this.build));
  }

  go(n) {
    this.step = Math.max(0, Math.min(STEPS.length - 1, n));
    this.render();
  }

  change(fn) { fn(this.build); this.render(); }

  /* ---------- the frame ---------- */

  render() {
    const s = STEPS[this.step], last = this.step === STEPS.length - 1;
    this.q('#wiz-title').textContent = `BUILDPC.EXE - ${s.title} (${this.step + 1} of ${STEPS.length})`;
    this.q('#wiz-head').textContent = s.head;
    this.q('#wiz-intro').textContent = s.intro;
    this.q('#wiz-steps').replaceChildren(...STEPS.map((st, i) => el('li', {},
      el('button', { type: 'button', class: `wiz-step${i === this.step ? ' now' : ''}`, 'aria-current': i === this.step ? 'step' : false, onclick: () => this.go(i) },
        el('span', { class: 'wiz-n', text: String(i + 1) }), st.title))));
    const focus = this.focusKey();
    this.q('#wiz-pane').replaceChildren(...this[`pane_${s.id}`]());
    this.status();
    this.refocus(focus);
    this.q('#wiz-back').disabled = this.step === 0;
    const ok = B.canBuy(this.build);
    const next = this.q('#wiz-next');
    next.textContent = last ? 'Build it' : 'Next >';
    next.disabled = last && !ok;
    this.q('#wiz-std').hidden = last;
  }

  // The pane is rebuilt on every pick, so remember which radio or list had the keyboard and give it back
  focusKey() {
    const a = document.activeElement;
    if (!a || !this.q('#wiz-pane').contains(a)) return null;
    if (a.matches('input[type=radio]')) return `input[type=radio][name="${a.name}"][value="${a.value}"]`;
    if (a.matches('select')) return `select[aria-label="${a.getAttribute('aria-label')}"]`;
    return null;
  }

  refocus(sel) { if (sel) this.q('#wiz-pane').querySelector(sel)?.focus(); }

  status() {
    const b = this.build, left = B.remaining(b);
    this.q('#wiz-acct').textContent = money(B.BUDGET);
    this.q('#wiz-basket').textContent = money(B.price(b));
    const l = this.q('#wiz-left');
    l.textContent = left < 0 ? `-${money(-left)} OVER` : money(left);
    l.classList.toggle('over', left < 0);
    this.q('#wiz-ide').textContent = `IDE ${B.ideUsed(b)}/${B.IDE_DEVICES}`;
    const bad = B.validate(b);
    const here = { ram: /StarCraft/, audio: /Speakers/, nic: /BNC|RJ45|hub/, receipt: /./ }[STEPS[this.step].id];
    const warn = here ? B.warnings(b, this.net).filter((t) => here.test(t)) : [];
    this.q('#wiz-notes').replaceChildren(
      ...bad.map((t) => el('li', { class: 'err', text: t })),
      ...warn.map((t) => el('li', { class: 'warn', text: t })),
    );
  }

  /* ---------- building blocks ---------- */

  // A radio group. Each option is a row you can click: name, a line of specs, the shop's note and the price.
  choice(name, list, selected, pick, spec) {
    return el('div', { class: 'wiz-list', role: 'radiogroup', 'aria-label': name }, list.map((p) => {
      const sel = p.id === selected;
      return el('label', { class: `wiz-opt${sel ? ' sel' : ''}` },
        el('input', { type: 'radio', name, value: p.id, checked: sel, onchange: () => this.change((b) => pick(b, p.id)) }),
        el('span', { class: 'wiz-opt-main' },
          el('b', { text: p.name }),
          spec ? el('span', { class: 'wiz-spec', text: spec(p) }) : null,
          el('span', { class: 'wiz-note', text: p.note }),
        ),
        el('span', { class: 'wiz-price', text: money(p.price) }));
    }));
  }

  bar(fraction, label) {
    return el('span', { class: 'wiz-meter' },
      el('span', { class: 'wiz-meter-l', text: label }),
      el('span', { class: 'bar' }, el('i', { style: `width:${Math.round(Math.max(0, Math.min(1, fraction)) * 100)}%` })));
  }

  /* ---------- the panes ---------- */

  pane_crt() {
    const b = this.build;
    const px = (c) => c.inches * 6.6;
    const strip = el('div', { class: 'wiz-crts', 'aria-hidden': 'true' }, B.CRT.map((c) => {
      const w = px(c), h = w * 0.78;
      return el('button', { type: 'button', tabindex: '-1', class: `wiz-crt${c.id === b.crt ? ' sel' : ''}`, onclick: () => this.change((x) => { x.crt = c.id; }) },
        el('span', { class: 'wiz-tube', style: `width:${w}px;height:${h}px` }, el('span', { class: 'wiz-glass' }, el('span', { class: 'wiz-prompt', text: '>_' }))),
        el('span', { class: 'wiz-base', style: `width:${w * 0.46}px` }),
        el('span', { class: 'wiz-crt-l', text: `${c.inches}"` }));
    }));
    const c = B.PARTS.crt[b.crt];
    return [
      strip,
      this.choice('Monitor', B.CRT, b.crt, (x, id) => { x.crt = id; },
        (p) => `${p.viewable}" viewable · ${p.dot}mm dot pitch · ${p.modes}`),
      el('p', { class: 'wiz-fact', text: `Your screen: ${c.viewable}" viewable, ${(c.glass[0] * 100).toFixed(0)} x ${(c.glass[1] * 100).toFixed(0)}cm of glass. ${c.fx.flicker ? 'You can see it flicker at 60Hz.' : 'It holds a steady picture.'}` }),
    ];
  }

  pane_cpu() {
    const b = this.build;
    const heat = (w) => (w < -0.1 ? 'runs cool' : w < 0 ? 'runs a little cool' : w === 0 ? 'runs normally' : w < 0.2 ? 'runs warm' : 'runs hot');
    return [
      this.choice('Processor', B.CPU, b.cpu, (x, id) => { x.cpu = id; },
        (p) => `${p.family} · ${p.mhz}MHz (${p.bus}MHz bus x ${p.mult}) · ${heat(p.warm)}`),
      el('div', { class: 'wiz-facts' },
        this.bar(B.PARTS.cpu[b.cpu].mhz / 450, 'SPEED'),
        el('p', { class: 'wiz-fact', text: `Jumper settings: ${B.ocFor(B.PARTS.cpu[b.cpu]).map((o) => `${o.mhz}MHz`).join(', ')}. Only the first one is safe without a fan.` })),
    ];
  }

  pane_ram() {
    const b = this.build;
    return [
      this.choice('Memory', B.RAM, b.ram, (x, id) => { x.ram = id; }, (p) => `${p.mb}MB`),
      el('div', { class: 'wiz-facts' }, this.bar(B.PARTS.ram[b.ram].mb / 128, 'MEMORY')),
    ];
  }

  pane_drives() {
    const b = this.build;
    const hddSel = (slot) => {
      const opts = [...(slot === 0 ? [] : [el('option', { value: '', text: 'None' })]),
        ...B.HDD.map((h) => el('option', { value: h.id, text: `${h.name} - ${money(h.price)}`, selected: b.hdd[slot] === h.id }))];
      return el('label', { class: 'wiz-row' }, el('span', { class: 'wiz-row-l', text: slot === 0 ? 'Hard disk 1 (boot)' : `Hard disk ${slot + 1}` }),
        el('select', { class: 'wiz-select', 'aria-label': `Hard disk ${slot + 1}`, onchange: (e) => this.change((x) => { x.hdd[slot] = e.target.value || null; if (!x.hdd[0]) { const f = x.hdd.find(Boolean); x.hdd = [f ?? B.HDD[0].id, null, null]; } }) }, opts));
    };
    const radios = (name, items, value, pick) => el('div', { class: 'wiz-inline', role: 'radiogroup', 'aria-label': name }, items.map(([v, label]) =>
      el('label', { class: `wiz-pill${v === value ? ' sel' : ''}` },
        el('input', { type: 'radio', name, value: String(v), checked: v === value, onchange: () => this.change((x) => pick(x, v)) }), label)));
    const cdName = (p) => `${p.name} - ${money(p.price)}`;
    const total = B.specOf(b).diskGb;
    return [
      el('fieldset', { class: 'wiz-set' }, el('legend', { text: 'Hard disks' }), hddSel(0), hddSel(1), hddSel(2),
        el('p', { class: 'wiz-fact', text: `${total}GB in all.` })),
      el('fieldset', { class: 'wiz-set' }, el('legend', { text: 'Floppy drives (3.5", 1.44MB)' }),
        radios('Floppy drives', [[0, 'None'], [1, `One - ${money(B.FLOPPY_PRICE)}`], [2, `Two - ${money(B.FLOPPY_PRICE * 2)}`]], b.floppy, (x, v) => { x.floppy = v; })),
      el('fieldset', { class: 'wiz-set' }, el('legend', { text: 'CD-ROM drive' }),
        radios('CD-ROM', [['', 'None'], ...B.CDROM.map((p) => [p.id, cdName(p)])], b.cdrom ?? '', (x, v) => { x.cdrom = v || null; })),
      el('fieldset', { class: 'wiz-set' }, el('legend', { text: 'CD-R burner' }),
        radios('CD-R', [['', 'None'], ...B.CDR.map((p) => [p.id, cdName(p)])], b.cdr ?? '', (x, v) => { x.cdr = v || null; }),
        el('p', { class: 'wiz-fact', text: (b.cdr ? B.PARTS.cdr[b.cdr].note : 'No burner. The only one in the basement is in PC-04.') })),
    ];
  }

  pane_nic() {
    const b = this.build;
    return [this.choice('Network card', B.NIC, b.nic, (x, id) => { x.nic = id; },
      (p) => `${p.ports.map((q) => (q === 'bnc' ? 'BNC' : 'RJ45')).join(' + ')} · ${p.ports.includes('bnc') ? 'works on the coax tonight' : 'no coax socket'}`)];
  }

  pane_audio() {
    const b = this.build;
    return [this.choice('Sound', B.AUDIO, b.audio, (x, id) => { x.audio = id; })];
  }

  pane_desk() {
    const b = this.build;
    const group = (title, list, key) => el('fieldset', { class: 'wiz-set' }, el('legend', { text: title }),
      this.choice(title, list, b[key], (x, id) => { x[key] = id; }));
    return [group('Keyboard', B.KEYBOARD, 'keyboard'), group('Mouse', B.MOUSE, 'mouse'), group('Mouse mat', B.MAT, 'mat')];
  }

  pane_receipt() {
    const b = this.build, left = B.remaining(b);
    const rows = B.lines(b).map((l) => el('tr', {}, el('td', { text: l.qty > 1 ? `${l.qty} x ${l.name}` : l.name }), el('td', { class: 'num', text: money(l.price) })));
    return [
      el('table', { class: 'wiz-receipt' },
        el('tbody', {}, rows),
        el('tfoot', {},
          el('tr', {}, el('th', { text: 'Total' }), el('td', { class: 'num', text: money(B.price(b)) })),
          el('tr', {}, el('th', { text: 'In the account' }), el('td', { class: 'num', text: money(B.BUDGET) })),
          el('tr', {}, el('th', { text: left < 0 ? 'Over' : 'Left over' }), el('td', { class: `num${left < 0 ? ' over' : ''}`, text: money(Math.abs(left)) })))),
      el('p', { class: 'wiz-fact', text: 'Everything goes in boxes. Carry them to your spot on the back table, unpack them, and plug it all in.' }),
    ];
  }
}
