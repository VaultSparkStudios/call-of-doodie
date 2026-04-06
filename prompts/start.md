<!-- template-version: 2.4 -->
<!-- synced-from: studio-ops/prompts/start.md @ Session 34 (2026-04-02) -->
# START

Executed when the user says only `start`.

---

## 1 · Session Lock  *(mandatory first action)*

Create `context/.session-lock`:
```
locked_by: agent-session
session_start: <ISO timestamp>
project: <slug>
```
Overwrite if a stale lock exists. Lock is cleared at closeout.

**Session mode:**

| Mode | Trigger | Focus |
|---|---|---|
| **BUILDER** | Default | This project only |
| **FOUNDER** | "start: founder mode" | Cross-project strategy; read `portfolio/STUDIO_BRAIN.md` first |

---

## 2 · Internal Context Overlay  *(required when a public repo has been sanitized)*

Before classifying initiation type, detect whether this repo is a public-safe shell rather than the full internal workspace.

Use this order:

1. `context/internal-startup.local.json` if present
2. sibling private Studio OS repo at `..\vaultspark-studio-ops`
3. latest local backup matching `%USERPROFILE%\.codex\memories\public-repo-sanitization-backup-*\{projectSlug}`

Treat the repo as **sanitized/public-safe** if one or more are true:

- `context/SELF_IMPROVEMENT_LOOP.md` has no dated entries or only says details are maintained privately
- `context/LATEST_HANDOFF.md` is a public-safe placeholder
- `prompts/initiate.md` is missing
- context files explicitly say detailed state moved to the private Studio OS / ops repository

When sanitized/public-safe and internal sources exist:

- Use the local private sources as the working startup context
- Project-specific truth comes from the internal project backup when available
- Cross-project founder intelligence comes from the private Studio OS repo
- Keep code edits in this repo unless the user explicitly asks to modify the private repo
- State clearly that startup is running with an **internal overlay**

If no internal sources are found, continue with the public-safe repo only and label redacted metrics as `private/redacted` instead of inventing missing values.

---

## 3 · Initiation Type

Check `context/SELF_IMPROVEMENT_LOOP.md`:

| Condition | Type | Action |
|---|---|---|
| File missing or no dated entries | **A — Bootstrap** | Follow `prompts/initiate.md` — stop here unless an internal overlay provides richer project context |
| 1 "Bootstrap/Foundation Baseline" entry; core files still template-only | **B — Foundation** | Follow `prompts/initiate.md` §B — stop here |
| 2+ dated entries with real scores | **C — Returning** | Continue below |

---

## 4 · Load Context  *(read in order — do not skip or reorder)*

| # | File | Purpose |
|---|---|---|
| 1 | `AGENTS.md` | Role rules, enforcement, session aliases |
| 2 | `context/PROJECT_BRIEF.md` | What the project is and why it exists |
| 3 | `context/SOUL.md` | Creative identity and non-negotiables |
| 4 | `context/BRAIN.md` | Strategic mental model and heuristics |
| 5 | `context/CURRENT_STATE.md` | Live snapshot of what exists |
| 6 | `context/DECISIONS.md` | Key decisions with rationale |
| 7 | `context/TASK_BOARD.md` | Now / Next / Blocked / Later tasks |
| 8 | `context/LATEST_HANDOFF.md` | Authoritative handoff from last session |
| 9 | `context/SELF_IMPROVEMENT_LOOP.md` — **header only** | Rolling Status: sparkline, avgs, last scores |
| 10 | `context/TRUTH_AUDIT.md` *(if present and relevant)* | Source-of-truth hierarchy, contradiction status |
| 11 | Task-specific files | Only after all above are read |

*Founder Mode: read `portfolio/STUDIO_BRAIN.md` between steps 9 and 10.*

If an internal overlay is active, read the same files from the overlay source instead of the sanitized placeholders in this repo wherever both exist.

---

## 5 · SIL Escalation Check

From the Rolling Status header (no extra reads):

- Note sparkline trajectory (↑ ↓ flat) and lowest rolling avg category — flag if any avg < 5.0
- List unactioned `[SIL]` TASK_BOARD items — **escalate to Now if skipped 2+ sessions**
- Surface top unactioned brainstorm idea from the last SIL entry

*Founder Mode only:* note `Studio avg SIL: [X]/500 · This project: [X]/500 [↑↓→]` in brief.

---

## 6 · Startup Rules

- Repo files are source of truth — not prior chat memory
- `PROJECT_STATUS.json` and registry JSON beat derived Markdown when values conflict
- No code edits during startup unless immediately requested
- `context/LATEST_HANDOFF.md` is the active handoff; all other handoff docs are historical
- Note assumptions before acting on them
- If an internal overlay is active, the overlay files outrank sanitized placeholders in this public repo for startup reporting only
- **Compacted/interrupted session:** Check if human direction is in `docs/CREATIVE_DIRECTION_RECORD.md`. If the last CDR entry predates work described in `LATEST_HANDOFF.md`, flag the gap and recover at closeout.
- **⛔ Momentum Runway ≤ 2.0:** Begin with TASK_BOARD pre-loading before any feature or protocol work. Surface as first item in PRIORITIES.

---

## 7 · Output — Startup Brief

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  STARTUP BRIEF — {Project Name}
  {YYYY-MM-DD} · Session {N} · {BUILDER / FOUNDER MODE}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  SOURCE       {public repo only | internal overlay: project backup + studio ops}

  IDENTITY     {type} · {lifecycle}/{audience} · {owner}
  STATE        {current phase and overall health}
  PRIORITIES   Now: {task} · Next: {task}
  CONSTRAINTS  {key constraints or limits}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  WHERE WE LEFT OFF  (Session {N-1})
  Shipped    {N improvements across N groups — group1, group2, ...}
  Tests      {N passing · delta: +N/-N}  or  N/A
  Deploy     {env · auto / manual / N/A}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  DASHBOARD
  SIL    ██████████████████░░ {total}/500  {sparkline}  Avg: {n.n}
         Dev {nn}{↑↓→} │ Align {nn}{↑↓→} │ Momentum {nn}{↑↓→} │ Engage {nn}{↑↓→} │ Process {nn}{↑↓→}
  FLOW   Velocity: {N}{↑↓→} │ Debt: {↑↓→} │ Runway: ~{n.n} sessions │ Days since: {N}
  IGNIS  {n}/100K ({TIER}) │ Compliance: {n}/{total}
  TRUTH  {green|yellow|red|unknown} │ Genome: {n}/25

  SIGNALS
  {✓|⚠|⛔} Compliance    {status}
  {✓|⚠|⛔} Tests         {status}
  {✓|⚠|⛔} CI            {status}
  {✓|⚠|⛔} Velocity      {status}
  {✓|⚠|⛔} Runway        {status}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  NEXT MOVE    {specific recommended action}
  BLOCKERS     {open blockers or "None"}
  [SIL] FLAGS  {escalated items or "None"}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  IGNIS INSIGHT  ignisScore: {N}/100K ({TIER})
  Top pattern: {most relevant IGNIS pattern}
  Brainstorm rate: {brainstorm_conversion_rate}%  Intent rate: {intentCompletionRate}% (last 5)
  {One synthesised observation from portfolio/IGNIS_CORE.md — velocity trend, engagement gap,
   creative drift, stall pattern, runway warning, or applicable canon decision.
   Write "— insufficient data (UNTRACKED)" if no project entry.}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  CANON CHECK    {Canon decision relevant to this session's planned work — or "none applicable"}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### DASHBOARD sources  *(all from files already loaded — no extra reads)*

| Field | Source |
|---|---|
| SIL bar · Avgs · FLOW · sparkline | `SELF_IMPROVEMENT_LOOP.md` Rolling Status header |
| Days since | `Last session:` date vs today |
| IGNIS score | `context/PROJECT_STATUS.json` → `ignisScore` |
| TRUTH / Genome | `context/TRUTH_AUDIT.md` (or `unknown` if absent) |
| Compliance count | `context/CURRENT_STATE.md` |

If startup is using sanitized public files without internal overlay, render unavailable internal fields as `private/redacted`.

**SIL bar:** 20 chars · █ per 25 pts · ░ remainder

**SIGNALS thresholds:**
- Compliance: ✓ 20/20 · ⚠ >15 · ⛔ ≤15
- Tests: ✓ passing + delta ≥0 · ⚠ delta <0 · ⛔ failing · *omit if N/A*
- CI: ✓ green · ⚠ unknown · ⛔ failing
- Velocity: ✓ ≥2 or ↑ · ⚠ 1 stable · ⛔ 0 or ↓
- Runway: ✓ >4 · ⚠ 2–4 · ⛔ ≤2

**IGNIS INSIGHT:** Read only the project section in `portfolio/IGNIS_CORE.md`. Pull ignisScore, grade, brainstorm_conversion_rate, and one project-specific observation. If synthesis is older than `PROJECT_STATUS.json → ignisLastComputed` or flagged stale by truth audit, label it explicitly as stale. Write `UNTRACKED` if no project entry exists.

**CANON CHECK:** Scan `docs/STUDIO_CANON.md` for decisions relevant to this session's planned work. Surface at most 1–2. Optional — skip if not working on protocol, templates, or initiation.

---

## 8 · Session Intent

If the user did not provide a session goal, ask:

> **"What is the primary goal for this session?"** (one sentence)

Log the declared intent in `context/LATEST_HANDOFF.md` under `Session Intent:`.

**Key rules:**
- SPARKED projects must have staging before deploying. See `docs/STAGING_PROTOCOL.md`.
- Every public-facing project needs VaultSpark Studios branding. See CANON-006 in `docs/STUDIO_CANON.md`.
