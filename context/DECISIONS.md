# Decisions

Public-safe decisions only. Detailed internal decision history is maintained privately.

## 2026-08-14 — Session 154 — Propagation compatibility is an executable contract, not file presence

**Decision:** A propagated protocol bundle must compose with the repository's live named exports and behavior. Phase-critical task-board, project-status, SIL, secrets, and execution-budget modules are dynamically imported by protocol drift, and bounded router/secrets behavior is smoked before a phase is considered executable. Additive Studio features do not authorize removal of stronger project-local safety contracts.

**Rationale:** S154 received every expected file, so presence and skill-parity checks stayed green, yet live consumers crashed or silently misreported state after exports and behavior were downgraded. Executable compatibility catches that class at the propagation boundary and preserves atomicity, provenance, fail-closed truth, and cross-agent continuity.

## 2026-08-13 — Session 153 follow-through — Backend probes validate project identity, not generic capability presence

**Decision:** Release probes and deployable builds may use a gateway Supabase client pair only when its URL and anonymous-key claims match Call of Doodie's declared project ref. If the shared gateway contains another project's generic pair, the tools resolve the same public configuration carried by the deployed artifact. They never return to direct `.env` parsing and never print the public key.

**Rationale:** The application passed its production player flow while three CLIs produced 404/auth errors against an unrelated project. Credential presence is not project identity; a release verifier must prove it addressed the deployment it claims to test.

## 2026-08-13 — Session 153 — Playtest signal is explicit, local, and aggregate-only

**Decision:** Input trust and threat readability are direct post-run questions, not inferred telemetry. The local flight recorder may retain the bounded four-answer receipt; any portable Playtest Pulse contains only distributions, sample size, and completeness state—never identifiers, free text, or a behavioral-outcome claim.

**Rationale:** The game needs evidence about whether controls and threats read fairly, but synthetic confidence or covert identity would corrupt the feedback loop. Requiring four explicit answers and showing aggregate distributions keeps the evidence useful, consentful, and honest.

## 2026-08-13 — Session 153 — Recorded wave plans are advisory replay evidence

**Decision:** A bounded recorded-wave-plan receipt may appear as the fourth Replay Passport lane, labelled planned pressure. It does not reconstruct spawn decisions, physics, collisions, damage, random draws, or outcomes, and must never upgrade an incomplete replay into an authoritative one.

**Rationale:** The plan records intended pressure at the boundary where it was computed. That improves diagnosis without making the deterministic-replay promise broader than the data can support.

## 2026-08-13 — Session 153 — Preview trust is project-scoped and edge signatures share one canonical form

**Decision:** Supabase Edge Functions accept Cloudflare previews only when the origin is HTTPS and the host is exactly `call-of-doodie.pages.dev` or a subdomain of it. Run-summary verification uses the same pipe-delimited canonical field order as issuance/submission. Public Studio-event ingestion uses shared explicit-origin CORS and a hashed 60/minute quota.

**Rationale:** Isolated staging must exercise the real backend, but broad `pages.dev` trust would admit unrelated tenants. Canonical signatures and a shared public-ingress policy prevent silent issuer/consumer drift and unbounded anonymous writes.

## 2026-08-12 — Session 150 — Keep the performance shell; retire Command Deck as a navigation concept

**Decision:** Preserve `RuntimeBoundary` as the quick, resilient first-paint shell, but make it an honest public front door with Play, Stats, Modes, How to Play, and Leaderboard links. Do not present “Command Deck” as a second navigation architecture. The loaded homepage uses one primary play decision, one live-stats showcase, and four collapsed player-tool groups.

**Rationale:** The shell provides real performance and failure-containment value. The Command Deck label and flat wall of tools did not: they duplicated navigation, hid public pages such as `/stats/`, and made first-time scanning harder. Separating performance infrastructure from the player-facing information architecture preserves the useful part while removing the cognitive tax.

**Invariant:** Every new public route joins `src/config/publicNavigation.js` or documents why it is intentionally secondary. Player-facing body/control text must keep the readable floor and primary touch targets remain at least 44px.

## 2026-08-10 — Session 147 — Mobile INP trace rules out a JS compute cause; native `<select>` overhead is now the leading hypothesis

**Decision:** `mobile-inp-and-bundle-gate` stays open, but the investigation advances from "root cause unknown" to "JS compute-bound causes ruled out by real trace evidence." No blind fix ships this session.

**Rationale:** `scripts/trace-mobile-inp.mjs` (new) opens a real CDP `Tracing` session — the same trace format the DevTools Performance panel records — around the actual mobile mode-selector click on `https://callofdoodie.wtf/`, anchored to the trace's own `EventDispatch(click)` timestamp rather than wall-clock. Across the full ~1.6s window after the click, the longest single main-thread task (`RunTask`) measured 13.5ms — nowhere near the 1408ms the Event Timing API reported at S146, and far below the 50ms long-task threshold. `docs/performance/MOBILE_INP_TRACE_S147.json` holds the full top-25 event list. This rules out a synchronous JS bottleneck as the cause — the S146 grep finding (no heavy synchronous work in `HomeV2.jsx`) is now trace-confirmed, not just source-inferred.

**Leading hypothesis, not yet confirmed:** mobile `<select>` elements open a native OS/browser-chrome picker UI outside the renderer's own task queue; that overhead would count toward the Event Timing API's interaction duration without ever appearing as a `RunTask` in a CDP trace. This matches the evidence exactly (measured delay with no corresponding renderer-side task) but is **not conclusively proven** here: this trace ran in headless Chromium via Playwright's synthetic `.click()`, which does not necessarily reproduce a real Android device's native picker rendering path. A real-device trace (physical phone + remote DevTools) would be needed to fully confirm.

**Trade-off accepted:** the item stays open rather than shipping the native-`<select>`-replacement fix S146 explicitly flagged as accessibility-risky without stronger confirmation. The honest next step is either a real-device trace, or a scoped custom-dropdown experiment with an explicit accessibility regression check — both are physical/founder-gated steps beyond what this session's tooling can verify.


## 2026-08-09 — Session 146 — Mobile mode-selector INP regression is recorded, not blind-fixed

**Decision:** `mobile-inp-and-bundle-gate` stays open with fresh production evidence (`docs/performance/STAGING_SESSION_142_INP.json`, re-measured against `https://callofdoodie.wtf/` via `scripts/capture-staging-inp.mjs`) rather than shipping a guessed fix.

**Rationale:** The narrow-viewport (390×844) mode-selector click now measures 1408ms INP against a 200ms threshold — worse than the 832ms recorded in Session 142, despite Session 142's `selectMode` already wrapping its state fan-out in `startTransition`. Grepping `HomeV2.jsx` found no other synchronous work on that interaction path (no click listeners, no heavy render tree change gated behind it), which means the regression's root cause is not the mitigation already in place. Shipping another guess (e.g. swapping the native `<select>` for a custom picker) without first profiling in a real browser (Chrome DevTools Performance panel / trace) risks trading one unverified perf claim for another, and could introduce accessibility regressions on the native control. Desktop (1440×1000) remains fine at 104ms, confirming this is mobile/native-select-specific.

**Trade-off accepted:** The item stays ranked open in the next audit with this evidence attached instead of being marked done or silently dropped. A dedicated performance session with real Chrome trace tooling (not just grep) is the honest next step.

## 2026-08-09 — Session 145 — validate-replay is hardened, not removed

**Decision:** The deployed `validate-replay` Edge Function adopts the shared `http-trust` origin allowlist and the bounded `consume_api_rate_limit` quota (30/min) instead of being deleted, and its wildcard CORS is replaced with origin-echo. The rate check fails open only when the rate service itself is unavailable.

**Rationale:** The endpoint is not dead code — the replay-trust smoke court (`scripts/replay-trust-smoke.mjs`, part of the production 3/3 replay-trust check) exercises it directly, and its pressure module carries fixture tests. An unauthenticated, unlimited public endpoint was the actual defect; removing the endpoint would have broken a live verification court to fix a hardening gap.

## 2026-08-09 — Session 145 — Retro pack is a pinned render-path contract

**Decision:** The Retro visual pack must never receive Modern-pack upgrades: no atlas sprites, no sprite-motion transforms, no object-atlas swaps. A call-shape contract test (`src/utils/visualPackRetroContract.test.js`) pins circle+emoji rendering, and every new visual branch gates on the pack explicitly.

**Rationale:** Retro exists as the preserved first-playable look. The S145 visual overhaul (DPR scaling, weapon/world atlases, single-layer sprite policy, motion microsystem) changes every Modern draw path; without an executable invariant the nostalgia mode would silently drift with each renderer edit.

## 2026-07-27 — Session 132 continuation — CI checks are events, not timers

**Decision:** Brief-format validation runs on relevant pushes, pull requests, or explicit manual dispatch. A source-derived `schedule-policy-receipt-v1` fails if any repository workflow introduces a schedule trigger, a GitHub Actions self-hosted runner, or a scheduled Git writer.

**Rationale:** The infrastructure court correctly identified the daily hosted cron as waste, but its generic self-hosted-runner prescription conflicts with live Studio Canon, which forbids GitHub Actions self-hosted runners. The canon-safe resolution removes the timer while retaining ephemeral GitHub-hosted event CI; the propagated source-template conflict is routed to Studio Ops rather than hidden locally.

## 2026-07-27 — Session 132 continuation — Runtime and email claims remain evidence-bound

**Decision:** Do not migrate this static Cloudflare Pages artifact to CPX51/Caddy without a real server requirement. Do not label `hello@callofdoodie.wtf` working until a signed `delivered-to-founder-mx` receipt exists.

**Rationale:** The build exposes no listening runtime or port, and the infrastructure court records no port allocation requirement. Brevo credentials are ready, but the canonical delivery verifier excludes the domain while the email policy deliberately retains its registrar-forwarding route; provider readiness cannot substitute for delivery evidence.

## 2026-07-25 — Session 130 — Lethal attribution is one exactly-once lifecycle

**Decision:** Every combat source queues metadata into one defeat executor; Kamikaze and Tactical Nuke remain explicit non-reward retirements, and any future unqueued lethal is reconciled as `unattributed` while recording a run-integrity fault.

**Rationale:** Score, combo, heat, pickups, progression, boss, and split effects must not drift by weapon source. Failing closed preserves play continuity without certifying a run whose attribution contract was bypassed.

## 2026-07-25 — Session 130 — Simultaneous input remains compositional but observable

**Decision:** Keyboard, touch, and gamepad vectors retain their historical additive normalization; strong opposing sources emit a contention receipt instead of silently changing arbitration policy.

**Rationale:** A new priority policy without physical-device evidence could break valid hybrid play. Visibility creates the evidence needed for a future device-specific choice while preserving current behavior.

## 2026-07-25 — Session 130 — Coverage evidence must be fresh, scoped, and explicitly incomplete

**Decision:** The coverage headline applies only to the declared 82-file core-logic surface, names visual/orchestration exclusions, and fails when its JSON predates a measured source, focused test, or coverage-contract input.

**Rationale:** A stale or shrinking green report is worse than no report because it can certify code it never measured. Honest exclusions keep browser/canvas quality on the gates that actually observe it.

## 2026-07-25 — Session 130 — Handoff retention follows session ownership, not content subheadings

**Decision:** Closeout trimming splits on top-level session headings and retains the newest two complete session-owned sections; `Where We Left Off` splitting exists only as a legacy fallback.

**Rationale:** Content subheadings recur inside every session and can survive malformed historical nesting. Treating them as ownership boundaries made the tool report success while keeping stale sessions, violating observability honesty.

## 2026-06-15 — Session 96 — Peak combo moment tier labels at 5/10/15

**Decision:** `peakMomentRef` captures three named tiers: `_pmLabel = combo ≥ 15 ? "UNSTOPPABLE" : combo ≥ 10 ? "GODLIKE" : "RAMPAGE"` (triggered at 5+). Labels match the existing fullscreen combo card (S91), so both surfaces agree on tier identity.

**Rationale:** Reusing the existing tier names from the fullscreen overlay creates one vocabulary for combo mastery across all post-death surfaces (share card, deathscreen, peak moment label). Players who see RAMPAGE on the overlay recognize it immediately in the career coaching context.

**Trade-off accepted:** The peak-moment row is only shown once (the session-best, not the per-wave best), so a player who hit GODLIKE early but RAMPAGE later will see GODLIKE — correctly representing their ceiling rather than their typical.

## 2026-06-15 — Session 96 — Radial vignette gradient cached by act:W:H composite key

**Decision:** `gs._runActVignetteKey = \`${gs._runAct}:${W}:${H}\`` is the cache-busting key for the run-arc radial gradient in drawGame.js. The gradient object is stored in `gs._runActVignetteStyle` and only rebuilt when the key changes.

**Rationale:** Canvas resize and act transitions are the only two cases where the gradient needs to change. Using only `_runAct` as the key would produce a stale gradient with wrong dimensions after a resize. The composite key handles both axes without extra logic.

**Trade-off accepted:** The key is a string concatenation on every frame (cheap), but the gradient rebuild is only O(1) on act/resize transitions. The `gs` object carries two extra fields (`_runActVignetteStyle`, `_runActVignetteKey`) for the lifetime of the run.

## 2026-06-15 — Session 96 — Enemy career stats use batch write, not per-type writes

**Decision:** `updateEnemyCareerStatsBatch(killsByType)` in storage.js performs a single `loadCareerStats()` + multiple mutations + `saveCareerStats()` for all enemy types at once. This is called at wave-clear when `gs._wkbt` is flushed, not at each enemy death.

**Rationale:** Writing career stats per enemy death in a busy wave would cause N localStorage read+write cycles in a tight frame. Batching to wave-clear bounds the write cost to one cycle per wave regardless of enemy count. The `gs._wkbt` accumulator (typeIndex → count) is cheap to maintain per-death and free to reset on wave-clear.

**Trade-off accepted:** If the player quits mid-wave (hard exit), that wave's kills are lost from `enemyKillBests`. The career data is eventually consistent across wave boundaries, not per-kill. Accepted because career stat precision matters less than frame-budget safety.

## 2026-06-14 — Session 91 — Beat-precision vulnerability window is streak-adaptive, not fixed

**Decision:** The beat-precision vulnerability ring uses `8 + Math.min(4, Math.floor(streak/5))` frames wide (max 12), not a fixed 8-frame window. The same formula is used identically in App.jsx (bonus coins) and drawGame.js (ring visual).

**Rationale:** A fixed window gives new players no incentive to maintain the streak. A scaling window rewards mastery — at streak 25+ you have 4 extra frames to land the beat hit, which reads as "rhythm skill unlocking latency forgiveness." The ring also renders thicker and brighter at mastery, making the state legible without a separate tutorial.

**Trade-off accepted:** Formula duplication between App.jsx and drawGame.js — considered acceptable because both are single-use callsites and the formula is simple enough that drift is immediately visible in playtesting.

## 2026-06-14 — Session 91 — Boss session escalation via per-session ref, not career data

**Decision:** `bossSessionDeathsRef = useRef({})` tracks deaths-per-boss within a single play session. It resets on `startGame()` and is never persisted to localStorage or Supabase. Session tier (grudge/nemesis) triggers at ≥2/3 within-session deaths respectively, overriding the career-history tier.

**Rationale:** Session context is more emotionally resonant than career context — a player who dies to Karen twice in one session should get the "SECOND TIME THIS SESSION" grudge quote, not a career-average tone. Career history is still factored in for the initial taunt/intro choice on first encounter.

**Trade-off accepted:** Quitting and restarting resets the escalation counter. Players who rage-quit to soften the boss dialogue can technically exploit this, but that's an acceptable UX-reset case.

## 2026-06-14 — Session 91 — Community choke-point threshold is ≥3× median, not hardcoded

**Decision:** `getCommunityChokePoints(counts)` flags a wave as a community choke point when its death count is ≥3× the median across all waves, not a fixed count threshold.

**Rationale:** A hardcoded threshold (e.g. "≥50 deaths") would require recalibration as the leaderboard grows. A 3× median is self-normalizing — it scales with the community and will correctly identify relative outliers whether the board has 10 or 10 000 rows.

**Trade-off accepted:** Single-wave boards return an empty Set (correctly handled). Extremely uniform boards where even the deadliest wave is only 2.9× median will show no choke points — acceptable because no choke point is more honest than a false positive.

## 2026-06-14 — Session 91 — `getBossTone` maps difficulty ID to adverb, not difficulty label

**Decision:** `getBossTone(difficultyId)` returns an adverb ('embarrassingly'/'impressively'/'terrifyingly'/'adequately') keyed on the difficulty ID string. Unknown IDs return 'adequately'.

**Rationale:** Adverbs slot cleanly into boss taunt templates at any position without rewording. A null/undefined fallback would leave ugly empty strings; 'adequately' reads as muted contempt on normal difficulty, which matches the tone intent.

**Trade-off accepted:** If a new difficulty ID is added without updating `getBossTone`, it silently uses 'adequately'. Tests will catch missing branches if they enumerate all expected IDs.

## 2026-05-14 — Session 62 — Beat-sync is visual-only; spawn rate is not music-gated

**Decision:** Beat-aligned enemy spawns trigger a 6-particle burst visual effect, but the spawn rate, spawn count, and enemy types are unchanged. Music beat phase does not gate whether a spawn occurs.

**Rationale:** Gating spawns on beat would materially alter wave balance (a fast-BPM boss vibe would produce fewer enemies per second than intended). The visual-only approach gives perceptual music integration at zero balance risk.

**Trade-off accepted:** The sync feel is suggestive rather than strict. A player who notices will feel the rhythm; a player who doesn't will see occasional particle bursts that read as ambient atmosphere. Both outcomes are acceptable.

## 2026-05-14 — Session 62 — Weapon tip null for single-weapon runs with kills

**Decision:** `buildWeaponTip()` returns a non-null "dominated" tip when a single weapon accounts for ≥65% of kills, even if only one weapon was used. It returns null only when there are zero total kills.

**Rationale:** A player who used one weapon for 30 kills in a 12-weapon loadout is demonstrating a dominant-weapon pattern that deserves a specific actionable note ("check synergies"), not silence.

**Trade-off accepted:** Players who intentionally mono-weapon will receive a tip they may consider unnecessary. The tip is low-friction (a single line in the debrief) so the cost is low.

## 2026-05-14 — Session 60 — `callofdoodie.wtf` is the live canonical production URL

**Decision:** `https://callofdoodie.wtf/` is now the canonical production URL for Call of Doodie. `playcallofdoodie.com`, `www.callofdoodie.wtf`, and the old `vaultsparkstudios.com/call-of-doodie/` path should resolve or redirect to the apex rather than acting as parallel brand surfaces.

**Rationale:** The apex domain now serves the Cloudflare Pages app and passes live-site verification. A single canonical URL prevents SEO/share fragmentation and keeps the `.wtf` comedy/parody positioning that motivated the domain decision.

**Trade-off accepted:** During DNS/SSL propagation, backup hosts may temporarily serve 200 or pending states. The durable target is one apex canonical plus redirects.

## 2026-05-14 — Session 60 — Broad Cloudflare studio-access token is temporary

**Decision:** The expanded `cloudflare-studio-access.txt` token can be used to unblock this cutover, but it should be rotated or replaced with narrower named tokens after stabilization.

**Rationale:** The token currently has broad account/user/zone permissions far beyond this project's needs. It solved the immediate Cloudflare zone/DNS/Page binding blocker, but future automation should use least-privilege capabilities such as zone create, DNS edit, Pages edit, and redirects edit.

**Trade-off accepted:** Completing the public-domain cutover had higher immediate value than waiting for ideal token scoping. The follow-up task is now explicit so the temporary broad credential does not become the default operating model.

## 2026-05-13 — Session 59 — Cloudflare Pages is canonical host; GitHub Pages is fallback only

**Decision:** Cloudflare Pages is now the canonical deployment target for Call of Doodie. The previous GitHub Pages deployment remains as a manual fallback during the domain migration window and builds with `VITE_BASE_PATH=/call-of-doodie/`.

**Rationale:** The standalone domain requires root-scoped PWA behavior, custom-domain redirects, and future edge/CDN control that GitHub Pages does not provide cleanly. Keeping the old workflow as a manual fallback avoids cutting off the existing `vaultsparkstudios.com/call-of-doodie/` path before Cloudflare DNS and custom-domain verification are complete.

**Trade-off accepted:** Two deployment modes exist temporarily. This is intentional during DNS propagation and rollback planning. Once `callofdoodie.wtf` and redirects are verified, the old GitHub Pages fallback can be retired.

## 2026-05-13 — Session 59 — Platform migration needs account-level zone-create token

**Decision:** Future domain migrations should use a separate broader Cloudflare token stored privately as `CLOUDFLARE_ZONE_CREATE_TOKEN`, rather than expanding the existing zone-scoped token in place.

**Rationale:** The stored Cloudflare token can create/deploy the Pages project but cannot create new zones (`com.cloudflare.api.account.zone.create` missing). Domain migration is a distinct operational capability from routine DNS edits; keeping it in a separately named token makes capability boundaries explicit while letting automation create zones, attach Pages domains, and install redirects for future projects.

**Trade-off accepted:** Until that token exists, custom apex migrations still have one manual Cloudflare dashboard step. The repo now has automation ready to consume the token as soon as it is available.

## 2026-05-13 — Session 59 — Callsign/supporter/Studio membership remain separate identities

**Decision:** The game should not imply that callsign entry or supporter badge claim is account creation. Public UI remains callsign-based until a real Supabase Auth sign-in flow ships; Studio membership integration is treated as backend-ready but not player-facing.

**Rationale:** `submit-score` can recognize `vault_members` when an authenticated Supabase `uid` exists, but the current app does not expose create-account, sign-in, magic link, or OAuth. Mixing callsign/localStorage identity with Studio membership language would create false expectations about cross-device recovery and paid/member persistence.

**Trade-off accepted:** Account UX remains deferred and explicit. If membership matters for launch/monetization, the next implementation should follow `docs/AUTH_INTEGRATION_PLAN.md` instead of extending the current local-only identity model.

## 2026-05-09 — Session 57 — Pushed with `--no-verify` (logged per CLAUDE.md)

**Decision:** The S57 closeout push used `git push --no-verify` after the pre-push hook flagged 5 "Router adherence violations" in pre-existing infrastructure scripts (`scripts/context-meter.mjs:50-53`, `scripts/probe-capability.mjs:59`).

**Rationale:** The flagged lines are not policy violations:
- `context-meter.mjs:50-53` is a model-pricing lookup table where the model ID *is* the index key (`'claude-opus-4-7': PRICING.opus`). A pricing table cannot avoid naming model IDs — that's its purpose. Routing through a generic interface here would be circular (the router would have to know about pricing, which is what this table is).
- `probe-capability.mjs:59` legitimately calls `https://api.anthropic.com/v1/models` as a credential-health probe. The probe's job is to verify the key works against the real provider; routing through an abstraction would defeat the test.
- Both files were modified *before* this session began (visible in initial `git status`); S57 work did not author or touch them. The pre-push hook only caught them because the closeout autopilot's `git add -A` swept them into the commit.

The two "Absolute path leak" warnings (`.push-final.tmp`, `.test-out.txt`) were S57-introduced temp files; those are now `.gitignore`'d and removed via `git rm --cached` in the same amended commit.

**Trade-off accepted:** Bypassing the hook this once means the false-positive ruleset stays in place for next session. Follow-up S58 task: refine the router-adherence linter to whitelist model-ID-as-key patterns and credential-probe URLs, OR move the pricing table behind a `getPricing(modelId)` helper that satisfies the linter while keeping the table data unchanged.

## 2026-05-09 — Session 57 — Replay Codes intentionally exclude routes + mutations

**Decision:** The 12-character replay code in `src/utils/replayCode.js` encodes only the run's *initial conditions* (seed, mode, difficulty, weapon, starter loadout) — not the player's mid-run choices (route picks, mutation accept/decline, perk picks).

**Rationale:** A replay code is a *challenge surface*, not a save state. The seed makes the world deterministic — same enemies in the same order at the same positions — which is enough for "play the same run I just played." Forcing a player into specific routes/mutations would turn replay-code shares into puzzle-solutions rather than skill challenges. The whole point of sharing a code with a friend is to say "let's see how you do with these conditions" — letting them route differently is the *content*. This also keeps the code short (12 chars vs ~30+ if we encoded routes) and immune to schema drift when we add new routes later.

**Trade-off accepted:** True 100%-faithful run replay (e.g. for cheat-detection) requires a separate richer payload, which is what `validate-replay`'s Phase 2 server-side resim handles via `seed + input_hash` (gated on the combat resolver extraction). Replay codes are for sharing; full validation is for trust.

## 2026-05-09 — Session 57 — Heat Meter replaces combo-driven music tier swap

**Decision:** The reactive soundtrack tier (`setMusicTier(0|1|2)`) is now driven by `gs.heat` (0..100, decays 0.20/frame), not by combo count. Heat thresholds: 0 = base, 40 = warm (tier 1), 70 = overdrive (tier 2). The S55 combo-count branch in `App.jsx` was removed.

**Rationale:** Combo-based music swapping had two problems: (1) it gated music intensity on a *kill-rate* metric that resets every 2 seconds, so the music was constantly thrashing tier 0↔1 in mid-density waves; (2) combos broke during boss waves (no trash mobs) so the most intense moments of the game played the calmest music. Heat is *integrative* — it climbs cumulatively from kills + multikills + bosses (+20 per boss) and decays continuously, so it stays elevated through a sustained engagement and falls naturally during recovery windows. This matches the moment-to-moment tension curve the player actually feels.

**Trade-off accepted:** Combos still drive score multiplier + on-screen text — they are still the player-facing skill metric. They just no longer control the soundtrack. For projects that want combo-music coupling, the rule lives in one place (`heatTier(gs.heat)` call site in `App.jsx`) and is one edit to swap.

## 2026-05-09 — Session 57 — Cosmetic track stays cosmetic-only; never gameplay

**Decision:** Doodie Pass Lite (`src/utils/cosmeticTrack.js`) explicitly ships *only* skins, taunts, kill-text fonts, and sprays. No gameplay-affecting unlocks (no extra HP, no faster fire rate, no exclusive weapons, no XP boosters). The supporter unlock is "all 10 cosmetics + early access" — never a gameplay advantage. This is encoded in module-level documentation comments and reinforced in the SupporterModal copy.

**Rationale:** The founder's S52 supporter rollout was deliberately built on the principle that Ko-fi support buys *love expression*, not power. Crossing that line — even subtly via XP boosters — converts the parody indie posture into a freemium game and destroys the trust capital that makes supporters tip in the first place. The cosmetic-only invariant is the entire reason supporters exist: they pay because there's *nothing to pay for that matters*, which paradoxically makes them more likely to pay. Locked in.

**Trade-off accepted:** Cosmetic tracks earn less than freemium tracks. We accept lower per-supporter ARPU in exchange for higher trust + brand integrity + lower legal-risk surface (cosmetic-only Ko-fi tips are unambiguous tips, not loot-box-adjacent purchases).

## 2026-05-02 — Session 56 — Standalone domain canonical = `.wtf`, `.com` 301-only

**Decision:** `callofdoodie.wtf` is the canonical public URL once migration completes. `playcallofdoodie.com` is purchased as a hedge and serves only as a 301 redirect to the canonical, configured via Cloudflare Bulk Redirect on the `playcallofdoodie.com` zone. The migration target is Cloudflare Pages (free tier), not Vercel, Netlify, GH Pages, or self-hosted.

**Rationale:** `.wtf` scored 49/60 vs `playcallofdoodie.com` at 47/60 in a six-axis comparison (cost / memorability / brand-fit / trust / SEO / shareability). Decisive factors — the TLD itself is part of the comedy bit (free marketing compounding), the domain is shorter to say correctly out loud (streamers/word-of-mouth land it more reliably), the unmistakably non-corporate TLD strengthens the parody legal posture by reducing any "likelihood of confusion" angle with the Call of Duty mark, and `.wtf` renews ~$3/yr cheaper than `.com`. The `.com` is a hedge for ad-network/press-coverage scenarios where `.wtf` is filtered or treated as low-trust; one canonical eliminates split-brand/SEO-dilution risk. Cloudflare Pages was chosen over Vercel/Netlify (also 57/60) because its free tier is unlimited bandwidth — Vercel/Netlify cap at 100GB and Vercel's free tier is "non-commercial only," which Ko-fi tips arguably trip.

**Trade-off accepted:** `.wtf` is filtered by some corporate/school proxies and is treated with lower trust by ad networks; this is the cost we pay for the comedic upside. If the game ever pursues paid acquisition or formal press, the `.com` hedge is ready to be promoted to canonical without re-buying.

## 2026-05-02 — Session 56 — Parody disclaimer is the trademark-defense floor

**Decision:** Both home variants (`HomeV2.jsx` default and `MenuScreen.jsx` legacy) render a footer disclaimer naming Activision Publishing, Inc. and the Call of Duty&reg; mark as unaffiliated/non-endorsed/non-sponsored. The disclaimer text is identical on both surfaces, only styling differs (sans-serif on v2, Courier on v1). This is the minimum, not the ceiling.

**Rationale:** The trademark-dilution-by-tarnishment lane (15 USC §1125(c)) is the live legal risk for a parody that names a famous mark. Activision has used this theory before. The §1125(c)(3)(A) noncommercial-parody safe-harbor is weakened by Ko-fi tips, so we cannot rely on it alone. The non-affiliation disclaimer is the textbook safe-harbor pattern recognized in *Louis Vuitton v. Haute Diggity Dog* and similar parody-defense cases — it's nearly free to ship and materially improves the dilution analysis. Placing it on every game-entry surface (rather than a hidden About page) closes the "consumers were confused" angle decisively.

**Trade-off accepted:** A small footer takes a few px of vertical space on the menu screens. This is a non-issue against the cost of a C&D + forced rename.

## 2026-04-30 — Session 55 — Adaptive performance via global flag, not gs field

**Decision:** The runtime perf-reduction signal is a `window.__codReducedEffects` boolean toggled by `makeFrameMonitor` in `src/hooks/useGameLoop.js`, with hysteresis (flip ON ≥20% over-budget, flip OFF only when ≥60% under hysteresis margin). Read sites (`drawGame.js`, `App.jsx` GIF capture path, `HUD.jsx` chip) check `typeof window !== "undefined" && window.__codReducedEffects`.

**Rationale:** The flag must be readable from non-React code (`drawGame.js`, the App.jsx game loop's inline path) without prop drilling, and it changes too rarely (every ~120 frames worst case) to justify a useState round-trip. Using `gs` (game state ref) was considered but `gs` doesn't outlive a run, while perf can be sustained across runs. A module-level singleton was also considered but `window.*` is testable in jsdom and visible in DevTools. Hysteresis prevents UI flicker when frame budget oscillates near the threshold.

**Trade-off accepted:** SSR / non-browser build paths (we don't have any today) would need to guard reads. All current readers do.

## 2026-04-30 — Session 55 — Weapon unlock gating is a builder-only restriction, not a runtime block

**Decision:** `WEAPON_UNLOCK_LEVELS` gates which weapons appear as the *starter* in the LoadoutBuilder UI. Weapons remain spawnable in the wave shop regardless of account level, and any custom loadout saved before this session whose weapon is now locked is honored at runtime (the builder shows it as `🔒legacy` and keeps it selectable).

**Rationale:** Locking discovery would punish curiosity — players who never built a custom loadout would never see the locked weapons exist. Locking the starter slot is enough to make leveling feel earned without sealing off the rest of the game. Grandfathering is mandatory because we shipped without progression gates and breaking saves on a refresh would be hostile.

**Trade-off accepted:** A new player who was sent a `?loadout=` shareable link to a high-level loadout will run with weapons they don't yet "own" — that's a positive moment, not a bug.

## 2026-04-06 — CANON-008: All VaultSpark IP is proprietary by default

**Decision:** All code, content, assets, and designs created by VaultSpark Studios are proprietary and all rights are reserved by VaultSpark Studios LLC unless an open-source license is explicitly declared and approved by the Studio Owner. No agent may apply or imply an open-source license without Studio Owner direction.

**Applies to this project:** Yes — `docs/RIGHTS_PROVENANCE.md` reflects this project's specific license status.

**Rationale:** VaultSpark Studios LLC is a commercial entity building owned IP. Open-sourcing any project without deliberate strategy gives away commercial advantage and creates ownership ambiguity.

**Studio canon:** `vaultspark-studio-ops/docs/STUDIO_CANON.md` → CANON-008

---

## 2026-04-07 — Launch observability is post-launch, not a launch gate

**Decision:** PostHog and Sentry remain optional for this launch window and should be treated as explicit post-launch follow-up rather than a pre-launch blocker.

**Applies to this project:** Yes — the active launch blockers are real-device QA, screenshots, listing publication, and one shared-table compatibility check.

**Rationale:** The current user-facing risk is not a missing analytics key; it is finishing the remaining manual launch execution. Repeatable launch verification already exists in repo for smoke coverage, live Edge Function checks, and live site shell checks.

---

## 2026-04-07 — Cloudflare Worker config must be source-controlled

**Decision:** The security-header worker and the Call of Doodie path-specific CSP override are tracked in-repo under `cloudflare/` instead of remaining dashboard-only.

**Applies to this project:** Yes — the live deployment path depends on CSP settings that are specific to this game.

**Rationale:** Dashboard-only CSP edits create drift, make rollback harder, and leave future deploy/debug sessions dependent on copy-paste state instead of the repo.

---

## 2026-04-07 — Launch media pack is sufficient for immediate listing publication

**Decision:** A prepared launch media pack in `public/launch-assets/` is sufficient to unblock immediate store/distribution publication; real gameplay screenshots are optional follow-up variants, not a launch gate.

**Applies to this project:** Yes — the listing blocker is publication readiness, not the absence of literal raw captures.

**Rationale:** The repo can ship branded, accurate, ready-to-upload media immediately. Waiting on manual capture work would keep a solved distribution step artificially blocked.

---

## 2026-04-14 — Trust, feedback, and build identity outrank broad feature expansion

**Decision:** Near-term in-repo work should prioritize leaderboard trust, stronger post-run guidance, and clearer build identity before broadening content breadth further.

**Applies to this project:** Yes — the product already has high feature breadth, and the higher-return gap is clarity/cohesion rather than raw count of modes or perks.

**Rationale:** New content added into an unclear decision loop compounds noise. Strengthening trust, feedback, and build direction improves retention and makes later pacing/readability work more valuable.

---

## 2026-04-14 — Protocol syncs must preserve repo-local executability

**Decision:** When syncing this repo to newer Studio OS prompt/protocol versions, prompt text may not be copied blindly if it would leave `start` or `closeout` pointing at commands that do not exist in this repo.

**Applies to this project:** Yes — this public game repo consumes Studio OS prompts but does not carry the full Studio OS script inventory locally.

**Rationale:** A nominal prompt upgrade that references missing commands is worse than staying on an older protocol because it creates false procedural guarantees. This repo now keeps local wrappers/templates for required checks while delegating shared operations to the sibling `vaultspark-studio-ops` repo where appropriate.

---

## 2026-04-21 — Pure domain extraction pattern formalized

**Decision:** Each App.jsx extraction should produce a pure function module with no React deps, accepting explicit params for any mutable ref values (e.g., `ammoDropMult` instead of `perkModsRef.current`). App.jsx keeps a thin wrapper that passes those values.

**Applies to this project:** Yes — pickup spawning extraction established this pattern; future slices (boss phase transitions, reload logic) should follow it.

**Rationale:** Pure functions are testable in isolation and reduce the blast radius of App.jsx changes. The thin wrapper preserves React ownership of mutable refs while keeping domain logic clean.

---

## 2026-04-21 — Rate-limited in-game announcer (Roast Director) pattern

**Decision:** In-game event callouts should be rate-limited per category using a caller-owned cooldown state object (wave-based), not a singleton or global. The caller (App.jsx) owns the ref and resets it on new run.

**Applies to this project:** Yes — establishes the pattern for any future announcer extensions (near_death, wave_clear, etc.) beyond kill_streak and boss_kill.

**Rationale:** Stateless functions are testable without side effects; per-category wave cooldowns prevent callout spam without requiring global cooldown state.

---

## 2026-04-22 — Studio event analytics stay local-first and mirror opportunistically

**Decision:** Runtime Studio events remain browser-local source-of-truth first, then sync to Supabase opportunistically via an idempotent mirror path with retry metadata. Gameplay and trust surfaces must not depend on the mirror being available.

**Applies to this project:** Yes — `vaultspark.game-event.v1` now powers front-door, debrief, telemetry, rivalry, and trust surfaces locally, while `sync-studio-events` mirrors that queue server-side.

**Rationale:** The game needs post-run analysis and cross-surface telemetry without turning the player experience into a network-dependent live service. Local-first keeps UX resilient; opportunistic sync preserves downstream balancing and trust-review value.

---
## 2026-05-11 — Run Brain remains zero-token/local-first

Decision: post-run "AI" intelligence for Call of Doodie should default to deterministic local models over LLM/API calls.

Rationale: the game benefits from adaptive coaching and experiment suggestions, but the needed signal already exists in run history, Studio events, and recent-death pressure. `src/utils/runBrain.js` gives a smarter-feeling loop with no token spend, no network dependency, and no privacy surface expansion.

---

## 2026-05-11 — Legacy MenuScreen remains lazy fallback until data gate

Decision: split `MenuScreen` out of the default bundle now, but do not delete the `?home=v1` fallback until HomeV2 has real Lighthouse and funnel evidence.

Rationale: lazy loading recovers default payload immediately while preserving a rollback/QA path. Full removal should be data-gated because the legacy surface still covers long-tail behaviors and human-device checks.

---

## 2026-05-14 — Codex sessions do not require Claude Code plan mode

Decision: `scripts/verify-plan-mode.mjs` must branch on `context/.session-lock -> agent`. When `agent` is `codex` or any non-`claude-code` agent, the model-tier `modelPlanMode` requirement is stamped as `planModeDetected: not_required` rather than failing the session.

Rationale: plan mode is a Claude Code runtime slash-command behavior. Treating it as mandatory for Codex created a false protocol failure even when the session was correctly locked and operating under Codex's own execution model.

Trade-off accepted: `PROJECT_STATUS.json` can still advertise `modelPlanMode: true` as the desired T2 Claude posture while Codex records the runtime check as not applicable. This preserves one shared protocol file without forcing a Claude-only UI concept into Codex sessions.

---

## 2026-05-14 — Pages middleware is the repo-owned redirect fallback

Decision: Domain canonical redirects may live in Cloudflare Pages `functions/_middleware.js` when the Cloudflare Rulesets API path is unavailable.

Rationale: the Rulesets API returned authorization failures despite using the available Cloudflare secret paths. Pages middleware keeps redirect behavior source-controlled, deployable with the app, and verifiable through ordinary live-site checks.

Trade-off accepted: middleware redirects run at the Pages layer instead of the zone edge Rulesets layer. That is acceptable for this launch stage because it produces correct 301 canonicalization for all attached Pages hostnames and avoids dashboard-only drift.

---

## 2026-05-14 — Replay resimulation needs replay inputs, not only an input hash

Decision: `validate-replay` Phase 2B should not pretend to resimulate from `seed + inputHash`. The next trust contract must include a compact input timeline, command trace, or signed event digest that the server can actually replay or verify.

Rationale: `inputHash` is intentionally one-way; it can prove that the client committed to some input payload, but it cannot reconstruct that payload. Building deterministic resim on that contract would create false confidence.

Trade-off accepted: replay validation remains heuristic/replay-contract based until the client/server payload changes. This keeps the trust surface honest instead of shipping a named resim path that cannot work.

---

## 2026-05-26 — Accounts use Supabase Auth first, Obelisk as trust wrapper

Decision: the account bridge should implement Supabase Auth for player sign-in and persistence, while Obelisk wraps the sensitive transitions with signed intent receipts and future passkey-first posture.

Rationale: custom auth would create unnecessary risk and cost. Supabase already fits the current backend shape; Obelisk adds the Studio-wide trust layer where it matters most: guest-to-account migration, callsign claims, capability-scoped server mutations, and future cross-Studio identity.

Trade-off accepted: passkeys are not the first implementation step for this game. The first useful account version is magic-link/Google sign-in plus durable progress, leaderboard ownership, and supporter recovery.

---

## 2026-06-12 — Session 86 — Last-stand gated to non-boss waves

**Decision:** `gs.lastStandActive` only fires when `!gs.bossWave`, even if HP<15% during a boss fight.

**Rationale:** Boss fights already have dedicated sound design (`soundBossWave`, boss music tier, `soundBossFinale` at 10% HP). Layering last-stand vignette + heartbeat on top would create competing audio/visual signals that reduce clarity rather than increasing tension.

**Trade-off accepted:** Players who reach HP<15% during a boss fight do not see the red vignette or hear the heartbeat. The boss finale layer (rising sawtooth chord at boss HP<10%) fills the cinematic role instead.

## 2026-06-12 — Session 86 — Phantom elite spawns only when no other elite type is assigned

**Decision:** Phantom spawn check is `!ne.eliteType && !ne.isBossEnemy && gs.currentWave >= 25` — it cannot override an already-assigned armored/fast/berserker/explosive type.

**Rationale:** Stacking two elite types on one enemy produces unpredictable compound effects (e.g., phantom+armored = slow-fire invisible tank that is nearly untrackable). Keeping phantom mutually exclusive with other elites bounds the difficulty ceiling.

**Trade-off accepted:** The 12% phantom probability is measured against the pool of enemies that received no other elite type, not the entire spawn pool; effective spawn rate is lower than 12% in waves where armored/fast/berserker/explosive all fire.

---

## 2026-06-13 — Public repo keeps local Studio OS compatibility helpers

**Decision:** When canonical Studio OS skills reference helper scripts that are absent from this public game repo, add small repo-local compatibility helpers instead of importing private Studio Ops internals.

**Rationale:** This repository must keep `/start`, `/audit`, `/implement`, and `/closeout` executable from public-safe code. Local helpers preserve repeatability and observability without exposing private planning, secrets workflows, or Studio Ops implementation details.

**Trade-off accepted:** These helpers are intentionally lightweight and task-board/codebase based. They are compatibility surfaces, not feature-equivalent replacements for private Studio Ops intelligence.
# 2026-06-18 — Per-game visual asset libraries are local/proprietary first

Decision: Call of Doodie now treats visual assets as a game-local proprietary asset library, not a shared loose folder or external-tool dump. Source art, generated files, runtime exports, license/provenance, and status live in this repo under `assets/source/` and `assets/visual-assets.json`.

Rationale: Visual assets are game identity and VaultSpark IP. Keeping source/provenance local preserves ownership clarity while still allowing reusable validation/templates to be propagated through Studio OS.

Follow-up: Ark `canon-update` cargo was queued to `vaultspark-studio-ops` requesting official canon and propagation to all game repos.

# 2026-06-18 — Playwright e2e must not reuse generic dev ports

Decision: Call of Doodie Playwright e2e uses strict port `53173` and only runs `*.spec.*` browser specs.

Rationale: The previous harness could reuse an unrelated app already running on 5173 and could attempt to execute Vitest files under `tests/`. Browser validation must prove this game, not whatever local server happens to occupy a common Vite port.

# 2026-06-18 — Split telemetry/data vendors before raising build warning limits

Decision: Keep the Vite chunk-size warning meaningful and split `@sentry/react` plus `@supabase/supabase-js` into explicit cacheable vendor chunks instead of simply raising `chunkSizeWarningLimit`.

Rationale: The main app chunk was only slightly above the 800 kB threshold, but those vendor clients are stable dependencies and do not need to live inside the gameplay bundle. Manual chunks reduced the main chunk to ~620 kB while preserving synchronous behavior.

Trade-off accepted: Initial page load now has two additional module chunks for observability/data clients. This is acceptable because they are cacheable, behavior-preserving, and keep future build warnings useful.
## 2026-06-18 — Obelisk surfaces are explicit routes, not a gameplay gate

Decision: Call of Doodie's generated Obelisk Passport UI is reachable at `/login`, and callback handling is reachable at `/auth/callback`, but the default game path remains guest-play-first. Unknown routes and ordinary game URLs must continue rendering gameplay unless a deliberate future account feature gates a specific paid or account-only capability.

Rationale: The earlier auto-wiring briefly introduced an accidental blanket auth gate, which conflicts with the current launch posture and the standing account plan. The account bridge should add trust and recovery without blocking free browser play; server verification and guest-to-account migration receipts remain separate follow-up work.

---

## 2026-06-18 — Verified screenshots are distinct from promotional stills

Decision: Literal gameplay screenshot claims must use browser-captured PNGs from `public/launch-captures/`, while `public/launch-assets/*.svg` remains proprietary promotional/key-art fallback media.

Rationale: Store visitors and browser install surfaces trust real gameplay screenshots differently from composed launch art. Keeping both classes explicit prevents accidental overclaiming and gives the repo a repeatable capture path through `npm run launch:screenshots`.

Trade-off accepted: The manifest still uses the SVG fallback entries until the full five-scene capture set exists. The truth pack documents the partial L1 state rather than pretending the entire store image set has been replaced.

---

## 2026-06-18 — Obelisk token verification is server-owned

Decision: Obelisk callback handling may store account identity only after a server endpoint verifies the returned token and returns a redacted receipt. The browser must not embed verification secrets or claim verified recovery from a client-only token parse.

Rationale: The account bridge is a trust boundary. Keeping token verification inside `/api/obelisk-verify` preserves secret hygiene, lets staging/prod configure verification independently, and keeps not-configured states honest for users.

Trade-off accepted: When `OBELISK_VERIFY_URL` is absent, the callback reports `verify-not-configured` instead of treating login as complete. Guest play remains unaffected.

---

## 2026-06-18 — Normalize DB timestamps to ISO Z-format before HMAC signing

Decision: In `submit-score`, convert `tokenRow.expires_at` via `new Date(tokenRow.expires_at).toISOString()` before using it in `signSummary`, rather than using the raw Postgres/PostgREST string.

Rationale: `issue-run-token` signs with `expiresAt.toISOString()` which always produces the `Z`-suffix format (e.g., `2026-06-18T20:24:05.123Z`). PostgREST returns TIMESTAMPTZ columns as `+00:00` offset format (e.g., `2026-06-18T20:24:05.123+00:00`). These are the same moment but different strings, causing every HMAC verification to fail with a 403. The fix normalizes on read so both sides of the verify use the same canonical string.

Trade-off accepted: Microsecond precision is truncated to milliseconds during normalization — acceptable since JS Date always stores milliseconds and the token TTL is 6 hours.

---

## 2026-06-18 — Clone SW navigation response synchronously before detached cache-put

Decision: In the service worker navigation handler, `res.clone()` must be called synchronously in the same `.then()` tick as `return res`, not inside a subsequent `caches.open().then()` callback.

Rationale: Once `respondWith(res)` delivers the response to the browser, the browser starts streaming `res.body`. Any subsequent `.clone()` call finds `bodyUsed === true` and throws. Cloning before the detached async gap ensures the clone is made before the body is consumed.

Trade-off accepted: None — this is a correctness fix with no behavioral change for the end user.

---

## 2026-06-29 — Protocol truth beats force-green product scope

Decision: Session 103 prioritized live `/start` and protocol-regression repairs over larger product/game items once the startup brief, Unicode transport, Codex plan-mode, and Windows-hide gates proved red or regressed in the working tree.

Rationale: A durable `/arc` depends on executable `/start -> /audit -> /implement -> /closeout` surfaces. Shipping gameplay depth while the session protocol lies or fails would compound future handoff/debug costs.

Trade-off accepted: The generated innovation-pack product items were not force-shipped. Supabase/analytics items remain credential-missing after explicit checks; auth waits for the existing product trigger; deterministic replay resim remains a larger runner/storage milestone; manual/device/data items require real evidence.

## 2026-06-29 — Rejected timer candidate on verification

Decision: Do not refactor the two `App.jsx` survival timer setup sites in Session 103.

Rationale: The premise looked suspicious from grep, but both sites clear `timerRef.current` before setting a new interval and the later site appears to be a restart/reset path. Changing run timing without browser evidence would be riskier than recording the candidate as rejected-on-verification.

## 2026-06-29 — Session 105 replay/media honesty boundary

Decision: advance deterministic replay in bounded, labeled slices. The new state-stepper is movement/aim-only and must not be described as full deterministic physics or combat resimulation. `runResim()` keeps `heuristic_pressure_estimate` / advisory labeling until combat/physics parity exists.

Decision: manifest screenshot entries may point to verified browser-capture PNGs only when the capture file exists and `assets/visual-assets.json` records it as `sourceType: browser-capture` and `status: production-ready`. Uncaptured launch scenes stay as SVG fallback art instead of being relabeled as gameplay screenshots.

## 2026-07-01 — Session 106 — Deterministic replay combat slice remains bounded

Decision: `runDeterministicReplayCombatSlice()` may simulate deterministic trace-action state for movement, dash impulse, weapon fire cooldown, ammo, reload completion, grenade cooldown, and blocked-action receipts, but it must be labeled `trace_movement_actions_no_enemies` until enemy movement, collision, damage, pickups, wave state, and full physics parity are represented.

Rationale: This gives validate-replay Phase 2B a real executable next slice without repeating the earlier mistake of overclaiming deterministic resimulation from incomplete inputs.

Trade-off accepted: `runResim()` now exposes richer deterministic evidence, but the competitive replay gate remains `heuristic_pressure_estimate` / `advisory` until full parity exists.

## 2026-07-01 — Session 106 — Push used `--no-verify` after exact pre-push hook pass

Decision: The final Session 106 push used `git push --no-verify origin main` only after the local pre-push hook was run manually with Git's bundled Bash against the exact `origin/main..HEAD` ref range and exited 0.

Rationale: Normal `git push origin main` and `git push --porcelain origin main` exited 1 with no stdout/stderr after the hook violations had been fixed. PowerShell-equivalent scans and the actual `.git/hooks/pre-push` script both passed cleanly. The remaining failure was the hook invocation/transport path, not a detected security/router finding.

Follow-up: Keep the Git window/credential guard work from Session 106; future sessions should prefer normal push once the silent hook invocation failure is gone.

## 2026-07-01 — Session 107 — Restore Cloudflare deploy secrets to GitHub Actions

Decision: Set this repo's missing `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` GitHub Actions secrets from the Studio Ops `cloudflare.deploy` secrets gateway so the canonical Cloudflare Pages deploy workflow can run from `main`.

Rationale: The `Deploy to Cloudflare Pages` workflow failed after Session 106 because the repo had no Cloudflare deploy secrets configured. The gateway reported `cloudflare.deploy` READY in Studio Ops, so this was agent-actionable rather than a founder blocker. Secret values were passed directly to `gh secret set` and were not printed.

## 2026-07-01 — Session 108 — Verification-only arc when no product-code item is unblocked

Decision: Treat the Session 108 `/goal arc` as a launch-confidence verification and deploy arc instead of inventing a product-code change.

Rationale: The live genius list had one agent-owned item: maintain launch confidence. Remaining high-value product items still require credentials, dashboard access, physical device QA, production data, or verified browser captures. Changing gameplay or UI without a real prompt from the audit would create churn without improving the launch state.

Trade-off accepted: The commit is mostly evidence and closeout state. That is acceptable because the founder explicitly asked for arc, closeout, direct main push, and deploy.

## 2026-07-01 — Session 110 — PWA install receipts must separate prompt evidence from physical install completion

Decision: PWA install readiness may be surfaced from runtime browser evidence (`beforeinstallprompt`, service-worker support, manifest presence, standalone display mode, and browser `userChoice.outcome`), but the product must not claim physical PWA install QA is complete until a real device accepts the prompt and relaunches in standalone mode.

Rationale: The browser prompt result is useful local QA evidence and should not be discarded, but accepted/dismissed prompt outcomes are not the same as a completed physical install and standalone relaunch pass.

Trade-off accepted: HomeV2 now shows a PWA receipt chip for launch confidence; physical QA remains a real manual/device gate.
## 2026-07-01 — Session 111 — DeathScreen event receipts are source-of-truth, not render noise

Decision: DeathScreen debrief, next-run drill, weekly contract, rivalry, and score-submit fallback event payload construction should live in pure tested builders in `src/systems/deathFlow.js`; the React component should coordinate persistence only.

Rationale: The local Studio event ledger feeds downstream trust, coaching, and analytics surfaces. Inline payload construction and rerender-driven duplicate events make observability harder to audit and can make local player behavior look noisier than it is.

Trade-off accepted: This does not change gameplay or external analytics semantics. It narrows event construction and dedupes debrief/drill receipts while preserving weekly contract progress as a separate dedupe stream.

## 2026-07-01 — Session 112 — Enemy spawning is now seeded; Daily Challenge/Gauntlet fairness gap closed

Decision: Enemy type, spawn side/position, elite/berserker rolls, spawn timing (wobble/shootTimer), proximity-cluster jitter, and the wave-director event roll now derive from `createWaveRng(runSeed, wave)` — an independent per-wave mulberry32 stream — instead of global `Math.random()`. All other combat randomness (crits, spread, pickups, boss internal ability timers) stays on `Math.random()` by design; only spawn-shape randomness is seeded.

Rationale: `gs.runSeed` previously drove only arena layout (obstacles/terrain/props/theme via a local LCG in `initGame`). Enemy spawning used raw `Math.random()`, so "REPLAY #seed", Daily Challenge, and Gauntlet — all of which force every player onto the same seed — reproduced the map but never the actual fight. This was a silent competitive-fairness gap for a game that markets seeded competition and a shared leaderboard. `src/gameHelpers.seededSpawn.test.js` now includes an end-to-end regression test simulating two independent 10-wave runs on the same seed and asserting a byte-identical spawn timeline, matching what two real Daily Challenge players see.

Trade-off accepted: This changes RNG consumption order for any code relying on `Math.random()` call-count parity with prior sessions (none exists). It does not change enemy difficulty scaling, only which enemies spawn when. The REMATCH drill (same session) depends on this fix for honest "same wave, same enemies" practice fidelity.

## 2026-07-02 — Session 113 — Edge replay slices remain advisory evidence

Decision: `validate-replay` may emit deterministic movement/combat/contact-enemy slice receipts from the edge runtime, but the validator still reports `method: "heuristic_pressure_estimate"` and `confidence: "advisory"` until full enemy/wave/physics parity exists.

Rationale: The edge now consumes the same bounded evidence classes as browser `runResim()`, closing the edge-invisibility gap from Session 112, but stored traces still carry player commands only. Derived contact-enemy receipts are useful anti-cheat evidence; they are not a reconstruction of the real fight.

Trade-off accepted: The edge helper carries Deno-compatible mirrored slice logic and a parity script to catch drift instead of importing browser runtime code directly.

## 2026-07-02 — Session 113 — Pressure drift is review evidence, not a validity verdict

Decision: high `pressure-estimate` drift must remain advisory metadata in `validate-replay`; it must not quarantine an otherwise valid trace-backed contract by itself.

Rationale: The pressure model is intentionally coarse and can diverge from real submitted score/wave values. Treating it as a hard gate contradicted the product's replay-trust honesty boundary and broke the live trace-contract smoke test.

## 2026-07-02 — Session 114 — Late-wave formation metadata is gameplay truth, not cosmetic-only copy

Decision: Wave-20+ non-boss encounters should expose deterministic formation archetypes (PINCER, ESCORT, FLANK) with lane and role metadata from `waveDirector`, while early waves keep the lighter loose-formation behavior.

Rationale: Late-wave combat readability improves when spawn pressure has named, testable patterns instead of invisible random offsets. Keeping the logic in `src/systems/waveDirector.js` preserves deterministic seeded-run fairness and gives telemetry/replay surfaces a concrete source of truth.

Trade-off accepted: This does not add new enemy types or a broad App.jsx refactor. The formation layer changes encounter shape/readability while leaving damage, health, and leaderboard trust labels untouched.

## 2026-07-03 — Session 116 — Legacy MenuScreen unification stays coverage-first

Decision: Route the legacy MenuScreen modal states through shared `MenuPanels.jsx` exports before deleting the inline legacy modal stack or retiring the v1 fallback.

Rationale: HomeV2 is the default launch surface, but `?home=v1` remains reachable. A bounded shared-panel routing slice reduces duplicated runtime behavior and adds regression coverage without making the larger production-data-gated decision to remove the legacy fallback.

Trade-off accepted: The old inline branches are gated off during this migration slice rather than fully deleted in the same pass. Full deletion should follow only after production Lighthouse/funnel evidence supports HomeV2 fallback retirement.
## 2026-07-03 — Session 117 — Wave contracts cannot overlap Dynamic Objectives

Decision: Optional wave challenge contracts spawn only when `gs.activeObjective` is absent and only on eligible non-boss waves. They resolve at wave-clear with bounded Doodie Coin rewards and write into the existing objective completion/failure summary instead of creating a separate progression channel.

Rationale: The S62 deferred item explicitly needed a design pass to avoid overlap with the Dynamic Objective System. Reusing the wave-clear boundary keeps the mechanic legible, avoids simultaneous competing objective prompts, and preserves existing leaderboard/replay trust behavior.

Trade-off accepted: Contracts are intentionally small and occasional. They add mid-run motivation without guaranteeing every wave has a contract or adding new economy spend sinks.

## 2026-07-03 - Session 118 - Manifest screenshots must use verified browser captures

Decision: All five web-app manifest screenshots now use real Chromium captures from `public/launch-captures/` instead of authored SVG promotional fallbacks.

Rationale: Install cards, store surfaces, and launch docs should show actual gameplay/UI evidence when capture automation can produce it. Authored SVG fallbacks remain useful promotional media, but they should not be the manifest screenshots once verified captures exist.

Trade-off accepted: Capture automation seeds local browser state for stable Loadout Builder and leaderboard scenes. That state is fixture evidence for the screenshot, not a claim about production traffic or physical-device QA.

## 2026-07-03 — Session 119 — Keep external launch gates separate from repo-local retention work

**Decision:** Do not treat dashboard credentials, physical PWA/gamepad QA, HomeV2 production evidence, or founder publication approval as repo-code work. When the primary genius list is gated, ship verified repo-local second-order improvements and record the gated items honestly.

**Rationale:** This preserves CANON-031 observability honesty and keeps the product improving without fabricating external evidence.

## 2026-07-03 — Session 120 — Protocol route targets must be local and self-checked

Decision: If a local Studio OS prompt routes to another local prompt, that target is an executable protocol surface and must be present in-repo. The local protocol drift check should include required prompt surfaces, not only scripts.

Rationale: `prompts/start.md` already routed Type A/B projects to `prompts/initiate.md`, but the file was absent until this session. Canon conformance caught the gap; adding the file alone would not prevent recurrence.

Trade-off accepted: `prompts/initiate.md` is a slim wrapper pointing to `docs/SESSION_PROTOCOL.md` section 4 instead of duplicating every private Studio OS implementation detail in this public repo.

## 2026-07-06 — Session 121 continuation — Verification-only arcs must still root-fix protocol lies

Decision: When product work is externally gated, a repo-local `/arc` should ship the highest verified launch-confidence/protocol fix rather than invent gameplay or analytics work. This session's real fix was restoring `node scripts/ops.mjs doctor` because startup/closeout surfaces already required it.

Rationale: Observability honesty is a product quality bar for this repo. A health command named in canonical startup/closeout instructions but missing from the local router makes future green signals weaker and can turn a real doctor result into a phantom blocker or stale brief.

Trade-off accepted: No new player-facing feature shipped. The arc improved the launch process by making the health path executable and re-verifying the playable build, replay gates, live site, and launch surfaces.

## 2026-07-16 — Session 122 recovery — Competitive randomness is partitioned, serializable, and backward-compatible

Decision: Every score-affecting random domain uses a named per-wave stream (`spawn`, `combat`, `loot`, `choices`, `hazards`) with serializable snapshot/restore state. The `spawn` stream preserves Session 112''s original `createWaveRng(seed, wave)` derivation byte-for-byte; cosmetic variation uses an explicitly non-competitive source.

Rationale: A single shared RNG stream makes unrelated code changes alter competitive outcomes through call-order coupling. Named streams make Daily Challenge, Gauntlet, replay receipts, and REMATCH drills reproducible by domain while preserving the fixtures and player contracts already shipped under Session 112.

Trade-off accepted: Snapshot receipts carry more RNG state, and every new score-affecting random call must choose a declared domain. This is preferable to invisible cross-system coupling.

## 2026-07-16 — Session 122 recovery — Practice runs may record participation, never progression advantage

Decision: REMATCH practice runs may increment participation-only totals (runs, deaths, play time), but they cannot advance scores, kills, records, achievements, missions, mastery, enemy career records, or mission streaks.

Rationale: Practice needs an honest local receipt without becoming a progression farm. Centralizing the rule in storage and gating enemy-career updates prevents future call sites from bypassing the trust boundary.

## 2026-07-16 — Session 122 recovery — Recovery code may checkpoint; release status remains NO-GO

Decision: The recovered implementation can be committed and pushed after isolated HTTP staging verification, but the product cannot be labeled SPARKED or launch-ready until staged visual/theme evidence and the existing physical/device/credential/data/founder gates pass.

Rationale: Code recovery and production release are separate truth claims. The preview proves deployability and route/header contracts; it does not prove every theme and viewport is visually flawless.

## 2026-07-16 — Session 122 recovery — Local proxy write claims require local receipts

Decision: `node scripts/ops.mjs doctor --update-json` must copy the authoritative Studio doctor receipt into Call of Doodie''s own `context/PROJECT_STATUS.json`; a successful Studio-wide update alone is not sufficient.

Rationale: Session 121 correctly restored the executable doctor route, but its local write-back claim was phantom because the upstream command is rooted to Studio Ops. A project-local proxy must make project-local side effects explicit and tested.

## 2026-07-16 — Session 123 — Themes are a cross-surface product contract, not a screenshot mode

Decision: The public front door and static legal shell share the named sewer-night / porcelain-day contract with URL, storage, system-preference, DOM, and accessible-toggle semantics. Combat remains dark-first because target readability outranks aesthetic parity inside a live run.

Rationale: CANON-047 requires human-best themes with verified readability. A screenshot-only query switch would automate a false claim; a shared player preference makes the visual evidence correspond to a real product behavior.

Trade-off accepted: HomeV2 still contains older hard-coded accent colors inside specialized content cards. The primary shell, controls, cards, tabs, footer, and all legal surfaces are tokenized now; future extraction should follow evidence rather than churn the entire component at once.

## 2026-07-16 — Session 123 — Isolated previews use bounded CI branches

Decision: Cloudflare Pages staging deploys accept only session-* push branches in addition to main, and the deployed Pages branch derives from github.ref_name. Production remains direct-to-main.

Rationale: Local global/DNS Cloudflare tokens did not have Pages permissions, while GitHub Actions already owns a correctly scoped deployment secret. A first-class bounded staging path avoids production-before-staging and credential drift without widening local secret access.

Trade-off accepted: Preview branches are ephemeral remote refs that must be deleted after final production verification.

## 2026-07-16 — Session 124 — Evidence has a lifecycle

Decision: Browser-local proof for source-of-truth claims must expire. Supporter verification is valid for seven days; input calibration is valid for 30 days. Expired evidence fails closed and asks for refresh/recheck.

Rationale: Removing false minting is insufficient if a once-valid cache can outlive a revoked grant, changed controller, remapped browser, or altered input path forever.

## 2026-07-16 — Session 124 — Coaching receipts describe observation, never causality

Decision: A next-run drill outcome may report improved, held, or regressed observed performance. `REPEATABLE IMPROVEMENT` requires two improvements in the latest three deduplicated same-drill attempts and still carries `repeatability-evidence-not-causality`.

Rationale: A single better run is useful feedback, not proof that coaching caused mastery. The ledger strengthens the loop without turning correlation into a product claim.

## 2026-07-16 — Session 124 — Supporter authority stays server-owned

Decision: `callsign_claims.supporter` is the supporter source of truth. Local storage is only a callsign-bound, expiring display cache; score submission independently overwrites any client supporter field from the backend claim.

Rationale: Cosmetic status should feel responsive offline, but a public browser must never be able to award itself a paid badge or author competitive trust metadata.
## 2026-07-16 — Session 124 — Closeout doctor verification is read-only across repo boundaries

Decision: Canonical project closeout may read the sibling Studio Ops doctor verdict, but must not invoke `--update-json` against the sibling tree. The project autopilot routes through `scripts/ops.mjs doctor --json --quiet` and only stamps project-local state.

Rationale: Health evidence does not require a cross-repo mutation. Keeping verification read-only preserves CANON-018 ownership boundaries and prevents a project closeout from changing the control plane merely to become green.

## 2026-07-16 — Session 125 — Recovered runtime faults invalidate global competition

Decision: A run may continue locally after a bounded objective/director recovery, but any such fault permanently marks that run LOCAL ONLY, suppresses global score submission, and persists its sanitized receipt into run history.

Rationale: Silent recovery protects play continuity but cannot preserve competitive comparability when authoritative progression logic diverged. Availability and leaderboard integrity are separate claims.

## 2026-07-16 — Session 125 — Sewer Night is the product default, not an operating-system inference

Decision: Fresh visits start in Sewer Night on every entry surface regardless of the operating system's light preference. Porcelain Day remains a supported, accessible theme only when explicitly requested by URL or saved player choice.

Rationale: The project's visual identity and first-load readability are intentionally dark-first. A system-preference fallback silently shifted the standard website into an unreviewed light presentation and left pre-home entry surfaces outside the theme contract.

Trade-off accepted: The site does not mirror the operating-system color preference automatically; the visible theme toggle preserves user agency and durable preference.

## 2026-07-16 — Session 125 — CI actions use mature Node 24 lines and immutable commits

Decision: Pin official `actions/checkout` v6.1.0, `actions/setup-node` v6.5.0, `cloudflare/wrangler-action` v4.0.0, and `supabase/setup-cli` v3.0.0 by exact commit SHA. Pin the action-downloaded Supabase CLI to trust-reviewed `2.109.1`. Do not retain Node 20 compatibility fallback tags or adopt release-day v7 tags merely because they are newest.

Rationale: GitHub's exact-main run exposed the runtime deprecation after product closeout. Established Node 24 lines remove the warning, immutable commits reduce action supply-chain drift, and exact-main CI proves compatibility with this repository's deploy contract.

## 2026-07-21 — Session 126 — Active-session evidence outranks a coherent stale brief

Decision: `STARTUP_BRIEF.md` is stale whenever an active session lock is newer, even if the brief is same-day and internally coherent. The checker emits explicit reason codes.

Rationale: Internal coherence cannot make prior-session context-meter or doctor evidence current. Session chronology is the fail-closed authority.

## 2026-07-21 — Session 126 — Pause is observable input state, not automatic score invalidity

Decision: Every actual pause/resume transition records a bounded replay command and entering pause releases held keyboard, pointer, touch, joystick, and gamepad input. Visibility loss auto-pauses with player-facing explanation. The receipt does not invalidate score eligibility by itself.

Rationale: Background throttling and held input can materially affect a run, so invisible freezes are unacceptable. Observation and fairness hygiene do not justify inventing a competitive penalty.

## 2026-07-21 — Session 126 — Performance receipts measure simulated frames only

Decision: Paused and modal callbacks are excluded from frame-timing evidence without resetting the run monitor. Persisted receipts derive percentage from bounded counts and enforce percentile/maximum and assistance invariants.

Rationale: Fast no-op callbacks would dilute real gameplay evidence; contradictory persisted values would turn a diagnostic receipt into misinformation.

## 2026-07-22 — Session 127 — Edge health is an edge-only contract

Decision: /_health reports edge-health-v1 JSON for edge routing/configuration only. It does not claim browser gameplay, databases, email, analytics, or third-party readiness. Live HSTS and response shape are release invariants.

Rationale: A 200 HTML fallback was not health evidence. Narrow typed scope makes the receipt useful without laundering unrelated dependencies into green.

## 2026-07-22 — Session 127 — Storage recovery is per sanitized surface

Decision: Critical local persistence records bounded surface/classification/time receipts, never storage keys or values. A surface recovers only after its own successful write.

Rationale: A settings write cannot truthfully clear a progression failure, and diagnostics must not become a data-exfiltration channel.

## 2026-07-22 — Session 127 — Training advances on observed input

Decision: First-run training uses observed movement and combat actions; timers do not imply competence. Manual Next/Skip and replay remain available, and replay resets action evidence.

Rationale: Guidance should respond to player behavior without claiming mastery or trapping accessibility users.

## 2026-07-22 — Session 127 — Lazy recovery stays local and bounded

Decision: Lazy panels own their loading/error/retry UI. Chunk reload recovery is limited to one attempt per minute.

Rationale: One optional panel failure should not crash the game shell or create an infinite reload loop.

## 2026-07-23 — Session 128 — Instrument before balance tuning

Decision: Progression runway and wave pressure are preserved as source-derived descriptive receipts before any numeric curve changes. Playtest evidence remains opt-in, session-local, bounded, and explicit about participant judgments.

Rationale: Mechanical richness is not empirical calibration. Receipts create a trustworthy future tuning substrate without inventing retention targets or causal claims.

## 2026-07-23 — Session 128 — Signature character art belongs in gameplay

Decision: The operative and Karen signature identities are optimized transparent runtime layers over deterministic procedural fallbacks. Internal art showcase cards do not occupy the player homepage.

Rationale: Character art earns its cost by improving combat realization. Keeping procedural fallbacks preserves instant-load resilience, collision truth, telegraphs, and deterministic mechanics.

## 2026-07-23 — Session 128 — Front-door diagnostics use player language

Decision: Replay Training is an immediate guided-play action. Install and local-save evidence lives under one expandable Device & Save surface with plain-language explanations and an actionable save test; raw readiness fractions are not player navigation.

Rationale: An unexplained status receipt is not a control. The homepage should organize play, tools, navigation, and device state by player intent.

## 2026-07-24 — Session 129 — Optional remote clients are interaction costs

Decision: Supabase and Sentry load only when a network-backed surface or configured observability capability needs them. Local storage, guest play, and the first game frame remain synchronous/local-first.

Rationale: A package being installed does not make it part of every visitor's critical path. Memoized retry-safe boundaries preserve remote behavior while keeping cost-neutral guest play honest.

## 2026-07-24 — Session 129 — Final-damage receipts describe a window, not a cause

Decision: Persist at most twelve sanitized damage segments from the final six seconds and classify the observed shape as burst, attrition, or mixed using explicit health/frame thresholds. Do not infer unrecorded causality or change damage/invulnerability math.

Rationale: A likely killer plus aggregate pressure is insufficient coaching evidence, but a bounded observed timeline can explain what happened without pretending to reconstruct the whole run.

## 2026-07-24 — Session 129 — Operational scripts expose safe inspection surfaces

Decision: Operational entrypoints publish a leading Usage contract and a side-effect-free `--help`/`--check`/listing surface where applicable; shared smoke coverage may prove several scripts when it names each target directly.

Rationale: Discoverability and testability should not require triggering a deploy, browser, write, or sibling control-plane action.

## 2026-07-26 — Session 131 — Public route claims require a deterministic proof ledger

Decision: Human pages, header/footer navigation, sitemap, agent resources, language-model index, and visual-audit routes derive from one registry. A public `route-contract.json` publishes a deterministic SHA-256 fingerprint and exact coverage counts; validation recomputes it from live route and gameplay sources.

Rationale: A generator can still drift at its consumer boundary. A source-recomputed proof makes completeness inspectable by both humans and agents without allowing a stale manifest to certify itself.

## 2026-07-26 — Session 131 — Enemy art separates provenance, matte, delivery, and fallback truth

Decision: Opaque chroma PNGs remain the proprietary editing/provenance sources. Runtime atlases are deterministic soft-matte/despill WebPs with integer cumulative cell boundaries, explicit byte/type/alpha gates, bounded proactive decoding, and procedural bodies retained during load or failure.

Rationale: Source alpha is not the contract for chroma-generated art. Separating provenance from the reproducible matte and delivery layers cuts transfer weight without losing edge quality, exact atlas coverage, or honest fallback behavior.

## 2026-07-26 — Session 131 — Compact HUD parity is capability-based

Decision: Minimal and standard densities use the compact responsive surface; tactical density retains the richer desktop surface. Compact parity is defined by always-visible vitals/weapon/action readiness plus urgency-ranked live context and a machine-readable capability receipt, not pixel identity with the tactical layout.
## 2026-07-27 — Session 132 — Coaching claims carry evidence rank

Decision: Death feedback uses one versioned contract with `observed`, `likely_factor`, and `hypothesis` ranks. An observed final-damage window may describe what was captured but never becomes proof of unrecorded causality. RUN THE FIX, debrief presentation, and telemetry consume the same contract.

Rationale: Independent heuristic labels such as “cause” and “diagnosis” overstated correlation and could diverge from stronger observed receipts. One ranked contract keeps the learn-rematch loop useful without laundering inference into fact.

## 2026-07-27 — Session 132 — SOUL is a constitution, not a session ledger

Decision: `context/SOUL.md` contains only durable public-safe creative constraints in a canonical eight-section order. Session receipts stay in CURRENT_STATE, WORK_LOG, and handoff surfaces. Schema lint rejects missing, duplicate, empty, reordered, or session-ledger content.

Rationale: Creative fidelity cannot be audited against a rolling implementation history. Stable pillars and anti-pillars give every agent the same player promise while preserving the private-strategy boundary.

## 2026-07-27 — Session 132 — Architecture claims derive from executable ratchets

Decision: App orchestration size, inline game-loop span, and imported system/hook boundaries derive from live source under `app-architecture-receipt-v1`. The initial ceilings are regression ratchets, not a claim that the ≤1,500-line roadmap target is complete.

Rationale: A prose roadmap can drift in either direction. Source-derived headroom makes renewed monolith growth and boundary loss visible while leaving future extraction decisions evidence-led.
## 2026-07-28 — Session 133 — Formation coaching is observational, bounded, and noncausal

Decision: Record spawn-formation exposure and transitions under `pressure-arc-v2`, derive a dominant observed formation from sanitized counts, and offer counterplay as a drill. Never label a formation as the cause of death or infer mastery/outcomes from exposure alone. Invalid transitions are dropped, not normalized into plausible telemetry.

Rationale: Formation literacy adds a deeper learn-rematch loop, but useful coaching does not justify laundering co-occurrence into causality. A bounded vocabulary and fail-closed sanitizer keep both player copy and agent receipts honest.

## 2026-07-28 — Session 133 — Ghost capture is a bounded runtime instrument, not hidden telemetry

Decision: Keep ghost samples in a fixed-capacity in-memory ring, export chronologically with a terminal sample, and persist only the existing bounded ghost plus a sanitized recorder receipt. Run-history count is clamped to recorder capacity.

Rationale: Replay fidelity needs deterministic recent motion, not an unbounded event archive. The ring makes cost and privacy legible while terminal capture preserves the tactically meaningful endpoint.

## 2026-07-28 — Session 133 — Boot persistence fails closed behind named adapters

Decision: Boot-critical preference and ghost reads/writes must cross `gamePreferences`, `ghostStorage`, and `storageHealth`; direct local/session storage access in App and HomeV2 is forbidden by an executable boundary gate. Storage denial, absence, malformed data, and quota errors degrade to safe defaults.

Rationale: Persistence is optional capability, not permission to make the game unbootable. Named boundaries centralize recovery semantics and prevent future direct-call regressions.

## 2026-07-28 — Session 133 — Architecture ceilings are repaired, never moved to fit the code

Decision: When App reached 5,008 lines against the 5,000-line ratchet, extract coherent persistence responsibilities and retain the ceiling. The passing state is 4,995 lines, a 1,771-line loop span, and 28 system boundaries.

Rationale: Raising a source-derived budget would turn observability into theater. The failure correctly exposed renewed orchestration pressure and directly funded a cleaner boundary.
## 2026-07-29 — Session 134 — The rich arcade command center is the default front door

Decision: Restore HomeV2 as the default homepage, retain HomeV3 only at `?home=v3`, and preserve the legacy menu at `?home=v1`. Elevate rather than delete HomeV2's Journey, deployment, challenge, tool, hub, career, codex, settings, support, and legal surfaces.

Rationale: The founder explicitly preferred the previous retro/arcade identity and its functional completeness. A thinner replacement discarded useful player context; progressive hierarchy and arcade craft solve density without erasing capability.

## 2026-07-29 — Session 134 — Body orientation and weapon aim are independent transforms

Decision: Render the operative body, sprite, legs, and skin at world-up orientation, then rotate a nested arm/weapon transform using a finite normalized aim angle.

Rationale: Rotating the whole character made southward aim read as an upside-down soldier. Independent transforms preserve character legibility while retaining full 360-degree combat aim.

## 2026-07-29 — Session 134 — Primary weapon choice is explicit, persistent, and reversible

Decision: Expose all 12 weapons before deployment, persist the selected primary locally, initialize the next run from it, and keep every weapon directly selectable from responsive in-run docks.

Rationale: A hidden or tiny cycle control makes the arsenal functionally disappear. One visible choice before the run plus direct reversible switching during combat improves agency without changing balance or unlock rules.

## 2026-07-29 — Session 135 — Input sources release through one lifecycle boundary

Decision: Keyboard, pointer, touch, and gamepad state must be neutralized through `releaseInputState()` at every ownership boundary: focus/page loss, pause, controller loss, listener teardown, new run, respawn, and terminal ending. A missing gamepad emits a release receipt only when active state existed.

Rationale: Clearing one device or one event leaves other latched state intact and makes intermittent drift hard to diagnose. One source-aware contract makes neutralization complete, observable, and testable without changing movement math.

## 2026-07-29 — Session 135 — Terminal ownership precedes optional run finalizers

Decision: Run endings transition exactly once through `playing -> ending -> ended`, claim the debrief before persistence/analytics/capture work, and treat those finalizers as best effort. Forced terminal causes such as Score Attack timeout bypass player recoveries; ordinary lethal damage retains Last Stand and Guardian Angel.

Rationale: A thrown or stalled optional side effect must never keep the game alive, and a forced clock expiry cannot revive into an impossible continuation. Explicit ownership separates recovery policy from reliable completion.

## 2026-07-29 — Session 135 — Retro is an opt-in visual pack, not a mechanics fork

Decision: Keep Modern as the default and persist an explicit pre-run Retro selection. Retro restores the first-playable player and complete enemy character language, while collision, damage, telegraphs, health, boss/elite markers, effects, timing, and score remain shared.

Rationale: Players can revisit the original visual identity without fragmenting balance or silently degrading gameplay readability. A complete manifest and one renderer branch make pack coverage executable rather than aspirational.

## 2026-08-01 — Session 136 — Executable work is a source-derived status, not an open checkbox

Decision: Router, Genius cache, and innovation saturation share one deterministic classifier. Every emitted item carries source section, status, reason, score, executable truth, and declared-input fingerprints; cache age alone cannot certify freshness and no placeholder work is generated.

Rationale: A backlog title is not proof that an agent can act on it. Credential, data, community, publication, device, and product decisions must remain visible without being laundered into fake implementation runway.

## 2026-08-01 — Session 136 — Route and architecture truth execute against live semantics

Decision: App home selection and fallback-retirement checks execute one pure default/v1/v2/v3 resolver. When architecture ratchets fail, extract cohesive boundaries and retain the existing budgets; do not make a failing receipt green by editing prose or raising ceilings.

Rationale: Comment matching and movable limits turn observability into theater. Shared executable semantics make both the front door and decomposition posture independently testable.

## 2026-08-01 — Session 136 — Deploy credentials stay brokered and edge responses own edge headers

Decision: Cloudflare Pages subprocesses use the canonical `withPagesDeployEnv` boundary, including its proven narrow-token-to-Studio-token fallback. Function responses emit required transport/security headers themselves rather than assuming static `_headers` applies.

Rationale: A capability marked READY can still lack one control-plane permission, and Cloudflare Functions can bypass static headers. Broker-native fallback plus hosted response proof closes both gaps without exposing credentials or fabricating a staging result.

## 2026-08-03 — Session 137 — Immediate access and mastery are separate contracts

Decision: Keep all twelve primary weapons selectable before and during every run. Level thresholds award mastery licenses, recognition, evolution targets, and analytics reason codes; they never deny access.

Rationale: A lock that can be bypassed from another first-party selector is confusion, not progression. Immediate experimentation serves the game's improvisational promise while deterministic mastery preserves a long-term competence runway.

## 2026-08-03 — Session 137 — One executable plan owns every return-run recommendation

Decision: Journey, the intelligence ticker, quick actions, telemetry, Daily, and Weekly Gauntlet consume one reason-coded continuation stack. Weekly Gauntlet launches in one action with a deterministic weekly contract and fixed opening kit; it is not a locked build.

Rationale: Decorative advice and a second executable priority tree can disagree. A shared action/payload/evidence contract makes the recommendation useful, accessible, measurable, and testable.

## 2026-08-03 — Session 137 — Release and performance truth are derived evidence

Decision: Derive local release posture from authoritative project status and require exact URL/revision/sample/tool/raw-hash bindings for performance comparisons. Retain HomeV1 because current production evidence measures HomeV2 slower; funnel evidence remains a separate gate.

Rationale: Mutable duplicated fields and one-off speed impressions cannot authorize retirement. An unfavorable measured result is a successful evidence court, not a failed implementation.

## 2026-08-03 — Session 137 — Optional data work begins after first paint

Decision: Do not preload the Supabase data-plane chunk from entry HTML. Warm optional leaderboard work only through the browser-idle boundary, while gameplay-critical local state remains immediate.

Rationale: The default front door does not need network-backed leaderboard code to become interactive. A checked post-build asset boundary prevents manual chunking from silently turning into eager transport.

## 2026-08-03 — Session 138 — One evidence graph owns the post-run answer

Decision: Normalize existing deterministic coaching inputs into versioned observation, cause, contradiction, confidence, lesson, and action nodes; rank them into one primary Verdict/Lesson/Action and leave supporting proof in an optional drawer. Do not add a hosted large-language-model dependency without a measured quality gap.

Rationale: The product already had strong local intelligence but forced players to reconcile overlapping cards. A shared causal graph improves clarity, explainability, agent projection, latency, privacy, and capital efficiency at zero runtime token cost.

## 2026-08-03 — Session 138 — Identity, feedback, and challenge sharing remain guest-first

Decision: Porcelain Passport describes and stores only a minimal local verification receipt with integrity-checked export/import; Playtest Pulse is explicit opt-in and local; Scenario Cartridges accept only a bounded sanitized schema and identify their current checksum as integrity detection, not a cryptographic signature.

Rationale: Cross-device sync, uploaded participant data, and community signing create consent, deletion, abuse, recovery, moderation, and cost obligations. Shipping honest local primitives preserves guest play and creates evidence without laundering future infrastructure into present-tense promises.

## 2026-08-03 — Session 138 — Performance evidence is isolated by origin

Decision: Namespace Lighthouse caches by target origin, allow only verified complete reports to resume, and keep staging receipts separate from production evidence. HomeV1 remains until exact-main production performance and independent funnel evidence satisfy the existing retirement gate.

Rationale: A closeout run exposed a stale production report in a staging cache. Origin-scoped evidence prevents cross-environment contamination, and a fast staging shell cannot by itself authorize a production funnel decision.

## 2026-08-04 — Session 139 — Shared semantics and atomic boundaries own control-plane truth

Decision: Parse task state once for every human and machine consumer, and route every PROJECT_STATUS mutation through one invariant-preserving, lock-bounded, same-directory atomic writer. Keep source ratchets executable so new direct writers fail the court.

Rationale: Divergent regexes and read/modify/write paths can each look locally correct while publishing contradictory task or session truth. Shared executable semantics plus atomic replacement make concurrency and observability failures testable rather than rhetorical.

## 2026-08-04 — Session 139 — Progression guidance remains deterministic and evidence-bounded

Decision: Close each run by saving one flight, updating one local Pulse, and dispatching one shared continuation action. Introduce the first three runs as Calibrate, Counter, and Commit; project prestige pressure only through named scenario bounds and explicit non-promise language.

Rationale: A feedback loop compounds only when observation, reflection, and the next action are one transaction. Deterministic bounded projections improve motivation without fabricating outcomes, hosted intelligence, or future guarantees.

## 2026-08-04 — Session 139 — Provider readiness outranks transport readiness

Decision: Classify analytics blockers by the missing provider capability before considering a ready transport such as GitHub. Record execution budget as flat-rate plan token efficiency, never as fictional cash expenditure.

Rationale: A ready secret destination cannot create a missing vendor credential. Provider-first evidence and honest cost semantics prevent operational convenience from laundering a launch claim.

## 2026-08-04 — Session 140 — Reproducible evidence uses semantic identity, not checkout time

Decision: Latest-audit selection is based on the audit filename’s semantic date and ordinal, while Hot Context freshness and fingerprints derive from source content rather than filesystem modification time.

Rationale: A fresh Git checkout rewrites mtimes without changing project truth. Release evidence and exact-main CI must be reproducible from content identity, not workstation history.

## 2026-08-04 — Session 140 — Engineering readiness and SPARKED readiness are separate verdicts

Decision: The launch checker reports an engineering rung independently from the public SPARKED rung and accepts only redacted declared provider states; it does not read `.env.local` or infer physical, participant, publication, email, subjective-visual, or founder evidence.

Rationale: A green implementation tree is meaningful without laundering absent external evidence into a launch claim. Separate rungs preserve momentum and observability honesty simultaneously.

## 2026-08-04 — Session 140 — Replay coverage is a source-derived advisory passport

Decision: Replay surfaces share one `replay-coverage-passport-v1` contract. Deterministic movement/aim, combat actions, and one derived contact-enemy slice are named as covered; full wave state, full combat physics, and authoritative outcome are explicitly excluded.

Rationale: Players and agents need a precise trust boundary. Naming both evidence and exclusions prevents a useful partial resimulation from being mistaken for authoritative server replay.

## 2026-08-05 — Session 141 — Canonical session identity comes from the leading boundary

Decision: Identify a handoff or summary by its leading `Session N` / `SN` boundary and use one parser across startup rendering and summary validation. Nested recovery references remain descriptive context and cannot replace the canonical session identity.

Rationale: A correct summary such as `Session 140 recovered S139` must not cause startup to report S139 as the latest completed session. One executable semantic boundary prevents independent regular expressions from publishing contradictory chronology.

## 2026-08-05 — Session 141 — Input arbitration is pure policy, not inline loop state

Decision: Resolve aim through one pure `resolveAimFrame` kernel while preserving the existing precedence: active touch shoot-stick, controller with bounded aim-assist scoring, pointer, then touch auto-aim fallback. Extraction does not authorize balance or aim-assist tuning.

Rationale: Centralizing arbitration makes mixed-input behavior directly testable and reduces loop pressure without changing player feel or widening claims beyond current evidence.

## 2026-08-05 — Session 141 — Production deployment does not imply SPARKED promotion

Decision: A cost-neutral, footer-complete, engineering-ready build may deploy to the existing production surface while lifecycle status remains FORGE/public-unlaunched and SPARKED remains NO-GO.

Rationale: Deployment freshness and public-launch authority are separate courts. Missing project-scoped telemetry, physical and email evidence, participant/publication evidence, subjective visual review, and explicit SPARKED approval cannot be inferred from a green engineering pipeline.

## 2026-08-07 — Session 142 — Community statistics separate authority and coverage

Decision: Verified completed-run facts are authoritative for rich community totals; legacy public leaderboard rows contribute only fields they actually contain; device career data is labeled THIS DEVICE; exact health automation remains operator-visible but is excluded from public reads and aggregates.

Rationale: “All past data” is valuable only when missing historical fields are not reverse-engineered into fiction. One typed aggregate contract can combine supported history while preserving provenance, privacy, idempotency, and synthetic isolation.

## 2026-08-07 — Session 142 — Difficulty feedback recommends; it never silently retunes

Decision: Structured player Field Reports and observed performance may produce a reason-coded harder/easier next-run recommendation, including Zombies, but a player action is required before mode or difficulty changes. Arbitrary Last Words never substitute for structured sentiment.

Rationale: The verified EASY WORLD signal is useful evidence, not a representative balance sample. Consent-driven escalation respects skilled players without making the new-player default harder from a sparse contaminated corpus.

## 2026-08-07 — Session 142 — Zombies is a seeded separated mode on the existing trust spine

Decision: Sewer Zombies reuses deterministic spawning, run claims, replay evidence, and the current leaderboard backend while owning distinct outbreak tiers, horde pacing, undead presentation, and mode identity. It adds no separate realtime server, paid service, or account requirement.

Rationale: The horde fantasy is mechanically and thematically distinct enough to deepen replayability, while reuse of the proven guest-first trust spine keeps costs, fairness, and operational complexity bounded.

## 2026-08-07 — Session 142 — Responsive configuration follows actual input capability

Decision: Mobile detection uses viewport width plus the coarse-pointer media query, never mere `ontouchstart` property presence. Mobile mode/difficulty controls remain always ready in-flow; desktop uses the richer native popover.

Rationale: Hosted Chromium proved property existence can misclassify desktop browsers. Capability-aware rendering protects touch laptops, mobile interaction clarity, desktop feature depth, and deterministic visual verification.

## 2026-08-07 — Session 142 — Public statistics have a dated canonical twin

Decision: Keep the Command Deck Sewer Network as the live player surface, and publish `/stats/` plus `/stats-surface.json` as a dated, precomputed, aggregate-only release snapshot with plain-language interpretation and explicit exclusions.

Rationale: Live game telemetry answers “what is happening now,” while a stable canonical page gives humans and agents a citable scope/freshness contract. CANON-054 is satisfied without turning an unbounded per-visitor query into a cost surface or presenting stale data as current.

CANON-010 gap justification: the live checker reports one Studio-OS-owned `claude:arc` reference to missing §0; Session 142 changed no skills, hooks, or Model Context Protocol registration, so this public-game repo records and routes the external parity drift rather than manufacturing a local fix.

## 2026-08-08 — Session 143 — Community Stats is the player-facing identity

Decision: Use Community Stats for the shared player-facing and component identity. Keep Sewer only where it describes the authored world or mode, including Sewer Zombies and the sewer-night theme.

Rationale: Community Stats states the feature’s purpose immediately, while Sewer Network sounded like unexplained infrastructure. The narrower naming preserves the game’s plumbing brand without making analytics vocabulary obscure.

## 2026-08-08 — Session 143 — Live totals preserve known truth through outages

Decision: Queue every completed run durably before network submission, retry idempotently, and render a last-known-good aggregate with an explicit cached/offline label when live refresh fails. Never replace a known aggregate with zero because of a transient provider error.

Rationale: “Always working” means honest degraded behavior, not an impossible guarantee of provider uptime. Durable local delivery plus labeled cached truth prevents both silent run loss and misleading availability claims.

## 2026-08-08 — Session 143 — All past data means all recoverable server history

Decision: Aggregate every supported server record without an arbitrary time window, distinguish rich run facts from legacy leaderboard records, expose per-metric coverage, and mark never-submitted pre-telemetry runs as not measurable rather than estimating them.

Rationale: Historical completeness is bounded by what was actually recorded. Explicit coverage lets players trust totals while allowing richer metrics to improve naturally as new idempotent run facts arrive.

## 2026-08-08 — Session 143 — Generated evidence canonicalizes line endings

Decision: Normalize CRLF and CR source text to LF before Hot Context parsing, byte counts, and hashes. Enforce byte-identical regeneration after an LF-to-CRLF rewrite in the regression court.

Rationale: Content identity must survive Windows and Linux checkouts. Raw working-tree line endings are transport representation, not project truth, and cannot be allowed to make exact-main CI stale.

## 2026-08-10/11 — Session 148 — Leaderboard rejection and quarantine remain evidence-separated

Decision: Scope every leaderboard read/rank path to `game_id = cod`; loosen the level-velocity review heuristic to `wave*4+10`; reverse the named reviewed false positive through a migration plus append-only trust receipt. Persist 4xx-rejected runs locally while keeping the remote board as the displayed global authority and explicitly reporting `submission: rejected`.

Rationale: A plausibility heuristic is a review trigger, not infallible proof. Local preservation protects player effort, while separate local/global receipts prevent a rejected run from laundering itself into a public acceptance claim.

## 2026-08-10/11 — Session 148 — Sewer Zombies owns a visual and composition identity

Decision: Give Zombies a dedicated proprietary atlas and tier-weighted variant mix, falling back to base/procedural rendering only when its asset is unavailable. Preserve the existing seeded, guest-first, cost-neutral run/trust spine.

Rationale: Green-tinting the ordinary roster did not fulfill the authored horde fantasy. A bounded atlas and deterministic weighted composition add identity without forking infrastructure or sacrificing replayability.

## 2026-08-10/11 — Session 148 — Multiplayer and multi-floor terrain are staged architecture initiatives

Decision: Recommend async ghost racing before server-authoritative co-op, and a single watchtower v0 before generalized floor-aware AI/collision/rendering. Do not claim either design record as shipped gameplay.

Rationale: The current loop is client-only and every entity is flat `x,y`. Concurrent simulation and vertical collision/pathing are separate multi-session systems whose integrity and playability cannot be established as a bolt-on beside a broad polish pass.

## 2026-08-11 — Session 148 recovery — One haptics gate owns touch and gamepad feedback

Decision: Move desktop gamepad rumble beside touch vibration in `utils/haptics.js` and let `setHapticsEnabled` gate both paths.

Rationale: Recovery found the S148 tree four lines over the App-shell architecture budget. Consolidation restores headroom by removing duplicate state and prevents one player setting from enabling contradictory feedback paths.

## 2026-08-11 — Session 149 — One evidence-ranked order owns menu intent

Decision: Resolve input proof, first-three-run onboarding, a bounded carried post-run contract, Journey, and Run Intelligence through one deterministic Commander's Orders precedence. Keep the carried contract in session memory only, sanitize its fields, expose its reason/evidence, and clear it on dismissal or deploy.

Rationale: Multiple directive shapes diluted the death-to-redeploy feedback loop. One pure local resolver preserves a single player action without hosted inference, persistence of free text, or hidden automatic mode changes.

## 2026-08-11 — Session 149 — First-interaction audio initialization is idle work

Decision: Preconstruct `AudioContext` during an idle slice and keep a gesture-time construction fallback for browsers that forbid pre-gesture creation. On narrow screens, pause/hide the decorative full-viewport canvas/blend layers, acknowledge deploy configuration locally, and commit App-wide mode state after the presentation boundary.

Rationale: The measurement sequence moved from 1,408ms native-picker evidence through 832ms/408ms/112ms intermediate experiments, but hardware-composited phase timing finally identified roughly 500ms of synchronous first-`pointerdown` audio initialization. The final staging court measures 16ms mobile and 40ms desktop. This is synthetic browser evidence, not a physical-device claim.

## 2026-08-11 — Session 149 — Rendered pixels can overrule mechanical theme checks

Decision: Treat the 1,020-case matrix as necessary but insufficient. Image-capable inspection must also verify representative touched pixels; when it exposes a defect, fix and repeat the entire matrix before issuing the hash-bound receipt.

Rationale: The matrix checked theme identity and toggle contrast but did not detect `home-arcade.css` overriding Porcelain Day's page canvas or night-only accents inside the new controls. Bounded JPEG fallback inspection found both, and the final recapture proves readable light/dark hierarchy at mobile and desktop.

CANON-010 gap justification: the conformance checker continues to report malformed Studio-OS-owned parity evidence rather than a project skill/hook change; Session 149 changed no MCP or cross-agent registration, so the public game records the checker gap without inventing local conformance.

CANON-045 gap justification: the checker could not parse a passing Obelisk proxy posture even though public auth remains delegated/optional and no project-local account system was added; the release remains FORGE and this parser gap is not laundered into adoption.

CANON-054 gap justification: the checker emitted malformed evidence while the dated `/stats/` and machine-readable stats twin remain present and the full public-route visual court passes; Session 149 records the measurement defect and makes no broader analytics claim.
## 2026-08-11 — Session 149 closeout — external scorer failures stay advisory

**Decision:** Preserve the failed project-targeted IGNIS rescore and the Studio Doctor's cross-portfolio reds as explicit control-plane advisories; do not mutate sibling repositories or downgrade a green Call-Of-Doodie release candidate without a project-local failing gate.

**Why:** `node scripts/ops.mjs rescore --project call-of-doodie` reached the canonical IGNIS CLI but returned only `Scoring Call of Doodie ... failed` with no project diagnostic. The separately completed Doctor reported 123/177 passing and two red control-plane probes (CPX51 capacity admission and cross-surface coherence), while every project-local runtime, test, build, security, cost, staging, and rendered-pixel court is green. Treating the external routing/scorer failure as a product blocker would violate evidence ownership and CANON-018.

**Follow-up:** Studio Ops owns the scorer/doctor routing repair through its normal control plane. This project records the evidence and proceeds with the explicitly authorized cost-neutral engineering release; SPARKED remains separately gated.
## 2026-08-11 — Session 149 production — live verification follows the canonical PNG asset

**Decision:** Make `scripts/live-site-check.mjs` assert the canonical `og-image.png` reference and `image/png` response while retaining the source SVG check in the service-worker cache contract.

**Why:** Production correctly served the S145 PNG social card from `index.html`, but the live checker still expected the old SVG HTML reference and therefore failed after every other live court passed. The SVG remains the authored source and a cached fallback; the PNG is the public Open Graph/Twitter asset. The verifier must follow the current public contract rather than force a regression to an obsolete reference.

**Evidence:** Focused verifier/public-contract court passes 30/30; both `https://callofdoodie.wtf/` and immutable `https://6a3ec909.call-of-doodie.pages.dev/` pass the corrected live court 7/7.
# 2026-08-12 — Session 152 — Accepted coaching is a closed evidence transaction

**Decision:** Preserve a versioned, allowlisted drill envelope across every accepted navigation path and show its observed result before issuing the next verdict.

**Why:** Direct RUN THE FIX already created an active drill, but RAGE QUIT carried only descriptive text and the menu consumed it without passing drill evidence to the next run. That made the visible correction promise path-dependent and prevented an outcome receipt. The closed transaction now accepts, carries, executes, observes, and only then prescribes again.

**Boundaries:** Carried fields are bounded and sanitized; score deltas appear only for comparable runs; the result is explicitly observational rather than causal; no hosted inference or persistent account state is introduced.

## 2026-08-12 — Session 152 — Final status stamp precedes derived context

**Decision:** Closeout autopilot must regenerate Hot Context and Startup Brief after its final PROJECT_STATUS stamp and before git preview/commit.

**Why:** Exact-SHA workflow `31656064776` correctly rejected `2e56892`: local tests were green before autopilot, but autopilot then changed `PROJECT_STATUS.lastUpdated` without refreshing hash-bound Hot Context. Retrying CI would preserve a deterministic closeout defect. The ordering is now executable and source-tested.

## 2026-08-12 — Session 152 — Death state is intentionally theme-invariant

**Decision:** Keep DeathScreen's high-contrast tactical palette invariant across Sewer Night and Porcelain Day while still capturing both themed host states for CANON-053.

**Why:** Project theme state applies to the front door, but the death debrief is a dedicated tactical mode with its own readability contract. The dark and light host captures are byte-identical by design, not a missing-toggle defect. The mastery projection remains genuinely theme-responsive on the front door.

## 2026-08-12 — Session 152 — Saturation stops at evidence boundaries

**Decision:** Treat zero executable Genius items plus a no-candidate innovation pack as honest saturation; do not manufacture balance, retention, hosted AI, provider, or physical-device work from absent evidence.

**Why:** The remaining list is data-, credential-, provider-, participant-, publication-, or device-gated. The fresh audit already promoted and shipped the viable second-order loop innovations. Inventing another local feature would weaken coherence and violate observability truth.

# 2026-08-12 — Session 151 — Mastery requires weapon evidence

**Decision:** Reserve weapon mastery for per-weapon career kills. Keep global account thresholds only as explicitly named arsenal milestones; never infer mastery from total career kills.

**Why:** The prior split authority called three fresh-profile weapons mastered at zero weapon kills while WeaponDock correctly showed ROOKIE. One evidence source now drives loadouts, progression analysis, telemetry vocabulary, and public contracts without changing weapon availability.

## 2026-08-12 — Session 151 — Revenge action precedes analysis

**Decision:** Render ONE VERDICT / RUN THE FIX immediately after death and any challenge result, with build/stat/evidence analysis under one disclosure; do not autofocus the later Famous Last Words field.

**Why:** The loop promises humiliation → lesson → rematch. Direct staging pixels proved autofocus scrolled the entire primary action 854–1,207px above the viewport; source order alone could not reveal it. The corrected screen opens at scrollTop 0 with the action visible at both 390px and 1440px.

## 2026-08-12 — Session 151 — Stats liveness is one contract

**Decision:** Treat `analytica-feed-v1`, the four showcase metric IDs, and the 15-second poll cadence as one shared source contract across the homepage, store, and public descriptor.

**Why:** The UI was live but the machine twin did not declare what “live” meant. Shared constants and a cross-surface test close that structural gap without updating or fabricating any metric value.
## 2026-08-16 — Session 155 — Operations change the grammar before adding network scope

**Decision:** Make solo-first Operations the primary new experience: one deterministic runtime composes BREACH, HOLD, ESCORT, HUNT, SABOTAGE, ESCAPE, and BOSS encounters while Arcade retains every existing mode and replay identifier.

**Why:** The game already had abundant enemies, weapons, modifiers, progression, and social proof; repetition came from every choice converging on the same spawn/clear/reward cadence. Authored objectives and persistent route consequences attack that structural cause while reusing the mature combat and trust spine.

**Boundaries:** Operation score does not mint the standard leaderboard token. The Mission Director explains local rule decisions and never silently changes difficulty. Campaign progression remains unavailable before 10 opt-in paired receipts; realtime co-op remains unavailable before 20 receipts plus a real-service capacity rerun and authoritative implementation.

## 2026-08-16 — Session 155 — Rendered pixels own overlay placement

**Decision:** Position the Operation command overlay below the shared first-run training/HUD band and preserve an explicit scroll margin on the Operations deck.

**Why:** The 1,092 automated visual checks were green, but direct 390px pixel inspection showed the training card covering the Operation title and progress. The corrected staging capture shows both surfaces readable simultaneously; mechanical selector visibility alone was insufficient.
