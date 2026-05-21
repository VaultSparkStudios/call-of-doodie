# Implement Plan — 2026-05-21 Audit 2

Source: `docs/AUDIT_2026-05-21_2.md`

| Order | Item | Tier | Effort | Priority | Work surface |
|---:|---|:-:|---|---:|---|
| 1 | replay-command-trace-capture | 🔥 | 1h | 49.2 | `src/utils/replayCommandTrace.js`, `src/App.jsx`, `src/utils/replayCommandTrace.test.js` |
| 2 | trace-submission-validity-gate | ⚡ | 30m | 44.7 | `src/utils/runSubmission.js`, `src/utils/runSubmission.test.js` |
| 3 | validate-replay-trace-body-parity | ⚡ | 1h | 33.5 | `supabase/functions/validate-replay/index.ts`, `scripts/replay-trust-smoke.mjs` |

## Success Checks

- Gameplay command traces are non-empty for real player actions and stay bounded before encoding.
- Invalid trace objects are stripped before network submission.
- `validate-replay` can verify trace body byte/count/digest/action-shape parity when a body is supplied.
- Focused trace tests, lint, build, and full suite pass.
