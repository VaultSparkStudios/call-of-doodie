import { describe, expect, it } from 'vitest';
import {
  anchorSessionFromSil,
  evaluateWriteBackCurrency,
  isPostCloseoutVerificationRecord,
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

// S176 — the real shape S176's triage misread: S175 closed out (SIL anchor in
// 00eba3d), pushed, verified production, then recorded that in WORK_LOG.
describe('write-back currency post-deploy verification record', () => {
  const silText = '# SIL\n\n## 2026-09-10 — Session 175 | Total: 998/1000\n\nbody\n## 2026-09-10 — Session 174 | Total: 996/1000\n';
  const s175Anchor = {
    sha: '00eba3d0',
    subject: 'fix: the game had published two bot counts at once since S165 (S175)',
    isoDate: '2026-09-10T18:14:32-04:00',
    files: ['context/SELF_IMPROVEMENT_LOOP.md', 'src/config/modeFacts.js'],
  };
  const verification = {
    sha: '97705ae4',
    subject: 'docs: record S175 deploy verification (00eba3d exact-match production, sixteen-bot claim live)',
    isoDate: '2026-09-10T18:30:00-04:00',
    files: ['logs/WORK_LOG.md'],
  };
  const nowMs = Date.parse('2026-09-11T16:00:00-04:00');

  it('reads the anchor session from the newest SIL heading', () => {
    expect(anchorSessionFromSil(silText)).toBe(175);
    expect(anchorSessionFromSil('no headings')).toBe(null);
  });

  it('treats the recorded session\'s WORK_LOG-only verification as clean (the live S176 false positive)', () => {
    const result = evaluateWriteBackCurrency({ commits: [verification, s175Anchor], nowMs, staleHours: 12, silText });
    expect(result).toMatchObject({ ok: true, debtCount: 0 });
  });

  it('still counts it as debt without SIL evidence of the session (fails closed)', () => {
    const result = evaluateWriteBackCurrency({ commits: [verification, s175Anchor], nowMs, staleHours: 12 });
    expect(result).toMatchObject({ ok: false, debtCount: 1 });
  });

  it('does not exempt a verification of a session the SIL never recorded', () => {
    const unclosed = { ...verification, subject: 'docs: record S176 deploy verification (abc exact-match)' };
    expect(isPostCloseoutVerificationRecord(unclosed, 175)).toBe(false);
    const result = evaluateWriteBackCurrency({ commits: [unclosed, s175Anchor], nowMs, staleHours: 12, silText });
    expect(result.debtCount).toBe(1);
  });

  it('attributes by the SIL as of the anchor commit, not the working tree mid-closeout', () => {
    // Mid-closeout the tree's newest heading is already the NEXT session (176),
    // but the anchor commit recorded 175 — the verification must still attribute.
    const treeSil = '## 2026-09-11 — Session 176 | Total: 999/1000\n' + silText;
    const silTextAt = (sha) => (sha === s175Anchor.sha ? silText : '');
    const viaAnchor = evaluateWriteBackCurrency({ commits: [verification, s175Anchor], nowMs, staleHours: 12, silText: treeSil, silTextAt });
    expect(viaAnchor).toMatchObject({ ok: true, debtCount: 0 });
    const viaTree = evaluateWriteBackCurrency({ commits: [verification, s175Anchor], nowMs, staleHours: 12, silText: treeSil });
    expect(viaTree.debtCount).toBe(1);
  });

  it('does not let the verification subject hide a code change', () => {
    const deceptive = { ...verification, files: ['logs/WORK_LOG.md', 'src/App.jsx'] };
    expect(isPostCloseoutVerificationRecord(deceptive, 175)).toBe(false);
    const result = evaluateWriteBackCurrency({ commits: [deceptive, s175Anchor], nowMs, staleHours: 12, silText });
    expect(result.debtCount).toBe(1);
  });
});
