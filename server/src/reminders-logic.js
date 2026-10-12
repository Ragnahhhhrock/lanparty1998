// Pure logic for the party reminders (no Workers APIs, so tools/reminders.test.mjs can run it in Node):
// email checks, tokens, and the plain-text messages. The storage and the sending are in reminders.js.

export const SITE = 'https://lanparty1998.com';
export const API = 'https://room.lanparty1998.com';

const EMAIL_RE = /^[^\s@,;<>()"']+@[^\s@,;<>()"']+\.[a-z]{2,}$/i;

// Returns the lower-cased address, or null if it is not one we will mail.
export function cleanEmail(v) {
  const s = String(v ?? '').trim().toLowerCase();
  return s.length <= 254 && EMAIL_RE.test(s) ? s : null;
}

export const TOKEN_RE = /^[a-f0-9]{32}$/;
export const cleanToken = (v) => (TOKEN_RE.test(String(v ?? '')) ? String(v) : null);

export function newToken() {
  const b = new Uint8Array(16);
  crypto.getRandomValues(b);
  return [...b].map((x) => x.toString(16).padStart(2, '0')).join('');
}

// Compare two strings without leaking where they differ.
export function safeEqual(a, b) {
  a = String(a ?? ''); b = String(b ?? '');
  let d = a.length ^ b.length;
  for (let i = 0; i < Math.max(a.length, b.length); i++) d |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0);
  return d === 0;
}

// A private room name, as the game accepts it (see net.js).
export const cleanRoom = (v) => String(v ?? '').toLowerCase().replace(/[^a-z0-9-]/g, '').slice(0, 32);
export const cleanText = (v, n) => String(v ?? '').replace(/[\u0000-\u001f<>]/g, '').trim().slice(0, n);

export const inviteUrl = (room) => (room ? `${SITE}/?room=${encodeURIComponent(room)}` : `${SITE}/`);
export const confirmUrl = (token) => `${API}/reminders/confirm?t=${token}`;
export const unsubUrl = (token) => `${API}/reminders/unsubscribe?t=${token}`;

export function confirmMessage(to, token) {
  return {
    to,
    subject: "Confirm your LAN Party '98 reminders",
    text: [
      'Oi,',
      '',
      `Somebody (hopefully you) asked for LAN party reminders to this address. Click to confirm: ${confirmUrl(token)}`,
      '',
      "If it wasn't you, ignore this and you won't hear from us again.",
      '',
      "-- LAN Party '98",
      SITE,
      '',
    ].join('\n'),
  };
}

// One reminder for one subscriber. List-Unsubscribe lets a mail client offer one-click unsubscribe.
export function reminderMessage(to, token, { when, room } = {}) {
  const url = unsubUrl(token);
  const time = when ? `Doors open ${when}. ` : '';
  return {
    to,
    subject: "LAN Party '98: come and frag",
    text: [
      'Oi,',
      '',
      `The LAN party is on. ${time}Six beige boxes, one 10BASE-T hub and a crate of Volt Cola.`,
      '',
      `Walk in: ${inviteUrl(room)}`,
      '',
      'Pick a handle, grab a free PC, press E, and frag. Bring a mate: everyone online shares the same basement.',
      '',
      `Don't want these any more? ${url}`,
      '',
      "-- LAN Party '98",
      SITE,
      '',
    ].join('\n'),
    headers: { 'List-Unsubscribe': `<${url}>`, 'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click' },
  };
}

// The small pages the email links open. They borrow the site's own tokens, so no colour or font is invented here.
export function page(title, body) {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex">
<title>${title} — LAN Party '98</title><link rel="stylesheet" href="${SITE}/css/tokens.css">
<style>body{margin:0;min-height:100vh;display:grid;place-items:center;background:var(--basement);color:var(--w98-text);font:var(--text-ui)/1.5 var(--font-ui)}
main{box-sizing:border-box;width:min(92vw,420px);background:var(--w98-face);box-shadow:var(--bevel-raised);padding:var(--space-1)}
h1{margin:0;padding:var(--space-1) var(--space-2);background:linear-gradient(90deg,var(--w98-title),var(--w98-title2));color:var(--w98-light);font:var(--text-crt)/1.2 var(--font-crt)}
div{padding:var(--space-4)}p{margin:0 0 var(--space-3)}a,button{color:var(--w98-title)}
button{font:inherit;padding:var(--space-1) var(--space-4);background:var(--w98-face);color:var(--w98-text);border:0;box-shadow:var(--bevel-raised);cursor:pointer}
button:focus-visible,a:focus-visible{outline:1px dotted var(--w98-text);outline-offset:2px}</style></head>
<body><main><h1>${title}</h1><div>${body}</div></main></body></html>`;
}
