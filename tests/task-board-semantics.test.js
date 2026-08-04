import fs from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  parseHumanItems,
  parseSectionCheckboxItems,
  parseTaskBoardAst,
  reconcileTaskBoard,
} from '../scripts/lib/task-board.mjs';

describe('shared task-board semantics', () => {
  const fixture = `## Human Action Required
- [ ] Plain physical launch QA
- [ ] **Scoped analytics** — add project key (~3 sessions)
- [x] Completed operator action

## Now
- [ ] [SIL:2] Ship the parser

## Unified Genius List
| # | Tier | Category | Status | Effort | Item |
|---|---|---|---|---|---|
| 1 | 🔥 | Protocol | unblocked | S | **One semantics** — shared AST |
`;

  it('parses plain and bold checkbox rows with source locations', () => {
    const nodes = parseTaskBoardAst(fixture);
    expect(nodes.filter((node) => node.kind === 'checkbox')).toHaveLength(4);
    expect(parseHumanItems(fixture)).toEqual([
      expect.objectContaining({ title: 'Plain physical launch QA', line: 2 }),
      expect.objectContaining({ title: 'Scoped analytics', description: 'add project key (~3 sessions)', ageSessions: 3, line: 3 }),
    ]);
  });

  it('filters section work without re-parsing markdown', () => {
    expect(parseSectionCheckboxItems(fixture, ['Now', 'Human Action Required']).map((item) => item.line)).toEqual([2, 3, 7]);
  });

  it('reconciles every raw open checkbox with the AST', () => {
    expect(reconcileTaskBoard(fixture)).toEqual({
      schemaVersion: 'taskboard-reconciliation-v1',
      ok: true,
      rawOpenCheckboxes: 3,
      parsedOpenCheckboxes: 3,
    });
  });

  it('reconciles the live task board and retains every human gate', () => {
    const live = fs.readFileSync('context/TASK_BOARD.md', 'utf8');
    expect(reconcileTaskBoard(live).ok).toBe(true);
    expect(parseHumanItems(live).length).toBe(parseSectionCheckboxItems(live, 'Human Action Required').length);
    expect(parseHumanItems(live).length).toBeGreaterThan(0);
  });
});
