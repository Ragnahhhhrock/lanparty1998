// Tests the site inside Internet Explorer as real pages: addresses, links, metadata, and that the files on disk are current.
// Run: node tools/site.test.mjs
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { realPath, realUrl, fileFor, renderPages, buildAll, redirects, sitemapPaths, SEO, ORIGIN } from '../js/web-static.js';
import { PAGE_LIST, HOME } from '../js/web-pages.js';
import { NEWS } from '../js/web-news.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (f) => readFileSync(join(root, f), 'utf8');

let n = 0;
const ok = (name, fn) => { fn(); n++; console.log(`ok  ${name}`); };

ok('addresses in the basement map to real ones', () => {
  assert.equal(realUrl('http://lanparty1998.com/news.htm#latest'), '/news#latest');
  assert.equal(realUrl('http://lanparty1998.com/news'), '/news');
  assert.equal(realUrl('http://lanparty1998.com/'), '/home');
  assert.equal(realUrl('lanparty1998.com/index.html'), '/home');
  assert.equal(realUrl('http://lanparty1998.com/news.htm?show=fix'), '/news/fix');
  assert.equal(realUrl('http://lanparty1998.com/news.htm?show=new#top'), '/news/new#top');
  assert.equal(realUrl('http://lanparty1998.com/news.htm?show=nonsense'), '/news');
  assert.equal(realUrl('http://lanparty1998.com/howto.htm#chores'), '/howto#chores');
  assert.equal(realUrl('http://lanparty1998.com/~dazza'), '/~dazza/');
  assert.equal(realUrl('http://members.lanparty1998.com/~ghoul/'), null);
  assert.equal(realUrl('mailto:contact@lanparty1998.com'), null);
  assert.equal(realPath('/guestbook.htm'), '/guestbook');
  assert.equal(fileFor('/news'), 'news.html');
  assert.equal(fileFor('/news/fix'), 'news/fix.html');
  assert.equal(fileFor('/~dazza/'), '~dazza/index.html');
});

const pages = renderPages();
const byPath = Object.fromEntries(pages.map((p) => [p.path, p]));

ok('every page of the site has a real page, and the filtered news has two more', () => {
  assert.equal(pages.length, PAGE_LIST.length + 2);
  for (const p of PAGE_LIST) assert.ok(byPath[realUrl(p.url)], `${p.url} has a real page`);
  assert.ok(byPath['/news/fix'] && byPath['/news/new']);
  assert.ok(!byPath['/'], '/ is the room, not a page of the site');
  assert.deepEqual(Object.keys(SEO).sort(), pages.map((p) => p.path).sort(), 'SEO covers exactly the pages built');
});

ok('every page is a whole document with the metadata STYLEGUIDE.md asks for', () => {
  for (const p of pages) {
    const h = p.html;
    assert.match(h, /^<!doctype html>/);
    assert.match(h, new RegExp(`<title>${p.title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')} — LAN Party '98</title>`), p.path);
    assert.ok(p.desc.length >= 120 && p.desc.length <= 160, `${p.path} description is ${p.desc.length} characters`);
    for (const m of ['canonical', 'theme-color', 'og:title', 'og:description', 'og:url', 'og:image', 'twitter:card', 'twitter:image']) assert.ok(h.includes(m), `${p.path} has ${m}`);
    assert.ok(h.includes(`<link rel="canonical" href="${ORIGIN}${p.canonical}">`), `${p.path} canonical`);
    assert.match(h, /<h1 class="visually-hidden">/);
    assert.match(h, /class="w-page"/);
    assert.ok(!/undefined|\[object/.test(h), `${p.path} has a hole in it`);
    assert.ok(!/href="[^"]*\.htm[#"?]/.test(h), `${p.path} still links to a .htm page`);
    assert.ok(!/href="https?:\/\/(?!lanparty1998\.com|malgordon\.com\/)/.test(h), `${p.path} links off the site`);
  }
  assert.equal(byPath['/news/fix'].canonical, '/news');
  assert.equal(byPath['/news'].canonical, '/news');
});

ok('every link on every page goes to a page that is built', () => {
  for (const p of pages) {
    for (const [, href] of p.html.matchAll(/<a\b[^>]*\bhref="([^"]+)"/g)) {
      if (href.startsWith('#') || href.startsWith('mailto:') || href === 'https://malgordon.com/') continue;
      assert.ok(href.startsWith('/'), `${p.path}: ${href} is not rooted`);
      const path = href.replace(/#.*$/, '');
      assert.ok(path === '/' || byPath[path], `${p.path} links to ${href}, which is not a page`);
    }
  }
});

ok('the pages carry what the browser version carries', () => {
  assert.match(byPath['/news'].html, /id="latest"/);
  assert.match(byPath['/howto'].html, /id="chores"/);
  assert.match(byPath['/games'].html, /id="midnight"/);
  assert.equal((byPath['/news'].html.match(/<tr><td class="w-date">/g) ?? []).length, NEWS.length);
  assert.match(byPath['/news/fix'].html, /Bug fixes/);
  assert.match(byPath['/news/new'].html, /New features/);
  assert.match(byPath['/home'].html, new RegExp(NEWS[0].title));
  assert.match(byPath['/guestbook'].html, /data-guestbook/);
  assert.match(byPath['/guestbook'].html, /action="\/guestbook"/);
  assert.match(byPath['/home'].html, /href="\/news#latest"|href="\/news"/);
  assert.match(byPath['/links'].html, /<span class="w-dead">xX_Ghoul_Xx's Dark Zone<\/span>/);
});

ok('the way back into the room is on every page', () => {
  for (const p of pages) assert.match(p.html, /<nav class="site-bar"[^>]*><a href="\/">/, p.path);
});

ok('old addresses redirect, and the room is left alone', () => {
  const r = redirects();
  assert.match(r, /^\/news\.htm \/news 301$/m);
  assert.match(r, /^\/whatsnew\.htm \/news 301$/m);
  assert.match(r, /^\/play\.htm \/howto 301$/m);
  assert.match(r, /^\/index\.htm \/home 301$/m);
  assert.match(r, /^\/~dazza\/index\.htm \/~dazza\/ 301$/m);
  assert.ok(!/^\/index\.html /m.test(r), '/index.html is the room');
  assert.ok(!/^\/ /m.test(r), '/ is the room');
  assert.ok(!/\.html /.test(r.replace(/^#.*$/m, '')), 'Cloudflare Pages redirects .html itself');
});

ok('every public page is in sitemap.xml', () => {
  const sitemap = read('sitemap.xml');
  assert.ok(sitemap.includes(`<loc>${ORIGIN}/</loc>`));
  for (const path of sitemapPaths()) assert.ok(sitemap.includes(`<loc>${ORIGIN}${path}</loc>`), `${path} is missing from sitemap.xml`);
  assert.ok(!sitemap.includes('/news/fix') && !sitemap.includes('/news/new'), 'the filtered news is a view of /news');
});

ok('the files on disk are what the build makes (run: node scripts/build-site.mjs)', () => {
  const built = buildAll(read('css/style.css'));
  for (const [file, text] of Object.entries(built)) {
    assert.ok(existsSync(join(root, file)), `${file} is missing`);
    assert.equal(read(file), text, `${file} is out of date`);
  }
});

ok('site.css has the page styles, and only tokens for colour', () => {
  const css = read('css/site.css');
  for (const c of ['.w-page', '.w-banner', '.w-nav-btn', '.w-box', '.w-tbl', '.w-tag', '.w98-btn', 'kbd', '.site-bar']) assert.ok(css.includes(c), `site.css has ${c}`);
  assert.ok(!/#[0-9a-f]{3,8}\b/i.test(css.replace(/^\/\*[\s\S]*?\*\//, '')), 'no raw hex in site.css');
  assert.ok(!/overflow:\s*hidden;\s*background: var\(--basement\)/.test(css), 'the game\'s locked-screen rules are not copied over');
});

ok('site.js and the pages share the counter key with the browser in the basement', () => {
  const key = /VISITS_KEY = '([^']+)'/.exec(read('js/site.js'))[1];
  assert.ok(read('js/app-browser.js').includes(`'${key}'`));
  assert.ok(HOME.endsWith('/'));
});

console.log(`\n${n} groups of checks passed`);
