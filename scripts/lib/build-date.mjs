// build-date.mjs — deterministic content dates (S155).
//
// PUBLIC_CONTENT_VERSION_DATE was a hand-frozen string that drifted (the
// /status/ page advertised "checks passed <date>" from whenever someone last
// remembered to bump it). It now derives from the newest git commit touching
// content-bearing sources — deterministic per commit (so the byte-exact
// generate-public-pages --check gate stays meaningful; wall-clock would dirty
// every build), and honest by construction.

import { execFileSync } from "node:child_process";

// Paths whose commits count as "content changed" for the public site.
const CONTENT_PATHS = [
  "scripts/lib",
  "src/config",
  "src/constants.js",
  "src/utils/replayCode.js",
  "public/visual-assets",
];

let _cached = null;

export function deriveContentVersionDate() {
  if (_cached) return _cached;
  try {
    const out = execFileSync("git", ["log", "-1", "--format=%cs", "--", ...CONTENT_PATHS], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(out)) {
      _cached = out;
      return _cached;
    }
  } catch { /* not a git checkout (e.g. tarball CI) — fall through */ }
  // Fallback: today's date. Only reached outside a git checkout, where the
  // --check determinism gate does not run.
  _cached = new Date().toISOString().slice(0, 10);
  return _cached;
}

export function copyrightYear() {
  return Number(deriveContentVersionDate().slice(0, 4));
}
