# Game Loop Review — Session 153

Date: 2026-08-13
Scope: implementation/design maturity, not participant outcome evidence

No `docs/PLAYTESTS/` corpus exists. Scores describe the shipped loop, live source contracts, and locally observable receipts; they do not claim retention, balance, or player-satisfaction outcomes.

## Axis Scores

| Axis | Score | Evidence-backed assessment |
|---|---:|---|
| Loop tightness | 9.4/10 | Guest play, readable escalation, safe reward breaks, bosses, outcome-first coaching, and path-independent rematch drills form a tight action → evidence → revenge loop. |
| Progression curve | 9.1/10 | Open arsenal mastery, doctrines, missions, cosmetics, prestige, and nearest-tier Commander's Orders create substantial local progression without pay-to-win power. Numeric tuning remains participant-evidence gated. |
| Session engagement | 9.4/10 | Eight modes, deterministic formations, dynamic objectives, challenge contracts, mutations, rivalry ghosts, and authored boss pressure create distinct session arcs. |
| Retention hooks | 9.2/10 | Daily/weekly seeds, replay receipts, rivalry, drills, mastery projections, and Playtest Pulse are unusually complete. The Pulse currently stores useful evidence but exposes only a sample count on the home screen. |
| SOUL fidelity | 9.7/10 | Readable chaos, humiliation-to-revenge, improvised doctrine, comedy, and proof-over-posture are represented in both mechanics and explicit truth boundaries. Structured playtest capture still omits direct input-trust and threat-readability answers. |

Overall design-maturity score: **9.4/10**.

## Prioritized Findings

1. **P0 — The consented feedback loop records evidence but has no command post.** `playtest-pulse-v1` stores complete local flights plus clarity/replay distributions, while HomeV2 renders only `ON/OFF · N LOCAL`. A tester cannot inspect or export the aggregate without handling individual death receipts.
2. **P1 — The playtest contract measures the revenge loop but not its two launch-critical preconditions.** The receipt asks whether death made sense and whether the player would replay; it does not ask whether controls obeyed or threats stayed readable, despite input fairness and readable chaos being explicit success bars.
3. **P1 — Replay trust proves commands and one derived contact enemy but not planned pressure.** The runtime creates deterministic wave-director plans and formations, yet the public replay passport excludes the entire wave lane. A bounded recorded-plan fingerprint can add useful evidence without pretending to replay spawns, physics, or outcomes.

## Recommended Next Three Design Moves

1. Add a local Playtest Command Post that renders aggregate clarity, replay intent, input trust, and threat readability with a privacy-bounded aggregate JSON export.
2. Extend the opt-in receipt with two compact structured questions—control trust and danger readability—while keeping the existing v1 storage key and backwards compatibility.
3. Record and fingerprint bounded wave-director plan snapshots, surface the receipt after death, and add an explicitly non-authoritative planned-pressure lane to the replay passport.
