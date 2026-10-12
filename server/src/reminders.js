// Party reminders. People sign up in the room (a Start menu program), confirm by email, and get one email
// when the organiser's scheduled time arrives. Every email has an unsubscribe link.
//
// Storage is one Durable Object (SQLite). Secrets (set in the Cloudflare dashboard or with `wrangler secret put`):
//   RESEND_API_KEY  a Resend key with sending access to lanparty1998.com
//   ADMIN_TOKEN     the organiser's password for the Organiser panel
// Variable in wrangler.toml: REMIND_FROM, e.g. "LAN Party '98 <party@lanparty1998.com>".
// EMAIL_DRY_RUN=1 logs emails instead of sending them (local testing).
import { DurableObject } from 'cloudflare:workers';
import { cleanEmail, cleanToken, newToken, safeEqual, cleanRoom, cleanText, confirmMessage, reminderMessage, page, SITE } from './reminders-logic.js';

const HOUR = 3600e3, DAY = 24 * HOUR;
const LIMITS = { ipPerHour: 5, confirmsPerDay: 300, adminFailsPerHour: 10, resendAfter: 10 * 60e3, giveUpAfter: DAY, maxLen: 120 };

export class Reminders extends DurableObject {
  constructor(ctx, env) {
    super(ctx, env);
    this.sql = ctx.storage.sql;
    this.sql.exec(`
      CREATE TABLE IF NOT EXISTS subs (email TEXT PRIMARY KEY, token TEXT NOT NULL UNIQUE, confirmed INTEGER NOT NULL DEFAULT 0, created INTEGER NOT NULL, confirmed_at INTEGER, last_sent INTEGER);
      CREATE TABLE IF NOT EXISTS schedules (id INTEGER PRIMARY KEY AUTOINCREMENT, at INTEGER NOT NULL, when_text TEXT NOT NULL DEFAULT '', room TEXT NOT NULL DEFAULT '', done INTEGER NOT NULL DEFAULT 0);
      CREATE TABLE IF NOT EXISTS delivered (schedule_id INTEGER NOT NULL, email TEXT NOT NULL, PRIMARY KEY (schedule_id, email));
      CREATE TABLE IF NOT EXISTS attempts (kind TEXT NOT NULL, ip TEXT NOT NULL DEFAULT '', at INTEGER NOT NULL);`);
  }

  count(kind, since, ip) {
    const r = ip == null
      ? this.sql.exec('SELECT COUNT(*) n FROM attempts WHERE kind = ? AND at > ?', kind, since)
      : this.sql.exec('SELECT COUNT(*) n FROM attempts WHERE kind = ? AND ip = ? AND at > ?', kind, ip, since);
    return r.one().n;
  }

  note(kind, ip, now) {
    this.sql.exec('INSERT INTO attempts (kind, ip, at) VALUES (?, ?, ?)', kind, ip, now);
    this.sql.exec('DELETE FROM attempts WHERE at < ?', now - 2 * DAY);
  }

  // A sign-up. Says whether a confirmation email should go out; a repeat or an already-confirmed address sends nothing.
  subscribe(email, ip, now = Date.now()) {
    if (this.count('signup', now - HOUR, ip) >= LIMITS.ipPerHour) return { action: 'limited' };
    if (this.count('confirm', now - DAY) >= LIMITS.confirmsPerDay) return { action: 'limited' };
    this.note('signup', ip, now);
    const row = this.sql.exec('SELECT token, confirmed, last_sent FROM subs WHERE email = ?', email).toArray()[0];
    if (row?.confirmed) return { action: 'none' };
    if (row && now - (row.last_sent ?? 0) < LIMITS.resendAfter) return { action: 'none' };
    const token = row?.token ?? newToken();
    if (row) this.sql.exec('UPDATE subs SET last_sent = ? WHERE email = ?', now, email);
    else this.sql.exec('INSERT INTO subs (email, token, created, last_sent) VALUES (?, ?, ?, ?)', email, token, now, now);
    this.note('confirm', '', now);
    return { action: 'send', token };
  }

  confirm(token, now = Date.now()) {
    return this.sql.exec('UPDATE subs SET confirmed = 1, confirmed_at = COALESCE(confirmed_at, ?) WHERE token = ? RETURNING email', now, token).toArray().length > 0;
  }

  unsubscribe(token) {
    return this.sql.exec('DELETE FROM subs WHERE token = ? RETURNING email', token).toArray().length > 0;
  }

  overview() {
    const one = (q) => this.sql.exec(q).one().n;
    return {
      confirmed: one('SELECT COUNT(*) n FROM subs WHERE confirmed = 1'),
      pending: one('SELECT COUNT(*) n FROM subs WHERE confirmed = 0'),
      schedules: this.sql.exec('SELECT id, at, when_text AS "when", room, done FROM schedules WHERE done = 0 OR at > ? ORDER BY at DESC LIMIT 20', Date.now() - 7 * DAY).toArray(),
    };
  }

  addSchedule(at, when, room) {
    return this.sql.exec('INSERT INTO schedules (at, when_text, room) VALUES (?, ?, ?) RETURNING id', at, when, room).one().id;
  }

  cancelSchedule(id) {
    return this.sql.exec('DELETE FROM schedules WHERE id = ? AND done = 0 RETURNING id', id).toArray().length > 0;
  }

  // Schedules whose time has come, each with the confirmed people who have not had it yet.
  // Anything more than a day overdue is dropped rather than sent late.
  due(now = Date.now()) {
    this.sql.exec('UPDATE schedules SET done = 1 WHERE done = 0 AND at < ?', now - LIMITS.giveUpAfter);
    return this.sql.exec('SELECT id, when_text AS "when", room FROM schedules WHERE done = 0 AND at <= ? ORDER BY at', now).toArray().map((s) => ({
      ...s,
      to: this.sql.exec('SELECT email, token FROM subs WHERE confirmed = 1 AND email NOT IN (SELECT email FROM delivered WHERE schedule_id = ?)', s.id).toArray(),
    }));
  }

  delivered(id, emails) {
    for (const e of emails) this.sql.exec('INSERT OR IGNORE INTO delivered (schedule_id, email) VALUES (?, ?)', id, e);
  }

  finish(id) { this.sql.exec('UPDATE schedules SET done = 1 WHERE id = ?', id); }

  adminFails(ip, now = Date.now()) { return this.count('adminfail', now - HOUR, ip); }
  adminFailed(ip, now = Date.now()) { this.note('adminfail', ip, now); }
}

/* ------------------------------------------------------------------------------ sending */

async function send(env, messages) {
  if (!messages.length) return true;
  if (env.EMAIL_DRY_RUN === '1') { for (const m of messages) console.log('EMAIL', m.to, '|', m.subject, '|', m.text.split('\n').find((l) => l.includes('http')) ?? ''); return true; }
  if (!env.RESEND_API_KEY || !env.REMIND_FROM) return false;
  const body = messages.map((m) => ({ from: env.REMIND_FROM, to: [m.to], subject: m.subject, text: m.text, ...(m.headers ? { headers: m.headers } : {}) }));
  const res = await fetch('https://api.resend.com/emails/batch', {
    method: 'POST', headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json' }, body: JSON.stringify(body),
  });
  if (!res.ok) console.error('resend', res.status, (await res.text()).slice(0, 200));
  return res.ok;
}

const store = (env) => env.REMINDERS.get(env.REMINDERS.idFromName('main'));

// Send every due reminder (called by the cron trigger and straight after "Send now").
export async function runDue(env) {
  const db = store(env);
  for (const s of await db.due()) {
    let ok = true;
    for (let i = 0; i < s.to.length && ok; i += 100) {
      const chunk = s.to.slice(i, i + 100);
      ok = await send(env, chunk.map((p) => reminderMessage(p.email, p.token, s)));
      if (ok) await db.delivered(s.id, chunk.map((p) => p.email));
    }
    if (ok) await db.finish(s.id); // otherwise the next cron run picks up whoever is left
  }
}

/* --------------------------------------------------------------------------------- HTTP */

const json = (data, status = 200, extra = {}) => new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json', 'cache-control': 'no-store', ...extra } });
const html = (title, body, status = 200) => new Response(page(title, body), { status, headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store', 'x-robots-tag': 'noindex' } });

const ORIGINS = new Set([SITE, 'https://www.lanparty1998.com']);
const cors = (request) => {
  const o = request.headers.get('Origin');
  const ok = o && (ORIGINS.has(o) || /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(o));
  return ok ? { 'access-control-allow-origin': o, 'access-control-allow-headers': 'content-type, authorization', 'access-control-allow-methods': 'GET, POST, DELETE, OPTIONS', vary: 'Origin' } : { vary: 'Origin' };
};

const readJson = async (request) => { try { return await request.json(); } catch { return {}; } };

async function admin(request, env, ip) {
  const db = store(env);
  if ((await db.adminFails(ip)) >= LIMITS.adminFailsPerHour) return 'limited';
  const given = (request.headers.get('Authorization') ?? '').replace(/^Bearer /i, '');
  if (!env.ADMIN_TOKEN || !safeEqual(given, env.ADMIN_TOKEN)) { await db.adminFailed(ip); return 'denied'; }
  return 'ok';
}

export async function handleReminders(request, env, ctx) {
  const url = new URL(request.url);
  const c = cors(request);
  const ip = request.headers.get('CF-Connecting-IP') ?? 'unknown';
  const db = store(env);
  const reply = (r) => { for (const [k, v] of Object.entries(c)) r.headers.set(k, v); return r; };
  if (request.method === 'OPTIONS') return reply(new Response(null, { status: 204 }));

  // sign up
  if (url.pathname === '/reminders' && request.method === 'POST') {
    const body = await readJson(request);
    if (body.website) return reply(json({ ok: true })); // the hidden field only a bot fills in
    const email = cleanEmail(body.email);
    if (!email) return reply(json({ ok: false, error: 'That does not look like an email address.' }, 400));
    const r = await db.subscribe(email, ip);
    if (r.action === 'limited') return reply(json({ ok: false, error: 'Too many sign-ups right now. Try again later.' }, 429));
    if (r.action === 'send' && !(await send(env, [confirmMessage(email, r.token)]))) return reply(json({ ok: false, error: 'Email is not working right now. Try again later.' }, 503));
    return reply(json({ ok: true })); // the same answer whether or not the address was already known
  }

  // the link in the confirmation email
  if (url.pathname === '/reminders/confirm' && request.method === 'GET') {
    const t = cleanToken(url.searchParams.get('t'));
    if (t && await db.confirm(t)) return html('You are on the list', `<p>Thanks. We will email you before the next LAN party.</p><p><a href="${SITE}/">Walk into the basement</a></p>`);
    return html('Link not recognised', `<p>That link is old or has been used up. Sign up again from the Start menu in the basement.</p><p><a href="${SITE}/">LAN Party '98</a></p>`, 404);
  }

  // the unsubscribe link: a page with a button (so mail scanners cannot unsubscribe people), and a POST that does it
  if (url.pathname === '/reminders/unsubscribe') {
    const t = cleanToken(url.searchParams.get('t'));
    if (request.method === 'GET') {
      return html('Unsubscribe', t
        ? `<p>Stop LAN party reminders to this address?</p><form method="post" action="/reminders/unsubscribe?t=${t}"><button type="submit">Unsubscribe</button></form>`
        : '<p>That link is not valid.</p>', t ? 200 : 404);
    }
    if (request.method === 'POST') {
      if (t) await db.unsubscribe(t);
      // the button on the page asks for HTML; a mail client's one-click unsubscribe does not
      return request.headers.get('accept')?.includes('text/html')
        ? html('Unsubscribed', '<p>Done. You will not get any more reminders and your address has been deleted.</p>')
        : new Response('ok');
    }
  }

  // organiser
  if (url.pathname.startsWith('/admin/reminders')) {
    const a = await admin(request, env, ip);
    if (a === 'limited') return reply(json({ ok: false, error: 'Too many wrong passwords. Try again later.' }, 429));
    if (a === 'denied') return reply(json({ ok: false, error: 'Wrong password.' }, 401));
    if (request.method === 'GET' && url.pathname === '/admin/reminders') return reply(json({ ok: true, ...(await db.overview()) }));
    if (request.method === 'POST' && url.pathname === '/admin/reminders') {
      const b = await readJson(request);
      const at = Number(b.at);
      if (!Number.isFinite(at) || at < Date.now() - 60e3 || at > Date.now() + 365 * DAY) return reply(json({ ok: false, error: 'Pick a date within the next year.' }, 400));
      await db.addSchedule(Math.round(at), cleanText(b.when, LIMITS.maxLen), cleanRoom(b.room));
      if (at <= Date.now() + 60e3) ctx.waitUntil(runDue(env));
      return reply(json({ ok: true, ...(await db.overview()) }));
    }
    const del = url.pathname.match(/^\/admin\/reminders\/(\d{1,9})$/);
    if (request.method === 'DELETE' && del) { await db.cancelSchedule(Number(del[1])); return reply(json({ ok: true, ...(await db.overview()) })); }
  }

  return reply(json({ ok: false, error: 'Not found' }, 404));
}
