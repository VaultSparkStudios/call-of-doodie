import { createHash } from "node:crypto";

function physicalLines(source) {
  const lines = String(source || "").split(/\r?\n/);
  if (lines.at(-1) === "") lines.pop();
  return lines;
}

function occurrences(lines, needle) {
  const result = [];
  lines.forEach((line, index) => {
    if (line.includes(needle)) result.push(index);
  });
  return result;
}

function importedBoundaries(source, family) {
  const regex = new RegExp(`from\\s+["']\\.\\/${family}\\/([^"']+)["']`, "g");
  return [...String(source).matchAll(regex)].map((match) => match[1]).filter((value, index, all) => all.indexOf(value) === index).sort();
}

// A facade module already lives inside `systems/`, so the boundaries it owns
// are sibling imports (`from "./enemyFrame.js"`), not `./systems/…` paths.
function siblingBoundaries(source) {
  return [...String(source || "").matchAll(/from\s+["']\.\/([^"'/]+\.js)["']/g)].map((match) => match[1]);
}

/**
 * @param {string} source            App.jsx
 * @param {object} budget            scripts/contracts/app-architecture-budget.json
 * @param {object} [options]
 * @param {string[]} [options.facadeSources]
 *   Sources of modules App reaches its systems *through* (S163 moved twenty
 *   loop-only systems behind the lazy combat-runtime chunk, so counting only
 *   App's own imports scores that extraction as boundary LOSS — the opposite
 *   of what this budget exists to protect). Their sibling system imports count
 *   toward the same boundary total, de-duplicated.
 */
export function analyzeAppArchitecture(source, budget = {}, { facadeSources = [] } = {}) {
  const lines = physicalLines(source);
  // Prefix match: the loop took a `{ render = true }` parameter in S163 and the
  // exact-signature marker silently stopped matching, which zeroed the span
  // check without failing loudly enough to be noticed for two sessions.
  const starts = occurrences(lines, "const gameLoop = useCallback(");
  const ends = occurrences(lines, "useGameLoop(gameLoop");
  const errors = [];
  if (starts.length !== 1) errors.push(`expected one gameLoop start marker, found ${starts.length}`);
  if (ends.length !== 1) errors.push(`expected one useGameLoop boundary, found ${ends.length}`);
  const gameLoopStart = starts.length === 1 ? starts[0] + 1 : null;
  const gameLoopEnd = ends.length === 1 ? ends[0] + 1 : null;
  const gameLoopSpan = gameLoopStart && gameLoopEnd && gameLoopEnd > gameLoopStart
    ? gameLoopEnd - gameLoopStart
    : null;
  if (gameLoopStart && gameLoopEnd && gameLoopEnd <= gameLoopStart) errors.push("useGameLoop boundary precedes gameLoop start");

  const direct = importedBoundaries(source, "systems");
  const viaFacade = facadeSources.flatMap(siblingBoundaries);
  const systems = [...new Set([...direct, ...viaFacade])].sort();
  const hooks = importedBoundaries(source, "hooks");
  const budgetKeys = ["maxTotalLines", "maxGameLoopSpan", "minSystemBoundaries", "minHookBoundaries"];
  for (const key of budgetKeys) {
    if (!Number.isFinite(Number(budget[key])) || Number(budget[key]) < 0) errors.push(`invalid architecture budget: ${key}`);
  }
  const checks = {
    totalLines: lines.length <= Number(budget.maxTotalLines),
    gameLoopSpan: gameLoopSpan != null && gameLoopSpan <= Number(budget.maxGameLoopSpan),
    systemBoundaries: systems.length >= Number(budget.minSystemBoundaries),
    hookBoundaries: hooks.length >= Number(budget.minHookBoundaries),
  };
  for (const [name, pass] of Object.entries(checks)) {
    if (!pass) errors.push(`architecture budget failed: ${name}`);
  }

  return {
    ok: errors.length === 0,
    schemaVersion: "app-architecture-receipt-v1",
    sourceDigest: createHash("sha256").update(String(source || "")).digest("hex"),
    totalLines: lines.length,
    gameLoopStart,
    gameLoopEnd,
    gameLoopSpan,
    systemBoundaryCount: systems.length,
    directSystemBoundaryCount: direct.length,
    facadeSystemBoundaryCount: systems.length - direct.length,
    hookBoundaryCount: hooks.length,
    systems,
    hooks,
    budget,
    checks,
    headroom: {
      totalLines: Number(budget.maxTotalLines) - lines.length,
      gameLoopSpan: gameLoopSpan == null ? null : Number(budget.maxGameLoopSpan) - gameLoopSpan,
      systemBoundaries: systems.length - Number(budget.minSystemBoundaries),
      hookBoundaries: hooks.length - Number(budget.minHookBoundaries),
    },
    errors,
  };
}
