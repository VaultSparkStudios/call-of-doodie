import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { spawnSync } from "../scripts/lib/safe-spawn.mjs";

const tempDirs = [];
afterEach(() => {
  for (const dir of tempDirs.splice(0)) fs.rmSync(dir, { recursive: true, force: true });
});

function isolatedGuardFixture(source) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "cod-window-guard-"));
  tempDirs.push(root);
  fs.mkdirSync(path.join(root, "scripts", "lib"), { recursive: true });
  fs.copyFileSync("scripts/check-windows-hide.mjs", path.join(root, "scripts", "check-windows-hide.mjs"));
  fs.copyFileSync("scripts/lib/shared-policies.mjs", path.join(root, "scripts", "lib", "shared-policies.mjs"));
  fs.writeFileSync(path.join(root, "scripts", "dynamic.mjs"), source);
  return root;
}

describe("Windows child-process guard", () => {
  it("detects dynamic raw child_process imports through the real CLI", () => {
    const root = isolatedGuardFixture("const cp = await import('node:child_process');\n");
    const result = spawnSync(process.execPath, ["scripts/check-windows-hide.mjs"], {
      cwd: root,
      encoding: "utf8",
    });
    expect(result.status).toBe(1);
    expect(result.stdout).toContain("scripts/dynamic.mjs:1");
    expect(result.stdout).toContain("direct child_process import");
  });

  it("keeps the dormant v5 renderer path fail-closed when the target is absent", () => {
    const result = spawnSync(process.execPath, ["scripts/render-startup-brief.mjs", "--v5"], {
      cwd: process.cwd(),
      encoding: "utf8",
    });
    expect(result.status).toBe(2);
    expect(result.stderr).toContain("v5 renderer is unavailable");
  });
});
