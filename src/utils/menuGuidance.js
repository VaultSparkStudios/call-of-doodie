export function buildCommandBrief({
  mode = "standard",
  selectedLoadout = { id: "standard", name: "Standard Issue" },
  weeklyMutation = null,
}) {
  const actions = [];

  if (mode === "boss_rush") actions.push("Treat every wave like a boss opener: save movement tools for dodge windows, not for cleanup.");
  else if (mode === "cursed") actions.push("Take one stabilizer first. Cursed runs snowball when greed beats survivability in the opening minutes.");
  else if (mode === "score_attack") actions.push("Play for tempo and chain control. Safe-but-slow routing leaves score on the table.");
  else if (mode === "daily_challenge") actions.push("Use the first run as reconnaissance, then replay the same seed with cleaner routing and better shop discipline.");
  else if (mode === "speedrun") actions.push("Commit early and move with intent. Speedrun pace dies when you hedge between multiple build lines.");
  else if (mode === "gauntlet") actions.push("Respect the forced build. The gauntlet rewards learning its strengths, not fighting the preset.");
  else actions.push("Specialize early. A clear two-weapon identity pays off harder than a flat all-rounder run.");

  if (selectedLoadout.id === "tank") actions.push("Tank buys time, not burst. Convert that time into safer routes and cleaner boss phases.");
  else if (selectedLoadout.id === "cannon") actions.push("Glass Cannon wants initiative. Delete priority threats first and avoid attrition trades.");
  else if (selectedLoadout.id === "speedster") actions.push("Use mobility proactively for streak upkeep and spacing, not only as a panic escape.");
  else actions.push("Standard Issue is strongest when you let the run reveal which identity to specialize into.");

  if (weeklyMutation) actions.push(`${weeklyMutation.emoji} Weekly mutation: ${weeklyMutation.name}. ${weeklyMutation.desc}`);

  return actions.slice(0, 3);
}

function normalizeAction(action, order) {
  return { ...action, order };
}

export function buildFrontDoorActionStack({
  challenge = null,
  dailyAlreadyPlayed = false,
  canSpendMeta = false,
  incompleteMissionCount = 0,
  selectedLoadout = { name: "Standard Issue" },
  currentModeLabel = "Standard",
  todaySeed = null,
  totalRuns = 0,
}) {
  // First-run players get a stripped action stack — just deploy
  if (totalRuns === 0) {
    return [{
      id: "play_now",
      title: "Your First Drop",
      detail: "Move with WASD, aim with mouse, shoot automatically. Survive as many waves as you can.",
      whyNow: "No prep needed. The first run is a scouting mission — your real run starts after you see the terrain.",
      urgency: "The rest of the menu unlocks as you play.",
      accent: "#FF6B35",
      cta: "▶ DEPLOY",
      order: 0,
    }];
  }
  const actions = [];

  if (challenge?.vsScore != null) {
    actions.push(normalizeAction({
      id: "accept_challenge",
      title: "Beat the challenge link",
      detail: `Replay seed #${challenge.seed} and clear ${challenge.vsScore.toLocaleString()} points against ${challenge.vsName ? `@${challenge.vsName}` : "the posted score"}.`,
      whyNow: "Rivalry links are the cleanest high-stakes next run because the target is concrete and the seed is fixed.",
      urgency: "Best when your routing memory is still fresh.",
      accent: "#FFB36B",
      cta: "⚔️ ACCEPT CHALLENGE",
    }, 0));
  }

  if (!dailyAlreadyPlayed && todaySeed != null) {
    actions.push(normalizeAction({
      id: "daily_challenge",
      title: "Daily Challenge",
      detail: `Today's shared seed is #${todaySeed}. One run gets you into the live race immediately.`,
      whyNow: "Shared seeds create the strongest comparison point because everyone is solving the same battlefield.",
      urgency: "Best before the daily pool gets crowded.",
      accent: "#00E5FF",
      cta: "📅 PLAY TODAY",
    }, actions.length));
  }

  if (canSpendMeta) {
    actions.push(normalizeAction({
      id: "best_next_upgrade",
      title: "Best Next Upgrade",
      detail: "Idle career points are pure lost power. Spend them before the next run instead of carrying dead value.",
      whyNow: "Meta power compounds future attempts more reliably than another underpowered run.",
      urgency: "Take this first if you have enough points to buy a meaningful unlock.",
      accent: "#FFD700",
      cta: "🎖️ OPEN UPGRADES",
    }, actions.length));
  }

  if (incompleteMissionCount > 0) {
    actions.push(normalizeAction({
      id: "mission_cleanup",
      title: "Mission Cleanup",
      detail: `${incompleteMissionCount} daily mission${incompleteMissionCount === 1 ? "" : "s"} still have free progression available.`,
      whyNow: "Mission cleanup converts even average runs into account progress instead of pure variance.",
      urgency: "Worth prioritizing when your next clean run is uncertain.",
      accent: "#7CFF8A",
      cta: "📋 REVIEW MISSIONS",
    }, actions.length));
  }

  actions.push(normalizeAction({
    id: "play_now",
    title: "Play Now",
    detail: `${selectedLoadout.name} on ${currentModeLabel} is ready. Push a cleaner run while your current brief is fresh.`,
    whyNow: "Direct deployment is strongest when your selected mode and loadout already have a clear plan attached.",
    urgency: "Use this when there is no higher-leverage prep still sitting idle.",
    accent: "#FF6B35",
    cta: "▶ DEPLOY",
  }, actions.length));

  actions.push(normalizeAction({
    id: "challenge_friend",
    title: "Challenge Friend",
    detail: "Share a seeded rivalry link instead of sending a generic leaderboard screenshot.",
    whyNow: "Seeded links create repeatable competition, not one-off bragging.",
    urgency: "Best after a run worth avenging or defending.",
    accent: "#C69CFF",
    cta: "🔗 COPY CHALLENGE",
  }, actions.length));

  const deduped = [];
  for (const action of actions) {
    if (!deduped.some(existing => existing.id === action.id)) deduped.push(action);
  }
  return deduped.slice(0, 4);
}
