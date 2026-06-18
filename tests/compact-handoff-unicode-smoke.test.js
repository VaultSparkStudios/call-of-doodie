import { describe, expect, it } from "vitest";
import { execFileSync } from "node:child_process";
import path from "node:path";

const repoRoot = path.resolve(".");
const script = path.join(repoRoot, "scripts", "compact-handoff.mjs");

describe("compact-handoff Unicode smoke", () => {
  it("keeps malformed handoff Unicode out of model-router payloads", () => {
    const output = execFileSync(process.execPath, [script, "--smoke-unicode"], {
      cwd: repoRoot,
      encoding: "utf8",
    });

    expect(output).toContain("compact-handoff unicode smoke passed");
  });
});
