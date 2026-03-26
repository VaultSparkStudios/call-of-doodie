# Self-Improvement Loop

This file is the living audit and improvement engine for the project.
The Rolling Status header is overwritten each closeout. Entries are append-only — never delete.

---

<!-- rolling-status-start -->
## Rolling Status (auto-updated each closeout)
Sparkline (last 5 totals): ▁ (bootstrap)
3-session avg: Dev — | Align — | Momentum — | Engage — | Process —
Avg total: — / 50  |  Velocity trend: —  |  Debt: →
Last session: 2026-03-26 | Session 0 | Total: 5/50 | Velocity: 0
─────────────────────────────────────────────────────────────────────
<!-- rolling-status-end -->

---

## Scoring rubric

Rate 0–10 per category at each closeout:

| Category | What it measures |
|---|---|
| **Dev Health** | Code quality, CI status, test coverage, technical debt level |
| **Creative Alignment** | Adherence to SOUL.md and CDR — are builds matching the vision? |
| **Momentum** | Commit frequency, feature velocity, milestone progress |
| **Engagement** | Community, player, or user feedback signals |
| **Process Quality** | Handoff freshness, Studio OS compliance, context file accuracy |

---

## Loop protocol

### At closeout (mandatory)

1. Calculate velocity, debt delta, rolling averages, and sparkline (see `prompts/closeout.md`)
2. **Overwrite** the Rolling Status header block with fresh values
3. Score all 5 categories (0–10 each, 50 max)
4. Compare to prior session scores — note trajectory (↑ ↓ →) per category
5. Identify 1 top win, 1 top gap, and log session intent outcome
6. Brainstorm 3–5 innovative solutions, features, or improvements
7. Commit 1–2 brainstorm items to `context/TASK_BOARD.md` — label them `[SIL]`
8. **Append** a new entry using the format below (never edit prior entries)

### At start (mandatory — read Rolling Status header only)

- Read the Rolling Status header block above — do NOT read full entry history at startup
- Note sparkline trajectory, lowest rolling average, and last session total
- Identify any `[SIL]` items on TASK_BOARD not yet actioned
- If a committed item was skipped 2+ sessions in a row, escalate it to **Now** on TASK_BOARD

---

## Entries (append-only below this line — never edit or delete)

## 2026-03-26 — Session 0 | Bootstrap Baseline | Total: 5/50 | Velocity: 0 | Debt: →
Rolling avg (last 3): [N/A — bootstrap]

| Category | Score | vs Last | Notes |
|---|---|---|---|
| Dev Health | N/A | — | Not yet formally assessed; live build is stable |
| Creative Alignment | N/A | — | Not yet formally assessed; SOUL.md has real non-negotiables |
| Momentum | N/A | — | Not yet formally assessed; game is live |
| Engagement | N/A | — | Not yet formally assessed; no community metrics captured |
| Process Quality | 5 | — | Studio OS applied; full context/ suite with real content |
| **Total** | **5/50** | | Bootstrap baseline — Layer 1 SIL applied |

**Top win:** Studio OS applied to a live game with real SOUL, BRAIN, and PROJECT_BRIEF in place
**Top gap:** No SIL velocity or engagement tracking; no CI metrics instrumented yet
**Intent outcome:** Bootstrap initiation — Layer 1 SIL format applied; project ready for Foundation session

**Brainstorm**
1. Instrument a simple play-session counter so Engagement can be tracked with real data from Session 1
2. Define the next content milestone (new enemy type or roguelite perk) so Momentum has a specific target
3. Set up CI badge so Dev Health is objectively measurable, not estimated
4. Add a "Share run" card generator — viral loop built into the core game loop
5. Daily missions calendar that regenerates on a seed — infinite free content with zero ongoing work

**Committed to TASK_BOARD:**
- [SIL] Instrument play-session counter for Engagement tracking
- [SIL] Define next content milestone (enemy type or perk set)
