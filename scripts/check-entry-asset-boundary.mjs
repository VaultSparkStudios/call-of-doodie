#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const dist = path.join(root, 'dist');
const htmlPath = path.join(dist, 'index.html');
if (!fs.existsSync(htmlPath)) {
  console.error('FAIL entry-asset-boundary: dist/index.html is missing; run npm run build first.');
  process.exit(1);
}

const html = fs.readFileSync(htmlPath, 'utf8');
const preloaded = [...html.matchAll(/<link\b[^>]*rel=["']modulepreload["'][^>]*href=["']([^"']+)["']/g)]
  .map((match) => path.basename(match[1]));
const assetsDir = path.join(dist, 'assets');
const dataPlaneAssets = fs.readdirSync(assetsDir)
  .filter((name) => name.endsWith('.js'))
  .filter((name) => {
    const source = fs.readFileSync(path.join(assetsDir, name), 'utf8');
    return source.includes('SupabaseClient') && source.includes('realtimeUrl');
  });
const leaked = dataPlaneAssets.filter((name) => preloaded.includes(name));
const report = {
  schemaVersion: 'entry-asset-boundary-v1',
  ok: dataPlaneAssets.length > 0 && leaked.length === 0,
  preloaded,
  deferredDataPlaneAssets: dataPlaneAssets,
  leaked,
};
console.log(JSON.stringify(report, null, 2));
process.exit(report.ok ? 0 : 1);
