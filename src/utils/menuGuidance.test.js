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
