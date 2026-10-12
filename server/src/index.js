// LAN Party '98 room server: one Durable Object per room keeps track of who is in the
// basement, where they're standing, which PC (or BYOC bench) they're sitting at, and the current
// deathmatch. Game traffic itself does not pass through here (DOOM's IPX packets go
// peer to peer over WebRTC); this only coordinates.

const MAX_PLAYERS = 16;
const PCS = 8;           // six club PCs, then the two BYOC benches (seats 6 and 7)
const CLUB_PCS = 6;
const BENCHES = 2;
// games a deathmatch can be hosted for: ids from js/games.js (an unknown one becomes DOOM)
const GAMES = new Set(['doom', 'heretic', 'hexen', 'quake', 'descent', 'duke']);
// shirt colours: tokens --shirt-1 .. --shirt-8 in css/tokens.css
const COLORS = ['#e2231a', '#2b6fd6', '#e8c21b', '#3aa35a', '#9b4dca', '#f28a1c', '#20b2aa', '#d94f8a'];

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const m = url.pathname.match(/^\/room\/([a-z0-9-]{1,32})$/i);
    if (m && request.headers.get('Upgrade') === 'websocket') {
      const id = env.ROOMS.idFromName(m[1].toLowerCase());
      return env.ROOMS.get(id).fetch(request);
    }
    if (url.pathname === '/' || url.pathname === '/health') {
      return new Response('LAN Party \'98 room server. NO UNPLUGGING THE HUB.\n', { headers: { 'content-type': 'text/plain' } });
    }
    return new Response('Bad command or file name\n', { status: 404 });
  },
};

// A PC build (js/build.js) from a client: part ids only, so it can be passed on to the other players
const BUILD_IDS = ['crt', 'cpu', 'ram', 'cdrom', 'cdr', 'nic', 'audio', 'keyboard', 'mouse', 'mat'];
const id12 = (v) => (typeof v === 'string' && /^[A-Za-z0-9]{1,12}$/.test(v) ? v : null);
function cleanBuild(b) {
  if (!b || typeof b !== 'object') return null;
  const out = {};
  for (const k of BUILD_IDS) out[k] = id12(b[k]);
  out.hdd = (Array.isArray(b.hdd) ? b.hdd : []).slice(0, 3).map(id12);
  while (out.hdd.length < 3) out.hdd.push(null);
  out.floppy = Math.min(2, Math.max(0, Number(b.floppy) | 0));
  return out;
}

const clean = (s, n) => String(s ?? '').replace(/[\u0000-\u001f<>]/g, '').trim().slice(0, n);
const num = (v, lo, hi) => (Number.isFinite(v) ? Math.min(hi, Math.max(lo, v)) : 0);

export class Room {
  constructor(ctx) {
    this.ctx = ctx;
    this.match = null;
    // the room can hibernate between messages, so the match is kept in storage
    ctx.blockConcurrencyWhile(async () => {
      this.match = (await ctx.storage.get('match')) ?? null;
      if (this.match && ctx.getWebSockets().length === 0) { this.match = null; await ctx.storage.delete('match'); }
    });
  }

  async fetch(request) {
    const sockets = this.ctx.getWebSockets();
    if (sockets.length >= MAX_PLAYERS) {
      return new Response('Room is full', { status: 503 });
    }
    const pair = new WebSocketPair();
    const [client, server] = Object.values(pair);
    this.ctx.acceptWebSocket(server);
    const used = new Set(sockets.map((ws) => this.info(ws)?.id));
    let id = crypto.randomUUID().slice(0, 8);
    while (used.has(id)) id = crypto.randomUUID().slice(0, 8);
    server.serializeAttachment({ id, name: null, color: null, x: 0, z: 1.2, yaw: 0, pc: null, bench: null, build: null, up: false });
    return new Response(null, { status: 101, webSocket: client });
  }

  info(ws) { try { return ws.deserializeAttachment(); } catch { return null; } }
  save(ws, p) { ws.serializeAttachment(p); }

  players() {
    return this.ctx.getWebSockets().map((ws) => this.info(ws)).filter((p) => p && p.name);
  }

  broadcast(msg, except) {
    const s = JSON.stringify(msg);
    for (const ws of this.ctx.getWebSockets()) {
      if (ws === except) continue;
      const p = this.info(ws);
      if (!p?.name) continue; // not said hello yet
      try { ws.send(s); } catch { /* closing */ }
    }
  }

  send(ws, msg) { try { ws.send(JSON.stringify(msg)); } catch { /* closing */ } }

  setMatch(match) {
    this.match = match;
    this.ctx.storage.put('match', match);
    this.broadcast({ t: 'match', match });
  }

  // a player stopped being able to play: left the room or stood up
  dropFromMatch(id) {
    const m = this.match;
    if (!m || !m.players.includes(id)) return;
    if (m.host === id) return this.setMatch(null);
    const players = m.players.filter((p) => p !== id);
    if (m.status === 'lobby' || players.length > 1) return this.setMatch({ ...m, players });
    this.setMatch(null);
  }

  async webSocketMessage(ws, raw) {
    if (typeof raw !== 'string' || raw.length > 2000) return;
    let msg;
    try { msg = JSON.parse(raw); } catch { return; }
    const p = this.info(ws);
    if (!p) return;

    if (msg.t === 'hello') {
      if (p.name) return;
      const taken = new Set(this.players().map((o) => o.color));
      p.name = clean(msg.name, 12).toUpperCase() || 'PLAYER';
      p.color = COLORS.find((c) => !taken.has(c)) ?? COLORS[Math.floor(Math.random() * COLORS.length)];
      this.save(ws, p);
      this.send(ws, { t: 'welcome', id: p.id, you: p, players: this.players().filter((o) => o.id !== p.id), match: this.match });
      this.broadcast({ t: 'join', player: p }, ws);
      return;
    }
    if (!p.name) return;

    switch (msg.t) {
      case 'pos': {
        if (p.pc !== null) return;
        p.x = num(msg.x, -6, 6); p.z = num(msg.z, -5, 5); p.yaw = num(msg.yaw, -100, 100);
        this.save(ws, p);
        this.broadcast({ t: 'pos', id: p.id, x: p.x, z: p.z, yaw: p.yaw }, ws);
        return;
      }
      case 'sit': {
        const pc = Number(msg.pc);
        if (!Number.isInteger(pc) || pc < 0 || pc >= PCS) return;
        const owner = this.players().find((o) => o.pc === pc);
        if (pc >= CLUB_PCS && p.bench !== pc - CLUB_PCS) return;  // a bench is only for the player who set it up
        if (owner && owner.id !== p.id) { this.send(ws, { t: 'denied', pc, by: owner.name }); return; }
        if (p.pc !== null && p.pc !== pc) this.dropFromMatch(p.id);
        p.pc = pc;
        this.save(ws, p);
        this.broadcast({ t: 'seat', id: p.id, pc });
        return;
      }
      case 'bench': {
        // "I have a PC to set up": hand out the first free bench and tell everyone what is on it
        const taken = new Set(this.players().filter((o) => o.id !== p.id && o.bench !== null).map((o) => o.bench));
        let bench = p.bench !== null && !taken.has(p.bench) ? p.bench : null;
        for (let b = 0; bench === null && b < BENCHES; b++) if (!taken.has(b)) bench = b;
        p.bench = bench;
        p.build = bench === null ? null : cleanBuild(msg.build);
        p.up = bench !== null && msg.up === true;   // true once the PC has finished its POST: only then do the others see it
        if (bench === null && p.pc !== null && p.pc >= CLUB_PCS) { p.pc = null; this.broadcast({ t: 'seat', id: p.id, pc: null }); this.dropFromMatch(p.id); }
        this.save(ws, p);
        this.broadcast({ t: 'bench', id: p.id, bench, build: p.build, up: p.up });
        return;
      }
      case 'stand': {
        if (p.pc === null) return;
        p.pc = null;
        this.save(ws, p);
        this.broadcast({ t: 'seat', id: p.id, pc: null });
        this.dropFromMatch(p.id);
        return;
      }
      case 'chat': {
        const text = clean(msg.text, 120);
        if (text) this.broadcast({ t: 'chat', id: p.id, name: p.name, text });
        return;
      }
      case 'dm_host': {
        if (p.pc === null || this.match) return;
        const game = GAMES.has(msg.game) ? msg.game : 'doom';
        this.setMatch({ id: crypto.randomUUID().slice(0, 6), host: p.id, game, players: [p.id], status: 'lobby', peerId: null });
        return;
      }
      case 'dm_join': {
        const m = this.match;
        if (!m || m.status !== 'lobby' || p.pc === null || m.players.includes(p.id) || m.players.length >= 4) return;
        this.setMatch({ ...m, players: [...m.players, p.id] });
        return;
      }
      case 'dm_leave': {
        this.dropFromMatch(p.id);
        return;
      }
      case 'dm_start': {
        const m = this.match;
        if (!m || m.host !== p.id || m.status !== 'lobby' || m.players.length < 2) return;
        this.setMatch({ ...m, status: 'starting', nodes: m.players.length });
        return;
      }
      case 'dm_peer': {
        const m = this.match;
        const peerId = Number(msg.peerId);
        if (!m || m.host !== p.id || m.status !== 'starting' || !Number.isInteger(peerId) || peerId <= 0) return;
        this.setMatch({ ...m, status: 'running', peerId });
        return;
      }
      case 'dm_end': {
        if (this.match?.host === p.id) this.setMatch(null);
        return;
      }
    }
  }

  async webSocketClose(ws) { this.gone(ws); }
  async webSocketError(ws) { this.gone(ws); }

  gone(ws) {
    const p = this.info(ws);
    try { ws.close(1000, 'bye'); } catch { /* already closed */ }
    if (!p?.name) return;
    // mark as gone so players() stops listing this socket while it finishes closing
    this.save(ws, { ...p, name: null });
    this.broadcast({ t: 'leave', id: p.id }, ws);
    this.dropFromMatch(p.id);
  }
}
