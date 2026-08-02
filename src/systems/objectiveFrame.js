import { recordObjectiveResult, tickObjective } from "./objectiveDirector.js";

function finite(value, fallback = 0) {
  return Number.isFinite(value) ? value : fallback;
}

export function resolveObjectiveFrame(gs, objectiveChains = {}, {
  tick = tickObjective,
  recordResult = recordObjectiveResult,
} = {}) {
  const objective = gs?.activeObjective;
  if (!objective) return null;
  const outcome = tick(gs) || {};
  const contradictory = Boolean(outcome.completed && outcome.expired);
  const completed = Boolean(outcome.completed) && !contradictory;
  const expired = contradictory || Boolean(outcome.expired);
  if (!completed && !expired) return null;

  const nextChains = recordResult(objectiveChains, objective, { completed, expired });
  const label = typeof objective.label === "string" && objective.label.trim() ? objective.label : "OBJECTIVE";
  const color = typeof objective.color === "string" && objective.color ? objective.color : "#FFFFFF";
  const base = {
    kind: completed ? "completed" : "expired",
    objective: { type: objective.type || "unknown", label },
    objectiveChains: nextChains,
    coinsTotal: null,
    bankedPerkDelta: 0,
    achievementCheck: completed,
    consistency: contradictory ? "contradictory-terminal-outcome" : "coherent",
    color: completed ? color : "#FF3333",
  };

  if (completed) {
    let message = label + " CLEARED!";
    if (objective.reward === "score") {
      const bonus = 250 + Math.max(0, Math.trunc(finite(gs.currentWave, 0))) * 25;
      gs.score = finite(gs.score, 0) + bonus;
      message = "+" + bonus + " " + label + " CLEARED!";
    } else if (objective.reward === "coins") {
      const coinBonus = 5 + Math.floor(Math.max(0, finite(gs.currentWave, 0)) / 3);
      gs.coins = finite(gs.coins, 0) + coinBonus;
      base.coinsTotal = gs.coins;
      message = "+" + coinBonus + "💩 " + label + " CLEARED!";
    } else if (objective.reward === "perk_reroll") {
      base.bankedPerkDelta = 1;
      message = "🎁 " + label + " CLEARED · +1 PERK CHOICE";
    }
    gs.screenShake = Math.max(finite(gs.screenShake, 0), 8);
    gs.objectivesCompleted = [...(Array.isArray(gs.objectivesCompleted) ? gs.objectivesCompleted : []), base.objective];
    base.message = message;
  } else {
    gs.objectivesFailed = [...(Array.isArray(gs.objectivesFailed) ? gs.objectivesFailed : []), base.objective];
    base.message = label + " FAILED";
  }
  gs.activeObjective = null;
  return base;
}
