#!/usr/bin/env node
/**
 * Focused TASK_BOARD lookup — returns one task, never the entire board.
 *
 * Usage:
 *   node scripts/task-slice.mjs --id 202 [--json]
 *   node scripts/task-slice.mjs --search "credential ownership" [--limit 5] [--json]
 *   node scripts/task-slice.mjs --audit-context [--max-chars 8000] [--json]
 */
import fs from 'node:fs';
import path from 'node:path';
import { buildAuditTaskContext } from './lib/audit-task-context.mjs';
import { findTaskRowsById, parseTaskRows } from './lib/task-board.mjs';

const ROOT = path.resolve(import.meta.dirname, '..');
const args = process.argv.slice(2);
const JSON_MODE = args.includes('--json');
const valueAfter = (flag) => {
  const index = args.indexOf(flag);
  return index >= 0 ? args[index + 1] : null;
};
const id = valueAfter('--id');
const search = valueAfter('--search');
const auditContext = args.includes('--audit-context');
const limit = Math.max(1, Math.min(20, Number(valueAfter('--limit') || 5)));
const maxCharsArg = valueAfter('--max-chars') || args.find((arg) => arg.startsWith('--max-chars='))?.split('=')[1];
const maxChars = Math.max(1200, Math.min(20_000, Number(maxCharsArg || 8000)));
const boardPath = path.resolve(valueAfter('--path') || path.join(ROOT, 'context', 'TASK_BOARD.md'));

function emit(payload, code = 0) {
  if (JSON_MODE) {
    process.stdout.write(JSON.stringify(payload, null, 2) + '\n');
  } else if (payload.ok && payload.task) {
    const task = payload.task;
    process.stdout.write(`# Task ${task.id} · ${task.status}\n\n`);
    process.stdout.write(`**Section:** ${task.section} · **Line:** ${task.line} · **Tier:** ${task.tier} · **Category:** ${task.category} · **Effort:** ${task.effort}\n\n`);
    process.stdout.write(`${task.rawItem.slice(0, 1500)}\n`);
  } else if (payload.ok) {
    process.stdout.write(`Found ${payload.count} task(s):\n`);
    for (const task of payload.tasks) process.stdout.write(`  ${task.id.padStart(6)} · ${task.status.padEnd(16)} · ${task.title.slice(0, 120)}\n`);
  } else {
    process.stderr.write(`${payload.error}\n`);
  }
  process.exit(code);
}

let markdown;
try {
  markdown = fs.readFileSync(boardPath, 'utf8');
} catch (error) {
  emit({ ok: false, error: `TASK_BOARD unreadable: ${error.message}`, path: boardPath }, 2);
}

if (auditContext) {
  const { payload, rendered } = buildAuditTaskContext(markdown, { sourcePath: boardPath, maxChars });
  if (JSON_MODE) process.stdout.write(rendered);
  else {
    process.stdout.write(`# TASK_BOARD audit context\n\n`);
    process.stdout.write(`Source: ${payload.source.sha256.slice(0, 12)} · ${payload.source.bytes} bytes · open ${payload.open.length}/${payload.budget.openTotal} · output ${payload.budget.renderedChars}/${payload.budget.maxChars} chars\n\n`);
    for (const item of payload.open) process.stdout.write(`- ${item.key} · ${item.status} · ${item.section} · ${item.title || item.titleHash}\n`);
  }
  process.exit(payload.ok ? 0 : 1);
}

if (id != null) {
  const matches = findTaskRowsById(markdown, id);
  if (matches.length === 0) emit({ ok: false, error: `task id ${id} not found`, id, path: boardPath }, 1);
  if (matches.length > 1) emit({
    ok: false,
    error: `task id ${id} is ambiguous (${matches.length} rows)`,
    id,
    matches: matches.map(({ section, line, status, title }) => ({ section, line, status, title })),
  }, 2);
  emit({ ok: true, task: matches[0], path: boardPath });
}

if (search != null) {
  const needle = search.toLowerCase().trim();
  if (!needle) emit({ ok: false, error: '--search requires a non-empty query' }, 2);
  const matches = parseTaskRows(markdown)
    .filter((row) => `${row.id} ${row.title} ${row.item} ${row.category} ${row.status}`.toLowerCase().includes(needle))
    .slice(0, limit);
  emit({ ok: true, query: search, count: matches.length, tasks: matches, truncated: matches.length === limit });
}

emit({ ok: false, error: 'usage: task-slice --id <N> | --search <text> [--limit N] | --audit-context [--max-chars N] [--json]' }, 2);
