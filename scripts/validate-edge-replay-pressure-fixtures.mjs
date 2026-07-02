import { buildReplayPressureProfile, runResim } from "../src/utils/replayResim.js";
import { replayTraceFixtureTable } from "../src/utils/replayTraceFixtures.js";
import {
  analyzeTraceEvidence,
  buildTracePressureReceipt,
  collectTraceBodyFailures,
} from "../supabase/functions/validate-replay/pressure.js";

const failures = [];
const seed = 12345;

for (const fixture of replayTraceFixtureTable()) {
  const trace = fixture.trace;
  const browserProfile = buildReplayPressureProfile(seed, trace, 1000);
  const bodyFailures = collectTraceBodyFailures(trace.digest, trace.count, trace.body);

  if (fixture.expectedValid && bodyFailures.length > 0) {
    failures.push(`${fixture.id}: Edge body validation failed unexpectedly: ${bodyFailures.join(", ")}`);
    continue;
  }

  if (!fixture.expectedValid) {
    if (bodyFailures.length === 0) {
      failures.push(`${fixture.id}: expected Edge body validation failure for malformed fixture`);
    }
    continue;
  }

  const evidence = analyzeTraceEvidence(trace.body);
  if (evidence.level !== fixture.expectedEvidenceLevel) {
    failures.push(`${fixture.id}: expected Edge evidence level ${fixture.expectedEvidenceLevel}, got ${evidence.level}`);
  }

  const receipt = buildTracePressureReceipt(
    {
      seed,
      wave: fixture.expectedPressure.finalWave,
      score: fixture.expectedPressure.finalScore,
    },
    trace.body,
    trace.count,
  );

  for (const key of ["pressureClass", "commandCount", "finalWave", "finalScore"]) {
    if (receipt[key] !== fixture.expectedPressure[key]) {
      failures.push(`${fixture.id}: expected Edge ${key}=${fixture.expectedPressure[key]}, got ${receipt[key]}`);
    }
    if (receipt[key] !== browserProfile[key]) {
      failures.push(`${fixture.id}: Edge ${key}=${receipt[key]} drifted from browser ${browserProfile[key]}`);
    }
  }

  const browserResim = runResim(seed, trace, 1000, {
    wave: fixture.expectedPressure.finalWave,
    score: fixture.expectedPressure.finalScore,
  });
  const edgeSlices = receipt.deterministicSlices;
  const comparisons = [
    ["contract.ready", edgeSlices?.contract?.ready, browserResim.deterministicContract?.ready],
    ["stepper.method", edgeSlices?.stepper?.method, browserResim.deterministicStepper?.method],
    ["stepper.coverage", edgeSlices?.stepper?.coverage, browserResim.deterministicStepper?.coverage],
    ["combat.method", edgeSlices?.combatSlice?.method, browserResim.deterministicCombatSlice?.method],
    ["combat.coverage", edgeSlices?.combatSlice?.coverage, browserResim.deterministicCombatSlice?.coverage],
    ["contact.method", edgeSlices?.contactEnemySlice?.method, browserResim.deterministicContactEnemySlice?.method],
    ["contact.coverage", edgeSlices?.contactEnemySlice?.coverage, browserResim.deterministicContactEnemySlice?.coverage],
    ["contact.derivedSpawn", JSON.stringify(edgeSlices?.contactEnemySlice?.derivedSpawn), JSON.stringify(browserResim.deterministicContactEnemySlice?.derivedSpawn)],
    ["contact.contactCount", edgeSlices?.contactEnemySlice?.contactCount, browserResim.deterministicContactEnemySlice?.contactCount],
    ["contact.damageTaken", edgeSlices?.contactEnemySlice?.damageTaken, browserResim.deterministicContactEnemySlice?.damageTaken],
  ];
  for (const [label, edgeValue, browserValue] of comparisons) {
    if (edgeValue !== browserValue) {
      failures.push(`${fixture.id}: Edge ${label}=${edgeValue} drifted from browser ${browserValue}`);
    }
  }
}

if (failures.length > 0) {
  console.error("[edge-replay-fixtures] parity validation failed");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(`[edge-replay-fixtures] ${replayTraceFixtureTable().length} fixtures validated against Edge pressure receipt parity.`);
