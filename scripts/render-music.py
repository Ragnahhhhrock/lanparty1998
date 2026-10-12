#!/usr/bin/env python3
"""Render a minute of LANamp's own music to video/audio/volt-rush.m4a for the explainer video.

    pip install playwright numpy && python3 -m playwright install chromium
    python3 -m http.server 8099 &        # from the repo root
    python3 scripts/render-music.py
    python3 scripts/render-music.py "Frag Limit 20" 30 video/audio/frag-limit-20.m4a   # any track, any length

"Volt Rush" by DJ Volt (js/music.js, 128 BPM EDM) is played through the same Kit and sequencer LANamp uses, into an
OfflineAudioContext: groove, full, full, outro, 32 bars = 60 seconds. No samples and no audio files go in.
With arguments, the named track plays groove then full for as many bars as the length needs (the shorts).
"""
import base64
import pathlib
import subprocess
import sys
import wave

import numpy as np
from playwright.sync_api import sync_playwright

ROOT = pathlib.Path(__file__).resolve().parent.parent
TITLE, SECS, OUT = (sys.argv[1:4] + [None, None, None])[:3] if len(sys.argv) > 1 else ("Volt Rush", None, None)
JS = """
async ([title, secs]) => {
  const m = await import('http://localhost:8099/js/music.js');
  const base = m.TRACKS.find(t => t.title === title);
  const bars = secs ? Math.ceil((secs + 1) * base.bpm / 240) : 32;
  const track = { ...base, sections: secs ? ['groove', ...Array(Math.ceil(bars / 8)).fill('full')] : ['groove','full','full','outro'] };
  const sr = 44100, spb = 60/track.bpm, sps = spb/4;
  const total = bars*4*spb + 2;
  const ctx = new OfflineAudioContext(2, Math.ceil(total*sr), sr);
  const out = ctx.createGain(); out.gain.value = 0.55;
  const comp = ctx.createDynamicsCompressor();
  const mix = ctx.createGain(); mix.gain.value = track.trim;
  mix.connect(comp); comp.connect(out); out.connect(ctx.destination);
  const kit = new m.Kit(ctx, mix);
  for (let bar=0; bar<bars; bar++) for (let s=0; s<16; s++) m.playStep(track, bar, s, 0.05 + (bar*16+s)*sps, kit);
  const buf = await ctx.startRendering();
  const L = buf.getChannelData(0), R = buf.getChannelData(1);
  const i16 = new Int16Array(L.length*2);
  for (let i=0;i<L.length;i++){ i16[2*i]=Math.max(-1,Math.min(1,L[i]))*32767; i16[2*i+1]=Math.max(-1,Math.min(1,R[i]))*32767; }
  let bin=''; const u8=new Uint8Array(i16.buffer); for(let i=0;i<u8.length;i+=0x8000) bin+=String.fromCharCode.apply(null,u8.subarray(i,i+0x8000));
  return {b64: btoa(bin), sr, secs: total, bpm: track.bpm, title: track.title, artist: track.artist};
}
"""
with sync_playwright() as p:
    b = p.chromium.launch()
    pg = b.new_page(); pg.goto("http://localhost:8099/index.html"); 
    r = pg.evaluate(JS, [TITLE, float(SECS) if SECS else None]); b.close()
d = np.frombuffer(base64.b64decode(r['b64']), dtype=np.int16)
print(r['title'], r['artist'], r['bpm'], r['secs'], len(d)/2/r['sr'], np.abs(d).max())
out = ROOT / (OUT or 'video/audio/volt-rush.m4a')
wav = out.with_suffix('.wav')
wav.parent.mkdir(parents=True, exist_ok=True)
with wave.open(str(wav),'wb') as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(r['sr']); w.writeframes(d.tobytes())

subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', str(wav), '-t', str(SECS or 59), '-c:a', 'aac', '-b:a', '192k', str(out)], check=True)
wav.unlink()
