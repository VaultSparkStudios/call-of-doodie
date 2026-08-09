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
    expect(html).toContain("3 VERIFIED LANES");
    expect(html).toContain("Movement + aim");
    expect(html).toContain("Combat actions");
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
});
