#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const allowed = new Set(['scripts/lib/write-project-status.mjs']);
const offenders = [];
function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name === '.git' || entry.name === '.cache') continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (/\.(?:mjs|js|cjs)$/.test(entry.name)) {
      const rel = path.relative(ROOT, full).replace(/\\/g, '/');
      if (allowed.has(rel)) continue;
      const source = fs.readFileSync(full, 'utf8');
      if (/writeFileSync\s*\(\s*(?:STATUS|STATUS_PATH|statusPath|targetStatusPath|sp)\b/.test(source)) offenders.push(rel);
    }
  }
}
walk(path.join(ROOT, 'scripts'));
if (offenders.length) {
  console.error(`PROJECT_STATUS writer boundary: FAIL\n${offenders.map((x) => `- ${x}`).join('\n')}`);
  process.exit(1);
}
console.log('PROJECT_STATUS writer boundary: PASS');
