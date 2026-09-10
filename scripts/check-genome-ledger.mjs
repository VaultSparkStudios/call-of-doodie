#!/usr/bin/env node
/**
 * check-genome-ledger.mjs — is the genome history a clean, honest ledger?
 *
 * Complements check-closeout-artifact-currency.mjs (S174), which only reads the
 * newest session label and is therefore blind to everything behind it. See
 * scripts/lib/genome-ledger.mjs for the measured defects and for why the known
 * historical ones are declared rather than rewritten.
 *
 * Exit: 0 = no new ledger defect · 1 = regression, or the ledger is unreadable.
 */

import path from 'node:path';

import { ACCEPTED_HISTORICAL_DEFECTS, measureGenomeLedger } from './lib/genome-ledger.mjs';

const ROOT = path.resolve(import.meta.dirname, '..');
const JSON_OUT = process.argv.includes('--json');

const result = measureGenomeLedger(ROOT);

if (JSON_OUT) {
  console.log(JSON.stringify(result, null, 2));
  process.exit(result.ok ? 0 : 1);
}

console.log('Genome ledger integrity');
console.log('=======================');

if (result.unmeasurable) {
  console.error(`⛔ unmeasurable — ${result.reason}`);
  console.error('An unreadable ledger is not a clean one. Fix the artifact or its writer.');
  process.exit(1);
}

console.log(`Snapshots: ${result.total} · coverage window S${result.coverageFloor}-S${result.coverageCeiling}`);

if (result.accepted.length) {
  console.log('');
  console.log(`Recorded historical debt (${result.accepted.length}) — declared ${ACCEPTED_HISTORICAL_DEFECTS.recordedAt}, not force-greened:`);
  for (const row of result.accepted) {
    console.log(`- ${row.kind} S${row.session}: ${row.detail}`);
  }
}

if (result.ok) {
  console.log('');
  console.log('Status: ok — no new ledger defect.');
  process.exit(0);
}

console.error('');
console.error(`⛔ ${result.regressions.length} NEW genome-ledger defect(s):`);
for (const row of result.regressions) {
  console.error(`- ${row.kind}${row.session === null ? '' : ` S${row.session}`}: ${row.detail}`);
}
console.error('');
console.error('A new duplicate means a snapshot was re-appended under a different date instead of updated.');
console.error('A new gap means a closeout skipped the SESSION_PROTOCOL §3.7 genome renderer:');
console.error('  node scripts/append-genome-snapshot.mjs');
console.error('Do NOT quiet this by adding the session to ACCEPTED_HISTORICAL_DEFECTS — that list is history, not a waiver.');
process.exit(1);
