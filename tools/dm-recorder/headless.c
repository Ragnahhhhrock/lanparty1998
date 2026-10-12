// A platform for doomgeneric with no window, no sound and a clock that only moves when the engine sleeps, so a
// whole match runs in a moment. Used by tools/dm-recorder to record bot deathmatches.
#include "doomgeneric.h"
#include <stdio.h>
static uint32_t now_ms = 0;
void DG_Init(void) {}
void DG_DrawFrame(void) {}
void DG_SleepMs(uint32_t ms) { now_ms += ms; }
uint32_t DG_GetTicksMs(void) { return now_ms; }
int DG_GetKey(int *pressed, unsigned char *key) { (void)pressed; (void)key; return 0; }
void DG_SetWindowTitle(const char *title) { (void)title; }
int main(int argc, char **argv) { doomgeneric_Create(argc, argv); for (;;) doomgeneric_Tick(); return 0; }
