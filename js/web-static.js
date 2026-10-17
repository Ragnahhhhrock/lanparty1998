// The site inside Internet Explorer, as real pages: http://lanparty1998.com/news.htm#latest in the basement
// is https://lanparty1998.com/news#latest outside it. No DOM and no file access, so tools/site.test.mjs can
// check every page. scripts/build-site.mjs writes what this returns.
//
// The pages themselves are the ones in js/web-pages.js and js/web-news.js; this turns each into a complete,
// crawlable HTML document, rewrites its links to the real addresses and adds the head metadata STYLEGUIDE.md asks for.
// To add a page: add it to PAGES in js/web-pages.js, add its address to SEO below, run `node scripts/build-site.mjs`.
import { SITE, HOME, ALIASES, PAGE_LIST, VISITORS_BASE, parseUrl, joinUrl, route } from './web-pages.js';

export const ORIGIN = `https://${SITE}`;

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/* ------------------------------------------------------------------ addresses */

// The home page of the site in the basement is `/`, but on the real site `/` is the room itself, so it lives at /home.
export const realPath = (path) => (path === '/' ? '/home' : path.replace(/\.htm$/, ''));

// An address inside the basement browser -> the real path (with its #anchor), or null if it is not a page of this site.
// `news.htm?show=fix` is a page of its own, /news/fix. No other query string means anything to a static page.
export function realUrl(url) {
  const u = parseUrl(url);
  if (!u || u.host !== SITE || (u.scheme !== 'http' && u.scheme !== 'https')) return null;
  let path = realPath(u.path);
  if (u.path === '/news.htm') {
    const show = new URLSearchParams(u.query).get('show');
    if (show === 'new' || show === 'fix') path = `/news/${show}`;
  }
  return `${path}${u.hash}`;
}

// /news -> news.html, /news/fix -> news/fix.html, /~dazza/ -> ~dazza/index.html (Cloudflare Pages serves each without the extension)
export const fileFor = (path) => (path.endsWith('/') ? `${path.slice(1)}index.html` : `${path.slice(1)}.html`);

/* ------------------------------------------------------------------------ pages */

// What each page says to a search engine. Titles are `Page — LAN Party '98`; descriptions are 120-160 characters.
// `canonical` is set where a page is only a view of another (the filtered news).
export const SEO = {
  '/home': {
    title: 'Home',
    desc: 'The homepage for Saturday night in the basement: tonight\'s schedule, the latest news and every game on the hub. Six beige boxes and a crate of Volt Cola.',
  },
  '/news': {
    title: 'What\'s New',
    desc: 'Every new feature and bug fix at LAN Party \'98, newest first, from the first basement build to CRTs that show the game being played.',
  },
  '/news/new': {
    title: 'New features',
    desc: 'Every new feature added to the LAN Party \'98 basement, newest first: games, phones, pizza, lights and a PC you build yourself.',
    canonical: '/news',
  },
  '/news/fix': {
    title: 'Bug fixes',
    desc: 'Every bug fix at LAN Party \'98, newest first: pizza boxes on the tower, a phone in front of the breakers and a clock that started at 11:42 PM.',
    canonical: '/news',
  },
  '/games': {
    title: 'Games',
    desc: 'Every game on the LAN Party \'98 hub: DOOM, Heretic, Hexen, Quake, Descent and Duke Nukem 3D, plus Minesweeper, Solitaire and Downhill on the desktop.',
  },
  '/howto': {
    title: 'How to Play',
    desc: 'How to play LAN Party \'98: the keys, how to start a deathmatch over IPX, and the night\'s chores, from broken file sharing to the extension lead.',
  },
  '/guestbook': {
    title: 'Guestbook',
    desc: 'Sign the LAN Party \'98 guestbook. The webmaster reads it, the regulars read it more, and nobody checks the spelling. Mum has already signed it.',
  },
  '/links': {
    title: 'Links',
    desc: 'Pages on the LAN Party \'98 site and the regulars\' own: Dazza\'s cheat codes, xX_Ghoul_Xx\'s Dark Zone and a few pages that are still on the way.',
  },
  '/~dazza/': {
    title: 'Dazza\'s Page',
    desc: 'Dazza\'s cheat codes for DOOM, Heretic, Quake, Duke Nukem 3D and Descent. Do not share. If you found this page, you did not find it here.',
  },
};

// every page to write: one per entry in PAGES, plus the two filtered views of the news
const sources = () => [
  ...PAGE_LIST.map((p) => p.url),
  `${HOME}news.htm?show=new`,
  `${HOME}news.htm?show=fix`,
];

// Links in the basement point at the virtual site; on the real one they point at real files.
// A link to somewhere that is not on this site (the regulars' own pages, which are not built yet) is shown as plain text (the maker's credit link is the one real external link).
function rewriteLinks(html, pageUrl) {
  return html.replace(/<a\b([^>]*?)\bhref="([^"]*)"([^>]*)>([\s\S]*?)<\/a>/g, (all, before, href, after, inner) => {
    if (href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('https://malgordon.com/')) return all;
    const target = realUrl(joinUrl(pageUrl, href));
    if (!target) return `<span class="w-dead">${inner}</span>`;
    return `<a${before}href="${target}"${after}>${inner}</a>`;
  }).replace(/(<form\b[^>]*\baction=")[^"]*"/, '$1/guestbook"');
}

const head = ({ title, desc, canonical }) => `<head>
<!-- Google tag (gtag.js) — served first-party via Google tag gateway on Cloudflare -->
<script async src="/metrics/?id=G-P6RQJ9BSJ1"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', 'G-P6RQJ9BSJ1');
</script>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)} — LAN Party '98</title>
<meta name="description" content="${esc(desc)}">
<link rel="canonical" href="${ORIGIN}${canonical}">
<meta name="theme-color" content="#000080">
<meta name="color-scheme" content="dark">
<meta name="application-name" content="LAN Party '98">
<meta name="apple-mobile-web-app-title" content="LAN Party '98">
<meta name="robots" content="index, follow, max-image-preview:large">

<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="icon" href="/favicon-32.png" sizes="32x32" type="image/png">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
<link rel="manifest" href="/site.webmanifest">

<!-- Open Graph -->
<meta property="og:type" content="website">
<meta property="og:site_name" content="LAN Party '98">
<meta property="og:url" content="${ORIGIN}${canonical}">
<meta property="og:title" content="${esc(title)} — LAN Party '98">
<meta property="og:description" content="${esc(desc)}">
<meta property="og:image" content="${ORIGIN}/img/og-image.png">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:type" content="image/png">
<meta property="og:image:alt" content="A Windows 98 style window titled LANPARTY.EXE beside a beige CRT showing an IPX network game lobby, over wood-panelled basement walls.">
<meta property="og:locale" content="en_AU">

<!-- X / Twitter -->
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${esc(title)} — LAN Party '98">
<meta name="twitter:description" content="${esc(desc)}">
<meta name="twitter:image" content="${ORIGIN}/img/twitter-card.png">
<meta name="twitter:image:alt" content="A Windows 98 style window titled LANPARTY.EXE beside a beige CRT showing an IPX network game lobby.">

<link rel="preload" href="/fonts/vt323-latin.woff2" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="/css/tokens.css">
<link rel="stylesheet" href="/css/site.css">
</head>`;

// One page: { path, file, title, desc, canonical, html }
export function renderPages() {
  return sources().map((url) => {
    const r = route(url);
    const path = realUrl(url);
    const seo = SEO[path];
    if (!seo) throw new Error(`No SEO entry for ${path} (add it to SEO in js/web-static.js)`);
    const canonical = seo.canonical ?? path;
    const body = rewriteLinks(r.html({ visits: 1 }), url);
    const html = `<!doctype html>
<html lang="en">
${head({ title: seo.title, desc: seo.desc, canonical })}
<body data-page="${path}" data-visitors-base="${VISITORS_BASE}">
<nav class="site-bar" aria-label="LAN Party '98"><a href="/">C:\\&gt; <b>LANPARTY.EXE</b></a><span>Walk into the basement and play, free in your browser.</span></nav>
<main class="web">
<h1 class="visually-hidden">${esc(seo.title)} — LAN Party '98</h1>
${body}
</main>
<script type="module" src="/js/site.js"></script>
</body>
</html>
`;
    return { path, file: fileFor(path), title: seo.title, desc: seo.desc, canonical, html };
  });
}

/* -------------------------------------------------------------------------- css */

// css/site.css is not written by hand. The page styles are the `.web` block of css/style.css (the same ones the
// basement browser uses), plus the button and keycap they lean on, plus the few rules a page outside the game needs.
// style.css locks the page to the screen for the 3D room, so the whole file cannot be used here.
const WEB_START = '/* ---- The site inside the browser';
const WEB_END = '/* ---- BUILDPC.EXE';

export function siteCss(styleCss) {
  const a = styleCss.indexOf(WEB_START);
  const b = styleCss.indexOf(WEB_END);
  if (a < 0 || b < a) throw new Error('css/style.css no longer has the "site inside the browser" block');
  const web = styleCss.slice(a, b).trimEnd();
  const btn = [...styleCss.matchAll(/^\.w98-btn(?:\.default|:active|:focus-visible)?\s*\{[^}]*\}/gm)].map((m) => m[0]).join('\n');
  const kbd = /^kbd \{[^}]*\}/m.exec(styleCss)?.[0];
  if (!btn || !kbd) throw new Error('css/style.css no longer has the button or keycap rules');
  return `/* GENERATED by scripts/build-site.mjs from css/style.css. Do not edit by hand.
   Styles for the pages of the site outside the game (/home, /news, /games ...). Tokens only: css/tokens.css. */

html { background: var(--wood-dark); }
body { display: flex; flex-direction: column; min-height: 100vh; margin: 0; color: var(--w98-text); font: var(--text-ui)/var(--leading-ui) var(--font-ui); }

/* the way back into the room */
.site-bar { display: flex; flex-wrap: wrap; align-items: baseline; gap: var(--space-1) var(--space-4); padding: var(--space-2) var(--gutter); background: var(--crt-black);
  color: var(--dos-grey); font: var(--text-crt-md)/1.1 var(--font-crt); }
.site-bar a { color: var(--phosphor-link); }
.site-bar a:hover { color: var(--amber); }
.site-bar a:focus-visible { outline: 1px dotted var(--phosphor-link); outline-offset: 2px; }
.site-bar span { font-size: var(--text-crt); }
.visually-hidden { position: absolute; width: 1px; height: 1px; margin: -1px; padding: 0; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; border: 0; }
main.web { flex: 1; }

${btn}
${kbd}

${web}

/* outside the browser, visited links go purple like they did, and a link to a page that is not built yet is only text */
.web a:visited:not(.w-nav-btn) { color: var(--web-visited); }
.web a:hover:not(.w-nav-btn), .web a:active:not(.w-nav-btn) { color: var(--volt-can); }
.w-dead { color: var(--w98-title-off); }
.w-form .w98-btn { cursor: pointer; }

/* a phone is not 800x600: stack the button column above the page */
@media (max-width: 640px) {
  .web { padding: var(--space-1); }
  .w-page, .w-page > tbody, .w-page > tbody > tr, .w-page > tbody > tr > td { display: block; width: auto; }
  .w-page > tbody > tr > td.w-side { display: flex; flex-wrap: wrap; gap: var(--space-1h); }
  .web a.w-nav-btn { margin: 0; }
  .w-visitors, .w-badges { flex-basis: 100%; }
  .w-badges { grid-auto-flow: column; justify-content: center; }
  .w-main { padding: var(--space-3); }
  .w-banner { overflow: hidden; }
  .w-tbl.w-games { display: block; overflow-x: auto; }
}
`;
}

/* ---------------------------------------------------------- redirects and the lot */

// Every old address of a page in the basement goes to its real one. Cloudflare Pages already sends
// /news.html to /news, /index.html to /, and /~dazza to /~dazza/, so those are left out (and /index.html is the room).
export function redirects() {
  const pairs = new Map();
  for (const p of PAGE_LIST) pairs.set(p.path, realPath(p.path));
  for (const [from, to] of Object.entries(ALIASES)) pairs.set(from, realPath(to));
  const lines = [];
  for (const [from, to] of pairs) {
    if (from === to || from.endsWith('.html') || `${from}/` === to || from === '/') continue;
    lines.push(`${from} ${to} 301`);
  }
  return `# GENERATED by scripts/build-site.mjs. The old addresses of the pages inside the basement browser.\n${lines.join('\n')}\n/news/ /news 301\n`;
}

// everything the build writes: { 'news.html': '<!doctype html>...', ... }
export function buildAll(styleCss) {
  const out = { 'css/site.css': siteCss(styleCss), _redirects: redirects() };
  for (const p of renderPages()) out[p.file] = p.html;
  return out;
}

// the pages that belong in sitemap.xml (the filtered news is a view of /news, not a page of its own)
export const sitemapPaths = () => renderPages().filter((p) => p.canonical === p.path).map((p) => p.path);
