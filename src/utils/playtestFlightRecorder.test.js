import { describe, expect, it } from "vitest";
import {
  annotatePlaytestFlight,
  buildPortablePlaytestReceipt,
  buildPortablePlaytestPulse,
  createPlaytestFlight,
  isPlaytestMode,
  recordPlaytestMilestone,
  startActivePlaytestFlight,
  setPlaytestPulseEnabled,
  recordPlaytestPulse,
  loadPlaytestPulse,
} from "./playtestFlightRecorder.js";

describe("playtest flight recorder", () => {
  it("is explicitly opt-in", () => {
    expect(isPlaytestMode("?playtest=1")).toBe(true);
    expect(isPlaytestMode("?playtest=0")).toBe(false);
    expect(isPlaytestMode("?mode=playtest")).toBe(false);
  });

  it("carries one finalized prior receipt into the next run without unbounded history", () => {
    const values = new Map();
    const storage = {
      getItem: (key) => values.get(key) || null,
      setItem: (key, value) => values.set(key, value),
    };
    let first = startActivePlaytestFlight({ now: 1000, meta: { mode: "standard" } }, storage);
    first = recordPlaytestMilestone(first, "death", { now: 5000 });
    first = annotatePlaytestFlight(first, { deathClarity: "clear", replayIntent: "now", continuation: "run_the_fix" });
    storage.setItem("cod-playtest-flight-v1", JSON.stringify(first));

    const second = startActivePlaytestFlight({ now: 6000, meta: { mode: "standard" } }, storage);
    expect(second.previousRun?.continuation).toBe("run_the_fix");
    expect(second.previousRun?.previousRun).toBeNull();
  });

  it("records only the first observed milestone with bounded metadata", () => {
    let receipt = createPlaytestFlight({ now: 1000, meta: { difficulty: "normal", callsign: "not-stored-by-caller" } });
    receipt = recordPlaytestMilestone(receipt, "move", { now: 1450, meta: { source: "keyboard" } });
    receipt = recordPlaytestMilestone(receipt, "move", { now: 9000, meta: { source: "controller" } });
    receipt = recordPlaytestMilestone(receipt, "unknown", { now: 1500 });
    expect(receipt.milestones.move).toEqual({ elapsedMs: 450, meta: { source: "keyboard" } });
    expect(receipt.milestones.unknown).toBeUndefined();
  });

  it("builds a portable receipt only from observed milestones and explicit answers", () => {
    let receipt = createPlaytestFlight({ now: 1000, meta: { difficulty: "hard", mode: "boss_rush" } });
    receipt = recordPlaytestMilestone(receipt, "run_start", { now: 1000 });
    receipt = recordPlaytestMilestone(receipt, "death", { now: 61000, meta: { wave: 4, score: 900 } });
    receipt = annotatePlaytestFlight(receipt, { deathClarity: "clear", replayIntent: "now", inputTrust: "trusted", threatReadability: "clear", continuation: "run_the_fix" });
    const portable = buildPortablePlaytestReceipt(receipt);
    expect(portable).toMatchObject({
      evidenceScope: "observed-input-and-explicit-tester-answers",
      annotations: { deathClarity: "clear", replayIntent: "now", inputTrust: "trusted", threatReadability: "clear" },
      continuation: "run_the_fix",
      complete: true,
      signalComplete: true,
    });
    expect(portable.run).not.toHaveProperty("callsign");
    expect(JSON.stringify(portable)).not.toContain("not-stored-by-caller");
  });
});

it("supports explicit persistent opt-in and aggregates only complete redacted flights", () => {
  const storage = { values: new Map(), getItem(k) { return this.values.get(k) || null; }, setItem(k, v) { this.values.set(k, v); }, removeItem(k) { this.values.delete(k); } };
  expect(setPlaytestPulseEnabled(true, storage)).toBe(true);
  let receipt = createPlaytestFlight({ now: 1000, meta: { mode: "standard" } });
  expect(recordPlaytestPulse(receipt, storage)).toBeNull();
  receipt = recordPlaytestMilestone(receipt, "death", { now: 2000 });
  receipt = annotatePlaytestFlight(receipt, { deathClarity: "clear", replayIntent: "now", inputTrust: "mixed", threatReadability: "busy" });
  expect(recordPlaytestPulse(receipt, storage).sampleSize).toBe(1);
  expect(loadPlaytestPulse(storage).clarity.clear).toBe(1);
  expect(loadPlaytestPulse(storage).inputTrust.mixed).toBe(1);
  expect(loadPlaytestPulse(storage).threatReadability.busy).toBe(1);
  const portable = buildPortablePlaytestPulse(loadPlaytestPulse(storage));
  expect(portable).toMatchObject({ sampleSize: 1, signalCompleteCount: 1, inputTrust: { mixed: 1 }, threatReadability: { busy: 1 } });
  expect(portable).not.toHaveProperty("flights");
  expect(JSON.stringify(portable)).not.toContain("flight-rs");
});
