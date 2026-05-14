<!-- fallback truncation (no API key) -->

# Latest Handoff

Session Intent: Founder asked whether plan mode applies to Codex, then directed Codex to fix the protocol mismatch so it does not happen in Codex sessions; after /go continuation, founder asked for closeout, commit, push, and all memory/context/CDR/task-board updates.

## Where We Left Off (Session 61 — Codex protocol fix + redirect cleanup + combat extraction)

**Intent outcome:** Achieved for this repo. The Codex plan-mode mismatch is fixed, canonical redirect routing is live and verified, App.jsx extraction slice 11 is implemented, and closeout write-back is complete. Remaining work is either dashboard/credential-gated, product-decision-gated, or cross-repo deploy follow-through.

### What shipped
- **Codex protocol mismatch fixed** — `scripts/verify-plan-mode.mjs` now reads `agent:` from `context/.session-lock`; when `agent` is not `claude-code`, Claude-only plan mode is stamped as `not_required` instead of failing Codex sessions.
- **Redirect routing deployed** — `functions/_middleware.js` redirects `www.callofdoodie.wtf`, `playcallofdoodie.com`, and `www.playcallofdoodie.com` to canonical `https://callofdoodie.wtf/` with HTTP 301 through Cloudflare Pages middleware.
- **Cloudflare cutover helper hardened** — `scripts/cloudflare-domain-cutover.mjs` now loads the private Studio Ops Cloudflare token paths used by platform helpers; Rulesets API access still lacked authorization, so Pages middleware is the repo-owned fallback.
- **Combat extraction slice 11** — `src/systems/combatResolution.js` now owns pure helpers for incoming damage, enemy projectile/player hits, contact-hit resolution, and grenade explosion damage. `src/App.jsx` delegates enemy projectile hits and grenade blast damage through those helpers.
- **Blockers clarified** — analytics/dashboard allowlists are credential-gated; `validate-replay` Phase 2B is contract-gated because `inputHash` alone is not reversible into replay inputs; old-path GitHub Pages redirect patch is prepared in the sibling repo but still needs cross-repo commit/push/deploy.

### Validation
- `node --check scripts\verify-plan-mode.mjs` -> passed.
- `node scripts\verify-plan-mode.mjs --json` -> `status: not_required`, `agent: codex`.
- `COD_LIVE_URL=https://callofdoodie.wtf/ npm run live:site-check` -> 5/5 passing.
- `npx vitest run src/systems/combatResolution.test.js` -> 11/11 passing.
- `npx vitest run src/systems/combatResolution.test.js src/App.launch.test.jsx` -> 12/12 passing.
- `npm run lint` -> passed.
- `npm run build` -> passed.
- Full `npm test` was attempted after the App extraction but timed out after 6 minutes on this Windows runner; no failing assertion was captured.

### Remaining work
- [ ] Update PostHog/Sentry/Ko-fi project URL allowlists once analytics/dashboard credentials are available. Supabase Edge Functions currently use wildcard CORS, so no repo-side Supabase allowlist edit is needed.
- [ ] Decide whether to implement Supabase Auth / Studio membership UI from `docs/AUTH_INTEGRATION_PLAN.md`; current identity remains callsign + local anonymous UUID.
- [ ] Redesign `validate-replay` Phase 2B around a replay input timeline, command trace, or signed event digest before attempting deterministic resim.
- [ ] Commit/push/deploy the prepared sibling-repo old-path redirect patch in `VaultSparkStudios.github.io` if cross-repo publication is approved.
- [ ] Rotate/narrow the broad Cloudflare studio-access token after the domain migration stabilizes.

## Next Recommended Slice (Session 62)
- [ ] Start with the old-path redirect publication or replay-contract design, depending on whether the next session is ops cleanup or trust-system work. For in-repo coding, the replay contract is the highest-leverage unblocker; for launch cleanup, the sibling website redirect is the cleanest finish.

Session Intent: Founder asked to start the session because `callofdoodie.wtf` was still not working, continue through Cloudflare/Namecheap cutover with updated credentials, ensure the studio website agent can discover the new live URL, then closeout, commit, and push with all context/memory files updated.

## Where We Left Off (Session 60 — standalone-domain cutover completed)

**Intent outcome:** Mostly achieved. Canonical production is now live at `https://callofdoodie.wtf/` and the formal live-site check passes 5/5. Backup `.com` and stable Pages preview also serve the game. The remaining work is post-cutover routing/allowlist cleanup, not primary domain activation.