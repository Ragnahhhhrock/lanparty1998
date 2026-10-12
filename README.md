# LAN Party '98

Live at **https://lanparty1998.com**

![The room](docs/room.png)
![Seated at your PC](docs/seated-doom.png)

A 3D basement LAN party in the browser. Walk around with everyone else who's online, crack a Volt Cola, eat Nachoz, grab a free PC and play DOOM, Quake, Hexen, Heretic, Descent or Duke Nukem 3D on an emulated DOS box, then start a deathmatch with whoever else is sitting down.

## Playing

1. Enter a handle and walk in. Everyone on the site shares the same basement; add `?room=<name>` to the URL for a private room.
2. Walk up to any free PC (its screen says **FREE**) and press **E**. DOOM boots solo. The **Game** button on the seated bar reboots the PC into the next game.
3. To deathmatch: one seated player clicks **Host a deathmatch**, others sitting at PCs click **Join deathmatch** (up to 4), and the host clicks **Start**. Every PC in the match reboots into DOOM's `IPXSETUP` and finds the others over a virtual IPX network.
4. Standing up (backtick) leaves the deathmatch.
5. Everyone else sees your game on the CRT at your desk: walk up behind a player and watch.

| Key | Action |
| --- | --- |
| W A S D + mouse | Walk and look |
| E | Sit at a PC · drink · eat |
| F | Open the case of the PC you're looking at · open or shut a pizza box lid |
| T | Chat |
| Y | Voice chat: join with your microphone, then mute or unmute (Shift+Y leaves) |
| N | Noises on or off (burps and the speaker PCs) |
| G | Unwrap and eat the garlic bread the pizza driver gave you |
| I · M · H | Show or hide the IRC window · LANamp · Internet Explorer |
| Tab | Free the mouse for the taskbar, Start menu and windows (click the room to walk again) |
| ` (backtick) | Stand up from your PC |
| Esc | Release the mouse |

## How it fits together

- `js/room.js` builds the basement from primitives: folding tables, six beige PCs, CRTs, the hub and cat5 runs, and two empty benches for the PC you build.
- `js/build.js` is the parts shelf (BUILDPC.EXE's catalogue, prices, the POST text); `js/wizard.js` is the shop screen that sits between the intro and the basement.
- `js/bench-plan.js` is the bench's rules in plain data (what gets unpacked, which leads there are, what stops a box starting); `js/bench.js` puts it on the back table, `js/rig.js` builds the parts to your build, and `js/rear.js` is the "Behind the PC" panel.
- `js/textures.js` draws every texture on canvas, including the idle and "someone's playing" screens.
- `js/avatars.js` draws the other players and moves them to wherever the server says they are. `js/headphones.js` is the one pair of headphones, on a head or on a tower, and `js/gaming.js` decides when the speaker PCs make a noise.
- `js/net.js` talks to the room server over a WebSocket. If it can't connect, the game runs solo.
- `js/emulator.js` wraps js-dos. When you sit, the DOS canvas is laid exactly over your CRT's glass; standing pauses it.
- `js/feed.js` is how spectators watch: while you are seated at a running game and somebody else is in the room, `FeedSender` copies your DOS canvas about five times a second (192x144, JPEG) and sends it to the room server as a binary WebSocket message. The server (`server/src/feed-logic.js`, `Room.frame` in `server/src/index.js`) checks it is a small JPEG from a seated player, rate-limits it, stamps it with your PC's number and passes it to everyone else. Each client draws it on that PC's CRT texture (`Screen.pushFeed` and `Screen.game` in `js/textures.js`) and tints the CRT's dark-room glow by its average colour (`js/power.js`). If pictures stop for 2.5 seconds the glass falls back to the stand-in "someone else's game". Needs a `wrangler deploy` of `server/` to work for other players. `node tools/feed.test.mjs` checks the wire format and limits.
- `js/spectator.js` is spectator mode: K-Rad and n00bslayer, at the two PCs on the right-hand wall, are bots playing DOOM against each other for as long as the page is open. The sim (`Deathmatch`) boots, plays a match to 8 frags (or 200 seconds), shows the scores, loads the next of three invented maps and goes round again, at DOOM's 35 tics a second whatever the frame rate. Each bot looks for the other, strafes, fires a chaingun with a hit chance that falls with distance and bad aim, runs for medikits, armour vests and ammo when it needs them, and respawns two seconds after it dies. `drawScreen` is a small raycaster that paints what one bot sees (walls, the other fighter, pickups, the gun, the status bar, "You fragged ...") straight onto that PC's CRT texture (`Screen.duel` in `js/textures.js`, set up in `buildGamers` in `js/room.js`), and `Deathmatch.glow` tints the CRT's dark-room glow by the fight. It is not the real game running and uses nothing from its art or data; every colour is a token. It is the same picture the feed gives other players' desks, from bots, so there is always something to watch. No DOM: `node tools/spectator.test.mjs` plays hours of game time, checks the maps, the matches and that every colour painted is a token.
- `js/desktop.js` is the desktop around the room: the taskbar, the Start menu and draggable windows. `js/apps.js` holds the programs that run in them, `js/icons.js` the 16x16 pixel icons.
- `js/app-browser.js` is Internet Explorer: a Win98-era web browser window with a menu bar, Back, Forward, Stop, Refresh, Home, an Address bar, a Links bar, an Explorer bar (Search, Favorites, History) and a status bar. `js/web-pages.js` is the site it shows, http://lanparty1998.com/ as a 1998 homepage (home, news, games, how to play, guestbook, links, Dazza's page, and the 404 and "page cannot be displayed" pages), and `js/web-news.js` is its news. Neither has DOM code in it; `node tools/web.test.mjs` checks the addresses, every page and link, the news and the search. The same pages are real, crawlable pages outside the game (`/home`, `/news`, `/games`, `/howto`, `/guestbook`, `/links`, `/~dazza/`, `/news/new`, `/news/fix`): `js/web-static.js` turns each into a full HTML document, `node scripts/build-site.mjs` writes them (with `css/site.css` and `_redirects` for the old `.htm` addresses), `js/site.js` runs the hit counter and the guestbook, and `node tools/site.test.mjs` checks they are current.
- `js/snapster.js` is Snapster's made-up network (bands, titles, users, search, transfers, library) with no DOM; `js/app-snapster.js` is its window. `tools/snapster.test.mjs` checks it.
- `js/minesweeper.js`, `js/calc.js`, `js/solitaire.js` and `js/ski.js` are the rules of Minesweeper, the Calculator, Solitaire and Downhill, with no DOM so they can be tested. `js/app-solitaire.js` and `js/app-ski.js` are their windows.
- `js/handset.js` is the brain of the mobile phone on the desk at PC-02 (screens, phone book, calls), `js/snake.js` is Snake and `js/tones.js` is what a call sounds like (dial tone, keypad, ring-back, engaged), all with no DOM; `js/phone.js` is the handset itself and `tools/phone.test.mjs` checks the rest. The wall phone shares the numbers and the tones.
- `js/main.js` handles movement, interaction, seats, chat, the deathmatch flow and the caffeine/snack meters.
- `server/` is the room server: a Cloudflare Worker with one Durable Object per room. It tracks players, positions, seats, chat and the current deathmatch. It deploys to `room.lanparty1998.com`.
- `vendor/` holds pinned copies of Three.js r179 and js-dos 8.5.3.

### The night's logistics

`js/party.js` holds the state of the night (cash, discs, and the rest as it's added). It has no DOM code, so `node tools/party.test.mjs` tests it.

- **Build your own PC.** Walk in and BUILDPC.EXE opens first: $1500 for a 14 to 19 inch CRT, CPU, RAM, up to three hard disks, floppies, a CD-ROM and a CD-R, a network card, speakers or headphones, keyboard, mouse and mat (`js/build.js`; `node tools/build.test.mjs`). The build is kept in `localStorage` as `lan98-build`. Then you carry it to your bench, **PC-07 or PC-08 on the back table**: outlines show where each part goes (press **E** on one to unpack it), and **E** on the tower or monitor opens "Behind the PC", where the video, keyboard, mouse, sound, three power leads (into the power board's sockets), the board's plug (into the wall) and the network lead are plugged in. The box won't start until the screen, keyboard, mouse and power are in. Press the button and it runs the memory test that matches your RAM and drives, then you sit down and it boots like any other PC. A bigger tube is a bigger, sharper picture; your CPU sets how hot it runs and what you can overclock to; the CD-R you picked is a second burner that writes at its own speed (one disc at a time in the room). A BNC-only card has nowhere to plug the hub's cat5 into when the hub arrives, and a card with no BNC socket can't join the coax at all. Pull the power board's plug while it runs and it goes black. The rules are in `js/bench-plan.js` (`node tools/bench.test.mjs`); the room server hands out the benches (`bench` messages in `server/src/index.js`, so the server needs a `wrangler deploy` for other players to see your PC and for deathmatches from your own seat).
- **Proximity voice chat.** Press **Y**, allow the microphone, and everyone else who has joined voice hears you, quieter the further away you are: full volume within 1.5 m, silent at 9 m, from the direction you are standing (`js/voice-logic.js`, `js/voice.js`; `node tools/voice.test.mjs`). The voices go peer to peer over WebRTC with STUN only (no TURN, so a strict firewall can block a link, and players in voice can see each other's network address); the room server only passes the handshake between two players who have both joined (`voice` and `rtc` messages in `server/src/index.js`, `server/src/voice-logic.js`), so **the server needs a `wrangler deploy`** before voice works for other players. Nobody is linked until they join, and nothing is recorded.
- **The CD burner.** PC-04 has the only CD-R drive and it writes at 2x: a 74 minute disc is a 37 minute write (about six real minutes; a game minute is ten real seconds). Walk up to the drive and press **E**. A blank costs $4, mates pay $10 for a MIX CD. Sit at PC-04 and play while it's writing and it makes a coaster.

- **The network.** You start on 10BASE2 coax: one cable runs under the tables and across the floor, with a T-connector at every tower. Every few minutes one works itself loose and the whole segment goes down (and so does your deathmatch). Look at the PC with the tilted T-connector, press **F** and re-seat it. Read the computer shop price list on the snack table and order an 8-port hub ($45); it arrives ten game minutes later and cat5 runs to the hub. Then ring Dazza (the wall phone): his dad works in IT for the government and will lend a 16-port switch, with an asset sticker on it, until 6:00 AM, when it goes back. A coax fault disconnects everyone at once, a hub or switch only the one PC.
- **File sharing.** Every PC starts with Windows file sharing broken: Network Neighborhood says "Unable to browse network". You are the one who has to go round and fix them. **F** at a PC and press Fix file sharing: it walks through Client for Microsoft Networks, IPX/SPX, File and Printer Sharing, the workgroup, a restart and the share. It takes about 19 seconds, it fails often (more on coax, less on a switch) with a proper Windows error, and you try again. Shares come undone by themselves every few minutes, and a blue screen takes one with it. Restarting PC-04 while it's burning makes a coaster. While two or more PCs are sharing, files go round, and the library on the HUD fills up much faster on a hub or switch.
- **The night.** The doors open at 7:30 PM and the room wants shooters: the HUD says DOOM until midnight. At midnight somebody kicks off a StarCraft game, announced in chat, and every free PC with at least 32MB shows it running. Free PCs with less show a DOS "Not enough memory" error, so the RAM has to land before midnight. StarCraft itself isn't bundled (commercial game data is for you to supply, like the others), so sitting down still runs DOOM.
- **RAM from Singapore.** Every PC starts on 16MB. Macca (by the snack table) is off to Singapore for work, where a 16MB SIMM is $35 instead of the shop's $75. Give him the cash first; he disappears for about fifteen real minutes and comes back with the sticks. **F** at a PC fits one (up to 64MB). The BIOS screen on that PC counts the new memory.
- **Overclocking and the fan.** Press **F** at a PC and move the jumpers: 100MHz bus, or 112MHz with extra volts. It runs hotter, and the case temperature shows in that dialog. The pedestal fan in the room sweeps between the two rows and keeps overclocked boxes alive; press **E** at it to turn it on or off. If it goes off (somebody kicks the plug, or you trip over its lead) the overclocked PCs blue screen, the heavy overclock in about two minutes. A blue screen on PC-04 mid-write ruins the disc. Press any key at the blue screen to reboot, with the case still hot. Overclocking is a risk and a boast, not a frame rate boost: DOSBox already runs DOOM flat out.
- **Trip hazards.** The cat5 leads (and the coax) lie across the floor. The cables are gaffer-taped, so most crossings are fine, but each time you step over one it is a roll (about 30%, worse after a few cans of Volt). Trip and you stumble, and the lead comes out of the back of its PC. Press **F** at that PC to plug it back in, or watch where you walk. The yellow extension lead across the aisle is the worst of them: it runs from the back wall to the front row's power boards, and if it comes out of the wall PC-04, PC-05 and PC-06 go dark (screens black, shares lost, a CD in PC-04 ruined). Look down at it and press **E**, or **F** at a dead PC, to plug it back in; the three boxes then run through POST and their shares need fixing again.
- **The door.** There's a door in the back wall, with a landing and a staircase up to the rest of the house. **E** opens and closes it, and you can step onto the landing when it's open. Mum is upstairs and says so. Other players see you stop at the doorway.
- **Posters.** Besides the LAN party flyers there's a DUKE NUKEM 3D poster, a Y2K countdown, a 56K modem poster and an invented adventure game with a pixel treasure chest. The poster has no characters or box art. The shareware episode is playable on the PCs (see the game shelf). Six more are invented, drawn in the spirit of the era: three game boxes (IRON HYMN, RICO RAMPAGE 3D, VOID HARVEST) and three film one-sheets (DEEP CORE, CHROME SHIFT 2, BUS STOP BANDITS). Titles, characters and art are all made up, not copies of any real cover or poster (`gamePoster` and `moviePoster` in `js/textures.js`).
- **The game shelf.** A wooden shelf on the left wall by the front corner holds a big box for every game in `js/games.js` (DOOM, Heretic, Hexen, Quake, Descent, Duke Nukem 3D), leaning on the wall in the same order. Each box has a front, a spine and a back with system requirements (`gameBoxFront`, `gameBoxSpine`, `gameBoxBack` in `js/textures.js`, `buildGameShelf` in `js/room.js`). The titles are plain VT323 text; the pictures are invented, one generic scene per game, and are not the real covers or logos. More boxes are lying about the room, flat with the picture up: on the tables, a chair seat, the couch and the carpet, a couple stacked (`BOX_SPOTS` and `buildLooseBoxes` in `js/room.js`; they are fixed spots, so every player sees the same mess). To box a new game, add its entry to `BOXES` in `js/textures.js`; until then it gets a plain box with its name.
- **Chatter.** The regulars talk to each other: a Win98 speech bubble pops up over their heads (and over any other player when they type) and what they say is mostly teenage-boy stuff: burps, farts, your mum, whose socks smell. Lines tagged with a noise play it (a burp, a fart, a snicker, a snort, all synthesised in `js/sfx.js`), pitched per person (`js/voices.js`). The rest is text only: nothing is spoken aloud. The noises get quieter with distance, and **N** turns them off. The scenes live in `SCENES` in `js/irc.js`.
- **Speakers and headphones.** Three of the six PCs have a pair of speakers either side of the monitor and three have a pair of headphones resting on the tower (`audio` in `STATIONS` in `js/room.js`). Whoever is sitting at a speaker PC is playing a shooter, and every few seconds you hear it from where they are: a shotgun blast and pump, an imp screaming, a chaingun, a rocket, a pickup chirp (`MOMENTS` in `js/gaming.js`, synthesised in `js/sfx.js`, nothing sampled). They get quieter with distance, swing left and right as you turn, and drop when you sit at a PC of your own. Sit at a headphone PC and the pair goes on your avatar's head and that PC is silent. Some people arrive wearing headphones anyway (about one in three, rolled from their id in `lookFor`, with the hat left off), and anyone wearing them makes no noise even at a speaker PC. K-Rad and n00bslayer have speakers; xX_Ghoul_Xx has headphones. **N** turns it all off. `node tools/gaming.test.mjs` checks the scheduling, the distance and panning, and that every sound plays into a stand-in `AudioContext` without a call a real one would throw on.
- **The desktop.** A Win95-style taskbar runs along the bottom with a **Start** button, a button for every open window, a speaker (shows or hides LANamp) and the party clock. IRC and LANamp are real windows: drag them by the title bar, minimise them to the taskbar, close them, and open them again from **Start** > Programs or with **I** and **M**. The mouse is captured while you walk, so press **Tab** (or Esc) to free it, click on the taskbar, and click the room to walk again. The Start menu has Programs (Accessories: Calculator, MS-DOS Prompt, Notepad, Paint; Games: Minesweeper, Solitaire, Downhill; System Tools: Disk Defragmenter; mIRC; LANamp), Documents (empty), Help, Run... and Shut Down.... Everything in it works: Minesweeper has the three classic levels and chording, Solitaire is Klondike (draw one or three, drag or click, double click to a foundation, undo), Downhill is an endless ski run with trees, ramps, gates and a bear after 2000 m (arrows, F for speed, P to pause), the Calculator has a memory, the MS-DOS Prompt has `DIR`, `CD`, `TYPE`, `PING` and friends, Paint has a pencil, brush, eraser and fill, and Disk Defragmenter takes about thirty seconds. Snapster is a file-sharing client (Start > Programs > Snapster, or Run... `snapster`): search a crowd of 26 made-up regulars for MP3s by 36 made-up bands, sort by any column, double click to get a song, and watch the transfer wait in line and crawl in at the speed of your chosen modem (File > Disconnect and Options > My connection both work). Finished songs land in the Library tab for as long as the page is open. Nothing is downloaded: the files, bands, titles and users are all invented. Run... knows the program names, and Shut Down... turns the computer off (click to switch it back on), restarts it, or restarts it in MS-DOS mode. Windows opened from the menu are thrown away when you close them. `node tools/minesweeper.test.mjs`, `tools/solitaire.test.mjs`, `tools/ski.test.mjs`, `tools/calc.test.mjs` and `tools/icons.test.mjs` check the logic and the icons.
- **Internet Explorer.** It is open on the news page when you walk in (`desktop.startWith` in `js/apps.js`). Start > Programs > Internet Explorer, Start > Favorites, **H**, or type an address into Run... It opens on `http://lanparty1998.com/`, the party's own site: the schedule, **What's New** (every new feature and bug fix, filterable with `news.htm?show=new` or `?show=fix`), **Games** (every game on the PCs, built from `js/games.js`, plus Minesweeper, Solitaire, Downhill, the midnight StarCraft and what is only a poster), **How to Play**, a **Guestbook** you can sign (kept until you close the window), **Links** and Dazza's cheat-code page. Every other address gets "The page cannot be displayed", as on a basement hub in 1998. Back, Forward, Stop (Esc), Refresh (F5), Home (Alt+Home), Ctrl+L for the Address bar, a Search, Favorites and History bar, View > Source (in Notepad), Work Offline, and a hit counter that goes up with each visit. Pages load in a few slow steps with the throbber turning; reduced motion loads them at once. To add news, add an entry to the top of `NEWS` in `js/web-news.js`.
- **Power and lights.** Every PC has a power board behind its table, plugged into a wall point (the front row's are chained off the extension lead, because the front wall is on the dryer's circuit). Press **E** at the light switch by the stairs door to turn the ceiling lights off: the room goes nearly black and every CRT throws a much stronger glow, tinted by what is on its screen. `js/power-plan.js` holds the layout (tested by `node tools/power.test.mjs`) and `js/power.js` builds it.
- **#lanparty98.** A mIRC-style window (starts top right, **I** toggles it) where the regulars tell dumb jokes, roast each other's frag counts, hit back and cackle (the window starts full, mid-argument), and pile on when something happens: a blue screen, a tripped cable, midnight, someone walking in. Chat (**T**) shows up there too and works offline. `js/irc.js` holds the banter, tested by `node tools/irc.test.mjs`.
- **The crowd.** Everyone is dressed as a 90s teen: goths in trench coats, surfers, hip hop kids, ravers, grunge kids and nerds. A look is picked from each player's id, so it is the same on everyone's screen: height, build, hair, facial hair, glasses, hats, chains and shoes all vary. Macca and four regulars from the IRC channel (xX_Ghoul_Xx, PhatBass, K-Rad, n00bslayer) are sat down playing: K-Rad and n00bslayer at a pair of PCs on a table against the right wall (playing each other: spectator mode, see `js/spectator.js`), xX_Ghoul_Xx at one in the front-left corner, Macca and PhatBass on the couch with the pads. Nobody dances (that wasn't a thing at a 98 LAN). Those extra PCs are scenery and can't be used; only the six real ones are for visitors. Seated avatars, yours included from other players' screens, type and mouse with their hands, or hold a pad on the couch, and the regulars lean in when a fight kicks off.
- **LANamp.** A Winamp-style player (a desktop window, starts bottom right; **M** shows or hides it; **Z X C V B** are previous, play, pause, stop, next) plays eight original tracks, two each of hip hop, drum and bass, EDM and rock, synthesised live in the browser from patterns in `js/music.js`: no samples and no audio files. The spectrum and the clock are live. **Your own MP3s:** **ADD DIR** picks a folder and LANamp scans it and every folder below it for `.mp3` files, adds them to the playlist after the built-in tape, and reads the ID3 tags (title, artist, album) in the background, falling back to the file name. Files are played straight from your drive and never uploaded. Chrome and Edge remember the folder (**RESCAN** asks permission again each visit, **CLR** forgets it); Firefox and Safari get a plain folder chooser, phones a file chooser, and you can also drop files or folders on the window. The code is in `js/library.js` (scanning and tags) and `js/lanamp.js`. `node tools/music.test.mjs` checks the track data, the tag parsing and the player's file handling.
- **The lounge.** A plaid couch faces a big CRT TV against the right wall, with a four-player console on the shelf under it and four wired pads (three on the cushions, one dropped on the carpet). The TV runs a looping four-player brawl, and the coffee table in between is covered in Volt cans, a half-eaten pizza, a bowl of Nachoz, an open bag of Cheez Curlz, CDs, floppies and a jewel case. A teal bean bag is slumped in the back-left corner. Cans and snacks work with **E** like the rest. Green Citrus Zap two-litres and stacks of red party cups sit on the snack table and on the carpet by the couch; press **E** to pour one. Press **E** at the TV and it becomes a DOS-style prompt (`C:\N64>`): `OPEN` picks a folder of N64 ROMs on your drive, `DIR` lists them, a number or name runs one on the TV glass (EmulatorJS + mupen64plus, self-hosted in `vendor/emulatorjs`, GPL-3). No ROMs are bundled; files are read in the browser and never uploaded. Keys: stick T F G H, D-pad arrows, A X, B S, Start Enter, Z Tab, L Q, R E, C buttons I J K L; Esc returns to the prompt. The console and game boxes are otherwise parody.
- **Pizza.** The wall phone has a pizza menu: a large pepperoni is $16, eight slices, and is delivered about 8 game minutes later: the driver knocks on the basement door (three raps, repeated until you answer), and when you open it he hands over the pizza, which goes on one of the tables, a can of Volt Cola (you drink it) and a garlic bread in foil. **G** unwraps and eats the garlic bread. A few half-eaten boxes are already lying around, some with the lid propped open and some shut, and a delivered box turns up either way. **E** on a shut box opens it and **E** on an open one eats a slice; **F** opens and shuts the lid. **E** on an open box eats a slice (the snack meter goes up and you see the slice in your hand), and the regulars eat from the boxes too, with an arm-to-mouth animation and three bites. Other players' avatars don't eat (the server doesn't relay it).
- **Disks everywhere.** Floppies sit on top of the PC cases and beside the keyboards, with CDs on the tables, the carpet, a keyboard and a chair, and a CD tray left open on some towers. There are floppy cases, a flip-top tub, a CD spindle, jewel cases and a ten-pack of blanks. It's all decoration, drawn in `buildMedia()` in `js/room.js`.
- **The man on the ceiling.** DUCTAPE is taped to the ceiling duct near the front wall, holding a pole and a slice of pizza. **E** to talk to him.

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

| Game | Year | Network | How a deathmatch starts |
| --- | --- | --- | --- |
| DOOM 1.9 | 1994 | IPX, up to 4 here | `IPXSETUP -nodes N -deathmatch`, automatic |
| Heretic 1.3 | 1995 | IPX | same |
| Hexen (4 level demo) | 1995 | IPX | same |
| Descent 1.0 | 1995 | IPX | in the game's own menu: Multiplayer, Start/Join a network game |
| Quake 1.06 | 1996 | IPX | in the game's own menu: Multiplayer, New Game / Join a Game |
| Duke Nukem 3D 1.3D (episode 1) | 1996 | IPX | untested: the PC boots into `SETUP`; host and joiners pick the network game there |

Each `bundles/<game>-shareware.zip` is that game's shareware release as id, Raven or Parallax handed it round (Quake's installer wrapper unpacked, the data untouched). `bundles/conf-*.jsdos` are tiny js-dos bundles holding only a `dosbox.conf`; rebuild them with `python3 tools/make-confs.py`. Where each file came from is in `bundles/SOURCES.md`.

Only redistributable data goes in this repo: shareware releases whose licence says to pass them on. Commercial game files (full DOOM, DOOM II, the registered Quake episodes, StarCraft, etc.) must be supplied by the player.

## Next

- TURN server for players behind strict NATs.
- Quake II and Red Alert/C&C via OpenRA. StarCraft has no free release to bundle.
- **Cheez Curlz.** A second snack, a green bag of orange curls, on PC-01, PC-05, the snack table and the coffee table. **E** works on them like Nachoz, and the regulars eat them too.
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

Three.js is MIT (`vendor/three/LICENSE`). js-dos is GPL-2.0. DOOM shareware © id Software, distributed under its shareware terms. VT323 is SIL OFL 1.1 (`fonts/VT323-OFL.txt`). "Volt Cola", "Nachoz", "Cheez Curlz", "Citrus Zap", "Nokka" and "Pizza Shack" are parody brands.

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
| `trip_cable` | `cable` (`cat5`, `coax`, `fan` or `lead`), `trips_total` |
| `light_switch` | `on` (the lights were switched on or off) |
| `party_summary` | `cans_total`, `handfuls_total`, `games_total`, `play_seconds` (on tab close) |

### Party reminders

Players ask for an email before the next party from **Start > Programs > Party Reminders** (or **Run...** > `remind`). They type their address, get a confirmation email, click the link, and are on the list. Every email has an unsubscribe link, and unsubscribing deletes the address. The organiser opens **File > Organiser...** in the same window, enters the password, and sees how many people are confirmed, then picks a date and time (or **Send now**), an optional "Doors open" line and an optional private room. Scheduled sends go out within five minutes of their time.

It lives in the room server (`server/src/reminders.js`; the window is `js/app-reminders.js`). Sign-ups are kept in a Durable Object, limited to 5 per IP per hour and 300 confirmation emails a day, and a hidden field catches bots. One-time setup in the Cloudflare dashboard (Workers > lanparty1998-room > Settings > Variables and Secrets), then redeploy:

- `RESEND_API_KEY`: a Resend key with sending access to lanparty1998.com (the domain is verified in Resend).
- `ADMIN_TOKEN`: the organiser password. Make it long; ten wrong tries from one address locks that address out for an hour.

`REMIND_FROM` (the sender) is in `server/wrangler.toml`. Resend's free plan sends 100 emails a day, so a bigger list needs a paid plan. To try it locally: `cd server && npx wrangler dev --var EMAIL_DRY_RUN:1 --var ADMIN_TOKEN:test` logs the emails instead of sending them. `node tools/reminders.test.mjs` checks the address rules and the email text.

`tools/remind.mjs` is the older command-line version for a list you keep yourself (`tools/invitees.csv`, gitignored): `node tools/remind.mjs` is a dry run, `--send` sends it (needs `RESEND_API_KEY` and `REMIND_FROM` in the environment). `node tools/remind.test.mjs` tests it.
