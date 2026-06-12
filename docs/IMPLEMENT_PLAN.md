# Implement Plan — Session 86 continuation (2026-06-12)

Audit: docs/AUDIT_2026-06-12.md | Items: 8 | Combined Priority: 210.9

## Wave 1 — combat feel and audio

| Seq | Slug | Tier | Effort | Priority | Result |
|---:|---|:-:|---|---:|---|
| 1 | last-stand-clutch | 🔥 | 2h | 31.5 | Shipped: HP<15% last-stand state, red vignette, danger spike, floating text, and heartbeat/entry sound integration. |
| 2 | kill-chain-audio-escalation | 🔥 | 2h | 27.0 | Shipped: combo-aware enemy death audio and RAMPAGE/GODLIKE/UNSTOPPABLE text milestones. |
| 3 | adaptive-soundtrack-layers | 🔥 | 3h | 31.0 | Shipped: heartbeat pulse during last stand and boss-finale synthesized chord trigger. |
| 4 | phantom-elite-variant | ⚡ | 3h | 31.0 | Shipped: mutually exclusive wave 25+ phantom elite variant with opacity pulse and purple ring. |

## Wave 2 — live rivalry and replay trust

| Seq | Slug | Tier | Effort | Priority | Result |
|---:|---|:-:|---|---:|---|
| 5 | live-pace-coaching-chip | 🔥 | 2h | 32.0 | Shipped: HUD PACE chip against career best wave with no server calls. |
| 6 | weekly-rival-ghost | ⚡ | 4h | 24.8 | Shipped: weekly top leaderboard ghost loader, session cache, and HUD WEEKLY RIVAL chip. |
| 7 | death-recap-mini-replay | ⚡ | 4h | 31.4 | Shipped: DeathScreen final-path replay animation plus REPLAY restart button over existing ghost samples. |
| 8 | replay-resim-runner | ⚡ | 8h | 16.9 | Shipped: replay resim utility, focused tests, and validate-replay Phase 2B drift reporting/rejection for rich traces above 2%. |

## Validation

- Focused replay tests: 11/11
- Full unit tests: 429/429 across 49 files
- Lint: clean
- Build: pass, main chunk 770.54 kB raw / 237.91 kB gzip

---

# Previous: Implement Plan — Session 85 (2026-06-08)

Audit: docs/AUDIT_2026-06-08_2.md | Items: 3 | Combined Priority: 103.9

Session 85 shipped the mobile input proof and death-label continuation: desktop and Mobile Chrome pointer 360 Playwright proof, HomeV2 AIM CHECK chip, and DeathScreen final-killer heatmap label.
