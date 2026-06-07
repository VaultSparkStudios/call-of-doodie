# Implement Plan — 2026-06-07 Audit

| Order | Slug | Effort | Priority | Surface |
|---:|---|---:|---:|---|
| 1 | enemy-lab-run-coach | 1h | 41.6 | `runCoach.js`, `DeathScreen.jsx`, focused tests |
| 2 | trace-proof-next-benchmark | 30m | 31.1 | `studioEventOps.js`, focused tests |
| 3 | launch-readiness-evidence-receipts | 45m | 32.4 | `launch-readiness.mjs` |
| 4 | protocol-drift-sentinel | 45m | 27.7 | new `protocol-drift-check.mjs`, `package.json` script |

Sequencing note: player-facing coaching ships first because it compounds the game loop directly. Trust benchmark and launch/protocol scripts follow because they share validation surfaces and can be verified without touching the live backend.
