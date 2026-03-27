# Creative Direction Record

Use this as the additive ledger of human-guided creative direction for Call of
Doodie. Backfilled entries below are reconstructed from the existing project
brief, README, AGENTS notes, and session handoffs.

### 2026-03-12 - Commit to comedy-first arcade identity

- Area: overall product identity
- Human decision or guidance: the project should lead with humor and absurdity, not simulate serious military combat
- Previous state: arcade shooter foundation with parody framing
- New required direction: preserve comedy as the leading taste filter for enemies, weapons, perks, and UI language
- Why this matters: this is the core differentiator and the reason the project is memorable
- Impact on canon / brand / production: future systems and content should reinforce comedic run stories
- Approval source: existing `context/PROJECT_BRIEF.md` design pillars and repo positioning
- Evidence link or reference: `context/PROJECT_BRIEF.md`, `README.md`
- Supersedes prior entry: none

### 2026-03-18 - Preserve low-asset handcrafted feel

- Area: audio and presentation
- Human decision or guidance: keep the game lightweight and handmade, including synthesized audio instead of licensed sound packs
- Previous state: zero-audio-file runtime sound strategy already in place
- New required direction: treat handcrafted feedback as part of the identity, not just an implementation shortcut
- Why this matters: it supports originality, repo simplicity, and brand personality
- Impact on canon / brand / production: future additions should favor original VaultSpark-made assets or clearly documented provenance
- Approval source: architecture notes and repository implementation strategy
- Evidence link or reference: `AGENTS.md`, `README.md`, `context/DECISIONS.md`
- Supersedes prior entry: none

### 2026-03-20 - Push challenge, rivalry, and shareability as a growth vector

- Area: product direction
- Human decision or guidance: challenge links, seeded runs, ghost comparison, and social score-sharing should become part of the game's identity
- Previous state: isolated score and run systems
- New required direction: treat rivalry and remixability as first-class product strengths
- Why this matters: this raises replayability and gives the project a strong viral loop
- Impact on canon / brand / production: future feature prioritization should favor competitive sharing and creator-friendly moments
- Approval source: shipped challenge-link and ghost-mode feature direction
- Evidence link or reference: `context/CURRENT_STATE.md`, `context/TASK_BOARD.md`, `context/LATEST_HANDOFF.md`
- Supersedes prior entry: none

### 2026-03-27 - Cosmetic-only monetization via Ko-fi; no pay-to-win

- Area: monetization + product identity
- Human decision or guidance: focus the session on monetization as a failing audit area; the direction was explicitly cosmetic-only (badge, title) with Ko-fi as the payment channel — not Stripe, not in-game currency, no gameplay advantage
- Previous state: no monetization path
- New required direction: any supporter/monetization features must be cosmetic-only; the ⭐ badge is a recognition layer, not a gameplay advantage; "100% cosmetic. No pay-to-win." is the official product copy
- Why this matters: preserves the humor-first, community-positive identity; pay-to-win would directly contradict the project's brand and player trust
- Impact on canon / brand / production: future monetization features (e.g. cosmetic skins, title packs) should follow this pattern; any feature that grants gameplay advantage is off-limits
- Approval source: user session directive (Session 28); copy written in `SupporterModal.jsx` confirms the intent
- Evidence link or reference: `src/components/SupporterModal.jsx`, `context/LATEST_HANDOFF.md` Session 28
- Supersedes prior entry: none
