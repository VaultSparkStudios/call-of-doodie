import { describe, expect, it } from "vitest";
import { planPauseTransition } from "./pauseTransition.js";

describe("pause transition contract", () => {
  it("records a visibility pause and requires held-input release", () => {
    expect(planPauseTransition({ paused: false, nextPaused: true, reason: "visibility" })).toMatchObject({
      changed: true,
      paused: true,
      reason: "visibility",
      releaseInputs: true,
      traceValue: "on:visibility",
      label: "AUTO-PAUSED · TAB HIDDEN",
    });
  });

  it("keeps duplicate touch and click pause events idempotent", () => {
    expect(planPauseTransition({ paused: true, nextPaused: true, reason: "touch" })).toMatchObject({
      changed: false,
      releaseInputs: false,
    });
  });

  it.each([
    ["blur", "AUTO-PAUSED · FOCUS LOST"],
    ["pagehide", "AUTO-PAUSED · PAGE HIDDEN"],
  ])("describes the %s lifecycle pause", (reason, label) => {
    expect(planPauseTransition({ paused: false, nextPaused: true, reason })).toMatchObject({
      changed: true,
      paused: true,
      reason,
      releaseInputs: true,
      label,
    });
  });

  it("records resume without releasing inputs again", () => {
    expect(planPauseTransition({ paused: true, nextPaused: false, reason: "resume" })).toMatchObject({
      changed: true,
      paused: false,
      releaseInputs: false,
      traceValue: "off:resume",
      label: null,
    });
  });

  it("does not claim a score-validity consequence", () => {
    expect(planPauseTransition({ paused: false, nextPaused: true }).claim)
      .toBe("observed-pause-transition-not-score-invalidation");
  });
});
