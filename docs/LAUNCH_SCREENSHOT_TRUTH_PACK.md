# Launch Screenshot Truth Pack

This pack separates verified gameplay captures from authored promotional stills.

## Verified captures

- `public/launch-captures/real-combat.png` - real Chromium capture from the local Vite app at 1280x720 after entering gameplay.
- `public/launch-captures/real-boss-rush.png` - real Chromium capture from Boss Rush mode at 1280x720.
- `public/launch-captures/real-loadout-builder.png` - real Chromium capture of the HomeV2 Loadout Builder panel at 1280x720.
- `public/launch-captures/real-leaderboard.png` - real Chromium capture of the HomeV2 leaderboard panel at 1280x720 with seeded local leaderboard entries.
- `public/launch-captures/real-mobile-controls.png` - real Chromium mobile viewport capture from the local Vite app at 390x844 after entering gameplay.

Regenerate with:

```bash
npm run launch:screenshots
```

Validate with:

```bash
npm run launch:media-check
```

## Fallback media

The existing `public/launch-assets/*.svg` and generated PNG siblings remain proprietary promotional fallbacks for store surfaces that need composed stills. They should not be described as gameplay screenshots.

## Current manifest posture

`public/manifest.json` now points all five screenshot entries at verified browser-capture PNGs. The media gate requires each manifest PNG to be listed in `assets/visual-assets.json` as `sourceType: browser-capture`, `status: production-ready`, and to match its expected dimensions.
