function cleanSeed(seed) {
  const num = Number(seed);
  return Number.isFinite(num) && num > 0 ? Math.floor(num) : null;
}

function cleanDifficulty(difficulty) {
  return typeof difficulty === "string" && difficulty.trim() ? difficulty.trim() : "normal";
}

function cleanVsScore(vsScore) {
  const num = Number(vsScore);
  return Number.isFinite(num) && num >= 0 ? Math.floor(num) : null;
}

function cleanVsName(vsName) {
  return typeof vsName === "string" && vsName.trim() ? vsName.trim() : "";
}

export function buildChallengeUrl({
  seed,
  difficulty = "normal",
  vsScore = null,
  vsName = "",
  baseUrl = null,
} = {}) {
  const safeSeed = cleanSeed(seed);
  if (!safeSeed) return null;

  const params = new URLSearchParams({
    seed: String(safeSeed),
    diff: cleanDifficulty(difficulty),
  });
  const safeVsScore = cleanVsScore(vsScore);
  const safeVsName = cleanVsName(vsName);
  if (safeVsScore != null) params.set("vs", String(safeVsScore));
  if (safeVsName) params.set("vsName", safeVsName);

  const resolvedBase = baseUrl
    || (typeof window !== "undefined" ? `${window.location.origin}${window.location.pathname}` : "");
  if (!resolvedBase) return `?${params.toString()}`;
  return `${resolvedBase}?${params.toString()}`;
}

export async function copyChallengeUrl(options = {}) {
  const url = buildChallengeUrl(options);
  if (!url) return null;
  try {
    await navigator.clipboard?.writeText?.(url);
  } catch {}
  return url;
}
