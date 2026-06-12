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
  const synced = recent.filter((event) => event?.syncStatus === "synced");
  const pendingSync = recent.filter((event) => event?.syncStatus === "pending");
  const failedSync = recent.filter((event) => event?.syncStatus === "failed");
  const latestRejection = trust.find((event) => event?.type === "submission_rejected") || null;
  const latestSubmission = trust.find((event) => event?.type === "score_submit_result") || null;
  const traceEvidenceEvents = trust.filter((event) => event?.payload?.traceEvidence?.level);
  const traceEvidenceCounts = traceEvidenceEvents.reduce((counts, event) => {
    const level = event.payload.traceEvidence.level || "none";
    counts[level] = (counts[level] || 0) + 1;
    return counts;
  }, { none: 0, weak: 0, basic: 0, rich: 0 });
  const latestTraceEvidence = traceEvidenceEvents[0]?.payload?.traceEvidence || null;
  const latestSyncedEvent = synced.find((event) => event?.syncedAt) || null;
  const traceContract = buildTraceEvidenceContract(latestTraceEvidence);
  const resimReadiness = buildReplayResimReadiness({
    traceEvidenceCounts,
    syncedCount: synced.length,
    failedSyncCount: failedSync.length,
    latestTraceEvidence,
  });
  const nextBenchmark = buildTraceProofNextBenchmark({
    traceContract,
    resimReadiness,
    traceEvidenceCounts,
    failedSyncCount: failedSync.length,
  });
  return {
    trust,
    frontDoorCount: frontDoor.length,
    debriefCount: debrief.length,
    perkChoiceCount: perkChoices.length,
    routeChoiceCount: routeChoices.length,
    abandonmentCount: abandonments.length,
    contractCount: contracts.length,
    syncedCount: synced.length,
    pendingSyncCount: pendingSync.length,
    failedSyncCount: failedSync.length,
    latestSyncedAt: latestSyncedEvent?.syncedAt || null,
    rejectionCount: trust.filter((event) => event?.type === "submission_rejected").length,
    latestRejection,
    latestSubmission,
    traceEvidenceCounts,
    latestTraceEvidence,
    traceContract,
    resimReadiness,
    nextBenchmark,
  };
}

export function buildTraceEvidenceContract(traceEvidence = null) {
  const level = traceEvidence?.level || "none";
  const reasons = Array.isArray(traceEvidence?.weaknessReasons) ? traceEvidence.weaknessReasons : [];
  if (level === "rich") {
    return {
      status: "complete",
      title: "Replay Proof Ready",
      target: "Keep trace capture active and bank another rich seeded run.",
      detail: "Movement, aim, and interaction evidence are strong enough for replay-trust work.",
    };
  }
  if (level === "basic") {
    return {
      status: "almost",
      title: "Upgrade Replay Proof",
      target: "Add two movement samples, one aim sample, and two interactions across a 60+ frame run.",
      detail: "The trace is valid, but it needs richer player intent before it can carry high-trust replay claims.",
    };
  }

  const targetParts = [];
  if (reasons.includes("too-few-events") || reasons.includes("no-events")) targetParts.push("record at least 6 trace events");
  if (reasons.includes("short-duration")) targetParts.push("span at least 60 frames");
  if (reasons.includes("low-movement-evidence")) targetParts.push("move in two distinct windows");
  if (reasons.includes("missing-aim-evidence")) targetParts.push("aim before firing");
  if (reasons.includes("low-interaction-evidence")) targetParts.push("fire, reload, dash, or choose a route twice");
  if (reasons.includes("invalid-trace")) targetParts.push("submit a valid trace body");

  return {
    status: level === "weak" ? "needs-drill" : "no-sample",
    title: level === "weak" ? "Trace Proof Drill" : "Trace Proof Baseline",
    target: targetParts.length ? targetParts.join("; ") + "." : "Bank one seeded run with movement, aim, and interaction evidence.",
    detail: level === "weak"
      ? "This accepted run needs a clearer input trail before replay trust can advance."
      : "No usable trace evidence has been recorded yet.",
  };
}

export function buildReplayResimReadiness({
  traceEvidenceCounts = {},
  syncedCount = 0,
  failedSyncCount = 0,
  latestTraceEvidence = null,
} = {}) {
  const rich = traceEvidenceCounts.rich || 0;
  const basic = traceEvidenceCounts.basic || 0;
  const weak = traceEvidenceCounts.weak || 0;
  const latestLevel = latestTraceEvidence?.level || "none";
  let status = "no-samples";
  let score = 10;
  let detail = "No trace evidence samples are available for replay-resim work.";

  if (rich >= 2 && failedSyncCount === 0) {
    status = "ready";
    score = 95;
    detail = "Multiple rich traces and clean sync health make the pressure-estimate resim pilot credible.";
  } else if (rich >= 1) {
    status = "pilot-ready";
    score = failedSyncCount > 0 ? 68 : 78;
    detail = "At least one rich trace exists; bank another rich sample before widening the gate.";
  } else if (rich + basic >= 2) {
    status = "evidence-building";
    score = 58;
    detail = "Trace samples are valid, but need richer movement and aim evidence.";
  } else if (weak > 0 || latestLevel === "weak") {
    status = "needs-drill";
    score = 35;
    detail = "Accepted runs exist, but replay evidence is still too weak for resim confidence.";
  }

  if (failedSyncCount > 0) {
    score = Math.max(0, score - 10);
    detail += " Sync retries should be cleared before treating this as production-ready.";
  }

  return {
    status,
    score,
    label: `Resim ${status.replace(/-/g, " ")}`,
    detail,
    samples: { rich, basic, weak, synced: syncedCount, retry: failedSyncCount },
  };
}

export function buildTraceProofNextBenchmark({
  traceContract = null,
  resimReadiness = null,
  traceEvidenceCounts = {},
  failedSyncCount = 0,
} = {}) {
  const rich = traceEvidenceCounts.rich || 0;
  const basic = traceEvidenceCounts.basic || 0;
  const weak = traceEvidenceCounts.weak || 0;
  const readinessStatus = resimReadiness?.status || "no-samples";

  if (readinessStatus === "ready") {
    return {
      status: "ready",
      title: "Replay Trust Pilot",
      target: "Start the replay-resim pressure-estimate review with the rich-trace fixture set.",
      measure: `${rich} rich trace samples · ${failedSyncCount} sync retries`,
    };
  }

  if (readinessStatus === "pilot-ready") {
    return {
      status: "bank-one-more",
      title: "Bank One More Rich Trace",
      target: "Capture one more accepted seeded run with rich movement, aim, and interaction evidence before widening replay gates.",
      measure: `${rich} rich · ${basic} basic · ${weak} weak`,
    };
  }

  if (traceContract?.status === "almost" || readinessStatus === "evidence-building") {
    return {
      status: "upgrade-basic",
      title: "Upgrade Basic Trace",
      target: traceContract?.target || "Turn the next basic trace into a rich trace with movement, aim, and interaction coverage.",
      measure: `${basic} basic trace sample${basic === 1 ? "" : "s"} available`,
    };
  }

  if (traceContract?.status === "needs-drill" || readinessStatus === "needs-drill") {
    return {
      status: "proof-drill",
      title: "Run Trace Proof Drill",
      target: traceContract?.target || "Bank one seeded run with movement, aim, and interaction evidence.",
      measure: `${weak} weak trace sample${weak === 1 ? "" : "s"} found`,
    };
  }

  return {
    status: "baseline",
    title: "Create Trace Baseline",
    target: "Submit one seeded run with trace capture active so replay trust has a first sample.",
    measure: "0 usable trace samples",
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
  if (summary.latestTraceEvidence?.level) {
    lines.push(`Replay evidence: ${summary.latestTraceEvidence.level}${summary.latestTraceEvidence.count ? ` · ${summary.latestTraceEvidence.count} trace events` : ""}.`);
  }
  if (summary.latestTraceEvidence?.level === "weak" && summary.latestTraceEvidence.weaknessReasons?.[0]) {
    lines.push(`Trace gap: ${summary.latestTraceEvidence.weaknessReasons[0]}`);
  }
  if (summary.traceContract?.target) {
    lines.push(`${summary.traceContract.title}: ${summary.traceContract.target}`);
  }
  if (summary.resimReadiness?.label) {
    lines.push(`${summary.resimReadiness.label}: ${summary.resimReadiness.detail}`);
  }
  if (summary.nextBenchmark?.title) {
    lines.push(`${summary.nextBenchmark.title}: ${summary.nextBenchmark.target}`);
  }
  if (summary.rejectionCount === 0) {
    lines.push("No local rejection history recorded yet.");
  }
  if (summary.failedSyncCount > 0) {
    lines.push(`Sync retry needed: ${summary.failedSyncCount} event${summary.failedSyncCount === 1 ? "" : "s"} failed to upload.`);
  } else if (summary.pendingSyncCount > 0) {
    lines.push(`Queued for sync: ${summary.pendingSyncCount} unsent event${summary.pendingSyncCount === 1 ? "" : "s"}.`);
  } else if (summary.syncedCount > 0) {
    lines.push(`Server sync healthy: ${summary.syncedCount} recent event${summary.syncedCount === 1 ? "" : "s"} mirrored.`);
  }
  if (summary.abandonmentCount > 0) {
    lines.push(`Abandonments logged: ${summary.abandonmentCount}`);
  }
  if (summary.perkChoiceCount > 0 || summary.routeChoiceCount > 0) {
    lines.push(`Decision telemetry: ${summary.perkChoiceCount} perk picks · ${summary.routeChoiceCount} route picks`);
  }
  return lines.slice(0, 6);
}
