# Mobile Parity Attestation

Last reviewed: 2026-08-25 (Session 161)

Call of Doodie's public browser surfaces meet the current CANON-041 engineering-release parity bar:

- The isolated staging matrix at `https://session-161-staging.call-of-doodie.pages.dev/` passed 1,020/1,020 checks across 20 public routes, both `sewer-night` and `porcelain-day` themes, and 390px, 768px, and 1440px widths.
- The touched perk-choice and threat-compass states passed 96/96 checks at 390px and 1440px in both themes. Direct rendered-pixel review found no clipped primary action, horizontal overflow, illegible delta, or displaced screen-space compass marker.
- The public route court checks reachable actions, horizontal overflow, page/console errors, theme application, and measured contrast. The project uses `100dvh`, safe-area insets, reduced-motion handling, and mobile navigation contracts enforced by source tests and the public contract.
- Desktop browser and mobile browser ship the same route and gameplay feature set. A native mobile app is not shipped, so native-app parity is not applicable.

The Studio's generic responsive helper skipped because it imports the standalone `playwright` package while this project intentionally pins `@playwright/test`. The skip is not represented as a pass; the project-owned pinned-Chromium matrix and hash-bound `docs/visual-qa/LATEST.json` receipt are the authoritative automated and subjective evidence.

This attestation covers browser engineering parity. It does not claim physical-device, installed Progressive Web App, controller, performance, participant, publication, or SPARKED evidence.
