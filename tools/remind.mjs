#!/usr/bin/env node
// Emails everyone on the invite list to come and play at https://lanparty1998.com
//
//   node tools/remind.mjs                      dry run: shows who would get the email, sends nothing
//   node tools/remind.mjs --send               really sends
//   node tools/remind.mjs --list my.csv        use another list (default tools/invitees.csv)
//   node tools/remind.mjs --room friday        invite them to a private room (?room=friday)
//   node tools/remind.mjs --when "Sat 7:30 PM" put a start time in the email
//
// The list is a CSV (or plain text) with one person per line: `email,name`. Lines starting with # are skipped.
// Sending uses Resend (https://resend.com) and needs RESEND_API_KEY and REMIND_FROM in the environment,
// e.g. REMIND_FROM="LAN Party '98 <party@lanparty1998.com>" (the domain must be verified in Resend).
// The real list holds people's addresses, so tools/invitees.csv is gitignored. Copy invitees.example.csv.
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

export const SITE = 'https://lanparty1998.com';
const EMAIL_RE = /^[^\s@,<>]+@[^\s@,<>]+\.[^\s@,<>]+$/;

// Parse "email,name" lines. Returns { people: [{email, name}], skipped: [line...] }.
export function parseList(text) {
  const people = [];
  const skipped = [];
  const seen = new Set();
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const [first, ...rest] = line.split(',');
    const email = first.trim().replace(/^"|"$/g, '');
    if (/^email$/i.test(email)) continue; // header row
    if (!EMAIL_RE.test(email)) { skipped.push(line); continue; }
    const key = email.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    people.push({ email, name: rest.join(',').trim().replace(/^"|"$/g, '') });
  }
  return { people, skipped };
}

export function inviteUrl(room) {
  return room ? `${SITE}/?room=${encodeURIComponent(room)}` : `${SITE}/`;
}

// Plain text on purpose: it is 1998.
export function buildMessage(person, { room, when } = {}) {
  const url = inviteUrl(room);
  const hi = person.name ? `Oi ${person.name},` : 'Oi,';
  const time = when ? `Doors open ${when}. ` : '';
  const text = [
    hi,
    '',
    `The LAN party is on. ${time}Six beige boxes, one 10BASE-T hub and a crate of Volt Cola.`,
    '',
    `Walk in: ${url}`,
    '',
    'Pick a handle, grab a free PC, press E, and frag. Bring a mate: everyone online shares the same basement.',
    '',
    'Reply STOP and you will not get another one.',
    '',
    '-- LAN Party \'98',
    SITE,
    '',
  ].join('\n');
  return { to: person.email, subject: "LAN Party '98: come and frag", text };
}

async function sendOne(msg, { apiKey, from }) {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from, to: [msg.to], subject: msg.subject, text: msg.text }),
  });
  if (!res.ok) throw new Error(`${res.status} ${await res.text()}`);
}

export function parseArgs(argv) {
  const o = { send: false, list: 'tools/invitees.csv', room: '', when: '' };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--send') o.send = true;
    else if (a === '--list') o.list = argv[++i];
    else if (a === '--room') o.room = argv[++i];
    else if (a === '--when') o.when = argv[++i];
    else throw new Error(`Unknown option: ${a}`);
  }
  return o;
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  if (!existsSync(opts.list)) {
    console.error(`No list at ${opts.list}. Copy tools/invitees.example.csv to tools/invitees.csv and fill it in.`);
    process.exit(1);
  }
  const { people, skipped } = parseList(readFileSync(opts.list, 'utf8'));
  for (const s of skipped) console.warn(`skipped (not an email): ${s}`);
  if (!people.length) { console.error('Nobody on the list.'); process.exit(1); }

  if (!opts.send) {
    console.log(`DRY RUN: ${people.length} people would be emailed (add --send to send):`);
    for (const p of people) console.log(`  ${p.name ? `${p.name} <${p.email}>` : p.email}`);
    console.log('\n--- sample ---');
    const m = buildMessage(people[0], opts);
    console.log(`To: ${m.to}\nSubject: ${m.subject}\n\n${m.text}`);
    return;
  }

  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.REMIND_FROM;
  if (!apiKey || !from) { console.error('Set RESEND_API_KEY and REMIND_FROM to send.'); process.exit(1); }
  let sent = 0;
  let failed = 0;
  for (const p of people) {
    try {
      await sendOne(buildMessage(p, opts), { apiKey, from });
      sent++;
      console.log(`sent    ${p.email}`);
    } catch (e) {
      failed++;
      console.error(`FAILED  ${p.email}: ${e.message}`);
    }
    await new Promise(r => setTimeout(r, 600)); // stay under the provider's rate limit
  }
  console.log(`\nDone: ${sent} sent, ${failed} failed.`);
  if (failed) process.exit(1);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) main();
