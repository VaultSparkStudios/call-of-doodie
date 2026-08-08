<!-- generated-by: /implement skill (arc S144) -->
<!-- generated-at: 2026-08-08 -->
<!-- source: docs/AUDIT_2026-08-08.json -->

# Implement Plan — Session 144

Re-sorted from audit priority order into execution-efficiency order: trivial win first,
then the doctrine-system group (shared foundation in `src/utils/buildArchetypes.js`),
then the mobile-UX group (shared `SETTINGS_DEFAULTS`/`SettingsPanel.jsx`/`MobileHUD.jsx`
surface), then the standalone rendering item last (heaviest, touches `drawGame.js` hot path).

1. **bestiary-tip-string-fix** — trivial, zero-dependency, do first.
2. **doctrine-archive-career-collection** — foundation: adds persistence read/write helpers
   in `storage.js` that item 3 does not depend on but shares the archetype-progress surface with.
3. **doctrine-near-miss-debrief-insight** — same axis/module as item 2, do adjacently.
4. **weekly-gauntlet-doctrine-tag** — same axis/module, cheapest of the three, closes the group.
5. **mobile-haptic-feedback** — opens the mobile-UX group (new `src/utils/haptics.js` + settings key).
6. **mobile-handedness-and-density-controls** — same settings/HUD surface as item 5, do adjacently.
7. **offscreen-threat-direction-indicators** — standalone `drawGame.js` rendering addition, most
   effort, done last so earlier items aren't blocked behind the heaviest change.

Ladder rung: L2 (full recipe) by default for every item — budget allows it (context-meter 4% used).
