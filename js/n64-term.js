// The console's terminal: the DOS-style prompt that shows on the TV until a cartridge is running.
// No DOM and no canvas here (js/n64.js draws it), so tools/n64.test.mjs can test it.
//
// You type commands at C:\N64> and press Enter. submit() answers with an action for the host to carry
// out ({ type: 'open-folder' }, { type: 'play', rom } ...) or null when the terminal handled it itself.
// A cartridge is { id, name, path, size } (see js/n64-roms.js).

export const COLS = 64;            // characters across the glass
export const ROWS = 20;            // lines on the glass, the prompt included
export const PROMPT = 'C:\\N64> ';
export const PAGE = 10;            // cartridges per DIR page
const MAX_LINES = 200;
const MAX_INPUT = 48;
const MAX_HISTORY = 20;

export const TONE = { plain: 'plain', head: 'head', dim: 'dim', ok: 'ok', error: 'error' };

const HELP = [
  ['OPEN', 'Pick a folder of ROMs on your drive'],
  ['ADD', 'Pick individual ROM files'],
  ['RESCAN', 'Read the remembered folders again'],
  ['DIR [text]', 'List cartridges, or those matching text'],
  ['MORE', 'Next page of the list'],
  ['PLAY n', 'Run cartridge n, or one matching a name'],
  ['EJECT', 'Take the cartridge out'],
  ['RESET', 'Restart the cartridge'],
  ['SAVE / RESTORE', 'Keep and bring back one saved state'],
  ['KEYS', 'The keyboard layout'],
  ['FORGET', 'Forget the folders and the list'],
  ['CLS', 'Clear the screen'],
  ['EXIT', 'Stand up'],
];

// Keys as EmulatorJS maps them for the N64 by default (see js/n64-frame.js).
export const KEYS = [
  ['Stick', 'T F G H'], ['D-pad', 'Arrow keys'], ['A', 'X'], ['B', 'S'], ['Start', 'Enter'],
  ['Z', 'Tab'], ['L', 'Q'], ['R', 'E'], ['C buttons', 'I J K L'],
];

export const sizeText = (bytes) => (bytes >= 1048576 ? `${(bytes / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`);

// Break text into lines of at most `cols` characters, on spaces where it can.
export function wrap(text, cols = COLS) {
  const out = [];
  for (const raw of String(text).split('\n')) {
    let line = raw;
    if (!line) { out.push(''); continue; }
    while (line.length > cols) {
      let cut = line.lastIndexOf(' ', cols);
      if (cut <= 0) cut = cols;
      out.push(line.slice(0, cut).trimEnd());
      line = line.slice(cut).trimStart();
    }
    out.push(line);
  }
  return out;
}

const clip = (s, n) => (s.length > n ? `${s.slice(0, n - 3)}...` : s);
const shortName = (rom) => rom.name.replace(/\.[^.]+$/, '');
const extOf = (rom) => (rom.name.match(/\.([^.]+)$/)?.[1] ?? '').toUpperCase();

export class Terminal {
  constructor({ cols = COLS } = {}) {
    this.cols = cols;
    this.lines = [];
    this.input = '';
    this.history = [];
    this.recall = -1;
    this.roms = [];
    this.listing = [];     // what DIR last showed, in full: the numbers you type refer to this
    this.page = 0;
    this.title = null;     // the cartridge that is in, or null
    this.folders = 0;      // remembered folders
    this.busy = null;      // a message while something is loading, or null
    this.scroll = 0;       // lines scrolled back from the bottom
  }

  /* ---------- output ---------- */
  print(text = '', tone = TONE.plain) {
    for (const line of wrap(text, this.cols)) this.lines.push({ text: line, tone });
    if (this.lines.length > MAX_LINES) this.lines.splice(0, this.lines.length - MAX_LINES);
    this.scroll = 0;
  }

  banner() {
    this.print('LAN PARTY 98 CONSOLE BIOS  v1.0', TONE.head);
    this.print('64-bit RISC. 4096K RDRAM. Cartridge slot: ' + (this.title ? 'FULL' : 'EMPTY'), TONE.dim);
    this.print();
    if (this.roms.length) this.print(`${this.roms.length} cartridge${this.roms.length === 1 ? '' : 's'} on the shelf. DIR to list them.`);
    else this.print('No cartridges. Bring your own: OPEN picks a folder of ROMs on your drive. HELP lists the rest.');
    if (!this.roms.length && this.folders) this.print(`${this.folders} folder${this.folders === 1 ? '' : 's'} remembered. RESCAN reads them again.`, TONE.dim);
    this.print();
  }

  clear() { this.lines = []; this.scroll = 0; }

  // the lines the glass shows: ROWS - 1 of scrollback, then the prompt
  visible() {
    const room = ROWS - 1;
    const end = this.lines.length - this.scroll;
    return this.lines.slice(Math.max(0, end - room), Math.max(0, end));
  }

  scrollBy(n) {
    const most = Math.max(0, this.lines.length - (ROWS - 1));
    this.scroll = Math.max(0, Math.min(most, this.scroll + n));
  }

  /* ---------- the cartridge list ---------- */
  setRoms(roms) {
    this.roms = [...roms].sort((a, b) => a.path.localeCompare(b.path, undefined, { numeric: true, sensitivity: 'base' }));
    this.listing = [];
    this.page = 0;
  }

  // Which cartridge does `arg` mean: a number from the last list, or a name.
  resolve(arg) {
    const text = String(arg ?? '').trim();
    if (!text) return { none: true };
    if (/^\d+$/.test(text)) {
      const n = Number(text);
      const from = this.listing.length ? this.listing : this.roms;
      return from[n - 1] ? { rom: from[n - 1] } : { none: true };
    }
    const q = text.toLowerCase();
    const exact = this.roms.filter((r) => shortName(r).toLowerCase() === q || r.name.toLowerCase() === q);
    if (exact.length === 1) return { rom: exact[0] };
    const hits = this.roms.filter((r) => r.path.toLowerCase().includes(q));
    if (hits.length === 1) return { rom: hits[0] };
    return hits.length ? { matches: hits } : { none: true };
  }

  dir(filter = '') {
    const q = filter.trim().toLowerCase();
    this.listing = q ? this.roms.filter((r) => r.path.toLowerCase().includes(q)) : this.roms;
    this.page = 0;
    if (!this.roms.length) { this.print('File not found. No cartridges yet: OPEN picks a folder of ROMs.', TONE.error); return; }
    if (!this.listing.length) { this.print(`File not found: ${filter.trim()}`, TONE.error); return; }
    this.print(` Directory of C:\\N64${q ? `  (${filter.trim()})` : ''}`, TONE.head);
    this.showPage();
  }

  showPage() {
    const from = this.page * PAGE;
    const rows = this.listing.slice(from, from + PAGE);
    const nameW = this.cols - 19;
    rows.forEach((r, i) => {
      const n = String(from + i + 1).padStart(3);
      this.print(`${n}  ${clip(shortName(r), nameW).padEnd(nameW)} ${extOf(r).padEnd(3)} ${sizeText(r.size).padStart(8)}`);
    });
    const left = this.listing.length - (from + rows.length);
    this.print(`${this.listing.length} cartridge${this.listing.length === 1 ? '' : 's'}${left > 0 ? `, ${left} more: MORE, or DIR <text> to narrow it` : ''}`, TONE.dim);
  }

  more() {
    if ((this.page + 1) * PAGE >= this.listing.length) { this.print(this.listing.length ? 'End of the list.' : 'Nothing listed yet. DIR first.', TONE.dim); return; }
    this.page++;
    this.showPage();
  }

  /* ---------- typing ---------- */
  type(ch) {
    if (this.busy || ch.length !== 1 || ch < ' ' || ch === '\x7f') return;
    if (this.input.length < MAX_INPUT) this.input += ch;
    this.scroll = 0;
  }
  backspace() { this.input = this.input.slice(0, -1); }
  clearInput() { this.input = ''; this.recall = -1; }
  older() {
    if (!this.history.length) return;
    this.recall = Math.min(this.history.length - 1, this.recall + 1);
    this.input = this.history[this.history.length - 1 - this.recall];
  }
  newer() {
    if (this.recall <= 0) { this.recall = -1; this.input = ''; return; }
    this.recall--;
    this.input = this.history[this.history.length - 1 - this.recall];
  }

  /* ---------- commands ---------- */
  submit() {
    const line = this.input.trim();
    this.print(PROMPT + this.input, TONE.plain);
    this.input = '';
    this.recall = -1;
    if (!line) return null;
    if (this.history[this.history.length - 1] !== line) this.history.push(line);
    if (this.history.length > MAX_HISTORY) this.history.shift();

    const [word, ...rest] = line.split(/\s+/);
    const arg = rest.join(' ');
    const cmd = word.toUpperCase();
    switch (cmd) {
      case 'HELP': case '?': this.help(); return null;
      case 'VER': this.print('LAN Party 98 console BIOS v1.0'); return null;
      case 'CLS': this.clear(); return null;
      case 'DIR': case 'LS': this.dir(arg); return null;
      case 'MORE': this.more(); return null;
      case 'KEYS': case 'CONTROLS': this.keys(); return null;
      case 'OPEN': case 'MOUNT': case 'FOLDER': return { type: 'open-folder' };
      case 'ADD': case 'FILES': return { type: 'open-files' };
      case 'RESCAN': return { type: 'rescan' };
      case 'FORGET': return { type: 'forget' };
      case 'EJECT': case 'QUIT': return { type: 'eject' };
      case 'RESET': return { type: 'reset' };
      case 'SAVE': return { type: 'save' };
      case 'RESTORE': return { type: 'restore' };
      case 'RESUME': return { type: 'resume' };
      case 'EXIT': case 'STAND': return { type: 'stand' };
      case 'PLAY': case 'RUN': case 'LOAD': case 'START':
        if (!arg) { this.print('Required parameter missing. PLAY <number or name>', TONE.error); return null; }
        return this.run(arg);
      default:
        // typing a file name runs it, as in DOS
        if (/^\d+$/.test(line) || this.roms.length) {
          const hit = this.resolve(line);
          if (hit.rom || hit.matches) return this.run(line);
        }
        this.print('Bad command or file name.', TONE.error);
        return null;
    }
  }

  run(arg) {
    const hit = this.resolve(arg);
    if (hit.rom) return { type: 'play', rom: hit.rom };
    if (hit.matches) {
      this.print(`${hit.matches.length} cartridges match. Be more specific, or DIR ${arg} and use a number.`, TONE.error);
      return null;
    }
    this.print(this.roms.length ? `File not found: ${arg}` : 'No cartridges. OPEN picks a folder of ROMs.', TONE.error);
    return null;
  }

  help() {
    const w = Math.max(...HELP.map(([c]) => c.length)) + 2;
    for (const [c, d] of HELP) this.print(`${c.padEnd(w)}${d}`);
    this.print();
    this.print('Esc brings this prompt back while a game is running.', TONE.dim);
  }

  keys() {
    const w = Math.max(...KEYS.map(([a]) => a.length)) + 2;
    for (const [a, k] of KEYS) this.print(`${a.padEnd(w)}${k}`);
    this.print('Esc: this prompt.   `: stand up.', TONE.dim);
  }
}
