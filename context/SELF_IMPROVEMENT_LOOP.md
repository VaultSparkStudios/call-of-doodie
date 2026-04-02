# Self-Improvement Loop

This file is the living audit and improvement engine for the project.
The Rolling Status header is overwritten each closeout. Entries are append-only — never delete.

---

<!-- rolling-status-start -->
## Rolling Status (auto-updated each closeout)
Sparkline (last 5 totals): ▇▇▇▇▆
Avgs — 3: 44.7 | 5: 45.0 | 10: 44.2 [N=10] | 25: — | all: 44.2 [N=10]
  └ 3-session: Dev 9.3 | Align 9.3 | Momentum 8.0 | Engage 8.0 | Process 10.0
Velocity trend: ↑↓  |  Protocol velocity: ↑  |  Debt: → (13 warnings)
Momentum runway: ~3.0 sessions  |  Intent rate: 100% (last 5)
Last session: 2026-04-02 | Session 36 | Total: 44/50 | Velocity: 0 | protocolVelocity: 1
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

---

## 2026-03-31 — Session 32 | Total: 45/50 | Velocity: 0 | Debt: →
Avgs — 3: 44.0 | 5: 35.8 | 10: 35.8 [N=5] | 25: 35.8 [N=5] | all: 35.8
  └ 3-session: Dev 8.7 | Align 9.0 | Momentum 9.0 | Engage 8.0 | Process 9.3

| Category | Score | vs Last | Notes |
|---|---|---|---|
| Dev Health | 9 | → | Workflow repair removed the deploy blocker and the hardened path is now live through CI |
| Creative Alignment | 9 | → | Launch/security work stayed focused on trust and usability without drifting from the game’s tone |
| Momentum | 9 | → | The session converted the remaining blocker from “setup not done” to “live validation only” |
| Engagement | 8 | → | No new audience feature shipped, but the live trust path and share surfaces are now actually deployable |
| Process Quality | 10 | ↑ | Commits, pushes, workflow diagnosis, deploy verification, and closeout state all line up with reality |
| **Total** | **45/50** | ↑ | |

**Top win:** The hardened leaderboard path is now actually deployed, not just implemented in the repo.
**Top gap:** Production still needs one live gameplay submit check and a shared-project compatibility spot-check.
**Intent outcome:** Achieved — the launch/security work was pushed live, the broken workflow was repaired, and the operating docs now reflect the deployed state.

**Brainstorm**
1. Add a lightweight “health check” admin script that pings the live function endpoints and reports expected 401/400/200 behaviors; implementation path: create a small Node script using fetch against the deployed function URLs with empty and malformed requests; execution probability: High
2. Add anomaly logging for impossible submit patterns so leaderboard abuse can be reviewed after launch; implementation path: append a guarded `security_events` insert in `submit-score` when token age, score, or mode checks fail; execution probability: Medium
3. Surface a menu “Today’s seed / featured challenge” card to focus launch traffic on a single replayable beat; implementation path: add a small hero panel to `MenuScreen.jsx` above the mode buttons using existing seed/daily data; execution probability: High
4. Add a minimal shared-leaderboard compatibility note and migration checklist for other studio games using the same Supabase project; implementation path: write a short internal doc under `context/` or `supabase/` describing which apps still rely on client inserts; execution probability: Medium
5. Add a nightly GitHub workflow that verifies the Supabase function workflow remains green after future deploy changes; implementation path: add a scheduled workflow that calls the deployed function health checks; execution probability: Medium

**Committed to TASK_BOARD:** [SIL] Reduce warning debt below 25 warnings · [SIL] Add a menu-level "Play Today's Seed / Beat This Score" hero panel

---

## 2026-04-01 — Session 33 | Total: 46/50 | Velocity: +3 | Debt: ↑ (13 warnings, was 67)
Avgs — 3: 44.3 | 5: 43.6 | all: 37.7 [N=6]

| Category | Score | vs Last | Notes |
|---|---|---|---|
| Dev Health | 10 | ↑ | Lint 67→13 (0 errors), build clean, 70 tests passing, CAPTCHA crash eliminated at root cause |
| Creative Alignment | 9 | → | Daily challenge hero, music variety, accessibility all serve the fun-first player experience |
| Momentum | 9 | → | 5 suggested items + 3 critical bug fixes in one session |
| Engage | 8 | → | Live production testing exposed real bugs which were fixed; chill music actually plays now |
| Process Quality | 10 | → | Context files, task board, handoff all updated; commit is comprehensive |
| **Total** | **46/50** | ↑ | |

**Top win:** Eliminated the CAPTCHA/auth crash making production unusable — traced from 401s through supabase-js internals to `dn is not defined` ReferenceError, then fixed by replacing `initAnonAuth` with a localStorage UUID approach that bypasses CAPTCHA entirely.
**Top gap:** Session 33 commit not yet deployed — fix is local until `git push`. Edge Functions also need redeploy.
**Intent outcome:** Achieved — all 5 startup-brief items completed; 3 critical production bugs fixed; music variety improved; lint debt slashed.

**Brainstorm**
1. Add achievements for Speedrun + Gauntlet modes (currently 0) — high impact per effort, the modes feel incomplete without unlockables
2. Add a lightweight anomaly log in `submit-score` for impossible score/time/wave combos — one extra serviceClient insert call
3. Ko-fi webhook → Supabase Edge Function to cloud-verify supporters instead of relying on localStorage claim
4. Health check script: `node scripts/health-check.js` that pings Edge Functions and reports 400/200/5xx
5. "What's new" JSON-fed strip on MenuScreen — makes each session's shipped features visible to players at launch

**Committed to TASK_BOARD:** [SIL] Add achievements for Speedrun + Gauntlet modes · [SIL] Anomaly logging in submit-score for impossible payloads

---

## 2026-04-02 — Session 34 | Total: 45/50 | Velocity: 0 | Debt: →
Avgs — 3: 45.3 | 5: 44.6 | all: 39.3 [N=8]
  └ 3-session: Dev 9.7 | Align 9.0 | Momentum 8.7 | Engage 8.0 | Process 10.0

| Category | Score | vs Last | Notes |
|---|---|---|---|
| Dev Health | 10 | → | 14 bugs fixed (4 critical), build/test/lint all green, 70/70 tests, 0 errors |
| Creative Alignment | 9 | → | Refinement session serves "controls must feel sharp" SOUL mandate; no feature drift |
| Momentum | 8 | ↓ | No new features or formal task-board items completed; but 14 fixes improve game quality materially |
| Engagement | 8 | → | No new engagement features, but fixing the railgun + supporter modal + speed builds improves player experience |
| Process Quality | 10 | → | Full closeout with all Studio OS files updated; CDR entry for refinement directive |
| **Total** | **45/50** | ↓ | |

**Top win:** Deep 4-agent parallel audit discovered and fixed 4 critical game-breaking bugs (broken railgun, crashing player auras, compounding spawn rates, always-supporter modal) that had been shipping undetected.
**Top gap:** No formal TASK_BOARD velocity — the session was redirected to refinement, so no feature/backlog items progressed. Speedrun/Gauntlet achievements remain 4 sessions overdue.
**Intent outcome:** Achieved — user redirected from feature work to "run tests and refine the current game"; 14 bugs identified and fixed.

**IGNIS note:** A dedicated refinement session with multi-agent parallel auditing found critical bugs that feature-focused sessions missed — scheduling periodic audit sessions is high-leverage for game quality.

**Brainstorm**
1. "What's New" JSON-fed menu strip — makes each session's shipped features/fixes visible to players at launch; implementation path: small JSON file + MenuScreen card; execution probability: High
2. Automated gameplay smoke test — headless canvas run that validates weapons fire, enemies spawn, no crashes through wave 5; implementation path: Vitest + jsdom mock of game loop with minimal gs fixture; execution probability: Medium
3. Per-weapon kill stats dashboard on DeathScreen — show weapon effectiveness breakdown from weaponKills array; implementation path: add a collapsible section in DeathScreen reading statsRef.weaponKills; execution probability: High
4. Enemy variant death sounds — distinct audio for elite/berserker/boss deaths vs. regular; implementation path: add type checks in soundEnemyDeath for elite/boss flags; execution probability: Medium
5. Seeded lightning arc rendering — replace Math.random() with frame-based deterministic offsets for stable visual arcs; implementation path: use frameCount % period for offset calculation; execution probability: High

**Committed to TASK_BOARD:** [SIL] "What's New" JSON-fed menu strip · [SIL] Anomaly logging in submit-score for impossible payloads

---

## 2026-04-02 — Session 35 | Total: 45/50 | Velocity: 1 | Debt: →
Avgs — 3: 45.3 | 5: 45.0 | all: 44.3 [N=9]
  └ 3-session: Dev 9.7 | Align 9.3 | Momentum 8.3 | Engage 8.0 | Process 10.0

| Category | Score | vs Last | Notes |
|---|---|---|---|
| Dev Health | 9 | ↓ | 3 live prod bugs fixed + deployed; realtime disabled; no new tests added |
| Creative Alignment | 10 | ↑ | Poop mascot icon perfectly executes comedy-first + polished identity; launch plan follows SOUL/BRAIN |
| Momentum | 8 | → | Sessions 33+34+35 finally deployed; icon + live fixes shipped; [SIL] achievements still 5 sessions overdue |
| Engagement | 8 | → | Favicon 404 fixed; polished icon for PWA/social; launch plan delivered; no new gameplay engagement feature |
| Process Quality | 10 | → | Full CDR (2 entries), decisions logged, all files updated, clean closeout |
| **Total** | **45/50** | → | |

**Top win:** Deployed 3 sessions' worth of fixes in one push — including the app-killing Tooltip crash that was breaking every page load on production.
**Top gap:** Speedrun + Gauntlet achievements are now 5 sessions overdue; low momentum runway (~1.5 sessions) signals TASK_BOARD needs pre-loading before next sprint.
**Intent outcome:** Achieved — delivered launch readiness plan, fixed 3 live prod errors, created polished branding assets, and deployed everything.

**IGNIS note:** The gap between "code is done" and "code is live" is a recurring velocity drain — same-session push cycles (commit → push → done) are significantly higher leverage than multi-session batching.

**Brainstorm**
1. **itch.io submission** — Submit the game to itch.io for browser-game discoverability; implementation path: create itch.io game page with embed URL, screenshots, and description from README; execution probability: High
2. **Speedrun + Gauntlet achievements** — 5-session overdue SIL item; 4 achievements (2 per mode) following the existing achievement pattern; implementation path: add entries to ACHIEVEMENTS array in constants.js + wire unlock conditions in App.jsx; execution probability: High
3. **"What's New" JSON-fed menu strip** — Small JSON file + MenuScreen card shows returning players what changed; implementation path: `public/whats-new.json` + single card component in MenuScreen.jsx; execution probability: High
4. **Per-weapon kill stats on DeathScreen** — `statsRef.weaponKills` is already tracked; collapsible breakdown panel on DeathScreen showing each weapon's kill count; implementation path: add a section to DeathScreen.jsx reading the statsRef prop; execution probability: High
5. **Discord community** — Create a Discord server and uncomment the footer link in MenuScreen.jsx; implementation path: create Discord server → get invite URL → uncomment one line; execution probability: High

**Committed to TASK_BOARD:** [SIL] itch.io game page setup · [SIL] "What's New" JSON-fed menu strip

---

## 2026-04-02 — Session 36 | Total: 44/50 | Velocity: 0 | Debt: →
Avgs — 3: 44.7 | 5: 45.0 | 10: 44.2 [N=10] | 25: — | all: 44.2 [N=10]
  └ 3-session: Dev 9.3 | Align 9.3 | Momentum 8.0 | Engage 8.0 | Process 10.0

| Category | Score | vs Last | Notes |
|---|---|---|---|
| Dev Health | 9 | → | 83/83 tests (+13), green CI, green lint; no bugs fixed this session |
| Creative Alignment | 9 | ↓ | What's New content update stays aligned; minor content session |
| Momentum | 8 | → | Edge Function redeploy triggered; stale [SIL] tasks cleared; small code footprint |
| Engagement | 8 | → | What's New strip now surfaces recent features to returning players |
| Process Quality | 10 | → | Stale [SIL] audited + cleared, test coverage expanded, TASK_BOARD clean |
| **Total** | **44/50** | ↓ | |

**Top win:** Discovered 2 [SIL] items were already done or misclassified — verified before implementing saved writing 4 achievements that were fully wired since session 30, and cleared 2 overdue tasks in one pass.
**Top gap:** itch.io is 3+ sessions unactioned; it's a 20-minute human task with no agent blocker — the only thing stopping this is prioritizing it.
**Intent outcome:** Achieved — all agent-actionable next moves completed; itch.io remains as human-only task.

**IGNIS note:** Verification before implementation ("is this already done?") is high-leverage — reading the codebase to confirm an achievement was wired took 2 minutes and saved implementing code that already existed.

**Brainstorm**
1. **Per-weapon kill stats on DeathScreen** — `statsRef.weaponKills` already tracked; add collapsible breakdown section to DeathScreen.jsx; implementation path: small JSX section reading existing prop; execution probability: High
2. **Seeded lightning arc rendering** — replace `Math.random()` per frame with deterministic frame-based offsets so arcs don't jitter visually; implementation path: use `(frameCount % period) / period` for arc offset; execution probability: High
3. **Discord server + footer link** — create Discord → get invite URL → uncomment 1 line in MenuScreen.jsx footer; execution probability: High (needs human to create server)
4. **Gameplay smoke test** — jsdom test validating weapons fire + enemies spawn through wave 3 with no crash; implementation path: minimal gs fixture + game loop tick; execution probability: Medium
5. **Health check script** — Node script pinging deployed Edge Functions with known-bad payloads to verify expected 400/401/200 responses; execution probability: Medium

**Committed to TASK_BOARD:** [SIL] Per-weapon kill stats on DeathScreen · [SIL] Seeded lightning arc rendering
