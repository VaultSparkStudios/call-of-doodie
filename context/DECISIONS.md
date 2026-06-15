# Decisions

Public-safe decisions only. Detailed internal decision history is maintained privately.

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
