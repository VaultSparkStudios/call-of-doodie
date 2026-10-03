import { getOperation } from "./operationCampaign.js";
import { createBossWavePlan } from "./bossWaveFlow.js";
export function operationEncounterReady(gs) {
  return Boolean(gs?.operationMode && gs.activeVerbObjective?.status === "done" && !gs._waveTransitDone);
}

/** A bounded patrol replenishes while the player pursues a task, never a kill quota. */
export function operationReinforcementPlan(gs) {
  if (!gs?.operationMode || gs._waveTransitDone || gs.activeVerbObjective?.status === "done") return null;
  const verb = gs.operationEncounterVerb;
  if (verb === "BOSS") return null;
  const cap = ({ BREACH:4, HOLD:7, ESCORT:5, HUNT:4, SABOTAGE:6, ESCAPE:5 })[verb] || 4;
  const alive = (gs.enemies || []).filter(enemy => !enemy._defeatResolved && enemy.health > 0).length;
  const interval = Math.round((verb === "HOLD" || verb === "SABOTAGE" ? 150 : 210) / (gs._operationPressureMultiplier || 1));
  const due = (gs.frame || 0) - (gs._operationLastReinforcementFrame ?? gs.frame ?? 0) >= interval;
  return { cap, interval, spawn:due && alive < cap };
}
export function operationElapsedMs(gs) {
  return Math.max(0, (Number(gs?.frame) || 0) - (Number(gs?._operationStartFrame) || 0)) * 1000 / 60;
}
export function createOperationBossPlan(gs, enemyTypes) {
  const operation = getOperation(gs.operationId);
  if (!gs.operationMode || !operation) return null;
  const type = { "blacksite-flush": 4, "porcelain-siege": 9, "final-notice": 3 }[operation.id];
  const plan = createBossWavePlan({ currentWave: 1, bossRushMode: true, developerBossSpawned: false, bossRotation: [type], enemyTypes, singleBoss: true });
  const name = operation.antagonist.name;
  return { ...plan, previewCard: { ...plan.previewCard, name, emoji: enemyTypes[type].emoji, color: enemyTypes[type].color, title: "OPERATION FINALE", wave: gs.currentWave },
    announceLines: [{ text: name.toUpperCase(), color: enemyTypes[type].color, emphasize: true }],
    warningLines: [], operationBossName: name };
}
