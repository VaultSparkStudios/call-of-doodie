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

  it("rejects an incomplete budget instead of producing an ambiguous receipt", () => {
    const result = analyzeAppArchitecture(source, { maxTotalLines: 8 });
    expect(result.ok).toBe(false);
    expect(result.errors).toContain("invalid architecture budget: maxGameLoopSpan");
  });
});
