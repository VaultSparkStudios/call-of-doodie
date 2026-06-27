# Launch Screenshot Truth Pack

This pack separates verified gameplay captures from authored promotional stills.

## Verified captures

All five captures are real Playwright/Chromium screenshots taken from a live local Vite dev server.
Sizes and scenes match the PWA manifest entries exactly.

| File | Viewport | Scene |
|------|----------|-------|
| `public/launch-captures/real-combat.png` | 1280×720 | In-game combat after ~8 s of enemy waves |
| `public/launch-captures/real-draft.png` | 1280×720 | Pre-deployment perk draft screen ("CHOOSE YOUR EDGE") |
| `public/launch-captures/real-deploy.png` | 1280×720 | Deploy dropdown open — all 7 modes + 4 difficulties visible |
| `public/launch-captures/real-achievements.png` | 1280×720 | Achievements panel with injected demo career data |
| `public/launch-captures/real-mobile.png` | 390×844 | Mobile gameplay after ~8 s of enemy waves |

Regenerate with:

```bash
npm run launch:screenshots
```

## Manifest status

`public/manifest.json` `screenshots[]` now references the five verified PNG captures above.
SVG fallbacks are no longer used for manifest screenshots.

## Fallback media

The existing `public/launch-assets/*.svg` and generated PNG siblings remain proprietary promotional
assets for store surfaces that need composed stills. They are not gameplay screenshots.
