<!-- fallback truncation (no API key) -->

# Latest Handoff

Session Intent: Founder asked to start/plan the standalone-domain migration, implement all migration items, troubleshoot the unreachable custom domain, clarify auth/Studio membership status, and close out with commit + push.

## Where We Left Off (Session 59 — standalone-domain implementation + Cloudflare Pages deploy)

**Intent outcome:** Partially achieved. Repo-side migration is implemented and deployed to Cloudflare Pages, but `callofdoodie.wtf` and `playcallofdoodie.com` still cannot resolve through Cloudflare because the stored Cloudflare token lacks account-level zone-create permission and the domains remain on Namecheap parking DNS.

### What shipped
- Root-domain build support: `VITE_BASE_PATH=/` for Cloudflare Pages, `VITE_BASE_PATH=/call-of-doodie/` for manual GitHub Pages fallback.
- Canonical metadata/share/PWA assets updated to `https://callofdoodie.wtf/`.
- Runtime-scoped service worker + registrar so root and fallback paths both cache correctly; cache bumped to `cod-v5`.
- Cloudflare Pages workflow, Pages `_headers`, cutover runbook, Cloudflare domain helper, and platform helper that loads private ops secrets.
- Root build deployed to Cloudflare Pages: `https://a660c406.call-of-doodie.pages.dev/`; live-site check passed 5/5.
- Auth reality check completed: no public sign-in/create-account UI; callsign + local anon UUID today; Studio membership only server-side when an authenticated Supabase `uid` exists.

### Validation
- `npm run lint` clean.
- `npm run build` clean.
- `VITE_BASE_PATH=/call-of-doodie/ npm run build` clean.
- `src/utils/challengeLinks.test.js` 2/2 passing under forked Vitest.
- `npm run live:site-check` passed against the Pages URL.

### Remaining work
- [ ] Create broader Cloudflare zone-create token or manually add zones for both domains.
- [ ] Switch Namecheap nameservers to the Cloudflare-assigned NS pair.
- [ ] Update Namecheap API allowlist.
- [ ] Run platform/domain cutover scripts, verify canonical URL + redirects, update Supabase/PostHog/Sentry/Ko-fi URLs, and add old-path 301 in the apex repo.

Session Intent: Founder asked to continue the audit/refinement mandate, implement all recommended items in optimal order at highest quality, then closeout, commit, and push with all memory/context/CDR/task-board files updated.

## Where We Left Off (Session 58 — deterministic combat + run-intelligence depth pass)

**Intent outcome:** Achieved end-to-end. Full suite 315/315, lint clean, build clean. Main app chunk is 730.41 kB raw / 222.57 kB gzip after splitting legacy MenuScreen into a lazy fallback chunk.

### What shipped
- **Combat resolver foundation** — `src/systems/combatResolution.js` now owns bullet/enemy overlap, crit roll, juggernaut shield-facing multiplier, lightning-chain target selection, pierce decrement, and obstacle bounce helpers. `App.jsx` delegates the bullet/enemy and bounce paths while keeping React refs and particles at the edge.
- **Objective mastery loop** — `objectiveDirector` now tracks objective-chain stats; four achievements landed: 3 hot zones in a row, 5 bounties in a run, perfect escort, and clutch lockdown.
- **Run Brain** — local zero-token player model in `src/utils/runBrain.js`; DeathScreen now shows a next-experiment recommendation and follow-through signal alongside AI Run Coach.
- **Bounty Board** — Run History now generates fixed-seed, claimable rivalry targets from stored history/daily champion context through `buildBountyBoard()`.
- **First-three-run onboarding** — HomeV2 now routes fresh players through a compact run arc instead of presenting all systems at once.
- **Heat visuals** — `drawGame.js` adds a reduced-motion-aware warm palette lift at heat >= 40 and subtle hit-split accents at heat >= 70.
- **Replay trust hardening** — `validate-replay` now records replay-contract confidence (`heuristic`, `replay_contract`, `quarantine`) and warns on competitive seeded submissions missing `inputHash`.
- **Efficiency cleanup** — `SettingsPanel` hook warning fixed; legacy `MenuScreen` lazy-loaded so default HomeV2 no longer pays that initial bundle cost.

### Validation
- `npx vitest run --pool=threads --fileParallelism=false --reporter=dot` -> 315/315 passing across 41 files. jsdom logs expected `HTMLCanvasElement.getContext` warnings from DemoCanvas tests only.
- `npm run lint` -> clean.
- `npm run build` -> clean; main chunk 730.41 kB raw / 222.57 kB gzip, `MenuScreen` chunk 69.40 kB raw / 17.07 kB gzip.

### Remaining work
- [ ] [S59] `validate-replay` Phase 2B: actual headless deterministic resim from `seed + inputHash`, using the new pure combat helpers; quarantine >2% drift.
- [ ] [S59] App.jsx extraction slice 11: enemy bullet/player hit resolution and grenade explosion damage.
- [ ] [Carryover] Founder/data gates: Cloudflare/Namecheap domain steps, real-device QA, analytics keys, HomeV2 Lighthouse/funnel measurement.

## Next Recommended Slice (Session 59)
- [ ] Ship `validate-replay` Phase 2B first if leaderboard trust is the priority; otherwise continue the App.jsx extraction ladder with enemy bullet/player hit + grenade damage, which supports the same trust path.

Session Intent: Audit + ship a 12-item depth/UX/security/perf/AI sweep in one pass — fix the broken Best-Moment GIF, brainstorm strategic objectives building on the founder-loved "circle that increases score" concept, then implement the entire combined top-12 list at quality (dynamic objectives, AI run coach, replay codes, heat meter, HUD density, adaptive telegraphing, cosmetic track, server-side replay validation, score-ledger extraction, daily crown, skill-cost telemetry).

## Where We Left Off (Session 57 — 12-item depth + retention sweep, all shipped)

**Intent outcome:** Achieved end-to-end. All 12 items shipped, 303/303 tests green (was 248 — added 55 new tests across 7 new modules), 0 lint errors.

### What shipped (in execution order)
- **#2 GIF fix + Web Worker** — `src/workers/gifEncode.worker.js` (new); `src/App.jsx:1820` decoupled buffer capture from encode (always capture on desktop, widen cadence 10 → 20 frames under load instead of disabling); encode moved off main thread via worker with 15s timeout
- **#12 Skill-cost telemetry** — `scripts/log-skill-cost.mjs` (new) appends per-invocation `{ts, session, skill, model, tokens, ms}` to `ignis/output/agent-spend.json` (rolling last 200), prints top-5 skills by spend
