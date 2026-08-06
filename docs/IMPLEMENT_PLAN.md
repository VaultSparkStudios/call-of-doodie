# Implementation Plan — 2026-08-05

Source: `docs/AUDIT_2026-08-05.json` (Session 141)

## Efficiency order

1. **Canonical session reference** — establish one recovery-aware parser, then route both truth surfaces through it.
2. **Current State idempotence court** — reuse the session semantics to remove and prevent repeated contiguous session blocks.
3. **Input arbitration kernel** — extract the highest-risk live frame slice after the protocol courts are stable, preserving every input precedence rule.

## Verification gates

- Focused session-reference and Current State coherence tests.
- Startup brief render, last-session-summary check, Hot Context freshness, startup acceptance, and protocol drift.
- Focused game-step, pointer, controller, and input-retro reliability tests.
- Architecture receipt must increase total-line and game-loop-span headroom.
- Strict lint, production build, full suite, release/security courts, isolated staging, and live production smoke before completion.

## Completion rule

An item is shipped only when its behavior and named verification surface both pass. Partial work is marked blocked with evidence; external SPARKED gates remain explicit and are not laundered into this implementation.
