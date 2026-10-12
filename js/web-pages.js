// The site inside Internet Explorer: http://lanparty1998.com/ as it would have looked in 1998.
// No DOM code, so tools/web.test.mjs can test the address handling, the pages and the search.
//
// Pages are written the way 1998 pages were: tables for layout, a banner, a button column,
// a hit counter, a guestbook. All the styling is in css/style.css (the `.web` block) and uses tokens only.
// To add a page: add an entry to PAGES, link to it from NAV or another page, add it to sitemap.xml
// only if it should be public (the pages live inside the game, so there is nothing to crawl).
import { GAMES, GAME_IDS, MAX_PLAYERS } from './games.js';
import { NEWS, KINDS, fmtDate, newest, ofKind } from './web-news.js';

export const SITE = 'lanparty1998.com';
export const HOME = `http://${SITE}/`;
export const CONTACT = `contact@${SITE}`;
export const UPDATED = '6 Feb 1998';
export const VISITORS_BASE = 4812; // the counter starts here, and goes up by one for every visit to the home page

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/* ------------------------------------------------------------------ addresses */

const ALIASES = {
  '/index.htm': '/', '/index.html': '/', '/default.htm': '/',
  '/news': '/news.htm', '/news.html': '/news.htm', '/whatsnew.htm': '/news.htm',
  '/games': '/games.htm', '/games.html': '/games.htm',
  '/howto': '/howto.htm', '/howto.html': '/howto.htm', '/play.htm': '/howto.htm',
  '/guestbook': '/guestbook.htm', '/guestbook.html': '/guestbook.htm',
  '/links': '/links.htm', '/links.html': '/links.htm',
  '/~dazza': '/~dazza/', '/~dazza/index.htm': '/~dazza/', '/~dazza/index.html': '/~dazza/',
};

// Anything the address bar or a link can hold, made into one tidy address. Returns null for an empty string.
// { url, scheme, host, path, query, hash }. Hosts are lower case with any `www.` dropped.
export function parseUrl(raw) {
  let s = String(raw ?? '').trim();
  if (!s) return null;
  const about = /^about:(\w*)$/i.exec(s);
  if (about) return { url: `about:${about[1].toLowerCase()}`, scheme: 'about', host: '', path: about[1].toLowerCase(), query: '', hash: '' };
  const mail = /^mailto:(.*)$/i.exec(s);
  if (mail) return { url: `mailto:${mail[1]}`, scheme: 'mailto', host: '', path: mail[1], query: '', hash: '' };
  if (!/^[a-z][a-z0-9+.-]*:\/\//i.test(s)) s = `http://${s.replace(/^\/+/, '')}`;
  const m = /^([a-z][a-z0-9+.-]*):\/\/([^/?#]*)([^?#]*)(\?[^#]*)?(#.*)?$/i.exec(s);
  if (!m) return null;
  const scheme = m[1].toLowerCase();
  const host = m[2].toLowerCase().replace(/:\d+$/, '').replace(/^www\./, '');
  let path = m[3] || '/';
  const lower = path.toLowerCase();
  if (host === SITE) path = ALIASES[lower] ?? lower;
  const query = m[4] && m[4] !== '?' ? m[4] : '';
  const hash = m[5] && m[5] !== '#' ? m[5] : '';
  const shown = host === SITE ? `${scheme === 'https' ? 'https' : 'http'}://${host}` : `${scheme}://${m[2].toLowerCase()}`;
  return { url: `${shown}${host === SITE ? path : m[3] || '/'}${query}${hash}`, scheme, host, path, query, hash };
}

// A link's href, worked out against the page it is on: absolute, rooted (/news.htm), same page (#top) or relative.
export function joinUrl(base, href) {
  const h = String(href ?? '').trim();
  if (!h) return base;
  if (/^[a-z][a-z0-9+.-]*:/i.test(h)) return h;
  const b = parseUrl(base);
  if (!b) return h;
  const origin = `${b.url.split('://')[0]}://${b.host}`;
  if (h.startsWith('#')) return `${origin}${b.path}${b.query}${h}`;
  if (h.startsWith('/')) return `${origin}${h}`;
  if (h.startsWith('?')) return `${origin}${b.path}${h}`;
  const dir = b.path.replace(/[^/]*$/, '');
  return `${origin}${squash(`${dir}${h}`)}`;
}

// `/~dazza/../links.htm` -> `/links.htm` (the query and the #anchor are kept as they are)
function squash(rest) {
  const cut = rest.search(/[?#]/);
  const path = cut < 0 ? rest : rest.slice(0, cut);
  const tail = cut < 0 ? '' : rest.slice(cut);
  const out = [];
  for (const part of path.split('/')) {
    if (part === '..') out.pop();
    else if (part !== '.') out.push(part);
  }
  const joined = out.join('/');
  return `${joined.startsWith('/') ? '' : '/'}${joined}${tail}`;
}

/* --------------------------------------------------------------------- pieces */

const NAV = [
  ['/', 'Home'], ['/news.htm', 'What\'s New'], ['/games.htm', 'Games'],
  ['/howto.htm', 'How to Play'], ['/guestbook.htm', 'Guestbook'], ['/links.htm', 'Links'],
];

const counter = (n) => `<span class="w-counter" aria-label="Visitors: ${n}">${String(n).padStart(6, '0').split('').map((d) => `<i>${d}</i>`).join('')}</span>`;

const tag = (kind) => `<span class="w-tag ${kind}">${KINDS[kind]}</span>`;

const newsTable = (entries) => `<table class="w-tbl w-news" cellspacing="0" cellpadding="0">
${entries.map((n) => `<tr><td class="w-date">${esc(fmtDate(n.date))}</td><td class="w-kind">${tag(n.kind)}</td>
<td><b>${esc(n.title)}</b><br>${esc(n.text)}${n.link ? ` <a href="${esc(n.link[0])}">${esc(n.link[1])}</a>.` : ''}</td></tr>`).join('\n')}
</table>`;

const box = (title, body) => `<div class="w-box"><h3>${esc(title)}</h3><div class="w-box-body">${body}</div></div>`;

const frame = (path, state, body) => `<a id="top" name="top"></a>
<table class="w-page" cellspacing="0" cellpadding="0" summary="LAN Party '98">
<tr><td colspan="2" class="w-banner">
<div class="w-logo">LAN Party '98</div>
<div class="w-prompt">C:\\&gt; NETFRAG<span class="w-cursor">_</span></div>
<div class="w-marquee"><span>Doors open 7:30 PM. Bring your own PC or use one of ours. Mum says be home by 10.</span></div>
</td></tr>
<tr>
<td class="w-side">
${NAV.map(([p, label]) => `<a class="w-nav-btn${p === path ? ' here' : ''}" href="${p}">${label}</a>`).join('\n')}
<div class="w-visitors"><span>VISITORS</span>${counter(VISITORS_BASE + (state.visits ?? 1))}</div>
<div class="w-badges"><span class="w-88">BEST VIEWED<br>800x600</span><span class="w-88">256<br>COLOURS</span><span class="w-88">NO<br>FRAMES</span></div>
</td>
<td class="w-main">
${body}
</td></tr>
<tr><td colspan="2" class="w-foot">
Last updated ${UPDATED}. Webmaster: <a href="mailto:${CONTACT}">${CONTACT}</a><br>
Best viewed with Internet Explorer 4.0 at 800x600. Made on a beige box. <a href="#top">Back to the top</a>
</td></tr>
</table>`;

/* ----------------------------------------------------------------------- pages */

// playable games: what the room really has comes from js/games.js; this adds the year and a line each
const META = {
  doom: { year: 1993, genre: 'First-person shooter', note: 'The one everybody knows. The shareware episode, and the room\'s default.' },
  heretic: { year: 1994, genre: 'First-person shooter', note: 'DOOM\'s engine, with swords, sorcery and a wand that is not enough.' },
  hexen: { year: 1995, genre: 'First-person shooter', note: 'The 4 level demo. Bigger levels, switches that open things on the other side of the map.' },
  quake: { year: 1996, genre: 'First-person shooter', note: 'Real 3D. Hungry for RAM, so mind the 16MB.' },
  descent: { year: 1995, genre: 'Six-degrees-of-freedom shooter', note: 'You are a ship in a mine. Up and down are suggestions.' },
  duke: { year: 1996, genre: 'First-person shooter', note: 'Episode one, L.A. in a bad mood. The shareware release, and the one that wants SETUP before a network game.' },
};

const howNet = (g) => (g.net.kind === 'setup'
  ? `Deathmatch for 2 to ${MAX_PLAYERS}. The host clicks Host a deathmatch, the others click Join, the host clicks Start, and IPXSETUP finds everyone.`
  : `${g.net.host.replace(/\.$/, '')} (host). ${g.net.join.replace(/\.$/, '')} (everyone else).`);

const gamesRows = () => GAME_IDS.map((id) => {
  const g = GAMES[id];
  const m = META[id] ?? { year: '', genre: '', note: '' };
  return `<tr><td><b>${esc(g.name)}</b><br>${m.year}</td><td>${esc(m.genre)}. ${esc(m.note)}</td><td>${esc(howNet(g))}</td></tr>`;
}).join('\n');

const PAGES = {
  '/': {
    title: 'LAN Party \'98',
    desc: 'Saturday night in somebody\'s basement. The schedule, the games and what is new.',
    build: (c) => `<h2>Welcome to LAN Party '98.</h2>
<p>Six beige boxes, one 10BASE-T hub and a crate of Volt Cola. Sit down and frag.</p>
<p>This is the homepage for Saturday night in the basement. It is a real room: walk around it, sit at any free PC, and play ${GAME_IDS.map((id) => GAMES[id].name).join(', ').replace(/, ([^,]*)$/, ' and $1')} against whoever else is on the hub. Press Tab to get the mouse back, and click the room to walk again.</p>
${box('What\'s New', `${newsTable(newest(5))}<p class="w-more"><a href="news.htm">More news</a> | <a href="news.htm?show=fix">Bug fixes</a> | <a href="news.htm?show=new">New features</a></p>`)}
<a id="schedule" name="schedule"></a>
${box('Tonight\'s schedule', `<table class="w-tbl" cellspacing="0" cellpadding="0">
<tr><td class="w-date">7:30 PM</td><td>Doors open. Pizza is ordered and will take a while.</td></tr>
<tr><td class="w-date">Until midnight</td><td>Shooters: ${GAME_IDS.map((id) => esc(GAMES[id].name)).join(', ')}.</td></tr>
<tr><td class="w-date">Midnight</td><td>Somebody puts StarCraft on. Any PC with under 32MB of RAM says "Not enough memory".</td></tr>
<tr><td class="w-date">6:00 AM</td><td>The switch goes back to Dazza's dad.</td></tr>
</table>`)}
<p><a href="games.htm">Every game on the hub</a> | <a href="howto.htm">How to play</a> | <a href="guestbook.htm">Sign the guestbook</a></p>`,
  },

  '/news.htm': {
    title: 'What\'s New',
    desc: 'New features and bug fixes, newest first.',
    build: (c) => {
      const show = new URLSearchParams(c.query).get('show');
      const entries = ofKind(show);
      const heading = show === 'fix' ? 'Bug fixes' : show === 'new' ? 'New features' : 'What\'s New';
      return `<h2>${heading}</h2>
<p>Updates from the webmaster, newest first. ${tag('new')} means we added something. ${tag('fix')} means something was broken and is not now.</p>
<a id="latest" name="latest"></a><p>Show: ${show ? '<a href="news.htm">Everything</a>' : '<b>Everything</b>'} | ${show === 'new' ? '<b>New features</b>' : '<a href="news.htm?show=new">New features</a>'} | ${show === 'fix' ? '<b>Bug fixes</b>' : '<a href="news.htm?show=fix">Bug fixes</a>'}</p>
${newsTable(entries)}
<p class="w-more">${entries.length} ${entries.length === 1 ? 'entry' : 'entries'}. Found something broken? <a href="mailto:${CONTACT}">Tell the webmaster</a>.</p>`;
    },
  },

  '/games.htm': {
    title: 'Games',
    desc: 'Every game you can play in the basement, and the ones you cannot.',
    build: () => `<h2>The games</h2>
<p>Every game on the PCs is a shareware release its publisher said could be copied freely. Walk up to a free PC (its screen says FREE) and press E. The Game button on the seated bar reboots it into the next one, in this order: ${GAME_IDS.map((id) => esc(GAMES[id].name)).join(', ')}.</p>
${box('On the PCs', `<table class="w-tbl w-games" cellspacing="0" cellpadding="0">
<tr><th>Game</th><th>What it is</th><th>Deathmatch</th></tr>
${gamesRows()}
</table>
<p class="w-more">Up to ${MAX_PLAYERS} players in a deathmatch. Standing up (the ${'`'} key) leaves it.</p>`)}
${box('On the desktop', `<table class="w-tbl" cellspacing="0" cellpadding="0">
<tr><td><b>Minesweeper</b></td><td>Beginner, Intermediate and Expert, with chording. Your first click is always safe.</td></tr>
<tr><td><b>Solitaire</b></td><td>Klondike. Draw one or three, drag or click, double-click to send a card up, and undo.</td></tr>
<tr><td><b>Downhill</b></td><td>An endless ski run: trees, ramps, gates and a bear after 2000 m. Arrows to steer, F for speed, P to pause.</td></tr>
</table>
<p class="w-more">Start > Programs > Games, or Start > Run.</p>`)}
<a id="midnight" name="midnight"></a>
${box('At midnight', `<p><b>StarCraft.</b> Somebody kicks off a game at midnight and the chat says so. Free PCs with at least 32MB show it running; the rest show a DOS error. The game itself is not here, because it is not shareware, so sitting down still runs the shooter you chose.</p>`)}
${box('Looks like a game, is not', `<p><b>The DUKE NUKEM 3D poster</b> on the wall is just a poster, and the characters are not here. The shareware episode is on the PCs, though, and has a box on the shelf. <b>The console under the TV</b> has four pads and a brawl on a loop. Press E at the TV for its prompt and bring your own cartridge files. Six more game boxes and film posters are on the walls (IRON HYMN, VOID HARVEST and so on); they are all made up. The shelf on the left wall holds a box for each game that runs on the PCs. Those pictures are made up too.</p>`)}
<p><a href="howto.htm">How to start a deathmatch</a> | <a href="news.htm">What's new</a></p>`,
  },

  '/howto.htm': {
    title: 'How to Play',
    desc: 'Getting in, sitting down, starting a deathmatch, and keeping the network up.',
    build: () => `<h2>How to play</h2>
<ol class="w-steps">
<li>Pick a handle and walk in. Everybody on the site shares the same basement. Add <b>?room=name</b> to the address for a private one.</li>
<li>Walk up to any PC whose screen says FREE and press <b>E</b>. DOOM boots on its own.</li>
<li>The <b>Game</b> button on the bar at the bottom of the screen reboots the PC into the next game.</li>
<li>To deathmatch, one seated player clicks <b>Host a deathmatch</b>. Others sitting at PCs click <b>Join deathmatch</b> (up to ${MAX_PLAYERS}). The host clicks <b>Start</b>.</li>
<li>Lobby games (Quake, Descent, Duke Nukem 3D) have their own multiplayer menu: one player hosts, the rest join. The status line tells you which entries to pick.</li>
</ol>
${box('Keys', `<table class="w-tbl" cellspacing="0" cellpadding="0">
<tr><td><kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> + mouse</td><td>Walk and look</td></tr>
<tr><td><kbd>E</kbd></td><td>Sit down, drink, eat, or use what you are looking at</td></tr>
<tr><td><kbd>F</kbd></td><td>Open the case of the PC you are looking at</td></tr>
<tr><td><kbd>T</kbd></td><td>Chat (it shows up in #lanparty98)</td></tr>
<tr><td><kbd>I</kbd> <kbd>M</kbd> <kbd>H</kbd></td><td>Show or hide IRC, LANamp and Internet Explorer</td></tr>
<tr><td><kbd>N</kbd></td><td>Noises on or off (burps, and the speaker PCs)</td></tr>
<tr><td><kbd>Tab</kbd></td><td>Free the mouse for the taskbar and windows. Click the room to walk again</td></tr>
<tr><td><kbd>\`</kbd></td><td>Stand up from your PC</td></tr>
</table>`)}
<a id="chores" name="chores"></a>
${box('The night\'s chores', `<ul class="w-list">
<li><b>File sharing.</b> Every PC starts with it broken. F at a PC, then Fix file sharing. It takes about 19 seconds and fails often, less on a switch.</li>
<li><b>The network.</b> You start on coax, where one loose T-connector drops everybody. Order a hub from the price list on the snack table ($45), then ring Dazza on the wall phone for a switch.</li>
<li><b>RAM.</b> Every PC starts on 16MB. Macca is in Singapore, where a 16MB SIMM is $35. Give him the cash first.</li>
<li><b>The CD burner.</b> PC-04 only, 2x, 37 minutes a disc. Do not sit at PC-04 while it writes.</li>
<li><b>The fan.</b> Overclocked PCs blue screen if the pedestal fan goes off. E turns it back on.</li>
<li><b>Lights.</b> The switch is on the back wall by the stairs door. With the lights off every monitor glows much brighter. Handy for Quake, bad for the Nachoz.</li>
<li><b>The extension lead.</b> The yellow one across the aisle feeds PC-04 to PC-06. Trip on it and all three go dark. E on the lead, or F at a dead PC, plugs it back in.</li>
<li><b>The phones.</b> The wall phone dials Pizza Shack and Dazza, with a dial tone and a ring. The mobile on the desk at PC-02 rings the same numbers, and Mum, and plays Snake while you wait for the hub.</li>
<li><b>Cables.</b> They lie across the floor. Each step over one is a roll. F at the PC to plug it back in.</li>
</ul>`)}
<p><a href="games.htm">The games</a> | <a href="news.htm">What's new</a></p>`,
  },

  '/guestbook.htm': {
    title: 'Guestbook',
    desc: 'Sign the guestbook. Nobody checks it.',
    build: (c) => `<h2>Guestbook</h2>
<p>Sign it. The webmaster reads it, the regulars read it more, and what you write stays on this page until you close the browser.</p>
<form class="w-form" action="guestbook.htm" method="get" data-guestbook>
<table cellspacing="0" cellpadding="0">
<tr><td><label for="gb-name">Your handle</label></td><td><input id="gb-name" name="name" maxlength="16" autocomplete="off"></td></tr>
<tr><td><label for="gb-msg">Message</label></td><td><input id="gb-msg" name="msg" maxlength="120" autocomplete="off"></td></tr>
<tr><td></td><td><button type="submit" class="w98-btn default">Sign</button></td></tr>
</table>
</form>
<table class="w-tbl w-guest" cellspacing="0" cellpadding="0">
${(c.state.guestbook ?? GUESTBOOK).map((g) => `<tr><td class="w-date">${esc(g.date)}</td><td><b>${esc(g.name)}</b><br>${esc(g.msg)}</td></tr>`).join('\n')}
</table>`,
  },

  '/links.htm': {
    title: 'Links',
    desc: 'Cool links, and a few that are not there any more.',
    build: () => `<h2>Links</h2>
<p>Pages on this site, and the regulars' own. Some of the regulars' pages are on the way. A link that goes nowhere shows the page cannot be displayed. That is normal in 1998.</p>
${box('This site', `<ul class="w-list">
<li><a href="index.htm">Home</a>: the schedule and the news</li>
<li><a href="games.htm">Games</a>: everything you can play</li>
<li><a href="howto.htm">How to Play</a>: the keys and the chores</li>
<li><a href="~dazza/">Dazza's Page</a>: cheat codes. Do not share.</li>
</ul>`)}
${box('The regulars', `<ul class="w-list">
<li><a href="http://members.lanparty1998.com/~ghoul/">xX_Ghoul_Xx's Dark Zone</a> (best viewed in the dark)</li>
<li><a href="http://members.lanparty1998.com/~phatbass/">PhatBass's Mix Tapes</a></li>
<li><a href="http://members.lanparty1998.com/~krad/">K-Rad's Frag Stats</a></li>
</ul>`)}
${box('Contact', `<p>E-mail the webmaster at <a href="mailto:${CONTACT}">${CONTACT}</a>.</p>`)}`,
  },

  '/~dazza/': {
    title: 'Dazza\'s Page',
    desc: 'Dazza\'s cheat codes. Do not share.',
    build: () => `<div class="w-construction">UNDER CONSTRUCTION</div>
<h2>Dazza's Page</h2>
<p>CHEAT CODES (DO NOT SHARE). If you found this page you did not find it here.</p>
<table class="w-tbl w-games" cellspacing="0" cellpadding="0">
<tr><th>Game</th><th>Type</th><th>What it does</th></tr>
<tr><td><b>DOOM</b></td><td>IDDQD</td><td>You cannot die</td></tr>
<tr><td><b>DOOM</b></td><td>IDKFA</td><td>Every weapon, every key</td></tr>
<tr><td><b>DOOM</b></td><td>IDCLIP</td><td>Walk through walls</td></tr>
<tr><td><b>HERETIC</b></td><td>QUICKEN</td><td>You cannot die</td></tr>
<tr><td><b>HERETIC</b></td><td>RAMBO</td><td>Every weapon</td></tr>
<tr><td><b>QUAKE</b></td><td>god, noclip</td><td>Press the ~ key first for the console</td></tr>
<tr><td><b>DUKE NUKEM 3D</b></td><td>dnkroz</td><td>You cannot die</td></tr>
<tr><td><b>DUKE NUKEM 3D</b></td><td>dnstuff</td><td>Every weapon, every item</td></tr>
<tr><td><b>DESCENT</b></td><td>?</td><td>Dad has the manual</td></tr>
</table>
<p>Typing a cheat in a deathmatch is what we call losing.</p>
<p>Dazza's dad's switch goes back at 6:00 AM. Do not touch the asset sticker.</p>
<p><a href="../links.htm">Back to Links</a></p>`,
  },
};

export const GUESTBOOK = [
  { date: '6 Feb 1998', name: 'Mum', msg: 'Dinner is at 6. Whoever is in the basement, upstairs, now.' },
  { date: '5 Feb 1998', name: 'Macca', msg: 'Back from Singapore Thursday. The RAM is on me. Cash first.' },
  { date: '4 Feb 1998', name: 'n00bslayer', msg: 'I have 4 frags. K-Rad cannot count.' },
  { date: '3 Feb 1998', name: 'K-Rad', msg: 'n00bslayer has 3 frags. I counted twice.' },
  { date: '2 Feb 1998', name: 'xX_Ghoul_Xx', msg: 'Nice site. Needs more black.' },
  { date: '1 Feb 1998', name: 'PhatBass', msg: 'Who keeps unplugging the hub.' },
  { date: '31 Jan 1998', name: 'Dazza', msg: 'IDDQD works on PC-02. You did not hear it from me.' },
];

/* ---------------------------------------------------------------------- errors */

const dnsPage = (host) => ({
  title: 'The page cannot be displayed',
  html: () => `<div class="w-error"><h2>The page cannot be displayed</h2>
<p>The server <b>${esc(host)}</b> did not answer. The address may be wrong, or the site may be down.</p>
<hr>
<p>Try this:</p>
<ul class="w-list">
<li>Click the <b>Refresh</b> button, or try again later.</li>
<li>Check the address for typing mistakes, like <b>ww.lanparty1998.com</b>.</li>
<li>Go back to <a href="${HOME}">${SITE}</a>, which is always up. The hub is in the basement.</li>
</ul>
<p class="w-err-code">Cannot find server or DNS Error<br>Internet Explorer</p></div>`,
});

const missingPage = (path) => ({
  title: 'File not found',
  html: () => `<div class="w-error"><h2>404 File Not Found</h2>
<p>There is no <b>${esc(path)}</b> on this server.</p>
<hr>
<p>Check the address, or go to the <a href="${HOME}">Home</a> page. The <a href="${HOME}news.htm">news</a> is usually worth a look.</p>
<p class="w-err-code">HTTP 404<br>Internet Explorer</p></div>`,
});

/* ------------------------------------------------------------------- the router */

// What the browser needs to show an address: { url, kind, title, html(state), ... }.
// kind is 'page', 'blank', 'mailto' or 'error' (the address could not be reached).
export function route(raw) {
  const u = parseUrl(raw);
  if (!u) return null;
  if (u.scheme === 'mailto') return { ...u, kind: 'mailto', title: u.url, html: () => '' };
  if (u.scheme === 'about') return { ...u, kind: 'blank', title: 'about:blank', html: () => '' };
  if (u.scheme !== 'http' && u.scheme !== 'https') return { ...u, kind: 'error', error: 'dns', ...dnsPage(u.url.split('/')[0]) };
  if (u.host !== SITE) return { ...u, kind: 'error', error: 'dns', ...dnsPage(u.host || u.url) };
  const page = PAGES[u.path];
  if (!page) return { ...u, kind: 'error', error: '404', ...missingPage(u.path) };
  return {
    ...u, kind: 'page', title: page.title, desc: page.desc,
    html: (state = {}) => frame(u.path, state, page.build({ query: u.query, state })),
  };
}

export const PAGE_LIST = Object.entries(PAGES).map(([path, p]) => ({ path, url: `http://${SITE}${path}`, title: p.title, desc: p.desc }));

// a page as a complete HTML document, for View > Source
export function source(desc, state = {}) {
  if (desc.kind !== 'page' && desc.kind !== 'error') return '<HTML>\n<HEAD><TITLE></TITLE></HEAD>\n<BODY>\n</BODY>\n</HTML>\n';
  return `<HTML>\n<HEAD>\n<TITLE>${desc.title} - LAN Party '98</TITLE>\n<META NAME="Author" CONTENT="${CONTACT}">\n</HEAD>\n<BODY>\n${desc.html(state)}\n</BODY>\n</HTML>\n`;
}

/* ---------------------------------------------------------------------- search */

const plain = (html) => html.replace(/<[^>]*>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&gt;/g, '>').replace(/&lt;/g, '<').replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();

let index = null;
const pageIndex = () => index ?? (index = PAGE_LIST.map((p) => {
  const text = plain(route(p.url).html({ visits: 0 }));
  return { ...p, text, lower: `${p.title} ${text}`.toLowerCase() };
}));

// Every page that has all the words, best first (a word in the title counts more). Up to six results, with a snippet.
export function search(query) {
  const words = String(query ?? '').toLowerCase().split(/\s+/).filter(Boolean);
  if (!words.length) return [];
  const out = [];
  for (const p of pageIndex()) {
    if (!words.every((w) => p.lower.includes(w))) continue;
    const at = p.text.toLowerCase().indexOf(words[0]);
    const from = Math.max(0, at - 40);
    const snippet = at < 0 ? p.desc : `${from ? '...' : ''}${p.text.slice(from, from + 110)}...`;
    const score = words.reduce((a, w) => a + (p.title.toLowerCase().includes(w) ? 10 : 0) + p.lower.split(w).length - 1, 0);
    out.push({ url: p.url, title: p.title, snippet, score });
  }
  return out.sort((a, b) => b.score - a.score).slice(0, 6);
}
