# Game Loop Review — Session 149

Date: 2026-08-11  
Scope: implementation/design maturity, not participant outcome evidence

No `docs/PLAYTESTS/` directory or recent playtest note exists in this public repository. Scores below therefore describe the shipped loop and its testable contracts; they do not claim retention, balance, or player-satisfaction outcomes.

## Axis Scores

| Axis | Score | Evidence-backed assessment |
|---|---:|---|
| Loop tightness | 9.0/10 | Guest play, escalating combat, safe reward breaks, bosses, a tactical debrief, and reason-coded rematch actions form a strong action-response-reward-repeat chain. The mobile native mode picker is the main first-30-seconds interruption. |
| Progression curve | 8.7/10 | Open arsenal mastery, doctrines, objective mastery, cosmetics, prestige, achievements, and bounded career/run history create depth without pay-to-win power. Front-door progression signals still compete instead of resolving into one next action. |
| Session engagement | 9.2/10 | Heat, formations, dynamic objectives, challenge contracts, mutations, eight modes, bosses, and Sewer Zombies create distinct pressure arcs with readable safe points. |
| Retention hooks | 8.8/10 | Daily/weekly seeds, ghosts, rivalry bounties, REMATCH drills, next-run contracts, Community Stats, and share codes are unusually complete for a local-first browser game. Real participant retention remains unknown. |
| SOUL fidelity | 9.5/10 | Readable chaos, humiliation-to-revenge, improvised doctrine, comedy, and proof-over-posture are all represented in mechanics and truth labels. Remaining emoji fallback props/deaths weaken authored visual identity at the edge, not the core promise. |

Overall design-maturity score: **9.0/10**.

## Prioritized Findings

1. **P0 — Pre-run interaction tax breaks the strongest promise.** HomeV2 still uses a native `<select aria-label="Mobile game mode">`; production synthetic Interaction to Next Paint measured 1,408ms even though the traced JavaScript task peaked at only 13.5ms. The likely browser-native picker path interrupts the promised immediate first thirty seconds.
2. **P1 — “One directive” is enforced by suppression, not synthesis.** FIRST 3 RUNS hides ORDERS and Intel Ticker; after onboarding, ORDERS and Intel Ticker return as separate recommendation surfaces. The player still lacks one adaptive Commander’s Orders contract spanning onboarding, current journey, observed run evidence, and one action.
3. **P2 — Authored visual identity falls off at lower-priority world objects.** Core weapons, enemies, operative art, and high-visibility theme props use proprietary atlases, while remaining decorative props and death animations retain emoji fallbacks. This does not break readability, but it leaves the comedy frame less coherent than the combat systems.

## Recommended Next Three Design Moves

1. Replace the mobile native mode/difficulty selects with accessible, touch-sized button grids that share the desktop selection contract; verify action-to-render and Event Timing receipts on isolated staging.
2. Extract one adaptive Commander’s Orders component and priority resolver that combines first-three-run training, Journey, observed Run Intelligence, and one continuation action without duplicating CTAs.
3. Complete the bounded world-object/death atlas follow-up with fallback and byte/grid contracts intact; preserve Retro as the explicit emoji/original visual pack.
