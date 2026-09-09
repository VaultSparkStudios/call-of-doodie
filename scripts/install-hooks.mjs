#!/usr/bin/env node
// install-hooks.mjs — installs the repository's git hooks (S167).
//
// The pre-push hook is a two-line shim that hands stdin straight to
// scripts/hooks/pre-push.mjs. The previous Bash hook ran `file` and several
// `grep` children per changed file through Git-Bash on Windows and orphaned
// on ordinary pushes (S166 twice, S167 once). One Node process, zero per-file
// children, identical rules.
//
// Usage: node scripts/install-hooks.mjs [--check]

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const HOOKS_DIR = path.join(ROOT, ".git", "hooks");
const CHECK = process.argv.includes("--check");

export const PRE_PUSH_SHIM = [
  "#!/usr/bin/env sh",
  "# Installed by scripts/install-hooks.mjs — do not edit; edit scripts/hooks/pre-push.mjs.",
  'exec node "$(git rev-parse --show-toplevel)/scripts/hooks/pre-push.mjs" "$@"',
  "",
].join("\n");

export function isShimInstalled(hooksDir = HOOKS_DIR) {
  try { return fs.readFileSync(path.join(hooksDir, "pre-push"), "utf8") === PRE_PUSH_SHIM; } catch { return false; }
}

export function installPrePushShim(hooksDir = HOOKS_DIR) {
  fs.mkdirSync(hooksDir, { recursive: true });
  const target = path.join(hooksDir, "pre-push");
  fs.writeFileSync(target, PRE_PUSH_SHIM, { encoding: "utf8" });
  try { fs.chmodSync(target, 0o755); } catch { /* Windows */ }
  return target;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  if (!fs.existsSync(path.join(ROOT, ".git"))) { console.error("install-hooks: no .git directory"); process.exit(2); }
  if (CHECK) {
    const ok = isShimInstalled();
    console.log(ok ? "✓ pre-push hook is the Node shim" : "✗ pre-push hook is not the Node shim (run: node scripts/install-hooks.mjs)");
    process.exit(ok ? 0 : 1);
  }
  const target = installPrePushShim();
  console.log(`✓ installed ${path.relative(ROOT, target)} → scripts/hooks/pre-push.mjs`);
}
