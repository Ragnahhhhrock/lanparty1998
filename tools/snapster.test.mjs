// Logic tests for js/snapster.js. Run: node tools/snapster.test.mjs
import assert from 'node:assert/strict';
import { ARTISTS, SONGS, USERS, SPEEDS, MYSTERY, buildNetwork, search, sortBy, hubStats, fileName, fmtLen, fmtSize, fmtBytes, fmtRate, rng, Transfers, Library, percent, statusText, speed } from '../js/snapster.js';

let n = 0;
const test = (label, fn) => { fn(); n++; console.log(`ok  ${label}`); };
const net = buildNetwork(1998);
const seq = (...v) => { let i = 0; return () => v[i++ % v.length]; };

test('the catalogue is made up: a few dozen bands, five titles each, no repeats', () => {
  assert.ok(Object.keys(ARTISTS).length >= 30);
  for (const [artist, titles] of Object.entries(ARTISTS)) assert.equal(titles.length, 5, artist);
  assert.equal(new Set(SONGS.map(fileName)).size, SONGS.length);
  assert.ok(SONGS.length >= 150);
});

test('the same seed builds the same crowd', () => {
  const again = buildNetwork(1998);
  assert.equal(again.files.length, net.files.length);
  assert.deepEqual(again.files.slice(0, 20), net.files.slice(0, 20));
  assert.notEqual(buildNetwork(7).files.length + buildNetwork(7).files[3].size, net.files.length + net.files[3].size);
});

test('everybody shares something and every file is a believable MP3', () => {
  for (const u of USERS) assert.ok(net.files.filter((f) => f.user === u.name).length >= 38, u.name);
  for (const f of net.files) {
    assert.match(fileName(f), /\.mp3$/);
    assert.ok([44100, 22050, 32000].includes(f.freq));
    assert.ok(f.bitrate >= 64 && f.bitrate <= 320);
    assert.ok(f.seconds >= 100 && f.seconds <= 400, `${fileName(f)} ${f.seconds}s`);
    assert.equal(f.size, Math.round((f.seconds * f.bitrate * 1000) / 8));
    assert.ok(f.ping === null || f.ping >= 20);
    assert.ok(SPEEDS.some((s) => s.id === f.conn));
    assert.equal(net.byId(f.id), f);
  }
});

test('some files are badly named, as on a real hard drive', () => {
  const bad = net.files.filter((f) => !f.artist);
  assert.ok(bad.length >= USERS.length);
  assert.ok(bad.every((f) => MYSTERY.includes(f.title)));
  assert.equal(fileName(bad[0]), `${bad[0].title}.mp3`);
});

test('search wants every word, in any case, and nothing means nothing', () => {
  assert.deepEqual(search(net, {}), []);
  assert.deepEqual(search(net, { artist: '   ' }), []);
  const hits = search(net, { artist: 'static cardigan' }, { max: 500 });
  assert.ok(hits.length > 20);
  assert.ok(hits.every((f) => f.artist === 'Static Cardigan'));
  assert.equal(search(net, { artist: 'STATIC CARDIGAN' }, { max: 500 }).length, hits.length);
  const one = search(net, { artist: 'cardigan', title: 'weather' }, { max: 500 });
  assert.ok(one.length > 0 && one.every((f) => f.title === 'Cardigan Weather'));
  assert.deepEqual(search(net, { artist: 'cardigan', title: 'pizza' }, { max: 500 }), []);
  assert.deepEqual(search(net, { title: 'zzzzqx' }), []);
});

test('a search for a title alone finds it from several users', () => {
  const hits = search(net, { title: 'Busy Signal' }, { max: 500 });
  assert.ok(new Set(hits.map((f) => f.user)).size >= 3);
  assert.ok(hits.every((f) => f.title === 'Busy Signal'));
});

test('a title search also finds the badly named files', () => {
  const hits = search(net, { title: 'track' }, { max: 500 });
  assert.ok(hits.length > 0);
  assert.ok(hits.every((f) => /track/i.test(f.title)));
});

test('max results, the speed floor and the bitrate floor all cut the list', () => {
  const all = search(net, { artist: 'a' }, { max: 500 });
  assert.equal(search(net, { artist: 'a' }, { max: 50 }).length, 50);
  assert.ok(search(net, { artist: 'a' }, { max: 50 }).every((f, i) => f === all[i]));
  const fast = search(net, { artist: 'a' }, { max: 500, minSpeed: 'cable' });
  assert.ok(fast.length > 0 && fast.length < all.length);
  assert.ok(fast.every((f) => speed(f.conn).rank >= speed('cable').rank));
  const hi = search(net, { artist: 'a' }, { max: 500, minBitrate: 192 });
  assert.ok(hi.length > 0 && hi.length < all.length);
  assert.ok(hi.every((f) => f.bitrate >= 192));
});

test('results come back nearest first, with a ? last', () => {
  const hits = search(net, { artist: 'a' }, { max: 500 });
  for (let i = 1; i < hits.length; i++) assert.ok((hits[i - 1].ping ?? 9999) <= (hits[i].ping ?? 9999));
});

test('clicking a column sorts it, both ways, and keeps ties in order', () => {
  const hits = search(net, { artist: 'cardigan' }, { max: 500 });
  const bySize = sortBy(hits, 'size');
  for (let i = 1; i < bySize.length; i++) assert.ok(bySize[i - 1].size <= bySize[i].size);
  const down = sortBy(hits, 'size', -1);
  for (let i = 1; i < down.length; i++) assert.ok(down[i - 1].size >= down[i].size);
  const byUser = sortBy(hits, 'user');
  for (let i = 1; i < byUser.length; i++) assert.ok(byUser[i - 1].user.toLowerCase() <= byUser[i].user.toLowerCase());
  const byConn = sortBy(hits, 'conn', -1);
  assert.ok(speed(byConn[0].conn).rank >= speed(byConn.at(-1).conn).rank);
  assert.equal(hits.length, bySize.length);
});

test('the numbers read the way the old client wrote them', () => {
  assert.equal(fmtLen(221), '3:41');
  assert.equal(fmtLen(65), '1:05');
  assert.equal(fmtSize(3.5 * 1048576), '3.50 MB');
  assert.equal(fmtBytes(3512341), '3,512,341');
  assert.equal(fmtRate(4300), '4.3 KB/s');
  const s = hubStats(net, () => 0.5);
  assert.ok(s.users >= 1800 && s.users <= 2200 && s.songs > 50000 && s.gb > 100);
  assert.deepEqual(hubStats(net, () => 0.5), s);
});

test('the random generator is repeatable', () => {
  const a = rng(5), b = rng(5);
  for (let i = 0; i < 10; i++) assert.equal(a(), b());
});

const file = (over = {}) => ({ id: 1, artist: 'A', title: 'B', user: 'BeigeBox_Ben', conn: 't1', bitrate: 128, freq: 44100, seconds: 200, size: 3200000, ping: 40, ...over });

test('a download connects, waits its turn, downloads and finishes', () => {
  const t = new Transfers({ random: seq(0.99, 0.5), scale: 30 });
  const x = t.add(file());
  assert.equal(x.state, 'connecting');
  const seen = [];
  let ended = [];
  for (let i = 0; i < 400 && !ended.length; i++) { ended = t.step(0.25); if (seen.at(-1) !== x.state) seen.push(x.state); }
  assert.deepEqual(seen, ['connecting', 'queued', 'downloading', 'done'].filter((s) => seen.includes(s)));
  assert.equal(x.state, 'done');
  assert.equal(x.got, x.file.size);
  assert.equal(percent(x), 100);
  assert.equal(statusText(x), 'Finished');
  assert.ok(!t.busy);
});

test('your own line is the limit: the same song takes longer on a slow modem', () => {
  const run = (mySpeed) => {
    const t = new Transfers({ mySpeed, random: () => 0.99, scale: 30 });
    const x = t.add(file());
    let secs = 0;
    while (x.state !== 'done' && secs < 4000) { t.step(0.25); secs += 0.25; }
    assert.equal(x.state, 'done');
    return secs;
  };
  assert.ok(run('28.8') > run('56k'));
  assert.ok(run('56k') > run('cable'));
});

test('a slow user caps a fast line', () => {
  const t = new Transfers({ mySpeed: 'cable', random: () => 0.99, scale: 30 });
  const x = t.add(file({ user: 'packet_loss_pat', conn: '14.4' }));
  for (let i = 0; i < 40; i++) t.step(0.25);
  assert.equal(x.state, 'downloading');
  assert.ok(x.rate <= speed('14.4').bps);
});

test('a user with one slot makes the second download wait in line', () => {
  const t = new Transfers({ random: () => 0.99, scale: 1 });
  const a = t.add(file({ id: 1, user: 'modem_goblin', conn: '33.6' }));
  const b = t.add(file({ id: 2, user: 'modem_goblin', conn: '33.6', title: 'C' }));
  for (let i = 0; i < 20; i++) t.step(0.25);
  assert.equal(a.state, 'downloading');
  assert.equal(b.state, 'queued');
  assert.match(statusText(b), /^Waiting in line \(2\)$/);
});

test('a refusal fails the transfer with a reason', () => {
  const t = new Transfers({ random: seq(0.5, 0.0, 0.0), scale: 30 });
  const x = t.add(file({ user: 'floppy_phil', conn: '14.4' }));
  let ended = [];
  for (let i = 0; i < 20 && !ended.length; i++) ended = t.step(0.5);
  assert.equal(ended[0], x);
  assert.equal(x.state, 'failed');
  assert.match(statusText(x), /^Remote user /);
});

test('asking for the same song twice does not start it twice; cancel and clear tidy up', () => {
  const t = new Transfers({ random: () => 0.99 });
  const a = t.add(file());
  assert.equal(t.add(file()), a);
  assert.equal(t.list.length, 1);
  t.cancel(a.id);
  assert.equal(t.list.length, 0);
  const b = t.add(file({ id: 2 }));
  b.state = 'done';
  const c = t.add(file({ id: 3 }));
  c.state = 'failed';
  t.add(file({ id: 4 }));
  t.clearFinished();
  assert.equal(t.list.length, 1);
});

test('a finished song can be asked for again after it fails', () => {
  const t = new Transfers({ random: () => 0.99 });
  const a = t.add(file());
  a.state = 'failed';
  const b = t.add(file());
  assert.notEqual(a, b);
});

test('the library keeps one copy of each file and can delete it', () => {
  const lib = new Library();
  assert.ok(lib.add(file({ id: 5 })));
  assert.ok(!lib.add(file({ id: 6 })), 'same name from another user is the same file');
  assert.ok(lib.add(file({ id: 7, title: 'Z' })));
  assert.equal(lib.items.length, 2);
  assert.equal(lib.bytes, 6400000);
  assert.ok(lib.has(file({ id: 99 })));
  lib.remove(5);
  assert.equal(lib.items.length, 1);
  assert.ok(!lib.has(file({ id: 99 })));
});

console.log(`\n${n} tests passed`);
