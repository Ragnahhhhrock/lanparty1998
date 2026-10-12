// The eight shorts: one feature each, 30 seconds or less with the end card. Read by design/video/shorts.html.
// A scene is d seconds of footage (img: one or more stills from img/video/shorts/, cut at `at`, pushed in towards
// `focus`, raised ty px to bring a corner of the screen up above the caption) with a caption window. Scenes with a `step` are numbered STEP n OF m. kind 'crt' shows game frames on a CRT.
// audio is in video/shorts/audio/, rendered from LANamp's tape (js/music.js) by scripts/render-music.py.
window.SHORTS = {
  builder: {
    series: 'PC BUILDER', exe: 'BUILDPC.EXE', audio: 'pc-builder.m4a', clock: 19 * 60 + 30, end: 3,
    cta: 'Build a PC, plug it in and play. Free in your browser.', ctaTerm: 'BUILDPC.EXE: $1500 to spend',
    scenes: [
      { d: 4, img: 'builder-0', focus: '50% 45%', h: 'Build your own PC', p: 'You walk in with $1500 and the computer shop\'s catalogue. Every part has a price and a catch.', tags: ['ACCOUNT $1500'] },
      { d: 4.5, step: 1, img: ['builder-1', 'builder-2'], focus: '50% 40%', h: 'Pick every part', p: 'Tube, Pentium, RAM, drives, network card, sound. Under 32MB and the midnight StarCraft will not run.' },
      { d: 4.5, step: 2, img: 'builder-7', focus: '50% 40%', h: 'Pay at the counter', p: 'Or press Standard PC and let the shop pick. The receipt goes with you to the back table.' },
      { d: 4.5, step: 3, img: ['builder-outline', 'builder-unpacked'], focus: '50% 45%', h: 'Unpack it on the bench', p: 'PC-07 or PC-08. Outlines show where each part goes. Look at one and press E.', keys: ['E'] },
      { d: 4.5, step: 4, img: ['builder-rear', 'builder-plugged'], focus: '50% 40%', h: 'Plug it in from behind', p: 'Video, keyboard, mouse, sound, three power leads and the network. No screen, no keyboard, no start.', keys: ['E', '=at the tower'] },
      { d: 4.5, step: 5, img: ['builder-post', 'builder-post2'], focus: '50% 40%', h: 'Press the button', p: 'It counts your RAM, finds your drives and POSTs. Then sit down and it boots like the other five.' },
    ],
  },

  network: {
    series: 'NETWORK GAMES', exe: 'NETFRAG.EXE', audio: 'network-games.m4a', clock: 21 * 60 + 15, end: 3,
    cta: 'Six PCs, a hub and up to four in a deathmatch. Free in your browser.', ctaTerm: 'IPX NETWORK GAME',
    scenes: [
      { d: 4, img: 'net-idle', focus: '50% 45%', h: 'Network games', p: 'Six beige boxes on a 10BASE-T hub. Walk up to a free PC and sit down.', keys: ['E', '=sits'] },
      { d: 4.5, step: 1, img: 'net-doom', focus: '50% 40%', h: 'DOOM boots', p: 'A real DOS box in your browser. The Game button reboots it into the next game.' },
      { d: 4.5, step: 2, kind: 'crt', pc: 'PC-02', frames: ['games/heretic_1', 'games/hexen_2', 'games/quake_1', 'games/descent_2', 'games/duke_1'], h: 'Six to pick from', p: 'DOOM, Heretic, Hexen, Quake, Descent and Duke Nukem 3D. All free shareware releases.' },
      { d: 4.5, step: 3, img: ['net-join', 'net-joined'], focus: '50% 100%', zoom: [1.6, 1.65], ty: -380, h: 'Host or join', p: 'One seated player hosts. Up to three more click Join. The host clicks Start.' },
      { d: 4.5, step: 4, img: ['net-ipx', 'net-ipx2'], focus: '50% 40%', h: 'IPX finds the others', p: 'Every PC in the match reboots into IPXSETUP and finds the rest over a virtual IPX network.',
        extra: '<div class="toast" id="ipx"></div>', fx: 'ipx' },
      { d: 4.5, step: 5, kind: 'crt', pc: 'PC-02', frames: ['games/doom_1', 'games/doom_2', 'games/doom_3', 'games/doom_4'], h: 'Frag your mates', p: 'Everyone else watches your game on your CRT. Backtick stands you up and out of the match.', keys: ['`', '=stands up'] },
    ],
  },

  room: {
    series: 'THE ROOM', exe: 'BASEMENT.EXE', audio: 'the-room.m4a', clock: 20 * 60 + 40, end: 3,
    cta: 'A whole 1998 basement to poke around. Free in your browser.', ctaTerm: 'BASEMENT: 6 PCs, 1 hub',
    scenes: [
      { d: 4, img: 'room-wide', focus: '50% 45%', h: 'The basement', p: 'Walk it with W A S D. Look at anything with a prompt on it and press E.', keys: ['W', 'A', 'S', 'D', 'E'] },
      { d: 4.5, step: 1, img: 'room-switch', focus: '50% 50%', h: 'The light switch', p: 'On the wall by the stairs door. E turns the ceiling lights off.', keys: ['E'] },
      { d: 5, step: 2, img: ['room-dark2', 'room-light'], at: [0, 0.62], focus: '40% 45%', h: 'Lights off', p: 'The monitors are the only light, and each tube glows the colour of its screen. E again and they come back.' },
      { d: 4.5, step: 3, img: 'room-door', focus: '50% 45%', h: 'The stairs door', p: 'Open it and Mum calls down from upstairs. She can hear the explosions.', keys: ['E'],
        extra: '<div class="toast">Mum, from upstairs: "Keep it down,\nwe can hear the explosions."</div>' },
      { d: 4.5, step: 4, img: 'room-fan', focus: '50% 45%', h: 'The pedestal fan', p: 'It keeps the overclocked boxes alive. Trip over its lead and they blue screen.', keys: ['E'] },
      { d: 4.5, step: 5, img: ['room-beanbag', 'room-ductape'], focus: '50% 45%', h: 'Bean bag. Ceiling man.', p: 'Sink into the bean bag. DUCTAPE is taped to the ceiling duct with a slice of pizza. Ask him why.', keys: ['E'] },
    ],
  },

  food: {
    series: 'SNACKS + PIZZA', exe: 'SNACKS.EXE', audio: 'food-and-pizza.m4a', clock: 21 * 60 + 50, end: 3,
    cta: 'Pizza Shack delivers to the basement. Free in your browser.', ctaTerm: 'PIZZA SHACK: $16 LARGE',
    scenes: [
      { d: 4, img: 'food-volt', focus: '50% 45%', h: 'Food and drink', p: 'Volt Cola keeps the caffeine meter up. Nachoz and Cheez Curlz keep the snacks meter up.', keys: ['E', '=eats and drinks'],
        extra: `<div class="panel"><div class="meter"><span>CAFFEINE</span><div class="bar"><b class="caf" id="mc"></b></div><span id="mcv"></span></div>
          <div class="meter"><span>SNACKS</span><div class="bar"><b class="snk" id="ms"></b></div><span id="msv"></span></div></div>`, fx: 'meters' },
      { d: 4.5, step: 1, img: ['food-nachoz', 'food-zap'], focus: '50% 45%', h: 'The snack table', p: 'Nachoz, Cheez Curlz, and a two-litre of Citrus Zap to pour into a red cup.', keys: ['E'] },
      { d: 4.5, step: 2, img: ['food-phone', 'food-menu'], focus: '50% 42%', h: 'Ring Pizza Shack', p: 'The wall phone by the stairs. A large pepperoni is $16, eight slices.', keys: ['E', '=at the phone'] },
      { d: 4.5, step: 3, img: 'food-knock', focus: '50% 45%', h: 'Wait for the knock', p: 'About eight game minutes. He knocks three times, and keeps knocking until somebody answers.',
        extra: '<div class="toast" id="kn"></div>', fx: 'knock' },
      { d: 4.5, step: 4, img: ['food-driver', 'food-handover'], focus: '50% 45%', h: 'Open the door', p: 'He hands over the pizza, a Volt Cola and a garlic bread in foil that was a mistake on the docket.', keys: ['E', '=at the door'] },
      { d: 4.5, step: 5, img: ['food-box', 'food-slice'], focus: '50% 50%', h: 'Eat', p: 'E opens the box and eats a slice. F shuts the lid. G unwraps the garlic bread.', keys: ['E', 'F', 'G'] },
    ],
  },

  console: {
    series: 'THE CONSOLE', exe: 'CONSOLE.EXE', audio: 'the-console.m4a', clock: 23 * 60 + 10, end: 3,
    cta: 'Bring your own cartridges to the lounge. Free in your browser.', ctaTerm: 'C:\\N64> DIR',
    scenes: [
      { d: 4.5, img: 'con-lounge', focus: '60% 45%', h: 'The lounge', p: 'A plaid couch, a big CRT TV, and a four-player console with four wired pads.' },
      { d: 5, step: 1, img: ['con-prompt', 'con-tv'], focus: '50% 45%', h: 'Press E at the TV', p: 'It turns into a DOS-style prompt: C:\\N64>. Type HELP for the commands.', keys: ['E'] },
      { d: 5, step: 2, img: 'con-help', focus: '50% 40%', h: 'Bring your own ROMs', p: 'OPEN picks a folder of N64 ROMs on your drive. They are read in the browser and never uploaded.' },
      { d: 5, step: 3, img: 'con-dir', focus: '50% 40%', h: 'DIR, then a number', p: 'DIR lists the cartridges. Type a number or a name and it runs on the TV glass.' },
      { d: 5, step: 4, img: 'con-tv', focus: '50% 40%', h: 'The pad is your keyboard', p: 'Stick is T F G H, the D-pad is the arrows, A is X, B is S, Start is Enter. Esc goes back to the prompt.', keys: ['T', 'F', 'G', 'H'] },
    ],
  },

  chat: {
    series: 'PROXIMITY CHAT', exe: 'VOICE.EXE', audio: 'proximity-chat.m4a', clock: 22 * 60 + 25, end: 3,
    cta: 'Talk to whoever is standing next to you. Free in your browser.', ctaTerm: 'VOICE: 1.5 m TO 9 m',
    scenes: [
      { d: 4, img: 'chat-bubble', focus: '50% 30%', h: 'Talk to the room', p: 'Voice chat works like a basement: the closer you stand to someone, the louder they are.' },
      { d: 4.5, step: 1, img: ['chat-mate', 'chat-voice'], focus: '0% 100%', zoom: [1.8, 1.85], ty: -420, h: 'Press Y to join', p: 'Allow the microphone. Everyone else who has joined can hear you. Peer to peer, and nothing is recorded.', keys: ['Y'] },
      { d: 4.5, step: 2, img: 'chat-voice', focus: '50% 30%', h: 'Distance is volume', p: 'Full volume within 1.5 m, silent at 9 m, and from the direction they are standing.',
        extra: `<div class="panel"><div class="meter"><span id="fm">0.5 m</span><div class="bar"><b class="vol" id="fv"></b></div><span id="fvv"></span></div></div>`, fx: 'falloff' },
      { d: 4.5, step: 3, img: 'chat-muted', focus: '0% 100%', zoom: [1.8, 1.85], ty: -420, h: 'Mute or leave', p: 'Y again mutes and unmutes your microphone. Shift+Y leaves voice altogether.', keys: ['Y', '=mutes', 'Shift+Y', '=leaves'] },
      { d: 4.5, step: 4, img: ['chat-typing', 'chat-bubble'], focus: '50% 30%', h: 'Or type it', p: 'T opens chat. What you type pops up over your head in a speech bubble.', keys: ['T'] },
      { d: 4.5, step: 5, img: 'chat-irc', focus: '100% 0%', zoom: [1.3, 1.4], h: '#lanparty98', p: 'Typed chat lands in the IRC window too, with the regulars roasting each other\'s frag counts.', keys: ['I', '=shows IRC'] },
    ],
  },

  desktop: {
    series: 'WINDOWS 98', exe: 'DESKTOP.EXE', audio: 'windows-98.m4a', clock: 20 * 60 + 5, end: 3,
    cta: 'A whole 98 desktop at every PC. Free in your browser.', ctaTerm: 'C:\\WINDOWS> WIN',
    scenes: [
      { d: 4, img: 'win-ie', focus: '30% 10%', zoom: [1.15, 1.2], h: 'A whole 98 desktop', p: 'Tab frees the mouse for the taskbar, the Start menu and the windows. Click the room to walk again.', keys: ['Tab'] },
      { d: 4.5, step: 1, img: ['win-start', 'win-games'], focus: '0% 100%', zoom: [1.7, 1.75], ty: -400, h: 'The Start menu', p: 'Programs, Accessories, Games, System Tools, Run... and Shut Down. Everything in it works.' },
      { d: 4.5, step: 2, img: ['win-irc', 'win-snapster'], at: [0, 0.45], focus: '70% 5%', zoom: [1.2, 1.25], h: 'mIRC and Snapster', p: '#lanparty98 is the regulars\' channel. Snapster finds MP3s by made-up bands and crawls them in at modem speed.', keys: ['I'] },
      { d: 4.5, step: 3, img: ['win-mine', 'win-solitaire', 'win-ski'], focus: '50% 10%', zoom: [1.1, 1.15], h: 'Games', p: 'Minesweeper, Solitaire, and Downhill: an endless ski run with a bear after 2000 m.' },
      { d: 4.5, step: 4, img: ['win-dos', 'win-calc', 'win-defrag'], focus: '50% 10%', zoom: [1.1, 1.15], h: 'Accessories', p: 'MS-DOS Prompt, Calculator, Paint, Notepad and Disk Defragmenter. All of them work.' },
      { d: 4, step: 5, img: 'win-shutdown', focus: '80% 50%', zoom: [1.3, 1.35], h: 'Shut Down...', p: 'Turn it off, restart it, or restart in MS-DOS mode.' },
    ],
  },

  lanamp: {
    series: 'LANAMP', exe: 'LANAMP.EXE', audio: 'lanamp.m4a', clock: 22 * 60 + 55, end: 3,
    cta: 'Bring your MP3s to the basement. Free in your browser.', ctaTerm: 'LANAMP: 8 TRACKS + YOURS',
    scenes: [
      { d: 4, img: 'amp-window', focus: '100% 100%', zoom: [1.5, 1.6], ty: -330, h: 'LANamp', p: 'A Winamp-style player on the desktop at every PC. M shows or hides it.', keys: ['M'] },
      { d: 5, step: 1, img: ['amp-playing', 'amp-next'], focus: '100% 100%', zoom: [1.55, 1.6], ty: -330, h: 'The tape', p: 'Eight original tracks, hip hop to rock, synthesised live in the browser. No samples.', keys: ['Z', 'X', 'C', 'V', 'B'] },
      { d: 5, step: 2, img: ['amp-scan', 'amp-added'], focus: '100% 100%', zoom: [1.55, 1.6], ty: -330, h: 'ADD DIR', p: 'Pick a folder. LANamp finds every .mp3 in it and below it, and reads the ID3 tags.' },
      { d: 5, step: 3, img: 'amp-own', focus: '100% 100%', zoom: [1.55, 1.6], ty: -330, h: 'Your own music', p: 'Files play straight from your drive and are never uploaded. You can drop them on the window too.' },
      { d: 4.5, step: 4, img: 'amp-added', focus: '100% 100%', zoom: [1.6, 1.55], ty: -330, h: 'Remembered', p: 'Chrome and Edge keep the folder. RESCAN asks again next visit, CLR forgets it.' },
    ],
  },
};
