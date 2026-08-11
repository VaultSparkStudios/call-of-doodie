# Design: Multiplayer Feasibility — Session 148 Scoping

## Current state (confirmed by code audit, not assumption)

No multiplayer-gameplay infrastructure exists. What's live today:

- Supabase Realtime **Presence** — an online-player *counter* only
  (`MenuScreen.jsx` `"cod-presence"` channel). No entity state is shared.
- Supabase Realtime **Postgres Changes** — invalidates a community-stats
  cache on new leaderboard rows (`communityStatsStore.js`). Not gameplay.
- The game loop is 100% client-side `requestAnimationFrame` in `App.jsx`.
  There is no server-authoritative simulation anywhere.
- Runs already use **seeded, deterministic RNG** (`gameHelpers.seededSpawn`,
  `runSeed` threaded through `App.jsx`/`storage.js` for daily-challenge and
  challenge-link reproducibility). This is the one genuinely reusable asset
  for multiplayer — determinism is the hard prerequisite for lockstep netcode.

Marketing copy in `context/STUDIO_MANIFEST.json` describes the game as
"comedy-first multiplayer parody" — that is tone/positioning language, not a
description of a shipped or built feature. Worth knowing so it isn't mistaken
for existing scope.

## What "multiplayer" could mean here — three distinct products

Founder input needed on which of these is actually wanted; they have very
different cost/complexity:

### Option A — Async ghost race (cheapest, ships fastest)
Already 80% built: `ghostPath.js` records a run's path, `loadTopGhosts()`
fetches top runs as "ghost opponents" today (visual-only, no interaction).
Extending this to a live "race the current #1 daily-challenge ghost in
real time" is a data/UI feature, not a netcode feature — no server-authoritative
loop needed, because ghosts don't interact with your combat, only your score
comparison. **Rough size: partial session.**

### Option B — Same-room co-op (moderate)
2-4 players in one arena, same wave/enemies, server-authoritative enough to
prevent trivial cheating on shared score. Requires:
- A Cloudflare Durable Object (one per lobby) running the authoritative game
  tick, since Workers/DO already back this stack (see Cloudflare bindings
  available to this project) — clients send inputs, DO simulates, broadcasts
  state deltas.
- Reusing the existing seeded RNG so enemy spawns are deterministic across
  clients even before DO state sync arrives (reduces perceived latency).
- New netcode surface: input buffering, reconciliation, disconnect/rejoin
  handling, lobby matchmaking UI.
**Rough size: multi-session build (netcode + lobby UI + anti-cheat + testing
are each their own scope).**

### Option C — Competitive PvP (most expensive, not recommended first)
Direct player-vs-player combat needs tight latency compensation (client-side
prediction + server reconciliation), which is a much harder real-time netcode
problem than co-op survival. Would not recommend as a first multiplayer ship
given this is currently a 100% client-only codebase with zero netcode
precedent to build on.

## Recommendation

Start with **Option A** (async ghost race) as a near-term win that uses
existing infrastructure, then treat **Option B** (co-op) as a dedicated
multi-session initiative with its own design/build/test cycle if the founder
wants true concurrent multiplayer. Do not attempt Option C without B shipped
and stable first.

## Why this wasn't built in this session

Session 148 was already carrying a large founder request list (leaderboard
bug fix, zombies-mode visual overhaul, weapon rebalance, character select,
menu cleanup, text-sizing pass). A server-authoritative netcode layer is a
new architectural surface (Durable Objects, lobby state, reconciliation) that
deserves its own focused design-then-build cycle and real playtesting —
not a same-session bolt-on next to five other landed changes.
