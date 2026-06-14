import { describe, expect, it } from "vitest";
import { analyzeReplayCommandTrace, buildReplayProofReceipt } from "./replayCommandTrace.js";
import { buildReplayProofPresenter } from "./replayProofPresenter.js";
import { makeRichTrace, makeWeakTrace } from "./replayTraceFixtures.js";

describe("replayProofPresenter", () => {
  it("returns an empty presenter when no trace evidence exists", () => {
    const presenter = buildReplayProofPresenter();

    expect(presenter.receipt).toBeNull();
    expect(presenter.trend).toMatchObject({
      sampleSize: 0,
      status: "empty",
    });
    expect(presenter.shareStamp).toBe("");
  });

  it("builds the current receipt, trend, and share stamp from rich evidence", () => {
    const presenter = buildReplayProofPresenter({
      traceEvidence: analyzeReplayCommandTrace(makeRichTrace()),
    });

    expect(presenter.receipt).toMatchObject({
      status: "verified",
      label: "Replay Proof Ready",
      level: "rich",
    });
    expect(presenter.trend).toMatchObject({
      sampleSize: 1,
      verifiedCount: 1,
    });
    expect(presenter.shareStamp).toContain("REPLAY PROOF");
    expect(presenter.shareStamp).toContain("1/1 RECENT RUNS VERIFIED");
  });

  it("folds recent run history into the proof trend without mutating receipts", () => {
    const richReceipt = buildReplayProofReceipt(analyzeReplayCommandTrace(makeRichTrace()));
    const weakReceipt = buildReplayProofReceipt(analyzeReplayCommandTrace(makeWeakTrace()));
    const presenter = buildReplayProofPresenter({
      traceEvidence: analyzeReplayCommandTrace(makeRichTrace()),
      runHistory: [
        { traceReceipt: weakReceipt },
        { traceReceipt: richReceipt },
      ],
    });

    expect(presenter.trend.sampleSize).toBe(3);
    expect(presenter.trend.verifiedCount).toBe(2);
    expect(presenter.shareStamp).toContain("2/3 RECENT RUNS VERIFIED");
  });
});
