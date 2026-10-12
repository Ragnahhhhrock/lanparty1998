// Runs inside vendor/emulatorjs/frame.html: the N64 core (EmulatorJS + mupen64plus, pinned in
// vendor/emulatorjs, see its SOURCES.md) behind a small API on window.n64. js/n64.js owns the iframe.
// Everything is served from this site: no CDN, no ROMs. The cartridge is a File the player picked
// from their own drive; it is read in the browser and never uploaded.

const DATA = new URL('data/', document.baseURI).href;
const SCRIPTS = ['emulator.js', 'nipplejs.js', 'shaders.js', 'storage.js', 'gamepad.js', 'GameManager.js', 'socket.io.min.js', 'compression.js'];

// The core draws with WebGL, and the room reads those pixels every frame (they are the TV's picture),
// so the drawing buffer has to survive between frames.
const getContext = HTMLCanvasElement.prototype.getContext;
HTMLCanvasElement.prototype.getContext = function (type, attrs) {
  return getContext.call(this, type, /^webgl/.test(type) ? { ...attrs, preserveDrawingBuffer: true } : attrs);
};

const loadScript = (src) => new Promise((ok, no) => {
  const s = document.createElement('script');
  s.src = src;
  s.onload = ok;
  s.onerror = () => no(new Error(`couldn't fetch ${src}`));
  document.head.appendChild(s);
});

let loaded = null;
const loadEmulator = () => (loaded ??= (async () => { for (const f of SCRIPTS) await loadScript(`${DATA}src/${f}`); })());

let ejs = null;
let state = 'idle'; // idle | loading | running | error
let failure = '';

const api = {
  get state() { return state; },
  get failure() { return failure; },
  // what EmulatorJS says while it is busy ("Download Game Core 43%"), for the terminal's status line
  get progress() { return ejs?.textElem?.innerText ?? ''; },
  get canvas() { return state === 'running' ? ejs.canvas : null; },

  // rom is a File from the parent page. EmulatorJS tests `instanceof File` against this window's File,
  // so it is rewrapped here.
  async start(rom, title) {
    if (state !== 'idle') throw new Error('a cartridge is already in');
    state = 'loading';
    try {
      await loadEmulator();
      const file = new File([rom], rom.name);
      ejs = new window.EmulatorJS('#ejs', {
        gameUrl: file,
        gameName: title,
        dataPath: DATA,
        system: 'n64',
        startOnLoad: true,
        noAutoFocus: true,           // keys come from the room (key() below), not from this frame's focus
        disableDatabases: true,      // don't keep copies of ROMs or cores in IndexedDB
        disableLocalStorage: true,
        threads: false,              // threaded cores need cross-origin isolation headers
        volume: 0.5,
        defaultOptions: { 'mupen64plus-43screensize': '640x480' },
      });
      await new Promise((ok, no) => {
        const watchdog = setTimeout(() => { clearInterval(poll); no(new Error('Timed out waiting for the cartridge')); }, 120000);
        const poll = setInterval(() => {
          if (ejs.failedToStart) { clearInterval(poll); clearTimeout(watchdog); no(new Error(ejs.textElem?.innerText || 'Bad cartridge')); }
        }, 200);
        ejs.on('start', () => { clearInterval(poll); clearTimeout(watchdog); ok(); });
      });
      state = 'running';
    } catch (err) {
      state = 'error';
      failure = String(err.message || err).replace(/\s+/g, ' ').slice(0, 120);
      throw err;
    }
  },

  pause() { if (state === 'running') ejs.pause(true); },
  resume() { if (state === 'running') ejs.play(true); },
  get paused() { return state === 'running' ? ejs.paused : false; },
  reset() { if (state === 'running') ejs.gameManager.restart(); },
  setVolume(v) { if (state === 'running') ejs.setVolume(Math.max(0, Math.min(1, v))); },
  // browsers keep audio suspended until somebody has touched the page; the room calls this on every key press
  resumeAudio() { try { ejs?.Module?.AL?.currentCtx?.audioCtx?.resume?.(); } catch { /* no audio yet */ } },

  // a key from the room: type is 'keydown' or 'keyup', code is the legacy keyCode EmulatorJS maps
  key(type, keyCode, repeat) {
    if (state === 'running') ejs.keyChange({ type, keyCode, repeat, preventDefault() {} });
  },

  // the one save-state slot, kept in this browser's own storage under the cartridge's name
  async save() {
    if (state !== 'running') return false;
    try {
      await ejs.storage.states.put(`${ejs.getBaseFileName()}.state`, ejs.gameManager.getState());
      return true;
    } catch { return false; }
  },
  async load() {
    if (state !== 'running') return false;
    const data = await ejs.storage.states.get(`${ejs.getBaseFileName()}.state`);
    if (!data) return false;
    ejs.gameManager.loadState(data);
    return true;
  },
};

window.n64 = api;
