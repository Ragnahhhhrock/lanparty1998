// What the regulars sound like. Their noises (burps, farts, snickers) play when you're within
// earshot, quieter the further away they are. Their typed lines are text only: the browser's
// speech voices are not used. No audio files.
import * as sfx from './sfx.js';

const LOOK = { // pitch of each person's noises
  'k-rad': { pitch: 1.2 },
  'xx_ghoul_xx': { pitch: 0.45 },
  phatbass: { pitch: 0.75 },
  n00bslayer: { pitch: 1.75 },
  macca: { pitch: 0.95 },
  dazza: { pitch: 0.85 },
};
const EARSHOT = 9;     // metres; past this you can't hear them

let on = true;

export const isOn = () => on;
export function toggle() {
  on = !on;
  return on;
}

// nick said text (fx: a noise to make), and they're `dist` metres from you
export function hear(nick, text, fx, dist) {
  if (!on || !fx) return;
  const vol = Math.max(0, 1 - dist / EARSHOT);
  if (vol < 0.12) return;
  const look = LOOK[nick.toLowerCase()] ?? { pitch: 1 };
  (fx === 'laugh' ? sfx.snicker : sfx[fx])?.(vol, Math.min(1.3, Math.max(0.7, look.pitch)));
}
