import { describe, expect, it } from "vitest";
import {
  decodeReplayCommandTrace,
  directionBucket,
  encodeReplayCommandTrace,
  isValidReplayCommandTrace,
  MAX_TRACE_BODY_BYTES,
  normalizeReplayCommandTrace,
  recordReplayCommandEvent,
  summarizeReplayCommandTrace,
  analyzeReplayCommandTrace,
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

  it("records bounded gameplay events for later normalization", () => {
    const events = [];
    recordReplayCommandEvent(events, { frame: 11, action: "DASH", value: "North West!" }, { maxEvents: 2 });
    recordReplayCommandEvent(events, { frame: 17, action: "shoot", value: "weapon-3" }, { maxEvents: 2 });
    recordReplayCommandEvent(events, { frame: 23, action: "grenade", value: "boss" }, { maxEvents: 2 });

    const trace = encodeReplayCommandTrace(events);
    expect(trace.count).toBe(2);
    expect(decodeReplayCommandTrace(trace)).toEqual([
      { f: 12, a: "shoot", v: "weapon-3" },
      { f: 18, a: "grenade", v: "boss" },
    ]);
  });

  it("buckets analog directions into stable octants", () => {
    expect(directionBucket(1, 0)).toBe("e");
    expect(directionBucket(-1, -1)).toBe("nw");
    expect(directionBucket(0, 0)).toBe("neutral");
  });

  it("rejects oversized trace bodies before decode work", () => {
    const body = "a".repeat(MAX_TRACE_BODY_BYTES + 1);
    expect(isValidReplayCommandTrace({ v: 1, bucket: 6, count: 1, body, digest: "00000000" })).toBe(false);
  });

  it("classifies rich replay evidence when movement, aim, and interactions span time", () => {
    const trace = encodeReplayCommandTrace([
      { frame: 0, action: "move", value: "n" },
      { frame: 18, action: "aim", value: "ne" },
      { frame: 24, action: "shoot", value: "w0" },
      { frame: 54, action: "move", value: "e" },
      { frame: 72, action: "dash", value: "e" },
      { frame: 90, action: "aim", value: "se" },
      { frame: 96, action: "shoot", value: "w0" },
    ]);

    expect(analyzeReplayCommandTrace(trace)).toMatchObject({
      valid: true,
      evidenceLevel: "rich",
      movementCount: 2,
      aimCount: 2,
      shootCount: 2,
      interactionCount: 3,
    });
  });

  it("keeps syntactically valid but low-signal traces below rich evidence", () => {
    const trace = encodeReplayCommandTrace([{ frame: 12, action: "shoot", value: "w0" }]);
    const analysis = analyzeReplayCommandTrace(trace);

    expect(analysis.valid).toBe(true);
    expect(analysis.evidenceLevel).toBe("weak");
    expect(analysis.weaknessReasons).toEqual(expect.arrayContaining([
      "too-few-events",
      "low-movement-evidence",
      "missing-aim-evidence",
    ]));
  });
});
