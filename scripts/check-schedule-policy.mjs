#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import {
  buildSchedulePolicyReceipt,
  inspectWorkflowSource,
} from "./lib/schedule-policy.mjs";

const root = path.resolve(import.meta.dirname, "..");
const workflowsDir = path.join(root, ".github", "workflows");
const workflowFiles = fs.existsSync(workflowsDir)
  ? fs.readdirSync(workflowsDir)
      .filter((file) => /\.ya?ml$/i.test(file))
      .map((file) => path.join(workflowsDir, file))
  : [];
const workflows = workflowFiles.map((absolutePath) => inspectWorkflowSource(
  fs.readFileSync(absolutePath, "utf8"),
  path.relative(root, absolutePath).replaceAll("\\", "/"),
));
const receipt = buildSchedulePolicyReceipt(workflows);

console.log(JSON.stringify(receipt, null, 2));
if (!receipt.pass) process.exitCode = 1;
