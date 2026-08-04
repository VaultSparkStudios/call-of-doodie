#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { spawnSync } from './lib/safe-spawn.mjs';
import { evaluateStartupAcceptance, GENERATED_PRIVATE_PATHS } from './lib/startup-acceptance.mjs';

const root = process.cwd();
const node = process.execPath;
const jsonMode = process.argv.includes('--json');
const skipRender = process.argv.includes('--skip-render');

function run(command, args, options = {}) {
  return spawnSync(command, args, {
    cwd: root,
    encoding: 'utf8',
    timeout: options.timeout || 120_000,
  });
}

if (!skipRender) {
  const rendered = run(node, [path.join(root, 'scripts', 'render-startup-brief.mjs')]);
  if (rendered.status !== 0) {
    process.stderr.write(rendered.stderr || rendered.stdout || 'Startup brief renderer failed.\n');
    process.exit(rendered.status || 1);
  }
}

const hotContextCheck = run(node, [path.join(root, 'scripts', 'render-hot-context.mjs'), '--check']);
if (hotContextCheck.status !== 0) {
  process.stderr.write(hotContextCheck.stderr || hotContextCheck.stdout || 'Hot context freshness/budget check failed.\n');
  process.exit(hotContextCheck.status || 1);
}

const secretAudit = run(node, [path.join(root, 'scripts', 'check-secrets.mjs'), '--audit', '--json']);
if (secretAudit.status !== 0) {
  process.stderr.write(secretAudit.stderr || 'Capability audit failed.\n');
  process.exit(secretAudit.status || 1);
}

let capabilities;
try {
  capabilities = JSON.parse(secretAudit.stdout);
} catch {
  process.stderr.write('Capability audit did not emit valid JSON.\n');
  process.exit(1);
}

const ignoredPaths = {};
for (const relativePath of GENERATED_PRIVATE_PATHS) {
  const ignored = run('git', ['check-ignore', '--quiet', '--', relativePath], { timeout: 15_000 });
  ignoredPaths[relativePath] = ignored.status === 0;
}

const briefPath = path.join(root, 'docs', 'STARTUP_BRIEF.md');
const statusPath = path.join(root, 'context', 'PROJECT_STATUS.json');
const sourceFiles = [
  'scripts/lib/secrets.mjs',
  'scripts/render-startup-brief.mjs',
  'scripts/lib/startup-brief-boxes.mjs',
  'scripts/lib/brief-evidence.mjs',
  'scripts/render-hot-context.mjs',
  '.gitignore',
];
const sourceText = sourceFiles
  .map((relativePath) => `${relativePath}\n${fs.readFileSync(path.join(root, relativePath), 'utf8')}`)
  .join('\n');

const receipt = evaluateStartupAcceptance({
  capabilities,
  briefText: fs.readFileSync(briefPath, 'utf8'),
  status: JSON.parse(fs.readFileSync(statusPath, 'utf8')),
  ignoredPaths,
  sourceText,
});
const hotContextJson = fs.readFileSync(path.join(root, 'context', 'HOT_CONTEXT.json'));
const hotContextMd = fs.readFileSync(path.join(root, 'context', 'HOT_CONTEXT.md'));
receipt.hotContext = {
  ok: true,
  jsonBytes: hotContextJson.byteLength,
  markdownBytes: hotContextMd.byteLength,
  maximumBytesPerArtifact: 24000,
  jsonSha256: createHash('sha256').update(hotContextJson).digest('hex'),
  markdownSha256: createHash('sha256').update(hotContextMd).digest('hex'),
};

fs.mkdirSync(path.join(root, '.cache'), { recursive: true });
fs.writeFileSync(path.join(root, '.cache', 'startup-acceptance.json'), `${JSON.stringify(receipt, null, 2)}\n`);

if (jsonMode) console.log(JSON.stringify(receipt, null, 2));
else {
  console.log(`Startup acceptance: ${receipt.ok ? 'PASS' : 'FAIL'}`);
  console.log(`Capabilities: ${receipt.capabilities.ready}/${receipt.capabilities.total} via ${receipt.capabilities.sources.join(', ') || 'unknown'}`);
  console.log(`Brief: format=${receipt.brief.formatOk} evidence=${receipt.brief.evidenceOk} flatRate=${receipt.brief.hasFlatRateCost}`);
  for (const issue of receipt.issues) console.log(`- ${issue}`);
}
process.exit(receipt.ok ? 0 : 1);
