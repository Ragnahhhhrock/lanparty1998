// Proximity voice chat: the numbers and the rules, with no DOM and no Web Audio so node tools/voice.test.mjs can run them.
// js/voice.js is the half that touches the microphone, WebRTC and the speakers.

// How far a voice carries, in metres. The basement is about 12 by 10, so across the whole room is out of earshot:
// full volume up to FULL, fading in a straight line to nothing at SILENT. The panner node in voice.js uses the same
// two numbers with its linear distance model, so this function and what you hear agree.
export const RANGE = { full: 1.5, silent: 9 };
export const HEAD_Y = 1.55;          // where a voice comes from: about a standing head's height

export function gainAt(distance) {
  if (!(distance > RANGE.full)) return 1;
  if (distance >= RANGE.silent) return 0;
  return 1 - (distance - RANGE.full) / (RANGE.silent - RANGE.full);
}

// STUN only: it is enough to find a way through most home routers. (A strict office firewall may still block a voice
// link; the game carries on without it.)
export const ICE_SERVERS = [
  { urls: 'stun:stun.cloudflare.com:3478' },
  { urls: 'stun:stun.l.google.com:19302' },
];

export const MIC = { echoCancellation: true, noiseSuppression: true, autoGainControl: true, channelCount: 1 };

// Two players about to link: exactly one of them makes the offer, so the two never offer at once. The lower id does.
export const makesOffer = (myId, theirId) => String(myId) < String(theirId);

// A voice link that fails is tried again a few times, then left alone until somebody leaves voice and rejoins.
export const RETRY = { max: 3, delayMs: 2500 };

// The three states of your own voice: not in it, in it with the mic open, in it with the mic shut.
export const STATES = ['off', 'live', 'muted'];
export function nextMic(state) { return state === 'live' ? 'muted' : 'live'; }   // what the mic key does: join or open, or mute

// Loudness of a block of time-domain samples from an AnalyserNode (bytes centred on 128), 0 to 1.
export function rms(bytes) {
  if (!bytes?.length) return 0;
  let sum = 0;
  for (let i = 0; i < bytes.length; i++) { const v = (bytes[i] - 128) / 128; sum += v * v; }
  return Math.sqrt(sum / bytes.length);
}

// "Is this person talking?" from a stream of loudness readings. It switches on above `on`, and only off again after
// the signal has stayed under `off` for `hold` seconds, so a breath between words does not flicker the light.
export class Talking {
  constructor({ on = 0.035, off = 0.02, hold = 0.35 } = {}) {
    this.on = on; this.off = off; this.hold = hold;
    this.active = false;
    this.quiet = 0;
  }
  update(level, dt) {
    if (level >= this.on) { this.active = true; this.quiet = 0; }
    else if (this.active) {
      if (level >= this.off) this.quiet = 0;
      else if ((this.quiet += dt) >= this.hold) this.active = false;
    }
    return this.active;
  }
  reset() { this.active = false; this.quiet = 0; }
}

// The words on the HUD.
export function statusLine(state, talking = []) {
  const who = talking.length ? ` · ${talking.join(', ')} talking` : '';
  if (state === 'live') return `MIC LIVE${who}`;
  if (state === 'muted') return `MIC MUTED${who}`;
  return `Voice off${who}`;
}
export const buttonLabel = (state) => (state === 'live' ? 'Mic: LIVE' : state === 'muted' ? 'Mic: MUTED' : 'Voice: off');

// What went wrong with the microphone, in plain words. `err` is what getUserMedia threw.
export function micProblem(err) {
  const name = err?.name ?? '';
  if (name === 'NotAllowedError' || name === 'SecurityError') return "The browser blocked the microphone. Allow it for this site, then try again.";
  if (name === 'NotFoundError' || name === 'OverconstrainedError') return 'No microphone found. Plug one in, then try again.';
  if (name === 'NotReadableError' || name === 'AbortError') return 'Something else is using the microphone.';
  return "Couldn't start the microphone.";
}
