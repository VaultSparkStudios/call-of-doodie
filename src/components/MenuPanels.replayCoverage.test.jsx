import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { RunHistoryPanel } from "./MenuPanels.jsx";

describe("Run History replay coverage passport", () => {
  it("renders verified lanes and the advisory exclusion boundary under ?debug=ops", () => {
    // S145: TRUST OPS (including the passport) is operator telemetry, gated
    // behind ?debug=ops like every other ops surface.
    window.history.pushState({}, "", "/?debug=ops");
    const html = renderToStaticMarkup(
      <RunHistoryPanel
        runHistory={[]}
        rivalryHistory={[]}
        studioEvents={[]}
        onClose={() => {}}
      />,
    );
    window.history.pushState({}, "", "/");
    expect(html).toContain("REPLAY COVERAGE PASSPORT");
    expect(html).toContain("4 VERIFIED LANES");
    expect(html).toContain("Movement + aim");
    expect(html).toContain("Combat actions");
    expect(html).toContain("Recorded planned pressure");
    expect(html).toContain("Not reproduced:");
    expect(html).toContain("full played fight");
  });

  it("hides TRUST OPS telemetry from ordinary players", () => {
    const html = renderToStaticMarkup(
      <RunHistoryPanel
        runHistory={[]}
        rivalryHistory={[]}
        studioEvents={[]}
        onClose={() => {}}
      />,
    );
    expect(html).not.toContain("TRUST OPS");
    expect(html).not.toContain("REPLAY COVERAGE PASSPORT");
  });

  it("shows bounded corrective-order evidence to ordinary players without a causal claim", () => {
    const html = renderToStaticMarkup(
      <RunHistoryPanel
        runHistory={[]}
        rivalryHistory={[]}
        studioEvents={[
          { type: "run_drill_outcome", payload: { receiptId: "r-1", drillId: "spacing", title: "Hold the lane", status: "improved", endedAt: 10, baseline: { wave: 3, score: 100 }, observed: { wave: 4, score: 180 }, scoreDelta: 80 } },
          { type: "run_drill_outcome", payload: { receiptId: "r-2", drillId: "spacing", title: "Hold the lane", status: "improved", endedAt: 20, baseline: { wave: 4, score: 180 }, observed: { wave: 6, score: 310 }, scoreDelta: 130 } },
        ]}
        onClose={() => {}}
      />,
    );
    expect(html).toContain("ORDER EVIDENCE · THIS DEVICE");
    expect(html).toContain("Hold the lane");
    expect(html).toContain("REPEATABLE IMPROVEMENT");
    expect(html).toContain("not proof that the order caused it");
    expect(html).not.toContain("TRUST OPS");
  });
});
