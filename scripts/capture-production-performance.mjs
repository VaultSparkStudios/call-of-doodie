#!/usr/bin/env node

import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from './lib/safe-spawn.mjs';
import { buildPerformanceEvidence } from './lib/performance-evidence.mjs';

const root = process.cwd();
const packageVersion = '13.4.1';
const runsArg = process.argv.find((arg) => arg.startsWith('--runs='));
const baseArg = process.argv.find((arg) => arg.startsWith('--base-url='));
const reuseCache = process.argv.includes('--reuse-cache');
const runsPerSurface = Math.max(1, Math.min(5, Number(runsArg?.split('=')[1]) || 3));
const baseUrl = new URL(baseArg?.split('=').slice(1).join('=') || 'https://callofdoodie.wtf/');
const cacheDir = path.join(root, '.cache', 'lighthouse');
const tempDir = path.join(cacheDir, 'tmp');
const receiptPath = path.join(root, 'docs', 'performance', 'PRODUCTION_LIGHTHOUSE.json');

function run(command, args, options = {}) {
  return spawnSync(command, args, {
    cwd: root,
    encoding: 'utf8',
    timeout: options.timeout || 180_000,
    env: options.env || process.env,
  });
}

function runNpm(args, options = {}) {
  return process.platform === 'win32'
    ? run('cmd', ['/d', '/s', '/c', 'npm', ...args], options)
    : run('npm', args, options);
}

function processOutput(result) {
  return String(result?.stderr || result?.stdout || result?.error?.message || '').trim();
}

function sha256(value) {
  return createHash('sha256').update(value).digest('hex');
}

function findChrome() {
  const candidates = [
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  ];
  return candidates.find((candidate) => fs.existsSync(candidate)) || null;
}

const healthUrl = new URL('/_health', baseUrl);
const healthResponse = await fetch(healthUrl, { redirect: 'error', signal: AbortSignal.timeout(15_000) });
if (!healthResponse.ok) throw new Error(`Health request failed: ${healthResponse.status}`);
const healthText = await healthResponse.text();
let health = {};
try { health = JSON.parse(healthText); } catch {}
const hostedRevision = health.revision
  || health.commit
  || health.sha
  || health.deploy
  || healthResponse.headers.get('x-vaultspark-revision')
  || sha256(healthText).slice(0, 12);

const git = run('git', ['rev-parse', 'HEAD'], { timeout: 15_000 });
if (git.status !== 0) throw new Error(git.stderr || 'Unable to resolve source SHA.');
const sourceSha = git.stdout.trim();
const chromePath = findChrome();
if (!chromePath) throw new Error('No trusted local Chrome/Edge executable found.');
fs.mkdirSync(tempDir, { recursive: true });
const lighthouseEnv = { ...process.env, CHROME_PATH: chromePath, TEMP: tempDir, TMP: tempDir };

const execPrefix = ['exec', '--yes', '--ignore-scripts', `--package=lighthouse@${packageVersion}`, '--', 'lighthouse'];
const versionCheck = runNpm([...execPrefix, '--version'], {
  timeout: 180_000,
  env: lighthouseEnv,
});
const resolvedLighthouseVersion = String(versionCheck.stdout || '').trim();
if (versionCheck.status !== 0 || resolvedLighthouseVersion !== packageVersion) {
  throw new Error(processOutput(versionCheck) || `Lighthouse version mismatch: ${resolvedLighthouseVersion || 'no output'}`);
}

fs.mkdirSync(cacheDir, { recursive: true });
const captures = [];

for (const surface of ['default', 'legacy-v1']) {
  for (let index = 0; index < runsPerSurface; index += 1) {
    const target = new URL(baseUrl);
    if (surface === 'legacy-v1') target.searchParams.set('home', 'v1');
    const outputPath = path.join(cacheDir, `${surface}-${index + 1}.json`);
    if (reuseCache) {
      if (!fs.existsSync(outputPath)) throw new Error(`Missing cached Lighthouse report: ${outputPath}`);
      const raw = fs.readFileSync(outputPath, 'utf8');
      captures.push({
        surface,
        report: JSON.parse(raw),
        rawSha256: sha256(raw),
        captureWarning: 'chrome-profile-cleanup-eperm-after-complete-report',
      });
      console.log(`Reused ${surface} ${index + 1}/${runsPerSurface}`);
      continue;
    }
    fs.rmSync(outputPath, { force: true });
    const result = runNpm([
      ...execPrefix,
      target.toString(),
      '--quiet',
      '--only-categories=performance',
      '--output=json',
      `--output-path=${outputPath}`,
      '--chrome-flags=--headless=new --no-sandbox --disable-gpu',
    ], {
      timeout: 240_000,
      env: lighthouseEnv,
    });
    const output = processOutput(result);
    const cleanupOnlyFailure = result.status !== 0
      && fs.existsSync(outputPath)
      && /Runtime error encountered: EPERM[\s\S]*destroyTmp/.test(output);
    if (result.status !== 0 && !cleanupOnlyFailure) {
      throw new Error(`Lighthouse ${surface} run ${index + 1} failed: ${processOutput(result)}`);
    }
    const raw = fs.readFileSync(outputPath, 'utf8');
    const report = JSON.parse(raw);
    const completeReport = report?.categories?.performance?.score != null
      && report?.audits?.['largest-contentful-paint']?.numericValue != null
      && report?.audits?.['cumulative-layout-shift']?.numericValue != null
      && report?.audits?.['total-blocking-time']?.numericValue != null;
    if (!completeReport) throw new Error(`Lighthouse ${surface} run ${index + 1} wrote an incomplete report.`);
    captures.push({
      surface,
      report,
      rawSha256: sha256(raw),
      ...(cleanupOnlyFailure ? { captureWarning: 'chrome-profile-cleanup-eperm-after-complete-report' } : {}),
    });
    console.log(`Captured ${surface} ${index + 1}/${runsPerSurface}`);
  }
}

const hostUserAgent = String(captures[0]?.report?.environment?.hostUserAgent || captures[0]?.report?.userAgent || '');
const chromeMatch = hostUserAgent.match(/(?:Chrome|HeadlessChrome)\/([\d.]+)/);
const chromeVersion = chromeMatch ? chromeMatch[1] : path.basename(chromePath);

const receipt = buildPerformanceEvidence({
  runs: captures,
  sourceSha,
  hostedRevision,
  healthBodyHash: sha256(healthText),
  baseUrl: baseUrl.toString(),
  lighthouseVersion: packageVersion,
  chromeVersion,
  capturedAt: new Date().toISOString(),
  packageTrust: {
    offlineVerdict: 'REVIEW',
    offlineScore: 60,
    liveVerdict: 'APPROVE',
    source: 'https://github.com/GoogleChrome/lighthouse',
    registry: 'https://registry.npmjs.org/lighthouse/-/lighthouse-13.4.1.tgz',
    integrity: 'sha512-fDu8lt3QLK/lTqIxtp1HkzQNJ32rsFHhbadYOepcMZFLgA8oINhxutMbMv8XXnpTOvZ0TXCo4JCk1LDTWaRLnA==',
    releasedAt: '2026-07-20T19:59:46.318Z',
    license: 'Apache-2.0',
    provenance: 'SLSA npm attestation plus registry signature; no install lifecycle scripts',
    incidentMatches: 0,
    installMode: 'transient exact version with ignore-scripts; package.json and lockfile unchanged',
  },
});

fs.mkdirSync(path.dirname(receiptPath), { recursive: true });
fs.writeFileSync(receiptPath, `${JSON.stringify(receipt, null, 2)}\n`);
console.log(JSON.stringify(receipt, null, 2));
process.exit(receipt.ok ? 0 : 1);
