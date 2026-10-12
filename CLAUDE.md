# LAN Party '98 — working notes for Claude

- Live site: https://lanparty1998.com (Cloudflare Pages, static, deployed from `main`).
- Commit and push every update to `main` on https://github.com/Ragnahhhhrock/lanparty1998.
- **Every asset must conform to `STYLEGUIDE.md`.** Use tokens from `css/tokens.css` only; add a token there before using any new colour, size or font. Run the checklist at the end of the guide before committing.
- After changing tokens: `python3 scripts/build-tokens.py`.
- After changing `design/social/card.html` or `favicon.svg`: `python3 scripts/render-social.py` (never hand-edit the PNGs).
- New pages copy the `<head>` metadata pattern from `index.html` (canonical, description, theme-color, icons, Open Graph, Twitter, absolute URLs) and get added to `sitemap.xml` if public.
- Parody brands only (Volt Cola, Nachoz, Cheez Curlz, Citrus Zap, Nokka). No real brand logos or commercial game data in the repo.
- **News:** the site inside Internet Explorer has a news page (`js/web-news.js`). For every update a player can see, add an entry at the top of `NEWS` (`kind: 'new'` for a feature, `'fix'` for a bug fix; dry, specific, no exclamation marks, in the party's own 1998 calendar) and run `node tools/web.test.mjs`. If you add a game, add it to `js/games.js` and it appears on the games page by itself; add a line for it to `META` in `js/web-pages.js`.
- After any JS change run the node tests in `tools/` (`for t in tools/*.test.mjs; do node $t; done`).
