# Launch Execution

Public-safe launch execution package for Call of Doodie.

## Current gate

Terminal-verifiable launch QA is already in place:

- `npm run launch:smoke` validates username -> menu -> draft -> game startup
- `npm run health:check` validates the live Edge Function matrix
- `npm run live:site-check` validates the deployed shell, manifest, service worker, and OG asset
- `npm run launch:verify` runs all three in sequence

The remaining launch blockers are now execution-only:

- one real mobile/browser PWA install pass
- one real gamepad/browser pass
- screenshots
- publishing the store/distribution surfaces

## Launch decision

PostHog and Sentry are explicit post-launch follow-up items, not launch gates.

Reasoning:

- the current launch risk is distribution readiness and device QA, not missing telemetry plumbing
- live backend and shell verification are already covered by repeatable scripts
- adding telemetry keys now would not remove the current blockers

## Itch.io listing package

Recommended page title:

`Call of Doodie`

Short description:

`A comedy-first browser shooter with absurd weapons, chaotic perks, daily runs, and leaderboard chasing.`

Primary call-to-action:

`Play instantly in your browser: https://vaultsparkstudios.com/call-of-doodie/`

Suggested body copy:

> Call of Doodie is a fast, ridiculous top-down arcade shooter built for short runs and replayable chaos.
> 
> Survive waves of absurd enemies, stack run-defining perks, and push your score across multiple challenge modes including Daily Challenge, Boss Rush, Speedrun, and Gauntlet.
> 
> Features:
> - 12 weapons
> - 22 enemy types including bosses and hazards
> - roguelite perk builds, starter loadouts, and weapon synergies
> - global leaderboard, achievements, and meta progression
> - desktop, mobile, and gamepad support
> - installable PWA
> 
> Play free:
> https://vaultsparkstudios.com/call-of-doodie/

## Screenshot shot list

Capture these in order:

1. moment-to-moment combat with dense enemy pressure
2. boss intro or boss fight card
3. perk or shop selection with readable choices
4. death screen with score and summary
5. leaderboard view
6. optional mobile or gamepad play shot if available

## Launch channel sequence

Recommended order:

1. confirm site visibility and game hub placement
2. publish the Itch.io page using the copy above
3. upload 4-6 screenshots
4. run `npm run launch:verify` once more before announcement
5. post the launch link to studio-owned channels

## Residual human checklist

- verify real PWA install acceptance on one mobile/browser combination
- verify one real gamepad/browser combination end-to-end
- capture and upload screenshots
- publish the Itch.io listing
- manually spot-check any other app sharing the `leaderboard` table
