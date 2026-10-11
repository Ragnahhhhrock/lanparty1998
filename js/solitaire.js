// Klondike Solitaire rules, with no DOM so `node tools/solitaire.test.mjs` can test them.
// A card is { suit: 'S' | 'H' | 'D' | 'C', rank: 1..13, up: boolean }. A game is
// { stock, waste, found: [4 piles], tab: [7 columns], draw: 1 | 3, score, moves, recycles }.
// Scoring is the usual one: +5 waste to column, +10 to a foundation, +5 turning a column card, -15 taking one back
// off a foundation, and a penalty each time the stock is turned over again.
export const SUITS = ['S', 'H', 'D', 'C'];
export const RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
export const isRed = (c) => c.suit === 'H' || c.suit === 'D';
export const name = (c) => `${RANKS[c.rank - 1]}${c.suit}`;

export function newDeck() {
  return SUITS.flatMap((suit) => RANKS.map((_, i) => ({ suit, rank: i + 1, up: false })));
}

export function shuffle(cards, rng = Math.random) {
  for (let i = cards.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [cards[i], cards[j]] = [cards[j], cards[i]];
  }
  return cards;
}

export function deal(rng = Math.random, draw = 1) {
  const deck = shuffle(newDeck(), rng);
  const tab = Array.from({ length: 7 }, () => []);
  for (let col = 0; col < 7; col++) {
    for (let n = 0; n <= col; n++) tab[col].push(deck.pop());
    tab[col][col].up = true;
  }
  return { stock: deck, waste: [], found: [[], [], [], []], tab, draw, score: 0, moves: 0, recycles: 0 };
}

export const clone = (g) => structuredClone(g);
const top = (pile) => pile[pile.length - 1];
export const won = (g) => g.found.every((p) => p.length === 13);

// Can this card go on that foundation pile? (An ace starts an empty pile; after that it is the same suit, one higher.)
export function fitsFoundation(card, pile) {
  const t = top(pile);
  return t ? t.suit === card.suit && card.rank === t.rank + 1 : card.rank === 1;
}

// Can this card go on that column? (A king on an empty one; otherwise the opposite colour, one lower.)
export function fitsColumn(card, col) {
  const t = top(col);
  return t ? t.up && isRed(t) !== isRed(card) && card.rank === t.rank - 1 : card.rank === 13;
}

// Which foundation pile would take this card, or -1. An ace goes to the first empty pile.
export function foundationFor(g, card) {
  const same = g.found.findIndex((p) => p.length && fitsFoundation(card, p));
  if (same >= 0) return same;
  return card.rank === 1 ? g.found.findIndex((p) => !p.length) : -1;
}

// Turn the stock: one card (or three) onto the waste. When it is empty, the waste goes back, face down.
export function drawStock(g) {
  if (g.stock.length) {
    for (let n = 0; n < g.draw && g.stock.length; n++) { const c = g.stock.pop(); c.up = true; g.waste.push(c); }
  } else if (g.waste.length) {
    while (g.waste.length) { const c = g.waste.pop(); c.up = false; g.stock.push(c); }
    g.recycles++;
    if (g.draw === 1) g.score = Math.max(0, g.score - 100);
    else if (g.recycles > 3) g.score = Math.max(0, g.score - 20);
  } else return false;
  g.moves++;
  return true;
}

function flipTop(g, col) {
  const t = top(g.tab[col]);
  if (t && !t.up) { t.up = true; g.score += 5; }
}

// Where a card (or run of cards) could be picked up from: { from: 'waste' } | { from: 'found', i } | { from: 'tab', i, at }
// `at` is the index in the column of the first card picked up. Returns the cards, or null if they can't be lifted.
export function lift(g, src) {
  if (src.from === 'waste') return g.waste.length ? [top(g.waste)] : null;
  if (src.from === 'found') return g.found[src.i].length ? [top(g.found[src.i])] : null;
  const col = g.tab[src.i];
  if (src.at < 0 || src.at >= col.length || !col[src.at].up) return null;
  return col.slice(src.at);
}

// Move what `src` points at to `dst` ({ to: 'tab', i } or { to: 'found', i }). Returns true if the move was legal and made.
export function move(g, src, dst) {
  const cards = lift(g, src);
  if (!cards) return false;
  const first = cards[0];
  if (dst.to === 'found') {
    if (cards.length !== 1 || !fitsFoundation(first, g.found[dst.i])) return false;
  } else {
    if (src.from === 'tab' && src.i === dst.i) return false;
    if (!fitsColumn(first, g.tab[dst.i])) return false;
  }
  // take them off the source
  if (src.from === 'waste') g.waste.pop();
  else if (src.from === 'found') g.found[src.i].pop();
  else g.tab[src.i].length = src.at;
  // put them on the destination
  (dst.to === 'found' ? g.found[dst.i] : g.tab[dst.i]).push(...cards);
  g.moves++;
  if (dst.to === 'found') g.score += src.from === 'found' ? 0 : 10;
  else if (src.from === 'waste') g.score += 5;
  else if (src.from === 'found') g.score = Math.max(0, g.score - 15);
  if (src.from === 'tab') flipTop(g, src.i);
  return true;
}

// Double click: send the card to a foundation if one will have it.
export function autoFoundation(g, src) {
  const cards = lift(g, src);
  if (!cards || cards.length !== 1 || src.from === 'found') return false;
  const i = foundationFor(g, cards[0]);
  return i >= 0 && move(g, src, { to: 'found', i });
}

// Once the stock and waste are empty and every column card is face up, the rest is just carrying cards up.
export const canFinish = (g) => !g.stock.length && !g.waste.length && g.tab.every((col) => col.every((c) => c.up));

// One step of that: the first column card that has a foundation to go to. Returns true if it moved one.
export function finishStep(g) {
  for (let i = 0; i < 7; i++) {
    const t = top(g.tab[i]);
    if (t && autoFoundation(g, { from: 'tab', i, at: g.tab[i].length - 1 })) return true;
  }
  return false;
}
