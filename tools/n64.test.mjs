// Tests for js/n64-term.js (the console's terminal) and the DOM-free parts of js/n64-roms.js.
// Run: node tools/n64.test.mjs
import assert from 'node:assert/strict';
import { Terminal, wrap, sizeText, COLS, ROWS, PAGE, PROMPT, KEYS } from '../js/n64-term.js';
import { isRom, makeRom, mergeRoms, walkDirectory, fromFileList, ROM_EXT, MAX_ROM_BYTES } from '../js/n64-roms.js';

let n = 0;
const test = (name, fn) => { fn(); n++; console.log(`ok  ${name}`); };
const atest = async (name, fn) => { await fn(); n++; console.log(`ok  ${name}`); };

const rom = (path, size = 8 * 1048576) => ({ id: `${path}|${size}`, name: path.split('/').pop(), path, size, file: { size } });
const type = (t, text) => { for (const ch of text) t.type(ch); };
const say = (t, text) => { type(t, text); return t.submit(); };
const screen = (t) => t.lines.map((l) => l.text).join('\n');

test('wrap keeps every line within the glass and breaks on spaces', () => {
  const lines = wrap('word '.repeat(40).trim(), 20);
  assert.ok(lines.every((l) => l.length <= 20));
  assert.equal(lines.join(' '), 'word '.repeat(40).trim());
  assert.deepEqual(wrap('a\n\nb', 10), ['a', '', 'b']);
  assert.equal(wrap('x'.repeat(25), 10).length, 3, 'a word longer than a line is cut');
});

test('sizes read like a directory listing', () => {
  assert.equal(sizeText(8 * 1048576), '8.0 MB');
  assert.equal(sizeText(512 * 1024), '512 KB');
  assert.equal(sizeText(1048576), '1.0 MB');
  assert.equal(sizeText(300), '1 KB');
});

test('the banner says how to bring cartridges when there are none', () => {
  const t = new Terminal();
  t.banner();
  assert.match(screen(t), /CONSOLE BIOS/);
  assert.match(screen(t), /No cartridges\. Bring your own: OPEN/);
  assert.ok(t.lines.every((l) => l.text.length <= COLS));
});

test('typing builds the input line; backspace and the limit work', () => {
  const t = new Terminal();
  type(t, 'dir');
  assert.equal(t.input, 'dir');
  t.backspace();
  assert.equal(t.input, 'di');
  type(t, 'x'.repeat(100));
  assert.ok(t.input.length <= 48);
  t.clearInput();
  t.type('\n'); t.type('ab'); t.type('\x7f');
  assert.equal(t.input, '', 'control characters and multi-character strings are ignored');
});

test('commands that the host has to carry out come back as actions', () => {
  const t = new Terminal();
  const act = (c) => say(t, c)?.type;
  assert.equal(act('open'), 'open-folder');
  assert.equal(act('OPEN'), 'open-folder');
  assert.equal(act('add'), 'open-files');
  assert.equal(act('rescan'), 'rescan');
  assert.equal(act('forget'), 'forget');
  assert.equal(act('eject'), 'eject');
  assert.equal(act('reset'), 'reset');
  assert.equal(act('save'), 'save');
  assert.equal(act('restore'), 'restore');
  assert.equal(act('resume'), 'resume');
  assert.equal(act('exit'), 'stand');
});

test('what the terminal can answer itself it answers, and the typed line is echoed', () => {
  const t = new Terminal();
  assert.equal(say(t, 'help'), null);
  assert.match(screen(t), new RegExp(`${PROMPT.replace('\\', '\\\\')}help`));
  assert.match(screen(t), /OPEN\s+Pick a folder/);
  say(t, 'ver');
  assert.match(screen(t), /BIOS v1\.0/);
  say(t, 'keys');
  for (const [, k] of KEYS) assert.ok(screen(t).includes(k), `${k} is listed`);
  say(t, 'cls');
  assert.equal(t.lines.length, 0);
  assert.equal(t.input, '');
});

test('nonsense gets the DOS reply', () => {
  const t = new Terminal();
  assert.equal(say(t, 'frobnicate'), null);
  assert.match(screen(t), /Bad command or file name\./);
  assert.equal(t.lines.at(-1).tone, 'error');
  assert.equal(say(t, '   '), null, 'an empty line does nothing');
});

test('DIR lists numbered cartridges, sorted, a page at a time', () => {
  const t = new Terminal();
  t.setRoms(Array.from({ length: 25 }, (_, i) => rom(`Roms/Game ${25 - i}.z64`)));
  say(t, 'dir');
  const out = screen(t);
  assert.match(out, /Directory of C:\\N64/);
  assert.match(out, /1\s+Game 1\s+Z64/, 'natural sort: Game 1 before Game 10');
  assert.ok(!/Game 11\b/.test(out), 'only one page');
  assert.match(out, /25 cartridges, 15 more: MORE/);
  say(t, 'more');
  assert.match(screen(t), /11\s+Game 11/);
  say(t, 'more'); say(t, 'more');
  assert.match(screen(t), /End of the list/);
  assert.ok(t.lines.every((l) => l.text.length <= COLS));
});

test('DIR text narrows the list, and the numbers then refer to the narrowed list', () => {
  const t = new Terminal();
  t.setRoms([rom('a/Racer 64.z64'), rom('a/Fighter.n64'), rom('b/Racer Two.v64')]);
  say(t, 'dir racer');
  assert.match(screen(t), /\(racer\)/);
  const act = say(t, '2');
  assert.equal(act.type, 'play');
  assert.equal(act.rom.name, 'Racer Two.v64');
  assert.equal(say(t, 'dir nothinglikethis'), null);
  assert.match(screen(t), /File not found: nothinglikethis/);
});

test('PLAY takes a number or a name; a bare name or number runs it too', () => {
  const t = new Terminal();
  t.setRoms([rom('Kart Dash.z64'), rom('Kart Dash Extra.z64'), rom('Pilot Wings.n64')]);
  assert.equal(say(t, 'play 3').rom.name, 'Pilot Wings.n64');
  assert.equal(say(t, 'run pilot').rom.name, 'Pilot Wings.n64');
  assert.equal(say(t, 'kart dash').rom.name, 'Kart Dash.z64', 'an exact name wins over a longer one');
  assert.equal(say(t, 'wings').rom.name, 'Pilot Wings.n64', 'typing a file name runs it');
  assert.equal(say(t, '1').rom.name, 'Kart Dash Extra.z64', 'numbers follow the sorted list');
  assert.equal(say(t, 'play kart'), null);
  assert.match(screen(t), /2 cartridges match/);
  assert.equal(say(t, 'play 99'), null);
  assert.match(screen(t), /File not found: 99/);
  assert.equal(say(t, 'play'), null);
  assert.match(screen(t), /Required parameter missing/);
});

test('with no cartridges, PLAY says so rather than inventing one', () => {
  const t = new Terminal();
  assert.equal(say(t, 'play 1'), null);
  assert.match(screen(t), /No cartridges\. OPEN picks a folder/);
  assert.equal(say(t, '1'), null);
  assert.match(screen(t), /Bad command or file name/);
});

test('history recalls what you typed, newest first', () => {
  const t = new Terminal();
  say(t, 'dir'); say(t, 'help'); say(t, 'ver');
  t.older(); assert.equal(t.input, 'ver');
  t.older(); assert.equal(t.input, 'help');
  t.older(); t.older(); assert.equal(t.input, 'dir');
  t.newer(); assert.equal(t.input, 'help');
  t.newer(); t.newer(); assert.equal(t.input, '');
});

test('the glass shows ROWS-1 lines above the prompt and can scroll back', () => {
  const t = new Terminal();
  for (let i = 0; i < 60; i++) t.print(`line ${i}`);
  assert.equal(t.visible().length, ROWS - 1);
  assert.equal(t.visible().at(-1).text, 'line 59');
  t.scrollBy(10);
  assert.equal(t.visible().at(-1).text, 'line 49');
  t.scrollBy(1000);
  assert.equal(t.visible()[0].text, 'line 0');
  t.print('new'); // new output snaps back to the bottom
  assert.equal(t.visible().at(-1).text, 'new');
});

test('scrollback is capped so a long night cannot grow without bound', () => {
  const t = new Terminal();
  for (let i = 0; i < 1000; i++) t.print(`x${i}`);
  assert.ok(t.lines.length <= 200);
});

test('typing is ignored while something is loading', () => {
  const t = new Terminal();
  t.busy = 'Download Game Core 40%';
  t.type('a');
  assert.equal(t.input, '');
});

test('ROM file names are recognised by extension, any case', () => {
  for (const ok of ['a.z64', 'A.N64', 'x.v64', 'b.ZIP', 'c.7z']) assert.ok(isRom(ok), ok);
  for (const no of ['a.txt', 'a.mp3', 'z64', 'a.z64.bak', 'readme', 'a.iso']) assert.ok(!isRom(no), no);
  assert.ok(ROM_EXT.test('Game (USA).z64'));
});

test('a cartridge remembers its path and size, and the same file is only added once', () => {
  const a = makeRom({ file: { size: 100 }, path: 'Roms/N64/Game.z64' });
  assert.equal(a.name, 'Game.z64');
  assert.equal(a.size, 100);
  const again = makeRom({ file: { size: 100 }, path: 'Roms/N64/Game.z64' });
  const other = makeRom({ file: { size: 101 }, path: 'Roms/N64/Game.z64' });
  const merged = mergeRoms([a], [again, other]);
  assert.equal(merged.length, 2);
});

test('files from an <input> keep only ROMs of a sane size, with their folder path', () => {
  const f = (name, size, rel = '') => ({ name, size, webkitRelativePath: rel });
  const out = fromFileList([f('a.z64', 10, 'Roms/a.z64'), f('b.txt', 10), f('empty.z64', 0), f('huge.z64', MAX_ROM_BYTES + 1), f('c.zip', 5)]);
  assert.deepEqual(out.map((o) => o.path), ['Roms/a.z64', 'c.zip']);
});

await atest('walking a picked folder finds ROMs in sub-folders and skips what it cannot open', async () => {
  const file = (name, size = 4) => ({ kind: 'file', name, getFile: async () => ({ name, size }) });
  const dir = (name, entries) => ({ kind: 'directory', name, values: async function* () { yield* entries; } });
  const locked = { kind: 'directory', name: 'Locked', values() { throw new Error('denied'); } };
  const root = dir('Roms', [file('a.z64'), file('notes.txt'), dir('Racing', [file('b.n64'), file('c.v64')]), dir('.git', [file('x.z64')]), locked, { kind: 'file', name: 'gone.z64', getFile: async () => { throw new Error('gone'); } }]);
  const found = await walkDirectory(root);
  assert.deepEqual(found.map((f) => f.path).sort(), ['Roms/Racing/b.n64', 'Roms/Racing/c.v64', 'Roms/a.z64']);
});

console.log(`\n${n} passed`);
