// The games a PC can run. All of them are shareware releases that are free to pass around, so
// the files can live in bundles/ (see bundles/SOURCES.md). No DOM code: tools/games.test.mjs
// tests it, and checks it agrees with the GAMES table in tools/make-confs.py.
//
// net.kind says how a deathmatch starts:
//   'setup'  IPXSETUP (the id Software network driver) finds the other nodes and starts the game
//            by itself, so the room knows exactly how many are playing.
//   'lobby'  the game has its own multiplayer menu: the host makes a game, the others join it.

// Adding a game? Draw its box in BOXES in js/textures.js and it lands on the shelf in the room by itself.
export const MAX_PLAYERS = 4;       // the room server caps a deathmatch at four
export const DEFAULT_GAME = 'doom';

export const GAMES = {
  doom: {
    id: 'doom',
    name: 'DOOM',
    zip: 'doom-shareware.zip',
    net: { kind: 'setup' },
  },
  heretic: {
    id: 'heretic',
    name: 'HERETIC',
    zip: 'heretic-shareware.zip',
    net: { kind: 'setup' },
  },
  hexen: {
    id: 'hexen',
    name: 'HEXEN',
    zip: 'hexen-shareware.zip',
    net: { kind: 'setup' },
  },
  quake: {
    id: 'quake',
    name: 'QUAKE',
    zip: 'quake-shareware.zip',
    net: {
      kind: 'lobby',
      host: 'Pick MULTIPLAYER, then NEW GAME.',
      join: 'Pick MULTIPLAYER, then JOIN A GAME and search for local games.',
    },
  },
  descent: {
    id: 'descent',
    name: 'DESCENT',
    zip: 'descent-shareware.zip',
    net: {
      kind: 'lobby',
      host: 'Pick MULTIPLAYER, then START A NETWORK GAME.',
      join: 'Pick MULTIPLAYER, then JOIN A NETWORK GAME.',
    },
    // Descent wants a pilot before it shows its menu. Make one named after you, with the mouse set.
    pilot: { template: 'descent-pilot.plr', ext: 'PLR', config: descentConfig },
  },
  duke: {
    id: 'duke',
    name: 'DUKE NUKEM 3D',
    zip: 'duke-shareware.zip',
    net: {
      kind: 'lobby',
      host: 'In SETUP pick the network game and start a new one.',
      join: 'In SETUP pick the network game and join it.',
    },
  },
};

export const GAME_IDS = Object.keys(GAMES);

export function gameOf(id) { return GAMES[id] ?? GAMES[DEFAULT_GAME]; }

export function nextGame(id) {
  const i = GAME_IDS.indexOf(gameOf(id).id);
  return GAME_IDS[(i + 1) % GAME_IDS.length];
}

const clampNodes = (n) => Math.min(MAX_PLAYERS, Math.max(2, n | 0 || 2));

// Which config bundle in bundles/ boots this game: kind is 'solo', 'host' or 'join'.
export function confName(gameId, kind, nodes) {
  const g = gameOf(gameId);
  if (kind === 'solo') return `conf-${g.id}-solo.jsdos`;
  if (g.net.kind === 'lobby') return `conf-${g.id}-net.jsdos`;
  return `conf-${g.id}-dm${clampNodes(nodes)}.jsdos`;
}

// What the status line tells you to do once the PC is on the network.
export function netHint(gameId, kind) {
  const g = gameOf(gameId);
  if (g.net.kind === 'lobby') return `${g.name}: ${kind === 'host' ? g.net.host : g.net.join} Esc frees the mouse.`;
  return 'Deathmatch on. Click the screen. Esc aborts setup.';
}

const clean = (handle) => String(handle ?? '').toUpperCase().replace(/[^A-Z0-9_]/g, '').slice(0, 8) || 'PILOT';

// A DOS file name for your handle. If somebody else's cleans to the same name, both of you get your
// PC number on the end so nobody is mistaken for a pilot who rejoined.
export function pilotName(handle, others = [], pcIndex = 0) {
  const base = clean(handle);
  if (!others.some((o) => clean(o) === base)) return base;
  return base.slice(0, 7) + String((pcIndex | 0) % 9 + 1);
}

// DESCENT.CFG as the game writes it once a pilot has been made, with that pilot as the last one used.
export function descentConfig(pilot) {
  return [
    'DigiDeviceID=0xe000', 'DigiPort=0x220', 'DigiIrq=7', 'DigiDma=1', 'DigiVolume=8',
    'MidiDeviceID=0xa002', 'MidiPort=0x388', 'MidiVolume=8',
    'StereoReverse=0', 'GammaLevel=0', 'DetailLevel=4',
    'JoystickMin=0,0,0,0', 'JoystickCen=0,0,0,0', 'JoystickMax=0,0,0,0',
    `LastPlayer=${String(pilot).toLowerCase()}`,
  ].join('\r\n') + '\r\n';
}
