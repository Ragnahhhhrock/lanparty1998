// Runs inside vendor/emulatorjs/amiga.html: the Amiga core (EmulatorJS + PUAE, pinned in vendor/emulatorjs, see
// its SOURCES.md) behind a small API on window.amiga. js/amiga.js owns the iframe. Everything is served from this
// site: no CDN, and no Kickstart ROM, because PUAE carries the open-source AROS replacement inside it.
// The disk is a File or bytes handed over by the parent page; it is read in the browser and never uploaded.

const DATA = new URL('data/', document.baseURI).href;
const SCRIPTS = ['emulator.js', 'nipplejs.js', 'shaders.js', 'storage.js', 'gamepad.js', 'GameManager.js', 'socket.io.min.js', 'compression.js'];

// The core draws with WebGL, and the room reads those pixels every frame (they are the monitor's picture),
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
  // what EmulatorJS says while it is busy ("Download Game Core 43%")
  get progress() { return ejs?.textElem?.innerText ?? ''; },
  get canvas() { return state === 'running' ? ejs.canvas : null; },
  get _ejs() { return ejs; },

  // disk is a File or bytes from the parent page. EmulatorJS tests `instanceof File` against this window's File,
  // so it is rewrapped here.
  async start(disk, name, title, options = {}) {
    if (state !== 'idle') throw new Error('a disk is already in');
    state = 'loading';
    try {
      await loadEmulator();
      const file = new File([disk], name);
      ejs = new window.EmulatorJS('#ejs', {
        gameUrl: file,
        gameName: title,
        dataPath: DATA,
        system: 'amiga',
        startOnLoad: true,
        noAutoFocus: true,           // keys come from the room (key() below), not from this frame's focus
        disableDatabases: true,      // don't keep copies of disks or cores in IndexedDB
        disableLocalStorage: true,
        threads: false,              // threaded cores need cross-origin isolation headers
        volume: 0.5,
        defaultOptions: {
          puae_kickstart: 'aros',    // the built-in open-source Kickstart replacement: no ROM file to ship
          puae_model: 'A500',        // 68000, 512 KB chip + 512 KB slow, OCS, Kickstart 1.3 era
          puae_floppy_sound: '0',        // no drive clicks
          keyboardInput: 'enabled',  // the real keyboard, not a joystick
          ...options,
        },
      });
      await new Promise((ok, no) => {
        const watchdog = setTimeout(() => { clearInterval(poll); no(new Error('Timed out waiting for the disk')); }, 120000);
        const poll = setInterval(() => {
          if (ejs.failedToStart) { clearInterval(poll); clearTimeout(watchdog); no(new Error(ejs.textElem?.innerText || 'Bad disk')); }
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
  // run the emulated machine as fast as the browser allows (the boot is 25 seconds of nothing much)
  fastForward(on) {
    if (state !== 'running') return;
    const gm = ejs.gameManager;
    gm.setFastForwardRatio(0);
    gm.toggleFastForward(on ? 1 : 0);
  },
  setVolume(v) { if (state === 'running') ejs.setVolume(Math.max(0, Math.min(1, v))); },
  // browsers keep audio suspended until somebody has touched the page; the room calls this on every key press
  resumeAudio() { try { ejs?.Module?.AL?.currentCtx?.audioCtx?.resume?.(); } catch { /* no audio yet */ } },

  // a key from the room: the core's own keyboard driver listens to this window's key events
  key(type, init) {
    if (state !== 'running') return;
    const ev = new KeyboardEvent(type, { ...init, bubbles: true, cancelable: true });
    document.dispatchEvent(ev);
    ejs.elements.parent.dispatchEvent(new KeyboardEvent(type, { ...init, bubbles: true, cancelable: true }));
  },
};

window.amiga = api;
