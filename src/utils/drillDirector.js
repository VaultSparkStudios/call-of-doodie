export function buildNextRunDrill({
  runSeed = 0,
  runCoach = {},
  ghostDeathReadout = null,
  postRunIntel = null,
  debrief = null,
  mode = "standard",
} = {}) {
  const seed = Number(runSeed) || 0;
  const replayAction = seed > 0 ? "replay_seed" : "play_again";
  const base = {
    id: "cleaner_rematch",
    title: seed > 0 ? `Replay seed #${seed}` : "Run the fix",
    detail: "Run the next attempt with one concrete correction instead of rolling forward on instinct.",
    cta: seed > 0 ? "RUN THE FIX" : "PLAY THE FIX",
    action: replayAction,
    seed,
    mode,
  };

  if (runCoach?.brain?.chokeWarning) {
    return {
      ...base,
      id: "choke_point_rematch",
      title: `Solve wave ${runCoach.brain.chokeWarning.wave}`,
      detail: runCoach.brain.chokeWarning.tip,
    };
  }

  if (runCoach?.enemyLab) {
    return {
      ...base,
      id: "enemy_lab_rematch",
      title: `${runCoach.enemyLab.counterVerb} ${runCoach.enemyLab.name}`,
      detail: `${runCoach.enemyLab.drill} ${runCoach.enemyLab.nextRunCue}`,
    };
  }

  if (runCoach?.weaponDeathTip) {
    return {
      ...base,
      id: "weapon_mismatch_rematch",
      title: "Fix the weapon mismatch",
      detail: runCoach.weaponDeathTip,
    };
  }

  if (ghostDeathReadout) {
    return {
      ...base,
      id: "pathing_rematch",
      title: ghostDeathReadout.headline || "Clean the final path",
      detail: ghostDeathReadout.detail || base.detail,
    };
  }

  if (postRunIntel?.drill) {
    return {
      ...base,
      id: "intel_drill_rematch",
      title: String(postRunIntel.cause || "run_brain").replace(/_/g, " "),
      detail: postRunIntel.drill,
    };
  }

  if (Array.isArray(debrief?.actions) && debrief.actions[0]) {
    return {
      ...base,
      id: "debrief_action_rematch",
      title: "Apply the top debrief action",
      detail: debrief.actions[0],
    };
  }

  return base;
}
