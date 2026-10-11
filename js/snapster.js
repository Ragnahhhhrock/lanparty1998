// Snapster: the file-sharing client on the desktop. This file is the network and has no DOM, so
// tools/snapster.test.mjs can test it. The window is js/app-snapster.js.
//
// Nothing here touches the real internet. The "network" is a made-up crowd of regulars, each sharing a
// handful of MP3s by made-up bands with made-up titles, and a transfer is a timer that counts bytes.
// No file is ever downloaded. Every artist and every title below is invented.

export const SERVER = 'napsrv.lanparty1998.invalid';

// connection types, as the old clients listed them. bps is what the line can push, in bytes a second
export const SPEEDS = [
  { id: 'unknown', label: 'Unknown', rank: 0, bps: 1400 },
  { id: '14.4', label: '14.4K', rank: 1, bps: 1400 },
  { id: '28.8', label: '28.8K', rank: 2, bps: 2800 },
  { id: '33.6', label: '33.6K', rank: 3, bps: 3300 },
  { id: '56k', label: '56K', rank: 4, bps: 5200 },
  { id: 'isdn64', label: 'ISDN-64K', rank: 5, bps: 6400 },
  { id: 'isdn128', label: 'ISDN-128K', rank: 6, bps: 12800 },
  { id: 'cable', label: 'Cable', rank: 7, bps: 40000 },
  { id: 'dsl', label: 'DSL', rank: 8, bps: 60000 },
  { id: 't1', label: 'T1', rank: 9, bps: 150000 },
  { id: 't3', label: 'T3+', rank: 10, bps: 500000 },
];
export const speed = (id) => SPEEDS.find((s) => s.id === id) ?? SPEEDS[0];
export const MY_SPEEDS = ['28.8', '33.6', '56k', 'isdn128', 'cable'];
export const DEFAULT_SPEED = '56k';

// a download is sped up so a song takes seconds, not a quarter of an hour
export const TIME_SCALE = 30;

// artist -> titles. All made up.
export const ARTISTS = {
  'Static Cardigan': ['Beige Box Blues', 'Hold the Phone Line', 'Cardigan Weather', 'Parallel Port Girl', 'Dial Tone Heart'],
  'Gutterball Sunday': ['Free Bowling Shoes', 'Lane Nine', 'Turkey in the Third Frame', 'Rental Shoe Romance', 'Sunday Gutter'],
  'DJ Beige Box': ['10BASE-T Anthem (Club Mix)', 'IPX Is a State of Mind', 'Packet Loss', 'Hub Me Baby', 'Jumper Settings 128'],
  'Fistful of Modems': ['Handshake Screech', '56k Dreams', 'Busy Signal', 'Line Noise Lullaby', 'Disconnect Me Gently'],
  'Lunar Pizza Cult': ['Extra Pepperoni Moon', 'Delivery in 30 Minutes', 'Crust Eclipse', 'Cheese Orbit', 'Pizza Box Planet'],
  "Mum's Car Keys": ['Be Home By Ten', 'Dropped Off Around the Corner', 'Fluffy Dice', 'Reverse Park Romance', 'Petrol Light'],
  'Pixel Mullet': ['Business at the Front', 'Party in 640x480', 'Dial-Up Mullet', 'Hairspray Frame Rate', 'Casual Friday Rave'],
  'Wet Carpet Theory': ['Basement Flood', 'Squelch', 'Damp Corners', 'Shag Pile Requiem', 'Dehumidifier Love'],
  'The Dazza Experience': ['Dazza Owes Me Twenty Bucks', 'Camping the Spawn Point', 'Lag Is Not My Fault', 'Rocket Launcher Rhapsody', 'Respawn in Peace'],
  'Nightshift Nina': ['3 AM Noodles', 'Snooze Button Heart', 'Graveyard Shift Kiss', 'Fluoro Lights', 'Staff Discount'],
  'Tape Hiss Orchestra': ['Side B', 'Rewind the Summer', 'Dubbed from a Dub', 'Auto-Reverse', 'Ferric Oxide Blues'],
  'Sugar Rush Hour': ['Volt Cola Rain', 'Fifth Can of the Night', 'Crash at Four', 'Fizz Fizz Pop', 'Sticky Keyboard'],
  'Nacho Business': ['Dusty Fingers', 'Orange Thumbprint', 'Cheez Dust Elegy', 'Bag Is Half Empty', 'Salsa Jar Slow Dance'],
  'Brick Phone Brigade': ['Snake on the Bus', 'Antenna Up', 'No Credit Left', 'Two Bars', 'Text Me in Capital Letters'],
  'Cathode Ray Katy': ['Warm-Up Time', 'Degauss Me', 'Flyback Transformer', 'Screen Burn Romance', 'Phosphor Girl'],
  'Lift Music Collective': ['Going Up (Part 2)', 'Mezzanine Smile', 'Door Close Button', 'Level Four', 'Muzak Rebellion'],
  'Hoverboard Gran': ['Walker Frame Racing', 'Bingo Night Bass', 'Hearing Aid Feedback', 'Tea at Four', 'Knitting Needle Fury'],
  'Uncle Floppy': ['3.5 Inch Heart', 'Disk Eight of Eleven', 'Bad Sector', 'Please Insert Disk Nine', 'Write Protect Tab'],
  'Soggy Biscuit Society': ['Dunk Responsibly', 'Crumbs in the Keyboard', 'Tea Bag Tuesday', 'Arrowroot Anthem', 'Biscuit Tin Lullaby'],
  'Seventy Percent Cotton': ['Shrunk in the Wash', 'Iron on Low', 'Tag Scratches', 'Hand Me Down Jeans', 'Laundromat Love'],
  'Crispy Dave and the Overclockers': ['Heatsink Hero', 'Jumper to 133', 'Thermal Paste Tears', 'Smells Like Solder', 'Clock Speed Cowboy'],
  'Midnight Mailroom': ['Wrong Address', 'Postage Due', 'Registered Mail Heart', 'Stamp Collector', 'PO Box 214'],
  'Velcro Wallet': ['Rip It Open', 'Rain Money', 'Five Dollars of Hope', 'Coin Slot Lament', 'Kids Meal Hero'],
  'Rave Bus 94': ['Glowstick Gospel', 'Warehouse at Dawn', 'Fluoro Sunrise', 'Bass Bin Baby', 'Chill Out Room'],
  'Foggy Windscreen': ['Defrost Me', 'Wipers on Slow', 'Parking Lot Poetry', 'Drive-In Heart', 'Handbrake Turn'],
  'Meat Pie Mafia': ['Sauce on Top', 'Footy Final Eve', 'Servo Special', 'Pastry Flake Serenade', 'Burnt Tongue Boogie'],
  'Linoleum Dreams': ['Kitchen Floor Waltz', 'Peel and Stick', 'Cracked Tile Heart', 'Vinyl Plank Lament', 'Mop the Moon'],
  'Sofa Bed Syndicate': ['Fold Out Friday', 'Springs in My Back', 'Guest Room Blues', 'Couch Surfer', 'Sunday Doona Day'],
  'Zip Disk Zeke': ['100 Megs of Love', 'Click Click Click', 'Backup Plan', 'Not Enough Space', 'Eject Me Gently'],
  'Calculator Watch': ['Pocket Protector Pride', 'Mathematics of Love', 'Infinity Plus One', 'Slide Rule Slow Jam', 'Nerd Prom'],
  'The Dial-A-Pizza Kids': ['Press 1 for Hawaiian', 'Hold Music Heart', 'Wrong Number Romeo', 'Busy Tone Boy', 'Your Call Is Important'],
  'Ferns and Fluoros': ['Office Plant Blues', 'Photocopier Jam', 'Water Cooler Waltz', 'Cubicle Sunrise', 'Stapler Love Song'],
  'Billy Bass Boy': ['Mouth Moves, Song Plays', 'Wall Mounted Waltz', 'Take Me to the Lake', 'Fishbowl Funk', 'Plastic Trout Rock'],
  'Sensible Shoes': ['Arch Support', 'Orthopedic Overture', 'Velcro Straps', 'Insole Insomnia', 'Walk Briskly'],
  'Chalk Dust Choir': ['Detention Hymn', 'Recess Is Over', 'Overhead Projector', 'Pass the Note', 'Canteen Lines'],
  'Garage Sale Gabe': ['Everything Must Go (Sat 8am)', 'Two Dollars or Best Offer', 'Box of Cords', 'Lava Lamp Lament', 'Make Me an Offer'],
};

// what a badly named file on somebody's hard drive looks like. No artist, no title.
export const MYSTERY = ['track01', 'Track 02', 'untitled', 'untitled (2)', 'NEW SONG FINAL', 'NEW SONG FINAL2', 'audio', 'my mix side a', 'dont delete', 'song from the radio'];

// the regulars: handle, line speed, how many slots they give a downloader, how often they refuse or drop you
export const USERS = [
  ['modem_goblin', '33.6', 1, 0.15], ['BassFace98', 'cable', 3, 0.05], ['gutterball_greg', '56k', 2, 0.1], ['NanSurfs98', '28.8', 1, 0.2],
  ['cathode_katy', 'isdn64', 2, 0.1], ['BeigeBox_Ben', 't1', 4, 0.02], ['crispy_dave', 'dsl', 3, 0.05], ['packet_loss_pat', '14.4', 1, 0.3],
  ['CDRjunkie', '56k', 2, 0.08], ['hubcap_hannah', 'isdn128', 2, 0.1], ['uh_oh_Izzy', '56k', 1, 0.12], ['Mulletron3000', 'cable', 2, 0.06],
  ['ctrl_alt_Carl', 't3', 5, 0.01], ['PixelPaula', '33.6', 1, 0.15], ['LAN_Larry', 'dsl', 3, 0.04], ['SpawnPointSteve', '56k', 2, 0.1],
  ['tapedeck_tina', '28.8', 1, 0.25], ['floppy_phil', '14.4', 1, 0.35], ['FizzyFiona', 'cable', 2, 0.05], ['CheezDustKyle', '56k', 2, 0.1],
  ['dialup_dom', '33.6', 1, 0.2], ['basement_barb', 'isdn64', 2, 0.1], ['serial_cable_sam', '28.8', 1, 0.18], ['joystick_jo', '56k', 2, 0.08],
  ['defrag_dennis', 'isdn128', 3, 0.07], ['TurboButton_Tim', 't1', 4, 0.03],
].map(([name, conn, slots, flaky]) => ({ name, conn, slots, flaky }));

const BITRATES = [128, 128, 128, 128, 160, 192, 112, 256, 320, 96, 64];

export function rng(seed) { // mulberry32
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const SONGS = Object.entries(ARTISTS).flatMap(([artist, titles]) => titles.map((title) => ({ artist, title })));

export const fileName = (f) => f.artist ? `${f.artist} - ${f.title}.mp3` : `${f.title}.mp3`;
export const fmtLen = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
export const fmtSize = (b) => `${(b / 1048576).toFixed(2)} MB`;
export const fmtBytes = (b) => String(Math.round(b)).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
export const fmtRate = (bps) => `${(bps / 1000).toFixed(1)} KB/s`;

function makeFile(user, song, r, seconds) {
  const bitrate = BITRATES[Math.floor(r() * BITRATES.length)];
  const freq = bitrate <= 96 && r() < 0.6 ? 22050 : r() < 0.04 ? 32000 : 44100;
  const length = seconds + (r() < 0.2 ? Math.floor(r() * 30) - 10 : 0); // radio edits and extended ones
  const ping = pingFor(user.conn, r);
  return { ...song, user: user.name, conn: user.conn, bitrate, freq, seconds: length, size: Math.round((length * bitrate * 1000) / 8), ping };
}

function pingFor(conn, r) {
  if (r() < 0.07) return null; // the old clients showed "?" when a ping never came back
  const rank = speed(conn).rank;
  return Math.max(20, Math.round(850 - rank * 70 + r() * 220 + (r() < 0.1 ? 600 : 0)));
}

// Everybody on the hub and what they share. Same seed, same crowd.
export function buildNetwork(seed = 1998) {
  const r = rng(seed);
  const length = new Map(SONGS.map((s) => [fileName(s), 150 + Math.floor(r() * 200)]));
  const files = [];
  for (const user of USERS) {
    const count = 38 + Math.floor(r() * 40);
    const picks = new Set();
    while (picks.size < count) picks.add(Math.floor(r() * SONGS.length));
    for (const i of picks) files.push(makeFile(user, SONGS[i], r, length.get(fileName(SONGS[i]))));
    const stray = 1 + Math.floor(r() * 3);
    for (let k = 0; k < stray; k++) files.push(makeFile(user, { artist: '', title: MYSTERY[Math.floor(r() * MYSTERY.length)] }, r, 120 + Math.floor(r() * 240)));
  }
  files.forEach((f, id) => { f.id = id; });
  return { users: USERS, files, byId: (id) => files[id] };
}

export const MAX_RESULTS = [50, 100, 200, 300];

const words = (s) => String(s ?? '').toLowerCase().split(/[^a-z0-9.']+/).filter(Boolean);

// artist and title are what the person typed; every word has to appear. opts: max, minSpeed (id), minBitrate.
export function search(net, { artist = '', title = '' } = {}, { max = 100, minSpeed = 'unknown', minBitrate = 0 } = {}) {
  const a = words(artist), t = words(title);
  if (!a.length && !t.length) return [];
  const floor = speed(minSpeed).rank;
  const out = [];
  for (const f of net.files) {
    if (speed(f.conn).rank < floor || f.bitrate < minBitrate) continue;
    const name = fileName(f).toLowerCase();
    const who = (f.artist || '').toLowerCase(), what = f.title.toLowerCase();
    if (a.length && !a.every((w) => who.includes(w) || (!f.artist && name.includes(w)))) continue;
    if (t.length && !t.every((w) => what.includes(w))) continue;
    out.push(f);
  }
  out.sort((x, y) => (x.ping ?? 9999) - (y.ping ?? 9999) || x.id - y.id);
  return out.slice(0, max);
}

export const COLUMNS = {
  name: (f) => fileName(f).toLowerCase(), size: (f) => f.size, bitrate: (f) => f.bitrate, freq: (f) => f.freq, seconds: (f) => f.seconds,
  conn: (f) => speed(f.conn).rank, ping: (f) => f.ping ?? 9999, user: (f) => f.user.toLowerCase(),
};
export function sortBy(rows, key, dir = 1) {
  const get = COLUMNS[key];
  return rows.map((r, i) => [r, i]).sort((x, y) => {
    const a = get(x[0]), b = get(y[0]);
    return (a < b ? -dir : a > b ? dir : 0) || x[1] - y[1];
  }).map((p) => p[0]);
}

// "3,284 users sharing 118,402 songs (518 GB)": the hub is bigger than the few you can see
export function hubStats(net, r = Math.random) {
  const users = 1800 + Math.floor(r() * 400);
  const songs = Math.round(users * (net.files.length / net.users.length) * 0.9);
  const gb = Math.round((songs * 3.6) / 1000);
  return { users, songs, gb };
}

/* ---------------------------------------------------------------- transfers */

export const STATES = { connecting: 'Connecting...', queued: 'Waiting in line', downloading: 'Downloading', done: 'Finished', failed: 'Failed' };
export const FAILURES = ['Remote user refused the connection', 'Remote user is behind a firewall', 'Remote user ended the transfer', 'Remote user logged off'];

export class Transfers {
  constructor({ mySpeed = DEFAULT_SPEED, random = Math.random, scale = TIME_SCALE } = {}) {
    this.mySpeed = mySpeed; this.random = random; this.scale = scale;
    this.list = []; this.nextId = 1;
  }

  add(file) {
    const dup = this.list.find((t) => t.file.id === file.id && (t.state === 'connecting' || t.state === 'queued' || t.state === 'downloading'));
    if (dup) return dup;
    const t = { id: this.nextId++, file, state: 'connecting', got: 0, rate: 0, wait: 0.8 + this.random() * 1.6, note: '', age: 0, tick: 0 };
    this.list.push(t);
    return t;
  }

  active(user) { return this.list.filter((t) => t.state === 'downloading' && t.file.user === user).length; }
  get busy() { return this.list.some((t) => t.state === 'connecting' || t.state === 'queued' || t.state === 'downloading'); }

  cancel(id) { this.list = this.list.filter((t) => t.id !== id); }
  clearFinished() { this.list = this.list.filter((t) => t.state !== 'done' && t.state !== 'failed'); }

  // advance every transfer by dt seconds; returns the ones that finished or failed on this tick
  step(dt) {
    const ended = [];
    for (const t of this.list) {
      t.age += dt;
      const flaky = USERS.find((u) => u.name === t.file.user)?.flaky ?? 0.1;
      if (t.state === 'connecting') {
        t.wait -= dt;
        if (t.wait > 0) continue;
        if (this.random() < flaky * 0.5) { fail(t, FAILURES[this.random() < 0.5 ? 0 : 1]); ended.push(t); continue; }
        t.state = 'queued'; t.wait = 0;
      }
      if (t.state === 'queued') {
        const ahead = this.list.filter((o) => o.file.user === t.file.user && o.id < t.id && (o.state === 'queued' || o.state === 'downloading')).length;
        const slots = USERS.find((u) => u.name === t.file.user)?.slots ?? 1;
        if (this.active(t.file.user) < slots && ahead < slots) { t.state = 'downloading'; t.rate = 0; t.tick = 0; }
        else { t.note = `Waiting in line (${ahead + 1})`; continue; }
      }
      if (t.state === 'downloading') {
        t.tick -= dt;
        if (t.tick <= 0) { // pick a new speed about once a second so the readout moves
          t.tick = 1;
          t.rate = Math.min(speed(t.file.conn).bps, speed(this.mySpeed).bps) * (0.7 + this.random() * 0.3);
        }
        t.got = Math.min(t.file.size, t.got + t.rate * this.scale * dt);
        if (t.got < t.file.size && this.random() < flaky * 0.012 * dt * this.scale / 10) { fail(t, FAILURES[2 + Math.floor(this.random() * 2)]); ended.push(t); continue; }
        if (t.got >= t.file.size) { t.state = 'done'; t.rate = 0; t.note = ''; ended.push(t); }
      }
    }
    return ended;
  }
}

function fail(t, why) { t.state = 'failed'; t.rate = 0; t.note = why; }

export const percent = (t) => Math.floor((t.got / t.file.size) * 100);
export const statusText = (t) => {
  if (t.state === 'downloading') return `${percent(t)}%  ${fmtRate(t.rate)}`;
  if (t.state === 'queued') return t.note || STATES.queued;
  if (t.state === 'failed') return t.note;
  return STATES[t.state];
};

/* ---------------------------------------------------------------- your library */

// Finished downloads. Kept for as long as the page is open, in C:\SNAPSTER\MUSIC.
export class Library {
  constructor() { this.items = []; }
  add(file) {
    if (this.items.some((i) => i.id === file.id || fileName(i) === fileName(file))) return false;
    this.items.push({ ...file });
    return true;
  }
  has(file) { return this.items.some((i) => fileName(i) === fileName(file)); }
  remove(id) { this.items = this.items.filter((i) => i.id !== id); }
  get bytes() { return this.items.reduce((n, i) => n + i.size, 0); }
}

export const MUSIC_DIR = 'C:\\SNAPSTER\\MUSIC';
