import { describe, expect, it } from "vitest";
import { buildRivalPace } from "./rivalPace.js";

describe("buildRivalPace", () => {
  it("returns null without rival data", () => {
    expect(buildRivalPace({ score: 100 })).toBeNull();
  });

  it("uses the nearest score rival", () => {
    const pace = buildRivalPace({
      score: 900,
      wave: 6,
      topGhosts: [
        { name: "A", score: 5000, wave: 12 },
        { name: "B", score: 1000, wave: 5 },
      ],
    });

    expect(pace).toMatchObject({
      name: "B",
      ahead: false,
      delta: -100,
      waveDelta: 1,
    });
  });

  it("can use weekly rival data", () => {
    const pace = buildRivalPace({
      score: 1200,
      wave: 4,
      weeklyRival: { name: "DailyBoss", score: 1000, wave: 3 },
    });

    expect(pace.label).toContain("+200");
    expect(pace.source).toBe("weekly");
  });
});
