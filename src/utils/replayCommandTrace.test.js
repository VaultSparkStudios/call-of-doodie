import { describe, expect, it } from "vitest";
import {
  decodeReplayCommandTrace,
  encodeReplayCommandTrace,
  isValidReplayCommandTrace,
  normalizeReplayCommandTrace,
  summarizeReplayCommandTrace,
} from "./replayCommandTrace.js";

describe("replayCommandTrace", () => {
  it("normalizes commands into ordered bounded frame buckets", () => {
    const events = normalizeReplayCommandTrace([
      { frame: 13, action: "SHOOT", value: "primary" },
      { frame: 1, action: "dash", value: "left" },
      { frame: 7, action: "shoot", value: "primary" },
    ]);

    expect(events).toEqual([
      { f: 0, a: "dash", v: "left" },
      { f: 6, a: "shoot", v: "primary" },
      { f: 12, a: "shoot", v: "primary" },
    ]);
  });

  it("round-trips a compact trace with a deterministic digest", () => {
    const trace = encodeReplayCommandTrace([
      { frame: 0, action: "move", value: "n" },
      { frame: 18, action: "grenade", value: "boss" },
      { frame: 24, action: "route", value: "cash" },
    ]);

    expect(isValidReplayCommandTrace(trace)).toBe(true);
    expect(decodeReplayCommandTrace(trace)).toEqual([
      { f: 0, a: "move", v: "n" },
      { f: 18, a: "grenade", v: "boss" },
      { f: 24, a: "route", v: "cash" },
    ]);
    expect(summarizeReplayCommandTrace(trace)).toMatchObject({
      count: 3,
      firstFrame: 0,
      lastFrame: 24,
      actions: { move: 1, grenade: 1, route: 1 },
      digest: trace.digest,
    });
  });

  it("detects tampered trace bodies", () => {
    const trace = encodeReplayCommandTrace([{ frame: 30, action: "shop", value: "ammo" }]);
    expect(isValidReplayCommandTrace({ ...trace, body: trace.body.replace("shop", "perk") })).toBe(false);
  });

  it("caps traces to the configured event budget", () => {
    const trace = encodeReplayCommandTrace(
      Array.from({ length: 20 }, (_, idx) => ({ frame: idx * 6, action: "shoot", value: String(idx) })),
      { maxEvents: 5 },
    );

    expect(trace.count).toBe(5);
    expect(decodeReplayCommandTrace(trace)).toHaveLength(5);
  });
});
