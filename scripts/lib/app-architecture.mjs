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

export function analyzeAppArchitecture(source, budget = {}) {
  const lines = physicalLines(source);
  const starts = occurrences(lines, "const gameLoop = useCallback(() => {");
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

  const systems = importedBoundaries(source, "systems");
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
