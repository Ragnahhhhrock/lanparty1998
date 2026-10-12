// Proximity voice chat, server half. The voices themselves go peer to peer over WebRTC (js/voice.js); this
// room server only carries the handshake between two players who have both joined voice, and says who has.
// No DOM and no Cloudflare in here, so node tools/voice.test.mjs can test it.
//
//   player -> server   { t: 'voice', on: true|false }                  "I have joined (or left) voice"
//   server -> others   { t: 'voice', id, on }
//   player -> server   { t: 'rtc', to: <player id>, d: <signal> }      a handshake message for one player
//   server -> that one { t: 'rtc', from: <player id>, d: <signal> }    (the server writes from, so nobody can pose as another player)
//
// A signal is { k: 'offer' | 'answer', sdp } or { k: 'ice', c: { candidate, sdpMid, sdpMLineIndex } | null }.

export const MAX_RAW = 8000;          // the largest message the room reads at all; a voice offer with its candidates is a few KB
export const MAX_RAW_OTHER = 2000;    // everything that is not a handshake keeps the old limit
export const MAX_SDP = 6000;
export const MAX_CANDIDATE = 400;
export const SIGNAL_BUDGET = { count: 80, perMs: 10_000 };   // one player's handshake messages per ten seconds

const str = (v, n) => (typeof v === 'string' && v.length <= n ? v : null);

// Returns the signal with only the fields we know, or null if it is not one we will pass on.
export function cleanSignal(d) {
  if (!d || typeof d !== 'object') return null;
  if (d.k === 'offer' || d.k === 'answer') {
    const sdp = typeof d.sdp === 'string' && d.sdp.length >= 10 && d.sdp.length <= MAX_SDP ? d.sdp : null;
    return sdp ? { k: d.k, sdp } : null;
  }
  if (d.k === 'ice') {
    if (d.c === null) return { k: 'ice', c: null };            // no more candidates
    const c = d.c;
    if (!c || typeof c !== 'object') return null;
    const candidate = str(c.candidate, MAX_CANDIDATE);
    if (!candidate) return null;
    const mid = c.sdpMid === null || c.sdpMid === undefined ? null : str(c.sdpMid, 16);
    const idx = Number.isInteger(c.sdpMLineIndex) && c.sdpMLineIndex >= 0 && c.sdpMLineIndex < 8 ? c.sdpMLineIndex : null;
    return { k: 'ice', c: { candidate, sdpMid: mid, sdpMLineIndex: idx } };
  }
  return null;
}

// Is this player still inside their handshake budget? `state` is { start, count } (or undefined for a first message);
// returns the new state, or null if the message should be dropped.
export function spend(state, now, budget = SIGNAL_BUDGET) {
  if (!state || now - state.start >= budget.perMs) return { start: now, count: 1 };
  if (state.count >= budget.count) return null;
  return { start: state.start, count: state.count + 1 };
}

// The message the target gets.
export const relaySignal = (from, d) => ({ t: 'rtc', from, d });
