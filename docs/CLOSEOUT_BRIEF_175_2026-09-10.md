# Closeout Brief - Session 175 - 2026-09-10

Headline: Audited the player-facing claims instead of the gates, and found the game had been publishing two different BOT ROYALE bot counts at the same time since S165 - across four live surfaces, with every gate green throughout.

## Shipped

| Item | Project Impact | Ecosystem Impact | Evidence |
|---|---:|---:|---|
| Royale bot-count drift closed at the root: modeFacts.js is now the single derived authority for every number quoted in both mode code and mode copy | 9 | 6 | BOT_COUNT=16 since S165 vs 'twelve' in modeCatalog blurb+description, fieldManual sec.5, and public/gameplay-contract.json; all now composed from BOT_ROYALE_BOT_COUNT; 13-case court asserts facts against real runtime behavior |
| check-public-claims.mjs extended to the mode-fact class, and to the GENERATED public artifacts that no test or gate had ever read | 8 | 7 | failed on first run against the stale public/gameplay-contract.json, then passed after regeneration - catch proven, not asserted; dated changelog entries deliberately excluded and documented in the gate |
| Fact pattern generalized past mode prose: QUICK_RULES 'Boss every 5 waves' and modeRules boss.interval now derive from one constant | 6 | 5 | asserted behaviorally - isBossWaveForMode('standard', N) true at the promised wave and false one wave earlier, not merely structural equality |
| S174's genome-ledger commitment honoured by measurement: check-genome-ledger.mjs fails on any new duplicate, gap, or reversed label | 7 | 8 | duplicates S123/S162 traced to the control-plane writer's (date, session) upsert key; four snapshots missing entirely (S164/165/171/172); 11-case court; wired into schema:lint and protocol-drift-check |
| Two claims inherited from S174 corrected as unsupported rather than implemented against | 5 | 8 | all 50 genome labels are monotonically non-decreasing (no 'out-of-order'); the 'S166 carrying S167 prose' case is shared by 24 of 50 rows because overallStatus legitimately persists - a gate on it would fire on half the file |

## Validation

- Full Vitest 245/245 files, 1,490/1,490 assertions (+2 files, +24 from baseline 243/1,466 captured before any edit)
- 15/15 static gates green with exit codes captured directly, never through a masking pipe
- npm run build, build:deployable, and the security release gate all green
- App chunk 469.06 -> 469.46 KB (+0.40 KB for the shared authority module), far under the 560 KB runtime gate
- No gameplay, balance, or difficulty behavior changed - only the numbers the game states about itself
- check-closeout-artifact-currency and check-genome-ledger both green after the section 3.7 renderers ran

## Remaining

- Sweep the arsenal/bestiary copy against constants.js - the same fact pattern, not yet applied there
- [ARK] Confirm vaultspark-studio-ops actioned the genome-writer cargo, then retire the matching ACCEPTED_HISTORICAL_DEFECTS entries by repair rather than by waiver
- objectiveHandlers.js gameplay-completion cutover remains deliberately unshipped for a fourth session on launch-risk grounds - but S173 gave it 31 tests, so a founder-supervised session now has real regression cover

## Blockers

- Honesty ledger: this session shipped a corrected claim, not new play. Engagement scored 98, not 100.
- Honesty ledger: the genome duplicates and the four missing snapshots were NOT repaired. Back-filling them would fabricate closeouts that never ran, so they are declared as visible dated debt instead.
- Honesty ledger: the genome writer's root cause lives in vaultspark-studio-ops. This repo's gate can detect a new duplicate but cannot prevent one.
- Honesty ledger: two candidate findings were discarded during the audit for failing premise verification. Discarding them was the right outcome, not a shortfall.
- SPARKED remains NO-GO - unchanged this session; participant, provider, device, publication and lifecycle evidence all still gated.
