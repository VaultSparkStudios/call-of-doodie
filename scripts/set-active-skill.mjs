#!/usr/bin/env node
/**
 * set-active-skill.mjs
 *
 * Records the currently executing Studio OS skill for local telemetry and
 * model-routing cost attribution. This public shim intentionally has no
 * network or private Studio Ops dependency.
 */

import fs from 'node:fs';
import path from 'node:path';

const skill = process.argv[2] || process.argv.find(arg => !arg.startsWith('-')) || 'unknown';
const outDir = path.join(process.cwd(), '.cache');
const outPath = path.join(outDir, 'active-skill.json');

fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(outPath, JSON.stringify({
  skill,
  startedAt: new Date().toISOString(),
  agent: 'codex',
  project: path.basename(process.cwd()),
}, null, 2) + '\n');

console.log(`✓ active skill: ${skill}`);
