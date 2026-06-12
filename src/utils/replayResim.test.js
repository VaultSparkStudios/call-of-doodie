import { describe, expect, it } from "vitest";
import { encodeReplayCommandTrace } from "./replayCommandTrace.js";
import { runResim } from "./replayResim.js";

describe("runResim", () => {
  it("summarizes a valid trace into an advisory pressure-estimate receipt", () => {
    const trace = encodeReplayCommandTrace([
      { frame: 0, action: "move", value: "e" },
      { frame: 30, action: "aim", value: "e" },
      { frame: 60, action: "shoot", value: "w0" },
      { frame: 120, action: "dash", value: "n" },
      { frame: 180, action: "grenade", value: "boss" },
      { frame: 240, action: "shop", value: "ammo" },
    ]);

    const result = runResim(12345, trace, 1000, { wave: 1, score: 1200 });

    expect(result.ok).toBe(true);
    expect(result.method).toBe("heuristic_pressure_estimate");
    expect(result.confidence).toBe("advisory");
    expect(result.gate).toBe("pressure-estimate-v1");
    expect(result.commandCount).toBe(6);
    expect(result.finalWave).toBeGreaterThanOrEqual(1);
    expect(result.finalScore).toBeGreaterThan(0);
    expect(result.driftPct).toBeGreaterThanOrEqual(0);
  });

  it("marks malformed traces as full drift", () => {
    const result = runResim(1, { v: 1, bucket: 6, count: 1, body: "0.fly.nope", digest: "BAD" });

    expect(result.ok).toBe(false);
    expect(result.method).toBe("heuristic_pressure_estimate");
    expect(result.confidence).toBe("invalid");
    expect(result.driftPct).toBe(100);
    expect(result.reason).toBe("invalid-trace");
  });
});
