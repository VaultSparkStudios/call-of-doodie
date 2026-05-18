# Implement Plan — 2026-05-18 Audit Iteration 2

Source: `docs/AUDIT_2026-05-18_2.md`

| Order | Item | Tier | Effort | Priority | Work surface |
|---:|---|:-:|---|---:|---|
| 1 | trace-edge-forwarding-firewall | 🔥 | 1h | 58.2 | `src/storage.js`, `src/storage.test.js` |
| 2 | trace-payload-storage-contract | 🔥 | 2h | 54.0 | `src/utils/runSubmission.js`, `supabase/functions/submit-score/index.ts` |
| 3 | replay-trust-smoke-script | ⚡ | 1h | 44.3 | `scripts/replay-trust-smoke.mjs`, `package.json` |
| 4 | ghost-pack-hud-surface | ⚡ | 1h | 32.1 | `src/App.jsx`, `src/components/HUD.jsx` |

## Success Checks

- Online score submission forwards trace metadata after leaderboard normalization.
- Trace body, digest, and length agree before Edge Function acceptance; invalid body/digest pairs reject as replay trace failures.
- Deployed `validate-replay` can be smoke-tested for valid trace confidence and malformed trace quarantine.
- Loaded leaderboard ghosts are visible as an in-run HUD target without blocking play.
