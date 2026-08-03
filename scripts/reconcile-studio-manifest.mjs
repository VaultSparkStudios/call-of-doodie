#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { reconcileReleaseManifest } from './lib/release-manifest.mjs';

const root = process.cwd();
const manifestPath = path.join(root, 'context', 'STUDIO_MANIFEST.json');
const statusPath = path.join(root, 'context', 'PROJECT_STATUS.json');
const check = process.argv.includes('--check');
const jsonMode = process.argv.includes('--json');

const currentText = fs.readFileSync(manifestPath, 'utf8');
const current = JSON.parse(currentText);
const status = JSON.parse(fs.readFileSync(statusPath, 'utf8'));
const result = reconcileReleaseManifest(current, status);
const desiredText = `${JSON.stringify(result.manifest, null, 2)}\n`;
const currentCanonical = `${JSON.stringify(current, null, 2)}\n`;
const inSync = desiredText === currentCanonical;

const receipt = { ...result.receipt, inSync };
if (jsonMode) console.log(JSON.stringify(receipt, null, 2));
else {
  console.log(`Release manifest: ${receipt.ok && (inSync || !check) ? 'PASS' : 'FAIL'}`);
  console.log(`Staging: ${receipt.staging.type || 'unknown'} -> ${receipt.staging.url || 'missing'}`);
  console.log(`Identity: ${receipt.obeliskArchitecture} / auth=${receipt.authEnabled}`);
  for (const issue of receipt.issues) console.log(`- ${issue}`);
  if (check && !inSync) console.log('- context/STUDIO_MANIFEST.json is not reconciled with PROJECT_STATUS.');
}

if (!result.receipt.ok) process.exit(1);
if (check) process.exit(inSync ? 0 : 1);
fs.writeFileSync(manifestPath, desiredText);
