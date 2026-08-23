# Game Loop Review — Session 159

No consented participant corpus exists under `docs/PLAYTESTS/`. These scores describe executable design structure, not measured fun, balance, satisfaction, or retention.

| Axis | Score | Evidence-bound assessment |
|---|---:|---|
| Loop tightness | 8.6/10 | Combat, reward, defeat coaching, and rematch are tight; Operation actions can currently be triggered away from their authored world targets. |
| Progression curve | 8.7/10 | Mastery and route continuity are broad and non-pay-to-win, but the Operation score is largely fixed by route rather than performance. |
| Session engagement | 8.2/10 | Seven verbs and escalating pressure give the run shape; the spatial and scoring contracts do not yet carry the authored promise. |
| Retention hooks | 8.3/10 | Seeds, ghosts, coaching, receipts, and rematches are strong; Operation rivalry needs meaningful local skill variance. |
| Soul fidelity | 9.1/10 | Guest-first play, comic readability, and evidence labels align strongly; remote interactions and overstated tempo scoring weaken proof over posture. |

Overall structural score: **8.6/10**.

## Prioritized findings

1. **Operation interaction space is metadata, not authority.** Arena targets own positions and interaction radii, while the live hook accepts the exact command without checking player distance.
2. **Operation scoring is effectively route-predetermined.** Fixed encounter values and a fixed route multiplier ignore elapsed tempo, reinforcements, and extraction completion even though public copy promises those ingredients.
3. **Mission Director depth is tested but dormant.** The pure director accepts build, recent-damage, objective-history, and score-pace signals that live callers omit.
4. **Route tradeoffs are hidden until after commitment.** The director applies pressure or score consequences, while the Command Deck presents route names without those fixed effects.

## Next three design moves

1. Spatialize objective interactions with an exact range contract shared by keyboard, controller, and touch.
2. Ship a versioned, visible Operation score breakdown derived from bounded local evidence.
3. Activate reason-coded director signals and show fixed route consequences before the player commits.
