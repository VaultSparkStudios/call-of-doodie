---
project: call-of-doodie
coAuthoringRole: implementer
posture: phase-0-declared
lastReviewed: 2026-05-26
---

# Obelisk Adoption

Call of Doodie should treat Obelisk as the trust posture for future player accounts, not as a custom authentication replacement.

## Current State

- Player identity is callsign plus local anonymous UUID.
- Supabase Auth support exists server-side in score submission paths, but no public sign-in UI is wired.
- No privileged MCP, payment, or raw secret flow is exposed to players.

## Target Account Posture

- Supabase Auth remains the practical game account provider for magic-link and OAuth sign-in.
- Obelisk wraps the account flow as a trust layer: passkey-first posture when Studio-wide identity is ready, signed intent receipts for account migration and callsign claim, and capability-scoped server actions.
- Guest play remains available and cost-neutral.

## Implementation Notes

- Do not market Obelisk as "unhackable" or "quantum-proof"; approved posture is migration-ready.
- Never put raw secrets in the browser or agent prompts.
- Add account migration receipts before copying anonymous leaderboard/progress rows into authenticated user ownership.
