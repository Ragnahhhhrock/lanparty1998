// Wraps js-dos: boots DOOM shareware on your PC, either solo or as part of an IPX deathmatch.
// Game files come from bundles/doom-shareware.zip (the unmodified shareware release). A tiny
// config bundle (bundles/conf-*.jsdos, built by tools/make-confs.py) supplies dosbox.conf,
// whose autoexec runs DOOM or IPXSETUP.
// Multiplayer uses js-dos's IPX-over-WebRTC: the host runs DOSBox's IPX server and the
// others connect to the host's network peer id (passed around by the room server).

const BUNDLES = new URL('../bundles/', import.meta.url).href;
const GAME_ZIP = BUNDLES + 'doom-shareware.zip';
const EMULATORS = new URL('../vendor/js-dos/emulators/', import.meta.url).href;

let gameFiles = null;
async function loadGame() {
  if (!gameFiles) {
    gameFiles = fetch(GAME_ZIP).then((r) => {
      if (!r.ok) throw new Error(`couldn't fetch DOOM (${r.status})`);
      return r.arrayBuffer();
    }).then((b) => new Uint8Array(b));
    gameFiles.catch(() => { gameFiles = null; });
  }
  return gameFiles;
}

export class DosPC {
  constructor(el) {
    this.el = el;
    this.props = null;
    this.running = false;
    this.kind = null;     // 'solo' | 'host' | 'join'
    this.onReady = null;
    this.booting = null;
  }

  // Start (or resume) DOOM. opts: { kind: 'solo' } | { kind: 'host', nodes } | { kind: 'join', nodes, peerId }
  async boot(opts = { kind: 'solo' }) {
    const key = JSON.stringify(opts);
    if (this.props && this.key === key) { this.props.setPaused(false); return; }
    if (this.booting) await this.booting.catch(() => {});
    if (this.props && this.key === key) { this.props.setPaused(false); return; }
    this.booting = this._boot(opts, key);
    return this.booting;
  }

  async _boot(opts, key) {
    if (typeof window.Dos !== 'function') throw new Error('js-dos failed to load');
    await this.shutdown();
    const files = await loadGame();
    const confBundle = BUNDLES + (opts.kind === 'solo' ? 'conf-solo.jsdos' : `conf-dm${Math.min(4, Math.max(2, opts.nodes))}.jsdos`);
    this.key = key;
    this.kind = opts.kind;
    this.running = false;
    this.props = window.Dos(this.el, {
      url: confBundle,
      initFs: files,
      pathPrefix: EMULATORS,
      autoStart: true,
      kiosk: true,
      backend: 'dosbox',
      backendLocked: true,
      renderAspect: '4/3',
      imageRendering: 'pixelated',
      mouseCapture: true,
      theme: 'dark',
      ...(opts.kind === 'host' ? { startIpxServer: true } : {}),
      ...(opts.kind === 'join' ? { connectIpxAddress: String(opts.peerId) } : {}),
      onEvent: (event) => {
        if (event === 'ci-ready') { this.running = true; this.onReady?.(); }
      },
    });
  }

  // The host's id on the js-dos peer network, once it has one.
  async peerId(timeoutMs = 20000) {
    const end = Date.now() + timeoutMs;
    while (Date.now() < end) {
      const id = window.net?.peerId;
      if (this.running && id) return id;
      await new Promise((r) => setTimeout(r, 200));
    }
    throw new Error('no network id');
  }

  async shutdown() {
    const props = this.props;
    this.props = null;
    this.key = null;
    this.running = false;
    if (props) {
      try { await props.stop(); } catch { /* already gone */ }
    }
    this.el.replaceChildren();
  }

  pause() { this.props?.setPaused(true); }
}
