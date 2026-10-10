# LAN Party '98 — working notes for Claude

- Live site: https://lanparty1998.com (Cloudflare Pages, static, deployed from `main`).
- Commit and push every update to `main` on https://github.com/Ragnahhhhrock/lanparty1998.
- **Every asset must conform to `STYLEGUIDE.md`.** Use tokens from `css/tokens.css` only; add a token there before using any new colour, size or font. Run the checklist at the end of the guide before committing.
- After changing tokens: `python3 scripts/build-tokens.py`.
- After changing `design/social/card.html` or `favicon.svg`: `python3 scripts/render-social.py` (never hand-edit the PNGs).
- New pages copy the `<head>` metadata pattern from `index.html` (canonical, description, theme-color, icons, Open Graph, Twitter, absolute URLs) and get added to `sitemap.xml` if public.
- Parody brands only (Volt Cola, Nachoz). No real brand logos or commercial game data in the repo.
