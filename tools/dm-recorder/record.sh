#!/bin/sh
# Records a two-bot DOOM deathmatch demo with a vanilla-compatible engine.
#   tools/dm-recorder/record.sh <path to DOOM.WAD> <episode-1 map 1..9> <seed> <out.lmp> [tics]
# Builds doomgeneric (pinned commit) with the bot hooks in engine-hooks.patch, bot.c (the bots) and headless.c (a
# screenless main with a fake clock), so a 3 minute match records in a few seconds. The same map and seed always
# give the same demo. Needs git and gcc; works in a temp dir.
set -e
WAD=$(realpath "$1"); MAP=$2; SEED=$3; OUT=$(realpath -m "$4"); TICS=${5:-6300}
HERE=$(cd "$(dirname "$0")" && pwd)
W=${DM_WORK:-/tmp/dm-recorder}
if [ ! -x "$W/doomgeneric/dg_headless" ]; then
  rm -rf "$W"; mkdir -p "$W"; cd "$W"
  git clone -q https://github.com/ozkl/doomgeneric.git .
  git checkout -q e257a09527062bfb986b6e5e0780839b6cbd5b71
  git apply "$HERE/engine-hooks.patch"
  cp "$HERE/bot.c" "$HERE/headless.c" doomgeneric/
  cd doomgeneric
  SRC="dummy am_map doomdef doomstat dstrings d_event d_items d_iwad d_loop d_main d_mode d_net f_finale f_wipe g_game hu_lib hu_stuff info i_cdmus i_endoom i_joystick i_scale i_sound i_system i_timer memio m_argv m_bbox m_cheat m_config m_controls m_fixed m_menu m_misc m_random p_ceilng p_doors p_enemy p_floor p_inter p_lights p_map p_maputl p_mobj p_plats p_pspr p_saveg p_setup p_sight p_spec p_switch p_telept p_tick p_user r_bsp r_data r_draw r_main r_plane r_segs r_sky r_things sha1 sounds statdump st_lib st_stuff s_sound tables v_video wi_stuff w_checksum w_file w_main w_wad z_zone w_file_stdc i_input i_video doomgeneric bot headless"
  F=""; for f in $SRC; do F="$F $f.c"; done
  gcc -O2 -w -DNORMALUNIX -DLINUX -D_DEFAULT_SOURCE -o dg_headless $F -lm
fi
cd "$W/doomgeneric"
mkdir -p run && cd run && cp "$WAD" DOOM.WAD
../dg_headless -iwad DOOM.WAD -nodraw -nosound -nomusic -nomonsters -altdeath -warp 1 "$MAP" -record REC -bots -botseed "$SEED" -botlimit "$TICS" 2>&1 | grep BOTS || true
mv REC.lmp "$OUT"
