// Share buttons on the intro window. The network links are plain anchors in index.html
// (they work with no JS); this adds Copy link, the native share sheet where there is one,
// and analytics. Everything is a no-op if the elements are missing.
import { track } from './analytics.js';

const URL_ = 'https://lanparty1998.com/';
const TITLE = "LAN Party '98";
const TEXT = 'Walk into a 1998 basement LAN party in your browser.';

export function initShare() {
  const root = document.getElementById('share');
  if (!root) return;
  const status = document.getElementById('share-status');
  const say = (msg) => { if (status) status.textContent = msg; };

  root.addEventListener('click', (e) => {
    const a = e.target.closest('a[data-network]');
    if (a) track('share', { method: a.dataset.network, content_type: 'site', item_id: URL_ });
  });

  const copy = document.getElementById('share-copy');
  copy?.addEventListener('click', async () => {
    let ok = false;
    try { await navigator.clipboard.writeText(URL_); ok = true; } catch {
      // Clipboard API blocked (older browser, insecure context): fall back to a hidden textarea.
      const t = document.createElement('textarea');
      t.value = URL_; t.setAttribute('readonly', ''); t.style.position = 'fixed'; t.style.opacity = '0';
      document.body.appendChild(t); t.select();
      try { ok = document.execCommand('copy'); } catch { ok = false; }
      t.remove();
    }
    say(ok ? 'Link copied.' : 'Bad command or file name.');
    if (ok) track('share', { method: 'copy_link', content_type: 'site', item_id: URL_ });
  });

  const native = document.getElementById('share-native');
  if (native && typeof navigator.share === 'function') {
    native.hidden = false;
    native.addEventListener('click', async () => {
      try {
        await navigator.share({ title: TITLE, text: TEXT, url: URL_ });
        track('share', { method: 'native', content_type: 'site', item_id: URL_ });
      } catch { /* dismissed */ }
    });
  }
}
