# Self-Improvement Loop

This file is the living audit and improvement engine for the project.
The Rolling Status header is overwritten each closeout. Entries are append-only — never delete.

---

<!-- rolling-status-start -->
## Rolling Status (auto-updated each closeout)
Sparkline (last 5 totals): ▁▆▆▆▆
3-session avg: Dev 8.7 | Align 9.0 | Momentum 9.0 | Engage 8.0 | Process 9.0
Avg total: 43.7 / 50  |  Velocity trend: →  |  Debt: →
Last session: 2026-03-30 | Session 31 | Total: 44/50 | Velocity: 9
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

## 2026-03-26 — Session 26 | ESLint + Analytics + Sentry + META Tree + Speedrun + Gauntlet + Loadout Code + Reduced Motion | Total: 42/50 | Velocity: +37 | Debt: →
Rolling avg (last 3): [insufficient history — single scored session]
Scores: Dev 8 | Align 9 | Momentum 9 | Engage 8 | Process 8
Top win: META_TREE permanent upgrade system + Speedrun/Gauntlet modes shipped in one session; clean 757KB build
Top gap: Speedrun/Gauntlet leaderboard tabs not yet added to LeaderboardPanel; META Tree node costs unplaytested
Intent outcome: Achieved — all highest-leverage + highest-ceiling audit brainstorm items implemented
SIL brainstorm for next session:
  1. Speedrun/Gauntlet leaderboard tabs in LeaderboardPanel (low effort, high visibility)
  2. META Tree balance pass — cost tuning after playtest data
  3. PostHog + Sentry env vars wired into GitHub Actions secrets
  4. Leaderboard mode badge display for speedrun/gauntlet rows
  5. Gauntlet weekly reveal banner on MenuScreen (show weapon + diff for the week)

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

---

## 2026-03-27 — Session 28 | Total: 44/50 | Velocity: 11 | Debt: →
Rolling avg (last 3): Dev 8.5 [N=2] | Align 9.0 [N=2] | Momentum 9.0 [N=2] | Engage 8.0 [N=2] | Process 7.3 [N=3]

| Category | Score | vs Last | Notes |
|---|---|---|---|
| Dev Health | 9 | ↑ | 65 tests added, CI quality gate enforced, hooks bug fixed, 0 lint errors |
| Creative Alignment | 9 | → | Ko-fi cosmetic-only monetization aligns with no-pay-to-win SOUL |
| Momentum | 9 | → | 4 failing audit areas closed in one session; 19 distinct improvements |
| Engagement | 8 | → | Supporter path added, analytics now capturing 7+ events |
| Process Quality | 9 | ↑ | CI enforces quality pre-deploy; test suite is authoritative; handoff complete |
| **Total** | **44/50** | ↑ | |

**Top win:** 65-test suite + CI quality gate shipped in one session — codebase now has machine-enforced quality before every deploy.
**Top gap:** Speedrun leaderboard still sorts by score (wrong — should be time ascending); Speedrun/Gauntlet have 0 achievements.
**Intent outcome:** Achieved — all four targeted audit areas (Analytics C+, Accessibility D+, Testing F, Monetization F) implemented.

**IGNIS note:** Four failing audit categories addressed in one session by scoping each to its minimum viable improvement rather than over-engineering any single area.

**Brainstorm**
1. Fix Speedrun leaderboard sort to time ascending — high leverage, trivially small fix, high visibility
2. Achievements for Speedrun + Gauntlet modes — content gap, easy to spec from existing achievement patterns
3. Ko-fi webhook → Supabase Edge Function for cloud supporter sync — closes the honor-system gap in Option A
4. Gauntlet difficulty sub-tabs — parity with Boss Rush, low complexity
5. ARIA labels pass on MenuScreen + DeathScreen — accessibility pass 2, completes the a11y story

**Committed to TASK_BOARD:** [SIL] Fix Speedrun LB sort: time ascending · [SIL] Achievements for Speedrun + Gauntlet modes

---

## 2026-03-30 — Session 30 | Total: 43/50 | Velocity: 8 | Debt: →
Rolling avg (last 3): Dev 8.3 | Align 9.0 | Momentum 9.0 | Engage 8.0 | Process 8.7

| Category | Score | vs Last | Notes |
|---|---|---|---|
| Dev Health | 8 | ↓ | Speedrun correctness fixed and tests expanded to 70 passing, but the repo truth is that lint still hard-fails on 68 warnings |
| Creative Alignment | 9 | → | Marketing prep stayed aligned with the humor-first browser-shooter identity rather than generic FPS framing |
| Momentum | 9 | → | Cleared the two highest-leverage SIL items and shipped launch-facing metadata improvements in one session |
| Engagement | 8 | → | Better share/SEO surface and mode achievement coverage help marketing readiness, but no live player-data loop was added |
| Process Quality | 9 | → | Studio OS files updated, CDR captured, and stale lint assumptions were corrected in the repo context |
| **Total** | **43/50** | ↓ | |

**Top win:** The session converted audit findings into user-facing launch fixes instead of just notes: speedrun ranking now behaves correctly, supporter badges persist, and the public metadata finally matches the real game.
**Top gap:** Score integrity is still fundamentally client-trusting; the current HMAC is visible in the browser and only deters casual tampering.
**Intent outcome:** Achieved — the game is more accurate, more marketable, and clearer about its remaining security/ops limits.

**Brainstorm**
1. Generate a dedicated OG/social card image with brand-consistent art so shared links convert better than text-only previews
2. Move leaderboard submission behind a Supabase Edge Function that verifies payload rules server-side before insert
3. Add a featured "Play the Daily / Beat This Seed" hero panel on the menu for marketing campaigns and creator challenges
4. Add a public patch-notes / what's-new strip fed from a lightweight JSON so marketing beats are visible in-game
5. Add a session replay seed card with one-tap copy/share from the main menu, not just the death screen

**Committed to TASK_BOARD:** [SIL] Add dedicated OG/share image · [SIL] Server-side leaderboard verification path

---

## 2026-03-30 — Session 31 | Total: 44/50 | Velocity: 9 | Debt: →
Rolling avg (last 3): Dev 8.7 | Align 9.0 | Momentum 9.0 | Engage 8.0 | Process 9.0

| Category | Score | vs Last | Notes |
|---|---|---|---|
| Dev Health | 9 | ↑ | Verified submit path now uses one-time run tokens, launch migration is checked in, tests/build/lint all pass |
| Creative Alignment | 9 | → | Security and marketing work stayed pragmatic without diluting the comedy-first identity |
| Momentum | 9 | → | The remaining launch list was reduced to concrete deploy/config actions instead of vague cleanup |
| Engagement | 8 | → | Share surfaces and launch trust improved, but no new live audience loop shipped this session |
| Process Quality | 9 | → | Studio OS files, handoff, status JSON, and task board now match the real post-security state |
| **Total** | **44/50** | ↑ | |

**Top win:** The repo now has a real server-issued/server-consumed score submission contract instead of a purely client-trusting leaderboard path.
**Top gap:** Production still needs the Supabase migration and function secrets/deploy to make the hardened path live.
**Intent outcome:** Achieved — needed repo-side security work is implemented, and the remaining launch checklist is now cleanly narrowed to external ops steps.

**Brainstorm**
1. Add a menu hero for "Today's seed" and featured creator challenge links so launch traffic gets a clear first click
2. Introduce lightweight anomaly logging for impossible score/time combinations in `submit-score`
3. Add a minimal admin review view for flagged leaderboard runs before any future featured-events push
4. Convert the patch-notes strip idea into a small JSON-fed "What's new" card in the menu
5. Add rate limiting or cooldown heuristics per user/IP at the Edge Function layer if abuse appears post-launch

**Committed to TASK_BOARD:** [SIL] Reduce warning debt below 25 warnings · [SIL] Add a menu-level "Play Today's Seed / Beat This Score" hero panel
