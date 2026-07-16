import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "./safe-spawn.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
export const PROJECT_ROOT = path.resolve(HERE, "..", "..");
export const STUDIO_OPS_ROOT = path.resolve(PROJECT_ROOT, "..", "vaultspark-studio-ops");

export function buildStudioProxyInvocation({
  script,
  args = [],
  projectBound = true,
  settingsBound = false,
  projectRoot = PROJECT_ROOT,
  studioRoot = STUDIO_OPS_ROOT,
} = {}) {
  if (!script) throw new Error("Studio Ops proxy requires a script name.");
  const scriptPath = path.join(studioRoot, "scripts", script);
  const boundArgs = settingsBound
    ? ["--path", path.join(projectRoot, ".claude", "settings.local.json"), ...args]
    : projectBound
      ? ["--project", projectRoot, ...args]
      : [...args];
  return { scriptPath, args: boundArgs, cwd: projectRoot };
}

export function runStudioScript(options) {
  const invocation = buildStudioProxyInvocation(options);
  if (!fs.existsSync(invocation.scriptPath)) {
    process.stderr.write(`Studio Ops control plane missing required script: ${invocation.scriptPath}\n`);
    return 2;
  }
  const result = spawnSync(process.execPath, [invocation.scriptPath, ...invocation.args], {
    cwd: invocation.cwd,
    stdio: "inherit",
  });
  return result.status ?? 1;
}
