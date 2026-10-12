// Proximity voice chat. Join voice and your microphone is shared, peer to peer over WebRTC, with every other player
// who has joined too. What you hear is placed in the room: each voice comes from where its player is standing or
// sitting, and fades out with distance (js/voice-logic.js has the numbers). Nothing is recorded or sent through our
// server; the room server only carries the handshake (server/src/voice-logic.js). Nobody is linked to anybody
// until they both choose to join, so players who stay out of voice never exchange addresses with anyone.
//
//   const voice = new Voice({ link, audioContext, positionOf });
//   voice.toggleMic();            // not in voice: join with the mic open. In voice: mute / unmute.
//   voice.leave();
//   voice.update(camera, dt);     // every frame: places the voices and works out who is talking
//   voice.addEventListener('state' | 'talking' | 'problem', ...)

import { RANGE, HEAD_Y, ICE_SERVERS, MIC, makesOffer, RETRY, nextMic, rms, Talking, micProblem } from './voice-logic.js';

const TALK_EVERY = 0.1;   // seconds between loudness readings

// An AudioParam, or the old setter if this browser doesn't have the params.
const set = (param, v) => { if (param) param.value = v; };

export class Voice extends EventTarget {
  // link: the RoomLink (js/net.js). audioContext: () => the shared AudioContext (js/sfx.js), or undefined before the
  // first click. positionOf: (playerId) => { x, z } of where that player's body is now, or null.
  constructor({ link, audioContext, positionOf }) {
    super();
    this.link = link;
    this.audioContext = audioContext;
    this.positionOf = positionOf;
    this.state = 'off';            // off | live | muted
    this.stream = null;            // my microphone
    this.track = null;
    this.mine = null;              // { analyser, buf, talk }: for my own "talking" light
    this.peers = new Map();        // player id -> peer
    this.talkingIds = new Set();   // who is talking and near enough to hear (me included, as 'me')
    this.tick = 0;
    this.busy = false;

    link.addEventListener('voice', (e) => this.onVoice(e.detail.id, e.detail.on));
    link.addEventListener('rtc', (e) => this.onSignal(e.detail.from, e.detail.d));
    link.addEventListener('leave', (e) => this.drop(e.detail.id));
    link.addEventListener('offline', () => this.dropAll());
    link.addEventListener('online', () => { if (this.state !== 'off') this.announce(); });
  }

  get on() { return this.state !== 'off'; }

  emit(type, detail) { this.dispatchEvent(new CustomEvent(type, { detail })); }

  setState(s) {
    if (this.state === s) return;
    this.state = s;
    if (this.track) this.track.enabled = s === 'live';
    if (s !== 'live') this.mine?.talk.reset();
    this.emit('state', s);
    this.refreshTalking();
  }

  /* ---------- joining and leaving ---------- */

  // The mic key: not in voice yet → join with the mic open; otherwise mute or unmute.
  async toggleMic() {
    if (this.state === 'off') return this.join();
    this.setState(nextMic(this.state));
  }

  async join() {
    if (this.on || this.busy) return;
    const ctx = this.audioContext();
    if (!ctx) return this.emit('problem', "The room isn't open yet.");
    if (!this.link.online) return this.emit('problem', "You're not on the hub, so there is nobody to talk to yet.");
    if (!navigator.mediaDevices?.getUserMedia || typeof RTCPeerConnection === 'undefined') return this.emit('problem', "This browser can't do voice chat.");
    this.busy = true;
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({ audio: MIC, video: false });
    } catch (err) {
      this.busy = false;
      return this.emit('problem', micProblem(err));
    }
    this.busy = false;
    this.track = this.stream.getAudioTracks()[0];
    if (!this.track) { this.stop(); return this.emit('problem', 'No microphone found. Plug one in, then try again.'); }
    // the stream ending (the mic was unplugged, or the browser's permission was taken away) is the same as leaving
    this.track.addEventListener('ended', () => { if (this.on) { this.leave(); this.emit('problem', 'The microphone stopped.'); } });
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 512;
    ctx.createMediaStreamSource(this.stream).connect(analyser);   // read, never played back: you do not hear yourself
    this.mine = { analyser, buf: new Uint8Array(analyser.fftSize), talk: new Talking() };
    this.track.enabled = true;
    this.state = 'live';
    this.emit('state', 'live');
    this.announce();
  }

  // Tell the room I am in voice, and link to everyone who already is.
  announce() {
    this.link.send({ t: 'voice', on: true });
    for (const p of this.link.players.values()) if (p.voice) this.ensure(p.id);
  }

  leave() {
    if (!this.on) return;
    this.link.send({ t: 'voice', on: false });
    this.dropAll();
    this.stop();
    this.state = 'off';
    this.emit('state', 'off');
    this.refreshTalking();
  }

  stop() {
    this.stream?.getTracks().forEach((t) => t.stop());
    this.stream = null; this.track = null; this.mine = null;
  }

  /* ---------- who I am linked to ---------- */

  onVoice(id, on) {
    if (!this.on) return;
    if (on) this.ensure(id); else this.drop(id);
  }

  // Make sure there is a link to this player. Only one end of a pair makes the offer; the other answers it.
  ensure(id) {
    if (!this.on || this.peers.has(id) || !this.link.players.get(id)?.voice) return;
    const peer = this.make(id);
    if (makesOffer(this.link.me?.id, id)) this.offer(peer);
  }

  make(id) {
    const ctx = this.audioContext();
    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
    const peer = { id, pc, remoteSet: false, pending: [], audio: null, tries: 0, closed: false };
    this.peers.set(id, peer);
    pc.addTrack(this.track, this.stream);
    pc.onicecandidate = (e) => this.link.send({
      t: 'rtc', to: id,
      d: { k: 'ice', c: e.candidate ? { candidate: e.candidate.candidate, sdpMid: e.candidate.sdpMid, sdpMLineIndex: e.candidate.sdpMLineIndex } : null },
    });
    pc.ontrack = (e) => { if (!peer.audio && ctx) peer.audio = this.attach(ctx, e.streams[0] ?? new MediaStream([e.track])); };
    pc.onconnectionstatechange = () => {
      if (peer.closed || pc.connectionState !== 'failed') return;
      // gone for good: close it, and if both of us are still in voice have another go a little later
      const tries = peer.tries + 1;
      this.drop(id);
      if (tries <= RETRY.max) setTimeout(() => { if (this.on && !this.peers.has(id)) { this.ensure(id); const again = this.peers.get(id); if (again) again.tries = tries; } }, RETRY.delayMs);
    };
    return peer;
  }

  async offer(peer) {
    try {
      await peer.pc.setLocalDescription(await peer.pc.createOffer());
      this.link.send({ t: 'rtc', to: peer.id, d: { k: 'offer', sdp: peer.pc.localDescription.sdp } });
    } catch (err) { console.error(err); this.drop(peer.id); }
  }

  async onSignal(from, d) {
    if (!this.on || !d || !this.link.players.get(from)?.voice) return;
    try {
      if (d.k === 'offer') {
        this.drop(from);                         // a fresh offer replaces whatever link there was
        const peer = this.make(from);
        await peer.pc.setRemoteDescription({ type: 'offer', sdp: d.sdp });
        await this.flush(peer);
        await peer.pc.setLocalDescription(await peer.pc.createAnswer());
        this.link.send({ t: 'rtc', to: from, d: { k: 'answer', sdp: peer.pc.localDescription.sdp } });
        return;
      }
      const peer = this.peers.get(from);
      if (!peer) return;
      if (d.k === 'answer') {
        if (peer.pc.signalingState !== 'have-local-offer') return;
        await peer.pc.setRemoteDescription({ type: 'answer', sdp: d.sdp });
        await this.flush(peer);
      } else if (d.k === 'ice') {
        if (!peer.remoteSet) peer.pending.push(d.c);
        else if (d.c) await peer.pc.addIceCandidate(d.c);
      }
    } catch (err) { console.error(err); }
  }

  // The remote description is in: add the candidates that arrived before it did.
  async flush(peer) {
    peer.remoteSet = true;
    for (const c of peer.pending.splice(0)) if (c) await peer.pc.addIceCandidate(c).catch(() => {});
  }

  /* ---------- hearing them ---------- */

  // A voice arrives as a stream. Chrome only delivers a remote stream into Web Audio if it is also attached to a
  // media element (which is kept silent); the panner then puts the voice in the room.
  attach(ctx, stream) {
    const el = new Audio();
    el.srcObject = stream;
    el.muted = true;
    el.play?.().catch(() => {});
    const src = ctx.createMediaStreamSource(stream);
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 512;
    const panner = ctx.createPanner();
    panner.panningModel = 'equalpower';
    panner.distanceModel = 'linear';
    panner.refDistance = RANGE.full;
    panner.maxDistance = RANGE.silent;
    panner.rolloffFactor = 1;
    const out = ctx.createGain();
    src.connect(analyser);
    src.connect(panner);
    panner.connect(out).connect(ctx.destination);
    return { el, src, analyser, panner, out, buf: new Uint8Array(analyser.fftSize), talk: new Talking(), near: 0 };
  }

  drop(id) {
    const peer = this.peers.get(id);
    if (!peer) return;
    peer.closed = true;
    this.peers.delete(id);
    try { peer.pc.close(); } catch { /* already closed */ }
    const a = peer.audio;
    if (a) {
      try { a.src.disconnect(); a.panner.disconnect(); a.out.disconnect(); } catch { /* already apart */ }
      a.el.srcObject = null;
    }
    this.refreshTalking();
  }

  dropAll() { for (const id of [...this.peers.keys()]) this.drop(id); }

  /* ---------- every frame ---------- */

  update(camera, dt) {
    const ctx = this.audioContext();
    if (!ctx || !this.on) return;
    // my ears: where the camera is, and which way it faces
    const l = ctx.listener;
    const fwd = camera.getWorldDirection(this.fwd ??= camera.position.clone());
    if (l.positionX) {
      set(l.positionX, camera.position.x); set(l.positionY, camera.position.y); set(l.positionZ, camera.position.z);
      set(l.forwardX, fwd.x); set(l.forwardY, fwd.y); set(l.forwardZ, fwd.z);
      set(l.upX, 0); set(l.upY, 1); set(l.upZ, 0);
    } else {
      l.setPosition?.(camera.position.x, camera.position.y, camera.position.z);
      l.setOrientation?.(fwd.x, fwd.y, fwd.z, 0, 1, 0);
    }
    // their mouths: where each player's body is
    for (const peer of this.peers.values()) {
      const a = peer.audio;
      if (!a) continue;
      const at = this.positionOf(peer.id);
      if (!at) { a.out.gain.value = 0; a.near = Infinity; continue; }   // not in the room right now (or not drawn yet)
      a.out.gain.value = 1;
      set(a.panner.positionX, at.x); set(a.panner.positionY, HEAD_Y); set(a.panner.positionZ, at.z);
      if (!a.panner.positionX) a.panner.setPosition?.(at.x, HEAD_Y, at.z);
      a.near = Math.hypot(at.x - camera.position.x, at.z - camera.position.z);
    }
    if ((this.tick += dt) >= TALK_EVERY) { this.listen(this.tick); this.tick = 0; }
  }

  // Read the loudness of each voice and mine; the light is on for someone who is talking and close enough to hear.
  listen(dt) {
    let changed = false;
    const now = new Set();
    const read = (ch) => { ch.analyser.getByteTimeDomainData(ch.buf); return ch.talk.update(rms(ch.buf), dt); };
    if (this.mine && this.state === 'live' && read(this.mine)) now.add('me');
    for (const peer of this.peers.values()) {
      const a = peer.audio;
      if (a && read(a) && a.near < RANGE.silent) now.add(peer.id);
    }
    if (now.size !== this.talkingIds.size) changed = true;
    else for (const id of now) if (!this.talkingIds.has(id)) changed = true;
    this.talkingIds = now;
    if (changed) this.emit('talking', this.talking());
  }

  refreshTalking() {
    if (!this.on) this.talkingIds = new Set();
    for (const id of [...this.talkingIds]) if (id !== 'me' && !this.peers.has(id)) this.talkingIds.delete(id);
    this.emit('talking', this.talking());
  }

  // The names of whoever is talking, for the HUD ('me' is you).
  talking() {
    return [...this.talkingIds].map((id) => (id === 'me' ? 'YOU' : this.link.nameOf(id)));
  }
}
