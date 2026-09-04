#!/usr/bin/env node
// Usage: node scripts/check-node-runtime.mjs [--json]
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const jsonMode = process.argv.includes("--json");
const pkg = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));
const lock = JSON.parse(fs.readFileSync(path.join(root, "package-lock.json"), "utf8"));
const workflowDir = path.join(root, ".github", "workflows");

function minimumMajor(range) {
  const branches = String(range || "").split("||");
  const floors = branches.flatMap((branch) => {
    const explicit = Array.from(branch.matchAll(/>=\s*(\d+)/g), (match) => Number(match[1]));
    const caret = Array.from(branch.matchAll(/[~^]\s*(\d+)/g), (match) => Number(match[1]));
    const exact = branch.trim().match(/^(\d+)(?:\.\d+){0,2}$/);
    return explicit.length || caret.length || exact
      ? [Math.min(...explicit, ...caret, ...(exact ? [Number(exact[1])] : []))]
      : [];
  });
  return floors.length ? Math.min(...floors) : null;
}

const projectRange = pkg.engines?.node || "";
const projectMinimum = minimumMajor(projectRange);
const workflowRows = fs.readdirSync(workflowDir)
  .filter((name) => /\.ya?ml$/.test(name))
  .flatMap((name) => {
    const body = fs.readFileSync(path.join(workflowDir, name), "utf8");
    return Array.from(body.matchAll(/node-version:\s*['"]?(\d+)/g), (match) => ({
      file: `.github/workflows/${name}`,
      major: Number(match[1]),
    }));
  });
const dependencyFloors = Object.entries(lock.packages || {})
  .filter(([name, value]) => name && value?.engines?.node)
  .map(([name, value]) => ({
    package: name.replace(/^node_modules\//, ""),
    range: value.engines.node,
    minimum: minimumMajor(value.engines.node),
  }))
  .filter((row) => row.minimum != null);
const requiredDependencyMinimum = Math.max(0, ...dependencyFloors.map((row) => row.minimum));
const actualMajor = Number(process.versions.node.split(".")[0]);
const errors = [];
if (!projectMinimum) errors.push("package.json must declare a parseable engines.node floor");
if (projectMinimum && requiredDependencyMinimum > projectMinimum) {
  errors.push(`dependency floor Node ${requiredDependencyMinimum} exceeds project floor Node ${projectMinimum}`);
}
// Workflows propagated from Studio OS are rewritten by the canon sync (five
// times in S163 alone), so their pin cannot be enforced as a deploy blocker
// without taking production down on every sync. They must still be a
// maintained LTS line; the root fix is tracked with studio-ops.
const EXTERNALLY_SYNCED = new Set([".github/workflows/brief-format-check.yml"]);
const EXTERNAL_FLOOR = 20;
const warnings = [];
for (const row of workflowRows) {
  if (!projectMinimum || row.major >= projectMinimum) continue;
  if (EXTERNALLY_SYNCED.has(row.file) && row.major >= EXTERNAL_FLOOR) {
    warnings.push(`${row.file} uses Node ${row.major} (Studio OS sync; project floor is ${projectMinimum})`);
    continue;
  }
  errors.push(`${row.file} uses Node ${row.major}, below project floor Node ${projectMinimum}`);
}
for (const warning of warnings) console.warn(`Node runtime contract: WARN · ${warning}`);
if (projectMinimum && actualMajor < projectMinimum) {
  errors.push(`current Node ${actualMajor} is below project floor Node ${projectMinimum}`);
}

const receipt = {
  schemaVersion: "node-runtime-contract-v1",
  ok: errors.length === 0,
  projectRange,
  projectMinimum,
  actualMajor,
  requiredDependencyMinimum,
  workflowRows,
  dependencyFloorPackages: dependencyFloors
    .filter((row) => row.minimum === requiredDependencyMinimum)
    .map(({ package: packageName, range }) => ({ package: packageName, range })),
  errors,
};

if (jsonMode) console.log(JSON.stringify(receipt, null, 2));
else if (receipt.ok) {
  console.log(`Node runtime contract: PASS · project >=${projectMinimum} · workflows ${workflowRows.length}/${workflowRows.length} · dependency floor ${requiredDependencyMinimum}`);
} else {
  console.error(`Node runtime contract: FAIL\n- ${errors.join("\n- ")}`);
}
process.exit(receipt.ok ? 0 : 1);
