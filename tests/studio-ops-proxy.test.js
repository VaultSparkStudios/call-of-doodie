import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { bindProjectOracleArgs, buildStudioProxyInvocation } from "../scripts/lib/studio-ops-proxy.mjs";

describe("project-local Studio Ops proxies", () => {
  const projectRoot = path.resolve("C:/repo/call-of-doodie");
  const studioRoot = path.resolve("C:/repo/vaultspark-studio-ops");

  it("binds project-mutating closeout scripts to this repo", () => {
    const invocation = buildStudioProxyInvocation({
      script: "compute-entropy.mjs",
      args: ["--update"],
      projectRoot,
      studioRoot,
    });
    expect(invocation.scriptPath).toBe(path.join(studioRoot, "scripts", "compute-entropy.mjs"));
    expect(invocation.args).toEqual(["--project", projectRoot, "--update"]);
    expect(invocation.cwd).toBe(projectRoot);
  });

  it("binds the sanitizer to the project-local settings file", () => {
    const invocation = buildStudioProxyInvocation({
      script: "sanitize-claude-settings.mjs",
      args: ["--check"],
      projectBound: false,
      settingsBound: true,
      projectRoot,
      studioRoot,
    });
    expect(invocation.args).toEqual(["--path", path.join(projectRoot, ".claude", "settings.local.json"), "--check"]);
  });
  it("binds Oracle preverify surfaces to this project instead of Studio Ops", () => {
    expect(bindProjectOracleArgs(["preverify", "claim", "src", "docs/file.md"], projectRoot)).toEqual([
      "preverify",
      "claim",
      path.join(projectRoot, "src"),
      path.join(projectRoot, "docs/file.md"),
    ]);
  });
  it("keeps closeout doctor verification read-only across repo boundaries", () => {
    const source = fs.readFileSync(path.resolve("scripts/closeout-autopilot.mjs"), "utf8");
    expect(source).toContain("doctor --json --quiet");
    expect(source).not.toContain("doctor --update-json");
  });
  it("refreshes derived context after the final status stamp and before commit preview", () => {
    const source = fs.readFileSync(path.resolve("scripts/closeout-autopilot.mjs"), "utf8");
    expect(source).toContain('for (const script of ["render-hot-context.mjs", "render-startup-brief.mjs"])');
    expect(source.indexOf("stampStatus();")).toBeLessThan(source.indexOf("refreshDerivedContext();"));
    expect(source.indexOf("refreshDerivedContext();")).toBeLessThan(source.indexOf("showGitPreview();"));
  });
  it("derives closeout write-backs and staging from committed source-of-truth state", () => {
    const source = fs.readFileSync(path.resolve("scripts/render-closeout-board.mjs"), "utf8");
    expect(source).toContain("close[ -]?out session ${session}");
    expect(source).toContain("testingSurfaces?.findLast");
    expect(source).toContain("docs/CLOSEOUT_STATUS_BOARD.md");
    expect(source).toContain("git check-ignore --quiet" );
    expect(source).toContain("writeBackCoverage(status.currentSession ?? status.silSession)");
    expect(source).toContain("'.codex', 'memories'");
    expect(source).toContain("agent memory (Claude/Codex project memory)");
  });
});
