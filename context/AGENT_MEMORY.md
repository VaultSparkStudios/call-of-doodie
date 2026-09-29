# Runtime Maintenance Notes — S179

## S179 public stats and generated-date lesson

- `/stats/` is a dedicated public page and contract-bound route. `public/stats-surface.json` names it; `/stats/` must not redirect to `/board/`. The in-game Community Stats panel, More menu, footer and board all link it.
- The production community feed is an aggregate over all recoverable server history. Last completed run and `checkedAt` are different clocks; 24-hour activity and browser-local observations must be labeled by their actual scopes. Legacy runs lacking shot fields are excluded from accuracy, not counted as misses.
- `scripts/lib/build-date.mjs` derives public content dates from commits touching content paths. A pre-commit build can pass, then the source commit changes the date and causes CI fingerprint/sitemap drift. Regenerate public pages after the content commit and verify the contract before pushing the follow-up; S179's first CI caught exactly this and focused commit `2b4e18e` repaired it.
- S179 verification: 262 test files/1,671 tests, strict lint, deployable build, public contract 29 files, schema/security/supply chain, staging `e01aa752`, 21 directly inspected hash-bound states, exact CI `36618034795`, immutable production `1104bdc2`, canonical edge revision `2b4e18e92fbb`, `/stats/` 200 and live feed 53 runs/39 identifiers. No participant, retention, balance or lifecycle-promotion claim follows.

## S178 gameplay and release recovery

- The Developer boss obstacle transition is simulation-frame based: wall collision, painted arena layers, and flow-field routing change together and restore after 240 frames. A pause must freeze the duration.
- `src/config/perkFacts.js` is the shared authority for all 27 ordinary perk numeric claims and application. Overclocked and Overdrive shot intervals must deliver the advertised cadence; Last Resort triples Dead Man's Hand damage.
- Gameplay source `237003e88841` passed CI and deployed to immutable `773a1f58` and the canonical domain. The S178 closeout records were recovered separately; do not treat a source deploy as proof that writeback was committed.
- The aggregate stats feed exists but `/stats` is absent. Restore an honest, analyzed public page before claiming CANON-054 conformance. Studio Ops startup protocol script propagation broke project-specific exports; retain the compatible local scripts until upstream repair is verified.
- A stale generated Hot Context hash makes `tests/hot-context.test.js` fail after closeout edits. Regenerate with `npm run context:hot`, then rerun the suite. S178 recovery passed 261 files and 1,668 tests.

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
