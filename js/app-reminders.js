// Party Reminders: a Programs menu window where anyone can ask for an email before the next LAN party, and where the
// organiser (anyone who knows the password) schedules the email and sees how many people are signed up.
// The sign-ups live on the room server (server/src/reminders.js). The password is only ever held in memory, here.
import { HTTP_SERVER } from './net.js';
import { icon } from './icons.js';

const el = (tag, cls, html) => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (html != null) e.innerHTML = html;
  return e;
};

// "Sat 18 Oct, 7:30 PM" in the viewer's own time zone
export const stamp = (ms, locale) => new Date(ms).toLocaleString(locale, { weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });

// The value of a datetime-local box ("2026-10-17T19:30", the organiser's own time) as epoch milliseconds, or null.
export const parseLocal = (v) => {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(String(v))) return null;
  const t = new Date(v).getTime();
  return Number.isFinite(t) ? t : null;
};

async function call(method, path, body, password) {
  try {
    const res = await fetch(`${HTTP_SERVER}${path}`, {
      method,
      headers: { ...(body ? { 'content-type': 'application/json' } : {}), ...(password ? { Authorization: `Bearer ${password}` } : {}) },
      body: body ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(10000),
    });
    return await res.json();
  } catch {
    return { ok: false, error: 'Cannot reach the server. Try again in a minute.' };
  }
}

export const reminders = {
  id: 'remind', title: 'Party Reminders', icon: 'mail', size: [390], pos: [150, 60],
  menus: (ctx) => [
    { label: 'File', items: [{ label: 'Organiser...', run: () => ctx.organiser() }, { sep: true }, { label: 'Exit', run: ctx.close }] },
    {
      label: 'Help',
      items: [{
        label: 'About Party Reminders',
        run: () => ctx.desktop.message({
          title: 'About Party Reminders', kind: 'info',
          text: "Type your email and we will send one message to confirm it, then one before each LAN party. Every email has an unsubscribe link, and unsubscribing deletes your address.",
        }),
      }],
    },
  ],

  build(ctx) {
    const root = el('div', 'rm');
    root.setAttribute('data-owns-keys', '');
    root.innerHTML = `
      <div class="rm-head">${icon('mail', 32)}<p>Get an email before the next LAN party, so you never miss a frag.</p></div>
      <form class="rm-form" novalidate>
        <label class="rm-row">Your email: <input class="rm-in" type="email" name="email" maxlength="254" autocomplete="email" spellcheck="false" data-autofocus></label>
        <input class="rm-hp" type="text" name="website" tabindex="-1" autocomplete="off" aria-hidden="true">
        <div class="w98-actions"><button type="submit" class="w98-btn default">Remind me</button></div>
      </form>
      <output class="rm-status" aria-live="polite"></output>
      <p class="rm-small">We use your address only to send these reminders. You confirm it by email first, and every email has an unsubscribe link that deletes it.</p>
      <section class="rm-org" hidden></section>`;
    ctx.body.append(root);

    const form = root.querySelector('.rm-form');
    const status = root.querySelector('.rm-status');
    const org = root.querySelector('.rm-org');
    const say = (text) => { status.textContent = text; };

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const btn = form.querySelector('button');
      const email = form.email.value.trim();
      if (!email) { say('Type your email address first.'); form.email.focus(); return; }
      btn.disabled = true;
      say('Sending...');
      const r = await call('POST', '/reminders', { email, website: form.website.value });
      btn.disabled = false;
      if (r.ok) { say('Check your inbox for a confirmation email. Click the link in it and you are on the list.'); form.email.value = ''; }
      else say(`Error: ${r.error ?? 'Something went wrong.'}`);
    });

    /* ---- the organiser's panel ---- */
    let password = '';
    const showLogin = () => {
      org.hidden = false;
      org.innerHTML = `<h2>Organiser</h2>
        <form class="rm-login"><label class="rm-row">Password: <input class="rm-in" type="password" name="pw" autocomplete="current-password" data-autofocus></label>
        <div class="w98-actions"><button type="submit" class="w98-btn default">Log in</button></div></form><output class="rm-org-status" aria-live="polite"></output>`;
      const f = org.querySelector('.rm-login');
      const out = org.querySelector('.rm-org-status');
      f.pw.focus();
      f.addEventListener('submit', async (e) => {
        e.preventDefault();
        out.textContent = 'Checking...';
        const r = await call('GET', '/admin/reminders', null, f.pw.value);
        if (!r.ok) { out.textContent = `Error: ${r.error}`; return; }
        password = f.pw.value;
        showPanel(r);
      });
    };

    const showPanel = (data) => {
      const list = (data.schedules ?? []).map((s) => `<li><span>${stamp(s.at)}${s.when ? ` — ${s.when.replace(/[<>&]/g, '')}` : ''}${s.room ? ` — room ${s.room}` : ''}: <b>${s.done ? 'sent' : 'waiting'}</b></span>${s.done ? '' : `<button type="button" class="w98-btn" data-cancel="${s.id}">Cancel</button>`}</li>`).join('');
      org.hidden = false;
      org.innerHTML = `<h2>Organiser</h2>
        <p><b>${data.confirmed}</b> confirmed, <b>${data.pending}</b> waiting to confirm.</p>
        <ul class="rm-list">${list || '<li>Nothing scheduled.</li>'}</ul>
        <form class="rm-sched">
          <label class="rm-row">Send at: <input class="rm-in" type="datetime-local" name="at"></label>
          <label class="rm-row">Doors open: <input class="rm-in" type="text" name="when" maxlength="120" placeholder="Sat 7:30 PM"></label>
          <label class="rm-row">Room: <input class="rm-in" type="text" name="room" maxlength="32" placeholder="basement (or a private room)"></label>
          <div class="w98-actions"><button type="button" class="w98-btn" data-now>Send now</button><button type="submit" class="w98-btn default">Schedule</button></div>
        </form><output class="rm-org-status" aria-live="polite"></output>`;
      const f = org.querySelector('.rm-sched');
      const out = org.querySelector('.rm-org-status');
      const book = async (at) => {
        out.textContent = 'Saving...';
        const r = await call('POST', '/admin/reminders', { at, when: f.when.value, room: f.room.value }, password);
        if (r.ok) showPanel(r); else out.textContent = `Error: ${r.error}`;
      };
      f.addEventListener('submit', (e) => {
        e.preventDefault();
        const at = parseLocal(f.at.value);
        if (at == null) { out.textContent = 'Error: pick a date and time first.'; return; }
        book(at);
      });
      f.querySelector('[data-now]').addEventListener('click', () => {
        ctx.desktop.message({
          title: 'Send now', kind: 'info', buttons: ['Send', 'Cancel'],
          text: `Email everyone who has confirmed (${data.confirmed} ${data.confirmed === 1 ? 'person' : 'people'}) right now?`,
          onChoose: (label) => { if (label === 'Send') book(Date.now()); },
        });
      });
    };

    // Cancel buttons in the schedule list (the list is redrawn, so listen once on the section)
    org.addEventListener('click', async (e) => {
      const id = e.target.closest?.('[data-cancel]')?.dataset.cancel;
      if (!id) return;
      const r = await call('DELETE', `/admin/reminders/${id}`, null, password);
      if (r.ok) showPanel(r); else org.querySelector('.rm-org-status').textContent = `Error: ${r.error}`;
    });

    ctx.organiser = () => { if (password) call('GET', '/admin/reminders', null, password).then((r) => (r.ok ? showPanel(r) : showLogin())); else showLogin(); };
  },
};
