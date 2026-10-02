import { beforeEach, describe, expect, it, vi } from "vitest";

const storage = vi.hoisted(() => ({
  saveFieldReport: vi.fn(),
  syncCompletedRunFact: vi.fn(),
  loadFieldReports: vi.fn(),
  loadStudioGameEvents: vi.fn(),
  saveStudioGameEvent: vi.fn(),
  requestStudioEventSync: vi.fn(),
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
    storage.loadFieldReports.mockReset().mockReturnValue([]);
    storage.loadStudioGameEvents.mockReset().mockReturnValue([]);
    storage.saveStudioGameEvent.mockReset();
    storage.requestStudioEventSync.mockReset().mockResolvedValue({ ok: false, reason: "offline" });
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

  it("keeps an unconsented report on device without queuing telemetry", async () => {
    const reportId = "12345678-1234-1234-1234-123456789abc";
    storage.saveFieldReport.mockReturnValue([{ reportId, feedback: "brutal", inputDevice: "mobile", durationBucket: "2-5m", version: "1.0.0" }]);
    storage.loadFieldReports.mockReturnValue([{ reportId }]);
    const result = await recordPostRunFieldReport({ reportId, feedback: "brutal", reason: "controls", comment: "  Too  slippery  ", consent: false }, { ...context, modeId: "bot_royale", inputDevice: "mobile", version: "1.0.0" });
    expect(result.status).toBe("saved-on-device");
    expect(storage.saveFieldReport).toHaveBeenCalledWith(expect.objectContaining({ mode: "bot_royale", comment: "Too slippery", reason: "controls" }));
    expect(storage.saveStudioGameEvent).not.toHaveBeenCalled();
    expect(storage.syncCompletedRunFact).not.toHaveBeenCalled();
  });

  it("retries an opted-in report with one ID and never sends its private comment", async () => {
    const reportId = "12345678-1234-1234-1234-123456789abc";
    storage.saveFieldReport.mockReturnValue([{ reportId, feedback: "brutal", inputDevice: "mobile", durationBucket: "2-5m", version: "1.0.0" }]);
    storage.loadFieldReports.mockReturnValue([{ reportId }]);
    const events = [];
    storage.loadStudioGameEvents.mockImplementation(() => events);
    storage.saveStudioGameEvent.mockImplementation((event) => events.push({ ...event, syncStatus: "pending" }));
    storage.syncCompletedRunFact.mockResolvedValue({ submission: "offline" });
    const submission = { reportId, feedback: "brutal", reason: "controls", comment: "private detail", consent: true };
    const first = await recordPostRunFieldReport(submission, context);
    const second = await recordPostRunFieldReport(submission, context);
    expect(first.status).toBe("saved-pending-sync");
    expect(second.status).toBe("saved-pending-sync");
    expect(storage.saveStudioGameEvent).toHaveBeenCalledTimes(1);
    expect(events[0].payload).toMatchObject({ sentiment: "brutal", reason: "controls", durationBucket: "2-5m" });
    expect(JSON.stringify(events[0])).not.toContain("private detail");
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
