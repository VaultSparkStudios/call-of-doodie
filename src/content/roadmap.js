// roadmap.js — one honest, positive-framed public roadmap (S163).
//
// Rendered by the static /roadmap/ page and available to the in-app What's
// New panel. Negative claims about unshipped features live here, not in the
// changelog, so the changelog stays a record of what actually landed.

export const ROADMAP = Object.freeze({
  shipped: [
    ["Two real game modes", "BOSS GAUNTLET (six bosses, no filler, par timer) and HOLD THE THRONE (capture three thrones with a CPU squad)."],
    ["CPU teammates", "The Intern, the Plunger Sergeant, and The Roomba: follow, hold, attack, revive, and carry orders on Z / X / C."],
    ["Fixed-step simulation", "The game advances in exact 60Hz steps on every display and has a headless deterministic sim kernel."],
    ["Three authored Operations", "Seven-encounter deployments with route choices, chapter scoring, and deterministic receipts."],
    ["Verified community stats and shared leaderboard", "Signed run tokens, plausibility envelopes, and reversible anomaly quarantine."],
  ],
  next: [
    ["Sewer Extraction", "Loot, an alarm that climbs with every kill, an evac toilet, and a persistent stash."],
    ["Async rivals", "Live ghost races in the Daily, seed duels with a 24-hour result card, and squad boards."],
    ["Bot Royale", "Fifteen bots, a shrinking sewer flood, loot crates, and a placement screen. Offline first."],
    ["One site theme everywhere", "The arcade cabinet look on every page, a profile page, and cloud backup of your record with the Porcelain Passport."],
  ],
  later: [
    ["Real-time co-op", "Two to four players in one arena. Planned after the async rivals ship and only with a cost-capped lobby service. Not live today."],
    ["Networked Toilet Royale", "The real-player version of Bot Royale. Depends on co-op telemetry first."],
  ],
});

export function roadmapSections() {
  const line = (items) => items.map(([title, body]) => `${title} — ${body}`).join(" · ");
  return [
    ["Shipped", line(ROADMAP.shipped)],
    ["Next", line(ROADMAP.next)],
    ["Later, and not live yet", line(ROADMAP.later)],
  ];
}
