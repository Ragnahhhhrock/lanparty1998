// Tiny synthesised sound kit: fluorescent hum, can fizz, chip crunch. No audio files.
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
function bus(vol) {
  const g = ctx.createGain();
  g.gain.value = vol;
  g.connect(master);
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
