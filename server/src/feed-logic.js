// The picture a seated player's PC is showing, relayed to everyone else in the room so the CRT on that
// desk can show it. No DOM and no Cloudflare in here, so node tools/feed.test.mjs can test it.
//
// On the wire a frame is a binary WebSocket message holding one small JPEG:
//   player -> room server   [FRAME_TAG][jpeg ...]
//   room server -> others   [FRAME_TAG][pc][jpeg ...]       (the server writes pc, so nobody can put a picture on another desk)
// js/feed.js has the matching client half.

export const FRAME_TAG = 0x46;       // 'F'
export const MIN_FRAME = 64;         // a real JPEG is bigger than this; anything smaller is noise
export const MAX_FRAME = 24 * 1024;  // a 192x144 frame is about 5 to 9 KB; this leaves room for a busy one
export const MIN_GAP_MS = 120;       // at most about 8 frames a second from one player

// Is this binary message from a player a frame we are willing to pass on? Returns the JPEG bytes or null.
export function acceptFrame(buf) {
  if (!(buf instanceof ArrayBuffer) && !ArrayBuffer.isView(buf)) return null;
  const bytes = buf instanceof ArrayBuffer ? new Uint8Array(buf) : new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength);
  if (bytes.length < MIN_FRAME + 1 || bytes.length > MAX_FRAME + 1) return null;
  if (bytes[0] !== FRAME_TAG) return null;
  if (bytes[1] !== 0xff || bytes[2] !== 0xd8 || bytes[3] !== 0xff) return null;   // JPEG start of image
  return bytes.subarray(1);
}

// The message the others get: tag, which PC, then the picture.
export function relayFrame(pc, jpeg) {
  const out = new Uint8Array(jpeg.length + 2);
  out[0] = FRAME_TAG;
  out[1] = pc;
  out.set(jpeg, 2);
  return out.buffer;
}

// Has this player sent one too recently? Pass the time of their last accepted frame (or 0).
export const tooSoon = (last, now) => now - last < MIN_GAP_MS;
