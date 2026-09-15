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
