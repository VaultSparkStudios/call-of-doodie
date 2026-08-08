export const FIELD_REPORTS = Object.freeze({
  too_easy: { id: "too_easy", label: "TOO EASY", emoji: "🥱", color: "#7FE6FF" },
  dialed_in: { id: "dialed_in", label: "DIALED IN", emoji: "🎯", color: "#00FF88" },
  brutal: { id: "brutal", label: "BRUTAL", emoji: "💀", color: "#FF7A66" },
});

const DIFFICULTY_ORDER = ["easy", "normal", "hard", "insane"];

export function normalizeFieldReport(value) {
  const key = String(value || "").toLowerCase();
  return FIELD_REPORTS[key] ? key : null;
}

export function buildThreatRecommendation({
  feedback = null,
  recentFeedback = [],
  currentDifficulty = "normal",
  score = 0,
  kills = 0,
  wave = 1,
  mode = "standard",
} = {}) {
  const normalized = normalizeFieldReport(feedback);
  const recent = [normalized, ...recentFeedback.map(item => normalizeFieldReport(item?.feedback ?? item))]
    .filter(Boolean)
    .slice(0, 3);
  const easySignals = recent.filter(item => item === "too_easy").length;
  const strongRun = Number(wave) >= 7 || Number(kills) >= 70 || Number(score) >= 25000;
  if (mode === "zombies" && normalized === "too_easy") {
    return {
      kind: "difficulty",
      value: currentDifficulty === "insane" ? "insane" : DIFFICULTY_ORDER[Math.min(3, Math.max(0, DIFFICULTY_ORDER.indexOf(currentDifficulty)) + 1)],
      label: currentDifficulty === "insane" ? "HOLD INSANE" : "RAISE OUTBREAK THREAT",
      reason: "The horde felt light. Raise the threat while keeping this separately ranked Zombies lane.",
      evidence: "player_sentiment",
    };
  }
  if (easySignals >= 2 || (normalized === "too_easy" && strongRun)) {
    const index = Math.max(0, DIFFICULTY_ORDER.indexOf(currentDifficulty));
    if (index >= DIFFICULTY_ORDER.length - 1) {
      return {
        kind: "mode",
        value: "zombies",
        label: "OPEN THE SEWER",
        reason: "Repeated easy reports at the top threat tier unlock a denser, separately ranked horde response.",
        evidence: easySignals >= 2 ? "repeated_player_sentiment" : "sentiment_plus_performance",
      };
    }
    const value = DIFFICULTY_ORDER[index + 1];
    return {
      kind: "difficulty",
      value,
      label: `ESCALATE TO ${value.toUpperCase()}`,
      reason: easySignals >= 2
        ? "Two recent Field Reports said the current threat was too easy."
        : "Your Field Report and run result agree that the next threat tier is ready.",
      evidence: easySignals >= 2 ? "repeated_player_sentiment" : "sentiment_plus_performance",
    };
  }
  if (normalized === "brutal") {
    return {
      kind: "practice",
      value: "rematch",
      label: "RUN THE FIX",
      reason: "Keep the current threat and rehearse the collapse point before lowering difficulty.",
      evidence: "player_sentiment",
    };
  }
  return null;
}
