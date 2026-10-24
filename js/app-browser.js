// Internet Explorer: the web browser on the desktop, and the only site it can reach is the
// party's own, http://lanparty1998.com/ (pages in js/web-pages.js, news in js/web-news.js).
// Everything else gets "The page cannot be displayed", which is what a basement hub did in 1998.
//
// A window has a menu bar, the standard buttons, an Address bar, a Links bar, an Explorer bar
// (Search, Favorites or History down the left) and a status bar with a progress meter.
// Pages load slowly on purpose, in a few steps, and the throbber spins while they do.
// Nothing is saved except the visitor counter. The icons are the party's own pixel art, never a real logo.
import { icon } from './icons.js';
import { route, parseUrl, joinUrl, source, search, PAGE_LIST, HOME, GUESTBOOK } from './web-pages.js';

const el = (tag, cls, html) => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (html != null) e.innerHTML = html;
  return e;
};
const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
const strip = (url) => url.replace(/#.*$/, '');
const VISITS_KEY = 'lan98-web-visits';

const TOOLS = [
  ['back', 'Back', 'back'], ['fwd', 'Forward', 'fwd'], ['stop', 'Stop', 'stop'], ['refresh', 'Refresh', 'refresh'], ['home', 'Home', 'home'],
  null,
  ['search', 'Search', 'search'], ['favs', 'Favorites', 'star'], ['history', 'History', 'clock'],
  null,
  ['print', 'Print', 'print'],
];

const LINKS = [['Home', HOME], ['What\'s New', `${HOME}news.htm`], ['Games', `${HOME}games.htm`], ['How to Play', `${HOME}howto.htm`], ['Guestbook', `${HOME}guestbook.htm`]];

// It opens big, so you see several of the latest features without scrolling: the page column is built for
// 800x600, so the window is 820 wide and as tall as the PC's screen allows, up to 780. Smaller screens get as much
// window as there is room for.
const OPEN_W = 820, OPEN_H = 780, EDGE = 24;
const openSize = () => {
  const desk = document.getElementById('desktop'); // the PC screen, not the browser window
  const w = desk?.clientWidth || innerWidth, h = desk?.clientHeight || innerHeight;
  return [Math.max(400, Math.min(OPEN_W, w - 2 * EDGE)), Math.max(280, Math.min(OPEN_H, h - 2 * EDGE))];
};

export const ie = {
  id: 'ie', title: 'Internet Explorer', icon: 'globe', pos: [EDGE + 24, EDGE], resize: true, min: [400, 280],
  get size() { return openSize(); }, // read each time the window opens, so it fits the screen as it is now

  menus: (ctx) => [
    {
      label: 'File',
      items: [
        { label: 'Open...', key: 'Ctrl+L', run: () => ctx.ie.focusAddress() },
        { sep: true },
        { label: 'Print...', run: () => ctx.ie.print() },
        { label: 'Work Offline', checked: () => ctx.ie.offline(), run: () => ctx.ie.toggleOffline() },
        { sep: true },
        { label: 'Close', run: ctx.close },
      ],
    },
    {
      label: 'Edit',
      items: [
        { label: 'Copy', key: 'Ctrl+C', run: () => ctx.ie.copy() },
        { label: 'Select All', key: 'Ctrl+A', run: () => ctx.ie.selectAll() },
      ],
    },
    {
      label: 'View',
      items: [
        { label: 'Standard Buttons', checked: () => ctx.ie.shown('.ie-toolbar'), run: () => ctx.ie.toggleBar('.ie-toolbar') },
        { label: 'Address Bar', checked: () => ctx.ie.shown('.ie-addr'), run: () => ctx.ie.toggleBar('.ie-addr') },
        { label: 'Links', checked: () => ctx.ie.shown('.ie-links'), run: () => ctx.ie.toggleBar('.ie-links') },
        { label: 'Status Bar', checked: () => ctx.ie.shown('.ie-status'), run: () => ctx.ie.toggleBar('.ie-status') },
        { sep: true },
        { label: 'Search', checked: () => ctx.ie.pane() === 'search', run: () => ctx.ie.showPane('search') },
        { label: 'Favorites', checked: () => ctx.ie.pane() === 'favs', run: () => ctx.ie.showPane('favs') },
        { label: 'History', checked: () => ctx.ie.pane() === 'history', run: () => ctx.ie.showPane('history') },
        { sep: true },
        { label: 'Stop', key: 'Esc', run: () => ctx.ie.stop() },
        { label: 'Refresh', key: 'F5', run: () => ctx.ie.reload() },
        { sep: true },
        { label: 'Source', run: () => ctx.ie.viewSource() },
        { label: 'Full Screen', key: 'F11', run: () => ctx.desktop.toggleMax('ie') },
      ],
    },
    {
      label: 'Go',
      items: [
        { label: 'Back', key: 'Alt+Left', run: () => ctx.ie.back() },
        { label: 'Forward', key: 'Alt+Right', run: () => ctx.ie.forward() },
        { sep: true },
        { label: 'Home Page', key: 'Alt+Home', run: () => ctx.ie.go(HOME) },
        { label: 'Search the Web', run: () => ctx.ie.showPane('search', true) },
      ],
    },
    {
      label: 'Favorites',
      items: [
        { label: 'Add to Favorites...', run: () => ctx.ie.addFavorite() },
        { sep: true },
        ...PAGE_LIST.map((p) => ({ label: p.title, run: () => ctx.ie.go(p.url) })),
      ],
    },
    {
      label: 'Help',
      items: [{
        label: 'About Internet Explorer',
        run: () => ctx.desktop.message({
          title: 'About Internet Explorer', kind: 'info',
          text: 'Internet Explorer 4.01. Reads the web as far as the basement hub goes, which is lanparty1998.com. The rest of the web is a long way off down a 56K line.',
        }),
      }],
    },
  ],

  build(ctx) {
    ctx.body.classList.add('ie');
    ctx.body.innerHTML = `
      <div class="ie-bar ie-toolbar" role="toolbar" aria-label="Standard Buttons"></div>
      <div class="ie-bar ie-addr">
        <label class="ie-lbl" for="ie-url">Address</label>
        <div class="ie-combo"><span class="ie-pico"></span><input id="ie-url" class="ie-url" type="text" spellcheck="false" autocomplete="off" aria-label="Address" data-autofocus>
          <button type="button" class="ie-drop" aria-label="Show previous addresses" aria-haspopup="true"><span></span></button></div>
        <button type="button" class="w98-btn ie-go">Go</button>
      </div>
      <div class="ie-bar ie-links" role="toolbar" aria-label="Links"><span class="ie-lbl">Links</span></div>
      <div class="ie-main">
        <aside class="ie-pane" hidden aria-label="Explorer bar">
          <div class="ie-pane-h"><b class="ie-pane-t"></b><button type="button" class="ie-pane-x" aria-label="Close the Explorer bar">×</button></div>
          <div class="ie-pane-body"></div>
        </aside>
        <div class="ie-view" tabindex="0" role="document" aria-label="Web page"><div class="web"></div></div>
      </div>
      <div class="ie-bar ie-status">
        <span class="ie-st-text" role="status" aria-live="polite">Done</span>
        <span class="ie-st-prog" aria-hidden="true"><i></i></span>
        <span class="ie-st-zone">${icon('globe')}Internet</span>
      </div>`;

    const $ = (s) => ctx.body.querySelector(s);
    const toolbar = $('.ie-toolbar'), addr = $('.ie-addr'), linkBar = $('.ie-links');
    const urlIn = $('.ie-url'), drop = $('.ie-drop');
    const view = $('.ie-view'), web = $('.web');
    const pane = $('.ie-pane'), paneBody = $('.ie-pane-body'), paneTitle = $('.ie-pane-t');
    const statusText = $('.ie-st-text'), prog = $('.ie-st-prog i');
    $('.ie-pico').innerHTML = icon('page');

    /* ---- session state: history, favourites, what the guestbook holds ---- */
    const state = { guestbook: GUESTBOOK.map((g) => ({ ...g })), visits: 0 };
    try { state.visits = (Number(localStorage.getItem(VISITS_KEY)) || 0); } catch { /* private mode */ }
    const stack = []; // [{ url, title }]
    let at = -1, desc = null, timer = 0, spin = 0, loadId = 0, offline = false, paneName = null, popup = null;
    const visited = new Set();
    const typed = [];
    const favorites = PAGE_LIST.map((p) => ({ url: p.url, title: p.title }));

    /* ---- toolbar and links bar ---- */
    const buttons = {};
    for (const t of TOOLS) {
      if (!t) { toolbar.append(el('span', 'ie-sep')); continue; }
      const [cmd, label, ic] = t;
      const b = el('button', 'ie-tb', `${icon(ic)}<span>${label}</span>`);
      b.type = 'button';
      b.dataset.cmd = cmd;
      if (cmd === 'favs' || cmd === 'history' || cmd === 'search') b.setAttribute('aria-pressed', 'false');
      b.addEventListener('click', () => command(cmd));
      toolbar.append(b);
      buttons[cmd] = b;
    }
    const throb = el('span', 'ie-throb');
    throb.setAttribute('aria-hidden', 'true');
    throb.innerHTML = icon('globe', 32);
    toolbar.append(throb);
    for (const [label, url] of LINKS) {
      const b = el('button', 'ie-link', `${icon('page')}<span></span>`);
      b.type = 'button';
      b.querySelector('span').textContent = label;
      b.addEventListener('click', () => go(url));
      linkBar.append(b);
    }

    function command(cmd) {
      if (cmd === 'back') back();
      else if (cmd === 'fwd') forward();
      else if (cmd === 'stop') stop();
      else if (cmd === 'refresh') reload();
      else if (cmd === 'home') go(HOME);
      else if (cmd === 'search' || cmd === 'favs' || cmd === 'history') showPane(cmd);
      else if (cmd === 'print') print();
    }

    function sync() {
      buttons.back.disabled = at <= 0;
      buttons.fwd.disabled = at >= stack.length - 1;
      buttons.stop.disabled = !timer;
    }

    /* ---- the status bar and the throbber ---- */
    const say = (text) => { statusText.textContent = text; };
    const frames = ['globe', 'globe2', 'globe3'];
    function spinner(on) {
      clearInterval(spin);
      spin = 0;
      let f = 0;
      throb.innerHTML = icon('globe', 32);
      if (on && !reduced()) spin = setInterval(() => { f = (f + 1) % frames.length; throb.innerHTML = icon(frames[f], 32); }, 140);
    }

    /* ---- loading a page: a few steps, like a slow line ---- */
    function stop() {
      if (!timer) return;
      clearInterval(timer);
      timer = 0;
      loadId++;
      spinner(false);
      prog.style.width = '0';
      say('Done');
      sync();
    }

    // desc: what route() gave; how: 'push' (a new page), 'reload', or an index into the stack (back/forward)
    function open(next, how = 'push') {
      stop();
      const id = ++loadId;
      const host = new URL(next.url.startsWith('about:') || next.url.startsWith('mailto:') ? HOME : next.url).hostname;
      const fast = reduced() || next.kind === 'blank';
      const steps = fast ? 1 : 8;
      let i = 0;
      spinner(true);
      say(`Finding site ${host}...`);
      prog.style.width = '0';
      const finish = () => {
        clearInterval(timer);
        timer = 0;
        if (id !== loadId) return;
        spinner(false);
        prog.style.width = '0';
        if (how === 'push') {
          stack.length = at + 1;
          stack.push({ url: next.url, title: next.title });
          at = stack.length - 1;
          if (next.kind === 'page' && !typed.includes(next.url)) typed.push(next.url);
        } else if (typeof how === 'number') at = how;
        else if (stack[at]) stack[at].title = next.title;
        show(next);
        sync();
      };
      timer = setInterval(() => {
        if (id !== loadId) return;
        i++;
        prog.style.width = `${Math.min(100, Math.round((i / steps) * 100))}%`;
        if (i === 3) say('Web site found. Waiting for reply...');
        if (i === 5) say(`Opening page ${next.url}...`);
        if (i >= steps) finish();
      }, fast ? 0 : (next.kind === 'error' ? 110 : 70 + (next.url.length % 5) * 12));
      sync();
    }

    function show(next) {
      desc = next;
      const key = strip(next.url);
      if (next.kind === 'page' && next.path === '/' && !visited.has(key)) { // a first look at the home page counts as a visit
        state.visits += 1;
        try { localStorage.setItem(VISITS_KEY, String(state.visits)); } catch { /* private mode */ }
      }
      if (next.kind === 'page' || next.kind === 'error') visited.add(key);
      web.innerHTML = next.html({ ...state, visits: Math.max(1, state.visits) });
      web.dataset.kind = next.kind;
      for (const a of web.querySelectorAll('a[href]')) {
        const target = parseUrl(joinUrl(next.url, a.getAttribute('href')));
        if (target && visited.has(strip(target.url))) a.classList.add('visited');
      }
      urlIn.value = next.url;
      ctx.setTitle(`${next.title} - Internet Explorer`);
      const anchor = next.hash && web.querySelector(`[id="${CSS.escape(next.hash.slice(1))}"]`);
      if (anchor) anchor.scrollIntoView({ block: 'start' });
      else view.scrollTop = 0;
      say('Done');
      renderPane();
    }

    /* ---- going places ---- */
    function go(raw) {
      const next = route(joinUrl(desc?.url ?? HOME, raw));
      if (!next) return;
      if (next.kind === 'mailto') { mail(next.path); return; }
      if (offline && !visited.has(strip(next.url)) && next.kind !== 'blank') {
        ctx.desktop.message({
          title: 'Internet Explorer', kind: 'info', buttons: ['Connect', 'Stay Offline'],
          text: 'This Web page is not available offline. To view it, click Connect.',
          onChoose: (label) => { if (label === 'Connect') { offline = false; open(next); } },
        });
        return;
      }
      const same = desc && strip(desc.url) === strip(next.url) && next.hash && next.kind === 'page';
      if (same) { // an #anchor on this page: just scroll
        desc = { ...desc, url: next.url, hash: next.hash };
        stack[at] = { url: next.url, title: next.title };
        urlIn.value = next.url;
        const anchor = web.querySelector(`[id="${CSS.escape(next.hash.slice(1))}"]`);
        if (anchor) anchor.scrollIntoView({ block: 'start' });
        return;
      }
      open(next);
    }
    const back = () => { if (at > 0) open(route(stack[at - 1].url), at - 1); };
    const forward = () => { if (at < stack.length - 1) open(route(stack[at + 1].url), at + 1); };
    const reload = () => { if (desc) open(route(desc.url), 'reload'); };

    function mail(address) {
      ctx.desktop.message({
        title: 'Internet Explorer', kind: 'error',
        text: `Unable to start your mail program. Nobody has installed one in this basement. The address is ${address}.`,
      });
    }

    /* ---- the Address bar ---- */
    const submit = () => {
      const raw = urlIn.value.trim();
      if (!raw) return;
      go(parseUrl(raw)?.url ?? raw);
    };
    urlIn.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); closePopup(); submit(); } });
    urlIn.addEventListener('focus', () => urlIn.select());
    $('.ie-go').addEventListener('click', submit);

    function closePopup() {
      popup?.remove();
      popup = null;
      document.removeEventListener('pointerdown', away, true);
    }
    function away(e) { if (popup && !popup.contains(e.target) && !drop.contains(e.target)) closePopup(); }
    drop.addEventListener('click', () => {
      if (popup) { closePopup(); return; }
      popup = el('ul', 'w98-popup ie-drop-list');
      popup.setAttribute('role', 'menu');
      for (const url of (typed.length ? typed : [HOME]).slice().reverse()) {
        const li = el('li');
        const b = el('button', 'sm-item', `${icon('page')}<span class="sm-label"></span>`);
        b.type = 'button';
        b.setAttribute('role', 'menuitem');
        b.querySelector('.sm-label').textContent = url;
        b.addEventListener('click', () => { closePopup(); go(url); });
        li.append(b);
        popup.append(li);
      }
      addr.querySelector('.ie-combo').append(popup);
      document.addEventListener('pointerdown', away, true);
    });

    /* ---- clicks inside the page ---- */
    web.addEventListener('click', (e) => {
      const a = e.target.closest('a[href]');
      if (!a || !web.contains(a)) return;
      e.preventDefault(); // nothing in here is a real link: the address is worked out against the page, not the real site
      if (e.button === 0) go(a.getAttribute('href'));
    });
    web.addEventListener('mouseover', (e) => {
      const a = e.target.closest('a[href]');
      if (a) say(joinUrl(desc?.url ?? HOME, a.getAttribute('href')));
    });
    web.addEventListener('mouseout', (e) => { if (e.target.closest('a[href]') && !timer) say('Done'); });
    web.addEventListener('submit', (e) => {
      const form = e.target.closest('form[data-guestbook]');
      if (!form) return;
      e.preventDefault();
      const name = form.elements.name.value.trim();
      const msg = form.elements.msg.value.trim();
      if (!msg) {
        ctx.desktop.message({ title: 'Internet Explorer', kind: 'info', text: 'Type a message first. The guestbook does not take blanks.' });
        return;
      }
      state.guestbook.unshift({ date: '7 Feb 1998', name: name || 'Anonymous', msg });
      show(desc);
      view.scrollTop = 0;
      say('Thanks for signing the guestbook.');
    });

    /* ---- the Explorer bar: Search, Favorites, History ---- */
    function showPane(name, focusSearch = false) {
      paneName = paneName === name && !focusSearch ? null : name;
      pane.hidden = !paneName;
      for (const k of ['search', 'favs', 'history']) buttons[k].setAttribute('aria-pressed', String(paneName === k));
      renderPane();
      if (focusSearch) paneBody.querySelector('input')?.focus();
    }
    pane.querySelector('.ie-pane-x').addEventListener('click', () => showPane(paneName));

    const item = (ic, label, url) => {
      const b = el('button', 'ie-item', `${icon(ic)}<span></span>`);
      b.type = 'button';
      b.title = url;
      b.querySelector('span').textContent = label;
      b.addEventListener('click', () => go(url));
      return b;
    };

    function renderPane() {
      if (!paneName) return;
      paneBody.replaceChildren();
      if (paneName === 'favs') {
        paneTitle.textContent = 'Favorites';
        const add = el('button', 'w98-btn ie-add', 'Add...');
        add.type = 'button';
        add.addEventListener('click', addFavorite);
        paneBody.append(add, ...favorites.map((f) => item('page', f.title, f.url)));
      } else if (paneName === 'history') {
        paneTitle.textContent = 'History';
        paneBody.append(el('div', 'ie-pane-sub', 'Today'));
        paneBody.append(...stack.slice().reverse().map((h) => item('page', h.title, h.url)));
      } else {
        paneTitle.textContent = 'Search';
        const form = el('form', 'ie-search', '<label>Search this site for:<input type="text" maxlength="40" autocomplete="off" spellcheck="false"></label><button type="submit" class="w98-btn">Search</button>');
        const results = el('ul', 'ie-results');
        results.setAttribute('aria-live', 'polite');
        form.addEventListener('submit', (e) => {
          e.preventDefault();
          const q = form.querySelector('input').value.trim();
          results.replaceChildren();
          if (!q) return;
          const hits = search(q);
          if (!hits.length) { results.append(el('li', 'ie-none', 'No pages found.')); return; }
          for (const h of hits) {
            const li = el('li');
            li.append(item('page', h.title, h.url), Object.assign(el('div', 'ie-snip'), { textContent: h.snippet }));
            results.append(li);
          }
        });
        paneBody.append(form, results);
      }
    }

    function addFavorite() {
      if (!desc || desc.kind !== 'page') return;
      if (!favorites.some((f) => f.url === desc.url)) favorites.push({ url: desc.url, title: desc.title });
      say(`Added ${desc.title} to Favorites.`);
      if (paneName === 'favs') renderPane();
    }

    /* ---- the odd menu items ---- */
    function print() {
      ctx.desktop.message({ title: 'Print', kind: 'error', text: 'No printer is installed. The only printer in this house is upstairs, and Mum is using it.' });
    }
    let sourceN = 0;
    function viewSource() {
      if (!desc) return;
      const id = `ie-source-${++sourceN}`;
      const text = source(desc, state);
      ctx.desktop.define({
        id, title: `Source of ${desc.url} - Notepad`, icon: 'notepad', size: [480, 320], resize: true, transient: true,
        menus: (c) => [{ label: 'File', items: [{ label: 'Exit', run: c.close }] }],
        build: (c) => {
          c.body.classList.add('np');
          const ta = el('textarea', 'np-text');
          ta.readOnly = true;
          ta.spellcheck = false;
          ta.value = text;
          ta.setAttribute('aria-label', 'Page source');
          c.body.append(ta);
        },
      });
      ctx.desktop.open(id);
    }
    function selectAll() {
      const range = document.createRange();
      range.selectNodeContents(web);
      const sel = getSelection();
      sel.removeAllRanges();
      sel.addRange(range);
    }
    function copy() {
      const text = String(getSelection());
      if (text) navigator.clipboard?.writeText(text).catch(() => {});
    }
    const toggleBar = (sel) => { const bar = $(sel); bar.hidden = !bar.hidden; };

    /* ---- the keyboard ---- */
    ctx.root.tabIndex = -1;
    ctx.root.addEventListener('keydown', (e) => {
      const inField = e.target.matches('input, textarea');
      if (e.key === 'F5') { e.preventDefault(); reload(); }
      else if (e.key === 'F11') { e.preventDefault(); ctx.desktop.toggleMax('ie'); }
      else if (e.key === 'Escape' && timer) { e.preventDefault(); e.stopPropagation(); stop(); }
      else if (e.altKey && e.key === 'ArrowLeft') { e.preventDefault(); back(); }
      else if (e.altKey && e.key === 'ArrowRight') { e.preventDefault(); forward(); }
      else if (e.altKey && e.key === 'Home') { e.preventDefault(); go(HOME); }
      else if ((e.ctrlKey && e.key.toLowerCase() === 'l') || (e.altKey && e.key.toLowerCase() === 'd')) { e.preventDefault(); urlIn.focus(); }
      else if (e.key === 'Backspace' && !inField) { e.preventDefault(); back(); }
    });

    ctx.ie = {
      go, back, forward, reload, stop, print, viewSource, selectAll, copy, addFavorite, toggleBar, showPane,
      offline: () => offline,
      toggleOffline: () => { offline = !offline; say(offline ? 'Working offline. Pages you have seen are kept.' : 'Done'); },
      shown: (sel) => !$(sel).hidden,
      pane: () => paneName,
      focusAddress: () => { urlIn.focus(); },
    };

    sync();
    go(ctx.arg ?? HOME);
    return {
      api: ctx.ie,
      dispose() { clearInterval(timer); clearInterval(spin); closePopup(); },
    };
  },

  // Start > Favorites, Run and the H key open it; an address can come with them
  onOpen: (win, url, fresh) => { if (url && !fresh) win.api?.go(url); },
};
