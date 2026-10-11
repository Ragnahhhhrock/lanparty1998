// Tests the site inside Internet Explorer: address handling, every page, the news and the search.
// Run: node tools/web.test.mjs
import assert from 'node:assert/strict';
import { parseUrl, joinUrl, route, source, search, PAGE_LIST, HOME, SITE, CONTACT } from '../js/web-pages.js';
import { NEWS, KINDS, fmtDate, newest, ofKind } from '../js/web-news.js';
import { GAMES, GAME_IDS } from '../js/games.js';

let n = 0;
const ok = (name, fn) => { fn(); n++; console.log(`ok  ${name}`); };

ok('addresses are tidied: scheme, www, case, index pages', () => {
  assert.equal(parseUrl('lanparty1998.com').url, 'http://lanparty1998.com/');
  assert.equal(parseUrl('  HTTP://WWW.LanParty1998.com/News.HTM  ').url, 'http://lanparty1998.com/news.htm');
  assert.equal(parseUrl('lanparty1998.com/index.html').url, 'http://lanparty1998.com/');
  assert.equal(parseUrl('lanparty1998.com/news').url, 'http://lanparty1998.com/news.htm');
  assert.equal(parseUrl('lanparty1998.com/news.htm?show=fix#top').url, 'http://lanparty1998.com/news.htm?show=fix#top');
  assert.equal(parseUrl('https://lanparty1998.com/').url, 'https://lanparty1998.com/');
  assert.equal(parseUrl('lanparty1998.com/~dazza').url, 'http://lanparty1998.com/~dazza/');
  assert.equal(parseUrl(''), null);
  assert.equal(parseUrl('   '), null);
  assert.equal(parseUrl('about:blank').scheme, 'about');
  assert.equal(parseUrl('mailto:a@b.c').scheme, 'mailto');
});

ok('links are worked out against the page they are on', () => {
  const base = 'http://lanparty1998.com/~dazza/';
  assert.equal(joinUrl(base, '/links.htm'), 'http://lanparty1998.com/links.htm');
  assert.equal(joinUrl(base, '../links.htm'), 'http://lanparty1998.com/links.htm');
  assert.equal(joinUrl('http://lanparty1998.com/news.htm', 'games.htm'), 'http://lanparty1998.com/games.htm');
  assert.equal(joinUrl('http://lanparty1998.com/news.htm', '/'), 'http://lanparty1998.com/');
  assert.equal(joinUrl('http://lanparty1998.com/news.htm?show=fix', '#top'), 'http://lanparty1998.com/news.htm?show=fix#top');
  assert.equal(joinUrl('http://lanparty1998.com/news.htm', 'news.htm?show=new'), 'http://lanparty1998.com/news.htm?show=new');
  assert.equal(joinUrl('http://lanparty1998.com/news.htm', 'mailto:x@y.z'), 'mailto:x@y.z');
  assert.equal(joinUrl('http://lanparty1998.com/news.htm', 'http://other.example/'), 'http://other.example/');
  assert.equal(parseUrl(joinUrl(base, 'index.htm')).url, 'http://lanparty1998.com/~dazza/');
});

ok('every listed page loads and carries the site frame', () => {
  assert.ok(PAGE_LIST.length >= 6);
  for (const p of PAGE_LIST) {
    const r = route(p.url);
    assert.equal(r.kind, 'page', p.url);
    assert.ok(r.title && r.desc, `${p.url} has a title and description`);
    const html = r.html({ visits: 1 });
    assert.match(html, /w-page/, `${p.url} uses the frame`);
    assert.match(html, /LAN Party '98/);
    assert.ok(!/undefined|\[object/.test(html), `${p.url} has a hole in it`);
  }
});

ok('unknown pages and servers fail the way 1998 did', () => {
  const dns = route('http://www.example.invalid/');
  assert.equal(dns.kind, 'error');
  assert.equal(dns.error, 'dns');
  assert.match(dns.html(), /cannot be displayed/);
  const missing = route('http://lanparty1998.com/nope.htm');
  assert.equal(missing.error, '404');
  assert.match(missing.html(), /404 File Not Found/);
  assert.equal(route('http://members.lanparty1998.com/~ghoul/').error, 'dns');
  assert.equal(route('mailto:contact@lanparty1998.com').kind, 'mailto');
  assert.equal(route('about:blank').kind, 'blank');
  assert.equal(route(''), null);
  assert.ok(!/<script/i.test(route('http://lanparty1998.com/<script>').html()), 'the path is escaped in the error page');
});

ok('the news has features and fixes, newest first, in order', () => {
  assert.ok(NEWS.length >= 20);
  assert.ok(NEWS.some((e) => e.kind === 'new') && NEWS.some((e) => e.kind === 'fix'));
  for (const e of NEWS) {
    assert.match(e.date, /^1998-\d\d-\d\d$/, e.title);
    assert.ok(KINDS[e.kind], `${e.title} has a kind`);
    assert.ok(e.title.length > 3 && e.text.length > 20, `${e.title} has text`);
    assert.ok(!/!/.test(`${e.title} ${e.text}`), `${e.title}: no exclamation marks (STYLEGUIDE.md section 6)`);
    assert.ok(!/—/.test(e.text), `${e.title}: no em dashes`);
  }
  for (let i = 1; i < NEWS.length; i++) assert.ok(NEWS[i - 1].date >= NEWS[i].date, `${NEWS[i].title} is out of order`);
  assert.equal(fmtDate('1998-02-06'), '6 Feb 1998');
  assert.equal(newest(3).length, 3);
  assert.deepEqual(ofKind('fix').map((e) => e.kind), ofKind('fix').map(() => 'fix'));
  assert.equal(ofKind('fix').length + ofKind('new').length, NEWS.length);
  assert.equal(ofKind(null).length, NEWS.length);
});

ok('the news page lists everything, and can filter', () => {
  const all = route(`${HOME}news.htm`).html({});
  assert.equal((all.match(/<tr><td class="w-date">/g) ?? []).length, NEWS.length);
  const fixes = route(`${HOME}news.htm?show=fix`).html({});
  assert.equal((fixes.match(/<tr><td class="w-date">/g) ?? []).length, ofKind('fix').length);
  assert.match(fixes, /Bug fixes/);
  assert.match(route(`${HOME}news.htm?show=new`).html({}), /New features/);
});

ok('the home page teases the latest news', () => {
  const home = route(HOME).html({});
  assert.match(home, new RegExp(NEWS[0].title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
});

ok('the games page names every game the PCs can run', () => {
  const html = route(`${HOME}games.htm`).html({});
  for (const id of GAME_IDS) assert.ok(html.includes(GAMES[id].name), `${GAMES[id].name} is on the games page`);
  for (const name of ['Minesweeper', 'Solitaire', 'Downhill', 'StarCraft', 'DUKE NUKEM 3D']) assert.ok(html.includes(name), `${name} is on the games page`);
  assert.match(html, /shareware/);
});

ok('the guestbook shows what the browser keeps for it', () => {
  const html = route(`${HOME}guestbook.htm`).html({ guestbook: [{ date: 'today', name: '<b>x</b>', msg: 'hi & bye' }] });
  assert.match(html, /&lt;b&gt;x&lt;\/b&gt;/);
  assert.match(html, /hi &amp; bye/);
  assert.match(html, /data-guestbook/);
});

ok('the visitor counter goes up by one a visit', () => {
  const a = route(HOME).html({ visits: 1 }).match(/aria-label="Visitors: (\d+)"/)[1];
  const b = route(HOME).html({ visits: 2 }).match(/aria-label="Visitors: (\d+)"/)[1];
  assert.equal(Number(b) - Number(a), 1);
});

ok('every internal link on every page goes somewhere real', () => {
  for (const p of PAGE_LIST) {
    const html = route(p.url).html({ visits: 1 });
    for (const [, href] of html.matchAll(/href="([^"]+)"/g)) {
      const target = joinUrl(p.url, href);
      if (target.startsWith('mailto:')) { assert.equal(target, `mailto:${CONTACT}`); continue; }
      const r = route(target);
      assert.ok(r, `${p.url}: ${href}`);
      if (new URL(r.url).hostname === SITE) assert.equal(r.kind, 'page', `${p.url} links to ${href}, which is ${r.error}`);
    }
  }
});

ok('search finds pages, best first, with a snippet', () => {
  const hits = search('deathmatch');
  assert.ok(hits.length >= 2);
  assert.ok(hits.every((h) => h.url.startsWith(HOME) && h.title && h.snippet));
  assert.ok(search('starcraft').some((h) => h.title === 'Games'));
  assert.equal(search('deathmatch')[0].title, 'Games'); // the page that says it most comes first
  assert.deepEqual(search('zzzqqqxx'), []);
  assert.deepEqual(search('   '), []);
  assert.ok(search('dazza').some((h) => h.url.endsWith('~dazza/')));
});

ok('view source gives a whole document', () => {
  const src = source(route(`${HOME}news.htm`), {});
  assert.match(src, /^<HTML>/);
  assert.match(src, /<TITLE>What's New - LAN Party '98<\/TITLE>/);
  assert.match(src, /<\/HTML>\n$/);
});

console.log(`\n${n} groups of checks passed`);
