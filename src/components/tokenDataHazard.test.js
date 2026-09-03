import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

// S163 regression guard: CSS custom properties (`var(--cod-*)`) are only valid
// where the browser resolves CSS. They must never reach a Canvas2D context,
// a hex-parsing helper, or an alpha-suffix concatenation such as `${color}44`.
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else if (/\.(jsx?|mjs)$/.test(entry.name) && !/\.test\./.test(entry.name)) out.push(full);
  }
  return out;
}

const files = walk(root);
const TOKEN_COLOR = /color:\s*"var\(--cod-/;
const ALPHA_SUFFIX = /\$\{[A-Za-z_.]+color\}[0-9A-Fa-f]{2}/;

describe("design tokens never reach canvas or hex parsers", () => {
  it("no fillStyle/strokeStyle/shadowColor assignment uses a token literal", () => {
    const offenders = [];
    for (const file of files) {
      fs.readFileSync(file, "utf8").split("\n").forEach((line, i) => {
        if (/(fillStyle|strokeStyle|shadowColor)\s*=\s*["'`][^"'`]*var\(--cod-/.test(line)) offenders.push(`${path.relative(root, file)}:${i + 1}`);
      });
    }
    expect(offenders).toEqual([]);
  });

  it("files that parse hex or draw on a detached canvas keep literal hex in their data objects", () => {
    const offenders = [];
    for (const file of files) {
      const text = fs.readFileSync(file, "utf8");
      if (!/hexToRgb\(|createElement\("canvas"\)/.test(text)) continue;
      text.split("\n").forEach((line, i) => {
        if (/\b(key|label|val|min):/.test(line) && TOKEN_COLOR.test(line)) offenders.push(`${path.relative(root, file)}:${i + 1}`);
      });
    }
    expect(offenders).toEqual([]);
  });

  it("local array literals that get alpha-suffixed keep literal hex", () => {
    // `${item.color}44` over an item from a local UPPER_CASE array whose entries
    // carry a token would produce an invalid color.
    const offenders = [];
    for (const file of files) {
      const text = fs.readFileSync(file, "utf8");
      if (!ALPHA_SUFFIX.test(text)) continue;
      for (const match of text.matchAll(/const\s+([A-Z_][A-Z0-9_]*)\s*=\s*\[([\s\S]*?)\n\];/g)) {
        const [, name, body] = match;
        if (!TOKEN_COLOR.test(body)) continue;
        const used = new RegExp(`\\b${name}(\\[|\\.(map|find|filter|forEach))`).test(text);
        if (used) offenders.push(`${path.relative(root, file)} → ${name}`);
      }
    }
    expect(offenders).toEqual([]);
  });
});
