// roadmap.js — one honest, positive-framed public roadmap (S163).
//
// Rendered by the static /roadmap/ page and available to the in-app What's
// New panel. Negative claims about unshipped features live here, not in the
// changelog, so the changelog stays a record of what actually landed.

export const ROADMAP = Object.freeze({
  shipped: [
    ["Sewer Extraction", "Loot crates, an alarm that climbs with every kill, an evac toilet at 60, lockdown at 100, and a persistent stash on your profile."],
    ["Bot Royale", "Twelve bots with internet handles, a shrinking sewer flood, supply drops, and a placement on the debrief. Offline, no netcode."],
    ["Your Sewer Record", "A profile page (/#profile) with career, stash, and guest-safe backup download and restore."],
    ["Two real game modes", "BOSS GAUNTLET (six bosses, no filler, par timer) and HOLD THE THRONE (capture three thrones with a CPU squad)."],
    ["CPU teammates", "The Intern, the Plunger Sergeant, and The Roomba: follow, hold, attack, revive, and carry orders on Z / X / C."],
    ["Fixed-step simulation", "The game advances in exact 60Hz steps on every display and has a headless deterministic sim kernel."],
    ["Three authored Operations", "Seven-encounter deployments with route choices, chapter scoring, and deterministic receipts."],
    ["Verified community stats and shared leaderboard", "Signed run tokens, plausibility envelopes, and reversible anomaly quarantine."],
  ],
  next: [
    ["Async rivals", "Seed duels with a 24-hour result card and squad boards. The Daily already races the board leader's ghost once a path is published."],
    ["Cloud backup goes live", "The profile page and the backup service are built; the deployment needs its secrets before the Save-to-cloud button lights up."],
    ["Bigger royale arena", "A scrolling camera and sixteen bots once the twelve-bot arena proves fun."],
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
