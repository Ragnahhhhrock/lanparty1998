// Solitaire: Klondike on the Games menu. The rules live in solitaire.js; this is the window.
// Drag cards, or click one and then click where it goes. Double click sends a card to a foundation.
import * as S from './solitaire.js';

const el = (tag, cls, html) => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (html != null) e.innerHTML = html;
  return e;
};

const CW = 64, CH = 88, GAP = 10, PAD = 8, TOP = 8;
const ROW2 = TOP + CH + 14;          // where the seven columns start
const DOWN = 6, UP = 18;             // how far each face-down / face-up card shows
const FAN = 14;                      // draw-three waste fan
export const FELT_W = PAD * 2 + 7 * CW + 6 * GAP;
export const FELT_H = 470;
const colX = (i) => PAD + i * (CW + GAP);
const GLYPH = { S: '♠', H: '♥', D: '♦', C: '♣' };

let drawMode = 1;

export const solitaire = {
  id: 'sol', title: 'Solitaire', icon: 'cards', size: [FELT_W + 8], pos: [90, 40],
  menus: (ctx) => [
    {
      label: 'Game',
      items: [
        { label: 'Deal', key: 'F2', run: () => ctx.game.deal() },
        { label: 'Undo', key: 'Ctrl+Z', run: () => ctx.game.undo() },
        { sep: true },
        { label: 'Draw One', checked: () => drawMode === 1, run: () => { drawMode = 1; ctx.game.deal(); } },
        { label: 'Draw Three', checked: () => drawMode === 3, run: () => { drawMode = 3; ctx.game.deal(); } },
        { sep: true },
        { label: 'Exit', run: ctx.close },
      ],
    },
    {
      label: 'Help',
      items: [{
        label: 'About Solitaire',
        run: () => ctx.desktop.message({
          title: 'About Solitaire', kind: 'info',
          text: 'Build the four suits up from ace to king. Drag cards (or click one, then click where it goes), double click to send a card up to a foundation, and click the pile to turn cards over.',
        }),
      }],
    },
  ],

  build(ctx) {
    const root = el('div', 'sol');
    const felt = el('div', 'sol-felt');
    felt.tabIndex = 0;
    felt.setAttribute('data-owns-keys', '');
    felt.setAttribute('data-autofocus', '');
    felt.setAttribute('aria-label', 'Solitaire table. D or Space turns the pile, F2 deals, Ctrl+Z undoes.');
    const bar = el('div', 'app-bar');
    const scoreOut = el('output'), movesOut = el('output'), timeOut = el('output');
    bar.append(scoreOut, movesOut, timeOut);
    root.append(felt, bar);
    ctx.body.append(root);

    let g, hist, sel, secs, timer = 0, finishing = 0, down = null, last = null;

    const stopTimer = () => { clearInterval(timer); timer = 0; clearInterval(finishing); finishing = 0; };
    const startTimer = () => {
      if (!timer && !S.won(g)) timer = setInterval(() => { secs++; updateBar(); }, 1000);
    };
    const updateBar = () => {
      scoreOut.textContent = `Score: ${g.score}`;
      movesOut.textContent = `Moves: ${g.moves}`;
      timeOut.textContent = `Time: ${secs}`;
    };

    function deal() {
      stopTimer();
      g = S.deal(Math.random, drawMode);
      hist = []; sel = null; secs = 0; down = null; last = null;
      settle();
    }

    function undo() {
      if (!hist.length || S.won(g)) return;
      clearInterval(finishing); finishing = 0;
      g = hist.pop(); sel = null;
      settle();
    }

    // a card face, placed on the felt. info says which pile it belongs to.
    function card(c, x, y, info) {
      const d = el('div', `card ${c.up ? (S.isRed(c) ? 'red' : 'blk') : 'down'}`);
      d.style.left = `${x}px`;
      d.style.top = `${y}px`;
      if (c.up) {
        d.setAttribute('role', 'img');
        d.setAttribute('aria-label', `${S.RANKS[c.rank - 1]} of ${{ S: 'spades', H: 'hearts', D: 'diamonds', C: 'clubs' }[c.suit]}`);
        d.innerHTML = `<b>${S.RANKS[c.rank - 1]}</b><i>${GLYPH[c.suit]}</i><span>${GLYPH[c.suit]}</span>`;
      }
      Object.assign(d.dataset, info);
      return d;
    }

    const slot = (x, y, to, i, label = '', tall = false) => {
      const d = el('div', `sol-slot${tall ? ' tall' : ''}`);
      d.style.left = `${x}px`;
      d.style.top = `${y}px`;
      d.dataset.label = label;
      Object.assign(d.dataset, { to, i });
      return d;
    };

    const isSel = (from, i, at) => sel && sel.from === from && (from === 'waste' || sel.i === i) && (from !== 'tab' || at >= sel.at);

    function render() {
      const kids = [];
      kids.push(slot(colX(0), TOP, 'stock', 0, g.stock.length ? '' : '↺'));
      if (g.stock.length) kids.push(card(g.stock[g.stock.length - 1], colX(0), TOP, { to: 'stock' }));
      const shown = g.waste.slice(-g.draw);
      shown.forEach((c, k) => {
        const top = k === shown.length - 1;
        const d = card(c, colX(1) + k * FAN, TOP, { from: 'waste', to: 'waste' });
        if (!top) d.classList.add('under');
        if (top && isSel('waste')) d.classList.add('sel');
        kids.push(d);
      });
      g.found.forEach((pile, i) => {
        kids.push(slot(colX(3 + i), TOP, 'found', i, 'A'));
        if (pile.length) {
          const d = card(pile[pile.length - 1], colX(3 + i), TOP, { from: 'found', to: 'found', i });
          if (isSel('found', i)) d.classList.add('sel');
          kids.push(d);
        }
      });
      g.tab.forEach((col, i) => {
        kids.push(slot(colX(i), ROW2, 'tab', i, '', true));
        let y = ROW2;
        col.forEach((c, at) => {
          const d = card(c, colX(i), y, { from: 'tab', to: 'tab', i, at });
          if (isSel('tab', i, at)) d.classList.add('sel');
          kids.push(d);
          y += c.up ? UP : DOWN;
        });
      });
      felt.replaceChildren(...kids);
      updateBar();
    }

    // draw, then notice a win, or start carrying the last cards up by themselves
    function settle() {
      render();
      if (S.won(g)) {
        stopTimer();
        ctx.desktop.message({ title: 'Solitaire', kind: 'info', text: `Congratulations, you won! Score ${g.score} in ${secs} seconds. Deal again from the Game menu.` });
      } else if (S.canFinish(g) && !finishing) {
        clearInterval(timer); timer = 0;
        finishing = setInterval(() => {
          if (!S.finishStep(g)) { clearInterval(finishing); finishing = 0; }
          settle();
        }, 90);
      }
    }

    function tryMove(src, dst) {
      const snap = S.clone(g);
      if (!S.move(g, src, dst)) return false;
      hist.push(snap);
      if (hist.length > 300) hist.shift();
      startTimer();
      return true;
    }

    function drawPile() {
      const snap = S.clone(g);
      if (!S.drawStock(g)) return;
      hist.push(snap);
      startTimer();
    }

    const srcOf = (d) => {
      if (d.from === 'waste') return { from: 'waste' };
      if (d.from === 'found') return { from: 'found', i: Number(d.i) };
      if (d.from === 'tab') return { from: 'tab', i: Number(d.i), at: Number(d.at) };
      return null;
    };
    const same = (a, b) => a && b && a.from === b.from && a.i === b.i && a.at === b.at;
    const dstOf = (t) => {
      const h = t?.closest?.('[data-to]');
      return h && (h.dataset.to === 'tab' || h.dataset.to === 'found') ? { to: h.dataset.to, i: Number(h.dataset.i) } : null;
    };

    felt.addEventListener('pointerdown', (e) => {
      if (e.button !== 0 || S.won(g)) return;
      const t = e.target.closest('.card, .sol-slot');
      if (!t) { sel = null; render(); return; }
      const src = srcOf(t.dataset);
      const liftable = src && S.lift(g, src);
      let els = [];
      if (liftable) {
        els = src.from === 'tab'
          ? [...felt.querySelectorAll(`.card[data-from="tab"][data-i="${src.i}"]`)].filter((c) => Number(c.dataset.at) >= src.at)
          : [t];
      }
      down = { t, src, x: e.clientX, y: e.clientY, els, moved: false };
      felt.setPointerCapture(e.pointerId);
    });

    felt.addEventListener('pointermove', (e) => {
      if (!down || !down.els.length) return;
      const dx = e.clientX - down.x, dy = e.clientY - down.y;
      if (!down.moved && Math.hypot(dx, dy) < 5) return;
      down.moved = true;
      for (const c of down.els) { c.classList.add('dragging'); c.style.transform = `translate(${dx}px, ${dy}px)`; }
    });

    felt.addEventListener('pointerup', (e) => {
      const dn = down;
      down = null;
      if (!dn) return;
      if (felt.hasPointerCapture(e.pointerId)) felt.releasePointerCapture(e.pointerId);
      if (dn.moved) {
        const dst = dstOf(document.elementFromPoint(e.clientX, e.clientY));
        if (dst) tryMove(dn.src, dst);
        sel = null; last = null;
        settle();
        return;
      }
      click(dn);
    });
    felt.addEventListener('pointercancel', () => { down = null; render(); });

    function click(dn) {
      const d = dn.t.dataset;
      if (d.to === 'stock') { drawPile(); sel = null; last = null; settle(); return; }
      const now = performance.now();
      if (dn.src && last && same(last.src, dn.src) && now - last.at < 400) { // double click
        const snap = S.clone(g);
        if (S.autoFoundation(g, dn.src)) { hist.push(snap); startTimer(); }
        sel = null; last = null;
        settle();
        return;
      }
      last = dn.src ? { src: dn.src, at: now } : null;
      const liftable = dn.src && S.lift(g, dn.src);
      if (sel) {
        const dst = dstOf(dn.t);
        if (dst && tryMove(sel, dst)) sel = null;
        else sel = liftable ? dn.src : null;
      } else if (liftable) sel = dn.src;
      settle();
    }

    felt.addEventListener('keydown', (e) => {
      if (e.key === 'd' || e.key === 'D' || e.key === ' ') { e.preventDefault(); drawPile(); sel = null; settle(); }
    });
    ctx.root.addEventListener('keydown', (e) => {
      if (e.key === 'F2') { e.preventDefault(); deal(); }
      else if ((e.ctrlKey || e.metaKey) && (e.key === 'z' || e.key === 'Z')) { e.preventDefault(); undo(); }
    });

    ctx.game = { deal, undo };
    deal();
    return { dispose: stopTimer };
  },
};
