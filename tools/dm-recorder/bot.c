// bot.c - two deathmatch bots for recording vanilla-compatible DOOM demos.
// Bots never touch the game RNG (own xorshift), so the recorded demo replays
// identically in any vanilla-compatible engine, including DOS DOOM 1.9.
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <math.h>

#include "doomdef.h"
#include "doomstat.h"
#include "d_player.h"
#include "d_ticcmd.h"
#include "d_event.h"
#include "info.h"
#include "m_argv.h"
#include "g_game.h"
#include "p_local.h"
#include "p_mobj.h"
#include "p_tick.h"
#include "r_state.h"
#include "r_main.h"
#include "tables.h"
#include "i_system.h"
#include "m_bbox.h"

extern byte consistancy[MAXPLAYERS][BACKUPTICS];
extern gameaction_t gameaction;
boolean bot_mode = false;
int bots_limit = 6300;

static unsigned seedbase = 1;
typedef struct {
    unsigned rng;
    mobj_t *lastmo;
    int deadtics;
    int *path; int pathlen, pathcap, pathidx;
    fixed_t gx, gy; int goalkind;
    fixed_t goalx, goaly; int goalstart;
    int replan;
    int strafedir, strafeleft;
    fixed_t px, py; int unstick, unstickdir, stuckcount;
    fixed_t lastdist;
    int wpnhold;
    int accuracy;
    int aggression;
} bot_t;
static struct { fixed_t x, y; int until; } black[2][32]; static int nblack[2];
static bot_t bots[2]; static int stat_vis[2], stat_fire[2];
static unsigned rnd(bot_t *b) { unsigned x = b->rng; x ^= x << 13; x ^= x >> 17; x ^= x << 5; b->rng = x; return x; }
static int rr(bot_t *b, int n) { return (int)(rnd(b) % (unsigned)n); }
static fixed_t dist2d(fixed_t x1, fixed_t y1, fixed_t x2, fixed_t y2) { return P_AproxDistance(x2 - x1, y2 - y1); }


// ---------- grid navigation built with the engine's own collision test ----------
#define CELLU 16
#define CELL (CELLU * FRACUNIT)
static int gw, gh, ncell;
static fixed_t gx0, gy0;
static unsigned char *gvalid, *gfl; static short *gdoor;       // fl: 1 door, 2 hurt, 4 lift
static int *gfloor; static short *gsec;
static int *gdist, *gprev;
static int *heapc, *heapd; static int heapn;



static boolean sector_is_door(sector_t *s)
{
    int i;
    if (s->ceilingheight - s->floorheight >= 56 * FRACUNIT) return false;
    for (i = 0; i < s->linecount; i++) if (s->lines[i]->special) return true;
    return false;
}
static boolean is_exit_special(int sp) { return sp == 11 || sp == 51 || sp == 52 || sp == 124; }

static boolean near_exit(fixed_t x, fixed_t y)
{
    int i;
    for (i = 0; i < numlines; i++)
    {
        line_t *l = &lines[i];
        double ax, ay, bx, by, t, px, py, dx, dy;
        if (!is_exit_special(l->special)) continue;
        ax = l->v1->x; ay = l->v1->y; bx = l->v2->x; by = l->v2->y;
        dx = bx - ax; dy = by - ay;
        t = dx * dx + dy * dy > 0 ? ((x - ax) * dx + (y - ay) * dy) / (dx * dx + dy * dy) : 0;
        if (t < 0) t = 0; if (t > 1) t = 1;
        px = ax + t * dx; py = ay + t * dy;
        if (hypot(px - x, py - y) < 110.0 * FRACUNIT) return true;
    }
    return false;
}

static boolean pcheck_pos(mobj_t *d, fixed_t x, fixed_t y);
static void build_grid(void)
{
    int i, cx, cy;
    fixed_t minx = 1 << 30, miny = 1 << 30, maxx = -(1 << 30), maxy = -(1 << 30);
    fixed_t *saved = malloc(numsectors * sizeof(fixed_t));
    mobj_t dummy;
    int pf[2] = {0, 0};
    for (i = 0; i < numvertexes; i++)
    {
        if (vertexes[i].x < minx) minx = vertexes[i].x;
        if (vertexes[i].x > maxx) maxx = vertexes[i].x;
        if (vertexes[i].y < miny) miny = vertexes[i].y;
        if (vertexes[i].y > maxy) maxy = vertexes[i].y;
    }
    gx0 = minx; gy0 = miny;
    gw = (maxx - minx) / CELL + 1; gh = (maxy - miny) / CELL + 1; ncell = gw * gh;
    free(gvalid); free(gfl); free(gfloor); free(gsec); free(gdist); free(gprev); free(heapc); free(heapd);
    gvalid = calloc(ncell, 1); gfl = calloc(ncell, 1); gfloor = calloc(ncell, sizeof(int)); gsec = calloc(ncell, sizeof(short)); free(gdoor); gdoor = calloc(ncell, sizeof(short));
    gdist = calloc(ncell, sizeof(int)); gprev = calloc(ncell, sizeof(int));
    heapc = malloc(ncell * 10 * sizeof(int)); heapd = malloc(ncell * 10 * sizeof(int));
    for (i = 0; i < numsectors; i++)
    {
        saved[i] = sectors[i].ceilingheight;
        if (sector_is_door(&sectors[i])) sectors[i].ceilingheight = sectors[i].floorheight + 128 * FRACUNIT;
    }
    for (i = 0; i < 2; i++) if (players[i].mo) { pf[i] = players[i].mo->flags & MF_SOLID; players[i].mo->flags &= ~MF_SOLID; }
    memset(&dummy, 0, sizeof(dummy));
    dummy.flags = MF_DROPOFF;
    dummy.radius = 16 * FRACUNIT; dummy.height = 56 * FRACUNIT;
    for (cy = 0; cy < gh; cy++)
        for (cx = 0; cx < gw; cx++)
        {
            int c = cy * gw + cx;
            fixed_t x = gx0 + cx * CELL + CELL / 2, y = gy0 + cy * CELL + CELL / 2;
            subsector_t *ss = R_PointInSubsector(x, y);
            sector_t *sec = ss->sector;
            dummy.z = sec->floorheight;
            if (!pcheck_pos(&dummy, x, y)) continue;
            if (tmceilingz - tmfloorz < 56 * FRACUNIT) continue;
            gvalid[c] = 1; gfloor[c] = tmfloorz; gsec[c] = sec - sectors;
            if (saved[sec - sectors] - sec->floorheight < 56 * FRACUNIT && sector_is_door(sec) == false && 0) {}
            if (sec->special == 4 || sec->special == 5 || sec->special == 7 || sec->special == 16) gfl[c] |= 2;
            if (sec->tag) gfl[c] |= 4;
        }
    // flag cells near the lines of closed door sectors (door sectors can be thinner than a cell)
    for (i = 0; i < numsectors; i++)
    {
        int k;
        if (sectors[i].ceilingheight == saved[i]) continue;
        for (k = 0; k < sectors[i].linecount; k++)
        {
            line_t *l = sectors[i].lines[k];
            int x0 = (l->bbox[BOXLEFT] - 48 * FRACUNIT - gx0) / CELL, x1 = (l->bbox[BOXRIGHT] + 48 * FRACUNIT - gx0) / CELL;
            int y0 = (l->bbox[BOXBOTTOM] - 48 * FRACUNIT - gy0) / CELL, y1 = (l->bbox[BOXTOP] + 48 * FRACUNIT - gy0) / CELL;
            int cx, cy;
            if (x0 < 0) x0 = 0; if (y0 < 0) y0 = 0; if (x1 >= gw) x1 = gw - 1; if (y1 >= gh) y1 = gh - 1;
            for (cy = y0; cy <= y1; cy++)
                for (cx = x0; cx <= x1; cx++)
                {
                    double ax = l->v1->x, ay = l->v1->y, dx = l->dx, dy = l->dy, px = gx0 + cx * CELL + CELL / 2, py = gy0 + cy * CELL + CELL / 2;
                    double t = (dx * dx + dy * dy) > 0 ? ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy) : 0;
                    if (t < 0) t = 0; if (t > 1) t = 1;
                    if (hypot(ax + t * dx - px, ay + t * dy - py) < 40.0 * FRACUNIT) { gfl[cy * gw + cx] |= 1; gdoor[cy * gw + cx] = i + 1; }
                }
        }
    }
    for (i = 0; i < numsectors; i++) sectors[i].ceilingheight = saved[i];
    for (i = 0; i < 2; i++) if (players[i].mo) players[i].mo->flags |= pf[i];
    free(saved);
}

static boolean pcheck_pos(mobj_t *d, fixed_t x, fixed_t y) { return P_CheckPosition(d, x, y); }

static int cell_of(fixed_t x, fixed_t y)
{
    int cx = (x - gx0) / CELL, cy = (y - gy0) / CELL;
    if (cx < 0) cx = 0; if (cy < 0) cy = 0; if (cx >= gw) cx = gw - 1; if (cy >= gh) cy = gh - 1;
    return cy * gw + cx;
}
static fixed_t cell_x(int c) { return gx0 + (c % gw) * CELL + CELL / 2; }
static fixed_t cell_y(int c) { return gy0 + (c / gw) * CELL + CELL / 2; }

static int nearest_valid(int c)
{
    int r, dx, dy, cx = c % gw, cy = c / gw;
    if (gvalid[c]) return c;
    for (r = 1; r <= 4; r++)
        for (dy = -r; dy <= r; dy++)
            for (dx = -r; dx <= r; dx++)
            {
                int x = cx + dx, y = cy + dy;
                if (x < 0 || y < 0 || x >= gw || y >= gh) continue;
                if (gvalid[y * gw + x]) return y * gw + x;
            }
    return -1;
}

static void hpush(int c, int d)
{
    int i = heapn++;
    while (i > 0)
    {
        int p = (i - 1) / 2;
        if (heapd[p] <= d) break;
        heapc[i] = heapc[p]; heapd[i] = heapd[p]; i = p;
    }
    heapc[i] = c; heapd[i] = d;
}
static void hpop(int *c, int *d)
{
    int i = 0, lc, ld;
    *c = heapc[0]; *d = heapd[0];
    heapn--;
    if (heapn == 0) return;
    lc = heapc[heapn]; ld = heapd[heapn];
    for (;;)
    {
        int ch = 2 * i + 1;
        if (ch >= heapn) break;
        if (ch + 1 < heapn && heapd[ch + 1] < heapd[ch]) ch++;
        if (heapd[ch] >= ld) break;
        heapc[i] = heapc[ch]; heapd[i] = heapd[ch]; i = ch;
    }
    heapc[i] = lc; heapd[i] = ld;
}

static boolean edge_ok(int a, int b)
{
    if (!gvalid[b]) return false;
    if (gfloor[b] - gfloor[a] > 24 * FRACUNIT && !(gfl[a] & 4)) return false;
    return true;
}

static void run_dijkstra(int start)
{
    static const int dxs[8] = {1, -1, 0, 0, 1, 1, -1, -1}, dys[8] = {0, 0, 1, -1, 1, -1, 1, -1};
    int i;
    for (i = 0; i < ncell; i++) { gdist[i] = 1 << 30; gprev[i] = -1; }
    heapn = 0;
    gdist[start] = 0; hpush(start, 0);
    while (heapn)
    {
        int c, d, k, cx, cy;
        hpop(&c, &d);
        if (d > gdist[c]) continue;
        cx = c % gw; cy = c / gw;
        for (k = 0; k < 8; k++)
        {
            int nx = cx + dxs[k], ny = cy + dys[k], n, cost;
            if (nx < 0 || ny < 0 || nx >= gw || ny >= gh) continue;
            n = ny * gw + nx;
            if (!edge_ok(c, n)) continue;
            if (k >= 4)
            {
                int o1 = cy * gw + nx, o2 = ny * gw + cx;
                if (!edge_ok(c, o1) || !edge_ok(c, o2)) continue;
                cost = 14;
            }
            else cost = 10;
            if (gfl[n] & 2) cost += 40;
            if (gfl[n] & 1) cost += 15;
            if (d + cost < gdist[n]) { gdist[n] = d + cost; gprev[n] = c; hpush(n, d + cost); }
        }
    }
}

static int value_of(mobj_t *m, player_t *pl)
{
    switch (m->sprite)
    {
    case SPR_SHOT: return pl->weaponowned[wp_shotgun] ? (pl->ammo[am_shell] < pl->maxammo[am_shell] ? 140 : 0) : 700;
    case SPR_SGN2: return pl->weaponowned[wp_supershotgun] ? (pl->ammo[am_shell] < pl->maxammo[am_shell] ? 140 : 0) : 850;
    case SPR_MGUN: return pl->weaponowned[wp_chaingun] ? (pl->ammo[am_clip] < pl->maxammo[am_clip] ? 140 : 0) : 800;
    case SPR_LAUN: return pl->weaponowned[wp_missile] ? (pl->ammo[am_misl] < pl->maxammo[am_misl] ? 140 : 0) : 900;
    case SPR_PLAS: return pl->weaponowned[wp_plasma] ? (pl->ammo[am_cell] < pl->maxammo[am_cell] ? 140 : 0) : 950;
    case SPR_BFUG: return pl->weaponowned[wp_bfg] ? 100 : 900;
    case SPR_CSAW: return pl->weaponowned[wp_chainsaw] ? 0 : 350;
    case SPR_CLIP: case SPR_AMMO: return pl->ammo[am_clip] < pl->maxammo[am_clip] ? 90 + (pl->ammo[am_clip] < 30 ? 120 : 0) : 0;
    case SPR_SHEL: case SPR_SBOX: return pl->ammo[am_shell] < pl->maxammo[am_shell] ? 90 + (pl->ammo[am_shell] < 10 ? 120 : 0) : 0;
    case SPR_ROCK: case SPR_BROK: return pl->ammo[am_misl] < pl->maxammo[am_misl] ? 90 + (pl->ammo[am_misl] < 5 ? 120 : 0) : 0;
    case SPR_CELL: case SPR_CELP: return pl->ammo[am_cell] < pl->maxammo[am_cell] ? 90 + (pl->ammo[am_cell] < 20 ? 120 : 0) : 0;
    case SPR_STIM: case SPR_MEDI: return pl->health < 100 ? (100 - pl->health) * 9 : 0;
    case SPR_BON1: return pl->health < 200 ? 90 : 0;
    case SPR_BON2: return pl->armorpoints < 200 ? 90 : 0;
    case SPR_SOUL: return 650;
    case SPR_MEGA: return 800;
    case SPR_ARM1: return pl->armorpoints < 100 ? 350 : 0;
    case SPR_ARM2: return pl->armorpoints < 200 ? 550 : 0;
    case SPR_PINV: return 500;
    case SPR_PSTR: return 350;
    case SPR_BPAK: return 250;
    case SPR_SUIT: case SPR_PMAP: case SPR_PVIS: return 40;
    default: return 0;
    }
}

static boolean is_alive(player_t *p) { return p->mo && p->playerstate == PST_LIVE && p->health > 0; }

static void plan(int bi, player_t *pl, player_t *en)
{
    bot_t *b = &bots[bi];
    thinker_t *th;
    mobj_t *mo = pl->mo;
    double bestscore = -1;
    int bestcell = -1, bkind = 0;
    fixed_t bx = 0, by = 0;
    int start = nearest_valid(cell_of(mo->x, mo->y));
    if (start < 0) { b->pathlen = 0; b->goalkind = 0; return; }
    run_dijkstra(start);
    for (th = thinkercap.next; th != &thinkercap; th = th->next)
    {
        mobj_t *m;
        int v, c, cell, q, skip = 0;
        double score;
        if (th->function.acp1 != (actionf_p1)P_MobjThinker) continue;
        m = (mobj_t *)th;
        if (!(m->flags & MF_SPECIAL)) continue;
        v = value_of(m, pl);
        if (v <= 0) continue;
        for (q = 0; q < 32; q++)
            if (black[bi][q].until > gametic && abs(black[bi][q].x - m->x) < 8 * FRACUNIT && abs(black[bi][q].y - m->y) < 8 * FRACUNIT) skip = 1;
        if (skip) continue;
        cell = nearest_valid(cell_of(m->x, m->y));
        if (cell < 0 || gdist[cell] >= (1 << 29)) continue;
        c = gdist[cell] * CELLU / 10;
        score = (double)v / (c + 250.0);
        if (score > bestscore) { bestscore = score; bestcell = cell; bx = m->x; by = m->y; bkind = 1; }
    }
    if (is_alive(en))
    {
        int cell = nearest_valid(cell_of(en->mo->x, en->mo->y));
        int good = pl->weaponowned[wp_shotgun] || pl->weaponowned[wp_chaingun] || pl->weaponowned[wp_missile] || pl->weaponowned[wp_plasma] || pl->weaponowned[wp_supershotgun];
        double v = pl->health >= 50 ? (good ? 9000 : 5000) : (pl->health >= 30 ? 1500 : 250);
        v = v * b->aggression / 100.0;
        if (cell >= 0 && gdist[cell] < (1 << 29))
        {
            double score = v / (gdist[cell] * CELLU / 10 + 250.0);
            if (score > bestscore) { bestscore = score; bestcell = cell; bx = en->mo->x; by = en->mo->y; bkind = 2; }
        }
    }
    if (bkind == 0)
    {
        // wander: random reachable cell
        int tries;
        for (tries = 0; tries < 200; tries++)
        {
            int c = rr(b, ncell);
            if (gvalid[c] && gdist[c] < (1 << 29) && gdist[c] > 300) { bestcell = c; bx = cell_x(c); by = cell_y(c); bkind = 1; break; }
        }
    }
    if (bkind == 1)
    {
        if (abs(bx - b->goalx) < 8 * FRACUNIT && abs(by - b->goaly) < 8 * FRACUNIT)
        {
            if (gametic - b->goalstart > 420)
            {
                black[bi][nblack[bi]++ & 31].x = bx; black[bi][(nblack[bi] - 1) & 31].y = by; black[bi][(nblack[bi] - 1) & 31].until = gametic + 3000;
                b->goalx = b->goaly = 0; b->goalstart = gametic;
                b->replan = 1;
            }
        }
        else { b->goalx = bx; b->goaly = by; b->goalstart = gametic; }
    }
    b->goalkind = bkind; b->pathlen = 0; b->pathidx = 0;
    b->gx = bx; b->gy = by;
    if (bestcell >= 0)
    {
        int n = 0, c = bestcell, i;
        while (c >= 0) { n++; c = gprev[c]; }
        if (n > b->pathcap) { b->pathcap = n + 64; b->path = realloc(b->path, b->pathcap * sizeof(int)); }
        c = bestcell; i = n;
        while (c >= 0) { b->path[--i] = c; c = gprev[c]; }
        b->pathlen = n;
    }
}

static int clampi(int v, int lo, int hi) { return v < lo ? lo : v > hi ? hi : v; }

static void turn_toward(bot_t *b, mobj_t *mo, angle_t target, int maxturn, ticcmd_t *cmd)
{
    int diff = (int)(target - mo->angle) >> 16;
    int t = clampi(diff, -maxturn, maxturn);
    (void)b;
    t = ((t + 128) >> 8) << 8;
    cmd->angleturn = (short)t;
}

static int pick_weapon(player_t *pl, fixed_t d)
{
    int dd = d >> 16;
    if (pl->powers[pw_strength] && dd < 70 && pl->weaponowned[wp_fist]) return wp_fist;
    if (pl->weaponowned[wp_plasma] && pl->ammo[am_cell] >= 1) return wp_plasma;
    if (pl->weaponowned[wp_bfg] && pl->ammo[am_cell] >= 40 && dd > 300) return wp_bfg;
    if (pl->weaponowned[wp_supershotgun] && pl->ammo[am_shell] >= 2 && dd < 700) return wp_supershotgun;
    if (pl->weaponowned[wp_missile] && pl->ammo[am_misl] >= 1 && dd >= 240) return wp_missile;
    if (pl->weaponowned[wp_chaingun] && pl->ammo[am_clip] >= 1) return wp_chaingun;
    if (pl->weaponowned[wp_shotgun] && pl->ammo[am_shell] >= 1 && dd < 1000) return wp_shotgun;
    if (pl->weaponowned[wp_pistol] && pl->ammo[am_clip] >= 1) return wp_pistol;
    if (pl->weaponowned[wp_chainsaw] && dd < 90) return wp_chainsaw;
    if (pl->weaponowned[wp_shotgun] && pl->ammo[am_shell] >= 1) return wp_shotgun;
    return wp_fist;
}

static boolean weapon_has_ammo(player_t *pl, int w)
{
    switch (w)
    {
    case wp_pistol: case wp_chaingun: return pl->ammo[am_clip] >= 1;
    case wp_shotgun: return pl->ammo[am_shell] >= 1;
    case wp_supershotgun: return pl->ammo[am_shell] >= 2;
    case wp_missile: return pl->ammo[am_misl] >= 1;
    case wp_plasma: return pl->ammo[am_cell] >= 1;
    case wp_bfg: return pl->ammo[am_cell] >= 40;
    default: return true;
    }
}

void Bot_Build(int pn, ticcmd_t *cmd)
{
    bot_t *b = &bots[pn];
    player_t *pl = &players[pn], *en = &players[1 - pn];
    mobj_t *mo = pl->mo;
    byte buf = (gametic / ticdup) % BACKUPTICS;
    int forward = 0, side = 0, buttons = 0, maxturn = 640;
    boolean seen; int door = 0;
    memset(cmd, 0, sizeof(*cmd));
    cmd->consistancy = consistancy[pn][buf];
    if (!mo) return;
    if (mo != b->lastmo)
    {
        b->lastmo = mo; b->pathlen = 0; b->replan = 0; b->deadtics = 0; b->unstick = 0; b->stuckcount = 0;
        b->px = mo->x; b->py = mo->y;
    }
    if (pn == 0 && getenv("BOTFRAGS"))
    {
        static int last[4];
        int cur[4] = { players[0].frags[1], players[1].frags[0], players[0].frags[0], players[1].frags[1] }, k;
        for (k = 0; k < 4; k++) if (cur[k] != last[k]) { fprintf(stderr, "FRAG t=%d p0kills=%d p1kills=%d p0self=%d p1self=%d\n", gametic, cur[0], cur[1], cur[2], cur[3]); break; }
        for (k = 0; k < 4; k++) last[k] = cur[k];
    }
    if (pl->playerstate == PST_DEAD || pl->health <= 0)
    {
        b->deadtics++;
        if (b->deadtics > 45 && (b->deadtics & 7) == 0) buttons |= BT_USE;
        cmd->buttons = buttons;
        return;
    }
    b->deadtics = 0;

    if (--b->replan <= 0)
    {
        plan(pn, pl, en);
        b->replan = 20 + rr(b, 15);
    }

    seen = is_alive(en) && P_CheckSight(mo, en->mo);
    if (seen)
    {
        fixed_t d = dist2d(mo->x, mo->y, en->mo->x, en->mo->y);
        int dd = d >> 16;
        angle_t want = R_PointToAngle2(mo->x, mo->y, en->mo->x, en->mo->y);
        int diff, tol, ready;
        int noise = rr(b, 2 * b->accuracy + 1) - b->accuracy;
        want += (angle_t)((long long)noise * (ANG90 / 900));
        diff = (int)(want - mo->angle);
        maxturn = 1100;
        turn_toward(b, mo, want, maxturn, cmd);
        if (b->wpnhold > 0) b->wpnhold--;
        if (b->wpnhold == 0 || !weapon_has_ammo(pl, pl->readyweapon))
        {
            int w = pick_weapon(pl, d);
            if (w != pl->readyweapon && pl->pendingweapon == wp_nochange)
            {
                buttons |= BT_CHANGE | (w << BT_WEAPONSHIFT);
                b->wpnhold = 40;
            }
            else b->wpnhold = 12;
        }
        stat_vis[pn]++;
        ready = weapon_has_ammo(pl, pl->readyweapon);
        tol = dd < 300 ? 4 : (dd < 800 ? 2 : 1);
        if (pl->readyweapon == wp_fist || pl->readyweapon == wp_chainsaw) ready = ready && dd < 90;
        if (pl->readyweapon == wp_missile) ready = ready && dd > 120;
        if (ready && abs(diff >> 16) < tol * 182 + 40) { buttons |= BT_ATTACK; stat_fire[pn]++; }
        if (--b->strafeleft <= 0) { b->strafedir = (rr(b, 2) ? 1 : -1); b->strafeleft = 18 + rr(b, 40); }
        side = b->strafedir * 40;
        if (pl->readyweapon == wp_fist || pl->readyweapon == wp_chainsaw || dd > 650) forward = 50;
        else if (dd < 220) forward = -40;
        else if (rr(b, 12) == 0) forward = 25;
        b->lastdist = 0;
    }
    else
    {
        fixed_t tx = b->gx, ty = b->gy;
        int i;
        if (b->pathlen > 0)
        {
            int best = b->pathidx, lim = b->pathidx + 14 < b->pathlen ? b->pathidx + 14 : b->pathlen;
            fixed_t bd = 1 << 30;
            for (i = b->pathidx; i < lim; i++)
            {
                fixed_t dd2 = dist2d(mo->x, mo->y, cell_x(b->path[i]), cell_y(b->path[i]));
                if (dd2 < bd) { bd = dd2; best = i; }
            }
            b->pathidx = best;
            i = best + 4; if (i >= b->pathlen) i = b->pathlen - 1;
            tx = cell_x(b->path[i]); ty = cell_y(b->path[i]);
            for (i = best; i < best + 10 && i < b->pathlen; i++)
                if (gfl[b->path[i]] & 1)
                {
                    sector_t *ds = &sectors[gdoor[b->path[i]] - 1];
                    if (ds->ceilingheight - ds->floorheight < 24 * FRACUNIT) door = 1;   // closed: press use
                    else door = 2;                                                       // opening or open: just walk
                    break;
                }
            if (best >= b->pathlen - 2 && b->replan > 4) b->replan = 4;
        }
        else if (b->replan > 5) b->replan = 5;
        if (b->unstick > 0)
        {
            b->unstick--;
            side = b->unstickdir * 40; forward = (b->unstick & 4) ? 30 : -30;
            if ((b->unstick & 15) == 5 && !near_exit(mo->x, mo->y)) buttons |= BT_USE;
            turn_toward(b, mo, mo->angle + (angle_t)(b->unstickdir * ANG45 / 4), 300, cmd);
        }
        else
        {
            angle_t want = R_PointToAngle2(mo->x, mo->y, tx, ty);
            int diff = (int)(want - mo->angle) >> 16;
            turn_toward(b, mo, want, 800, cmd);
            forward = abs(diff) < 4000 ? 50 : (abs(diff) < 12000 ? 25 : 0);
            if (((door == 1) || (gfl[nearest_valid(cell_of(mo->x, mo->y))] & 4)) && (gametic & 7) == 0 && !near_exit(mo->x, mo->y)) buttons |= BT_USE;
        }
    }

    if ((gametic & 31) == 0)
    {
        fixed_t dt = dist2d(mo->x, mo->y, b->gx, b->gy);
        boolean moved = dist2d(mo->x, mo->y, b->px, b->py) >= 24 * FRACUNIT;
        if (!seen && b->unstick == 0 && forward != 0 && !moved && !(door && b->stuckcount < 4 && ++b->stuckcount))
        {
            if (++b->stuckcount >= 2)
            {
                b->stuckcount = 0; b->unstick = 30; b->unstickdir = rr(b, 2) ? 1 : -1;
                if (getenv("BOTDBG4")) fprintf(stderr, "STUCK t=%d b%d pos=(%d,%d) sec=%d goal=%d\n", gametic, pn, mo->x >> 16, mo->y >> 16, (int)(mo->subsector->sector - sectors), b->goalkind);
                b->replan = 1;
            }
        }
        else if (seen || moved) b->stuckcount = 0;
        if (seen && !moved) b->strafedir = -b->strafedir;
        (void)dt;
        b->px = mo->x; b->py = mo->y;
    }

    if (getenv("BOTDBG") && (gametic % 70) == 0)
        fprintf(stderr, "t=%d b%d pos=(%d,%d) sec=%d hp=%d wp=%d goal=%d path=%d/%d unst=%d vis=%d\n", gametic, pn, mo->x >> 16, mo->y >> 16,
                (int)(mo->subsector->sector - sectors), pl->health, pl->readyweapon, b->goalkind, b->pathidx, b->pathlen, b->unstick, seen);
    if (getenv("BOTDBG5") && pn==0 && gametic>=860 && gametic<900 && !seen)
        {int q; fprintf(stderr,"path:"); for(q=b->pathidx;q<b->pathidx+8&&q<b->pathlen;q++) fprintf(stderr," (%d,%d f%d v%d)",cell_x(b->path[q])>>16,cell_y(b->path[q])>>16,gfl[b->path[q]],gvalid[b->path[q]]); fprintf(stderr,"\n");}
        fprintf(stderr, "D t=%d pos=(%d,%d) ang=%d fwd=%d side=%d btn=%d unst=%d idx=%d/%d\n", gametic, mo->x>>16, mo->y>>16, mo->angle>>24, forward, side, buttons, b->unstick, b->pathidx, b->pathlen);
    cmd->forwardmove = (signed char)forward;
    cmd->sidemove = (signed char)side;
    cmd->buttons = (byte)buttons;
}

void Bot_LevelStart(void)
{
    int i;
    if (!bot_mode) return;
    build_grid();
    for (i = 0; i < 2; i++)
    {
        bot_t *b = &bots[i];
        int *keep = b->path, cap = b->pathcap;
        memset(b, 0, sizeof(*b)); memset(black[i], 0, sizeof(black[i])); nblack[i] = 0;
        b->path = keep; b->pathcap = cap;
        b->rng = seedbase * 2654435761u + (unsigned)(i + 1) * 40503u + 12345u;
        if (!b->rng) b->rng = 1;
        b->accuracy = i ? 22 : 14;
        b->aggression = i ? 120 : 100;
        b->strafedir = 1;
    }
}

void Bot_Setup(void)
{
    int p;
    if (!M_CheckParm("-bots")) return;
    bot_mode = true;
    p = M_CheckParmWithArgs("-botseed", 1);
    if (p) seedbase = (unsigned)atoi(myargv[p + 1]);
    p = M_CheckParmWithArgs("-botlimit", 1);
    if (p) bots_limit = atoi(myargv[p + 1]);
}

boolean Bot_Finish(void)
{
    if (!bot_mode) return false;
    if (gametic >= bots_limit || gameaction == ga_completed)
    {
        fprintf(stderr, "BOTS ended tic=%d exit=%d frags: p0=%d p1=%d\n", gametic, gameaction == ga_completed,
                players[0].frags[1], players[1].frags[0]);
        fprintf(stderr, "BOTS vis=%d/%d fire=%d/%d\n", stat_vis[0], stat_vis[1], stat_fire[0], stat_fire[1]);
        fprintf(stderr, "BOTS suicides: p0=%d p1=%d\n", players[0].frags[0], players[1].frags[1]);
        if (gameaction == ga_completed) exit(3);
        return true;
    }
    return false;
}
