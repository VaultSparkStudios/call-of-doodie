// combatRuntime — per-frame combat systems loaded as one dynamic chunk when a
// run starts (S163 bundle diet). App.jsx keeps a ref to this namespace; the
// headless kernel imports the same modules statically.
export { stepEnemyFrame, pickTarget } from "./enemyFrame.js";
export { stepProjectileFrame } from "./projectileFrame.js";

// Loop-only systems App reaches through combatRuntimeRef (S163 bundle diet, pass 2).
export { addHeatOnKill, decayHeat, heatTier, resetHeat } from "./heatMeter.js";
export { planEnemyCoinDrop, planEnemyDefeatScore } from "./defeatEconomy.js";
export { applyEnemyDamage, collectQueuedEnemyDefeats, collectUnqueuedLethalEnemies, queueEnemyDefeat, retireEnemyWithoutDefeat, takeQueuedEnemyDefeat } from "./enemyDefeatLifecycle.js";
export { pickObjective, pickWaveChallengeContract, resolveWaveChallengeContract, startWaveChallengeContract } from "./objectiveDirector.js";
export { resolveObjectiveFrame } from "./objectiveFrame.js";
export { createWhisperLedger, tickTacticalWhisper } from "./tacticalWhisper.js";
export { getCoinShopOptions, getShopOptions } from "./shopOptions.js";
export { applyArchetypeCapstone, applyPerkSynergies } from "./perkResolution.js";
export { applyCoinShopEffect, applyShopOptionEffect } from "./shopResolution.js";
export { acceptMutation } from "./mutationResolution.js";
export { spawnPickup } from "./pickupSpawning.js";
export { applyPlayerMovement, buildPointerAimSweepReport, computePointerAimAngle, resolveAimFrame, resolveMovementVector } from "./gameStep.js";
export { stampArenaDecal } from "./backgroundLayer.js";
export { compactTruthyInPlace } from "./frameIndex.js";
export { stepAndCompactInPlace, stepTransientEffectsInPlace } from "./transientLifecycle.js";
export { applyObservedPlayerDamage, createDamageSequence, finalizeDamageSequence } from "./damageSequence.js";
export { buildWavePlanReceipt, recordWavePlanSnapshot } from "./wavePlanReceipt.js";
export { createBossWavePlan } from "./bossWaveFlow.js";
export { getZombieOutbreakPlan, getZombieWaveEnemyCount, mutateEnemyForZombieMode } from "./zombieMode.js";
export { buildArenaEnvironment } from "./arenaEnvironment.js";
