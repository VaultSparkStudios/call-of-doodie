<!-- generated-by: node scripts/ops.mjs innovation-pack -->
<!-- generated-at: 2026-07-01T23:07:29.243Z -->

# Innovation Pack — Call-Of-Doodie

> Repo-local second-order candidate list for `/implement` saturation loops.

## Ranked Candidates

1. **sil-1-credential-gated-s82-deploy-sync-studio-events-edge-function-repai** — [SIL:1] [Credential-gated S82] Deploy `sync-studio-events` edge-function repair — local code is fixed, but `supabase functions deploy sync-studio-events --project-ref fjnpzjjyhnpmunfoycrp` failed because no `SUPABASE_ACCESS_TOKEN` is available; `node scripts/check-secrets.mjs --for supabase` reports `supabase MISSING`.
   - Axis: protocol
   - Evidence: context/TASK_BOARD.md#now
   - First step: verify the premise in source, then write a fresh `docs/AUDIT_<date>.json` item before implementation.
2. **sil-2-blocker-s61-s60-follow-up-update-supabase-posthog-sentry-ko-fi-url** — [SIL:2] [BLOCKER S61] [S60 follow-up] Update Supabase/PostHog/Sentry/Ko-fi URL allowlists to include `https://callofdoodie.wtf/` and backup-origin expectations — Supabase Edge Functions currently use `Access-Control-Allow-Origin: *`, so no repo-side CORS allowlist change is needed; remaining PostHog/Sentry/Ko-fi project URL updates require analytics/dashboard credentials (`node scripts/check-secrets.mjs --for analytics` is MISSING).
   - Axis: protocol
   - Evidence: context/TASK_BOARD.md#now
   - First step: verify the premise in source, then write a fresh `docs/AUDIT_<date>.json` item before implementation.
3. **sil-2-s60-supabase-auth-studio-membership-implementation-decision-if-pai** — [SIL:2] [S60] Supabase Auth / Studio membership implementation decision — if paid tier or membership integration is now desired, implement `docs/AUTH_INTEGRATION_PLAN.md` instead of leaving membership server-only
   - Axis: protocol
   - Evidence: context/TASK_BOARD.md#now
   - First step: verify the premise in source, then write a fresh `docs/AUDIT_<date>.json` item before implementation.
4. **sil-2-blocker-s61-s59-carryover-validate-replay-phase-2b-build-the-actua** — [SIL:2] [BLOCKER S61] [S59 carryover] validate-replay Phase 2B — build the actual headless deterministic resim runner from seed + trace-backed replay inputs, using pure combat helpers; quarantine >2% drift; keep heuristic as the fast pre-filter. Session 68 closes the trace metadata contract, but full resim still needs a replay runner and stored trace payload contract.
   - Axis: launch-confidence
   - Evidence: context/TASK_BOARD.md#now
   - First step: verify the premise in source, then write a fresh `docs/AUDIT_<date>.json` item before implementation.
5. **human-sil-2-manual-browser-qa-pass-against-docs-qachecklist-md-to-confir** — [Human] [SIL:2] Manual browser QA pass against `docs/QA_CHECKLIST.md` to confirm S55 GIF + white-card + lag fixes hold under real clicks (CLI cannot drive the browser)
   - Axis: launch-confidence
   - Evidence: context/TASK_BOARD.md#now
   - First step: verify the premise in source, then write a fresh `docs/AUDIT_<date>.json` item before implementation.
6. **human-data-sil-2-homev2-lighthouse-measurement-capture-real-lcp-cls-delt** — [Human/Data] [SIL:2⛔] HomeV2 Lighthouse measurement — capture real LCP/CLS deltas vs legacy MenuScreen on production, confirm ≥200ms LCP improvement before removing v1 fallback
   - Axis: product
   - Evidence: context/TASK_BOARD.md#now
   - First step: verify the premise in source, then write a fresh `docs/AUDIT_<date>.json` item before implementation.
7. **human-data-sil-1-homev2-analytics-funnel-compare-homev2deploy-vs-legacy-** — [Human/Data] [SIL:1] HomeV2 analytics funnel — compare `home_v2_deploy` vs legacy `front_door_action` completion rates after 48h of traffic
   - Axis: product
   - Evidence: context/TASK_BOARD.md#now
   - First step: verify the premise in source, then write a fresh `docs/AUDIT_<date>.json` item before implementation.
8. **discord-invite-community-link-when-the-community-entry-point-is-ready** — Discord invite/community link when the community entry point is ready
   - Axis: product
   - Evidence: context/TASK_BOARD.md#deferred
   - First step: verify the premise in source, then write a fresh `docs/AUDIT_<date>.json` item before implementation.

## Guardrails

- Treat human/device/dashboard items as launch gates, not repo-code blockers.
- Keep replay, leaderboard, and submission trust language evidence-backed.
- Prefer local deterministic helpers over paid API or per-user variable cost.
