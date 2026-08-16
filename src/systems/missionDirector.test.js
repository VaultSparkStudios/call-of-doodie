import { describe, expect, it } from "vitest";
import { MISSION_DIRECTOR_REASON_CODES, chooseMissionDirective } from "./missionDirector.js";

describe("missionDirector", () => {
  it("uses stable safety-first reason codes", () => {
    expect(chooseMissionDirective({ encounter: { verb: "BREACH" }, healthRatio: .1 })).toMatchObject({ reasonCode: MISSION_DIRECTOR_REASON_CODES.CRITICAL_HEALTH });
    expect(chooseMissionDirective({ encounter: { verb: "HUNT", act: 2 }, routeChosen: false })).toMatchObject({ reasonCode: MISSION_DIRECTOR_REASON_CODES.ROUTE_UNCOMMITTED });
    expect(chooseMissionDirective({ encounter: { verb: "ESCAPE" }, interactionComplete: false })).toMatchObject({ reasonCode: MISSION_DIRECTOR_REASON_CODES.INTERACTION_PENDING });
  });

  it("is deterministic for the same bounded snapshot", () => {
    const snapshot = { encounter: { verb: "BOSS", act: 3 }, healthRatio: .8, routeChosen: true, interactionComplete: true, scorePace: .9 };
    expect(chooseMissionDirective(snapshot)).toEqual(chooseMissionDirective(snapshot));
  });

  it("explains build, damage, route, and objective-history decisions without hidden difficulty changes", () => {
    expect(chooseMissionDirective({ encounter: { verb: "HOLD" }, recentDamageSource: "projectile" })).toMatchObject({ reasonCode: MISSION_DIRECTOR_REASON_CODES.DAMAGE_RESPONSE, difficultyChange: "none-player-opt-in-only" });
    expect(chooseMissionDirective({ encounter: { verb: "HUNT" }, buildArchetype: "precision", interactionComplete: true })).toMatchObject({ reasonCode: MISSION_DIRECTOR_REASON_CODES.BUILD_COUNTERPLAY });
    expect(chooseMissionDirective({ encounter: { verb: "ESCORT" }, objectiveHistory: ["ESCORT", "ESCORT"], interactionComplete: true })).toMatchObject({ reasonCode: MISSION_DIRECTOR_REASON_CODES.OBJECTIVE_VARIETY, optionalContract: "side-contract-variety" });
    expect(chooseMissionDirective({ encounter: { verb: "SABOTAGE" }, routeChoice: "boiler", routeConsequence: "steam-lane", interactionComplete: true })).toMatchObject({ reasonCode: MISSION_DIRECTOR_REASON_CODES.ROUTE_CONSEQUENCE });
  });
});
