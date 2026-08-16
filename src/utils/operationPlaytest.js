export const OPERATION_PLAYTEST_SCHEMA = "operation-paired-playtest-v2";
export const CAMPAIGN_BREADTH_SAMPLE_MINIMUM = 10;
export const REALTIME_COOP_SAMPLE_MINIMUM = 20;

export const OPERATION_PLAYTEST_QUESTIONS = Object.freeze([
  "route", "durationSeconds", "repeatedness", "objectiveClarity", "controlTrust",
  "threatReadability", "memorableMoment", "immediateReplayIntent", "preferredNextMode",
]);

const SCORE_FIELDS = OPERATION_PLAYTEST_QUESTIONS.filter((field) => !["route", "durationSeconds", "preferredNextMode"].includes(field));
const MODES = ["standard", "operation"];
const PREFERRED_MODES = new Set(["standard", "operation", "either", "neither"]);
const DURATION_BUCKETS = [
  ["under_5m", 300], ["5_to_9m", 600], ["10_to_14m", 900],
  ["15_to_19m", 1200], ["20m_plus", Infinity],
];

function boundedString(value, max = 48) {
  return String(value ?? "").replace(/[\u0000-\u001f\u007f]/g, " ").trim().slice(0, max);
}

function boundedInteger(value, min, max) {
  if (value == null || value === "" || typeof value === "boolean") return null;
  const number = Math.floor(Number(value));
  if (!Number.isFinite(number)) return null;
  return Math.max(min, Math.min(max, number));
}

function fingerprint(value) {
  let result = 2166136261;
  for (const character of JSON.stringify(value)) {
    result ^= character.charCodeAt(0);
    result = Math.imul(result, 16777619);
  }
  return (result >>> 0).toString(16).padStart(8, "0").toUpperCase();
}

export function buildRunEvidenceReference(run, kind = "standard") {
  const evidenceKind = kind === "operation" ? "operation" : "standard";
  const bounded = {
    kind: evidenceKind,
    mode: boundedString(run?.mode || evidenceKind, 16),
    score: boundedInteger(run?.score ?? run?.runScore, 0, 100000000) ?? 0,
    kills: boundedInteger(run?.kills, 0, 1000000) ?? 0,
    wave: boundedInteger(run?.wave, 0, 10000) ?? 0,
    durationSeconds: boundedInteger(run?.time ?? run?.durationSeconds, 1, 60 * 60) ?? 1,
    difficulty: boundedString(run?.difficulty, 16),
    runSeed: boundedInteger(run?.runSeed ?? run?.seed, 0, 0xffffffff),
    operationId: boundedString(run?.operationId ?? run?.operation?.operationId, 32),
    route: boundedString(run?.route ?? run?.operation?.route, 32),
    sourceFingerprint: boundedString(run?.fingerprint ?? run?.operation?.fingerprint, 16),
  };
  return `${evidenceKind}:${fingerprint(bounded)}`;
}

export function selectComparableStandardRuns(history, limit = 8) {
  const result = [];
  const seen = new Set();
  for (const run of Array.isArray(history) ? history : []) {
    if (run?.mode !== "standard" || run?.practiceRun === true || run?.integrityReceipt?.onlineEligible === false) continue;
    const durationSeconds = boundedInteger(run.time, 1, 60 * 60);
    const wave = boundedInteger(run.wave, 1, 10000);
    if (durationSeconds == null || wave == null) continue;
    const evidenceRef = buildRunEvidenceReference(run, "standard");
    if (seen.has(evidenceRef)) continue;
    seen.add(evidenceRef);
    result.push({
      evidenceRef,
      route: `standard-${boundedString(run.difficulty || "normal", 16).toLowerCase()}`,
      durationSeconds,
      wave,
      score: boundedInteger(run.score, 0, 100000000) ?? 0,
      difficulty: boundedString(run.difficulty || "normal", 16).toLowerCase(),
    });
    if (result.length >= Math.max(1, Math.min(20, Math.floor(Number(limit) || 8)))) break;
  }
  return result;
}

function normalizeRun(run) {
  const route = boundedString(run?.route, 32).toLowerCase();
  const durationSeconds = boundedInteger(run?.durationSeconds, 1, 60 * 60);
  const scores = Object.fromEntries(SCORE_FIELDS.map((field) => [field, boundedInteger(run?.[field], 1, 5)]));
  const evidenceRef = boundedString(run?.evidenceRef, 27);
  if (!/^[a-z0-9][a-z0-9_-]{0,31}$/.test(route)
    || !/^(standard|operation):[A-F0-9]{8}$/.test(evidenceRef)
    || durationSeconds == null
    || Object.values(scores).some((value) => value == null)) return null;
  return { evidenceRef, route, durationSeconds, ...scores };
}

function emptyCounts(keys) {
  return Object.fromEntries(keys.map((key) => [key, 0]));
}

function summarizeScores(receipts, mode, field) {
  const distribution = emptyCounts(["1", "2", "3", "4", "5"]);
  let total = 0;
  receipts.forEach((receipt) => {
    const score = receipt.responses[mode][field];
    distribution[String(score)] += 1;
    total += score;
  });
  return { distribution, mean: receipts.length ? Number((total / receipts.length).toFixed(2)) : null };
}

/** Creates one identity-free receipt; the caller must pass explicit opt-in. */
export function createPairedOperationPlaytestReceipt({ optIn = false, standard, operation, preferredNextMode } = {}) {
  if (optIn !== true) return null;
  const normalizedStandard = normalizeRun(standard);
  const normalizedOperation = normalizeRun(operation);
  const preference = boundedString(preferredNextMode, 16).toLowerCase();
  if (!normalizedStandard || !normalizedOperation || !PREFERRED_MODES.has(preference)) return null;
  return {
    schemaVersion: OPERATION_PLAYTEST_SCHEMA,
    evidenceScope: "opt-in-paired-standard-vs-operation-explicit-answers",
    privacy: "aggregate-only-no-identifiers-no-free-text-no-upload",
    consented: true,
    responses: { standard: normalizedStandard, operation: normalizedOperation },
    preferredNextMode: preference,
    complete: true,
  };
}

export function evaluateOperationPlaytestGates(sampleSize) {
  const count = Math.max(0, Math.floor(Number(sampleSize) || 0));
  const gate = (minimum) => ({ minimum, eligible: count >= minimum, remaining: Math.max(0, minimum - count) });
  return {
    campaignBreadth: gate(CAMPAIGN_BREADTH_SAMPLE_MINIMUM),
    realtimeCoop: gate(REALTIME_COOP_SAMPLE_MINIMUM),
  };
}

/** Returns publishable aggregates and intentionally omits every source receipt. */
export function aggregateOperationPlaytestReceipts(input = []) {
  const receipts = Array.isArray(input)
    ? input.filter((receipt) => receipt?.schemaVersion === OPERATION_PLAYTEST_SCHEMA
      && receipt.complete === true
      && receipt.consented === true
      && receipt.responses?.standard
      && receipt.responses?.operation
      && PREFERRED_MODES.has(receipt.preferredNextMode))
    : [];
  const routes = { standard: {}, operation: {} };
  const bucketKeys = DURATION_BUCKETS.map(([key]) => key);
  const durations = { standard: emptyCounts(bucketKeys), operation: emptyCounts(bucketKeys) };
  const preferredNextMode = emptyCounts([...PREFERRED_MODES]);

  receipts.forEach((receipt) => {
    MODES.forEach((mode) => {
      const response = receipt.responses[mode];
      routes[mode][response.route] = (routes[mode][response.route] || 0) + 1;
      const bucket = DURATION_BUCKETS.find(([, upper]) => response.durationSeconds < upper)?.[0] || "20m_plus";
      durations[mode][bucket] += 1;
    });
    preferredNextMode[receipt.preferredNextMode] += 1;
  });

  const ratings = Object.fromEntries(SCORE_FIELDS.map((field) => [field, {
    standard: summarizeScores(receipts, "standard", field),
    operation: summarizeScores(receipts, "operation", field),
  }]));
  return {
    schemaVersion: "operation-paired-playtest-aggregate-v2",
    evidenceScope: "opt-in-evidence-bound-paired-explicit-answers-aggregate-only",
    privacy: "no-source-receipts-no-identifiers-no-free-text",
    interpretation: "Descriptive participant evidence only; not causal, representative, or a population estimate.",
    sampleSize: receipts.length,
    provenance: {
      evidenceBoundReceipts: receipts.length,
      legacyExcluded: Array.isArray(input) ? input.length - receipts.length : 0,
      referenceDisclosure: "counts-only-no-run-references",
    },
    gates: evaluateOperationPlaytestGates(receipts.length),
    routes,
    durationBuckets: durations,
    ratings,
    preferredNextMode,
  };
}
