# Implement Plan — Session 67

Source: docs/AUDIT_2026-05-17.md (Session 67 refresh — 10 new items)
Generated: 2026-05-17

## Optimal Execution Sequence

Reordered from raw Priority for efficiency: group by code surface, 🔥 + small-effort first, foundations before façades.

| Order | Slug | Tier | Effort | Priority | Rationale |
|---|---|:-:|---|:-:|---|
| 1 | rhythm-kill-bonus | 🔥 | 2h | 108.0 | Highest priority; App.jsx collision + sounds.js surface |
| 2 | doodie-pass-play-widget | 🔥 | 1h | 79.7 | Adjacent App.jsx wave-clear/death surface; cosmeticTrack.js |
| 3 | weapon-unlock-telemetry | 💡 | 1h | 22.8 | Still in App.jsx game loop surface; amortizes context |
| 4 | daily-mission-streak | 🔥 | 2h | 72.0 | storage.js + HomeV2 surface |
| 5 | predictive-difficulty-briefing | ⚡ | 1h | 62.0 | runBrain.js + HomeV2 (adjacent to #4) |
| 6 | cross-run-coaching-memory | ⚡ | 2h | 48.0 | runBrain.js + runCoach.js + DeathScreen |
| 7 | objective-mastery-deathscreen | ⚡ | 1h | 66.5 | objectiveDirector.js + DeathScreen (adjacent to #6) |
| 8 | replay-trace-submission-integration | ⚡ | 2h | 36.0 | runSubmission.js (independent, clean boundary) |
| 9 | persistent-ghost-leaderboard | 🔥 | 4h | 73.2 | storage.js + App.jsx (larger scope, last 🔥) |
| 10 | app-extraction-slice-1 | 💡 | 4h | 17.4 | Large refactor — last, most risky |

## Success Criteria

- All items: `npm test` passes, `npm run lint` clean
- rhythm-kill-bonus: beat-aligned kills emit BEAT KILL floating text + award +1💩
- doodie-pass-play-widget: wave-clear and death call addCosmeticXP; tier change emits floating text
- weapon-unlock-telemetry: unlock events captured in career summary + PostHog
- daily-mission-streak: getMissionStreak/advanceMissionStreak exported from storage.js; streak chip in HomeV2
- predictive-difficulty-briefing: getDifficultyBriefing() in runBrain.js; displayed in HomeV2 difficulty selector
- cross-run-coaching-memory: mostFrequentKiller() in runBrain.js; buildRunCoach() extended; cross-run tip renders in DeathScreen
- objective-mastery-deathscreen: objectivesCompleted/Failed tracked; DeathScreen renders OBJECTIVES row
- replay-trace-submission-integration: traceDigest + traceLength in buildSessionSubmission payload
- persistent-ghost-leaderboard: loadTopGhosts() in storage.js; startGame() seeds ghost from Supabase rows
- app-extraction-slice-1: gameStep.js pure step() function; ≥5 tests; App.jsx wired through
