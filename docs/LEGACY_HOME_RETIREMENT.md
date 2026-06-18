# Legacy Home Retirement Gate

HomeV2 is the default player front door. Legacy `MenuScreen` remains reachable through `?home=v1` only as a rollback and long-tail QA fallback.

## Current Decision

Keep legacy home fallback-only until the evidence below is collected. Do not add new player-facing copy or systems to `MenuScreen` unless it is needed to preserve a fallback path.

## Retirement Evidence Required

- `npm run launch:smoke` passes through the default HomeV2 path.
- `npm run test:e2e` passes desktop and mobile browser checks.
- `npm run launch:surfaces` passes with no stale public copy.
- HomeV2 covers these launch-critical surfaces: deploy, mode/difficulty/loadout selection, rules, controls, career stats, missions, upgrades, run history, leaderboard, settings, support, and latest feature notes.
- A desktop and mobile screenshot pass shows no first-viewport text overlap or missing primary action.
- `context/DECISIONS.md` receives a dated decision either to retire `?home=v1` or keep it as a frozen fallback.

## If Retired

- Remove the `?home=v1` branch and `cod-home-v2=0` opt-out.
- Delete `src/components/MenuScreen.jsx` if no tests or fallback paths import it.
- Run `npm run launch:verify`, `npm test`, `npm run lint`, and `npm run build`.

## If Kept

- Keep it lazy-loaded.
- Mark it fallback-only in future audit/launch notes.
- Do not duplicate new HomeV2 player-journey work into the legacy surface unless a real fallback defect requires it.
