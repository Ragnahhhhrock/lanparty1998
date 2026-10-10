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

Brand colour comes from the parody snacks (**Volt Cola** red, **Nachoz** orange), used sparingly as accents.

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

### Phosphor
| Token | Hex | Use |
| --- | --- | --- |
| `--crt-black` | `#000000` | CRT glass |
| `--phosphor` | `#9dff7a` | Primary CRT text, prompts, live status |
| `--phosphor-link` | `#4dff5a` | Links on CRT surfaces |
| `--dos-grey` | `#aaaaaa` | Default DOS text |
| `--amber` | `#ffcc00` | CRT titles and highlights |
| `--toast` | `#ffe066` | In-world announcements (with hard black shadow) |

### Basement
`--basement #0b0906` (page bg) · `--wood #4a2c17` · `--wood-dark #24150b` · `--carpet #3b2f2a` · `--ceiling #d9d4c7` · `--beige #d6cdb4` · `--beige-light #ebe4cf` · `--paper #e8e1cc` (text on dark basement bars)

### Brand accents
`--volt #e2231a` (caffeine, UI red) · `--volt-can #c4161c` · `--volt-yellow #ffd400` · `--nacho #f28a1c` (snacks) · `--nacho-navy #1d1a5c` · `--cheese #ffcc00`

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
| Keycap | `kbd` | Name keys as they appear on a 1998 keyboard: `Esc`, `` ` ``, `W`. |
| Prompt | `#prompt` | VT323 24px phosphor on `--hud-bg`. Verb first: "Press E to sit down". |
| Toast | `#toast` | VT323 26px `--toast` with hard black shadow. Short, in-world. |
| CRT surface | `#monitor`, `#crt-fx` | Black glass, scanlines, vignette, faint green inner glow. |

## 6. Voice

- **Dry, specific, of the era.** Name real-feeling things: "10BASE-T hub", "IPX", "PC-04", "11:42 PM".
- Short sentences. British/Australian-neutral spelling is fine; be consistent within a piece.
- Errors talk like DOS: "Bad command or file name." Not "Oops! Something went wrong."
- No emoji, no exclamation-mark hype, no "retro vibes", no "nostalgia trip".
- Parody brands only: **Volt Cola** and **Nachoz**. Never use real snack, drink or hardware brand names or logos. Real game titles (DOOM, Quake…) may be named as text but never shown with their logos or box art.

## 7. Imagery and textures

- 3D textures are drawn procedurally in `js/textures.js`. Colours there must match tokens (read `design/tokens.json` values; don't invent new hexes).
- Illustrations are **flat, hard-edged, pixel-aligned** (`shape-rendering: crispEdges` in SVG). No photographs, no stock, no AI-generated imagery, no 3D renders with soft lighting outside the actual game.
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
