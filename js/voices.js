// What the regulars say, out loud. Their noises (burps, farts, snickers) always play when you're
// within earshot; about one in three of their ordinary lines is spoken too, using the browser's own
// speech voices at a pitch and speed picked per person. Quieter the further away they are.
// No audio files. If the browser has no speech voices only the noises play.
import * as sfx from './sfx.js';

const LOOK = { // pitch 0..2, rate 0.1..10 for the speech voice
  'k-rad': { pitch: 1.2, rate: 1.1 },
  'xx_ghoul_xx': { pitch: 0.45, rate: 0.85 },
  phatbass: { pitch: 0.75, rate: 1.15 },
  n00bslayer: { pitch: 1.75, rate: 1.2 },
  macca: { pitch: 0.95, rate: 1 },
  dazza: { pitch: 0.85, rate: 1.05 },
};
const EARSHOT = 9;     // metres; past this you can't hear them
const SPOKEN = 0.35;   // chance an ordinary line is spoken
const GAP = 4;         // seconds between spoken lines

let on = true, lastSpoken = -Infinity, voice;
const synth = typeof speechSynthesis !== 'undefined' ? speechSynthesis : null;

export const isOn = () => on;
export function toggle() {
  on = !on;
  if (!on) synth?.cancel();
  return on;
}

// say it the way you'd type it: no nick prefix, no stars, the slang spelt out
function clean(text) {
  return text.replace(/^\S+:\s+/, '').replace(/\*/g, '')
    .replace(/\bur\b/gi, 'your').replace(/\bROFL\b/g, 'roffle').replace(/\blmao\b/gi, 'lemmao')
    .replace(/\b(\d+)ms\b/g, '$1 milliseconds').replace(/\bpc\b/gi, 'P C');
}

function pickVoice() {
  if (voice !== undefined) return voice;
  const all = synth?.getVoices?.() ?? [];
  if (!all.length) return undefined; // not loaded yet: try again next time
  voice = all.find((v) => v.lang === 'en-AU') ?? all.find((v) => v.lang === 'en-GB') ?? all.find((v) => /^en/.test(v.lang)) ?? null;
  return voice;
}

// nick said text (fx: a noise to make), and they're `dist` metres from you
export function hear(nick, text, fx, dist) {
  if (!on) return;
  const vol = Math.max(0, 1 - dist / EARSHOT);
  if (vol < 0.12) return;
  const look = LOOK[nick.toLowerCase()] ?? { pitch: 1, rate: 1 };
  if (fx) { (fx === 'laugh' ? sfx.snicker : sfx[fx])?.(vol, Math.min(1.3, Math.max(0.7, look.pitch))); return; }
  if (text.startsWith('*') || !synth || Math.random() > SPOKEN) return;
  const now = performance.now() / 1000;
  if (now - lastSpoken < GAP || synth.speaking) return;
  lastSpoken = now;
  const u = new SpeechSynthesisUtterance(clean(text));
  u.lang = 'en-AU';
  const v = pickVoice();
  if (v) u.voice = v;
  u.pitch = look.pitch; u.rate = look.rate; u.volume = vol;
  synth.speak(u);
}
