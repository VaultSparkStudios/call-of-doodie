# Release promotion protocol

Founder direction, 2026-10-07: apply this studio-wide to production promotion. It supersedes the historical five-workflow CI window and any inferred Obelisk-owner deployment approval.

## Routine staging → production

The project release owner deploys the authorized candidate. Verify:

1. Exact candidate source and a declared required-check contract. `.github/RELEASE_CHECKS.json` lists `requiredWorkflows` as workflow paths. `node scripts/check-release-candidate.mjs --project . --sha HEAD --json` observes only those workflows at that commit. Other commits/workflows remain diagnostic evidence, not promotion vetoes.
2. Passing required candidate checks in either the hosted lane or a policy-approved, signed, isolated, exact-SHA independent runner. Missing/path-filtered hosted runs or verified zero-step budget rejections may use the independent lane. An executed failure, pending run, unknown/truncated observation, stale proof, wrong SHA or incomplete required-check coverage is nonpassing. A successful rerun supersedes its earlier attempt. Do not manufacture runs to clear history. Projects without the shared checker use equivalent project-native evidence with the same scope and honesty requirements; absence of the new file alone does not create a new rollout blocker.
3. Current staging smoke and artifact/configuration parity, isolated data/credentials, relevant behavior/access regression checks, secrets scan, rollback and production readback.
4. Existing bounded founder deployment authorization. Do not ask again for the same authorized promotion. Public launch, SPARKED transitions, new spending, destructive operations and security/trust-policy changes retain their distinct approvals.

## Identity and ownership

The **project is the relying party**; **Obelisk is the identity provider**. Obelisk is not a separate production deployment approver. No signed Obelisk-owner receipt, new synthetic operator, new registration or native login ceremony is required solely because an unchanged, already integrated surface is promoted.

Keep fail-closed authentication, stable operator policies and the existing integration intact. Existing protected surfaces require applicable local/runtime access regression checks. First launch of an account-bearing surface, changes to authentication/session/authorization code, new origins/clients or changed trust/allowlist policy require the affected authenticated journeys and integration evidence. The project owns that verification. Coordinate with Obelisk when its service/configuration must change or its capability is actually needed; a signed cross-repo handoff proves ownership/transport, not general deployment permission. A live denial alone proves the auth wall, not positive authenticated application behavior.

## Rollout and completion

Studio Ops owns canonical source, installed skill parity and signed versioned Ark/queued delivery. Recipient project agents apply and verify in their own checkouts. Sent, received, applied and verified remain distinct; do not write sibling files or claim fleet adoption from queueing. Ordinary deployment and a public/lifecycle launch are separate actions.
