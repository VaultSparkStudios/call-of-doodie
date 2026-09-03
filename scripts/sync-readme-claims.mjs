#!/usr/bin/env node
// Regenerates the README feature-claims block from runtime constants so the
// public README can never disagree with the game (S163). Run by prebuild;
// `--check` fails when the committed block has drifted.
import fs from "node:fs";
import { ACHIEVEMENTS, ENEMY_TYPES, PERKS, WEAPONS } from "../src/constants.js";
import { FULL_MODE_CATALOG, listModesByKind } from "../src/config/modeCatalog.js";
import { OPERATIONS } from "../src/systems/operationCampaign.js";

const START = "<!-- claims:start -->";
const END = "<!-- claims:end -->";
const modes = listModesByKind("mode");
const rulesets = listModesByKind("ruleset");
const block = [
  START,
  `- ${WEAPONS.length} weapons — ${WEAPONS.slice(0, 4).map((w) => w.name).join(", ")}, and more`,
  `- ${ENEMY_TYPES.length} enemy types including bosses, elites, hazards, and a secret developer encounter`,
  `- ${PERKS.length}+ perks plus cursed perks, starter loadouts, synergy combos, and archetype capstones`,
  `- ${modes.length} game modes (${modes.map((m) => m.label).join(", ")}) and ${rulesets.length} challenge rulesets (${rulesets.map((m) => m.label).join(", ")}); ${FULL_MODE_CATALOG.length} selectable in total`,
  `- ${OPERATIONS.length} authored Operations with seven-encounter objectives, plus CPU squad teammates in squad modes`,
  `- Global leaderboard (Supabase), signed run-claim trust hardening, career stats, meta progression, and ${ACHIEVEMENTS.length} achievements`,
  END,
].join("\n");

const file = "README.md";
const src = fs.readFileSync(file, "utf8");
const re = new RegExp(`${START}[\\s\\S]*?${END}`);
if (!re.test(src)) { console.error("README.md is missing the claims markers"); process.exit(1); }
const next = src.replace(re, block);
if (process.argv.includes("--check")) {
  if (next !== src) { console.error("README claims drifted from runtime constants — run node scripts/sync-readme-claims.mjs"); process.exit(1); }
  console.log("README claims: in sync");
} else {
  if (next !== src) fs.writeFileSync(file, next);
  console.log("README claims synced");
}
