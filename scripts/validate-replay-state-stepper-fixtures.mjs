#!/usr/bin/env node

import { runDeterministicReplayStateStepper } from "../src/utils/replayResim.js";
import { replayTraceFixtureTable } from "../src/utils/replayTraceFixtures.js";

let failures = 0;
function fail(message) {
  failures++;
  console.error(`[replay-stepper-fixtures] ${message}`);
}

for (const fixture of replayTraceFixtureTable()) {
  const result = runDeterministicReplayStateStepper(12345, fixture.trace, {
    maxFrames: 1000,
    submitted: {
      wave: fixture.expectedPressure?.finalWave || 1,
      score: fixture.expectedPressure?.finalScore || 0,
    },
  });

  if (fixture.expectedValid === false) {
    if (result.ok) fail(`${fixture.id}: malformed fixture unexpectedly stepped`);
    continue;
  }

  if (!result.ok) fail(`${fixture.id}: valid fixture did not step (${result.reason || "unknown"})`);
  if (result.coverage !== "movement_aim_only") fail(`${fixture.id}: unexpected coverage ${result.coverage}`);
  if (result.commandCount !== fixture.expectedPressure.commandCount) {
    fail(`${fixture.id}: commandCount ${result.commandCount} !== ${fixture.expectedPressure.commandCount}`);
  }
  if (!result.finalState || result.finalState.frame <= 0) fail(`${fixture.id}: missing final state`);
}

if (failures) {
  process.exitCode = 1;
} else {
  console.log(`[replay-stepper-fixtures] ${replayTraceFixtureTable().length} fixtures validated against deterministic movement/aim stepping.`);
}
