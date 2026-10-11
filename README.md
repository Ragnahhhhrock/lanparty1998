# LAN Party '98

Live at **https://lanparty1998.com**

![The room](docs/room.png)
![Seated at your PC](docs/seated-doom.png)

A 3D basement LAN party in the browser. Walk around with everyone else who's online, crack a Volt Cola, eat Nachoz, grab a free PC and play DOOM on an emulated DOS box, then start a deathmatch with whoever else is sitting down.

## Playing

1. Enter a handle and walk in. Everyone on the site shares the same basement; add `?room=<name>` to the URL for a private room.
2. Walk up to any free PC (its screen says **FREE**) and press **E**. DOOM boots solo.
3. To deathmatch: one seated player clicks **Host a deathmatch**, others sitting at PCs click **Join deathmatch** (up to 4), and the host clicks **Start**. Every PC in the match reboots into DOOM's `IPXSETUP` and finds the others over a virtual IPX network.
4. Standing up (backtick) leaves the deathmatch.

| Key | Action |
| --- | --- |
| W A S D + mouse | Walk and look |
| E | Sit at a PC · drink · eat |
| F | Open the case of the PC you're looking at |
| T | Chat |
| ` (backtick) | Stand up from your PC |
| Esc | Release the mouse |

## How it fits together

- `js/room.js` builds the basement from primitives: folding tables, six beige PCs, CRTs, the hub and cat5 runs.
- `js/textures.js` draws every texture on canvas, including the idle and "someone's playing" screens.
- `js/avatars.js` draws the other players and moves them to wherever the server says they are.
- `js/net.js` talks to the room server over a WebSocket. If it can't connect, the game runs solo.
- `js/emulator.js` wraps js-dos. When you sit, the DOS canvas is laid exactly over your CRT's glass; standing pauses it.
- `js/main.js` handles movement, interaction, seats, chat, the deathmatch flow and the caffeine/snack meters.
- `server/` is the room server: a Cloudflare Worker with one Durable Object per room. It tracks players, positions, seats, chat and the current deathmatch. It deploys to `room.lanparty1998.com`.
- `vendor/` holds pinned copies of Three.js r179 and js-dos 8.5.3.

### The night's logistics

`js/party.js` holds the state of the night (cash, discs, and the rest as it's added). It has no DOM code, so `node tools/party.test.mjs` tests it.

- **The CD burner.** PC-04 has the only CD-R drive and it writes at 2x: a 74 minute disc is a 37 minute write (about six real minutes; a game minute is ten real seconds). Walk up to the drive and press **E**. A blank costs $4, mates pay $10 for a MIX CD. Sit at PC-04 and play while it's writing and it makes a coaster.

- **The network.** You start on 10BASE2 coax: one cable runs under the tables and across the floor, with a T-connector at every tower. Every few minutes one works itself loose and the whole segment goes down (and so does your deathmatch). Look at the PC with the tilted T-connector, press **F** and re-seat it. Read the computer shop price list on the snack table and order an 8-port hub ($45); it arrives ten game minutes later and cat5 runs to the hub. Then ring Dazza (the wall phone): his dad works in IT for the government and will lend a 16-port switch, with an asset sticker on it, until 6:00 AM, when it goes back. A coax fault disconnects everyone at once, a hub or switch only the one PC.
- **RAM from Singapore.** Every PC starts on 16MB. Macca (by the snack table) is off to Singapore for work, where a 16MB SIMM is $35 instead of the shop's $75. Give him the cash first; he disappears for about fifteen real minutes and comes back with the sticks. **F** at a PC fits one (up to 64MB). The BIOS screen on that PC counts the new memory.
- **Overclocking and the fan.** Press **F** at a PC and move the jumpers: 100MHz bus, or 112MHz with extra volts. It runs hotter, and the case temperature shows in that dialog. The pedestal fan in the room sweeps between the two rows and keeps overclocked boxes alive; press **E** at it to turn it on or off. If it goes off (somebody kicks the plug, or you trip over its lead) the overclocked PCs blue screen, the heavy overclock in about two minutes. A blue screen on PC-04 mid-write ruins the disc. Press any key at the blue screen to reboot, with the case still hot. Overclocking is a risk and a boast, not a frame rate boost: DOSBox already runs DOOM flat out.
- **Trip hazards.** The cat5 leads (and the coax) lie across the floor. The cables are gaffer-taped, so most crossings are fine, but each time you step over one it is a roll (about 30%, worse after a few cans of Volt). Trip and you stumble, and the lead comes out of the back of its PC. Press **F** at that PC to plug it back in, or watch where you walk.

### Deathmatch networking

Game traffic doesn't go through the room server. js-dos emulates IPX over WebRTC: the host's DOSBox runs an IPX tunnelling server, the room server hands its network peer id to the other players, and their DOSBoxes connect to it peer to peer. Signalling uses js-dos's public peer server (`net.dos.zone`), and NAT traversal uses public STUN only. Players behind strict (symmetric) NATs may not be able to connect until a TURN server is added.

## Run it locally

```sh
# room server (http://127.0.0.1:8787)
cd server && npm install && npx wrangler dev

# the site, from the repo root
python3 -m http.server 8000
# open http://localhost:8000 — on localhost the page uses the local room server
```

`?server=wss://…` points the page at any room server.

## Game data

`bundles/doom-shareware.zip` is the DOOM v1.9 shareware release, unmodified and freely redistributable. `bundles/conf-*.jsdos` are tiny js-dos bundles holding only a `dosbox.conf` (solo DOOM, or `IPXSETUP -nodes N -deathmatch`); rebuild them with `python3 tools/make-confs.py`.

Only redistributable data goes in this repo. Commercial game files (full DOOM, DOOM II, Quake, etc.) must be supplied by the player.

## Next

- TURN server for players behind strict NATs.
- Quake, Quake II and Red Alert/C&C via OpenRA.
- More rooms, more snacks.

## Design system

All UI, textures, icons and social images follow [`STYLEGUIDE.md`](STYLEGUIDE.md). Tokens live in `css/tokens.css` (mirrored to `design/tokens.json`), and a live reference is at [/styleguide.html](https://lanparty1998.com/styleguide.html).

```sh
python3 scripts/build-tokens.py    # tokens.css -> design/tokens.json
python3 scripts/render-social.py   # og-image, twitter-card and icons from their sources
```

## Contact

contact@lanparty1998.com

## Licences

Three.js is MIT (`vendor/three/LICENSE`). js-dos is GPL-2.0. DOOM shareware © id Software, distributed under its shareware terms. VT323 is SIL OFL 1.1 (`fonts/VT323-OFL.txt`). "Volt Cola" and "Nachoz" are parody brands.

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
| `trip_cable` | `cable` (`cat5` or `coax`), `trips_total` |
| `party_summary` | `cans_total`, `handfuls_total`, `games_total`, `play_seconds` (on tab close) |
