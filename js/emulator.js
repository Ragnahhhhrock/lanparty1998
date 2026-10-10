// Wraps js-dos so your PC can boot DOOM, pause when you stand and resume when you sit.
// Bundle: uses bundles/doom.jsdos if you host one alongside the page, otherwise the public
// shareware bundle from js-dos. Override with ?bundle=<url>.
const REMOTE_BUNDLE = 'https://v8.js-dos.com/bundles/doom.jsdos';
const LOCAL_BUNDLE = 'bundles/doom.jsdos';

async function pickBundle() {
  const param = new URLSearchParams(location.search).get('bundle');
  if (param) return param;
  try {
    const r = await fetch(LOCAL_BUNDLE, { method: 'HEAD' });
    if (r.ok) return LOCAL_BUNDLE;
  } catch { /* fall through */ }
  return REMOTE_BUNDLE;
}

export class DosPC {
  constructor(el) {
    this.el = el;
    this.props = null;
    this.running = false;
    this.onReady = null;
  }

  async boot() {
    if (this.props) { this.props.setPaused(false); return; }
    if (typeof window.Dos !== 'function') throw new Error('js-dos failed to load');
    const url = await pickBundle();
    this.props = window.Dos(this.el, {
      url,
      pathPrefix: new URL('vendor/js-dos/emulators/', location.href).href,
      autoStart: true,
      kiosk: true,
      backend: 'dosbox',
      backendLocked: true,
      renderAspect: '4/3',
      imageRendering: 'pixelated',
      mouseCapture: true,
      theme: 'dark',
      onEvent: (event) => {
        if (event === 'ci-ready') { this.running = true; this.onReady?.(); }
      },
    });
  }

  pause() { this.props?.setPaused(true); }
}
