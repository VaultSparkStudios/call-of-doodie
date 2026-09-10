#!/usr/bin/env node

// Usage: node scripts/check-public-claims.mjs
//
// S155 — asserts every countable claim in player-facing copy against the live
// runtime constants, so feature-list numbers ("66 Achievements", "8 Map
// Themes", "16 permanent upgrade nodes") can no longer drift silently when
// the underlying content grows. Wired into the quality gate next to
// validate-public-contract.mjs.

import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "./lib/safe-spawn.mjs";
import { ACHIEVEMENTS, META_TREE_NODE_IDS, WEAPONS, ENEMY_TYPES } from "../src/constants.js";
import { NEW_FEATURES } from "../src/config/changelog.js";
import { ARENA_THEMES } from "../src/drawGame.js";
import { ZOMBIE_VARIANT_CELLS } from "../src/utils/zombieAtlasContract.js";
import { PLAYER_FACING_MODE_FACTS, spell } from "../src/config/modeFacts.js";
import { NEW_MODE_CATALOG } from "../src/config/modeCatalog.js";
import { FIELD_MANUAL_SECTIONS } from "../src/content/fieldManual.js";

const errors = [];
const featuresText = NEW_FEATURES.join("\n");

// [claim description, regex over NEW_FEATURES, expected count]
const featureClaims = [
  ["achievement count", /(\d+) Achievements/, ACHIEVEMENTS.length],
  ["map theme count", /(\d+) Map Themes/, ARENA_THEMES.length],
  ["META tree node count", /(\d+) permanent upgrade nodes/, META_TREE_NODE_IDS.length],
  ["zombie variant count", /(\d+) undead variants/, ZOMBIE_VARIANT_CELLS.length],
];

for (const [label, pattern, expected] of featureClaims) {
  const match = featuresText.match(pattern);
  if (!match) {
    errors.push(`NEW_FEATURES no longer contains a "${label}" claim matching ${pattern}`);
  } else if (Number(match[1]) !== expected) {
    errors.push(`NEW_FEATURES claims ${match[1]} for ${label} but the runtime constant says ${expected}`);
  }
}

// The enemies/arsenal public pages already derive their counts from the
// gameplay contract; sanity-pin the roster sizes those derivations rely on.
if (WEAPONS.length !== 12) errors.push(`WEAPONS grew to ${WEAPONS.length} — audit weapon-count copy (arsenal pages derive automatically, WEAPON_RECOIL/WEAPON_PROJECTILE tables in App.jsx/drawGame.js do not).`);
if (ENEMY_TYPES.length !== 22) errors.push(`ENEMY_TYPES grew to ${ENEMY_TYPES.length} — the enemy-cohort partition assertion in public-route-registry will also fire until the atlas contract covers the newcomer.`);

// /accessibility/ target-size claim must match what the shared footer ships.
const registrySrc = fs.readFileSync(path.resolve("scripts", "lib", "public-route-registry.mjs"), "utf8");
const footerSrc = fs.readFileSync(path.resolve("src", "components", "SiteFooter.jsx"), "utf8");
const claim44 = registrySrc.includes("44-pixel") || registrySrc.includes("44px") || registrySrc.includes("44 pixels");
const footer44 = footerSrc.includes("minHeight: 44");
if (footer44 && !claim44) {
  errors.push("/accessibility/ copy does not mention the 44-pixel minimum that SiteFooter actually ships — align the published claim (see registry accessibility sections).");
}

// /play/ must not claim the game "opens directly on the main menu" — the
// RuntimeBoundary interstitial shell loads first.
if (registrySrc.includes("opens directly on the main menu")) {
  errors.push('/play/ copy claims the game "opens directly on the main menu", contradicting the RuntimeBoundary launcher shell.');
}

// S163: README claims block must match runtime constants (scripts/sync-readme-claims.mjs).
{
  const r = spawnSync(process.execPath, ["scripts/sync-readme-claims.mjs", "--check"], { encoding: "utf8" });
  if (r.status !== 0) errors.push((r.stderr || r.stdout || "README claims drifted").trim());
}
// S163: the public changelog must not go stale — warn past 30 days, fail on CI tag builds.
{
  const { CHANGELOG_ENTRIES } = await import("../src/config/changelog.js");
  const latest = String(CHANGELOG_ENTRIES[0]?.[0] || "").split(" · ")[0];
  const ageDays = (Date.now() - new Date(latest).getTime()) / 86400000;
  if (Number.isFinite(ageDays) && ageDays > 30) {
    const message = `latest public changelog entry is ${Math.floor(ageDays)} days old (${latest})`;
    if (process.env.CI && process.env.GITHUB_REF_TYPE === "tag") errors.push(message); else console.warn(`Public claims: WARN — ${message}`);
  }
}

// S175 — mode-fact copy class. S165 raised BOT ROYALE from twelve bots to
// sixteen in `botRoyale.js` and left four player-facing surfaces claiming
// twelve: the catalog blurb + description (mode picker and /modes/), the
// field manual (/field-manual/ and the in-app reference), and the generated
// public gameplay contract. Nothing could see it, because every one of those
// surfaces agreed with the *source* it was generated from — the source was
// simply wrong. The claims above pin counts in NEW_FEATURES; this pins the
// same class in mode prose, including the GENERATED public artifacts, which
// no unit test reads.
//
// Deliberately NOT scanned: `src/config/changelog.js` and the generated
// /changelog/ page. A dated entry is a historical record — the September 3
// entry says "twelve bots" because twelve bots is what shipped that day, and
// the September 9 entry records the raise to sixteen. Rewriting a dated entry
// to satisfy a current constant would falsify the record, which is the exact
// opposite of what this gate is for. Present-tense copy is pinned; history is
// left alone.
{
  const spelledNouns = PLAYER_FACING_MODE_FACTS.filter((fact) => fact.noun && fact.noun !== "alarm");
  const copySurfaces = [
    ["src/config/modeCatalog.js (NEW_MODE_CATALOG)", NEW_MODE_CATALOG.map((mode) => `${mode.blurb} ${mode.description}`).join("\n")],
    ["src/content/fieldManual.js", FIELD_MANUAL_SECTIONS.map(([title, body]) => `${title} ${body}`).join("\n")],
  ];
  for (const generated of ["public/gameplay-contract.json", "public/field-manual.json"]) {
    const full = path.resolve(generated);
    if (fs.existsSync(full)) copySurfaces.push([generated, fs.readFileSync(full, "utf8")]);
  }

  for (const fact of spelledNouns) {
    const word = spell(fact.value);
    // "<number-or-word> <noun>" anywhere in player-facing copy must be the fact.
    const pattern = new RegExp(String.raw`\b(\d+|[a-z]+)\s+${fact.noun}\b`, "gi");
    for (const [surface, text] of copySurfaces) {
      for (const match of text.matchAll(pattern)) {
        const quoted = match[1].toLowerCase();
        if (/^\d+$/.test(quoted)) {
          if (Number(quoted) !== fact.value) {
            errors.push(`${surface} says "${match[0]}" but ${fact.key} is ${fact.value} (owner ${fact.owner}) — derive the copy from src/config/modeFacts.js instead of typing it.`);
          }
          continue;
        }
        // Only judge spelled numbers; ordinary adjectives ("shrinking flood") pass.
        const NUMERIC_WORDS = ["one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten", "eleven", "twelve", "thirteen", "fourteen", "fifteen", "sixteen", "twenty", "thirty", "sixty"];
        if (!NUMERIC_WORDS.includes(quoted)) continue;
        if (quoted !== word) {
          errors.push(`${surface} says "${match[0]}" but ${fact.key} is ${fact.value} ("${word}", owner ${fact.owner}) — derive the copy from src/config/modeFacts.js instead of typing it.`);
        }
      }
    }
  }
}

if (errors.length) {
  console.error(`Public claims: FAIL (${errors.length})`);
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}
console.log("Public claims: PASS");
