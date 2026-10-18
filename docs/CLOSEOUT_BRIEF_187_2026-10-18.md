# Closeout Brief - Session 187 - 2026-10-18

Headline: S187 fixes paused ability recharge, speed-pickup stat corruption, ignored reload preference and missing startup sync.

## Shipped

| Item | Project Impact | Ecosystem Impact | Evidence |
|---|---:|---:|---|
| Restore recipient-local startup synchronization | 8 | 1 | Recipient startup sync and five compatible libraries are restored. Four tests prove local remote pull, script-root identity, WIP preservation and conflict detection; executable ASTs match the canonical source. |
| Keep dash and grenade cooldowns on simulation time | 8 | 1 | Dash and grenade recharge on active simulation frames. Frozen-state tests, exact durations, modifiers, instant readiness grants and run isolation pass; wall-clock callbacks are removed. |
| Expire speed pickups without corrupting permanent speed | 8 | 1 | Speed pickups use independent 300-active-frame durations and an additive movement bonus. Expiry preserves permanent base stats, stacked pickups and speed caps without mutating a rematch. |
| Honor manual reload preference on an emptied magazine | 8 | 1 | Empty-magazine automatic reload honors the saved preference. Actual-App tests and desktop/mobile browser checks preserve manual reload and automatic reload; the forced Overclocked reload test also passes. |

## Validation

- Local full suite: 296/296 files and 1988/1988 tests pass. Strict lint, configured build, public contracts, dependency security (zero vulnerabilities), scoped supply-chain scan and independent review pass. Final staging https://107df7f2.call-of-doodie.pages.dev passes shell 7/7, four cooldown theme/width cases and two speed/reload browser cases. Exact-main hosted checks and production verification follow the push.

## Remaining

- FORGE/public-unlaunched unchanged. Physical controllers, participant comparisons and target-device/model-token measurements remain unmeasured. Existing permanent-speed/Kill Frenzy composition is outside this pickup-expiry repair. Browser input and speed/ammo fixtures are assisted; no natural full-run claim.
- Exact-main CI and production verification pending. CDR unchanged without new creative direction.
