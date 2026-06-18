# Launch Screenshot Truth Pack

This pack separates verified gameplay captures from authored promotional stills.

## Verified captures

- `public/launch-captures/real-combat.png` — real Chromium capture from the local Vite app at 1280x720 after entering gameplay.
- `public/launch-captures/real-mobile-controls.png` — real Chromium mobile viewport capture from the local Vite app at 390x844 after entering gameplay.

Regenerate with:

```bash
npm run launch:screenshots
```

## Fallback media

The existing `public/launch-assets/*.svg` and generated PNG siblings remain proprietary promotional fallbacks for store surfaces that need composed stills. They should not be described as gameplay screenshots.

## Next upgrade

Replace all five manifest screenshot entries with verified capture PNGs after a full five-scene pass exists for combat, boss, builds/debrief, leaderboard, and mobile controls.
