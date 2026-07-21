import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { afterEach, describe, expect, it } from "vitest";

const script = path.resolve("scripts/cache-genius-list.mjs");
const roots = [];

afterEach(() => {
  for (const root of roots.splice(0)) fs.rmSync(root, { recursive: true, force: true });
});

function fixture() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "cod-genius-list-"));
  roots.push(root);
  fs.mkdirSync(path.join(root, "context"), { recursive: true });
  fs.writeFileSync(path.join(root, "context", "TASK_BOARD.md"), [
    "# Task Board",
    "",
    "## Now",
    "- [ ] First executable candidate",
    "- [ ] Second executable candidate",
    "",
    "## Deferred",
    "- [ ] Deferred candidate",
    "",
  ].join("\n"));
  return root;
}

describe("cache genius list CLI", () => {
  it("uses the five-item default when --top is omitted", () => {
    const cwd = fixture();
    const result = spawnSync(process.execPath, [script, "--write"], { cwd, encoding: "utf8" });

    expect(result.status).toBe(0);
    expect(JSON.parse(result.stdout).items.map((item) => item.title)).toEqual([
      "First executable candidate",
      "Second executable candidate",
      "Deferred candidate",
    ]);
  });

  it("honors both supported --top forms", () => {
    for (const args of [["--top", "1"], ["--top=1"]]) {
      const cwd = fixture();
      const result = spawnSync(process.execPath, [script, "--write", ...args], { cwd, encoding: "utf8" });

      expect(result.status).toBe(0);
      expect(JSON.parse(result.stdout).items).toHaveLength(1);
    }
  });
});
