import { describe, expect, it } from "vitest";
import { buildDeterministicResimInputContract, buildReplayPressureProfile, runResim } from "./replayResim.js";
import { replayTraceFixtureTable, makeMalformedTrace, makeRichTrace } from "./replayTraceFixtures.js";

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

  it("exports a shared replay fixture table for future edge parity", () => {
    const fixtures = replayTraceFixtureTable();

    expect(fixtures.map((fixture) => fixture.id)).toEqual(["rich", "basic", "weak", "malformed"]);
    expect(fixtures.find((fixture) => fixture.id === "rich").expectedPressure).toMatchObject({
      pressureClass: "medium",
      commandCount: 7,
      finalWave: 1,
      finalScore: 793,
    });
    expect(fixtures.find((fixture) => fixture.id === "malformed")).toMatchObject({
      expectedValid: false,
      expectedEvidenceLevel: "none",
      expectedPressure: {
        pressureClass: "none",
        commandCount: 0,
        finalWave: 1,
        finalScore: 420,
      },
    });
  });
  it("exposes deterministic resim input-contract readiness without changing the advisory gate", () => {
    const trace = makeRichTrace();
    const contract = buildDeterministicResimInputContract({
      seed: 12345,
      trace,
      submitted: { wave: 3, score: 1200 },
    });
    const result = runResim(12345, trace, 1000, { wave: 3, score: 1200 });

    expect(contract).toMatchObject({
      method: "deterministic_resim_contract_v0",
      ready: true,
      confidence: "contract-ready",
      commandCount: 7,
      submittedWave: 3,
      submittedScore: 1200,
      missing: [],
    });
    expect(result.method).toBe("heuristic_pressure_estimate");
    expect(result.deterministicContract).toMatchObject({ ready: true, method: "deterministic_resim_contract_v0" });
  });

  it("reports missing deterministic resim inputs explicitly", () => {
    const contract = buildDeterministicResimInputContract({ submitted: {} });

    expect(contract.ready).toBe(false);
    expect(contract.confidence).toBe("missing-inputs");
    expect(contract.missing).toEqual(expect.arrayContaining([
      "seed",
      "trace.body",
      "trace.digest",
      "validTrace",
      "submitted.wave",
      "submitted.score",
    ]));
  });
});

