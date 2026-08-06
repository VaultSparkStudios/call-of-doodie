import { execFileSync } from "../lib/safe-spawn.mjs";
import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = process.cwd();

function run(script, args = []) {
  return execFileSync(process.execPath, [path.join(ROOT, script), ...args], {
    cwd: ROOT,
    encoding: "utf8",
    windowsHide: true,
  });
}

describe("operator script smoke surfaces", () => {
  it.each([
    "scripts/capture-launch-screenshots.mjs",
    "scripts/generate-proprietary-visual-assets.mjs",
    "scripts/generate-public-gameplay-contract.mjs",
    "scripts/progression-curve-audit.mjs",
    "scripts/studio-oracle.mjs",
    "scripts/validate-public-contract.mjs",
    "scripts/live-site-check.mjs",
    "scripts/security-release-gate.mjs",
    "scripts/check-brief-staleness.mjs",
    "scripts/protocol-drift-check.mjs",
    "scripts/audit-staging-visuals.mjs",
    "scripts/cache-genius-list.mjs",
    "scripts/check-dependency-tree.mjs",
    "scripts/ops.mjs",
    "scripts/append-genome-snapshot.mjs",
    "scripts/render-startup-brief.mjs",
    "scripts/compute-entropy.mjs",
    "scripts/render-state-vector.mjs",
    "scripts/sanitize-claude-settings.mjs",
    "scripts/render-audit-md.mjs",
  ])("publishes side-effect-free usage for %s", (script) => {
    expect(run(script, ["--help"])).toMatch(/^Usage: node scripts\//);
  });

  it("lists launch scenes without starting a browser or server", () => {
    const receipt = JSON.parse(run("scripts/capture-launch-screenshots.mjs", ["--list-scenes"]));
    expect(receipt).toMatchObject({ schemaVersion: "launch-scenes-v1" });
    expect(receipt.scenes).toHaveLength(5);
    expect(receipt.scenes.every((scene) => scene.endsWith(".png"))).toBe(true);
  });

  it("checks the generated gameplay contract without rewriting it", () => {
    expect(run("scripts/generate-public-gameplay-contract.mjs", ["--check"]))
      .toContain("Public gameplay contract is current");
  });

  it("emits a deterministic progression receipt from bounded CLI arguments", () => {
    const first = run("scripts/progression-curve-audit.mjs", ["--kills", "79", "--points", "50"]);
    const second = run("scripts/progression-curve-audit.mjs", ["--kills", "79", "--points", "50"]);
    expect(second).toBe(first);
    expect(JSON.parse(first)).toMatchObject({ schemaVersion: "progression-runway-v2" });
  });

  it("executes the local public-contract validator as a real smoke gate", () => {
    expect(JSON.parse(run("scripts/validate-public-contract.mjs", ["--json"])))
      .toMatchObject({ ok: true, errors: [] });
  });

  it("executes the offline security gate without silently enabling npm audit", () => {
    const receipt = JSON.parse(run("scripts/security-release-gate.mjs", ["--json"]));
    expect(receipt).toMatchObject({ status: "ok" });
  });

  it("runs the protocol drift inventory as structured evidence", () => {
    const receipt = JSON.parse(run("scripts/protocol-drift-check.mjs", ["--json"]));
    expect(receipt).toMatchObject({ status: "ok", summary: { missingRequired: 0 } });
    const boardSource = fs.readFileSync(path.join(ROOT, "scripts/render-closeout-board.mjs"), "utf8");
    expect(boardSource).toContain("git log -n 20 --format=%H -- context/PROJECT_STATUS.json");
  });

  it("runs the installed dependency-tree gate as structured evidence", () => {
    const receipt = JSON.parse(run("scripts/check-dependency-tree.mjs", ["--json"]));
    expect(receipt).toMatchObject({ ok: true, problems: [] });
  }, 90_000);
});
