// Tiny synthesised sound kit: fluorescent hum, can fizz, chip crunch. No audio files.
let ctx, master;

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

function burst(start, dur, freq, q, vol, type = 'bandpass') {
  const src = noiseSource(dur + 0.1, false);
  const f = ctx.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q;
  const g = ctx.createGain();
  g.gain.setValueAtTime(0, start);
  g.gain.linearRampToValueAtTime(vol, start + 0.01);
  g.gain.exponentialRampToValueAtTime(0.001, start + dur);
  src.connect(f).connect(g).connect(master);
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
