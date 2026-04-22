function byNewest(a, b) {
  return String(b?.createdAt || "").localeCompare(String(a?.createdAt || ""));
}

export function summarizeStudioEvents(studioEvents = []) {
  const recent = studioEvents.slice(0, 50).sort(byNewest);
  const trust = recent.filter((event) => event?.category === "trust");
  const frontDoor = recent.filter((event) => event?.type === "front_door_action");
  const debrief = recent.filter((event) => event?.category === "debrief");
  const perkChoices = recent.filter((event) => event?.type === "perk_choice");
  const routeChoices = recent.filter((event) => event?.type === "route_choice");
  const abandonments = recent.filter((event) => event?.type === "mode_abandon");
  const contracts = recent.filter((event) => event?.type === "weekly_contract_progress");
  const latestRejection = trust.find((event) => event?.type === "submission_rejected") || null;
  const latestSubmission = trust.find((event) => event?.type === "score_submit_result") || null;
  return {
    trust,
    frontDoorCount: frontDoor.length,
    debriefCount: debrief.length,
    perkChoiceCount: perkChoices.length,
    routeChoiceCount: routeChoices.length,
    abandonmentCount: abandonments.length,
    contractCount: contracts.length,
    rejectionCount: trust.filter((event) => event?.type === "submission_rejected").length,
    latestRejection,
    latestSubmission,
  };
}

export function buildTrustRecommendations(summary) {
  const lines = [];
  if (summary.latestRejection?.payload?.reason) {
    lines.push(`Last rejection: ${summary.latestRejection.payload.reason}`);
  }
  if (summary.latestRejection?.payload?.reasons?.[0]) {
    lines.push(`Top flag: ${summary.latestRejection.payload.reasons[0]}`);
  }
  if (summary.rejectionCount === 0) {
    lines.push("No local rejection history recorded yet.");
  }
  if (summary.abandonmentCount > 0) {
    lines.push(`Abandonments logged: ${summary.abandonmentCount}`);
  }
  if (summary.perkChoiceCount > 0 || summary.routeChoiceCount > 0) {
    lines.push(`Decision telemetry: ${summary.perkChoiceCount} perk picks · ${summary.routeChoiceCount} route picks`);
  }
  return lines.slice(0, 4);
}
