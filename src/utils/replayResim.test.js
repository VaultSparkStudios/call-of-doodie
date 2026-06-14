import { describe, expect, it } from "vitest";
import { buildReplayPressureProfile, runResim } from "./replayResim.js";
import { makeMalformedTrace, makeRichTrace } from "./replayTraceFixtures.js";

describe("runResim", () => {
  it("summarizes a valid trace into an advisory pressure-estimate receipt", () => {
    const trace = makeRichTrace();

    const result = runResim(12345, trace, 1000, { wave: 1, score: 1200 });

    expect(result.ok).toBe(true);
    expect(result.method).toBe("heuristic_pressure_estimate");
    expect(result.confidence).toBe("advisory");
    expect(result.gate).toBe("pressure-estimate-v1");
    expect(result.commandCount).toBe(7);
    expect(result.finalWave).toBeGreaterThanOrEqual(1);
    expect(result.finalScore).toBeGreaterThan(0);
    expect(result.driftPct).toBeGreaterThanOrEqual(0);
    expect(result.pressureProfile).toMatchObject({
      valid: true,
      pressureClass: "medium",
      commandCount: 7,
    });
  });

  it("marks malformed traces as full drift", () => {
    const result = runResim(1, makeMalformedTrace());

    expect(result.ok).toBe(false);
    expect(result.method).toBe("heuristic_pressure_estimate");
    expect(result.confidence).toBe("invalid");
    expect(result.driftPct).toBe(100);
    expect(result.reason).toBe("invalid-trace");
  });

  it("builds a stable pressure profile independently from drift checks", () => {
    const profile = buildReplayPressureProfile(12345, makeRichTrace(), 1000);

    expect(profile).toMatchObject({
      valid: true,
      seed: 12345,
      commandCount: 7,
      pressureClass: "medium",
    });
    expect(profile.durationSec).toBeGreaterThan(1);
    expect(profile.actionPressure).toBeGreaterThan(0);
    expect(profile.movementPressure).toBeGreaterThan(0);
  });
});
