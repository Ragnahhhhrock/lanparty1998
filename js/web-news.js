// The news on http://lanparty1998.com/news.htm, the site inside Internet Explorer.
// Newest first. When you ship something a player can see, add an entry at the top.
//
// kind: 'new' (a feature) or 'fix' (something that was broken).
// Dates are the party's own calendar, a few weeks before the Saturday 7 Feb 1998 LAN.
// Voice: STYLEGUIDE.md section 6. Dry, specific, short. No exclamation marks.
// link: optional [path, label] shown after the text.

export const NEWS = [
  {
    date: '1998-02-07', kind: 'fix', title: 'The wall phone is off the switchboard',
    text: 'The wall phone had been screwed to the wall directly in front of the main switchboard, so the breakers were behind the handset and the labels could not be read. It now hangs half a metre along the wall, towards the snack table. The breakers are still not to be touched.',
  },
  {
    date: '1998-02-07', kind: 'new', title: 'A mobile on the couch',
    text: 'Somebody has left a Nokka 51 on the middle couch cushion, next to the DESCENT box. Press E to pick it up. It has a menu, a phone book, keys that beep, and Snake: 2, 4, 6 and 8 or the arrows steer, the walls are fatal, and a bug turns up after every fifth bit of food and is worth more the quicker you get it. It rings the same numbers as the wall phone, and Mum.',
  },
  {
    date: '1998-02-07', kind: 'new', title: 'The wall phone has a dial tone',
    text: 'Pick up the phone on the wall and you get a dial tone until you choose a number or hang up. Choose one and it dials with the keypad tones, then rings twice before somebody answers. Hang up early and it stops. The pizza place and Dazza are still the only two who pick up.',
  },
  {
    date: '1998-02-07', kind: 'new', title: 'Internet Explorer opens bigger',
    text: 'The browser now opens at a decent size, not a postage stamp, and is scrolled past the banner to the news when you walk in, so the latest few updates are in front of you before you have touched anything. Smaller screens get as much window as there is room for. Drag a corner if you want it larger still.',
    link: ['/news.htm', 'All the news'],
  },
  {
    date: '1998-02-07', kind: 'new', title: 'Build your own PC, then set it up',
    text: 'Walking in now starts at the computer shop. You have $1500 to spend on a monitor from 14 to 19 inches, a Pentium, memory, up to three hard disks, floppies, a CD-ROM and a CD burner, a network card, speakers or headphones, a keyboard, a mouse and a mat. Then you carry it to the back table, between PC-01 and PC-02, and unpack it from the outline. Press E at the back of the tower to plug in the video, keyboard, mouse, power board and network, then press the button. It runs its memory test, starts Windows and joins the LAN. A BNC-only card will not talk to the hub when it arrives, and nobody warned you.',
  },
  {
    date: '1998-02-07', kind: 'new', title: 'Duke Nukem 3D has come round',
    text: 'Somebody brought the shareware episode on a floppy and it is now on every PC, with a box on the shelf. Sit down, press the Game button until it says DUKE NUKEM 3D, and walk around a cinema that has seen better days. For a network game, host and joiners both pick the network game in SETUP, as the manual says.',
    link: ['/games.htm', 'All the games'],
  },
  {
    date: '1998-02-06', kind: 'new', title: 'The console has a prompt',
    text: 'Press E at the TV and the console boots to a C:\\N64> prompt on the glass. Type OPEN to point it at a folder of cartridge files on your own drive, DIR to list them, and a number or a name to run one. Nothing is supplied: the slot is empty until you bring a cartridge. Esc brings the prompt back, KEYS shows the layout, and the file never leaves your machine.',
  },
  {
    date: '1998-02-06', kind: 'new', title: 'The lights have a switch',
    text: 'There is a light switch on the back wall by the stairs door. Turn the ceiling tubes off and the room is nearly dark, and the monitors become the light: each one glows on the keyboard, the table and your face, in the colour of whatever is on it. Teal for Windows, green for Solitaire, grey for DOS. The switch has a small orange dot so you can find it.',
  },
  {
    date: '1998-02-06', kind: 'new', title: 'The yellow extension lead',
    text: 'The front wall is on the dryer circuit, so PC-04, PC-05 and PC-06 now run off a yellow extension lead from the back wall, across the aisle. Trip on it and all three go dark: shares gone, and a CD in PC-04 is a coaster. Press E on the lead, or F at a dead PC, to plug it back in. Expect a POST and a lot of fixing.',
  },
  {
    date: '1998-02-06', kind: 'new', title: 'Power points and boards',
    text: 'The walls now have power points, and every PC is plugged into a power board behind its table instead of floating in the air. The fan, the TV and the hub are plugged in too. Nobody has labelled any of the boards except with masking tape.',
  },
  {
    date: '1998-02-06', kind: 'new', title: 'Boxes all over the place',
    text: 'Sixteen more game boxes have come off the shelf and are lying around: on the tables, the snack table, a chair, the middle couch cushion and the carpet, a couple stacked. Nobody owns up to leaving them.',
  },
  {
    date: '1998-02-06', kind: 'new', title: 'The games, in their boxes',
    text: 'There is a shelf on the left wall by the front corner with a box for each game on the PCs: DOOM, Heretic, Hexen, Quake and Descent. The pictures on the front are ours, not the real covers. Turn one round for the system requirements.',
    link: ['/games.htm', 'All the games'],
  },
  {
    date: '1998-02-06', kind: 'new', title: 'Speakers and headphones',
    text: 'Three PCs now have speakers and three have headphones on the tower. Whoever is at a speaker PC is playing something, and you can hear it from across the room: shotgun blasts, imps, the odd rocket. At a headphone PC you put them on, and it is quiet. Some people turn up wearing a pair already. N turns the noises off.',
  },
  {
    date: '1998-02-06', kind: 'fix', title: 'The pole by the taped man is gone',
    text: 'The white pole beside DUCTAPE has been taken out, and you can walk through where it stood. He is still taped to the duct. Nobody has explained that either.',
  },
  {
    date: '1998-02-06', kind: 'new', title: 'The regulars talk about their games',
    text: 'K-Rad, n00bslayer, xX_Ghoul_Xx and the couch now chat about what is on their screens: rocket jumps, missing keys, a ship stuck in a wall. It shows in the channel and in the bubbles over their heads. Sit down with a game and they bring it up.',
  },
  {
    date: '1998-02-06', kind: 'new', title: 'Snapster, the file-sharing beta',
    text: 'Start > Programs > Snapster. Search the regulars for songs, double click one to get it, and watch it crawl in on your 56K line. Every band and title is made up, and nothing is really downloaded. File > Disconnect if the hub gets crowded.',
  },
  {
    date: '1998-02-06', kind: 'fix', title: 'The regulars stop talking out loud',
    text: 'Their lines are now text only, in the channel and the bubbles. The burps and snickers are still audible. N turns those off.',
  },
  {
    date: '1998-02-06', kind: 'fix', title: 'LANamp starts muted',
    text: 'The player now opens with the volume at zero so the room is quiet when you walk in. Drag the volume slider up to hear the playlist.',
  },
  {
    date: '1998-02-06', kind: 'new', title: 'The browser opens on the news',
    text: 'Walk in and Internet Explorer is already on this page. Close it with the x, and bring it back with H or from the Start menu.',
  },
  {
    date: '1998-02-06', kind: 'new', title: 'Internet Explorer, and this site',
    text: 'The basement has a web browser. Start > Programs > Internet Explorer, or press H. Back, Forward, Favorites, History and Search all work. You are reading this in it.',
  },
  {
    date: '1998-02-03', kind: 'new', title: 'Resize any window',
    text: 'Notepad, Paint, the MS-DOS Prompt, Help and mIRC can be dragged out from any edge or corner, maximised (button, or double-click the title bar) and restored. Calculator and the games stay their size.',
  },
  {
    date: '1998-02-01', kind: 'new', title: 'Six more posters',
    text: 'Game boxes IRON HYMN, RICO RAMPAGE 3D and VOID HARVEST, and film one-sheets DEEP CORE, CHROME SHIFT 2 and BUS STOP BANDITS. All six are made up.',
  },
  {
    date: '1998-01-31', kind: 'new', title: 'LANamp plays your own MP3s',
    text: 'ADD DIR scans a folder and every folder below it, reads the ID3 tags and adds the files after the built-in tape. They play straight from your drive and are never uploaded.',
  },
  {
    date: '1998-01-30', kind: 'new', title: 'Solitaire and Downhill',
    text: 'Klondike (draw one or three) and an endless ski run with a bear after 2000 m. Both are under Start > Programs > Games.',
    link: ['/games.htm', 'All the games'],
  },
  {
    date: '1998-01-30', kind: 'new', title: 'Documents folder',
    text: 'Ten files in Start > Documents. None of them open. Do not ask what is in Resume_FINAL_v7_REAL.doc.',
  },
  {
    date: '1998-01-29', kind: 'new', title: 'Quake and Hexen',
    text: 'Quake 1.06 shareware (Multiplayer menu over IPX) and the Hexen 4 level demo (IPXSETUP deathmatch). The Game button on the seated bar cycles DOOM, Heretic, Hexen, Quake and Descent.',
    link: ['/games.htm', 'All the games'],
  },
  {
    date: '1998-01-28', kind: 'new', title: 'Heretic and Descent',
    text: 'Heretic 1.3 shareware, with IPXSETUP deathmatch like DOOM. Descent 1.0 shareware, with a pilot made up for you so it gets to its menu.',
  },
  {
    date: '1998-01-27', kind: 'new', title: 'A bean bag',
    text: 'Back left corner. Faded teal vinyl in six panels, with a dent. Nobody has said where the dent came from.',
  },
  {
    date: '1998-01-27', kind: 'new', title: 'Citrus Zap and party cups',
    text: 'Green two-litres on the snack table and by the couch, plus a sleeve of red cups. E pours a Zap: +18 caffeine.',
  },
  {
    date: '1998-01-27', kind: 'new', title: 'Cheez Curlz, and crumbs everywhere',
    text: 'A second snack on the desks and the coffee table. Loose chips, curls and cheese dust on the keyboards, the chairs and the carpet.',
  },
  {
    date: '1998-01-26', kind: 'new', title: 'The lounge',
    text: 'Plaid couch, a big CRT TV on a stand, a console with four wired pads and a coffee table loaded with cans and pizza. The TV loops a four-player brawl until you sit at the console, which takes cartridges you bring yourself. The pads are for show.',
  },
  {
    date: '1998-01-26', kind: 'new', title: 'The regulars dance',
    text: 'They move to the music, each crowd in its own way, and work through pizza, Nachoz and Volt Cola every ten seconds or so.',
  },
  {
    date: '1998-01-25', kind: 'new', title: 'The desktop',
    text: 'A taskbar, a Start menu and windows you can drag: Calculator, Notepad, Paint, the MS-DOS Prompt, Minesweeper, Disk Defragmenter, mIRC and LANamp. Press Tab to free the mouse.',
  },
  {
    date: '1998-01-25', kind: 'new', title: 'Idle screens and a screen saver',
    text: 'PC-01 sits on the defragmenter and PC-06 on a game of Solitaire. Any free PC left alone for five minutes starts a starfield.',
  },
  {
    date: '1998-01-24', kind: 'new', title: 'Speech bubbles and noises',
    text: 'The regulars talk in Windows 98 bubbles: burps, whose socks smell, your mum. Some of it is spoken aloud. N turns the voices off.',
  },
  {
    date: '1998-01-23', kind: 'fix', title: 'Eating arm',
    text: 'The regulars\' arm stopped at the shoulder when they ate. The hand now reaches the mouth.',
  },
  {
    date: '1998-01-23', kind: 'new', title: 'Faces',
    text: 'Everyone has a face now: ears, a nose, brows, eyes that blink, lips. Arms and legs are round. Mouths open for pizza.',
  },
  {
    date: '1998-01-22', kind: 'new', title: 'Shout me a Volt Cola',
    text: 'The intro window has a button if you want to shout the webmaster a Volt Cola. Share buttons are there too.',
  },
  {
    date: '1998-01-21', kind: 'new', title: 'Disks, discs and trestle tables',
    text: 'Floppies and CDs on the cases, the tables and the carpet. The tables are proper 6 ft trestles, five end to end. Four band posters went up: Wet Cement, Cold Furnace, Diamond Fang and Bass Cadet.',
  },
  {
    date: '1998-01-20', kind: 'fix', title: 'Chat on top of the meters',
    text: 'The chat feed no longer covers the meters, and the IRC nick list is wider.',
  },
  {
    date: '1998-01-20', kind: 'new', title: '#lanparty98',
    text: 'An IRC window (I toggles it) where the regulars tell dumb jokes, roast each other\'s frag counts and laugh at the result. Chat (T) shows up there too.',
  },
  {
    date: '1998-01-19', kind: 'new', title: 'LANamp',
    text: 'A music player with eight original tracks, two each of hip hop, drum and bass, EDM and rock, made live in your browser. M shows or hides it. Z X C V B work the transport.',
  },
  {
    date: '1998-01-18', kind: 'new', title: 'Pizza',
    text: 'A menu, a delivery, half-eaten boxes on the tables and a man taped to the ceiling. He was there when we got here.',
  },
  {
    date: '1998-01-18', kind: 'new', title: 'Everyone gets a 90s look',
    text: 'Goths, surfers, hip hop kids, ravers, grunge kids and nerds. Your look comes from your handle, so it is the same on everyone\'s screen.',
  },
  {
    date: '1998-01-17', kind: 'fix', title: 'Stale scripts',
    text: 'After an update your browser could keep running the old files and break the room. The page now checks for new ones on every visit.',
  },
  {
    date: '1998-01-17', kind: 'new', title: 'More posters',
    text: 'DUKE NUKEM 3D (the name only; the game is not here), a Y2K countdown, a 56K modem poster and an adventure game with a pixel treasure chest.',
  },
  {
    date: '1998-01-16', kind: 'new', title: 'A door',
    text: 'In the back wall, with a landing and a staircase up to the rest of the house. E opens it. Mum is upstairs and says so.',
  },
  {
    date: '1998-01-15', kind: 'new', title: 'File sharing, and you are the one who fixes it',
    text: 'Every PC starts with Windows file sharing broken. Press F at a PC and walk it through the settings. About 19 seconds, and it fails a lot. It comes undone again every few minutes.',
    link: ['/howto.htm#chores', 'The night\'s chores'],
  },
  {
    date: '1998-01-15', kind: 'new', title: 'The night\'s schedule',
    text: 'Doors open at 7:30 PM and the room wants shooters until midnight. Then somebody puts StarCraft on, and any PC with under 32MB says "Not enough memory".',
  },
  {
    date: '1998-01-15', kind: 'fix', title: 'The clock started at 11:42 PM',
    text: 'The party began at 11:42 PM, which is not when doors open. It starts at 7:30 PM now.',
  },
  {
    date: '1998-01-14', kind: 'new', title: 'Cheap RAM from Singapore',
    text: 'Macca is off to Singapore and will bring back 16MB SIMMs at $35, not the shop\'s $75. Cash first. He is gone about fifteen minutes. F at a PC fits a stick, up to 64MB.',
  },
  {
    date: '1998-01-14', kind: 'new', title: 'Overclocking, a pedestal fan and the blue screen',
    text: 'F at a PC moves the jumpers to 100MHz, or 112MHz with extra volts. The fan keeps them alive. If the fan goes off, the overclocked boxes blue screen. Any key restarts, with the case still hot.',
  },
  {
    date: '1998-01-13', kind: 'new', title: 'Tripping over cables',
    text: 'The cat5 and the coax lie across the floor. Each time you step on one it is a roll, worse after a few cans of Volt. Trip and the lead comes out of the back of its PC.',
  },
  {
    date: '1998-01-13', kind: 'new', title: 'Network upgrade path',
    text: 'You start on 10BASE2 coax, where one loose T-connector takes down the whole segment. Order an 8-port hub for $45, then ring Dazza for a borrowed 16-port switch. It goes back at 6:00 AM.',
  },
  {
    date: '1998-01-12', kind: 'new', title: 'The 2x CD burner',
    text: 'PC-04 has the only CD-R drive. A 74 minute disc is a 37 minute write. Blanks are $4 and mates pay $10 for a MIX CD. Sit at PC-04 while it writes and you make a coaster.',
  },
  {
    date: '1998-01-08', kind: 'new', title: 'Multiplayer',
    text: 'One shared basement. Any free PC can be claimed, and seated players can host a DOOM deathmatch for 2 to 4 over a virtual IPX network. Everyone sees everyone walking around.',
    link: ['/howto.htm', 'How to play'],
  },
  {
    date: '1998-01-07', kind: 'new', title: 'Contact address',
    text: 'contact@lanparty1998.com is on the intro window and the 404 page.',
  },
  {
    date: '1998-01-05', kind: 'fix', title: 'DOOM would not load on some servers',
    text: 'Where the game files should have been, the server was handing out a web page, and the emulator tried to boot it. It now checks what it was given and says "file not found".',
  },
  {
    date: '1998-01-04', kind: 'new', title: 'The basement is open',
    text: 'A 3D basement with six beige PCs, a hub and a snack table. Sit at a PC and DOOM boots on it.',
  },
];

export const KINDS = { new: 'NEW', fix: 'FIXED' };

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// '1998-02-06' -> '6 Feb 1998'
export function fmtDate(iso) {
  const [y, m, d] = iso.split('-').map(Number);
  return `${d} ${MONTHS[m - 1]} ${y}`;
}

export const newest = (n = 5) => NEWS.slice(0, n);
export const ofKind = (kind) => (kind === 'new' || kind === 'fix' ? NEWS.filter((n) => n.kind === kind) : NEWS);
