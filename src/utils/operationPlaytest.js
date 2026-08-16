export const OPERATION_PLAYTEST_SCHEMA = "operation-paired-playtest-v1";
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

function normalizeRun(run) {
  const route = boundedString(run?.route, 32).toLowerCase();
  const durationSeconds = boundedInteger(run?.durationSeconds, 1, 60 * 60);
  const scores = Object.fromEntries(SCORE_FIELDS.map((field) => [field, boundedInteger(run?.[field], 1, 5)]));
  if (!/^[a-z0-9][a-z0-9_-]{0,31}$/.test(route)
    || durationSeconds == null
    || Object.values(scores).some((value) => value == null)) return null;
  return { route, durationSeconds, ...scores };
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
    schemaVersion: "operation-paired-playtest-aggregate-v1",
    evidenceScope: "opt-in-paired-explicit-answers-aggregate-only",
    privacy: "no-source-receipts-no-identifiers-no-free-text",
    interpretation: "Descriptive participant evidence only; not causal, representative, or a population estimate.",
    sampleSize: receipts.length,
    gates: evaluateOperationPlaytestGates(receipts.length),
    routes,
    durationBuckets: durations,
    ratings,
    preferredNextMode,
  };
}
