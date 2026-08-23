import { describe, expect, it } from 'vitest';
import {
  evaluateWriteBackCurrency,
  isPostCloseoutSealCommit,
  isSubstantiveCommit,
} from '../scripts/check-writeback-currency.mjs';

const anchor = {
  sha: '6cc6ed4',
  subject: 'docs: seal session 158 production evidence',
  isoDate: '2026-08-16T22:13:35-04:00',
  files: ['context/SELF_IMPROVEMENT_LOOP.md'],
};

const publishSeal = {
  sha: '293f918',
  subject: 'docs: publish session 158 closeout board',
  isoDate: '2026-08-16T22:20:27-04:00',
  files: [
    'context/PROJECT_STATUS.json',
    'docs/CLOSEOUT_STATUS_BOARD.md',
    'docs/STARTUP_BRIEF.md',
  ],
};

const finalizeSeal = {
  sha: '86a1838',
  subject: 'docs: finalize session 158 closeout board',
  isoDate: '2026-08-16T22:21:34-04:00',
  files: ['docs/CLOSEOUT_STATUS_BOARD.md'],
};

const dependencyAutomation = {
  sha: 'dbde3b7',
  subject: 'chore(deps-dev): bump eslint-plugin-react-refresh (#115)',
  isoDate: '2026-08-20T05:35:32Z',
  files: ['package.json', 'package-lock.json'],
};

describe('write-back currency closeout sealing', () => {
  it('classifies the known S158 post-SIL status, brief, and board seal commits as clean', () => {
    expect(isPostCloseoutSealCommit(publishSeal)).toBe(true);
    expect(isPostCloseoutSealCommit(finalizeSeal)).toBe(true);

    const result = evaluateWriteBackCurrency({
      commits: [finalizeSeal, publishSeal, anchor],
      nowMs: Date.parse('2026-08-23T17:00:00-04:00'),
      staleHours: 12,
    });

    expect(result).toMatchObject({ ok: true, inFlight: false, debtCount: 0 });
  });

  it('keeps genuinely substantive work after the SIL anchor classified as debt', () => {
    const substantive = {
      sha: '72ef510',
      subject: 'docs: sync Studio OS canonical assets and protocol enforcement',
      isoDate: '2026-08-21T23:17:18Z',
      files: ['scripts/protocol-drift-check.mjs'],
    };

    const result = evaluateWriteBackCurrency({
      commits: [substantive, dependencyAutomation, finalizeSeal, publishSeal, anchor],
      nowMs: Date.parse('2026-08-23T17:00:00-04:00'),
      staleHours: 12,
    });

    expect(result).toMatchObject({ ok: false, inFlight: false, debtCount: 1 });
    expect(result.debt).toEqual([
      expect.objectContaining({ sha: '72ef510', subject: substantive.subject }),
    ]);
  });

  it('does not let a closeout-board subject hide a source change', () => {
    const deceptive = { ...publishSeal, files: [...publishSeal.files, 'src/App.jsx'] };

    expect(isPostCloseoutSealCommit(deceptive)).toBe(false);
    expect(isSubstantiveCommit(deceptive)).toBe(true);
  });
});
