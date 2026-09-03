#!/usr/bin/env node
// Writes the design-token stylesheet from src/utils/theme.js to both the SPA
// (src/styles/tokens.css, bundled by Vite) and the static companion pages
// (public/tokens.css). Runs first in `prebuild`. S163.
import fs from "node:fs";
import path from "node:path";
import { tokensToCss } from "../src/utils/theme.js";

const css = tokensToCss();
for (const target of ["src/styles/tokens.css", "public/tokens.css"]) {
  const file = path.resolve(target);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const current = fs.existsSync(file) ? fs.readFileSync(file, "utf8") : null;
  if (current !== css) fs.writeFileSync(file, css);
}
if (process.argv.includes("--check")) {
  for (const target of ["src/styles/tokens.css", "public/tokens.css"]) {
    if (fs.readFileSync(path.resolve(target), "utf8") !== css) { console.error(`tokens drift: ${target}`); process.exit(1); }
  }
}
console.log(`tokens.css written (${css.length} bytes)`);
