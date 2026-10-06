# Stage-directed audits and implementation

Founder direction, S363: project audits and implementation plans must partly follow current project stage and status. Public-beta work should concentrate on launch hardening and readiness across the applicable areas.

## Resolve the work focus

Run `node scripts/lib/skill-profile.mjs <arc|start|audit|implement|go|closeout>` locally. The shared resolver combines the medium profile with live lifecycle evidence. `ladderStage` in the Studio registry is authoritative; local `PROJECT_STATUS.json` supplies current health and an optional `releaseTarget: public-beta` planning intent. If no registry stage exists, a valid local stage is a labelled fallback. Missing, invalid or conflicting evidence must be surfaced; do not guess from a URL, `vaultStatus`, or descriptive `developmentPhase`. Source changes invalidate the profile cache immediately.

| Lifecycle | Work focus |
|---|---|
| F0 concept | Validate core value and feasibility within the requested scope. |
| F1 building | Build core value and working journeys. An explicit public-beta target adds readiness preparation. |
| F2 preview, public audience | Prepare beta: close demonstrated user-facing readiness gaps before speculative breadth. |
| FB beta, legacy SB | Harden the public beta; use real feedback, reliability and failure evidence. |
| F3 candidate, legacy S0 | Close release acceptance gaps and verify the exact candidate. |
| S1/S2 supported release | Protect users, fix regressions, operate support, improve measured outcomes. A separate beta track does not relabel the stable release. |
| V0/V1 | Respect paused/archive scope; no implicit revival or launch campaign. |
| Internal infrastructure | Use operator/product/identity/operations acceptance. Public marketing is not applicable with a named reason. |

Lifecycle selects priorities; it does not authorize a transition, public promise, publication, spending or extra work. All existing release gates remain in force. Public beta remains FORGE/FB under current CANON-052, and entering beta still needs founder GO.

## Readiness coverage for beta preparation, beta and release candidates

Audit every applicable area, retaining medium-specific checks (game loop, novel continuity, media rights/export, mobile/native parity). Web requirements apply to actual web surfaces.

| Area | Acceptance evidence to seek |
|---|---|
| Core product | Intended first-use and repeat-use journeys, correctness, saving/reloading, empty/error/retry states; genre-specific core loop. |
| Onboarding and identity | New/returning users, sign-in/out, recovery, permissions, account/session boundaries, human and agent identities where supported. |
| Accessibility and presentation | Keyboard/focus/readability, desktop/mobile/native parity, every theme and touched state; rendered-pixel receipts where required. |
| Performance and capacity | Relevant load/startup/render measurements, slow connections, resource limits and free-tier cost behavior. |
| Security and data | Applicable security review, access isolation, secret handling, privacy/retention, integrity, abuse/rate limits. Do not silently change policy. |
| Recovery and operations | Backups and restore evidence where data persists, rollback, failed deploy behavior, dependency failure and operator ownership. |
| Email and notifications | Real delivery and reply paths, transactional journeys and unsubscribe/consent when used. |
| Observability and analytics | Actionable errors/alerts, release/source binding, user-journey analytics and truthful public stats where required. |
| Feedback and support | Easy feedback/reporting, triage ownership, response path, known issues and reproducible defects. |
| Identity, legal and rights | Branding/contact, legal pages/proprietary notices, media/content provenance and permissions. |
| Agent access | Applicable discovery, machine-readable docs, API/MCP journeys, scoped credentials and parity with supported human features. |
| Release and communication | Exact candidate staged and verified, acceptance receipt, rollback, honest provisional label/known limits, beta outreach or stable announcement under the applicable contract. |

For each area record `pass`, `fail`, `partial`, `unknown`, `stale`, `not-applicable` or `exempt`, with evidence/source revision, observation time, owner and next acceptance check. `not-applicable` and `exempt` need reasons; unknown is not passing. These assessment states do not replace the stricter canonical release-receipt schema.

## Audit and execution contract

The audit sidecar records `lifecycleFocus` (stage, source, health, release target, mode), `readinessAssessment[]`, and per-item `readinessArea`, stage rationale and concrete acceptance evidence. Assess coverage without manufacturing one task per area. A passing area needs no repair task. Rank verified security/data/core-journey failures and launch dependencies before speculative features; retain features necessary to deliver beta value. Health problems sharpen stabilization priority, not a claim that the entire project failed.

The implementation plan re-reads live stage/status, selects only authorized outcomes, places prerequisite repairs before release proof, and names the exact acceptance check for each. A stage/status change triggers an explicit plan review, not automatic scope expansion. Full `/arc` covers the applicable readiness matrix; a bounded task uses the relevant areas only. The stop condition remains completion of the selected outcomes.

Closeout reports proved readiness, remaining gaps, actual release source/deployment and owner follow-ups. Do not convert completed code, delivered Ark cargo, a green narrow test or a finished arc into a claim of launch readiness. Rollout uses recipient-owned propagation and evidence; sent, received, applied and verified remain separate.
