// Downhill: an endless ski run on the Games menu. The rules live in ski.js; this is the window.
// Left and right turn a step at a time, Down points you straight, F is a burst of speed, Up does a trick in the air.
import { Run, KINDS, GATE_HALF, BEAR_AT_M } from './ski.js';
import { thud, crunch } from './sfx.js';

const el = (tag, cls, html) => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (html != null) e.innerHTML = html;
  return e;
};
const css = getComputedStyle(document.documentElement);
const token = (name) => css.getPropertyValue(name).trim();

export const VIEW_W = 480, VIEW_H = 320;
const SKIER_AT = 0.3;                 // the skier sits this far down the screen
const BEST_KEY = 'lp98-downhill-best';
const SKI_ANGLE = [0, 0.35, 0.9, 1.5]; // how far the skis turn from straight down, by |dir|

const readBest = () => { try { return Number(localStorage.getItem(BEST_KEY)) || 0; } catch { return 0; } };
const saveBest = (n) => { try { localStorage.setItem(BEST_KEY, String(n)); } catch { /* private window */ } };

export const downhill = {
  id: 'ski', title: 'Downhill', icon: 'ski', size: [VIEW_W + 8], pos: [110, 30],
  menus: (ctx) => [
    {
      label: 'Game',
      items: [
        { label: 'New', key: 'F2', run: () => ctx.game.newRun() },
        { label: 'Pause', key: 'P', run: () => ctx.game.pause() },
        { sep: true },
        { label: 'Exit', run: ctx.close },
      ],
    },
    {
      label: 'Help',
      items: [{
        label: 'About Downhill',
        run: () => ctx.desktop.message({
          title: 'About Downhill', kind: 'info',
          text: 'Ski as far as you can. Left and right turn you, Down points you straight, F is a burst of speed and Up does a trick when you are in the air. Trees and rocks knock you over, ramps launch you, and gates are worth style points. Go far enough and something comes after you.',
        }),
      }],
    },
  ],

  build(ctx) {
    const root = el('div', 'ski');
    const canvas = el('canvas', 'ski-view');
    canvas.width = VIEW_W; canvas.height = VIEW_H;
    canvas.tabIndex = 0;
    canvas.setAttribute('data-owns-keys', '');
    canvas.setAttribute('data-autofocus', '');
    canvas.setAttribute('aria-label', 'Downhill ski run. Left and right turn, Down goes straight, F is a burst of speed, Up does a trick, P pauses, F2 starts again.');
    const bar = el('div', 'app-bar');
    const distOut = el('output'), speedOut = el('output'), styleOut = el('output'), bestOut = el('output');
    bar.append(distOut, speedOut, styleOut, bestOut);
    root.append(canvas, bar);
    ctx.body.append(root);

    const g = canvas.getContext('2d');
    g.imageSmoothingEnabled = false;
    const C = {};
    for (const n of ['snow', 'snow-shade', 'curlz-bag', 'zap-dark', 'zap-green', 'wood', 'wood-dark', 'beige', 'volt', 'skin-2', 'w98-title', 'w98-shadow', 'w98-hilite', 'w98-light', 'crt-black', 'amber']) C[n] = token(`--${n}`);
    const FONT = `${token('--text-crt')} ${token('--font-crt')}`;

    let run, trail, started, paused, msg, msgT, best = readBest(), raf = 0, last = 0, newBest = false;

    function newRun() {
      run = new Run();
      trail = []; started = false; paused = false; msg = ''; msgT = 0; newBest = false;
      updateBar();
    }

    const say = (text, secs = 1.4) => { msg = text; msgT = secs; };
    const pause = () => { if (started && !run.over) paused = !paused; };

    function updateBar() {
      distOut.textContent = `Distance: ${run.dist}m`;
      speedOut.textContent = `Speed: ${run.mps}m/s`;
      styleOut.textContent = `Style: ${run.style}`;
      bestOut.textContent = `Best: ${best}m`;
    }

    const TEXT = {
      crash: 'Wipeout!', jump: '', trick: 'Trick! +75', gate: 'Gate! +50', bear: 'A bear is after you! Keep straight!', bump: '',
    };
    function handle(events) {
      for (const ev of events) {
        if (ev === 'crash') thud();
        else if (ev === 'eaten') {
          crunch();
          if (run.dist > best) { best = run.dist; newBest = true; saveBest(best); }
        } else if (TEXT[ev]) say(TEXT[ev], ev === 'bear' ? 3 : 1.2);
      }
    }

    function frame(t) {
      raf = requestAnimationFrame(frame);
      const dt = Math.min(0.05, (t - last) / 1000);
      last = t;
      if (!ctx.root.offsetParent) return; // minimised or closed: the hill waits
      if (started && !paused && !run.over) {
        run.step(dt);
        handle(run.events);
        const p = trail[trail.length - 1];
        if (run.state === 'ski' && (!p || Math.hypot(run.x - p.x, run.y - p.y) > 3)) {
          trail.push({ x: run.x, y: run.y });
          if (trail.length > 160) trail.shift();
        }
      } else if (run.over) run.step(dt);
      if (msgT > 0) msgT -= dt;
      draw();
      updateBar();
    }

    /* ---------------- drawing: everything is rounded to whole pixels ---------------- */

    const px = Math.round;
    const rect = (c, x, y, w, h) => { g.fillStyle = C[c]; g.fillRect(px(x), px(y), w, h); };
    const poly = (c, pts) => {
      g.fillStyle = C[c];
      g.beginPath();
      pts.forEach(([x, y], i) => (i ? g.lineTo(px(x), px(y)) : g.moveTo(px(x), px(y))));
      g.closePath(); g.fill();
    };
    const oval = (c, x, y, rx, ry) => { g.fillStyle = C[c]; g.beginPath(); g.ellipse(px(x), px(y), rx, ry, 0, 0, Math.PI * 2); g.fill(); };
    const line = (c, x0, y0, x1, y1, w = 1) => {
      g.strokeStyle = C[c]; g.lineWidth = w;
      g.beginPath(); g.moveTo(px(x0), px(y0)); g.lineTo(px(x1), px(y1)); g.stroke();
    };
    const text = (s, x, y, c = 'crt-black', align = 'center') => {
      g.font = FONT; g.textAlign = align; g.textBaseline = 'middle';
      g.fillStyle = C['crt-black']; g.fillText(s, px(x) + 1, px(y) + 1);
      g.fillStyle = C[c]; g.fillText(s, px(x), px(y));
    };

    const SPRITES = {
      tree: (x, y) => {
        rect('wood-dark', x - 2, y - 6, 4, 7);
        poly('curlz-bag', [[x, y - 34], [x - 13, y - 10], [x + 13, y - 10]]);
        poly('curlz-bag', [[x, y - 24], [x - 15, y - 4], [x + 15, y - 4]]);
        poly('snow', [[x, y - 34], [x - 4, y - 27], [x + 4, y - 27]]);
      },
      pine: (x, y) => {
        rect('wood-dark', x - 2, y - 5, 4, 6);
        poly('zap-dark', [[x, y - 40], [x - 9, y - 18], [x + 9, y - 18]]);
        poly('zap-dark', [[x, y - 30], [x - 11, y - 6], [x + 11, y - 6]]);
        poly('snow', [[x, y - 40], [x - 3, y - 34], [x + 3, y - 34]]);
      },
      stump: (x, y) => { rect('wood', x - 4, y - 5, 8, 6); rect('beige', x - 4, y - 6, 8, 2); },
      rock: (x, y) => {
        poly('w98-shadow', [[x - 6, y + 1], [x - 4, y - 6], [x + 2, y - 8], [x + 6, y - 3], [x + 6, y + 1]]);
        poly('w98-hilite', [[x - 4, y - 6], [x + 2, y - 8], [x, y - 4]]);
      },
      mogul: (x, y) => { oval('snow-shade', x, y, 9, 4); oval('snow', x - 1, y - 1, 6, 2); },
      ramp: (x, y) => { poly('wood', [[x - 10, y + 3], [x + 10, y + 3], [x + 10, y - 6]]); poly('beige', [[x - 10, y + 3], [x + 10, y - 6], [x + 10, y - 8], [x - 10, y + 1]]); },
    };

    function gate(o, sx, sy) {
      const c = run.hit.has(o.id) ? 'zap-green' : 'volt';
      for (const side of [-1, 1]) {
        const x = sx + side * GATE_HALF;
        rect('wood-dark', x - 1, sy - 16, 2, 17);
        poly(c, [[x, sy - 16], [x + side * 9, sy - 12], [x, sy - 8]]);
      }
    }

    function skier(sx, sy) {
      const lift = run.lift;
      if (lift > 0) oval('snow-shade', sx, sy, 7, 2);          // shadow on the snow
      g.save();
      g.translate(px(sx), px(sy - lift * 22));
      if (run.state === 'air' && run.tricked && run.airMax > 0.3) g.rotate((1 - run.stateT / run.airMax) * Math.PI * 2);
      if (run.state === 'fallen') {
        rect('volt', -7, -5, 14, 5);
        oval('skin-2', 9, -3, 3, 3);
        line('w98-title', -9, 0, 6, -9, 2);
        line('w98-title', -6, 1, 9, -7, 2);
        const t = Math.floor(run.stateT * 8) % 2;
        text('*', t ? -8 : 8, -16, 'amber');
      } else {
        const d = run.dir, a = Math.sign(d) * SKI_ANGLE[Math.abs(d)];
        const s = Math.sin(a), c = Math.cos(a);
        for (const off of [-2.5, 2.5]) {
          line('w98-title', off * c - s * 7, -3 - off * s - c * 7, off * c + s * 7, -3 - off * s + c * 7, 2);
        }
        rect('volt', -3, -16, 7, 11);
        oval('skin-2', 0, -19, 3, 3);
        if (d !== 0 && run.state !== 'air') { line('crt-black', -5, -12, -8 - Math.sign(d), -3); line('crt-black', 6, -12, 9 - Math.sign(d), -3); }
      }
      g.restore();
    }

    function bear(sx, sy) {
      const b = run.bear;
      const run1 = Math.sin(b.run * 14) * 3;
      oval('wood-dark', sx + 1, sy - 8, 11, 8);
      line('wood-dark', sx - 6, sy - 3, sx - 6 + run1, sy + 2, 3);
      line('wood-dark', sx + 6, sy - 3, sx + 6 - run1, sy + 2, 3);
      oval('wood', sx + 10, sy - 14, 6, 6);
      rect('wood-dark', sx + 6, sy - 21, 3, 3);
      rect('wood-dark', sx + 12, sy - 21, 3, 3);
      rect('w98-light', sx + 12, sy - 15, 2, 2);
      rect('crt-black', sx + 15, sy - 12, 2, 2);
    }

    function draw() {
      const cx = run.x - VIEW_W / 2, cy = run.y - VIEW_H * SKIER_AT;
      g.fillStyle = C.snow;
      g.fillRect(0, 0, VIEW_W, VIEW_H);

      // the tracks you left
      for (const off of [-2, 2]) {
        g.strokeStyle = C['snow-shade']; g.lineWidth = 1; g.beginPath();
        trail.forEach((p, i) => (i ? g.lineTo(px(p.x - cx) + off, px(p.y - cy)) : g.moveTo(px(p.x - cx) + off, px(p.y - cy))));
        g.stroke();
      }

      // everything on the hill, back to front
      const things = run.objectsIn(cx, cy, cx + VIEW_W, cy + VIEW_H + 40).map((o) => ({ y: o.y, draw: () => (o.kind === 'gate' ? gate(o, o.x - cx, o.y - cy) : SPRITES[o.kind](o.x - cx, o.y - cy)) }));
      things.push({ y: run.y, draw: () => skier(run.x - cx, run.y - cy) });
      if (run.bear) things.push({ y: run.bear.y, draw: () => bear(run.bear.x - cx, run.bear.y - cy) });
      things.sort((a, b) => a.y - b.y).forEach((t) => t.draw());

      // a bear off the top of the screen: point at it
      if (run.bear && !run.over) {
        const bx = run.bear.x - cx, by = run.bear.y - cy;
        if (by < 8) text('BEAR', Math.max(30, Math.min(VIEW_W - 30, bx)), 12, 'volt');
      }

      if (msgT > 0 && msg) text(msg, VIEW_W / 2, 24, 'amber');
      if (!started) {
        text('Click here, then press ← → to turn', VIEW_W / 2, VIEW_H / 2 - 12, 'w98-title');
        text('↓ straight   F speed   ↑ trick   P pause', VIEW_W / 2, VIEW_H / 2 + 14, 'w98-title');
      } else if (paused) text('Paused. Press P to carry on.', VIEW_W / 2, VIEW_H / 2, 'w98-title');
      if (run.over) {
        const chomp = Math.floor(run.bear.chew * 3) % 2 ? 'CHOMP' : 'CHOMP!';
        text(chomp, VIEW_W / 2, VIEW_H / 2 - 30, 'volt');
        text(`The bear got you after ${run.dist}m.${newBest ? ' A new best!' : ''}`, VIEW_W / 2, VIEW_H / 2, 'w98-title');
        text('Press F2 or Enter to ski again', VIEW_W / 2, VIEW_H / 2 + 26, 'w98-title');
      } else if (run.dist < 8 && started && !msgT) text(`Past ${BEAR_AT_M}m, something is hungry`, VIEW_W / 2, VIEW_H - 14, 'w98-hilite');
    }

    /* ---------------- keys ---------------- */

    canvas.addEventListener('keydown', (e) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const k = e.key;
      if (run.over) {
        if (k === 'Enter' || k === 'F2') { e.preventDefault(); newRun(); }
        return;
      }
      if (k === 'p' || k === 'P') { e.preventDefault(); pause(); return; }
      let used = true;
      if (k === 'ArrowLeft') run.turn(-1);
      else if (k === 'ArrowRight') run.turn(1);
      else if (k === 'ArrowDown') run.straight();
      else if (k === 'ArrowUp') run.up();
      else if (k === 'f' || k === 'F') run.boost(true);
      else used = false;
      if (!used) return;
      e.preventDefault();
      started = true; paused = false;
    });
    canvas.addEventListener('keyup', (e) => { if (e.key === 'f' || e.key === 'F') run.boost(false); });
    canvas.addEventListener('blur', () => { run.boost(false); if (started && !run.over) paused = true; });
    ctx.root.addEventListener('keydown', (e) => { if (e.key === 'F2') { e.preventDefault(); newRun(); } });
    canvas.addEventListener('pointerdown', () => { canvas.focus(); if (started && paused && !run.over) paused = false; });

    ctx.game = { newRun, pause };
    newRun();
    raf = requestAnimationFrame(frame);
    return { dispose() { cancelAnimationFrame(raf); } };
  },
};
