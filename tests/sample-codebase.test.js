import { execFileSync } from "node:child_process";
import path from "node:path";
import { describe, expect, it } from "vitest";

const root = path.resolve(import.meta.dirname, "..");
const script = path.join(root, "scripts", "sample-codebase.mjs");

function sample() {
  const stdout = execFileSync(process.execPath, [
    script,
    "--max-tokens",
    "5000",
    "--json",
  ], {
    cwd: root,
    encoding: "utf8",
    windowsHide: true,
  });
  return JSON.parse(stdout);
}

describe("sample-codebase diversity contract", () => {
  it("prevents App.jsx from starving the rest of a bounded audit sample", () => {
    const result = sample();
    const app = result.samples.find((entry) => entry.path === "src/App.jsx");

    expect(result.schemaVersion).toBe("2.0");
    expect(result.sampledFiles).toBeGreaterThanOrEqual(8);
    expect(result.approxChars).toBeLessThanOrEqual(result.maxChars);
    expect(app).toMatchObject({
      category: "runtime",
      truncated: true,
    });
    expect(app.previewChars).toBeLessThanOrEqual(result.perFileCap);
    expect(app.preview).toContain("… excerpt omitted …");
  });

  it("reserves the first pass for distinct audit surfaces", () => {
    const result = sample();
    for (const category of ["manifest", "runtime", "systems", "ui", "tooling", "tests", "context", "public"]) {
      expect(result.coverage[category].sampled, category).toBeGreaterThan(0);
    }
  });

  it("selects the same file order on repeated runs", () => {
    const first = sample().samples.map((entry) => entry.path);
    const second = sample().samples.map((entry) => entry.path);
    expect(second).toEqual(first);
  });
});
