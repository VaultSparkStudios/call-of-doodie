#!/usr/bin/env node
/**
 * write-session-lock.mjs
 *
 * Writes context/.session-lock reliably using Node fs.
 * bash `echo > file` silently fails for dotfiles on Windows — this doesn't.
 *
 * Usage:
 *   node scripts/write-session-lock.mjs [--agent <claude-code|codex|other>] [--note "..."]
 *   node scripts/ops.mjs write-session-lock --agent claude-code
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);

const agentArg = args.find((_, i) => args[i - 1] === '--agent') ?? 'claude-code';
const noteArg = args.find((_, i) => args[i - 1] === '--note') ?? 'Session start via /start protocol v1.3';

const projectName = path.basename(ROOT);
const now = new Date().toISOString();

const content = [
  `locked_by: agent-session`,
  `session_start: ${now}`,
  `agent: ${agentArg}`,
  `project: ${projectName}`,
  `note: ${noteArg}`,
  '',
].join('\n');

const lockPath = path.join(ROOT, 'context', '.session-lock');
fs.writeFileSync(lockPath, content, 'utf8');
console.log(`✓ context/.session-lock written (agent: ${agentArg}, project: ${projectName})`);

// Non-blocking: if Google integration is live, auto-create a Studio Session
// calendar event so every /start drops a calendar block matching the work.
// Gated on GOOGLE_OAUTH_REFRESH_TOKEN so it silently skips when unconfigured.
try {
  // Lazy-load env from .env.local without clobbering shell env.
  const envLocal = path.join(ROOT, '.env.local');
  if (fs.existsSync(envLocal)) {
    for (const line of fs.readFileSync(envLocal, 'utf8').split(/\r?\n/)) {
      const m = line.match(/^([A-Z_]+)=(.*)$/);
      if (m && !(m[1] in process.env)) process.env[m[1]] = m[2];
    }
  }
  const googleEnv = path.join(ROOT, 'secrets', 'google.env');
  if (fs.existsSync(googleEnv)) {
    for (const line of fs.readFileSync(googleEnv, 'utf8').split(/\r?\n/)) {
      const m = line.match(/^([A-Z_]+)=(.*)$/);
      if (m && !(m[1] in process.env)) process.env[m[1]] = m[2];
    }
  }
} catch { /* ignore */ }

if (process.env.GOOGLE_OAUTH_REFRESH_TOKEN && !args.includes('--no-calendar')) {
  const { spawn } = await import('node:child_process');
  // Fire-and-forget. Script itself exits 0 even on API error so we never
  // gate /start on calendar availability.
  const child = spawn(process.execPath, [path.join(ROOT, 'scripts', 'calendar-session-event.mjs'), '--kind', 'session'], {
    cwd: ROOT,
    stdio: 'ignore',
    detached: true,
  });
  child.unref();
}
