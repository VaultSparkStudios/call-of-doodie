# Implement Plan — 2026-07-01 Session 111

Source: `docs/AUDIT_2026-07-01_5.json`

## Sequenced Order

1. `death-submit-event-plan-extraction` — shipped. Added pure DeathScreen Studio event builders in `src/systems/deathFlow.js`, wired `DeathScreen.jsx` to call them, and covered event types/payloads in focused tests.
2. `debrief-event-dedupe-key` — shipped. Added a stable debrief receipt key so rerenders do not duplicate `debrief_intelligence` / `next_run_drill_shown` events while weekly contract progress keeps its own dedupe.
3. `honest-gated-deferrals` — recorded as honest deferral. Regenerated `docs/INNOVATION_PACK.md`; Supabase/analytics/dashboard/manual/data/product-decision/replay-design items remain evidence-gated.

## Validation

- `npx vitest run src/systems/deathFlow.test.js` — 5/5 passing.
- `npx vitest run src/systems/deathFlow.test.js src/components/HomeV2.test.jsx` — 16/16 passing.
- `npm run lint` — clean.
- `npm test` — 561/561 passing across 68 files.
- `npm run build` — passing.
- `npm run replay:state-stepper` — 4 fixtures passing.
- `npm run replay:edge-fixtures` — 4 fixtures passing.
- `npm run launch:media-check` — passing; 5 fallback-provenance screenshots and 2 verified captures.

## Honest Deferrals

- `sync-studio-events` deploy remains blocked on missing Supabase capability.
- Analytics/Sentry/PostHog/Ko-fi allowlists remain blocked on missing analytics/dashboard capability.
- Physical PWA/gamepad QA, HomeV2 Lighthouse/funnel evidence, Itch.io publication, and full screenshot replacement still require real external evidence.
- Full deterministic enemy/physics resimulation remains a future design slice; replay trust labels stay advisory.
