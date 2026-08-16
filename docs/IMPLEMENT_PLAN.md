# Implementation Plan — Session 155

Source: `docs/AUDIT_2026-08-15.json`

Status: **IMPLEMENTED; EXACT-MAIN PUBLISHED; PRODUCTION VERIFIED** — all buildable audit lanes are integrated and the corrected candidate passes local, clean-Linux CI, hosted, rendered-pixel, immutable-production, and custom-domain courts. Participant-gated campaign progression and realtime co-op remain honestly gated.

## Wave A — Preserve the existing game while opening an encounter seam

1. **mode-rules-and-encounter-extraction** — move mode policy and encounter lifecycle decisions behind pure contracts; restore at least 250 lines of `App.jsx` headroom while retaining legacy mode/input/replay behavior.
2. **operation-encounter-spine** — add one deterministic three-act Operation with BREACH, HOLD, ESCORT, HUNT, SABOTAGE, ESCAPE, and BOSS encounters, a route fork, checkpoints, mission score, and replay receipt.

## Wave B — Make Operations spatial, readable, and adaptive

3. **operation-map-state-and-interactables** — add deterministic doors, pumps, valves, barricades, turrets, extraction toilets, watchtower v0, three visible state transitions, multi-input affordances, and replay receipts.
4. **deterministic-mission-director** — select reason-coded encounters and optional contracts locally from observed run state; no hosted inference or hidden rubber-banding.
5. **operations-and-arcade-mode-taxonomy** — make Operations the primary front-door path while preserving all eight Arcade/Rivals modes and every replay identifier.

## Wave C — Turn the vertical slice into a staged product path

6. **async-operation-rivals** — add bounded split/branch ghosts, rematch cartridges, and trust-separated Operation rivalry receipts.
7. **three-operation-mini-campaign** — author three concise schema-reusing Operations with recurring comic antagonists and one prior-route consequence.
8. **operation-playtest-decision-court** — collect only opt-in, aggregate paired Standard-vs-Operation evidence with explicit sample thresholds and no causal claims.
9. **realtime-capacity-and-trust-gate** — check in the authoritative co-op capacity, abuse, reconnect, score-boundary, hard-cap, and kill-switch model plus a synthetic benchmark.
10. **authoritative-two-player-operation-coop** — remain gated until the audit's participant threshold is honestly met; ship the executable capacity/trust prerequisite, never fabricate the missing participant evidence.

## Verification order

- Focused Vitest courts after every foundation and integration boundary.
- Strict lint, architecture/schema/runtime/public/security/dependency/assets and deployable build gates.
- Real browser desktop/mobile captures in Porcelain Day and Sewer Night; inspect and hash-bind the touched Operation states.
- Isolated staging deploy and full release gate before direct-to-`main` publication.
- Exact-revision production deployment, immutable/custom-domain probes, continuous integration verification, and canonical Session 155 closeout.

No SPARKED lifecycle promotion is implied: engineering publication and full deployment are authorized, while participant, physical-device, reply-as-mail, and Obelisk launch evidence remain independently gated.
