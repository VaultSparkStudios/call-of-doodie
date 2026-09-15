import { getMode } from "../config/modeCatalog.js";
export function buildObjectiveDebrief({ modeOutcome, victory = false } = {}) {
  if (!modeOutcome?.modeId) return null;
  const won = victory || modeOutcome.victory === true;
  const advice = {
    boss_gauntlet: won ? ["Six bosses defeated", "Repeat the six-boss clear; then aim to beat your own completion time.", "Defeat all six bosses again. The six-minute target is optional."] : ["Finish the boss sequence", "Keep space for boss attacks and clear summoned enemies before returning to the boss.", "Defeat all six bosses to complete the run."],
    sewer_extraction: won ? ["Loot safely extracted", "Try another extraction and compare the loot you actually carry out.", "Reach the evac toilet with loot before alarm 100."] : ["Get the loot out", "Plan your exit as alarm 60 approaches. Once evac opens, head to the toilet before alarm 100 seals it.", "Extract successfully; unbanked loot is lost on death."],
    bot_royale: won ? ["Last survivor", "Try another match and repeat the win while staying ahead of the flood.", "Outlast every bot and finish in first place."] : ["Outlast the remaining bots", "Move into the next safe area early and use cover to avoid fighting every rival at once.", "Finish in first place; kills alone do not win the match."],
    hold_the_throne: won ? ["All three thrones secured", "Defend all three points again, aiming to finish without losing a throne.", "Capture all three thrones; a clean defense loses none."] : ["Secure the three thrones", "Stay inside the active point and clear contesting enemies. One lost throne can be retaken; a second loss ends the run.", "Hold each of the three thrones for 30 uncontested seconds."],
    operation: ["Complete the Operation", "Replay this Operation from the first encounter. Complete each field task and its linked interaction before clearing the room.", "Finish all seven encounters and defeat the authored finale boss."],
  }[modeOutcome.modeId];
  if (!advice) return null;
  const mode = getMode(modeOutcome.modeId);
  const [focus, target, proof] = advice;
  return { objective: true, victory: won, verdict: won ? "objective complete" : "objective incomplete",
    identity: modeOutcome.label || mode.label, strengths: [modeOutcome.headline, modeOutcome.detail].filter(Boolean),
    collapseReason: [modeOutcome.headline, modeOutcome.detail].filter(Boolean).join(" · "),
    actions: [target], missedValue: [], rematchPlan: [target],
    nextRunContract: { id: modeOutcome.modeId + (won ? "_repeat" : "_complete"), focus, target, proof },
    replayLabel: won ? "PLAY AGAIN" : "RETRY OBJECTIVE" };
}
