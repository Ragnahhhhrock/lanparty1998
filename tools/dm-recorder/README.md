# DOOM deathmatch demos for spectator mode

`bundles/dm-1.lmp` … `dm-4.lmp` are real DOOM demos of two bots fighting a deathmatch (`-altdeath`, no monsters,
3 minutes each). The real DOS DOOM replays them (see `js/dm-demos.js`, `js/spectator.js`).

| demo | map | seed |
| --- | --- | --- |
| dm-1 | E1M4 | 1 |
| dm-2 | E1M1 | 6 |
| dm-3 | E1M5 | 5 |
| dm-4 | E1M1 | 4 |

Remake one: `tools/dm-recorder/record.sh /path/to/DOOM.WAD <map> <seed> bundles/dm-N.lmp`. The recorder is a headless
build of [doomgeneric](https://github.com/ozkl/doomgeneric) (commit `e257a09`) with `engine-hooks.patch` applied;
`bot.c` is the bots (grid pathfinding through the engine's own collision test, sight checks, weapon and item choice,
circle strafing) and never touches the game's random numbers, so the demo replays exactly. A demo holds only the
keypresses, no game data.

`play.html` plays demos in the browser in the real DOS DOOM, to check one by eye (serve the repo root, open
`/tools/dm-recorder/play.html?demos=dm-1.lmp&view=0`; the demo is shown through player `view`'s eyes).
