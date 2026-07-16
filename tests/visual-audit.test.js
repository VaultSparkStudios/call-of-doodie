import { describe, expect, it } from "vitest";
import { compositeColor, contrastRatio, parseCssColor, summarizeVisualChecks } from "../scripts/lib/visual-audit.mjs";

describe("staged visual audit primitives", () => {
  it("parses and composites computed rgba colors", () => {
    const foreground = parseCssColor("rgba(255, 255, 255, 0.5)");
    const background = parseCssColor("rgb(0, 0, 0)");
    expect(compositeColor(foreground, background)).toMatchObject({ r: 127.5, g: 127.5, b: 127.5, a: 1 });
  });

  it("calculates WCAG contrast and preserves failure receipts", () => {
    expect(contrastRatio(parseCssColor("rgb(255,255,255)"), parseCssColor("rgb(0,0,0)"))).toBeCloseTo(21);
    expect(summarizeVisualChecks([{ id: "a", ok: true }, { id: "b", ok: false }])).toMatchObject({
      pass: false,
      total: 2,
      passed: 1,
      failures: [{ id: "b", ok: false }],
    });
  });
});
