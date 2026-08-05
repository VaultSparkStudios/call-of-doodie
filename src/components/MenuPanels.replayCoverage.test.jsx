import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { RunHistoryPanel } from "./MenuPanels.jsx";

describe("Run History replay coverage passport", () => {
  it("renders verified lanes and the advisory exclusion boundary", () => {
    const html = renderToStaticMarkup(
      <RunHistoryPanel
        runHistory={[]}
        rivalryHistory={[]}
        studioEvents={[]}
        onClose={() => {}}
      />,
    );
    expect(html).toContain("REPLAY COVERAGE PASSPORT");
    expect(html).toContain("3 VERIFIED LANES");
    expect(html).toContain("Movement + aim");
    expect(html).toContain("Combat actions");
    expect(html).toContain("Not reproduced:");
    expect(html).toContain("full played fight");
  });
});
