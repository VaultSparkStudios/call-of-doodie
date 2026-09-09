# Implement Plan — Session 166

Source: `docs/AUDIT_2026-09-08.json`

The four promoted items are sequenced by dependency: make arena coordinates authoritative first, use that contract for Extraction pressure and traversal second, expose its objectives in the settled radar model third, then move the secondary death analysis off the immediate death beat.

| Wave | Audit item | Rung | Why this order | Verification gate |
|---|---|---|---|---|
| 1 | `arena-authoritative-spawn-perimeter` | L2 | Correctness prerequisite for any scaled mode with ordinary waves or bosses. | Pure resolver tests; viewport identity; enemy, boss, and late-wave cluster coordinates use scaled bounds. |
| 2 | `large-sewer-extraction` | L2 | Reuses the corrected spawn seam and adds traversal without silently diluting pressure. | 1.5× arena declaration; bounded pressure scale; deterministic crate, evac, lock, and bank paths. |
| 3 | `extraction-objective-radar` | L2 | Makes the new traversal readable after the map and pressure contracts settle. | Pure projection tests for loot/evac markers, bounds, culling, and legacy viewport identity. |
| 4 | `lazy-secondary-death-analysis` | L2 | Independent bundle work comes last so its measured delta reflects the final tree. | First-open lazy boundary; immediate verdict/rematch unchanged; focused component tests; DeathScreen chunk delta measured. |

## Session-wide gates

- Keyboard, mouse, controller, and touch paths remain playable and equivalent.
- Player-facing copy expands acronyms on first use and preserves observed-versus-inferred evidence wording.
- No dependency, hosted inference, identity boundary, or variable per-player cost is added.
- `/start`, `/audit`, `/implement`, and `/closeout` remain executable.
- Every rendered change receives desktop/mobile and dark/light browser review before release.
