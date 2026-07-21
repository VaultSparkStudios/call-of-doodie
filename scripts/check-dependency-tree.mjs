#!/usr/bin/env node

import { runDependencyTreeCheck } from "./lib/dependency-tree.mjs";

const jsonMode = process.argv.includes("--json");
const result = runDependencyTreeCheck(process.cwd());

if (jsonMode) {
  console.log(JSON.stringify(result, null, 2));
} else {
  console.log("Dependency Tree Check");
  console.log("=====================");
  console.log(`- ${result.ok ? "OK" : "FAIL"} installed-tree — ${result.detail}`);
  for (const problem of result.problems) console.log(`  - ${problem}`);
  if (result.stderr && !result.ok) console.log(`  - stderr: ${result.stderr}`);
}

process.exit(result.ok ? 0 : 1);

