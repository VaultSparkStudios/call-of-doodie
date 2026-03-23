# Systems

## Core systems

- Combat loop: player movement, aiming, firing, enemy pressure, drops, and death
- Progression loop: XP, level-ups, perks, cursed perks, starter loadouts, and meta upgrades
- Session modifiers: difficulty, normal mode, score attack, daily challenge, ghost challenge
- Social loop: leaderboard, challenge links, score comparison, shareable runs

## System interactions

- Enemy pacing, weapon scaling, and perk stacking shape run tempo together
- Mode logic changes scoring and leaderboard segmentation
- Seeded runs and challenge links connect replayability to social competition

## Fragile areas

- Large orchestrator size in `src/App.jsx`
- Mode-specific state coupling around timers, seeds, and challenge state
- Any changes to scoring or spawns can affect feel, balance, and leaderboard trust
