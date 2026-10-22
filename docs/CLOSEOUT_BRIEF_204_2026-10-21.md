# Closeout Brief - Session 204 - 2026-10-21

Headline: A written audit found a service worker replaying account reads and a perk that shrank your refill; both are fixed and live.

## Shipped

| Item | Project Impact | Ecosystem Impact | Evidence |
|---|---:|---:|---|
| Service worker stops caching /api, checks origins exactly | 8 | 2 | cod-v7. Real-Chrome probe on staging and production: /api reads never stored, every read hits the network. 4 of 5 new tests fail without the fix. |
| Edge functions answer malformed bodies with 400/413, not leaky 500s | 6 | 2 | Probed live before (500 with TypeError text) and after (400 Invalid JSON body.). validate-replay capped at 32 KB with a bounded anomaly payload. Deployed to project fjnpzjjyhnpmunfoycrp. |
| Scavenger and Bullet Hose keep the full held-weapon refill | 6 | 1 | Empty held weapon got +39% with the perk versus 100% without. New systems/ammoPickup.js with 4 tests. |
| Rematch drill wave sized with double_trouble | 4 | 1 | Wave 7 drill was 26 enemies; the run that killed the player had 52. |
| Local full suite green (session-lock fixture budget) | 3 | 1 | Fixture needs 30.8s of real spawns against a 30s default; per-test 120s budget. |

## Validation

- Local 306/306 files, 2158/2158 tests; strict lint and build exit 0.
- Independent reviewer: approve, nits applied. Staging gate in real Chrome before main.
- Exact-main workflow 39704083013 success; production health 56dcd791b890; live check 7/7.

## Remaining

- Measure drawGame.js frame cost with a CDP trace before hoisting allocations (audit item 5, deferred).
- Decide whether validate-replay should fail closed when its rate-limit RPC throws.
- Native privacy-browser, physical-device and participant evidence remain open.

## Blockers

- submit-score has 7 pre-existing strict Deno type errors; deploys succeed regardless.
