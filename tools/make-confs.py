#!/usr/bin/env python3
"""Builds the tiny js-dos config bundles in bundles/. Each holds only .jsdos/dosbox.conf; the
game files come from bundles/<game>-shareware.zip, which the page loads alongside (js-dos initFs).

Per game:
  conf-<game>-solo.jsdos      boots the game on its own
  conf-<game>-dm<N>.jsdos     'setup' games: IPXSETUP starts an N-player deathmatch (N = 2..4)
  conf-<game>-net.jsdos       'lobby' games: boots the game with the virtual IPX network up and
                              the players make the game from its own multiplayer menu

Keep GAMES in step with js/games.js (tools/games.test.mjs checks the two agree).
The configs are stored, not compressed, so the test can read the command straight out of them."""
import pathlib, zipfile

CONF = """[sdl]
autolock=true
usescancodes=true
[dosbox]
machine=svga_s3
memsize={mem}
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

# mem: DOSBox memory in MB. net: ('setup', command with {n} nodes) or ('lobby', command)
GAMES = {
    'doom':    dict(mem=16, solo='DOOM.EXE',    net=('setup', 'IPXSETUP.EXE -nodes {n} -deathmatch')),
    'heretic': dict(mem=16, solo='HERETIC.EXE', net=('setup', 'IPXSETUP.EXE -nodes {n} -deathmatch')),
    'hexen':   dict(mem=16, solo='HEXEN.EXE',   net=('setup', 'IPXSETUP.EXE -nodes {n} -deathmatch')),
    'quake':   dict(mem=32, solo='QUAKE.EXE -nocdaudio', net=('lobby', 'QUAKE.EXE -nocdaudio')),
    'descent': dict(mem=32, solo='DESCENT.EXE', net=('lobby', 'DESCENT.EXE')),
    'duke':    dict(mem=32, solo='DUKE3D.EXE',  net=('lobby', 'SETUP.EXE')),
}

# Spectator mode (js/spectator.js): DOOM's own title and demo loop, with our recorded deathmatches slipped in as its
# demos by a PWAD that the page makes (js/dm-demos.js). The demos are silent: nobody is listening on these PCs.
SPECTATE = {'doom': 'DOOM.EXE -nosound -file DEMOS.WAD'}

out = pathlib.Path(__file__).resolve().parent.parent / 'bundles'


def write(name, mem, command):
    with zipfile.ZipFile(out / name, 'w', zipfile.ZIP_STORED) as z:
        info = zipfile.ZipInfo('.jsdos/dosbox.conf', date_time=(1998, 11, 14, 23, 42, 0))
        z.writestr(info, CONF.format(mem=mem, command=command).replace('\n', '\r\n'))
    print(name)


for game, g in GAMES.items():
    write(f'conf-{game}-solo.jsdos', g['mem'], g['solo'])
    kind, command = g['net']
    if kind == 'setup':
        for n in (2, 3, 4):
            write(f'conf-{game}-dm{n}.jsdos', g['mem'], command.format(n=n))
    else:
        write(f'conf-{game}-net.jsdos', g['mem'], command)

for game, command in SPECTATE.items():
    write(f'conf-{game}-spectate.jsdos', GAMES[game]['mem'], command)
