const MAX_INTEGRITY_FAULTS = 8;

function cleanStage(value) {
  return String(value || "runtime_stage")
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 64) || "runtime_stage";
}

function cleanMessage(error) {
  const value = error instanceof Error ? error.message : error;
  return String(value || "recovered runtime fault")
    .replace(/(?:[A-Za-z]:)?[\\/][^\s]+/g, "<path>")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 160) || "recovered runtime fault";
}

export function recordRunIntegrityFault(gs, {
  stage = "runtime_stage",
  error = null,
  wave = gs?.currentWave ?? 1,
  at = Date.now(),
} = {}) {
  if (!gs || typeof gs !== "object") return null;
  const integrity = gs.runIntegrity && typeof gs.runIntegrity === "object"
    ? gs.runIntegrity
    : { version: 1, status: "clean", faults: [] };
  if (!Array.isArray(integrity.faults)) integrity.faults = [];

  const safeStage = cleanStage(stage);
  const message = cleanMessage(error);
  const fingerprint = `${safeStage}:${message}`;
  const safeWave = Math.max(1, Math.floor(Number(wave) || 1));
  const safeAt = Number.isFinite(Number(at)) ? Number(at) : Date.now();
  const existing = integrity.faults.find((fault) => fault.fingerprint === fingerprint);
  if (existing) {
    existing.occurrences += 1;
    existing.lastWave = safeWave;
    existing.lastAt = safeAt;
  } else {
    integrity.faults.push({
      fingerprint,
      stage: safeStage,
      message,
      firstWave: safeWave,
      lastWave: safeWave,
      firstAt: safeAt,
      lastAt: safeAt,
      occurrences: 1,
    });
    if (integrity.faults.length > MAX_INTEGRITY_FAULTS) {
      integrity.faults.splice(0, integrity.faults.length - MAX_INTEGRITY_FAULTS);
    }
  }

  integrity.status = "degraded";
  integrity.updatedAt = safeAt;
  integrity.claim = "competitive-eligibility-fails-closed";
  gs.runIntegrity = integrity;
  return integrity;
}

export function getRunIntegrityReceipt(source = null) {
  const integrity = source?.runIntegrity || source;
  const faults = Array.isArray(integrity?.faults) ? integrity.faults : [];
  const degraded = integrity?.status === "degraded" || faults.length > 0;
  if (!degraded) {
    return {
      status: "clean",
      onlineEligible: true,
      faultCount: 0,
      occurrenceCount: 0,
      label: "RUN INTEGRITY CLEAN",
      detail: "No recovered scoring-adjacent runtime fault was observed.",
      claim: "eligibility-from-observed-runtime-state",
    };
  }
  const occurrenceCount = faults.reduce((sum, fault) => sum + Math.max(1, Number(fault.occurrences) || 1), 0);
  return {
    status: "degraded",
    onlineEligible: false,
    faultCount: faults.length,
    occurrenceCount,
    label: "LOCAL ONLY · RUNTIME RECOVERY",
    detail: "A scoring-adjacent system recovered during this run, so global submission is disabled. Local career history is preserved.",
    claim: "competitive-eligibility-fails-closed",
    stages: [...new Set(faults.map((fault) => fault.stage).filter(Boolean))],
  };
}

export function buildIntegrityLocalSubmissionResult(receipt, board = []) {
  const resolved = receipt?.onlineEligible === false ? receipt : getRunIntegrityReceipt(receipt);
  return {
    submission: "skipped_integrity",
    online: false,
    board: Array.isArray(board) ? board : [],
    rejectionReason: resolved.detail,
    rejectionReasons: [
      `Recovered stages: ${resolved.stages?.join(", ") || "runtime"}`,
      "The run remains in local history and is not presented as globally verified.",
    ],
    integrityReceipt: resolved,
  };
}

