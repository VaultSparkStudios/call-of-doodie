/**
 * Repo-local skill cost ledger.
 *
 * The full Studio Ops version aggregates cross-repo skill ROI. This public repo
 * only needs a safe append-only writer so startup/closeout renderers can record
 * telemetry without depending on private ops helpers.
 */

import fs from 'node:fs';
import path from 'node:path';

export function recordSkillCost(repoRoot, entry = {}) {
  const target = path.join(repoRoot, '.cache', 'skill-cost-ledger.ndjson');
  const line = {
    at: new Date().toISOString(),
    skill: entry.skill || 'unknown',
    sessionId: entry.sessionId || null,
    actualTokens: entry.actualTokens ?? null,
    durationSec: entry.durationSec ?? null,
    status: entry.status || 'unknown',
  };
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.appendFileSync(target, JSON.stringify(line) + '\n');
  return line;
}

export default { recordSkillCost };
