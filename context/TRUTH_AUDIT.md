## 2026-07-06 — Session 121 continuation — Doctor route truth

- Protocol truth — `scripts/ops.mjs` now lists and routes `doctor`, proxying to the Studio Ops doctor path from the current repo.
- Health truth — `node scripts/ops.mjs doctor --update-json --quiet` exits 0 and writes `doctorScore`; `node scripts/ops.mjs doctor --json --quiet` reports `blockingFailing: 0`, `failing: 0`, `passing: 107`, `warning: 21`, and `skipped: 2`.
- Brief truth — `docs/STARTUP_BRIEF.md` was regenerated after the doctor route existed and still validates with the canonical brief validator.
- Deferral truth — innovation-pack candidates remain external where they require analytics/dashboard access, physical device evidence, HomeV2 production metrics, community/publication setup, or founder confirmation.
- Verification truth — protocol drift 25/25, lint, 605/605 tests, replay state-stepper, edge fixtures, launch media, launch QA, build, and diff check passed.

Overall status: green locally; portfolio doctor warnings are advisory and non-blocking for this repo closeout.
Last reviewed: 2026-07-06
## 2026-07-04 — Session 121 - Launch contract truth\n\n- Contract truth: scripts/health-check.mjs now includes summarySig and ventDigest on the valid score submit path when issue-token and payload contract require those fields.\n- Surface truth: scripts/launch-surface-check.mjs now validates sitemap coverage using multiple acceptable location patterns so it does not fail on legacy listing paths.\n- Verification truth: 
pm run lint, 
pm test (605/605), replay fixtures, build, launch media check, and 
pm run launch:qa all passed.\n- Deferred truths remain external: Cloudflare token hardening, physical launch QA, analytics keys, HomeV2 production lighthouse/funnel evidence, and publication/community gates.\n\nOverall status: green locally\nLast reviewed: 2026-07-04\n
## 2026-07-03 - Session 118 - Five-scene launch screenshot replacement

- Screenshot truth - `scripts/capture-launch-screenshots.mjs` captures five real Chromium scenes from the local Vite app: combat, Boss Rush, Loadout Builder, leaderboard, and mobile controls.
- Manifest truth - `public/manifest.json` now points every screenshot entry at a verified PNG in `public/launch-captures/`; the previous SVG launch assets remain proprietary promotional fallbacks only.
- Provenance truth - `assets/visual-assets.json` records all five manifest screenshots as `sourceType: browser-capture`, `license: Proprietary`, and `status: production-ready`.
- Gate truth - `scripts/validate-launch-media.mjs` verifies manifest PNG files exist, are listed in the asset registry, are production-ready browser captures, are included in `verifiedCaptures`, and match expected PNG dimensions.
- Validation truth - screenshot capture 5/5, asset registry check passed, launch media check passed, lint/build passed, full `npm test` passed 603/603, and `git diff --check` passed.

Overall status: green locally
Last reviewed: 2026-07-03

## 2026-07-16 — Session 122 recovery — Interrupted-work and release-gate truth

- Recovery boundary truth — Session 122 was not complete when recovered. The stale lock and dirty tree showed `/start` + `/audit` completed, three audit items partially implemented, and three without implementation footprints. All Session 122 product changes were uncommitted.
- Integrity truth — every changed/untracked JSON parsed, there was no changed NDJSON, the Claude guard configuration was valid with no recent corruptions, and no confirmed debris was deleted.
- Implementation truth — all six items in `docs/AUDIT_2026-07-16.json` / `.md` now carry execution evidence. The audit profile is corrected to public app/product; the game-loop lens remains additional product evidence, not a replacement rubric.
- Competitive RNG truth — named streams cover spawn/combat/loot/choices/hazards and are serializable. The spawn stream deliberately preserves the original Session 112 hash; replay browser/edge fixtures remain 4/4. Cosmetic randomness is outside competitive receipts.
- Practice truth — practice runs record participation-only totals and cannot advance scores, kills, records, achievements, missions, mastery, enemy career records, or mission streaks.
- Validation truth — lint passed; full tests passed 631/631 across 76 files; replay state/edge fixtures passed 4/4; launch media, launch QA, public contract, build, and diff checks passed.
- Doctor write-back truth — Session 121''s executable proxy was real, but its `--update-json` project-write claim was not: the upstream doctor wrote Studio Ops only. Session 122 adds a tested fail-closed receipt sync so this repo''s doctorScore now updates from the authoritative result.
- Staging truth — isolated preview `https://recovery-s122.call-of-doodie.pages.dev` served nine required routes with HTTP 200, expected content types, CSP, nosniff, and referrer policy. A fresh visual/theme/viewport pass is not claimed: browser runtime initialization failed and Obelisk blocked downloading an unpinned CLI.
- Release truth — app-release verdict remains NO-GO for SPARKED/public launch. Recovery checkpoint authorization does not satisfy physical PWA/gamepad QA, analytics/Sentry scope, HomeV2 production evidence, staged visual/theme proof, or founder launch approval.

Overall status: green recovered code; NO-GO public launch
Last reviewed: 2026-07-16
<!-- truth-audit-version: 1.1 -->
# Truth Audit

## 2026-07-16 — Session 123 — Theme, staging, and run-trust truth

- Theme truth — src/utils/theme.js owns two real player-selectable themes with URL/storage/system resolution; HomeV2 and all three legal pages expose accessible toggles. Combat remains dark-first intentionally.
- Visual evidence truth — scripts/audit-staging-visuals.mjs uses the installed pinned Playwright dependency and writes screenshots plus a JSON receipt. The isolated hosted preview passed 192/192 checks across four routes, two themes, and three widths.
- Pixel-review truth — direct AI inspection of the generated PNGs is not claimed: both the local image viewer and image-emitting Node kernel failed Windows CryptUnprotectData. This remains a release-gate input even though the machine matrix is green.
- Staging truth — GitHub Actions run 29540809234 deployed commit f33c1b5 to session-123-staging.call-of-doodie.pages.dev; eight required routes returned 200 with CSP and nosniff.
- RNG truth — the DeathScreen receipt reflects the live named-stream snapshot's seed, draw counts, states, and stable fingerprint. Its copy explicitly rejects a full physics replay claim.
- Protocol truth — local closeout proxy files bind project/path arguments to authoritative sibling scripts, use the safe hidden spawn path, and are required by protocol drift.
- Calendar truth — the streak invariant covers every consecutive local calendar day from 2020 through 2031 at local noon, including leap, month/year, and daylight-saving transitions.
- Validation truth — 642/642 tests, lint, public contract, protocol drift, build, replay fixtures, launch gates, npm audit 0, secret scans, and hosted visual/route checks passed.
- Release truth — SPARKED remains NO-GO; physical hardware, inbound delivery, production data/analytics scope, publication, and founder approval are not replaced by engineering evidence.

Overall status: green engineering closeout; NO-GO SPARKED
Last reviewed: 2026-07-16

## 2026-06-15 — Session 96 — Combat audio × career depth × coaching sprint

- Audio truth — `soundBossGrudge(tier)`, `soundComboTick(framesLeft)`, `soundComboBreak(count)` added to `src/sounds.js`; all three are named exports wired in `src/App.jsx`.
- Career stats truth — `src/storage.js` `DEFAULT_CAREER` now includes `enemyKillBests: {}` and exports `updateEnemyCareerStatsBatch(killsByType)`. `recordDeathByEnemy()` also upserts `killedByCount`. Batch write is the single write path at wave-clear.
- Coach truth — `src/utils/runCoach.js` exports `buildWeaponDeathCoach(weaponKills, recentDeathsByEnemy)` with module-level `WEAPON_RANGE_MAP`, `ENEMY_THREAT_MAP`, `THREAT_COUNTER`. `buildRunCoach()` returns `weaponDeathTip` field.
- RunBrain truth — `src/utils/runBrain.js` `buildRunBrain()` accepts `chokeWaves = null` and returns `chokeWarning: {wave, tip}|null`.
- Share card truth — `src/utils/runDnaShareCard.js` payload includes `moments: []`; `src/workers/shareCard.worker.js` renders up to 2 moments with dynamic H.
- DeathScreen truth — `peakMoment`, `waveScoreLog`, `communityChokeWaves` props added; SVG sparkline and PEAK MOMENT row rendered; Run Coach card shows chokeWarning pill and weaponDeathTip "Mismatch:" line.
- App truth — `peakMomentRef = useRef(null)` added at ref declarations; `gs._waveScoreLog` and `gs._wkbt` accumulate in game loop; both flushed at wave-clear; `peakMoment`/`waveScoreLog`/`communityChokeWaves` passed to DeathScreen JSX.
- HUD truth — ammo bar fill div in `src/components/HUD.jsx` applies `ammoPulseRed`/`ammoPulseYellow` animations keyed by `ammoPct` threshold.
- Validation truth — 499/499 tests (+10 new: runBrain ×3, runCoach ×5, runDnaShareCard ×2), lint 0 errors / 7 existing warnings, build passing.

Overall status: green locally
Last reviewed: 2026-06-15

## 2026-06-15 - Edge replay pressure parity continuation

- Edge pressure truth — `supabase/functions/validate-replay/pressure.js` now owns the Edge replay pressure/evidence helper logic, and `validate-replay/index.ts` imports it instead of duplicating the pressure math inline.
- Fixture parity truth — `npm run replay:edge-fixtures` compares Edge `pressureClass`, `commandCount`, `finalWave`, and `finalScore` against the shared browser `replayTraceFixtureTable()` and `buildReplayPressureProfile()`.
- Validation truth — Edge parity passed 4 fixtures, browser replay fixture validator passed 4 fixtures, focused replay tests passed 17/17, full `npm test` passed 489/489, lint reported 0 errors / 7 existing warnings, and build passed.
- Tooling truth — Deno 2.8.2 is available at `C:\tmp\deno-2.8.2\deno.exe`; `deno check supabase\functions\validate-replay\index.ts` passes after narrowing the shared JS helper return types at the TypeScript call site.

Overall status: green locally
Last reviewed: 2026-06-15

## 2026-06-15 - Session 95

- Closeout verification truth — this session did not add new product code; it verified the existing Session 94 audit implementation from the current worktree.
- Audit execution truth — `docs/AUDIT_2026-06-15.md` / `.json` still mark `startup-brief-canonical-boxes` and `startup-brief-regression-harness` shipped with execution evidence.
- Validation truth — `node scripts/validate-brief-format.mjs docs/STARTUP_BRIEF.md` passed, `npx vitest run tests/startup-brief-boxes.test.js` passed 5/5, full `npm test` passed 489/489, `npm run lint` reported 0 errors / 7 existing warnings, and `npm run build` passed.

Overall status: green locally
Last reviewed: 2026-06-15

## 2026-06-15 - Session 94

- Startup brief format truth — `scripts/render-startup-brief.mjs` no longer writes raw numbered genius-list stdout into `docs/STARTUP_BRIEF.md`; unboxed output is normalized through `normalizeGeniusBlock()` into a canonical `GENIUS HIT LIST` tile.
- Human pressure truth — the renderer always emits `HUMAN PRESSURE`. When no compiled pressure queue exists, the tile explicitly says no founder-action pressure is queued instead of silently omitting the surface.
- Regression truth — `tests/startup-brief-boxes.test.js` covers plain, boxed, and empty genius-list output plus human-pressure item and empty-state rendering.
- Validation truth — focused startup-brief box tests passed 5/5, `node scripts/render-startup-brief.mjs` passed, `node scripts/validate-brief-format.mjs docs/STARTUP_BRIEF.md` passed, full `npm test` passed 489/489, `npm run lint` passed with 0 errors / 7 existing warnings, and `npm run build` passed.

Overall status: green locally
Last reviewed: 2026-06-15

## 2026-06-14 - Session 93

- Mission progress truth — `isMissionCompleted(progress, mission, index)` returns true for either a legacy numeric/index key or a mission `id` key. `countIncompleteMissions()` is now the shared front-door counter used by HomeV2/MenuScreen surfaces.
- Studio event ownership truth — `createDeathStudioEvents()` emits only `first_death_wave`. DeathScreen remains the owner of contract-specific `weekly_contract_progress`, and App.submitScore remains the owner of successful `score_submit_result` / `submission_rejected` events via `createScoreSubmitStudioEvents()`.
- DeathScreen fallback truth — DeathScreen still writes a local `score_submit_result` only in the catch path where the submit callback throws before App can write the canonical result event.
- Validation truth — focused storage tests passed 45/45, focused runSession tests passed 5/5, full `npm test` passed 484/484, `npm run lint` passed with 0 errors / 7 existing warnings, and `npm run build` passed.

Last reviewed: 2026-06-14

## 2026-06-14 - Session 91

- storage.js surface truth — 3 new exported functions: `getCommunityChokePoints(counts)` (returns `Set<Number>` of waves with ≥3× median death count; null input falls back to `getWaveDeathCounts()`), `trackRhythmMasteryHit()` (increments career.rhythmMasteryHits, returns new total), `getRhythmMastery()` (returns career.rhythmMasteryHits or 0).
- bossDialogue.js surface truth — `interpolateBossQuote()` now handles 7 tokens: `{wave}`, `{weapon}`, `{deaths}`, `{streak}`, `{act}`, `{sessionDeaths}`, `{bossKills}`, `{tone}`. New export `getBossTone(difficultyId)` returns one of 4 adverbs; unknown IDs return 'adequately'. 17 tests cover all token substitutions and all difficulty branches.
- drawGame.js truth — vignette now reads `gs._runAct` (set by `getRunAct()` in runNarrative.js each wave) to select act color; beat vulnerability ring width reads `gs.precisionStreak` via the same `8+min(4,floor(streak/5))` formula used in App.jsx. Both are live-computed per frame (no cached value).
- sounds.js truth — `soundChainEscalate(level)` exported; level 1 = ascending sawtooth stab (3 tones), level 2 = dual-pulse alarm (4 tones). No existing sound function was modified.
- App.jsx refs truth — `bossSessionDeathsRef = useRef({})` resets at `startGame()`; keyed by enemy typeIndex; incremented in the player-death handler when `best.isBossEnemy`. `communityChokePointsRef = useRef(new Set())` populated once at game start from `getCommunityChokePoints(waveDeathCountsRef.current)`.
- shareCard worker truth — `wavePercentile` (null or 0–100 integer) passes from DeathScreen to worker via postMessage; computed only when leaderboard has ≥5 entries. Worker renders the line only when non-null.
- Validation truth — `npm test` passed 478/478 (+17 new tests vs S90 baseline 461); `npm run lint` passed with 0 errors / 7 warnings (−1 vs S90 8); `npm run build` passed.

Overall status: green locally
Last reviewed: 2026-06-14

## 2026-06-14 - Session 90

- Replay proof presenter truth — `src/utils/replayProofPresenter.js` composes existing replay proof receipts and trends; it does not create stronger trust claims than `buildReplayProofReceipt()` and `buildReplayProofTrend()` already support.
- Submission feedback truth — online/rejected/local DeathScreen states now reuse the same presenter language when trace evidence exists. Rejected runs still say local fallback is skipped when the server rejected validity; the proof readout is informational, not an override.
- Innovation-pack truth — `node scripts/ops.mjs innovation-pack` is a repo-local candidate generator based on `context/TASK_BOARD.md` and `.cache/genius-list.json`; it is not private Studio Ops intelligence and every candidate still requires premise verification before implementation.
- Protocol drift truth — `npm run protocol:drift -- --json` now reports `status=ok`, `missingRequired=0`, `missingOptional=0`, and 20/20 present including `docs/INNOVATION_PACK.md`.
- Validation truth — focused proof/replay/session tests passed 27/27; full `npm test` passed 453/453; fixture validator passed 4/4; lint reported 0 errors / 8 existing warnings; build passed.

Overall status: green locally
Last reviewed: 2026-06-14

## 2026-06-13 - Session 87 continuation

- Protocol helper truth — `sample-codebase`, `audit-sidecar`, `render-audit-md`, `session-floor`, `cache-genius-list`, `generate-genius-list`, and `record-skill-cost` are repo-local compatibility helpers. They keep the public repo's Studio OS loop executable; they do not claim to replace private Studio Ops intelligence.
- Genius-list truth — `node scripts/ops.mjs genius-list` now returns task-board-derived local recommendations. When there are no open repo-executable Now items, it truthfully emits a launch-confidence maintenance item rather than inventing product work.
- Protocol drift truth — `npm run protocol:drift -- --json` now reports `status=ok` across 19 helper files, including the newer audit/implement/closeout helper set.
- Nemesis dossier truth — `getNemesisWeaponRecommendation()` covers every boss type that has concrete `BOSS_GUIDANCE`. Unknown boss types still fall back to "your best weapon", and the fallback is tested.
- Validation truth — script smokes passed; focused waveDirector tests passed 19/19; full `npm test` passed 442/442; `npm run lint` reported 0 errors and 1 pre-existing warning; `npm run build` passed.

Overall status: green locally
Last reviewed: 2026-06-13

## 2026-06-13 - Session 87

- Formation system truth — `heatBiasedFormation` upgrades the director's output but never moves an enemy off-screen; `applySpawnFormation` clamps positions to the canvas margin. No balance invariants broken.
- Enrage truth — `_chainEnrageLevel` applies to ALL non-boss ranged enemies simultaneously. At overdrive (combo≥35) this compounds with `mutAlwaysEnraged` in cursed runs — same behavior as documented in MEMORY.md known-issues.
- Trace evidence truth — `deathTraceEvidenceRef` is populated by `analyzeReplayCommandTrace(encodeReplayCommandTrace(...))` at the moment of death. The ⭐ VERIFIED badge requires `evidenceLevel: rich` (≥6 events, 60+ frames, 2+ movement, 1+ aim, 2+ interactions). Players who die very quickly will legitimately show no badge.
- Proximity rivals truth — `getProximityRivals` returns [] when `myBestScore ≤ 0` or leaderboard is empty. The DeathScreen RIVALRY LADDER silently hides — this is correct behavior.
- Precision peak truth — `_precisionPeakFrame` is only set when a new streak peak is reached. If a player never builds a precision streak, the BEST SHOT button does not render (guarded by `precisionPeakStreak >= 3`).
- Nemesis weapon truth — superseded by the Session 87 continuation helper: guided boss types now use tested `getNemesisWeaponRecommendation()` coverage; unknown types still fall back to "your best weapon" honestly.
- Test truth — 440/440 passing; +8 from new `computeWaveThreatRating` and `heatBiasedFormation` tests in `waveDirector.test.js`.

Overall status: green locally
Last reviewed: 2026-06-13

## 2026-06-08 - Session 84

- Audit execution truth - `docs/AUDIT_2026-06-08.md` / `.json` now record all eight ranked items as shipped or bounded-shipped with execution notes.
- RunBrain truth - difficulty suggestion remains local-only and zero-token; it reads recent run history and renders only a HomeV2 hint.
- Build report truth - `computeBuildGrade()` grades local run/build data and DeathScreen renders the result; it does not submit or expose additional player data.
- Death marker truth - the shipped heatmap pass annotates the final ghost-path death marker with killer type; multi-run cluster centroid grouping is not yet implemented.
- Pointer harness truth - `@playwright/test@1.60.0` was installed after exact-version package-trust approval, and the e2e test proves the debug HUD reaches `pointer:4/4`.
- Validation truth - `npm test` passed 423/423 across 47 files, `npm run build` passed, and `npm run test:e2e` passed 1/1 Chromium test.
- Dependency truth - the dev-toolchain remediation is complete: package-trust approved the exact upgrade set after fixing a false-positive `vitest` typosquat rule in Studio Ops, and `npm audit --json` now reports 0 vulnerabilities.
- Protocol truth - Codex sessions now truthfully stamp plan mode as `not_required` in `verify-plan-mode.mjs`, and the local SIL category list exists so `node scripts/lib/write-project-status.mjs --check` can run instead of failing on a missing import.

Overall status: green locally with zero npm audit vulnerabilities
Last reviewed: 2026-06-08
Public-safe summary only. Sensitive verification notes are maintained privately.

## 2026-06-07 - Session 83

- Startup helper truth - repo-local compatibility scripts now exist for `credential-watch`, `ark`, `router`, `check-brief-staleness`, `build-skill-manifest`, and `skill-trace-emit`.
- Scope truth - these helpers are local compatibility surfaces, not private Studio Ops replacements. They snapshot or read local repo files and report no-op state honestly.
- Protocol drift truth - `npm run protocol:drift -- --json` reports `status=ok`, `missingRequired=0`, and `missingOptional=0`.
- Validation truth - helper probes pass, and continuation closeout re-ran the current gates: `npm run lint` passed, `npm test` passed 412/412 across 46 files, and `npm run build` passed.
- Closeout protocol truth - `scripts/record-skill-cost.mjs` is absent in this public repo. The cost marker did not run; the rest of closeout evidence is recorded from available local commands.
- Founder-Twin truth - repo-local `scripts/twin-ask.mjs` is absent, so the closeout git gate used the narrow public-repo mutation path instead of claiming a Twin verdict.

Overall status: green locally; live Supabase deploy still pending credential
Last reviewed: 2026-06-07
Public-safe summary only. Sensitive verification notes are maintained privately.

## 2026-06-07 - Session 82

- Service worker truth — `public/sw.js` now caches only safe cloned responses, handles failed network fetches explicitly, and avoids turning missing assets into the app shell.
- Boss-wave truth — forced next-round boss cards no longer set the generic wave announcement/shop delay path; the boss-wave title is a timed banner and clears independently from the fight state.
- Runtime-state truth — shop option helpers, draw loops, and game-loop transient arrays tolerate missing/null state instead of assuming every enemy/player object is present.
- Studio event truth — local storage retries only pending events, and the Supabase edge function keeps non-UUID browser client ids in payload rather than writing invalid UUIDs to `client_uid`.
- Audit execution truth — `docs/AUDIT_2026-06-07.md` / `.json` now mark all four items shipped; Enemy Lab and trace-proof benchmark were verified in existing player/trust code, while launch-readiness receipts and protocol drift sentinel were implemented this pass.
- Launch readiness truth — `scripts/launch-readiness.mjs --json` exposes structured owner-gate evidence receipts and reports `requiredReady=true`; missing PostHog/Sentry keys remain optional post-launch analytics, not a launch asset blocker.
- Protocol drift truth — `npm run protocol:drift -- --json` reports `warning` with `missingRequired=0`; missing `credential-watch`, `ark`, `check-brief-staleness`, `build-skill-manifest`, and `skill-trace-emit` are warning-level optional helper drift in this public repo.
- Deployment truth — the Supabase edge-function code is fixed locally but not live; deploy failed without `SUPABASE_ACCESS_TOKEN`, and `node scripts/check-secrets.mjs --for supabase` reports `supabase MISSING`.
- Cloudflare beacon truth — no repo-owned beacon script was found; the Subresource Integrity error is consistent with Cloudflare-injected Web Analytics configuration outside this repo.
- Validation truth — focused Run Coach/trust tests passed 20/20, full `npm test` passed 412/412 across 46 files, `npm run lint` passed, and `npm run build` passed.

Overall status: green locally; live Supabase deploy pending credential
Last reviewed: 2026-06-07
Public-safe summary only. Sensitive verification notes are maintained privately.

## 2026-06-05 - Session 81

- Skill-entry truth — the public repo now has `scripts/lib/skill-profile.mjs`, so `/start`, `/audit`, `/implement`, and `/closeout` can resolve the Call-Of-Doodie game overlay before doing work.
- `scripts/set-active-skill.mjs` writes only `.cache/active-skill.json`; it does not touch game runtime, secrets, or provider state.
- `scripts/lib/medium-quality-gates.mjs` and `scripts/lib/sil-rubrics.mjs` are minimal compatibility shims for local imports, not private Studio Ops replacements.
- Validation truth — skill-profile start/audit/closeout checks, active-skill marker, startup brief render/validate, Codex plan-mode check, context meter, SIL invariant check, `npm run lint`, `npm test` 408/408, and `npm run build` passed.

Overall status: green
Last reviewed: 2026-06-05
Public-safe summary only. Sensitive verification notes are maintained privately.

## 2026-06-05 - Session 80

- Protocol compatibility truth — this session did not add game runtime features; it repaired repo-local Studio OS execution paths introduced by prior protocol upgrades.
- `scripts/lib/turn-classifier.mjs` is deterministic and dependency-free; it exists so `model-router.mjs` imports safely and can down-route simple Anthropic calls without breaking callers.
- `scripts/lib/visual-blocks.mjs`, `scripts/lib/sil-forecaster.mjs`, `scripts/lib/blocker-rules.mjs`, `scripts/lib/skill-cost-ledger.mjs`, and `scripts/scan-secrets.mjs` are local compatibility helpers, not private Studio Ops replacements.
- `scripts/verify-plan-mode.mjs` again treats Codex plan mode as `not_required`, matching the Session 61 decision that `/model opusplan` is a Claude Code runtime-only command.
- `context/PROJECT_STATUS.json` now passes the write-time SIL invariant helper; `silScore` equals the sum of `silCategoriesV3`.
- Validation truth — `compact-handoff`, `render-startup-brief`, `validate-brief-format`, `blocker-preflight`, `context-meter`, `npm run lint`, `npm test` 408/408, and `npm run build` passed.

Overall status: green
Last reviewed: 2026-06-05
Public-safe summary only. Sensitive verification notes are maintained privately.

## 2026-06-05 - Session 79

- `src/utils/runBrain.js` `matchesExperiment()` remains local-only/zero-token and now normalizes run config into a `hay` string before safe-opener pattern checks.
- `src/utils/menuGuidance.js` reads only local career `recentDeathsByEnemy` state to emit `revenge_drill`; it does not alter enemy spawn rates, balancing, storage schema, or network behavior.
- `src/utils/gamepad.js` owns shared controller label metadata for Xbox, PlayStation, and generic controllers; UI surfaces consume labels but do not change input mapping.
- `src/components/HomeV2.jsx` uses remembered controller profile only as a controls-help fallback when a controller is not currently connected.
- Validation truth — focused helper tests passed 29/29, `npm run lint` passed, `npm test` passed 408/408 across 46 files, and `npm run build` passed.

Overall status: green
Last reviewed: 2026-06-05
Public-safe summary only. Sensitive verification notes are maintained privately.

## 2026-06-03 - Session 78

- `src/storage.js` now owns `getBossKillRecord`/`saveBossKillRecord`/`isNemesis` (key `cod-boss-kills-v1`) and `saveExperimentIntent`/`loadExperimentIntent`/`clearExperimentIntent` (key `cod-last-experiment-v1`). Neither reads or writes any account/network surface.
- `src/App.jsx` tracks nemesis state in `gs.nemesisBossType`, boss kill/death records in storage on boss-wave events and player deaths, and experiment intent in `experimentMatchedRef` at run start.
- `src/drawGame.js` reads `gs.precisionStreak` and `gs.nemesisBossType` for purely visual rendering (aim flow ring, enemy center highlights, boss name prefix). No game-state mutation in drawGame.
- `src/utils/runBrain.js` adds `getMutationDifficultyBrief` (reads run history + WEEKLY_MUTATIONS, zero network) and `matchesExperiment` (keyword/entity matching, zero network).
- `src/constants.js` achievement count is now 66 (was 65); `constants.test.js` count assertion updated to match.
- Formation flavor descriptors live in App.jsx (inline map) and are not persisted — they derive from `gs._lastFormationLabel` which is wave-ephemeral.

## 2026-06-03 - Session 77

- `src/systems/gameStep.js` now owns both pointer projection and a four-direction pointer sweep evidence report.
- `src/utils/inputCalibration.js` persists local-only verified input calibration records; no account, API, analytics, or network dependency was added.
- `src/utils/gamepad.js` persists last-seen controller profile metadata locally for repeat QA.
- `src/App.jsx` writes completed pointer sweep calibration into local storage only while input debugging is enabled and shows calibration status in the hidden diagnostics HUD.
- `src/components/HomeV2.jsx` surfaces remembered calibration/controller status for repeat QA without changing normal deploy flow.
- Validation truth — focused input/control tests passed 27/27, `npm run lint` passed, `npm test` passed 383/383 across 46 files, and `npm run build` passed.

Overall status: green
Last reviewed: 2026-06-03
Public-safe summary only. Sensitive verification notes are maintained privately.

## 2026-05-21 - Session 74

- `src/utils/studioEventOps.js` now owns trace-evidence contracts and replay-resim readiness summaries derived from local Studio trust events.
- `src/components/MenuPanels.jsx` Run History trust ops now displays Trace basic and resim readiness chips alongside existing trace rich/weak chips.
- `src/utils/runBrain.js` zero-token Run Brain now prioritizes replay-proof drills when the latest trust event has weak trace evidence.
- Validation truth: focused tests passed 12/12, `npm run lint` passed, `npm run build` passed, and `npm test` passed 370/370 across 44 files.

Overall status: green
Last reviewed: 2026-05-21
Public-safe summary only. Sensitive verification notes are maintained privately.

## 2026-05-21 — Session 73 changes

- `src/utils/runSubmission.js` — `buildSessionSubmission()` now attaches compact `traceEvidence` from the replay command trace analyzer when a valid trace is present.
- `src/storage.js` — leaderboard submit results preserve `traceEvidence` across online, rejected, local, and local-fallback paths.
- `supabase/functions/submit-score/index.ts` — mirrors trace-evidence analysis, stores `traceEvidence` in member `game_sessions.metadata`, and returns it in success responses.
- `src/systems/runSession.js`, `src/App.jsx`, and `src/components/DeathScreen.jsx` — score-submit analytics and local Studio events now receive trace evidence.
- `src/utils/studioEventOps.js` and `src/components/MenuPanels.jsx` — Run History trust ops now summarizes rich/weak trace evidence counts and shows per-event evidence gaps.
- Validation truth — focused trace/submission/session/event tests passed 22/22, `npm run lint` passed, `npm run build` passed, and `npm test` passed 363/363 across 44 files.

## 2026-05-21 — Session 72 changes

- `src/App.jsx` — command traces now include throttled movement and aim octant samples in addition to discrete run actions. Sampling happens on bucket changes or interval expiry and still flows through the existing bounded recorder.
- `src/utils/replayCommandTrace.js` — adds `analyzeReplayCommandTrace()` with duration, action mix, movement/aim/shoot counts, interaction count, evidence level, and weakness reasons.
- `src/utils/replayCommandTrace.test.js` — adds rich-evidence and weak-trace coverage; focused trace/submission tests now pass 15/15.
- `supabase/functions/validate-replay/index.ts` — returns optional `traceEvidence` and reserves `trace_contract` confidence for rich body-backed traces. Low-evidence valid traces remain accepted as heuristic rather than being over-claimed.
- `scripts/replay-trust-smoke.mjs` — live trust smoke now covers rich trace contract, weak trace heuristic labeling, and malformed trace quarantine.
- Validation truth — focused trace tests passed 15/15, `npm run lint` passed, `npm run build` passed, and `npm test` passed 362/362 across 44 files.

## 2026-05-21 — Session 71 changes

- `src/utils/replayCommandTrace.js` — adds `recordReplayCommandEvent()` and `directionBucket()` so command traces can be populated incrementally during actual gameplay, not only encoded at death.
- `src/App.jsx` — records replay trace events for shoot, dash, grenade, perk, route, shop, reload, and weapon swap actions before `buildSessionSubmission()` sends the encoded trace contract.
- `src/utils/runSubmission.js` — now forwards trace fields only when `isValidReplayCommandTrace()` passes, stripping malformed trace objects before network submission.
- `supabase/functions/validate-replay/index.ts` — accepts optional `traceBody` and verifies byte budget, count, digest, frame parsing, and action shape; it still does not claim deterministic resimulation.
- `scripts/replay-trust-smoke.mjs` — live trust smoke now posts body-backed trace contracts and malformed body cases.
- Validation truth — focused trace tests passed 13/13, `npm run lint` passed, `npm run build` passed, and `npm test` passed 360/360 across 44 files.

## 2026-05-21 — Session 70 changes

- `src/systems/flowField.js` — now owns deterministic flow-field construction and sampling that were previously embedded in `App.jsx`; tests prove obstacle routing, steering, and fallback behavior.
- `docs/AUDIT_2026-05-21.json` — machine-readable sidecar for the S70 audit plan and execution evidence, matching the Markdown audit and closeout audit record.
- `src/App.jsx` — imports the flow-field helpers and applies wave-director formation offsets after spawn creation without changing enemy taxonomy or balance intent.
- `src/systems/waveDirector.js` — exports deterministic formation planning and bounded post-spawn offsets so scouting/pressure/climax stages can read as flank, pincer, or surge patterns.
- `src/components/DeathScreen.jsx` — renders active weekly-contract progress under Run Brain, turning the debrief into a contract feedback surface instead of leaving that loop only in Run History.
- `src/utils/replayCommandTrace.js` and `supabase/functions/submit-score/index.ts` — enforce a shared 10,000-byte replay trace body budget before client accept or edge storage/logging work.
- Validation truth — `npm run lint` passed, `npm run build` passed, and `npm test` passed 357/357 across 44 files during closeout verification.

## 2026-05-18 — Session 69 changes

- `src/storage.js` — `saveToLeaderboard()` now uses `buildSubmitScorePayload()` so trace evidence survives `normalizeLeaderboardEntry()` and reaches `submit-score`; trace fields remain outside leaderboard row normalization.
- `src/utils/runSubmission.js` — `buildSessionSubmission()` now forwards `traceBody` alongside `traceDigest` and `traceLength` when a non-empty command trace exists.
- `supabase/functions/submit-score/index.ts` — validates optional trace bodies against digest and count before leaderboard insert; malformed bodies are rejected through the replay-trace validation path; valid trace bodies are stored only in member `game_sessions.metadata`.
- `scripts/replay-trust-smoke.mjs` / `package.json` — adds `npm run replay:trust-smoke` for deployed `validate-replay` checks covering valid trace-contract confidence and malformed trace quarantine. Live execution still requires network permission.
- `src/App.jsx` / `src/components/HUD.jsx` — loaded `gs.topGhosts` now appears in-game as a compact Ghost Pack target strip. This closes the visible-surface half of the persistent ghost leaderboard; it does not yet draw full path ghosts from leaderboard rows.
- Validation truth — targeted runSubmission/storage tests passed 24/24; full `npm test` passed 350/350; lint clean; build passing; live replay trust smoke attempted but blocked by sandbox network and unapproved escalation.

## 2026-05-18 — Session 68 changes

- `supabase/functions/validate-replay/index.ts` — accepts trace-backed replay contracts via `traceDigest` + `traceLength`; malformed trace metadata quarantines the replay check; competitive seeded runs can now satisfy replay-contract presence with either `inputHash` or valid trace metadata. Confidence can now be `trace_contract` without claiming full deterministic resimulation.
- `supabase/functions/submit-score/index.ts` — validates trace metadata before leaderboard insert, logs malformed trace claims as `replay_trace_malformed`, and carries valid trace summary into member `game_sessions.metadata` without requiring a leaderboard schema change.
- `src/utils/runSubmission.test.js` — adds regression coverage for trace metadata being included only when a non-empty command trace summary exists.
- Replay trust truth — client trace binding is no longer the open gap. The remaining Phase 2B work is the actual deterministic replay runner plus any storage contract needed for full trace payload replay.

## 2026-05-17 — Session 67 changes

- `src/App.jsx` — beat-kill bonus in bullet-enemy collision path; `commandTraceRef` for replay trace binding; `getMissionStreak`/`advanceMissionStreak` called on death; `reconcileOwnership` from cosmeticTrack; `loadTopGhosts()` called in `startGame()`; weapon unlock detection loop in `handlePlayerDeath`; `objectivesCompleted`/`objectivesFailed` arrays tracked on objective tick; `cosmeticUnlocks` + `objectivesSummary` states passed to DeathScreen.
- `src/components/DeathScreen.jsx` — OBJECTIVES card (✓/✗ per outcome before perks card); `crossRunTip` line in RUN COACH; Doodie Pass gold unlock card before ghost visualization; `cosmeticUnlocks`/`objectivesSummary` props accepted.
- `src/components/HomeV2.jsx` — `getMissionStreak` called in useEffect; 🔥 streak chip in Command Center header; `getDifficultyBriefing()` subtitle below difficulty picker.
- `src/storage.js` — `getMissionStreak`/`advanceMissionStreak`/`resetMissionStreak` (key `cod-mission-streak-v1`); `loadTopGhosts(mode, difficulty)` (key `cod-top-ghosts-v1`, async with Supabase + localStorage cache).
- `src/utils/runBrain.js` — `getDifficultyBriefing(difficulty, runHistory)` + `mostFrequentKiller(runHistory)`.
- `src/utils/runCoach.js` — `buildRunCoach()` now computes `crossRunTip` from `mostFrequentKiller()`; return value includes `crossRunTip`.
- `src/systems/runSession.js` — `createRunHistoryEntry` now accepts `killedByType`/`killedByName` params.
- `src/utils/runSubmission.js` — `buildSessionSubmission()` accepts `commandTrace`, extracts `traceDigest`/`traceLength`.
- `src/systems/gameStep.js` — NEW: `computeMovementVector` + `applyPlayerMovement`; pure functions extracted from App.jsx movement logic.
- `src/systems/gameStep.test.js` — NEW: 11 tests covering zero input, diagonal normalization, cardinal movement, joystick, boundary clamping, speed multipliers, and obstacle push-out.
- `src/App.launch.test.jsx` — storage mock extended with `getMissionStreak`, `advanceMissionStreak`, `loadTopGhosts`, `saveStudioGameEvent`, `recordDeathByEnemy`, `loadRivalryHistory`.
- Validation truth — `npm test` 347/347; lint clean; build passing. Commit `22d079d` on `feat-standalone-domain`.

## 2026-05-17 — Session 66 changes

- `src/utils/replayCommandTrace.js` — new pure utility for compact replay-input evidence. It normalizes command events into 6-frame buckets, caps traces at 240 events by default, serializes to a compact body, validates an FNV-style digest, decodes trace bodies, and summarizes action counts/frame span.
- Replay trust truth — this does not complete deterministic server resimulation by itself. It creates the missing client-side artifact that can be bound into a later run-token / `validate-replay` contract.
- `src/utils/replayCommandTrace.test.js` — 4 tests cover deterministic ordering/bucketing, encode/decode round-trip, tamper detection, and event cap behavior.
- `scripts/launch-readiness.mjs` — `--json` now emits structured `status`, `checks`, `ownerOnlyGates`, and `summary`; default text output remains unchanged. Current JSON status is `ready_missing_optional_analytics` because launch PNG assets are present but PostHog/Sentry keys are still missing.
- `scripts/closeout-autopilot.mjs` — `--help` / `-h` now prints usage and exits before any doctor, status, git, lock, or prompt work.
- Validation truth — targeted trace tests passed 4/4; full `npm test` passed 336/336; lint clean; build passing.

## 2026-05-17 — Session 64 changes

- `src/components/HomeV2.jsx` — now accepts `setStarterLoadout` and applies decoded replay starter loadouts in both `?replay=` URL bootstrap and pasted replay-code load paths.
- Replay truth — `src/utils/replayCode.js` already encoded `starterLoadout`; this session closes the launcher hydration gap so starter loadout is no longer inert payload data on HomeV2.
- `src/components/HomeV2.test.jsx` — adds component-level replay URL hydration coverage for difficulty, daily mode, starter loadout, and seed input state. DemoCanvas is mocked in this test file to avoid jsdom canvas noise.
- `docs/AUDIT_2026-05-17.md` / `docs/IMPLEMENT_PLAN.md` — current audit and execution artifacts for the focused replay fidelity sprint.
- Validation truth — focused HomeV2/replayCode tests passed 8/8, full `npm test` passed 332/332, lint clean, and build passing.

## 2026-05-14 — Session 63 changes

- `src/App.jsx` — `statsRef.current.bestPrecisionStreak` is initialized and reset per run, then updated when a non-boss precision hit increments `gs.precisionStreak`. This is telemetry/coaching state only; precision coin rewards remain the Session 62 behavior.
- `src/components/DeathScreen.jsx` — receives `starterLoadout` and `bestPrecisionStreak` from App.jsx. SHARE RUN now encodes the actual starter loadout in the replay code. AI RUN COACH can render a precision coaching line when applicable.
- `src/utils/runCoach.js` — now returns a `precisionTip` field. It emits mastery guidance for `bestPrecisionStreak >= 5`, a gap hint for high-kill/low-precision runs, and `null` when no precision advice applies.
- `src/utils/runBrain.js` — accepts `latestRun` and records `precisionStreak`; strong precision chains can drive the next-experiment recommendation. This remains zero-token/local-first.
- `src/utils/replayCode.test.js`, `src/utils/runCoach.test.js`, and `src/utils/runBrain.test.js` — regression coverage now includes non-standard starter replay fidelity and precision coaching paths.
- `README.md` — public live/deploy documentation now matches the canonical `.wtf` + Cloudflare Pages hosting state.
- `scripts/post-cutover-smoke.mjs` / `package.json` — new smoke command validates apex and Pages shell/manifest plus redirects from `www` and backup domains to `https://callofdoodie.wtf/`.
- Validation truth — full test suite passed 331/331, lint clean, build passing, and live post-cutover smoke passed 5/5 after network permission.

## 2026-05-14 — Session 62 changes

- `src/systems/combatResolution.js` — now exports `isPrecisionHit(bullet, enemy)`. Hit detection checks squared distance against `(size/2 * 0.35)²`. Returns false for null inputs and zero-size enemies.
- `src/App.jsx` — `gs.precisionStreak` is new gs state initialized to 0 in `initGame()`. Precision streak logic is wired into the bullet-enemy collision block. `getMusicBPM` and `getMusicBeat` are now imported from `sounds.js`; beat-sync spawn particle burst is additive-only (no spawn rate changes).
- `src/utils/runCoach.js` — `buildWeaponTip()` now exists as a named export-adjacent helper. The module returns a 5-field object (`killedBy`, `tryNext`, `working`, `weaponTip`, `brain`). `weaponTip` is `null` when no actionable advice applies (zero kills, single weapon, no pattern detected).
- `src/components/DeathScreen.jsx` — SHARE RUN button only renders when `runSeed > 0`. Uses `encodeReplayCode` from `replayCode.js` (pre-existing import). `weaponTip` is rendered conditionally in AI RUN COACH section.
- `src/components/HomeV2.jsx` — `?replay=` URL param is handled in the same `useEffect` as the existing `?seed=` handler. Mutually exclusive: if `?replay=` is present and valid, the `?seed=` branch is skipped.
- `src/sounds.js` — `getMusicBPM()` reads `_BPM[vibe]` where `vibe` is `"boss"` when `_musicBoss` is set, otherwise falls back to `_musicVibe || "action"`. `getMusicBeat()` returns the `_musicBeat` counter. Both are safe to call before audio is initialized (return 108 and 0 respectively).
- Test truth — `runCoach.test.js` line 21 was changed from "killed you" to "ended" (matching the actual string the function now emits). Line 41-44 was changed to test only zero-kills cases for null `weaponTip` (a single-weapon dominant run correctly returns a non-null tip).
- Combat truth — `isPrecisionHit` is caller-aware: the call site in App.jsx guards `!e.isBossEnemy` so boss enemies never contribute to precision streak. The function itself is agnostic to boss status.

## 2026-05-14 — Session 61 changes

- `scripts/verify-plan-mode.mjs` — now reads the session lock `agent:` value and treats non-`claude-code` sessions as `planModeDetected: not_required`, preventing Codex sessions from failing on a Claude-only runtime slash-command requirement.
- `context/PROJECT_STATUS.json` — `planModeDetected` and current session metadata now reflect the Codex-specific not-required status and Session 61 closeout state.
- `functions/_middleware.js` — new Cloudflare Pages middleware source-of-truth for canonical redirects from `www.callofdoodie.wtf`, `playcallofdoodie.com`, and `www.playcallofdoodie.com` to `https://callofdoodie.wtf/`.
- `scripts/cloudflare-domain-cutover.mjs` — now loads the same private Studio Ops Cloudflare secret paths as the platform cutover helper. Rulesets API access was still unauthorized; middleware is therefore the active redirect mechanism.
- Live domain state — apex `https://callofdoodie.wtf/` serves 200 and the three alternate hosts return 301 to the apex after the Pages middleware deployment.
- `src/systems/combatResolution.js` and `src/App.jsx` — enemy projectile/player damage and grenade explosion damage now delegate through pure combat helpers. Contact-hit helper logic exists and is covered by tests, but not every contact path is wired out of `App.jsx` yet.
- `validate-replay` truth — deterministic resim remains blocked by the contract shape. `inputHash` is not reversible into replay inputs; a compact timeline/command trace or signed event digest is needed before server resimulation can be real.
- Cross-repo truth — old-path redirect changes were committed and pushed to sibling repo `VaultSparkStudios.github.io` as `a6515ae`. This repo can claim the sibling patch is published to GitHub; production availability should still be verified after the website deployment completes.

## 2026-05-14 — Session 60 changes

- `scripts/platform-domain-cutover.mjs` — promoted from partial platform helper to full custom-domain repair helper: loads private studio-access token, uses separate zone-create/DNS tokens, creates/verifies zones, updates Namecheap nameservers, attaches Pages domains, creates/updates Cloudflare DNS CNAMEs, and removes conflicting A/AAAA records for web hosts.
- Cloudflare/Namecheap live state — `callofdoodie.wtf` and `playcallofdoodie.com` are delegated to Cloudflare nameservers; apex `callofdoodie.wtf` serves the Cloudflare Pages app and passed live-site verification.
- `context/PROJECT_STATUS.json` — current focus, next milestone, blockers, and `testingSurfaces` now reflect the completed apex cutover and remaining post-cutover tasks.
- `context/STUDIO_MANIFEST.json` and `context/runtime-pack/RUNTIME_PACK.json` — production `liveUrl` now points at `https://callofdoodie.wtf/`; backup and Pages preview surfaces are listed for downstream website/portfolio agents.
- `docs/STARTUP_BRIEF.md` — WHERE TO TEST now surfaces the canonical domain, backup `.com`, Pages preview, and live-site check command.
- `docs/DOMAIN_MIGRATION_PLAN.md` — status updated from blocked/in-progress to apex-live with redirects/allowlists remaining.
- Security truth — broad Cloudflare studio-access token was used to complete the cutover; least-privilege rotation is now an explicit follow-up.
- No gameplay source-of-truth changed this session. Remaining contradiction risk is operational only: `www.callofdoodie.wtf` was still pending/522 while apex passed.

## 2026-05-13 — Session 59 changes

- `vite.config.js` — deployment base path is now controlled by `VITE_BASE_PATH`. Cloudflare Pages uses `/`; the manual GitHub Pages fallback uses `/call-of-doodie/`.
- `.github/workflows/deploy-cloudflare.yml` — new canonical deployment workflow for Cloudflare Pages. `.github/workflows/deploy.yml` is no longer automatic on push and remains a manual fallback.
- `index.html`, `public/manifest.json`, `public/og-image.svg`, `public/launch-assets/launch-combat.svg`, `docs/LAUNCH_EXECUTION.md`, `src/components/DeathScreen.jsx`, and `src/components/MenuScreen.jsx` — canonical public URL now points at `https://callofdoodie.wtf/`.
- `src/config/site.js` and `src/utils/challengeLinks.js` — canonical share URL is centralized. `challengeLinks` still accepts explicit `baseUrl` for tests or future overrides.
- `public/register-sw.js` and `public/sw.js` — service worker registration/cache scope is derived at runtime; this prevents root-domain and fallback-subpath builds from diverging. Cache version is `cod-v5`.
- `public/_headers` — Cloudflare Pages security headers/CSP now live with the static bundle. Legacy `cloudflare/vaultspark-security-headers.js` remains only for the old `vaultsparkstudios.com` route.
- `scripts/cloudflare-domain-cutover.mjs` and `scripts/platform-domain-cutover.mjs` — new deployment automation. They are operational helpers, not secret stores; they read credentials from environment/private ops files and do not print secrets.
- `docs/DOMAIN_MIGRATION_PLAN.md` and `docs/DOMAIN_CUTOVER_RUNBOOK.md` — source-of-truth migration procedure updated. Custom domain activation remains blocked until Cloudflare zones exist.
- `supabase/functions/submit-score/index.ts`, `src/supabase.js`, `src/utils/supporter.js`, and `docs/AUTH_INTEGRATION_PLAN.md` — auth audit confirmed no contradiction: Studio membership hooks exist server-side, but no public sign-in UI is implemented.

## 2026-05-11 — Session 58 changes

- `src/systems/combatResolution.js` (+test) — promoted from geometry scaffold to deterministic combat-math helper module. It now owns bullet/enemy overlap, crit rolls, juggernaut shield-facing multiplier, lightning-chain target selection, pierce decrement, and obstacle-bounce resolution. `App.jsx` still owns React refs, particles, and mutable game-state orchestration.
- `src/systems/objectiveDirector.js` (+test) — adds objective-chain stat derivation and per-objective result recording. These stats drive achievements only; active objective lifecycle remains the existing `gs.activeObjective` path.
- `src/constants.js` / `src/constants.test.js` — achievement source of truth grows from 61 to 65 with objective mastery achievements: hot-zone hat trick, 5 bounties, perfect escort, and clutch lockdown.
- `src/utils/runBrain.js` (+test) — new local, zero-token derivation surface for post-run guidance. It reads run history, Studio events, and current death pressure; it does not write authoritative game state.
- `src/utils/runCoach.js` (+test) and `src/components/DeathScreen.jsx` — Run Coach now includes Run Brain context; DeathScreen renders a next-experiment/follow-through cue beside the existing debrief.
- `src/utils/socialRetention.js` (+test), `src/components/MenuPanels.jsx`, and `src/components/HomeV2.jsx` — Run History now derives fixed-seed bounty cards from existing run/daily/rivalry data; HomeV2 passes the daily champion into that panel.
- `src/components/HomeV2.jsx` — first-three-run onboarding arc added on the front door. It is presentational guidance only; mode/loadout/gameplay source-of-truth remains unchanged.
- `src/drawGame.js` — Heat Meter now has a visual treatment in addition to the existing music/HUD behavior. Reduced-motion guard remains authoritative.
- `supabase/functions/validate-replay/index.ts` — replay validation now reports confidence (`heuristic`, `replay_contract`, `quarantine`) and warns when competitive seeded submissions omit `inputHash`. This is still not full deterministic resimulation; Phase 2B remains open.
- `src/App.jsx` — legacy `MenuScreen` is lazy-loaded. HomeV2 remains the default front door; `?home=v1` still functions as a fallback.

## 2026-05-09 — Session 57 changes

- `src/systems/heatMeter.js` (+test) — new source-of-truth for `gs.heat`. Replaces the combo-count branch in `App.jsx` for music tier selection (combo still drives score multiplier + on-screen text).
- `src/systems/scoreLedger.js` (+test) — new source-of-truth for kill-point composition. Both kill sites in `App.jsx` now delegate to `computeKillPoints()`.
- `src/systems/objectiveDirector.js` (+test) — new source-of-truth for active dynamic objective lifecycle (pick + tick + lifecycle resolution). `gs.activeObjective` is the canonical run-time field.
- `src/systems/combatResolution.js` — scaffold only; ships `pointInCircle` + `dist2`. Full bullet-vs-enemy resolver still owned by `App.jsx` (deferred to S58 — a multi-session extraction because of React-ref tangling).
- `src/utils/runCoach.js` (+test) — new derivation surface composing `metaClarity` + `runDebrief` + recent-deaths-by-enemy ledger. Pure derivation; not a source-of-truth itself.
- `src/utils/replayCode.js` (+test) — new portable encoding for shareable run conditions. The 12-char hex code with mod-16 checksum is the canonical share format; URL params remain the in-game challenge format (used by LeaderboardPanel "copy challenge" button).
- `src/utils/cosmeticTrack.js` (+test) — new source-of-truth for cosmetic ownership. Reads `cod-supporter-v1` localStorage (existing flag) + career stats; writes `cod-cosmetic-track-v1` localStorage. Cosmetic-only — never affects gameplay state.
- `src/storage.js` — adds `getDailyChampion()` (top of today's daily-challenge leaderboard, derived); adds `recordDeathByEnemy(typeId)` + `getTelegraphMultiplier(typeId)` (rolling 20-death window stored on `cod-career-v1` under `recentDeathsByEnemy`).
- `src/settings.js` — adds `hudDensity` setting + `hudFlags(density)` exporter. The flag becomes a derived view on the canonical `cod-settings-v1` key — no new storage key.
- `supabase/functions/validate-replay/index.ts` — new Edge Function. Heuristic-only Phase 1; logs anomalies to existing `run_anomalies` table. Phase 2 (deterministic resim) deferred until combat extraction lands.

## 2026-04-22 — Session 54 changes

- `src/systems/runSession.js` + `src/systems/runSession.test.js` added: run-start artifact creation, run-history entry shaping, death-event generation, and score-submit event generation now live in a dedicated runtime helper module
- `src/App.jsx` updated: run lifecycle bookkeeping delegates to `runSession.js`; source-of-truth behavior is unchanged, but another orchestration branch is now outside the main component
- `src/utils/challengeLinks.js` + `src/utils/challengeLinks.test.js` added: seeded challenge/replay URLs now come from one canonical builder/copy helper
- `src/components/DeathScreen.jsx` updated: challenge-link copy path now uses the canonical helper instead of hand-built querystring logic
- `src/components/MenuPanels.jsx` updated: Run History exposes direct replay/rematch/copy-link actions for rivalry rows, featured seeds, ghost-board cards, and seeded run-history entries
- `src/components/HomeV2.jsx` updated: measurement readiness (`PostHog` key status + local Studio-event sync state) is visible on the front door, and Run History can launch seeded replays back into the deploy flow
- `scripts/generate-launch-assets.mjs` added: existing SVG launch stills can now be exported to PNG; `public/launch-assets/*.png` added as generated, source-controlled outputs
- `scripts/launch-readiness.mjs` added: launch readiness now reports raster asset coverage plus telemetry-key presence without exposing sensitive values
- `docs/LAUNCH_EXECUTION.md`, `context/TASK_BOARD.md`, `context/CURRENT_STATE.md`, `context/LATEST_HANDOFF.md`, `logs/WORK_LOG.md`, and `context/SELF_IMPROVEMENT_LOOP.md` updated for Session 54 closeout state
- No contradictions introduced. Source-of-truth hierarchy unchanged — launch readiness remains advisory, and replay/challenge links remain a client-side convenience layer over existing seeded-run behavior.

## 2026-04-22 — Session 53 changes

- `src/storage.js` updated: local Studio events are now normalized with `clientEventId`, sync status, retry metadata, and an opportunistic `syncStudioGameEvents()` / `requestStudioEventSync()` path
- `supabase/functions/sync-studio-events/index.ts` added: browser-local Studio events can now be mirrored server-side through idempotent upserts on `client_event_id`
- `supabase/migrations/2026-04-22_studio_game_events.sql` added: new `studio_game_events` mirror table with dedupe key, created/received timestamps, and RLS locked to no public reads
- `src/components/HomeV2.jsx`, `src/components/MenuScreen.jsx`, and `src/components/DeathScreen.jsx` updated: front-door and debrief surfaces now opportunistically trigger Studio event sync without changing the local-first UX contract
- `src/utils/studioEventOps.js` + `src/components/MenuPanels.jsx` updated: Run History trust ops now exposes sync-health counts (`synced`, `queued`, `retry`) in addition to trust and telemetry counts
- `src/App.jsx` updated: the remaining Roast Director runtime hooks (`wave_clear`, `perk_chosen`, `coin_milestone`, `death`) now fire in live gameplay; the prior note that some roast hooks were still unwired is no longer accurate
- `src/systems/pickupSpawning.test.js` updated: stale local variable removed, clearing the previous lint warning
- `index.html`, `public/register-sw.js`, and `src/components/HomeV2.jsx` updated: build-side warnings for the legacy service-worker script path and ineffective `HUD.jsx` prefetch are resolved
- `context/TASK_BOARD.md`, `context/CURRENT_STATE.md`, `context/PROJECT_STATUS.json`, and agent memory updated to reflect Session 53 closeout state
- No contradictions introduced. Source-of-truth hierarchy unchanged — gameplay/trust surfaces still read from the local event queue first, and the new mirror path is additive rather than authoritative.

## 2026-04-22 — Session 52 changes

- `src/utils/socialRetention.js` + `src/utils/socialRetention.test.js` added: weekly contracts, rivalry summaries, featured seed cards, and ghost-board summaries now live in a pure utility module
- `src/utils/studioEventOps.js` + `src/utils/studioEventOps.test.js` added: local Studio event summaries now produce trust-op counts, rejection summaries, and telemetry guidance
- `src/systems/bossWaveFlow.js` + `src/systems/bossWaveFlow.test.js` added: boss preview/spawn planning extracted from `src/App.jsx` into a pure planner covering developer boss, dual-boss thresholds, preview-card metadata, and warning text
- `src/utils/runIntelligence.js` updated: Studio event contract upgraded to `contractVersion: 2`; telemetry event types added for `perk_choice`, `route_choice`, `mode_abandon`, `first_death_wave`, and `weekly_contract_progress`
- `src/App.jsx` updated: local Studio events now persist score-submit results/rejections, perk picks, route picks, weekly-contract progress, first-death wave, and pause-menu abandonments; boss-wave preview/spawn branch now delegates to `createBossWavePlan()`
- `src/components/MenuPanels.jsx` updated: Run History now surfaces weekly-contract progress, rivalry streaks, featured seeds, ghost-board summaries, trust-op counts, rejection summaries, and telemetry counts using the new utility modules
- `src/storage.js` updated: local Studio event retention window expanded from 50 → 100 records to support the richer trust/telemetry history
- `context/TASK_BOARD.md` updated: social retention, social rivalry loop, telemetry/balance loop, security/trust ops surface, Studio Hub event contract, and App extraction slice 9 marked complete; human/data-gated Lighthouse + funnel items explicitly reclassified
- `context/PROJECT_STATUS.json` updated: session fields and current focus/next milestone now reflect Session 52
- No contradictions introduced. Source-of-truth hierarchy unchanged — all new modules are additive pure utilities or pure planners, and the local Studio event schema remains browser-local only.

## 2026-04-21 — Session 51 changes

- `src/utils/metaClarity.js` added — `identifyWeakness(career)` + `getRecommendedMetaUpgrade()` + `getMetaRecommendationLabel()`; career-weakness-targeted META_TREE upgrade recs; 13 tests
- `src/utils/routeForecast.js` added — `getRouteForecast(route, gs)` + `getRouteForecastOneliner()`; context-aware next-wave descriptions (headline + tradeoff + tip); 12 tests
- `src/systems/pickupSpawning.js` added — `spawnPickup()` + `getPickupWeights()` pure fns extracted from App.jsx; ammoDropMult param supported; 11 tests; App.jsx wrapper collapses to 3 lines
- `src/utils/roastDirector.js` added — `getRoastCallout(event, cooldowns, currentWave, cooldownWaves)` with 10 event pools, per-event wave-based rate limiting; 12 tests
- `src/utils/shopForecast.js` added — `getShopAdvisory(option, gs, wpnIdx)` + `getAdvisoryColor(urgency)` returning urgency-rated advisories per item type; 17 tests
- `src/utils/menuGuidance.js` extended — `buildFrontDoorActionStack` now accepts `unlocked`, `meta`, `career` params and enriches best_next_upgrade with `metaRec` + `detail` + `whyNow`; 2 new tests
- `src/components/HomeV2.jsx` extended — passes `unlocked`, `meta`, `career` to `buildFrontDoorActionStack`
- `src/components/MenuScreen.jsx` extended — passes `unlocked`, `meta`, `career` to `buildFrontDoorActionStack`
- `src/components/RouteSelectModal.jsx` extended — accepts `gs` prop; renders route forecast panel on hover
- `src/components/WaveShopModal.jsx` extended — accepts `gs` prop; renders shop advisory on hover/focus per item; coin shop rows also advisory-annotated
- `src/App.jsx` extended — imports `spawnPickup` from pickupSpawning.js, `getRoastCallout` from roastDirector.js; adds `roastCooldowns` ref; roast fires at boss_kill (cooldown 3) and kill_streak (cooldown 2); passes `gs` to WaveShopModal
- Test backfill committed: `src/systems/mutationResolution.test.js` (8), `src/systems/shopOptions.test.js` (8), `src/utils/perkOptions.test.js` (6), `src/utils/routeOptions.test.js` (5) — written session 50, committed session 51
- `context/PROJECT_STATUS.json` updated: `silSession` 49 → 51, `silScore` 936 → 948, `silVelocity` 2 → 6, `currentSession` 49 → 51, per-category scores updated
- No contradictions introduced. Source-of-truth hierarchy unchanged — all new modules are pure utilities with no novel storage keys.

## 2026-04-21 — Session 49 changes

- `src/components/MenuPanels.jsx` added — new shared source-of-truth for nine menu panels (Rules, Controls, MostWanted, RunHistory, LoadoutBuilder, CareerStats, Missions, Upgrades, NewFeatures). HomeV2 is the only current consumer; MenuScreen still owns its own inline copies (follow-up to dedupe later).
- `src/components/HomeV2.jsx` updated: lazy imports for the nine new panels, nine new `show*` state toggles, new ⚙ COMMAND CENTER chip row, `isMobile` prop now threaded through, Codex tab state key renamed `bestiary` → `mostwanted`, button label changed Bestiary → MOST WANTED.
- No contradictions introduced. Source-of-truth hierarchy unchanged — MenuPanels.jsx is purely additive and matches MenuScreen's existing storage helpers exactly (`loadCustomLoadouts`, `saveCustomLoadout`, `purchaseMetaUpgrade`, `prestigeAccount`, `saveMetaProgress`).
- `context/PROJECT_STATUS.json` updated: `silSession` 48 → 49, `silScore` 936 → 942, `silVelocity` 5 → 2, `currentSession` 48 → 49, `truthAuditLastRun` 2026-04-17 → 2026-04-21, new per-category scores reflect refined rubric values, `currentFocus` + `nextMilestone` rewritten for session 49.

## 2026-05-27 — Session 76 control diagnostics

- `docs/AUDIT_2026-05-27.md` / `.json` are the current ranked audit and execution record for the input diagnostics slice.
- `src/systems/gameStep.js` owns the pure pointer-to-canvas aim projection helper now used by `src/App.jsx`; `src/systems/gameStep.test.js` covers cardinal and diagonal aim vectors.
- `src/App.jsx` exposes `?debug=input` / `cod-debug-input=1` diagnostics only as a hidden QA surface and does not change normal-player UI.
- `src/components/HomeV2.jsx` includes first-run calibration guidance and shows the diagnostics shortcut only when debug input mode is enabled.
- No source-of-truth contradictions introduced. The remaining pointer follow-up is specifically a browser-level Playwright sweep, not the underlying aim math contract.

## 2026-04-17 — Session 47 changes

- `src/utils/runIntelligence.js` + tests added: shared run-intelligence utility now owns menu focus selection, post-run diagnosis, rivalry prompts, compact event digests, Studio event shape, and rule-based callouts.
- `src/components/MenuScreen.jsx` updated: loads run/rivalry history, shows run-intelligence guidance, saves local Studio events, and tracks intelligence focus with front-door actions.
- `src/components/DeathScreen.jsx` updated: shows post-run intelligence, saves debrief Studio events, records local rivalry results, and submits v2 event digests.
- `src/storage.js` + tests updated: local Studio event queue and rivalry history persistence added.
- `src/utils/runSubmission.js` + tests updated: `buildSessionSubmission` now owns digest-aware leaderboard payload shaping.
- `src/App.jsx` updated: uses `buildSessionSubmission` and lazy-loads `DeathScreen` into a separate production chunk.
- `supabase/functions/submit-score/index.ts` updated: accepts v1/v2 digests and validates v2 timeline bands before leaderboard insert.
- `scripts/ops.mjs`, `scripts/render-startup-brief.mjs`, and `scripts/validate-brief-format.mjs` updated/added so local startup/action queue/brief validation commands exist.
- Source-of-truth hierarchy unchanged. No contradictions introduced.

## 2026-04-14 — Session 43 changes

- `src/systems/waveDirector.js` + `src/systems/waveDirector.test.js` added: four-phase non-boss pacing planner with event selection, alive-budget-aware cadence, and telegraphed elite surges
- `src/App.jsx` updated: wave progression now consumes director state for pacing, preview-card hints, event selection, and stage announcements
- `src/gameHelpers.js` updated: elite application logic extracted into shared helpers so wave-director surges reuse the existing enemy-mutation model cleanly
- `prompts/start.md` and `prompts/closeout.md` synced to Studio OS `v3.1`, then adapted so command references remain executable in this repo
- `START_PROMPT.template.md` + `CLOSEOUT_PROMPT.template.md` added: template-alignment checks now have local files to compare against
- `scripts/detect-session-mode.mjs`, `scripts/check-secrets.mjs`, `scripts/lib/secrets.mjs`, `scripts/ops.mjs`, and `scripts/closeout-autopilot.mjs` added: local protocol scaffolding for mode detection, secrets discovery, and closeout automation
- `context/CURRENT_STATE.md`, `context/TASK_BOARD.md`, `context/LATEST_HANDOFF.md`, `context/SELF_IMPROVEMENT_LOOP.md`, `logs/WORK_LOG.md`, and `context/DECISIONS.md` updated to reflect the shipped pacing slice and protocol sync
- No contradictions introduced. Source-of-truth hierarchy unchanged.

## 2026-04-14 — Session 42 changes

- `docs/IMPROVEMENT_PLAN.md` added: ranked roadmap for trust, UX, build depth, pacing, performance, and architecture
- `context/CURRENT_STATE.md`, `context/TASK_BOARD.md`, `context/LATEST_HANDOFF.md`, `context/MEMORY_INDEX.md` updated to reflect the Session 42 roadmap and shipped slice
- `audits/2026-04-14.json`, `context/STATE_VECTOR.json`, `context/GENOME_HISTORY.json`, and `docs/GENOME_HISTORY.md` generated during closeout
- `supabase/functions/submit-score/index.ts` updated: plausibility validation added for score submission; claimed-callsign check now compares against resolved `uid`
- `src/utils/runDebrief.js` + `src/utils/runDebrief.test.js` added: reusable run debrief logic and coverage
- `src/components/DeathScreen.jsx` updated: tactical debrief added
- `src/utils/buildArchetypes.js` + `src/utils/buildArchetypes.test.js` added: archetype/capstone model and coverage
- `src/App.jsx` updated: archetype capstone unlocks wired into perk flow and HUD/modals now receive build context
- `src/components/HUD.jsx`, `PerkModal.jsx`, `WaveShopModal.jsx`, `RouteSelectModal.jsx` updated: build-fit guidance surfaced to players
- `ignis/output/predictions.json` and `ignis/output/score-history.json` refreshed during IGNIS re-score
- `prompts/start.md` + `prompts/closeout.md` updated in worktree: template sync paths now reference the sibling `vaultspark-studio-ops` repo
- No contradictions introduced. Source-of-truth hierarchy unchanged.

## 2026-04-13 — Session 41 changes

- `context/PROJECT_STATUS.json` updated: currentFocus, nextMilestone, silSession, silScore, silAvg3, silVelocity, silLastSession, currentSession
- `public/manifest.json` updated: PNG icon entries (192/512 any + 512 maskable) added alongside the existing SVG fallback
- `public/icon-192.png` + `public/icon-512.png` added as generated artefacts (regenerable via `npm run icons:generate`)
- `scripts/generate-icons.mjs` added: build-time sharp-based SVG→PNG converter
- `index.html` updated: PNG icon + apple-touch-icon links added
- `public/sw.js` updated: cache version bumped to cod-v4 and PNG icons added to SHELL_ASSETS
- `package.json` updated: `prebuild` hook, `icons:generate` script, sharp devDependency
- `supabase/functions/kofi-webhook/index.ts` added: new Edge Function
- `supabase/migrations/2026-04-14_kofi_webhook.sql` added: new `kofi_events` audit table
- `.github/workflows/deploy-supabase-function.yml` updated: now also deploys the kofi-webhook function
- `supabase/functions/README.md` updated: kofi-webhook deploy instructions
- `vite.config.js` updated: testTimeout raised to 15000 for CI stability
- No contradictions introduced. Source-of-truth hierarchy unchanged.

## 2026-04-13 — Session 40 changes

- `context/PROJECT_STATUS.json` updated: currentFocus, nextMilestone, truthAuditLastRun, silSession, silScore, silVelocity, silDebt
- `public/manifest.json` updated: screenshots array populated (was empty)
- `index.html` updated: apple-mobile-web-app-title added
- `.github/workflows/deploy.yml` updated: VITE_POSTHOG_KEY + VITE_SENTRY_DSN build env vars added
- `src/gameHelpers.test.js` added: 26 new tests, all passing
- All context files (CURRENT_STATE, TASK_BOARD, LATEST_HANDOFF, WORK_LOG, SIL) updated to reflect session 40 state
- No contradictions introduced. Source-of-truth hierarchy unchanged.

## 2026-05-17 — Session 65 verification closeout

- `docs/AUDIT_2026-05-17.md` and `docs/IMPLEMENT_PLAN.md` were checked against source evidence instead of accepted as proxy completion signals.
- `src/components/HomeV2.jsx` contains both replay starter hydration paths: `?replay=` URL bootstrap and pasted replay-code load.
- `src/components/HomeV2.test.jsx` contains the component regression for replay URL hydration, including seed input, daily mode, difficulty, and starter loadout setter coverage.
- Verification evidence is current: focused HomeV2 test passed, `npm run lint` clean, `npm run launch:smoke` passed, full `npm test` passed 332/332, and `npm run build` passed.
- No source-of-truth contradictions introduced. Remaining replay-validation work is still correctly blocked on a command trace / replay input contract rather than `inputHash` alone.

## 2026-05-26 — Session 75 control/account repair

- `src/utils/gamepad.js` is now the source of truth for controller detection, active-pad selection, stick/button normalization, and Xbox/PlayStation copy mapping.
- `src/App.jsx` now treats keyboard/touch movement and controller movement as separate inputs before merging them in the frame loop.
- `src/sounds.js` remains procedural WebAudio; no external sound files, paid generation, or dependency changes were introduced.
- `context/OBELISK_ADOPTION.md` declares this repo's Obelisk posture as phase-0-declared and narrows Obelisk's role to signed trust receipts/future passkeys around Supabase Auth.
- `docs/AUDIT_2026-05-26.md` and `.json` are the current ranked audit for control repair, scrollability, sound variety, onboarding, account bridge, and remaining QA automation.
- No source-of-truth contradictions introduced. Real-device controller QA and account implementation remain future work, not shipped claims.

## 2026-06-12 - Session 86

- `src/sounds.js` is the sole source of truth for all procedural audio; three new exports added: `soundLastStand()`, `soundHeartbeatPulse()`, `soundBossFinale()` — all pure WebAudio synthesis, no external assets.
- `gs.lastStandActive` is the canonical flag for last-stand state; `drawGame.js` reads it for the red vignette; `setDangerIntensity()` in `App.jsx` reads `_isLastStand` directly from the same HP check.
- `gs.careerBest.wave` is set at `startGame()` from `loadCareerStats()` (line 538 in App.jsx); the HUD PACE chip reads it as a prop — no new storage reads at render time.
- Phantom elite type (`e.eliteType === "phantom"`) is the fifth elite variant; `drawGame.js` is the sole renderer for globalAlpha toggling and purple ring; App.jsx is the sole spawner and timer ticker.
- `comboRef.current.count` at both kill sites (boss + regular) now passes combo to `soundEnemyDeathAt` and milestone text — both sites were confirmed unique and separately edited.
- `loadWeeklyTopGhost()` in `src/storage.js` is the source of truth for the 7-day leaderboard rival and its 1h `sessionStorage` cache; `App.jsx` loads it at run start and `HUD.jsx` renders the WEEKLY RIVAL chip.
- Death recap mini-replay uses the existing `ghostData` path samples only; `DeathScreen.jsx` owns the requestAnimationFrame replay loop and restart button, with no new storage format.
- `src/utils/replayResim.js` is the browser-side replay resim utility for trace-body summaries; `supabase/functions/validate-replay/index.ts` owns the matching Phase 2B Edge Function drift check and rejects rich traces above 2% drift.
- No source-of-truth contradictions introduced. Validation: 429/429 tests, 0 lint errors, build clean.

## 2026-06-12 - Session 86 follow-on

- `docs/AUDIT_2026-06-12_2.md` / `.json` are the source of truth for the follow-on replay-trust honesty sprint; all three items are marked shipped with execution logs.
- `src/utils/replayResim.js` and `supabase/functions/validate-replay/index.ts` now explicitly identify the shipped gate as `heuristic_pressure_estimate` with advisory confidence, not a full deterministic frame simulation.
- `src/utils/ghostPath.js` owns final-path death readout classification; `DeathScreen.jsx` only renders the returned headline/detail under the existing ghost replay canvas.
- `src/utils/studioEventOps.js` owns live trust/readiness copy. Tests now guard against deterministic/resimulation wording returning to the pressure-estimate trust surface.
- No source-of-truth contradictions introduced. Validation: focused tests 15/15, `npm test` 432/432, lint clean, build clean.
## 2026-06-13 - Session 87 continuation 3

- `docs/AUDIT_2026-06-13_3.md` / `.json` are the source of truth for the follow-on boss phase-two readability slice; the single item is marked shipped with execution evidence.
- `src/systems/bossPhases.js` owns phase-two mechanics and now also owns the phase-two warning copy through `getBossPhaseTwoWarning()`.
- `triggerBossPhaseTwoTransition()` remains the only runtime phase-two transition path; it now emits both the PHASE 2 banner and the concrete counterplay warning.
- `src/systems/bossPhases.test.js` covers the known-boss warning map, unknown fallback, and the transition text emission.
- No source-of-truth contradictions introduced. Validation: focused bossPhases 4/4, full suite 444/444, lint 0 errors / 1 pre-existing warning, audit JSON parse clean, build clean.

## 2026-06-14 - Session 89

- `docs/AUDIT_2026-06-14.md` / `.json` are the source of truth for the replay proof receipt and pressure-profile trust sprint; all three items are marked shipped with execution evidence.
- `src/utils/replayCommandTrace.js` owns replay trace normalization, analysis, and the new player-facing `buildReplayProofReceipt()` conversion.
- `src/utils/runSubmission.js` is the source of truth for attaching trace metadata to leaderboard submissions; valid trace-backed submissions now include `traceReceipt`.
- `src/components/DeathScreen.jsx` owns the player-facing REPLAY PROOF card, while the receipt copy/scoring remains in the utility layer.
- `src/utils/replayResim.js` remains an advisory pressure-estimate utility, not deterministic resimulation; `buildReplayPressureProfile()` is the extracted pure profile primitive.
- No source-of-truth contradictions introduced. Validation: focused replay/submission 21/21, full suite 448/448, lint 0 errors / 8 existing warnings, build clean.

## 2026-06-14 - Session 92

- `docs/AUDIT_2026-06-14_4.md` / `.json` are the source of truth for the Run DNA payload, weekly contract progress, and replay pressure fixture sprint; all three items are marked shipped with execution evidence.
- `src/utils/runDnaShareCard.js` owns Run DNA share-card worker payload construction and community wave percentile calculation; `DeathScreen.jsx` coordinates the worker call only.
- `src/utils/socialRetention.js` owns weekly contract progress payload shaping; `DeathScreen.jsx` persists the resulting `weekly_contract_progress` event with a per-run de-dupe key.
- `src/utils/replayTraceFixtures.js` now owns both replay evidence and pressure-profile fixture expectations; `scripts/validate-replay-trace-fixtures.mjs` enforces those expectations.
- No source-of-truth contradictions introduced. Validation: focused utility tests 13/13, replay fixture validator 4/4, full suite 482/482, lint 0 errors / 7 existing warnings, build clean.
# 2026-06-18 — Visual Asset Pipeline Truth

- Source of truth for Call of Doodie visual asset provenance is now `assets/visual-assets.json`.
- Source-art and generation rules live in `assets/source/README.md`.
- Runtime pseudo-3D material primitives live in `src/utils/visualPrimitives.js`; `src/drawGame.js` consumes them.
- Launch media placeholder status is explicit: current SVG/PNG launch assets are tracked as `placeholder-export` until real gameplay screenshots replace them.
- Studio-wide propagation was not written directly to a sibling repo; it was queued as Ark `canon-update` cargo for `vaultspark-studio-ops`.

# 2026-06-18 — Session 98 Asset/Security/Build Truth

- `assets/source/signature-pack/` is the source package for the first Call of Doodie proprietary signature pack; runtime exports live in `public/visual-assets/`.
- `scripts/generate-proprietary-visual-assets.mjs` is the repeatable generator for the current signature pack; `npm run assets:generate` regenerates source SVGs and PNG exports.
- `src/utils/visualAssetLibrary.js` is the runtime registry for HomeV2/Codex signature asset cards; `assets/visual-assets.json` remains the provenance manifest source of truth.
- Dependency vulnerability truth now comes from the committed `package-lock.json` plus exact overrides in `package.json`; local `npm audit --json` reports 0 vulnerabilities and GitHub Dependabot marks all five previous alerts fixed.
- Build-size truth changed: Sentry and Supabase are now explicit Vite vendor chunks; the main application chunk is ~620 kB raw instead of ~804 kB raw.
- No contradictions introduced. Remaining visual truth gap: launch screenshots are still placeholder exports until a real capture pass replaces them.
## 2026-06-18 — Session 100 Truth Updates

- `scripts/compact-handoff.mjs` now has a direct `--smoke-unicode` path that exercises malformed handoff text through `callClaude()` without network. This supports the Session 99 claim that the startup Unicode failure is regression-covered, not merely fixed at the shared router layer.
- `src/obeliskRoutes.js`, `src/main.jsx`, and `src/obeliskRoutes.test.js` make the Obelisk route truth explicit: only `/login` and `/auth/callback` route away from gameplay. The repo still should not claim a complete account system because `/api/obelisk-verify` is not implemented here.
- `src/ObeliskCallback.jsx` stores a verified result only after the configured backend endpoint returns `ok`; it does not verify Obelisk tokens in the browser and does not embed secrets.

## 2026-06-18 — Session 101 Truth Updates

- `docs/AUDIT_2026-06-18_3.json` / `.md` are the source of truth for the Session 101 audit implementation sweep; all 12 candidates are marked `shipped` with execution evidence.
- `/api/obelisk-verify` is implemented as `functions/api/obelisk-verify.js`. It is server-side verification plumbing, not a gameplay gate, and it returns redacted receipts only.
- HomeV2 visitor-facing truth changed: measurement/analytics status is an ops-debug surface, not default public copy.
- Launch media truth changed: `public/launch-captures/real-combat.png` and `real-mobile-controls.png` are verified browser gameplay captures; `public/launch-assets/*` remains authored promotional fallback media.
- Local intelligence truth changed: Balance Lab and next-run drill are deterministic zero-token analyzers. They do not call paid model APIs or send player data externally.
- Architecture truth changed: `src/systems/deathFlow.js` owns DeathScreen prop composition. App still owns refs, state setters, and side-effect handlers.
- No contradictions introduced. Validation: full suite 540/540, build passing, release security gate with npm audit 0 vulnerabilities, launch media gate passing.

## 2026-06-18 — Session 102 Truth Updates

- `supabase/functions/submit-score/index.ts` truth changed: HMAC verification now uses `new Date(tokenRow.expires_at).toISOString()` — the raw DB column was a different string format from what `issue-run-token` signed, so all previous verification was silently failing.
- `public/sw.js` truth changed: navigation handler clone pattern is corrected. `cod-v5` cache was affected by the race; clients running the old SW may have had stale navigation responses. `cod-v6` clears the old cache on activate.
- No gameplay, storage schema, or analytics surfaces changed. No contradictions introduced.
- Validation: `npm test` 540/540, build passing.

## 2026-06-29 - Session 103

- Startup brief truth — `scripts/render-startup-brief.mjs` now normalizes raw genius-list output through `normalizeGeniusBlock()` and always renders HUMAN PRESSURE through `renderHumanPressureBlock()`. `node scripts/validate-brief-format.mjs docs/STARTUP_BRIEF.md` passes.
- Unicode transport truth — `scripts/lib/model-router.mjs` serializes model payloads through Unicode scalar sanitization, and `node scripts/compact-handoff.mjs --smoke-unicode` proves lone surrogate escapes do not reach payloads.
- Plan-mode truth — `scripts/verify-plan-mode.mjs --json` returns `not_required` for `agent: codex`; Codex sessions should not be told to run Claude Code `/model opusplan`.
- Windows-hide truth — `node scripts/check-windows-hide.mjs --json` reports `ok: true`, `count: 0`; `closeout-autopilot` no longer has a flagged shell spawn.
- Protocol drift truth — `npm run protocol:drift -- --json` reports 24/24 helpers present, including Windows-hide enforcement files.
- Innovation-pack truth — Supabase and analytics candidates remain credential-missing after explicit `check-secrets` probes; deterministic replay resim remains a future runner/storage milestone and current code honestly labels the shipped path as `heuristic_pressure_estimate` / `pressure-estimate-v1`.

Overall status: green locally for focused protocol gates; full suite/build pending closeout validation.
Last reviewed: 2026-06-29

## 2026-06-29 — Session 104 truth update

- DeathScreen coaching telemetry truth — `src/systems/deathFlow.js` now owns `buildDeathCoachTelemetry()`, and `src/components/DeathScreen.jsx` uses it for both `debrief_intelligence` local Studio events and PostHog `debrief_intelligence_view` payloads. Visible coaching surfaces now map to explicit flags: weapon tip, weapon mismatch, precision, cross-run pattern, enemy lab, and choke warning.
- Score-submit analytics truth — `src/systems/runSession.js` now owns `buildScoreSubmitAnalyticsPayload()`, and `App.submitScore` uses it for rejection, digest version, and trace-evidence level. Score-submit analytics no longer require reading the React side-effect block to verify payload semantics.
- Replay resim truth — `src/utils/replayResim.js` now exposes `buildDeterministicResimInputContract()` and `runResim().deterministicContract`. The existing replay gate remains honestly labeled `heuristic_pressure_estimate` / `pressure-estimate-v1`; no deterministic parity claim was introduced.
- Studio event truth — `buildStudioGameEvent("debrief_intelligence")` now preserves coaching flags, weapon mismatch copy, and choke-warning evidence instead of compacting those fields away.
- Deferred truth — Supabase deploy remains blocked by missing `supabase` capability; analytics production wiring remains blocked by missing `analytics` capability; launch screenshots still require verified browser capture. No fabricated data or report-only refresh was used to close those items.

Overall status: green locally; live Supabase/analytics/dashboard actions remain credential/provider gated.

## 2026-06-29 — Session 105 truth audit

- Replay trust language remains honest. `runResim()` still reports `method: "heuristic_pressure_estimate"` and `confidence: "advisory"`; the new `deterministicStepper` is explicitly `coverage: "movement_aim_only"` and is exposed only when the deterministic input contract is ready.
- Launch media truth improved without fabricating scenes. The manifest now uses verified browser-capture PNGs only for combat and mobile, because those files already exist with production-ready browser-capture provenance. Boss, build/debrief, and leaderboard entries remain SVG fallback art until verified captures exist.
- Game-loop review source truth repaired. `context/GAME_LOOP.md` now exists for the canonical protocol path and points to live runtime/post-run/trust code evidence.
- Doctor truth note: local `node scripts/ops.mjs doctor --update-json` is now present in the public repo router and proxies the Studio Ops doctor path; protocol drift validates local helper parity at 25/25.

## 2026-07-01 — Session 108 truth audit

- `docs/AUDIT_2026-07-01_2.json` / `.md` are the source of truth for this verification/deploy arc. They intentionally record no product-code change because the current genius list had no unblocked repo-executable product item beyond maintaining launch confidence.
- Release readiness truth: local gates passed (`npm run lint`, `npm test` 550/550, `npm run build`, replay state-stepper, edge replay fixtures, launch media), and live smoke passed (`live:site-check` 5/5, `post-cutover:smoke` 5/5).
- Cloudflare deploy truth: Wrangler is authenticated with Pages write permission. Final production deploy is the direct Cloudflare Pages deploy after the closeout commit lands on `main`.
- Deferred truth unchanged: Supabase/analytics/dashboard work requires credentials or provider surfaces; physical install/gamepad QA, Lighthouse/funnel analysis, and remaining screenshot replacement require real external evidence.

Overall status: green locally and green on current live surfaces; deploy observation pending final push/deploy.

## 2026-07-01 — Session 110 — PWA install QA receipt truth

- PWA readiness truth — `src/utils/pwaInstallReadiness.js` derives receipt states from explicit inputs: prompt-ready, standalone display, service-worker support, manifest presence, and optional stored browser prompt attempt.
- Prompt outcome truth — `src/App.jsx` persists only the real browser `beforeinstallprompt.userChoice.outcome`; unknown outcomes are normalized to `unknown`, accepted/dismissed are stored locally.
- Front-door truth — `src/components/HomeV2.jsx` renders `PWA PROMPT READY`, `PWA ACCEPTED`, `PWA DISMISSED`, `PWA READY`, or `PWA CHECK NEEDED` from the helper. It does not show `PWA INSTALLED` unless standalone display is detected.
- Validation truth — focused PWA/HomeV2 tests passed 16/16, full `npm test` passed 559/559, lint/build/replay/media gates passed.

Overall status: green locally
Last reviewed: 2026-07-01
## 2026-07-01 — Session 111 — DeathScreen event-source truth

- `docs/AUDIT_2026-07-01_5.json` / `.md` are the source of truth for the Session 111 audit implementation; both shipped items are marked with execution evidence.
- DeathScreen event planning truth — `src/systems/deathFlow.js` owns `buildDebriefStudioEventPlan()` for debrief, next-run drill, weekly contract progress, and rivalry result local Studio events. `src/components/DeathScreen.jsx` persists the returned events.
- Score-submit fallback truth — App remains the owner of canonical successful/rejected score-submit events through `createScoreSubmitStudioEvents()`. DeathScreen only writes a local `score_submit_result` fallback if `onSubmitScore` throws before App can write the canonical result.
- Duplicate-receipt truth — `buildDebriefStudioEventPlan()` returns a stable `debriefEventKey`; DeathScreen uses it to avoid duplicate `debrief_intelligence` / `next_run_drill_shown` receipts on rerender while preserving weekly contract progress dedupe.
- Deferred truth — Supabase and analytics capabilities remain missing after explicit checks; physical PWA/gamepad QA, Lighthouse/funnel evidence, Itch.io publication, screenshots, and full enemy/physics replay parity still require external evidence or a separate design slice.
- Validation truth — focused death-flow/HomeV2 tests passed 16/16, full `npm test` passed 561/561, lint/build/replay/media/live gates passed.

Overall status: green locally and green on current live surfaces
Last reviewed: 2026-07-01
## 2026-07-01 — Session 112 — Determinism, REMATCH, and replay-parity truth

- `docs/AUDIT_2026-07-01_6.json` / `.md` are the source of truth for the Session 112 audit implementation; all 7 items are marked shipped with execution evidence.
- Board-truth correction — the TASK_BOARD S82 (`sync-studio-events` deploy) and S61 (Supabase-half of the URL-allowlist) items were stale: CI evidence (`gh run list`, fresh `workflow_dispatch` run 28555855725) and a live 200 OPTIONS probe from `https://callofdoodie.wtf` show both were already resolved. Closed with evidence rather than re-carried; the analytics-credential half of S61 remains genuinely gated.
- Enemy-spawn determinism truth — `createWaveRng(seed, wave)` now drives enemy type, spawn side/position, elite/berserker rolls, wobble, shootTimer, cluster jitter, and the wave-director event roll. This is a real behavior change: prior to this session, `gs.runSeed` only drove arena layout, so "seeded" modes (REPLAY #seed, Daily Challenge, Gauntlet) never reproduced the actual fight. `src/gameHelpers.seededSpawn.test.js` proves byte-identical spawn timelines for the same seed across a full 10-wave run.
- REMATCH drill truth — practice runs (`gs.practiceRun`) are explicitly excluded from leaderboard submission (UI gate + `submitScore` backstop returning `submission: "skipped_practice"`), cannot trigger achievement or daily-mission checks, and cannot set career bests (score/wave/streak/level/combo zeroed in the `updateCareerStats` call) or overwrite the ghost recording.
- Replay contact-enemy slice truth — `runDeterministicContactEnemySlice()` is explicitly labeled `trace_movement_one_contact_enemy_derived`: it simulates a seed-derived synthetic enemy, not the actual enemy the player fought (stored traces carry only player commands). The advisory `heuristic_pressure_estimate` gate in `runResim()` is unchanged. Not yet consumed by the `validate-replay` edge function, which runs its own separate, smaller heuristic-only implementation — noted as an honest gap, not claimed as wired.
- Balance-lab surface truth — the player-facing "PATTERN SPOTTED" card only renders when `balanceLab.status === "signals-found"`; the "quiet"/no-signal placeholder state stays debug-gated so players never see a manufactured insight.
- Validation truth — 61 new/updated focused tests passed, full `npm test` passed 595/595, lint/build/replay-state-stepper/replay-edge-fixtures gates all passed.

Overall status: green locally
Last reviewed: 2026-07-01

## 2026-07-02 — Session 113 — Edge replay deterministic receipt truth

- Edge replay truth — `supabase/functions/validate-replay/pressure.js` now emits `deterministicSlices` under the existing advisory pressure receipt: deterministic input contract, movement/aim stepper, combat action slice, and derived contact-enemy slice.
- Trust-label truth — `validate-replay` still reports `heuristic_pressure_estimate` / advisory. The new receipts are bounded evidence slices, not a full reconstruction of the actual enemy/wave/physics state.
- Parity truth — `scripts/validate-edge-replay-pressure-fixtures.mjs` compares edge deterministic receipt method/coverage/spawn/contact fields against browser `runResim()` on the shared fixtures.
- Validation truth — edge fixtures 4/4, focused replayResim 17/17, replay state-stepper 4/4, lint/build/full suite/Deno check green.

Overall status: green locally
Last reviewed: 2026-07-02

## 2026-07-02 — Session 113 live replay smoke follow-up

- Advisory drift truth — `validate-replay` no longer quarantines an otherwise valid trace-backed contract solely because `resim.driftPct` is high. The pressure estimate remains visible in the response as advisory evidence, matching the trust-label decision.
- Deployment truth — this fix was required by live `npm run replay:trust-smoke` after the first Session 113 deploy.

## 2026-07-02 — Session 114 — Coordinated formation truth

- `docs/AUDIT_2026-07-02_2.json` / `.md` are the source of truth for the Session 114 audit implementation.
- Wave-director truth — `createWaveDirectorPlan()` now retains `wave`, and `getSpawnFormationPlan()` uses that source to switch wave-20+ pressure/climax spawns from loose offsets to coordinated PINCER / ESCORT / FLANK archetypes.
- Enemy metadata truth — `applySpawnFormation()` stamps `formation`, `formationLane`, and `formationRole` onto the spawned enemy after applying bounds-safe offsets.
- Telemetry truth — `buildWaveTelemetrySnapshot()` now reports `formationSet: "coordinated"` for wave-20+ plans and `"loose"` for earlier waves.
- Validation truth — focused waveDirector tests passed 20/20, full `npm test` passed 596/596, lint/build/replay-state-stepper/replay-edge-fixtures/launch-media gates passed.

Overall status: green locally
Last reviewed: 2026-07-02

## 2026-07-02 — Session 114 deployment truth

- Git truth — `origin/main` points at `4c34f07 feat: add coordinated late-wave formations`; local `main` and `origin/main` are even (`0 0`).
- Deploy truth — GitHub Actions `Deploy to Cloudflare Pages` run `28616256955` completed successfully for commit `4c34f07`; `brief-format-check` run `28616256915` also succeeded.
- Live truth — `npm run live:site-check` passed 5/5 on `https://callofdoodie.wtf/`; `npm run post-cutover:smoke` passed 5/5; `npm run replay:trust-smoke` passed 3/3.

Overall status: green live
Last reviewed: 2026-07-02

## 2026-07-02 — Session 115 — REMATCH drill L3 truth
- REMATCH practice truth — src/components/DeathScreen.jsx now passes the selected nextRunDrill into the REMATCH start path, and src/App.jsx stores an explicit practiceDrill object on the leaderboard-excluded practice game state.
- HUD truth — src/components/HUD.jsx renders the REMATCH drill reason and best-of-3 receipt only when practiceDrill exists; normal competitive runs do not show the practice receipt.
- Trust unchanged — practice runs still skip leaderboard submission and career-record farming; this session did not claim physical PWA/gamepad QA, production Lighthouse data, or full deterministic replay parity.

## 2026-07-03 — Session 116 — Legacy shared-panel routing truth

- `docs/AUDIT_2026-07-03.json` / `.md` are the source of truth for the Session 116 audit implementation.
- MenuScreen truth — legacy modal state now renders shared `MenuPanels.jsx` components for Rules, Controls, Most Wanted, Run History, Loadout Builder, Missions, Upgrades, and What's New.
- Coverage truth — `src/components/MenuScreen.test.jsx` proves the legacy Command Center opens shared Rules and Controls content; the default HomeV2 path remains unchanged.
- Retirement truth — this session does not claim full legacy v1 deletion. The old fallback remains production-reachable until HomeV2 Lighthouse/funnel evidence clears the retirement gate.
- Validation truth — focused MenuScreen test 1/1, full `npm test` 600/600, lint/build/replay/media gates passed.

Overall status: green locally
Last reviewed: 2026-07-03

## 2026-07-03 — Session 116 deployment truth

- Git truth — `origin/main` points at `0e18930 feat: route legacy menu panels through shared components`; local `main` and `origin/main` are even (`0 0`).
- Deploy truth — GitHub Actions `Deploy to Cloudflare Pages` run `28632606103` completed successfully for commit `0e18930`; `brief-format-check` run `28632606098` also succeeded.
- Live truth — `npm run live:site-check` passed 5/5 on `https://callofdoodie.wtf/`; `npm run post-cutover:smoke` passed 5/5; `npm run replay:trust-smoke` passed 3/3.

Overall status: green live
Last reviewed: 2026-07-03

## 2026-07-03 — Session 119

- Source-of-truth correction: `public/manifest.json`, `assets/visual-assets.json`, and `scripts/validate-launch-media.mjs` already prove five verified browser-capture manifest screenshots from Session 118. `context/GAME_LOOP.md` and `context/TASK_BOARD.md` were reconciled so they no longer carry the stale partial-screenshot premise.
- Current truth posture: green locally. Replay trust remains advisory until full deterministic physics/enemy resimulation exists. Physical PWA install/gamepad QA remains real-device gated.

## 2026-07-03 — Session 120 — Initiation route truth

- Protocol truth — `prompts/start.md` routes uninitialized Type A/B projects to `prompts/initiate.md`; that file now exists locally and redirects mature returning sessions back to start.
- Drift truth — `scripts/protocol-drift-check.mjs --json` now includes the initiation prompt as required and reports `status=ok`, 25/25 present, `missingRequired=0`.
- Canon truth — tier-aware conformance reports 0 GAP and CANON-003 conformed after the fix.
- Launch-gate truth — analytics capability remains MISSING; physical PWA/gamepad QA, HomeV2 production evidence, and publication/community links remain external gates, not shipped code claims.

Overall status: green locally
Last reviewed: 2026-07-03


## 2026-07-16 — Session 124 — Evidence lifecycle and coaching truth

- Audit truth — `docs/AUDIT_2026-07-16_3.json` / `.md` contain five live-verified primary items and three implemented second-order candidates; every item is marked shipped with execution evidence.
- Startup truth — `scripts/lib/sil-history.mjs` is the shared parser for supported SIL formats. Latest scored session/date and forecasts no longer come from divergent regular expressions.
- Input truth — Aim Check completion requires observed four-direction evidence. A button click alone cannot save a complete record. Complete evidence older than 30 days becomes stale and cannot produce `INPUT QA READY`.
- Supporter truth — the removed legacy flag is never proof. The browser queries `callsign_claims` for an exact callsign, caches only a verified record, expires it after seven days, and the submit Edge Function remains independently authoritative.
- Coaching truth — accepted drill/contract/baseline data reaches live, replay, and REMATCH runs. Outcome receipts report observations only; repeatability is a deduplicated 2-of-3 pattern and explicitly not causality or mastery proof.
- Runtime truth — the frame index scans the compacted enemy list once per frame, reuses scratch identity, clears stale summon keys, and supplies Sergeant/summon lookups without the removed allocation/rescan paths.
- Validation truth — 664/664 tests across 84 files, lint, production build, public contract 12/12, security release gate, npm audit 0, replay fixtures, medium game gate, and diff checks passed directly.
- Visual truth — the existing hosted 192/192 machine matrix remains valid for the prior staging baseline; direct AI pixel review is still unclaimed because the Windows image/browser tools failed CryptUnprotectData.
- Release truth — engineering closeout is green; SPARKED remains NO-GO pending the external/manual/data/founder gates recorded in PROJECT_STATUS.

Overall status: green engineering closeout; NO-GO SPARKED
Last reviewed: 2026-07-16
## Session 124 closeout-boundary truth

- The final autopilot path was inspected before lock clearance; its sibling `doctor --update-json` mutation was replaced with read-only project-router `doctor --json --quiet` verification.
- `tests/studio-ops-proxy.test.js` asserts the read-only command and rejects reintroduction of `doctor --update-json` in the autopilot.
- Full suite after the root-fix: 664/664 tests; protocol drift 30/30; Windows hidden-spawn guard green.

- Closeout board truth: committed write-backs are derived from the prior-to-current closeout commit range; ignored local creative-direction evidence uses a bounded recent-mtime fallback; staging uses the verified `testingSurfaces` entry. The regenerated board marks all ten write-backs and the Session 124 preview truthfully.
