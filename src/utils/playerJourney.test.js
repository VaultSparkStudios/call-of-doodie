import { describe, expect, it } from "vitest";
import { buildPlayerJourney } from "./playerJourney.js";

describe("buildPlayerJourney", () => {
  it("keeps first-run players focused on deploy and aim verification", () => {
    const journey = buildPlayerJourney({ totalRuns: 0, hasVerifiedInput: false });

    expect(journey.stage).toBe("first_run");
    expect(journey.primary.action).toBe("deploy");
    expect(journey.secondary.action).toBe("aim_check");
    expect(journey.commandCenterDefaultOpen).toBe(false);
  });

  it("promotes daily challenge after controls are verified", () => {
    const journey = buildPlayerJourney({
      totalRuns: 4,
      hasVerifiedInput: true,
      dailyAlreadyPlayed: false,
    });

    expect(journey.stage).toBe("returning");
    expect(journey.secondary.action).toBe("daily");
  });

  it("prefers idle meta spend after daily is complete", () => {
    const journey = buildPlayerJourney({
      totalRuns: 6,
      hasVerifiedInput: true,
      dailyAlreadyPlayed: true,
      canSpendMeta: true,
      incompleteMissionCount: 3,
    });

    expect(journey.secondary.action).toBe("upgrades");
  });

  it("identifies mastery players by level or prestige", () => {
    expect(buildPlayerJourney({ totalRuns: 12, accountLevel: 12, hasVerifiedInput: true }).stage).toBe("mastery");
    expect(buildPlayerJourney({ totalRuns: 5, prestige: 1, hasVerifiedInput: true }).stage).toBe("mastery");
  });
});
