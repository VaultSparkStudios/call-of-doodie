#!/usr/bin/env node
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseDoctorOptions, runProjectDoctor } from "./lib/project-doctor.mjs";

try {
  const options = parseDoctorOptions(process.argv.slice(2));
  if (options.help) console.log("Usage: node scripts/ops.mjs doctor [--json] [--quiet] [--update-json] [--fix]\nMeasures recipient-native checks; excludes Studio Ops infrastructure. --fix reports that no automatic fixes are configured.");
  else {
    const receipt = runProjectDoctor(path.resolve(path.dirname(fileURLToPath(import.meta.url)), ".."), options);
    if (options.json) console.log(JSON.stringify(receipt, null, 2));
    else if (!options.quiet) {
      console.log(`Project doctor (${receipt.subject.slug}): ${receipt.passing}/${receipt.total} passing; ${receipt.blockingFailing} blocking`);
      for (const check of receipt.checks) console.log(`${check.pass ? "PASS" : "FAIL"} ${check.id}${check.pass ? "" : `: ${check.detail}`}`);
      console.log(receipt.coverage);
    }
    if (options.fix && !options.json) console.error(receipt.fix);
    process.exitCode = receipt.overallPass ? 0 : 1;
  }
} catch (error) {
  console.error(`Project doctor failed: ${error.message}`);
  process.exitCode = 1;
}
