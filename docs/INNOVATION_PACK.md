<!-- generated-by: node scripts/ops.mjs innovation-pack -->
<!-- generated-at: 2026-08-02T00:00:27.842Z -->

# Innovation Pack — Call-Of-Doodie

> Repo-local second-order candidate list for `/implement` saturation loops.

## Ranked Candidates

- No repo-local candidates found. Maintain launch confidence with tests, build, and protocol checks.

## Deferred Evidence

- **credential-blocked** - [SIL:2] [BLOCKER S61] [S60 follow-up · narrowed S112] Update PostHog/Sentry/Ko-fi dashboard URL allowlists for `https://callofdoodie.wtf/` — the Supabase half is CLOSED with evidence (all five edge functions ship `Access-Control-Allow-Origin: *` in code; live OPTIONS on `sync-studio-events` with `Origin: https://callofdoodie.wtf` returns 200, verified S112). Remaining half stays credential-gated: `node scripts/check-secrets.mjs --for analytics` MISSING, and PostHog/Sentry aren't wired until `VITE_POSTHOG_KEY`/`VITE_SENTRY_DSN` exist. (Requires a named credential or provider-dashboard capability that is not proven ready.)
- **product-decision** - [SIL:2] [S60] Supabase Auth / Studio membership implementation decision — if paid tier or membership integration is now desired, implement `docs/AUTH_INTEGRATION_PLAN.md` instead of leaving membership server-only (Requires an explicit product-scope decision before implementation.)
- **data-blocked** - [Human/Data] [SIL:2⛔] HomeV2 Lighthouse measurement — capture real LCP/CLS deltas vs legacy MenuScreen on production, confirm ≥200ms LCP improvement before removing v1 fallback (Requires production or participant evidence that source code cannot fabricate.)
- **data-blocked** - [Human/Data] [SIL:1] HomeV2 analytics funnel — compare `home_v2_deploy` vs legacy `front_door_action` completion rates after 48h of traffic (Requires production or participant evidence that source code cannot fabricate.)
- **data-blocked** - [SIL:1] [S62 deferred] HomeV2 v1 fallback retirement — gate on ≥200ms Lighthouse LCP improvement confirmed on production (human measurement required) (Requires production or participant evidence that source code cannot fabricate.)
- **community-blocked** - Discord invite/community link when the community entry point is ready (Requires a real community destination to exist first.)

## Compound Refinements — Implemented S136

- **Objective outcome consistency** — contradictory completed-and-expired ticks fail closed as expired, pay no reward, and emit an explicit consistency receipt.
- **Finite transient randomness** — non-finite or out-of-range random-number generator output is normalized before it can enter particle state.
- **Classifier semantic precision** — the ordinary word “missing” no longer implies a credential dependency; missing-test and missing-coverage work stays executable.
- **Broker-native Pages fallback** — staging proves the narrow deploy token first and activates the ready Studio credential only on an authentication denial, inside the canonical broker closure.
- **Dynamic edge header parity** — the health Function owns HSTS, nosniff, and same-origin resource policy because static `_headers` does not cover that response path.
- **Deterministic suite resources** — four Vitest file workers prevent the launch module from starvation under the complete 137-file corpus without weakening its 60-second contract.
- **Closeout schema parity** — the status board consumes schema-2 executable/exhaustion receipts and legacy ranked caches, so zero runnable work cannot be mislabeled missing data.
- **Hidden subprocess enforcement** — staging and operator smoke imports cross the shared safe-spawn wrapper, making `windowsHide:true` structural rather than caller-optional.

Focused compound proof plus canonical suite: 30/30 boundary fixtures and 918/918 tests across 137 files pass directly.

## Guardrails

- Treat human/device/dashboard items as launch gates, not repo-code blockers.
- Keep replay, leaderboard, and submission trust language evidence-backed.
- Prefer local deterministic helpers over paid API or per-user variable cost.
