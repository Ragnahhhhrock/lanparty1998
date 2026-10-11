// The Calculator's brain, with no DOM so `node tools/calc.test.mjs` can test it.
// press(state, key) returns the next state; the window just draws state.display.
export const initial = () => ({ display: '0', acc: null, op: null, fresh: true, mem: 0, error: '' });

const num = (s) => parseFloat(s);
const fmt = (n) => {
  if (!Number.isFinite(n)) return null;
  return String(Number(n.toPrecision(12)));
};
const fail = (s, error) => ({ ...s, display: '0', acc: null, op: null, fresh: true, error });
const OPS = {
  '+': (a, b) => a + b,
  '-': (a, b) => a - b,
  '*': (a, b) => a * b,
  '/': (a, b) => a / b,
};

function settle(s) { // finish the pending operation, if there is one
  if (s.op === null || s.acc === null) return { ...s, acc: num(s.display) };
  if (s.op === '/' && num(s.display) === 0) return null;
  const out = fmt(OPS[s.op](s.acc, num(s.display)));
  return out === null ? null : { ...s, display: out, acc: num(out) };
}

export function press(s, key) {
  if (s.error && key !== 'C' && key !== 'CE') s = { ...s, error: '' };
  if (/^[0-9]$/.test(key)) {
    if (s.fresh || s.display === '0') return { ...s, display: key, fresh: false };
    return s.display.replace(/[-.]/g, '').length >= 16 ? s : { ...s, display: s.display + key };
  }
  switch (key) {
    case '.':
      if (s.fresh) return { ...s, display: '0.', fresh: false };
      return s.display.includes('.') ? s : { ...s, display: `${s.display}.` };
    case '+': case '-': case '*': case '/': {
      const done = s.fresh && s.op ? { ...s } : settle(s);
      if (!done) return fail(s, 'Cannot divide by zero.');
      return { ...done, op: key, fresh: true };
    }
    case '=': {
      if (s.op === null) return { ...s, fresh: true };
      const done = settle(s);
      return done ? { ...done, acc: null, op: null, fresh: true } : fail(s, 'Cannot divide by zero.');
    }
    case 'C': return { ...initial(), mem: s.mem };
    case 'CE': return { ...s, display: '0', fresh: true, error: '' };
    case 'BACK': {
      if (s.fresh) return s;
      const d = s.display.slice(0, -1);
      return { ...s, display: d === '' || d === '-' ? '0' : d };
    }
    case 'NEG':
      return num(s.display) === 0 ? s : { ...s, display: s.display.startsWith('-') ? s.display.slice(1) : `-${s.display}` };
    case 'SQRT': {
      const v = num(s.display);
      if (v < 0) return fail(s, 'Invalid input for function.');
      return { ...s, display: fmt(Math.sqrt(v)), fresh: true };
    }
    case 'INV': {
      const v = num(s.display);
      return v === 0 ? fail(s, 'Cannot divide by zero.') : { ...s, display: fmt(1 / v), fresh: true };
    }
    case 'PCT':
      return { ...s, display: s.acc === null ? '0' : fmt((s.acc * num(s.display)) / 100), fresh: true };
    case 'MC': return { ...s, mem: 0 };
    case 'MR': return { ...s, display: fmt(s.mem), fresh: true };
    case 'MS': return { ...s, mem: num(s.display), fresh: true };
    case 'M+': return { ...s, mem: s.mem + num(s.display), fresh: true };
    default: return s;
  }
}
