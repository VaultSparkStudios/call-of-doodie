const CODEX_FALLBACK = Object.freeze({
  schemaVersion: "continuation-action-v2",
  id: "open_codex",
  title: "Learn One System",
  detail: "Open Codex for the arsenal, Most Wanted list, rules, or latest changes.",
  cta: "OPEN CODEX",
  action: "codex",
  accent: "#7FE6FF",
  reasonCode: "no-ranked-continuation",
  payload: {},
  evidence: { kind: "fallback", basis: "no-ranked-continuation" },
});

function asJourneyAction(recommendedAction) {
  if (!recommendedAction) return { ...CODEX_FALLBACK };
  return {
    schemaVersion: recommendedAction.schemaVersion || "continuation-action-v2",
    id: recommendedAction.id,
    title: recommendedAction.title,
    detail: recommendedAction.detail,
    cta: recommendedAction.cta,
    action: recommendedAction.action,
    accent: recommendedAction.accent,
    reasonCode: recommendedAction.reasonCode,
    payload: recommendedAction.payload || {},
    evidence: recommendedAction.evidence || null,
  };
}

export function buildPlayerJourney({
  totalRuns = 0,
  accountLevel = 1,
  prestige = 0,
  recommendedAction = null,
} = {}) {
  const runs = Math.max(0, Number(totalRuns || 0));
  const level = Math.max(1, Number(accountLevel || 1));
  const stage = runs === 0
    ? "first_run"
    : runs < 3
      ? "early_runs"
      : level >= 12 || prestige > 0
        ? "mastery"
        : "returning";

  const labels = {
    first_run: "First Drop",
    early_runs: "Early Runs",
    returning: "Return Run",
    mastery: "Mastery Loop",
  };

  const detail = {
    first_run: "Deploy first. Learn movement, aim, and one mistake worth fixing.",
    early_runs: "Compare runs now: same seed, cleaner choices, stronger upgrade timing.",
    returning: "Pick one intention before deploy so the menu stays a tool, not homework.",
    mastery: "Chase proof: cleaner replay evidence, stronger rivals, and fewer wasted upgrades.",
  };

  return {
    schemaVersion: "player-journey-v2",
    stage,
    label: labels[stage],
    detail: detail[stage],
    primary: {
      id: "deploy",
      title: "Deploy",
      detail: "Start the run with the selected mode, difficulty, loadout, and seed.",
      cta: "Deploy",
      action: "deploy",
      accent: "#FF6B35",
    },
    secondary: asJourneyAction(recommendedAction),
    commandCenterDefaultOpen: false,
  };
}
