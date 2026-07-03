# Implement Plan - 2026-07-03 Session 118

Source: `docs/AUDIT_2026-07-03_3.json`

## Sequenced Order

| Seq | Slug | Rung | Effort | Why this position |
|---|---|---|---|---|
| 1 | five-scene-launch-screenshot-capture-contract | L1 | 1h | Highest repo-executable public-launch truth gap; removes authored manifest fallbacks without touching external analytics, device, or production-data gates. |

## Validation Plan

Regenerate all screenshots with `npm run launch:screenshots`, then prove manifest/media provenance with `npm run assets:check` and `npm run launch:media-check`. Before closeout: `npm run lint`, `npm test`, `npm run build`, and `git diff --check`.
