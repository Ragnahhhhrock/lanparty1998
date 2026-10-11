// LANamp: the music player window. Draws the playlist, the clock and the spectrum for a Player (music.js).
import { TRACKS, fmtTime } from './music.js';

export function initLanamp(root, player) {
  const $ = (id) => root.querySelector(id);
  const time = $('#amp-time'), song = $('#amp-song'), genre = $('#amp-genre'), list = $('#amp-list');
  const canvas = $('#amp-vis'), g = canvas.getContext('2d');
  const css = getComputedStyle(document.documentElement);
  const colour = (n) => css.getPropertyValue(n).trim() || '#9dff7a';
  const green = colour('--phosphor'), amber = colour('--amber'), black = colour('--crt-black');

  list.replaceChildren(...TRACKS.map((t, i) => {
    const li = document.createElement('li');
    li.textContent = `${t.artist} - ${t.title} (${fmtTime(t.seconds)})`;
    li.addEventListener('click', () => player.play(i));
    return li;
  }));
  const show = () => {
    const t = player.track;
    song.textContent = `${player.index + 1}. ${t.artist} - ${t.title} (${fmtTime(t.seconds)}) ***`;
    genre.textContent = `${t.genre.toUpperCase()} ${t.bpm}BPM`;
    [...list.children].forEach((li, i) => li.classList.toggle('now', i === player.index));
  };
  player.addEventListener('track', show);
  show();

  $('#amp-prev').addEventListener('click', () => player.skip(-1));
  $('#amp-next').addEventListener('click', () => player.skip(1));
  $('#amp-play').addEventListener('click', () => player.play());
  $('#amp-pause').addEventListener('click', () => player.pause());
  $('#amp-stop').addEventListener('click', () => player.stop());
  const flag = (id, key) => $(id).addEventListener('click', (e) => { player[key] = !player[key]; e.currentTarget.setAttribute('aria-pressed', player[key]); });
  flag('#amp-shuffle', 'shuffle'); flag('#amp-repeat', 'repeat');
  $('#amp-vol').addEventListener('input', (e) => player.setVolume(e.target.value / 100));
  player.setVolume(0.6);

  let acc = 0;
  return {
    // called every frame; redraws about 15 times a second
    update(dt) {
      acc += dt;
      if (acc < 1 / 15 || root.classList.contains('off')) return;
      acc = 0;
      time.textContent = fmtTime(player.elapsed);
      g.fillStyle = black; g.fillRect(0, 0, canvas.width, canvas.height);
      const f = player.state === 'playing' ? player.spectrum() : null;
      for (let i = 0; i < 19; i++) {
        const v = f ? f[1 + i * 2] / 255 : 0, h = Math.max(1, Math.round(v * canvas.height));
        g.fillStyle = v > 0.8 ? amber : green;
        g.fillRect(i * 4, canvas.height - h, 3, h);
      }
    },
    keys: { KeyZ: () => player.skip(-1), KeyX: () => player.play(), KeyC: () => player.pause(), KeyV: () => player.stop(), KeyB: () => player.skip(1) },
  };
}
