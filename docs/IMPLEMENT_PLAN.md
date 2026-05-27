# Implement Plan — 2026-05-27 Audit

Source: `docs/AUDIT_2026-05-27.json`

## Sequenced Order

1. `pointer-aim-projection-contract` — foundation first; pure helper and tests reduce risk before touching runtime aim.
2. `input-diagnostics-hud` — uses the now-tested aim contract and exposes live controller/pointer state under a hidden flag.
3. `first-run-control-calibration` — copy/UI pass after diagnostics exists, so QA has a visible path to the tool.

## Execution Log

- `pointer-aim-projection-contract` — shipped. `computePointerAimAngle()` and `angleToUnitVector()` now live in `src/systems/gameStep.js`, `App.jsx` uses the shared helper for mouse/touchpad aim, and `gameStep.test.js` covers cardinal plus diagonal pointer vectors.
- `input-diagnostics-hud` — shipped. `?debug=input` or `localStorage.cod-debug-input=1` now enables a compact in-run diagnostics overlay with input source, controller identity, stick values, aim angles, action states, pointer position, and replay trace counts.
- `first-run-control-calibration` — shipped. HomeV2 first-run onboarding now includes a calibration step, and the hidden diagnostics shortcut appears when input debugging is enabled.

## Validation

- `npx vitest run src/systems/gameStep.test.js src/components/HomeV2.test.jsx src/utils/gamepad.test.js` -> 22/22 passing
- `npm run lint` -> clean
- `npm test` -> 378/378 passing across 45 files
- `npm run build` -> passing
