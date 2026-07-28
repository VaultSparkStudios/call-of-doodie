import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

export const BOOT_STORAGE_SURFACES = Object.freeze([
  "src/App.jsx",
  "src/components/HomeV2.jsx",
]);

const DIRECT_STORAGE = /\b(?:(?:globalThis|window)\s*\.\s*)?(localStorage|sessionStorage)\s*(?:\.|\[)/g;

function lineNumber(source, index) {
  return source.slice(0, index).split(/\r?\n/).length;
}

export function analyzeBootStorageSources(sources) {
  const violations = [];
  const digest = crypto.createHash("sha256");
  for (const [file, sourceValue] of Object.entries(sources).sort(([a], [b]) => a.localeCompare(b))) {
    const source = String(sourceValue);
    digest.update(file).update("\0").update(source).update("\0");
    for (const match of source.matchAll(DIRECT_STORAGE)) {
      const line = lineNumber(source, match.index);
      const lineText = source.split(/\r?\n/)[line - 1] || "";
      const before = lineText.slice(0, Math.max(0, match.index - source.lastIndexOf("\n", match.index) - 1)).trim();
      if (before.startsWith("//") || before.startsWith("*") || before.startsWith("/*")) continue;
      violations.push({ file, line, storage: match[1] });
    }
  }
  return {
    schemaVersion: "boot-storage-boundary-v1",
    ok: violations.length === 0,
    surfaces: Object.keys(sources).sort(),
    directAccessCount: violations.length,
    violations,
    sourceDigest: digest.digest("hex"),
    requiredBoundary: "storageHealth/gamePreferences/ghostStorage fail-open adapters",
  };
}

export function scanBootStorageBoundary(root = process.cwd()) {
  const sources = Object.fromEntries(BOOT_STORAGE_SURFACES.map((relative) => {
    const file = path.join(root, relative);
    return [relative, fs.existsSync(file) ? fs.readFileSync(file, "utf8") : ""];
  }));
  return analyzeBootStorageSources(sources);
}
