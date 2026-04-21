import { describe, expect, test } from "vitest";
import {
  getArchetypeProgress,
  getDominantArchetype,
  getNewlyUnlockedArchetypes,
  getPerkArchetypeMatches,
  getDoctrineMilestones,
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
    expect(progress[0].statusLabel).toBe("FORMING");
    expect(progress[0].nextMilestoneLabel).toBe("Momentum Engine");
  });

  test("getDoctrineMilestones returns 4 ordered milestones", () => {
    // vanguard: unlockAt 3, doctrineForgeAt 5, 6 perkIds
    const archetype = {
      id: "vanguard", name: "Vanguard", emoji: "🛡️", color: "#5EE6A8",
      perkIds: ["iron_gut","vampire","bloodlust","parkour_pro","last_resort","combo_lifesteal"],
      unlockAt: 3, capstoneName: "Frontline Doctrine", capstoneDesc: "",
      doctrineForgeAt: 5, doctrineName: "Wall of Flesh", doctrineDesc: "",
    };
    const milestones = getDoctrineMilestones(archetype);
    expect(milestones).toHaveLength(4);
    expect(milestones[0].tier).toBe("forming");
    expect(milestones[1].tier).toBe("capstone");
    expect(milestones[1].at).toBe(3);
    expect(milestones[2].tier).toBe("doctrine");
    expect(milestones[2].at).toBe(5);
    expect(milestones[2].label).toBe("Wall of Flesh");
    expect(milestones[3].tier).toBe("mastered");
    expect(milestones[3].at).toBe(6);
  });

  test("getDoctrineMilestones falls back when doctrineForgeAt missing", () => {
    const archetype = {
      perkIds: ["a","b","c","d"], unlockAt: 2, capstoneName: "Cap", capstoneDesc: "",
      doctrineName: "Doctrine", doctrineDesc: "",
    };
    const milestones = getDoctrineMilestones(archetype);
    // forgeAt defaults to unlockAt + 2 = 4
    expect(milestones[2].at).toBe(4);
  });

  test("DOCTRINE FORGED tier triggers at doctrineForgeAt perk count", () => {
    // 5 gunslinger perks → doctrineForgeAt = 5 → DOCTRINE FORGED
    const gunslingerPerks = [
      { id: "eagle_eye" }, { id: "penetrator" }, { id: "overclocked" },
      { id: "bullet_hose" }, { id: "overdrive" },
    ];
    const progress = getArchetypeProgress(gunslingerPerks);
    const gs = progress.find(a => a.id === "gunslinger");
    expect(gs.statusLabel).toBe("DOCTRINE FORGED");
    expect(gs.doctrineForged).toBe(true);
  });
});
