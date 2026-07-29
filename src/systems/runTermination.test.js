import { describe, expect, it } from "vitest";
import { resolveRunEndAttempt, RUN_PHASE } from "./runTermination.js";

describe("run termination state machine", () => {
  it("consumes Meta Tree Last Stand only for recoverable lethal damage", () => {
    expect(resolveRunEndAttempt({ metaLastStandAvailable: true })).toMatchObject({
      kind: "recover",
      recovery: "meta-last-stand",
      health: 50,
      phase: RUN_PHASE.PLAYING,
    });
  });

  it("forces Score Attack timeout to a terminal result even when recovery is available", () => {
    expect(resolveRunEndAttempt({
      cause: "score_attack_timeout",
      allowRecovery: false,
      metaLastStandAvailable: true,
      extraLives: 2,
    })).toMatchObject({
      kind: "terminal",
      phase: RUN_PHASE.ENDING,
      cause: "score_attack_timeout",
      recoveryBypassed: true,
    });
  });

  it("uses a Guardian Angel after Last Stand has already been consumed", () => {
    expect(resolveRunEndAttempt({
      metaLastStandAvailable: true,
      metaLastStandUsed: true,
      extraLives: 1,
    })).toMatchObject({
      kind: "recover",
      recovery: "guardian-angel",
      remainingExtraLives: 0,
    });
  });

  it.each([RUN_PHASE.ENDING, RUN_PHASE.ENDED])("rejects duplicate finalization in %s", (phase) => {
    expect(resolveRunEndAttempt({ phase })).toMatchObject({ kind: "duplicate", phase });
  });
});
