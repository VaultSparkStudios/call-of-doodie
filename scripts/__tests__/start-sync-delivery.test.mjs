// @vitest-environment node
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { spawnSync } from '../lib/safe-spawn.mjs';
import { planSync, executeSync } from '../start-sync.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const FILES = ['start-sync.mjs', ...['safe-spawn', 'git-window-guard', 'fast-node', 'stranded-closeout', 'shared-policies', 'tree-residue', 'closeout-finalize', 'regenerated-surface', 'suite-tree-purity', 'spawn-failure-cause'].map(x => `lib/${x}.mjs`)];
function git(cwd, ...args) {
  const result = spawnSync('git', args, { cwd, encoding: 'utf8', timeout: 15000 });
  if (result.status !== 0) throw new Error(`git ${args[0]}: ${result.stderr || result.error}`);
  return result.stdout.trim();
}
function init(root) {
  fs.mkdirSync(root, { recursive: true });
  git(root, 'init', '-b', 'main');
  git(root, 'config', 'user.name', 'Fixture');
  git(root, 'config', 'user.email', 'fixture@example.invalid');
  git(root, 'config', 'core.hooksPath', '.disabled-hooks');
}

describe('recipient startup sync delivery', () => {
  it('stops substantive staged or unstaged work even when upstream is current', () => {
    for (const code of [' M', 'M ', '??']) {
      const plan = planSync({ statusText: `${code} src/game.js\n`, numstatText: '1\t0\tsrc/game.js\n', behind: 0, ahead: 0 });
      expect(plan.action).toBe('stop');
      expect(plan.residue.substantive[0].path).toBe('src/game.js');
    }
  });

  it('admits clean and additions-only receipt residue but rejects edited receipts', () => {
    expect(planSync({ statusText: '', numstatText: '', behind: 1, ahead: 0 }).action).toBe('pull');
    const statusText = ' M portfolio/events.ndjson\n';
    expect(planSync({ statusText, numstatText: '1\t0\tportfolio/events.ndjson\n', behind: 1, ahead: 0 }).action).toBe('pull-autostash');
    expect(planSync({ statusText, numstatText: '1\t1\tportfolio/events.ndjson\n', behind: 1, ahead: 0 }).action).toBe('stop');
  });

  it('rejects a successful pull whose autostash leaves conflicts', () => {
    const result = executeSync(args => {
      if (args[0] === 'diff' && args.includes('--diff-filter=U')) return { code: 0, out: 'context/status.json\0' };
      return { code: 0, out: '' };
    }, { action: 'pull-autostash', residue: { regenerated: [] } }, { remote: 'origin', branch: 'main' });
    expect(result.code).toBe(1);
    expect(result.failure).toBe('autostash-conflict');
  });

  it('uses the recipient script root, pulls clean changes, and preserves substantive work', () => {
    const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'cod-start-sync-'));
    try {
      const remote = path.join(temp, 'remote.git');
      const recipient = path.join(temp, 'recipient with spaces');
      const caller = path.join(temp, 'caller');
      const upstream = path.join(temp, 'upstream');
      fs.mkdirSync(remote);
      git(remote, 'init', '--bare', '--initial-branch=main');
      init(recipient);
      init(caller);
      fs.writeFileSync(path.join(caller, 'caller.txt'), 'untouched\n');
      git(caller, 'add', '.');
      git(caller, 'commit', '-m', 'caller baseline');
      for (const rel of FILES) {
        const target = path.join(recipient, 'scripts', rel);
        fs.mkdirSync(path.dirname(target), { recursive: true });
        fs.copyFileSync(path.join(ROOT, 'scripts', rel), target);
      }
      fs.mkdirSync(path.join(recipient, 'src'));
      fs.writeFileSync(path.join(recipient, 'src/game.js'), 'export const score = 1;\n');
      git(recipient, 'add', '.');
      git(recipient, 'commit', '-m', 'recipient baseline');
      git(recipient, 'remote', 'add', 'origin', remote);
      git(recipient, 'push', '-u', 'origin', 'main');
      const callerHead = git(caller, 'rev-parse', 'HEAD');
      const run = () => {
        const result = spawnSync(process.execPath, [path.join(recipient, 'scripts/start-sync.mjs'), '--json'], { cwd: caller, encoding: 'utf8', timeout: 20000 });
        if (!result.stdout) throw new Error(`sync process ${result.status}: ${result.stderr || result.error}`);
        return { status: result.status, receipt: JSON.parse(result.stdout) };
      };
      expect(run()).toMatchObject({ status: 0, receipt: { action: 'none', behind: 0, fetchOk: true } });
      git(temp, 'clone', remote, upstream);
      git(upstream, 'config', 'user.name', 'Fixture');
      git(upstream, 'config', 'user.email', 'fixture@example.invalid');
      fs.writeFileSync(path.join(upstream, 'upstream.txt'), 'delivered\n');
      git(upstream, 'add', '.');
      git(upstream, 'commit', '-m', 'upstream change');
      git(upstream, 'push', 'origin', 'main');
      expect(run()).toMatchObject({ status: 0, receipt: { action: 'pull', fetchOk: true } });
      expect(fs.readFileSync(path.join(recipient, 'upstream.txt'), 'utf8')).toBe('delivered\n');
      const head = git(recipient, 'rev-parse', 'HEAD');
      const game = path.join(recipient, 'src/game.js');
      fs.writeFileSync(game, 'export const score = 2;\n');
      git(recipient, 'add', 'src/game.js');
      fs.writeFileSync(game, 'export const score = 3;\n');
      const index = git(recipient, 'show', ':src/game.js');
      const stopped = run();
      expect(stopped.status).toBe(1);
      expect(stopped.receipt).toMatchObject({ action: 'stop', residue: { kind: 'substantive', substantive: [expect.objectContaining({ path: 'src/game.js' })] } });
      expect(git(recipient, 'rev-parse', 'HEAD')).toBe(head);
      expect(git(recipient, 'show', ':src/game.js')).toBe(index);
      expect(fs.readFileSync(game, 'utf8')).toBe('export const score = 3;\n');
      expect(git(recipient, 'stash', 'list')).toBe('');
      expect(git(caller, 'rev-parse', 'HEAD')).toBe(callerHead);
      expect(git(caller, 'status', '--porcelain')).toBe('');
    } finally {
      if (path.dirname(path.resolve(temp)) !== path.resolve(os.tmpdir()) || !path.basename(temp).startsWith('cod-start-sync-')) throw new Error('Unexpected fixture cleanup target');
      fs.rmSync(temp, { recursive: true, force: true });
    }
  }, 90_000); // Real local Git round trips contend with the full suite on Windows.
});
