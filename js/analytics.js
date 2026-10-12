// Google Analytics (GA4) events. gtag is loaded in <head> via the Cloudflare tag gateway.
// Every call is a no-op if gtag is missing (blocked, offline, local dev).
const totals = { cans: 0, handfuls: 0, games: 0, playSeconds: 0 };
let seatedAt = 0;

export function track(name, params = {}) {
  try { window.gtag?.('event', name, params); } catch { /* analytics must never break the party */ }
}

export const analytics = {
  enterParty() { track('enter_party'); },

  drinkCola(caffeine) {
    totals.cans++;
    track('drink_cola', { cans_total: totals.cans, caffeine_level: Math.round(caffeine) });
    if (caffeine > 85) track('caffeine_overload', { cans_total: totals.cans });
  },

  eatSnack(snacks) {
    totals.handfuls++;
    track('eat_snack', { handfuls_total: totals.handfuls, snack_level: Math.round(snacks) });
  },

  // Tripped over a cable on the floor; `kind` is 'cat5', 'coax', 'fan' or 'lead' (the extension lead across the aisle).
  tripCable(kind, total) { track('trip_cable', { cable: kind, trips_total: total }); },

  // The ceiling lights, switched `on` or off.
  lightSwitch(on) { track('light_switch', { on }); },

  sitDown(station) {
    seatedAt = performance.now();
    track('sit_down', { station: station?.name || 'you' });
  },

  // Fires once per boot of the emulated PC, when the game is actually running.
  gameStart(gameName) {
    totals.games++;
    track('game_start', { game_name: gameName, games_total: totals.games });
  },

  // A cartridge started on the console. Deliberately carries no title: what people own is theirs.
  consoleStart() { track('console_start'); },

  standUp(gameName) {
    if (!seatedAt) return;
    const secs = Math.round((performance.now() - seatedAt) / 1000);
    seatedAt = 0;
    totals.playSeconds += secs;
    track('stand_up', { game_name: gameName, play_seconds: secs });
  },

  // Session roll-up, sent with sendBeacon when the tab is hidden or closed.
  summary() {
    if (seatedAt) {
      totals.playSeconds += Math.round((performance.now() - seatedAt) / 1000);
      seatedAt = performance.now();
    }
    track('party_summary', {
      cans_total: totals.cans,
      handfuls_total: totals.handfuls,
      games_total: totals.games,
      play_seconds: totals.playSeconds,
      transport_type: 'beacon',
    });
  },
};

let summarySent = false;
addEventListener('pagehide', () => { if (!summarySent) { summarySent = true; analytics.summary(); } });
