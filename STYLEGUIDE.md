# LAN Party '98 — Design System & Style Guide

Every asset made for this project (UI, textures, icons, social images, docs, marketing) must conform to this guide. If something you need isn't covered, add it here and to `css/tokens.css` first, then build it.

- **Tokens (source of truth):** `css/tokens.css`
- **Tokens for scripts and tools:** `design/tokens.json` (generated: `python3 scripts/build-tokens.py`)
- **Live reference:** [`/styleguide.html`](https://lanparty1998.com/styleguide.html)
- **Social image source:** `design/social/card.html` (rendered by `python3 scripts/render-social.py`)

---

## 1. Concept

**It's Saturday night, 1998, in somebody's basement.** Three layers, always in this order of importance:

| Layer | What it is | Where it's used |
| --- | --- | --- |
| **Basement** | Wood panelling, brown carpet, drop ceiling, beige plastic | Backgrounds, the 3D room, framing |
| **Shell** | Windows 98 chrome: grey faces, bevels, navy title bars | Every interactive UI surface |
| **Phosphor** | Black CRT glass, green/amber DOS text, scanlines | Anything "on a screen": prompts, status, errors |

Brand colour comes from the parody snacks (**Volt Cola** red, **Nachoz** orange, **Cheez Curlz** and **Citrus Zap** green), used sparingly as accents.

The look is **authentic, not ironic**: it should feel like a real 1998 machine, not a meme about one. No vaporwave pinks, no neon glow grids, no Y2K chrome.

## 2. Colour

Use tokens by name. Never introduce a raw hex value in CSS, canvas code or a template without adding a token first.

### Shell
| Token | Hex | Use |
| --- | --- | --- |
| `--w98-face` | `#c0c0c0` | Window, button, panel faces |
| `--w98-light` / `--w98-hilite` | `#ffffff` / `#dfdfdf` | Bevel highlights |
| `--w98-shadow` / `--w98-dark` | `#808080` / `#0a0a0a` | Bevel shadows |
| `--w98-title` → `--w98-title2` | `#000080` → `#1084d0` | Active title bar gradient; headline colour on grey |
| `--w98-desktop` | `#008080` | Desktop teal (on in-world screens only) |
| `--w98-text` | `#000000` | Text on grey |
| `--w98-title-off` | `#5a5a5a` | Inactive title bar (white text) |

### Phosphor
| Token | Hex | Use |
| --- | --- | --- |
| `--crt-black` | `#000000` | CRT glass |
| `--phosphor` | `#9dff7a` | Primary CRT text, prompts, live status |
| `--phosphor-link` | `#4dff5a` | Links on CRT surfaces |
| `--dos-grey` | `#aaaaaa` | Default DOS text |
| `--amber` | `#ffcc00` | CRT titles and highlights |
| `--toast` | `#ffe066` | In-world announcements (with hard black shadow) |
| `--bsod` | `#0000aa` | The Win98 fatal exception screen, white VT323 text on it |

### Basement
`--basement #0b0906` (page bg) · `--wood #4a2c17` · `--wood-dark #24150b` · `--carpet #3b2f2a` · `--ceiling #d9d4c7` · `--beige #d6cdb4` · `--beige-light #ebe4cf` · `--paper #e8e1cc` (text on dark basement bars) · `--foil #c9ced4` (the foil round the garlic bread)

### Media
`--floppy-black #1c1c1f` · `--floppy-blue #2b6fd6` · `--floppy-red #c0392b` · `--floppy-yellow #e8c21b` · `--floppy-green #3aa35a` · `--floppy-grey #8a8d92` (3.5" disks) · `--disk-metal #b9bdc2` · `--disk-case #26262b` · `--disk-smoke #3a3d42` · `--case-clear #dfe6ea` (cases, tubs, spindles) · `--disc-silver #cfd3d8` · `--disc-edge #8f949a` · `--disc-cdr #7f9f8a` (CDs)

### Build
`--cable-ps2 #7a3f98` (the keyboard lead and its plug) · `--mat-cloth #1c3b6e` (a cloth mouse mat). The rest of the PC you build reuses tokens that exist: the VGA lead is `--floppy-blue`, the mouse lead `--floppy-green`, the audio lead `--zap-lime`, the large mat `--poster-ember`, the hard mat `--disk-case`, mains plugs `--power-*`. The ghost outline where a part goes is `--zap-lime`.

### People
`--skin` … `--skin-5` · `--hair`, `--hair-black`, `--hair-blond`, `--hair-red` · `--eye-white` (eyeballs, teeth) · `--iris-brown` / `--iris-blue` / `--iris-green` · `--lip` (blended into each person's skin tone) · `--clothes-*`, `--neon-*`, `--shirt-1` … `--shirt-8`, `--denim`, `--shoe`. Shading on faces and clothes is derived from these in code, never a new hex.

### Brand accents
`--volt #e2231a` (caffeine, UI red) · `--volt-can #c4161c` · `--volt-yellow #ffd400` · `--nacho #f28a1c` (snacks) · `--nacho-navy #1d1a5c` · `--cheese #ffcc00` · `--curlz-bag #1f7a4d` (Cheez Curlz bag) · `--curlz #ffa51f` (the curls) · `--zap-green #4aa52a` / `--zap-lime #b5d334` / `--zap-dark #1c5a1e` (Citrus Zap, the green two-litre: green label, `--volt-yellow` wordmark, `--volt-can` stripe, `--zap-dark` cap) · `--cup-red #d42b22` (disposable party cups) · Power fittings (3D only): `--power-cord #151515` (leads) · `--power-plug #f2f0e6` (plugs, plates, the light switch) · `--power-brass #b8a060` (pins) · `--power-lead #e8c21b` (the yellow extension lead) · `--power-board #e9e4d2` (power boards) · `--power-neon #ff6a1a` (a board's lit switch) · `--power-switch-glow #ffb040` (the light switch's dot) · `--power-tube-off #3d4146` (a ceiling tube, off)

### Phone
`--phone-body #2d3a44` (the slate shell of the candy-bar mobile) · `--phone-body-light #4a5a66` (its bevel highlight and the seam round the screen) · `--lcd #a3b88f` (the green-grey screen, lit) · `--lcd-ink #1b2616` (pixels, text and the snake; 6.8:1 on `--lcd`). Keys reuse `--disk-metal` with `--w98-text` labels, the brand is a parody wordmark (**Nokka**), and the phone's depth is `--bevel-phone` plus `--bevel-key` / `--bevel-pressed` on the keys.

### Web
`--web-visited #551a8b` (visited links on the beige page; AA on `--beige-light`) · `--web-width 520px` (the page column: the site is built for 800x600). Unvisited links are `--w98-title`, hover and active are `--volt-can`.

### Lounge
`--couch #5b7050` (faded sage plaid) · `--couch-dark #3f4f38` · `--couch-line #a3483b` (rust stripe, throw pillow) · `--oak #8a5a2e` (coffee table top) · `--beanbag #2f5d6e` / `--beanbag-dark #204452` (the bean bag: faded teal vinyl in six alternating panels) · `--tv-case #2b2b2f` (the big CRT TV) · `--console-body #9a9da1` · `--console-dark #44474b` (console, pads and their leads). Pad shells reuse `--floppy-blue/red/yellow/green`; the TV game is flat, generic and on `--nacho-navy`. The console prompt is a 64x20 VT323 terminal on the TV glass (colours commented with their tokens in `js/n64.js`) and a `#console-bar` that shares the seated bar's style. The name "N64" appears as plain text only: no logos, no cartridge art.

### Posters
`--poster-ember #7a1a12` · `--poster-steel #46697a` · `--poster-steel-light #8fb1c0` · `--poster-space #0b1033` · `--poster-nebula #5b2f86` · `--poster-planet #b4532a` · `--poster-rock #6e6055` · `--poster-rock-dark #3d352f` · `--poster-chrome #c9d5dd` · `--poster-chrome-dark #5e6c76` · `--poster-sky #7fb4dc` (invented game boxes and film one-sheets on the walls; everything else on them reuses existing tokens)

### Apps
`--mine-1 #0000ff` · `--mine-2 #005000` · `--mine-3 #a00000` · `--mine-5 #800000` · `--mine-6 #005050` · `--mine-8 #505050` (Minesweeper numbers: the classic hues, darkened where the originals fail AA on grey; 4 and 7 reuse `--w98-title` and `--w98-text`) · `--mine-face #ffff00` (the smiley button) · `--felt #008000` and `--card-red #c4161c` (Solitaire on the in-room PCs; black suits use `--w98-text`) · `--snow #f4f8ff` and `--snow-shade #c3d0e4` (Downhill: the slope and the tracks cut in it; trees, rocks and the skier reuse existing tokens)

**Rules**
- Accents (Volt/Nacho) cover **under 10%** of any composition.
- Text must meet WCAG AA contrast: black on `--w98-face`, `--phosphor`/`--dos-grey`/`--amber` on `--crt-black`, `--paper` on basement bars. Never phosphor on grey, never navy on black.
- Red means caffeine or danger, orange means snacks. Don't swap them.

## 3. Typography

| Token | Stack | Use |
| --- | --- | --- |
| `--font-crt` | **VT323** → Lucida Console → Courier New | Headlines, anything on a CRT, clocks, numbers, prompts, toasts |
| `--font-ui` | **Tahoma** → MS Sans Serif → Segoe UI → system-ui | Shell UI, body copy, buttons, labels |

- VT323 is **self-hosted** (`fonts/vt323-latin.woff2`, SIL OFL). Don't load web fonts from Google or any CDN.
- No other typefaces. No italics. Bold only in UI for labels, title bars and meter names.
- VT323 sizes: 18 · 20 · 24 · 26 · 40 (window headline) · 96+ (social/splash only). UI sizes: 11 · 12 · 13 (default).
- Meter labels and system labels are UPPERCASE with `letter-spacing: .04em`. Everything else is sentence case.
- DOS text uses real DOS conventions: `C:\>` prompts, 8.3-style names (`LANPARTY.EXE`, `NETFRAG`).

## 4. Shape, depth and spacing

- **Square corners everywhere** in the shell. The only rounded shape is CRT glass (`border-radius: 6px / 8px` at UI scale).
- **Depth is bevels only.** Use `--bevel-raised` (windows, buttons, panels), `--bevel-pressed` (active button), `--bevel-sunken` (fields, meter tracks, status cells), `--bevel-small` (title-bar buttons), `--bevel-key` (keycaps).
- **No blurred drop shadows, no gradients except the title bar.** In flat illustrations (social images) a hard, unblurred offset shadow `10px 10px 0 rgba(0,0,0,.45)` is allowed to lift objects off the wall.
- Spacing is on a 4px grid (`--space-1` 4 → `--space-8` 32). 2px and 6px are for bevel-adjacent nudges only. Keep a minimum `--gutter` of 16px from screen edges.
- Overlays: `--scrim` behind dialogs, `--hud-bg` behind in-world prompts, `--bar-bg` for the seated bar. CRT surfaces get `--scanlines` + `--vignette`.

## 5. Components

All defined in `css/style.css` and shown on `/styleguide.html`.

| Component | Class | Notes |
| --- | --- | --- |
| Window | `.w98-window` > `.w98-title` + `.w98-body` | Title is an 8.3 file name in caps (`LANPARTY.EXE`). Close box `×` is decorative. |
| Button | `.w98-btn`, `.w98-btn.default` | Min-width 88px. Default action gets the 1px black outline. Focus = dotted inset outline. |
| Panel | `.w98-panel` | Raised bevel, used for HUD meters. |
| Meter | `.meter` > `span` + `.bar > i` | Segmented fill (7px block, 2px gap). Caffeine red, snacks orange. |
| Share row | `.share` > `.share-label` + `.w98-btn.share-btn` | Text labels only, no network logos. Links are plain anchors with `rel="noopener noreferrer"`; status text speaks DOS ("Bad command or file name."). |
| Support row | `.share` > `.share-label` (`SUPPORT`) + `.w98-btn.share-btn` + `.share-status` | The "Shout me a Volt Cola" donation link to Stripe Checkout. Same bevelled button as the share row but bold, larger and `default`-outlined (`.support-btn`): no Stripe or card logos, no red fill. Plain anchor, `rel="noopener noreferrer"`, opens in a new tab. The same link also lives on the taskbar as `#donate-btn` (see Taskbar), so it can be clicked at any time. |
| Desktop window | `.w98-window.dwin` > `.w98-title` (`.w98-ticon`, `.w98-ttext`, `.w98-tbtns`) + `.w98-menubar` + `.dwin-body` | Windows for programs on the desktop. Programs use their Win95 captions in title case (`Minesweeper`, `Notepad`), game windows keep their own (`mIRC32 - [#lanparty98]`). Active title is the navy gradient, inactive is flat `--w98-title-off`. Minimise `_` and close `×` are real buttons. Dragged by the title bar. Windows marked `resize: true` (Notepad, Paint, MS-DOS Prompt, Help, mIRC) also get a Maximise / Restore button, double-click on the title bar to toggle it, and a sizing border (`--grip`, corner zones `--grip-corner`) with a per-app minimum size; fixed windows (Calculator, dialogs, games, LANamp) never resize and have no Maximise button. A maximised window fills the desktop above the taskbar and can't be dragged. |
| Menu bar and pop-ups | `.w98-menubar` > `.mb-top` > `.mb-btn` + `.w98-popup` > `.sm-item` | Raised pop-up, navy highlight with white text, a tick for checked items, key hints on the right. |
| Taskbar | `#taskbar` (`#start-btn`, `#tasks` > `.w98-task`, `#donate-btn`, `#tray`) | 28px (`--taskbar-h`) bar along the bottom. Start button, one raised button per open window (the active one pressed and bold), sunken tray with the speaker, a VT323 hint and the party clock. `#donate-btn` is the always-visible "Shout me a Volt Cola $5" link to Stripe Checkout: a `default`-outlined bevelled anchor with the pixel `can` icon, between the open windows and the tray; under 700px it shortens to "Volt Cola $5". |
| Start menu | `#startmenu` > `.sm-banner` + `.sm-list` | Navy banner with the VT323 words LAN Party 98, 32px icons at the top level, 16px in sub-menus, separators, a right-pointing triangle on sub-menus. |
| Internet Explorer | `.dwin-body.ie` > `.ie-toolbar`, `.ie-addr`, `.ie-links`, `.ie-main` (`.ie-pane` + `.ie-view`), `.ie-status` | The web browser (`js/app-browser.js`, Start > Programs, **H**). Win98 chrome: flat toolbar buttons that bevel on hover, a sunken Address combo, a Links bar, an Explorer bar for Search, Favorites and History, a status bar with the segmented progress meter. The throbber is the party's own pixel globe (`globe`, `globe2`, `globe3`), never a real logo. Pages load in a few steps, slowly on purpose; reduced motion loads at once. |
| Web page | `.web` > `.w-page` (`.w-banner`, `.w-side`, `.w-main`, `.w-foot`), `.w-box`, `.w-tbl`, `.w-tag` | The site inside the browser (`js/web-pages.js`, news in `js/web-news.js`). A 1998 homepage: table layout, a black CRT banner with an amber VT323 logo, a button column, a hit counter, 88x31 badges, a guestbook, NEW and FIXED tags, a marquee. Wood panelling behind (hard-stop stripes of `--wood` and `--wood-dark`), `--beige-light` on the page, `--w98-face` for buttons and boxes, navy flat box titles. Tahoma and VT323 only, square corners, bevels, tokens only. Under construction is a `--volt-yellow` and `--w98-dark` hazard bar. Errors talk like 1998 IE: "The page cannot be displayed", "404 File Not Found". |
| Snapster | `.dwin-body.snap` > `.snap-head` (CRT strip: amber VT323 logo, phosphor hub count), `.snap-tabs` > `.snap-tab`, `.snap-pane` (`.snap-find` form, `.snap-grid` > `.snap-tbl`, `.snap-actions`), `.app-bar.snap-status` | The file-sharing client (`js/app-snapster.js`, network in `js/snapster.js`, Start > Programs). Win98 chrome with a Phosphor header; tabs for Search, Transfers and Library; sunken white result grid with raised sortable column heads and a navy selected row; the transfer bar is the segmented `--w98-title` fill. Tokens only. Every band, title and user is made up, the name is a parody, and nothing is downloaded. |
| Mobile phone | `#phone` > `.phone-wrap` > `.phone-shell` (`.phone-brand`, `.phone-lcd`, `.phone-nav`, `.phone-pad`) | The candy-bar handset from the couch (`js/phone.js`; screens and keys in `js/handset.js`, Snake in `js/snake.js`, the call tones in `js/tones.js`). A slate shell with the parody wordmark, a 258x144 green LCD in VT323 (inverted bar for the chosen row, 3px-per-cell Snake board drawn on a canvas in `--lcd-ink`), a Menu / up / down / C row and a 12-key pad (VT323 digits, Tahoma letters). Square corners, bevels only, tokens only. Calls use Australian tones (425 Hz dial and engaged, two-tone ring-back); the wall phone shares the same numbers and tones. |
| Pixel icon | `icon(name, size)` in `js/icons.js` | 16x16 grids drawn in tokens only, scaled to 16 or 32 with `crispEdges`. Add new icons to that file, never as image files. |
| Keycap | `kbd` | Name keys as they appear on a 1998 keyboard: `Esc`, `` ` ``, `W`. |
| Prompt | `#prompt` | VT323 24px phosphor on `--hud-bg`. Verb first: "Press E to sit down". |
| Toast | `#toast` | VT323 26px `--toast` with hard black shadow. Short, in-world. |
| Speech bubble | in `js/avatars.js` | In-world balloon over a person's name tag: `--w98-face` with the raised bevel, black VT323 text, stepped tail pointing down. Max five lines of about 22 characters. Spoken lines only, in the voice below; noises are written as `*actions*`. |
| CRT surface | `#monitor`, `#crt-fx` | Black glass, scanlines, vignette, faint green inner glow. |

### Desktop notes
- Layers: windows sit at `--z-window`, above the CRT but under the seated bar's controls, the taskbar at `--z-taskbar`, the Start menu at `--z-startmenu`, message boxes and the intro at `--z-dialog`.
- The HUD, seated bar and chat clear the taskbar by `--taskbar-h`.
- Programs never use a real brand's logo. Icons are the party's own pixel art.
- Opened menus use the same item style everywhere (`.sm-item`). Don't add a second menu look.

## 6. Voice

- **Dry, specific, of the era.** Name real-feeling things: "10BASE-T hub", "IPX", "PC-04", "11:42 PM".
- Short sentences. British/Australian-neutral spelling is fine; be consistent within a piece.
- Errors talk like DOS: "Bad command or file name." Not "Oops! Something went wrong."
- No emoji, no exclamation-mark hype, no "retro vibes", no "nostalgia trip".
- Parody brands only: **Volt Cola**, **Nachoz**, **Cheez Curlz**, **Citrus Zap** and **Nokka** (the mobile phone). Never use real snack, drink or hardware brand names or logos. Real game titles (DOOM, Quake…) may be named as text but never shown with their logos or box art.

## 7. Imagery and textures

- 3D textures are drawn procedurally in `js/textures.js`. Colours there must match tokens (read `design/tokens.json` values; don't invent new hexes).
- Illustrations are **flat, hard-edged, pixel-aligned** (`shape-rendering: crispEdges` in SVG). No photographs, no stock, no AI-generated imagery, no 3D renders with soft lighting outside the actual game.
- **Game boxes** (the shelf, `gameBoxFront` in `js/textures.js`): the title is plain VT323 text and the picture is invented, one generic scene per game. Never a real cover, logo, character or publisher mark. Tokens only (`--poster-*` and the usual accents).
- Screenshots in docs come from the real game at 1280×760.

## 8. Icon

`favicon.svg` is the master: a beige CRT showing a phosphor `>_`, on a 32-unit pixel grid. Raster sizes are rendered from it (never redrawn by hand) onto `--basement`:

| File | Size |
| --- | --- |
| `favicon.svg` | vector |
| `favicon-32.png` | 32×32 |
| `apple-touch-icon.png` | 180×180 |
| `img/icon-192.png`, `img/icon-512.png` | manifest (512 is maskable: 64px safe padding) |

## 9. Social images and metadata

| Asset | Size | File | Meta |
| --- | --- | --- | --- |
| Open Graph | 1200×630 | `img/og-image.png` | `og:image` + width/height/alt |
| X / Twitter | 1200×600 (2:1) | `img/twitter-card.png` | `twitter:card = summary_large_image` |

- Both are rendered from `design/social/card.html`, which uses only tokens. Edit the template, then run `python3 scripts/render-social.py`; never edit the PNGs directly.
- Composition: Win98 window with the VT323 headline (left), beige CRT with phosphor text (right), HUD meters, domain as a `C:\>` prompt on the carpet strip, wood-panel wall behind.
- Keep all text inside a **64px safe margin**. Under 300 KB each.
- Every page needs: `<title>`, `description`, `canonical`, `theme-color` (`#000080`), icons, manifest, full Open Graph and Twitter tags with absolute `https://lanparty1998.com/…` URLs and alt text. Copy `index.html`'s `<head>` as the template.
- Title format: `Page — LAN Party '98`. Descriptions 120–160 characters, in the voice above.

## 10. Accessibility and motion

- All interactive elements keyboard-reachable with a visible focus style (dotted Win98 outline).
- Respect `prefers-reduced-motion`: disable transitions and CRT flicker.
- Don't convey state by colour alone: meters carry text labels.

## 11. Conformance checklist

Before committing any new asset:

- [ ] Every colour, size and font is a token from `css/tokens.css`
- [ ] Belongs clearly to Basement, Shell or Phosphor
- [ ] Square corners, bevels for depth, no blurred shadows
- [ ] VT323 / Tahoma only, self-hosted
- [ ] Copy is dry, specific, era-accurate; parody brands only
- [ ] Text contrast passes AA
- [ ] Generated rasters re-rendered from source, not hand-edited
- [ ] `design/tokens.json` regenerated if tokens changed
