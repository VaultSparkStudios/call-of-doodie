import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { buildStudioProxyInvocation } from "../scripts/lib/studio-ops-proxy.mjs";

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
  it("keeps closeout doctor verification read-only across repo boundaries", () => {
    const source = fs.readFileSync(path.resolve("scripts/closeout-autopilot.mjs"), "utf8");
    expect(source).toContain("doctor --json --quiet");
    expect(source).not.toContain("doctor --update-json");
  });
});
