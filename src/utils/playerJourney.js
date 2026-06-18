export function buildPlayerJourney({
  totalRuns = 0,
  challengeActive = false,
  hasVerifiedInput = false,
  dailyAlreadyPlayed = false,
  canSpendMeta = false,
  incompleteMissionCount = 0,
  accountLevel = 1,
  prestige = 0,
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

  let secondary = {
    id: "open_codex",
    title: "Learn one system",
    detail: "Open Codex only when you want the arsenal, Most Wanted list, rules, or latest changes.",
    cta: "Open Codex",
    action: "codex",
    accent: "#7FE6FF",
  };

  if (!hasVerifiedInput) {
    secondary = {
      id: "aim_check",
      title: "Prove your controls",
      detail: "Run the aim check once so mouse, touch, or controller input is verified before a serious attempt.",
      cta: "Aim Check",
      action: "aim_check",
      accent: "#FFD34D",
    };
  } else if (challengeActive) {
    secondary = {
      id: "challenge_focus",
      title: "Fixed rival target",
      detail: "You opened a challenge link. Keep the same seed loaded and make the next run a clean rematch.",
      cta: "Review Challenge",
      action: "challenge",
      accent: "#FFB36B",
    };
  } else if (!dailyAlreadyPlayed) {
    secondary = {
      id: "daily_focus",
      title: "Shared seed available",
      detail: "Daily Challenge is the clearest comparison run because every player gets the same battlefield.",
      cta: "Play Daily",
      action: "daily",
      accent: "#00E5FF",
    };
  } else if (canSpendMeta) {
    secondary = {
      id: "spend_meta",
      title: "Power sitting idle",
      detail: "Spend career points before another run so progress turns into visible strength.",
      cta: "Open Upgrades",
      action: "upgrades",
      accent: "#FFD700",
    };
  } else if (incompleteMissionCount > 0) {
    secondary = {
      id: "mission_focus",
      title: "Daily progress left",
      detail: `${incompleteMissionCount} mission${incompleteMissionCount === 1 ? "" : "s"} can still turn the next run into career progress.`,
      cta: "Review Missions",
      action: "missions",
      accent: "#7CFF8A",
    };
  }

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
    secondary,
    commandCenterDefaultOpen: false,
  };
}
