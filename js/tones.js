// The noises of a phone call as plain data, with no audio code, so `node tools/phone.test.mjs` can check them.
// A plan is { segments: [{ at, dur, freqs, vol }], duration }: play each frequency in `freqs` together, `at` seconds
// in, for `dur` seconds. js/sfx.js turns a plan into sound. The tones are the Australian ones the basement hears:
// a 425 Hz dial tone, two-tone ring-back (two rings, a gap, two rings) and a 425 Hz engaged tone.

// DTMF: every key is one low and one high tone at the same time
export const ROWS = [697, 770, 852, 941];
export const COLS = [1209, 1336, 1477];
export const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '*', '0', '#'];
export const dtmf = (key) => {
  const i = KEYS.indexOf(key);
  return i < 0 ? null : [ROWS[Math.floor(i / 3)], COLS[i % 3]];
};

export const DIAL_HZ = 425;
export const RING_HZ = [400, 450];
export const RING_BEAT = { on: 0.4, off: 0.2, gap: 0.6, pickup: 0.3 }; // brr-brr, a pause, brr-brr, then somebody picks up
export const DIGIT = { on: 0.1, off: 0.06 };             // a dialled digit and the gap after it
export const ENGAGED = { on: 0.375, off: 0.375, beeps: 4 };

// What somebody dialling a number sounds like: the digits (if you dial on a handset with a keypad that sings),
// a short silence, then the ring-back. dialTone puts a stretch of dial tone in front.
export function callPlan(number, { digits = true, dialTone = 0, rings = 2 } = {}) {
  const segments = [];
  let t = 0;
  if (dialTone > 0) { segments.push({ at: t, dur: dialTone, freqs: [DIAL_HZ], vol: 0.5 }); t += dialTone; }
  if (digits) {
    for (const ch of String(number)) {
      const f = dtmf(ch);
      if (!f) continue; // spaces and dashes are not dialled
      segments.push({ at: t, dur: DIGIT.on, freqs: f, vol: 0.5 });
      t += DIGIT.on + DIGIT.off;
    }
    t += 0.3; // the exchange thinks about it
  }
  for (let r = 0; r < rings; r++) {
    for (let b = 0; b < 2; b++) {
      segments.push({ at: t, dur: RING_BEAT.on, freqs: RING_HZ, vol: 0.4 });
      t += RING_BEAT.on + (b === 0 ? RING_BEAT.off : 0);
    }
    t += r < rings - 1 ? RING_BEAT.gap : RING_BEAT.pickup;
  }
  return { segments, duration: t };
}

// the number is busy, or there is no such number: beep, beep, beep
export function engagedPlan() {
  const segments = [];
  let t = 0;
  for (let i = 0; i < ENGAGED.beeps; i++) {
    segments.push({ at: t, dur: ENGAGED.on, freqs: [DIAL_HZ], vol: 0.45 });
    t += ENGAGED.on + ENGAGED.off;
  }
  return { segments, duration: t };
}
