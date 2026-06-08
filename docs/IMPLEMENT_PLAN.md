# Implement Plan — Session 84 (2026-06-08)

Audit: docs/AUDIT_2026-06-08.md | Items: 8 | Combined Priority: 251.0

## Wave 1 — drawGame.js batch (30m–1h; shared rendering surface)
| Seq | Slug | Tier | Effort | Priority |
|---|---|:-:|---|:-:|
| 1 | wave-mutation-accept-callout | 🔥 | 30m | 37.1 |
| 2 | coin-streak-visual-escalation | ⚡ | 30m | 31.8 |
| 3 | localized-kill-feed | 🔥 | 1h | 45.4 |

## Wave 2 — game logic (storage + spawn + RunBrain)
| Seq | Slug | Tier | Effort | Priority |
|---|---|:-:|---|:-:|
| 4 | adaptive-spawn-damping | ⚡ | 2h | 28.0 |
| 5 | ai-difficulty-suggestion | 🔥 | 2h | 32.0 |

## Wave 3 — DeathScreen batch
| Seq | Slug | Tier | Effort | Priority |
|---|---|:-:|---|:-:|
| 6 | enemy-death-heatmap-types | ⚡ | 2h | 28.0 |
| 7 | run-end-build-report-card | 🔥 | 4h | 27.8 |

## Wave 4 — test infra
| Seq | Slug | Tier | Effort | Priority |
|---|---|:-:|---|:-:|
| 8 | playwright-pointer-360 | ⚡ | 4h | 20.9 |

---

# Previous: Implement Plan - 2026-06-07 Audit

| Order | Slug | Effort | Priority | Surface |
|---:|---|---:|---:|---|
| 1 | startup-helper-parity-pack | 1h | 34.6 | `scripts/credential-watch.mjs`, `scripts/ark.mjs`, `scripts/router.mjs`, `scripts/check-brief-staleness.mjs`, `scripts/build-skill-manifest.mjs`, `scripts/skill-trace-emit.mjs` |

Sequencing note: this follow-up pass intentionally shipped the protocol helper parity item first because `/start` showed executable helper gaps before any new product work. The prior same-day player-facing audit queue remains recorded in `docs/AUDIT_2026-06-07.md`.
