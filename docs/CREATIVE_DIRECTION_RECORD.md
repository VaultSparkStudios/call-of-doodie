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

### 2026-03-30 - Prepare the game for a marketing push with real audit follow-through

- Area: launch-readiness / marketing / security
- Human decision or guidance: analyze the game for improvements, refinements, and security issues, then prepare it for a marketing push
- Previous state: live game with good feature depth but stale marketing metadata and unresolved correctness/security follow-up items
- New required direction: prioritize fixes that improve public presentation, trust, and first-contact conversion instead of only adding more content
- Why this matters: a marketing push amplifies the rough edges too; correctness, metadata, and credibility issues need to be reduced before traffic increases
- Impact on canon / brand / production: launch-facing work should favor accurate positioning, stronger share surfaces, and cleaner integrity paths
- Approval source: user session directive
- Evidence link or reference: Session 30 request in terminal; `index.html`, `README.md`, `src/storage.js`
- Supersedes prior entry: none

### 2026-04-01 - Music vibes must be audibly distinct; reactive override was too aggressive

- Area: audio / player experience
- Human decision or guidance: "The 'chill' and 'intense' music modes seem to be the same as action now — add more music variety"
- Previous state: reactive combo override fired at 2 kills (tier 1) and 5 kills (tier 2), meaning chill was overridden to action almost immediately and intense was overridden to intense (from action) within seconds of any active play
- New required direction: music vibe selection should be meaningful and perceptible to the player for the majority of a normal run; escalation thresholds must be high enough that the player can actually hear the chosen vibe
- Why this matters: the chill and intense settings exist to let players control the feel of their run; if they're immediately masked by the reactive system, the feature is effectively broken and the game feels like it has one music setting
- Impact on canon / brand / production: combo thresholds raised to 8/15 kills; chill/intense override logic refined so only chill→action at tier 1 and chill/action→intense at tier 2; future music/reactive changes should be tested with normal-pace play, not max-combo scenarios
- Approval source: user report in terminal (Session 33)
- Evidence link or reference: `src/sounds.js` lines 568–577; `src/App.jsx` combo threshold update
- Supersedes prior entry: none

### 2026-04-01 - Last words input text must be white, not pink

- Area: UI / visual quality
- Human decision or guidance: "the last words text entry should be white text, not pink"
- Previous state: `DeathScreen.jsx` last words `<input>` had `color: "#FF69B4"` (hot pink)
- New required direction: last words text input must use white text for readability; pink is not appropriate for a text entry field in this UI context
- Why this matters: pink text on a dark input background is harder to read and feels unintentional / inconsistent with the rest of the death screen
- Impact on canon / brand / production: `color: "#FF69B4"` → `color: "#FFF"` in `DeathScreen.jsx`; any future text input fields should default to white unless a deliberate accent color is being applied
- Approval source: user report in terminal (Session 33)
- Evidence link or reference: `src/components/DeathScreen.jsx` line 494
- Supersedes prior entry: none

### 2026-03-30 - Finish the security pass and reduce the next-task list to true launch blockers

- Area: launch execution / security / process hygiene
- Human decision or guidance: implement all needed security updates and finish the needed next task list after updating memory, handoff, and context
- Previous state: repo-side security work was mostly in place, but the handoff/task files still mixed true launch blockers with optional follow-up items
- New required direction: complete the security implementation in-repo, then make the operating docs accurately reflect that only deploy/config actions remain for launch
- Why this matters: launch planning gets unreliable when ops documents overstate or misclassify blockers
- Impact on canon / brand / production: security and launch-readiness work should end with precise operational state, not just code changes
- Approval source: user session directive
- Evidence link or reference: Session 31 request in terminal; `context/TASK_BOARD.md`, `context/LATEST_HANDOFF.md`, `context/PROJECT_STATUS.json`
- Supersedes prior entry: none

### 2026-04-02 - Focus on testing and refinement over new features

- Area: development process / quality priorities
- Human decision or guidance: "Instead of adding features, run game tests and refine the current game"
- Previous state: session was set up to implement audit recommendations (PostHog, achievements, anomaly logging, etc.)
- New required direction: prioritize game quality, bug finding, and refinement over feature velocity; run comprehensive testing before shipping new content
- Why this matters: the game has accumulated undetected critical bugs (broken railgun, crashing auras, compounding spawn rates) that feature-focused sessions missed; periodic refinement passes catch these
- Impact on canon / brand / production: establishes that quality gates and refinement sessions are a valid session type, not just feature sprints
- Approval source: user directive in session 34 terminal
- Evidence link or reference: session 34 conversation; 14 bugs found and fixed
- Supersedes prior entry: none
