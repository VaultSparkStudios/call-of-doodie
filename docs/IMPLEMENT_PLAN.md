# Implementation Plan — 2026-08-06

Source: `docs/AUDIT_2026-08-06.json`

Status: **COMPLETE** — all seven promoted audit items plus the founder-requested Community Stats reliability addendum shipped; production data/function/site deployment verified; 1,022/1,022 tests and the current 16-capture two-theme desktop/mobile matrix pass.

## Outcome

Turn every completed run into durable, trustworthy game intelligence; expose personal, community, and live activity in the Command Deck, leaderboard, and debrief; turn Last Words and explicit difficulty sentiment into an opt-in threat response; and add the on-brand **Sewer Zombies** horde mode without weakening the existing keyboard, mouse, controller, replay, or leaderboard contracts.

## Efficiency order

### Phase 1 — Truth before presentation

1. **Synthetic isolation** — mark health-check submissions as synthetic at the server boundary, backfill the exact known automation contract, and exclude those rows from public ranks and player aggregates.
2. **Canonical run-fact spine** — add an idempotent run-fact table, aggregate Remote Procedure Call (RPC), secure ingestion function, and client persistence path so every completed run—not only leaderboard qualifiers or signed-in players—can inform community statistics.
3. **Complete personal measurement** — persist shots, hits, accuracy inputs, playtime, damage, critical hits, bosses, enemy bests, mode, difficulty, and a deeper bounded run history with explicit “this device” provenance.

### Phase 2 — New play and adaptive response

4. **Sewer Zombies** — add a deterministic, separately ranked horde mode with escalating outbreak plans, surge waves, reanimated enemy presentation, and mode-specific briefing and debrief language.
5. **Field Report** — add one-tap `TOO EASY / DIALED IN / BRUTAL` sentiment after a run, store it with Last Words and run facts, and keep Last Words visible on leaderboard rows instead of hiding them in hover-only text.
6. **Threat response** — compute explainable, opt-in next-run recommendations from performance plus repeated sentiment. Never silently change the player’s difficulty.

### Phase 3 — Player-facing intelligence

7. **Community Stats terminal** — ship responsive `YOU / COMMUNITY / LIVE` statistics on both Command Deck variants with freshness, provenance, empty/offline states, and polling plus Realtime-assisted refresh.
8. **Leaderboard and debrief expansion** — add community pulse, difficulty feedback, Last Words, run deltas, personal best context, and direct harder-mode/Zombies actions to the surfaces players already use.

### Phase 4 — Proof and rollout

9. **Contract verification** — focused tests for run facts, aggregates, synthetic exclusion, Zombies determinism, Field Reports, threat recommendations, mode plumbing, and career arithmetic; then strict lint, type/build, and the full test suite.
10. **Rendered-pixel verification** — inspect desktop (at least 1280 px) and mobile (at most 430 px) in every theme for Command Deck, leaderboard, and debrief states; correct defects and write the hash-bound `docs/visual-qa/LATEST.json` receipt.
11. **Execution receipts** — append every shipped audit item to the audit sidecar, reconcile deferred/blocked items honestly, and preserve staging/production deployment as an explicit external gate if credentials or environment state prevent deployment.

## Mandatory success bars

- Keyboard/mouse and controller loops remain playable; no mode flag can leak into another mode.
- Public acronyms are expanded on first use.
- Community numbers disclose scope and freshness; local-only values say `THIS DEVICE`.
- Free play retains no paid variable per-user cost.
- Health automation cannot masquerade as players in new public statistics.
- Zombies and threat recommendations are opt-in and separately ranked.
- Existing protocol commands remain executable.

## Completion rule

An audit item is complete only when its production-facing behavior, fallback behavior, named tests, and relevant rendered states pass. Schema or deployment work that cannot be safely applied is implemented and verified locally, then recorded as an explicit rollout gate rather than reported as live.

## Founder completion addendum — live-history reliability

- Renamed all player-facing and component terminology from Sewer Network to Community Stats.
- Persist completed runs synchronously into a durable retry outbox before network submission; retry on startup, focus, connectivity restoration, and refresh.
- Keep a last-known-good aggregate cache so temporary provider failures never collapse a previously known community total to zero.
- Refresh the game and public stats surfaces every 15 seconds, on Realtime leaderboard inserts, focus, visibility, online, and manual refresh.
- Aggregate every recoverable server record, label full-detail versus legacy coverage, and state honestly that never-submitted pre-telemetry runs cannot be reconstructed.
