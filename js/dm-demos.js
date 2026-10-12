// The recorded DOOM deathmatches that K-Rad and n00bslayer "play" (spectator mode, js/spectator.js).
//
// Each bundles/dm-*.lmp is a real DOOM demo of a two-player deathmatch between two bots, recorded by
// tools/dm-recorder (a vanilla-compatible engine with bots driving both players). DOOM replays a demo by feeding its
// recorded keypresses to the game, so the real DOS DOOM.EXE draws every frame.
//
// A demo of a two-player match holds both players' keypresses; byte 8 of its header says whose eyes the screen shows.
// One recording therefore gives two pictures: K-Rad's screen shows player 0's view and n00bslayer's shows player 1's
// view of the same fight.
//
// DOOM plays demos named DEMO1, DEMO2, DEMO3 (DEMO4 in the retail release) from its own title loop, so a small PWAD
// holding our demos under those names is all DOOM needs: it cycles title, demo, credits, demo ... without ever
// exiting. No DOM code: tools/dm-demos.test.mjs tests it.

export const DEMO_LUMPS = ['DEMO1', 'DEMO2', 'DEMO3', 'DEMO4'];
export const DOOM_DEMO_VERSION = 109;   // DOOM 1.9
export const VIEW_BYTE = 8;             // header: version skill episode map deathmatch respawn fast nomonsters VIEW p0 p1 p2 p3

// Is this a two-player DOOM 1.9 demo (header plus at least one tic, ending in the 0x80 end marker)?
export function checkDemo(lmp) {
  if (!(lmp instanceof Uint8Array) || lmp.length < 13 + 8 + 1) return 'too short';
  if (lmp[0] !== DOOM_DEMO_VERSION) return `version ${lmp[0]}, not ${DOOM_DEMO_VERSION}`;
  if (lmp[4] === 0) return 'not a deathmatch';
  if (!lmp[9] || !lmp[10] || lmp[11] || lmp[12]) return 'not a two-player demo';
  if (lmp[lmp.length - 1] !== 0x80) return 'no end marker';
  if ((lmp.length - 14) % 8 !== 0) return 'tics are not whole';
  return null;
}

// The same demo as seen by player `view` (0 or 1)
export function demoView(lmp, view) {
  if (view !== 0 && view !== 1) throw new Error(`no player ${view}`);
  const why = checkDemo(lmp);
  if (why) throw new Error(`bad demo: ${why}`);
  const out = lmp.slice();
  out[VIEW_BYTE] = view;
  return out;
}

// How many tics a demo lasts, and so how long it plays at DOOM's 35 tics a second
export function demoTics(lmp) { return (lmp.length - 14) / 8; }

// A PWAD holding lumps: [{ name, data }]
export function buildWad(lumps) {
  const enc = new TextEncoder();
  let size = 12;                                   // header, then the lumps, then the directory
  const offsets = lumps.map((l) => { const at = size; size += l.data.length; return at; });
  const out = new Uint8Array(size + lumps.length * 16);
  const v = new DataView(out.buffer);
  out.set(enc.encode('PWAD'), 0);
  v.setInt32(4, lumps.length, true);
  v.setInt32(8, size, true);
  let at = 12;
  lumps.forEach((l) => { out.set(l.data, at); at += l.data.length; });
  const dir = at;
  lumps.forEach((l, i) => {
    v.setInt32(dir + i * 16, offsets[i], true);
    v.setInt32(dir + i * 16 + 4, l.data.length, true);
    if (l.name.length > 8) throw new Error(`lump name ${l.name} is longer than eight characters`);
    out.set(enc.encode(l.name), dir + i * 16 + 8);
  });
  return out;
}

// The inverse, for tests: a PWAD -> [{ name, data }]
export function readWad(wad) {
  const v = new DataView(wad.buffer, wad.byteOffset, wad.byteLength);
  const tag = String.fromCharCode(...wad.subarray(0, 4));
  if (tag !== 'PWAD' && tag !== 'IWAD') throw new Error('not a WAD');
  const n = v.getInt32(4, true), dir = v.getInt32(8, true);
  const lumps = [];
  for (let i = 0; i < n; i++) {
    const at = v.getInt32(dir + i * 16, true), len = v.getInt32(dir + i * 16 + 4, true);
    const name = String.fromCharCode(...wad.subarray(dir + i * 16 + 8, dir + i * 16 + 16)).replace(/\0+$/, '');
    lumps.push({ name, data: wad.subarray(at, at + len) });
  }
  return lumps;
}

// The WAD for one of the two PCs: our demos under DOOM's own demo names, shown through player `view`'s eyes.
// demos: Uint8Array[] (as many as there are, up to DEMO_LUMPS.length; the list wraps if there are fewer)
export function spectatorWad(demos, view) {
  if (!demos.length) throw new Error('no demos');
  return buildWad(DEMO_LUMPS.map((name, i) => ({ name, data: demoView(demos[i % demos.length], view) })));
}
