// What the pages outside the game do in the browser: the hit counter and the guestbook.
// The pages are written by scripts/build-site.mjs and read fine without this. No imports.
// The counter shares its key with Internet Explorer in the basement (js/app-browser.js), so a visit to either counts.
const VISITS_KEY = 'lan98-web-visits';
const COUNTED_KEY = 'lan98-web-counted';

const read = (store, key) => { try { return store.getItem(key); } catch { return null; } };
const write = (store, key, value) => { try { store.setItem(key, value); } catch { /* private mode: the counter simply stays put */ } };

// the counter goes up by one for the first look at the home page in a visit
function counter() {
  const el = document.querySelector('.w-counter');
  if (!el) return;
  const base = Number(document.body.dataset.visitorsBase) || 0;
  let visits = Number(read(localStorage, VISITS_KEY)) || 0;
  if (document.body.dataset.page === '/home' && !read(sessionStorage, COUNTED_KEY)) {
    visits += 1;
    write(localStorage, VISITS_KEY, String(visits));
    write(sessionStorage, COUNTED_KEY, '1');
  }
  const n = base + Math.max(1, visits);
  el.setAttribute('aria-label', `Visitors: ${n}`);
  el.replaceChildren(...String(n).padStart(6, '0').split('').map((d) => Object.assign(document.createElement('i'), { textContent: d })));
}

// signing the guestbook adds a line to the page, and it stays until you leave: nothing is sent anywhere
function guestbook() {
  const form = document.querySelector('form[data-guestbook]');
  const list = document.querySelector('.w-guest');
  if (!form || !list) return;
  const status = Object.assign(document.createElement('p'), { className: 'w-more' });
  status.setAttribute('role', 'status');
  form.after(status);
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const name = form.elements.name.value.trim();
    const msg = form.elements.msg.value.trim();
    if (!msg) { status.textContent = 'Type a message first. The guestbook does not take blanks.'; return; }
    const row = (list.tBodies[0] ?? list).insertRow(0);
    const date = row.insertCell();
    date.className = 'w-date';
    date.textContent = '7 Feb 1998';
    const text = row.insertCell();
    const who = document.createElement('b');
    who.textContent = name || 'Anonymous';
    text.append(who, document.createElement('br'), msg);
    form.reset();
    status.textContent = 'Thanks for signing the guestbook.';
  });
}

counter();
guestbook();
