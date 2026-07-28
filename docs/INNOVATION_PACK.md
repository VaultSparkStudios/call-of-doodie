<!-- generated-by: node scripts/ops.mjs innovation-pack -->
<!-- generated-at: 2026-07-28T06:12:38.154Z -->

# Innovation Pack — Call-Of-Doodie

> Repo-local second-order candidate list for `/implement` saturation loops.

## Ranked Candidates

1. **sil-2-blocker-s61-s60-follow-up-narrowed-s112-update-posthog-sentry-ko-f** — [SIL:2] [BLOCKER S61] [S60 follow-up · narrowed S112] Update PostHog/Sentry/Ko-fi dashboard URL allowlists for `https://callofdoodie.wtf/` — the Supabase half is CLOSED with evidence (all five edge functions ship `Access-Control-Allow-Origin: *` in code; live OPTIONS on `sync-studio-events` with `Origin: https://callofdoodie.wtf` returns 200, verified S112). Remaining half stays credential-gated: `node scripts/check-secrets.mjs --for analytics` MISSING, and PostHog/Sentry aren't wired until `VITE_POSTHOG_KEY`/`VITE_SENTRY_DSN` exist.
   - Axis: protocol
   - Evidence: context/TASK_BOARD.md#now
   - First step: verify the premise in source, then write a fresh `docs/AUDIT_<date>.json` item before implementation.
2. **sil-2-s60-supabase-auth-studio-membership-implementation-decision-if-pai** — [SIL:2] [S60] Supabase Auth / Studio membership implementation decision — if paid tier or membership integration is now desired, implement `docs/AUTH_INTEGRATION_PLAN.md` instead of leaving membership server-only
   - Axis: protocol
   - Evidence: context/TASK_BOARD.md#now
   - First step: verify the premise in source, then write a fresh `docs/AUDIT_<date>.json` item before implementation.
3. **human-data-sil-2-homev2-lighthouse-measurement-capture-real-lcp-cls-delt** — [Human/Data] [SIL:2⛔] HomeV2 Lighthouse measurement — capture real LCP/CLS deltas vs legacy MenuScreen on production, confirm ≥200ms LCP improvement before removing v1 fallback
   - Axis: product
   - Evidence: context/TASK_BOARD.md#now
   - First step: verify the premise in source, then write a fresh `docs/AUDIT_<date>.json` item before implementation.
4. **human-data-sil-1-homev2-analytics-funnel-compare-homev2deploy-vs-legacy-** — [Human/Data] [SIL:1] HomeV2 analytics funnel — compare `home_v2_deploy` vs legacy `front_door_action` completion rates after 48h of traffic
   - Axis: product
   - Evidence: context/TASK_BOARD.md#now
   - First step: verify the premise in source, then write a fresh `docs/AUDIT_<date>.json` item before implementation.
5. **discord-invite-community-link-when-the-community-entry-point-is-ready** — Discord invite/community link when the community entry point is ready
   - Axis: product
   - Evidence: context/TASK_BOARD.md#deferred
   - First step: verify the premise in source, then write a fresh `docs/AUDIT_<date>.json` item before implementation.
6. **sil-1-s62-deferred-homev2-v1-fallback-retirement-gate-on-200ms-lighthous** — [SIL:1] [S62 deferred] HomeV2 v1 fallback retirement — gate on ≥200ms Lighthouse LCP improvement confirmed on production (human measurement required)
   - Axis: product
   - Evidence: context/TASK_BOARD.md#deferred
   - First step: verify the premise in source, then write a fresh `docs/AUDIT_<date>.json` item before implementation.

## Guardrails

- Treat human/device/dashboard items as launch gates, not repo-code blockers.
- Keep replay, leaderboard, and submission trust language evidence-backed.
- Prefer local deterministic helpers over paid API or per-user variable cost.
