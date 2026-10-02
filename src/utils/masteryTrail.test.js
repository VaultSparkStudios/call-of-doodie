import { beforeEach, describe, expect, it } from "vitest";
import { clearMasteryTrail, createMasteryTrail, evaluateMasteryTrail, loadMasteryTrail, saveMasteryTrail } from "./masteryTrail.js";

const first = { ts: 1000, wave: 4, totalShots: 40, totalHits: 16, bossKills: 0, deathAttribution: { evidenceLevel: "observed", sourceName: "Karen" } };
beforeEach(() => localStorage.clear());

describe("player-chosen mastery trail", () => {
  it("requires a real baseline and completes only from later saved run and unlock evidence", () => {
    expect(createMasteryTrail({ focusId: "survival", milestoneId: "doctrine" })).toBeNull();
    const trail = createMasteryTrail({ focusId: "survival", milestoneId: "doctrine", lastRun: first, doctrines: { vanguard: { firstForgedAt: 50 } }, career: {}, now: 2000 });
    expect(saveMasteryTrail(trail)).toBe(true);
    expect(loadMasteryTrail()).toEqual(trail);
    const before = evaluateMasteryTrail(trail, { runs: [{ ts: 1999, wave: 9 }, first], doctrines: { vanguard: {} } });
    expect(before.practiceRun).toBeNull();
    expect(before.completed).toBe(false);
    const after = evaluateMasteryTrail(trail, { runs: [{ ts: 3000, wave: 5 }, first], doctrines: { vanguard: {}, sentinel: {} } });
    expect(after).toMatchObject({ completed: true, practiceTarget: 5, earnedId: "sentinel", comparison: { before: 4, after: 5, unit: "wave" } });
    expect(clearMasteryTrail()).toBe(true);
    expect(loadMasteryTrail()).toBeNull();
  });

  it("sets a measurable aim target and ignores runs with too few shots", () => {
    const trail = createMasteryTrail({ focusId: "aim", milestoneId: "achievement", lastRun: first, career: { achievementsEver: ["first_blood"] }, now: 2000 });
    const result = evaluateMasteryTrail(trail, { runs: [{ ts: 4000, totalShots: 9, totalHits: 9 }, { ts: 3000, totalShots: 30, totalHits: 15 }], career: { achievementsEver: ["first_blood", "sharpshooter"] } });
    expect(result).toMatchObject({ completed: true, practiceTarget: 45, earnedId: "sharpshooter", comparison: { before: 40, after: 50, unit: "% accuracy" } });
  });

  it("keeps earned progress after a week without a streak or expiration rule", () => {
    const trail = createMasteryTrail({ focusId: "boss", milestoneId: "doctrine", lastRun: first, doctrines: {}, now: 2000 });
    trail.weeklyFocus = true;
    const result = evaluateMasteryTrail(trail, { runs: [{ ts: 2000 + 15 * 86400000, bossKills: 1 }], doctrines: { guardian: {} } });
    expect(result.completed).toBe(true);
  });
});
