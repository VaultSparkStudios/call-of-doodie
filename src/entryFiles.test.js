import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

/**
 * S174 · entry-file lint-exception court.
 *
 * `eslint-plugin-react-refresh` 0.5.6 (Dependabot #151, 78efba4) extended
 * `only-export-components` to flag a module with NO exports. A Vite entry is the
 * HMR root — never itself hot-refreshed, and correctly exporting nothing — so the
 * rule is scoped off for entries in eslint.config.js rather than the strict warning
 * budget being raised.
 *
 * A hand-listed exception rots the moment an entry is added, renamed, or removed:
 * a new entry would silently re-open the false positive, and a deleted one would
 * leave a waiver covering nothing. These cases keep the override list derived from
 * the same authority Vite uses — the module scripts in the root index.html.
 */

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

/** Module entries Vite actually bundles, read from the root HTML entry. */
function entriesFromIndexHtml() {
  const html = fs.readFileSync(path.join(repoRoot, "index.html"), "utf8");
  const found = [];
  const pattern = /<script[^>]*\btype=["']module["'][^>]*\bsrc=["']([^"']+)["']/g;
  for (const match of html.matchAll(pattern)) {
    const src = match[1];
    // Only sources Vite compiles through the lint corpus (`eslint src`) count;
    // /register-sw.js and any absolute URL are outside it.
    if (src.startsWith("/src/")) found.push(src.slice(1));
  }
  return found;
}

/** Paths carrying the react-refresh exception in the flat config. */
function entriesWaivedInEslintConfig() {
  const config = fs.readFileSync(path.join(repoRoot, "eslint.config.js"), "utf8");
  const blocks = config.matchAll(
    /files:\s*\[([^\]]*)\][^}]*?rules:\s*\{[^}]*?["']react-refresh\/only-export-components["']\s*:\s*["']off["']/gs,
  );
  const waived = [];
  for (const block of blocks) {
    for (const quoted of block[1].matchAll(/["']([^"']+)["']/g)) waived.push(quoted[1]);
  }
  return waived;
}

describe("Vite entry lint exceptions", () => {
  it("finds at least one module entry in index.html", () => {
    // Guards the guard: a parser that silently matches nothing would make every
    // assertion below vacuously true.
    expect(entriesFromIndexHtml().length).toBeGreaterThan(0);
  });

  it("waives react-refresh/only-export-components for every Vite entry", () => {
    const waived = entriesWaivedInEslintConfig();
    for (const entry of entriesFromIndexHtml()) {
      expect(waived, `${entry} is a Vite entry but carries no lint exception`).toContain(entry);
    }
  });

  it("waives the rule for nothing that is not an entry", () => {
    // The exception must stay a narrow entry-point carve-out. A waiver on an
    // ordinary component would hide a real fast-refresh defect.
    const entries = entriesFromIndexHtml();
    for (const waived of entriesWaivedInEslintConfig()) {
      expect(entries, `${waived} is waived but is not a Vite entry`).toContain(waived);
    }
  });

  it("keeps every waived entry present on disk", () => {
    for (const waived of entriesWaivedInEslintConfig()) {
      expect(fs.existsSync(path.join(repoRoot, waived)), `${waived} is waived but missing`).toBe(true);
    }
  });
});
