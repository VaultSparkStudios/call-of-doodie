# Implementation Plan — Session 135

Source: founder-directed Session 135 plan, reconciled against the already-complete
`docs/AUDIT_2026-07-28.json` execution log.

Status: **COMPLETE**

## Efficiency Order

1. **Input lifecycle recovery** — centralize release/reset semantics first because
   every gameplay and terminal transition depends on trustworthy input state.
2. **Run termination state machine** — separate recoverable lethal damage from
   forced terminal outcomes, make terminal completion idempotent, and fail open
   to the debrief even when non-critical receipts fail.
3. **Retro character pack** — route character rendering through a complete pack
   contract after gameplay state is reliable; Modern remains the default.
4. **Cross-surface verification** — focused unit contracts, full suite, strict
   lint, build, asset validation, and real desktop/mobile browser scenarios.
5. **Canonical closeout** — reconcile truth surfaces, score the sprint, run the
   release-quality autopilot, commit, push, clear the lock, and broadcast impact.

## Outcome Contracts

- Lost keyboard, touch, mouse, or gamepad releases cannot leave movement active.
- Gamepad removal clears movement on the same poll before returning.
- Score Attack timeout bypasses Last Stand/Guardian Angel recovery and ends once.
- Normal lethal damage may consume exactly one eligible recovery before a later
  lethal event ends the run exactly once.
- Final debrief navigation is committed before optional storage, telemetry, ghost,
  or highlight work can fail.
- An animation-frame exception cannot silently strand a frozen playable canvas.
- `modern` is the default visual pack; `retro` is an explicit pre-run choice.
- Retro covers the player, all `ENEMY_TYPES`, synthetic shards/summons, bosses,
  dying characters, and skin overlays without changing hitboxes or score rules.
- No paid runtime dependency, new package, or per-user studio cost is introduced.

## Required Evidence

- Unit tests for input release reasons, missing gamepad, terminal idempotency,
  recovery precedence, forced timeout, optional-side-effect failure, visual-pack
  normalization, and full character coverage.
- Browser tests for keyboard blur recovery and Modern/Retro pre-run selection on
  Desktop Chrome and Pixel 7; pure state-machine coverage for controller
  disappearance and Score Attack + Last Stand completion.
- Full `npm test`, `npm run lint:strict`, `npm run build`, and `npm run assets:check`.
- Existing replay, leaderboard eligibility, storage boundary, and public gameplay
  contracts remain green.

## Execution Log

| Outcome | Evidence | Status |
| --- | --- | --- |
| Input lifecycle recovery | Central release receipt wired to blur, page hide, visibility, pause, screen cleanup, controller disappearance, run start, and respawn; `inputLifecycle` + pause contracts | Complete |
| Run termination | Explicit `playing → ending → ended` state machine; timeout bypasses Last Stand and Guardian Angel; terminal UI claimed before optional finalizers; animation-frame fault boundary | Complete |
| Critical-health freeze | Real Chromium run reproduced `ReferenceError: timeNow is not defined`; both unsafe render-clock references now use the frame timestamp; rerun crossed 10 HP and reached the full debrief | Complete |
| Retro pack | Persisted non-default pre-run selector; first-playable circle/emoji renderers; manifest covers player, all current enemy types, synthetic split shards, bosses, dying characters, and cosmetic overlay | Complete |
| Unit + component suite | `130` files / `881` tests passed | Complete |
| Browser parity | New reliability spec passed on Desktop Chrome and Pixel 7 (`4/4`); existing pointer/arsenal scenarios passed (`2/2`) | Complete |
| Quality gates | Strict lint passed; production build passed; 21-asset manifest passed; `git diff --check` clean apart from line-ending notices | Complete |

No new runtime dependency or paid service was added. The Playwright command-line
package used transiently for manual validation passed the package-trust review and
was not added to `package.json` or the lockfile.
