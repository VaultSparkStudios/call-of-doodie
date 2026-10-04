import { DIFFICULTIES } from "../constants.js";

// Mode-owned spawns follow the same factors as classic spawns. Fixed enemy
// counts and authored objective timers remain part of each mode's identity.
export function getModeDifficultyFacts(mode = "standard", difficulty = "normal") {
  const id = Object.hasOwn(DIFFICULTIES, difficulty) ? difficulty : "normal";
  const diff = DIFFICULTIES[id];
  return { mode, difficulty: id, playerStartingHealth: diff.playerHP,
    enemyHealthMultiplier: diff.healthMult, enemySpeedMultiplier: diff.speedMult,
    spawnIntervalMultiplier: mode === "bot_royale" ? null : diff.spawnMult,
    objectiveTimers: "mode-defined", incomingDamageMultiplier: 1,
    modifiers: "Run modifiers and player settings apply separately; compare identical setups." };
}

export function describeModeDifficulty(mode, difficulty) {
  const f = getModeDifficultyFacts(mode, difficulty);
  return `${DIFFICULTIES[f.difficulty].label}: ${f.playerStartingHealth} starting health before modifiers · enemies ${f.enemyHealthMultiplier}× health / ${f.enemySpeedMultiplier}× speed · ${f.spawnIntervalMultiplier === null ? "sixteen bots; fixed flood timing" : `${f.spawnIntervalMultiplier}× spawn interval`} · objective timers unchanged.`;
}
