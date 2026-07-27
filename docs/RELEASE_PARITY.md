# Release Parity — Call of Doodie

Last reviewed: 2026-07-26

## Surface ledger

| Surface | Current evidence | Status |
|---|---|---|
| Desktop browser | Current desktop Chromium input flow and isolated staging inspection at 768px/1440px pass. | Automated pass |
| Mobile browser | Current mobile-Chrome input flow and isolated staging inspection at 390px pass. | Automated pass |
| Installed Progressive Web App (PWA) | Code emits install-readiness receipts, but no current physical install/relaunch receipt exists. | Manual gate |
| Physical controller/browser | Local input contracts exist, but no current physical device/browser receipt exists. | Manual gate |
| Native mobile app | No native app is shipped. | Not applicable |

## Parity contract

- Desktop and mobile expose the same core modes, progression, settings, legal pages, and public trust language.
- Touch, mouse/keyboard, and controller paths must not produce competitive advantages through hidden rules.
- Reduced-motion, colorblind, audio, and control settings remain available on browser surfaces.
- A skipped responsive or physical-device check is never rendered as a pass.

## Known gaps

- An isolated Cloudflare preview exists for Session 131; production/current-commit parity is verified only after the direct-main push and CI.
- Brevo credentials are ready, but the required inbound subdomain/MX/webhook receiver and end-to-end delivery are not configured or verified; the founder-address fallback remains explicit.
- Real Progressive Web App install/relaunch and physical controller/browser checks remain open.
- Production Lighthouse and HomeV2 funnel comparisons require measured external evidence.

This document records posture; it does not mark the project launch-ready or SPARKED.
