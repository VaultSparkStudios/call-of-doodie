import crypto from 'node:crypto';

export function canonical(value) {
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonical(value[key])}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

export function signReleaseProof(receipt, key) {
  if (!key) throw new Error('Studio Ark signing key is unavailable');
  const { sig: _sig, ...unsigned } = receipt;
  return crypto.createHmac('sha256', key).update(canonical(unsigned)).digest('hex');
}

export function verifyReleaseProof(receipt, { key, expectedSha, policy, now = Date.now() } = {}) {
  const findings = [];
  if (!receipt || typeof receipt !== 'object') return { ok: false, findings: ['receipt missing'] };
  if (!/^[a-f0-9]{40}$/.test(receipt.source?.sha || '')) findings.push('source SHA is malformed');
  if (expectedSha && receipt.source?.sha !== expectedSha) findings.push(`source SHA ${receipt.source?.sha || 'missing'} != ${expectedSha}`);
  if (!/^[a-f0-9]{64}$/.test(receipt.source?.archiveSha256 || '')) findings.push('archive SHA-256 is malformed');
  if (receipt.outcome !== 'verified') findings.push(`outcome is ${receipt.outcome || 'missing'}`);
  if (receipt.execution?.lane !== policy?.lane) findings.push('lane does not match policy');
  if (receipt.execution?.network !== policy?.isolation?.network) findings.push('network isolation is not proved');
  if (receipt.execution?.tempDirectory !== 'sha-bound-run-directory') findings.push('temporary writes are not confined to the SHA-bound run directory');
  if (receipt.execution?.noNewPrivileges !== true) findings.push('NoNewPrivileges is not proved');
  if (receipt.execution?.protectSystem !== 'strict') findings.push('ProtectSystem=strict is not proved');
  const assertions = Number(receipt.tests?.assertionsPassed || 0);
  if (assertions < Number(policy?.minimumAssertions || 0)) findings.push(`only ${assertions}/${policy?.minimumAssertions || 0} required assertions passed`);
  if (Number(receipt.tests?.filesPassed || 0) !== Number(policy?.tests?.length || 0)) findings.push('not every required proof file passed');
  const completed = Date.parse(receipt.completedAt || '');
  const maxAgeMs = Number(policy?.maximumAgeHours || 24) * 3_600_000;
  if (!Number.isFinite(completed)) findings.push('completion timestamp is malformed');
  else if (now - completed > maxAgeMs) findings.push('release proof is stale');
  if (!receipt.sig) findings.push('signature missing');
  else if (!key || signReleaseProof(receipt, key) !== receipt.sig) findings.push('signature mismatch');
  return { ok: findings.length === 0, findings };
}

export function parseAssertionSummary(output) {
  const matches = [...String(output || '').matchAll(/(?:^|\s)(\d+)\/(\d+)(?:\s|$)/g)];
  if (!matches.length) return null;
  const last = matches.at(-1);
  return { passed: Number(last[1]), total: Number(last[2]) };
}


/** Hash a declared check contract; the trusted policy comes from the owner, never the PR. */
export function proofHash(value) {
  return crypto.createHash('sha256').update(typeof value === 'string' ? value : canonical(value)).digest('hex');
}

/** Shared dependency/routine delivery court. Missing or unrun checks cannot prove delivery. */
export function verifyDeliveryProof(receipt, { key, expected, policy, now = Date.now() } = {}) {
  const findings = [];
  if (!receipt || typeof receipt !== 'object') return { ok: false, findings: ['delivery proof missing'] };
  if (!policy || !Array.isArray(policy.requiredChecks) || !policy.requiredChecks.length || !policy.owner || !policy.repo) {
    return { ok: false, findings: ['owner required-check contract missing'] };
  }
  if (new Set(policy.requiredChecks.map(c=>c.id)).size !== policy.requiredChecks.length || policy.requiredChecks.some(c=>!c.id || !Array.isArray(c.argv) || !c.argv.length || c.argv.some(a=>typeof a!=='string'))) findings.push('required-check contract is malformed');
  if (receipt.schemaVersion !== 'delivery-proof/v1') findings.push('unsupported delivery proof schema');
  if (receipt.kind !== expected?.kind || receipt.repo !== expected?.repo || receipt.repo !== policy.repo) findings.push('proof action/repository scope mismatch');
  if (!/^[a-f0-9]{40}$/.test(expected?.sha || '') || receipt.source?.sha !== expected.sha) findings.push('proof does not bind the exact current commit');
  if (!/^[a-f0-9]{40}$/.test(receipt.source?.tree || '')) findings.push('source tree identity missing');
  if (expected?.tree && receipt.source?.tree !== expected.tree) findings.push('source tree does not match current commit');
  if (receipt.policySha256 !== proofHash(policy)) findings.push('required-check contract changed');
  const completed = Date.parse(receipt.completedAt || '');
  const maxAgeMs = (policy.maximumAgeHours || 24) * 3600000;
  if (!Number.isFinite(completed) || completed > now || now - completed > maxAgeMs) findings.push('proof is stale or has invalid chronology');
  if (receipt.outcome !== 'verified') findings.push('delivery was not verified');
  const checks = Array.isArray(receipt.checks) ? receipt.checks : [];
  for (const required of policy.requiredChecks) {
    const matches = checks.filter(c => c.id === required.id);
    if (matches.length !== 1) { findings.push('required check missing or duplicated: ' + required.id); continue; }
    const check = matches[0], start = Date.parse(check.startedAt || ''), end = Date.parse(check.completedAt || '');
    if (canonical(check.argv) !== canonical(required.argv) || check.sourceSha !== expected?.sha || check.tree !== receipt.source?.tree) findings.push('check command/source mismatch: ' + required.id);
    if (check.outcome !== 'passed' || check.exitCode !== 0 || check.executed !== true) findings.push('required check did not pass: ' + required.id);
    if (!Number.isFinite(start) || !Number.isFinite(end) || start > end || end > completed || now - end > maxAgeMs) findings.push('check chronology invalid: ' + required.id);
    if (!/^[a-f0-9]{64}$/.test(check.outputSha256 || '')) findings.push('check output evidence missing: ' + required.id);
  }
  if (receipt.owner?.slug !== policy.owner || receipt.owner?.sourceSha !== expected?.sha || receipt.owner?.acknowledged !== true || !receipt.owner?.reference) findings.push('owner acknowledgement missing or out of scope');
  if (expected?.kind === 'dependency-remediation') {
    if (expected.pr !== undefined && receipt.request?.pr !== expected.pr) findings.push('dependency request mismatch');
    if (!/^[a-f0-9]{64}$/.test(expected.diffSha256 || '') || receipt.dependency?.diffSha256 !== expected.diffSha256) findings.push('dependency diff mismatch');
    const locks = expected.lockfiles;
    if (!locks || !Object.keys(locks).length || Object.values(locks).some(hash => !/^[a-f0-9]{64}$/.test(hash)) || canonical(receipt.dependency?.lockfiles) !== canonical(locks)) findings.push('lockfile evidence mismatch');
    const trust = receipt.dependency?.trust;
    if (trust?.verdict !== 'allow' || !/^[a-f0-9]{64}$/.test(trust?.evidenceSha256 || '') || trust?.sourceSha !== expected.sha || !Array.isArray(trust?.packages) || !trust.packages.length) findings.push('package trust evidence missing');
  }
  if (!key || !receipt.sig || signReleaseProof(receipt, key) !== receipt.sig) findings.push('delivery proof signature mismatch');
  return { ok: findings.length === 0, findings };
}
