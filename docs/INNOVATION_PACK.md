<!-- generated-by: /arc Session 127 compound refinement pass -->
<!-- generated-at: 2026-07-22 -->

# Innovation Pack — Call-Of-Doodie

> Code-derived second-order candidates generated after the Session 127 primary audit was fully implemented.

## Implemented candidates

1. **Edge handler single dispatch — SHIPPED.** The generic Cloudflare Pages handler now routes GET through the typed health response and rejects other methods, removing ambiguity between `onRequest` and `onRequestGet` exports.
2. **Pre-mount service-worker lifecycle latch — SHIPPED.** Registration receipts are latched on `window` as well as emitted, so Home cannot miss success/failure/update evidence that fired before it mounted.
3. **Same-surface storage recovery — SHIPPED.** A successful settings write can no longer mask an active progression-write failure; recovery clears only the matching sanitized surface.
4. **Replayed-training evidence reset — SHIPPED.** Starting a run after `REPLAY TRAINING` clears stale observed-action evidence so the tutorial cannot instantly auto-complete from an earlier run.
5. **Lazy-chunk reload-loop guard — SHIPPED.** Panel recovery allows one reload per minute and then fails visibly rather than trapping the player in a repeated stale-chunk reload loop.

## Verified non-candidates / honest deferrals

- Analytics, Sentry project scope, and provider dashboard allowlists remain credential-gated (`analytics` capability MISSING).
- HomeV2 retirement remains gated on real production Lighthouse and funnel evidence.
- Physical Progressive Web App (PWA), controller, and full-run media evidence require real-device observation.
- Supabase membership, community publication, and launch approval remain product/founder decisions.
- Simultaneous reward-modal overlap was a false premise: the existing reward plan already serializes perk, mutation, and shop surfaces.

## Saturation evidence

Primary audit: 5/5 L3 items shipped. Second-order pass: 5/5 candidates shipped. Focused regression set: 38/38. Full suite: 721/721 across 98 files. Context meter: CONTINUE.
