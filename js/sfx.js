// Tiny synthesised sound kit: fluorescent hum, can fizz, chip crunch. No audio files.
import { callPlan, engagedPlan, dtmf, DIAL_HZ } from './tones.js';

let ctx, master;

export const audioContext = () => ctx;

export function startAudio() {
  if (ctx) { ctx.resume(); return; }
  try {
    ctx = new AudioContext();
  } catch { return; }
  master = ctx.createGain();
  master.gain.value = 0.5;
  master.connect(ctx.destination);

  // 50 Hz mains hum + a couple of PC fans
  const hum = ctx.createOscillator(); hum.frequency.value = 100; hum.type = 'sine';
  const humGain = ctx.createGain(); humGain.gain.value = 0.012;
  hum.connect(humGain).connect(master); hum.start();
  const fans = noiseSource(); const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 380;
  const fanGain = ctx.createGain(); fanGain.gain.value = 0.05;
  fans.connect(lp).connect(fanGain).connect(master); fans.start();
}

function noiseSource(seconds = 2, loop = true) {
  const buf = ctx.createBuffer(1, ctx.sampleRate * seconds, ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  const src = ctx.createBufferSource(); src.buffer = buf; src.loop = loop;
  return src;
}

function burst(start, dur, freq, q, vol, type = 'bandpass', dest = master) {
  const src = noiseSource(dur + 0.1, false);
  const f = ctx.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q;
  const g = ctx.createGain();
  g.gain.setValueAtTime(0, start);
  g.gain.linearRampToValueAtTime(vol, start + 0.01);
  g.gain.exponentialRampToValueAtTime(0.001, start + dur);
  src.connect(f).connect(g).connect(dest);
  src.start(start); src.stop(start + dur + 0.05);
}

export function fizz() {
  if (!ctx) return;
  const t = ctx.currentTime;
  burst(t, 0.08, 2500, 1.5, 0.6);        // the crack
  burst(t + 0.05, 1.1, 6000, 0.7, 0.25, 'highpass'); // the hiss
}

// a shin meeting a cable: a low thump and a rattle of plastic
export function thud() {
  if (!ctx) return;
  const t = ctx.currentTime;
  burst(t, 0.22, 140, 1.1, 1.0, 'lowpass');
  burst(t + 0.04, 0.12, 900, 1.2, 0.35);
}

// the light switch: a click, then the tubes ticking and catching (on) or going quiet (off)
export function lightSwitch(on) {
  if (!ctx) return;
  const t = ctx.currentTime;
  burst(t, 0.03, 2200, 2, 0.6);
  if (on) for (let i = 0; i < 4; i++) burst(t + 0.12 + i * 0.07 + Math.random() * 0.03, 0.025, 3000 + i * 400, 3, 0.25);
  else burst(t + 0.05, 0.12, 400, 1, 0.15, 'lowpass');
}

// a lead going into a socket (on) or coming out of it (off): a short click and a plastic scrape
export function plug(on = true) {
  if (!ctx) return;
  const t = ctx.currentTime;
  burst(t, 0.04, on ? 1500 : 900, 2, 0.5);
  burst(t + 0.03, 0.05, on ? 600 : 1200, 1.5, 0.3, 'lowpass');
}

// the power going out of some of the boxes: a thump and everything winding down
export function powerCut() {
  if (!ctx) return;
  const t = ctx.currentTime;
  burst(t, 0.1, 220, 1, 0.8, 'lowpass');
  burst(t + 0.02, 0.5, 120, 1, 0.5, 'lowpass');
}

// the power coming back: the POST beep, once
export function postBeep() {
  if (!ctx) return;
  const t = ctx.currentTime;
  const o = ctx.createOscillator(), g = ctx.createGain();
  o.type = 'square'; o.frequency.value = 1000;
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.12, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.18);
  o.connect(g); g.connect(ctx.destination);
  o.start(t); o.stop(t + 0.2);
}

// a basement door: a long dry creak, then the latch
export function door() {
  if (!ctx) return;
  const t = ctx.currentTime;
  for (let i = 0; i < 5; i++) burst(t + i * 0.09, 0.12, 380 + i * 90, 6, 0.3, 'bandpass');
  burst(t + 0.5, 0.05, 1800, 1.5, 0.5);
}

export function crunch() {
  if (!ctx) return;
  const t = ctx.currentTime;
  for (let i = 0; i < 6; i++) burst(t + i * 0.11 + Math.random() * 0.04, 0.07, 1200 + Math.random() * 1800, 0.9, 0.5);
}

/* ---------- the regulars' noises ----------
   All made from oscillators and noise, like everything else. vol is 0..1 (how close they are),
   pitch scales the voice so a bigger bloke is lower. */
function bus(vol, pan = 0) {
  const g = ctx.createGain();
  g.gain.value = vol;
  if (pan && ctx.createStereoPanner) { // -1 is hard left, 1 hard right: which side of the room it comes from
    const p = ctx.createStereoPanner();
    p.pan.value = Math.max(-1, Math.min(1, pan));
    g.connect(p).connect(master);
  } else g.connect(master);
  return g;
}

// air through a tight space: a low buzz that flutters and falls
export function fart(vol = 1, pitch = 1) {
  if (!ctx) return;
  const t = ctx.currentTime, out = bus(vol), len = 0.4 + Math.random() * 0.7;
  const osc = ctx.createOscillator(); osc.type = 'sawtooth';
  osc.frequency.setValueAtTime((90 + Math.random() * 50) * pitch, t);
  osc.frequency.exponentialRampToValueAtTime(45 * pitch, t + len);
  const wobble = ctx.createOscillator(); wobble.frequency.value = 26 + Math.random() * 20;
  const wobbleDepth = ctx.createGain(); wobbleDepth.gain.value = 24 * pitch;
  wobble.connect(wobbleDepth).connect(osc.frequency);
  const sputter = ctx.createOscillator(); sputter.type = 'square'; sputter.frequency.value = 33 + Math.random() * 15;
  const sputterDepth = ctx.createGain(); sputterDepth.gain.value = 0.18;
  const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 560;
  const g = ctx.createGain();
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(0.45, t + 0.03);
  g.gain.setValueAtTime(0.45, t + len * 0.7);
  g.gain.exponentialRampToValueAtTime(0.001, t + len);
  sputter.connect(sputterDepth).connect(g.gain);
  osc.connect(lp).connect(g).connect(out);
  for (const o of [osc, wobble, sputter]) { o.start(t); o.stop(t + len + 0.05); }
  burst(t, len * 0.9, 700, 0.8, 0.1, 'bandpass', out);
}

// a belch: a rough low tone through a throat that opens and closes
export function burp(vol = 1, pitch = 1) {
  if (!ctx) return;
  const t = ctx.currentTime, out = bus(vol), len = 0.7 + Math.random() * 0.7;
  const osc = ctx.createOscillator(); osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(100 * pitch, t);
  osc.frequency.linearRampToValueAtTime(125 * pitch, t + 0.12);
  osc.frequency.exponentialRampToValueAtTime(58 * pitch, t + len);
  const vib = ctx.createOscillator(); vib.frequency.value = 15;
  const vibDepth = ctx.createGain(); vibDepth.gain.value = 7 * pitch;
  vib.connect(vibDepth).connect(osc.frequency);
  const gargle = ctx.createOscillator(); gargle.frequency.value = 22 + Math.random() * 8;
  const gargleDepth = ctx.createGain(); gargleDepth.gain.value = 0.22;
  const g = ctx.createGain();
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(0.5, t + 0.08);
  g.gain.setValueAtTime(0.5, t + len * 0.6);
  g.gain.exponentialRampToValueAtTime(0.001, t + len);
  gargle.connect(gargleDepth).connect(g.gain);
  for (const [f0, f1, q, mix] of [[760, 420, 5, 1], [1350, 800, 6, 0.55]]) { // two formants sliding down
    const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.Q.value = q;
    bp.frequency.setValueAtTime(f0, t); bp.frequency.exponentialRampToValueAtTime(f1, t + len);
    const m = ctx.createGain(); m.gain.value = mix;
    osc.connect(bp).connect(m).connect(g);
  }
  g.connect(out);
  for (const o of [osc, vib, gargle]) { o.start(t); o.stop(t + len + 0.05); }
}

// a snicker: a run of short "heh"s that tail off
export function snicker(vol = 1, pitch = 1) {
  if (!ctx) return;
  const t = ctx.currentTime, out = bus(vol), n = 4 + Math.floor(Math.random() * 3);
  for (let i = 0; i < n; i++) {
    const at = t + i * 0.15, a = 0.4 * (1 - i / (n + 1));
    const osc = ctx.createOscillator(); osc.type = 'sawtooth';
    osc.frequency.setValueAtTime((170 + Math.random() * 25) * pitch, at);
    osc.frequency.exponentialRampToValueAtTime(130 * pitch, at + 0.1);
    const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 950; bp.Q.value = 3;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, at);
    g.gain.linearRampToValueAtTime(a, at + 0.015);
    g.gain.exponentialRampToValueAtTime(0.001, at + 0.1);
    osc.connect(bp).connect(g).connect(out);
    osc.start(at); osc.stop(at + 0.12);
    burst(at, 0.07, 3200, 1, a * 0.4, 'bandpass', out); // the breath
  }
}

// cola up the nose: a wet snort, then a cough
export function snort(vol = 1, pitch = 1) {
  if (!ctx) return;
  const t = ctx.currentTime, out = bus(vol);
  burst(t, 0.16, 520, 1.2, 0.9, 'bandpass', out);
  burst(t + 0.05, 0.3, 2400, 0.8, 0.3, 'highpass', out);
  for (let i = 0; i < 3; i++) {
    const at = t + 0.45 + i * 0.13;
    const osc = ctx.createOscillator(); osc.type = 'sawtooth'; osc.frequency.value = 130 * pitch;
    const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 800; bp.Q.value = 2;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, at); g.gain.linearRampToValueAtTime(0.35, at + 0.01); g.gain.exponentialRampToValueAtTime(0.001, at + 0.09);
    osc.connect(bp).connect(g).connect(out);
    osc.start(at); osc.stop(at + 0.1);
  }
}

/* ---------- what comes out of a PC's speakers ----------
   The noises of a shooter, made from oscillators and noise like everything else (js/gaming.js decides when each
   one plays). vol is 0..1 (how close the PC is), pan -1..1 (which side of you it is), pitch nudges each PC so two
   of them never sound identical. */

// a sine that drops fast: the body of a gunshot or an explosion
function thump(start, dur, f0, f1, vol, dest) {
  const osc = ctx.createOscillator(); osc.type = 'sine';
  osc.frequency.setValueAtTime(f0, start);
  osc.frequency.exponentialRampToValueAtTime(f1, start + dur);
  const g = ctx.createGain();
  g.gain.setValueAtTime(vol, start);
  g.gain.exponentialRampToValueAtTime(0.001, start + dur);
  osc.connect(g).connect(dest);
  osc.start(start); osc.stop(start + dur + 0.02);
}

// a pump shotgun: the blast, the room ringing, then the slide going back and forward
export function shotgun(vol = 1, pan = 0, pitch = 1) {
  if (!ctx) return;
  const t = ctx.currentTime, out = bus(vol, pan);
  burst(t, 0.09, 2600 * pitch, 0.6, 0.9, 'bandpass', out);   // the crack
  burst(t, 0.4, 950 * pitch, 0.5, 0.8, 'lowpass', out);      // the body of it
  burst(t + 0.03, 1.1, 420, 0.4, 0.25, 'lowpass', out);      // the room
  thump(t, 0.3, 160 * pitch, 40, 0.9, out);
  for (const at of [0.62, 0.78]) {                           // ch-chk
    burst(t + at, 0.05, 1200 * pitch, 5, 0.5, 'bandpass', out);
    burst(t + at + 0.015, 0.04, 2400 * pitch, 3, 0.3, 'bandpass', out);
  }
}

// an imp: a raspy scream that starts high and tears downward. len makes it longer (a death rattle) or shorter.
export function impShriek(vol = 1, pan = 0, pitch = 1, len = 0.85) {
  if (!ctx) return;
  const t = ctx.currentTime, out = bus(vol, pan);
  const f0 = 1050 * pitch, f1 = 340 * pitch;
  const voice = (type, ratio, mix) => {
    const osc = ctx.createOscillator(); osc.type = type;
    osc.frequency.setValueAtTime(f0 * 0.75 * ratio, t);
    osc.frequency.exponentialRampToValueAtTime(f0 * ratio, t + 0.08);
    osc.frequency.exponentialRampToValueAtTime(f1 * ratio, t + len);
    const vib = ctx.createOscillator(); vib.frequency.value = 27;
    const vibDepth = ctx.createGain(); vibDepth.gain.value = 34 * pitch * ratio;
    vib.connect(vibDepth).connect(osc.frequency);
    const m = ctx.createGain(); m.gain.value = mix;
    osc.connect(m);
    for (const o of [osc, vib]) { o.start(t); o.stop(t + len + 0.05); }
    return m;
  };
  const g = ctx.createGain();
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(0.5, t + 0.03);
  g.gain.setValueAtTime(0.5, t + len * 0.45);
  g.gain.exponentialRampToValueAtTime(0.001, t + len);
  const gargle = ctx.createOscillator(); gargle.frequency.value = 46;      // the rasp
  const gargleDepth = ctx.createGain(); gargleDepth.gain.value = 0.28;
  gargle.connect(gargleDepth).connect(g.gain);
  gargle.start(t); gargle.stop(t + len + 0.05);
  const throat = [[voice('sawtooth', 1, 1), 1800, 900, 4], [voice('square', 1.51, 0.35), 3000, 1700, 5]];
  for (const [src, a, b, q] of throat) {   // two formants sliding down with the pitch
    const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.Q.value = q;
    bp.frequency.setValueAtTime(a * pitch, t); bp.frequency.exponentialRampToValueAtTime(b * pitch, t + len);
    src.connect(bp).connect(g);
  }
  g.connect(out);
  burst(t, len * 0.8, 4200, 0.8, 0.14, 'bandpass', out);                    // spit and hiss
}

// a chaingun: a run of flat cracks, fast
export function chaingun(vol = 1, pan = 0, pitch = 1, shots = 8) {
  if (!ctx) return;
  const t = ctx.currentTime, out = bus(vol, pan);
  for (let i = 0; i < shots; i++) {
    const at = t + i * 0.085;
    burst(at, 0.07, 1900 * pitch, 0.9, 0.5, 'bandpass', out);
    thump(at, 0.06, 230 * pitch, 90, 0.45, out);
  }
}

// a rocket: the launch whoosh, then the bang and its rumble
export function rocket(vol = 1, pan = 0, pitch = 1) {
  if (!ctx) return;
  const t = ctx.currentTime, out = bus(vol, pan);
  burst(t, 0.5, 700 * pitch, 0.7, 0.45, 'bandpass', out);
  burst(t + 0.55, 1.2, 320, 0.5, 1.0, 'lowpass', out);
  burst(t + 0.56, 0.3, 1800, 0.6, 0.45, 'bandpass', out);
  thump(t + 0.55, 0.9, 100 * pitch, 28, 1.0, out);
}

// picking something up: two quick chirps, the second higher
export function pickup(vol = 1, pan = 0, pitch = 1) {
  if (!ctx) return;
  const t = ctx.currentTime, out = bus(vol, pan);
  [[0, 660], [0.08, 990]].forEach(([at, f]) => {
    const osc = ctx.createOscillator(); osc.type = 'square'; osc.frequency.value = f * pitch;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t + at);
    g.gain.linearRampToValueAtTime(0.16, t + at + 0.008);
    g.gain.exponentialRampToValueAtTime(0.001, t + at + 0.09);
    osc.connect(g).connect(out);
    osc.start(t + at); osc.stop(t + at + 0.1);
  });
}

/* ---------- the phones ----------
   The wall phone and the mobile. The tones themselves (dial tone, keypad, ring-back, engaged) are data in js/tones.js;
   this plays them. Every sound that can go on a while hands back { stop() } so hanging up cuts it off. */
const NO_SOUND = { stop() {} };

// sine tones, together, for a while: a plan from js/tones.js
function playPlan(plan) {
  if (!ctx) return NO_SOUND;
  const t0 = ctx.currentTime + 0.02;
  const out = ctx.createGain(); out.gain.value = 0.5;
  out.connect(master);
  const oscs = [];
  for (const seg of plan.segments) {
    const g = ctx.createGain();
    const a = t0 + seg.at, z = a + seg.dur;
    g.gain.setValueAtTime(0, a);
    g.gain.linearRampToValueAtTime(seg.vol / seg.freqs.length, a + 0.008);
    g.gain.setValueAtTime(seg.vol / seg.freqs.length, z - 0.008);
    g.gain.linearRampToValueAtTime(0, z);
    g.connect(out);
    for (const f of seg.freqs) {
      const o = ctx.createOscillator(); o.type = 'sine'; o.frequency.value = f;
      o.connect(g); o.start(a); o.stop(z + 0.02);
      oscs.push(o);
    }
  }
  return {
    stop() {
      const now = ctx.currentTime;
      out.gain.cancelScheduledValues(now);
      out.gain.setTargetAtTime(0, now, 0.01);
      for (const o of oscs) { try { o.stop(now + 0.05); } catch { /* already finished */ } }
    },
  };
}

// lifting the receiver: the dial tone, a steady 425 Hz, until you dial or put it down
export function dialTone() {
  if (!ctx) return NO_SOUND;
  receiverClick();
  const t = ctx.currentTime + 0.12;
  const o = ctx.createOscillator(); o.type = 'sine'; o.frequency.value = DIAL_HZ;
  const g = ctx.createGain();
  g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.14, t + 0.02);
  o.connect(g).connect(master); o.start(t);
  return {
    stop() {
      const now = ctx.currentTime;
      g.gain.cancelScheduledValues(now);
      g.gain.setTargetAtTime(0, now, 0.01);
      try { o.stop(now + 0.06); } catch { /* already stopped */ }
    },
  };
}

// dialling a number and waiting for it to ring: { stop(), duration } (seconds)
export function dialCall(number, options) {
  const plan = callPlan(number, options);
  return { ...playPlan(plan), duration: plan.duration };
}

// no such number, or it is busy
export function engaged() {
  const plan = engagedPlan();
  return { ...playPlan(plan), duration: plan.duration };
}

// the plastic clunk of a receiver going up or down
export function receiverClick() {
  if (!ctx) return;
  const t = ctx.currentTime;
  burst(t, 0.05, 700, 1.2, 0.7, 'lowpass');
  burst(t + 0.01, 0.03, 2400, 2, 0.3);
}

// a key on the mobile: the keypad beep (the same two tones the wall phone dials with, short and quiet)
export function phoneKey(key = '5') {
  if (!ctx) return;
  const f = dtmf(key) ?? [1000];
  const plan = { segments: [{ at: 0, dur: 0.07, freqs: f, vol: 0.28 }], duration: 0.07 };
  playPlan(plan);
}

// one square-wave blip, like a 1998 phone speaker: for Snake
export function phoneBlip(freq, dur = 0.08, vol = 0.14, at = 0) {
  if (!ctx) return;
  const t = ctx.currentTime + at;
  const o = ctx.createOscillator(); o.type = 'square'; o.frequency.value = freq;
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.005); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(master); o.start(t); o.stop(t + dur + 0.02);
}

// Snake: a chirp for food, a bigger one for the bonus, a falling run when you hit something
export const snakeEat = () => { phoneBlip(880, 0.05); phoneBlip(1320, 0.06, 0.14, 0.05); };
export const snakeBonus = () => [660, 880, 1100, 1320].forEach((f, i) => phoneBlip(f, 0.06, 0.14, i * 0.06));
export const snakeDie = () => [440, 330, 247, 165].forEach((f, i) => phoneBlip(f, 0.14, 0.16, i * 0.14));
export const snakeStart = () => [523, 659, 784].forEach((f, i) => phoneBlip(f, 0.07, 0.12, i * 0.07));
