function cleanText(value, fallback = "") {
  const text = String(value || "").replace(/\s+/g, " ").trim();
  return text || fallback;
}

function boundedText(value, maxLength, fallback = "") {
  return cleanText(value, fallback).slice(0, maxLength);
}

function whole(value, fallback = 0) {
  const parsed = Math.floor(Number(value));
  return Number.isFinite(parsed) ? Math.max(0, parsed) : fallback;
}

export function buildActiveRunDrill({
  drill = null,
  contract = null,
  baselineWave = 1,
  baselineScore = 0,
  seed = null,
  launchKind = "new_run",
  acceptedAt = Date.now(),
} = {}) {
  if (!drill) return null;
  const requestedKind = drill?.launchKind || launchKind;
  const kind = ["new_run", "replay_seed", "rematch"].includes(requestedKind) ? requestedKind : "new_run";
  const title = cleanText(drill.title, cleanText(contract?.focus, "Next-run correction"));
  const detail = cleanText(drill.detail, cleanText(contract?.target, "Apply the accepted coaching focus during this run."));
  const baseline = {
    wave: Math.max(1, whole(drill.baselineWave ?? baselineWave, 1)),
    score: whole(drill.baselineScore ?? baselineScore, 0),
  };
  const timestamp = Number(drill.acceptedAt ?? acceptedAt);
  const accepted = Number.isFinite(timestamp) && timestamp > 0 ? timestamp : Date.now();
  return {
    version: 1,
    receiptId: `drill:${cleanText(drill.id, "next_run")}:${accepted}`,
    id: cleanText(drill.id, "next_run"),
    title,
    detail,
    target: cleanText(drill.contract?.target || contract?.target, detail),
    proof: cleanText(drill.contract?.proof || contract?.proof, "Compare the observed run result with the prior baseline."),
    baseline,
    seed: Number.isFinite(Number(seed)) ? Number(seed) : null,
    launchKind: kind,
    practice: kind === "rematch",
    acceptedAt: accepted,
    label: kind === "rematch" ? "REMATCH DRILL" : "LIVE DRILL",
  };
}

export function buildRunDrillOutcomeReceipt(activeDrill, {
  wave = 1,
  score = 0,
  endedAt = Date.now(),
} = {}) {
  if (!activeDrill?.receiptId) return null;
  const observed = { wave: Math.max(1, whole(wave, 1)), score: whole(score, 0) };
  const baseline = {
    wave: Math.max(1, whole(activeDrill.baseline?.wave, 1)),
    score: whole(activeDrill.baseline?.score, 0),
  };
  const waveDelta = observed.wave - baseline.wave;
  const scoreDelta = observed.score - baseline.score;
  const comparableScore = activeDrill.launchKind !== "rematch";
  const improved = waveDelta > 0 || (waveDelta === 0 && comparableScore && scoreDelta > 0);
  const held = waveDelta === 0 && (!comparableScore || scoreDelta === 0);
  const status = improved ? "improved" : held ? "held" : "regressed";
  return {
    version: 1,
    receiptId: activeDrill.receiptId,
    drillId: activeDrill.id,
    title: activeDrill.title,
    launchKind: activeDrill.launchKind,
    baseline,
    observed,
    waveDelta,
    scoreDelta: comparableScore ? scoreDelta : null,
    status,
    masteryClaim: "observed-outcome-only",
    label: status === "improved" ? "IMPROVEMENT OBSERVED" : status === "held" ? "BASELINE HELD" : "MORE PRACTICE NEEDED",
    summary: status === "improved"
      ? `Reached wave ${observed.wave} versus ${baseline.wave} before the drill.`
      : status === "held"
        ? `Matched the prior wave ${baseline.wave}; no causal mastery claim.`
        : `Reached wave ${observed.wave} versus prior wave ${baseline.wave}; keep the drill active.`,
    endedAt: Number(endedAt) || Date.now(),
  };
}

export function buildDrillEvidenceLedger(receipts = [], {
  drillId = null,
  targetImprovements = 2,
  windowSize = 3,
} = {}) {
  const target = Math.max(1, whole(targetImprovements, 2));
  const window = Math.max(target, whole(windowSize, 3));
  const seen = new Set();
  const relevant = receipts
    .filter((receipt) => receipt?.receiptId && (!drillId || receipt.drillId === drillId))
    .sort((a, b) => Number(b.endedAt || 0) - Number(a.endedAt || 0))
    .filter((receipt) => {
      if (seen.has(receipt.receiptId)) return false;
      seen.add(receipt.receiptId);
      return true;
    })
    .slice(0, window);
  const improvements = relevant.filter((receipt) => receipt.status === "improved").length;
  const repeatable = improvements >= target;
  return {
    drillId: drillId || relevant[0]?.drillId || null,
    attempts: relevant.length,
    improvements,
    targetImprovements: target,
    windowSize: window,
    repeatable,
    claim: "repeatability-evidence-not-causality",
    label: repeatable ? "REPEATABLE IMPROVEMENT" : `EVIDENCE ${improvements}/${target}`,
  };
}
export function buildDrillLaunchPayload(drill, contract, {
  baselineWave = 1,
  baselineScore = 0,
  launchKind = "new_run",
  acceptedAt = Date.now(),
} = {}) {
  return {
    ...drill,
    schemaVersion: "menu-run-drill-v1",
    contract: contract ? { id: contract.id, focus: contract.focus, target: contract.target, proof: contract.proof } : null,
    baselineWave: Math.max(1, whole(baselineWave, 1)),
    baselineScore: whole(baselineScore, 0),
    launchKind,
    acceptedAt,
  };
}

export function sanitizeCarriedRunDrill(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const contractSource = value.contract && typeof value.contract === "object" ? value.contract : value;
  const contract = {
    id: boundedText(contractSource.id || value.id, 48),
    focus: boundedText(contractSource.focus, 72),
    target: boundedText(contractSource.target, 220),
    proof: boundedText(contractSource.proof, 220),
  };
  if (!contract.id || !contract.focus || !contract.target || !contract.proof) return null;
  const launchKind = ["new_run", "replay_seed"].includes(value.launchKind) ? value.launchKind : "new_run";
  const acceptedAt = Number(value.acceptedAt);
  const seed = Number(value.seed);
  return {
    schemaVersion: "menu-run-drill-v1",
    id: boundedText(value.id || contract.id, 48, contract.id),
    title: boundedText(value.title, 120, contract.focus),
    detail: boundedText(value.detail, 280, contract.target),
    contract,
    baselineWave: Math.max(1, whole(value.baselineWave, 1)),
    baselineScore: whole(value.baselineScore, 0),
    seed: Number.isFinite(seed) && seed > 0 ? Math.floor(seed) % 999999 : null,
    launchKind,
    acceptedAt: Number.isFinite(acceptedAt) && acceptedAt > 0 ? Math.floor(acceptedAt) : Date.now(),
  };
}


export function buildRunDrillLiveProgress(activeDrill, {
  wave = 1,
  score = 0,
} = {}) {
  if (!activeDrill?.receiptId) return null;
  const baselineWave = Math.max(1, whole(activeDrill.baseline?.wave, 1));
  const baselineScore = whole(activeDrill.baseline?.score, 0);
  const observedWave = Math.max(1, whole(wave, 1));
  const observedScore = whole(score, 0);
  const comparableScore = activeDrill.launchKind !== "rematch";
  const waveDelta = observedWave - baselineWave;
  const scoreDelta = comparableScore ? observedScore - baselineScore : null;
  const passed = waveDelta > 0 || (waveDelta === 0 && comparableScore && scoreDelta > 0);
  const held = waveDelta === 0 && (!comparableScore || scoreDelta === 0);
  const status = passed ? "passed" : held ? "held" : "before";
  return {
    status,
    baseline: { wave: baselineWave, score: baselineScore },
    observed: { wave: observedWave, score: observedScore },
    waveDelta,
    scoreDelta,
    claim: "observed-progress-not-causality",
    label: status === "passed"
      ? `BASELINE PASSED · W${observedWave}`
      : status === "held"
        ? `BASELINE HELD · W${observedWave}`
        : `BEFORE BASELINE · W${observedWave}/${baselineWave}`,
    color: status === "passed" ? "#7CFFBE" : status === "held" ? "#FFD166" : "#BFF7FF",
  };
}
