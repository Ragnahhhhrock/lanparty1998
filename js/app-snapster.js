// Snapster: the file-sharing client on the Programs menu. Search a crowd of regulars for MP3s, get them, watch
// the transfers crawl and find them in your library. The network is made up (snapster.js): every band and
// title is invented, and no file is ever downloaded. This is the window.
import * as S from './snapster.js';

const el = (tag, cls, html) => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (html != null) e.innerHTML = html;
  return e;
};
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

const HANDLE = 'basement_guest';
const net = S.buildNetwork();
const library = new S.Library();
const transfers = new S.Transfers({ mySpeed: S.DEFAULT_SPEED });

const RESULT_COLS = [
  ['name', 'Filename'], ['size', 'Size'], ['bitrate', 'Bitrate'], ['freq', 'Freq'], ['seconds', 'Time'], ['conn', 'Connection'], ['ping', 'Ping'], ['user', 'User'],
];
const NUMERIC = new Set(['size', 'bitrate', 'freq', 'seconds', 'ping']);
const cell = (f, k) => ({
  name: S.fileName(f), size: S.fmtBytes(f.size), bitrate: f.bitrate, freq: f.freq, seconds: S.fmtLen(f.seconds),
  conn: S.speed(f.conn).label, ping: f.ping ?? '?', user: f.user,
}[k]);

const TABS = [['search', 'Search'], ['transfers', 'Transfers'], ['library', 'Library']];

export const snapster = {
  id: 'snap', title: 'Snapster', icon: 'snap', size: [680, 440], pos: [70, 28], resize: true, min: [540, 340],

  menus: (ctx) => [
    {
      label: 'File',
      items: [
        { label: 'Connect', run: () => ctx.snap.connect() },
        { label: 'Disconnect', run: () => ctx.snap.disconnect() },
        { sep: true },
        { label: 'Exit', run: ctx.close },
      ],
    },
    {
      label: 'Options',
      items: S.MY_SPEEDS.map((id) => ({ label: `My connection: ${S.speed(id).label}`, checked: () => transfers.mySpeed === id, run: () => ctx.snap.setSpeed(id) })),
    },
    {
      label: 'Help',
      items: [{
        label: 'About Snapster',
        run: () => ctx.desktop.message({
          title: 'About Snapster', kind: 'info',
          text: `Snapster 1.0 beta. Find a song, double click it, and the file comes from another regular's hard drive. Every band, title and user here is made up, and nothing is really downloaded. Server: ${S.SERVER}`,
        }),
      }],
    },
  ],

  build(ctx) {
    const body = ctx.body;
    body.classList.add('snap');
    body.innerHTML = `
      <div class="snap-head"><b class="snap-logo">SNAPSTER</b><output class="snap-hub" aria-live="polite"></output></div>
      <div class="snap-tabs" role="tablist" aria-label="Snapster"></div>
      <section class="snap-pane" data-pane="search" role="tabpanel">
        <form class="snap-find">
          <label>Artist<input name="artist" type="text" maxlength="40" autocomplete="off" spellcheck="false" data-autofocus></label>
          <label>Song title<input name="title" type="text" maxlength="40" autocomplete="off" spellcheck="false"></label>
          <label>Max results<select name="max">${S.MAX_RESULTS.map((n) => `<option value="${n}"${n === 100 ? ' selected' : ''}>${n}</option>`).join('')}</select></label>
          <label>Connection<select name="speed"><option value="unknown">Any</option>${S.SPEEDS.filter((s) => s.id !== 'unknown').map((s) => `<option value="${s.id}">${s.label} or better</option>`).join('')}</select></label>
          <label>Bitrate<select name="bitrate"><option value="0">Any</option>${[96, 128, 160, 192, 256].map((n) => `<option value="${n}">${n} kbps or better</option>`).join('')}</select></label>
          <button type="submit" class="w98-btn default">Find It</button>
        </form>
        <div class="snap-grid" tabindex="0" role="grid" aria-label="Search results. Up and Down choose a song, Enter gets it."></div>
        <div class="snap-actions"><button type="button" class="w98-btn" data-act="get" disabled>Get Selected Song</button><output class="snap-count" aria-live="polite"></output></div>
      </section>
      <section class="snap-pane" data-pane="transfers" role="tabpanel" hidden>
        <div class="snap-grid" tabindex="0" role="grid" aria-label="Transfers"></div>
        <div class="snap-actions"><button type="button" class="w98-btn" data-act="cancel" disabled>Cancel</button><button type="button" class="w98-btn" data-act="clear">Clear Finished</button><output class="snap-count"></output></div>
      </section>
      <section class="snap-pane" data-pane="library" role="tabpanel" hidden>
        <div class="snap-grid" tabindex="0" role="grid" aria-label="Your library"></div>
        <div class="snap-actions"><button type="button" class="w98-btn" data-act="delete" disabled>Delete</button><output class="snap-count"></output></div>
      </section>
      <div class="app-bar snap-status"><output class="snap-st-msg" aria-live="polite"></output><output class="snap-st-me"></output></div>`;

    const $ = (sel) => body.querySelector(sel);
    const hub = $('.snap-hub'), msg = $('.snap-st-msg'), me = $('.snap-st-me');
    const tabs = $('.snap-tabs');
    const panes = Object.fromEntries(TABS.map(([id]) => [id, $(`[data-pane="${id}"]`)]));
    const grids = Object.fromEntries(TABS.map(([id]) => [id, panes[id].querySelector('.snap-grid')]));
    const counts = Object.fromEntries(TABS.map(([id]) => [id, panes[id].querySelector('.snap-count')]));
    const btn = (pane, act) => panes[pane].querySelector(`[data-act="${act}"]`);
    const form = $('.snap-find');

    let online = false, tab = 'search', timers = [], loop = 0;
    let results = [], sortKey = null, sortDir = 1, searched = false;
    const pick = { search: null, transfers: null, library: null }; // the highlighted row in each list
    const say = (t) => { msg.textContent = t; };

    /* ---------------- tabs ---------------- */

    const tabBtns = TABS.map(([id, label]) => {
      const b = el('button', 'snap-tab');
      b.type = 'button';
      b.id = `snap-tab-${id}`;
      b.setAttribute('role', 'tab');
      b.dataset.tab = id;
      b.append(label);
      return b;
    });
    tabs.append(...tabBtns);
    function labelTabs() {
      const live = transfers.list.filter((t) => t.state === 'connecting' || t.state === 'queued' || t.state === 'downloading').length;
      tabBtns[1].textContent = live ? `Transfers (${live})` : 'Transfers';
      tabBtns[2].textContent = library.items.length ? `Library (${library.items.length})` : 'Library';
    }
    function show(id) {
      tab = id;
      for (const [k] of TABS) panes[k].hidden = k !== id;
      tabBtns.forEach((b) => { const on = b.dataset.tab === id; b.setAttribute('aria-selected', String(on)); b.tabIndex = on ? 0 : -1; });
      draw();
    }
    tabs.addEventListener('click', (e) => { const b = e.target.closest('.snap-tab'); if (b) show(b.dataset.tab); });
    tabs.addEventListener('keydown', (e) => {
      const i = TABS.findIndex(([id]) => id === tab);
      const next = e.key === 'ArrowRight' ? i + 1 : e.key === 'ArrowLeft' ? i - 1 : -1;
      if (next < 0) return;
      e.preventDefault();
      const to = (next + TABS.length) % TABS.length;
      show(TABS[to][0]);
      tabBtns[to].focus();
    });

    /* ---------------- the connection ---------------- */

    function stamp() { me.textContent = `${HANDLE}  |  ${S.speed(transfers.mySpeed).label}`; }
    function connect() {
      if (online || timers.length) return;
      hub.textContent = 'Connecting...';
      say(`Connecting to ${S.SERVER}...`);
      const done = () => {
        timers = [];
        online = true;
        const s = S.hubStats(net);
        hub.textContent = `${S.fmtBytes(s.users)} users sharing ${S.fmtBytes(s.songs)} songs (${S.fmtBytes(s.gb)} GB)`;
        say(`Logged in as ${HANDLE}. Type an artist or a song title and press Find It.`);
        draw();
      };
      if (reduced()) done();
      else timers.push(setTimeout(() => say('Logging in...'), 600), setTimeout(done, 1300));
    }
    function disconnect() {
      timers.forEach(clearTimeout);
      timers = [];
      online = false;
      hub.textContent = 'Not connected';
      say(`Disconnected from ${S.SERVER}. Downloads already started carry on.`);
      draw();
    }
    function setSpeed(id) {
      transfers.mySpeed = id;
      stamp();
      say(`Connection set to ${S.speed(id).label}. A bigger pipe means faster downloads.`);
    }

    /* ---------------- search ---------------- */

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      if (!online) { say('Not connected to the server. Choose File > Connect.'); return; }
      const f = new FormData(form);
      const artist = String(f.get('artist')).trim(), title = String(f.get('title')).trim();
      if (!artist && !title) { say('Type an artist or a song title first.'); return; }
      results = S.search(net, { artist, title }, { max: Number(f.get('max')), minSpeed: String(f.get('speed')), minBitrate: Number(f.get('bitrate')) });
      searched = true; sortKey = null; sortDir = 1; pick.search = null;
      say(results.length ? `${results.length} ${results.length === 1 ? 'song' : 'songs'} found.` : 'No matches found. Try fewer words.');
      drawSearch();
    });

    function header(key) {
      const on = sortKey === key;
      const arrow = on ? (sortDir > 0 ? ' ▲' : ' ▼') : '';
      const label = RESULT_COLS.find(([k]) => k === key)[1];
      return `<th scope="col" aria-sort="${on ? (sortDir > 0 ? 'ascending' : 'descending') : 'none'}"><button type="button" class="snap-th" data-k="${key}">${label}${arrow}</button></th>`;
    }
    function drawSearch() {
      const rows = sortKey ? S.sortBy(results, sortKey, sortDir) : results;
      const head = `<tr>${RESULT_COLS.map(([k]) => header(k)).join('')}</tr>`;
      let bodyHtml;
      if (rows.length) {
        bodyHtml = rows.map((f) => `<tr data-id="${f.id}" role="row" aria-selected="${f.id === pick.search}"${f.id === pick.search ? ' class="sel"' : ''}>${RESULT_COLS.map(([k]) => `<td class="${k === 'name' ? 'name' : NUMERIC.has(k) ? 'num' : ''}">${esc(cell(f, k))}</td>`).join('')}</tr>`).join('');
      } else {
        const t = !online ? 'Not connected. Choose File > Connect.' : searched ? 'No matches found. Try fewer words.' : 'Type an artist or a song title and press Find It.';
        bodyHtml = `<tr class="snap-none"><td colspan="${RESULT_COLS.length}">${t}</td></tr>`;
      }
      const grid = grids.search;
      const keep = grid.scrollTop;
      grid.innerHTML = `<table class="snap-tbl"><thead>${head}</thead><tbody>${bodyHtml}</tbody></table>`;
      grid.scrollTop = keep;
      btn('search', 'get').disabled = pick.search == null;
      counts.search.textContent = rows.length ? `${rows.length} ${rows.length === 1 ? 'song' : 'songs'}` : '';
    }

    const gridFor = (e) => e.target.closest('.snap-grid');
    function choose(listName, id, scroll) {
      pick[listName] = id;
      const grid = grids[listName];
      grid.querySelectorAll('tr[data-id]').forEach((tr) => {
        const on = Number(tr.dataset.id) === id;
        tr.classList.toggle('sel', on);
        tr.setAttribute('aria-selected', String(on));
        if (on && scroll) tr.scrollIntoView({ block: 'nearest' });
      });
      btn(listName, listName === 'search' ? 'get' : listName === 'transfers' ? 'cancel' : 'delete').disabled = id == null;
    }
    const idsOf = (listName) => [...grids[listName].querySelectorAll('tr[data-id]')].map((tr) => Number(tr.dataset.id));

    function get(id) {
      const f = net.byId(id);
      if (!f) return;
      if (!online) { say('Not connected to the server. Choose File > Connect.'); return; }
      if (library.has(f)) { say(`You already have ${S.fileName(f)}.`); return; }
      const before = transfers.list.length;
      transfers.add(f);
      say(transfers.list.length > before ? `Requesting ${S.fileName(f)} from ${f.user}...` : `Already getting ${S.fileName(f)}.`);
      labelTabs();
      ensureLoop();
      if (tab === 'transfers') drawTransfers();
    }

    grids.search.addEventListener('click', (e) => {
      const th = e.target.closest('.snap-th');
      if (th) {
        sortDir = sortKey === th.dataset.k ? -sortDir : 1;
        sortKey = th.dataset.k;
        drawSearch();
        grids.search.querySelector(`[data-k="${sortKey}"]`)?.focus();
        return;
      }
      const tr = e.target.closest('tr[data-id]');
      if (tr) choose('search', Number(tr.dataset.id));
    });
    grids.search.addEventListener('dblclick', (e) => { const tr = e.target.closest('tr[data-id]'); if (tr) get(Number(tr.dataset.id)); });
    btn('search', 'get').addEventListener('click', () => { if (pick.search != null) get(pick.search); });

    /* ---------------- transfers ---------------- */

    const live = (t) => t.state === 'connecting' || t.state === 'queued' || t.state === 'downloading';
    function drawTransfers() {
      const grid = grids.transfers;
      if (!transfers.list.length) {
        grid.innerHTML = '<table class="snap-tbl"><tbody><tr class="snap-none"><td>No transfers. Find a song and double click it.</td></tr></tbody></table>';
        pick.transfers = null;
      } else {
        let table = grid.querySelector('table.snap-xfer');
        if (!table) {
          grid.innerHTML = '<table class="snap-tbl snap-xfer"><thead><tr><th scope="col"><span class="snap-th">Filename</span></th><th scope="col"><span class="snap-th">User</span></th><th scope="col"><span class="snap-th">Status</span></th><th scope="col"><span class="snap-th">Progress</span></th></tr></thead><tbody></tbody></table>';
          table = grid.querySelector('table');
        }
        const tbody = table.tBodies[0];
        const have = new Map([...tbody.rows].map((tr) => [Number(tr.dataset.id), tr]));
        for (const t of transfers.list) {
          let tr = have.get(t.id);
          if (!tr) {
            tr = el('tr', null, `<td class="name"></td><td></td><td class="stat"></td><td><div class="snap-prog" role="progressbar" aria-valuemin="0" aria-valuemax="100"><i></i></div></td>`);
            tr.dataset.id = t.id;
            tr.setAttribute('role', 'row');
            tbody.append(tr);
          }
          have.delete(t.id);
          const c = tr.cells;
          const name = S.fileName(t.file);
          if (c[0].textContent !== name) { c[0].textContent = name; c[1].textContent = t.file.user; }
          const st = S.statusText(t);
          if (c[2].textContent !== st) c[2].textContent = st;
          const pc = t.state === 'done' ? 100 : S.percent(t);
          c[3].firstChild.setAttribute('aria-valuenow', String(pc));
          c[3].firstChild.firstChild.style.width = `${pc}%`;
          tr.classList.toggle('sel', t.id === pick.transfers);
          tr.setAttribute('aria-selected', String(t.id === pick.transfers));
        }
        for (const tr of have.values()) tr.remove();
        if (!transfers.list.some((t) => t.id === pick.transfers)) pick.transfers = null;
      }
      btn('transfers', 'cancel').disabled = pick.transfers == null;
      const n = transfers.list.filter(live).length;
      counts.transfers.textContent = n ? `${n} in progress` : '';
    }
    grids.transfers.addEventListener('click', (e) => { const tr = e.target.closest('tr[data-id]'); if (tr) choose('transfers', Number(tr.dataset.id)); });
    btn('transfers', 'cancel').addEventListener('click', () => {
      if (pick.transfers == null) return;
      const t = transfers.list.find((x) => x.id === pick.transfers);
      transfers.cancel(pick.transfers);
      pick.transfers = null;
      if (t) say(`Cancelled ${S.fileName(t.file)}.`);
      labelTabs(); drawTransfers();
    });
    btn('transfers', 'clear').addEventListener('click', () => { transfers.clearFinished(); drawTransfers(); labelTabs(); say('Cleared the finished transfers.'); });

    function ensureLoop() {
      if (loop) return;
      loop = setInterval(() => {
        const ended = transfers.step(0.25);
        for (const t of ended) {
          if (t.state === 'done') {
            library.add(t.file);
            say(`Finished ${S.fileName(t.file)} (${S.fmtSize(t.file.size)}).`);
          } else say(`${S.fileName(t.file)}: ${t.note}.`);
        }
        if (ended.length) { labelTabs(); if (tab === 'library') drawLibrary(); }
        if (tab === 'transfers') drawTransfers();
        if (!transfers.busy) { clearInterval(loop); loop = 0; }
      }, 250);
    }

    /* ---------------- library ---------------- */

    function drawLibrary() {
      const grid = grids.library;
      if (!library.items.length) {
        grid.innerHTML = `<table class="snap-tbl"><tbody><tr class="snap-none"><td>${S.MUSIC_DIR} is empty. Songs you get end up here.</td></tr></tbody></table>`;
        pick.library = null;
      } else {
        const rows = library.items.map((f) => `<tr data-id="${f.id}" role="row" aria-selected="${f.id === pick.library}"${f.id === pick.library ? ' class="sel"' : ''}><td class="name">${esc(S.fileName(f))}</td><td class="num">${S.fmtBytes(f.size)}</td><td class="num">${f.bitrate}</td><td class="num">${S.fmtLen(f.seconds)}</td><td>${esc(f.user)}</td></tr>`).join('');
        grid.innerHTML = `<table class="snap-tbl"><thead><tr>${['Filename', 'Size', 'Bitrate', 'Time', 'From'].map((h) => `<th scope="col"><span class="snap-th">${h}</span></th>`).join('')}</tr></thead><tbody>${rows}</tbody></table>`;
        if (!library.items.some((f) => f.id === pick.library)) pick.library = null;
      }
      btn('library', 'delete').disabled = pick.library == null;
      counts.library.textContent = library.items.length ? `${library.items.length} ${library.items.length === 1 ? 'file' : 'files'}, ${S.fmtSize(library.bytes)} in ${S.MUSIC_DIR}` : '';
    }
    grids.library.addEventListener('click', (e) => { const tr = e.target.closest('tr[data-id]'); if (tr) choose('library', Number(tr.dataset.id)); });
    btn('library', 'delete').addEventListener('click', () => {
      const f = library.items.find((i) => i.id === pick.library);
      if (!f) return;
      library.remove(f.id);
      pick.library = null;
      say(`Deleted ${S.fileName(f)}.`);
      labelTabs(); drawLibrary();
    });

    /* ---------------- keys ---------------- */

    for (const name of ['search', 'transfers', 'library']) {
      grids[name].addEventListener('keydown', (e) => {
        const ids = idsOf(name);
        if (!ids.length) return;
        const i = ids.indexOf(pick[name]);
        let to = -1;
        if (e.key === 'ArrowDown') to = Math.min(ids.length - 1, i + 1);
        else if (e.key === 'ArrowUp') to = Math.max(0, i < 0 ? 0 : i - 1);
        else if (e.key === 'Home') to = 0;
        else if (e.key === 'End') to = ids.length - 1;
        else if (e.key === 'Enter' && name === 'search' && pick.search != null) { e.preventDefault(); get(pick.search); return; }
        else if (e.key === 'Delete' && name === 'library') { btn('library', 'delete').click(); return; }
        if (to < 0) return;
        e.preventDefault();
        choose(name, ids[to], true);
      });
    }

    function draw() {
      labelTabs();
      if (tab === 'search') drawSearch();
      else if (tab === 'transfers') drawTransfers();
      else drawLibrary();
    }

    ctx.snap = { connect, disconnect, setSpeed };
    stamp();
    show('search');
    transfers.busy && ensureLoop();
    connect();
    return { dispose() { timers.forEach(clearTimeout); clearInterval(loop); loop = 0; } };
  },
};
