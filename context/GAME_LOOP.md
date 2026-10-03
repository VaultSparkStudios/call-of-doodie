# Game Loop

The public gameplay summary lives in `docs/GAME_LOOP.md`. These three grammars define the current player experience.

## Player promise

Drop into a browser arena in seconds, read the danger, improvise a ridiculous run, and turn defeat into an observed lesson plus an immediate rematch. Guest play is the default; payment and accounts do not buy combat power.

## Classic: survive and improvise

- Choose a difficulty, starter loadout, and optional seed.
- Move, aim, shoot, dash, grenade, and switch weapons under escalating wave pressure.
- Keep ordinary wave transitions moving. Offer one sparse, skippable checkpoint every four waves.
- Avoid recurring draft screens, route selections, and mutation chains. Manual pause remains available.
- Defeat bosses, survive, inspect the result, and rematch.

## Operations: execute the mission

- Choose one of three authored missions and one of two disclosed deployment routes.
- Use mission-owned cover geometry, insertion points, escort paths, and extraction positions.
- Execute BREACH → HOLD → ESCORT → HUNT → SABOTAGE → ESCAPE → BOSS through their actual field tasks.
- Replenish small bounded patrols during tasks. Advance on task completion even with guards alive; never require a kill-all wave gate.
- Treat nearby support interactions as optional assistance, rather than a second mandatory objective.
- Transition continuously with field supplies and compact orders, without perk, shop, or wave pause screens.
- Preserve local objective, interaction, tempo, pressure, extraction, and route receipts; continue or rematch from the command deck.

## Sewer Zombies: fuel and escape

- Enter a mode-owned sewer with a four-minute flood deadline.
- Kill creatures for sludge, then occupy each of three pump rings for six seconds with fuel available.
- Clear contesting creatures from rings; powered pumps restore health directly.
- After all three pumps are online, hold the uncontested hatch for five seconds to escape.
- Use five distinct animated creature threats with readable comic windups, lunges, burps, and screams.
- Keep the outbreak continuous: no perk drafts, shops, or wave pauses.

## Feedback and progression

Threat telegraphs, objective indicators, input-aware controls, and mode-specific music support readable decisions. Career points, achievements, daily missions, weapon mastery, local ghosts, shared seeds, and bounded history carry experimentation between runs.

Post-run observed evidence remains separate from coaching hypotheses. Accepted corrective orders carry a baseline into the next run and preserve deduplicated outcome evidence.

## Evidence boundaries

Operations scores, campaign continuity, rivals, playtest receipts, coaching, and corrective orders remain local and advisory unless explicitly labelled otherwise. Standard leaderboard submissions retain their existing eligibility path; an Operation receipt does not establish that authority. Sewer Zombies is not replay eligible.

Two improved outcomes among the latest three valid receipts for the same order support a repeated-improvement label, not a causal or mastery claim. Full deterministic replay physics parity remains unproven. Participant fun, balance, comprehension, retention, physical-device behavior, and release readiness require direct evidence.

## Runtime sources

- Gameplay and presentation: `src/App.jsx`, `src/drawGame.js`.
- Operations: `src/hooks/useOperationMode.js`, `src/systems/operationBattlefield.js`, `src/systems/operationRuntimeRules.js`, `src/systems/operationScore.js`.
- Sewer Zombies: `src/modes/sewerZombies.js`, `src/systems/zombieMode.js`, `src/systems/zombieRenderer.js`.
- Music: `src/audio/scoreComposer.js`, `src/audio/scoreSynth.js`.
