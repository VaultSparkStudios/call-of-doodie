# Implement Plan — 2026-05-21 Audit

Source: `docs/AUDIT_2026-05-21.md`

| Order | Item | Tier | Effort | Priority | Work surface |
|---:|---|:-:|---|---:|---|
| 1 | flow-field-extraction-contract | 🔥 | 1h | 49.2 | `src/systems/flowField.js`, `src/App.jsx`, `src/systems/flowField.test.js` |
| 2 | formation-spawn-identity | 🔥 | 2h | 48.0 | `src/systems/waveDirector.js`, `src/App.jsx`, `src/systems/waveDirector.test.js` |
| 3 | deathscreen-contract-closure | ⚡ | 1h | 43.1 | `src/components/DeathScreen.jsx`, `src/utils/socialRetention.test.js` |
| 4 | trace-contract-byte-budget | ⚡ | 1h | 28.6 | `src/utils/replayCommandTrace.js`, `src/utils/replayCommandTrace.test.js`, `supabase/functions/submit-score/index.ts` |

## Success Checks

- Enemy navigation primitives are pure, imported by `App.jsx`, and covered by obstacle/fallback tests.
- Wave director stages can assign deterministic formation identity and keep adjusted spawn positions bounded.
- Death debriefs show the active contract progress immediately after a run.
- Replay trace bodies are capped by encoded byte size on client validation and edge rejection.
