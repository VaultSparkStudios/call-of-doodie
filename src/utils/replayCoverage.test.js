import { describe, expect, it } from "vitest";
import { buildReplayCoveragePassport, REPLAY_METHODS } from "./replayCoverage.js";

describe("replay coverage passport", () => {
  it("publishes exact method-bound coverage and explicit exclusions under an advisory ceiling", () => {
    const passport = buildReplayCoveragePassport();
    expect(passport).toMatchObject({
      schemaVersion: "replay-coverage-v1",
      confidenceCeiling: "advisory",
      source: "src/utils/replayResim.js",
    });
    expect(passport.covered.map((lane) => lane.method)).toEqual([
      REPLAY_METHODS.stateStepper.method,
      REPLAY_METHODS.combatSlice.method,
      REPLAY_METHODS.contactEnemySlice.method,
    ]);
    expect(passport.excluded.map((lane) => lane.id)).toEqual([
      "full-wave-state",
      "full-combat-physics",
      "authoritative-outcome",
    ]);
    expect(passport.claim).toContain("do not reproduce the full played fight");
  });
});
