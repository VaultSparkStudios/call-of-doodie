import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { readSkillCostLedger, recordSkillCost, skillCostLedgerReceipt } from '../scripts/lib/skill-cost-ledger.mjs';

describe('execution-budget ledger', () => {
  it('owns one append-only source and labels flat-rate semantics honestly', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'cod-ledger-'));
    recordSkillCost(root, { skill: 'arc', sessionId: 139, actualTokens: 321, phase: 'implement', step: 'pulse', model: 'codex' });
    const ledger = readSkillCostLedger(root);
    expect(ledger.entries).toHaveLength(1);
    expect(ledger.entries[0]).toMatchObject({ skill: 'arc', phase: 'implement', step: 'pulse', actual: { tokens: 321 } });
    expect(skillCostLedgerReceipt(root)).toMatchObject({
      ok: true,
      path: '.cache/skill-costs.jsonl',
      semantics: 'flat-rate-plan-token-efficiency-not-cash-spend',
      malformedRows: 0,
    });
    expect(fs.existsSync(path.join(root, '.cache', 'skill-cost-ledger.jsonl'))).toBe(false);
    expect(fs.existsSync(path.join(root, 'ignis', 'output', 'agent-spend.json'))).toBe(false);
  });

  it('makes malformed source rows visible', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'cod-ledger-'));
    const ledger = path.join(root, '.cache', 'skill-costs.jsonl');
    fs.mkdirSync(path.dirname(ledger), { recursive: true });
    fs.writeFileSync(ledger, '{bad json}\n');
    expect(skillCostLedgerReceipt(root)).toMatchObject({ ok: false, malformedRows: 1, totalRows: 1 });
  });
});
