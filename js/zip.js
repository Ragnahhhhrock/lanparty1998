// A tiny zip writer (stored, no compression) so the page can hand js-dos a few small files
// made on the spot, like a Descent pilot named after you. No DOM code: tools/zip.test.mjs tests it.

const TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

export function crc32(bytes) {
  let c = 0xffffffff;
  for (let i = 0; i < bytes.length; i++) c = TABLE[(c ^ bytes[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

const DOS_TIME = 23 << 11 | 42 << 5;           // 11:42 PM, the party's time
const DOS_DATE = (1998 - 1980) << 9 | 11 << 5 | 14; // 14 Nov 1998

// entries: [{ name, data: Uint8Array | string }]  ->  Uint8Array (a .zip)
export function makeZip(entries) {
  const enc = new TextEncoder();
  const files = entries.map((e) => ({
    name: enc.encode(e.name),
    data: typeof e.data === 'string' ? enc.encode(e.data) : e.data,
  }));
  let size = 22;
  for (const f of files) size += 30 + f.name.length + f.data.length + 46 + f.name.length;
  const out = new Uint8Array(size);
  const v = new DataView(out.buffer);
  let p = 0;
  const offsets = [];
  for (const f of files) {
    offsets.push(p);
    f.crc = crc32(f.data);
    v.setUint32(p, 0x04034b50, true);
    v.setUint16(p + 4, 10, true);              // version needed
    v.setUint16(p + 6, 0x0800, true);          // names are UTF-8
    v.setUint16(p + 8, 0, true);               // stored
    v.setUint16(p + 10, DOS_TIME, true);
    v.setUint16(p + 12, DOS_DATE, true);
    v.setUint32(p + 14, f.crc, true);
    v.setUint32(p + 18, f.data.length, true);
    v.setUint32(p + 22, f.data.length, true);
    v.setUint16(p + 26, f.name.length, true);
    v.setUint16(p + 28, 0, true);
    out.set(f.name, p + 30);
    out.set(f.data, p + 30 + f.name.length);
    p += 30 + f.name.length + f.data.length;
  }
  const dirStart = p;
  files.forEach((f, i) => {
    v.setUint32(p, 0x02014b50, true);
    v.setUint16(p + 4, 20, true);              // made by
    v.setUint16(p + 6, 10, true);              // version needed
    v.setUint16(p + 8, 0x0800, true);
    v.setUint16(p + 10, 0, true);
    v.setUint16(p + 12, DOS_TIME, true);
    v.setUint16(p + 14, DOS_DATE, true);
    v.setUint32(p + 16, f.crc, true);
    v.setUint32(p + 20, f.data.length, true);
    v.setUint32(p + 24, f.data.length, true);
    v.setUint16(p + 28, f.name.length, true);
    v.setUint16(p + 30, 0, true);              // extra
    v.setUint16(p + 32, 0, true);              // comment
    v.setUint16(p + 34, 0, true);              // disk
    v.setUint16(p + 36, 0, true);              // internal attrs
    v.setUint32(p + 38, 0, true);              // external attrs
    v.setUint32(p + 42, offsets[i], true);
    out.set(f.name, p + 46);
    p += 46 + f.name.length;
  });
  v.setUint32(p, 0x06054b50, true);
  v.setUint16(p + 8, files.length, true);
  v.setUint16(p + 10, files.length, true);
  v.setUint32(p + 12, p - dirStart, true);
  v.setUint32(p + 16, dirStart, true);
  return out;
}
