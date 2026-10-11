// #lanparty98: the IRC channel the whole group has open on the side. The regulars (bots) tell
// dumb jokes, mock each other and mock whoever just did something dumb in the room.
// Banter is DOM-free so it can be tested; IrcView draws the mIRC-style window.
// Most of what they say is teenage-boy stuff (burps, farts, your mum). The same lines come out of
// their mouths as speech bubbles in the room; a line tagged with an fx also plays that noise.

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

// the regulars go at each other: one roasts, the target hits back, a third cackles.
// ROASTS {t} = the target. COMEBACKS {t} = whoever just roasted. LAUGHS {t} = the one who got it.
const ROASTS = [
  '{t}: 2 frags, 19 deaths. that is not a score. that is a cry for help',
  '{t} just got fragged by a bot. on easy. the bot was embarrassed for you',
  '{t}: you ate the same rocket 4 times. it was not even moving',
  '{t}: your kill/death ratio is a rounding error',
  '{t} just ran into a wall for 30 seconds. the wall has been there the whole game',
  '{t}: you lost a game of pong. there is one button',
  '{t}: that was the worst base I have ever seen. you built it out of hope',
  '{t} got rushed by a guy who was afk. he was afk. he was making a sandwich',
  '{t}: I have seen better aim from a screensaver',
  '{t}: you died in the spawn room. you were not even playing yet',
  '{t} dropped a grenade at their own feet. again. the team is taking up a collection',
  '{t}: there is a spot on the scoreboard with your name on it. it is the bottom. it is nicely carpeted',
  '{t} is so bad the game gave them a pity medal. it is a participation floppy',
  '{t}: nice lag. oh wait. that is just you',
  '{t}: you got fragged by the door. the door is not even a player',
  '{t} has been in the red for 40 minutes. that is not a game. that is a hostage situation',
  '{t}: does your monitor work or is that the screensaver you are playing on',
];
const COMEBACKS = [
  '{t}: says the guy who lost to a toaster',
  '{t}: at least I do not play with the monitor off',
  'oh look. {t} found the keyboard. 4 years of practice and look at you go',
  '{t}: lag. it was lag. shut up. it was lag',
  'I let you win {t}. I always let you win. it is a kindness',
  '{t} you are the reason the hub has a fire warning',
  '{t}: your mum plays better than you. she was here earlier',
  'no u {t}',
  '{t}: sit down. you are on 3 frags and one was a teammate',
  '{t}: I will see you on the next map. bring a bucket for the tears',
  'ur so dumb {t}. ur dumber than a floppy drive',
  '{t}: wow. big words from a guy who got camped by a potted plant',
];
const LAUGHS = [
  'LOLOLOLOLOL',
  'hahahahaha {t} is so bad',
  'I am crying. {t} please stop. my stomach',
  'ROFL. {t} did you see that. everyone saw that',
  'ahahaha 2 frags. TWO',
  '*wheeze* {t}',
  'ok but {t} deserved that',
  'kekeke. oh {t}. oh no',
  'someone screenshot that. {t} just got deleted',
  'rekt. {t} is so rekt. rekt rekt rekt',
  'LMAO {t} is a walking lag spike',
  'hehehe poor {t}. no really. so poor',
];

// Short scenes for three of the regulars: [role, text, fx]. {a} {b} {c} are the speakers' nicks.
// An fx (fart, burp, laugh, snort) only goes on a line that is an action in *stars*, so the
// noise is what you hear and the stars are what you read.
export const SCENES = [
  [['a', '*pffffbbbt*', 'fart'], ['b', '{a} DUDE'], ['c', '{a} that was not a smell. that was a weather event'], ['a', 'silent but deadly. except not silent']],
  [['a', 'watch this'], ['a', '*BUUUURRRP*', 'burp'], ['b', 'ok that went for 9 seconds. new record'], ['c', 'I felt that in my teeth']],
  [['a', '{b} your mum is so fat her ping is 800ms'], ['b', 'your mum is so dumb she tried to install doom on a toaster'], ['c', 'ooooooh'], ['a', 'that does not even make sense'], ['b', 'neither does your face']],
  [['a', '{b} you have cheese dust all over your face'], ['b', 'it is war paint'], ['c', 'it is evidence. it is on your keyboard too']],
  [['a', 'I bet you ten bucks you cannot burp the alphabet'], ['b', 'watch me. A. B. C. D'], ['b', '*BRRRUUURRP*', 'burp'], ['a', 'that was a D at best'], ['c', 'it smelled like a B']],
  [['a', 'pull my finger'], ['b', 'no'], ['a', 'pull it'], ['b', 'I said no'], ['a', '*pbbbbbt*', 'fart'], ['c', 'I am leaving. I am moving to another basement']],
  [['a', '{b} take your shoes off and I will end you'], ['b', 'my feet are not that bad'], ['c', 'the carpet is dying {b}. look at it. it is dying']],
  [['a', '{b} says he has a girlfriend. she lives in canada'], ['b', 'she is real. she is on icq'], ['c', 'what is her name then'], ['b', 'I forgot. it is a long name'], ['a', '*hehehehehe*', 'laugh']],
  [['a', 'brb. the nachoz did not agree with me'], ['b', 'do not use the good toilet. mum just did a number in it'], ['c', 'just go in the garden. the hedge is free']],
  [['a', 'I ate six nachoz and a whole pizza. I am a god'], ['a', '*uuurrp*', 'burp'], ['b', 'you are a god of the carpet'], ['c', 'put a bucket by the chair']],
  [['a', '{b} I will give you a wedgie so big you will see the ceiling'], ['b', 'try it. I am wearing the strong undies'], ['c', 'fight fight fight'], ['a', 'nah. I cannot be bothered. I am too comfy']],
  [['a', 'volt cola up the nose. watch'], ['a', '*pffft ow ow ow*', 'snort'], ['b', 'you are an idiot. it burns for like an hour'], ['c', 'do it again']],
  [['a', '{b} said hard drive'], ['a', '*hehehehe*', 'laugh'], ['b', 'grow up'], ['a', 'never']],
  [['a', 'who has the smelly socks. I can taste them'], ['b', 'it is {c}. it is always {c}'], ['c', 'they are not smelly. they are seasoned']],
  [['a', '{b} your voice just went squeaky'], ['b', 'it did not'], ['b', 'it is the cold in here'], ['c', 'it is called puberty mate'], ['a', '*snrk*', 'laugh']],
  [['a', 'I put a whoopee cushion on the good chair'], ['b', 'where did you even get one'], ['a', 'the shop. I have been planning this for weeks'], ['c', '{b} go sit on the good chair. go on'], ['b', '*PFFFRRRT*', 'fart'], ['c', '*HAHAHAHAHA*', 'laugh'], ['a', 'worth it']],
  [['a', '{b} double dare you to lick the ethernet cable'], ['b', 'no'], ['c', 'I will give you two dollars'], ['b', 'make it five and a nachoz'], ['a', 'deal']],
  [['a', 'what is smellier. {b} or the hub'], ['c', 'the hub. no wait. {b}. it is {b}'], ['b', 'I hate you both']],
  [['a', 'I just burped and it tasted like pizza'], ['a', '*burp*', 'burp'], ['b', 'mate that is just old pizza. from last week'], ['c', 'that is a science experiment now']],
  [['a', '{b} what is that on your shirt'], ['b', 'it is sauce'], ['c', 'it has been sauce since tuesday'], ['b', 'it is a vintage sauce']],
  [['a', '*ppft*', 'fart'], ['a', 'I have armed the beanbag'], ['b', 'nobody sit in the beanbag'], ['c', 'too late. I am in it. oh no. oh nooo']],
];

const pick = (arr, rng) => arr[Math.floor(rng() * arr.length)];
const fill = (s, vars) => s.replace(/\{(\w)\}/g, (_, k) => vars[k] ?? '');

export class Banter {
  // bodies: the nicks that are standing in the room, so their scenes can be seen and heard there
  constructor({ rng = Math.random, me = 'YOU', nicks = REGULARS, bodies = nicks } = {}) {
    this.rng = rng;
    this.me = me;
    this.nicks = [...nicks];
    this.bodies = [...bodies];
    this.lastScene = -1;
    this.queue = [];      // { at, nick, text }
    this.now = 0;
    this.last = null;
    this.next = 2 + rng() * 3;
  }

  others(except) { return this.nicks.filter((n) => n !== except); }
  // anyone to pick on: the regulars plus whoever's playing
  victims(except) { return [...this.others(except), this.me].filter((n) => n !== except); }

  say(nick, text, delay = 0, fx) { this.queue.push({ at: this.now + delay, nick, text, ...(fx && { fx }) }); }

  // a regular roasts another regular's play, the target hits back, a third laughs
  duel() {
    const a = pick(this.others(this.last), this.rng);
    const b = pick(this.others(a), this.rng);
    const c = pick(this.others(a).filter((n) => n !== b), this.rng);
    this.last = a;
    this.say(a, fill(pick(ROASTS, this.rng), { t: b }));
    this.say(b, fill(pick(COMEBACKS, this.rng), { t: a }), 1.5 + this.rng() * 2);
    this.say(c, fill(pick(LAUGHS, this.rng), { t: b }), 3.5 + this.rng() * 2);
    if (this.rng() < 0.5) this.say(a, fill(pick(LAUGHS, this.rng), { t: b }), 5.5 + this.rng() * 2);
    if (this.rng() < 0.4) this.say(b, fill(pick(COMEBACKS, this.rng), { t: c }), 6 + this.rng() * 2);
    return 8;
  }

  // three regulars act out a short immature scene; returns how many seconds it runs
  scene() {
    const pool = this.bodies.length >= 3 ? this.bodies : this.nicks;
    const a = pick(pool.filter((n) => n !== this.last), this.rng);
    const b = pick(pool.filter((n) => n !== a), this.rng);
    const c = pick(pool.filter((n) => n !== a && n !== b), this.rng);
    this.last = a;
    let i;
    do { i = Math.floor(this.rng() * SCENES.length); } while (i === this.lastScene);
    this.lastScene = i;
    const who = { a, b, c };
    let t = 0;
    for (const [role, text, fx] of SCENES[i]) {
      this.say(who[role], fill(text, who), t, fx);
      t += 1.7 + this.rng() * 1.3 + (fx ? 0 : text.length * 0.02);
    }
    return t;
  }

  // enough lines to fill the window on load, oldest first
  prefill(count = 14) {
    const out = [];
    while (out.length < count) {
      this.line();
      out.push(...this.queue.splice(0).sort((x, y) => x.at - y.at));
    }
    return out.slice(-count);
  }

  // a line from a regular; mostly a duel, sometimes a mock at somebody, maybe followed by a reply
  line() {
    if (this.rng() < 0.6) return this.scene();
    if (this.rng() < 0.7) return this.duel();
    const nick = pick(this.others(this.last), this.rng);
    this.last = nick;
    const mock = this.rng() < 0.4;
    const t = pick(this.victims(nick), this.rng), a = pick(this.others(nick), this.rng);
    this.say(nick, fill(pick(mock ? MOCKS : IDLE, this.rng), { t, a }));
    let end = 2;
    if (this.rng() < 0.55) {
      const r = pick(this.others(nick), this.rng);
      end = 1.5 + this.rng() * 3;
      this.say(r, fill(pick(REPLIES, this.rng), { t: nick }), end);
    }
    return end;
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
    if ((this.next -= dt) <= 0) { const end = this.line(); this.next = Math.max(4 + this.rng() * 5, end + 2 + this.rng() * 3); } // wait for the scene to finish
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
