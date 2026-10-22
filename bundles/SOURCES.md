# Where the game files came from

Every game here is a shareware release that its publisher said could be copied freely. Nothing is modified. Config bundles (`conf-*.jsdos`) are ours, built by `tools/make-confs.py`.

| File | What it is | Got it from |
| --- | --- | --- |
| `doom-shareware.zip` | DOOM 1.9 shareware (DOOM1.WAD, IPXSETUP) | shareware release; source not recorded when added |
| `heretic-shareware.zip` | Heretic 1.3 shareware | shareware release; source not recorded when added |
| `descent-shareware.zip` | Descent 1.0 shareware | shareware release; source not recorded when added |
| `hexen-shareware.zip` | Hexen 4 level demo (`hexndemo.zip`, unchanged) | id Software's FTP mirror, `idstuff/hexen/hexndemo.zip` |
| `quake-shareware.zip` | Quake 1.06 shareware: `QUAKE.EXE`, `CWSDPMI.EXE`, `ID1/PAK0.PAK` and the licence texts | `quake106.zip` (md5 `8cee4d03ee092909fdb6a4f84f0c1357`). Its `RESOURCE.1` is an LHA self-extractor; the files were unpacked from it and zipped, nothing else changed |

| `duke-shareware.zip` | Duke Nukem 3D 1.3D shareware (episode one): the installed game files plus `DUKE3D.CFG`, a SETUP-written config that came in that bundle | archive.org item `3dduke13SW`, `emulator.zip` (the installed form of `3dduke13SW.zip`, md5 `04e4ca70b8a2d59ed56c451c5c1d5d39`). Its `LICENSE.TXT` lets free WWW sites offer it for download and is kept in the zip |

`lanparty-amiga.adf` is the Amiga 500's floppy: ours, built by `tools/make-amiga-disk.py` from `tools/amiga/Startup-Sequence`. It holds a script and nothing else, and needs no ROM.

`descent-pilot.plr` is a blank pilot file the game writes itself; `js/emulator.js` renames it per player.

Not here on purpose: Rise of the Triad, StarCraft (no redistributable release exists) and anything commercial. Duke Nukem 3D's engine source is open (GPL) but its game data is not; only the shareware episode above is bundled.
