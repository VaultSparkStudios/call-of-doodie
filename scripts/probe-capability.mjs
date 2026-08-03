#!/usr/bin/env node
/**
 * Project-local proxy for the authoritative Studio Ops capability probe.
 *
 * Provider endpoints and credential-handling logic stay behind the shared
 * control-plane boundary. This public project exposes only command parity.
 */

import { runStudioScript } from './lib/studio-ops-proxy.mjs';

process.exitCode = runStudioScript({
  script: 'probe-capability.mjs',
  args: process.argv.slice(2),
  projectBound: false,
});
