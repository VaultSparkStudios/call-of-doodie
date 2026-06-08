#!/usr/bin/env node
/**
 * Lightweight staged/working-tree secret scanner for closeout.
 *
 * This is intentionally conservative and dependency-free: common credential
 * patterns plus entropy checks on added lines. It redacts findings and exits
 * non-zero when anything suspicious appears.
 */

import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const args = process.argv.slice(2);
const modeAll = args.includes('--all');
const modeStaged = args.includes('--staged') || (!modeAll && args.length === 0);
const explicit = args.filter((arg) => !arg.startsWith('--'));

const PATTERNS = [
  /AKIA[0-9A-Z]{16}/,
  /sk-[A-Za-z0-9_-]{20,}/,
  /xox[baprs]-[A-Za-z0-9-]{20,}/,
  /gh[pousr]_[A-Za-z0-9_]{20,}/,
  /-----BEGIN (?:RSA |EC |OPENSSH |PGP )?PRIVATE KEY-----/,
  /\b(?:api[_-]?key|secret|token|password|private[_-]?key)\b\s*[:=]\s*['"]?[^'"\s]{12,}/i,
];

const ALLOW = [
  /REPLACE_ME/i,
  /example/i,
  /placeholder/i,
  /VITE_POSTHOG_KEY/,
  /VITE_SENTRY_DSN/,
  /ANTHROPIC_API_KEY/,
  /KOFI_VERIFICATION_TOKEN/,
  /"integrity"\s*:\s*"sha512-/,
  /sha512-/,
  /vaultspark-studio-ops\/docs\//,
  /vaultspark-studio-ops\/secrets\/CAPABILITY_MAP\.json/,
  /AGENT_CAPABILITIES\.md/,
  /PROJECT_SITEMAP_STANDARD\.md/,
  /PROPOSAL_2026-05-21_HIVEMIND\.md/,
];

function shannon(value) {
  const freq = new Map();
  for (const ch of value) freq.set(ch, (freq.get(ch) || 0) + 1);
  let entropy = 0;
  for (const count of freq.values()) {
    const p = count / value.length;
    entropy -= p * Math.log2(p);
  }
  return entropy;
}

function redact(value) {
  if (value.length <= 12) return '****';
  return `${value.slice(0, 4)}…${value.slice(-4)}`;
}

function addedLinesFromDiff(diff) {
  return diff.split(/\r?\n/)
    .filter((line) => line.startsWith('+') && !line.startsWith('+++'))
    .map((line) => line.slice(1));
}

function fileLines(file) {
  try {
    return fs.readFileSync(file, 'utf8').split(/\r?\n/);
  } catch {
    return [];
  }
}

function collectLines() {
  if (explicit.length) {
    const lines = [];
    for (const target of explicit) {
      const full = path.resolve(target);
      if (!fs.existsSync(full)) continue;
      const stat = fs.statSync(full);
      if (stat.isDirectory()) continue;
      fileLines(full).forEach((line, idx) => lines.push({ file: target, lineNo: idx + 1, text: line }));
    }
    return lines;
  }

  const diffArgs = modeAll
    ? ['diff', '--unified=0', '--', '.']
    : ['diff', '--cached', '--unified=0', '--', '.'];
  const diff = execFileSync('git', diffArgs, { encoding: 'utf8' });
  return addedLinesFromDiff(diff).map((text, idx) => ({ file: modeStaged ? 'staged-diff' : 'working-diff', lineNo: idx + 1, text }));
}

const findings = [];
for (const entry of collectLines()) {
  const text = entry.text.trim();
  if (!text || ALLOW.some((re) => re.test(text))) continue;
  for (const pattern of PATTERNS) {
    const match = text.match(pattern);
    if (match) {
      findings.push({ ...entry, reason: 'pattern', sample: redact(match[0]) });
      break;
    }
  }
  for (const token of text.match(/[A-Za-z0-9_/-]{32,}/g) || []) {
    if (ALLOW.some((re) => re.test(token))) continue;
    if (shannon(token) >= 4.5) {
      findings.push({ ...entry, reason: 'high-entropy', sample: redact(token) });
      break;
    }
  }
}

if (findings.length) {
  console.error(`scan-secrets · ${findings.length} finding(s)`);
  for (const finding of findings) {
    console.error(`- ${finding.file}:${finding.lineNo} ${finding.reason} ${finding.sample}`);
  }
  process.exit(1);
}

console.log(`scan-secrets · clean (${modeAll ? 'working tree' : modeStaged ? 'staged diff' : 'explicit files'})`);
