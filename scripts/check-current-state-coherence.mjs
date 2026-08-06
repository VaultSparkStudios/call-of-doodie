#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { evaluateCurrentStateCoherence } from "./lib/current-state-coherence.mjs";

const root = path.resolve(import.meta.dirname, "..");
const jsonMode = process.argv.includes("--json");
const source = fs.readFileSync(path.join(root, "context", "CURRENT_STATE.md"), "utf8");
const result = evaluateCurrentStateCoherence(source);

if (jsonMode) {
  console.log(JSON.stringify(result, null, 2));
} else if (result.ok) {
  console.log("Current State coherence: PASS · no repeated contiguous session blocks");
} else {
  console.error(`Current State coherence: FAIL · ${result.duplicates.length} repeated block(s)`);
  for (const duplicate of result.duplicates) {
    console.error(`- S${duplicate.session}: lines ${duplicate.firstLine} and ${duplicate.repeatedLine} repeat for ${duplicate.matchingLines} lines`);
  }
}

process.exit(result.ok ? 0 : 1);
