import { describe, expect, test } from "vitest";
import { buildCommandBrief, buildFrontDoorActionStack } from "./menuGuidance.js";

describe("menuGuidance", () => {
  test("prioritizes daily challenge before generic play when the player has not entered yet", () => {
    const stack = buildFrontDoorActionStack({
      dailyAlreadyPlayed: false,
      canSpendMeta: true,
      incompleteMissionCount: 2,
      selectedLoadout: { name: "Standard Issue" },
      currentModeLabel: "Standard",
      todaySeed: 12345,
      totalRuns: 5,
    });

    expect(stack[0].id).toBe("daily_challenge");
    expect(stack.some(action => action.id === "best_next_upgrade")).toBe(true);
    expect(stack.some(action => action.id === "play_now")).toBe(true);
  });

  test("puts challenge acceptance at the top when the session starts from a rivalry link", () => {
    const stack = buildFrontDoorActionStack({
      challenge: { seed: 7788, vsScore: 42000, vsName: "Rival" },
      dailyAlreadyPlayed: true,
      selectedLoadout: { name: "Glass Cannon" },
      currentModeLabel: "Hard",
      todaySeed: 7788,
      totalRuns: 10,
    });

    expect(stack[0].id).toBe("accept_challenge");
    expect(stack[0].detail).toContain("42,000");
    expect(stack[0].whyNow).toContain("seed");
  });

  test("first-run players get a single stripped action (no clutter)", () => {
    const stack = buildFrontDoorActionStack({
      totalRuns: 0,
      canSpendMeta: true,
      incompleteMissionCount: 5,
      todaySeed: 99999,
    });
    expect(stack).toHaveLength(1);
    expect(stack[0].id).toBe("play_now");
    expect(stack[0].title).toBe("Your First Drop");
  });

  test("best_next_upgrade action includes metaRec when career analysis yields a recommendation", () => {
    const career = { totalRuns: 10, totalKills: 500, totalDeaths: 5, bestWave: 12 };
    const stack = buildFrontDoorActionStack({
      canSpendMeta: true,
      totalRuns: 10,
      unlocked: [],
      meta: { careerPoints: 500, unlocked: [] },
      career,
      selectedLoadout: { name: "Standard Issue" },
      currentModeLabel: "Standard",
    });
    const upgradeAction = stack.find(a => a.id === "best_next_upgrade");
    expect(upgradeAction).toBeDefined();
    expect(upgradeAction.metaRec).not.toBeNull();
    expect(upgradeAction.metaRec.node).toBeDefined();
  });

  test("builds a command brief that reflects the selected mode and loadout", () => {
    const brief = buildCommandBrief({
      mode: "boss_rush",
      selectedLoadout: { id: "tank", name: "Tank" },
      weeklyMutation: { emoji: "🧬", name: "Chaos Tax", desc: "Bosses drop extra pressure adds." },
    });

    expect(brief[0]).toContain("boss");
    expect(brief[1]).toContain("Tank");
    expect(brief[2]).toContain("Chaos Tax");
  });
});
