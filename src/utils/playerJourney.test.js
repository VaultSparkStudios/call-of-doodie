import { describe, expect, it } from "vitest";
import { buildFrontDoorActionStack } from "./menuGuidance.js";
import { buildPlayerJourney } from "./playerJourney.js";

function journeyFrom(input = {}) {
  const [recommendedAction] = buildFrontDoorActionStack(input);
  return buildPlayerJourney({ ...input, recommendedAction });
}

describe("buildPlayerJourney", () => {
  it("consumes the same aim-check plan that ranks first for unverified input", () => {
    const journey = journeyFrom({ totalRuns: 0, hasVerifiedInput: false });

    expect(journey.schemaVersion).toBe("player-journey-v2");
    expect(journey.stage).toBe("first_run");
    expect(journey.primary.action).toBe("deploy");
    expect(journey.secondary).toMatchObject({
      schemaVersion: "continuation-action-v2",
      id: "aim_check",
      action: "aim_check",
      reasonCode: "aim_check",
    });
  });

  it("promotes the same executable Daily plan after controls are verified", () => {
    const journey = journeyFrom({
      totalRuns: 4,
      hasVerifiedInput: true,
      dailyAlreadyPlayed: false,
      todaySeed: 12345,
    });

    expect(journey.stage).toBe("returning");
    expect(journey.secondary).toMatchObject({ action: "daily", payload: { seed: 12345 } });
  });

  it("keeps upgrade priority and evidence intact after Daily is complete", () => {
    const journey = journeyFrom({
      totalRuns: 6,
      hasVerifiedInput: true,
      dailyAlreadyPlayed: true,
      canSpendMeta: true,
      incompleteMissionCount: 3,
      meta: { careerPoints: 500, unlocked: [] },
      career: { totalRuns: 6, totalKills: 500 },
    });

    expect(journey.secondary.action).toBe("upgrades");
    expect(journey.secondary.reasonCode).toBe("best_next_upgrade");
    expect(journey.secondary.evidence).toMatchObject({ kind: "local-state" });
  });

  it("identifies mastery players by level or prestige", () => {
    expect(buildPlayerJourney({ totalRuns: 12, accountLevel: 12 }).stage).toBe("mastery");
    expect(buildPlayerJourney({ totalRuns: 5, prestige: 1 }).stage).toBe("mastery");
  });

  it("fails closed to Codex when no ranked continuation is supplied", () => {
    expect(buildPlayerJourney({ totalRuns: 5 }).secondary).toMatchObject({
      action: "codex",
      reasonCode: "no-ranked-continuation",
    });
  });
});
