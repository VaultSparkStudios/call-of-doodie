import { describe, expect, it } from "vitest";
import { analyzeAppArchitecture } from "./lib/app-architecture.mjs";

const budget = { maxTotalLines: 8, maxGameLoopSpan: 3, minSystemBoundaries: 1, minHookBoundaries: 1 };
const source = [
  'import x from "./systems/x.js";',
  'import y from "./hooks/y.js";',
  "const gameLoop = useCallback(() => {",
  "  tick();",
  "});",
  "useGameLoop(gameLoop);",
].join("\r\n");

describe("App architecture receipt", () => {
  it("derives stable boundaries from Windows line endings", () => {
    expect(analyzeAppArchitecture(source, budget)).toMatchObject({
      ok: true,
      totalLines: 6,
      gameLoopStart: 3,
      gameLoopEnd: 6,
      gameLoopSpan: 3,
      systemBoundaryCount: 1,
      hookBoundaryCount: 1,
    });
  });

  it("fails closed when markers are missing or duplicated", () => {
    const result = analyzeAppArchitecture(`${source}\nconst gameLoop = useCallback(() => {});`, budget);
    expect(result.ok).toBe(false);
    expect(result.errors).toContain("expected one gameLoop start marker, found 2");
  });

  it("ratchets monolith growth and boundary loss independently", () => {
    const result = analyzeAppArchitecture(source, {
      ...budget,
      maxTotalLines: 5,
      minSystemBoundaries: 2,
    });
    expect(result.checks).toMatchObject({ totalLines: false, systemBoundaries: false });
  });

  // S165: two regressions this suite could not see. The marker was the exact
  // string `const gameLoop = useCallback(() => {`, so when the loop took a
  // `{ render = true }` parameter it stopped matching and the span check went
  // null-and-red on main for two sessions; and counting only App's own imports
  // scored S163's move of twenty loop systems behind the lazy combat chunk as
  // boundary LOSS, punishing the extraction the budget exists to encourage.
  it("still finds the loop marker when the callback takes parameters", () => {
    const parameterised = [
      'import x from "./systems/x.js";',
      'import y from "./hooks/y.js";',
      "const gameLoop = useCallback(({ render = true } = {}) => {",
      "  tick();",
      "});",
      "useGameLoop(gameLoop);",
    ].join("\n");
    const result = analyzeAppArchitecture(parameterised, budget);
    expect(result.gameLoopStart).toBe(3);
    expect(result.gameLoopSpan).toBe(3);
    expect(result.errors).not.toContain("expected one gameLoop start marker, found 0");
  });

  it("counts systems reached through a facade module, de-duplicated", () => {
    const facade = [
      'import a from "./alpha.js";',
      'import b from "./beta.js";',
      'import xAgain from "./x.js";',
      'import deep from "./nested/ignored.js";',
    ].join("\n");
    const result = analyzeAppArchitecture(source, { ...budget, minSystemBoundaries: 3 }, {
      facadeSources: [facade],
    });
    // x.js is reached both ways and must be counted once; the nested path is
    // not a sibling system boundary and must not be counted at all.
    expect(result.systems).toEqual(["alpha.js", "beta.js", "x.js"]);
    expect(result.systemBoundaryCount).toBe(3);
    expect(result.directSystemBoundaryCount).toBe(1);
    expect(result.facadeSystemBoundaryCount).toBe(2);
    expect(result.checks.systemBoundaries).toBe(true);
  });

  it("counts only direct imports when no facade is supplied", () => {
    const result = analyzeAppArchitecture(source, budget);
    expect(result.systemBoundaryCount).toBe(1);
    expect(result.facadeSystemBoundaryCount).toBe(0);
  });

  it("rejects an incomplete budget instead of producing an ambiguous receipt", () => {
    const result = analyzeAppArchitecture(source, { maxTotalLines: 8 });
    expect(result.ok).toBe(false);
    expect(result.errors).toContain("invalid architecture budget: maxGameLoopSpan");
  });
});
