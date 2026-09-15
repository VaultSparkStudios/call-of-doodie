# Runtime Maintenance Notes — S177

- Shared meta facts now drive descriptions and runtime; Hair Trigger delivers exactly +10% shots and Scavenger II exactly +125% range. Loadout, score and Kill Frenzy modifiers compose.
- Supply Drop grants one free coin-shop offer per wave, Gauntlet Ready supplies its opening extra perk, and Mutation Affinity scales favorable weekly bonuses.
- Weekly XP, pickup chance, projectile speed and magnet range now have live consumers. Jackpot XP excludes the separate weekly score multiplier.
- Clone Decoy is a finite visual-only ghost; Lifesteal heals live bosses only after actual enemy bullet damage. Zero-damage projectiles stay harmless.
- Speed Surge uses simulation frames; enrages persist; Algorithm volleys and shared ability cooldown staggering follow the authored behavior.
- Startup brief currency now checks the completed-session fingerprint and rejects a misleading next-session title.

- Meta facts live in src/config/upgradeFacts.js; weekly runtime factors live in src/config/weeklyMutationRuntime.js.
- Browser combat fixtures must complete the pre-deployment draft before waiting for the canvas. Both character styles are supported.
- Startup Brief currency measures silSession, not the next-session headline.

### S177 mode follow-through

- ModePicker shares full descriptions; standard remains the replay ID for Classic Survival.
- Boss Gauntlet has a singleBoss plan callback at startup and later waves. Boss effects must use combatRuntimeRef.current.retainLastMatchingInPlace.
- initGame resets frameCountRef; repeated runs must be tested on the same page.
- Throne retake notices use ctx.announce for viewport fitting.
- Test IDs come from modeCatalog; glass_cannon is a random modifier, not a selectable mode. Capture console GAME LOOP errors as well as pageerror.


### S177 final follow-through — 2026-09-15

- Render draftPending independently of screen=menu; death-screen replay must reach draft and redeploy. Objective modes never receive generic survival drill launches.
- Operation objective starts during respite must not mutate waveRemaining; sabotage surge waits for active simulation. Killing a boss before its field interaction must permit the later interaction to finish.
- Use safe arena placement for controls and physical targets. Escort flow uses cart clearance and cardinal movement, verified against real arena walls.
- Store keyboard/touch/controller held sources separately and combine them; a released source cannot cancel another held source.
- Natural play and assisted authored-route completion are different receipts. Retain the aid list; never infer participant balance from forced health/damage/position.
- Final gameplay proof: 65f983937142, workflow 34926899773, 260 files/1639 tests; staging f04e0cf1, production 7cb07a99. docs/PLAYTEST_FOLLOWUP_2026-09-14.md and docs/visual-qa/LATEST.json hold durable evidence.
