import { analyzeReplayCommandTrace } from "../src/utils/replayCommandTrace.js";
import { buildReplayPressureProfile } from "../src/utils/replayResim.js";
import { replayTraceFixtureTable } from "../src/utils/replayTraceFixtures.js";

const failures = [];

for (const fixture of replayTraceFixtureTable()) {
  const evidence = analyzeReplayCommandTrace(fixture.trace);
  const profile = buildReplayPressureProfile(12345, fixture.trace, 1000);

  if (evidence.valid !== fixture.expectedValid) {
    failures.push(`${fixture.id}: expected valid=${fixture.expectedValid}, got ${evidence.valid}`);
  }
  if (evidence.evidenceLevel !== fixture.expectedEvidenceLevel) {
    failures.push(`${fixture.id}: expected level=${fixture.expectedEvidenceLevel}, got ${evidence.evidenceLevel}`);
  }
  if (profile.valid !== fixture.expectedValid) {
    failures.push(`${fixture.id}: pressure profile valid=${profile.valid}, expected ${fixture.expectedValid}`);
  }
}

if (failures.length > 0) {
  console.error("[replay-fixtures] parity validation failed");
  for (const failure of failures) console.error(`- ${failure}`);
  if (globalThis.Deno?.exit) globalThis.Deno.exit(1);
  process.exit(1);
}

console.log(`[replay-fixtures] ${replayTraceFixtureTable().length} fixtures validated for trace evidence and pressure-profile parity.`);
