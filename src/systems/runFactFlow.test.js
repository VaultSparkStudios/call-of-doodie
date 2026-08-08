import { beforeEach, describe, expect, it, vi } from "vitest";

const storage = vi.hoisted(() => ({
  saveFieldReport: vi.fn(),
  syncCompletedRunFact: vi.fn(),
}));

vi.mock("../storage.js", () => storage);

import {
  applyThreatRecommendationChoice,
  queueCompletedRunFact,
  recordPostRunFieldReport,
} from "./runFactFlow.js";

const context = {
  runToken: "token",
  summarySig: "signature",
  name: "PLUNGER",
  runFlags: { zombies: false },
  difficulty: "normal",
  seed: 42,
  starterLoadout: "balanced",
  score: 8000,
  kills: 40,
  wave: 5,
  durationSeconds: 180,
  totalDamage: 9000,
  stats: { totalShots: 100, totalHits: 55, crits: 8, bossKills: 1 },
  practiceRun: false,
};

describe("runFactFlow", () => {
  beforeEach(() => {
    storage.saveFieldReport.mockReset();
    storage.syncCompletedRunFact.mockReset().mockResolvedValue({ submission: "synced" });
  });

  it("maps one complete run into the durable fact contract", async () => {
    await queueCompletedRunFact(context);
    expect(storage.syncCompletedRunFact).toHaveBeenCalledWith(expect.objectContaining({
      mode: "standard",
      totalShots: 100,
      totalHits: 55,
      totalCrits: 8,
      bossKills: 1,
    }));
  });

  it("uses repeated explicit feedback for an opt-in recommendation", async () => {
    storage.saveFieldReport.mockReturnValue([
      { feedback: "too_easy" },
      { feedback: "too_easy" },
    ]);
    await expect(recordPostRunFieldReport("too_easy", context)).resolves.toMatchObject({
      kind: "difficulty",
      value: "hard",
      evidence: "repeated_player_sentiment",
    });
  });

  it("applies a selected Zombies response while disabling other modes", () => {
    const difficultyRef = { current: "normal" };
    const zombiesRef = { current: false };
    const otherRef = { current: true };
    const setDifficulty = vi.fn();
    const setZombiesMode = vi.fn();
    const setOther = vi.fn();
    applyThreatRecommendationChoice(
      { kind: "mode", value: "zombies" },
      { difficultyRef, setDifficulty, zombiesRef, setZombiesMode, otherModes: [[setOther, otherRef]] },
    );
    expect(setZombiesMode).toHaveBeenCalledWith(true);
    expect(zombiesRef.current).toBe(true);
    expect(setOther).toHaveBeenCalledWith(false);
    expect(otherRef.current).toBe(false);
  });
});
