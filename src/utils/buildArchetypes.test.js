import { describe, expect, test } from "vitest";
import {
  getArchetypeProgress,
  getDominantArchetype,
  getNewlyUnlockedArchetypes,
  getPerkArchetypeMatches,
} from "./buildArchetypes.js";

describe("build archetypes", () => {
  test("detects dominant archetype and unlock threshold", () => {
    const perks = [{ id: "eagle_eye" }, { id: "penetrator" }, { id: "overdrive" }];
    const dominant = getDominantArchetype(perks);
    expect(dominant?.id).toBe("gunslinger");
    expect(dominant?.unlocked).toBe(true);
  });

  test("finds newly unlocked archetypes against existing unlocks", () => {
    const perks = [{ id: "iron_gut" }, { id: "vampire" }, { id: "bloodlust" }];
    const unlocked = getNewlyUnlockedArchetypes(perks, []);
    expect(unlocked).toHaveLength(1);
    expect(unlocked[0].id).toBe("vanguard");
  });

  test("returns matching archetypes for a perk", () => {
    const matches = getPerkArchetypeMatches({ id: "grenade_chain" });
    expect(matches.some(match => match.id === "demolitionist")).toBe(true);
  });

  test("reports progress for partial builds", () => {
    const progress = getArchetypeProgress([{ id: "combo_master" }, { id: "turbo_boots" }]);
    expect(progress[0].id).toBe("tempo");
    expect(progress[0].remaining).toBe(1);
  });
});
