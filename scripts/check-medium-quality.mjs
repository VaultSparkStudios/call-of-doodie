#!/usr/bin/env node

import { runMediumGate } from './lib/medium-quality-gates.mjs';

const medium = process.argv[2] || 'unknown';
const slug = process.argv[3] || 'item';
const result = runMediumGate(medium, { slug });
console.log(JSON.stringify(result, null, 2));
process.exit(result.ok ? 0 : 1);
