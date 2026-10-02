#!/usr/bin/env node
// Read-only currentness check for a bounded audit sidecar. Source evidence,
// visual-state evidence and deployment evidence are deliberately separate.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';

const root = path.resolve(import.meta.dirname, '..');
const valueAfter = (flag) => { const index = process.argv.indexOf(flag); return index < 0 ? null : process.argv[index + 1]; };
const auditFile = path.resolve(root, valueAfter('--audit') || '.cache/audit-2026-09-30/docs/AUDIT_2026-09-30.json');
if (!fs.existsSync(auditFile)) { console.error(`Audit sidecar unavailable: ${auditFile}`); process.exit(2); }
const auditBytes = fs.readFileSync(auditFile);
const audit = JSON.parse(auditBytes);
const sha256 = (bytes) => crypto.createHash('sha256').update(bytes).digest('hex');
const currentCommit = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8', windowsHide: true }).trim();
const resolveTarget = (target) => {
  const normalized = String(target || '').replaceAll('\\', '/');
  const marker = '/Call-Of-Doodie/';
  const relative = normalized.includes(marker) ? normalized.split(marker).at(-1) : normalized.replace(/^\.\//, '');
  return path.resolve(root, relative);
};
const items = (audit.items || []).map((item) => {
  const premises = (item.premises || []).map((premise) => {
    if (premise.adapter !== 'file-content') return { claim: premise.claim, state: 'unknown', reason: 'Unsupported premise adapter' };
    const target = resolveTarget(premise.target);
    if (!target.startsWith(root + path.sep) || !fs.existsSync(target)) return { claim: premise.claim, state: 'unknown', reason: 'Target missing or outside this repo' };
    const bytes = fs.readFileSync(target);
    const found = bytes.toString('utf8').includes(String(premise.pattern || ''));
    const matched = found === Boolean(premise.expected);
    const implemented = item.status === 'implemented-local' && item.executionLog?.length > 0;
    return { claim: premise.claim, state: matched ? 'verified-source' : implemented ? 'retired-after-implementation' : 'contradicted', source: path.relative(root, target).replaceAll('\\', '/'), sha256: sha256(bytes), historicalPattern: matched ? undefined : premise.pattern };
  });
  return { slug: item.slug, title: item.title, status: item.status, type: item.tier === '💡' ? 'design-hypothesis' : 'implementation-candidate', premises };
});
const qaFile = path.join(root, 'docs/visual-qa/LATEST.json');
let visual = { state: 'unknown', reason: 'No visual receipt' };
if (fs.existsSync(qaFile)) {
  try {
    const qa = JSON.parse(fs.readFileSync(qaFile, 'utf8'));
    const captures = Array.isArray(qa.captures) ? qa.captures : [];
    const routes = [...new Set(captures.map((capture) => capture.page).filter(Boolean))];
    visual = { state: captures.length && qa.workingTreeUiSha256 ? 'working-tree-receipt' : 'unknown', captureCount: captures.length, stateLabels: routes, uiHash: qa.workingTreeUiSha256 || null, sourceFileCount: qa.sourceFiles?.length || 0 };
  } catch { visual = { state: 'unknown', reason: 'Visual receipt unreadable' }; }
}
const staleAbsentClaims = ['stats page absent', 'no shared polling', 'guest play absent', 'local coaching absent'];
const staleClaims = items.flatMap((item) => staleAbsentClaims.filter((text) => JSON.stringify(item).toLowerCase().includes(text)).map((text) => ({ slug: item.slug, text })));
const report = {
  schemaVersion: 'audit-currentness-v1', audit: path.relative(root, auditFile).replaceAll('\\', '/'), auditSha256: sha256(auditBytes),
  sourceCommit: currentCommit, deploymentRevision: 'unknown-until-hosted-verification',
  sourcePremises: { verified: items.flatMap((item) => item.premises).filter((premise) => premise.state === 'verified-source').length, retired: items.flatMap((item) => item.premises).filter((premise) => premise.state === 'retired-after-implementation').length, contradicted: items.flatMap((item) => item.premises).filter((premise) => premise.state === 'contradicted').length, unknown: items.flatMap((item) => item.premises).filter((premise) => premise.state === 'unknown').length },
  visual, staleClaims, items,
};
const out = valueAfter('--out');
if (out) {
  const file = path.resolve(root, out);
  if (!file.startsWith(path.join(root, '.cache') + path.sep)) throw new Error('Audit reports may only be written into the in-repo .cache directory');
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, `${JSON.stringify(report, null, 2)}\n`);
}
console.log(JSON.stringify({ auditSha256: report.auditSha256, sourceCommit: currentCommit.slice(0, 12), sourcePremises: report.sourcePremises, visual: { state: visual.state, captureCount: visual.captureCount }, deploymentRevision: report.deploymentRevision, staleClaims, itemCount: items.length }));
if (report.sourcePremises.contradicted || staleClaims.length) process.exitCode = 1;
