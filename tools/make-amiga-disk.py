#!/usr/bin/env python3
"""Build bundles/lanparty-amiga.adf, the one floppy that lives in the Amiga 500's drive (js/amiga.js).

    python3 tools/make-amiga-disk.py

A plain Amiga OFS disk, 880 KB: the usual 'DOS' boot block, a root block, a bitmap, one directory (S) and one file
(S/Startup-Sequence, from tools/amiga/Startup-Sequence). The Amiga's Kickstart is AROS, the open-source replacement that
is built into the PUAE core, and it runs that script with its own built-in shell, so nothing here is Commodore's and
nothing needs a ROM. Written by hand rather than with an Amiga tool so that it needs nothing installed and the same
input always gives the same bytes (the dates are fixed at the party: 31 Oct 1998, 11:42 PM).

The layout is the Amiga's old filesystem: 512-byte blocks, 80 tracks x 2 heads x 11 sectors = 1760 blocks. Block 0 and 1
are the boot block, block 880 is the root, 881 the bitmap, and files are a header block plus data blocks of 488 bytes.
tools/amiga.test.mjs reads the result back and checks every checksum.
"""
import datetime
import pathlib
import struct
import sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
SOURCE = ROOT / "tools/amiga/Startup-Sequence"
DEST = ROOT / "bundles/lanparty-amiga.adf"
VOLUME = "LANPARTY"

BLOCK = 512
BLOCKS = 1760
ROOT_BLOCK = 880
BITMAP_BLOCK = 881
HT_SIZE = 72                 # entries in a directory's hash table
DATA_BYTES = BLOCK - 24      # an OFS data block keeps 24 bytes of header
T_HEADER, T_DATA = 2, 8
ST_ROOT, ST_USERDIR, ST_FILE = 1, 2, -3

# 31 Oct 1998, 11:42 PM: days since 1 Jan 1978, minutes since midnight, 1/50 s ticks
DAYS = (datetime.date(1998, 10, 31) - datetime.date(1978, 1, 1)).days
MINS = 23 * 60 + 42
TICKS = 0

# The ordinary boot code for a DOS disk: find dos.library and hand back its init. Every Kickstart (and AROS) takes this.
BOOT_CODE = bytes.fromhex(
    "43fa0018"      # lea     dosname(pc),a1
    "4eaeffa0"      # jsr     -96(a6)          FindResident
    "4a80"          # tst.l   d0
    "670a"          # beq.s   fail
    "2040"          # movea.l d0,a0
    "20680016"      # movea.l 22(a0),a0        the resident's init
    "7000"          # moveq   #0,d0
    "4e75"          # rts
    "70ff"          # fail: moveq #-1,d0
    "4e75"          # rts
) + b"dos.library\x00"


def checksum(words, skip):
    """The value that makes every long in the block add up to zero, with the checksum's own slot left out."""
    total = sum(w for i, w in enumerate(words) if i != skip) & 0xFFFFFFFF
    return (-total) & 0xFFFFFFFF


def put_name(block, offset, name):
    raw = name.encode("latin-1")
    assert len(raw) <= 30
    block[offset] = len(raw)
    block[offset + 1:offset + 1 + len(raw)] = raw


def seal(block, slot=5):
    """Write the block's checksum into long `slot`."""
    words = list(struct.unpack(">128I", bytes(block)))
    struct.pack_into(">I", block, slot * 4, checksum(words, slot))
    return bytes(block)


def long(block, index, value):
    struct.pack_into(">I", block, index * 4, value & 0xFFFFFFFF)


def hash_name(name):
    h = len(name)
    for c in name:
        h = (h * 13 + ord(c.upper())) & 0x7FF
    return h % HT_SIZE


def dated(block):
    long(block, 105, DAYS); long(block, 106, MINS); long(block, 107, TICKS)


def build(source=SOURCE, volume=VOLUME):
    body = source.read_bytes().replace(b"\r\n", b"\n")
    image = bytearray(BLOCKS * BLOCK)
    used = {ROOT_BLOCK, BITMAP_BLOCK}
    nxt = [ROOT_BLOCK + 2]

    def alloc():
        n = nxt[0]; nxt[0] += 1; used.add(n); return n

    # boot block: 'DOS', its checksum (a carry-wrapping sum, unlike the others), the root block's number, then the code
    boot = bytearray(2 * BLOCK)
    boot[0:4] = b"DOS\x00"
    struct.pack_into(">I", boot, 8, ROOT_BLOCK)
    boot[12:12 + len(BOOT_CODE)] = BOOT_CODE
    total = 0
    for i in range(0, len(boot), 4):
        if i == 4: continue
        total += struct.unpack(">I", boot[i:i + 4])[0]
        if total > 0xFFFFFFFF: total = (total & 0xFFFFFFFF) + 1
    struct.pack_into(">I", boot, 4, (~total) & 0xFFFFFFFF)
    image[0:2 * BLOCK] = boot

    root = bytearray(BLOCK)
    s_dir = alloc()
    s_file = alloc()

    # the file's data blocks
    chunks = [body[i:i + DATA_BYTES] for i in range(0, len(body), DATA_BYTES)] or [b""]
    data_blocks = [alloc() for _ in chunks]
    assert len(data_blocks) <= HT_SIZE, "Startup-Sequence too long for one header block"
    for k, (blk, chunk) in enumerate(zip(data_blocks, chunks)):
        b = bytearray(BLOCK)
        long(b, 0, T_DATA); long(b, 1, s_file); long(b, 2, k + 1); long(b, 3, len(chunk))
        long(b, 4, data_blocks[k + 1] if k + 1 < len(data_blocks) else 0)
        b[24:24 + len(chunk)] = chunk
        image[blk * BLOCK:(blk + 1) * BLOCK] = seal(b)

    f = bytearray(BLOCK)
    long(f, 0, T_HEADER); long(f, 1, s_file); long(f, 2, len(data_blocks)); long(f, 4, data_blocks[0])
    for k, blk in enumerate(data_blocks):
        long(f, 6 + HT_SIZE - 1 - k, blk)          # the table is filled from the far end
    long(f, 80, 0)                                  # protection: nothing denied
    long(f, 81, len(body))                          # size in bytes
    dated(f)
    put_name(f, 432, "Startup-Sequence")
    long(f, 125, s_dir); long(f, 127, ST_FILE)
    image[s_file * BLOCK:(s_file + 1) * BLOCK] = seal(f)

    d = bytearray(BLOCK)
    long(d, 0, T_HEADER); long(d, 1, s_dir)
    long(d, 6 + hash_name("Startup-Sequence"), s_file)
    dated(d)
    put_name(d, 432, "S")
    long(d, 125, ROOT_BLOCK); long(d, 127, ST_USERDIR)
    image[s_dir * BLOCK:(s_dir + 1) * BLOCK] = seal(d)

    long(root, 0, T_HEADER); long(root, 3, HT_SIZE)
    long(root, 6 + hash_name("S"), s_dir)
    long(root, 78, 0xFFFFFFFF); long(root, 79, BITMAP_BLOCK)
    dated(root)                                     # the root's own change date, the volume's, and its creation date
    put_name(root, 432, volume)
    for base in (118, 121):
        long(root, base, DAYS); long(root, base + 1, MINS); long(root, base + 2, TICKS)
    long(root, 127, ST_ROOT)
    image[ROOT_BLOCK * BLOCK:(ROOT_BLOCK + 1) * BLOCK] = seal(root)

    # the bitmap: one bit per block from block 2, set where the block is free
    bm = bytearray(BLOCK)
    for blk in range(2, BLOCKS):
        if blk in used: continue
        n = blk - 2
        word = 1 + n // 32
        cur = struct.unpack_from(">I", bm, word * 4)[0]
        struct.pack_into(">I", bm, word * 4, cur | (1 << (n % 32)))
    image[BITMAP_BLOCK * BLOCK:(BITMAP_BLOCK + 1) * BLOCK] = seal(bm, 0)
    return bytes(image)


# The floppies that come in the disk box. (file, volume name, script)
DISKS = [
    ("lanparty-amiga.adf", "LANPARTY", ROOT / "tools/amiga/Startup-Sequence"),
    ("dazza-disk.adf", "DAZZA", ROOT / "tools/amiga/dazza.Startup-Sequence"),
]

if __name__ == "__main__":
    args = sys.argv[1:]
    if args:        # python3 tools/make-amiga-disk.py SCRIPT VOLUME OUT.adf: one disk, for trying things out
        out = pathlib.Path(args[2])
        out.write_bytes(build(pathlib.Path(args[0]), args[1]))
        print(f"wrote {out}")
    else:
        for name, volume, script in DISKS:
            dest = ROOT / "bundles" / name
            dest.write_bytes(build(script, volume))
            print(f"wrote {dest.relative_to(ROOT)} ({dest.stat().st_size} bytes) from {script.relative_to(ROOT)}")
    sys.exit(0)
