#!/usr/bin/env python3
"""Builds the tiny js-dos config bundles in bundles/: one for solo DOOM and one per
deathmatch size. Each holds only .jsdos/dosbox.conf; the game files come from
bundles/doom-shareware.zip, which the page loads alongside (js-dos initFs)."""
import pathlib, zipfile

CONF = """[sdl]
autolock=true
usescancodes=true
[dosbox]
machine=svga_s3
memsize=16
[cpu]
core=auto
cputype=auto
cycles=auto
[mixer]
rate=44100
blocksize=1024
prebuffer=20
[sblaster]
sbtype=sb16
sbbase=220
irq=7
dma=1
hdma=5
[speaker]
pcspeaker=true
[dos]
xms=true
ems=true
umb=true
[ipx]
ipx=true
[autoexec]
echo off
mount c .
c:
echo on
{command}
"""

out = pathlib.Path(__file__).resolve().parent.parent / 'bundles'
targets = {'conf-solo.jsdos': 'DOOM.EXE'}
for n in (2, 3, 4):
    targets[f'conf-dm{n}.jsdos'] = f'IPXSETUP.EXE -nodes {n} -deathmatch'
for name, command in targets.items():
    with zipfile.ZipFile(out / name, 'w', zipfile.ZIP_DEFLATED) as z:
        info = zipfile.ZipInfo('.jsdos/dosbox.conf', date_time=(1998, 11, 14, 23, 42, 0))
        z.writestr(info, CONF.format(command=command).replace('\n', '\r\n'))
    print(name)
