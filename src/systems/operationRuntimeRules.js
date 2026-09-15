import { getOperation } from "./operationCampaign.js";
import { createBossWavePlan } from "./bossWaveFlow.js";
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
