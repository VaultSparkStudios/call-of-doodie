function row(priority, label, detail, tone = "info", id = label) {
  return { id, priority, label, detail, tone };
}

export function buildResponsiveHudModel({
  score = 0,
  combo = 0,
  killstreak = 0,
  grenadeReady = false,
  dashReady = false,
  isReloading = false,
  activeWaveContract = null,
  activeDrill = null,
  drillProgress = null,
  practiceMastery = null,
  runIntegrity = null,
  runModifier = null,
  rivalPace = null,
  vsScore = null,
  vsName = null,
  topGhosts = null,
  weeklyRival = null,
  experimentMatched = null,
  reducedEffects = false,
}) {
  const rows = [
    runIntegrity?.onlineEligible === false
      ? row(100, "Local-only run", runIntegrity.detail, "warning", "integrity")
      : null,
    activeWaveContract
      ? row(92, activeWaveContract.label || "Wave contract", activeWaveContract.description || `Bonus reward: ${activeWaveContract.rewardCoins || 0}`, "gold", "contract")
      : null,
    activeDrill
      ? row(88, activeDrill.title, drillProgress?.label || activeDrill.detail, "info", "drill")
      : null,
    practiceMastery?.label
      ? row(84, "Practice mastery", practiceMastery.label, practiceMastery.complete ? "success" : "gold", "mastery")
      : null,
    isReloading
      ? row(82, "Reload in progress", "Weapon unavailable until the magazine is ready.", "warning", "reload")
      : null,
    !dashReady || !grenadeReady
      ? row(78, "Ability cooldowns", `${dashReady ? "Dash ready" : "Dash cooling"} · ${grenadeReady ? "Grenade ready" : "Grenade cooling"}`, "warning", "abilities")
      : null,
    runModifier
      ? row(70, runModifier.name, runModifier.desc, "gold", "modifier")
      : null,
    vsScore != null
      ? row(
        64,
        score >= vsScore ? `Ahead of ${vsName || "challenge"}` : `Chasing ${vsName || "challenge"}`,
        `${Math.abs(score - vsScore).toLocaleString()} points`,
        score >= vsScore ? "success" : "warning",
        "challenge",
      )
      : null,
    rivalPace ? row(60, rivalPace.label, rivalPace.detail, rivalPace.ahead ? "success" : "warning", "pace") : null,
    experimentMatched ? row(56, "Experiment active", experimentMatched.label || experimentMatched.name || "Variant matched", "info", "experiment") : null,
    combo >= 3 || killstreak >= 3
      ? row(52, "Momentum", `${combo}× combo · ${killstreak} streak`, combo >= 10 ? "warning" : "gold", "momentum")
      : null,
    reducedEffects ? row(48, "Performance mode", "Effects reduced automatically to preserve frame pacing.", "warning", "performance") : null,
    weeklyRival ? row(40, "Weekly rival", `${weeklyRival.name || "Ghost"} · wave ${weeklyRival.wave || 1}`, "info", "weekly-rival") : null,
    Array.isArray(topGhosts) && topGhosts.length > 0
      ? row(36, "Ghost pack", `${topGhosts.length} comparison runs loaded`, "info", "ghosts")
      : null,
  ].filter(Boolean).sort((a, b) => b.priority - a.priority);

  const actionStates = [
    { id: "dash", label: "DASH", hint: "SHIFT", ready: dashReady },
    { id: "grenade", label: "GRENADE", hint: "Q", ready: grenadeReady },
    { id: "reload", label: "RELOAD", hint: "R", ready: !isReloading },
  ];
  const contextIds = rows.map((item) => item.id);

  return {
    detailRows: rows,
    primary: rows[0] || null,
    actionStates,
    capabilityReceipt: {
      schemaVersion: "1.0",
      alwaysVisible: ["wave", "time", "score", "health", "weapon", "ability-readiness"],
      contextIds,
      actionIds: actionStates.map((item) => item.id),
      primaryId: rows[0]?.id || null,
      unique: new Set(contextIds).size === contextIds.length && new Set(actionStates.map((item) => item.id)).size === actionStates.length,
    },
  };
}
