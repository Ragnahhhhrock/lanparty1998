# LAN Party '98: shorts

Eight portrait explainers, one feature each, every one 30 seconds or less. 1080x1920, 24 fps, H.264 + AAC, for TikTok, Instagram Reels, YouTube Shorts, Facebook Reels and Snapchat. Every frame is the real site (captured by `scripts/capture-shorts.py`) or an in-style caption built from `css/tokens.css`. Each one has its own track from LANamp's tape, synthesised from `js/music.js`.

Rebuild: start the room server (`cd server && npx wrangler dev`) and `python3 -m http.server 8099` from the repo root, then `python3 scripts/capture-shorts.py`, `python3 scripts/render-music.py "<track>" 30 video/shorts/audio/<file>.m4a` for each track below, and `python3 scripts/render-shorts.py`. Scenes and captions are in `design/video/shorts-data.js`.

| # | File | Feature | Length | Music |
| --- | --- | --- | --- | --- |
| 1 | `lanparty1998-builder-1080x1920.mp4` | The PC builder | 29.5 s | "Basement Bounce", DJ Dazza |
| 2 | `lanparty1998-network-1080x1920.mp4` | How to play network games | 29.5 s | "Frag Limit 20", The Campers |
| 3 | `lanparty1998-room-1080x1920.mp4` | The room: light switch, door, fan, bean bag | 30 s | "Grunge Basement", Flannel Kernel |
| 4 | `lanparty1998-food-1080x1920.mp4` | Food and drink, ordering a pizza, taking delivery | 29.5 s | "Cul-de-Sac Cruisin'", K-Rad |
| 5 | `lanparty1998-console-1080x1920.mp4` | The console | 27.5 s | "Fatal Exception 0E", xX_Ghoul_Xx |
| 6 | `lanparty1998-chat-1080x1920.mp4` | Proximity chat | 29.5 s | "Dial-Up Dreams", Nachoz Sound System |
| 7 | `lanparty1998-desktop-1080x1920.mp4` | The Windows 98 desktop and its programs | 29 s | "Amen Break Dance", PhatBass vs K-Rad |
| 8 | `lanparty1998-lanamp-1080x1920.mp4` | LANamp and your own MP3s | 26.5 s | "Volt Rush", DJ Volt |

Each has a cover frame, `lanparty1998-<short>-cover.jpg`. Captions sit 150 px (at 1080 wide, 300 px) above the bottom edge, clear of the TikTok and Reels buttons. The link goes in the bio or a link sticker.

---

## 1. The PC builder

**Title** How to build your own PC in LAN Party '98

**Description**
You walk into the basement with $1500 and the computer shop's catalogue. Pick a CRT, a Pentium, RAM, drives, a network card and a sound card, carry the boxes to the back table, plug every lead in from behind and watch it POST. Under 32MB and the midnight StarCraft game will not run. Free in your browser at lanparty1998.com

**Hashtags** #lanparty #pcbuild #retrocomputing #windows98 #90s #browsergame

## 2. How to play network games

**Title** How to start a deathmatch in LAN Party '98

**Description**
Sit at any free PC and DOOM boots on a real DOS box in your browser. The Game button reboots into Heretic, Hexen, Quake, Descent or Duke Nukem 3D. One player hosts a deathmatch, up to three more join, and every PC reboots into IPXSETUP and finds the others over a virtual IPX network. Free at lanparty1998.com

**Hashtags** #lanparty #doom #quake #retrogaming #deathmatch #ipx

## 3. The room

**Title** Turn the lights off in a 1998 basement LAN party

**Description**
Walk the basement with W A S D and press E at anything with a prompt. Flick the light switch by the stairs and the room goes dark except for the CRTs, each glowing the colour of its screen. Open the stairs door and Mum calls down. Mind the pedestal fan's lead, sink into the bean bag and ask the man taped to the ceiling what he is doing up there. Free at lanparty1998.com

**Hashtags** #lanparty #90s #basement #retrogaming #browsergame #3d

## 4. Food, drink and pizza

**Title** Ordering a pizza at a 1998 LAN party

**Description**
Volt Cola keeps your caffeine meter up, Nachoz and Cheez Curlz keep the snacks meter up, and Citrus Zap goes in a red cup. Ring Pizza Shack on the wall phone: a large pepperoni is $16. About eight game minutes later the driver knocks. Open the door and he hands over the pizza, a Volt Cola and a garlic bread in foil. E for a slice, G for the garlic bread. Free at lanparty1998.com

Volt Cola, Nachoz, Cheez Curlz, Citrus Zap and Pizza Shack are made up.

**Hashtags** #lanparty #pizza #90s #retrogaming #browsergame #snacks

## 5. The console

**Title** The lounge console in LAN Party '98 runs your own N64 ROMs

**Description**
The lounge has a plaid couch, a big CRT TV and a four-player console. Press E at the TV and it becomes a DOS-style prompt. OPEN picks a folder of N64 ROMs on your own drive, DIR lists them and a number runs one on the TV glass. No ROMs come with it, and your files are read in the browser and never uploaded. Free at lanparty1998.com

**Hashtags** #n64 #lanparty #retrogaming #emulation #90s #couchcoop

## 6. Proximity chat

**Title** Proximity voice chat in a 1998 basement

**Description**
Press Y and allow the microphone: anyone else in voice hears you at full volume within 1.5 m, fading to nothing at 9 m, from where you are standing. Y again mutes, Shift+Y leaves. Voices go peer to peer and nothing is recorded. Or press T to type: it pops up over your head in a speech bubble and lands in #lanparty98. Free at lanparty1998.com

**Hashtags** #proximitychat #voicechat #lanparty #multiplayer #browsergame #90s

## 7. The Windows 98 desktop

**Title** A working Windows 98 desktop at every PC

**Description**
Tab frees the mouse for the taskbar and the Start menu. Internet Explorer opens on the party's own 1998 site, mIRC has the regulars, and Snapster finds MP3s by made-up bands and crawls them in at modem speed. Minesweeper, Solitaire, Downhill, the MS-DOS Prompt, Paint, the Calculator and Disk Defragmenter all work. Free at lanparty1998.com

Snapster's bands, songs and users are invented. Nothing is downloaded.

**Hashtags** #windows98 #retrocomputing #90s #minesweeper #lanparty #retrogaming

## 8. LANamp

**Title** Play your own MP3s through LANamp at a 1998 LAN party

**Description**
LANamp sits on the desktop at every PC with a tape of eight original tracks, hip hop to rock, synthesised live in the browser. Press ADD DIR and it finds every .mp3 in a folder and below, reads the ID3 tags and plays them straight from your drive. Nothing is uploaded. Chrome and Edge remember the folder. Free at lanparty1998.com

**Hashtags** #mp3player #mp3 #lanparty #90s #music #browsergame

---

## Technical notes

- Video H.264 High, yuv420p, `+faststart`, CRF 21; audio AAC 192 kbps stereo, faded in and out. Each file is well under the 25 MB Cloudflare Pages limit.
- Game footage is shareware gameplay from the emulator on the site (`img/video/games/`). No title screens, logos or box art.
- The MP3s added to LANamp for the capture are copies of LANamp's own tracks, tagged with Snapster's made-up band names. No real music is in any short.
