import fs from "node:fs";
import path from "node:path";

export const coreLogicCoverageContract = Object.freeze({
  schemaVersion: "core-logic-coverage-v1",
  label: "Core gameplay logic coverage",
  include: [
    "src/utils/**",
    "src/systems/**",
    "src/hooks/**",
    "src/storage.js",
    "src/constants.js",
  ],
  thresholds: Object.freeze({
    statements: 72,
    branches: 66.5,
    functions: 71,
    lines: 77,
  }),
  minimumFileCount: 82,
  exclusions: Object.freeze([
    { surface: "src/App.jsx", reason: "React/canvas orchestration is protected by focused integration, launch, replay, and architecture tests while pure frame domains continue moving into src/systems." },
    { surface: "src/components/**", reason: "Rendered interaction and accessibility behavior is protected by component/browser tests; line coverage is not presented as visual correctness." },
    { surface: "src/drawGame.js + src/sounds.js", reason: "Canvas/audio realization is protected by asset, media, browser, and pure primitive checks rather than a misleading line percentage." },
  ]),
});

export function toVitestCoverageConfig(contract = coreLogicCoverageContract) {
  return {
    provider: "v8",
    reporter: ["text", "lcov", "json-summary"],
    include: [...contract.include],
    thresholds: { ...contract.thresholds },
  };
}

function normalizeFile(filePath) {
  return path.resolve(filePath).replaceAll("\\", "/").toLowerCase();
}

function walkJavaScriptFiles(directory, output) {
  if (!fs.existsSync(directory)) return;
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) walkJavaScriptFiles(fullPath, output);
    else if (/\.jsx?$/.test(entry.name) && !/\.test\.jsx?$/.test(entry.name)) output.push(normalizeFile(fullPath));
  }
}

export function enumerateCoreLogicSourceFiles(root = process.cwd()) {
  const files = [];
  for (const directory of ["src/utils", "src/systems", "src/hooks"]) {
    walkJavaScriptFiles(path.join(root, directory), files);
  }
  for (const relativePath of ["src/storage.js", "src/constants.js"]) {
    const fullPath = path.join(root, relativePath);
    if (fs.existsSync(fullPath)) files.push(normalizeFile(fullPath));
  }
  return [...new Set(files)].sort();
}

function metricPercent(summary, metric) {
  const value = Number(summary?.total?.[metric]?.pct);
  return Number.isFinite(value) ? value : null;
}

export function validateCoverageSummary(summary, {
  contract = coreLogicCoverageContract,
  expectedFiles = null,
  root = process.cwd(),
  evidenceFreshness = null,
} = {}) {
  const expected = (expectedFiles || enumerateCoreLogicSourceFiles(root)).map(normalizeFile);
  const measuredEntries = Object.keys(summary || {}).filter((key) => key !== "total");
  const measured = new Set(measuredEntries.map(normalizeFile));
  const missingFiles = expected.filter((file) => !measured.has(file));
  const checks = [];

  checks.push({
    id: "scope-file-floor",
    ok: measuredEntries.length >= contract.minimumFileCount,
    actual: measuredEntries.length,
    expected: `>=${contract.minimumFileCount}`,
  });
  if (evidenceFreshness) {
    checks.push({
      id: "coverage-evidence-fresh",
      ok: evidenceFreshness.ok === true,
      actual: evidenceFreshness.summaryMtime,
      expected: `>=${evidenceFreshness.newestInputMtime}`,
      staleInputs: evidenceFreshness.staleInputs,
    });
  }
  checks.push({
    id: "source-scope-complete",
    ok: missingFiles.length === 0,
    actual: expected.length - missingFiles.length,
    expected: expected.length,
    missingFiles,
  });
  for (const [metric, floor] of Object.entries(contract.thresholds)) {
    const actual = metricPercent(summary, metric);
    checks.push({ id: `${metric}-floor`, ok: actual != null && actual >= floor, actual, expected: `>=${floor}` });
  }

  return {
    schemaVersion: contract.schemaVersion,
    label: contract.label,
    ok: checks.every((check) => check.ok),
    measuredFiles: measuredEntries.length,
    expectedFiles: expected.length,
    metrics: Object.fromEntries(Object.keys(contract.thresholds).map((metric) => [metric, metricPercent(summary, metric)])),
    checks,
    exclusions: contract.exclusions,
  };
}

export function inspectCoverageEvidenceFreshness(summaryPath, root = process.cwd()) {
  const resolvedSummary = path.resolve(summaryPath);
  const inputs = [];
  const collectEvidenceFiles = (directory) => {
    if (!fs.existsSync(directory)) return;
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const fullPath = path.join(directory, entry.name);
      if (entry.isDirectory()) collectEvidenceFiles(fullPath);
      else if (/\.jsx?$/.test(entry.name)) inputs.push(path.resolve(fullPath));
    }
  };
  for (const directory of ["src/utils", "src/systems", "src/hooks"]) {
    collectEvidenceFiles(path.join(root, directory));
  }
  for (const relativePath of ["src/storage.js", "src/constants.js"]) {
    const fullPath = path.join(root, relativePath);
    if (fs.existsSync(fullPath)) inputs.push(path.resolve(fullPath));
  }
  for (const relativePath of ["vite.config.js", "scripts/lib/coverage-contract.mjs", "scripts/validate-coverage-contract.mjs"]) {
    const fullPath = path.join(root, relativePath);
    if (fs.existsSync(fullPath)) inputs.push(path.resolve(fullPath));
  }
  const uniqueInputs = [...new Set(inputs)];
  const summaryMtime = fs.statSync(resolvedSummary).mtimeMs;
  const inputTimes = uniqueInputs.map((file) => ({ file, mtime: fs.statSync(file).mtimeMs }));
  const newestInputMtime = Math.max(0, ...inputTimes.map((entry) => entry.mtime));
  return {
    ok: summaryMtime >= newestInputMtime,
    summaryMtime,
    newestInputMtime,
    staleInputs: inputTimes.filter((entry) => entry.mtime > summaryMtime).map((entry) => entry.file),
  };
}

export function readCoverageSummary(summaryPath = path.resolve("coverage/coverage-summary.json")) {
  return JSON.parse(fs.readFileSync(summaryPath, "utf8"));
}
