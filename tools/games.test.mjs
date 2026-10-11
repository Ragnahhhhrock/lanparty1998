// Tests for js/games.js. Run: node tools/games.test.mjs
// Also checks the catalog against bundles/ and tools/make-confs.py, so a game can't be added to
// one and forgotten in the other.
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { GAMES, GAME_IDS, DEFAULT_GAME, MAX_PLAYERS, gameOf, nextGame, confName, netHint, pilotName, descentConfig } from '../js/games.js';

const bundles = new URL('../bundles/', import.meta.url);
const bytes = (name) => readFileSync(new URL(name, bundles));

let n = 0;
const test = (name, fn) => { fn(); n++; console.log(`ok  ${name}`); };

test('every game has its files and a config for solo and for deathmatch', () => {
  for (const id of GAME_IDS) {
    const g = GAMES[id];
    assert.equal(g.id, id);
    assert.ok(existsSync(new URL(g.zip, bundles)), `${g.zip} is in bundles/`);
    const kinds = [confName(id, 'solo')];
    if (g.net.kind === 'setup') for (let nodes = 2; nodes <= MAX_PLAYERS; nodes++) kinds.push(confName(id, 'host', nodes));
    else kinds.push(confName(id, 'host', 2));
    for (const k of kinds) assert.ok(existsSync(new URL(k, bundles)), `${k} is in bundles/`);
  }
});

test('the configs run what make-confs.py says: the exe for solo, IPXSETUP for deathmatch', () => {
  const py = readFileSync(new URL('../tools/make-confs.py', import.meta.url), 'utf8');
  for (const id of GAME_IDS) {
    const row = py.match(new RegExp(`'${id}':\\s+dict\\(mem=(\\d+), solo='([^']+)',\\s+net=\\('(\\w+)', '([^']+)'\\)\\)`));
    assert.ok(row, `${id} is in GAMES in make-confs.py`);
    assert.equal(row[3], GAMES[id].net.kind, `${id} net kind`);
    assert.ok(bytes(confName(id, 'solo')).includes(`\r\n${row[2]}\r\n`), `${id} solo command`);
    if (row[3] === 'setup') {
      assert.ok(bytes(confName(id, 'host', 3)).includes(row[4].replace('{n}', '3')), `${id} deathmatch command`);
    } else {
      assert.ok(bytes(confName(id, 'host', 3)).includes(`\r\n${row[4]}\r\n`), `${id} lobby command`);
    }
  }
});

test('setup games get a config per player count, clamped to 2..4', () => {
  assert.equal(confName('doom', 'host', 3), 'conf-doom-dm3.jsdos');
  assert.equal(confName('heretic', 'join', 4), 'conf-heretic-dm4.jsdos');
  assert.equal(confName('doom', 'host', 1), 'conf-doom-dm2.jsdos');
  assert.equal(confName('doom', 'host', 9), 'conf-doom-dm4.jsdos');
  assert.equal(confName('doom', 'host', undefined), 'conf-doom-dm2.jsdos');
});

test('lobby games use one config whatever the player count', () => {
  assert.equal(confName('descent', 'host', 2), 'conf-descent-net.jsdos');
  assert.equal(confName('descent', 'join', 4), 'conf-descent-net.jsdos');
  assert.equal(confName('descent', 'solo'), 'conf-descent-solo.jsdos');
});

test('an unknown game falls back to DOOM, which is what an old room server sends', () => {
  assert.equal(gameOf(undefined).id, DEFAULT_GAME);
  assert.equal(gameOf('unreal').id, 'doom');
  assert.equal(confName(undefined, 'solo'), 'conf-doom-solo.jsdos');
});

test('nextGame cycles through every game and comes back', () => {
  let id = GAME_IDS[0];
  const seen = [];
  for (let i = 0; i < GAME_IDS.length; i++) { seen.push(id); id = nextGame(id); }
  assert.deepEqual(seen, GAME_IDS);
  assert.equal(id, GAME_IDS[0]);
  assert.equal(nextGame('nonsense'), GAME_IDS[1]);
});

test('Hexen is a setup game like Heretic and Quake is a lobby game like Descent', () => {
  assert.equal(confName('hexen', 'host', 3), 'conf-hexen-dm3.jsdos');
  assert.equal(confName('quake', 'join', 4), 'conf-quake-net.jsdos');
  assert.match(netHint('quake', 'host'), /NEW GAME/);
  assert.match(netHint('quake', 'join'), /JOIN A GAME/);
});

test('every game the page offers is one the room server will host', () => {
  const server = readFileSync(new URL('../server/src/index.js', import.meta.url), 'utf8');
  const set = server.match(/const GAMES = new Set\(\[([^\]]+)\]\)/)[1].match(/'(\w+)'/g).map((x) => x.slice(1, -1));
  assert.deepEqual([...set].sort(), [...GAME_IDS].sort());
});

test('lobby games tell host and joiners different things; setup games just say it is on', () => {
  assert.match(netHint('descent', 'host'), /START A NETWORK GAME/);
  assert.match(netHint('descent', 'join'), /JOIN A NETWORK GAME/);
  assert.match(netHint('heretic', 'host'), /Deathmatch on/);
});

test('pilot names are DOS file names made from your handle', () => {
  assert.equal(pilotName('FRAGMASTER'), 'FRAGMAST');
  assert.equal(pilotName('xX_Ghoul_Xx'), 'XX_GHOUL');
  assert.equal(pilotName('K-Rad'), 'KRAD');
  assert.equal(pilotName('!!!'), 'PILOT');
  assert.equal(pilotName(''), 'PILOT');
  assert.equal(pilotName(undefined), 'PILOT');
  assert.equal(pilotName('YOU'), 'YOU');
});

test('two handles that clean to the same pilot name get their PC number, so they stay different', () => {
  const a = pilotName('FRAGMASTER', ['FRAGMASTER2'], 0);
  const b = pilotName('FRAGMASTER2', ['FRAGMASTER'], 3);
  assert.equal(a, 'FRAGMAS1');
  assert.equal(b, 'FRAGMAS4');
  assert.notEqual(a, b);
  assert.equal(pilotName('ALICE', ['BOB'], 2), 'ALICE', 'no clash, no change');
  assert.ok(pilotName('FRAGMASTER', ['FRAGMASTER'], 5).length <= 8);
});

test('the Descent config names the pilot you made and keeps CRLF line ends', () => {
  const cfg = descentConfig('FRAGMAST');
  assert.match(cfg, /\r\nLastPlayer=fragmast\r\n$/);
  assert.ok(!/[^\r]\n/.test(cfg), 'no bare newlines');
  assert.match(cfg, /^DigiDeviceID=0xe000\r\n/);
});

test('the Descent pilot template is the 2212 byte file the game writes', () => {
  const plr = bytes(GAMES.descent.pilot.template);
  assert.equal(plr.length, 2212);
  assert.equal(new TextDecoder().decode(plr.subarray(0, 4)), 'RLPD');
});

console.log(`${n} passed`);
