#!/usr/bin/env node
/**
 * check-closeout-artifact-currency.mjs — fail when a §3.7 closeout renderer
 * has silently stopped running.
 *
 * See scripts/lib/closeout-artifact-currency.mjs for the gap this closes.
 *
 * Exit: 0 = every declared artifact current · 1 = stale or unmeasurable.
 */

import path from 'node:path';

import { measureCloseoutArtifacts } from './lib/closeout-artifact-currency.mjs';

const ROOT = path.resolve(import.meta.dirname, '..');
const JSON_OUT = process.argv.includes('--json');

const result = measureCloseoutArtifacts(ROOT);

if (JSON_OUT) {
  console.log(JSON.stringify(result, null, 2));
  process.exit(result.ok ? 0 : 1);
}

console.log('Closeout artifact currency');
console.log('==========================');
console.log(`Authority: SIL ledger newest closed-out session = ${result.authority ?? 'UNREADABLE'}`);
for (const row of result.rows) {
  const mark = row.status === 'current' ? 'OK  ' : row.status === 'stale' ? 'STALE' : 'UNMEASURABLE';
  const detail =
    row.status === 'stale'
      ? `records S${row.recorded}, ${row.lag} session(s) behind — run ${row.renderer}`
      : row.status === 'unmeasurable'
        ? row.reason
        : `records S${row.recorded}`;
  console.log(`- ${mark} ${row.file} (${row.protocol}) — ${detail}`);
}

if (result.ok) {
  console.log('Status: ok');
  process.exit(0);
}

console.error('');
if (result.stale.length) {
  console.error(
    `⛔ ${result.stale.length} closeout artifact(s) stale — a required renderer did not run. ` +
      'Re-run the renderer named above, or record in the closeout brief why it could not.',
  );
}
if (result.unmeasurable.length) {
  console.error(
    `⛔ ${result.unmeasurable.length} closeout artifact(s) unmeasurable — currency cannot be asserted, ` +
      'which is not the same as being fresh. Fix the artifact or its declared extractor.',
  );
}
process.exit(1);
