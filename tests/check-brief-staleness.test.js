import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { afterEach, describe, expect, it } from "vitest";

const SCRIPT = path.resolve(import.meta.dirname, "..", "scripts", "check-brief-staleness.mjs");
const roots = [];

function makeRepo({ lockOffsetMs = null, briefOffsetMs = 0 } = {}) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "cod-brief-freshness-"));
  roots.push(root);
  fs.mkdirSync(path.join(root, "docs"), { recursive: true });
  fs.mkdirSync(path.join(root, "context"), { recursive: true });
  const today = new Date().toISOString().slice(0, 10);
  const briefPath = path.join(root, "docs", "STARTUP_BRIEF.md");
  fs.writeFileSync(briefPath, `<!-- generated-at: ${today} (Session 1 closeout) -->\n<!-- brief-coherent: true -->\n`);
  const base = Date.now() - 10_000;
  fs.utimesSync(briefPath, (base + briefOffsetMs) / 1000, (base + briefOffsetMs) / 1000);
  if (lockOffsetMs != null) {
    const lockPath = path.join(root, "context", ".session-lock");
    fs.writeFileSync(lockPath, "agent: codex\n");
    fs.utimesSync(lockPath, (base + lockOffsetMs) / 1000, (base + lockOffsetMs) / 1000);
  }
  return root;
}

function check(root) {
  const result = spawnSync(process.execPath, [SCRIPT, "--json"], {
    cwd: root,
    encoding: "utf8",
    windowsHide: true,
  });
  return { ...result, receipt: JSON.parse(result.stdout) };
}

afterEach(() => {
  while (roots.length > 0) fs.rmSync(roots.pop(), { recursive: true, force: true });
});

describe("startup brief session freshness", () => {
  it("accepts a coherent current brief without an active lock", () => {
    const result = check(makeRepo());
    expect(result.status).toBe(0);
    expect(result.receipt.status).toBe("fresh");
    expect(result.receipt.reasons).toEqual([]);
  });

  it("rejects a prior-session brief when the active lock is newer", () => {
    const result = check(makeRepo({ lockOffsetMs: 5_000 }));
    expect(result.status).toBe(1);
    expect(result.receipt.status).toBe("stale");
    expect(result.receipt.reasons).toContain("active-session-newer-than-brief");
  });

  it("accepts a brief regenerated after the active lock", () => {
    const result = check(makeRepo({ lockOffsetMs: 1_000, briefOffsetMs: 5_000 }));
    expect(result.status).toBe(0);
    expect(result.receipt.status).toBe("fresh");
  });
});
