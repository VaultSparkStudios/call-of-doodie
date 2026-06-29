#!/usr/bin/env node

import { spawnSync } from "./lib/safe-spawn.mjs";

const result = spawnSync(process.execPath, ["scripts/cache-genius-list.mjs", "--write", ...process.argv.slice(2)], {
  cwd: process.cwd(),
  stdio: "inherit",
});
process.exit(result.status ?? 1);
