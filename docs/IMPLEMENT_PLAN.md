# Implement Plan — Session 87 (2026-06-13)

Audit: docs/AUDIT_2026-06-13.md | Items: 8 | Combined Priority: 276.2

## Wave 1 — Tactical Readability

| Seq | Slug | Tier | Effort | Priority | Plan |
|---:|---|:-:|---|---:|---|
| 1 | wave-threat-rating | ⚡ | 0.5h | 31.8 | Shipped L2: computeWaveThreatRating plus 1-5 skull display on the wave preview card. |
| 2 | formation-lore-card | ⚡ | 1h | 31.0 | Shipped L2: per-wave formation lore toasts for flank, pincer, and surge formations. |

## Wave 2 — Reactive Combat Pressure

| Seq | Slug | Tier | Effort | Priority | Plan |
|---:|---|:-:|---|---:|---|
| 3 | heat-formation-seeding | 🔥 | 1h | 40.5 | Shipped L2: heat tier biases spawn formation, with high heat converting pressure into pincer encirclement. |
| 4 | kill-chain-ai-escalation | 🔥 | 2h | 40.5 | Shipped L2: combo thresholds enrage enemies with speed and fire-rate pressure. |

## Wave 3 — Run Trust And Highlights

| Seq | Slug | Tier | Effort | Priority | Plan |
|---:|---|:-:|---|---:|---|
| 5 | certified-run-badge | ⚡ | 1h | 35.4 | Shipped L2: DeathScreen surfaces rich command traces as a VERIFIED RUN chip. |
| 6 | precision-best-shot-replay | 🔥 | 2h | 40.5 | Shipped L2: precision peak frame tracking powers a BEST SHOT replay scrub button. |

## Wave 4 — Rivalry And Coaching

| Seq | Slug | Tier | Effort | Priority | Plan |
|---:|---|:-:|---|---:|---|
| 7 | nemesis-intelligence-brief | ⚡ | 2h | 24.5 | Shipped L2: boss cutscenes include NEMESIS DOSSIER weapon and evasion guidance. |
| 8 | ghost-rivalry-proximity-graph | 🔥 | 2h | 32.0 | Shipped L2: proximity rivals create a three-player ladder on DeathScreen. |

## Validation Plan

- Full: `npm test` → 49 files, 440 tests passing
- Static: `npm run lint` → 0 errors, 1 existing React hook dependency warning
- Build: `npm run build` → passing

All validation reconfirmed on 2026-06-13.
