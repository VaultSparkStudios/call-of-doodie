#!/usr/bin/env node

import { spawnSync } from "node:child_process";

const result = spawnSync(process.execPath, ["scripts/cache-genius-list.mjs", "--write", ...process.argv.slice(2)], {
  cwd: process.cwd(),
  stdio: "inherit",
});
process.exit(result.status ?? 1);
