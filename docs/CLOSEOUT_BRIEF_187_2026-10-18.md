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

- S187 source 40e619d78bc72939366613ce754f8689d508ce4f passed exact-main workflow 39144720337: 296/296 test files, 1,988/1,988 assertions, strict lint, configured build and Cloudflare deployment. Canonical callofdoodie.wtf reports 40e619d78bc7; canonical and immutable https://73a5ea19.call-of-doodie.pages.dev pass shell 7/7 each. Four real-browser cooldown cases pass at 390/1440 in both themes; two desktop/mobile speed and manual/automatic reload cases also pass.

## Remaining

- FORGE/public-unlaunched unchanged. Browser inputs and pickup/ammo states are assisted fixtures. Physical-device/participant/model-token comparisons remain unmeasured. Existing permanent-speed/Kill Frenzy composition remains a separate follow-up; pickup expiry no longer mutates base stats.
- CDR unchanged; no new creative direction. Central scoring/application remains recipient-owned.
