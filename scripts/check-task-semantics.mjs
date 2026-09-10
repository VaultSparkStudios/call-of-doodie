#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { parseHumanItems, parseSectionCheckboxItems, reconcileTaskBoard } from './lib/task-board.mjs';
import { findLatestSessionOrphans } from './lib/task-work.mjs';

const root = process.cwd();
const board = fs.readFileSync(path.join(root, 'context', 'TASK_BOARD.md'), 'utf8');
const reconciliation = reconcileTaskBoard(board);
const humanItems = parseHumanItems(board);
const latestSessionOrphans = findLatestSessionOrphans(board);
const knownConsumers = [
  'scripts/ops.mjs',
  'scripts/lib/task-work.mjs',
  'scripts/lib/cross-repo-tasks.mjs',
];
const privateParserPattern = /split\(\/\\r\?\\n\/\).*startsWith\(["']- \[ \]["']\)/s;
const divergentConsumers = knownConsumers.filter((relativePath) => {
  const source = fs.readFileSync(path.join(root, relativePath), 'utf8');
  return privateParserPattern.test(source);
});
const receipt = {
  schemaVersion: 'task-semantics-court-v1',
  ok: reconciliation.ok && humanItems.length === parseSectionCheckboxItems(board, 'Human Action Required').length && divergentConsumers.length === 0 && latestSessionOrphans.items.length === 0,
  reconciliation,
  humanActionOpen: humanItems.length,
  divergentConsumers,
  latestSessionOrphans: {
    latestSession: latestSessionOrphans.latestSession,
    count: latestSessionOrphans.items.length,
    items: latestSessionOrphans.items.map((item) => ({ line: item.line, title: item.body })),
  },
};

if (process.argv.includes('--json')) console.log(JSON.stringify(receipt, null, 2));
else {
  console.log(`Task semantics: ${receipt.ok ? 'PASS' : 'FAIL'}`);
  console.log(`Open checkboxes: ${reconciliation.parsedOpenCheckboxes}/${reconciliation.rawOpenCheckboxes}`);
  console.log(`Human Action Required: ${receipt.humanActionOpen}`);
  if (divergentConsumers.length) console.log(`Divergent consumers: ${divergentConsumers.join(', ')}`);
  for (const item of receipt.latestSessionOrphans.items) console.log(`Orphaned latest-session work at line ${item.line}: ${item.title}`);
}
process.exit(receipt.ok ? 0 : 1);
