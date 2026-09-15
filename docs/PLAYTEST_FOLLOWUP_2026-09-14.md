# Mode and Operation playtest follow-up

Corrective maintenance update following fb6f3ec19767b3ec7f2466ffbf2b2c208e96b40b. Classic Survival remains the original-game entry; other modes and survival challenges retain their grouped, plain-language selection cards.

## Fixes

- Objective victories and losses receive advice tied to their actual outcome. All objective retry paths avoid survival score/wave drills and wave-skipping practice.
- Retrying from a death screen displays the pre-run draft and starts the next run. Operation retries retain the mission and route.
- Operation controls and physical targets avoid generated walls. Escort carts navigate around obstacles.
- SABOTAGE reinforcements start after the previous wave transition; keyboard, touch and controller holds are independent. Controls are inactive behind reward and pause menus.
- HUNT waits for its target to spawn; finales use each authored antagonist; Operation timing uses simulation time and excludes pauses.
- Clearing enemies before finishing the field objective produces bounded reinforcements. Defeating the boss before its required interaction can still complete the mission.

## Verification

- Final application tests: 259 files / 1,612 tests passed. Isolated operational smoke: 27/27 passed. Total final coverage: 260 files / 1,639 tests. Two earlier operational timeouts passed in isolation; they were not ignored.
- Strict lint, deployable build, public contract, repository consistency, security release gate and supply-chain incident scan passed.
- Six complete Operation routes: all three missions on desktop and mobile, all seven encounters each (42 total), zero objective failures and browser errors. All six pause checks passed. Alternate Porcelain Siege and Final Notice runs defeated the boss before the final interaction.
- These full Operation sequences use boosted health, controlled positioning and lethal damage through the real enemy lifecycle. They do not force encounter indices, completion counters, or objective timers. They establish progression correctness, not human difficulty balance.
- Twelve modes received natural keyboard/mouse or touch runs without health/map/combat overrides. Sewer Extraction banked 72 loot; Bot Royale finished first. Other recorded runs ended in normal deaths, including Hold the Throne after two captures and two losses. Separate earlier endurance runs reached wave five in Classic and Zombies.
- Actual desktop/mobile death-to-draft-to-Operation retries retained mission, route and opening encounter, with no attached survival drill.
- 64 retained before/after screenshots cover objective debriefs, expanded replay actions, Operation commands/completions and retries across desktop/mobile and both themes. The hash-bound visual gate passed.
- Audio context mute/resume and live output were measured during natural-input runs. Earlier weapon-bus/clipping evidence remains in the preceding visual/audio receipt.

## Evidence and release scope

- [Visual receipt](visual-qa/LATEST.json)
- [Operation results](visual-qa/operation-followup-2026-09-14/operation-results.json)
- [Natural-input results](visual-qa/operation-followup-2026-09-14/natural-input-results.json)

This is a maintenance correction, not a lifecycle promotion or public-launch announcement. Physical-controller usability, participant feedback and subjective difficulty balance are not established by these automated runs. Rollback uses a normal revert to the fb6f3ec baseline and the existing deployment rollback procedure. The final pushed revision receives CI and production-health verification after staging.
