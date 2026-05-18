# Implement Plan — 2026-05-18 Audit

Source: `docs/AUDIT_2026-05-18.md`

| Order | Item | Tier | Effort | Priority | Work surface |
|---:|---|:-:|---|---:|---|
| 1 | replay-trace-contract-v2 | 🔥 | 2h | 54.0 | `supabase/functions/validate-replay/index.ts` |
| 2 | submit-score-trace-firewall | 🔥 | 1h | 51.7 | `supabase/functions/submit-score/index.ts` |
| 3 | trace-submission-test-backfill | ⚡ | 30m | 49.0 | `src/utils/runSubmission.test.js` |
| 4 | trace-truth-repair | ⚡ | 30m | 42.0 | `context/*` truth surfaces |
| 5 | run-proof-language | 💡 | 1h | 6.7 | public-safe closeout/truth language only |

## Success Checks

- `validate-replay` accepts trace-backed replay contracts without claiming full deterministic resim.
- `submit-score` rejects malformed trace metadata before insertion.
- Valid trace metadata is kept in member session metadata, avoiding leaderboard schema drift.
- Unit coverage proves trace fields in session submissions.
- Public context surfaces distinguish shipped client trace binding from remaining edge/server trust work.
