# Vendored emulator

- EmulatorJS 4.2.3 — https://github.com/EmulatorJS/EmulatorJS (GPL-3.0, see LICENSE)
- Core: mupen64plus_next (non-threaded wasm) from https://cdn.emulatorjs.org/stable/data/cores/ — GPL-2.0+, source at https://github.com/EmulatorJS/mupen64plus-next
- Served from this site only; no CDN at run time. Loaded by `frame.html` / `js/n64-frame.js`.
- No ROMs or commercial game data are included. Players supply their own files.
