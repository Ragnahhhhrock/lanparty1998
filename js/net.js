// Connection to the room server: who's here, where they are, who sits where, the deathmatch.
// If the server can't be reached the game still works solo; this just stays quiet.

const params = new URLSearchParams(location.search);
const LOCAL = ['localhost', '127.0.0.1'].includes(location.hostname);
const SERVER = params.get('server') || (LOCAL ? 'ws://127.0.0.1:8787' : 'wss://room.lanparty1998.com');
export const ROOM_NAME = (params.get('room') || 'basement').toLowerCase().replace(/[^a-z0-9-]/g, '').slice(0, 32) || 'basement';

export class RoomLink extends EventTarget {
  constructor() {
    super();
    this.ws = null;
    this.me = null;              // { id, name, color, ... }
    this.players = new Map();    // id -> player (not including me)
    this.match = null;
    this.online = false;
    this.name = null;
    this.retry = 1000;
    this.lastPos = '';
  }

  connect(name) {
    this.name = name;
    this.open();
  }

  open() {
    let ws;
    try { ws = new WebSocket(`${SERVER}/room/${ROOM_NAME}`); } catch { return this.later(); }
    this.ws = ws;
    ws.onopen = () => { this.retry = 1000; ws.send(JSON.stringify({ t: 'hello', name: this.name })); };
    ws.onmessage = (e) => { try { this.handle(JSON.parse(e.data)); } catch (err) { console.error(err); } };
    ws.onclose = () => {
      if (this.ws !== ws) return;
      const was = this.online;
      this.online = false;
      this.players.clear();
      this.match = null;
      if (was) this.emit('offline');
      this.later();
    };
  }

  later() {
    setTimeout(() => this.open(), this.retry);
    this.retry = Math.min(this.retry * 2, 15000);
  }

  emit(type, detail) { this.dispatchEvent(new CustomEvent(type, { detail })); }

  send(msg) {
    if (this.online && this.ws?.readyState === 1) this.ws.send(JSON.stringify(msg));
  }

  handle(m) {
    switch (m.t) {
      case 'welcome':
        this.me = m.you;
        this.online = true;
        this.players = new Map(m.players.map((p) => [p.id, p]));
        this.match = m.match;
        this.lastPos = '';
        this.emit('online');
        break;
      case 'join':
        this.players.set(m.player.id, m.player);
        this.emit('join', m.player);
        break;
      case 'leave': {
        const p = this.players.get(m.id);
        this.players.delete(m.id);
        if (p) this.emit('leave', p);
        break;
      }
      case 'pos': {
        const p = this.players.get(m.id);
        if (p) { p.x = m.x; p.z = m.z; p.yaw = m.yaw; }
        break;
      }
      case 'seat': {
        const p = m.id === this.me?.id ? this.me : this.players.get(m.id);
        if (p) { p.pc = m.pc; this.emit('seat', p); }
        break;
      }
      case 'denied':
        this.emit('denied', m);
        break;
      case 'chat':
        this.emit('chat', m);
        break;
      case 'match':
        this.match = m.match;
        this.emit('match', m.match);
        break;
    }
  }

  // who (other than me) is sitting at pc i
  occupant(i) {
    for (const p of this.players.values()) if (p.pc === i) return p;
    return null;
  }

  nameOf(id) {
    if (id === this.me?.id) return this.me.name;
    return this.players.get(id)?.name ?? '???';
  }

  pos(x, z, yaw) {
    const key = `${x.toFixed(2)},${z.toFixed(2)},${yaw.toFixed(2)}`;
    if (key === this.lastPos) return;
    this.lastPos = key;
    this.send({ t: 'pos', x: +x.toFixed(2), z: +z.toFixed(2), yaw: +yaw.toFixed(2) });
  }
}
