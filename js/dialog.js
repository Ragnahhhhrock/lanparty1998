// One Win98 message box, reused for every little errand in the basement (burning a disc,
// ordering a hub, fixing file sharing). A spec is { title, render }, and render() returns
// { lines: [text], progress: 0..1 | null, buttons: [{ label, run, keep, disabled }] }.
// render() is called again every second so progress bars and countdowns stay live.
const el = {
  root: document.getElementById('dialog'),
  title: document.getElementById('dialog-title'),
  body: document.getElementById('dialog-body'),
  bar: document.getElementById('dialog-bar'),
  fill: document.getElementById('dialog-fill'),
  actions: document.getElementById('dialog-actions'),
  close: document.getElementById('dialog-close'),
};

let spec = null;
let onClose = null;
let buttonKey = '';

export const isOpen = () => spec !== null;

export function open(next, closed) {
  spec = next;
  onClose = closed ?? null;
  buttonKey = '';
  el.title.textContent = spec.title;
  el.root.hidden = false;
  refresh();
  el.actions.querySelector('button:not(:disabled)')?.focus();
}

export function close() {
  if (!spec) return;
  spec = null;
  el.root.hidden = true;
  const cb = onClose;
  onClose = null;
  cb?.();
}

export function refresh() {
  if (!spec) return;
  const view = spec.render();
  el.body.replaceChildren(...view.lines.map((t) => { const p = document.createElement('p'); p.textContent = t; return p; }));
  el.bar.hidden = view.progress == null;
  if (view.progress != null) el.fill.style.width = `${Math.round(Math.min(1, Math.max(0, view.progress)) * 100)}%`;
  // only rebuild the buttons when they change, or keyboard focus jumps every second
  const key = JSON.stringify(view.buttons.map((b) => [b.label, !!b.disabled]));
  if (key === buttonKey) return;
  buttonKey = key;
  el.actions.replaceChildren(...view.buttons.map((b, i) => {
    const btn = document.createElement('button');
    btn.className = `w98-btn${i === 0 ? ' default' : ''}`;
    btn.textContent = b.label;
    btn.disabled = !!b.disabled;
    btn.addEventListener('click', () => { b.run?.(); if (b.keep) refresh(); else close(); });
    return btn;
  }));
}

el.close.addEventListener('click', close);
document.addEventListener('keydown', (e) => { if (spec && e.key === 'Escape') { e.preventDefault(); close(); } }, true);
