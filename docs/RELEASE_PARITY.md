# Release Parity — Call of Doodie

Last reviewed: 2026-07-16

## Surface ledger

| Surface | Current evidence | Status |
|---|---|---|
| Desktop browser | Automated Chromium launch captures, unit tests, build, and live smoke exist. A fresh real-click pass is required after this implementation. | Pending recheck |
| Mobile browser | Responsive layout and touch controls exist; automated 390px inspection is required after this implementation. | Pending recheck |
| Installed Progressive Web App (PWA) | Code emits install-readiness receipts, but no current physical install/relaunch receipt exists. | Manual gate |
| Physical controller/browser | Local input contracts exist, but no current physical device/browser receipt exists. | Manual gate |
| Native mobile app | No native app is shipped. | Not applicable |

## Parity contract

- Desktop and mobile expose the same core modes, progression, settings, legal pages, and public trust language.
- Touch, mouse/keyboard, and controller paths must not produce competitive advantages through hidden rules.
- Reduced-motion, colorblind, audio, and control settings remain available on browser surfaces.
- A skipped responsive or physical-device check is never rendered as a pass.

## Known gaps

- GitHub Pages is a manually dispatched fallback, not an isolated current staging environment.
- On-domain contact forwarding is not verified while the Brevo capability is unavailable.
- Real Progressive Web App install/relaunch and physical controller/browser checks remain open.
- Production Lighthouse and HomeV2 funnel comparisons require measured external evidence.

This document records posture; it does not mark the project launch-ready or SPARKED.
