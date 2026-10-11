// #lanparty98: the IRC channel the whole group has open on the side. The regulars (bots) tell
// dumb jokes, mock each other and mock whoever just did something dumb in the room.
// Banter is DOM-free so it can be tested; IrcView draws the mIRC-style window.

export const REGULARS = ['Dazza', 'xX_Ghoul_Xx', 'PhatBass', 'n00bslayer', 'K-Rad', 'Macca'];

// {t} is the person being mocked, {a} someone else in the channel
const IDLE = [
  'anyone got a spare 16MB SIMM. asking for a friend. the friend is me',
  'my ping to this hub is 400ms. we are in the same room',
  'why is it called a hub. it has never once helped me',
  'who keeps unplugging the hub. I can hear it. I can hear you being rude',
  'just lost to a guy on a 486. he had the high ground and lag',
  'doom is a cry for help and also a very good game',
  'brb defragging',
  'has anyone seen my floppy. it says QUAKE on it in texta',
  'a 56k modem is just a really slow fax machine with ambition',
  'who ate all the nachoz. be honest. I will find the cheese dust',
  'my mum asked what a LAN is. I said Local Area Nerd',
  'I have been awake for 31 hours and I can see the polygons',
  'a bloke at school says there will be a 3D card for every pc by 2000. what a legend',
  'does anyone know how to make windows stop asking me to restart. serious question',
  'my pc has a turbo button. it does nothing. I press it anyway',
  'imagine paying for the internet by the minute. couldnt be me. it is me',
  'I just want to frag in peace and I cannot even do that',
  'someone sat on the good chair. the one with the cushion. I can see you',
  'ctrl alt del is not a strategy. it is the only strategy I have',
  'is it legal to burn a cd of your own mixtape. asking because I am about to',
  'I put a sticker on my case and it went 3 fps faster',
  'this basement smells like feet and hot dust. perfect',
  'I read that y2k will turn off all the toasters. I am ready',
  'who is {a}. no really. I forgot. is it the one with the hair',
  'whoever has the volt cola crate: you are my best mate and I will remember this',
  'my cat walked across the keyboard and got a better score than {a}',
];
const MOCKS = [
  '{t}: you play like you have the mouse on the carpet',
  '{t}: nice shirt. did you win it in a raffle or lose a bet',
  '{t} has the aim of a stormtrooper and the reflexes of a fridge',
  '{t}: my nan frags harder than you and she thinks the mouse is a pet',
  '{t}: mate you are the reason there is a rule about camping',
  '{t}: that haircut called. it wants to go back to 1994',
  '{t}: what is your ping. oh. it is your skill. it is also high',
  '{t} is the human version of a general protection fault',
  '{t}: I would insult you but my 16 megabytes are full of better things',
  '{t}: you call that a deathmatch. that was a tour of the map',
  '{t}: respectfully, your build is a crime. with love',
  '{t} rage quit a game of solitaire once. I was there',
];
const REPLIES = [
  'lol', 'hahaha', 'ur so dumb', '{t} shut up', 'oh no', 'rekt', 'ooooooh', 'that is cold', 'ow', 'no u', 'fair', 'real',
];
const REACT = {
  crash: [
    '{t} just blue screened. press any key to terminate your dignity',
    'RIP {t}. cause of death: windows',
    '{t} you were not overclocking that thing again were you',
    'fatal exception 0E. the E is for embarrassing',
    'the box is dead. long live the box. reboot it',
  ],
  trip: [
    '{t} just ate carpet. I heard it from here',
    '{t} tripped on a cable. 10/10 form. 0/10 survival',
    'mind the cables {t}. they are very much in the way',
    'did {t} just go down. someone check on {t}. no do not. film it',
    'the cable has beaten {t} again. cable leads 3-0',
  ],
  hot: [
    '{t} is running so hot you could fry an egg on the case',
    'turn the fan on. the box is cooking',
    'smells like burning plastic. I like it',
  ],
  midnight: [
    'IT IS MIDNIGHT. STARCRAFT TIME',
    'put the shooters down. it is time for the zerg',
    'I am going to rush. I am always going to rush. it is a lifestyle',
    'who has 32 megs. show hands. show hands and not the excuses',
  ],
  join: [
    'hey {t}. welcome to the basement. mind the cables',
    '{t} has arrived. lock up the nachoz',
    'oh no. {t} is here. hide the good chair',
  ],
  pizza: [
    'PIZZA. I can smell it from here. lock the box',
    'whoever gets the last slice has to fight me for it',
    'pepperoni is just red circles of grease and that is why we love it',
    'if the pizza guy was this fast on the dial-up we would all be rich',
  ],
  door: [
    'whoever opened the door: mum can hear us now. thanks',
    'close the door. close the door. close the door',
    'shhh. the parents',
  ],
  quiet: [
    '{t}: you are very quiet. are you ok. blink twice',
    'is {t} afk or just thinking about their play',
  ],
};

const pick = (arr, rng) => arr[Math.floor(rng() * arr.length)];
const fill = (s, vars) => s.replace(/\{(\w)\}/g, (_, k) => vars[k] ?? '');

export class Banter {
  constructor({ rng = Math.random, me = 'YOU', nicks = REGULARS } = {}) {
    this.rng = rng;
    this.me = me;
    this.nicks = [...nicks];
    this.queue = [];      // { at, nick, text }
    this.now = 0;
    this.last = null;
    this.next = 4 + rng() * 6;
  }

  others(except) { return this.nicks.filter((n) => n !== except); }
  // anyone to pick on: the regulars plus whoever's playing
  victims(except) { return [...this.others(except), this.me].filter((n) => n !== except); }

  say(nick, text, delay = 0) { this.queue.push({ at: this.now + delay, nick, text }); }

  // a line from a regular; maybe a mock at somebody, maybe followed by a reply
  line() {
    const nick = pick(this.others(this.last), this.rng);
    this.last = nick;
    const mock = this.rng() < 0.4;
    const t = pick(this.victims(nick), this.rng), a = pick(this.others(nick), this.rng);
    this.say(nick, fill(pick(mock ? MOCKS : IDLE, this.rng), { t, a }));
    if (this.rng() < 0.55) {
      const r = pick(this.others(nick), this.rng);
      this.say(r, fill(pick(REPLIES, this.rng), { t: nick }), 1.5 + this.rng() * 3);
    }
  }

  // something happened in the room: a couple of regulars pile on
  react(kind, name = this.me) {
    const lines = REACT[kind];
    if (!lines) return;
    const first = pick(this.others(name), this.rng);
    this.say(first, fill(pick(lines, this.rng), { t: name }), 1 + this.rng() * 2);
    if (this.rng() < 0.7) {
      const second = pick(this.others(first), this.rng);
      this.say(second, fill(pick(this.rng() < 0.5 ? REPLIES : MOCKS, this.rng), { t: name }), 3 + this.rng() * 3);
    }
  }

  // somebody typed into the channel: somebody might have an opinion
  heard(name, text) {
    if (this.rng() > 0.6) return;
    const who = pick(this.others(name), this.rng);
    const shout = text === text.toUpperCase() && /[A-Z]{4}/.test(text);
    const line = shout ? `${name}: INDOOR VOICE` : fill(pick(this.rng() < 0.6 ? MOCKS : REPLIES, this.rng), { t: name });
    this.say(who, line, 1.5 + this.rng() * 2.5);
  }

  // advance time; returns the messages due now
  tick(dt) {
    this.now += dt;
    if ((this.next -= dt) <= 0) { this.line(); this.next = 7 + this.rng() * 13; }
    const due = this.queue.filter((m) => m.at <= this.now).sort((x, y) => x.at - y.at);
    this.queue = this.queue.filter((m) => m.at > this.now);
    return due;
  }
}

/* ---------- the window ---------- */
const MAX_LINES = 60;
export class IrcView {
  constructor(root, nicks) {
    this.root = root;
    this.log = root.querySelector('#irc-log');
    this.list = root.querySelector('#irc-nicks');
    this.colors = new Map();
    this.setNicks(nicks);
  }
  color(nick) {
    if (!this.colors.has(nick)) this.colors.set(nick, (this.colors.size % 8) + 1);
    return `var(--shirt-${this.colors.get(nick)})`;
  }
  setNicks(nicks) {
    this.list.replaceChildren(...nicks.map((n) => {
      const li = document.createElement('li');
      li.textContent = n; li.style.color = this.color(n);
      return li;
    }));
  }
  add(nick, text, stamp) {
    const div = document.createElement('div');
    const time = document.createElement('span'); time.className = 'irc-time'; time.textContent = `[${stamp}] `;
    const who = document.createElement('b'); who.textContent = `<${nick}>`; who.style.color = this.color(nick);
    div.append(time, who, ` ${text}`);
    this.push(div);
  }
  note(text, stamp) { // * Dazza has joined #lanparty98
    const div = document.createElement('div'); div.className = 'irc-note';
    div.textContent = `[${stamp}] * ${text}`;
    this.push(div);
  }
  push(div) {
    this.log.append(div);
    while (this.log.children.length > MAX_LINES) this.log.firstChild.remove();
    this.log.scrollTop = this.log.scrollHeight;
  }
}
