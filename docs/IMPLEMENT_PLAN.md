# Implementation Plan — S177

Session Intent: Complete the authorized arc, direct-main push and verified deployment.

- Wave 1: Startup and prior-closeout verification — complete.
- Wave 2: Complete all five verified audit items in parallel file ownership lanes; focused tests and rendered combat proof — complete.
- Wave 3: Full quality gates, staging deployment, visual inspection, canonical closeout, main push and production verification — complete.

The audit JSON is the execution source. Existing helpers/renderers are reused; no packages or paid services are added. Production promotion follows verified staging. Launch-tier eligibility remains separately measured.

## Mode review follow-through — 2026-09-14

The five original audit items remain implemented; fresh live review adds these required corrections before final closeout.

- [x] Repair throne recovery and explicit six-boss opening/sequence; verify success and failure paths.
- [x] Make Classic Survival (original game) prominent; group other modes, survival challenges and Operations; shared plain-language goals/endings on desktop/mobile.
- [x] Restore visible mode timers and correct misleading mode descriptions.
- [x] Complete focused runtime tests, full quality checks, real input playtests and rendered desktop/mobile/theme review; record exact limitations.
- [x] Canonical closeout, commit/push main, staging-to-production verification.

Production 4eab033d534f verified: CI successful, edge revision matched, public shell 7/7 passed. Desktop Classic reached wave 2; mobile Boss Gauntlet reached a normal death screen. Real keyboard/touch playtests and audio mute/resume passed without browser errors; six production captures were visually inspected.
