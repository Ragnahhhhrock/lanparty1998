// LANamp's tape: eight original 1990s-style tracks (hip hop, drum and bass, EDM, rock) synthesised live
// in the browser from patterns. No samples, no audio files. Each track is a small config (tempo, key, chord
// progression, lead riff, voices); the sequencer turns it into drums, bass, chords and a lead.
// The track data and timing are DOM-free, so tools/music.test.mjs can check them.
// The Player also plays the visitor's own MP3 files from their drive (see library.js and lanamp.js).

const SCALE = [0, 2, 3, 5, 7, 8, 10]; // natural minor
const hz = (m) => 440 * 2 ** ((m - 69) / 12);
const degree = (d) => SCALE[((d % 7) + 7) % 7] + 12 * Math.floor(d / 7);

// sections are eight bars each, and each one switches layers on and off
const LAYERS = {
  intro: ['hat', 'pad'],
  groove: ['kick', 'snare', 'hat', 'bass'],
  full: ['kick', 'snare', 'hat', 'bass', 'pad', 'lead'],
  break: ['pad', 'lead', 'fx'],
  outro: ['kick', 'hat', 'pad'],
};
const FORMS = {
  short: ['intro', 'groove', 'full', 'break', 'full', 'outro'],
  long: ['intro', 'groove', 'full', 'full', 'break', 'full', 'full', 'outro'],
};

// 16 steps per bar; drums are 'x' (hit), 'o' (soft/open) and '.' (rest)
const DRUMS = {
  hiphop: { kick: ['x.....x..x......', 'x.....x...x.x...'], snare: ['....x.......x..o', '....x.......x...'], hat: ['x.x.x.x.x.x.x.xo'], swing: 0.05 },
  dnb: { kick: ['x.........x.....', 'x.........x...x.'], snare: ['....x.......x...', '....x..o....x..o'], hat: ['x.x.x.x.x.x.x.x.', 'x.xox.x.x.xox.x.'], swing: 0 },
  edm: { kick: ['x...x...x...x...'], snare: ['....x.......x...'], hat: ['..o...o...o...o.'], swing: 0 },
  rock: { kick: ['x.......x.x.....', 'x.....x.x.......'], snare: ['....x.......x...'], hat: ['x.x.x.x.x.x.x.x.'], swing: 0 },
};

export const TRACKS = [
  { title: 'Basement Bounce', artist: 'DJ Dazza', genre: 'hip hop', kind: 'hiphop', bpm: 92, root: 45, prog: [0, 0, 8, 7], voice: 'keys', form: 'short',
    riff: [[0, 4], [3, 2], [6, 0], [10, 2], [12, 4]] },
  { title: "Cul-de-Sac Cruisin'", artist: 'K-Rad', genre: 'hip hop', kind: 'hiphop', bpm: 88, root: 43, prog: [0, 3, 5, 3], voice: 'whine', form: 'short',
    riff: [[0, 7], [4, 9], [6, 7], [8, 4], [12, 5], [14, 4]] },
  { title: 'Amen Break Dance', artist: 'PhatBass vs K-Rad', genre: 'drum & bass', kind: 'dnb', bpm: 172, root: 41, prog: [0, 0, 8, 10], voice: 'pluck', form: 'long',
    riff: [[0, 4], [3, 6], [6, 4], [8, 2], [11, 4], [14, 5]] },
  { title: 'Fatal Exception 0E', artist: 'xX_Ghoul_Xx', genre: 'drum & bass', kind: 'dnb', bpm: 174, root: 38, prog: [0, 3, 0, 8], voice: 'chip', form: 'long',
    riff: [[0, 7], [2, 7], [4, 9], [8, 6], [10, 6], [12, 4]] },
  { title: 'Dial-Up Dreams', artist: 'Nachoz Sound System', genre: 'EDM', kind: 'edm', bpm: 138, root: 45, prog: [0, 8, 3, 10], voice: 'supersaw', form: 'long',
    riff: [[0, 7], [2, 9], [4, 11], [6, 9], [8, 7], [10, 4], [12, 7], [14, 9]] },
  { title: 'Volt Rush', artist: 'DJ Volt', genre: 'EDM', kind: 'edm', bpm: 128, root: 43, prog: [0, 0, 5, 7], voice: 'pluck', form: 'long',
    riff: [[0, 4], [3, 7], [6, 4], [8, 2], [10, 4], [12, 7], [14, 9]] },
  { title: 'Frag Limit 20', artist: 'The Campers', genre: 'rock', kind: 'rock', bpm: 142, root: 40, prog: [0, 0, 5, 7], voice: 'guitar', form: 'long',
    riff: [[0, 7], [2, 7], [3, 9], [6, 7], [8, 11], [10, 9], [12, 7]] },
  { title: 'Grunge Basement', artist: 'Flannel Kernel', genre: 'rock', kind: 'rock', bpm: 104, root: 38, prog: [0, 0, 3, 5], voice: 'guitar', form: 'short',
    riff: [[0, 4], [4, 4], [6, 5], [8, 4], [12, 2], [14, 3]] },
].map((t) => {
  const bars = FORMS[t.form].length * 8;
  return { ...t, bars, trim: { hiphop: 1.3, dnb: 1, edm: 1.35, rock: 1 }[t.kind], seconds: Math.round(bars * 4 * 60 / t.bpm), sections: FORMS[t.form] };
});

export const fmtTime = (s) => (Number.isFinite(s) ? `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}` : '--:--');
// "Artist - Title", or just the title for a file with no artist tag
export const trackLabel = (t) => (t.artist ? `${t.artist} - ${t.title}` : t.title);

/* ---------- the instruments ---------- */
export class Kit {
  constructor(ctx, out) {
    this.ctx = ctx;
    this.out = out;
    const len = ctx.sampleRate * 2;
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    this.noiseBuf = buf;
    // bass and pads duck when the kick hits (the pumping sound of the era)
    this.duck = ctx.createGain(); this.duck.connect(out);
    this.curve = new Float32Array(1024);
    for (let i = 0; i < 1024; i++) { const x = (i / 512) - 1; this.curve[i] = Math.tanh(x * 6); }
  }
  env(t, a, d, peak, dest, sustain = 0) {
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(peak, t + a);
    g.gain.exponentialRampToValueAtTime(Math.max(sustain, 0.0001), t + a + d);
    g.connect(dest);
    return g;
  }
  osc(type, freq, t, dur, dest) {
    const o = this.ctx.createOscillator();
    o.type = type; o.frequency.setValueAtTime(freq, t);
    o.connect(dest); o.start(t); o.stop(t + dur + 0.05);
    return o;
  }
  noise(t, dur, type, freq, q, dest) {
    const s = this.ctx.createBufferSource(); s.buffer = this.noiseBuf;
    s.loop = true;
    const f = this.ctx.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q;
    s.connect(f).connect(dest); s.start(t, Math.random()); s.stop(t + dur + 0.05);
    return f;
  }
  pump(t, amount = 0.7, rel = 0.2) {
    const g = this.duck.gain;
    g.cancelScheduledValues(t);
    g.setValueAtTime(1 - amount, t);
    g.linearRampToValueAtTime(1, t + rel);
  }

  kick(t, vol = 1, deep = false) {
    const g = this.env(t, 0.002, deep ? 0.45 : 0.28, vol, this.out);
    const o = this.osc('sine', deep ? 130 : 160, t, 0.5, g);
    o.frequency.exponentialRampToValueAtTime(deep ? 38 : 48, t + 0.14);
  }
  snare(t, vol = 1, soft = false) {
    this.noise(t, 0.16, 'bandpass', 2000, 0.7, this.env(t, 0.001, 0.15, vol * (soft ? 0.35 : 0.8), this.out));
    this.osc('triangle', 190, t, 0.1, this.env(t, 0.001, 0.09, vol * (soft ? 0.2 : 0.5), this.out));
  }
  clap(t, vol = 1) {
    for (const d of [0, 0.012, 0.026]) this.noise(t + d, 0.1, 'bandpass', 1500, 1.1, this.env(t + d, 0.001, 0.09, vol * 0.5, this.out));
  }
  hat(t, vol = 1, open = false) {
    this.noise(t, open ? 0.3 : 0.05, 'highpass', 7500, 0.8, this.env(t, 0.001, open ? 0.28 : 0.04, vol * 0.3, this.out));
  }
  crash(t, vol = 1) { this.noise(t, 1.4, 'highpass', 5000, 0.5, this.env(t, 0.002, 1.3, vol * 0.4, this.out)); }

  // bass voices
  sub(t, midi, dur, vol = 1) { // 808
    const g = this.env(t, 0.005, Math.max(0.2, dur), vol * 0.9, this.duck);
    const o = this.osc('sine', hz(midi) * 2, t, dur + 0.2, g);
    o.frequency.exponentialRampToValueAtTime(hz(midi), t + 0.06);
  }
  saw(t, midi, dur, vol = 1, cutoff = 700) {
    const f = this.ctx.createBiquadFilter(); f.type = 'lowpass'; f.Q.value = 6;
    f.frequency.setValueAtTime(cutoff * 2.5, t); f.frequency.exponentialRampToValueAtTime(cutoff, t + dur * 0.8);
    f.connect(this.env(t, 0.005, dur, vol * 0.4, this.duck));
    this.osc('sawtooth', hz(midi), t, dur, f);
    this.osc('square', hz(midi - 12), t, dur, f);
  }
  reese(t, midi, dur, vol = 1) { // two detuned saws through a wobbling filter
    const f = this.ctx.createBiquadFilter(); f.type = 'lowpass'; f.Q.value = 3;
    f.frequency.setValueAtTime(300, t); f.frequency.linearRampToValueAtTime(900, t + dur * 0.5); f.frequency.linearRampToValueAtTime(350, t + dur);
    const g = this.ctx.createGain(); g.gain.setValueAtTime(vol * 0.35, t); g.gain.linearRampToValueAtTime(0.0001, t + dur);
    f.connect(g).connect(this.duck);
    for (const det of [-9, 9]) { const o = this.osc('sawtooth', hz(midi), t, dur, f); o.detune.value = det; }
  }
  fingered(t, midi, dur, vol = 1) { // rock bass
    const f = this.ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 900;
    f.connect(this.env(t, 0.004, dur, vol * 0.5, this.out));
    this.osc('triangle', hz(midi), t, dur, f); this.osc('sawtooth', hz(midi), t, dur, f);
  }

  // chord and lead voices
  keys(t, midis, dur, vol = 1) { // electric piano
    for (const m of midis) {
      const g = this.env(t, 0.004, dur, vol * 0.13, this.out);
      this.osc('sine', hz(m), t, dur, g);
      const g2 = this.env(t, 0.002, 0.15, vol * 0.05, this.out);
      this.osc('sine', hz(m) * 4, t, 0.2, g2);
    }
  }
  whine(t, midi, dur, vol = 1) { // the portamento sine lead of the West Coast
    const g = this.env(t, 0.03, dur, vol * 0.25, this.out, 0.001);
    const o = this.osc('sine', hz(midi - 2), t, dur, g);
    o.frequency.exponentialRampToValueAtTime(hz(midi), t + 0.08);
    const lfo = this.ctx.createOscillator(); lfo.frequency.value = 5.5;
    const lg = this.ctx.createGain(); lg.gain.value = hz(midi) * 0.008;
    lfo.connect(lg).connect(o.frequency); lfo.start(t); lfo.stop(t + dur + 0.1);
    this.osc('square', hz(midi), t, dur, this.env(t, 0.03, dur, vol * 0.04, this.out));
  }
  supersaw(t, midi, dur, vol = 1) {
    const f = this.ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 4200; f.Q.value = 1;
    f.connect(this.env(t, 0.01, dur, vol * 0.1, this.out, 0.001));
    for (const det of [-14, -5, 0, 6, 15]) { const o = this.osc('sawtooth', hz(midi), t, dur, f); o.detune.value = det; }
  }
  pluck(t, midi, dur, vol = 1) {
    const f = this.ctx.createBiquadFilter(); f.type = 'lowpass'; f.Q.value = 5;
    f.frequency.setValueAtTime(5000, t); f.frequency.exponentialRampToValueAtTime(500, t + 0.18);
    f.connect(this.env(t, 0.002, Math.min(dur, 0.25), vol * 0.22, this.out));
    this.osc('sawtooth', hz(midi), t, 0.3, f); this.osc('square', hz(midi) * 1.005, t, 0.3, f);
  }
  chip(t, midi, dur, vol = 1) { // square-wave arpeggio, a sound card trying its best
    const g = this.env(t, 0.002, dur * 0.9, vol * 0.12, this.out, 0.001);
    const o = this.osc('square', hz(midi), t, dur, g);
    o.frequency.setValueAtTime(hz(midi + 12), t + 0.03);
  }
  pad(t, midis, dur, vol = 1) {
    const f = this.ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 1400;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vol * 0.05, t + dur * 0.35); g.gain.linearRampToValueAtTime(0.0001, t + dur);
    f.connect(g).connect(this.duck);
    for (const m of midis) for (const det of [-7, 7]) { const o = this.osc('sawtooth', hz(m), t, dur, f); o.detune.value = det; }
  }
  guitar(t, midis, dur, vol = 1, muted = false) { // distorted power chord
    const f = this.ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 3200;
    const g = this.env(t, 0.003, muted ? 0.09 : dur, vol * 0.11, this.out, 0.001);
    const ws = this.ctx.createWaveShaper(); ws.curve = this.curve; ws.oversample = '2x';
    f.connect(ws); ws.connect(g);
    for (const m of midis) { this.osc('sawtooth', hz(m), t, dur, f); this.osc('square', hz(m) * 1.003, t, dur, f); }
  }
  riser(t, dur, vol = 1) {
    const f = this.noise(t, dur, 'bandpass', 300, 2, this.env(t, dur * 0.9, dur * 0.1, vol * 0.5, this.out));
    f.frequency.exponentialRampToValueAtTime(9000, t + dur);
  }
  scratch(t, dur = 0.25, vol = 1) {
    const f = this.noise(t, dur, 'bandpass', 800, 4, this.env(t, 0.01, dur, vol * 0.4, this.out));
    f.frequency.linearRampToValueAtTime(3000, t + dur * 0.5); f.frequency.linearRampToValueAtTime(600, t + dur);
  }
}

/* ---------- the sequencer: what plays on one 16th note ---------- */
export function playStep(track, bar, step, t, kit) {
  const sec = track.sections[Math.floor(bar / 8)];
  const layers = LAYERS[sec];
  const inSec = bar % 8;
  const kind = track.kind, dr = DRUMS[kind];
  const spb = 60 / track.bpm, sps = spb / 4;
  const barNum = bar % track.prog.length;
  const root = track.root + track.prog[barNum];
  const swing = step % 2 ? dr.swing * spb : 0;
  const ts = t + swing;
  const on = (l) => layers.includes(l);
  const pat = (list) => list[Math.floor(bar / 1) % list.length][step];
  const fill = inSec === 7 && step >= 12 && sec !== 'break' && sec !== 'intro';
  const downbeat = step === 0 && inSec === 0;

  if (on('kick') && !fill) {
    const c = pat(dr.kick);
    if (c === 'x') { kit.kick(t, 1, kind === 'hiphop'); if (kind === 'edm' || kind === 'dnb') kit.pump(t, kind === 'edm' ? 0.65 : 0.4, sps * 4); }
  }
  if (on('snare')) {
    const c = fill ? 'x' : pat(dr.snare);
    if (c === 'x') { kind === 'edm' ? kit.clap(t) : kit.snare(t, kind === 'rock' ? 1.1 : 1); }
    if (c === 'o') kit.snare(ts, 1, true);
  }
  if (on('hat')) {
    const c = pat(dr.hat);
    const quiet = sec === 'intro' ? 0.6 : 1;
    if (c === 'x') kit.hat(ts, quiet * (step % 4 === 0 ? 1 : 0.65));
    if (c === 'o') kit.hat(ts, quiet * 0.8, kind !== 'rock');
    if (kind === 'edm' && step % 2 === 1 && sec !== 'intro') kit.hat(t, 0.25);
  }
  if (kind === 'rock' && on('hat') && downbeat && sec === 'full') kit.crash(t);
  if (downbeat && sec === 'full' && kind !== 'rock') kit.crash(t, 0.6);

  if (on('bass')) {
    const low = root - 12;
    if (kind === 'hiphop') { if (pat(dr.kick) === 'x') kit.sub(t, low - (step === 10 ? 0 : 0), spb * 0.9); }
    if (kind === 'dnb') { const hit = { 0: 0, 6: 0, 10: 7 }[step]; if (hit !== undefined) kit.reese(t, low + hit - (bar % 4 === 3 && step === 10 ? 2 : 0), sps * (step === 0 ? 6 : 4)); }
    if (kind === 'edm') { if (step % 4 === 2) kit.saw(t, low, sps * 3, 1, 600); }
    if (kind === 'rock' && step % 2 === 0) kit.fingered(t, low, sps * 1.8, step % 8 === 0 ? 1 : 0.8);
  }
  if (on('pad')) {
    if (kind === 'rock') {
      if (step % 2 === 0) { const muted = !(step === 0 && inSec % 2 === 0); kit.guitar(t, [root, root + 7, root + 12], sps * 4, 1, muted && sec !== 'break'); }
    } else if (step === 0) kit.pad(t, [root + 12, root + 15, root + 19], spb * 4, sec === 'intro' ? 0.8 : 1);
  }
  if (on('lead')) {
    const bit = track.riff.find((r) => r[0] === step);
    if (bit && (bar % 2 === 0 || step < 8 || kind === 'rock')) {
      const m = root + 12 + degree(bit[1] - (bar % 4 === 3 ? 2 : 0));
      const len = sps * 2;
      if (track.voice === 'keys') kit.keys(t, [m - 12, m - 9, m - 5, m - 2], spb * 1.5);
      else if (track.voice === 'whine') kit.whine(t, m, sps * 3);
      else if (track.voice === 'supersaw') kit.supersaw(t, m, len * 1.5);
      else if (track.voice === 'pluck') kit.pluck(t, m, len);
      else if (track.voice === 'chip') kit.chip(t, m, len);
      else if (track.voice === 'guitar') kit.guitar(t, [m - 12, m - 5], len * 1.4, 0.9);
    }
  }
  if (on('fx')) {
    if (kind === 'hiphop' && inSec % 4 === 3 && step === 12) kit.scratch(t, sps * 3);
    if (kind !== 'hiphop' && inSec === 6 && step === 0) kit.riser(t, spb * 8);
    if (kind === 'rock' && inSec === 7 && step === 8) kit.snare(t, 1);
  }
  if (sec === 'full' && downbeat && layers.includes('lead')) { /* the lead has its own entries */ }
}

/* ---------- the player ---------- */
// Plays the synthesised tape and, once the visitor adds a folder, their own MP3 files (tracks with a `file`).
// Both go through the same mixer, so the spectrum works for either.
export class Player extends EventTarget {
  constructor(ctx) {
    super();
    this.ctx = ctx;
    this.out = ctx.createGain(); this.out.gain.value = 0.55;
    const comp = ctx.createDynamicsCompressor();
    this.analyser = ctx.createAnalyser(); this.analyser.fftSize = 256; this.analyser.smoothingTimeConstant = 0.7;
    this.mix = ctx.createGain();
    this.mix.connect(comp); comp.connect(this.analyser); this.analyser.connect(this.out); this.out.connect(ctx.destination);
    this.kit = new Kit(ctx, this.mix);
    this.tracks = TRACKS;
    this.index = 0; this.state = 'stopped';
    this.step = 0; this.elapsedBase = 0; this.resumeAt = 0;
    this.shuffle = false; this.repeat = false;
    this.audio = null; this.url = null; this.fails = 0;
    this.freq = new Uint8Array(this.analyser.frequencyBinCount);
  }
  get track() { return this.tracks[this.index]; }
  get elapsed() {
    if (this.track.file) return this.audio?.currentTime ?? 0;
    return this.state === 'playing' ? this.elapsedBase + (this.ctx.currentTime - this.resumeAt) : this.elapsedBase;
  }

  // the <audio> element for MP3 files, wired into the mixer the first time it is needed
  fileAudio() {
    if (this.audio) return this.audio;
    const a = this.audio = new Audio();
    a.preload = 'auto';
    this.ctx.createMediaElementSource(a).connect(this.mix);
    a.addEventListener('loadedmetadata', () => {
      if (this.track.file && Number.isFinite(a.duration)) { this.track.seconds = Math.round(a.duration); this.dispatchEvent(new Event('meta')); }
    });
    a.addEventListener('playing', () => { this.fails = 0; });
    a.addEventListener('ended', () => {
      if (!this.track.file || this.state !== 'playing') return;
      this.state = 'stopped'; this.dispatchEvent(new Event('state'));
      if (this.repeat) this.play(); else this.skip(1);
    });
    a.addEventListener('error', () => { // a file the browser can't decode: move on, but not forever
      if (!this.track.file || this.state !== 'playing' || ++this.fails > this.tracks.length) return;
      this.dispatchEvent(new Event('unplayable'));
      this.skip(1);
    });
    return a;
  }
  // stop whatever is sounding, without touching the state
  halt() {
    clearInterval(this.timer);
    this.audio?.pause();
  }
  // swap in a new playlist (the tape plus the visitor's files); the current song carries on if it is still there
  setTracks(list) {
    const cur = this.track, i = list.indexOf(cur);
    this.tracks = list;
    if (i >= 0) this.index = i;
    else {
      this.halt(); this.state = 'stopped'; this.index = 0; this.step = 0; this.elapsedBase = 0;
      this.mix.gain.value = this.track.trim;
      this.dispatchEvent(new Event('state'));
    }
    this.dispatchEvent(new Event('tracks'));
    this.dispatchEvent(new Event('track'));
  }

  play(i = this.index) {
    if (this.ctx.state === 'suspended') this.ctx.resume();
    const fresh = i !== this.index || this.state === 'stopped';
    if (fresh) {
      this.halt(); this.state = 'stopped';
      this.index = i; this.step = 0; this.elapsedBase = 0;
      this.mix.gain.value = this.track.trim;
      this.dispatchEvent(new Event('track'));
    }
    if (this.state === 'playing') return;
    this.state = 'playing';
    if (this.track.file) {
      const a = this.fileAudio();
      if (fresh) {
        if (this.url) URL.revokeObjectURL(this.url);
        this.url = URL.createObjectURL(this.track.file);
        a.src = this.url;
      }
      a.play().catch(() => {}); // a rejected play() fires 'error' for files that can't be decoded
    } else {
      this.next = this.ctx.currentTime + 0.08;
      this.resumeAt = this.next;
      this.timer = setInterval(() => this.schedule(), 30);
    }
    this.dispatchEvent(new Event('state'));
  }
  pause() {
    if (this.state !== 'playing') return;
    this.elapsedBase = this.elapsed;
    this.state = 'paused'; this.halt();
    this.dispatchEvent(new Event('state'));
  }
  toggle() { this.state === 'playing' ? this.pause() : this.play(); }
  stop() {
    this.halt();
    if (this.audio && this.track.file) this.audio.currentTime = 0;
    this.state = 'stopped'; this.step = 0; this.elapsedBase = 0;
    this.dispatchEvent(new Event('state'));
  }
  skip(dir) {
    const n = this.tracks.length;
    let i;
    if (this.shuffle && n > 1) { do { i = Math.floor(Math.random() * n); } while (i === this.index); }
    else i = (this.index + dir + n) % n;
    this.halt(); this.state = 'stopped';
    this.play(i); // skipping starts the tape, like the real thing
  }
  setVolume(v) { this.out.gain.value = v * v; }

  schedule() {
    const t = this.track, sps = 60 / t.bpm / 4;
    while (this.next < this.ctx.currentTime + 0.15) {
      const total = t.bars * 16;
      if (this.step >= total) { // the track ended
        clearInterval(this.timer); this.state = 'stopped'; this.step = 0; this.elapsedBase = 0;
        this.dispatchEvent(new Event('state'));
        if (this.repeat) this.play(); else this.skip(1);
        return;
      }
      playStep(t, Math.floor(this.step / 16), this.step % 16, this.next, this.kit);
      this.next += sps; this.step++;
    }
  }
  // 0..1 loudness of the low end, for the visualiser
  level() {
    if (this.state !== 'playing') return 0;
    this.analyser.getByteFrequencyData(this.freq);
    let s = 0; for (let i = 1; i < 8; i++) s += this.freq[i];
    return Math.min(1, s / (7 * 200));
  }
  spectrum() { this.analyser.getByteFrequencyData(this.freq); return this.freq; }
}
