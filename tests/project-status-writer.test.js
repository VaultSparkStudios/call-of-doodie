import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { updateProjectStatus, withProjectStatusLock, writeProjectStatus } from '../scripts/lib/write-project-status.mjs';
import { V3_CATS } from '../scripts/lib/sil-categories.mjs';

function fixture() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'cod-status-'));
  fs.mkdirSync(path.join(root, 'context'));
  const categories = Object.fromEntries(V3_CATS.map((category, index) => [category, index === 0 ? 100 : 0]));
  fs.writeFileSync(path.join(root, 'context', 'PROJECT_STATUS.json'), JSON.stringify({ silCategoriesV3: categories, silScore: 999, silMax: 2 }));
  return root;
}

describe('canonical PROJECT_STATUS writer', () => {
  it('enforces invariants and leaves no partial file', () => {
    const root = fixture();
    const current = JSON.parse(fs.readFileSync(path.join(root, 'context', 'PROJECT_STATUS.json')));
    const result = writeProjectStatus(root, current);
    const saved = JSON.parse(fs.readFileSync(result.written, 'utf8'));
    expect(saved.silScore).toBe(100);
    expect(saved.silMax).toBe(1000);
    expect(fs.readdirSync(path.join(root, 'context')).filter((name) => name.endsWith('.tmp'))).toEqual([]);
  });

  it('serializes read-modify-write and preserves unrelated fields', () => {
    const root = fixture();
    updateProjectStatus(root, (status) => ({ ...status, proof: 'source-derived' }));
    const saved = JSON.parse(fs.readFileSync(path.join(root, 'context', 'PROJECT_STATUS.json')));
    expect(saved.proof).toBe('source-derived');
  });

  it('times out on a recent lock and reclaims a stale one', () => {
    const root = fixture();
    const lock = path.join(root, 'context', '.project-status.lock');
    fs.writeFileSync(lock, 'other');
    expect(() => withProjectStatusLock(root, () => null, { timeoutMs: 5, pollMs: 1, staleMs: 60_000 })).toThrow(/timed out/);
    fs.utimesSync(lock, new Date(0), new Date(0));
    expect(withProjectStatusLock(root, () => 'ok', { timeoutMs: 20, staleMs: 1 })).toBe('ok');
    expect(fs.existsSync(lock)).toBe(false);
  });
});
