#!/usr/bin/env node

import { runDeterministicReplayCombatSlice, runDeterministicReplayStateStepper } from "../src/utils/replayResim.js";
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

  const combat = runDeterministicReplayCombatSlice(12345, fixture.trace, {
    maxFrames: 1000,
    submitted: {
      wave: fixture.expectedPressure?.finalWave || 1,
      score: fixture.expectedPressure?.finalScore || 0,
    },
  });
  if (!combat.ok) fail(`${fixture.id}: valid fixture did not run combat slice (${combat.reason || "unknown"})`);
  if (combat.coverage !== "trace_movement_actions_no_enemies") fail(`${fixture.id}: unexpected combat coverage ${combat.coverage}`);
  if (combat.commandCount !== fixture.expectedPressure.commandCount) {
    fail(`${fixture.id}: combat commandCount ${combat.commandCount} !== ${fixture.expectedPressure.commandCount}`);
  }
  if (!combat.finalState || combat.finalState.frame <= 0) fail(`${fixture.id}: missing combat final state`);
}

if (failures) {
  process.exitCode = 1;
} else {
  console.log(`[replay-stepper-fixtures] ${replayTraceFixtureTable().length} fixtures validated against deterministic movement/aim stepping and combat-slice replay actions.`);
}
