// BOSS GAUNTLET — every wave is a boss, no trash, beat all six to win (S163).
//
// Reuses the boss rotation, boss phases, and the between-wave perk flow. What
// makes it a different game: a fixed length with a real victory screen, a par
// time, and no filler enemies to farm.

import { BOSS_ROTATION } from "../gameHelpers.js";
import { ENEMY_TYPES } from "../constants.js";

const BOSS_COUNT = 6;
const PAR_SECONDS = 6 * 60;

export const BOSS_GAUNTLET = Object.freeze({
  id: "boss_gauntlet",
  kind: "mode",
  label: "BOSS GAUNTLET",
  replayEligible: false,
  rulesetId: "boss_rush",
  allies: null,
  arena: { themePool: [1, 2, 6] },
  hud: { squad: false, zones: false, parTimer: true, verbObjective: false },
  usesDirectorObjectives: false,
  bossCount: BOSS_COUNT,
  parSeconds: PAR_SECONDS,

  init(gs) {
    gs._gauntletBossesDown = 0;
    gs._gauntletStartFrame = gs.frame || 0;
    gs.maxEnemiesThisWave = 1;
  },

  // Every wave is a boss wave, from wave 1.
  isBossWave() { return true; },

  waveEnemyCount(gs) { return gs.currentWave >= 4 ? 2 : 1; },

  onWaveStart(gs, ctx) {
    const idx = Math.min(BOSS_COUNT - 1, Math.max(0, (gs.currentWave || 1) - 1));
    gs._gauntletBossIndex = idx;
    ctx.addText?.(gs, ctx.W / 2, ctx.H / 2 - 120, `BOSS ${idx + 1} / ${BOSS_COUNT}`, "#FF3333", true);
  },

  onBossDefeated(gs) {
    gs._gauntletBossesDown = (gs._gauntletBossesDown || 0) + 1;
  },

  winCondition(gs) {
    return (gs._gauntletBossesDown || 0) >= BOSS_COUNT ? "win" : null;
  },

  banner(gs) {
    const idx = (gs._gauntletBossIndex || 0);
    const typeIndex = BOSS_ROTATION[idx % BOSS_ROTATION.length];
    const name = ENEMY_TYPES[typeIndex]?.name || `BOSS ${idx + 1}`;
    return `${gs._gauntletBossesDown || 0}/${BOSS_COUNT} DOWN · NEXT: ${name}`;
  },

  progress(gs) {
    const elapsed = ((gs.frame || 0) - (gs._gauntletStartFrame || 0)) / 60;
    return { label: "PAR", value: Math.max(0, PAR_SECONDS - elapsed), pct: Math.min(1, elapsed / PAR_SECONDS), unit: "s" };
  },
});
