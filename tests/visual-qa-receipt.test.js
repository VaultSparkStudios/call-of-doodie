import { describe, expect, it } from "vitest";
import { selectRepresentativeCaptures } from "../scripts/lib/visual-qa-receipt.mjs";

describe("visual QA receipt selection", () => {
  it("selects only passing captures from the live canonical matrix", () => {
    const specs = [
      ["home", "sewer-night", 390],
      ["home", "porcelain-day", 1440],
      ["login", "sewer-night", 1440],
      ["auth-callback", "porcelain-day", 390],
      ["modes", "sewer-night", 1440],
      ["leaderboard", "porcelain-day", 390],
    ];
    const captures = specs.map(([route, theme, width]) => ({
      route, theme, width, screenshot: `${route}--${theme}--${width}.png`, summary: { pass: true },
    }));

    const selected = selectRepresentativeCaptures({ captures });

    expect(selected).toHaveLength(6);
    expect(selected.every((capture) => !capture.source.includes("prestige"))).toBe(true);
    expect(new Set(selected.map((capture) => capture.projectTheme))).toEqual(new Set(["sewer-night", "porcelain-day"]));
    expect(new Set(selected.map((capture) => capture.width))).toEqual(new Set([390, 1440]));
  });

  it("fails closed when a required passing capture is absent", () => {
    expect(() => selectRepresentativeCaptures({ captures: [] })).toThrow(/Passing visual capture missing/);
  });
});
