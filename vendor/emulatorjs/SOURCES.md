# Vendored emulator

- EmulatorJS 4.2.3 — https://github.com/EmulatorJS/EmulatorJS (GPL-3.0, see LICENSE)
- Core: mupen64plus_next (non-threaded wasm) from https://cdn.emulatorjs.org/stable/data/cores/ — GPL-2.0+, source at https://github.com/EmulatorJS/mupen64plus-next
- Served from this site only; no CDN at run time. Loaded by `frame.html` / `js/n64-frame.js`.
- No ROMs or commercial game data are included. Players supply their own files.
- Core: puae (non-threaded wasm, `puae-wasm.data` and its `reports/puae.json`) from https://cdn.emulatorjs.org/stable/data/cores/ — GPL-2.0, source at https://github.com/libretro/libretro-uae. The Amiga's Kickstart is AROS, the open-source replacement built into the core (https://aros.org), so no ROM is needed. Loaded by `amiga.html` / `js/amiga-frame.js`.
- Local patches to `data/src/emulator.js` (the Amiga's disk box starts several disks at once): `this.allSettings ??= {}` in `setupDisksMenu`, and the `disk` option only calls `setCurrentDisk` when the value is an integer in range and not already current.
