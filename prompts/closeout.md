# Closeout Protocol

Use this when the user says only `closeout`.

---

## Step 0 — Session Intent Check

Before writing any files, compare the session's actual work against the declared intent logged in
`context/LATEST_HANDOFF.md` under `Session Intent:`. Classify the outcome:

- **Achieved** — worked as planned
- **Partial** — some scope drifted; note what and why
- **Redirected** — focus changed significantly; log the reason

---

## Required write-back

If meaningful work happened, update in this order:

1. `context/CURRENT_STATE.md`
2. `context/TASK_BOARD.md`
3. `context/LATEST_HANDOFF.md`
4. `logs/WORK_LOG.md`
5. `context/DECISIONS.md` — when reasoning changed
6. `context/SELF_IMPROVEMENT_LOOP.md` — MANDATORY (see below)
7. `docs/CREATIVE_DIRECTION_RECORD.md` — MANDATORY if human gave any creative direction this session
8. Any project-type or repo-specific files whose truth changed

---

## Self-Improvement Loop — closeout (mandatory)

### Step 1 — Calculate rolling data (do this before scoring)

**Velocity count:**
Count TASK_BOARD items that moved from Now → Done this session.
Exclude `[SIL]` meta-tasks. Record as integer: `Velocity: N`

**Debt delta:**
- `↑` if net new `[DEBT]` items were added to TASK_BOARD this session
- `↓` if net `[DEBT]` items were resolved this session
- `→` if debt was unchanged or no `[DEBT]` items exist

**Rolling 3-session averages:**
Look back at the last 3 SIL entries and compute per-category averages (round to 1 decimal).
Label `[N=n]` if fewer than 3 entries exist.

**Sparkline:**
Collect Total scores from last 5 SIL entries. Map each:

| Range | Bar |
|---|---|
| 0–9 | ▁ |
| 10–19 | ▂ |
| 20–29 | ▃ |
| 30–34 | ▄ |
| 35–39 | ▅ |
| 40–44 | ▆ |
| 45–47 | ▇ |
| 48–50 | █ |

Write oldest → newest. Use only available data if fewer than 5 sessions.

---

### Step 2 — Overwrite the SIL Rolling Status header

The top of `context/SELF_IMPROVEMENT_LOOP.md` contains a `## Rolling Status` block between
`<!-- rolling-status-start -->` and `<!-- rolling-status-end -->` markers.
**Overwrite** this block (do not append) with fresh values.

---

### Step 3 — Score this session

Rate each category 0–10:

| Category | Score | vs Last | Notes |
|---|---|---|---|
| Dev Health | | ↑↓→ | code quality, CI, debt |
| Creative Alignment | | ↑↓→ | adherence to SOUL.md + CDR |
| Momentum | | ↑↓→ | velocity, milestone progress |
| Engagement | | ↑↓→ | community / user signals |
| Process Quality | | ↑↓→ | handoff freshness, Studio OS compliance |
| **Total** | **/ 50** | | |

---

### Step 4 — Reflect

- **Top win this session:**
- **Top gap this session:**
- **Session intent outcome:** [Achieved / Partial / Redirected — one sentence reason]

---

### Step 5 — Brainstorm

Generate 3–5 innovative solutions, features, or improvements. Push past the obvious. Consider:
- What would make this 10x more engaging?
- What's the one thing players keep asking for?
- What technical debt is silently costing velocity?
- What creative direction has drifted from the SOUL?
- What competitive move would surprise and delight?

---

### Step 6 — Commit

Pick 1–2 brainstorm items. Add them to `context/TASK_BOARD.md` labeled `[SIL]`.

---

### Step 7 — Append SIL entry (APPEND ONLY — never edit prior entries)

Use this exact format:

```markdown
## YYYY-MM-DD — Session N | Total: XX/50 | Velocity: N | Debt: →
Rolling avg (last 3): Dev X.X | Align X.X | Momentum X.X | Engage X.X | Process X.X

| Category | Score | vs Last | Notes |
|---|---|---|---|
| Dev Health | | ↑↓→ | |
| Creative Alignment | | ↑↓→ | |
| Momentum | | ↑↓→ | |
| Engagement | | ↑↓→ | |
| Process Quality | | ↑↓→ | |
| **Total** | **/50** | | |

**Top win:** [one sentence]
**Top gap:** [one sentence]
**Intent outcome:** [Achieved / Partial / Redirected — brief reason]

**Brainstorm**
1. [idea]
2. [idea]
3. [idea]

**Committed to TASK_BOARD:** [SIL item 1] · [SIL item 2]
```

---

### Step 8 — Write session audit record

Create `audits/YYYY-MM-DD.json`. If today's file already exists, suffix with `-2`, `-3`, etc.

```json
{
  "schemaVersion": "1.0",
  "project": "{slug from context/PROJECT_STATUS.json}",
  "date": "YYYY-MM-DD",
  "session": N,
  "label": null,
  "calibration": false,
  "scores": {
    "devHealth": N,
    "creativeAlignment": N,
    "momentum": N,
    "engagement": N,
    "processQuality": N
  },
  "total": N,
  "maxScore": 50,
  "velocity": N,
  "debt": "→",
  "rollingAvg3": {
    "devHealth": N,
    "creativeAlignment": N,
    "momentum": N,
    "engagement": N,
    "processQuality": N,
    "total": N
  },
  "topWin": "...",
  "topGap": "...",
  "intentOutcome": "Achieved"
}
```

Use `null` for scores not assessed. Set `"calibration": true` for sessions 1–3.

Also update `context/PROJECT_STATUS.json` SIL fields:
`silScore` · `silAvg3` · `silVelocity` · `silDebt` · `silLastSession`

---

## Creative Direction Record — closeout (mandatory)

Review the full session for any human direction given. Append an entry to
`docs/CREATIVE_DIRECTION_RECORD.md` for each of the following that occurred:
- Creative direction of any kind (features, feel, scope, priorities)
- Feature assignments or explicit goals set by the human
- Brand, tone, visual, or quality guidance
- Any "do this / don't do this" instruction

**ADDITIVE ONLY — never edit or delete existing entries.**

If no direction was given, confirm in closeout output that CDR was reviewed and no new entries were needed.

---

## Required closeout output

Reply with a concise `Session Closeout` containing:

1. **Intent outcome** — Achieved / Partial / Redirected (one sentence)
2. **Completed** — what was done
3. **Files changed**
4. **Validation status**
5. **SIL summary** — scores, rolling avg, sparkline, velocity, debt delta, top win, top gap, committed items
6. **CDR** — direction recorded or "no new entries"
7. **Open problems**
8. **Recommended next action**
9. **Read first next session** — exact file list in order
