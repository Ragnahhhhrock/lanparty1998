# LAN Party '98

Live at **https://lanparty1998.com**

![The room](docs/room.png)
![Seated at your PC](docs/seated-doom.png)

A 3D basement LAN party in the browser. Walk around, crack a Volt Cola, eat Nachoz, sit at your PC and play DOOM on an emulated DOS box.

**Phase 1 (this build):** one room, six stations, your PC runs DOOM shareware via js-dos. The other five PCs are scenery.

## Run it

Any static web server works (the emulator won't load from `file://`):

```sh
cd lanparty1998
python3 -m http.server 8000
# open http://localhost:8000
```

## Controls

| Key | Action |
| --- | --- |
| W A S D + mouse | Walk and look |
| E | Sit at your PC · drink · eat |
| ` (backtick) | Stand up from your PC |
| Esc | Release the mouse |

## How it fits together

- `js/room.js` builds the room from primitives: folding tables, beige towers, CRTs, the hub and cat5 runs.
- `js/textures.js` draws every texture on canvas, including the animated screens on the other PCs.
- `js/emulator.js` wraps js-dos. When you sit, the DOS canvas is laid exactly over your CRT's glass; standing pauses the emulator.
- `js/main.js` handles movement, collisions, interaction, the sit/stand camera tween and the caffeine/snack meters.
- `vendor/` holds pinned copies of Three.js r179 and js-dos 8.5.3 so the page doesn't depend on those CDNs.

## Game data

By default your PC loads the public DOOM shareware bundle from `https://v8.js-dos.com/bundles/doom.jsdos`. To self-host, put a bundle at `bundles/doom.jsdos`, or pass `?bundle=<url>`.

Only redistributable data goes in this repo. Commercial game files (full DOOM, DOOM II, Quake, etc.) must be supplied by the player.

## Next phases

2. Two players in the same room (WebSocket presence, avatars).
3. DOOM deathmatch between two virtual PCs. js-dos already supports IPX over WebRTC (`startIpxServer` / `connectIpxAddress`), which is the starting point.
4. Quake, Quake II and Red Alert/C&C via OpenRA.
5. Lobby, hosting, more snacks.

## Design system

All UI, textures, icons and social images follow [`STYLEGUIDE.md`](STYLEGUIDE.md). Tokens live in `css/tokens.css` (mirrored to `design/tokens.json`), and a live reference is at [/styleguide.html](https://lanparty1998.com/styleguide.html).

```sh
python3 scripts/build-tokens.py    # tokens.css -> design/tokens.json
python3 scripts/render-social.py   # og-image, twitter-card and icons from their sources
```

## Contact

contact@lanparty1998.com

## Licences

Three.js is MIT (`vendor/three/LICENSE`). js-dos is GPL-2.0. VT323 is SIL OFL 1.1 (`fonts/VT323-OFL.txt`). "Volt Cola" and "Nachoz" are parody brands.

## Analytics events (GA4 `G-P6RQJ9BSJ1`)

Sent from `js/analytics.js`:

| Event | Params |
| --- | --- |
| `enter_party` | — |
| `drink_cola` | `cans_total`, `caffeine_level` |
| `caffeine_overload` | `cans_total` (caffeine above 85) |
| `eat_snack` | `handfuls_total`, `snack_level` |
| `sit_down` | `station` |
| `game_start` | `game_name`, `games_total` (once per emulator boot) |
| `stand_up` | `game_name`, `play_seconds` |
| `party_summary` | `cans_total`, `handfuls_total`, `games_total`, `play_seconds` (on tab close) |
