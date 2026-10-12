# LAN Party '98: explainer video

A 59 second tour of lanparty1998.com in two shapes, with music from LANamp's own synth ("Volt Rush" by DJ Volt, `js/music.js`, rendered by `scripts/render-music.py`). Every frame is the real site, the real emulator or an in-style caption window built from `css/tokens.css`.

| File | Shape | Use |
| --- | --- | --- |
| `lanparty1998-explainer-youtube-1920x1080.mp4` | 16:9, 1920x1080, 24 fps, H.264 + AAC | YouTube, the website, Facebook, LinkedIn |
| `lanparty1998-explainer-portrait-1080x1920.mp4` | 9:16, 1080x1920, 24 fps, H.264 + AAC | TikTok, Instagram Reels, YouTube Shorts, Facebook Reels, Snapchat |
| `lanparty1998-thumbnail-youtube.jpg` | 1920x1080 | YouTube custom thumbnail |
| `lanparty1998-cover-portrait.jpg` | 1080x1920 | Cover frame for Reels and TikTok |
| `captions.srt` | | Captions for the on-screen text (YouTube, Facebook and LinkedIn take it as an upload) |
| `audio/volt-rush.m4a` | AAC | The music on its own |

Rebuild: `python3 scripts/capture-video.py portrait`, `... wide`, `python3 scripts/render-music.py`, then `python3 scripts/render-video.py`.

## What is in it

| Time | Scene |
| --- | --- |
| 0:00 | LAN Party '98: a basement, six beige boxes, a 10BASE-T hub |
| 0:04 | BUILDPC.EXE: build your own PC with $1500 |
| 0:08 | Walk the shared 3D basement |
| 0:12 | Sit at a PC; spectators watch your game on the CRT at your desk |
| 0:15 | DOOM |
| 0:18 | Heretic |
| 0:21 | Hexen |
| 0:24 | Quake |
| 0:27 | Descent |
| 0:30 | Duke Nukem 3D |
| 0:33 | IPX deathmatch for up to four |
| 0:37 | The bench: unpack, plug in, POST |
| 0:41 | Keeping it running: coax, hub, RAM, overclocking, fan, CD-ROM trays, extension lead |
| 0:45 | The desktop: Internet Explorer, #lanparty98, LANamp, Snapster, Minesweeper, Solitaire, Downhill |
| 0:49 | Pizza Shack, Volt Cola, the Nokka 51 and Snake |
| 0:52 | The lounge: couch, console, posters, game shelf |
| 0:56 | lanparty1998.com, news and party reminders |

## Left for a second video

Lesser features that did not fit in a minute: the wall phone and the pizza driver's knock, the light switch, the yellow extension lead and the trip hazards, the console TV prompt that runs N64 cartridges from your own folders, the regulars and their chat, Dazza's cheat-code page, the guestbook, Disk Defragmenter and Paint, bringing your own MP3s to LANamp, the 8-port hub and the 16-port switch, RAM from Singapore, the CD burner and coasters, Shout me a Volt Cola, and Party Reminders from the organiser's side.

## YouTube

**Title (62 characters)**

LAN Party '98: a free 1998 basement LAN party in your browser

**Description**

Walk into a 1998 basement LAN party in 3D, sit at a beige PC and frag. Free in your browser, no install: https://lanparty1998.com

In this video:
0:00 LAN Party '98
0:04 Build your own PC with $1500
0:08 Walk the basement
0:12 Sit at a PC
0:15 DOOM, Heretic, Hexen, Quake, Descent and Duke Nukem 3D on emulated DOS boxes
0:33 IPX deathmatch with up to four players
0:37 Build the PC on the bench and watch it POST
0:41 Fix the network, add RAM, overclock, mind the extension lead
0:45 Internet Explorer, IRC, LANamp, Snapster and the Start menu games
0:49 Pizza Shack, Volt Cola and a Nokka 51
0:52 The lounge
0:56 Play free at https://lanparty1998.com

Six PCs, a 10BASE-T hub and a crate of Volt Cola. Everyone on the site shares the same basement, and ?room=name gives you a private one. The games are free shareware releases. Volt Cola, Nachoz, Cheez Curlz, Citrus Zap, Pizza Shack and Nokka are made up.

News, games and how to play: https://lanparty1998.com/news
Party reminders by email: Start > Programs > Party Reminders inside the basement.

Music: "Volt Rush" by DJ Volt, synthesised by LANamp in the browser. No samples.

**Tags**

LAN party, 1998, retro gaming, DOOM, Quake, Hexen, Heretic, Descent, Duke Nukem 3D, deathmatch, IPX, DOSBox, Windows 98, browser game, 3D, 90s, nostalgia, free game, js-dos, shareware

**Category** Gaming. **Audience** Not made for kids. **Language** English. **Captions** upload `captions.srt`. **End screen** none (59 seconds).

## YouTube Shorts, TikTok, Instagram Reels (portrait file)

**On-screen cover text** LAN Party '98 (frame at 0:01, `lanparty1998-cover-portrait.jpg`)

**Caption (TikTok and Reels, under 150 characters)**

A 1998 basement LAN party you can walk into. DOOM, Quake, Hexen and more, free in your browser. lanparty1998.com

**Shorts title** LAN Party '98: walk into a 1998 basement LAN party (free)

**Hashtags** #lanparty #retrogaming #doom #quake #90s #browsergame #windows98 #pcgaming

**Link** lanparty1998.com in the bio or the link sticker.

**Alt text** A first-person 3D basement with six beige PCs, a plaid couch and posters on wood panelling, then DOOM, Heretic, Hexen, Quake, Descent and Duke Nukem 3D running on the CRTs, a Windows 98 desktop and a pizza box.

## Pinned comment / first comment

Free to play at lanparty1998.com. Add ?room=yourname to the address for a private basement and send the link to your mates.

## Technical notes

- Video is H.264 High, yuv420p, `+faststart`; audio AAC 192 kbps stereo. Each file is under the 25 MB Cloudflare Pages limit.
- Safe area (portrait): captions sit 150 px above the bottom edge, clear of the TikTok and Reels buttons; text stays inside the 24 px margins.
- Game footage is shareware gameplay, captured from the emulator on the site. Title screens with the games' logos are not used. No box art.
