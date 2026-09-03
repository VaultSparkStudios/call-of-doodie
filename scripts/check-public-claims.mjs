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
import { ACHIEVEMENTS, META_TREE_NODE_IDS, WEAPONS, ENEMY_TYPES } from "../src/constants.js";
import { NEW_FEATURES } from "../src/config/changelog.js";
import { ARENA_THEMES } from "../src/drawGame.js";
import { ZOMBIE_VARIANT_CELLS } from "../src/utils/zombieAtlasContract.js";

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
  const { spawnSync } = await import("node:child_process");
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

if (errors.length) {
  console.error(`Public claims: FAIL (${errors.length})`);
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}
console.log("Public claims: PASS");
