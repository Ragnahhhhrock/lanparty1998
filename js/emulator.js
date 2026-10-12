// Wraps js-dos: boots one of the shareware games (js/games.js) on your PC, either solo or as part
// of an IPX deathmatch.
// Game files come from bundles/<game>-shareware.zip (the shareware releases as they were handed
// round). A tiny config bundle (bundles/conf-*.jsdos, built by tools/make-confs.py) supplies
// dosbox.conf, whose autoexec runs the game or its IPX setup.
// Multiplayer uses js-dos's IPX-over-WebRTC: the host runs DOSBox's IPX server and the
// others connect to the host's network peer id (passed around by the room server).

import { gameOf, confName } from './games.js';
import { makeZip } from './zip.js';
import { spectatorWad } from './dm-demos.js';
import { DEMO_FILES } from './spectator-demos.js';

const BUNDLES = new URL('../bundles/', import.meta.url).href;
const EMULATORS = new URL('../vendor/js-dos/emulators/', import.meta.url).href;

// each file is fetched once and kept: sitting down again shouldn't download the game again
const cache = new Map();
function fetchBytes(name) {
  if (!cache.has(name)) {
    const p = fetch(BUNDLES + name).then((r) => {
      if (!r.ok) throw new Error(`couldn't fetch ${name} (${r.status})`);
      return r.arrayBuffer();
    }).then((b) => new Uint8Array(b));
    p.catch(() => cache.delete(name));
    cache.set(name, p);
  }
  return cache.get(name);
}

// Files made on the spot for this player, handed to js-dos after the game's own files.
async function extraFiles(game, opts) {
  if (opts.kind === 'spectate') {   // DOOM's own demo loop, playing our recorded deathmatches through player opts.view's eyes
    const demos = await Promise.all(DEMO_FILES.map(fetchBytes));
    return [makeZip([{ name: 'DEMOS.WAD', data: spectatorWad(demos, opts.view | 0) }])];
  }
  if (!game.pilot) return [];
  const name = opts.pilot || 'PILOT';
  const template = await fetchBytes(game.pilot.template);
  return [makeZip([
    { name: `${name}.${game.pilot.ext}`, data: template },
    { name: 'DESCENT.CFG', data: game.pilot.config(name) },
  ])];
}

export class DosPC {
  constructor(el) {
    this.el = el;
    this.props = null;
    this.running = false;
    this.kind = null;     // 'solo' | 'host' | 'join'
    this.game = null;     // id of the game this PC is running
    this.onReady = null;
    this.booting = null;
  }

  // Start (or resume) a game. opts: { game, kind: 'solo' } | { game, kind: 'host', nodes } | { game, kind: 'join', nodes, peerId }
  // Descent also takes opts.pilot, the pilot name to make.
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
    const game = gameOf(opts.game);
    const [files, extras] = await Promise.all([fetchBytes(game.zip), extraFiles(game, opts)]);
    this.key = key;
    this.kind = opts.kind;
    this.game = game.id;
    this.running = false;
    this.props = window.Dos(this.el, {
      url: BUNDLES + confName(game.id, opts.kind, opts.nodes),
      initFs: extras.length ? [files, ...extras] : files,
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
      onEvent: (event, ci) => {
        if (event === 'ci-ready') {
          this.running = true; this.onReady?.();
          // DOOM stops on "this version has been modified, press enter" because of the demo WAD: press it
          if (opts.kind === 'spectate') setTimeout(() => { try { ci.sendKeyEvent(257, true); setTimeout(() => ci.sendKeyEvent(257, false), 120); } catch { /* gone */ } }, 2500);
        }
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
